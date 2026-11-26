/**
 * Every player-visible string of the motility + convergence mini-games, in both editions.
 * English is kept verbatim; Hebrew is written natively. Interpolations are functions.
 * Pure helpers (chart lines, practice answers) take a `locale`.
 */
import { defineStrings, isolateLtrRuns, pickStrings, type Eye, type Locale } from '@core';
import type { MiniGameText } from '@core';

export const S = defineStrings({
  en: {
    // ── shared chrome
    skip: 'Skip',
    next: 'Next',
    startExamining: 'Start examining',
    showTutorial: 'Show tutorial',
    recordFindings: 'Record findings',
    finish: 'Finish',
    writeToChart: 'Write to chart',
    recognition: 'Recognition challenge',
    correct: 'Correct. ',
    notQuite: 'Not quite. ',
    techniqueSuffix: '% technique',
    watchTutorial: 'Watch the tutorial, or skip it.',
    // ── motility
    motTitle: 'Extraocular motility',
    motSteps: [
      { title: 'Lead the eyes through the H', body: 'Drag the glowing wand, or use the arrow keys, to the nine positions of gaze: straight ahead, right, left, up, down and the four diagonals. Hold briefly at each one so the patient can follow.', keys: ['Drag', '← ↑ → ↓', '1–9'] },
      { title: 'Watch both eyes, and listen', body: 'Both eyes should move together, smoothly and fully. Notice an eye that stops short (underaction) or overshoots (overaction), and any double vision or pain the patient reports.', keys: ['Eyes', 'Patient'] },
      { title: 'Grade every gaze for each eye', body: 'Pick a cell on the OD or OS chart, then grade it: 0 is full movement, −1 to −4 is increasing underaction, +1 to +4 overaction. Record when you are done.', keys: ['+', '−', '0'] },
    ],
    dip: { horizontal: 'side by side', vertical: 'one above the other', oblique: 'at a slant' },
    sawTwo: (how: string) => `I see two! ${how.replace(/^./, (c) => c.toUpperCase())}.`,
    painSay: 'Ow — it hurts when I move my eyes that way.',
    straightAhead: 'Straight ahead',
    nodeNames: { upRight: 'up and right', up: 'up', upLeft: 'up and left', right: 'right', primary: 'straight ahead', left: 'left', downRight: 'down and right', down: 'down', downLeft: 'down and left' },
    chartAria: (right: boolean) => `${right ? 'Right' : 'Left'} eye motility chart`,
    eyeName: (right: boolean) => (right ? 'right eye' : 'left eye'),
    cellAria: (eye: string, name: string, grade: string) => `${eye} ${name} gaze, grade ${grade}`,
    youGraded: (g: string) => `you ${g}`,
    capR: 'R gaze', capL: 'L gaze',
    nudgeTapCell: 'Tap a cell on the OD or OS chart first, then choose its grade.',
    gateSweep: (n: number) => `Examine all nine positions first (${n}/9).`,
    gateGrade: (n: number) => `Grade every cell of both charts (${n}/16). Enter 0 for normal movement.`,
    nudgeAllSeen: 'All nine positions seen. Now grade each eye.',
    hintSweep: 'Guide the wand through all nine positions of gaze and watch each eye follow.',
    hintGrade: 'Now grade each eye in every gaze: 0 full, − underaction, + overaction.',
    tabsAria: 'Examination step',
    tabSweep: '1 · Sweep', tabGrade: '2 · Grade',
    stageAria: 'Fixation wand. Arrow keys step it between positions of gaze, hold to sweep; number keys 1 to 9 jump to a position.',
    kbdStep: 'step', kbdHold: 'hold to sweep', kbdJump: 'jump',
    patientsRight: "Patient's right", patientsLeft: "Patient's left",
    panelAria: 'Motility chart',
    gradeAria: 'Grade',
    gradeBtnAria: (g: string) => `Grade ${g}`,
    selLabel: (eye: string, name: string) => `${eye} · ${name} gaze`,
    tapCell: 'Tap a cell, then grade it',
    under: 'underaction', full: 'full', over: 'overaction',
    reportsAria: 'Patient reports', reportsTitle: 'Patient reports',
    reportsEmpty: 'Nothing yet. Double vision or pain on movement appears here with the gaze where it happened.',
    lookAria: 'What to look for', lookTitle: 'Look for',
    lookRange: ['Range', 'does either eye stop short of the target?'],
    lookOver: ['Overshoot', 'does an eye shoot up or in when it should not?'],
    lookSym: ['Symptoms', 'double vision, or pain on moving the eyes.'],
    keyAria: 'Grading key', keyTitle: 'Grading key',
    key0: 'full, smooth movement', key1: 'slight to moderate underaction', key3: 'marked; −4 cannot pass the midline', keyPlus: 'overaction, same scale',
    positionsLabel: (n: number) => `${n}/9 positions`,
    gradedLabel: (n: number) => ` · ${n}/16 graded`,
    positionsAria: 'Positions of gaze examined',
    chartTitle: 'Motility chart',
    answerToSee: 'Answer the question to see the explanation.',
    // ── convergence
    convTitle: 'Near point of convergence',
    convTutEyebrow: 'Convergence & accommodation',
    convSteps: [
      { title: 'Bring the target in slowly', body: 'Hold the approach button (or the left arrow) to slide the accommodative target toward the nose at a steady 2–5 cm per second. Too fast and you will overshoot the true break.', keys: ['← hold', 'Drag'] },
      { title: 'Break, then recovery', body: 'Watch both eyes. When one drifts outward the patient sees double: press Break. Then retreat slowly until the eye swings back in and single vision returns: press Recovered.', keys: ['B', 'Space'] },
      { title: 'Push-up amplitude', body: 'Cover one eye and bring a line of small letters toward it until they stay blurred: that near point gives the amplitude of accommodation in dioptres (100 ÷ cm). Repeat for the other eye.', keys: ['OD', 'OS'] },
    ],
    sayDouble: 'Double! Now I see two targets.',
    saySingle: 'It is single again.',
    sayBlur: 'It is starting to blur.',
    stateAccom: 'accommodating', stateDrift: 'drifting', stateFused: 'fused',
    paceStill: 'still', paceFast: 'too fast', paceSlow: 'slow', paceGood: 'good pace',
    nudgeFused: 'Both eyes are still fused. Keep advancing and watch for one eye to drift out.',
    nudgeOut: 'One eye is still out. Retreat slowly until it swings back in.',
    gateBreak: 'Mark the break point first.',
    gateRecovery: 'Now mark the recovery point.',
    gateAmp: 'Measure the push-up amplitude for both eyes.',
    hintBreak: 'Hold ← to bring the target toward the nose. Press Break (B) the instant one eye drifts out.',
    hintRecover: 'Hold → to retreat slowly until both eyes straighten, then press Recovered (B).',
    hintAmp: (covered: string) => `Push-up with the ${covered} covered: bring the letters in until they stay blurred, then press Blurry.`,
    lblBreak: 'Break!', lblRecovered: 'Recovered', lblBlurry: 'Blurry',
    eyeUnderTest: 'Eye under test',
    rulerAria: 'Ruler',
    rulerEye: 'eye', rulerNose: 'nose',
    sliderAria: 'Target distance in centimetres',
    approachAria: 'Hold to bring the target toward the nose (left arrow)',
    retreatAria: 'Hold to move the target away (right arrow)',
    approach: 'Approach', retreat: 'Retreat', repeat: 'Repeat',
    measAria: 'Measurements',
    planView: 'Plan view',
    liveTarget: 'Target', liveDemand: 'Demand', liveEyes: 'Eyes',
    measTitle: 'Measurements',
    mBreak: 'NPC break', mRecovery: 'NPC recovery', mAmpOD: 'Amplitude OD', mAmpOS: 'Amplitude OS',
    gaugeNormal: '6 cm normal', gaugeReceded: '10 receded',
    norms: (age: number, avg: string, min: string | null) => `Expected amplitude for ${age}: about ${avg} D (${min != null ? `minimum ${min} D` : 'no minimum expected at this age'}). Keys:`,
    normsKeys: [['←', ' approach (toward the nose), '], ['→', ' retreat, Shift = slower, '], ['B', ' or '], ['Space', ' marks, '], ['R', ' repeats.']] as [string, string][],
    measuredLabel: (n: number) => `${n}/4 measured`,
    measuredAria: 'Measurements completed',
    cmp: { you: 'You', actual: 'Actual', ampOf: (e: string) => `Amplitude ${e}`, notMeasured: 'not measured' },
    cm: (n: string) => `${n} cm`,
    planDrifting: 'eye drifting out',
    planConv: (deg: string) => `${deg}° convergence`,
  },
  he: {
    skip: 'דילוג',
    next: 'הבא',
    startExamining: 'מתחילים לבדוק',
    showTutorial: 'הצגת ההדרכה',
    recordFindings: 'רשמו ממצאים',
    finish: 'סיום',
    writeToChart: 'רשמו בתיק',
    recognition: 'אתגר זיהוי',
    correct: 'נכון. ',
    notQuite: 'כמעט. ',
    techniqueSuffix: '% טכניקה',
    watchTutorial: 'צפו בהדרכה, או דלגו עליה.',
    motTitle: 'תנועות עיניים',
    motSteps: [
      { title: 'מובילים את העיניים לאורך ה-H', body: 'גררו את שרביט האור, או השתמשו בחצים, אל תשעת מצבי המבט: ישר קדימה, ימינה, שמאלה, למעלה, למטה וארבעת האלכסונים. עצרו רגע בכל מצב כדי שהמטופל יספיק לעקוב.', keys: ['גרירה', '← ↑ → ↓', '1–9'] },
      { title: 'עוקבים אחרי שתי העיניים, ומקשיבים', body: 'שתי העיניים צריכות לנוע יחד, חלק ובטווח מלא. שימו לב לעין שנעצרת מוקדם מדי (תת-פעילות) או חורגת מהמטרה (יתר-פעילות), ולכל כפל ראייה או כאב שהמטופל מדווח עליהם.', keys: ['עיניים', 'מטופל'] },
      { title: 'מדרגים כל מצב מבט, לכל עין', body: 'בחרו משבצת בטבלת OD או OS ודרגו אותה: 0 הוא תנועה מלאה, מ-−1 עד −4 תת-פעילות הולכת וגוברת, ו-+1 עד +4 יתר-פעילות. כשסיימתם, רשמו את הממצאים.', keys: ['+', '−', '0'] },
    ],
    dip: { horizontal: 'אחד ליד השני', vertical: 'אחד מעל השני', oblique: 'באלכסון' },
    sawTwo: (how: string) => `אני רואה כפול! ${how}.`,
    painSay: 'אוי, כואב לי כשהעיניים זזות לכיוון הזה.',
    straightAhead: 'ישר קדימה',
    nodeNames: { upRight: 'למעלה וימינה', up: 'למעלה', upLeft: 'למעלה ושמאלה', right: 'ימינה', primary: 'ישר קדימה', left: 'שמאלה', downRight: 'למטה וימינה', down: 'למטה', downLeft: 'למטה ושמאלה' },
    chartAria: (right: boolean) => `טבלת תנועות עין ${right ? 'ימין' : 'שמאל'}`,
    eyeName: (right: boolean) => (right ? 'עין ימין' : 'עין שמאל'),
    cellAria: (eye: string, name: string, grade: string) => `${eye}, מבט ${name}, דירוג ${grade}`,
    youGraded: (g: string) => `אתם ${g}`,
    capR: 'מבט ימינה', capL: 'מבט שמאלה',
    nudgeTapCell: 'קודם לחצו על משבצת בטבלת OD או OS, ואז בחרו דירוג.',
    gateSweep: (n: number) => `קודם בדקו את כל תשעת המצבים (${n}/9).`,
    gateGrade: (n: number) => `דרגו כל משבצת בשתי הטבלאות (${n}/16). תנועה תקינה מדרגים 0.`,
    nudgeAllSeen: 'עברתם על כל תשעת המצבים. עכשיו מדרגים כל עין.',
    hintSweep: 'הובילו את השרביט דרך כל תשעת מצבי המבט, וראו איך כל עין עוקבת.',
    hintGrade: 'עכשיו דרגו כל עין בכל מצב מבט: 0 תקין, מינוס תת-פעילות, פלוס יתר-פעילות.',
    tabsAria: 'שלב בבדיקה',
    tabSweep: '1 · סריקה', tabGrade: '2 · דירוג',
    stageAria: 'שרביט קיבוע. החצים מזיזים אותו בין מצבי המבט, החזקה סורקת; המקשים 1 עד 9 קופצים ישר למצב.',
    kbdStep: 'צעד', kbdHold: 'החזקה = סריקה', kbdJump: 'קפיצה',
    patientsRight: 'ימין המטופל', patientsLeft: 'שמאל המטופל',
    panelAria: 'טבלת תנועות עיניים',
    gradeAria: 'דירוג',
    gradeBtnAria: (g: string) => `דירוג ${g}`,
    selLabel: (eye: string, name: string) => `${eye} · מבט ${name}`,
    tapCell: 'לחצו על משבצת ודרגו אותה',
    under: 'תת-פעילות', full: 'תקין', over: 'יתר-פעילות',
    reportsAria: 'דיווחי המטופל', reportsTitle: 'מה המטופל מדווח',
    reportsEmpty: 'עדיין כלום. כפל ראייה או כאב בתנועת העיניים יופיעו כאן, עם מצב המבט שבו זה קרה.',
    lookAria: 'על מה להסתכל', lookTitle: 'על מה מסתכלים',
    lookRange: ['טווח', 'האם אחת העיניים נעצרת לפני המטרה?'],
    lookOver: ['חריגה', 'האם עין חורגת למעלה או פנימה בלי סיבה?'],
    lookSym: ['תסמינים', 'כפל ראייה, או כאב בתנועת העיניים.'],
    keyAria: 'מקרא דירוג', keyTitle: 'מקרא דירוג',
    key0: 'תנועה מלאה וחלקה', key1: 'תת-פעילות קלה עד בינונית', key3: 'בולטת; ב-−4 העין לא חוצה את קו האמצע', keyPlus: 'יתר-פעילות, באותה סקאלה',
    positionsLabel: (n: number) => `${n}/9 מצבים`,
    gradedLabel: (n: number) => ` · ${n}/16 דורגו`,
    positionsAria: 'מצבי מבט שנבדקו',
    chartTitle: 'טבלת תנועות עיניים',
    answerToSee: 'עונים על השאלה, ואז רואים את ההסבר.',
    convTitle: 'נקודת התכנסות קרובה',
    convTutEyebrow: 'התכנסות ואקומודציה',
    convSteps: [
      { title: 'מקרבים את המטרה לאט', body: 'החזיקו את כפתור הקירוב (או את החץ השמאלי) כדי להזיז את מטרת האקומודציה לעבר האף בקצב קבוע של 2–5 ס״מ לשנייה. מהר מדי, ותחמיצו את נקודת השבירה האמיתית.', keys: ['← החזקה', 'גרירה'] },
      { title: 'שבירה, ואז התאוששות', body: 'עקבו אחרי שתי העיניים. כשאחת סוטה החוצה המטופל רואה כפול: לחצו על ״שבירה״. אחר כך התרחקו לאט עד שהעין חוזרת פנימה והראייה שוב בודדת: לחצו על ״התאוששות״.', keys: ['B', 'רווח'] },
      { title: 'משרעת בשיטת ה-push-up', body: 'כסו עין אחת וקרבו אליה שורת אותיות קטנות עד שהן נשארות מטושטשות: הנקודה הזו נותנת את משרעת האקומודציה בדיופטר (100 ÷ ס״מ). חזרו על זה בעין השנייה.', keys: ['OD', 'OS'] },
    ],
    sayDouble: 'כפול! עכשיו אני רואה שתי מטרות.',
    saySingle: 'שוב רואה אחת.',
    sayBlur: 'זה מתחיל להיטשטש.',
    stateAccom: 'מבצעות אקומודציה', stateDrift: 'אחת סוטה', stateFused: 'מאוחדות',
    paceStill: 'עומד', paceFast: 'מהר מדי', paceSlow: 'איטי', paceGood: 'קצב טוב',
    nudgeFused: 'שתי העיניים עדיין מאוחדות. המשיכו לקרב, ותראו מתי אחת סוטה החוצה.',
    nudgeOut: 'אחת העיניים עדיין בחוץ. התרחקו לאט עד שהיא חוזרת פנימה.',
    gateBreak: 'קודם סמנו את נקודת השבירה.',
    gateRecovery: 'עכשיו סמנו את נקודת ההתאוששות.',
    gateAmp: 'מדדו משרעת בשיטת push-up בשתי העיניים.',
    hintBreak: 'החזיקו ← כדי לקרב את המטרה לאף. ברגע שעין אחת סוטה החוצה, לחצו ״שבירה״ (B).',
    hintRecover: 'החזיקו → והתרחקו לאט עד ששתי העיניים מתיישרות, ואז לחצו ״התאוששות״ (B).',
    hintAmp: (covered: string) => `בשיטת push-up, כשעין ${covered} מכוסה: קרבו את האותיות עד שהן נשארות מטושטשות, ואז לחצו ״מטושטש״.`,
    lblBreak: 'שבירה!', lblRecovered: 'התאוששות', lblBlurry: 'מטושטש',
    eyeUnderTest: 'העין הנבדקת',
    rulerAria: 'סרגל',
    rulerEye: 'עין', rulerNose: 'אף',
    sliderAria: 'מרחק המטרה בסנטימטרים',
    approachAria: 'החזיקו כדי לקרב את המטרה לאף (חץ שמאלי)',
    retreatAria: 'החזיקו כדי להרחיק את המטרה (חץ ימני)',
    approach: 'קירוב', retreat: 'התרחקות', repeat: 'שוב',
    measAria: 'מדידות',
    planView: 'מבט מלמעלה',
    liveTarget: 'מטרה', liveDemand: 'דרישה', liveEyes: 'עיניים',
    measTitle: 'מדידות',
    mBreak: 'NPC, שבירה', mRecovery: 'NPC, התאוששות', mAmpOD: 'משרעת OD', mAmpOS: 'משרעת OS',
    gaugeNormal: '6 ס״מ תקין', gaugeReceded: '10 רחוק',
    norms: (age: number, avg: string, min: string | null) => `משרעת צפויה בגיל ${age}: כ-${avg} D (${min != null ? `מינימום ${min} D` : 'אין מינימום צפוי בגיל הזה'}). מקשים:`,
    normsKeys: [['←', ' קירוב (לעבר האף), '], ['→', ' התרחקות, Shift = לאט יותר, '], ['B', ' או '], ['רווח', ' מסמנים, '], ['R', ' חוזרים.']] as [string, string][],
    measuredLabel: (n: number) => `${n}/4 נמדדו`,
    measuredAria: 'מדידות שהושלמו',
    cmp: { you: 'אתם', actual: 'בפועל', ampOf: (e: string) => `משרעת ${e}`, notMeasured: 'לא נמדד' },
    cm: (n: string) => `${n} ס״מ`,
    planDrifting: 'העין סוטה החוצה',
    planConv: (deg: string) => `התכנסות ${deg}°`,
  },
});

