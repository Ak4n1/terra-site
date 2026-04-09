import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { Chrome, type LucideIconData } from 'lucide-angular';
import { LanguageService } from '../../../../core/i18n/language.service';
import { evaluatePassword, isPasswordCompliant } from '../../../../core/utils/password-policy';
import { AlertComponent, type AlertVariant } from '../../atoms/alert/alert.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { ProgressBarComponent } from '../../atoms/progress-bar/progress-bar.component';
import { InputFieldComponent } from '../../molecules/input-field/input-field.component';
import { ModalComponent } from '../modal/modal.component';

export type AuthOverlayMode = 'login' | 'register' | 'forgot-password' | 'verify-email' | 'two-factor' | 'oauth-email-code';

@Component({
  selector: 'ui-auth-overlay',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, ProgressBarComponent, InputFieldComponent, ModalComponent],
  templateUrl: './auth-overlay.component.html',
  styleUrls: ['./auth-overlay.component.css']
})
export class AuthOverlayComponent implements OnChanges {
  readonly languageService = inject(LanguageService);

  @Input() open = false;
  @Input() mode: AuthOverlayMode = 'login';
  @Input() verificationEmail = '';
  @Input() oauthGoogleChallengeId = '';
  @Input() oauthGoogleMaskedEmail = '';
  @Input() feedbackMessage = '';
  @Input() feedbackVariant: AlertVariant = 'warning';
  @Input() submitting = false;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly modeChanged = new EventEmitter<AuthOverlayMode>();
  @Output() readonly stateReset = new EventEmitter<void>();
  @Output() readonly loginSubmitted = new EventEmitter<{ email: string; password: string; twoFactorCode?: string; trustDevice?: boolean }>();
  @Output() readonly registerSubmitted = new EventEmitter<{ email: string; password: string; repeatPassword: string }>();
  @Output() readonly forgotPasswordSubmitted = new EventEmitter<{ email: string }>();
  @Output() readonly resendVerificationSubmitted = new EventEmitter<{ email: string }>();
  @Output() readonly twoFactorRecoveryRequested = new EventEmitter<{ email: string }>();
  @Output() readonly googleEmailCodeSubmitted = new EventEmitter<{ challengeId: string; code: string; trustDevice?: boolean }>();
  @Output() readonly googleEmailCodeResendRequested = new EventEmitter<{ challengeId: string }>();
  @Output() readonly googleLoginRequested = new EventEmitter<void>();

