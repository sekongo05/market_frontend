import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OrderService } from '../../../../core/services/order.service';
import { DeliveryService } from '../../../../core/services/delivery.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { ManagerToastService } from '../../shared/manager-toast.service';
import { OrderResponse } from '../../../../core/models/order.models';
import { DeliveryResponse, AddDeliveryEventRequest, UpdateDeliveryRequest } from '../../../../core/models/delivery.models';
import { PageResponse, DeliveryStatus } from '../../../../core/models/common.models';
import { orderStatusLabel, orderStatusClass, deliveryStatusLabel, deliveryStatusClass } from '../../../admin/shared/admin-status.helpers';

@Component({
  selector: 'app-manager-delivery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './manager-delivery.component.html',
})
export class ManagerDeliveryComponent implements OnInit, OnDestroy {

  deliveryOrders: OrderResponse[] = [];
  deliveryOrdersLoading = false;
  deliveryOrdersPage = 0;
  deliveryOrdersTotalPages = 0;
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
  deliveryUpdateSaving = false;
  deliverySubTab: 'events' | 'update' = 'events';

  readonly deliveryStatuses = Object.values(DeliveryStatus);

  private readonly destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private deliveryService: DeliveryService,
    private wsService: WebSocketService,
    private cdr: ChangeDetectorRef,
    private toast: ManagerToastService,
  ) {}

  ngOnInit(): void {
    this.loadDeliveryOrders();
    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.module === 'deliveries') this.loadDeliveryOrders(0);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDeliveryOrders(page = 0): void {
    this.deliveryOrdersLoading = true;
    this.orderService.getAllOrders({ page, size: 20 }).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.deliveryOrders = pg.content.filter(o => ['CONFIRMED', 'DELIVERED'].includes(o.orderStatus));
          this.deliveryOrdersTotalPages = pg.totalPages;
          this.deliveryOrdersPage = page;
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
          this.deliveryUpdateAgent = r.data.deliveryAgent || '';
          this.deliveryUpdateDate = r.data.estimatedDate ? r.data.estimatedDate.split('T')[0] : '';
          this.deliveryUpdateNotes = r.data.notes || '';
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
          this.toast.show('Événement de livraison ajouté ✓');
        }
        this.deliveryEventSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => { this.deliveryEventSaving = false; this.toast.show(err?.error?.message || 'Erreur', 'error'); this.cdr.markForCheck(); },
    });
  }

  submitDeliveryUpdate(): void {
    if (!this.selectedDelivery) return;
    this.deliveryUpdateSaving = true;
    const data: UpdateDeliveryRequest = {
      deliveryAgent: this.deliveryUpdateAgent.trim() || undefined,
      estimatedDate: this.deliveryUpdateDate || undefined,
      notes: this.deliveryUpdateNotes.trim() || undefined,
    };
    this.deliveryService.updateDelivery(this.selectedDelivery.id, data).subscribe({
      next: (r) => {
        if (r.success) { this.selectedDelivery = r.data; this.toast.show('Informations de livraison mises à jour ✓'); }
        this.deliveryUpdateSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => { this.deliveryUpdateSaving = false; this.toast.show(err?.error?.message || 'Erreur', 'error'); this.cdr.markForCheck(); },
    });
  }

  readonly deliveryStatusLabel = deliveryStatusLabel;
  readonly deliveryStatusClass = deliveryStatusClass;
  readonly orderStatusLabel = orderStatusLabel;
  readonly orderStatusClass = orderStatusClass;

  formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
    if (amount >= 1_000) return Math.round(amount / 1_000) + 'K';
    return amount.toString();
  }

  get deliveryOrderPages(): number[] { return Array.from({ length: this.deliveryOrdersTotalPages }, (_, i) => i); }
}
