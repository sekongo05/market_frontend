import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse, UserRole } from '../models/common.models';
import { UserResponse, UpdateProfileRequest, ChangePasswordRequest, AdminCreateUserRequest, UserFullProfileResponse } from '../models/user.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private apiService: ApiService) {}

  getProfile(): Observable<ApiResponse<UserResponse>> {
    return this.apiService.get('/users/me');
  }

  updateProfile(data: UpdateProfileRequest): Observable<ApiResponse<UserResponse>> {
    return this.apiService.put('/users/me', data);
  }

  changePassword(data: ChangePasswordRequest): Observable<ApiResponse<null>> {
    return this.apiService.patch('/users/me/password', data);
  }

  getAllUsers(page: number = 0, size: number = 10): Observable<ApiResponse<PageResponse<UserResponse>>> {
    return this.apiService.get('/users', { page, size });
  }

  getUserById(id: number): Observable<ApiResponse<UserResponse>> {
    return this.apiService.get(`/users/${id}`);
  }

  toggleUser(id: number): Observable<ApiResponse<null>> {
    return this.apiService.patch(`/users/${id}/toggle`, {});
  }

  changeRole(id: number, role: UserRole): Observable<ApiResponse<UserResponse>> {
    return this.apiService.patch(`/users/${id}/role`, { role });
  }

  createUser(data: AdminCreateUserRequest): Observable<ApiResponse<UserResponse>> {
    return this.apiService.post('/users', data);
  }

  getFullProfile(id: number): Observable<ApiResponse<UserFullProfileResponse>> {
    return this.apiService.get(`/users/${id}/full-profile`);
  }
}
