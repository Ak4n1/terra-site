import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AlertComponent, type AlertVariant } from '../../../../shared/ui/atoms/alert/alert.component';
import { resolveAlertVariant } from '../../../../shared/ui/atoms/alert/alert-variant.util';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { InputFieldComponent } from '../../../../shared/ui/molecules/input-field/input-field.component';
import { AuthFacadeService } from '../../services/auth-facade.service';

@Component({
  selector: 'app-recover-two-factor-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, InputFieldComponent],
  templateUrl: './recover-two-factor.page.html',
  styleUrl: './recover-two-factor.page.css'
})
export class RecoverTwoFactorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly languageService = inject(LanguageService);
  private readonly backgroundOffset = signal(0);

  readonly token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
  readonly usernameAutocompleteValue = this.route.snapshot.queryParamMap.get('email')?.trim() || 'user@terra.local';
  readonly currentPassword = signal('');
  readonly submitting = signal(false);
  readonly completed = signal(false);
  readonly feedbackMessage = signal('');
  readonly feedbackVariant = signal<AlertVariant>('warning');
  readonly hasToken = this.token.length > 0;
  readonly submitDisabled = computed(() =>
    this.submitting()
    || !this.hasToken
    || this.currentPassword().trim().length === 0
  );

  t(key: string, params?: Record<string, string | number>): string {
    return this.languageService.t(key, params);
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    // Parallax: mueve el fondo más lento que el scroll
    this.backgroundOffset.set(window.scrollY * 0.35);
  }

  backdropPosition(): string {
    return `center ${-this.backgroundOffset()}px`;
  }

  onCurrentPasswordChange(value: string): void {
    this.currentPassword.set(value);
  }

  async submit(): Promise<void> {
    if (this.submitDisabled()) {
      if (!this.hasToken) {
        this.feedbackVariant.set('error');
        this.feedbackMessage.set(this.t('authRecoverTwoFactorPageMissingToken'));
      }
      return;
    }

    this.submitting.set(true);
    this.feedbackMessage.set('');

    try {
      const response = await firstValueFrom(this.authFacade.confirmTwoFactorRecoveryFromLogin({
        token: this.token,
        currentPassword: this.currentPassword()
      }));
      this.completed.set(true);
      this.feedbackVariant.set('success');
      this.feedbackMessage.set(response.message);
      this.currentPassword.set('');
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
}
