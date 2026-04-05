import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthFacadeService } from '../../../../../auth/services/auth-facade.service';
import { AlertComponent, type AlertVariant } from '../../../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../../../shared/ui/atoms/button/button.component';
import { ProgressBarComponent } from '../../../../../../shared/ui/atoms/progress-bar/progress-bar.component';
import { InputFieldComponent } from '../../../../../../shared/ui/molecules/input-field/input-field.component';
import { ModalComponent } from '../../../../../../shared/ui/organisms/modal/modal.component';
import { LanguageService } from '../../../../../../core/i18n/language.service';
import { formatDateTimeByLanguage } from '../../../../../../core/utils/date-locale.util';
import { formatUserAgentSummary } from '../../../../../../core/utils/user-agent.util';
import { evaluatePassword } from '../../../../../../core/utils/password-policy';
import { type AccountSecurityStatus, AuthService, type TrustedDevice, type TwoFactorSetupInitPayload } from '../../../../../auth/services/auth.service';

type SecurityMessageKind = 'success' | 'error' | 'warning';
type SecurityMessageScope = 'password' | 'twoFactor' | 'recovery' | 'trustedDevices';

@Component({
  selector: 'app-security-settings-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, ProgressBarComponent, InputFieldComponent, ModalComponent],
  templateUrl: './security-settings.page.html',
  styleUrl: './security-settings.page.css'
})
export class SecuritySettingsPage implements OnInit, OnDestroy {
  private static readonly ALERT_AUTO_HIDE_MS = 3000;

  private readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  requestingRecovery = false;
  confirmingRecovery = false;
  changingMasterPassword = false;
  requestingMasterPasswordReset = false;
  setupStarting = false;
  setupVerifying = false;
  trustedDevicesLoading = false;
  trustedDevicesRevokingAll = false;
  trustedDevicesModalOpen = false;
  twoFactorGuideModalOpen = false;
  passwordSessionClosedModalOpen = false;
  securityStatus: AccountSecurityStatus | null = null;
  trustedDevices: TrustedDevice[] = [];
  revokingDeviceIds = new Set<number>();
  setupData: TwoFactorSetupInitPayload | null = null;
  setupCode = '';
  recoveryToken = '';
  currentPassword = '';
  passwordCurrentValue = '';
  passwordNewValue = '';
  passwordRepeatValue = '';
  passwordMessage = '';
  passwordMessageKind: SecurityMessageKind = 'warning';
  twoFactorMessage = '';
  twoFactorMessageKind: SecurityMessageKind = 'warning';
  recoveryMessage = '';
  recoveryMessageKind: SecurityMessageKind = 'warning';
  trustedDevicesMessage = '';
  trustedDevicesMessageKind: SecurityMessageKind = 'warning';
  private readonly alertTimers: Partial<Record<SecurityMessageScope, ReturnType<typeof setTimeout>>> = {};

  ngOnInit(): void {
    this.recoveryToken = this.route.snapshot.queryParamMap.get('recoveryToken')?.trim() ?? '';
    this.loadStatus();
    this.loadTrustedDevices();
  }

