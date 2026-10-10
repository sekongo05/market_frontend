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

        const sanitizedError = this._sanitizeError(error);
        return throwError(() => sanitizedError);
      })
    );
  }

  private _sanitizeError(error: HttpErrorResponse): HttpErrorResponse {
    const rawMessage = (typeof error.error?.message === 'string')
      ? error.error.message.trim()
      : (typeof error.error === 'string' ? error.error.trim() : '');

    // Patterns techniques typiques des stacktraces / exceptions Java ou SQL
    const technicalPatterns = [
      /rollback/i,
      /exception/i,
      /nullpointer/i,
      /sql/i,
      /hibernate/i,
      /jdbc/i,
      /deadlock/i,
      /constraint/i,
      /org\.springframework/i,
      /java\./i,
      /internal server error/i,
      /stacktrace/i,
      /could not execute/i,
      /cannot be cast/i,
      /lazy.*initial/i,
      /bad sql grammar/i,
      /nested.*exception/i,
      /transaction/i
    ];

    const isTechnical = technicalPatterns.some(pattern => pattern.test(rawMessage));

    let userFriendlyMessage = rawMessage;

    if (error.status === 0) {
      userFriendlyMessage = "Impossible de joindre le serveur. Veuillez vérifier votre connexion internet.";
    } else if (error.status >= 500 || isTechnical) {
      userFriendlyMessage = "Une erreur technique est survenue sur le serveur. Veuillez réessayer dans un instant.";
    } else if (error.status === 403) {
      userFriendlyMessage = "Accès refusé. Vous n'avez pas les autorisations nécessaires.";
    } else if (error.status === 404 && (!rawMessage || rawMessage.toLowerCase().includes('not found'))) {
      userFriendlyMessage = "L'élément demandé est introuvable.";
    } else if (error.status === 429) {
      userFriendlyMessage = "Trop de requêtes effectuées. Veuillez patienter un instant.";
    } else if (!userFriendlyMessage) {
      userFriendlyMessage = "Une erreur est survenue lors de l'opération.";
    }

    const errorBody = (typeof error.error === 'object' && error.error !== null)
      ? { ...error.error, message: userFriendlyMessage, rawTechnicalMessage: rawMessage }
      : { message: userFriendlyMessage, rawTechnicalMessage: rawMessage };

    return new HttpErrorResponse({
      error: errorBody,
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url ?? undefined,
    });
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
        catchError((err: HttpErrorResponse) => {
          this.isRefreshing = false;
          // Only log out if it's a client error (e.g. 401, 403, 400).
          // Do NOT log out on network error (0) or server error (50x).
          if (err.status !== 0) {
            this._logout();
          }
          return throwError(() => this._sanitizeError(err));
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
