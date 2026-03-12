import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, distinctUntilChanged, filter, finalize, map, of, shareReplay, switchMap, take, tap, timer } from 'rxjs';
import type { ApiResponse, ApiValidationErrorResponse } from '../models/api-response.model';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  VerifyEmailRequest
} from '../models/auth-requests.model';
import type { AuthSession } from '../models/auth-session.model';
import { AuthService } from './auth.service';

type AuthSyncEvent = 'login' | 'logout' | 'logout-all' | 'session-refresh';
export type AuthState = 'checking' | 'authenticated' | 'unauthenticated' | 'rate-limited';

@Injectable({ providedIn: 'root' })
export class AuthFacadeService {
  private static readonly STORAGE_KEY = 'terra.auth.sync';
  private static readonly SESSION_RATE_LIMIT_KEY = 'terra.auth.session-rate-limit-until';

  private readonly authService = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  private readonly bootstrappingSubject = new BehaviorSubject(false);
  private readonly authResolvedSubject = new BehaviorSubject(false);
  private readonly sessionRateLimitUntilSubject = new BehaviorSubject<number | null>(this.readPersistedSessionRateLimitUntil());
  private readonly syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('terra-auth') : null;
  private recoveryTimerId: number | null = null;
  private bootstrapRequest$: Observable<AuthSession | null> | null = null;

  readonly session$ = this.sessionSubject.asObservable();
  readonly currentUser$ = this.session$.pipe(map(session => session?.user ?? null));
  readonly isAuthenticated$ = this.session$.pipe(
    map(session => session !== null),
    distinctUntilChanged()
  );
  readonly bootstrapping$ = this.bootstrappingSubject.asObservable();
  readonly sessionRateLimitRemainingSeconds$ = combineLatest([
    this.sessionRateLimitUntilSubject.asObservable(),
    timer(0, 1000)
  ]).pipe(
    map(([retryUntil]) => this.calculateRemainingRateLimitSeconds(retryUntil)),
    distinctUntilChanged()
  );
  readonly authState$ = combineLatest([
    this.session$,
    this.bootstrapping$,
    this.authResolvedSubject.asObservable(),
    this.sessionRateLimitUntilSubject.asObservable()
  ]).pipe(
    map(([session, bootstrapping, authResolved, retryUntil]) => {
      if (bootstrapping) {
        return 'checking' as AuthState;
      }

      if (session) {
        return 'authenticated' as AuthState;
      }

      if (this.isSessionRateLimitActive(retryUntil)) {
        return 'rate-limited' as AuthState;
      }

      return authResolved ? 'unauthenticated' as AuthState : 'checking' as AuthState;
    }),
    distinctUntilChanged()
  );

  constructor() {
    this.scheduleSessionRateLimitRecovery(this.sessionRateLimitUntilSubject.value);

    this.syncChannel?.addEventListener('message', (event: MessageEvent<AuthSyncEvent>) => {
      void this.consumeSyncEvent(event.data);
    });

    this.document.defaultView?.addEventListener('storage', event => {
      if (event.key === AuthFacadeService.SESSION_RATE_LIMIT_KEY) {
        const retryUntil = this.parseStoredSessionRateLimitUntil(event.newValue);
        this.sessionRateLimitUntilSubject.next(retryUntil);
        this.scheduleSessionRateLimitRecovery(retryUntil);
        return;
      }

      if (event.key === AuthFacadeService.STORAGE_KEY && event.newValue) {
        void this.consumeSyncEvent(event.newValue as AuthSyncEvent);
      }
    });
  }

  get sessionSnapshot(): AuthSession | null {
    return this.sessionSubject.value;
  }

  bootstrapSession(): Observable<AuthSession | null> {
    if (this.bootstrapRequest$) {
      return this.bootstrapRequest$;
    }

    if (this.hasActiveSessionRateLimit()) {
      this.bootstrappingSubject.next(false);
      return of(this.sessionSubject.value);
    }

    this.bootstrappingSubject.next(true);

    this.bootstrapRequest$ = this.authService.fetchCurrentSession().pipe(
      tap(session => {
        console.log('[AUTH /me] session payload:', session);
        this.clearSessionRateLimit();
        this.setSession(session);
        this.authResolvedSubject.next(true);
      }),
      map(session => {
        this.bootstrappingSubject.next(false);
        return session;
      }),
      catchError(error => this.tryRecoverSession(error)),
      finalize(() => {
        this.bootstrapRequest$ = null;
      }),
      shareReplay(1)
    );

    return this.bootstrapRequest$;
  }

