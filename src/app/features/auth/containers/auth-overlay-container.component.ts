import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
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
      [mode]="mode"
      [feedbackMessage]="feedbackMessage()"
      [feedbackVariant]="feedbackVariant()"
      [submitting]="submitting()"
      (closed)="closed.emit()"
      (loginSubmitted)="handleLogin($event)"
      (registerSubmitted)="handleRegister($event)"
      (forgotPasswordSubmitted)="handleForgotPassword($event)">
    </ui-auth-overlay>
  `
})
export class AuthOverlayContainerComponent {
  private readonly authFacade = inject(AuthFacadeService);
  private readonly languageService = inject(LanguageService);

  @Input() open = false;
  @Input() mode: AuthOverlayMode = 'login';
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly loginCompleted = new EventEmitter<void>();

  readonly feedbackMessage = signal('');
  readonly feedbackVariant = signal<AlertVariant>('warning');
  readonly submitting = signal(false);

  async handleLogin(credentials: { email: string; password: string }): Promise<void> {
    this.submitting.set(true);
    this.clearFeedback();

    try {
      const response = await firstValueFrom(this.authFacade.login(credentials));
      this.feedbackMessage.set(response.message);
      this.feedbackVariant.set(resolveAlertVariant(response.code, 200));
      this.loginCompleted.emit();
    } catch (error) {
      this.applyError(error);
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
      this.feedbackVariant.set(resolveAlertVariant(response.code, 201));
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
      this.feedbackVariant.set(resolveAlertVariant(response.code, 200));
    } catch (error) {
      this.applyError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private applyError(error: unknown): void {
    const normalized = this.authFacade.normalizeError(error);
    this.feedbackMessage.set(normalized.message);
    this.feedbackVariant.set(resolveAlertVariant(normalized.code, normalized.status));
  }

  private clearFeedback(): void {
    this.feedbackMessage.set('');
    this.feedbackVariant.set('warning');
  }
}
