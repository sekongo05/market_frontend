import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import { ExpenseResponse, ExpenseRequest } from '../models/expense.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  constructor(private apiService: ApiService) {}

  getAll(): Observable<ApiResponse<ExpenseResponse[]>> {
    return this.apiService.get('/finance/expenses');
  }

  getByPeriod(start: string, end: string): Observable<ApiResponse<ExpenseResponse[]>> {
    return this.apiService.get('/finance/expenses/period', { start, end });
  }

  create(request: ExpenseRequest): Observable<ApiResponse<ExpenseResponse>> {
    return this.apiService.post('/finance/expenses', request);
  }

  update(id: number, request: ExpenseRequest): Observable<ApiResponse<ExpenseResponse>> {
    return this.apiService.put(`/finance/expenses/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.apiService.delete(`/finance/expenses/${id}`);
  }
}
