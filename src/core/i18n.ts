/**
 * Localisation contracts.
 *
 * A build is single-locale (the Hebrew edition is its own site), so the locale is a plain
 * value on services, not a reactive signal. Every module owns its own strings and supplies
 * every locale for them; English is the source of truth for the shape.
 *
 * Text is never machine-translated: each locale is written natively (see docs/LOCALIZATION.md).
 */
import type { ClinicalCase, Diagnosis, HistoryQuestion, PatientProfile } from './case';

export type Locale = 'en' | 'he';
export const LOCALES: readonly Locale[] = ['en', 'he'];
export const RTL_LOCALES: readonly Locale[] = ['he'];
export const isRtl = (l: Locale) => RTL_LOCALES.includes(l);

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** A module's string table: `en` defines the shape; each other locale must match it exactly. */
export type Strings<T> = { en: T } & { [L in Exclude<Locale, 'en'>]: T };

/** Declare a string table. TypeScript enforces that every locale has exactly the English keys. */
export function defineStrings<T>(table: Strings<T>): Strings<T> {
  return table;
}

export function pickStrings<T>(table: Strings<T>, locale: Locale): T {
  return table[locale] ?? table.en;
}

// ───────────────────────── Localised content overlays
// Clinical data (findings, tests, diagnosis ids, urgency) is single-sourced in the English
// content files. A locale only rewrites the words, keyed by id, so the two can never diverge.

export interface CaseText {
  id: string;
  patient?: Partial<Pick<PatientProfile, 'name' | 'occupation' | 'personality'>>;
  chiefComplaint: string;
  triageNote?: string;
  /** Rewritten questions/answers keyed by HistoryQuestion.id */
  history: Record<string, Pick<HistoryQuestion, 'q' | 'a'>>;
  management: string;
  teachingPoints: string[];
  redFlags?: string[];
}

export interface DiagnosisText {
  id: string;
  name: string;
  aka?: string[];
  summary: string;
  keyFindings: string[];
  pearls: string[];
}

const LRI = '\u2066';
const PDI = '\u2069';
/** A left-to-right run inside RTL text: measurements, signs, units, Latin terms ("−6.00 D", "40–80 mmHg", "RAPD"). */
// A leading sign belongs to the number only when it is not a Hebrew prefix hyphen ("ל-40").
const SIGN = '(?:(?<![\\u0590-\\u05FF])[+\\-−±≈~<>≤≥])?';
const LTR_RUN = new RegExp(`${SIGN}[0-9A-Za-z][0-9A-Za-z.,:/%°×–\\-−+±'’Δ²³µ ]*[0-9A-Za-z%°Δ²³µ]|${SIGN}[0-9A-Za-z]`, 'g');

/**
 * Wrap each left-to-right run of a right-to-left string in Unicode isolates (LRI…PDI) so signs,
 * units and Latin terms keep their order inside Hebrew text. Text that is not RTL, or already
 * isolated, is returned unchanged.
 */
export function isolateLtrRuns(text: string): string {
  if (!/[\u0590-\u05FF]/.test(text) || text.includes(LRI)) return text;
  return text.replace(LTR_RUN, (run) => `${LRI}${run}${PDI}`);
}

const iso = isolateLtrRuns;

export function applyCaseText(kase: ClinicalCase, t: CaseText): ClinicalCase {
  return {
    ...kase,
    patient: { ...kase.patient, ...t.patient },
    chiefComplaint: iso(t.chiefComplaint),
    triageNote: t.triageNote !== undefined ? iso(t.triageNote) : kase.triageNote,
    history: kase.history.map((h) => {
      const r = t.history[h.id];
      return r ? { ...h, q: iso(r.q), a: iso(r.a) } : h;
    }),
    management: iso(t.management),
    teachingPoints: t.teachingPoints.map(iso),
    redFlags: t.redFlags ? t.redFlags.map(iso) : kase.redFlags,
  };
}

export function applyDiagnosisText(d: Diagnosis, t: DiagnosisText): Diagnosis {
  return {
    ...d,
    name: iso(t.name),
    aka: t.aka ? t.aka.map(iso) : d.aka,
    summary: iso(t.summary),
    keyFindings: t.keyFindings.map(iso),
    pearls: t.pearls.map(iso),
  };
}

// ───────────────────────── Localised names for plugin metadata
import type { MiniGameModule } from './minigame';
import type { ModeModule } from './mode';
import type { TestId } from './tests';
import { TEST_CATALOG } from './tests';

/** Optional per-locale text a mini-game can carry for its static metadata. */
export interface MiniGameText { title: string; instructions: string; teaches: string[] }
/** Optional per-locale text a mode can carry. */
export interface ModeText { title: string; tagline: string }

/** Title/instructions/teaches for a mini-game in the edition's language (falls back to English). */
export function miniGameText(mg: MiniGameModule, locale: Locale): MiniGameText {
  const t = mg.text?.[locale];
  return t ?? { title: mg.title, instructions: mg.instructions, teaches: mg.teaches };
}

export function modeText(mode: ModeModule, locale: Locale): ModeText {
  return mode.text?.[locale] ?? { title: mode.title, tagline: mode.tagline };
}

/** Clinical test names written natively for each edition. */
const TEST_TEXT_HE: Record<TestId, { name: string; blurb: string }> = {
  'visual-acuity': { name: 'חדות ראייה', blurb: 'קוראים את הלוח, עין אחרי עין.' },
  'pinhole': { name: 'חריר', blurb: 'האם החריר משפר? שבירה או מחלה.' },
  'retinoscopy': { name: 'רטינוסקופיה', blurb: 'מנטרלים את ההחזר: עם התנועה או נגדה?' },
  'phoropter': { name: 'בדיקת מספר', blurb: '״מה יותר חד, אחת או שתיים?״' },
  'keratometry': { name: 'קרטומטריה', blurb: 'מיישרים את הטבעות ומודדים את קימור הקרנית.' },
  'pupils': { name: 'אישונים', blurb: 'פנס מתנדנד: מחפשים RAPD.' },
  'cover-test': { name: 'מבחן כיסוי', blurb: 'מכסים, חושפים, ועוקבים אחרי תזוזת העין.' },
  'motility': { name: 'תנועות עיניים', blurb: 'עוקבים אחרי המטרה לאורך תבנית ה-H.' },
  'convergence': { name: 'נקודת התכנסות', blurb: 'מקרבים את המטרה עד שהיא מתפצלת לשתיים.' },
  'color-vision': { name: 'ראיית צבעים', blurb: 'לוחות צבע פסאודו-איזוכרומטיים.' },
  'amsler': { name: 'רשת אמסלר', blurb: 'קווים גליים? משבצות חסרות?' },
  'visual-fields': { name: 'שדה ראייה', blurb: 'ממפים את אי הראייה.' },
  'slit-lamp': { name: 'מנורת סדק', blurb: 'עפעפיים, לחמית, קרנית, לשכה ועדשה.' },
  'fluorescein': { name: 'פלואורסצאין', blurb: 'האור הכחול חושף את מה שהאור הלבן מסתיר.' },
  'tonometry': { name: 'טונומטריה', blurb: 'מיישרים את הטבעות וקוראים את הלחץ.' },
  'ophthalmoscopy': { name: 'אופתלמוסקופיה', blurb: 'סיור בקרקעית העין: דיסקה, כלי דם ומקולה.' },
};

export function testText(id: TestId, locale: Locale): { name: string; blurb: string } {
  if (locale === 'he') return TEST_TEXT_HE[id];
  const t = TEST_CATALOG[id];
  return { name: t.name, blurb: t.blurb };
}
