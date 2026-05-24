import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
import { WebSocketService } from './websocket.service';

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

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {
    this.loadUserFromToken();
  }

  register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.apiService.post<AuthResponse>('/auth/register', data).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.setTokens(response.data.token, response.data.refreshToken);
          this.setCurrentUser(response.data);
          this._connectWs(response.data);
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
          this._connectWs(response.data);
        }
      })
    );
  }

  logout(): void {
    this._storage('remove', this.tokenKey);
    this._storage('remove', this.refreshTokenKey);
    this._storage('remove', 'current_user');
    this.currentUserSubject.next(null);
    this.webSocketService.connect();
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
            this._connectWs(response.data);
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
    return this._storage('get', this.tokenKey);
  }

  getRefreshToken(): string | null {
    return this._storage('get', this.refreshTokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  private setTokens(token: string, refreshToken: string): void {
    this._storage('set', this.tokenKey, token);
    this._storage('set', this.refreshTokenKey, refreshToken);
  }

  private setCurrentUser(user: AuthResponse): void {
    this._storage('set', 'current_user', JSON.stringify(user));
    this.currentUserSubject.next(user as CurrentUser);
  }

  private _connectWs(user: AuthResponse): void {
    const token = this.getToken();
    if (!token) return;
    const isStaff = user.role === 'ADMIN' || user.role === 'MANAGER';
    this.webSocketService.connect(token, isStaff);
  }

  private loadUserFromToken(): void {
    const token = this.getToken();
    if (token) {
      const userJson = this._storage('get', 'current_user');
      if (userJson) {
        try {
          const user: AuthResponse = JSON.parse(userJson);
          this.currentUserSubject.next(user as CurrentUser);
          this._connectWs(user);
          return;
        } catch (e) {
          console.error('Failed to parse stored user', e);
          this._storage('remove', 'current_user');
        }
      }
    }
    if (this.isBrowser) {
      this.webSocketService.connect();
    }
  }

  private _storage(op: 'get', key: string): string | null;
  private _storage(op: 'set', key: string, value: string): void;
  private _storage(op: 'remove', key: string): void;
  private _storage(op: 'get' | 'set' | 'remove', key: string, value?: string): string | null | void {
    if (!this.isBrowser) return op === 'get' ? null : undefined;
    if (op === 'get') return localStorage.getItem(key);
    if (op === 'set') localStorage.setItem(key, value!);
    if (op === 'remove') localStorage.removeItem(key);
  }
}
