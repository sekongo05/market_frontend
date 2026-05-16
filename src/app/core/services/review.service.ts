import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import { ReviewResponse, ProductRatingResponse, CreateReviewRequest } from '../models/review.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  constructor(private apiService: ApiService) {}

  getProductReviews(productId: number, page = 0, size = 10): Observable<ApiResponse<PageResponse<ReviewResponse>>> {
    return this.apiService.get(`/reviews/product/${productId}`, { page, size });
  }

  getProductRating(productId: number): Observable<ApiResponse<ProductRatingResponse>> {
    return this.apiService.get(`/reviews/product/${productId}/rating`);
  }

  createReview(data: CreateReviewRequest): Observable<ApiResponse<ReviewResponse>> {
    return this.apiService.post('/reviews', data);
  }

  updateReview(id: number, data: CreateReviewRequest): Observable<ApiResponse<ReviewResponse>> {
    return this.apiService.put(`/reviews/${id}`, data);
  }

  deleteReview(id: number): Observable<ApiResponse<void>> {
    return this.apiService.delete(`/reviews/${id}`);
  }

  canReviewProduct(productId: number): Observable<ApiResponse<boolean>> {
    return this.apiService.get(`/reviews/can-review/${productId}`);
  }

  getMyReviews(page = 0, size = 10): Observable<ApiResponse<PageResponse<ReviewResponse>>> {
    return this.apiService.get('/reviews/my', { page, size });
  }

  // Admin
  getAllReviews(page = 0, size = 20): Observable<ApiResponse<PageResponse<ReviewResponse>>> {
    return this.apiService.get('/reviews', { page, size });
  }

  toggleVisibility(id: number): Observable<ApiResponse<ReviewResponse>> {
    return this.apiService.patch(`/reviews/${id}/visibility`, {});
  }

  adminDeleteReview(id: number): Observable<ApiResponse<void>> {
    return this.apiService.delete(`/reviews/${id}/admin`);
  }
}
