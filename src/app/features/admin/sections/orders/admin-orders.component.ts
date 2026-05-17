import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OrderService } from '../../../../core/services/order.service';
import { OrderResponse, GetOrdersParams } from '../../../../core/models/order.models';
import { OrderStatus, PageResponse } from '../../../../core/models/common.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { orderStatusLabel, orderStatusClass, formatAmount } from '../../shared/admin-status.helpers';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.component.html',
})
export class AdminOrdersComponent implements OnInit, OnDestroy {
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

  readonly orderStatusLabel = orderStatusLabel;
  readonly orderStatusClass = orderStatusClass;
  readonly formatCurrency = (v: number | null | undefined) => `${Number(v ?? 0).toLocaleString('fr-FR')}`;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private scrollLock: ScrollLockService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAllOrders(0);
    this.wsService.orderEvent$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadAllOrders(0);
      this.cdr.markForCheck();
    });
    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.module === 'products') this.loadAllOrders(this.ordersPage);
    });
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get orderPages(): number[] { return Array.from({ length: this.ordersTotalPages }, (_, i) => i); }

  nextStatusLabel(s: string): string {
    const next = this.nextStatusMap[s];
    return next ? `→ ${orderStatusLabel(next)}` : '';
  }

  loadAllOrders(page = 0): void {
    this.ordersLoading = true;
    const params: GetOrdersParams = { page, size: 15 };
    if (this.statusFilter) params.status = this.statusFilter as OrderStatus;
    this.orderService.getAllOrders(params).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.allOrders = pg.content;
          this.ordersTotalPages = pg.totalPages;
          this.ordersPage = page;
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

  advanceOrderStatus(order: OrderResponse): void {
    const next = this.nextStatusMap[order.orderStatus];
    if (!next) return;
    this.statusUpdatingId = order.id;
    const req$ = order.orderStatus === 'PENDING'
      ? this.orderService.validateOrder(order.id)
      : this.orderService.updateOrderStatus(order.id, next);
    req$.subscribe({
      next: (r) => {
        if (r.success) {
          this._patchOrder(order.id, r.data);
          this.toast.show(`Commande ${order.orderNumber} → ${orderStatusLabel(next)}`);
        }
        this.statusUpdatingId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.statusUpdatingId = null;
        this.toast.show(err?.error?.message || 'Erreur de mise à jour', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  cancelOrderByManager(order: OrderResponse): void {
    this.statusUpdatingId = order.id;
    this.orderService.cancelOrder(order.id).subscribe({
      next: (r) => {
        if (r.success) { this._patchOrder(order.id, r.data); this.toast.show(`Commande ${order.orderNumber} annulée`); }
        this.statusUpdatingId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.statusUpdatingId = null;
        this.toast.show(err?.error?.message || "Erreur d'annulation", 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private _patchOrder(id: number, updated: OrderResponse): void {
    const idx = this.allOrders.findIndex(o => o.id === id);
    if (idx !== -1) { this.allOrders = [...this.allOrders]; this.allOrders[idx] = updated; }
    if (this.selectedOrder?.id === id) this.selectedOrder = updated;
  }
}
