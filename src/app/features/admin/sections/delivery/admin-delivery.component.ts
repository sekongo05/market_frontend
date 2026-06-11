import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OrderService } from '../../../../core/services/order.service';
import { DeliveryService } from '../../../../core/services/delivery.service';
import { OrderResponse, GetOrdersParams } from '../../../../core/models/order.models';
import { DeliveryResponse, AddDeliveryEventRequest, UpdateDeliveryRequest } from '../../../../core/models/delivery.models';
import { DeliveryStatus, OrderStatus, PageResponse } from '../../../../core/models/common.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { orderStatusLabel, orderStatusClass, deliveryStatusLabel, deliveryStatusClass } from '../../shared/admin-status.helpers';

@Component({
  selector: 'app-admin-delivery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-delivery.component.html',
})
export class AdminDeliveryComponent implements OnInit, OnDestroy {
  deliveryOrders: OrderResponse[] = [];
  deliveryOrdersLoading = false;
  totalOrders = 0;
  expandedDeliveryOrderId: number | null = null;
  selectedDelivery: DeliveryResponse | null = null;
  deliveryDetailLoading = false;
  deliveryEventStatus: DeliveryStatus = DeliveryStatus.OUT_FOR_DELIVERY;
  deliveryEventDesc = '';
  deliveryEventLocation = '';
  deliveryEventSaving = false;
  deliveryUpdateAgent = '';
  deliveryUpdateDate = '';
  deliveryUpdateNotes = '';
  deliveryUpdateCarrier = '';
  deliveryUpdateCarrierUrl = '';
  deliveryUpdateSaving = false;
  deliverySubTab: 'events' | 'update' = 'events';

  /* ── Filtres ── */
  searchQuery = '';
  filterOrderStatus: '' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' = '';

  readonly deliveryStatuses = Object.values(DeliveryStatus);
  readonly orderStatusLabel    = orderStatusLabel;
  readonly orderStatusClass    = orderStatusClass;
  readonly deliveryStatusLabel = deliveryStatusLabel;
  readonly deliveryStatusClass = deliveryStatusClass;
  readonly formatCurrency = (v: number | null | undefined) => `${Number(v ?? 0).toLocaleString('fr-FR')}`;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private deliveryService: DeliveryService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDeliveryOrders();
    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.module === 'deliveries') this.loadDeliveryOrders();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredOrders(): OrderResponse[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.deliveryOrders.filter(o => {
      const matchStatus = !this.filterOrderStatus || o.orderStatus === this.filterOrderStatus;
      const matchSearch = !q
        || o.orderNumber.toLowerCase().includes(q)
        || (o.customerName ?? '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery || !!this.filterOrderStatus;
  }

  onSearchChange(): void { this.cdr.markForCheck(); }

  applyFilter(): void { this.cdr.markForCheck(); }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterOrderStatus = '';
    this.cdr.markForCheck();
  }

  /* Retourne true si la commande est confirmée mais pas encore expédiée depuis 48h+ */
  isDelayedShipment(order: OrderResponse): boolean {
    if (order.orderStatus !== 'CONFIRMED') return false;
    return (Date.now() - new Date(order.updatedAt).getTime()) / 3_600_000 > 48;
  }

  /* Retourne l'âge en heures depuis la dernière mise à jour */
  hoursInCurrentStatus(order: OrderResponse): number {
    return Math.floor((Date.now() - new Date(order.updatedAt).getTime()) / 3_600_000);
  }

  loadDeliveryOrders(): void {
    this.deliveryOrdersLoading = true;
    const params: GetOrdersParams = { page: 0, size: 50 };
    this.orderService.getAllOrders(params).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.deliveryOrders = pg.content.filter(o =>
            (['CONFIRMED', 'SHIPPED', 'DELIVERED'] as string[]).includes(o.orderStatus),
          );
          this.totalOrders = this.deliveryOrders.length;
        }
        this.deliveryOrdersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.deliveryOrdersLoading = false; this.cdr.markForCheck(); },
    });
  }

  toggleDeliveryOrder(orderId: number): void {
    if (this.expandedDeliveryOrderId === orderId) {
      this.expandedDeliveryOrderId = null;
      this.selectedDelivery = null;
      this.cdr.markForCheck();
      return;
    }
    this.expandedDeliveryOrderId = orderId;
    this.selectedDelivery = null;
    this.deliveryDetailLoading = true;
    this.deliverySubTab = 'events';
    this.cdr.markForCheck();
    this.deliveryService.getDeliveryByOrder(orderId).subscribe({
      next: (r) => {
        if (r.success) {
          this.selectedDelivery = r.data;
          this.deliveryUpdateAgent      = r.data.deliveryAgent || '';
          this.deliveryUpdateDate       = r.data.estimatedDate ? r.data.estimatedDate.split('T')[0] : '';
          this.deliveryUpdateNotes      = r.data.notes || '';
          this.deliveryUpdateCarrier    = r.data.carrierName || '';
          this.deliveryUpdateCarrierUrl = r.data.carrierTrackingUrl || '';
        }
        this.deliveryDetailLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.deliveryDetailLoading = false; this.cdr.markForCheck(); },
    });
  }

  submitDeliveryEvent(): void {
    if (!this.selectedDelivery || !this.deliveryEventDesc.trim()) return;
    this.deliveryEventSaving = true;
    const data: AddDeliveryEventRequest = {
      status: this.deliveryEventStatus,
      description: this.deliveryEventDesc.trim(),
      location: this.deliveryEventLocation.trim() || undefined,
    };
    this.deliveryService.addDeliveryEvent(this.selectedDelivery.id, data).subscribe({
      next: (r) => {
        if (r.success) {
          this.selectedDelivery = r.data;
          this.deliveryEventDesc = '';
          this.deliveryEventLocation = '';
          this.toast.show('Événement ajouté');
        }
        this.deliveryEventSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.deliveryEventSaving = false;
        this.toast.show(err?.error?.message || 'Erreur', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  submitDeliveryUpdate(): void {
    if (!this.selectedDelivery) return;
    this.deliveryUpdateSaving = true;
    const data: UpdateDeliveryRequest = {
      deliveryAgent:      this.deliveryUpdateAgent.trim()      || undefined,
      estimatedDate:      this.deliveryUpdateDate              || undefined,
      notes:              this.deliveryUpdateNotes.trim()      || undefined,
      carrierName:        this.deliveryUpdateCarrier.trim()    || undefined,
      carrierTrackingUrl: this.deliveryUpdateCarrierUrl.trim() || undefined,
    };
    this.deliveryService.updateDelivery(this.selectedDelivery.id, data).subscribe({
      next: (r) => {
        if (r.success) { this.selectedDelivery = r.data; this.toast.show('Livraison mise à jour'); }
        this.deliveryUpdateSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.deliveryUpdateSaving = false;
        this.toast.show(err?.error?.message || 'Erreur', 'error');
        this.cdr.markForCheck();
      },
    });
  }
}
