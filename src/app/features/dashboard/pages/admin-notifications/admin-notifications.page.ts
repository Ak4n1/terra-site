import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AdminNotificationsApi } from '../../../../core/admin-notifications/admin-notifications.api';
import type {
  AdminNotificationBroadcastRequest,
  AdminNotificationDispatchRequest,
  AdminNotificationTemplate
} from '../../../../core/admin-notifications/admin-notifications.models';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AlertComponent, type AlertVariant } from '../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import type { SelectControlOption } from '../../../../shared/ui/atoms/select-control/select-control.component';
import { InputFieldComponent } from '../../../../shared/ui/molecules/input-field/input-field.component';
import { SelectFieldComponent } from '../../../../shared/ui/molecules/select-field/select-field.component';
import { ModalComponent } from '../../../../shared/ui/organisms/modal/modal.component';
import { AuthFacadeService } from '../../../auth/services/auth-facade.service';

type BroadcastTargetType = 'ROLE' | 'SEGMENT';
type AdminNotificationsTab = 'send' | 'audit';
type SendMode = 'single' | 'broadcast';

type AuditEntry = {
  id: string;
  actor: string;
  template: string;
  scope: string;
  delivered: number;
  createdAt: string;
  statusKey: string;
};

type PreviewField = {
  label: string;
  key: string;
  value: string;
};

@Component({
  selector: 'app-dashboard-admin-notifications-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, InputFieldComponent, SelectFieldComponent, ModalComponent],
  templateUrl: './admin-notifications.page.html',
  styleUrl: './admin-notifications.page.css'
})
export class DashboardAdminNotificationsPage {
  private readonly languageService = inject(LanguageService);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly adminNotificationsApi = inject(AdminNotificationsApi);

  readonly templates = signal<AdminNotificationTemplate[]>([]);
  readonly templatesLoading = signal(true);
  readonly dispatchLoading = signal(false);
  readonly broadcastLoading = signal(false);
  readonly activeTab = signal<AdminNotificationsTab>('send');
  readonly sendMode = signal<SendMode>('single');
  readonly feedbackKey = signal<string | null>(null);
  readonly feedbackParams = signal<Record<string, string | number> | undefined>(undefined);
  readonly feedbackVariant = signal<AlertVariant>('warning');
  readonly confirmModalOpen = signal(false);
  readonly currentUser = toSignal(this.authFacade.currentUser$, { initialValue: null });

