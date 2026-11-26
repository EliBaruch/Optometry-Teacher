import { defineStrings } from '@core';

export const S = defineStrings({
  en: {
    dailyNoCases: 'Today’s patients are still on their way in.',
    dailyDone: (streak: number) => `Today’s rounds are done.${streak > 1 ? ` ${streak} days running.` : ''} Fresh patients arrive tomorrow morning.`,
  },
  he: {
    dailyNoCases: 'המטופלים של היום עוד בדרך למרפאה.',
    dailyDone: (streak: number) => `הסבב של היום הסתיים.${streak > 1 ? ` ${streak} ימים ברצף.` : ''} מטופלים חדשים יגיעו מחר בבוקר.`,
  },
});
