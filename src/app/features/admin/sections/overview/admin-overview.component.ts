import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import {
  DashboardService,
  DashboardStats,
  MonthlyRevenueItem,
  TopProductItem,
  DailyCaisseResponse,
  DailyActivityItem
} from '../../../../core/services/dashboard.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { orderStatusLabel, orderStatusClass, formatAmount, timeAgo } from '../../shared/admin-status.helpers';
import { SmartActionItem, LiveActivityEvent, GranularityPeriod } from './dashboard-smart.models';
import { DashboardActionCenterComponent } from './dashboard-action-center.component';
import { DashboardLiveFeedComponent } from './dashboard-live-feed.component';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DashboardActionCenterComponent,
    DashboardLiveFeedComponent,
  ],
  templateUrl: './admin-overview.component.html',
})
export class AdminOverviewComponent implements OnInit, OnDestroy {
  // Signals State
  readonly stats = signal<DashboardStats | null>(null);
  readonly monthlyRevenue = signal<MonthlyRevenueItem[]>([]);
  readonly topProducts = signal<TopProductItem[]>([]);
  readonly weeklyActivity = signal<DailyActivityItem[]>([]);
  readonly dailyCaisse = signal<DailyCaisseResponse | null>(null);

  readonly loading = signal<boolean>(false);
  readonly dailyCaisseLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly selectedPeriod = signal<GranularityPeriod>('MONTH');
  readonly hoveredMonthIndex = signal<number | null>(null);
  readonly hoveredDayIndex = signal<number | null>(null);

  readonly liveEvents = signal<LiveActivityEvent[]>([]);

  // Helpers exposed to template
  readonly formatAmount = formatAmount;
  readonly timeAgo = timeAgo;
  readonly orderStatusLabel = orderStatusLabel;
  readonly orderStatusClass = orderStatusClass;

  caisseDate = new Date().toISOString().split('T')[0];

  private readonly destroy$ = new Subject<void>();
  private readonly reload$ = new Subject<void>();

