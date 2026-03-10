import { AUTH_TRANSLATIONS_PT } from '../modules/auth.translations';
import { ABOUT_TRANSLATIONS_PT } from '../modules/about.translations';
import { DASHBOARD_TRANSLATIONS_PT } from '../modules/dashboard.translations';
import { GAME_FEATURES_TRANSLATIONS_PT } from '../modules/game-features.translations';
import { HOME_TRANSLATIONS_PT } from '../modules/home.translations';
import { NAVBAR_TRANSLATIONS_PT } from '../modules/navbar.translations';
import { RAID_CAROUSEL_TRANSLATIONS_PT } from '../modules/raid-carousel.translations';
import type { TranslationMap } from '../types';

export const TRANSLATIONS_PT: TranslationMap = {
  ...AUTH_TRANSLATIONS_PT,
  ...ABOUT_TRANSLATIONS_PT,
  ...DASHBOARD_TRANSLATIONS_PT,
  ...GAME_FEATURES_TRANSLATIONS_PT,
  ...NAVBAR_TRANSLATIONS_PT,
  ...HOME_TRANSLATIONS_PT,
  ...RAID_CAROUSEL_TRANSLATIONS_PT
};
