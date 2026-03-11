import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class AuthFacadeService {
  private static readonly STORAGE_KEY = 'terra.auth.sync';

  private readonly authService = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  private readonly bootstrappingSubject = new BehaviorSubject(false);
  private readonly syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('terra-auth') : null;

  readonly session$ = this.sessionSubject.asObservable();
  readonly currentUser$ = this.session$.pipe(map(session => session?.user ?? null));
  readonly isAuthenticated$ = this.session$.pipe(
    map(session => session !== null),
    distinctUntilChanged()
  );
  readonly bootstrapping$ = this.bootstrappingSubject.asObservable();

  constructor() {
    this.syncChannel?.addEventListener('message', (event: MessageEvent<AuthSyncEvent>) => {
      void this.consumeSyncEvent(event.data);
    });

    this.document.defaultView?.addEventListener('storage', event => {
      if (event.key === AuthFacadeService.STORAGE_KEY && event.newValue) {
        void this.consumeSyncEvent(event.newValue as AuthSyncEvent);
      }
    });
  }

  get sessionSnapshot(): AuthSession | null {
    return this.sessionSubject.value;
  }

  bootstrapSession(): Observable<AuthSession | null> {
    this.bootstrappingSubject.next(true);

    return this.authService.fetchCurrentSession().pipe(
      tap(session => this.sessionSubject.next(session)),
      map(session => {
        this.bootstrappingSubject.next(false);
        return session;
      }),
      catchError(error => this.tryRecoverSession(error))
    );
  }

  ensureAuthenticated(): Observable<boolean> {
    if (this.sessionSubject.value) {
      return of(true);
    }

    return this.bootstrapSession().pipe(map(session => session !== null));
  }

  login(payload: LoginRequest): Observable<ApiResponse<AuthSession>> {
    return this.authService.login(payload).pipe(
      tap(response => {
        if (response.data) {
          this.sessionSubject.next(response.data);
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
        this.sessionSubject.next(null);
        this.publishSyncEvent('logout-all');
      })
    );
  }

  logout(): Observable<ApiResponse<null>> {
    return this.authService.logout().pipe(
      tap(() => {
        this.sessionSubject.next(null);
        this.publishSyncEvent('logout');
      })
    );
  }

  logoutAll(): Observable<ApiResponse<null>> {
    return this.authService.logoutAll().pipe(
      tap(() => {
        this.sessionSubject.next(null);
        this.publishSyncEvent('logout-all');
      })
    );
  }

  normalizeError(error: unknown): { message: string; code: string | null; status: number } {
    const fallbackMessage = 'Unexpected error.';

    if (!(error instanceof HttpErrorResponse)) {
      return { message: fallbackMessage, code: null, status: 0 };
    }

    const body = error.error as ApiResponse<unknown> | ApiValidationErrorResponse | null;
    if (!body || typeof body !== 'object') {
      return { message: fallbackMessage, code: null, status: error.status };
    }

    const validationError = body as ApiValidationErrorResponse;
    const firstFieldMessage = validationError.errors ? Object.values(validationError.errors)[0] : null;
    return {
      message: firstFieldMessage ?? body.message ?? fallbackMessage,
      code: body.code ?? null,
      status: error.status
    };
  }

  private tryRecoverSession(error: unknown): Observable<AuthSession | null> {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
      this.bootstrappingSubject.next(false);
      this.sessionSubject.next(null);
      return of(null);
    }

    return this.authService.refreshSession().pipe(
      tap(() => this.publishSyncEvent('session-refresh')),
      switchMap(() => this.authService.fetchCurrentSession()),
      tap(session => this.sessionSubject.next(session)),
      map(session => {
        this.bootstrappingSubject.next(false);
        return session;
      }),
      catchError(() => {
        this.bootstrappingSubject.next(false);
        this.sessionSubject.next(null);
        return of(null);
      })
    );
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
      this.sessionSubject.next(null);
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.bootstrapSession().subscribe({
        next: () => resolve(),
        error: () => resolve()
      });
    });
  }
}
