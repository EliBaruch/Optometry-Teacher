import { defineStrings, type Eye, type Locale } from '@core';

/** Edition language for built-in labels: the render layer has no services, so it reads <html lang>. */
export function renderLocale(): Locale {
  return typeof document !== 'undefined' && document.documentElement.lang === 'he' ? 'he' : 'en';
}

type Direction = 'in' | 'out' | 'up' | 'down';
type Expr = 'neutral' | 'worried' | 'pain' | 'happy' | 'relieved' | 'squint' | 'surprised';

const enEye = (e: Eye) => (e === 'OD' ? 'right' : 'left');
const heEye = (e: Eye) => (e === 'OD' ? 'ימין' : 'שמאל');

/** Screen-reader text of the render layer (avatars, eye close-up, fundus). */
export const RS = defineStrings({
  en: {
    portrait: (expression: string, signs: string[]) =>
      `Patient portrait, ${expression === 'neutral' ? 'calm' : expression} expression${signs.length ? `; ${signs.join(', ')}` : ''}`,
    eyeCloseup: (eye: Eye) => `Close-up of the ${eye === 'OD' ? 'right' : 'left'} eye`,
    fundus: (eye: Eye) => `Fundus of the ${eye === 'OD' ? 'right' : 'left'} eye. Drag or use arrow keys to look around; plus and minus to zoom.`,
  },
  he: {
    // The label stays neutral about the patient's sex: "הבעה" is feminine, so every expression is a feminine adjective.
    portrait: (expression: Expr | string, signs: string[]) => {
      const word: Record<string, string> = {
        neutral: 'רגועה', worried: 'מודאגת', pain: 'כואבת', happy: 'שמחה', relieved: 'של הקלה', squint: 'מצמצמת', surprised: 'מופתעת',
      };
      return `דיוקן: הבעה ${word[expression] ?? word.neutral}${signs.length ? `; ${signs.join(', ')}` : ''}`;
    },
    eyeCloseup: (eye: Eye) => `תקריב של העין ה${eye === 'OD' ? 'ימנית' : 'שמאלית'}`,
    fundus: (eye: Eye) => `קרקעית העין ה${eye === 'OD' ? 'ימנית' : 'שמאלית'}. גררו או השתמשו במקשי החצים כדי להזיז את המבט, ובמקשי פלוס ומינוס כדי לקרב ולהרחיק.`,
  },
});

/** Pieces of the sign list read out for a patient portrait (the visible clinical clues). */
export const SIGNS = defineStrings({
  en: {
    redEye: (eye: Eye) => `red ${enEye(eye)} eye`,
    bothRed: 'both eyes red',
    tearing: (eye: Eye) => `watering ${enEye(eye)} eye`,
    bothTearing: 'both eyes watering',
    ptosis: (eye: Eye) => `drooping ${enEye(eye)} upper eyelid`,
    bothPtosis: 'both upper eyelids drooping',
    proptosis: (eye: Eye) => `bulging ${enEye(eye)} eye`,
    bothProptosis: 'both eyes bulging',
    squinting: 'squinting',
    photophobia: 'shielding the eyes from light',
    eyePatch: (eye: Eye) => `patch over the ${enEye(eye)} eye`,
    rash: (eye: Eye) => `blistering rash on the ${enEye(eye)} forehead`,
    temple: (eye: Eye) => `prominent, tortuous ${enEye(eye)} temple artery`,
    strab: (eye: Eye, d: Direction) => `${enEye(eye)} eye turned ${d}`,
    pupilLarge: (eye: Eye) => `large ${enEye(eye)} pupil`,
    pupilSmall: (eye: Eye) => `small ${enEye(eye)} pupil`,
  },
  he: {
    redEye: (eye: Eye) => `עין ${heEye(eye)} אדומה`,
    bothRed: 'שתי העיניים אדומות',
    tearing: (eye: Eye) => `עין ${heEye(eye)} דומעת`,
    bothTearing: 'שתי העיניים דומעות',
    ptosis: (eye: Eye) => `עפעף עליון ${heEye(eye)} צונח`,
    bothPtosis: 'שני העפעפיים העליונים צונחים',
    proptosis: (eye: Eye) => `עין ${heEye(eye)} בולטת`,
    bothProptosis: 'שתי העיניים בולטות',
    squinting: 'עיניים מכווצות',
    photophobia: 'מסתירים את העיניים מהאור',
    eyePatch: (eye: Eye) => `רטייה על עין ${heEye(eye)}`,
    rash: (eye: Eye) => `פריחה שלפוחיתית בצד ${heEye(eye)} של המצח`,
    temple: (eye: Eye) => `עורק הרקה בצד ${heEye(eye)} בולט ומפותל`,
    strab: (eye: Eye, d: Direction) => `עין ${heEye(eye)} סוטה ${({ in: 'פנימה', out: 'החוצה', up: 'למעלה', down: 'למטה' } as const)[d]}`,
    pupilLarge: (eye: Eye) => `אישון ${heEye(eye)} מורחב`,
    pupilSmall: (eye: Eye) => `אישון ${heEye(eye)} מכווץ`,
  },
});
