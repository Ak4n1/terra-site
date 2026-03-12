import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AlertComponent, type AlertVariant } from '../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { AuthFacadeService } from '../../services/auth-facade.service';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent],
  templateUrl: './verify-email.page.html',
  styleUrl: './verify-email.page.css'
})
export class VerifyEmailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly languageService = inject(LanguageService);

  readonly loading = signal(true);
  readonly feedbackMessage = signal('');
  readonly feedbackVariant = signal<AlertVariant>('success');
  readonly verified = signal(false);
  readonly token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
  readonly title = computed(() => this.verified()
    ? this.t('authVerifyEmailPageSuccessTitle')
    : this.t('authVerifyEmailPageErrorTitle'));
  readonly copy = computed(() => this.verified()
    ? this.t('authVerifyEmailPageSuccessDescription')
    : this.t('authVerifyEmailPageErrorDescription'));

  constructor() {
    void this.verify();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  async goHome(): Promise<void> {
    await this.router.navigateByUrl('/');
  }

  private async verify(): Promise<void> {
    if (!this.token) {
      this.feedbackVariant.set('error');
      this.feedbackMessage.set(this.t('authVerifyEmailPageMissingToken'));
      this.loading.set(false);
      return;
    }

    try {
      const response = await firstValueFrom(this.authFacade.verifyEmail({ token: this.token }));
      this.verified.set(true);
      this.feedbackVariant.set('success');
      this.feedbackMessage.set(response.message);
    } catch (error) {
      const normalized = this.authFacade.normalizeError(error);
      this.feedbackVariant.set('error');
      this.feedbackMessage.set(normalized.message);
    } finally {
      this.loading.set(false);
    }
  }
}