  ensureAuthenticated(): Observable<boolean> {
    if (this.sessionSubject.value) {
      return of(true);
    }

    if (this.hasActiveSessionRateLimit()) {
      return this.waitForSessionRateLimitRecovery().pipe(
        switchMap(() => this.bootstrapSession()),
        map(session => session !== null)
      );
    }

    return this.bootstrapSession().pipe(map(session => session !== null));
  }

  login(payload: LoginRequest): Observable<ApiResponse<AuthSession>> {
    return this.authService.login(payload).pipe(
      tap(response => {
        if (response.data) {
          this.clearSessionRateLimit();
          this.setSession(response.data);
          this.publishSyncEvent('login');
        }
      })
    );
  }

  register(payload: RegisterRequest): Observable<ApiResponse<unknown>> {
    return this.authService.register(payload);
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ApiResponse<null>> {
    return this.authService.forgotPassword(payload);
  }

  verifyEmail(payload: VerifyEmailRequest): Observable<ApiResponse<null>> {
    return this.authService.verifyEmail(payload);
  }

  resendVerification(payload: ResendVerificationRequest): Observable<ApiResponse<null>> {
    return this.authService.resendVerification(payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<ApiResponse<null>> {
    return this.authService.resetPassword(payload).pipe(
      tap(() => {
        this.clearSessionRateLimit();
        this.clearSession();
        this.publishSyncEvent('logout-all');
      })
    );
  }

  logout(): Observable<ApiResponse<null>> {
    return this.authService.logout().pipe(
      tap(() => {
        this.clearSessionRateLimit();
        this.clearSession();
        this.publishSyncEvent('logout');
      })
    );
  }

  logoutAll(): Observable<ApiResponse<null>> {
    return this.authService.logoutAll().pipe(
      tap(() => {
        this.clearSessionRateLimit();
        this.clearSession();
        this.publishSyncEvent('logout-all');
      })
    );
  }

  normalizeError(error: unknown): { message: string; code: string | null; status: number; retryAfterSeconds: number | null } {
    const fallbackMessage = 'Unexpected error.';

    if (!(error instanceof HttpErrorResponse)) {
      return { message: fallbackMessage, code: null, status: 0, retryAfterSeconds: null };
    }

    const body = error.error as ApiResponse<unknown> | ApiValidationErrorResponse | null;
    if (!body || typeof body !== 'object') {
      return {
        message: fallbackMessage,
        code: null,
        status: error.status,
        retryAfterSeconds: this.extractRetryAfterSeconds(error)
      };
    }

    const validationError = body as ApiValidationErrorResponse;
    const firstFieldMessage = validationError.errors ? Object.values(validationError.errors)[0] : null;
    return {
      message: firstFieldMessage ?? body.message ?? fallbackMessage,
      code: body.code ?? null,
      status: error.status,
      retryAfterSeconds: this.extractRetryAfterSeconds(error, body as ApiResponse<unknown>)
    };
  }

  private tryRecoverSession(error: unknown): Observable<AuthSession | null> {
    if (!(error instanceof HttpErrorResponse)) {
      this.bootstrappingSubject.next(false);
      this.authResolvedSubject.next(true);
      return of(this.sessionSubject.value);
    }

    if (error.status === 429) {
      this.applySessionRateLimit(this.extractRetryAfterSecondsFromError(error));
      this.bootstrappingSubject.next(false);
      this.authResolvedSubject.next(true);
      return of(this.sessionSubject.value);
    }

    if (error.status !== 401) {
      this.bootstrappingSubject.next(false);
      this.clearSession();
      this.authResolvedSubject.next(true);
      return of(null);
    }

    return this.authService.refreshSession().pipe(
      tap(() => {
        this.clearSessionRateLimit();
        this.publishSyncEvent('session-refresh');
      }),
      switchMap(() => this.authService.fetchCurrentSession()),
      tap(session => {
        this.clearSessionRateLimit();
        this.setSession(session);
      }),
      map(session => {
        this.bootstrappingSubject.next(false);
        this.authResolvedSubject.next(true);
        return session;
      }),
      catchError(refreshError => {
        this.bootstrappingSubject.next(false);
        if (refreshError instanceof HttpErrorResponse && refreshError.status === 429) {
          this.applySessionRateLimit(this.extractRetryAfterSecondsFromError(refreshError));
          this.authResolvedSubject.next(true);
          return of(this.sessionSubject.value);
        }
        this.clearSession();
        this.authResolvedSubject.next(true);
        return of(null);
      })
    );
  }

  private extractRetryAfterSecondsFromError(error: HttpErrorResponse): number | null {
    const body = error.error;
    if (body && typeof body === 'object' && 'retryAfterSeconds' in body) {
      return this.extractRetryAfterSeconds(error, body as ApiResponse<unknown>);
    }

    return this.extractRetryAfterSeconds(error);
  }

  private extractRetryAfterSeconds(error: HttpErrorResponse, body?: ApiResponse<unknown>): number | null {
    const retryAfterFromBody = body?.retryAfterSeconds;
    if (typeof retryAfterFromBody === 'number' && Number.isFinite(retryAfterFromBody) && retryAfterFromBody > 0) {
      return retryAfterFromBody;
    }

    const retryAfterHeader = error.headers.get('Retry-After');
    if (!retryAfterHeader) {
      return null;
    }

    const parsed = Number.parseInt(retryAfterHeader, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private hasActiveSessionRateLimit(): boolean {
    return this.getActiveSessionRateLimitUntil() !== null;
  }

  private waitForSessionRateLimitRecovery(): Observable<void> {
    return this.sessionRateLimitUntilSubject.asObservable().pipe(
      filter(retryUntil => !this.isSessionRateLimitActive(retryUntil)),
      take(1),
      map(() => void 0)
    );
  }

  private getActiveSessionRateLimitUntil(): number | null {
    const retryUntil = this.sessionRateLimitUntilSubject.value;
    if (!this.isSessionRateLimitActive(retryUntil)) {
      this.clearSessionRateLimit();
      return null;
    }

    return retryUntil;
  }

  private isSessionRateLimitActive(retryUntil: number | null): boolean {
    return retryUntil !== null && retryUntil > Date.now();
  }

  private calculateRemainingRateLimitSeconds(retryUntil: number | null): number {
    if (!this.isSessionRateLimitActive(retryUntil) || retryUntil === null) {
      return 0;
    }

    return Math.max(1, Math.ceil((retryUntil - Date.now()) / 1000));
  }

  private applySessionRateLimit(retryAfterSeconds: number | null): void {
    if (!retryAfterSeconds || retryAfterSeconds <= 0) {
      return;
    }

    const retryUntil = Date.now() + retryAfterSeconds * 1000;
    this.sessionRateLimitUntilSubject.next(retryUntil);
    this.scheduleSessionRateLimitRecovery(retryUntil);

    try {
      this.document.defaultView?.localStorage.setItem(AuthFacadeService.SESSION_RATE_LIMIT_KEY, String(retryUntil));
    } catch {
      // Ignore persistence failures.
    }
  }

  private clearSessionRateLimit(): void {
    this.clearSessionRateLimitRecovery();

    if (this.sessionRateLimitUntilSubject.value === null) {
      return;
    }

    this.sessionRateLimitUntilSubject.next(null);

    try {
      this.document.defaultView?.localStorage.removeItem(AuthFacadeService.SESSION_RATE_LIMIT_KEY);
    } catch {
      // Ignore persistence failures.
    }
  }

  private readPersistedSessionRateLimitUntil(): number | null {
    try {
      return this.parseStoredSessionRateLimitUntil(
        this.document.defaultView?.localStorage.getItem(AuthFacadeService.SESSION_RATE_LIMIT_KEY) ?? null
      );
    } catch {
      return null;
    }
  }

  private parseStoredSessionRateLimitUntil(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      return null;
    }

    return parsed;
  }

  private scheduleSessionRateLimitRecovery(retryUntil: number | null): void {
    this.clearSessionRateLimitRecovery();
    if (retryUntil === null) {
      return;
    }

    const delay = retryUntil - Date.now();
    if (delay <= 0) {
      this.clearSessionRateLimit();
      return;
    }

    const windowRef = this.document.defaultView;
    if (!windowRef) {
      return;
    }

    this.recoveryTimerId = windowRef.setTimeout(() => {
      this.recoveryTimerId = null;
      this.bootstrappingSubject.next(true);
      this.clearSessionRateLimit();
      this.bootstrapSession().subscribe();
    }, delay + 50);
  }

  private clearSessionRateLimitRecovery(): void {
    if (this.recoveryTimerId === null) {
      return;
    }

    this.document.defaultView?.clearTimeout(this.recoveryTimerId);
    this.recoveryTimerId = null;
  }

  private publishSyncEvent(event: AuthSyncEvent): void {
    this.syncChannel?.postMessage(event);

    try {
      this.document.defaultView?.localStorage.setItem(AuthFacadeService.STORAGE_KEY, event);
      this.document.defaultView?.localStorage.removeItem(AuthFacadeService.STORAGE_KEY);
    } catch {
      // Ignore sync failures.
    }
  }

  private consumeSyncEvent(event: AuthSyncEvent): Promise<void> {
    if (event === 'logout' || event === 'logout-all') {
      this.clearSession();
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.bootstrapSession().subscribe({
        next: () => resolve(),
        error: () => resolve()
      });
    });
  }

  private setSession(session: AuthSession): void {
    this.sessionSubject.next(session);
  }

  private clearSession(): void {
    this.sessionSubject.next(null);
  }
}
