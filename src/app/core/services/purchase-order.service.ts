import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import {
  PurchaseOrderResponse,
  PurchaseOrderRequest,
  GoodsReceiptRequest,
} from '../models/purchase-order.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  constructor(private apiService: ApiService) {}

  getAll(): Observable<ApiResponse<PurchaseOrderResponse[]>> {
    return this.apiService.get('/finance/purchase-orders');
  }

  getById(id: number): Observable<ApiResponse<PurchaseOrderResponse>> {
    return this.apiService.get(`/finance/purchase-orders/${id}`);
  }

  create(request: PurchaseOrderRequest): Observable<ApiResponse<PurchaseOrderResponse>> {
    return this.apiService.post('/finance/purchase-orders', request);
  }

  update(id: number, request: PurchaseOrderRequest): Observable<ApiResponse<PurchaseOrderResponse>> {
    return this.apiService.put(`/finance/purchase-orders/${id}`, request);
  }

  cancel(id: number): Observable<ApiResponse<PurchaseOrderResponse>> {
    return this.apiService.post(`/finance/purchase-orders/${id}/cancel`, {});
  }

  receive(id: number, request: GoodsReceiptRequest): Observable<ApiResponse<PurchaseOrderResponse>> {
    return this.apiService.post(`/finance/purchase-orders/${id}/receive`, request);
  }
}
