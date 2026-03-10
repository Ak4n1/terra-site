import { ABOUT_TRANSLATIONS_FR } from '../modules/about.translations';
import { GAME_FEATURES_TRANSLATIONS_FR } from '../modules/game-features.translations';
import { HOME_TRANSLATIONS_FR } from '../modules/home.translations';
import { NAVBAR_TRANSLATIONS_FR } from '../modules/navbar.translations';
import { RAID_CAROUSEL_TRANSLATIONS_FR } from '../modules/raid-carousel.translations';
import type { TranslationMap } from '../types';

export const TRANSLATIONS_FR: TranslationMap = {
  ...ABOUT_TRANSLATIONS_FR,
  ...GAME_FEATURES_TRANSLATIONS_FR,
  ...NAVBAR_TRANSLATIONS_FR,
  ...HOME_TRANSLATIONS_FR,
  ...RAID_CAROUSEL_TRANSLATIONS_FR
};