export const MOTILITY_TEXT: MiniGameText = {
  title: 'תנועות עיניים',
  instructions: 'מובילים את העיניים לאורך ה-H: תשעה מצבי מבט. שימו לב לעין שנעצרת מוקדם מדי או חורגת, הקשיבו לדיווח על כפל ראייה וכאב, ואז דרגו כל עין בטבלה.',
  teaches: [
    'בודקים ורסיות בתשעת מצבי המבט האבחנתיים; אם הן לא שוות, בודקים דוקציות',
    'תת-פעילות מדורגת מ-−1 עד −4, יתר-פעילות מ-+1 עד +4',
    'שיתוק עצב VI: ליקוי בהרחקה ואזוטרופיה, החמורים ביותר במבט לכיוון העין החלשה',
    'שיתוק עצב IV: העין הפגועה גבוהה יותר ולא יורדת בהקרבה; האלכסוני התחתון בפעילות יתר',
    'שיתוק עצב III: עין למטה ולחוץ עם צניחת עפעף, ± אישון רחב (חירום אם האישון מעורב)',
    'כאב בתנועת עיניים עם דוקציות מלאות מרמז על דלקת בעצב הראייה',
  ],
};

export const CONVERGENCE_TEXT: MiniGameText = {
  title: 'נקודת התכנסות קרובה',
  instructions: 'הזיזו את המטרה לעבר האף בקצב קבוע ולחצו ״שבירה״ ברגע שעין אחת סוטה החוצה; התרחקו עד ההתאוששות. אחר כך בדקו משרעת אקומודציה בשיטת push-up.',
  teaches: [
    'NPC: שבירה עד 5–6 ס״מ והתאוששות עד 7 ס״מ הם תקינים; מעבר ל-10 ס״מ נחשב רחוק מהרגיל',
    'מזיזים את המטרה בקצב של כ-2–5 ס״מ לשנייה: מהר יותר נותן שבירה קרובה ולא מדויקת',
    'אי-ספיקת התכנסות: NPC רחוק, אקסופוריה גדולה יותר בקרוב, ויכולת מופחתת של ורגנס חיובי',
    'משרעת אקומודציה = 100 ÷ הנקודה הקרובה (ס״מ); ממוצע הופשטטר 18.5 − 0.3 × גיל',
    'הבדל גדול במשרעת בין שתי העיניים הוא דגל אדום (עצב III, אישון אדי, תרופות)',
  ],
};

