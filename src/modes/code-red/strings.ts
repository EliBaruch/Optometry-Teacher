import { defineStrings } from '@core';

export const S = defineStrings({
  en: {
    codeRedLocked: (left: number) => `See ${left} more patient${left === 1 ? '' : 's'} to join the emergency rota.`,
    codeRedQuiet: 'The emergency board is quiet tonight. Check back soon.',
  },
  he: {
    codeRedLocked: (left: number) => left === 1
      ? 'קבלו עוד מטופל אחד כדי להצטרף לתורנות החירום.'
      : `קבלו עוד ${left} מטופלים כדי להצטרף לתורנות החירום.`,
    codeRedQuiet: 'לוח החירום שקט הערב. כדאי לחזור עוד מעט.',
  },
});