  ngOnDestroy(): void {
    this.clearAllAlertTimers();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  usernameAutocompleteValue(): string {
    return this.authFacade.sessionSnapshot?.user.email?.trim() || 'user@terra.local';
  }

  alertVariantFor(kind: SecurityMessageKind): AlertVariant {
    if (kind === 'success') return 'success';
    if (kind === 'error') return 'error';
    return 'warning';
  }

  onSetupCodeChange(value: string): void {
    this.setupCode = value;
  }

  onCurrentPasswordChange(value: string): void {
    this.currentPassword = value;
  }

  onPasswordCurrentValueChange(value: string): void {
    this.passwordCurrentValue = value;
  }

  onPasswordNewValueChange(value: string): void {
    this.passwordNewValue = value;
  }

  onPasswordRepeatValueChange(value: string): void {
    this.passwordRepeatValue = value;
  }

  canVerifySetup(): boolean {
    return this.setupCode.trim().length === 6 && !this.setupVerifying && !!this.setupData;
  }

  hasRecoveryToken(): boolean {
    return this.recoveryToken.trim().length > 0;
  }

  canConfirmRecovery(): boolean {
    return this.hasRecoveryToken() && this.currentPassword.trim().length > 0 && !this.confirmingRecovery;
  }

  isAnyEmailRequestInFlight(): boolean {
    return this.requestingMasterPasswordReset || this.requestingRecovery;
  }

  cancelMasterPasswordForm(): void {
    this.passwordCurrentValue = '';
    this.passwordNewValue = '';
    this.passwordRepeatValue = '';
  }

  submitMasterPasswordChange(): void {
    if (!this.canSubmitMasterPasswordChange()) {
      this.showMessage('password', 'warning', this.t('dashboardConfigurationSecurityPasswordMockValidation'));
      return;
    }

    if (this.passwordNewValue !== this.passwordRepeatValue) {
      this.showMessage('password', 'warning', this.t('dashboardConfigurationSecurityPasswordMockMismatch'));
      return;
    }

    this.runInUi(() => {
      this.changingMasterPassword = true;
      this.showMessage('password', 'warning', '');
    });

    this.authService.changeMasterPassword(
      {
        currentPassword: this.passwordCurrentValue,
        newPassword: this.passwordNewValue,
        confirmPassword: this.passwordRepeatValue
      },
      this.generateIdempotencyKey('master-password-change-confirm')
    ).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.changingMasterPassword = false;
        });
      })
    ).subscribe({
      next: () => {
        this.runInUi(() => {
          this.cancelMasterPasswordForm();
          this.showMessage('password', 'warning', '');
          this.passwordSessionClosedModalOpen = true;
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.handleApiError(error, 'dashboardConfigurationSecurityGenericError', 'password');
        });
      }
    });
  }

  canSubmitMasterPasswordChange(): boolean {
    return this.passwordCurrentValue.trim().length > 0
      && this.passwordNewValue.trim().length > 0
      && this.passwordRepeatValue.trim().length > 0
      && evaluatePassword(this.passwordNewValue).isCompliant
      && !this.changingMasterPassword;
  }

  get passwordStrengthValue(): number {
    return evaluatePassword(this.passwordNewValue).strengthPercent;
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

  requestMasterPasswordResetEmail(): void {
    if (this.isAnyEmailRequestInFlight()) {
      return;
    }

    this.runInUi(() => {
      this.requestingMasterPasswordReset = true;
    });

    this.authService.requestMasterPasswordResetEmail(
      this.generateIdempotencyKey('master-password-reset-request')
    ).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.requestingMasterPasswordReset = false;
        });
      })
    ).subscribe({
      next: response => {
        this.runInUi(() => {
          this.showMessage('password', 'success', response.message || this.t('dashboardConfigurationSecurityPasswordResetEmailSent'));
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.handleApiError(error, 'dashboardConfigurationSecurityGenericError', 'password');
        });
      }
    });
  }

  formatDeviceDate(value: string): string {
    return formatDateTimeByLanguage(value, this.languageService.language());
  }

  formatDeviceAgent(value: string | null): string {
    return formatUserAgentSummary(value) || this.t('dashboardConfigurationSecurityTrustedDevicesUnknownAgent');
  }

  isRevokingDevice(sessionId: number): boolean {
    return this.revokingDeviceIds.has(sessionId);
  }

  startTwoFactorSetup(): void {
    if (this.setupStarting || this.setupVerifying) {
      return;
    }

    this.runInUi(() => {
      this.setupStarting = true;
      this.showMessage('twoFactor', 'warning', '');
    });

    this.authService.initTwoFactorSetup().pipe(
      finalize(() => {
        this.runInUi(() => {
          this.setupStarting = false;
        });
      })
    ).subscribe({
      next: payload => {
        this.runInUi(() => {
          this.setupData = payload;
          this.setupCode = '';
          this.showMessage('twoFactor', 'success', this.t('dashboardConfigurationSecurityTwoFactorSetupStarted'));
          this.loadTrustedDevices();
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.handleApiError(error, 'dashboardConfigurationSecurityGenericError', 'twoFactor');
        });
      }
    });
  }

  verifyTwoFactorSetup(): void {
    if (!this.canVerifySetup()) {
      return;
    }

    this.runInUi(() => {
      this.setupVerifying = true;
    });

    this.authService.verifyTwoFactorSetup(
      { code: this.setupCode.trim() },
      this.generateIdempotencyKey('2fa-setup-verify')
    ).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.setupVerifying = false;
        });
      })
    ).subscribe({
      next: (response) => {
        this.runInUi(() => {
          this.setupData = null;
          this.setupCode = '';
          this.showMessage('twoFactor', 'success', response.message || this.t('dashboardConfigurationSecurityTwoFactorSetupDone'));
          this.loadStatus();
          this.loadTrustedDevices();
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.handleApiError(error, 'dashboardConfigurationSecurityGenericError', 'twoFactor');
        });
      }
    });
  }

  sendRecoveryEmail(): void {
    if (this.isAnyEmailRequestInFlight()) {
      return;
    }

    this.runInUi(() => {
      this.requestingRecovery = true;
    });

    this.authService.requestTwoFactorRecoveryEmail().pipe(
      finalize(() => {
        this.runInUi(() => {
          this.requestingRecovery = false;
        });
      })
    ).subscribe({
      next: (response) => {
        this.runInUi(() => {
          this.showMessage('recovery', 'success', response.message || this.t('dashboardConfigurationSecurityRecoveryEmailSent'));
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.handleApiError(error, 'dashboardConfigurationSecurityGenericError', 'recovery');
        });
      }
    });
  }

  confirmRecovery(): void {
    if (!this.canConfirmRecovery()) {
      return;
    }

    this.runInUi(() => {
      this.confirmingRecovery = true;
      this.showMessage('recovery', 'warning', this.t('dashboardConfigurationSecurityRecoveryApplying'));
    });

    this.authService.confirmTwoFactorRecovery(
      {
        token: this.recoveryToken.trim(),
        currentPassword: this.currentPassword
      },
      this.generateIdempotencyKey('2fa-recovery-confirm')
    ).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.confirmingRecovery = false;
        });
      })
    ).subscribe({
      next: (response) => {
        this.runInUi(() => {
          this.currentPassword = '';
          this.recoveryToken = '';
          this.showMessage('recovery', 'success', response.message || this.t('dashboardConfigurationSecurityRecoveryApplied'));
          this.loadStatus();
          this.loadTrustedDevices();
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.handleApiError(error, 'dashboardConfigurationSecurityGenericError', 'recovery');
        });
      }
    });
  }

  private loadStatus(): void {
    this.runInUi(() => {
      this.loading = true;
    });

    this.authService.getSecurityStatus().pipe(
      finalize(() => {
        this.runInUi(() => {
          this.loading = false;
        });
      })
    ).subscribe({
      next: status => {
        this.runInUi(() => {
          this.securityStatus = status;
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.securityStatus = null;
          this.handleApiError(error, 'dashboardConfigurationSecurityLoadError', 'twoFactor');
        });
      }
    });
  }

  loadTrustedDevices(): void {
    this.runInUi(() => {
      this.trustedDevicesLoading = true;
    });

    this.authService.getTrustedDevices().pipe(
      finalize(() => {
        this.runInUi(() => {
          this.trustedDevicesLoading = false;
        });
      })
    ).subscribe({
      next: devices => {
        this.runInUi(() => {
          this.trustedDevices = devices.sort((a, b) => Number(b.currentSession) - Number(a.currentSession));
        });
      },
      error: () => {
        this.runInUi(() => {
          this.trustedDevices = [];
        });
      }
    });
  }

  revokeTrustedDevice(sessionId: number): void {
    if (this.isRevokingDevice(sessionId)) {
      return;
    }

    this.revokingDeviceIds.add(sessionId);
    this.authService.revokeTrustedDevice(sessionId).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.revokingDeviceIds.delete(sessionId);
        });
      })
    ).subscribe({
      next: (response) => {
        this.runInUi(() => {
          this.showMessage('trustedDevices', 'success', response.message || this.t('dashboardConfigurationSecurityTrustedDeviceRevoked'));
          this.loadTrustedDevices();
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.handleApiError(error, 'dashboardConfigurationSecurityGenericError', 'trustedDevices');
        });
      }
    });
  }

  revokeAllTrustedDevices(): void {
    if (this.trustedDevicesRevokingAll) {
      return;
    }

    this.trustedDevicesRevokingAll = true;
    this.authService.revokeAllTrustedDevices(this.generateIdempotencyKey('trusted-devices-revoke-all')).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.trustedDevicesRevokingAll = false;
        });
      })
    ).subscribe({
      next: (response) => {
        this.runInUi(() => {
          this.showMessage('trustedDevices', 'success', response.message || this.t('dashboardConfigurationSecurityTrustedDevicesRevokedAll'));
          this.loadTrustedDevices();
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.handleApiError(error, 'dashboardConfigurationSecurityGenericError', 'trustedDevices');
        });
      }
    });
  }

  openTrustedDevicesModal(): void {
    this.trustedDevicesModalOpen = true;
    this.showMessage('trustedDevices', 'warning', '');
    this.loadTrustedDevices();
  }

  closeTrustedDevicesModal(): void {
    this.trustedDevicesModalOpen = false;
  }

  openTwoFactorGuideModal(): void {
    this.twoFactorGuideModalOpen = true;
  }

  closeTwoFactorGuideModal(): void {
    this.twoFactorGuideModalOpen = false;
  }

  closePasswordSessionClosedModal(): void {
    this.passwordSessionClosedModalOpen = false;
  }

  acknowledgePasswordSessionClosedModal(): void {
    this.passwordSessionClosedModalOpen = false;
    this.authFacade.handleRefreshFailure();
    void this.router.navigateByUrl('/');
  }

  private showMessage(scope: SecurityMessageScope, kind: SecurityMessageKind, message: string): void {
    this.setScopedMessage(scope, kind, message);
    this.clearAlertTimer(scope);

    if (!message.trim()) {
      return;
    }

    this.alertTimers[scope] = setTimeout(() => {
      this.runInUi(() => {
        this.setScopedMessage(scope, kind, '');
      });
      this.clearAlertTimer(scope);
    }, SecuritySettingsPage.ALERT_AUTO_HIDE_MS);
  }

  private handleApiError(error: unknown, fallbackKey: string, scope: SecurityMessageScope): void {
    const normalized = this.authFacade.normalizeError(error);
    let message = normalized.message;

    if (normalized.retryAfterSeconds && normalized.retryAfterSeconds > 0) {
      message = `${message} (${normalized.retryAfterSeconds}s)`;
    }

    if (!message || message.trim().length === 0) {
      message = this.t(fallbackKey);
    }

    this.showMessage(scope, normalized.status === 429 ? 'warning' : 'error', message);
  }

  private setScopedMessage(scope: SecurityMessageScope, kind: SecurityMessageKind, message: string): void {
    if (scope === 'password') {
      this.passwordMessageKind = kind;
      this.passwordMessage = message;
      return;
    }

    if (scope === 'twoFactor') {
      this.twoFactorMessageKind = kind;
      this.twoFactorMessage = message;
      return;
    }

    if (scope === 'recovery') {
      this.recoveryMessageKind = kind;
      this.recoveryMessage = message;
      return;
    }

    this.trustedDevicesMessageKind = kind;
    this.trustedDevicesMessage = message;
  }

  private clearAlertTimer(scope: SecurityMessageScope): void {
    const timer = this.alertTimers[scope];
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    delete this.alertTimers[scope];
  }

  private clearAllAlertTimers(): void {
    (Object.keys(this.alertTimers) as SecurityMessageScope[]).forEach(scope => this.clearAlertTimer(scope));
  }

  private runInUi(action: () => void): void {
    if (NgZone.isInAngularZone()) {
      action();
      this.cdr.markForCheck();
      return;
    }

    this.ngZone.run(() => {
      action();
      this.cdr.markForCheck();
    });
  }

  private generateIdempotencyKey(scope: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${scope}-${crypto.randomUUID()}`;
    }

    return `${scope}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
}
