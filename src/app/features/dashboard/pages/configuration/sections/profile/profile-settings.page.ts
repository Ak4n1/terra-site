import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import imageCompression from 'browser-image-compression';
import { ImageCropperComponent, type ImageCroppedEvent } from 'ngx-image-cropper';
import { finalize } from 'rxjs';
import { LanguageService } from '../../../../../../core/i18n/language.service';
import { formatDateTimeByLanguage } from '../../../../../../core/utils/date-locale.util';
import { AlertComponent, type AlertVariant } from '../../../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../../../shared/ui/atoms/button/button.component';
import { InputFieldComponent } from '../../../../../../shared/ui/molecules/input-field/input-field.component';
import { ModalComponent } from '../../../../../../shared/ui/organisms/modal/modal.component';
import { type AvatarSettings, AuthService, type ProfileSummarySettings } from '../../../../../auth/services/auth.service';
import { AuthFacadeService } from '../../../../../auth/services/auth-facade.service';
import { type AvatarPresetFamily, SessionAvatarService } from '../../../../../auth/services/session-avatar.service';
import { buildAvatarCategories, buildAvatarGroups } from './utils/profile-avatar-catalog.util';
import type { AvatarCategory, AvatarDraft } from './models/profile-settings.models';
import { normalizeLegacyPresetPath, readNonEmptyString, validateAvatarFile } from './utils/profile-settings.util';

type AvatarSection = {
  title: string;
  avatars: readonly string[];
};

@Component({
  selector: 'app-profile-settings-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, InputFieldComponent, ImageCropperComponent, ModalComponent],
  templateUrl: './profile-settings.page.html',
  styleUrl: './profile-settings.page.css'
})
export class ProfileSettingsPage implements OnInit, OnDestroy {
  private static readonly ALERT_AUTO_HIDE_MS = 3000;
  private readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly sessionAvatarService = inject(SessionAvatarService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  saving = false;
  avatarSaving = false;
  email = '';
  username = '';
  usernameTouched = false;
  readonly avatarFamilies = this.sessionAvatarService.listPresetFamilies();
  readonly presetAvatars = this.sessionAvatarService.listPresetAvatars();
  private readonly expandedFamilyKeys = new Set<string>();
  private readonly selectedCategoryByFamily = new Map<string, string>();
  dragOver = false;
  avatarPreview: string | null = null;
  avatarMode: 'preset' | 'custom' | 'default' = 'default';
  avatarPersistedValue: string | null = null;
  avatarDraft: AvatarDraft = { kind: 'default', value: null };
  avatarDraftBlob: Blob | null = null;
  avatarDirty = false;
  cropperFile: File | null = null;
  cropperReady = false;
  cropperModalOpen = false;
  profileConfirmModalOpen = false;
  insightsLoading = false;
  linkedAccountsCount: number | null = null;
  masterLastLoginAt: string | null = null;
  masterCreatedAt: string | null = null;
  profileMessage = '';
  profileMessageKind: 'success' | 'error' | 'warning' = 'warning';
  avatarMessage = '';
  avatarMessageKind: 'success' | 'error' | 'warning' = 'warning';
  private profileAlertTimerId: ReturnType<typeof setTimeout> | null = null;
  private avatarAlertTimerId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const firstFamilyKey = this.avatarFamilies[0]?.key;
    if (firstFamilyKey) {
      this.expandedFamilyKeys.add(firstFamilyKey);
    }
    this.seedEmailFromSession();
    this.syncAvatarStateFromSessionService();
    queueMicrotask(() => this.loadProfile());
  }

