import type { AppLanguage } from '../i18n/types';
import {
  DASHBOARD_NOTIFICATIONS_TRANSLATIONS_DE,
  DASHBOARD_NOTIFICATIONS_TRANSLATIONS_ES,
  DASHBOARD_NOTIFICATIONS_TRANSLATIONS_FR,
  DASHBOARD_NOTIFICATIONS_TRANSLATIONS_PT,
  DASHBOARD_NOTIFICATIONS_TRANSLATIONS_US
} from '../i18n/modules/dashboard-notifications.translations';

export type NotificationKeyKind = 'title' | 'body';

export type NotificationKeyCatalogEntry = {
  key: string;
  kind: NotificationKeyKind;
  translations: Record<AppLanguage, string>;
  placeholders: string[];
};

const NOTIFICATION_TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  us: DASHBOARD_NOTIFICATIONS_TRANSLATIONS_US,
  es: DASHBOARD_NOTIFICATIONS_TRANSLATIONS_ES,
  pt: DASHBOARD_NOTIFICATIONS_TRANSLATIONS_PT,
  fr: DASHBOARD_NOTIFICATIONS_TRANSLATIONS_FR,
  de: DASHBOARD_NOTIFICATIONS_TRANSLATIONS_DE
};

const PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

function extractPlaceholders(message: string): string[] {
  const placeholders = new Set<string>();

  for (const match of message.matchAll(PLACEHOLDER_PATTERN)) {
    if (match[1]) {
      placeholders.add(match[1]);
    }
  }

  return [...placeholders];
}

function inferKind(key: string): NotificationKeyKind | null {
  if (key.endsWith('.title')) {
    return 'title';
  }

  if (key.endsWith('.body')) {
    return 'body';
  }

  return null;
}

const baseKeys = Object.keys(DASHBOARD_NOTIFICATIONS_TRANSLATIONS_US)
  .filter(key => key.startsWith('notifications.') && inferKind(key) !== null)
  .sort((left, right) => left.localeCompare(right));

export const NOTIFICATION_KEY_CATALOG: NotificationKeyCatalogEntry[] = baseKeys.map(key => {
  const kind = inferKind(key) as NotificationKeyKind;
  const translations: Record<AppLanguage, string> = {
    us: NOTIFICATION_TRANSLATIONS.us[key] ?? key,
    es: NOTIFICATION_TRANSLATIONS.es[key] ?? NOTIFICATION_TRANSLATIONS.us[key] ?? key,
    pt: NOTIFICATION_TRANSLATIONS.pt[key] ?? NOTIFICATION_TRANSLATIONS.us[key] ?? key,
    fr: NOTIFICATION_TRANSLATIONS.fr[key] ?? NOTIFICATION_TRANSLATIONS.us[key] ?? key,
    de: NOTIFICATION_TRANSLATIONS.de[key] ?? NOTIFICATION_TRANSLATIONS.us[key] ?? key
  };

  const placeholders = extractPlaceholders(Object.values(translations).join(' '));

  return {
    key,
    kind,
    translations,
    placeholders
  };
});
