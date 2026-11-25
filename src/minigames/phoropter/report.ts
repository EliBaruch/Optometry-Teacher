/**
 * Canonical chart lines for a subjective refraction. Pure.
 *   Manifest Rx  OD  −2.25 −0.50 × 180   normal (correctable)
 *   BCVA         OD  20/20                normal | abnormal when reduced
 *   Add          OU  +2.00                normal (age-appropriate presbyopia)
 *   Anisometropia    ΔSE 2.50 D           abnormal
 */
import { EYES, formatDiopters, formatRx, formatSnellen, sphericalEquivalent, type Eye, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { lensFromRx, quarter } from './optics';

/** BCVA worse than 20/25 (logMAR > 0.1, allowing rounding) counts as reduced. */
export const REDUCED_BCVA = 0.15;

export function normalisedRx(f: PatientFindings, eye: Eye) {
  const l = lensFromRx(f.refraction[eye]);
  return { sphere: quarter(l.sphere), cylinder: quarter(l.cyl) || 0, axis: l.axis };
}

/** Scissors/irregular reflex or distorted mires: spectacle refraction gives a soft, shifting endpoint. */
export function irregular(f: PatientFindings, eye: Eye): boolean {
  const reflex = f.retinoscopyReflex[eye];
  const mires = f.keratometry[eye].mires;
  return reflex === 'scissors' || reflex === 'irregular' || mires === 'irregular' || mires === 'distorted';
}

export function report(findings: PatientFindings, _patient?: PatientProfile): RevealedFinding[] {
  const out: RevealedFinding[] = [];
  for (const eye of EYES) {
    const rx = normalisedRx(findings, eye);
    const best = findings.va[eye].bestCorrected;
    const reduced = best > REDUCED_BCVA;
    out.push({ label: 'Manifest Rx', value: formatRx(rx), eye, flag: reduced ? 'abnormal' : 'normal' });
    out.push({ label: 'BCVA', value: formatSnellen(best), eye, flag: reduced ? 'abnormal' : 'normal' });
    if (irregular(findings, eye)) out.push({ label: 'Endpoint', value: 'Poorly defined — irregular astigmatism', eye, flag: 'abnormal' });
  }

  const addOD = findings.refraction.OD.add ?? 0;
  const addOS = findings.refraction.OS.add ?? 0;
  if (addOD > 0 || addOS > 0) {
    if (Math.abs(addOD - addOS) < 0.125) out.push({ label: 'Add', value: formatDiopters(addOD), eye: 'OU', flag: 'normal' });
    else for (const eye of EYES) {
      const a = findings.refraction[eye].add ?? 0;
      if (a > 0) out.push({ label: 'Add', value: formatDiopters(a), eye, flag: 'normal' });
    }
  }

  const od = normalisedRx(findings, 'OD');
  const os = normalisedRx(findings, 'OS');
  const dSE = Math.abs(sphericalEquivalent(od) - sphericalEquivalent(os));
  const dCyl = Math.abs(od.cylinder - os.cylinder);
  if (dSE >= 1 || dCyl >= 1.5) {
    const v = dSE >= 1 ? `ΔSE ${dSE.toFixed(2)} D` : `Δcyl ${dCyl.toFixed(2)} D`;
    out.push({ label: 'Anisometropia', value: v, eye: 'OU', flag: 'abnormal' });
  }
  return out;
}