// ───────────────────────── pure text helpers (take a locale)
const T = (locale: Locale) => pickStrings(S, locale);

export const nodeName = (id: string, locale: Locale): string => (T(locale).nodeNames as Record<string, string>)[id] ?? id;

/** Make a chart/finding string safe inside Hebrew text (signs, units, Latin runs). */
export const fixBidi = (s: string, locale: Locale): string => (locale === 'he' ? isolateLtrRuns(s) : s);

export interface PatternLike { id: string; eye?: Eye; chart: string; label: string }

const SIDE_HE = (e: Eye) => (e === 'OD' ? 'ימין' : 'שמאל');
/** Chart wording for a motility pattern in the edition language (English passes through). */
export function patternChart(p: PatternLike, locale: Locale): string {
  if (locale !== 'he') return p.chart;
  const e = p.eye ?? 'OD';
  switch (p.id) {
    case 'cn3': return `כמה שרירים ישרים חלשים ב־${e}: הגבלה בהקרבה, בהגבהה ובהנמכה`;
    case 'cn4': return `ליקוי בהנמכה בהקרבה ב־${e}, עם פעילות יתר של האלכסוני התחתון`;
    case 'cn6': return `ליקוי בהרחקה ב־${e}`;
    case 'restrictive': return `הגבלה בהגבהה ב־${e} (בכל מבטי המעלה)`;
    case 'pain': return 'תנועות מלאות; כאב בתנועת עיניים';
    default: return 'מלאות, חלקות ושוות';
  }
}
/** Clinical label (practice answers and challenge options), without capitalisation. */
export function patternLabel(p: PatternLike, locale: Locale): string {
  if (locale !== 'he') return p.label;
  const side = p.eye ? `בעין ${SIDE_HE(p.eye)}` : '';
  switch (p.id) {
    case 'cn3': return `שיתוק עצב III (אוקולומוטור) ${side}`;
    case 'cn4': return `שיתוק עצב IV (טרוכליארי) ${side}`;
    case 'cn6': return `שיתוק עצב VI (אבדוקנס) ${side}`;
    case 'restrictive': return `מגבלת הגבהה רסטריקטיבית ${side} (למשל מחלת עיניים תירואידית או שבר בקרקעית ארובת העין)`;
    case 'pain': return 'תנועות מלאות עם כאב בתנועת עיניים (תבנית של דלקת בעצב הראייה)';
    default: return 'תנועתיות מלאה (ללא שיתוק)';
  }
}

