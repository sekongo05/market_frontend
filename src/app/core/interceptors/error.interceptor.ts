import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this._isRefreshRequest(request)) {
          return this._handle401(request, next);
        }

        if (error.status === 403) {
          console.error('Forbidden - access denied');
        }

        if (error.status === 429) {
          console.warn('Rate limited – 429 Too Many Requests');
        }

        return throwError(() => error);
      })
    );
  }

  private _isRefreshRequest(request: HttpRequest<unknown>): boolean {
    return request.url.includes('/auth/refresh');
  }

  private _handle401(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const refreshToken = this.authService.getRefreshToken();

    if (!refreshToken) {
      this._logout();
      return throwError(
        () => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
      );
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken(refreshToken).pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          if (response.success && response.data) {
            this.refreshTokenSubject.next(response.data.token);
            return next.handle(
              this._addToken(request, response.data.token)
            );
          }
          this._logout();
          return throwError(
            () => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
          );
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this._logout();
          return throwError(() => err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) =>
          next.handle(this._addToken(request, token!))
        )
      );
    }
  }

  private _addToken(
    request: HttpRequest<unknown>,
    token: string
  ): HttpRequest<unknown> {
    return request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  private readonly _protectedRoutes = ['/admin', '/manager', '/checkout', '/orders', '/profile'];

  private _logout(): void {
    const returnUrl = this.router.url;
    this.authService.logout();

    const isProtected = this._protectedRoutes.some(route => returnUrl.startsWith(route));
    if (isProtected) {
      this.router.navigate(['/auth/login'], {
        queryParams: returnUrl !== '/' ? { returnUrl } : undefined,
      });
    }
  }
}
