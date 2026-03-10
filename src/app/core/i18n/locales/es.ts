import { AUTH_TRANSLATIONS_ES } from '../modules/auth.translations';
import { ABOUT_TRANSLATIONS_ES } from '../modules/about.translations';
import { DASHBOARD_TRANSLATIONS_ES } from '../modules/dashboard.translations';
import { GAME_FEATURES_TRANSLATIONS_ES } from '../modules/game-features.translations';
import type { TranslationMap } from '../types';
import { HOME_TRANSLATIONS_ES } from '../modules/home.translations';
import { NAVBAR_TRANSLATIONS_ES } from '../modules/navbar.translations';
import { RAID_CAROUSEL_TRANSLATIONS_ES } from '../modules/raid-carousel.translations';

export const TRANSLATIONS_ES: TranslationMap = {
  ...AUTH_TRANSLATIONS_ES,
  ...ABOUT_TRANSLATIONS_ES,
  ...DASHBOARD_TRANSLATIONS_ES,
  ...GAME_FEATURES_TRANSLATIONS_ES,
  ...NAVBAR_TRANSLATIONS_ES,
  ...HOME_TRANSLATIONS_ES,
  ...RAID_CAROUSEL_TRANSLATIONS_ES
};
