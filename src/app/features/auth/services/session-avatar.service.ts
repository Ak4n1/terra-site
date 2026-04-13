import { Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import type { AuthUser } from '../models/auth-user.model';

type AvatarSelection = {
  kind: 'preset' | 'custom';
  value: string;
};

export type AvatarPresetFamily = {
  key: 'lineage' | 'elemental';
  label: string;
  avatars: readonly string[];
};

const STORAGE_KEY = 'terra.account.avatar.selection.v1';

const LINEAGE_AVATAR_PATHS = [
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Darkelf_magician_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Darkelf_magician_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Darkelf_soldier_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Darkelf_soldier_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Dwarf_soldier_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Dwarf_soldier_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Elf_magician_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Elf_magician_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Elf_soldier_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Elf_soldier_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Ertheia_magician_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Ertheia_soldier_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Human_magician_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Human_magician_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Human_soldier_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Human_soldier_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Kamael_soldier_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Kamael_soldier_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Orc_magician_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Orc_magician_W.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Orc_soldier_M.webp',
  'assets/images/app/avatars/Lineage/webp/FaceIcon_Orc_soldier_W.webp'
] as const;

const ELEMENTAL_AVATAR_PATHS = [
  'assets/images/app/avatars/Elemental/webp/elemental_crystal.webp',
  'assets/images/app/avatars/Elemental/webp/elemental_fire.webp',
  'assets/images/app/avatars/Elemental/webp/elemental_land.webp',
  'assets/images/app/avatars/Elemental/webp/elemental_sun.webp',
  'assets/images/app/avatars/Elemental/webp/elemental_terra.webp',
  'assets/images/app/avatars/Elemental/webp/elemental_thunder.webp',
  'assets/images/app/avatars/Elemental/webp/elemental_venom.webp',
  'assets/images/app/avatars/Elemental/webp/elemental_waters.webp',
  'assets/images/app/avatars/Elemental/webp/elemental_wind.webp'
] as const;

const AVATAR_FAMILIES: readonly AvatarPresetFamily[] = [
  { key: 'lineage', label: 'Lineage II', avatars: LINEAGE_AVATAR_PATHS },
  { key: 'elemental', label: 'Elementals', avatars: ELEMENTAL_AVATAR_PATHS }
];

const DEFAULT_AVATAR_PATH = 'assets/images/app/avatars/default.png';
const AVATAR_PATHS = [...LINEAGE_AVATAR_PATHS, ...ELEMENTAL_AVATAR_PATHS] as const;

@Injectable({ providedIn: 'root' })
export class SessionAvatarService {
  private readonly avatarRevisionSignal = signal(0);
  private readonly selections = new Map<string, AvatarSelection>();
  private currentEmail: string | null = null;
  private currentAvatar: string | null = null;

  constructor() {
    this.hydrateFromStorage();
    this.registerCrossTabSync();
  }

  avatarRevision(): number {
    return this.avatarRevisionSignal();
  }

  listPresetAvatars(): readonly string[] {
    return AVATAR_PATHS;
  }

  listPresetFamilies(): readonly AvatarPresetFamily[] {
    return AVATAR_FAMILIES;
  }

  getSelection(email: string | null | undefined): AvatarSelection | null {
    if (!email) {
      return null;
    }
    return this.selections.get(email) ?? null;
  }

  resolveFromUser(user: AuthUser | null | undefined): string | null {
    if (!user?.email) {
      return this.resolve(null);
    }

    const backendAvatar = this.resolveBackendAvatar(user);
    if (backendAvatar) {
      this.currentEmail = user.email;
      this.currentAvatar = backendAvatar;
      return backendAvatar;
    }

    return this.resolve(user.email);
  }

  resolve(email: string | null | undefined): string | null {
    if (!email) {
      this.currentEmail = null;
      this.currentAvatar = null;
      return null;
    }

    const explicitSelection = this.selections.get(email)?.value ?? null;
    if (this.currentEmail !== email || !this.currentAvatar || (explicitSelection && explicitSelection !== this.currentAvatar)) {
      this.currentEmail = email;
      this.currentAvatar = explicitSelection ?? DEFAULT_AVATAR_PATH;
    }

    return this.currentAvatar;
  }

  private resolveBackendAvatar(user: AuthUser): string | null {
    if (user.avatarType === 'CUSTOM' && user.avatarCustomUrl) {
      return this.normalizeTrustedCustomValue(user.avatarCustomUrl);
    }

    if (user.avatarType === 'PRESET' && user.avatarPresetPath) {
      return user.avatarPresetPath;
    }

    return null;
  }

  setPreset(email: string | null | undefined, avatarPath: string): void {
    if (!email || !AVATAR_PATHS.includes(avatarPath as (typeof AVATAR_PATHS)[number])) {
      return;
    }

    this.selections.set(email, { kind: 'preset', value: avatarPath });
    if (this.currentEmail === email) {
      this.currentAvatar = avatarPath;
    }
    this.persistAndNotify();
  }

  setCustom(email: string | null | undefined, dataUrl: string): void {
    if (!email) {
      return;
    }

    const normalizedValue = this.normalizeTrustedCustomValue(dataUrl);
    if (!normalizedValue) {
      return;
    }

    this.selections.set(email, { kind: 'custom', value: normalizedValue });
    if (this.currentEmail === email) {
      this.currentAvatar = normalizedValue;
    }
    this.persistAndNotify();
  }

  clearSelection(email: string | null | undefined): void {
    if (!email) {
      return;
    }

    this.selections.delete(email);
    if (this.currentEmail === email) {
      this.currentAvatar = DEFAULT_AVATAR_PATH;
    }
    this.persistAndNotify();
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const nextSelections = this.parseSelectionsFromStorage(raw);
    this.selections.clear();
    for (const [email, selection] of nextSelections.entries()) {
      this.selections.set(email, selection);
    }
  }

  private registerCrossTabSync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      const nextSelections = this.parseSelectionsFromStorage(event.newValue);
      this.selections.clear();
      for (const [email, selection] of nextSelections.entries()) {
        this.selections.set(email, selection);
      }

      if (this.currentEmail) {
        const explicitSelection = this.selections.get(this.currentEmail)?.value ?? null;
        this.currentAvatar = explicitSelection ?? DEFAULT_AVATAR_PATH;
      } else {
        this.currentAvatar = null;
      }

      this.avatarRevisionSignal.update(value => value + 1);
    });
  }

  private parseSelectionsFromStorage(raw: string | null): Map<string, AvatarSelection> {
    const parsedSelections = new Map<string, AvatarSelection>();
    if (!raw || raw.trim().length === 0) {
      return parsedSelections;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, AvatarSelection>;
      for (const [email, selection] of Object.entries(parsed)) {
        if (!selection || typeof selection !== 'object') {
          continue;
        }
        if (selection.kind !== 'preset' && selection.kind !== 'custom') {
          continue;
        }
        if (typeof selection.value !== 'string' || selection.value.trim().length === 0) {
          continue;
        }

        const normalizedValue = this.normalizePresetPath(selection.kind, selection.value);
        if (selection.kind === 'custom') {
          const trustedCustomValue = this.normalizeTrustedCustomValue(normalizedValue);
          if (!trustedCustomValue) {
            continue;
          }
          parsedSelections.set(email, { kind: 'custom', value: trustedCustomValue });
          continue;
        }

        parsedSelections.set(email, {
          kind: selection.kind,
          value: normalizedValue
        });
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    return parsedSelections;
  }

  private persistAndNotify(): void {
    this.persistSelections();
    this.avatarRevisionSignal.update(value => value + 1);
  }

  private persistSelections(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const payload: Record<string, AvatarSelection> = {};
    for (const [email, selection] of this.selections.entries()) {
      payload[email] = selection;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  private normalizePresetPath(kind: AvatarSelection['kind'], value: string): string {
    if (kind !== 'preset') {
      return value;
    }

    return value
      .replace('/avatar/', '/avatars/Lineage/')
      .replace('/avatar_l2/', '/avatars/Lineage/')
      .replace('assets/images/app/avatar_l2/', 'assets/images/app/avatars/Lineage/')
      .replace('assets/images/app/avatar/', 'assets/images/app/avatars/Lineage/');
  }

  private normalizeTrustedCustomValue(rawValue: string): string | null {
    if (rawValue.startsWith('data:image/')) {
      return rawValue;
    }

    const normalized = rawValue.trim();
    const customRelativePrefix = '/api/account/settings/avatar/custom/';
    if (normalized.startsWith(customRelativePrefix)) {
      return `${environment.apiBaseUrl}${normalized}`;
    }

    const normalizedBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
    const trustedAbsolutePrefix = `${normalizedBaseUrl}${customRelativePrefix}`;
    if (normalized.startsWith(trustedAbsolutePrefix)) {
      return normalized;
    }

    return null;
  }
}
