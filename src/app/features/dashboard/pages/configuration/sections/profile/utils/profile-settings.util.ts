const AVATAR_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export function validateAvatarFile(file: File): 'invalid_type' | 'too_large' | null {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return 'invalid_type';
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return 'too_large';
  }

  return null;
}

export function normalizeLegacyPresetPath(path: string): string {
  let normalized = path.trim().replace(/^\/+/, '');
  normalized = normalized
    .replace('/avatar/', '/avatars/Lineage/')
    .replace('/avatar_l2/', '/avatars/Lineage/')
    .replace('assets/images/app/avatar_l2/', 'assets/images/app/avatars/Lineage/')
    .replace('assets/images/app/avatar/', 'assets/images/app/avatars/Lineage/');
  return normalized;
}

export function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
