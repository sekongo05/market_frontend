import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import {
  CreateOrderRequest,
  OrderResponse,
  GetOrdersParams,
} from '../models/order.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  pendingPaymentCount$ = new BehaviorSubject<number>(0);

  constructor(private apiService: ApiService) {}

  createOrder(data: CreateOrderRequest): Observable<ApiResponse<OrderResponse>> {
    return this.apiService.post('/orders', data);
  }

  getMyOrders(page: number = 0, size: number = 10): Observable<ApiResponse<PageResponse<OrderResponse>>> {
    return this.apiService.get('/orders/my-orders', { page, size });
  }

  getOrderById(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.apiService.get(`/orders/${id}`);
  }

  getAllOrders(params?: GetOrdersParams): Observable<ApiResponse<PageResponse<OrderResponse>>> {
    return this.apiService.get('/orders', params);
  }

  updateOrderStatus(id: number, status: string): Observable<ApiResponse<OrderResponse>> {
    return this.apiService.patch(`/orders/${id}/status?status=${status}`);
  }

  cancelOrder(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.apiService.post(`/orders/${id}/cancel`, {});
  }

  refreshPendingCount(): void {
    this.getMyOrders(0, 50).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          const count = pg.content.filter(
            (o) =>
              o.orderStatus === 'PENDING' &&
              (o.paymentStatus === 'PENDING' || o.paymentStatus === 'FAILED'),
          ).length;
          this.pendingPaymentCount$.next(count);
        }
      },
      error: () => {},
    });
  }

  clearPendingCount(): void {
    this.pendingPaymentCount$.next(0);
  }
}
