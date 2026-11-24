/**
 * Chart lines for the Amsler grid — pure.
 * Location is expressed in VISUAL-FIELD terms per eye: for OD the patient's
 * right side of the card is the temporal field; for OS it is the nasal field.
 */
import { EYES, type AmslerFinding, type Eye, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { classOf, normalizeAmsler, type AmslerClass } from './geometry';

export type FieldLocation =
  | 'central' | 'superior' | 'inferior' | 'temporal' | 'nasal'
  | 'superotemporal' | 'superonasal' | 'inferotemporal' | 'inferonasal';

/** Where a defect lies relative to fixation, in field terms for this eye. */
export function locationOf(f: AmslerFinding, eye: Eye): FieldLocation {
  const n = normalizeAmsler(f);
  const { x, y } = n.center;
  const d = Math.hypot(x, y);
  // Involves fixation, or lies within ~1° of it -> central.
  if (d <= Math.max(1, n.radius * 0.45)) return 'central';
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const vert = ay >= Math.max(0.75, ax * 0.4) ? (y > 0 ? 'supero' : 'infero') : '';
  const temporalSide = eye === 'OD' ? x > 0 : x < 0;
  const horiz = ax >= Math.max(0.75, ay * 0.4) ? (temporalSide ? 'temporal' : 'nasal') : '';
  if (vert && horiz) return `${vert}${horiz}` as FieldLocation;
  if (vert) return vert === 'supero' ? 'superior' : 'inferior';
  return (horiz || 'central') as FieldLocation;
}

/** Diameter of the defect in degrees (= Amsler squares), clipped to the 20° grid. */
export function extentDeg(f: AmslerFinding): number {
  const n = normalizeAmsler(f);
  return Math.min(20, Math.round(n.radius * 2));
}

export const CLASS_LABEL: Record<AmslerClass, string> = {
  normal: 'Normal',
  metamorphopsia: 'Metamorphopsia',
  scotoma: 'Scotoma',
};

/** "Metamorphopsia — central, 8° across" etc. */
export function describeAmsler(f: AmslerFinding, eye: Eye): string {
  if (f.result === 'normal') return 'Normal — lines straight, no missing areas';
  const loc = locationOf(f, eye);
  const ext = extentDeg(f);
  const size = ext >= 18 ? 'whole grid' : `${ext}° across`;
  if (f.result === 'metamorphopsia') return `Metamorphopsia — ${loc}, ${size}`;
  if (f.result === 'central-scotoma') {
    return loc === 'central' ? `Central scotoma — ${size}` : `Central scotoma — ${loc}, ${size}`;
  }
  return `Paracentral scotoma — ${loc}, ${size}`;
}

export function flagOf(f: AmslerFinding): RevealedFinding['flag'] {
  const cls = classOf(f);
  if (cls === 'normal') return 'normal';
  // Near-total loss of the central 20° (e.g. artery occlusion) is sight-threatening now.
  if (cls === 'scotoma' && normalizeAmsler(f).radius >= 8) return 'critical';
  return 'abnormal';
}

export function report(findings: PatientFindings, _patient: PatientProfile): RevealedFinding[] {
  return EYES.map((eye) => {
    const f = findings.amsler[eye] ?? { result: 'normal' as const };
    return { label: 'Amsler', value: describeAmsler(f, eye), eye, flag: flagOf(f) };
  });
}
