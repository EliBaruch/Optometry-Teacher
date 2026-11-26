/**
 * Chart lines for visual fields — pure.
 * One line per eye (the field described in clinical terms) plus a binocular
 * localisation line that says where along the pathway the lesion sits.
 */
import { EYES, type FieldDefect, type Locale, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { describeEye, flagOf, localisationLine } from './interpret';
import { vfT } from './strings';

export function fieldOf(findings: PatientFindings, eye: 'OD' | 'OS'): FieldDefect {
  return findings.fields?.[eye] ?? 'full';
}

/** The chart lines in the edition's language. */
export function reportFor(findings: PatientFindings, locale: Locale): RevealedFinding[] {
  const t = vfT(locale);
  const lines: RevealedFinding[] = EYES.map((eye) => {
    const d = fieldOf(findings, eye);
    return { label: t.chartField, value: describeEye(d, eye, locale), eye, flag: flagOf(d) };
  });
  const loc = localisationLine(fieldOf(findings, 'OD'), fieldOf(findings, 'OS'), locale);
  lines.push({ label: t.chartLoc, value: loc.value, eye: 'OU', flag: loc.flag });
  return lines;
}

/** English chart lines (the canonical form used by auto-run and tests). */
export const report = (findings: PatientFindings, _patient?: PatientProfile): RevealedFinding[] => reportFor(findings, 'en');
