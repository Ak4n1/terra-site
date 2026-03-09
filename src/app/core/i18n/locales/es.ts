import type { TranslationMap } from '../types';
import { HOME_TRANSLATIONS_ES } from '../modules/home.translations';
import { NAVBAR_TRANSLATIONS_ES } from '../modules/navbar.translations';
import { RAID_CAROUSEL_TRANSLATIONS_ES } from '../modules/raid-carousel.translations';

export const TRANSLATIONS_ES: TranslationMap = {
  ...NAVBAR_TRANSLATIONS_ES,
  ...HOME_TRANSLATIONS_ES,
  ...RAID_CAROUSEL_TRANSLATIONS_ES
};
