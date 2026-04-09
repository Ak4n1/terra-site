import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, from, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CookieService } from '../cookie.service';
import { LanguageService } from '../../i18n/language.service';
import { AuthFacadeService } from '../../../features/auth/services/auth-facade.service';
import { AuthClientConfigService } from '../../../features/auth/services/auth-client-config.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { isApiRequest } from './api-http.interceptor';

const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/login',
  '/oauth/google',
  '/oauth/google/start',
  '/oauth/google/verify-email-code',
  '/oauth/google/resend-email-code',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/resend-verification',
  '/reset-password',
  '/refresh'
]);

let refreshRequest$: Observable<unknown> | null = null;
const CSRF_RETRY_CONTEXT = new HttpContextToken<boolean>(() => false);
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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

async function canProbeSessionAfterFailedRefresh(apiBaseUrl: string, language: string): Promise<boolean> {
  const authMeUrl = `${apiBaseUrl}/api/auth/me`;

  try {
    const response = await fetch(authMeUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept-Language': language,
        'X-Language': language
      }
    });

    return response.ok;
  } catch {
    return false;
  }
}

function isInvalidCsrfError(error: HttpErrorResponse): boolean {
  const body = error.error;
  if (body && typeof body === 'object' && 'code' in body) {
    return String((body as { code?: unknown }).code) === 'auth.invalid_csrf_token';
  }

  if (typeof body === 'string') {
    return body.toLowerCase().includes('csrf');
  }

  return false;
}

export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const authFacade = inject(AuthFacadeService);
  const authClientConfig = inject(AuthClientConfigService);
  const cookieService = inject(CookieService);
  const languageService = inject(LanguageService);
  const apiBaseUrl = environment.apiBaseUrl;

  if (!isApiRequest(req.url, apiBaseUrl)) {
    return next(req);
  }

  return next(req).pipe(
    catchError(error => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 401
        && isInvalidCsrfError(error)
        && MUTATING_METHODS.has(req.method.toUpperCase())
        && !req.context.get(CSRF_RETRY_CONTEXT)) {
        const authConfigUrl = `${apiBaseUrl}/api/auth/config`;
        const language = languageService.language();
        return from(fetch(authConfigUrl, {
          credentials: 'include',
          headers: {
            'Accept-Language': language,
            'X-Language': language
          }
        })).pipe(
          switchMap(() => {
            const csrfToken = cookieService.get(authClientConfig.csrfCookieName);
            const retryReq = req.clone({
              context: req.context.set(CSRF_RETRY_CONTEXT, true),
              setHeaders: csrfToken
                ? { [authClientConfig.csrfHeaderName]: csrfToken }
                : {}
            });
            return next(retryReq);
          })
        );
      }

      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (shouldSkip401Refresh(req.url, apiBaseUrl)) {
        return throwError(() => error);
      }

      return getRefreshRequest(authService).pipe(
        switchMap(() => {
          const csrfToken = cookieService.get(authClientConfig.csrfCookieName);
          const retryReq = req.clone({
            setHeaders: csrfToken
              ? { [authClientConfig.csrfHeaderName]: csrfToken }
              : {}
          });
          return next(retryReq);
        }),
        catchError(refreshError => {
          return from(canProbeSessionAfterFailedRefresh(apiBaseUrl, languageService.language())).pipe(
            switchMap(recovered => {
              if (!recovered) {
                authFacade.handleRefreshFailure();
                return throwError(() => refreshError);
              }

              const csrfToken = cookieService.get(authClientConfig.csrfCookieName);
              const retryReq = req.clone({
                setHeaders: csrfToken
                  ? { [authClientConfig.csrfHeaderName]: csrfToken }
                  : {}
              });
              return next(retryReq);
            }),
            catchError(() => {
              authFacade.handleRefreshFailure();
              return throwError(() => refreshError);
            })
          );
        })
      );
    })
  );
};
