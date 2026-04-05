import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { AlertVariant } from '../../../shared/ui/atoms/alert/alert.component';
import { resolveAlertVariant } from '../../../shared/ui/atoms/alert/alert-variant.util';
import { AuthOverlayComponent, type AuthOverlayMode } from '../../../shared/ui/organisms/auth-overlay/auth-overlay.component';
import { LanguageService } from '../../../core/i18n/language.service';
import { AuthFacadeService } from '../services/auth-facade.service';

type ModeFeedbackState = {
  message: string;
  variant: AlertVariant;
};

type AuthOverlayFeedbackMap = Record<AuthOverlayMode, ModeFeedbackState>;

@Component({
  selector: 'app-auth-overlay-container',
  standalone: true,
  imports: [CommonModule, AuthOverlayComponent],
  template: `
    <ui-auth-overlay
      [open]="open"
      [mode]="currentMode()"
      [verificationEmail]="verificationEmail()"
      [feedbackMessage]="currentFeedback().message"
      [feedbackVariant]="currentFeedback().variant"
      [submitting]="submitting()"
      (modeChanged)="handleModeChanged($event)"
      (stateReset)="clearFeedback()"
      (closed)="closed.emit()"
      (loginSubmitted)="handleLogin($event)"
      (registerSubmitted)="handleRegister($event)"
      (forgotPasswordSubmitted)="handleForgotPassword($event)"
      (resendVerificationSubmitted)="handleResendVerification($event)"
      (twoFactorRecoveryRequested)="handleTwoFactorRecoveryRequest($event)">
    </ui-auth-overlay>
  `
})
export class AuthOverlayContainerComponent implements OnChanges {
  private readonly authFacade = inject(AuthFacadeService);
  private readonly languageService = inject(LanguageService);

  @Input() open = false;
  @Input() mode: AuthOverlayMode = 'login';
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly loginCompleted = new EventEmitter<void>();

  readonly feedbackByMode = signal<AuthOverlayFeedbackMap>(this.buildInitialFeedbackMap());
  readonly submitting = signal(false);
  readonly currentMode = signal<AuthOverlayMode>('login');
  readonly verificationEmail = signal('');
  readonly currentFeedback = computed(() => this.feedbackByMode()[this.currentMode()]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.currentMode.set(this.mode);
    }

    if (changes['open'] && !this.open) {
      this.verificationEmail.set('');
      this.currentMode.set(this.mode);
      this.clearAllFeedback();
    }
  }

  async handleLogin(credentials: { email: string; password: string; twoFactorCode?: string; trustDevice?: boolean }): Promise<void> {
    this.submitting.set(true);
    this.clearFeedback();

    try {
      await firstValueFrom(this.authFacade.login(credentials));
      this.currentMode.set('login');
      this.verificationEmail.set('');
      this.loginCompleted.emit();
    } catch (error) {
      const normalized = this.authFacade.normalizeError(error);
      if (normalized.code === 'auth.email_not_verified') {
        this.verificationEmail.set(credentials.email);
        this.currentMode.set('verify-email');
      } else if (normalized.code === 'auth.two_factor_required' || normalized.code === 'auth.two_factor_code_invalid') {
        this.currentMode.set('two-factor');
      }
      this.applyNormalizedError(normalized);
    } finally {
      this.submitting.set(false);
    }
  }

  async handleRegister(payload: { email: string; password: string; repeatPassword: string }): Promise<void> {
    if (payload.password !== payload.repeatPassword) {
      this.setCurrentFeedback(this.languageService.t('authPasswordsDoNotMatch'), 'warning');
      return;
    }

    this.submitting.set(true);
    this.clearFeedback();

    try {
      const response = await firstValueFrom(this.authFacade.register({
        email: payload.email,
        password: payload.password
      }));
      this.setCurrentFeedback(response.message, resolveAlertVariant(201));
    } catch (error) {
      this.applyError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  async handleForgotPassword(payload: { email: string }): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);

    try {
      const response = await firstValueFrom(this.authFacade.forgotPassword(payload));
      this.setCurrentFeedback(response.message, resolveAlertVariant(200));
    } catch (error) {
      this.applyError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  async handleResendVerification(payload: { email: string }): Promise<void> {
    this.submitting.set(true);
    this.clearFeedback();

    try {
      const response = await firstValueFrom(this.authFacade.resendVerification(payload));
      this.verificationEmail.set(payload.email);
      this.setCurrentFeedback(response.message, resolveAlertVariant(200));
    } catch (error) {
      this.applyError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  async handleTwoFactorRecoveryRequest(payload: { email: string }): Promise<void> {
    this.submitting.set(true);
    this.clearFeedback();

    try {
      const response = await firstValueFrom(this.authFacade.requestTwoFactorRecoveryFromLogin(payload));
      this.setCurrentFeedback(response.message, resolveAlertVariant(200));
    } catch (error) {
      this.applyError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  handleModeChanged(mode: AuthOverlayMode): void {
    this.currentMode.set(mode);
  }

  private applyError(error: unknown): void {
    this.applyNormalizedError(this.authFacade.normalizeError(error));
  }

  private applyNormalizedError(normalized: { message: string; code: string | null; status: number; retryAfterSeconds: number | null }): void {
    this.setCurrentFeedback(
      this.formatFeedbackMessage(normalized.message, normalized.retryAfterSeconds),
      resolveAlertVariant(normalized.status)
    );
  }

  clearFeedback(): void {
    this.updateFeedbackForMode(this.currentMode(), '', 'warning');
  }

  private formatFeedbackMessage(message: string, retryAfterSeconds: number | null): string {
    if (!retryAfterSeconds) {
      return message;
    }

    return `${message} ${this.languageService.t('authRateLimitRetryAfter', { seconds: retryAfterSeconds })}`;
  }

  private setCurrentFeedback(message: string, variant: AlertVariant): void {
    this.updateFeedbackForMode(this.currentMode(), message, variant);
  }

  private updateFeedbackForMode(mode: AuthOverlayMode, message: string, variant: AlertVariant): void {
    this.feedbackByMode.update(current => ({
      ...current,
      [mode]: { message, variant }
    }));
  }

  private clearAllFeedback(): void {
    this.feedbackByMode.set(this.buildInitialFeedbackMap());
  }

  private buildInitialFeedbackMap(): AuthOverlayFeedbackMap {
    return {
      login: { message: '', variant: 'warning' },
      register: { message: '', variant: 'warning' },
      'forgot-password': { message: '', variant: 'warning' },
      'verify-email': { message: '', variant: 'warning' },
      'two-factor': { message: '', variant: 'warning' }
    };
  }
}
