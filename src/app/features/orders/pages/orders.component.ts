import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OrderService } from '../../../core/services/order.service';
import { ReturnService } from '../../../core/services/return.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { OrderResponse } from '../../../core/models/order.models';
import { ReturnResponse } from '../../../core/models/return.models';
import { PageResponse } from '../../../core/models/common.models';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';
import { orderStatusLabel, orderStatusClass } from '../../admin/shared/admin-status.helpers';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TooltipDirective],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: OrderResponse[] = [];
  loading = false;
  error: string | null = null;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  // Payment feedback (return from GeniusPay)
  paymentFeedback: { type: 'success' | 'error'; message: string } | null = null;

  // Inline expand / cancel
  expandedId: number | null = null;
  cancelConfirmId: number | null = null;
  cancellingId: number | null = null;
  cancelError: string | null = null;
  cancelErrorOrderId: number | null = null;

  // Retours
  returnsMap: Record<number, ReturnResponse> = {};
  returnFormOrderId: number | null = null;
  returnReason = '';
  returnCustomReason = '';
  returnLoading = false;
  returnError: string | null = null;
  returnSuccessOrderId: number | null = null;

  readonly returnReasons = [
    'Article défectueux ou endommagé',
    'Article non conforme à la description',
    'Mauvaise taille ou couleur reçue',
    'Article de mauvaise qualité',
    'Changement d\'avis',
    'Autre',
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private returnService: ReturnService,
    private wsService: WebSocketService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.cancelConfirmId !== null) { this.cancelConfirmId = null; this.cdr.detectChanges(); }
    if (this.returnFormOrderId !== null) { this.closeReturnForm(); }
  }

  ngOnInit(): void {
    this.handlePaymentReturn();
    this.loadOrders();
    this.loadMyReturns();
    this.wsService.orderStatusUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        const idx = this.orders.findIndex(o => o.id === update.orderId);
        if (idx !== -1) {
          this.orders = [...this.orders];
          this.orders[idx] = { ...this.orders[idx], orderStatus: update.orderStatus as any };
          this.cdr.detectChanges();
        }
      });
    this.wsService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadMyReturns());
  }

  private handlePaymentReturn(): void {
    const payment = this.route.snapshot.queryParamMap.get('payment');
    if (!payment) return;

    if (payment === 'success') {
      this.paymentFeedback = { type: 'success', message: 'Paiement confirmé ! Merci pour votre commande.' };
    } else if (payment === 'failed') {
      this.paymentFeedback = { type: 'error', message: 'Le paiement a échoué. Vous pouvez réessayer depuis vos commandes.' };
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { payment: null, reference: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  dismissPaymentFeedback(): void {
    this.paymentFeedback = null;
  }

  private _focusOrder(orderNumber: string): void {
    const idx = this.orders.findIndex(o => o.orderNumber === orderNumber);
    if (idx === -1) return;
    this.expandedId = this.orders[idx].id;
    this.cdr.detectChanges();
    setTimeout(() => {
      const el = document.getElementById('order-' + this.orders[idx].id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }

  loadOrders(page = 0): void {
    this.loading = true;
    this.error = null;
    this.orderService.getMyOrders(page, this.pageSize).subscribe((r) => {
      if (r.success) {
        const pg = r.data as PageResponse<OrderResponse>;
        this.orders = pg.content;
        this.currentPage = page;
        this.totalPages = pg.totalPages;
        const targetOrder = this.route.snapshot.queryParamMap.get('order');
        if (targetOrder) this._focusOrder(targetOrder);
      }
      this.loading = false;
      this.cdr.detectChanges();
    }, (err: any) => {
      this.error = err?.error?.message || 'Erreur lors du chargement des commandes';
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  loadMyReturns(): void {
    this.returnService.getMyReturns(0, 100).subscribe((r) => {
      if (r.success) {
        const pg = r.data as PageResponse<ReturnResponse>;
        this.returnsMap = {};
        pg.content.forEach(ret => { this.returnsMap[ret.orderId] = ret; });
        this.cdr.detectChanges();
      }
    }, (err) => { console.error('Failed to load my returns', err); });
  }

  toggleDetails(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
    this.cancelConfirmId = null;
    this.cancelError = null;
    this.cancelErrorOrderId = null;
    if (this.returnFormOrderId !== null && this.returnFormOrderId !== id) {
      this.closeReturnForm();
    }
    this.cdr.detectChanges();
  }

  startCancel(id: number): void { this.cancelConfirmId = id; this.cancelError = null; this.cancelErrorOrderId = null; this.cdr.detectChanges(); }
  cancelConfirmCancel(): void   { this.cancelConfirmId = null; this.cancelError = null; this.cancelErrorOrderId = null; this.cdr.detectChanges(); }

  doCancel(order: OrderResponse): void {
    this.cancelConfirmId = null;
    this.cancellingId = order.id;
    this.cancelError = null;
    this.cancelErrorOrderId = null;
    this.cdr.detectChanges();
    this.orderService.cancelOrder(order.id).subscribe((r) => {
      if (r.success) {
        const idx = this.orders.findIndex(o => o.id === order.id);
        if (idx !== -1) { this.orders = [...this.orders]; this.orders[idx] = r.data; }
      } else {
        this.cancelError = r.message || 'Impossible d\'annuler cette commande';
        this.cancelErrorOrderId = order.id;
      }
      this.cancellingId = null;
      this.cdr.detectChanges();
    }, (err: any) => {
      this.cancelError = err?.error?.message || 'Impossible d\'annuler cette commande';
      this.cancelErrorOrderId = order.id;
      this.cancellingId = null;
      this.cdr.detectChanges();
    });
  }

  // ── Retours ──────────────────────────────────────────────────────────────

  canReturn(order: OrderResponse): boolean {
    if (order.orderStatus !== 'DELIVERED') return false;
    if (this.returnsMap[order.id]) return false;
    const refDate = order.deliveredAt || order.updatedAt;
    const daysSince = (Date.now() - new Date(refDate).getTime()) / 86_400_000;
    return daysSince <= 3;
  }

  daysLeftToReturn(order: OrderResponse): number {
    const refDate = order.deliveredAt || order.updatedAt;
    const daysSince = (Date.now() - new Date(refDate).getTime()) / 86_400_000;
    return Math.max(0, Math.ceil(3 - daysSince));
  }

  canReview(order: OrderResponse): boolean {
    return order.orderStatus === 'DELIVERED';
  }

  getExistingReturn(orderId: number): ReturnResponse | null {
    return this.returnsMap[orderId] ?? null;
  }

  openReturnForm(orderId: number): void {
    this.returnFormOrderId = orderId;
    this.returnReason = '';
    this.returnCustomReason = '';
    this.returnError = null;
    this.returnSuccessOrderId = null;
    this.cdr.detectChanges();
  }

  closeReturnForm(): void {
    this.returnFormOrderId = null;
    this.returnReason = '';
    this.returnCustomReason = '';
    this.returnError = null;
    this.cdr.detectChanges();
  }

  submitReturn(orderId: number): void {
    const reason = this.returnReason === 'Autre'
      ? this.returnCustomReason.trim()
      : this.returnReason;

    if (!reason) {
      this.returnError = 'Veuillez sélectionner ou indiquer la raison du retour';
      this.cdr.detectChanges();
      return;
    }

    this.returnLoading = true;
    this.returnError = null;
    this.cdr.detectChanges();

    this.returnService.createReturn({ orderId, reason }).subscribe((r) => {
      if (r.success) {
        this.returnsMap = { ...this.returnsMap, [orderId]: r.data };
        this.returnSuccessOrderId = orderId;
        this.returnFormOrderId = null;
      } else {
        this.returnError = r.message || 'Erreur lors de la demande de retour';
      }
      this.returnLoading = false;
      this.cdr.detectChanges();
    }, (err: any) => {
      this.returnError = err?.error?.message || 'Erreur lors de la demande de retour';
      this.returnLoading = false;
      this.cdr.detectChanges();
    });
  }

  returnStatusLabel(status: string): string {
    const m: Record<string, string> = {
      PENDING:   'Demande en cours d\'examen',
      APPROVED:  'Retour approuvé',
      REJECTED:  'Retour refusé',
      COMPLETED: 'Retour traité',
    };
    return m[status] ?? status;
  }

  returnStatusClass(status: string): string {
    const m: Record<string, string> = {
      PENDING:   'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      APPROVED:  'bg-green-500/10  text-green-400  border border-green-500/20',
      REJECTED:  'bg-red-500/10    text-red-400    border border-red-500/20',
      COMPLETED: 'bg-blue-500/10   text-blue-400   border border-blue-500/20',
    };
    return m[status] ?? 'bg-black/[.06] theme-muted border border-black/[.10]';
  }

  returnStatusIcon(status: string): string {
    const m: Record<string, string> = {
      PENDING:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      APPROVED:  'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      REJECTED:  'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      COMPLETED: 'M5 13l4 4L19 7',
    };
    return m[status] ?? 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }

  // ── Labels & styles ───────────────────────────────────────────────────────

  readonly orderStatusLabel = orderStatusLabel;
  readonly orderStatusClass = orderStatusClass;

  deliveryLabel(s: string): string {
    const m: Record<string, string> = {
      PREPARING:        'En préparation',
      OUT_FOR_DELIVERY: 'En cours de livraison',
      DELIVERED:        'Livrée',
      FAILED:           'Échec livraison',
    };
    return m[s] ?? s;
  }

  itemsPreview(order: OrderResponse): string {
    const names = order.items.map(i => i.productName);
    const unique = [...new Set(names)];
    if (unique.length <= 2) return unique.join(', ');
    return unique.slice(0, 2).join(', ') + ` +${unique.length - 2}`;
  }

  groupItems(items: OrderResponse['items']): { productId: number; productName: string; imageUrl: string | null; unitPrice: number; subtotal: number; lines: { color?: string; colorHex?: string; quantity: number; subtotal: number; imageUrl: string | null }[] }[] {
    const map = new Map<number, any>();
    for (const item of items) {
      if (!map.has(item.productId)) {
        map.set(item.productId, { productId: item.productId, productName: item.productName, imageUrl: item.imageUrl, unitPrice: item.unitPrice, subtotal: 0, lines: [] });
      }
      const g = map.get(item.productId)!;
      g.subtotal += item.subtotal;
      g.lines.push({ color: item.selectedColor, colorHex: item.selectedColorHex, quantity: item.quantity, subtotal: item.subtotal, imageUrl: item.imageUrl });
      if (item.selectedColor && item.imageUrl) g.imageUrl = item.imageUrl;
    }
    return Array.from(map.values());
  }

  get stepStatuses(): string[] {
    return ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
  }

  stepIndex(status: string): number {
    return this.stepStatuses.indexOf(status);
  }

  previousPage(): void { if (this.currentPage > 0) this.loadOrders(this.currentPage - 1); }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.loadOrders(this.currentPage + 1); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
