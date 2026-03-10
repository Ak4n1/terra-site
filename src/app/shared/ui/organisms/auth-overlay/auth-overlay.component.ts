import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AlertComponent } from '../../atoms/alert/alert.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { ProgressBarComponent } from '../../atoms/progress-bar/progress-bar.component';
import { InputFieldComponent } from '../../molecules/input-field/input-field.component';
import { ModalComponent } from '../modal/modal.component';

export type AuthOverlayMode = 'login' | 'register' | 'forgot-password';

@Component({
  selector: 'ui-auth-overlay',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, ProgressBarComponent, InputFieldComponent, ModalComponent],
  templateUrl: './auth-overlay.component.html',
  styleUrls: ['./auth-overlay.component.css']
})
export class AuthOverlayComponent implements OnChanges {
  readonly languageService = inject(LanguageService);
  readonly mockNotice = 'Mock only for now. Register and recovery are not connected yet.';

  @Input() open = false;
  @Input() mode: AuthOverlayMode = 'login';
  @Input() loginError = '';
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly loginSubmitted = new EventEmitter<{ email: string; password: string }>();

  currentMode: AuthOverlayMode = 'login';
  loginEmail = '';
  loginPassword = '';
  registerPassword = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.currentMode = this.mode;
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  setMode(mode: AuthOverlayMode): void {
    this.currentMode = mode;
  }

  get modalTitle(): string {
    if (this.currentMode === 'register') {
      return this.t('authRegisterTitle');
    }

    if (this.currentMode === 'forgot-password') {
      return this.t('authForgotPasswordTitle');
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

    return this.t('authLoginAction');
  }

  openForgotPassword(): void {
    this.currentMode = 'forgot-password';
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

  get primaryActionDisabled(): boolean {
    if (this.currentMode !== 'login') {
      return true;
    }

    return this.loginEmail.trim().length === 0 || this.loginPassword.length === 0;
  }

  submitPrimaryAction(): void {
    if (this.currentMode !== 'login' || this.primaryActionDisabled) {
      return;
    }

    this.loginSubmitted.emit({
      email: this.loginEmail,
      password: this.loginPassword
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
    this.loginEmail = '';
    this.loginPassword = '';
    this.registerPassword = '';
    this.currentMode = this.mode;
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }
}