export const HE_TEACH: Record<string, (e: string) => string> = {
  cn6: (e) => `ה-${e} לא מצליחה להרחיק: חולשה של השריר הישר הצידי. האזוטרופיה וכפל הראייה האופקי החמורים ביותר במבט לכיוון הצד החלש וברחוק; הפנים מסתובבות לרוב לצד העין המשותקת כדי להחזיק את העיניים ישרות.`,
  cn4: (e) => `ה-${e} גבוהה יותר ולא יורדת בהקרבה (אלכסוני עליון), ולכן האלכסוני התחתון בפעילות יתר. הכפל האנכי החמור ביותר במבט למטה ופנימה, כמו בקריאה; המטופלים מטים את הראש הרחק מהעין ההיפרטרופית.`,
  cn3: () => `עין למטה ולחוץ עם צניחת עפעף: הקרבה, הגבהה והנמכה אבודות (MR, SR, IR, IO) בעוד הישר הצידי והאלכסוני העליון עדיין עובדים. אישון רחב ולא מגיב מרמז על לחץ (מפרצת): חירום באותו יום.`,
  restrictive: () => `ההגבהה נכשלת בכל מבטי המעלה: העין כבולה, לא משותקת. חשבו על מחלת עיניים תירואידית (שריר ישר תחתון מתוח) או שבר בקרקעית ארובת העין; מבחן דוקציה כפויה יהיה חיובי.`,
  pain: () => `הדוקציות מלאות אבל תנועת העיניים כואבת: דלקת רטרובולברית בעצב הראייה (נדן העצב מושך את העצב הדלוק). בדקו ראיית צבעים, אישונים (RAPD) ושדות ראייה.`,
  normal: () => `ורסיות חלקות, מלאות ושוות בכל תשעת המצבים: אין תת- או יתר-פעילות, ואין כפל ראייה.`,
};

