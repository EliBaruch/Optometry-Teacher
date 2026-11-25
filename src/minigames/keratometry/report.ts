/**
 * Chart lines for keratometry. Pure.
 * Per eye: K1/K2 with meridians, corneal astigmatism (= K2 − K1, minus-cyl
 * form at the flat meridian) and mire quality.
 * Norms: central K ≈ 40–47 D; a steep K above 47 D or irregular mires is
 * abnormal (keratoconus suspect); corneal cylinder ≥ 3 D is abnormal.
 */
import { EYES, pickStrings, type Locale, type PatientFindings, type RevealedFinding } from '@core';
import { S } from './strings';
import { cornealCyl, fmtCornealCyl, fmtReading, normalizeK, type MireGrade } from './optics';

export const STEEP_K_LIMIT = 47;
export const FLAT_K_LIMIT = 40;
export const HIGH_CYL = 3;

export const MIRE_TEXT: Record<MireGrade, string> = S.en.mireChart;

/** Chart lines in the edition's language. `report()` is the English form used by tests and auto-run. */
export function reportFor(findings: PatientFindings, locale: Locale): RevealedFinding[] {
  const t = pickStrings(S, locale);
  const out: RevealedFinding[] = [];
  for (const eye of EYES) {
    const raw = findings.keratometry?.[eye];
    if (!raw) continue;
    const k = normalizeK(raw);
    const irregular = k.mires !== 'regular';
    const outOfRange = k.k2 > STEEP_K_LIMIT || k.k1 < FLAT_K_LIMIT;
    out.push({ label: t.kReading, value: fmtReading(k), eye, flag: outOfRange || irregular ? 'abnormal' : 'normal' });
    out.push({ label: t.cornealAst, value: fmtCornealCyl(k, locale), eye, flag: cornealCyl(k) >= HIGH_CYL ? 'abnormal' : 'normal' });
    out.push({ label: t.miresLabel, value: t.mireChart[k.mires], eye, flag: irregular ? 'abnormal' : 'normal' });
  }
  return out;
}

export const report = (findings: PatientFindings): RevealedFinding[] => reportFor(findings, 'en');
