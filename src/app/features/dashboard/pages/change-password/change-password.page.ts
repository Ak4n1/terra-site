import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter, finalize } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { formatDateTimeByLanguage } from '../../../../core/utils/date-locale.util';
import { evaluatePassword, isPasswordCompliant } from '../../../../core/utils/password-policy';
import type { AlertVariant } from '../../../../shared/ui/atoms/alert/alert.component';
import { AlertComponent } from '../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import {
  MaskButtonComponent,
  type MaskButtonMask
} from '../../../../shared/ui/atoms/mask-button/mask-button.component';
import { OrbSpinnerComponent } from '../../../../shared/ui/atoms/orb-spinner/orb-spinner.component';
import { ProgressBarComponent } from '../../../../shared/ui/atoms/progress-bar/progress-bar.component';
import { InputFieldComponent } from '../../../../shared/ui/molecules/input-field/input-field.component';
import { VerificationCodeInputComponent } from '../../../../shared/ui/molecules/verification-code-input/verification-code-input.component';
import { ModalComponent } from '../../../../shared/ui/organisms/modal/modal.component';
import { SingleItemCarouselComponent, type SingleItemCarouselSlide } from '../../../../shared/ui/organisms/sliders/single-item-carousel/single-item-carousel.component';
import { AuthFacadeService } from '../../../auth/services/auth-facade.service';
import { GameAccountChangePasswordService, type GameAccountSummary } from '../../services/game-account-change-password.service';
import { ArrowBigRight, LucideAngularModule } from 'lucide-angular';

type ChangePasswordStep = 'send-email' | 'verify-code' | 'change-password' | 'done';
type ChangePasswordMessageKind = 'success' | 'error' | 'neutral';
type ChangePasswordStepMessageState = {
  message: string;
  kind: ChangePasswordMessageKind;
};
type ChangePasswordStepMessageMap = Record<ChangePasswordStep, ChangePasswordStepMessageState>;
type ChangePasswordStepIndicator = {
  label: string;
  activeFrom: number;
  mask: MaskButtonMask;
};

type AccountPaginationItem =
  | { type: 'page'; page: number }
  | { type: 'ellipsis'; id: string };

@Component({
  selector: 'app-dashboard-change-password-page',
  standalone: true,
  imports: [
    CommonModule,
    AlertComponent,
    ButtonComponent,
    MaskButtonComponent,
    OrbSpinnerComponent,
    ProgressBarComponent,
    InputFieldComponent,
    VerificationCodeInputComponent,
    ModalComponent,
    SingleItemCarouselComponent,
    LucideAngularModule
  ],
  templateUrl: './change-password.page.html',
  styleUrl: './change-password.page.css'
})
export class DashboardChangePasswordPage implements OnInit, OnDestroy {
  private static readonly ACCOUNTS_PAGE_SIZE = 4;
  private static readonly ACCOUNTS_PAGINATION_WINDOW = 1;
  private static readonly ACCOUNTS_PAGINATION_EDGE = 1;
  private static readonly ACCOUNTS_LOADING_MIN_MS = 1000;
  private static readonly ROUTE_PREFIX = '/dashboard/change-password';
  private static readonly ACCOUNT_ITEM_MASK_IMAGES = [
    "url('/assets/images/clipping_masks/34294919_rectangle_brushes_shape_1.svg')",
    "url('/assets/images/clipping_masks/34294919_rectangle_brushes_shape_2.svg')",
    "url('/assets/images/clipping_masks/34294919_rectangle_brushes_shape_3.svg')",
    "url('/assets/images/clipping_masks/34294919_rectangle_brushes_shape_5.svg')"
  ] as const;

  private readonly languageService = inject(LanguageService);
  private readonly changePasswordService = inject(GameAccountChangePasswordService);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private routeEventsSub: Subscription | null = null;
  private routeActive = false;
  private accountsLoadSequence = 0;

