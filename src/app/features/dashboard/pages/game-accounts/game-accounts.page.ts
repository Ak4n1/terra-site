import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { evaluatePassword, isPasswordCompliant } from '../../../../core/utils/password-policy';
import type { AlertVariant } from '../../../../shared/ui/atoms/alert/alert.component';
import { AlertComponent } from '../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import {
  MaskButtonComponent,
  type MaskButtonMask
} from '../../../../shared/ui/atoms/mask-button/mask-button.component';
import { ProgressBarComponent } from '../../../../shared/ui/atoms/progress-bar/progress-bar.component';
import { InputFieldComponent } from '../../../../shared/ui/molecules/input-field/input-field.component';
import { VerificationCodeInputComponent } from '../../../../shared/ui/molecules/verification-code-input/verification-code-input.component';
import { SingleItemCarouselComponent, type SingleItemCarouselSlide } from '../../../../shared/ui/organisms/sliders/single-item-carousel/single-item-carousel.component';
import { AuthFacadeService } from '../../../auth/services/auth-facade.service';
import { GameAccountCreateService } from '../../services/game-account-create.service';

type CreateAccountStep = 'send-email' | 'verify-code' | 'create-account' | 'done';
type CreateAccountMessageKind = 'success' | 'error' | 'neutral';
type CreateAccountStepMessageState = {
  message: string;
  kind: CreateAccountMessageKind;
};
type CreateAccountStepMessageMap = Record<CreateAccountStep, CreateAccountStepMessageState>;
type CreateAccountStepIndicator = {
  label: string;
  activeFrom: number;
  mask: MaskButtonMask;
};

@Component({
  selector: 'app-game-accounts-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, MaskButtonComponent, ProgressBarComponent, InputFieldComponent, VerificationCodeInputComponent, SingleItemCarouselComponent],
  templateUrl: './game-accounts.page.html',
  styleUrl: './game-accounts.page.css'
})
export class GameAccountsPage {
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly gameAccountCreateService = inject(GameAccountCreateService);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly currentUser = toSignal(this.authFacade.currentUser$, { initialValue: null });
  readonly promoSlides: SingleItemCarouselSlide[] = [
    {
      eyebrowKey: 'dashboardGameAccountsPromoNewsEyebrow',
      titleKey: 'dashboardGameAccountsPromoNewsTitle',
      descriptionKey: 'dashboardGameAccountsPromoNewsDescription',
      ctaLabelKey: 'dashboardGameAccountsPromoNewsCta',
      ctaActionId: 'news',
      imageSrc: 'assets/images/app/slider-create-account/goddar_4.3.png'
    },
    {
      eyebrowKey: 'dashboardGameAccountsPromoVoteEyebrow',
      titleKey: 'dashboardGameAccountsPromoVoteTitle',
      descriptionKey: 'dashboardGameAccountsPromoVoteDescription',
      ctaLabelKey: 'dashboardGameAccountsPromoVoteCta',
      ctaActionId: 'vote',
      imageSrc: 'assets/images/app/slider-create-account/mithilmines.webp'
    }
  ];
  readonly stepIndicators: readonly CreateAccountStepIndicator[] = [
    { label: '1', activeFrom: 1, mask: 2 },
    { label: '2', activeFrom: 2, mask: 3 },
    { label: '3', activeFrom: 3, mask: 4 },
    { label: '4', activeFrom: 4, mask: 5 }
  ];

  step: CreateAccountStep = 'send-email';
  verificationCode = '';
  verificationToken = '';
  accountName = '';
  password = '';
  confirmPassword = '';
  private readonly stepMessages: CreateAccountStepMessageMap = {
    'send-email': { message: '', kind: 'neutral' },
    'verify-code': { message: '', kind: 'neutral' },
    'create-account': { message: '', kind: 'neutral' },
    done: { message: '', kind: 'neutral' }
  };
  sendingEmail = false;
  verifyingCode = false;
  creatingAccount = false;
  hasRequestedCode = false;

  t(key: string): string {
    return this.languageService.t(key);
  }

  checklistLabel(key: string): string {
    return this.t(key).replace(/^\d+\.\s*/, '');
  }

  isStep(currentStep: CreateAccountStep): boolean {
    return this.step === currentStep;
  }

  onVerificationCodeChange(value: string): void {
    this.verificationCode = value;
  }

  onAccountNameChange(value: string): void {
    this.accountName = value;
  }

  onPasswordChange(value: string): void {
    this.password = value;
  }

  onConfirmPasswordChange(value: string): void {
    this.confirmPassword = value;
  }

  contactEmail(): string {
    return this.currentUser()?.email ?? '';
  }

  canSendCode(): boolean {
    return this.contactEmail().trim().length > 0 && !this.sendingEmail;
  }

  canVerifyCode(): boolean {
    return this.verificationCode.trim().length > 0 && !this.verifyingCode;
  }

  canCreateAccount(): boolean {
    return this.accountName.trim().length >= 4
      && this.verificationToken.trim().length > 0
      && this.confirmPassword.trim().length > 0
      && isPasswordCompliant(this.password)
      && this.password.length <= 16
      && !this.creatingAccount;
  }

