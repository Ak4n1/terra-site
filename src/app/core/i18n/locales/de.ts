import { ABOUT_TRANSLATIONS_DE } from '../modules/about.translations';
import { GAME_FEATURES_TRANSLATIONS_DE } from '../modules/game-features.translations';
import { HOME_TRANSLATIONS_DE } from '../modules/home.translations';
import { NAVBAR_TRANSLATIONS_DE } from '../modules/navbar.translations';
import { RAID_CAROUSEL_TRANSLATIONS_DE } from '../modules/raid-carousel.translations';
import type { TranslationMap } from '../types';

export const TRANSLATIONS_DE: TranslationMap = {
  ...ABOUT_TRANSLATIONS_DE,
  ...GAME_FEATURES_TRANSLATIONS_DE,
  ...NAVBAR_TRANSLATIONS_DE,
  ...HOME_TRANSLATIONS_DE,
  ...RAID_CAROUSEL_TRANSLATIONS_DE
};
