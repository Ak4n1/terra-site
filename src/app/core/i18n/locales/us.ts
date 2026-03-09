import type { TranslationMap } from '../types';
import { HOME_TRANSLATIONS_US } from '../modules/home.translations';
import { NAVBAR_TRANSLATIONS_US } from '../modules/navbar.translations';

export const TRANSLATIONS_US: TranslationMap = {
  ...NAVBAR_TRANSLATIONS_US,
  ...HOME_TRANSLATIONS_US
};
