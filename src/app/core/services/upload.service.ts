import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../models/common.models';
import { ApiService } from './api.service';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);
const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  private _validateImage(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      return 'Format de fichier non autorisé. Utilisez JPG, PNG, WebP ou GIF.';
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return 'Le fichier dépasse la taille maximale autorisée (15 Mo).';
    }
    return null;
  }

  uploadProductImage(file: File): Observable<string> {
    const error = this._validateImage(file);
    if (error) return throwError(() => new Error(error));

    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiResponse<string>>(
        `${this.apiService.getBaseUrl()}/upload/product-image`,
        formData
      )
      .pipe(map((response) => {
        const serverRoot = this.apiService.getBaseUrl().replace('/api', '');
        return `${serverRoot}/${response.data}`;
      }));
  }

  uploadCategoryImage(file: File): Observable<string> {
    const error = this._validateImage(file);
    if (error) return throwError(() => new Error(error));

    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<ApiResponse<string>>(
        `${this.apiService.getBaseUrl()}/upload/category-image`,
        formData
      )
      .pipe(map((response) => response.data));
  }
}
