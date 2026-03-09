import type { TranslationMap } from '../types';
import { HOME_TRANSLATIONS_US } from '../modules/home.translations';
import { NAVBAR_TRANSLATIONS_US } from '../modules/navbar.translations';
import { RAID_CAROUSEL_TRANSLATIONS_US } from '../modules/raid-carousel.translations';

export const TRANSLATIONS_US: TranslationMap = {
  ...NAVBAR_TRANSLATIONS_US,
  ...HOME_TRANSLATIONS_US,
  ...RAID_CAROUSEL_TRANSLATIONS_US
};
