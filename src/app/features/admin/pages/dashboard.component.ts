import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, MonthlyRevenueItem, TopProductItem } from '../../../core/services/dashboard.service';
import { UserService } from '../../../core/services/user.service';
import { CategoryService } from '../../../core/services/category.service';
import { UserResponse, AdminCreateUserRequest } from '../../../core/models/user.models';
import { CategoryResponse } from '../../../core/models/category.models';
import { UserRole, PageResponse } from '../../../core/models/common.models';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  // ── Stats ──────────────────────────────────────────────────────────────────
  stats: any = null;
  loading = false;
  error: string | null = null;

  // ── Charts ─────────────────────────────────────────────────────────────────
  monthlyRevenue: MonthlyRevenueItem[] = [];
  topProducts: TopProductItem[] = [];
  selectedYear: number = new Date().getFullYear();
  chartsLoading = false;

  // ── Tabs ───────────────────────────────────────────────────────────────────
  activeTab: 'stats' | 'users' | 'categories' = 'stats';

  // ── Users ──────────────────────────────────────────────────────────────────
  users: UserResponse[] = [];
  usersLoading = false;
  usersPage = 0;
  usersTotalPages = 0;
  toggleUpdatingId: number | null = null;
  readonly roles = Object.values(UserRole);

  // Create user modal
  showCreateUserModal = false;
  createUserLoading = false;
  createUserError: string | null = null;
  createUserForm: AdminCreateUserRequest = { nom: '', prenom: '', email: '', password: '', phone: '+225', role: UserRole.CUSTOMER };

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
  }

  setTab(tab: 'stats' | 'users' | 'categories'): void {
    this.activeTab = tab;
    if (tab === 'users' && this.users.length === 0) this.loadUsers();
    if (tab === 'categories' && this.categories.length === 0) this.loadCategories();
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  loadStats(): void {
    this.loading = true;
    this.error = null;
    this.dashboardService.getStats().subscribe({
      next: (response) => {
        if (response.success) this.stats = response.data;
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
      error: () => { this.cdr.detectChanges(); },
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
      error: () => { this.cdr.detectChanges(); },
    });
  }

  get maxMonthlyRevenue(): number {
    if (!this.monthlyRevenue.length) return 1;
    return Math.max(...this.monthlyRevenue.map(m => m.revenue), 1);
  }

  get maxTopProduct(): number {
    if (!this.topProducts.length) return 1;
    return Math.max(...this.topProducts.map(p => p.totalSold), 1);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      PENDING:    'bg-yellow-500/15 text-yellow-500',
      CONFIRMED:  'bg-blue-500/15 text-blue-400',
      PROCESSING: 'bg-purple-500/15 text-purple-400',
      SHIPPED:    'bg-indigo-500/15 text-indigo-400',
      DELIVERED:  'bg-green-500/15 text-green-400',
      CANCELLED:  'bg-red-500/15 text-red-400',
    };
    return colors[status] || 'bg-white/10 text-gray-400';
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

  closeCreateUserModal(): void {
    this.showCreateUserModal = false;
    this.cdr.detectChanges();
  }

  submitCreateUser(): void {
    this.createUserLoading = true;
    this.createUserError = null;
    this.userService.createUser(this.createUserForm).subscribe({
      next: (r) => {
        if (r.success) {
          this.users = [r.data, ...this.users];
          this.showCreateUserModal = false;
        }
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

  get activeCategories(): number { return this.categories.filter(c => c.active).length; }
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
    if (!this.categoryForm.name.trim()) {
      this.categoryFormError = 'Le nom est obligatoire';
      return;
    }
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