  get passwordStrengthValue(): number {
    return evaluatePassword(this.password).strengthPercent;
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

  sendCode(): void {
    if (!this.canSendCode()) {
      this.showMessage('dashboardGameAccountsInvalidEmail', 'error');
      return;
    }

    this.step = 'verify-code';
    this.verificationCode = '';
    this.verificationToken = '';
    this.hasRequestedCode = true;
    this.sendingEmail = true;
    this.gameAccountCreateService.sendEmailCode(this.contactEmail()).pipe(
      finalize(() => {
        this.sendingEmail = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.showMessage('dashboardGameAccountsCodeSent', 'success');
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.handleApiError(error, 'dashboardGameAccountsGenericError');
        this.cdr.detectChanges();
      }
    });
  }

  verifyCode(): void {
    if (!this.canVerifyCode()) {
      this.showMessage('dashboardGameAccountsInvalidCode', 'error');
      return;
    }

    this.verifyingCode = true;
    this.gameAccountCreateService.verifyEmailCode(this.verificationCode).pipe(
      finalize(() => {
        this.verifyingCode = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: result => {
        this.verificationToken = result.verificationToken;
        this.step = 'create-account';
        this.showMessage('dashboardGameAccountsCodeVerified', 'success');
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.handleApiError(error, 'dashboardGameAccountsInvalidCode');
        this.cdr.detectChanges();
      }
    });
  }

  createAccount(): void {
    if (!this.canCreateAccount()) {
      this.showMessage('dashboardGameAccountsInvalidForm', 'error');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showMessage('dashboardGameAccountsPasswordMismatch', 'error');
      return;
    }

    this.creatingAccount = true;
    this.showMessage('', 'neutral');
    this.gameAccountCreateService.createGameAccount({
      accountName: this.accountName,
      password: this.password,
      verificationToken: this.verificationToken
    }).pipe(
      finalize(() => {
        this.creatingAccount = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.step = 'done';
        this.showMessage('dashboardGameAccountsCreated', 'success');
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.handleApiError(error, 'dashboardGameAccountsGenericError');
        this.cdr.detectChanges();
      }
    });
  }

  goBackToSendEmail(): void {
    this.step = 'send-email';
    this.showMessage('', 'neutral');
  }

  goBackToVerifyCode(): void {
    this.step = 'verify-code';
    this.verificationToken = '';
    this.showMessage('', 'neutral');
  }

  goToVerifyWithoutResend(): void {
    if (this.sendingEmail) {
      return;
    }

    this.step = 'verify-code';
    this.showMessage('', 'neutral');
  }

  resetFlow(): void {
    this.step = 'send-email';
    this.verificationCode = '';
    this.verificationToken = '';
    this.accountName = '';
    this.password = '';
    this.confirmPassword = '';
    this.hasRequestedCode = false;
    this.showMessage('', 'neutral');
  }

  stepIndex(): number {
    if (this.step === 'send-email') {
      return 1;
    }

    if (this.step === 'verify-code') {
      return 2;
    }

    if (this.step === 'create-account') {
      return 3;
    }

    return 4;
  }

  alertVariant(): AlertVariant {
    if (this.currentStepMessageKind() === 'success') {
      return 'success';
    }

    if (this.currentStepMessageKind() === 'error') {
      return 'error';
    }

    return 'warning';
  }

  shouldShowStepAlert(): boolean {
    return this.currentStepMessage().trim().length > 0;
  }

  currentStepMessage(): string {
    return this.stepMessages[this.step].message;
  }

  onPromoAction(actionId: string): void {
    if (actionId === 'news' || actionId === 'vote') {
      void this.router.navigateByUrl('/');
    }
  }

  private showMessage(messageKey: string, kind: CreateAccountMessageKind): void {
    this.setStepMessage(this.step, messageKey ? this.t(messageKey) : '', kind);
  }

  private handleApiError(error: unknown, fallbackKey: string): void {
    const normalized = this.authFacade.normalizeError(error);
    const mappedKey = this.mapApiCodeToI18nKey(normalized.code);
    let message = mappedKey ? this.t(mappedKey) : normalized.message;
    if (normalized.retryAfterSeconds && normalized.retryAfterSeconds > 0) {
      message = `${message} (${normalized.retryAfterSeconds}s)`;
    }

    this.setStepMessage(this.step, message, normalized.status === 429 ? 'neutral' : 'error');
    if (!this.currentStepMessage() || this.currentStepMessage().trim().length === 0) {
      this.setStepMessage(this.step, this.t(fallbackKey), 'error');
    }
  }

  private currentStepMessageKind(): CreateAccountMessageKind {
    return this.stepMessages[this.step].kind;
  }

  private setStepMessage(step: CreateAccountStep, message: string, kind: CreateAccountMessageKind): void {
    this.stepMessages[step] = { message, kind };
  }

  private mapApiCodeToI18nKey(code: string | null): string | null {
    if (!code) {
      return null;
    }
    const map: Record<string, string> = {
      'game.create_code_invalid': 'dashboardGameAccountsInvalidCode',
      'game.create_code_expired': 'dashboardGameAccountsInvalidCode',
      'game.account_already_exists': 'dashboardGameAccountsAccountAlreadyExists',
      'game.create_code_verification_required': 'dashboardGameAccountsInvalidCode',
      'game.master_email_not_verified': 'dashboardGameAccountsMasterEmailNotVerified',
      'game.create_code_cooldown_active': 'dashboardGameAccountsCodeCooldownActive',
      'game.create_code_attempts_exceeded': 'dashboardGameAccountsRateLimitExceeded',
      'rate_limit.exceeded': 'dashboardGameAccountsRateLimitExceeded'
    };
    return map[code] ?? null;
  }
}
