import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { OrderResponse } from '../../../core/models/order.models';
import { PageResponse } from '../../../core/models/common.models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
})
export class OrdersComponent implements OnInit {
  orders: OrderResponse[] = [];
  loading = false;
  error: string | null = null;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  // Inline expand / cancel
  expandedId: number | null = null;
  cancelConfirmId: number | null = null;
  cancellingId: number | null = null;

  constructor(private orderService: OrderService, private cdr: ChangeDetectorRef) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.cancelConfirmId !== null) { this.cancelConfirmId = null; this.cdr.detectChanges(); }
  }

  ngOnInit(): void { this.loadOrders(); }

  loadOrders(page = 0): void {
    this.loading = true;
    this.error = null;
    this.orderService.getMyOrders(page, this.pageSize).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.orders = pg.content;
          this.currentPage = page;
          this.totalPages = pg.totalPages;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Erreur lors du chargement des commandes';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleDetails(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
    if (this.cancelConfirmId !== null) this.cancelConfirmId = null;
    this.cdr.detectChanges();
  }

  startCancel(id: number): void { this.cancelConfirmId = id; this.cdr.detectChanges(); }
  cancelConfirmCancel(): void   { this.cancelConfirmId = null; this.cdr.detectChanges(); }

  doCancel(order: OrderResponse): void {
    this.cancelConfirmId = null;
    this.cancellingId = order.id;
    this.cdr.detectChanges();
    this.orderService.cancelOrder(order.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.orders.findIndex(o => o.id === order.id);
          if (idx !== -1) { this.orders = [...this.orders]; this.orders[idx] = r.data; }
        }
        this.cancellingId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.cancellingId = null; this.cdr.detectChanges(); },
    });
  }

  // ── Labels & styles ───────────────────────────────────────────────────────

  orderStatusLabel(s: string): string {
    const m: Record<string, string> = {
      PENDING: 'En attente', CONFIRMED: 'Confirmée', PROCESSING: 'En traitement',
      SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée',
    };
    return m[s] ?? s;
  }

  orderStatusClass(s: string): string {
    const m: Record<string, string> = {
      PENDING:    'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
      CONFIRMED:  'bg-blue-500/15   text-blue-400   border border-blue-500/25',
      PROCESSING: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
      SHIPPED:    'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25',
      DELIVERED:  'bg-green-500/15  text-green-400  border border-green-500/25',
      CANCELLED:  'bg-red-500/15    text-red-400    border border-red-500/25',
    };
    return m[s] ?? 'bg-white/10 theme-muted border border-white/10';
  }

  paymentLabel(s: string): string {
    const m: Record<string, string> = {
      PENDING: 'Paiement en attente', COMPLETED: 'Payé', FAILED: 'Échec paiement',
      EXPIRED: 'Expiré', REFUNDED: 'Remboursé',
    };
    return m[s] ?? s;
  }

  paymentClass(s: string): string {
    const m: Record<string, string> = {
      PENDING:   'text-yellow-400', COMPLETED: 'text-green-400',
      FAILED:    'text-red-400',    EXPIRED:   'text-orange-400',
      REFUNDED:  'text-blue-400',
    };
    return m[s] ?? 'theme-muted';
  }

  deliveryLabel(s: string): string {
    const m: Record<string, string> = {
      PREPARING: 'En préparation', SHIPPED: 'Expédiée',
      OUT_FOR_DELIVERY: 'En cours de livraison', DELIVERED: 'Livrée', FAILED: 'Échec livraison',
    };
    return m[s] ?? s;
  }

  itemsPreview(order: OrderResponse): string {
    const names = order.items.map(i => i.productName);
    if (names.length <= 2) return names.join(', ');
    return names.slice(0, 2).join(', ') + ` +${names.length - 2}`;
  }

  get stepStatuses(): string[] {
    return ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  }

  stepIndex(status: string): number {
    return this.stepStatuses.indexOf(status);
  }

  previousPage(): void { if (this.currentPage > 0) this.loadOrders(this.currentPage - 1); }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.loadOrders(this.currentPage + 1); }
}