  readonly promoSlides: SingleItemCarouselSlide[] = [
    {
      eyebrowKey: 'dashboardChangePasswordPromoForumEyebrow',
      titleKey: 'dashboardChangePasswordPromoForumTitle',
      descriptionKey: 'dashboardChangePasswordPromoForumDescription',
      ctaLabelKey: 'dashboardChangePasswordPromoForumCta',
      ctaActionId: 'forum',
      imageSrc: 'assets/images/app/slider-change-password/darkelves.webp'
    },
    {
      eyebrowKey: 'dashboardChangePasswordPromoSupportEyebrow',
      titleKey: 'dashboardChangePasswordPromoSupportTitle',
      descriptionKey: 'dashboardChangePasswordPromoSupportDescription',
      ctaLabelKey: 'dashboardChangePasswordPromoSupportCta',
      ctaActionId: 'support',
      imageSrc: 'assets/images/app/slider-change-password/toi.webp'
    }
  ];
  readonly selectedAccountArrowIcon = ArrowBigRight;
  readonly stepIndicators: readonly ChangePasswordStepIndicator[] = [
    { label: '1', activeFrom: 1, mask: 2 },
    { label: '2', activeFrom: 2, mask: 3 },
    { label: '3', activeFrom: 3, mask: 4 },
    { label: '4', activeFrom: 4, mask: 5 }
  ];

  accounts: GameAccountSummary[] = [];
  accountsQuery = '';
  accountPage = 0;
  accountsLoading = false;
  accountsInitialized = false;
  accountLoadErrorMessage = '';

  step: ChangePasswordStep = 'send-email';
  selectedLogin = '';
  verificationCode = '';
  verificationToken = '';
  newPassword = '';
  confirmPassword = '';

  private readonly stepMessages: ChangePasswordStepMessageMap = {
    'send-email': { message: '', kind: 'neutral' },
    'verify-code': { message: '', kind: 'neutral' },
    'change-password': { message: '', kind: 'neutral' },
    done: { message: '', kind: 'neutral' }
  };
  sendingEmail = false;
  verifyingCode = false;
  changingPassword = false;
  hasRequestedCode = false;
  accountSwitchModalOpen = false;
  pendingSwitchLogin: string | null = null;

