/**
 * Chart lines for retinoscopy. Pure.
 *  'Ret'          net result per eye (minus-cylinder), flagged vs norms
 *  'Ret reflex'   quality of the reflex (normal / scissors / dull / irregular / absent)
 *  'Ret anisometropia'  inter-eye difference in spherical equivalent when >= 1.00 D
 * Norms: |spherical equivalent| <= 0.50 D and |cylinder| < 0.75 D read as normal.
 */
import { EYES, type Eye, type PatientFindings, type PatientProfile, type RetinoscopyReflex, type RevealedFinding } from '@core';
import { fmtRx, normalizeRx, sphericalEquivalent, type Rx } from './optics';

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

export function trueRx(findings: PatientFindings, eye: Eye): Rx {
  return normalizeRx(findings.refraction[eye]);
}

export function rxFlag(rx: Rx): 'normal' | 'abnormal' {
  return Math.abs(sphericalEquivalent(rx)) > 0.5 || Math.abs(rx.cylinder) >= 0.75 ? 'abnormal' : 'normal';
}

export function report(findings: PatientFindings, _patient?: PatientProfile): RevealedFinding[] {
  const out: RevealedFinding[] = [];
  const ses: Partial<Record<Eye, number>> = {};
  for (const eye of EYES) {
    const reflex: RetinoscopyReflex = findings.retinoscopyReflex?.[eye] ?? 'normal';
    const raw = findings.refraction?.[eye];
    if (reflex === 'absent' || !raw) {
      out.push({ label: 'Ret', value: 'No reflex — unable to neutralise', eye, flag: 'critical' });
    } else {
      const rx = normalizeRx(raw);
      ses[eye] = sphericalEquivalent(rx);
      out.push({ label: 'Ret', value: fmtRx(rx), eye, flag: rxFlag(rx) });
    }
    out.push({ label: 'Ret reflex', value: REFLEX_LABEL[reflex], eye, flag: reflex === 'normal' ? 'normal' : reflex === 'absent' ? 'critical' : 'abnormal' });
  }
  if (ses.OD !== undefined && ses.OS !== undefined) {
    const diff = Math.abs(ses.OD - ses.OS);
    if (diff >= 1) out.push({ label: 'Ret anisometropia', value: `${diff.toFixed(2)} D difference (SE)`, eye: 'OU', flag: 'abnormal' });
  }
  return out;
}
