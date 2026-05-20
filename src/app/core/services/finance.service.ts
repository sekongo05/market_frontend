import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import { ExpenseCategoryStat, CashFlowResponse } from '../models/expense.models';
import { ApiService } from './api.service';

export interface FinancePeriodStat {
  year: number;
  month: number;
  monthLabel: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
  expenses?: number;
  netProfit?: number;
}

export interface FinanceCategoryStat {
  category: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
  quantity: number;
}

export interface FinanceDashboardResponse {
  periodDays: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  expensesByCategory: ExpenseCategoryStat[];
  deliveredOrderCount: number;
  avgOrderValue: number;
  itemsWithoutCost: number;
  monthly: FinancePeriodStat[];
  byCategory: FinanceCategoryStat[];
}

export interface PinSetupRequest {
  pin: string;
  accountPassword: string;
}

export interface PinVerifyRequest {
  pin: string;
}

export interface PinVerifyResponse {
  financeToken: string;
  expiresInSeconds: number;
}

export interface PinResetRequest {
  accountPassword: string;
  newPin: string;
}

export interface PinStatusResponse {
  pinConfigured: boolean;
}

const FINANCE_TOKEN_KEY = 'finance_token';
const FINANCE_TOKEN_EXPIRY_KEY = 'finance_token_expiry';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  constructor(private apiService: ApiService) {}

  setupPin(request: PinSetupRequest): Observable<ApiResponse<void>> {
    return this.apiService.post('/finance/pin/setup', request);
  }

  verifyPin(request: PinVerifyRequest): Observable<ApiResponse<PinVerifyResponse>> {
    return this.apiService.post('/finance/pin/verify', request);
  }

  resetPin(request: PinResetRequest): Observable<ApiResponse<void>> {
    return this.apiService.post('/finance/pin/reset', request);
  }

  getPinStatus(): Observable<ApiResponse<PinStatusResponse>> {
    return this.apiService.get('/finance/pin/status');
  }

  saveFinanceSession(token: string, expiresInSeconds: number): void {
    const expiry = Date.now() + expiresInSeconds * 1000;
    sessionStorage.setItem(FINANCE_TOKEN_KEY, token);
    sessionStorage.setItem(FINANCE_TOKEN_EXPIRY_KEY, String(expiry));
  }

  hasValidFinanceSession(): boolean {
    const token = sessionStorage.getItem(FINANCE_TOKEN_KEY);
    const expiry = sessionStorage.getItem(FINANCE_TOKEN_EXPIRY_KEY);
    if (!token || !expiry) return false;
    return Date.now() < Number(expiry);
  }

  clearFinanceSession(): void {
    sessionStorage.removeItem(FINANCE_TOKEN_KEY);
    sessionStorage.removeItem(FINANCE_TOKEN_EXPIRY_KEY);
  }

  getDashboard(days: number = 30): Observable<ApiResponse<FinanceDashboardResponse>> {
    return this.apiService.get('/finance/dashboard', { days });
  }

  getStockValue(): Observable<ApiResponse<StockValueResponse>> {
    return this.apiService.get('/finance/stock-value');
  }

  getCashFlow(days: number = 30): Observable<ApiResponse<CashFlowResponse>> {
    return this.apiService.get('/finance/cash-flow', { days });
  }
}

export interface StockAlertItem {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string;
  stock: number;
  costPrice?: number;
  price: number;
  categoryName?: string;
}

export interface StockCategoryStat {
  category: string;
  totalStock: number;
  stockValue: number;
  productCount: number;
}

export interface StockValueResponse {
  totalStockValue: number;
  totalActiveProducts: number;
  productsWithCost: number;
  productsWithoutCost: number;
  outOfStockCount: number;
  lowStockCount: number;
  lowStockThreshold: number;
  byCategory: StockCategoryStat[];
  outOfStock: StockAlertItem[];
  lowStock: StockAlertItem[];
}
