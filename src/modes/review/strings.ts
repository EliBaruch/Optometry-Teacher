import { defineStrings } from '@core';

export const S = defineStrings({
  en: {
    reviewLocked: (left: number) => `Diagnose ${left} more ${left === 1 ? 'condition' : 'different conditions'} and they’ll be back for a second look.`,
  },
  he: {
    reviewLocked: (left: number) => left === 1
      ? 'אבחנו עוד מצב אחד, והוא יחזור אליכם לחוות דעת שנייה.'
      : `אבחנו עוד ${left} מצבים שונים, והם יחזרו אליכם לחוות דעת שנייה.`,
  },
});
