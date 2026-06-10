import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { ManagerToastService } from '../../shared/manager-toast.service';
import { OrderResponse } from '../../../../core/models/order.models';
import { PageResponse, OrderStatus } from '../../../../core/models/common.models';

interface OrderVariantLine {
  color: string | null | undefined;
  colorHex: string | null | undefined;
  quantity: number;
  subtotal: number;
  imageUrl: string | null | undefined;
}
interface GroupedOrderItem {
  productId: number;
  productName: string;
  imageUrl: string | null | undefined;
  unitPrice: number;
  subtotal: number;
  lines: OrderVariantLine[];
}

@Component({
  selector: 'app-manager-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './manager-orders.component.html',
})
export class ManagerOrdersComponent implements OnInit, OnDestroy {

  allOrders: OrderResponse[] = [];
  ordersLoading = false;
  ordersPage = 0;
  ordersTotalPages = 0;
  statusFilter: OrderStatus | '' = '';
  statusUpdatingId: number | null = null;
  selectedOrder: OrderResponse | null = null;
  orderDetailOpen = false;

  readonly orderStatuses = Object.values(OrderStatus);
  readonly nextStatusMap: Record<string, OrderStatus | null> = {
    PENDING:   OrderStatus.CONFIRMED,
    CONFIRMED: OrderStatus.SHIPPED,
    SHIPPED:   OrderStatus.DELIVERED,
    DELIVERED: null,
    CANCELLED: null,
  };

  private readonly destroy$ = new Subject<void>();

  private _pendingOrderNumber: string | null = null;

  constructor(
    private orderService: OrderService,
    private wsService: WebSocketService,
    private scrollLock: ScrollLockService,
    private cdr: ChangeDetectorRef,
    private toast: ManagerToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.orderDetailOpen) this.closeOrderDetail(); }

  ngOnInit(): void {
    this.loadAllOrders();
    this.wsService.orderEvent$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadAllOrders(0);
      this.cdr.markForCheck();
    });

    const orderParam = this.route.snapshot.queryParamMap.get('order');
    if (orderParam) {
      this._pendingOrderNumber = orderParam;
      this.router.navigate([], { queryParams: { order: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllOrders(page = 0): void {
    this.ordersLoading = true;
    const params: any = { page, size: 15 };
    if (this.statusFilter) params.status = this.statusFilter;
    if (this._pendingOrderNumber) params.search = this._pendingOrderNumber;
    this.orderService.getAllOrders(params).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.allOrders = pg.content;
          this.ordersTotalPages = pg.totalPages;
          this.ordersPage = page;

          if (this._pendingOrderNumber) {
            const match = this.allOrders.find(o => o.orderNumber === this._pendingOrderNumber);
            if (match) {
              this._pendingOrderNumber = null;
              this.openOrderDetail(match);
            }
          }
        }
        this.ordersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.ordersLoading = false; this.cdr.markForCheck(); },
    });
  }

  openOrderDetail(order: OrderResponse): void {
    this.selectedOrder = order;
    this.orderDetailOpen = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
  }

  closeOrderDetail(): void {
    this.orderDetailOpen = false;
    this.selectedOrder = null;
    this.scrollLock.unlock();
    this.cdr.markForCheck();
  }

  get groupedOrderItems(): GroupedOrderItem[] {
    if (!this.selectedOrder) return [];
    const map = new Map<number, GroupedOrderItem>();
    for (const item of this.selectedOrder.items) {
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

  advanceOrderStatus(order: OrderResponse): void {
    const next = this.nextStatusMap[order.orderStatus];
    if (!next) return;
    this.statusUpdatingId = order.id;
    const request$ = order.orderStatus === 'PENDING'
      ? this.orderService.validateOrder(order.id)
      : this.orderService.updateOrderStatus(order.id, next);
    request$.subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.allOrders.findIndex(o => o.id === order.id);
          if (idx !== -1) { this.allOrders = [...this.allOrders]; this.allOrders[idx] = r.data; }
          if (this.selectedOrder?.id === order.id) this.selectedOrder = r.data;
          this.toast.show(`Commande ${order.orderNumber} → ${this.orderStatusLabel(next)}`);
        }
        this.statusUpdatingId = null;
        this.cdr.markForCheck();
      },
      error: (err) => { this.statusUpdatingId = null; this.toast.show(err?.error?.message || 'Erreur de mise à jour', 'error'); this.cdr.markForCheck(); },
    });
  }

  cancelOrderByManager(order: OrderResponse): void {
    this.statusUpdatingId = order.id;
    this.orderService.cancelOrder(order.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.allOrders.findIndex(o => o.id === order.id);
          if (idx !== -1) { this.allOrders = [...this.allOrders]; this.allOrders[idx] = r.data; }
          if (this.selectedOrder?.id === order.id) this.selectedOrder = r.data;
          this.toast.show(`Commande ${order.orderNumber} annulée`);
        }
        this.statusUpdatingId = null;
        this.cdr.markForCheck();
      },
      error: (err: any) => { this.statusUpdatingId = null; this.toast.show(err?.error?.message || 'Erreur d\'annulation', 'error'); this.cdr.markForCheck(); },
    });
  }

  orderStatusLabel(s: string): string {
    const m: Record<string, string> = { PENDING: 'En attente', CONFIRMED: 'Confirmée', SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée' };
    return m[s] ?? s;
  }

  orderStatusClass(s: string): string {
    const m: Record<string, string> = {
      PENDING:   'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
      CONFIRMED: 'bg-blue-500/15   text-blue-400   border border-blue-500/25',
      SHIPPED:   'bg-orange-500/15 text-orange-400 border border-orange-500/25',
      DELIVERED: 'bg-green-500/15  text-green-400  border border-green-500/25',
      CANCELLED: 'bg-red-500/15    text-red-400    border border-red-500/25',
    };
    return m[s] ?? 'bg-black/[.06] theme-muted border border-black/[.10]';
  }

  nextStatusLabel(s: string): string {
    const next = this.nextStatusMap[s];
    return next ? `→ ${this.orderStatusLabel(next)}` : '';
  }

  formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
    if (amount >= 1_000) return Math.round(amount / 1_000) + 'K';
    return amount.toString();
  }

  get orderPages(): number[] { return Array.from({ length: this.ordersTotalPages }, (_, i) => i); }
}