  readonly isAdmin = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
  });

  readonly isSuperAdmin = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('SUPER_ADMIN');
  });

  readonly canSendNotifications = computed(() => this.isAdmin());
  readonly canViewAudit = computed(() => this.isAdmin());
  readonly currentLanguage = this.languageService.language;
  readonly singleTemplate = signal('');
  readonly broadcastTemplate = signal('');

  readonly selectedSingleTemplate = computed(
    () => this.templates().find(template => template.code === this.singleTemplate()) ?? null
  );
  readonly selectedBroadcastTemplate = computed(
    () => this.templates().find(template => template.code === this.broadcastTemplate()) ?? null
  );

  readonly sendModeOptions = computed<SelectControlOption[]>(() => [
    { value: 'single', label: this.t('dashboardAdminNotificationsSingleMode') },
    { value: 'broadcast', label: this.t('dashboardAdminNotificationsBroadcastMode') }
  ]);

  readonly roleOptions = computed<SelectControlOption[]>(() => [
    { value: 'USER', label: this.t('dashboardAdminNotificationsRoleUser') },
    { value: 'MODERATOR', label: this.t('dashboardAdminNotificationsRoleModerator') },
    { value: 'ADMIN', label: this.t('dashboardAdminNotificationsRoleAdmin') },
    { value: 'SUPER_ADMIN', label: this.t('dashboardAdminNotificationsRoleSuperAdmin') }
  ]);

  readonly templateOptions = computed<SelectControlOption[]>(() =>
    this.templatesForCurrentMode().map(template => ({
      value: template.code,
      label: this.templateLabel(template.code)
    }))
  );

  readonly targetTypeOptions = computed<SelectControlOption[]>(() => [
    { value: 'ROLE', label: this.t('dashboardAdminNotificationsRoleTarget') },
    { value: 'SEGMENT', label: this.t('dashboardAdminNotificationsSegmentTarget') }
  ]);

  readonly broadcastTargetOptions = computed<SelectControlOption[]>(() =>
    this.broadcastTargetType === 'ROLE' ? this.roleOptions() : this.segmentOptions()
  );

  readonly segmentOptions = computed<SelectControlOption[]>(() => [
    { value: 'all_active', label: this.t('dashboardAdminNotificationsSegmentAllActive') },
    { value: 'email_verified', label: this.t('dashboardAdminNotificationsSegmentEmailVerified') },
    { value: 'email_unverified', label: this.t('dashboardAdminNotificationsSegmentEmailUnverified') }
  ]);

  readonly auditEntries = signal<AuditEntry[]>([
    {
      id: 'AUD-1042',
      actor: 'encabojuan@gmail.com',
      template: 'system.maintenance_scheduled',
      scope: 'ROLE:USER',
      delivered: 184,
      createdAt: '2026-03-12 18:45',
      statusKey: 'dashboardAdminNotificationsAuditStatusDelivered'
    },
    {
      id: 'AUD-1041',
      actor: 'encabojuan@gmail.com',
      template: 'system.test_notification',
      scope: 'INDIVIDUAL:lineageiiaklas@gmail.com',
      delivered: 1,
      createdAt: '2026-03-12 18:11',
      statusKey: 'dashboardAdminNotificationsAuditStatusDelivered'
    },
    {
      id: 'AUD-1038',
      actor: 'superadmin@terra.local',
      template: 'system.security_review_required',
      scope: 'SEGMENT:email_verified',
      delivered: 92,
      createdAt: '2026-03-11 22:20',
      statusKey: 'dashboardAdminNotificationsAuditStatusDelivered'
    }
  ]);

  singleEmail = '';
  singleParams: Record<string, string> = {};

  broadcastTargetType: BroadcastTargetType = 'ROLE';
  broadcastTargetValue = 'USER';
  broadcastParams: Record<string, string> = {};

  constructor() {
    effect(() => {
      if (!this.isAdmin()) {
        this.templatesLoading.set(false);
        this.activeTab.set('send');
        return;
      }

      if (this.templates().length === 0 && !this.templatesLoading()) {
        void this.loadTemplates();
      }
    });

    if (this.isAdmin()) {
      void this.loadTemplates();
    } else {
      this.templatesLoading.set(false);
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.languageService.t(key, params);
  }

  readonly templatesForCurrentMode = computed(() =>
    this.templates().filter(template => {
      if (this.sendMode() === 'single') {
        return template.allowedTarget === 'INDIVIDUAL' || template.allowedTarget === 'BOTH';
      }
      return template.allowedTarget === 'BROADCAST' || template.allowedTarget === 'BOTH';
    })
  );

  async loadTemplates(): Promise<void> {
    if (!this.isAdmin()) {
      this.templatesLoading.set(false);
      return;
    }

    this.templatesLoading.set(true);
    try {
      const templates = await firstValueFrom(this.adminNotificationsApi.listTemplates());
      this.templates.set(templates);
      this.singleTemplate.set(this.findFirstTemplateForMode('single'));
      this.broadcastTemplate.set(this.findFirstTemplateForMode('broadcast'));
      this.resetSingleParams();
      this.resetBroadcastParams();
    } finally {
      this.templatesLoading.set(false);
    }
  }

  selectTab(tab: AdminNotificationsTab): void {
    if (tab === 'audit' && !this.canViewAudit()) {
      return;
    }
    if (tab === 'send' && !this.canSendNotifications()) {
      return;
    }

    this.activeTab.set(tab);
    this.feedbackKey.set(null);
    this.feedbackParams.set(undefined);
    this.feedbackVariant.set('warning');
  }

  selectSendMode(mode: string): void {
    this.sendMode.set(mode === 'broadcast' ? 'broadcast' : 'single');
    if (this.sendMode() === 'single') {
      if (!this.isTemplateAllowedForMode(this.singleTemplate(), 'single')) {
        this.singleTemplate.set(this.findFirstTemplateForMode('single'));
      }
      this.resetSingleParams();
    } else {
      if (!this.isTemplateAllowedForMode(this.broadcastTemplate(), 'broadcast')) {
        this.broadcastTemplate.set(this.findFirstTemplateForMode('broadcast'));
      }
      this.resetBroadcastParams();
    }
    this.feedbackKey.set(null);
    this.feedbackParams.set(undefined);
    this.feedbackVariant.set('warning');
  }

  onSingleTemplateChange(templateCode: string): void {
    this.singleTemplate.set(templateCode);
    this.resetSingleParams();
  }

  onBroadcastTemplateChange(templateCode: string): void {
    this.broadcastTemplate.set(templateCode);
    this.resetBroadcastParams();
  }

  onBroadcastTargetTypeChange(targetType: string): void {
    this.broadcastTargetType = targetType === 'SEGMENT' ? 'SEGMENT' : 'ROLE';
    this.broadcastTargetValue = this.broadcastTargetType === 'ROLE' ? 'USER' : 'all_active';
  }

  openSingleConfirmation(): void {
    if (!this.validateSingleForm()) {
      return;
    }

    this.confirmModalOpen.set(true);
  }

  openBroadcastConfirmation(): void {
    if (!this.validateBroadcastForm()) {
      return;
    }

    this.confirmModalOpen.set(true);
  }

  private resetSingleParams(): void {
    this.singleParams = this.buildEmptyParams(this.selectedSingleTemplate()?.paramKeys ?? []);
  }

  private resetBroadcastParams(): void {
    this.broadcastParams = this.buildEmptyParams(this.selectedBroadcastTemplate()?.paramKeys ?? []);
  }

  private buildEmptyParams(keys: string[]): Record<string, string> {
    return keys.reduce<Record<string, string>>((accumulator, key) => {
      accumulator[key] = '';
      return accumulator;
    }, {});
  }

  previewTitle(): string {
    const template = this.activeTemplate();
    if (!template) {
      return '-';
    }

    return this.t(template.titleKey, this.previewParamsRecord());
  }

  previewBody(): string {
    const template = this.activeTemplate();
    if (!template) {
      return '-';
    }

    return this.t(template.bodyKey, this.previewParamsRecord());
  }

  previewFields(): PreviewField[] {
    const template = this.activeTemplate();
    if (!template) {
      return [];
    }

    const params = this.previewParamsRecord();
    return template.paramKeys.map(key => ({
      label: this.paramLabel(key),
      key,
      value: String(params[key] ?? `{${key}}`)
    }));
  }

  previewAllowedTargetLabel(): string {
    const template = this.activeTemplate();
    return template ? this.allowedTargetLabel(template.allowedTarget) : '-';
  }

  confirmationTitle(): string {
    return this.sendMode() === 'single'
      ? this.t('dashboardAdminNotificationsConfirmSingleTitle')
      : this.t('dashboardAdminNotificationsConfirmBroadcastTitle');
  }

  confirmationCopy(): string {
    return this.sendMode() === 'single'
      ? this.t('dashboardAdminNotificationsConfirmSingleCopy')
      : this.t('dashboardAdminNotificationsConfirmBroadcastCopy');
  }

  confirmationTargetLabel(): string {
    if (this.sendMode() === 'single') {
      return this.singleEmail.trim() || '-';
    }

    if (this.broadcastTargetType === 'ROLE') {
      return this.roleOptions().find(option => option.value === this.broadcastTargetValue)?.label ?? this.broadcastTargetValue;
    }

    return this.segmentOptions().find(option => option.value === this.broadcastTargetValue)?.label ?? this.broadcastTargetValue;
  }

  closeConfirmation(): void {
    this.confirmModalOpen.set(false);
  }

  async confirmSend(): Promise<void> {
    if (this.sendMode() === 'single') {
      await this.sendSingle();
      return;
    }

    await this.sendBroadcast();
  }

  paramLabel(key: string): string {
    return this.t(`dashboardAdminNotificationsParam.${key}`);
  }

  templateLabel(code: string): string {
    return this.t(`dashboardAdminNotificationsTemplateName.${code}`);
  }

  activeTemplate(): AdminNotificationTemplate | null {
    return this.sendMode() === 'single' ? this.selectedSingleTemplate() : this.selectedBroadcastTemplate();
  }

  private previewParamsRecord(): Record<string, string | number> {
    return this.sendMode() === 'single' ? this.singleParams : this.broadcastParams;
  }

  private isTemplateAllowedForMode(templateCode: string, mode: SendMode): boolean {
    const template = this.templates().find(item => item.code === templateCode);
    if (!template) {
      return false;
    }

    if (mode === 'single') {
      return template.allowedTarget === 'INDIVIDUAL' || template.allowedTarget === 'BOTH';
    }

    return template.allowedTarget === 'BROADCAST' || template.allowedTarget === 'BOTH';
  }

  private findFirstTemplateForMode(mode: SendMode): string {
    const template = this.templates().find(item => {
      if (mode === 'single') {
        return item.allowedTarget === 'INDIVIDUAL' || item.allowedTarget === 'BOTH';
      }
      return item.allowedTarget === 'BROADCAST' || item.allowedTarget === 'BOTH';
    });

    return template?.code ?? '';
  }

  private allowedTargetLabel(target: AdminNotificationTemplate['allowedTarget']): string {
    return this.t(`dashboardAdminNotificationsAllowedTarget.${target}`);
  }

  private validateSingleForm(): boolean {
    if (!this.singleEmail.trim()) {
      this.setValidationError('dashboardAdminNotificationsValidationEmailRequired');
      return false;
    }

    if (!this.singleTemplate()) {
      this.setValidationError('dashboardAdminNotificationsValidationTemplateRequired');
      return false;
    }

    return this.validateRequiredParams(this.selectedSingleTemplate()?.paramKeys ?? [], this.singleParams);
  }

  private validateBroadcastForm(): boolean {
    if (!this.broadcastTemplate()) {
      this.setValidationError('dashboardAdminNotificationsValidationTemplateRequired');
      return false;
    }

    if (!this.broadcastTargetValue) {
      this.setValidationError('dashboardAdminNotificationsValidationTargetRequired');
      return false;
    }

    return this.validateRequiredParams(this.selectedBroadcastTemplate()?.paramKeys ?? [], this.broadcastParams);
  }

  private validateRequiredParams(keys: string[], params: Record<string, string>): boolean {
    for (const key of keys) {
      if (!params[key]?.trim()) {
        this.setValidationError('dashboardAdminNotificationsValidationParamRequired', {
          field: this.paramLabel(key)
        });
        return false;
      }
    }

    return true;
  }

  private setValidationError(key: string, params?: Record<string, string | number>): void {
    this.feedbackKey.set(key);
    this.feedbackParams.set(params);
    this.feedbackVariant.set('error');
  }

  private async sendSingle(): Promise<void> {
    const request: AdminNotificationDispatchRequest = {
      email: this.singleEmail.trim(),
      template: this.singleTemplate(),
      params: { ...this.singleParams }
    };

    this.dispatchLoading.set(true);
    this.feedbackKey.set(null);
    this.feedbackVariant.set('warning');
    try {
      await firstValueFrom(this.adminNotificationsApi.dispatch(request));
      this.feedbackKey.set('dashboardAdminNotificationsSendSuccess');
      this.feedbackVariant.set('success');
      this.singleEmail = '';
      this.resetSingleParams();
      this.confirmModalOpen.set(false);
    } catch (error) {
      this.applyError(error);
    } finally {
      this.dispatchLoading.set(false);
    }
  }

  private async sendBroadcast(): Promise<void> {
    const request: AdminNotificationBroadcastRequest = {
      template: this.broadcastTemplate(),
      params: { ...this.broadcastParams },
      targetType: this.broadcastTargetType,
      targetValue: this.broadcastTargetValue
    };

    this.broadcastLoading.set(true);
    this.feedbackKey.set(null);
    this.feedbackVariant.set('warning');
    try {
      const result = await firstValueFrom(this.adminNotificationsApi.broadcast(request));
      this.feedbackKey.set('dashboardAdminNotificationsBroadcastSuccess');
      this.feedbackParams.set({ count: result.deliveredCount });
      this.feedbackVariant.set('success');
      this.resetBroadcastParams();
      this.confirmModalOpen.set(false);
    } catch (error) {
      this.applyError(error);
    } finally {
      this.broadcastLoading.set(false);
    }
  }

  private applyError(error: unknown): void {
    const normalized = this.authFacade.normalizeError(error);
    this.feedbackKey.set(normalized.code ?? 'dashboardAdminNotificationsGenericError');
    this.feedbackParams.set(undefined);
    this.feedbackVariant.set('error');
  }
}