  // ════ COMPUTED SIGNALS (Optimal performance: calculated once per state change) ════
  readonly revenueGrowthPct = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    const cur = Number(s.currentMonthRevenue ?? 0);
    const prev = Number(s.previousMonthRevenue ?? 0);
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  });

  readonly revenueGrowthPositive = computed(() => this.revenueGrowthPct() >= 0);

  readonly completionRate = computed(() => {
    const s = this.stats();
    if (!s?.ordersByStatus || !s.totalOrders) return 0;
    const delivered = s.ordersByStatus.find(x => x.status === 'DELIVERED')?.count ?? 0;
    return Math.round((delivered / s.totalOrders) * 100);
  });

  readonly cancellationRate = computed(() => {
    const s = this.stats();
    if (!s?.totalOrders) return 0;
    return Math.round((s.cancelledOrdersCount / s.totalOrders) * 100);
  });

  readonly avgBasket = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    if (s.avgOrderValue && s.avgOrderValue > 0) return s.avgOrderValue;
    if (!s.totalOrders || s.totalOrders === 0) return 0;
    return Math.round(Number(s.totalRevenue ?? 0) / s.totalOrders);
  });

  readonly maxMonthlyRevenue = computed(() => {
    const revs = this.monthlyRevenue();
    return Math.max(...revs.map(m => Number(m.revenue)), 1);
  });

  readonly maxTopProduct = computed(() => {
    const tops = this.topProducts();
    return Math.max(...tops.map(p => p.totalSold), 1);
  });

  readonly maxWeeklyOrders = computed(() => {
    const wk = this.weeklyActivity();
    return Math.max(...wk.map(d => d.orderCount), 1);
  });

  readonly bestMonthIndex = computed(() => {
    const revs = this.monthlyRevenue();
    if (!revs.length) return -1;
    let best = 0;
    revs.forEach((m, i) => {
      if (Number(m.revenue) > Number(revs[best].revenue)) best = i;
    });
    return Number(revs[best].revenue) > 0 ? best : -1;
  });

  // SMART ACTION ITEMS (Computed from real business rules)
  readonly smartActions = computed<SmartActionItem[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const actions: SmartActionItem[] = [];

    // 1. Commandes en attente de traitement
    if (s.pendingOrders > 0) {
      actions.push({
        id: 'orders_pending',
        type: 'ORDER_PENDING',
        severity: s.pendingOrders > 5 ? 'CRITICAL' : 'WARNING',
        title: `${s.pendingOrders} commande${s.pendingOrders > 1 ? 's' : ''} en attente`,
        description: 'Commandes nécessitant confirmation et préparation pour éviter tout retard de livraison.',
        metric: `${s.pendingOrders} à traiter`,
        targetUrl: '/admin/orders',
        actionLabel: 'Traiter',
      });
    }

    // 2. Alertes Stock critique
    if (s.lowStockCount > 0) {
      actions.push({
        id: 'stock_critical',
        type: 'LOW_STOCK',
        severity: s.lowStockCount >= 3 ? 'CRITICAL' : 'WARNING',
        title: `${s.lowStockCount} référence${s.lowStockCount > 1 ? 's' : ''} en rupture imminente`,
        description: 'Niveau inférieur au seuil de sécurité. Risque de perte de ventes si non réapprovisionné.',
        metric: `≤ 5 unités`,
        targetUrl: '/admin/products',
        actionLabel: 'Gérer le stock',
      });
    }

    // 3. Taux d'annulation critique
    const cancelRate = this.cancellationRate();
    if (cancelRate >= 15) {
      actions.push({
        id: 'high_cancellation',
        type: 'INFO',
        severity: 'CRITICAL',
        title: `Taux d'annulation élevé (${cancelRate}%)`,
        description: 'Plus d\'une commande sur sept est annulée. Analysez les motifs de paiement ou d\'adresse.',
        metric: `${s.cancelledOrdersCount} annulées`,
        targetUrl: '/admin/orders',
        actionLabel: 'Auditer',
      });
    }

    // 4. Excellente traction (Opportunité)
    if (s.ordersToday >= 5) {
      actions.push({
        id: 'strong_daily_sales',
        type: 'INFO',
        severity: 'OPPORTUNITY',
        title: `Forte activité aujourd'hui`,
        description: `${s.ordersToday} commandes enregistrées pour ${formatAmount(s.revenueToday)} FCFA.`,
        metric: `+${s.ordersToday} ventes`,
        targetUrl: '/admin/orders',
        actionLabel: 'Voir le flux',
      });
    }

    return actions;
  });

  get currentCalendarMonth(): number {
    return new Date().getMonth() + 1;
  }

  constructor(
    private dashboardService: DashboardService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadDailyCaisse();
    this.setupRealtimeListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRealtimeListeners(): void {
    // Écoute des événements spécifiques sur les commandes pour feed direct + mise à jour légère
    this.wsService.orderEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe((evt) => {
        this.addLiveEvent({
          id: `order_${Date.now()}_${Math.random()}`,
          timestamp: new Date(),
          module: 'orders',
          action: 'created',
          title: `Commande #${evt.orderNumber}`,
          detail: 'Nouvelle commande passée par un client',
          badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          iconType: 'order',
        });
        // Déclenche rafraîchissement debounce
        this.reload$.next();
      });

    // Écoute des événements généraux du staff (retours, produits, livraisons)
    this.wsService.staffEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe((evt) => {
        let title = `Mise à jour ${evt.module}`;
        let detail = `Action : ${evt.action}`;
        let iconType: LiveActivityEvent['iconType'] = 'system';
        let badgeClass = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';

        if (evt.module === 'returns') {
          title = 'Demande de retour client';
          detail = evt.action === 'created' ? 'Nouvelle demande initiée' : 'Statut de retour mis à jour';
          iconType = 'return';
          badgeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
        } else if (evt.module === 'deliveries') {
          title = 'Livraison';
          detail = `Mise à jour logistique (${evt.action})`;
          iconType = 'delivery';
          badgeClass = 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
        } else if (evt.module === 'products') {
          title = 'Catalogue Produit';
          detail = `Produit ${evt.action}`;
          iconType = 'stock';
          badgeClass = 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
        }

        this.addLiveEvent({
          id: `staff_${Date.now()}_${Math.random()}`,
          timestamp: new Date(),
          module: evt.module,
          action: evt.action,
          title,
          detail,
          badgeClass,
          iconType,
        });

        this.reload$.next();
      });

    // Écoute de l'invalidation avec debounce
    this.reload$
      .pipe(debounceTime(1500), takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadStats();
      });
  }

  private addLiveEvent(event: LiveActivityEvent): void {
    const current = this.liveEvents();
    // Garde les 10 événements les plus récents (file circulaire)
    this.liveEvents.set([event, ...current.slice(0, 9)]);
  }

  loadStats(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      stats: this.dashboardService.getStats(),
      revenue: this.dashboardService.getMonthlyRevenue(this.selectedYear()),
      top: this.dashboardService.getTopProducts(6),
      weekly: this.dashboardService.getWeeklyActivity(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r.stats.success) this.stats.set(r.stats.data);
          if (r.revenue.success) this.monthlyRevenue.set(r.revenue.data);
          if (r.top.success) this.topProducts.set(r.top.data);
          if (r.weekly.success) this.weeklyActivity.set(r.weekly.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Erreur lors du chargement des statistiques');
          this.loading.set(false);
        },
      });
  }

  changeYear(delta: number): void {
    this.selectedYear.update(y => y + delta);
    this.dashboardService
      .getMonthlyRevenue(this.selectedYear())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r.success) this.monthlyRevenue.set(r.data);
        },
      });
  }

  loadDailyCaisse(): void {
    this.dailyCaisseLoading.set(true);
    this.dashboardService.getDailyCaisse(this.caisseDate).subscribe({
      next: (r) => {
        if (r.success) this.dailyCaisse.set(r.data);
        this.dailyCaisseLoading.set(false);
      },
      error: () => {
        this.dailyCaisseLoading.set(false);
      },
    });
  }

  statusLabel(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmée',
      SHIPPED: 'Expédiée',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
    };
    return m[status] ?? status;
  }

  statusColor(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-orange-100 text-orange-800',
      DELIVERED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }
}
