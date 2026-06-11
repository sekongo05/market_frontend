import {
  Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExpenseService } from '../../../../core/services/expense.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import {
  ExpenseResponse, ExpenseRequest, ExpenseCategory, PaymentMethod, ExpenseCategoryStat,
} from '../../../../core/models/expense.models';

@Component({
  selector: 'app-admin-expenses',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-expenses.component.html',
})
export class AdminExpensesComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  expenses = signal<ExpenseResponse[]>([]);
  loading  = signal(true);

  categoryFilter = signal<ExpenseCategory | 'ALL'>('ALL');
  deleteConfirmId: number | null = null;

  readonly categories: Array<{ value: ExpenseCategory | 'ALL'; label: string }> = [
    { value: 'ALL',       label: 'Toutes' },
    { value: 'LOYER',     label: 'Loyer' },
    { value: 'SALAIRE',   label: 'Salaires' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'EMBALLAGE', label: 'Emballage' },
    { value: 'AUTRE',     label: 'Autre' },
  ];

  readonly paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
    { value: 'ESPECES', label: 'Espèces' },
    { value: 'WAVE',    label: 'Wave' },
    { value: 'BANQUE',  label: 'Virement bancaire' },
    { value: 'AUTRE',   label: 'Autre' },
  ];

  filteredExpenses = computed(() => {
    const f = this.categoryFilter();
    return f === 'ALL' ? this.expenses() : this.expenses().filter(e => e.category === f);
  });

  totalFiltered = computed(() =>
    this.filteredExpenses().reduce((acc, e) => acc + e.amount, 0));

  // Drawer
  drawerOpen    = false;
  drawerLoading = false;
  drawerError: string | null = null;
  editingExpense: ExpenseResponse | null = null;

  form: ExpenseRequest = this.emptyForm();

  // Stats par catégorie
  statsByCategory = computed<ExpenseCategoryStat[]>(() => {
    const total = this.expenses().reduce((a, e) => a + e.amount, 0);
    const map   = new Map<string, number>();
    this.expenses().forEach(e => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, t]) => ({
        category: cat as ExpenseCategory,
        total: t,
        percent: total > 0 ? Math.round(t / total * 1000) / 10 : 0,
      }));
  });

  constructor(
    private expenseService: ExpenseService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.wsService.staffEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event.module === 'expenses') this.load();
      });
  }

  load(): void {
    this.loading.set(true);
    this.expenseService.getAll().subscribe({
      next: res => { this.expenses.set(res.data ?? []); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  setFilter(f: ExpenseCategory | 'ALL'): void {
    this.categoryFilter.set(f);
    this.cdr.markForCheck();
  }

  // ── Drawer ────────────────────────────────────────────────────────

  openCreate(): void {
    this.editingExpense = null;
    this.form = this.emptyForm();
    this.drawerError = null;
    this.drawerOpen = true;
  }

  openEdit(e: ExpenseResponse): void {
    this.editingExpense = e;
    this.form = {
      expenseDate:   e.expenseDate,
      amount:        e.amount,
      description:   e.description,
      category:      e.category,
      paymentMethod: e.paymentMethod,
      reference:     e.reference ?? '',
    };
    this.drawerError = null;
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingExpense = null;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.form.expenseDate) { this.drawerError = 'La date est obligatoire'; return; }
    if (!this.form.amount || this.form.amount <= 0) { this.drawerError = 'Le montant doit être positif'; return; }
    if (!this.form.description?.trim()) { this.drawerError = 'La description est obligatoire'; return; }
    if (!this.form.category) { this.drawerError = 'La catégorie est obligatoire'; return; }

    this.drawerLoading = true;
    this.drawerError   = null;

    const req$ = this.editingExpense
      ? this.expenseService.update(this.editingExpense.id, this.form)
      : this.expenseService.create(this.form);

    req$.subscribe({
      next: res => {
        if (res.success) {
          this.toast.show(this.editingExpense ? 'Dépense mise à jour' : 'Dépense enregistrée', 'success');
          this.closeDrawer();
          this.load();
        } else {
          this.drawerError = res.message ?? 'Erreur';
        }
        this.drawerLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.drawerError = err?.error?.message ?? 'Erreur serveur';
        this.drawerLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Suppression ───────────────────────────────────────────────────

  confirmDelete(id: number): void { this.deleteConfirmId = id; this.cdr.markForCheck(); }
  cancelDelete(): void { this.deleteConfirmId = null; this.cdr.markForCheck(); }

  doDelete(id: number): void {
    this.expenseService.delete(id).subscribe({
      next: () => {
        this.toast.show('Dépense supprimée', 'success');
        this.deleteConfirmId = null;
        this.load();
        this.cdr.markForCheck();
      },
      error: err => this.toast.show(err?.error?.message ?? 'Erreur', 'error'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────

  categoryLabel(c: ExpenseCategory): string {
    return this.categories.find(x => x.value === c)?.label ?? c;
  }

  categoryClass(c: ExpenseCategory): string {
    const map: Record<ExpenseCategory, string> = {
      LOYER:     'bg-purple-500/15 text-purple-400 border-purple-500/20',
      SALAIRE:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
      MARKETING: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
      TRANSPORT: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
      EMBALLAGE: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
      AUTRE:     'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    };
    return map[c] ?? '';
  }

  paymentLabel(m: PaymentMethod): string {
    return this.paymentMethods.find(x => x.value === m)?.label ?? m;
  }

  formatAmount(v: number): string {
    return v.toLocaleString('fr-FR') + ' F';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private emptyForm(): ExpenseRequest {
    return {
      expenseDate:   new Date().toISOString().slice(0, 10),
      amount:        0,
      description:   '',
      category:      'AUTRE',
      paymentMethod: 'ESPECES',
      reference:     '',
    };
  }
}
