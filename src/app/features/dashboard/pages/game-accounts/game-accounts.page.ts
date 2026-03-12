import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { evaluatePassword, isPasswordCompliant } from '../../../../core/utils/password-policy';
import type { AlertVariant } from '../../../../shared/ui/atoms/alert/alert.component';
import { AlertComponent } from '../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { ProgressBarComponent } from '../../../../shared/ui/atoms/progress-bar/progress-bar.component';
import { InputFieldComponent } from '../../../../shared/ui/molecules/input-field/input-field.component';
import { VerificationCodeInputComponent } from '../../../../shared/ui/molecules/verification-code-input/verification-code-input.component';
import { SingleItemCarouselComponent, type SingleItemCarouselSlide } from '../../../../shared/ui/organisms/sliders/single-item-carousel/single-item-carousel.component';
import { AuthFacadeService } from '../../../auth/services/auth-facade.service';
import { GameAccountCreateService } from '../../services/game-account-create.service';

type CreateAccountStep = 'send-email' | 'verify-code' | 'create-account' | 'done';

@Component({
  selector: 'app-game-accounts-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, ProgressBarComponent, InputFieldComponent, VerificationCodeInputComponent, SingleItemCarouselComponent],
  templateUrl: './game-accounts.page.html',
  styleUrl: './game-accounts.page.css'
})
export class GameAccountsPage {
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly gameAccountCreateService = inject(GameAccountCreateService);
  private readonly authFacade = inject(AuthFacadeService);
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

  step: CreateAccountStep = 'send-email';
  verificationCode = '';
  accountName = '';
  password = '';
  confirmPassword = '';
  formMessage = '';
  formMessageKind: 'success' | 'error' | 'neutral' = 'neutral';
  sendingEmail = false;
  verifyingCode = false;
  creatingAccount = false;

  t(key: string): string {
    return this.languageService.t(key);
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

  onCreateAccountEnter(event: Event): void {
    event.preventDefault();
    this.createAccount();
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
    return this.accountName.trim().length >= 3
      && this.confirmPassword.trim().length > 0
      && isPasswordCompliant(this.password)
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

    this.sendingEmail = true;
    this.showMessage('dashboardGameAccountsSendingCodeStatus', 'neutral');
    this.gameAccountCreateService.sendEmailCode(this.contactEmail()).pipe(
      finalize(() => {
        this.sendingEmail = false;
      })
    ).subscribe({
      next: () => {
        this.step = 'verify-code';
        this.verificationCode = '';
        this.showMessage('dashboardGameAccountsCodeSent', 'success');
      },
      error: () => this.showMessage('dashboardGameAccountsGenericError', 'error')
    });
  }

  verifyCode(): void {
    if (!this.canVerifyCode()) {
      this.showMessage('dashboardGameAccountsInvalidCode', 'error');
      return;
    }

    this.verifyingCode = true;
    this.showMessage('dashboardGameAccountsVerifyingCodeStatus', 'neutral');
    this.gameAccountCreateService.verifyEmailCode(this.verificationCode).pipe(
      finalize(() => {
        this.verifyingCode = false;
      })
    ).subscribe({
      next: isValid => {
        if (!isValid) {
          this.showMessage('dashboardGameAccountsInvalidCode', 'error');
          return;
        }

        this.step = 'create-account';
        this.showMessage('dashboardGameAccountsCodeVerified', 'success');
      },
      error: () => this.showMessage('dashboardGameAccountsGenericError', 'error')
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
    this.showMessage('dashboardGameAccountsCreatingStatus', 'neutral');
    this.gameAccountCreateService.createGameAccount({
      accountName: this.accountName,
      password: this.password,
      confirmPassword: this.confirmPassword
    }).pipe(
      finalize(() => {
        this.creatingAccount = false;
      })
    ).subscribe({
      next: created => {
        if (!created) {
          this.showMessage('dashboardGameAccountsInvalidForm', 'error');
          return;
        }

        this.step = 'done';
        this.showMessage('dashboardGameAccountsCreated', 'success');
      },
      error: () => this.showMessage('dashboardGameAccountsGenericError', 'error')
    });
  }

  goBackToSendEmail(): void {
    this.step = 'send-email';
    this.verificationCode = '';
    this.showMessage('dashboardGameAccountsBackToEmail', 'neutral');
  }

  goBackToVerifyCode(): void {
    this.step = 'verify-code';
    this.showMessage('dashboardGameAccountsBackToEmail', 'neutral');
  }

  resetFlow(): void {
    this.step = 'send-email';
    this.verificationCode = '';
    this.accountName = '';
    this.password = '';
    this.confirmPassword = '';
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
    if (this.formMessageKind === 'success') {
      return 'success';
    }

    if (this.formMessageKind === 'error') {
      return 'error';
    }

    return 'warning';
  }

  isProcessMessage(): boolean {
    return this.formMessageKind === 'neutral' && this.formMessage.trim().length > 0;
  }

  hasFinalAlert(): boolean {
    return (this.formMessageKind === 'success' || this.formMessageKind === 'error')
      && this.formMessage.trim().length > 0;
  }

  onPromoAction(actionId: string): void {
    if (actionId === 'news' || actionId === 'vote') {
      void this.router.navigateByUrl('/');
    }
  }

  private showMessage(messageKey: string, kind: 'success' | 'error' | 'neutral'): void {
    this.formMessage = messageKey ? this.t(messageKey) : '';
    this.formMessageKind = kind;
  }
}
