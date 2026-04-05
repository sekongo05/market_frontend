import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import { PromoResponse, PromoCheckResponse, CreatePromoRequest, PublicPromoResponse } from '../models/promo.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class PromoService {
  constructor(private apiService: ApiService) {}

  getActivePromos(): Observable<ApiResponse<PublicPromoResponse[]>> {
    return this.apiService.get('/promos/active');
  }

  checkPromo(code: string, amount: number): Observable<ApiResponse<PromoCheckResponse>> {
    return this.apiService.get(`/promos/check?code=${encodeURIComponent(code)}&amount=${amount}`);
  }

  getAllPromos(): Observable<ApiResponse<PromoResponse[]>> {
    return this.apiService.get('/promos');
  }

  createPromo(data: CreatePromoRequest): Observable<ApiResponse<PromoResponse>> {
    return this.apiService.post('/promos', data);
  }

  togglePromo(id: number): Observable<ApiResponse<PromoResponse>> {
    return this.apiService.patch(`/promos/${id}/toggle`, {});
  }

  deletePromo(id: number): Observable<ApiResponse<void>> {
    return this.apiService.delete(`/promos/${id}`);
  }
}
