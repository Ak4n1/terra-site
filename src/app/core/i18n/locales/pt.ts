import { ABOUT_TRANSLATIONS_PT } from '../modules/about.translations';
import { GAME_FEATURES_TRANSLATIONS_PT } from '../modules/game-features.translations';
import { HOME_TRANSLATIONS_PT } from '../modules/home.translations';
import { NAVBAR_TRANSLATIONS_PT } from '../modules/navbar.translations';
import { RAID_CAROUSEL_TRANSLATIONS_PT } from '../modules/raid-carousel.translations';
import type { TranslationMap } from '../types';

export const TRANSLATIONS_PT: TranslationMap = {
  ...ABOUT_TRANSLATIONS_PT,
  ...GAME_FEATURES_TRANSLATIONS_PT,
  ...NAVBAR_TRANSLATIONS_PT,
  ...HOME_TRANSLATIONS_PT,
  ...RAID_CAROUSEL_TRANSLATIONS_PT
};
