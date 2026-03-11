import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CookieService } from '../cookie.service';
import { LanguageService } from '../../i18n/language.service';
import { environment } from '../../../../environments/environment';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-CSRF-TOKEN';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isApiRequest(url: string, apiBaseUrl: string): boolean {
  return url.startsWith('/api/') || (!!apiBaseUrl && url.startsWith(apiBaseUrl));
}

export const apiHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const cookieService = inject(CookieService);
  const languageService = inject(LanguageService);
  const apiBaseUrl = environment.apiBaseUrl;

  if (!isApiRequest(req.url, apiBaseUrl)) {
    return next(req);
  }

  const language = languageService.language();
  const headers: Record<string, string> = {
    'X-Language': language,
    'Accept-Language': language
  };

  if (MUTATING_METHODS.has(req.method.toUpperCase())) {
    const csrfToken = cookieService.get(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  return next(req.clone({
    withCredentials: true,
    setHeaders: headers
  }));
};
