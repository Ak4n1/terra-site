import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

type AuthClientConfigResponse = {
  code: string;
  message: string;
  data: {
    csrfCookieName: string;
    csrfHeaderName: string;
  } | null;
};

@Injectable({ providedIn: 'root' })
export class AuthClientConfigService {
  private config = {
    csrfCookieName: 'XSRF-TOKEN',
    csrfHeaderName: 'X-CSRF-TOKEN'
  };

  get csrfCookieName(): string {
    return this.config.csrfCookieName;
  }

  get csrfHeaderName(): string {
    return this.config.csrfHeaderName;
  }

  async load(): Promise<void> {
    const authConfigUrl = `${environment.apiBaseUrl}/api/auth/config`;

    try {
      const response = await fetch(authConfigUrl, {
        credentials: 'include',
        headers: {
          'Accept-Language': 'en',
          'X-Language': 'en'
        }
      });

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as AuthClientConfigResponse;
      const config = body.data;
      if (!config) {
        return;
      }

      if (typeof config.csrfCookieName === 'string' && config.csrfCookieName) {
        this.config.csrfCookieName = config.csrfCookieName;
      }

      if (typeof config.csrfHeaderName === 'string' && config.csrfHeaderName) {
        this.config.csrfHeaderName = config.csrfHeaderName;
      }
    } catch {
      // Keep defaults if the config endpoint is unavailable.
    }
  }
}
