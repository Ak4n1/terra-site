import type { AppLanguage } from '../i18n/types';

export function appLanguageToLocale(language: AppLanguage): string {
  if (language === 'es') {
    return 'es-AR';
  }

  if (language === 'pt') {
    return 'pt-BR';
  }

  if (language === 'fr') {
    return 'fr-FR';
  }

  if (language === 'de') {
    return 'de-DE';
  }

  return 'en-US';
}

export function parseDateToEpoch(value: string): number {
  const raw = value?.trim();
  if (!raw || raw === '-') {
    return 0;
  }

  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const normalized = Date.parse(raw.replace(' ', 'T'));
  return Number.isFinite(normalized) ? normalized : 0;
}

export function formatDateTimeByLanguage(value: string, language: AppLanguage): string {
  const timestamp = parseDateToEpoch(value);
  if (!timestamp) {
    return '-';
  }

  try {
    return new Intl.DateTimeFormat(appLanguageToLocale(language), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  } catch {
    return value;
  }
}
