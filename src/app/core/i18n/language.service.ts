import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type AppLanguage = 'us' | 'es';

type TranslationMap = Record<string, string>;

const STORAGE_KEY = 'terra.language';
const DEFAULT_LANGUAGE: AppLanguage = 'us';

const TRANSLATIONS: Record<AppLanguage, TranslationMap> = {
  us: {
    languageEnglish: 'English',
    languageSpanish: 'Espanol',
    navHome: 'Home',
    navDownloads: 'Downloads',
    navStatistics: 'Statistics',
    navBack: 'Back',
    navNews: 'News',
    navRegister: 'Register',
    navLogin: 'Login',
    navServices: 'Services',
    navMedia: 'Media',
    downloadRequirements: 'Requirements',
    downloadClient: 'Download Client',
    downloadLauncher: 'Download Launcher',
    statRates: 'Rates',
    statEnchanting: 'Enchanting',
    statAugmentation: 'Augmentation',
    statBrooch: 'Brooch',
    statJewels: 'Jewels',
    statTalisman: 'Talisman',
    statRunes: 'Runes',
    statOlympiad: 'Olympiad',
    statCharacter: 'Character',
    statRanking: 'Ranking',
    statRankingPvp: 'PvP',
    statRankingPk: 'PK',
    statRankingInfo: 'Info',
    statRatesXpSp: 'XP/SP',
    statRatesAdena: 'Adena',
    statRatesDropSpoil: 'Drop/Spoil',
    statEnchantWeapon: 'Weapon',
    statEnchantArmor: 'Armor',
    serviceRenameGender: 'Rename & Gender',
    serviceNameTitleColors: 'Name & Title Colors',
    serviceClassChange: 'Class Change',
    serviceInventory: 'Inventory',
    serviceWarehouse: 'Warehouse',
    serviceDelevel: 'Delevel',
    serviceDropsearch: 'Dropsearch',
    newsLatest: 'Latest News',
    newsPatch: 'Patch Notes',
    newsEvents: 'Events',
    mediaScreenshots: 'Screenshots',
    mediaVideos: 'Videos',
    mediaWallpapers: 'Wallpapers'
  },
  es: {
    languageEnglish: 'Ingles',
    languageSpanish: 'Espanol',
    navHome: 'Inicio',
    navDownloads: 'Descargas',
    navStatistics: 'Estadisticas',
    navBack: 'Volver',
    navNews: 'Noticias',
    navRegister: 'Registro',
    navLogin: 'Ingresar',
    navServices: 'Servicios',
    navMedia: 'Media',
    downloadRequirements: 'Requisitos',
    downloadClient: 'Descargar Cliente',
    downloadLauncher: 'Descargar Launcher',
    statRates: 'Tasas',
    statEnchanting: 'Encantamiento',
    statAugmentation: 'Augmentacion',
    statBrooch: 'Broche',
    statJewels: 'Joyas',
    statTalisman: 'Talisman',
    statRunes: 'Runas',
    statOlympiad: 'Olimpiada',
    statCharacter: 'Personaje',
    statRanking: 'Ranking',
    statRankingPvp: 'PvP',
    statRankingPk: 'PK',
    statRankingInfo: 'Info',
    statRatesXpSp: 'XP/SP',
    statRatesAdena: 'Adena',
    statRatesDropSpoil: 'Drop/Spoil',
    statEnchantWeapon: 'Arma',
    statEnchantArmor: 'Armadura',
    serviceRenameGender: 'Renombre y Genero',
    serviceNameTitleColors: 'Colores de nombre y titulo',
    serviceClassChange: 'Cambio de clase',
    serviceInventory: 'Inventario',
    serviceWarehouse: 'Almacen',
    serviceDelevel: 'Bajar nivel',
    serviceDropsearch: 'Busqueda de drops',
    newsLatest: 'Ultimas noticias',
    newsPatch: 'Notas de parche',
    newsEvents: 'Eventos',
    mediaScreenshots: 'Capturas',
    mediaVideos: 'Videos',
    mediaWallpapers: 'Fondos'
  }
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
