import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { ApiResponse } from '../models/api-response.model';
import type { ForgotPasswordRequest, LoginRequest, RegisterRequest, ResendVerificationRequest, ResetPasswordRequest, VerifyEmailRequest } from '../models/auth-requests.model';
import type { AuthSession } from '../models/auth-session.model';
import type { AuthUser } from '../models/auth-user.model';
import type { RefreshSessionResponse } from '../models/refresh-session.model';
import type { AppLanguage } from '../../../core/i18n/types';
import { environment } from '../../../../environments/environment';

export type AvatarSettings = {
  avatarType: 'DEFAULT' | 'PRESET' | 'CUSTOM';
  presetPath: string | null;
  customUrl: string | null;
};

export type ProfileSummarySettings = {
  totalAccounts: number | null;
  lastLoginAt: string | null;
  createdAt: string | null;
};

export type AccountSecurityStatus = {
  twoFactorEnabled: boolean;
  twoFactorEnabledAt: string | null;
  twoFactorRecoveryRequestedAt: string | null;
};

export type TwoFactorSetupInitPayload = {
  secret: string;
  otpAuthUrl: string;
  qrImageDataUrl: string;
};

export type TrustedDevice = {
  sessionId: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  currentSession: boolean;
};

export type AccountActivityEntry = {
  eventKey: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  occurredAt: string;
};

export type AccountActivitySortOrder = 'asc' | 'desc';

export type AccountActivityListResponse = {
  items: AccountActivityEntry[];
  hasMore: boolean;
  page: number;
  size: number;
};

