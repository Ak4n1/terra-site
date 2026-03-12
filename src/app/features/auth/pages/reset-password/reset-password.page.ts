import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { resolveAlertVariant } from '../../../../core/feedback/alert-code.mapper';
import { AlertComponent, type AlertVariant } from '../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { ProgressBarComponent } from '../../../../shared/ui/atoms/progress-bar/progress-bar.component';
import { InputFieldComponent } from '../../../../shared/ui/molecules/input-field/input-field.component';
import { AuthFacadeService } from '../../services/auth-facade.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, ProgressBarComponent, InputFieldComponent],
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.css'
})
export class ResetPasswordPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly languageService = inject(LanguageService);

  readonly token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
  readonly password = signal('');
  readonly repeatPassword = signal('');
  readonly submitting = signal(false);
  readonly completed = signal(false);
  readonly feedbackMessage = signal('');
  readonly feedbackVariant = signal<AlertVariant>('warning');
  readonly hasToken = this.token.length > 0;
  readonly submitDisabled = computed(() =>
    this.submitting()
    || !this.hasToken
    || this.password().trim().length === 0
    || this.repeatPassword().trim().length === 0
    || this.password() !== this.repeatPassword()
  );

  t(key: string, params?: Record<string, string | number>): string {
    return this.languageService.t(key, params);
  }

  onPasswordChange(value: string): void {
    this.password.set(value);
  }

  onRepeatPasswordChange(value: string): void {
    this.repeatPassword.set(value);
  }

  async submit(): Promise<void> {
    if (this.submitDisabled()) {
      if (!this.hasToken) {
        this.feedbackVariant.set('error');
        this.feedbackMessage.set(this.t('authResetPasswordPageMissingToken'));
      } else if (this.password() !== this.repeatPassword()) {
        this.feedbackVariant.set('warning');
        this.feedbackMessage.set(this.t('authPasswordsDoNotMatch'));
      }
      return;
    }

    this.submitting.set(true);
    this.feedbackMessage.set('');

    try {
      const response = await firstValueFrom(this.authFacade.resetPassword({
        token: this.token,
        newPassword: this.password()
      }));
      this.completed.set(true);
      this.feedbackVariant.set('success');
      this.feedbackMessage.set(response.message);
      this.password.set('');
      this.repeatPassword.set('');
    } catch (error) {
      const normalized = this.authFacade.normalizeError(error);
      this.feedbackVariant.set(resolveAlertVariant(normalized.status));
      this.feedbackMessage.set(normalized.message);
    } finally {
      this.submitting.set(false);
    }
  }

  async goHome(): Promise<void> {
    await this.router.navigateByUrl('/');
  }

  get passwordStrengthValue(): number {
    let score = 0;
    const password = this.password();

    if (/[A-Z]/.test(password)) {
      score += 1;
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    }

    if (password.length >= 8) {
      score += 1;
    }

    return score * 25;
  }

  get passwordStrengthLabel(): string {
    if (this.passwordStrengthValue >= 100) {
      return this.t('authPasswordStrengthStrong');
    }

    if (this.passwordStrengthValue >= 50) {
      return this.t('authPasswordStrengthMedium');
    }

    return this.t('authPasswordStrengthWeak');
  }
}
