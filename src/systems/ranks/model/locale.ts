import type { DiagnosisCategory, Locale } from '@core';
import { ACH_HE, CATEGORY_HE, CONSTELLATION_HE, GROUP_HE, S } from '../strings';
import { pickStrings } from '@core';
import type { AchievementDef, TrophyGroup } from './achievements';
import { GROUP_LABEL } from './achievements';
import { CATEGORY_LABEL, CONSTELLATION_NAME, STAR_LABEL } from './mastery';

/** Edition-aware text for the model's English constants. */
export const achText = (def: AchievementDef, locale: Locale): { title: string; description: string } =>
  (locale === 'he' && ACH_HE[def.id]) || { title: def.title, description: def.description };
export const groupLabel = (g: TrophyGroup, locale: Locale) => (locale === 'he' ? GROUP_HE[g] : GROUP_LABEL[g]);
export const categoryLabel = (c: DiagnosisCategory, locale: Locale) => (locale === 'he' ? CATEGORY_HE[c] : CATEGORY_LABEL[c]);
export const constellationName = (c: DiagnosisCategory, locale: Locale) => (locale === 'he' ? CONSTELLATION_HE[c] : CONSTELLATION_NAME[c]);
export const starLabel = (n: number, locale: Locale) => (locale === 'he' ? pickStrings(S, 'he').starLabel[n]! : STAR_LABEL[n]!);
export const rarityLabel = (r: string, locale: Locale) => pickStrings(S, locale).rarity[r] ?? r;
