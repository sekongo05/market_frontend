import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../core/services/payment.service';
import { OrderService } from '../../core/services/order.service';
import { OrderResponse } from '../../core/models/order.models';
import { PaymentStatus } from '../../core/models/common.models';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-page.component.html',
})
export class PaymentPageComponent implements OnInit {
  order: OrderResponse | null = null;
  paymentReference = '';
  loading = false;
  submitting = false;
  success = false;
  error: string | null = null;
  referenceError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('orderId'));
    if (!id) { this.router.navigate(['/orders']); return; }
    this.loading = true;
    this.orderService.getOrderById(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.order = res.data;
          const s = this.order.orderStatus;
          const p = this.order.paymentStatus;
          // Rediriger si la commande n'est pas dans un état où le paiement est possible
          if (s === 'CANCELLED' || s === 'DELIVERED' || p === 'COMPLETED') {
            this.router.navigate(['/orders']);
            return;
          }
        } else {
          this.error = 'Commande introuvable';
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger la commande';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Retourne true si le formulaire de paiement doit être affiché */
  get canPay(): boolean {
    return this.order?.orderStatus === 'APPROVED' &&
      (this.order?.paymentStatus === 'PENDING' || this.order?.paymentStatus === 'FAILED');
  }

  /** Retourne true si en attente de validation manager */
  get isPendingValidation(): boolean {
    return this.order?.paymentStatus === 'SUBMITTED';
  }

  notifyPayment(): void {
    if (!this.order || this.submitting) return;

    // Validation de la référence côté client
    const ref = this.paymentReference.trim();
    if (!ref) {
      this.referenceError = 'La référence de paiement est obligatoire';
      this.cdr.detectChanges();
      return;
    }
    if (ref.length < 4 || ref.length > 100) {
      this.referenceError = 'La référence doit contenir entre 4 et 100 caractères';
      this.cdr.detectChanges();
      return;
    }
    this.referenceError = null;

    this.submitting = true;
    this.error = null;
    this.paymentService.notifyPayment(this.order.id, ref).subscribe({
      next: (res) => {
        if (res.success) {
          this.success = true;
          this.orderService.refreshPendingCount();
          // Mettre à jour l'ordre local pour afficher l'état SUBMITTED
          if (this.order) {
            this.order = { ...this.order, paymentStatus: PaymentStatus.SUBMITTED, paymentReference: ref };
          }
          this.cdr.detectChanges();
          setTimeout(() => this.router.navigate(['/orders']), 3000);
        } else {
          this.error = res.message || 'Erreur lors de la déclaration de paiement';
          this.submitting = false;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.errors?.paymentReference;
        this.error = msg || 'Erreur lors de la déclaration de paiement';
        this.submitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  goToOrders(): void {
    this.router.navigate(['/orders']);
  }
}
