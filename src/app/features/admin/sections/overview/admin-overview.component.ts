import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, interval, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardService, DashboardStats, MonthlyRevenueItem, TopProductItem, DailyCaisseResponse } from '../../../../core/services/dashboard.service';
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

  readonly formatAmount = formatAmount;
  readonly timeAgo = timeAgo;
  readonly orderStatusLabel = orderStatusLabel;
  readonly orderStatusClass = orderStatusClass;

  private refreshSub?: Subscription;
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
    this.refreshSub = interval(60_000).subscribe(() => this.loadStats());
    this.wsService.orderEvent$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadStats();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
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
      error: () => {},
    });
    this.dashboardService.getTopProducts(6).subscribe({
      next: (r) => { if (r.success) this.topProducts = r.data; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  changeYear(delta: number): void {
    this.selectedYear += delta;
    this.dashboardService.getMonthlyRevenue(this.selectedYear).subscribe({
      next: (r) => { if (r.success) this.monthlyRevenue = r.data; this.cdr.markForCheck(); },
      error: () => {},
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
    return list;
  }

  get currentCalendarMonth(): number { return new Date().getMonth() + 1; }
  get maxMonthlyRevenue(): number { return Math.max(...this.monthlyRevenue.map(m => Number(m.revenue)), 1); }
  get maxTopProduct(): number { return Math.max(...this.topProducts.map(p => p.totalSold), 1); }

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
      PENDING:   'bg-yellow-500/15 text-yellow-400',
      CONFIRMED: 'bg-blue-500/15   text-blue-400',
      SHIPPED:   'bg-orange-500/15 text-orange-400',
      DELIVERED: 'bg-emerald-500/15 text-emerald-400',
      CANCELLED: 'bg-red-500/15    text-red-400',
    };
    return m[status] ?? 'bg-black/[.06] text-gray-500';
  }

  insightColors(type: Insight['type']): { border: string; bg: string; text: string; dot: string } {
    const map = {
      success: { border: 'border-emerald-500/25', bg: 'bg-emerald-500/8',  text: 'text-emerald-400', dot: 'bg-emerald-400' },
      warning: { border: 'border-amber-500/25',   bg: 'bg-amber-500/8',    text: 'text-amber-400',   dot: 'bg-amber-400'   },
      danger:  { border: 'border-red-500/25',      bg: 'bg-red-500/8',      text: 'text-red-400',     dot: 'bg-red-400'     },
      action:  { border: 'border-blue-500/25',     bg: 'bg-blue-500/8',     text: 'text-blue-400',    dot: 'bg-blue-400'    },
      info:    { border: 'border-violet-500/25',   bg: 'bg-violet-500/8',   text: 'text-violet-400',  dot: 'bg-violet-400'  },
    };
    return map[type];
  }
}
