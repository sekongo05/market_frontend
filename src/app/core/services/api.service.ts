import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, retry, timeout } from 'rxjs/operators';
import { ApiResponse } from '../models/common.models';
import { environment } from '../../../environments/environment';

interface EtagEntry {
  etag: string;
  data: ApiResponse<unknown>;
}

interface TtlEntry {
  data: ApiResponse<unknown>;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  private static readonly DEFAULT_TIMEOUT = 15000;
  private static readonly DEFAULT_TTL_MS = 30_000;
  private static readonly RETRY_COUNT = 2;
  private static readonly RETRY_DELAY_MS = 1000;
  private readonly etagCache = new Map<string, EtagEntry>();
  private readonly ttlCache = new Map<string, TtlEntry>();

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, params?: any): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    const cacheKey = this.buildCacheKey(endpoint, httpParams);
    const ttlHit = this.ttlCache.get(cacheKey);
    if (ttlHit && Date.now() < ttlHit.expiresAt) {
      return of(ttlHit.data as ApiResponse<T>);
    }

    const cached = this.etagCache.get(cacheKey);
    let headers = new HttpHeaders();
    if (cached) {
      headers = headers.set('If-None-Match', cached.etag);
    }

    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
      params: httpParams,
      headers,
      observe: 'response',
    }).pipe(
      retry(this.retryConfig()),
      map((response: HttpResponse<ApiResponse<T>>) => {
        if (response.status === 304 && cached) {
          this.ttlCache.set(cacheKey, { data: cached.data, expiresAt: Date.now() + this.resolveTtl(response) });
          return cached.data as ApiResponse<T>;
        }
        const etag = response.headers.get('ETag');
        if (etag && response.body) {
          this.etagCache.set(cacheKey, { etag, data: response.body });
        }
        if (response.body) {
          this.ttlCache.set(cacheKey, { data: response.body, expiresAt: Date.now() + this.resolveTtl(response) });
        }
        return response.body as ApiResponse<T>;
      }),
      timeout(ApiService.DEFAULT_TIMEOUT),
    );
  }

  post<T>(endpoint: string, body?: any): Observable<ApiResponse<T>> {
    this.ttlCache.clear();
    this.etagCache.clear();
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body)
      .pipe(retry(this.retryConfig()), timeout(ApiService.DEFAULT_TIMEOUT));
  }

  put<T>(endpoint: string, body?: any): Observable<ApiResponse<T>> {
    this.ttlCache.clear();
    this.etagCache.clear();
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body)
      .pipe(retry(this.retryConfig()), timeout(ApiService.DEFAULT_TIMEOUT));
  }

  patch<T>(endpoint: string, body?: any): Observable<ApiResponse<T>> {
    this.ttlCache.clear();
    this.etagCache.clear();
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body)
      .pipe(retry(this.retryConfig()), timeout(ApiService.DEFAULT_TIMEOUT));
  }

  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    this.ttlCache.clear();
    this.etagCache.clear();
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`)
      .pipe(retry(this.retryConfig()), timeout(ApiService.DEFAULT_TIMEOUT));
  }

  clearCaches(): void {
    this.ttlCache.clear();
    this.etagCache.clear();
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private retryConfig() {
    return {
      count: ApiService.RETRY_COUNT,
      delay: (error: any, retryCount: number) => {
        if (error.status === 401 || error.status === 403 || error.status === 404 || error.status === 422) {
          return throwError(() => error);
        }
        return timer(retryCount * ApiService.RETRY_DELAY_MS);
      },
    };
  }

  private resolveTtl(response: HttpResponse<unknown>): number {
    const cacheControl = response.headers.get('Cache-Control');
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match) return parseInt(match[1], 10) * 1000;
    }
    return ApiService.DEFAULT_TTL_MS;
  }

  private buildCacheKey(endpoint: string, params: HttpParams): string {
    const paramStr = params.toString();
    return paramStr ? `${endpoint}?${paramStr}` : endpoint;
  }
}