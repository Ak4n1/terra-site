import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TRANSLATIONS_ES } from './locales/es';
import { TRANSLATIONS_US } from './locales/us';
import type { AppLanguage, TranslationMap } from './types';

const STORAGE_KEY = 'terra.language';
const DEFAULT_LANGUAGE: AppLanguage = 'us';

const TRANSLATIONS: Record<AppLanguage, TranslationMap> = {
  us: TRANSLATIONS_US,
  es: TRANSLATIONS_ES
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  readonly language = signal<AppLanguage>(this.resolveInitialLanguage());

  constructor() {
    this.applyHtmlLang(this.language());
  }

  setLanguage(language: AppLanguage): void {
    this.language.set(language);
    this.persist(language);
    this.applyHtmlLang(language);
  }

  t(key: string): string {
    const lang = this.language();
    return TRANSLATIONS[lang][key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
  }

  private resolveInitialLanguage(): AppLanguage {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'us' || saved === 'es') {
        return saved;
      }
    } catch {
      // Ignorar errores y usar el idioma por defecto.
    }
    return DEFAULT_LANGUAGE;
  }

  private persist(language: AppLanguage): void {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignorar errores de almacenamiento y mantener idioma en runtime.
    }
  }

  private applyHtmlLang(language: AppLanguage): void {
    this.document?.documentElement?.setAttribute('lang', language === 'es' ? 'es' : 'en');
  }
}
