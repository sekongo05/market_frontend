import { Component, OnInit, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplierService } from '../../../../core/services/supplier.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { SupplierResponse, SupplierRequest } from '../../../../core/models/supplier.models';

@Component({
  selector: 'app-admin-suppliers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-suppliers.component.html',
})
export class AdminSuppliersComponent implements OnInit {
  suppliers = signal<SupplierResponse[]>([]);
  loading = signal(true);
  drawerOpen = false;
  drawerLoading = false;
  drawerError: string | null = null;
  editingSupplier: SupplierResponse | null = null;
  deleteConfirmId: number | null = null;

  form: SupplierRequest = this.emptyForm();

  constructor(
    private supplierService: SupplierService,
    private toast: AdminToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  openCreate(): void {
    this.editingSupplier = null;
    this.form = this.emptyForm();
    this.drawerError = null;
    this.drawerOpen = true;
  }

  openEdit(s: SupplierResponse): void {
    this.editingSupplier = s;
    this.form = { name: s.name, phone: s.phone ?? '', email: s.email ?? '', country: s.country ?? '', notes: s.notes ?? '' };
    this.drawerError = null;
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingSupplier = null;
  }

  save(): void {
    if (!this.form.name?.trim()) {
      this.drawerError = 'Le nom est obligatoire';
      return;
    }
    this.drawerLoading = true;
    this.drawerError = null;

    const req$ = this.editingSupplier
      ? this.supplierService.update(this.editingSupplier.id, this.form)
      : this.supplierService.create(this.form);

    req$.subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.show(this.editingSupplier ? 'Fournisseur mis à jour' : 'Fournisseur créé', 'success');
          this.closeDrawer();
          this.load();
        } else {
          this.drawerError = res.message ?? 'Erreur';
        }
        this.drawerLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.drawerError = err?.error?.message ?? 'Erreur serveur';
        this.drawerLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId = id;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
    this.cdr.markForCheck();
  }

  deleteSupplier(id: number): void {
    this.supplierService.delete(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.show('Fournisseur supprimé', 'success');
          this.load();
        } else {
          this.toast.show(res.message ?? 'Impossible de supprimer', 'error');
        }
        this.deleteConfirmId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.show(err?.error?.message ?? 'Erreur serveur', 'error');
        this.deleteConfirmId = null;
        this.cdr.markForCheck();
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.supplierService.getAll().subscribe({
      next: (res) => {
        this.suppliers.set(res.data ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private emptyForm(): SupplierRequest {
    return { name: '', phone: '', email: '', country: '', notes: '' };
  }
}
