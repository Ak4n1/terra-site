import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { resolveAlertVariant } from '../../../core/feedback/alert-code.mapper';
import type { AlertVariant } from '../../../shared/ui/atoms/alert/alert.component';
import { AuthOverlayComponent, type AuthOverlayMode } from '../../../shared/ui/organisms/auth-overlay/auth-overlay.component';
import { LanguageService } from '../../../core/i18n/language.service';
import { AuthFacadeService } from '../services/auth-facade.service';

@Component({
  selector: 'app-auth-overlay-container',
  standalone: true,
  imports: [CommonModule, AuthOverlayComponent],
  template: `
    <ui-auth-overlay
      [open]="open"
      [mode]="currentMode()"
      [verificationEmail]="verificationEmail()"
      [feedbackMessage]="feedbackMessage()"
      [feedbackVariant]="feedbackVariant()"
      [submitting]="submitting()"
      (modeChanged)="handleModeChanged($event)"
      (stateReset)="clearFeedback()"
      (closed)="closed.emit()"
      (loginSubmitted)="handleLogin($event)"
      (registerSubmitted)="handleRegister($event)"
      (forgotPasswordSubmitted)="handleForgotPassword($event)"
      (resendVerificationSubmitted)="handleResendVerification($event)">
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

  readonly feedbackMessage = signal('');
  readonly feedbackVariant = signal<AlertVariant>('warning');
  readonly submitting = signal(false);
  readonly currentMode = signal<AuthOverlayMode>('login');
  readonly verificationEmail = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.currentMode.set(this.mode);
    }

    if (changes['open'] && !this.open) {
      this.verificationEmail.set('');
      this.currentMode.set(this.mode);
    }
  }

  async handleLogin(credentials: { email: string; password: string }): Promise<void> {
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
      }
      this.applyNormalizedError(normalized);
    } finally {
      this.submitting.set(false);
    }
  }

  async handleRegister(payload: { email: string; password: string; repeatPassword: string }): Promise<void> {
    if (payload.password !== payload.repeatPassword) {
      this.feedbackMessage.set(this.languageService.t('authPasswordsDoNotMatch'));
      this.feedbackVariant.set('warning');
      return;
    }

    this.submitting.set(true);
    this.clearFeedback();

    try {
      const response = await firstValueFrom(this.authFacade.register({
        email: payload.email,
        password: payload.password
      }));
      this.feedbackMessage.set(response.message);
      this.feedbackVariant.set(resolveAlertVariant(201));
    } catch (error) {
      this.applyError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  async handleForgotPassword(payload: { email: string }): Promise<void> {
    this.submitting.set(true);
    this.clearFeedback();

    try {
      const response = await firstValueFrom(this.authFacade.forgotPassword(payload));
      this.feedbackMessage.set(response.message);
      this.feedbackVariant.set(resolveAlertVariant(200));
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
      this.feedbackMessage.set(response.message);
      this.feedbackVariant.set(resolveAlertVariant(200));
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
    this.feedbackMessage.set(this.formatFeedbackMessage(normalized.message, normalized.retryAfterSeconds));
    this.feedbackVariant.set(resolveAlertVariant(normalized.status));
  }

  clearFeedback(): void {
    this.feedbackMessage.set('');
    this.feedbackVariant.set('warning');
  }

  private formatFeedbackMessage(message: string, retryAfterSeconds: number | null): string {
    if (!retryAfterSeconds) {
      return message;
    }

    return `${message} ${this.languageService.t('authRateLimitRetryAfter', { seconds: retryAfterSeconds })}`;
  }
}
