import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import {
  ProductResponse,
  CreateProductRequest,
  UpdateProductRequest,
  GetProductsParams,
} from '../models/product.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(private apiService: ApiService) {}

  getProducts(params?: GetProductsParams): Observable<ApiResponse<PageResponse<ProductResponse>>> {
    return this.apiService.get('/products', params);
  }

  getProductById(id: number): Observable<ApiResponse<ProductResponse>> {
    return this.apiService.get(`/products/${id}`);
  }

  getProductBySlug(slug: string): Observable<ApiResponse<ProductResponse>> {
    return this.apiService.get(`/products/slug/${slug}`);
  }

  createProduct(formData: FormData): Observable<ApiResponse<ProductResponse>> {
    return this.apiService.post('/products', formData);
  }

  updateProduct(id: number, formData: FormData): Observable<ApiResponse<ProductResponse>> {
    return this.apiService.put(`/products/${id}`, formData);
  }

  deleteProduct(id: number): Observable<ApiResponse<null>> {
    return this.apiService.delete(`/products/${id}`);
  }
}
