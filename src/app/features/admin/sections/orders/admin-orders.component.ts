import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { SEARCH_DEBOUNCE } from '../../../../core/constants';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { OrderResponse, GetOrdersParams } from '../../../../core/models/order.models';
import { OrderStatus, PageResponse } from '../../../../core/models/common.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { orderStatusLabel, orderStatusClass, formatAmount } from '../../shared/admin-status.helpers';

export interface OrderBadge { label: string; classes: string; }

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  done: boolean;
  active: boolean;
  cancelled: boolean;
}

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
  ordersTotalElements = 0;
  pendingCount   = 0;
  confirmedCount = 0;
  shippedCount   = 0;
  deliveredCount = 0;

  /* ── Filtres ── */
  statusFilter: OrderStatus | '' = '';
  dateRange: 'today' | 'week' | 'month' | '' = '';
  searchQuery = '';

  /* ── Actions ── */
  statusUpdatingId: number | null = null;
  selectedOrder: OrderResponse | null = null;
  orderDetailOpen = false;
  cancelConfirmOrder: OrderResponse | null = null;
  cancelReason = '';

  private readonly search$ = new Subject<string>();

  readonly OrderStatus = OrderStatus;
  readonly orderStatuses = Object.values(OrderStatus);
  readonly nextStatusMap: Record<string, OrderStatus | null> = {
    CONFIRMED: OrderStatus.SHIPPED,
    SHIPPED:   OrderStatus.DELIVERED,
    DELIVERED: null,
    CANCELLED: null,
  };

  readonly orderStatusLabel = orderStatusLabel;
  readonly orderStatusClass = orderStatusClass;
  readonly formatAmount     = formatAmount;
  readonly formatCurrency   = (v: number | null | undefined) => `${Number(v ?? 0).toLocaleString('fr-FR')}`;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private scrollLock: ScrollLockService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadAllOrders(0);
    this.loadStatusCounts();

    const orderParam = this.route.snapshot.queryParamMap.get('order');
    if (orderParam) {
      this.searchQuery = orderParam;
      this._pendingOrderNumber = orderParam;
      this.router.navigate([], { queryParams: { order: null }, queryParamsHandling: 'merge', replaceUrl: true });
      this.loadAllOrders(0);
    }

    this.search$.pipe(
      debounceTime(SEARCH_DEBOUNCE),
      distinctUntilChanged(),
      tap(query => this.searchQuery = query),
      takeUntil(this.destroy$),
    ).subscribe(() => this.loadAllOrders(0));

    this.wsService.orderEvent$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadAllOrders(this.ordersPage);
      this.loadStatusCounts();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get orderPages(): number[] { return Array.from({ length: this.ordersTotalPages }, (_, i) => i); }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery || !!this.statusFilter || !!this.dateRange;
  }

  onSearchInput(): void { this._pendingOrderNumber = null; this.search$.next(this.searchQuery); }

  applyFilter(): void { this.loadAllOrders(0); }

  clearFilters(): void {
    this.searchQuery  = '';
    this.statusFilter = '';
    this.dateRange    = '';
    this.loadAllOrders(0);
  }

  nextStatusLabel(s: string): string {
    const next = this.nextStatusMap[s];
    return next ? `→ ${orderStatusLabel(next)}` : '';
  }

  /* ── Badges urgence ── */
  getOrderBadges(order: OrderResponse): OrderBadge[] {
    const badges: OrderBadge[] = [];
    const hoursSinceUpdate = (Date.now() - new Date(order.updatedAt).getTime()) / 3_600_000;

    if (order.orderStatus === 'CONFIRMED' && hoursSinceUpdate > 48)
      badges.push({ label: 'Retard', classes: 'bg-orange-500/15 text-orange-400 border border-orange-500/25' });

    if (order.promoCode)
      badges.push({ label: 'Promo', classes: 'bg-purple-500/15 text-purple-400 border border-purple-500/25' });

    return badges;
  }

  isUrgentOrder(order: OrderResponse): boolean {
    if (order.orderStatus === 'CONFIRMED') {
      return (Date.now() - new Date(order.updatedAt).getTime()) / 3_600_000 > 48;
    }
    return false;
  }

  /* ── Timeline ── */
  getTimeline(order: OrderResponse): TimelineStep[] {
    const steps: Array<{ status: OrderStatus; label: string }> = [
      { status: OrderStatus.PENDING,   label: 'En attente'  },
      { status: OrderStatus.CONFIRMED, label: 'Confirmée'   },
      { status: OrderStatus.SHIPPED,   label: 'Expédiée'    },
      { status: OrderStatus.DELIVERED, label: 'Livrée'      },
    ];

    const statusOrder = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
    const currentIdx  = statusOrder.indexOf(order.orderStatus);
    const cancelled   = order.orderStatus === 'CANCELLED';

    return steps.map((s, i) => ({
      ...s,
      done:      !cancelled && i < currentIdx,
      active:    !cancelled && i === currentIdx,
      cancelled: cancelled && i === 0,
    }));
  }

  /* ── Chargement ── */
  private _pendingOrderNumber: string | null = null;

  loadAllOrders(page = 0): void {
    this.ordersLoading = true;
    const params: GetOrdersParams = { page, size: 15 };
    if (this.statusFilter)         params.status    = this.statusFilter as OrderStatus;
    if (this.searchQuery.trim())   params.search    = this.searchQuery.trim();
    if (this.dateRange)            params.dateRange  = this.dateRange;
    this.orderService.getAllOrders(params).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.allOrders            = pg.content;
          this.sortByUrgency();
          this.ordersTotalPages     = pg.totalPages;
          this.ordersTotalElements  = pg.totalElements;
          this.ordersPage           = page;

          if (this._pendingOrderNumber) {
            const match = this.allOrders.find(o => o.orderNumber === this._pendingOrderNumber);
            if (match) {
              this._pendingOrderNumber = null;
              this.openOrderDetail(match);
            } else if (this.ordersTotalPages > 0 && page === 0) {
              this.loadAllOrders(this.ordersTotalPages - 1);
            }
          }
        }
        this.ordersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.ordersLoading = false; this.cdr.markForCheck(); },
    });
  }

  loadStatusCounts(): void {
    ([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED] as OrderStatus[]).forEach(status => {
      this.orderService.getAllOrders({ page: 0, size: 1, status }).subscribe({
        next: (r) => {
          if (!r.success) return;
          const count = (r.data as PageResponse<OrderResponse>).totalElements;
          if (status === OrderStatus.CONFIRMED) this.confirmedCount = count;
          if (status === OrderStatus.SHIPPED)   this.shippedCount   = count;
          if (status === OrderStatus.DELIVERED) this.deliveredCount = count;
          this.cdr.markForCheck();
        },
        error: (err) => { console.error('Failed to load status counts', err); },
      });
    });
  }

  /* ── Détail ── */
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

  /* ── Avancement statut ── */
  advanceOrderStatus(order: OrderResponse): void {
    const next = this.nextStatusMap[order.orderStatus];
    if (!next) return;
    this.statusUpdatingId = order.id;
    this.orderService.updateOrderStatus(order.id, next).subscribe({
      next: (r) => {
        if (r.success) {
          this._patchOrder(order.id, r.data);
          this.toast.show(`Commande ${order.orderNumber} → ${orderStatusLabel(next)}`);
          this.loadStatusCounts();
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
    this.cancelConfirmOrder = order;
    this.cancelReason = '';
    this.cdr.markForCheck();
  }

  confirmCancel(): void {
    const order = this.cancelConfirmOrder;
    if (!order) return;
    if (!this.cancelReason.trim()) return;
    const reason = this.cancelReason.trim();
    this.cancelConfirmOrder  = null;
    this.cancelReason        = '';
    this.statusUpdatingId    = order.id;
    this.orderService.cancelOrder(order.id, reason).subscribe({
      next: (r) => {
        if (r.success) {
          this._patchOrder(order.id, r.data);
          this.toast.show(`Commande ${order.orderNumber} annulée`);
          if (this.orderDetailOpen && this.selectedOrder?.id === order.id) this.closeOrderDetail();
        }
        this.statusUpdatingId = null;
        this.loadStatusCounts();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.statusUpdatingId = null;
        this.toast.show(err?.error?.message || "Erreur d'annulation", 'error');
        this.cdr.markForCheck();
      },
    });
  }

  parseDeliveryAddress(address: string): string {
    return address.split(' | Tél:')[0] || address;
  }

  private sortByUrgency(): void {
    const rank = (o: OrderResponse) =>
      this.isUrgentOrder(o) ? 0 : 1;
    this.allOrders = [...this.allOrders].sort((a, b) => rank(a) - rank(b));
  }

  private _patchOrder(id: number, updated: OrderResponse): void {
    const idx = this.allOrders.findIndex(o => o.id === id);
    if (idx !== -1) { this.allOrders = [...this.allOrders]; this.allOrders[idx] = updated; }
    if (this.selectedOrder?.id === id) this.selectedOrder = updated;
  }
}
