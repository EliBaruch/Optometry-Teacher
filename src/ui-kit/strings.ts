import { defineStrings, pickStrings, type Grade, type Locale } from '@core';
import { useOptionalServices } from './context';
import type { Rarity } from './lib/palette';

/** Built-in text of the design system (default labels, aria-labels, grade and rarity words). */
export const S = defineStrings({
  en: {
    stampRim: 'LUMEN EYE CLINIC ✦ CASE REVIEW ✦ ',
    back: 'Back',
    close: 'Close',
    dismiss: (msg: string) => `${msg} (dismiss)`,
    showWholeLine: 'Show the whole line',
    stars: (n: number, max: number) => `${n} of ${max} stars`,
    grade: (g: string, word: string) => `Grade ${g}: ${word}`,
    remove: (what: string) => `Remove ${what}`.trim(),
    rarity: { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' } as Record<Rarity, string>,
    gradeWord: { S: 'Exemplary', A: 'Excellent', B: 'Solid', C: 'Adequate', D: 'Needs review', F: 'Missed' } as Record<Grade, string>,
  },
  he: {
    stampRim: 'מרפאת העיניים לומן ✦ סקירת מקרה ✦ ',
    back: 'חזרה',
    close: 'סגירה',
    dismiss: (msg: string) => `${msg} (לחצו כדי לסגור)`,
    showWholeLine: 'הציגו את כל המשפט',
    stars: (n: number, max: number) => `${n} מתוך ${max} כוכבים`,
    grade: (g: string, word: string) => `ציון ${g}: ${word}`,
    remove: (what: string) => (what.trim() ? `הסרת ${what.trim()}` : 'הסרה'),
    rarity: { common: 'נפוץ', rare: 'נדיר', epic: 'יוצא דופן', legendary: 'אגדי' } as Record<Rarity, string>,
    gradeWord: { S: 'למופת', A: 'מצוין', B: 'טוב', C: 'מספיק', D: 'דורש חיזוק', F: 'הוחמץ' } as Record<Grade, string>,
  },
});

/** The edition language even outside a ServicesProvider (sandbox pages): falls back to <html lang>. */
export function uiLocale(services?: { locale: Locale } | null): Locale {
  if (services) return services.locale;
  if (typeof document !== 'undefined' && document.documentElement.lang === 'he') return 'he';
  return 'en';
}

/** Design-system strings for the current edition; safe without a ServicesProvider. */
export function useUiStrings() {
  return pickStrings(S, uiLocale(useOptionalServices()));
}
