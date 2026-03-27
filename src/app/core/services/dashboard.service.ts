import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import { ApiService } from './api.service';

export interface DashboardStats {
  totalOrders: number;
  totalUsers: number;
  totalActiveProducts: number;
  pendingOrders: number;
  lowStockCount: number;
  totalRevenue: number;
  recentOrders: any[];
  ordersByStatus: any[];
}

export interface RevenueResponse {
  revenue: number;
  start: string;
  end: string;
}

export interface MonthlyRevenueItem {
  month: number;
  monthName: string;
  revenue: number;
}

export interface TopProductItem {
  productId: number;
  productName: string;
  totalSold: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  getStats(): Observable<ApiResponse<DashboardStats>> {
    return this.apiService.get('/dashboard/stats');
  }

  getRevenue(start: string, end: string): Observable<ApiResponse<RevenueResponse>> {
    return this.apiService.get('/dashboard/revenue', { start, end });
  }

  getMonthlyRevenue(year: number): Observable<ApiResponse<MonthlyRevenueItem[]>> {
    return this.apiService.get('/dashboard/monthly-revenue', { year });
  }

  getTopProducts(limit: number = 5): Observable<ApiResponse<TopProductItem[]>> {
    return this.apiService.get('/dashboard/top-products', { limit });
  }
}
