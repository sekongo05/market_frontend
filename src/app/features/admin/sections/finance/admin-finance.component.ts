import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FinanceService, FinanceDashboardResponse, StockValueResponse } from '../../../../core/services/finance.service';
import { ProductService } from '../../../../core/services/product.service';
import { ProductResponse } from '../../../../core/models/product.models';
import { CashFlowResponse } from '../../../../core/models/expense.models';
import { PinGateComponent } from './pin-gate.component';
import { PinSetupComponent } from './pin-setup.component';

@Component({
  selector: 'app-admin-finance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, PinGateComponent, PinSetupComponent],
  templateUrl: './admin-finance.component.html',
})
export class AdminFinanceComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  view = signal<'loading' | 'setup' | 'pin' | 'dashboard'>('loading');
  activeTab = signal<'report' | 'margins' | 'stock' | 'cashflow'>('report');

  // Rapport financier
  dashboard = signal<FinanceDashboardResponse | null>(null);
  dashboardLoading = signal(false);
  selectedPeriod = signal(30);
  readonly periods = [
    { days: 30,  label: '30 jours' },
    { days: 90,  label: '3 mois'   },
    { days: 180, label: '6 mois'   },
    { days: 365, label: '1 an'     },
    { days: 0,   label: 'Tout'     },
  ];

  // Marges produits
  products = signal<ProductResponse[]>([]);
  productsLoading = signal(false);

  // Stock
  stockValue = signal<StockValueResponse | null>(null);
  stockLoading = signal(false);

  // Trésorerie
  cashFlow = signal<CashFlowResponse | null>(null);
  cashFlowLoading = signal(false);

  constructor(
    private financeService: FinanceService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.financeService.clearFinanceSession();
  }

  ngOnInit(): void {
    if (this.financeService.hasValidFinanceSession()) {
      this.view.set('dashboard');
      this.loadDashboard();
      this.loadProducts();
      this.loadStockValue();
    } else {
      this.financeService.getPinStatus().subscribe({
        next: (res) => {
          this.view.set(res.success && res.data?.pinConfigured ? 'pin' : 'setup');
          this.cdr.markForCheck();
        },
        error: () => { this.view.set('pin'); this.cdr.markForCheck(); },
      });
    }
  }

  onUnlocked(): void {
    this.view.set('dashboard');
    this.loadDashboard();
    this.loadProducts();
    this.loadStockValue();
    this.loadCashFlow();
    this.cdr.markForCheck();
  }

  onSetupDone(): void {
    this.view.set('pin');
    this.cdr.markForCheck();
  }

  lock(): void {
    this.financeService.clearFinanceSession();
    this.view.set('pin');
    this.cdr.markForCheck();
  }

  setPeriod(days: number): void {
    this.selectedPeriod.set(days);
    this.loadDashboard();
    this.loadCashFlow();
  }

  setTab(tab: 'report' | 'margins' | 'stock' | 'cashflow'): void {
    this.activeTab.set(tab);
    this.cdr.markForCheck();
  }

  // ── Marges produits ───────────────────────────────────────────────

  get productsWithMargin(): ProductResponse[] {
    return this.products().filter(p => p.marginPercent != null);
  }

  get productsWithoutCost(): ProductResponse[] {
    return this.products().filter(p => p.costPrice == null);
  }

  get avgMargin(): number {
    const list = this.productsWithMargin;
    if (!list.length) return 0;
    return Math.round(list.reduce((acc, p) => acc + (p.marginPercent ?? 0), 0) / list.length * 10) / 10;
  }

  get topMarginProducts(): ProductResponse[] {
    return [...this.productsWithMargin].sort((a, b) => (b.marginPercent ?? 0) - (a.marginPercent ?? 0)).slice(0, 5);
  }

  get bottomMarginProducts(): ProductResponse[] {
    return [...this.productsWithMargin].sort((a, b) => (a.marginPercent ?? 0) - (b.marginPercent ?? 0)).slice(0, 5);
  }

  marginColor(m: number): string {
    if (m >= 50) return 'text-emerald-400';
    if (m >= 30) return 'text-yellow-400';
    return 'text-red-400';
  }

  // ── Rapport financier helpers ─────────────────────────────────────

  get maxRevenue(): number {
    const d = this.dashboard();
    if (!d?.monthly?.length) return 1;
    return Math.max(...d.monthly.map(m => m.revenue), 1);
  }

  barHeight(value: number): number {
    return Math.max(4, Math.round((value / this.maxRevenue) * 100));
  }

  // ── Cash flow helpers ─────────────────────────────────────────────

  get maxCashFlowValue(): number {
    const cf = this.cashFlow();
    if (!cf?.monthly?.length) return 1;
    return Math.max(...cf.monthly.flatMap(m => [m.revenue, m.expenses]), 1);
  }

  cfBarHeight(value: number): number {
    return Math.max(4, Math.round((Math.abs(value) / this.maxCashFlowValue) * 100));
  }

  formatAmount(v: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v));
  }

  // ── Loaders ───────────────────────────────────────────────────────

  private loadDashboard(): void {
    this.dashboardLoading.set(true);
    this.financeService.getDashboard(this.selectedPeriod()).subscribe({
      next: (res) => {
        this.dashboard.set(res.data ?? null);
        this.dashboardLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.dashboardLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  private loadProducts(): void {
    this.productsLoading.set(true);
    this.productService.getProducts({ size: 200 }).subscribe({
      next: (res) => {
        this.products.set(res.data?.content ?? []);
        this.productsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.productsLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  private loadStockValue(): void {
    this.stockLoading.set(true);
    this.financeService.getStockValue().subscribe({
      next: (res) => {
        this.stockValue.set(res.data ?? null);
        this.stockLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.stockLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  private loadCashFlow(): void {
    this.cashFlowLoading.set(true);
    this.financeService.getCashFlow(this.selectedPeriod()).subscribe({
      next: (res) => {
        this.cashFlow.set(res.data ?? null);
        this.cashFlowLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.cashFlowLoading.set(false); this.cdr.markForCheck(); },
    });
  }
}
