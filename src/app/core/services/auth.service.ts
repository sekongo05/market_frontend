import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ApiResponse } from '../models/common.models';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
} from '../models/auth.models';
import { ApiService } from './api.service';

export interface CurrentUser extends AuthResponse {
  id?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'auth_token';
  private readonly refreshTokenKey = 'refresh_token';
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {
    this.loadUserFromToken();
  }

  register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.apiService.post<AuthResponse>('/auth/register', data).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.setTokens(response.data.token, response.data.refreshToken);
          this.setCurrentUser(response.data);
        }
      })
    );
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.apiService.post<AuthResponse>('/auth/login', data).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.setTokens(response.data.token, response.data.refreshToken);
          this.setCurrentUser(response.data);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
  }

  refreshToken(
    refreshToken: string
  ): Observable<ApiResponse<AuthResponse>> {
    return this.apiService
      .post<AuthResponse>('/auth/refresh', { refreshToken })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.setTokens(response.data.token, response.data.refreshToken);
            this.setCurrentUser(response.data);
          }
        })
      );
  }

  forgotPassword(
    data: ForgotPasswordRequest
  ): Observable<ApiResponse<{ message: string }>> {
    return this.apiService.post('/auth/forgot-password', data);
  }

  resetPassword(
    data: ResetPasswordRequest
  ): Observable<ApiResponse<null>> {
    return this.apiService.post('/auth/reset-password', data);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  private setTokens(token: string, refreshToken: string): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  private setCurrentUser(user: AuthResponse): void {
    localStorage.setItem('current_user', JSON.stringify(user));
    this.currentUserSubject.next(user as CurrentUser);
  }

  private loadUserFromToken(): void {
    // Could be extended to decode JWT and load user data
    const token = this.getToken();
    if (token) {
      // Try to load user from a stored session or the token
      const userJson = localStorage.getItem('current_user');
      if (userJson) {
        try {
          this.currentUserSubject.next(JSON.parse(userJson));
        } catch (e) {
          console.error('Failed to parse stored user', e);
        }
      }
    }
  }
}
