import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DashboardService, DashboardStats, MonthlyRevenueItem, TopProductItem
} from '../../../core/services/dashboard.service';
import { UserService } from '../../../core/services/user.service';
import { CategoryService } from '../../../core/services/category.service';
import { UserResponse, AdminCreateUserRequest } from '../../../core/models/user.models';
import { CategoryResponse } from '../../../core/models/category.models';
import { UserRole, PageResponse } from '../../../core/models/common.models';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

export interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info' | 'action';
  icon: string;
  message: string;
  detail?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats: DashboardStats | null = null;
  loading = false;
  error: string | null = null;
  lastRefreshed: Date | null = null;
  private refreshSub?: Subscription;

  // ── Charts ─────────────────────────────────────────────────────────────────
  monthlyRevenue: MonthlyRevenueItem[] = [];
  topProducts: TopProductItem[] = [];
  selectedYear: number = new Date().getFullYear();
  chartsLoading = false;
  hoveredMonthIndex: number | null = null;

  // ── Tabs ───────────────────────────────────────────────────────────────────
  activeTab: 'stats' | 'users' | 'categories' = 'stats';

  // ── Users ──────────────────────────────────────────────────────────────────
  users: UserResponse[] = [];
  usersLoading = false;
  usersPage = 0;
  usersTotalPages = 0;
  toggleUpdatingId: number | null = null;
  readonly roles = Object.values(UserRole);

  showCreateUserModal = false;
  createUserLoading = false;
  createUserError: string | null = null;
  createUserForm: AdminCreateUserRequest = {
    nom: '', prenom: '', email: '', password: '', phone: '+225', role: UserRole.CUSTOMER
  };

  // ── Categories ─────────────────────────────────────────────────────────────
  categories: CategoryResponse[] = [];
  categoriesLoading = false;
  categoryToggleId: number | null = null;
  showCategoryForm = false;
  editingCategory: CategoryResponse | null = null;
  categoryForm = { name: '', description: '', imageUrl: '' };
  categoryFormLoading = false;
  categoryFormError: string | null = null;

  constructor(
    private dashboardService: DashboardService,
    private userService: UserService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    // Auto-refresh toutes les 60 secondes
    this.refreshSub = interval(60_000).subscribe(() => this.loadStats());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  setTab(tab: 'stats' | 'users' | 'categories'): void {
    this.activeTab = tab;
    if (tab === 'users'      && this.users.length === 0)      this.loadUsers();
    if (tab === 'categories' && this.categories.length === 0) this.loadCategories();
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  loadStats(): void {
    this.loading = true;
    this.error = null;
    this.dashboardService.getStats().subscribe({
      next: (r) => {
        if (r.success) {
          this.stats = r.data;
          this.lastRefreshed = new Date();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Erreur lors du chargement des statistiques';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
    this.loadCharts();
  }

  loadCharts(): void {
    this.chartsLoading = true;
    this.dashboardService.getMonthlyRevenue(this.selectedYear).subscribe({
      next: (r) => { if (r.success) this.monthlyRevenue = r.data; this.cdr.detectChanges(); },
      error: () => this.cdr.detectChanges(),
    });
    this.dashboardService.getTopProducts(6).subscribe({
      next: (r) => {
        if (r.success) this.topProducts = r.data;
        this.chartsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.chartsLoading = false; this.cdr.detectChanges(); },
    });
  }

  changeYear(delta: number): void {
    this.selectedYear += delta;
    this.dashboardService.getMonthlyRevenue(this.selectedYear).subscribe({
      next: (r) => { if (r.success) this.monthlyRevenue = r.data; this.cdr.detectChanges(); },
      error: () => this.cdr.detectChanges(),
    });
  }

  // ── Intelligence — computed properties ────────────────────────────────────

  /** Croissance M/M du CA (%) calculée depuis les données backend */
  get revenueGrowthPct(): number {
    if (!this.stats) return 0;
    const cur  = Number(this.stats.currentMonthRevenue  ?? 0);
    const prev = Number(this.stats.previousMonthRevenue ?? 0);
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round((cur - prev) / prev * 100);
  }

  get revenueGrowthPositive(): boolean { return this.revenueGrowthPct >= 0; }

  /** Taux de livraison (DELIVERED / (total - PENDING)) */
  get completionRate(): number {
    if (!this.stats?.ordersByStatus) return 0;
    const get = (s: string) =>
      this.stats!.ordersByStatus.find(x => x.status === s)?.count ?? 0;
    const delivered = get('DELIVERED');
    const cancelled = get('CANCELLED');
    const confirmed = get('CONFIRMED');
    const total = delivered + cancelled + confirmed;
    return total === 0 ? 0 : Math.round((delivered / total) * 100);
  }

  /** Liste d'insights intelligents dérivés des données */
  get insights(): Insight[] {
    if (!this.stats) return [];
    const list: Insight[] = [];
    const growth = this.revenueGrowthPct;

    if (growth > 0) {
      list.push({
        type: 'success', icon: 'trending-up',
        message: `CA en hausse de +${growth}% ce mois`,
        detail: `vs ${this.formatAmount(this.stats.previousMonthRevenue)} le mois dernier`,
      });
    } else if (growth < 0) {
      list.push({
        type: 'warning', icon: 'trending-down',
        message: `CA en baisse de ${growth}% ce mois`,
        detail: `vs ${this.formatAmount(this.stats.previousMonthRevenue)} le mois dernier`,
      });
    }

    if (this.stats.pendingPaymentsCount > 0) {
      list.push({
        type: 'action', icon: 'credit-card',
        message: `${this.stats.pendingPaymentsCount} paiement${this.stats.pendingPaymentsCount > 1 ? 's' : ''} à valider`,
        detail: 'Action requise — vérifier les références Wave',
      });
    }

    if (this.stats.lowStockCount > 0) {
      list.push({
        type: 'warning', icon: 'alert',
        message: `${this.stats.lowStockCount} produit${this.stats.lowStockCount > 1 ? 's' : ''} en stock faible`,
        detail: 'Seuil critique : ≤ 5 unités restantes',
      });
    }

    if (this.stats.newUsersThisMonth > 0) {
      list.push({
        type: 'info', icon: 'users',
        message: `${this.stats.newUsersThisMonth} nouvel${this.stats.newUsersThisMonth > 1 ? 'aux' : ''} utilisateur${this.stats.newUsersThisMonth > 1 ? 's' : ''} ce mois`,
      });
    }

    if (this.completionRate >= 80) {
      list.push({
        type: 'success', icon: 'check-circle',
        message: `Excellent taux de livraison : ${this.completionRate}%`,
      });
    } else if (this.completionRate > 0 && this.completionRate < 60) {
      list.push({
        type: 'warning', icon: 'alert',
        message: `Taux de livraison faible : ${this.completionRate}%`,
        detail: 'Vérifier les commandes annulées',
      });
    }

    return list;
  }

  /** Mois courant de l'année (1-12) */
  get currentCalendarMonth(): number { return new Date().getMonth() + 1; }

  get maxMonthlyRevenue(): number {
    if (!this.monthlyRevenue.length) return 1;
    return Math.max(...this.monthlyRevenue.map(m => Number(m.revenue)), 1);
  }

  get maxTopProduct(): number {
    if (!this.topProducts.length) return 1;
    return Math.max(...this.topProducts.map(p => p.totalSold), 1);
  }

  /** Meilleur mois de l'année */
  get bestMonthIndex(): number {
    if (!this.monthlyRevenue.length) return -1;
    let best = 0;
    this.monthlyRevenue.forEach((m, i) => {
      if (Number(m.revenue) > Number(this.monthlyRevenue[best].revenue)) best = i;
    });
    return Number(this.monthlyRevenue[best].revenue) > 0 ? best : -1;
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING:   'En attente',
      APPROVED:  'Approuvée',
      CONFIRMED: 'Confirmée',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
    };
    return labels[status] ?? status;
  }

  statusColor(status: string): string {
    const colors: Record<string, string> = {
      PENDING:   'bg-yellow-500/15 text-yellow-400',
      APPROVED:  'bg-blue-500/15 text-blue-400',
      CONFIRMED: 'bg-indigo-500/15 text-indigo-400',
      DELIVERED: 'bg-emerald-500/15 text-emerald-400',
      CANCELLED: 'bg-red-500/15 text-red-400',
    };
    return colors[status] ?? 'bg-white/10 text-gray-400';
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

  formatAmount(val: number | null | undefined): string {
    const n = Number(val ?? 0);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M FCFA`;
    if (n >= 1_000)     return `${Math.round(n / 1_000)} K FCFA`;
    return `${n} FCFA`;
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return "à l'instant";
    if (mins  < 60) return `il y a ${mins} min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days  < 7)  return `il y a ${days}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  loadUsers(page = 0): void {
    this.usersLoading = true;
    this.userService.getAllUsers(page, 15).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<UserResponse>;
          this.users = pg.content;
          this.usersTotalPages = pg.totalPages;
          this.usersPage = page;
        }
        this.usersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.usersLoading = false; this.cdr.detectChanges(); },
    });
  }

  toggleUser(user: UserResponse): void {
    this.toggleUpdatingId = user.id;
    this.userService.toggleUser(user.id).subscribe({
      next: () => {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
          this.users = [...this.users];
          this.users[idx] = { ...this.users[idx], enabled: !this.users[idx].enabled };
        }
        this.toggleUpdatingId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.toggleUpdatingId = null; this.cdr.detectChanges(); },
    });
  }

  openCreateUserModal(): void {
    this.createUserForm = { nom: '', prenom: '', email: '', password: '', phone: '+225', role: UserRole.CUSTOMER };
    this.createUserError = null;
    this.showCreateUserModal = true;
    this.cdr.detectChanges();
  }

  closeCreateUserModal(): void { this.showCreateUserModal = false; this.cdr.detectChanges(); }

  submitCreateUser(): void {
    this.createUserLoading = true;
    this.createUserError = null;
    this.userService.createUser(this.createUserForm).subscribe({
      next: (r) => {
        if (r.success) { this.users = [r.data, ...this.users]; this.showCreateUserModal = false; }
        this.createUserLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.createUserError = err?.error?.message || 'Une erreur est survenue';
        this.createUserLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get userPages(): number[] { return Array.from({ length: this.usersTotalPages }, (_, i) => i); }
  get activeCategories():   number { return this.categories.filter(c => c.active).length; }
  get inactiveCategories(): number { return this.categories.filter(c => !c.active).length; }

  // ── Categories ─────────────────────────────────────────────────────────────

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categoryService.getAllForAdmin().subscribe({
      next: (r) => {
        if (r.success) this.categories = r.data;
        this.categoriesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.categoriesLoading = false; this.cdr.detectChanges(); },
    });
  }

  openCategoryForm(): void {
    this.editingCategory = null;
    this.categoryForm = { name: '', description: '', imageUrl: '' };
    this.categoryFormError = null;
    this.showCategoryForm = true;
    this.cdr.detectChanges();
  }

  openEditCategoryForm(cat: CategoryResponse): void {
    this.editingCategory = cat;
    this.categoryForm = { name: cat.name, description: cat.description ?? '', imageUrl: cat.imageUrl ?? '' };
    this.categoryFormError = null;
    this.showCategoryForm = true;
    this.cdr.detectChanges();
  }

  closeCategoryForm(): void {
    this.showCategoryForm = false;
    this.editingCategory = null;
    this.categoryFormError = null;
    this.cdr.detectChanges();
  }

  submitCategory(): void {
    if (!this.categoryForm.name.trim()) { this.categoryFormError = 'Le nom est obligatoire'; return; }
    this.categoryFormLoading = true;
    this.categoryFormError = null;
    const payload = {
      name: this.categoryForm.name.trim(),
      description: this.categoryForm.description.trim() || undefined,
      imageUrl: this.categoryForm.imageUrl.trim() || undefined,
    };
    const req$ = this.editingCategory
      ? this.categoryService.updateCategory(this.editingCategory.id, payload)
      : this.categoryService.createCategory(payload);
    req$.subscribe({
      next: (r) => {
        if (r.success) {
          if (this.editingCategory) {
            const idx = this.categories.findIndex(c => c.id === this.editingCategory!.id);
            if (idx !== -1) { this.categories = [...this.categories]; this.categories[idx] = r.data; }
          } else {
            this.categories = [...this.categories, r.data];
          }
          this.showCategoryForm = false;
          this.editingCategory = null;
        }
        this.categoryFormLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.categoryFormError = err?.error?.message || 'Erreur lors de la sauvegarde';
        this.categoryFormLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleCategory(cat: CategoryResponse): void {
    this.categoryToggleId = cat.id;
    this.categoryService.toggleCategoryActive(cat.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.categories.findIndex(c => c.id === cat.id);
          if (idx !== -1) { this.categories = [...this.categories]; this.categories[idx] = r.data; }
        }
        this.categoryToggleId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.categoryToggleId = null; this.cdr.detectChanges(); },
    });
  }
}