  currentMode: AuthOverlayMode = 'login';
  loginEmail = '';
  loginPassword = '';
  loginTwoFactorCode = '';
  loginTrustDevice = true;
  registerEmail = '';
  registerPassword = '';
  registerRepeatPassword = '';
  registerAcceptedLegal = false;
  forgotPasswordEmail = '';
  verifyEmailAddress = '';
  googleEmailCode = '';
  googleCodeTrustDevice = true;
  readonly googleIcon: LucideIconData = Chrome;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.currentMode = this.mode;
      this.stateReset.emit();
    }

    if (changes['verificationEmail']) {
      this.verifyEmailAddress = this.verificationEmail;
    }

    if (changes['open'] && !this.open) {
      this.resetFormState();
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  setMode(mode: AuthOverlayMode): void {
    this.currentMode = mode;
    this.modeChanged.emit(mode);
    this.stateReset.emit();
  }

  get modalTitle(): string {
    if (this.currentMode === 'oauth-email-code') {
      return this.t('authGoogleEmailCodeTitle');
    }

    if (this.currentMode === 'two-factor') {
      return this.t('authTwoFactorChallengeTitle');
    }

    if (this.currentMode === 'register') {
      return this.t('authRegisterTitle');
    }

    if (this.currentMode === 'forgot-password') {
      return this.t('authForgotPasswordTitle');
    }

    if (this.currentMode === 'verify-email') {
      return this.t('authVerifyEmailTitle');
    }

    return this.t('authLoginTitle');
  }

  get actionLabel(): string {
    if (this.currentMode === 'oauth-email-code') {
      return this.t('authGoogleEmailCodeAction');
    }

    if (this.currentMode === 'two-factor') {
      return this.t('authTwoFactorChallengeAction');
    }

    if (this.currentMode === 'register') {
      return this.t('authRegisterAction');
    }

    if (this.currentMode === 'forgot-password') {
      return this.t('authForgotPasswordAction');
    }

    if (this.currentMode === 'verify-email') {
      return this.t('authVerifyEmailAction');
    }

    return this.t('authLoginAction');
  }

  get activeFormId(): string {
    if (this.currentMode === 'oauth-email-code') {
      return 'auth-oauth-email-code-form';
    }

    if (this.currentMode === 'two-factor') {
      return 'auth-two-factor-form';
    }

    if (this.currentMode === 'register') {
      return 'auth-register-form';
    }

    if (this.currentMode === 'forgot-password') {
      return 'auth-forgot-password-form';
    }

    if (this.currentMode === 'verify-email') {
      return 'auth-verify-email-form';
    }

    return 'auth-login-form';
  }

  openForgotPassword(): void {
    this.currentMode = 'forgot-password';
    this.modeChanged.emit('forgot-password');
    this.stateReset.emit();
  }

  onLoginEmailChange(value: string): void {
    this.loginEmail = value;
  }

  onLoginPasswordChange(value: string): void {
    this.loginPassword = value;
  }

  onRegisterPasswordChange(value: string): void {
    this.registerPassword = value;
  }

  onLoginTwoFactorCodeChange(value: string): void {
    this.loginTwoFactorCode = value;
  }

  onLoginTrustDeviceChange(value: boolean): void {
    this.loginTrustDevice = value;
  }

  onGoogleCodeTrustDeviceChange(value: boolean): void {
    this.googleCodeTrustDevice = value;
  }

  onRegisterEmailChange(value: string): void {
    this.registerEmail = value;
  }

  onRegisterRepeatPasswordChange(value: string): void {
    this.registerRepeatPassword = value;
  }

  onRegisterAcceptedLegalChange(value: boolean): void {
    this.registerAcceptedLegal = value;
  }

  onForgotPasswordEmailChange(value: string): void {
    this.forgotPasswordEmail = value;
  }

  onVerifyEmailAddressChange(value: string): void {
    this.verifyEmailAddress = value;
  }

  onGoogleEmailCodeChange(value: string): void {
    this.googleEmailCode = value;
  }

  requestTwoFactorRecovery(): void {
    if (this.loginEmail.trim().length === 0 || this.submitting) {
      return;
    }
    this.twoFactorRecoveryRequested.emit({ email: this.loginEmail.trim() });
  }

  requestGoogleLogin(): void {
    if (this.submitting) {
      return;
    }

    this.googleLoginRequested.emit();
  }

  requestGoogleEmailCodeResend(): void {
    if (this.submitting || this.oauthGoogleChallengeId.trim().length === 0) {
      return;
    }

    this.googleEmailCodeResendRequested.emit({ challengeId: this.oauthGoogleChallengeId.trim() });
  }

  get primaryActionDisabled(): boolean {
    if (this.submitting) {
      return true;
    }

    if (this.currentMode === 'login') {
      return this.loginEmail.trim().length === 0 || this.loginPassword.length === 0;
    }

    if (this.currentMode === 'register') {
      return this.registerEmail.trim().length === 0
        || this.registerPassword.length === 0
        || this.registerRepeatPassword.length === 0
        || !isPasswordCompliant(this.registerPassword)
        || this.registerPassword !== this.registerRepeatPassword
        || !this.registerAcceptedLegal;
    }

    if (this.currentMode === 'verify-email') {
      return this.verifyEmailAddress.trim().length === 0;
    }

    if (this.currentMode === 'oauth-email-code') {
      return this.oauthGoogleChallengeId.trim().length === 0 || this.googleEmailCode.trim().length !== 6;
    }

    if (this.currentMode === 'two-factor') {
      return this.loginEmail.trim().length === 0 || this.loginPassword.length === 0 || this.loginTwoFactorCode.trim().length !== 6;
    }

    return this.forgotPasswordEmail.trim().length === 0;
  }

  submitPrimaryAction(): void {
    if (this.primaryActionDisabled) {
      return;
    }

    if (this.currentMode === 'login' || this.currentMode === 'two-factor') {
      this.loginSubmitted.emit({
        email: this.loginEmail,
        password: this.loginPassword,
        twoFactorCode: this.loginTwoFactorCode.trim().length > 0 ? this.loginTwoFactorCode.trim() : undefined,
        trustDevice: this.loginTrustDevice
      });
      return;
    }

    if (this.currentMode === 'register') {
      this.registerSubmitted.emit({
        email: this.registerEmail,
        password: this.registerPassword,
        repeatPassword: this.registerRepeatPassword
      });
      return;
    }

    if (this.currentMode === 'verify-email') {
      this.resendVerificationSubmitted.emit({
        email: this.verifyEmailAddress
      });
      return;
    }

    if (this.currentMode === 'oauth-email-code') {
      this.googleEmailCodeSubmitted.emit({
        challengeId: this.oauthGoogleChallengeId.trim(),
        code: this.googleEmailCode.trim(),
        trustDevice: this.googleCodeTrustDevice
      });
      return;
    }

    this.forgotPasswordSubmitted.emit({
      email: this.forgotPasswordEmail
    });
  }

  get passwordStrengthValue(): number {
    return evaluatePassword(this.registerPassword).strengthPercent;
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

  close(): void {
    this.resetFormState();
    this.closed.emit();
  }

  private resetFormState(): void {
    this.loginEmail = '';
    this.loginPassword = '';
    this.loginTwoFactorCode = '';
    this.loginTrustDevice = true;
    this.registerEmail = '';
    this.registerPassword = '';
    this.registerRepeatPassword = '';
    this.registerAcceptedLegal = false;
    this.forgotPasswordEmail = '';
    this.verifyEmailAddress = this.verificationEmail;
    this.googleEmailCode = '';
    this.googleCodeTrustDevice = true;
    this.currentMode = this.mode;
    this.stateReset.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }
}
