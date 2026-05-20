import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import {
  SupplierResponse,
  SupplierRequest,
  ProductSupplierResponse,
  ProductSupplierRequest,
} from '../models/supplier.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  constructor(private apiService: ApiService) {}

  getAll(): Observable<ApiResponse<SupplierResponse[]>> {
    return this.apiService.get('/suppliers');
  }

  getById(id: number): Observable<ApiResponse<SupplierResponse>> {
    return this.apiService.get(`/suppliers/${id}`);
  }

  create(request: SupplierRequest): Observable<ApiResponse<SupplierResponse>> {
    return this.apiService.post('/suppliers', request);
  }

  update(id: number, request: SupplierRequest): Observable<ApiResponse<SupplierResponse>> {
    return this.apiService.put(`/suppliers/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.apiService.delete(`/suppliers/${id}`);
  }

  getSuppliersForProduct(productId: number): Observable<ApiResponse<ProductSupplierResponse[]>> {
    return this.apiService.get(`/suppliers/product/${productId}`);
  }

  linkSupplier(productId: number, request: ProductSupplierRequest): Observable<ApiResponse<ProductSupplierResponse[]>> {
    return this.apiService.post(`/suppliers/product/${productId}`, request);
  }

  updateLink(productId: number, linkId: number, request: ProductSupplierRequest): Observable<ApiResponse<ProductSupplierResponse[]>> {
    return this.apiService.put(`/suppliers/product/${productId}/link/${linkId}`, request);
  }

  unlinkSupplier(productId: number, linkId: number): Observable<ApiResponse<void>> {
    return this.apiService.delete(`/suppliers/product/${productId}/link/${linkId}`);
  }
}