  ngOnDestroy(): void {
    this.revokeBlobPreview();
    this.clearProfileAlertTimer();
    this.clearAvatarAlertTimer();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  loadProfile(): void {
    this.runInUi(() => {
      this.loading = true;
      this.profileMessage = '';
    });
    this.seedEmailFromSession();

    this.authService.getProfile().pipe(
      finalize(() => {
        this.runInUi(() => {
          this.loading = false;
        });
      })
    ).subscribe({
      next: (user) => {
        this.runInUi(() => {
          const profileEmail = (user.email ?? '').trim();
          this.email = profileEmail || this.getEffectiveEmail();
          this.username = user.username ?? '';
          this.usernameTouched = false;
          this.masterCreatedAt = user.createdAt ?? null;
          this.syncAvatarStateFromSessionService();
          this.loadAvatarSettings();
          this.loadProfileSummary();
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          this.masterLastLoginAt = null;
          this.masterCreatedAt = null;
          this.linkedAccountsCount = null;
          this.syncAvatarStateFromSessionService();
          const normalized = this.authFacade.normalizeError(error);
          this.showProfileMessage('error', normalized.message || this.t('dashboardConfigurationProfileLoadError'));
        });
      }
    });
  }

  private loadAvatarSettings(): void {
    const email = this.getEffectiveEmail();
    if (!email) {
      return;
    }
    this.email = email;

    this.authService.getAvatarSettings().subscribe({
      next: settings => {
        this.applyAvatarSettings(settings);
      },
      error: () => {
        this.syncAvatarStateFromSessionService();
      }
    });
  }

  onUsernameChange(value: string): void {
    this.username = value;
    this.usernameTouched = true;
  }

  choosePreset(avatarPath: string): void {
    if (!this.getEffectiveEmail() || this.avatarSaving) {
      return;
    }

    this.revokeBlobPreview();
    this.avatarDraft = { kind: 'preset', value: avatarPath };
    this.avatarDraftBlob = null;
    this.avatarPreview = avatarPath;
    this.updateAvatarDirtyState();
  }

  restoreDefaultAvatar(): void {
    if (!this.getEffectiveEmail() || this.avatarSaving) {
      return;
    }

    this.avatarDraft = { kind: 'default', value: null };
    this.avatarDraftBlob = null;
    this.avatarPreview = null;
    this.updateAvatarDirtyState();
  }

  onCustomAvatarSelected(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0] ?? null;
    if (!file) {
      return;
    }
    this.prepareCustomAvatar(file);
    target!.value = '';
  }

  selectAvatarCategory(familyKey: string, categoryKey: string): void {
    this.selectedCategoryByFamily.set(familyKey, categoryKey);
  }

  toggleAvatarFamily(familyKey: string): void {
    if (this.expandedFamilyKeys.has(familyKey)) {
      return;
    }
    this.expandedFamilyKeys.clear();
    this.expandedFamilyKeys.add(familyKey);
  }

  isAvatarFamilyExpanded(familyKey: string): boolean {
    return this.expandedFamilyKeys.has(familyKey);
  }

  avatarCategoriesForFamily(family: AvatarPresetFamily): AvatarCategory[] {
    const groups = buildAvatarGroups(family.avatars);
    return buildAvatarCategories(groups, family.avatars.length);
  }

  isAvatarCategoryActive(familyKey: string, categoryKey: string): boolean {
    const selectedCategory = this.selectedCategoryByFamily.get(familyKey) ?? 'all';
    return selectedCategory === categoryKey;
  }

  displayedPresetAvatarsForFamily(family: AvatarPresetFamily): readonly string[] {
    const selectedCategory = this.selectedCategoryByFamily.get(family.key) ?? 'all';
    if (selectedCategory === 'all') {
      return family.avatars;
    }

    const groups = buildAvatarGroups(family.avatars);
    const category = groups.find(group => group.key === selectedCategory);
    return category?.avatars ?? family.avatars;
  }

  activeAvatarFamily(): AvatarPresetFamily | null {
    if (this.avatarFamilies.length === 0) {
      return null;
    }
    const activeKey = this.expandedFamilyKeys.values().next().value as string | undefined;
    if (!activeKey) {
      return this.avatarFamilies[0] ?? null;
    }
    return this.avatarFamilies.find(family => family.key === activeKey) ?? this.avatarFamilies[0] ?? null;
  }

  isLineageFamily(family: AvatarPresetFamily): boolean {
    return family.key === 'lineage';
  }

  avatarSectionsForFamily(family: AvatarPresetFamily): readonly AvatarSection[] {
    if (!this.isLineageFamily(family)) {
      return [{ title: family.label, avatars: family.avatars }];
    }

    return buildAvatarGroups(family.avatars).map(group => ({
      title: this.lineageSectionTitle(group.key, group.label),
      avatars: group.avatars
    }));
  }

  onAvatarDropZoneDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onAvatarDropZoneDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  onAvatarDropZoneDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (!file) {
      return;
    }
    this.prepareCustomAvatar(file);
  }

  openAvatarPicker(input: HTMLInputElement): void {
    if (this.avatarSaving) {
      return;
    }
    input.click();
  }

  onImageCropped(event: ImageCroppedEvent): void {
    if (!event.blob || !event.objectUrl) {
      return;
    }

    this.revokeBlobPreview();
    this.avatarDraftBlob = event.blob;
    this.avatarDraft = { kind: 'custom', value: event.objectUrl };
    this.avatarPreview = event.objectUrl;
    this.updateAvatarDirtyState();
  }

  onCropperReady(): void {
    this.cropperReady = true;
  }

  applyCroppedAvatar(): void {
    this.cropperModalOpen = false;
    this.cropperFile = null;
    this.cropperReady = false;
  }

  cancelCroppedAvatar(): void {
    this.cropperModalOpen = false;
    this.cropperFile = null;
    this.cropperReady = false;
    this.avatarDraftBlob = null;
    this.avatarDraft = { kind: this.avatarMode, value: this.avatarPersistedValue };
    this.avatarPreview = this.avatarPersistedValue;
    this.updateAvatarDirtyState();
  }

  onCropperModalClosed(): void {
    this.cancelCroppedAvatar();
  }

  isPresetActive(path: string): boolean {
    return this.avatarDraft.kind === 'preset' && this.avatarDraft.value === path;
  }

  isUsingDefaultAvatar(): boolean {
    return this.avatarDraft.kind === 'default';
  }

  saveAvatarChanges(): void {
    const email = this.getEffectiveEmail();
    if (!email || !this.avatarDirty || this.avatarSaving) {
      return;
    }
    this.email = email;

    this.avatarSaving = true;
    this.showAvatarMessage('warning', '');

    if (this.avatarDraft.kind === 'preset' && this.avatarDraft.value) {
      this.authService.updateAvatarPreset(this.avatarDraft.value).pipe(
        finalize(() => {
          this.runInUi(() => {
            this.avatarSaving = false;
          });
        })
      ).subscribe({
        next: settings => {
          this.runInUi(() => {
            this.applyAvatarSettings(settings);
            this.showAvatarMessage('success', this.t('dashboardConfigurationProfileAvatarPresetSaved'));
            this.authFacade.bootstrapSession().subscribe();
          });
        },
        error: error => {
          this.runInUi(() => {
            const normalized = this.authFacade.normalizeError(error);
            this.showAvatarMessage('error', normalized.message || this.t('dashboardConfigurationProfileSaveError'));
          });
        }
      });
      return;
    }

    if (this.avatarDraft.kind === 'custom' && this.avatarDraftBlob) {
      void this.uploadCustomAvatarFromDraft();
      return;
    }

    this.authService.setAvatarDefault().pipe(
      finalize(() => {
        this.runInUi(() => {
          this.avatarSaving = false;
        });
      })
    ).subscribe({
      next: settings => {
        this.runInUi(() => {
          this.applyAvatarSettings(settings);
          this.showAvatarMessage('success', this.t('dashboardConfigurationProfileAvatarDefaultSaved'));
          this.authFacade.bootstrapSession().subscribe();
        });
      },
      error: error => {
        this.runInUi(() => {
          const normalized = this.authFacade.normalizeError(error);
          this.showAvatarMessage('error', normalized.message || this.t('dashboardConfigurationProfileSaveError'));
        });
      }
    });
  }

  saveProfile(): void {
    if (this.saving || this.loading || !this.usernameTouched) {
      return;
    }
    this.profileConfirmModalOpen = true;
  }

  cancelProfileSaveConfirmation(): void {
    this.profileConfirmModalOpen = false;
  }

  confirmProfileSave(): void {
    if (this.saving || this.loading || !this.usernameTouched) {
      this.profileConfirmModalOpen = false;
      return;
    }
    this.profileConfirmModalOpen = false;
    this.executeProfileSave();
  }

  onProfileConfirmModalClosed(): void {
    this.profileConfirmModalOpen = false;
  }

  private executeProfileSave(): void {
    if (this.saving || this.loading || !this.usernameTouched) {
      return;
    }

    this.runInUi(() => {
      this.saving = true;
      this.showProfileMessage('warning', '');
    });

    const payloadUsername = this.username.trim().length === 0 ? null : this.username.trim();
    const idempotencyKey = this.generateProfileUpdateIdempotencyKey();
    this.authService.updateProfile({ username: payloadUsername }, idempotencyKey).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.saving = false;
        });
      })
    ).subscribe({
      next: (user) => {
        this.runInUi(() => {
          this.email = user.email ?? this.email;
          this.username = user.username ?? '';
          this.usernameTouched = false;
          this.showProfileMessage('success', this.t('dashboardConfigurationProfileSaveSuccess'));
          this.authFacade.bootstrapSession().subscribe();
        });
      },
      error: (error: unknown) => {
        this.runInUi(() => {
          const normalized = this.authFacade.normalizeError(error);
          this.showProfileMessage('error', normalized.message || this.t('dashboardConfigurationProfileSaveError'));
        });
      }
    });
  }

  alertVariant(kind: 'success' | 'error' | 'warning'): AlertVariant {
    if (kind === 'success') return 'success';
    if (kind === 'error') return 'error';
    return 'warning';
  }

  linkedAccountsSummary(): string {
    if (this.insightsLoading) {
      return this.t('dashboardConfigurationProfileSummaryLoading');
    }
    if (this.linkedAccountsCount === null) {
      return this.t('dashboardConfigurationProfileSummaryUnavailable');
    }
    return String(this.linkedAccountsCount);
  }

  formatSummaryDate(value: string | null): string {
    if (!value) {
      return this.t('dashboardConfigurationProfileSummaryUnavailable');
    }
    return formatDateTimeByLanguage(value, this.languageService.language());
  }

  private prepareCustomAvatar(file: File): void {
    if (!this.getEffectiveEmail() || this.avatarSaving) {
      return;
    }

    const validation = validateAvatarFile(file);
    if (validation === 'invalid_type') {
      this.showAvatarMessage('error', this.t('dashboardConfigurationProfileAvatarInvalidType'));
      return;
    }

    if (validation === 'too_large') {
      this.showAvatarMessage('error', this.t('dashboardConfigurationProfileAvatarTooLarge'));
      return;
    }

    this.cropperFile = file;
    this.cropperReady = false;
    this.cropperModalOpen = true;
  }

  private loadProfileSummary(): void {
    this.runInUi(() => {
      this.insightsLoading = true;
    });

    this.authService.getProfileSummary(['totalAccounts', 'lastLogin', 'createdAt']).pipe(
      finalize(() => {
        this.runInUi(() => {
          this.insightsLoading = false;
        });
      })
    ).subscribe({
      next: summary => {
        this.runInUi(() => {
          this.applyProfileSummary(summary);
        });
      },
      error: () => {
        this.runInUi(() => {
          this.linkedAccountsCount = null;
          this.masterLastLoginAt = null;
        });
      }
    });
  }

  private applyAvatarSettings(settings: AvatarSettings): void {
    const email = this.getEffectiveEmail();
    if (!email) {
      return;
    }
    this.email = email;

    if (settings.avatarType === 'PRESET' && settings.presetPath) {
      const normalizedPresetPath = this.normalizePresetPath(settings.presetPath);
      this.sessionAvatarService.setPreset(email, normalizedPresetPath);
      this.avatarMode = 'preset';
      this.avatarPersistedValue = this.sessionAvatarService.getSelection(email)?.value ?? normalizedPresetPath;
      this.avatarPreview = this.sessionAvatarService.resolve(email);
    } else if (settings.avatarType === 'CUSTOM' && settings.customUrl) {
      this.sessionAvatarService.setCustom(email, settings.customUrl);
      this.avatarMode = 'custom';
      this.avatarPersistedValue = this.sessionAvatarService.getSelection(email)?.value ?? settings.customUrl;
      this.avatarPreview = this.sessionAvatarService.resolve(email);
    } else {
      this.sessionAvatarService.clearSelection(email);
      this.avatarMode = 'default';
      this.avatarPersistedValue = null;
      this.avatarPreview = this.sessionAvatarService.resolve(email);
    }

    this.avatarDraft = { kind: this.avatarMode, value: this.avatarPersistedValue };
    this.avatarDraftBlob = null;
    this.avatarDirty = false;
    this.cropperModalOpen = false;
    this.cropperFile = null;
    this.cropperReady = false;
    this.revokeBlobPreview();
  }

  private syncAvatarStateFromSessionService(): void {
    const email = this.getEffectiveEmail();
    if (!email) {
      this.avatarPreview = null;
      this.avatarMode = 'default';
      this.avatarPersistedValue = null;
      this.avatarDraft = { kind: 'default', value: null };
      this.avatarDirty = false;
      return;
    }
    this.email = email;

    const selection = this.sessionAvatarService.getSelection(email);
    const resolvedAvatar = this.sessionAvatarService.resolve(email);
    this.avatarPreview = resolvedAvatar;
    this.avatarMode = selection?.kind ?? 'default';
    this.avatarPersistedValue = selection?.value ?? null;
    this.avatarDraft = {
      kind: selection?.kind ?? 'default',
      value: selection?.value ?? null
    };
    this.avatarDirty = false;
  }

  private updateAvatarDirtyState(): void {
    this.avatarDirty = this.avatarDraft.kind !== this.avatarMode || this.avatarDraft.value !== this.avatarPersistedValue;
  }

  private async uploadCustomAvatarFromDraft(): Promise<void> {
    if (!this.avatarDraftBlob) {
      this.runInUi(() => {
        this.avatarSaving = false;
      });
      return;
    }

    try {
      const uploadBaseFile = new File([this.avatarDraftBlob], 'avatar-custom.png', {
        type: this.avatarDraftBlob.type || 'image/png'
      });

      const compressedFile = await imageCompression(uploadBaseFile, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.92
      });

      this.authService.uploadCustomAvatar(compressedFile).pipe(
        finalize(() => {
          this.runInUi(() => {
            this.avatarSaving = false;
          });
        })
      ).subscribe({
        next: settings => {
          this.runInUi(() => {
            this.applyAvatarSettings(settings);
            this.showAvatarMessage('success', this.t('dashboardConfigurationProfileAvatarCustomSaved'));
            this.authFacade.bootstrapSession().subscribe();
          });
        },
        error: error => {
          this.runInUi(() => {
            const normalized = this.authFacade.normalizeError(error);
            this.showAvatarMessage('error', normalized.message || this.t('dashboardConfigurationProfileSaveError'));
          });
        }
      });
    } catch {
      this.runInUi(() => {
        this.avatarSaving = false;
        this.showAvatarMessage('error', this.t('dashboardConfigurationProfileAvatarReadError'));
      });
    }
  }

  private revokeBlobPreview(): void {
    if (this.avatarDraft.kind === 'custom' && this.avatarDraft.value?.startsWith('blob:')) {
      URL.revokeObjectURL(this.avatarDraft.value);
    }
  }

  private seedEmailFromSession(): void {
    if (this.email.trim().length > 0) {
      return;
    }
    const sessionEmail = this.authFacade.sessionSnapshot?.user?.email?.trim() ?? '';
    if (sessionEmail) {
      this.email = sessionEmail;
    }
  }

  private getEffectiveEmail(): string {
    const profileEmail = this.email.trim();
    if (profileEmail) {
      return profileEmail;
    }
    return this.authFacade.sessionSnapshot?.user?.email?.trim() ?? '';
  }

  private normalizePresetPath(path: string): string {
    return normalizeLegacyPresetPath(path);
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

  private applyProfileSummary(summary: ProfileSummarySettings): void {
    this.linkedAccountsCount = typeof summary.totalAccounts === 'number' ? summary.totalAccounts : null;
    this.masterLastLoginAt = readNonEmptyString(summary.lastLoginAt);
    const createdFromSummary = readNonEmptyString(summary.createdAt);
    if (createdFromSummary) {
      this.masterCreatedAt = createdFromSummary;
    }
  }

  private showProfileMessage(kind: 'success' | 'error' | 'warning', message: string): void {
    this.profileMessageKind = kind;
    this.profileMessage = message;
    this.scheduleProfileAlertAutoHide();
  }

  private showAvatarMessage(kind: 'success' | 'error' | 'warning', message: string): void {
    this.avatarMessageKind = kind;
    this.avatarMessage = message;
    this.scheduleAvatarAlertAutoHide();
  }

  private scheduleProfileAlertAutoHide(): void {
    this.clearProfileAlertTimer();
    if (!this.profileMessage.trim()) {
      return;
    }
    this.profileAlertTimerId = setTimeout(() => {
      this.runInUi(() => {
        this.profileMessage = '';
      });
      this.profileAlertTimerId = null;
    }, ProfileSettingsPage.ALERT_AUTO_HIDE_MS);
  }

  private scheduleAvatarAlertAutoHide(): void {
    this.clearAvatarAlertTimer();
    if (!this.avatarMessage.trim()) {
      return;
    }
    this.avatarAlertTimerId = setTimeout(() => {
      this.runInUi(() => {
        this.avatarMessage = '';
      });
      this.avatarAlertTimerId = null;
    }, ProfileSettingsPage.ALERT_AUTO_HIDE_MS);
  }

  private clearProfileAlertTimer(): void {
    if (this.profileAlertTimerId) {
      clearTimeout(this.profileAlertTimerId);
      this.profileAlertTimerId = null;
    }
  }

  private clearAvatarAlertTimer(): void {
    if (this.avatarAlertTimerId) {
      clearTimeout(this.avatarAlertTimerId);
      this.avatarAlertTimerId = null;
    }
  }

  private generateProfileUpdateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `profile-update-${crypto.randomUUID()}`;
    }
    return `profile-update-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  private lineageSectionTitle(key: string, fallbackLabel: string): string {
    const normalizedKey = key.toLowerCase();
    const titles: Record<string, string> = {
      darkelf: 'Dark Elf',
      dwarf: 'Dwarf',
      elf: 'Elf',
      ertheia: 'Ertheia',
      human: 'Human',
      kamael: 'Kamael',
      orc: 'Orc'
    };
    return titles[normalizedKey] ?? fallbackLabel;
  }
}
