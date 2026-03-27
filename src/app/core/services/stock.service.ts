import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import {
  AddStockRequest,
  AdjustStockRequest,
  StockMovementResponse,
  LowStockResponse,
  GetStockMovementsParams,
  GetLowStockParams,
} from '../models/stock.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class StockService {
  constructor(private apiService: ApiService) {}

  addStock(data: AddStockRequest): Observable<ApiResponse<StockMovementResponse>> {
    return this.apiService.post('/stock/add', data);
  }

  adjustStock(data: AdjustStockRequest): Observable<ApiResponse<StockMovementResponse>> {
    return this.apiService.post('/stock/adjust', data);
  }

  getStockMovements(
    params?: GetStockMovementsParams
  ): Observable<ApiResponse<PageResponse<StockMovementResponse>>> {
    return this.apiService.get('/stock/movements', params);
  }

  getProductStockMovements(
    productId: number,
    params?: GetStockMovementsParams
  ): Observable<ApiResponse<PageResponse<StockMovementResponse>>> {
    return this.apiService.get(`/stock/movements/product/${productId}`, params);
  }

  getLowStock(threshold: number): Observable<ApiResponse<LowStockResponse[]>> {
    return this.apiService.get('/stock/low-stock', { threshold });
  }
}
