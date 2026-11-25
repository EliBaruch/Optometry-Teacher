/**
 * Chart lines for the Amsler grid — pure.
 * Location is expressed in VISUAL-FIELD terms per eye: for OD the patient's
 * right side of the card is the temporal field; for OS it is the nasal field.
 */
import { EYES, type AmslerFinding, type Eye, type Locale, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { classOf, directionOf, normalizeAmsler, type AmslerClass } from './geometry';
import { T, fixBidi } from './strings';

export type FieldLocation =
  | 'central' | 'superior' | 'inferior' | 'temporal' | 'nasal'
  | 'superotemporal' | 'superonasal' | 'inferotemporal' | 'inferonasal';

/** Where a defect lies relative to fixation, in field terms for this eye. */
export function locationOf(f: AmslerFinding, eye: Eye): FieldLocation {
  const d = directionOf(f);
  if (d.central) return 'central';
  const vert = d.v > 0 ? 'supero' : d.v < 0 ? 'infero' : '';
  // OD: the patient's right of fixation is the temporal field; OS: their left is.
  const temporalSide = eye === 'OD' ? d.h > 0 : d.h < 0;
  const horiz = d.h === 0 ? '' : temporalSide ? 'temporal' : 'nasal';
  if (vert && horiz) return `${vert}${horiz}` as FieldLocation;
  if (vert) return vert === 'supero' ? 'superior' : 'inferior';
  return horiz as FieldLocation;
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
export function describeAmsler(f: AmslerFinding, eye: Eye, locale: Locale = 'en'): string {
  const t = T(locale);
  if (f.result === 'normal') return t.descNormal;
  const key = locationOf(f, eye);
  const loc = t.locs[key];
  const ext = extentDeg(f);
  const size = ext >= 18 ? t.fills : t.across(ext);
  if (f.result === 'metamorphopsia') return t.descMeta(loc, size);
  if (f.result === 'central-scotoma') {
    return key === 'central' ? t.descCentral(size) : t.descCentralLoc(loc, size);
  }
  return t.descPara(loc, size);
}

export function flagOf(f: AmslerFinding): RevealedFinding['flag'] {
  const cls = classOf(f);
  if (cls === 'normal') return 'normal';
  // Near-total loss of the central 20° (e.g. artery occlusion) is sight-threatening now.
  if (cls === 'scotoma' && normalizeAmsler(f).radius >= 8) return 'critical';
  return 'abnormal';
}

/** English chart lines (what the module's `report()` returns). */
export function report(findings: PatientFindings, patient: PatientProfile): RevealedFinding[] {
  return reportFor(findings, patient, 'en');
}

/** Chart lines in the edition's language; `mount()` uses this with `ctx.locale`. */
export function reportFor(findings: PatientFindings, _patient: PatientProfile, locale: Locale): RevealedFinding[] {
  return EYES.map((eye) => {
    const f = findings.amsler[eye] ?? { result: 'normal' as const };
    return { label: T(locale).repLabel, value: fixBidi(describeAmsler(f, eye, locale), locale), eye, flag: flagOf(f) };
  });
}
