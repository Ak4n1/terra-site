import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AlertComponent, type AlertVariant } from '../../atoms/alert/alert.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { ProgressBarComponent } from '../../atoms/progress-bar/progress-bar.component';
import { InputFieldComponent } from '../../molecules/input-field/input-field.component';
import { ModalComponent } from '../modal/modal.component';

export type AuthOverlayMode = 'login' | 'register' | 'forgot-password' | 'verify-email';

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
  @Input() feedbackMessage = '';
  @Input() feedbackVariant: AlertVariant = 'warning';
  @Input() submitting = false;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly modeChanged = new EventEmitter<AuthOverlayMode>();
  @Output() readonly stateReset = new EventEmitter<void>();
  @Output() readonly loginSubmitted = new EventEmitter<{ email: string; password: string }>();
  @Output() readonly registerSubmitted = new EventEmitter<{ email: string; password: string; repeatPassword: string }>();
  @Output() readonly forgotPasswordSubmitted = new EventEmitter<{ email: string }>();
  @Output() readonly resendVerificationSubmitted = new EventEmitter<{ email: string }>();

  currentMode: AuthOverlayMode = 'login';
  loginEmail = '';
  loginPassword = '';
  registerEmail = '';
  registerPassword = '';
  registerRepeatPassword = '';
  forgotPasswordEmail = '';
  verifyEmailAddress = '';

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

  onRegisterEmailChange(value: string): void {
    this.registerEmail = value;
  }

  onRegisterRepeatPasswordChange(value: string): void {
    this.registerRepeatPassword = value;
  }

  onForgotPasswordEmailChange(value: string): void {
    this.forgotPasswordEmail = value;
  }

  onVerifyEmailAddressChange(value: string): void {
    this.verifyEmailAddress = value;
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
        || this.registerPassword !== this.registerRepeatPassword;
    }

    if (this.currentMode === 'verify-email') {
      return this.verifyEmailAddress.trim().length === 0;
    }

    return this.forgotPasswordEmail.trim().length === 0;
  }

  submitPrimaryAction(): void {
    if (this.primaryActionDisabled) {
      return;
    }

    if (this.currentMode === 'login') {
      this.loginSubmitted.emit({
        email: this.loginEmail,
        password: this.loginPassword
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

    this.forgotPasswordSubmitted.emit({
      email: this.forgotPasswordEmail
    });
  }

  get passwordStrengthValue(): number {
    let score = 0;

    if (/[A-Z]/.test(this.registerPassword)) {
      score += 1;
    }

    if (/[0-9]/.test(this.registerPassword)) {
      score += 1;
    }

    if (/[^A-Za-z0-9]/.test(this.registerPassword)) {
      score += 1;
    }

    if (this.registerPassword.length >= 8) {
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

  close(): void {
    this.resetFormState();
    this.closed.emit();
  }

  private resetFormState(): void {
    this.loginEmail = '';
    this.loginPassword = '';
    this.registerEmail = '';
    this.registerPassword = '';
    this.registerRepeatPassword = '';
    this.forgotPasswordEmail = '';
    this.verifyEmailAddress = this.verificationEmail;
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
