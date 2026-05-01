import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import { ApiService } from './api.service';

export interface DashboardStats {
  // Commandes
  totalOrders: number;
  completedOrdersCount: number;
  pendingOrders: number;
  newOrdersThisMonth: number;
  // Revenu (basé sur les paiements validés)
  totalRevenue: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  // Utilisateurs
  totalUsers: number;
  newUsersThisMonth: number;
  // Produits & stock
  totalActiveProducts: number;
  lowStockCount: number;
  // Détails
  recentOrders: RecentOrder[];
  ordersByStatus: OrderByStatus[];
}

export interface RecentOrder {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  orderStatus: string;
  createdAt: string;
}

export interface OrderByStatus {
  status: string;
  count: number;
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

export interface DailyCaisseResponse {
  date: string;
  ordersCount: number;
  paidOrdersCount: number;
  totalRevenue: number;
  pendingRevenue: number;
  newCustomersCount: number;
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

  getManagerStats(): Observable<ApiResponse<any>> {
    return this.apiService.get('/dashboard/manager-stats');
  }

  getDailyCaisse(date?: string): Observable<ApiResponse<DailyCaisseResponse>> {
    const params = date ? { date } : {};
    return this.apiService.get('/dashboard/caisse-journaliere', params);
  }
}
