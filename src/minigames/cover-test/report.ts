/**
 * Chart lines for the cover test. Pure.
 * Norms (Morgan): distance ~1Δ exo ±2, near ~3Δ exo ±5. Generous bands used:
 * distance -4..+2Δ, near -8..+3Δ, vertical phoria <= 1Δ. Any tropia is abnormal;
 * a tropia with diplopia is flagged critical (acquired palsy needs work-up).
 */
import { pickStrings, type Deviation, type Locale, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { describe, resolve, type Target, type Truth } from './model';
import { S } from './strings';

export function flagFor(dev: Deviation, target: Target, diplopia: string | undefined): RevealedFinding['flag'] {
  const t = resolve(dev);
  if (t.kind === 'ortho') return 'normal';
  if (t.kind === 'tropia' || t.kind === 'intermittent') return diplopia && diplopia !== 'none' ? 'critical' : 'abnormal';
  const lo = target === 'near' ? -8 : -4;
  const hi = target === 'near' ? 3 : 2;
  return t.h >= lo && t.h <= hi && Math.abs(t.v) <= 1 ? 'normal' : 'abnormal';
}

/** Distance/near pattern in the sense used for classifying horizontal deviations. */
export function pattern(d: Truth, n: Truth, locale: Locale = 'en'): string | null {
  const w = pickStrings(S, locale);
  if (d.dir !== n.dir || (d.dir !== 'eso' && d.dir !== 'exo')) return null;
  const diff = n.mag - d.mag;
  if (d.dir === 'eso') {
    if (diff >= 10) return w.patNearDist(w.convExcess);
    if (diff <= -10) return w.patDistNear(w.divInsuff);
  } else {
    if (diff >= 10) return w.patNearDist(w.convInsuff);
    if (diff <= -10) return w.patDistNear(w.divExcess);
  }
  return null;
}

/** Chart lines in the edition's language. `report()` is the English form used by tests and auto-run. */
export function reportFor(findings: PatientFindings, locale: Locale): RevealedFinding[] {
  const w = pickStrings(S, locale);
  const m = findings.motility;
  const out: RevealedFinding[] = [];
  for (const [target, dev] of [['distance', m.distance], ['near', m.near]] as const) {
    const t = resolve(dev);
    const eye = t.eye === 'OD' || t.eye === 'OS' ? t.eye : 'OU';
    out.push({ label: target === 'distance' ? w.coverDist : w.coverNear, value: describe(t, locale), eye, flag: flagFor(dev, target, m.diplopia) });
  }
  const p = pattern(resolve(m.distance), resolve(m.near), locale);
  if (p) out.push({ label: w.distVsNear, value: p, eye: 'OU', flag: 'abnormal' });
  if (m.headPosture && m.headPosture !== 'none') out.push({ label: w.headPosture, value: w.posture[m.headPosture] ?? m.headPosture, eye: 'OU', flag: 'abnormal' });
  return out;
}

export const report = (findings: PatientFindings, _patient?: PatientProfile): RevealedFinding[] => reportFor(findings, 'en');