  ngOnInit(): void {
    this.debug('ngOnInit', { initialUrl: this.router.url });
    this.routeEventsSub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.debug('routerNavigationEnd', { urlAfterRedirects: event.urlAfterRedirects });
      this.handleRouteChange(event.urlAfterRedirects);
    });

    this.handleRouteChange(this.router.url);
  }

  ngOnDestroy(): void {
    this.debug('ngOnDestroy', { accountsLoadSequence: this.accountsLoadSequence });
    this.routeEventsSub?.unsubscribe();
    this.routeEventsSub = null;
    this.accountsLoadSequence += 1;
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.languageService.t(key, params);
  }

  onPromoAction(actionId: string): void {
    if (actionId === 'forum') {
      this.showMessage(this.t('dashboardChangePasswordPromoForumSoonMessage'), 'neutral');
      return;
    }

    if (actionId === 'support') {
      this.showMessage(this.t('dashboardChangePasswordPromoSupportSoonMessage'), 'neutral');
    }
  }

  get selectedAccount(): GameAccountSummary | null {
    return this.accounts.find(account => account.login === this.selectedLogin) ?? null;
  }

  get filteredAccounts(): GameAccountSummary[] {
    const query = this.accountsQuery.trim().toLowerCase();
    if (!query) {
      return this.accounts;
    }

    return this.accounts.filter(account => account.login.toLowerCase().includes(query));
  }

  get pagedAccounts(): GameAccountSummary[] {
    const start = this.accountPage * DashboardChangePasswordPage.ACCOUNTS_PAGE_SIZE;
    return this.filteredAccounts.slice(start, start + DashboardChangePasswordPage.ACCOUNTS_PAGE_SIZE);
  }

  accountMaskImageForPage(index: number): string {
    const visualIndex = (this.accountPage * DashboardChangePasswordPage.ACCOUNTS_PAGE_SIZE) + index;
    return DashboardChangePasswordPage.ACCOUNT_ITEM_MASK_IMAGES[
      visualIndex % DashboardChangePasswordPage.ACCOUNT_ITEM_MASK_IMAGES.length
    ];
  }

  get accountTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAccounts.length / DashboardChangePasswordPage.ACCOUNTS_PAGE_SIZE));
  }

  get hasPreviousAccountPage(): boolean {
    return this.accountPage > 0;
  }

  get hasNextAccountPage(): boolean {
    return this.accountPage < this.accountTotalPages - 1;
  }

  get accountPaginationItems(): AccountPaginationItem[] {
    return this.buildPaginationItems(this.accountTotalPages, this.accountPage);
  }

  isStep(currentStep: ChangePasswordStep): boolean {
    return this.step === currentStep;
  }

  stepIndex(): number {
    if (this.step === 'send-email') {
      return 1;
    }
    if (this.step === 'verify-code') {
      return 2;
    }
    if (this.step === 'change-password') {
      return 3;
    }
    return 4;
  }

  selectAccount(login: string): void {
    this.debug('selectAccount:attempt', { login, selectedLogin: this.selectedLogin });
    if (login === this.selectedLogin) {
      this.debug('selectAccount:noopAlreadySelected', { login });
      return;
    }

    if (this.shouldConfirmAccountSwitch()) {
      this.debug('selectAccount:requiresConfirm', { login });
      this.pendingSwitchLogin = login;
      this.accountSwitchModalOpen = true;
      return;
    }

    this.debug('selectAccount:applyDirect', { login });
    this.applyAccountSwitch(login);
  }

  onAccountsQueryChange(value: string): void {
    this.debug('onAccountsQueryChange', { value });
    this.accountsQuery = value;
    this.accountPage = 0;

    const selectedStillVisible = this.filteredAccounts.some(account => account.login === this.selectedLogin);
    if (!selectedStillVisible && this.filteredAccounts.length > 0) {
      this.selectAccount(this.filteredAccounts[0].login);
    }
  }

  onAccountsSearchArrowDown(event: Event): void {
    event.preventDefault();
    this.moveSelectedAccount(1);
  }

  onAccountsSearchArrowUp(event: Event): void {
    event.preventDefault();
    this.moveSelectedAccount(-1);
  }

  goToAccountPage(page: number): void {
    if (page < 0 || page >= this.accountTotalPages || page === this.accountPage) {
      return;
    }
    this.accountPage = page;
  }

  previousAccountPage(): void {
    this.goToAccountPage(this.accountPage - 1);
  }

  nextAccountPage(): void {
    this.goToAccountPage(this.accountPage + 1);
  }

  trackAccountPaginationItem(index: number, item: AccountPaginationItem): string {
    return item.type === 'page' ? `page-${item.page}` : `ellipsis-${item.id}-${index}`;
  }

  formatAccountDate(value: string): string {
    return formatDateTimeByLanguage(value, this.languageService.language());
  }

  onVerificationCodeChange(value: string): void {
    this.verificationCode = value;
  }

  onNewPasswordChange(value: string): void {
    this.newPassword = value;
  }

  onConfirmPasswordChange(value: string): void {
    this.confirmPassword = value;
  }

  canSendCode(): boolean {
    return !!this.selectedAccount && !this.sendingEmail && !this.accountsLoading;
  }

  canVerifyCode(): boolean {
    return this.verificationCode.trim().length === 6 && !this.verifyingCode;
  }

  canApplyChange(): boolean {
    return this.newPassword.trim().length > 0
      && this.confirmPassword.trim().length > 0
      && this.verificationToken.trim().length > 0
      && isPasswordCompliant(this.newPassword)
      && this.newPassword.length <= 16
      && !!this.selectedAccount
      && !this.changingPassword;
  }

  get passwordStrengthValue(): number {
    return evaluatePassword(this.newPassword).strengthPercent;
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
    if (!this.canSendCode() || !this.selectedAccount) {
      return;
    }

    this.step = 'verify-code';
    this.verificationCode = '';
    this.verificationToken = '';
    this.sendingEmail = true;
    this.hasRequestedCode = true;

    this.changePasswordService.sendEmailCode(this.selectedAccount.login).pipe(
      finalize(() => {
        this.sendingEmail = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.showMessage(this.t('dashboardChangePasswordMessageCodeSent'), 'success');
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.handleApiError(error, 'dashboardChangePasswordGenericError');
        this.cdr.detectChanges();
      }
    });
  }

  goToVerifyWithoutResend(): void {
    if (this.sendingEmail) {
      return;
    }

    this.step = 'verify-code';
    this.showMessage('', 'neutral');
  }

  goBackToSendEmail(): void {
    this.step = 'send-email';
    this.showMessage('', 'neutral');
  }

  verifyCode(): void {
    if (!this.canVerifyCode() || !this.selectedAccount) {
      this.showMessage(this.t('dashboardChangePasswordMessageInvalidCodeLength'), 'error');
      return;
    }

    this.verifyingCode = true;

    this.changePasswordService.verifyEmailCode(this.selectedAccount.login, this.verificationCode).pipe(
      finalize(() => {
        this.verifyingCode = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: result => {
        this.verificationToken = result.verificationToken;
        this.step = 'change-password';
        this.showMessage(this.t('dashboardChangePasswordMessageCodeVerified'), 'success');
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.handleApiError(error, 'dashboardChangePasswordGenericError');
        this.cdr.detectChanges();
      }
    });
  }

  goBackToVerifyCode(): void {
    this.step = 'verify-code';
    this.verificationToken = '';
    this.showMessage('', 'neutral');
  }

  applyChange(): void {
    if (!this.canApplyChange() || !this.selectedAccount) {
      this.showMessage(this.t('dashboardChangePasswordMessageIncompleteFields'), 'error');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.showMessage(this.t('dashboardChangePasswordMessagePasswordMismatch'), 'error');
      return;
    }

    this.changingPassword = true;
    this.showMessage(this.t('dashboardChangePasswordMessageApplyingChange'), 'neutral');

    this.changePasswordService.changePassword({
      accountName: this.selectedAccount.login,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
      verificationToken: this.verificationToken
    }).pipe(
      finalize(() => {
        this.changingPassword = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.step = 'done';
        this.showMessage(
          this.t('dashboardChangePasswordMessagePasswordChanged', {
            login: this.selectedAccount?.login ?? 'account'
          }),
          'success'
        );
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.handleApiError(error, 'dashboardChangePasswordGenericError');
        this.cdr.detectChanges();
      }
    });
  }

  resetFlow(clearSelected = true): void {
    if (clearSelected && this.accounts.length > 0) {
      this.selectedLogin = this.accounts[0].login;
    }

    this.clearAllStepMessages();
    this.step = 'send-email';
    this.verificationCode = '';
    this.verificationToken = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.hasRequestedCode = false;
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

  currentStepMessage(): string {
    return this.stepMessages[this.step].message;
  }

  shouldShowFormAlert(): boolean {
    const shouldShow = this.accountsInitialized
      && !this.accountsLoading
      && !this.isAccountsLoadingStatusMessage(this.currentStepMessage())
      && this.currentStepMessage().trim().length > 0;
    if (shouldShow) {
      this.debug('shouldShowFormAlert:true', { kind: this.currentStepMessageKind(), message: this.currentStepMessage() });
    }
    return shouldShow;
  }

  private loadAccounts(): void {
    const loadSequence = ++this.accountsLoadSequence;
    const loadStartedAt = Date.now();
    this.debug('loadAccounts:start', { loadSequence });
    this.accountsInitialized = false;
    this.accountsLoading = true;
    this.accountLoadErrorMessage = '';
    this.showMessage('', 'neutral');

    this.changePasswordService.listAccounts().pipe(
      finalize(() => {
        const elapsed = Date.now() - loadStartedAt;
        const remaining = Math.max(0, DashboardChangePasswordPage.ACCOUNTS_LOADING_MIN_MS - elapsed);
        this.debug('loadAccounts:finalizeSchedule', { loadSequence, elapsed, remaining });

        setTimeout(() => {
          if (loadSequence !== this.accountsLoadSequence) {
            this.debug('loadAccounts:finalizeIgnoredBySequence', { loadSequence, activeSequence: this.accountsLoadSequence });
            return;
          }
          this.accountsLoading = false;
          this.accountsInitialized = true;
          this.debug('loadAccounts:finalized', { loadSequence, accountsLength: this.accounts.length });
          this.cdr.detectChanges();
        }, remaining);
      })
    ).subscribe({
      next: accounts => {
        if (loadSequence !== this.accountsLoadSequence) {
          this.debug('loadAccounts:nextIgnoredBySequence', { loadSequence, activeSequence: this.accountsLoadSequence });
          return;
        }

        this.accounts = accounts;
        this.accountPage = 0;
        this.accountLoadErrorMessage = '';
        this.debug('loadAccounts:next', { loadSequence, accountsLength: accounts.length });

        if (accounts.length > 0) {
          this.selectedLogin = accounts[0].login;
          this.debug('loadAccounts:selectFirstAccount', { login: this.selectedLogin });
          this.resetFlow(false);
        } else {
          this.selectedLogin = '';
          this.debug('loadAccounts:emptyResult');
          this.showMessage('', 'neutral');
        }

        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        if (loadSequence !== this.accountsLoadSequence) {
          this.debug('loadAccounts:errorIgnoredBySequence', { loadSequence, activeSequence: this.accountsLoadSequence });
          return;
        }

        this.accounts = [];
        this.selectedLogin = '';
        this.accountLoadErrorMessage = this.resolveApiErrorMessage(error, 'dashboardChangePasswordAccountsLoadError');
        const normalized = this.authFacade.normalizeError(error);
        this.debug('loadAccounts:error', {
          loadSequence,
          status: normalized.status,
          code: normalized.code,
          message: normalized.message,
          resolvedMessage: this.accountLoadErrorMessage
        });
        this.showMessage('', 'neutral');
        this.cdr.detectChanges();
      }
    });
  }

  private showMessage(message: string, kind: 'success' | 'error' | 'neutral'): void {
    this.debug('showMessage:input', { kind, message });
    if (this.isAccountsLoadingStatusMessage(message)) {
      this.debug('showMessage:blockedLoadingMessage', { kind, message });
      this.setStepMessage(this.step, '', 'neutral');
      return;
    }

    this.setStepMessage(this.step, message, kind);
    this.debug('showMessage:applied', { stepMessageKind: this.currentStepMessageKind(), stepMessage: this.currentStepMessage() });
  }

  private handleApiError(error: unknown, fallbackKey: string): void {
    const message = this.resolveApiErrorMessage(error, fallbackKey);
    const normalized = this.authFacade.normalizeError(error);
    const kind: 'success' | 'error' | 'neutral' = normalized.status === 429 ? 'neutral' : 'error';
    this.debug('handleApiError', {
      fallbackKey,
      status: normalized.status,
      code: normalized.code,
      normalizedMessage: normalized.message,
      resolvedMessage: message,
      kind
    });
    this.showMessage(message, kind);
  }

  private isAccountsLoadingStatusMessage(message: string): boolean {
    const normalized = message.trim().toLowerCase();
    if (normalized.length === 0) {
      return false;
    }

    const blockedMessages = [
      this.t('dashboardChangePasswordLoadingAccountsStatus').trim().toLowerCase(),
      'loading your game accounts',
      'cargando tus cuentas de juego',
      'carregando suas contas de jogo',
      'chargement de vos comptes de jeu',
      'spielkonten werden geladen'
    ];

    return blockedMessages.some(candidate => candidate.length > 0 && normalized.includes(candidate));
  }

  private resolveApiErrorMessage(error: unknown, fallbackKey: string): string {
    const normalized = this.authFacade.normalizeError(error);
    const mappedKey = this.mapApiCodeToI18nKey(normalized.code);
    let message = mappedKey ? this.t(mappedKey) : normalized.message;

    if (normalized.retryAfterSeconds && normalized.retryAfterSeconds > 0) {
      message = `${message} (${normalized.retryAfterSeconds}s)`;
    }

    if (!message || message.trim().length === 0) {
      message = this.t(fallbackKey);
    }

    return message;
  }

  private mapApiCodeToI18nKey(code: string | null): string | null {
    if (!code) {
      return null;
    }

    const map: Record<string, string> = {
      'game.change_password.code_invalid': 'dashboardChangePasswordInvalidCode',
      'game.change_password.code_expired': 'dashboardChangePasswordInvalidCode',
      'game.change_password.code_cooldown_active': 'dashboardChangePasswordCodeCooldownActive',
      'game.change_password.code_attempts_exceeded': 'dashboardChangePasswordRateLimitExceeded',
      'game.change_password.verification_required': 'dashboardChangePasswordInvalidCode',
      'game.change_password.account_not_found': 'dashboardChangePasswordAccountNotFound',
      'game.master_email_not_verified': 'dashboardChangePasswordMasterEmailNotVerified',
      'rate_limit.exceeded': 'dashboardChangePasswordRateLimitExceeded'
    };

    return map[code] ?? null;
  }

  private buildPaginationItems(totalPages: number, currentPage: number): AccountPaginationItem[] {
    if (totalPages <= 0) {
      return [];
    }

    const maxPage = totalPages - 1;
    const current = Math.min(Math.max(currentPage, 0), maxPage);
    const selectedPages = new Set<number>();

    for (let page = 0; page < DashboardChangePasswordPage.ACCOUNTS_PAGINATION_EDGE; page += 1) {
      selectedPages.add(page);
      selectedPages.add(maxPage - page);
    }

    for (
      let page = current - DashboardChangePasswordPage.ACCOUNTS_PAGINATION_WINDOW;
      page <= current + DashboardChangePasswordPage.ACCOUNTS_PAGINATION_WINDOW;
      page += 1
    ) {
      if (page >= 0 && page <= maxPage) {
        selectedPages.add(page);
      }
    }

    const orderedPages = Array.from(selectedPages)
      .filter(page => page >= 0 && page <= maxPage)
      .sort((left, right) => left - right);

    const items: AccountPaginationItem[] = [];
    for (let index = 0; index < orderedPages.length; index += 1) {
      const page = orderedPages[index];
      const previous = index > 0 ? orderedPages[index - 1] : null;

      if (previous !== null && page - previous > 1) {
        items.push({ type: 'ellipsis', id: `${previous + 1}-${page - 1}` });
      }

      items.push({ type: 'page', page });
    }

    return items;
  }

  private moveSelectedAccount(delta: -1 | 1): void {
    const accounts = this.filteredAccounts;
    if (accounts.length === 0) {
      return;
    }

    const currentIndex = accounts.findIndex(account => account.login === this.selectedLogin);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = Math.min(Math.max(baseIndex + delta, 0), accounts.length - 1);
    const target = accounts[nextIndex];
    if (!target) {
      return;
    }

    const targetPage = Math.floor(nextIndex / DashboardChangePasswordPage.ACCOUNTS_PAGE_SIZE);
    if (targetPage !== this.accountPage) {
      this.accountPage = targetPage;
    }

    if (target.login !== this.selectedLogin) {
      this.selectAccount(target.login);
    }
  }

  closeAccountSwitchModal(): void {
    this.accountSwitchModalOpen = false;
    this.pendingSwitchLogin = null;
  }

  confirmAccountSwitch(): void {
    if (this.pendingSwitchLogin) {
      this.applyAccountSwitch(this.pendingSwitchLogin);
    }
    this.accountSwitchModalOpen = false;
    this.pendingSwitchLogin = null;
  }

  private shouldConfirmAccountSwitch(): boolean {
    if (this.step === 'send-email') {
      return false;
    }

    return this.verificationCode.trim().length > 0
      || this.verificationToken.trim().length > 0
      || this.newPassword.trim().length > 0
      || this.confirmPassword.trim().length > 0
      || this.hasRequestedCode;
  }

  private applyAccountSwitch(login: string): void {
    this.debug('applyAccountSwitch', { from: this.selectedLogin, to: login });
    this.selectedLogin = login;
    this.resetFlow(false);
  }

  private handleRouteChange(url: string): void {
    const isChangePasswordRoute = url.startsWith(DashboardChangePasswordPage.ROUTE_PREFIX);
    this.debug('handleRouteChange', { url, isChangePasswordRoute, routeActive: this.routeActive });
    if (!isChangePasswordRoute) {
      this.routeActive = false;
      this.accountsLoadSequence += 1;
      this.debug('handleRouteChange:leaveRoute', { accountsLoadSequence: this.accountsLoadSequence });
      return;
    }

    if (this.routeActive) {
      this.debug('handleRouteChange:alreadyActive');
      return;
    }

    this.routeActive = true;
    this.debug('handleRouteChange:enterRoute');
    this.prepareEntryState();
    this.loadAccounts();
  }

  private prepareEntryState(): void {
    this.debug('prepareEntryState:start');
    this.clearAllStepMessages();
    this.step = 'send-email';
    this.selectedLogin = '';
    this.verificationCode = '';
    this.verificationToken = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.hasRequestedCode = false;
    this.sendingEmail = false;
    this.verifyingCode = false;
    this.changingPassword = false;
    this.accountsQuery = '';
    this.accountPage = 0;
    this.accountLoadErrorMessage = '';
    this.accountSwitchModalOpen = false;
    this.pendingSwitchLogin = null;
    this.debug('prepareEntryState:done');
  }

  private currentStepMessageKind(): ChangePasswordMessageKind {
    return this.stepMessages[this.step].kind;
  }

  private setStepMessage(step: ChangePasswordStep, message: string, kind: ChangePasswordMessageKind): void {
    this.stepMessages[step] = { message, kind };
  }

  private clearAllStepMessages(): void {
    this.setStepMessage('send-email', '', 'neutral');
    this.setStepMessage('verify-code', '', 'neutral');
    this.setStepMessage('change-password', '', 'neutral');
    this.setStepMessage('done', '', 'neutral');
  }

  private debug(event: string, payload?: Record<string, unknown>): void {
    console.log('[change-password-debug]', event, {
      route: this.router.url,
      step: this.step,
      accountsLoading: this.accountsLoading,
      accountsInitialized: this.accountsInitialized,
      stepMessageKind: this.currentStepMessageKind(),
      stepMessage: this.currentStepMessage(),
      ...payload
    });
  }
}
