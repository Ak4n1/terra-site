import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { apiHttpInterceptor } from './core/http/interceptors/api-http.interceptor';
import { AuthClientConfigService } from './features/auth/services/auth-client-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiHttpInterceptor])),
    provideAppInitializer(() => inject(AuthClientConfigService).load())
  ]
};
