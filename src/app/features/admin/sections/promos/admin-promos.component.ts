import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PromoService } from '../../../../core/services/promo.service';
import { PromoResponse, CreatePromoRequest } from '../../../../core/models/promo.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';

@Component({
  selector: 'app-admin-promos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-promos.component.html',
})
export class AdminPromosComponent implements OnInit, OnDestroy {
  promos: PromoResponse[] = [];
  promosLoading = false;
  showPromoForm = false;
  promoForm: CreatePromoRequest = { code: '', discountPercent: 10, publicVisible: false };
  promoFormLoading = false;
  promoFormError: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private promoService: PromoService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadPromos();
    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.module === 'promos') this.loadPromos();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPromos(): void {
    this.promosLoading = true;
    this.promoService.getAllPromos().subscribe({
      next: (r) => { if (r.success) this.promos = r.data; this.promosLoading = false; this.cdr.markForCheck(); },
      error: () => { this.promosLoading = false; this.cdr.markForCheck(); },
    });
  }

  openPromoForm(): void {
    this.promoForm = { code: '', discountPercent: 10, publicVisible: false };
    this.promoFormError = null;
    this.showPromoForm = true;
    this.cdr.markForCheck();
  }

  closePromoForm(): void {
    this.showPromoForm = false;
    this.promoFormError = null;
    this.cdr.markForCheck();
  }

  submitPromo(): void {
    if (!this.promoForm.code?.trim()) { this.promoFormError = 'Le code est obligatoire'; return; }
    this.promoFormLoading = true;
    this.promoFormError = null;
    this.promoService.createPromo({ ...this.promoForm, code: this.promoForm.code.toUpperCase() }).subscribe({
      next: (r) => {
        if (r.success) { this.promos = [r.data, ...this.promos]; this.showPromoForm = false; this.toast.show('Code promo créé ✓'); }
        this.promoFormLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.promoFormError = err?.error?.message || 'Erreur';
        this.promoFormLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  togglePromo(promo: PromoResponse): void {
    this.promoService.togglePromo(promo.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.promos.findIndex(p => p.id === promo.id);
          if (idx !== -1) { this.promos = [...this.promos]; this.promos[idx] = r.data; }
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  deletePromo(promo: PromoResponse): void {
    this.promoService.deletePromo(promo.id).subscribe({
      next: () => { this.promos = this.promos.filter(p => p.id !== promo.id); this.toast.show('Code supprimé'); this.cdr.markForCheck(); },
      error: () => { this.toast.show('Erreur de suppression', 'error'); this.cdr.markForCheck(); },
    });
  }
}
