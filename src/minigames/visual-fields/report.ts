/**
 * Chart lines for visual fields — pure.
 * One line per eye (the field described in clinical terms) plus a binocular
 * localisation line that says where along the pathway the lesion sits.
 */
import { EYES, type FieldDefect, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { describeEye, flagOf, localisationLine } from './interpret';

export function fieldOf(findings: PatientFindings, eye: 'OD' | 'OS'): FieldDefect {
  return findings.fields?.[eye] ?? 'full';
}

export function report(findings: PatientFindings, _patient: PatientProfile): RevealedFinding[] {
  const lines: RevealedFinding[] = EYES.map((eye) => {
    const d = fieldOf(findings, eye);
    return { label: 'Visual field', value: describeEye(d, eye), eye, flag: flagOf(d) };
  });
  const loc = localisationLine(fieldOf(findings, 'OD'), fieldOf(findings, 'OS'));
  lines.push({ label: 'Field localisation', value: loc.value, eye: 'OU', flag: loc.flag });
  return lines;
}
