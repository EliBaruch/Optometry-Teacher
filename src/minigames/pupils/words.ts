import type { Locale } from '@core';
import type { Cond } from './model';
import { S } from './strings';
export const COND_WORD: Record<Cond, string> = { light: 'light', dark: 'dark' };
/** The condition word in the edition's language ("light" / "באור"). */
export const condWord = (c: Cond, locale: Locale): string => S[locale].cond[c];
