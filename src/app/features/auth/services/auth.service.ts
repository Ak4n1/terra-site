import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { ApiResponse } from '../models/api-response.model';
import type { ForgotPasswordRequest, LoginRequest, RegisterRequest, ResendVerificationRequest, ResetPasswordRequest, VerifyEmailRequest } from '../models/auth-requests.model';
import type { AuthSession } from '../models/auth-session.model';
import type { AuthUser } from '../models/auth-user.model';
import type { RefreshSessionResponse } from '../models/refresh-session.model';
import type { AppLanguage } from '../../../core/i18n/types';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiBaseUrl}/api/auth`;

  login(payload: LoginRequest): Observable<ApiResponse<AuthSession>> {
    return this.http.post<ApiResponse<AuthSession>>(this.endpoint('/login'), payload);
  }

  register(payload: RegisterRequest): Observable<ApiResponse<AuthUser>> {
    return this.http.post<ApiResponse<AuthUser>>(this.endpoint('/register'), payload);
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/forgot-password'), payload);
  }

  verifyEmail(payload: VerifyEmailRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/verify-email'), payload);
  }

  resendVerification(payload: ResendVerificationRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/resend-verification'), payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/reset-password'), payload);
  }

  logout(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/logout'), {});
  }

  logoutAll(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/logout-all'), {});
  }

  fetchCurrentSession(): Observable<AuthSession> {
    return this.http.get<ApiResponse<AuthUser>>(this.endpoint('/me')).pipe(
      map(response => this.mapSession(response))
    );
  }

  refreshSession(): Observable<ApiResponse<RefreshSessionResponse>> {
    return this.http.post<ApiResponse<RefreshSessionResponse>>(this.endpoint('/refresh'), {});
  }

  updatePreferredLanguage(language: AppLanguage): Observable<AuthSession> {
    return this.http.patch<ApiResponse<AuthUser>>(this.endpoint('/preferred-language'), { language }).pipe(
      map(response => this.mapSession(response))
    );
  }

  private mapSession(response: ApiResponse<AuthUser>): AuthSession {
    if (!response.data) {
      throw new Error('Missing session payload');
    }

    return { user: response.data };
  }

  private endpoint(path: string): string {
    return `${this.authUrl}${path}`;
  }
}
