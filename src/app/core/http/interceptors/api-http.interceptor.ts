import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CookieService } from '../cookie.service';
import { LanguageService } from '../../i18n/language.service';
import { environment } from '../../../../environments/environment';
import { AuthClientConfigService } from '../../../features/auth/services/auth-client-config.service';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isApiRequest(url: string, apiBaseUrl: string): boolean {
  return url.startsWith('/api/') || (!!apiBaseUrl && url.startsWith(apiBaseUrl));
}

export const apiHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const cookieService = inject(CookieService);
  const languageService = inject(LanguageService);
  const authClientConfig = inject(AuthClientConfigService);
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
    const csrfToken = cookieService.get(authClientConfig.csrfCookieName);
    if (csrfToken) {
      headers[authClientConfig.csrfHeaderName] = csrfToken;
    }
  }

  return next(req.clone({
    withCredentials: true,
    setHeaders: headers
  }));
};
