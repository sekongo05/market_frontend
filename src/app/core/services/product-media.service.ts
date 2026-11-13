import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import { ProductMediaItem } from '../models/product.models';
import { ApiService } from './api.service';

const ALLOWED_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

@Injectable({
  providedIn: 'root',
})
export class ProductMediaService {
  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  upload(productId: number, file: File, altText?: string): Observable<ApiResponse<ProductMediaItem>> {
    const type = file.type.toLowerCase();
    if (!ALLOWED_MEDIA_TYPES.has(type)) {
      return throwError(() => new Error('Format média non autorisé.'));
    }
    const maxBytes = type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return throwError(() => new Error('Le fichier dépasse la taille maximale autorisée.'));
    }

    const formData = new FormData();
    formData.append('file', file);
    if (altText?.trim()) formData.append('altText', altText.trim());
    return this.http.post<ApiResponse<ProductMediaItem>>(
      `${this.apiService.getBaseUrl()}/products/${productId}/media`,
      formData
    );
  }

  updateAltText(productId: number, mediaId: number, altText: string): Observable<ApiResponse<ProductMediaItem>> {
    return this.http.patch<ApiResponse<ProductMediaItem>>(
      `${this.apiService.getBaseUrl()}/products/${productId}/media/${mediaId}/alt-text?altText=${encodeURIComponent(altText)}`,
      null
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
