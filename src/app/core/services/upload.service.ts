import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../models/common.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  uploadProductImage(file: File): Observable<string> {
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
}