export type AccountActivityFilters = {
  dateFrom?: string;
  dateTo?: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiBaseUrl}/api/auth`;
  private readonly accountSettingsUrl = `${environment.apiBaseUrl}/api/account/settings`;

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

  getProfile(): Observable<AuthUser> {
    return this.http.get<ApiResponse<AuthUser>>(`${this.accountSettingsUrl}/profile`).pipe(
      map(response => this.mapUser(response))
    );
  }

  updateProfile(payload: { username: string | null }, idempotencyKey?: string): Observable<AuthUser> {
    const options = idempotencyKey
      ? {
          headers: new HttpHeaders({
            'Idempotency-Key': idempotencyKey
          })
        }
      : {};

    return this.http.patch<ApiResponse<AuthUser>>(`${this.accountSettingsUrl}/profile`, payload, options).pipe(
      map(response => this.mapUser(response))
    );
  }

  getProfileSummary(fields: Array<'totalAccounts' | 'lastLogin' | 'createdAt'> = []): Observable<ProfileSummarySettings> {
    let query = '';
    if (fields.length > 0) {
      query = `?${fields.map(field => `${field}=true`).join('&')}`;
    }

    return this.http.get<ApiResponse<ProfileSummarySettings>>(`${this.accountSettingsUrl}/profile/summary${query}`).pipe(
      map(response => this.mapData(response))
    );
  }

  getAvatarSettings(): Observable<AvatarSettings> {
    return this.http.get<ApiResponse<AvatarSettings>>(`${this.accountSettingsUrl}/avatar`).pipe(
      map(response => this.mapData(response))
    );
  }

  updateAvatarPreset(presetPath: string): Observable<AvatarSettings> {
    return this.http.patch<ApiResponse<AvatarSettings>>(`${this.accountSettingsUrl}/avatar/preset`, { presetPath }).pipe(
      map(response => this.mapData(response))
    );
  }

  setAvatarDefault(): Observable<AvatarSettings> {
    return this.http.patch<ApiResponse<AvatarSettings>>(`${this.accountSettingsUrl}/avatar/default`, {}).pipe(
      map(response => this.mapData(response))
    );
  }

  uploadCustomAvatar(file: File): Observable<AvatarSettings> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<AvatarSettings>>(`${this.accountSettingsUrl}/avatar/upload`, formData).pipe(
      map(response => this.mapData(response))
    );
  }

  getSecurityStatus(): Observable<AccountSecurityStatus> {
    return this.http.get<ApiResponse<AccountSecurityStatus>>(`${this.accountSettingsUrl}/security/status`).pipe(
      map(response => this.mapData(response))
    );
  }

  initTwoFactorSetup(): Observable<TwoFactorSetupInitPayload> {
    return this.http.post<ApiResponse<TwoFactorSetupInitPayload>>(`${this.accountSettingsUrl}/security/2fa/setup/init`, {}).pipe(
      map(response => this.mapData(response))
    );
  }

  verifyTwoFactorSetup(payload: { code: string }, idempotencyKey?: string): Observable<ApiResponse<null>> {
    const options = idempotencyKey
      ? {
          headers: new HttpHeaders({
            'Idempotency-Key': idempotencyKey
          })
        }
      : {};

    return this.http.post<ApiResponse<null>>(`${this.accountSettingsUrl}/security/2fa/setup/verify`, payload, options);
  }

  getTrustedDevices(): Observable<TrustedDevice[]> {
    return this.http.get<ApiResponse<TrustedDevice[]>>(`${this.accountSettingsUrl}/security/trusted-devices`).pipe(
      map(response => this.mapData(response))
    );
  }

  revokeTrustedDevice(sessionId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.accountSettingsUrl}/security/trusted-devices/${sessionId}`);
  }

  revokeAllTrustedDevices(idempotencyKey?: string): Observable<ApiResponse<null>> {
    const options = idempotencyKey
      ? {
          headers: new HttpHeaders({
            'Idempotency-Key': idempotencyKey
          })
        }
      : {};

    return this.http.post<ApiResponse<null>>(`${this.accountSettingsUrl}/security/trusted-devices/revoke-all`, {}, options);
  }

  requestTwoFactorRecoveryEmail(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.accountSettingsUrl}/security/2fa/recovery/request`, {});
  }

  confirmTwoFactorRecovery(payload: { token: string; currentPassword: string }, idempotencyKey?: string): Observable<ApiResponse<null>> {
    const options = idempotencyKey
      ? {
          headers: new HttpHeaders({
            'Idempotency-Key': idempotencyKey
          })
        }
      : {};

    return this.http.post<ApiResponse<null>>(`${this.accountSettingsUrl}/security/2fa/recovery/confirm`, payload, options);
  }

  changeMasterPassword(
    payload: { currentPassword: string; newPassword: string; confirmPassword: string },
    idempotencyKey?: string
  ): Observable<ApiResponse<null>> {
    const options = idempotencyKey
      ? {
          headers: new HttpHeaders({
            'Idempotency-Key': idempotencyKey
          })
        }
      : {};

    return this.http.post<ApiResponse<null>>(`${this.accountSettingsUrl}/security/password/change/confirm`, payload, options);
  }

  requestMasterPasswordResetEmail(idempotencyKey?: string): Observable<ApiResponse<null>> {
    const options = idempotencyKey
      ? {
          headers: new HttpHeaders({
            'Idempotency-Key': idempotencyKey
          })
        }
      : {};

    return this.http.post<ApiResponse<null>>(`${this.accountSettingsUrl}/security/password/reset/request`, {}, options);
  }

  getAccountActivity(
    page = 0,
    size = 10,
    sort: AccountActivitySortOrder = 'desc',
    filters?: AccountActivityFilters
  ): Observable<AccountActivityListResponse> {
    const queryParts = [`page=${page}`, `size=${size}`, `sort=${sort}`];
    if (filters?.dateFrom) {
      queryParts.push(`dateFrom=${encodeURIComponent(filters.dateFrom)}`);
    }
    if (filters?.dateTo) {
      queryParts.push(`dateTo=${encodeURIComponent(filters.dateTo)}`);
    }

    return this.http.get<ApiResponse<AccountActivityListResponse>>(
      `${this.accountSettingsUrl}/activity?${queryParts.join('&')}`
    ).pipe(
      map(response => this.mapData(response))
    );
  }

  requestTwoFactorRecoveryFromLogin(payload: { email: string }): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/2fa/recovery/request'), payload);
  }

  confirmTwoFactorRecoveryFromLogin(payload: { token: string; currentPassword: string }): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/2fa/recovery/confirm'), payload);
  }

  private mapSession(response: ApiResponse<AuthUser>): AuthSession {
    return { user: this.mapUser(response) };
  }

  private mapUser(response: ApiResponse<AuthUser>): AuthUser {
    if (!response.data) {
      throw new Error('Missing user payload');
    }
    return response.data;
  }

  private mapData<T>(response: ApiResponse<T>): T {
    if (!response.data) {
      throw new Error('Missing response payload');
    }
    return response.data;
  }

  private endpoint(path: string): string {
    return `${this.authUrl}${path}`;
  }
}
