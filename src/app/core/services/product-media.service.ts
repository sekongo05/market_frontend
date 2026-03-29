import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import { ProductMediaItem } from '../models/product.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ProductMediaService {
  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  upload(productId: number, file: File): Observable<ApiResponse<ProductMediaItem>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<ProductMediaItem>>(
      `${this.apiService.getBaseUrl()}/products/${productId}/media`,
      formData
    );
  }

  getAll(productId: number): Observable<ApiResponse<ProductMediaItem[]>> {
    return this.apiService.get(`/products/${productId}/media`);
  }

  delete(productId: number, mediaId: number): Observable<ApiResponse<null>> {
    return this.apiService.delete(`/products/${productId}/media/${mediaId}`);
  }

  reorder(productId: number, orderedIds: number[]): Observable<ApiResponse<ProductMediaItem[]>> {
    return this.apiService.put(`/products/${productId}/media/reorder`, orderedIds);
  }
}
