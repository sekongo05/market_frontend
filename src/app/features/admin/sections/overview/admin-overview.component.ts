import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardService, DashboardStats, MonthlyRevenueItem, TopProductItem, DailyCaisseResponse, DailyActivityItem } from '../../../../core/services/dashboard.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { orderStatusLabel, orderStatusClass, formatAmount, timeAgo } from '../../shared/admin-status.helpers';

export interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info' | 'action';
  message: string;
  detail?: string;
}

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-overview.component.html',
})
export class AdminOverviewComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  loading = false;
  error: string | null = null;
  monthlyRevenue: MonthlyRevenueItem[] = [];
  topProducts: TopProductItem[] = [];
  selectedYear = new Date().getFullYear();
  hoveredMonthIndex: number | null = null;
  dailyCaisse: DailyCaisseResponse | null = null;
  dailyCaisseLoading = false;
  caisseDate = new Date().toISOString().split('T')[0];
  weeklyActivity: DailyActivityItem[] = [];
  hoveredDayIndex: number | null = null;

  readonly formatAmount = formatAmount;
  readonly timeAgo = timeAgo;
  readonly orderStatusLabel = orderStatusLabel;
  readonly orderStatusClass = orderStatusClass;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadDailyCaisse();
    this.wsService.orderEvent$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadStats();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    this.loading = true;
    this.error = null;
    this.dashboardService.getStats().subscribe({
      next: (r) => {
        if (r.success) this.stats = r.data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Erreur lors du chargement des statistiques';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
    this.dashboardService.getMonthlyRevenue(this.selectedYear).subscribe({
      next: (r) => { if (r.success) this.monthlyRevenue = r.data; this.cdr.markForCheck(); },
      error: (err) => { console.error('Failed to load monthly revenue', err); },
    });
    this.dashboardService.getTopProducts(6).subscribe({
      next: (r) => { if (r.success) this.topProducts = r.data; this.cdr.markForCheck(); },
      error: (err) => { console.error('Failed to load monthly revenue', err); },
    });
    this.dashboardService.getWeeklyActivity().subscribe({
      next: (r) => { if (r.success) this.weeklyActivity = r.data; this.cdr.markForCheck(); },
      error: (err) => { console.error('Failed to load monthly revenue', err); },
    });
  }

  changeYear(delta: number): void {
    this.selectedYear += delta;
    this.dashboardService.getMonthlyRevenue(this.selectedYear).subscribe({
      next: (r) => { if (r.success) this.monthlyRevenue = r.data; this.cdr.markForCheck(); },
      error: (err) => { console.error('Failed to load monthly revenue', err); },
    });
  }

  loadDailyCaisse(): void {
    this.dailyCaisseLoading = true;
    this.dashboardService.getDailyCaisse(this.caisseDate).subscribe({
      next: (r) => { if (r.success) this.dailyCaisse = r.data; this.dailyCaisseLoading = false; this.cdr.markForCheck(); },
      error: () => { this.dailyCaisseLoading = false; this.cdr.markForCheck(); },
    });
  }

  get revenueGrowthPct(): number {
    if (!this.stats) return 0;
    const cur  = Number(this.stats.currentMonthRevenue  ?? 0);
    const prev = Number(this.stats.previousMonthRevenue ?? 0);
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round((cur - prev) / prev * 100);
  }

  get revenueGrowthPositive(): boolean { return this.revenueGrowthPct >= 0; }

  get completionRate(): number {
    if (!this.stats?.ordersByStatus) return 0;
    const get = (s: string) => this.stats!.ordersByStatus.find(x => x.status === s)?.count ?? 0;
    const delivered = get('DELIVERED');
    const cancelled = get('CANCELLED');
    const confirmed = get('CONFIRMED');
    const total = delivered + cancelled + confirmed;
    return total === 0 ? 0 : Math.round((delivered / total) * 100);
  }

  get insights(): Insight[] {
    if (!this.stats) return [];
    const list: Insight[] = [];
    const growth = this.revenueGrowthPct;
    if (growth > 0) list.push({ type: 'success', message: `CA en hausse de +${growth}% ce mois`, detail: `vs ${formatAmount(this.stats.previousMonthRevenue)} le mois dernier` });
    else if (growth < 0) list.push({ type: 'warning', message: `CA en baisse de ${growth}% ce mois`, detail: `vs ${formatAmount(this.stats.previousMonthRevenue)} le mois dernier` });
    if (this.stats.lowStockCount > 0) list.push({ type: 'warning', message: `${this.stats.lowStockCount} produit${this.stats.lowStockCount > 1 ? 's' : ''} en stock faible`, detail: 'Seuil critique : ≤ 5 unités restantes' });
    if (this.stats.newUsersThisMonth > 0) list.push({ type: 'info', message: `${this.stats.newUsersThisMonth} nouvel${this.stats.newUsersThisMonth > 1 ? 'aux' : ''} utilisateur${this.stats.newUsersThisMonth > 1 ? 's' : ''} ce mois` });
    if (this.completionRate >= 80) list.push({ type: 'success', message: `Excellent taux de livraison : ${this.completionRate}%` });
    else if (this.completionRate > 0 && this.completionRate < 60) list.push({ type: 'warning', message: `Taux de livraison faible : ${this.completionRate}%`, detail: 'Vérifier les commandes annulées' });
    const cancel = this.cancellationRate;
    if (cancel >= 20) list.push({ type: 'danger', message: `Taux d'annulation élevé : ${cancel}%`, detail: 'Plus d\'1 commande sur 5 annulée' });
    else if (cancel >= 10) list.push({ type: 'warning', message: `Taux d'annulation : ${cancel}%`, detail: 'À surveiller' });
    if (this.stats.ordersToday > 0) list.push({ type: 'info', message: `${this.stats.ordersToday} commande${this.stats.ordersToday > 1 ? 's' : ''} aujourd'hui`, detail: `${formatAmount(this.stats.revenueToday)} FCFA encaissés` });
    return list;
  }

  get cancellationRate(): number {
    if (!this.stats?.totalOrders) return 0;
    return Math.round((this.stats.cancelledOrdersCount / this.stats.totalOrders) * 100);
  }

  get currentCalendarMonth(): number { return new Date().getMonth() + 1; }
  get maxMonthlyRevenue(): number { return Math.max(...this.monthlyRevenue.map(m => Number(m.revenue)), 1); }
  get maxTopProduct(): number { return Math.max(...this.topProducts.map(p => p.totalSold), 1); }
  get maxWeeklyOrders(): number { return Math.max(...this.weeklyActivity.map(d => d.orderCount), 1); }

  get bestMonthIndex(): number {
    if (!this.monthlyRevenue.length) return -1;
    let best = 0;
    this.monthlyRevenue.forEach((m, i) => { if (Number(m.revenue) > Number(this.monthlyRevenue[best].revenue)) best = i; });
    return Number(this.monthlyRevenue[best].revenue) > 0 ? best : -1;
  }

  statusLabel(status: string): string {
    const m: Record<string, string> = { PENDING: 'En attente', CONFIRMED: 'Confirmée', SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée' };
    return m[status] ?? status;
  }

  statusColor(status: string): string {
    const m: Record<string, string> = {
      PENDING:   'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100   text-blue-800',
      SHIPPED:   'bg-orange-100 text-orange-800',
      DELIVERED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-red-100    text-red-800',
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }

  insightColors(type: Insight['type']): { border: string; bg: string; text: string; dot: string } {
    const map = {
      success: { border: 'border-emerald-200', bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
      warning: { border: 'border-amber-200',   bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500'   },
      danger:  { border: 'border-red-200',      bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500'     },
      action:  { border: 'border-blue-200',     bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'    },
      info:    { border: 'border-violet-200',   bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500'  },
    };
    return map[type];
  }
}