export const HE_CONV_LABEL: Record<string, string> = {
  normal: 'נקודת התכנסות קרובה תקינה ומשרעת אקומודציה שמתאימה לגיל.',
  ci: 'נקודת התכנסות קרובה רחוקה מהרגיל (תבנית של אי-ספיקת התכנסות).',
  ai: 'משרעת אקומודציה נמוכה לגיל (אי-ספיקת אקומודציה).',
  both: 'NPC רחוק יחד עם אקומודציה מופחתת.',
};
export const HE_CONV_TEACH: Record<string, string> = {
  normal: 'שבירה ב-6 ס״מ או קרוב יותר, התאוששות עד כ-7 ס״מ, ומשרעת קרובה לערך הופשטטר (18.5 − 0.3 × גיל).',
  ci: 'שבירה מעבר ל-10 ס״מ והתאוששות רחוקה עוד יותר; בדרך כלל אקסופוריה גדולה יותר בקרוב. מטפלים באימון ורגנס, ושוקלים פריזמה לקרוב.',
  ai: 'משרעת נמוכה בבירור ממינימום הופשטטר (15 − 0.25 × גיל) עם NPC תקין. לפני שקוראים לזה אידיופטי, בדקו שבירה, תרופות ומצב בריאותי כללי.',
  both: 'שתי המערכות חלשות: במטופל צעיר חשבו על חבלת ראש, תרופות, מונונוקלאוזיס או מחלה נוירולוגית, וחפשו סימן באישון או בתנועתיות.',
};

export const HE_CHALLENGE_Q = { motility: 'מה מסביר הכי טוב את תנועות העיניים האלה?', conv: 'איזו קביעה מתאימה ביותר לשתי המדידות האלה?' };

export const HE_POSTURE: Record<string, string> = {
  'turn-left': 'סיבוב פנים שמאלה', 'turn-right': 'סיבוב פנים ימינה', 'tilt-left': 'הטיית ראש שמאלה',
  'tilt-right': 'הטיית ראש ימינה', 'chin-down': 'סנטר למטה', 'chin-up': 'סנטר למעלה',
};
export const HE_DIPLOPIA: Record<string, string> = { horizontal: 'אופקית (זו לצד זו)', vertical: 'אנכית (זו מעל זו)', oblique: 'אלכסונית' };
