import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductVariant } from '../models/product.models';

export interface ApiResponse<T> { success: boolean; data: T; message?: string; }

export interface ProductVariantRequest {
  colorName: string;
  colorHex: string;
  imageUrl?: string;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class ProductVariantService {
  private readonly base = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getVariants(productId: number): Observable<ApiResponse<ProductVariant[]>> {
    return this.http.get<ApiResponse<ProductVariant[]>>(`${this.base}/${productId}/variants`);
  }

  addVariant(productId: number, req: ProductVariantRequest): Observable<ApiResponse<ProductVariant>> {
    return this.http.post<ApiResponse<ProductVariant>>(`${this.base}/${productId}/variants`, req);
  }

  updateVariant(productId: number, variantId: number, req: ProductVariantRequest): Observable<ApiResponse<ProductVariant>> {
    return this.http.put<ApiResponse<ProductVariant>>(`${this.base}/${productId}/variants/${variantId}`, req);
  }

  deleteVariant(productId: number, variantId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${productId}/variants/${variantId}`);
  }
}
