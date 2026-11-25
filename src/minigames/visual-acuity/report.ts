/**
 * Canonical chart lines for the two tests. Pure and unit-tested.
 *   Visual acuity: "VA sc" per eye, e.g. 20/80 (6/24) · logMAR 0.60 — abnormal.
 *   Pinhole: "PH" per eye — improves / NI (no improvement) / not needed.
 */
import { EYES, pickStrings, type Locale, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { acuityFlag, chartValue, formatFeet, formatMetric, interocularConcern } from './notation';
import { PINHOLE_GAIN, pinholeLogmar } from './optics';
import { S } from './strings';

/** `locale` is optional so MiniGameModule.report(findings, patient) keeps its English output. */
export function reportAcuity(f: PatientFindings, p: PatientProfile, locale: Locale = 'en'): RevealedFinding[] {
  const t = pickStrings(S, locale);
  const od = f.va.OD.uncorrected;
  const os = f.va.OS.uncorrected;
  const amblyRisk = interocularConcern(od, os, p.age);
  return EYES.map((eye) => {
    const v = f.va[eye].uncorrected;
    let flag = acuityFlag(v, p.age);
    // Children: a 2-line difference between the eyes is abnormal even when both pass.
    if (flag === 'normal' && amblyRisk && v > Math.min(od, os)) flag = 'abnormal';
    return { label: t.lblVa, value: chartValue(v, locale), eye, flag };
  });
}

/** Pinhole is informative only when vision is reduced (worse than 20/25). */
export const PINHOLE_INDICATED = 0.1;

export type PinholeVerdict = 'improves' | 'no-improvement';

export function pinholeVerdict(f: PatientFindings, eye: 'OD' | 'OS'): PinholeVerdict {
  return f.va[eye].uncorrected - pinholeLogmar(f, eye) >= PINHOLE_GAIN - 1e-9 ? 'improves' : 'no-improvement';
}

/** What the player should conclude for one eye: improves / NI, or not needed when VA sc is already ≤ 20/25. */
export type PinholeCall = PinholeVerdict | 'not-needed';

export function pinholeExpected(f: PatientFindings, eye: 'OD' | 'OS'): PinholeCall {
  return f.va[eye].uncorrected <= PINHOLE_INDICATED + 1e-9 ? 'not-needed' : pinholeVerdict(f, eye);
}

export function reportPinhole(f: PatientFindings, p: PatientProfile, locale: Locale = 'en'): RevealedFinding[] {
  const t = pickStrings(S, locale);
  return EYES.map((eye) => {
    const sc = f.va[eye].uncorrected;
    if (sc <= PINHOLE_INDICATED + 1e-9) {
      return { label: t.lblPh, value: t.phNotNeeded(formatFeet(sc)), eye, flag: 'normal' as const };
    }
    const ph = pinholeLogmar(f, eye);
    const verdict = pinholeVerdict(f, eye);
    const flag = acuityFlag(ph, p.age);
    if (verdict === 'improves') {
      return { label: t.lblPh, value: t.phImproves(formatFeet(ph), formatMetric(ph), formatFeet(sc)), eye, flag };
    }
    // No improvement: refractive blur is ruled out as the main cause — pathology until proven otherwise.
    const escalate = flag === 'normal' && acuityFlag(sc, p.age) !== 'normal';
    return { label: t.lblPh, value: t.phNi(formatFeet(ph), formatMetric(ph)), eye, flag: escalate ? 'abnormal' : flag };
  });
}
