import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from "@angular/common/http";
import { Observable } from "rxjs";
import { AuthService } from "../services/auth.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Ne jamais injecter de Bearer token expiré sur les routes auth publiques
    if (this._isAuthEndpoint(request.url)) {
      return next.handle(request);
    }

    const token = this.authService.getToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request);
  }

  private _isAuthEndpoint(url: string): boolean {
    return url.includes("/auth/login") ||
           url.includes("/auth/register") ||
           url.includes("/auth/refresh") ||
           url.includes("/auth/forgot-password") ||
           url.includes("/auth/reset-password");
  }
}
