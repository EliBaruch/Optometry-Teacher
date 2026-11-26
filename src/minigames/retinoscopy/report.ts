/**
 * Chart lines for retinoscopy. Pure.
 *  'Ret'          net result per eye (minus-cylinder), flagged vs norms
 *  'Ret reflex'   quality of the reflex (normal / scissors / dull / irregular / absent)
 *  'Ret anisometropia'  inter-eye difference in spherical equivalent when >= 1.00 D
 * Norms: |spherical equivalent| <= 0.50 D and |cylinder| < 0.75 D read as normal.
 */
import { EYES, pickStrings, type Eye, type Locale, type PatientFindings, type PatientProfile, type RetinoscopyReflex, type RevealedFinding } from '@core';
import { fmtRx, normalizeRx, sphericalEquivalent, type Rx } from './optics';
import { S } from './strings';

export const REFLEX_LABEL: Record<RetinoscopyReflex, string> = {
  normal: 'Normal — crisp, even reflex',
  scissors: 'Scissoring — irregular cornea (keratoconus pattern)',
  dull: 'Dull — media opacity (e.g. cataract)',
  irregular: 'Irregular — distorted, broken reflex',
  absent: 'Absent — no red reflex',
};

export const REFLEX_SHORT: Record<RetinoscopyReflex, string> = {
  normal: 'Normal', scissors: 'Scissors', dull: 'Dull', irregular: 'Irregular', absent: 'No reflex',
};

/** Short reflex name in the edition's language (English table above is the source). */
export function reflexShort(r: RetinoscopyReflex, locale: Locale = 'en'): string {
  return pickStrings(S, locale).reflexShort[r];
}

export function trueRx(findings: PatientFindings, eye: Eye): Rx {
  return normalizeRx(findings.refraction[eye]);
}

export function rxFlag(rx: Rx): 'normal' | 'abnormal' {
  return Math.abs(sphericalEquivalent(rx)) > 0.5 || Math.abs(rx.cylinder) >= 0.75 ? 'abnormal' : 'normal';
}

/** `locale` is optional so MiniGameModule.report(findings, patient) keeps its English output. */
export function report(findings: PatientFindings, _patient?: PatientProfile, locale: Locale = 'en'): RevealedFinding[] {
  const t = pickStrings(S, locale);
  const out: RevealedFinding[] = [];
  const ses: Partial<Record<Eye, number>> = {};
  for (const eye of EYES) {
    const reflex: RetinoscopyReflex = findings.retinoscopyReflex?.[eye] ?? 'normal';
    const raw = findings.refraction?.[eye];
    if (reflex === 'absent' || !raw) {
      out.push({ label: t.lblRet, value: t.valNoReflex, eye, flag: 'critical' });
    } else {
      const rx = normalizeRx(raw);
      ses[eye] = sphericalEquivalent(rx);
      out.push({ label: t.lblRet, value: fmtRx(rx), eye, flag: rxFlag(rx) });
    }
    out.push({ label: t.lblRetReflex, value: t.reflexLabel[reflex], eye, flag: reflex === 'normal' ? 'normal' : reflex === 'absent' ? 'critical' : 'abnormal' });
  }
  if (ses.OD !== undefined && ses.OS !== undefined) {
    const diff = Math.abs(ses.OD - ses.OS);
    if (diff >= 1) out.push({ label: t.lblRetAniso, value: t.valDiff(diff.toFixed(2)), eye: 'OU', flag: 'abnormal' });
  }
  return out;
}
