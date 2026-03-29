import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from '../models/category.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(private apiService: ApiService) {}

  getCategories(): Observable<ApiResponse<CategoryResponse[]>> {
    return this.apiService.get('/categories');
  }

  getCategoryById(id: number): Observable<ApiResponse<CategoryResponse>> {
    return this.apiService.get(`/categories/${id}`);
  }

  getCategoryBySlug(slug: string): Observable<ApiResponse<CategoryResponse>> {
    return this.apiService.get(`/categories/slug/${slug}`);
  }

  createCategory(data: CreateCategoryRequest): Observable<ApiResponse<CategoryResponse>> {
    return this.apiService.post('/categories', data);
  }

  updateCategory(id: number, data: UpdateCategoryRequest): Observable<ApiResponse<CategoryResponse>> {
    return this.apiService.put(`/categories/${id}`, data);
  }

  getAllForAdmin(): Observable<ApiResponse<CategoryResponse[]>> {
    return this.apiService.get('/categories/admin/all');
  }

  toggleCategoryActive(id: number): Observable<ApiResponse<CategoryResponse>> {
    return this.apiService.patch(`/categories/${id}/toggle`, {});
  }

  deleteCategory(id: number): Observable<ApiResponse<null>> {
    return this.apiService.delete(`/categories/${id}`);
  }
}
