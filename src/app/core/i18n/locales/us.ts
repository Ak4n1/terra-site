import { ABOUT_TRANSLATIONS_US } from '../modules/about.translations';
import { GAME_FEATURES_TRANSLATIONS_US } from '../modules/game-features.translations';
import type { TranslationMap } from '../types';
import { HOME_TRANSLATIONS_US } from '../modules/home.translations';
import { NAVBAR_TRANSLATIONS_US } from '../modules/navbar.translations';
import { RAID_CAROUSEL_TRANSLATIONS_US } from '../modules/raid-carousel.translations';

export const TRANSLATIONS_US: TranslationMap = {
  ...ABOUT_TRANSLATIONS_US,
  ...GAME_FEATURES_TRANSLATIONS_US,
  ...NAVBAR_TRANSLATIONS_US,
  ...HOME_TRANSLATIONS_US,
  ...RAID_CAROUSEL_TRANSLATIONS_US
};
