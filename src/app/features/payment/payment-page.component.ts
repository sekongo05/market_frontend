import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../core/services/payment.service';
import { OrderService } from '../../core/services/order.service';
import { OrderResponse } from '../../core/models/order.models';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-page.component.html',
})
export class PaymentPageComponent implements OnInit {
  order: OrderResponse | null = null;
  waveReference = '';
  loading = false;
  submitting = false;
  success = false;
  error: string | null = null;

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
          // If already paid or submitted, redirect to orders
          if (this.order.paymentStatus === 'COMPLETED' || this.order.paymentStatus === 'SUBMITTED') {
            this.router.navigate(['/orders']);
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

  notifyPayment(): void {
    if (!this.order || this.submitting) return;
    this.submitting = true;
    this.error = null;
    this.paymentService.notifyPayment(this.order.id, this.waveReference.trim() || undefined).subscribe({
      next: (res) => {
        if (res.success) {
          this.success = true;
          this.cdr.detectChanges();
          setTimeout(() => this.router.navigate(['/orders']), 2500);
        } else {
          this.error = res.message || 'Erreur lors de la déclaration de paiement';
          this.submitting = false;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors de la déclaration de paiement';
        this.submitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  goToOrders(): void {
    this.router.navigate(['/orders']);
  }
}
