import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthFacadeService } from '../../../features/auth/services/auth-facade.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { isApiRequest } from './api-http.interceptor';

const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/resend-verification',
  '/reset-password',
  '/refresh'
]);

let refreshRequest$: Observable<unknown> | null = null;

function getApiPath(url: string, apiBaseUrl: string): string {
  if (url.startsWith('/api/')) {
    return url.replace(/^\/api/, '');
  }

  if (apiBaseUrl && url.startsWith(apiBaseUrl)) {
    const normalized = url.slice(apiBaseUrl.length);
    return normalized.startsWith('/api/') ? normalized.replace(/^\/api/, '') : normalized;
  }

  return url;
}

function shouldSkip401Refresh(url: string, apiBaseUrl: string): boolean {
  const apiPath = getApiPath(url, apiBaseUrl);
  return PUBLIC_AUTH_ENDPOINTS.has(apiPath.replace(/^\/auth/, ''));
}

function getRefreshRequest(authService: AuthService): Observable<unknown> {
  if (refreshRequest$) {
    return refreshRequest$;
  }

  refreshRequest$ = authService.refreshSession().pipe(
    finalize(() => {
      refreshRequest$ = null;
    }),
    shareReplay(1)
  );

  return refreshRequest$;
}

export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const authFacade = inject(AuthFacadeService);
  const apiBaseUrl = environment.apiBaseUrl;

  if (!isApiRequest(req.url, apiBaseUrl)) {
    return next(req);
  }

  return next(req).pipe(
    catchError(error => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      if (shouldSkip401Refresh(req.url, apiBaseUrl)) {
        return throwError(() => error);
      }

      return getRefreshRequest(authService).pipe(
        switchMap(() => next(req)),
        catchError(refreshError => {
          authFacade.handleRefreshFailure();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
