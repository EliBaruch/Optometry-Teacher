/**
 * Chart lines for the cover test. Pure.
 * Norms (Morgan): distance ~1Δ exo ±2, near ~3Δ exo ±5. Generous bands used:
 * distance -4..+2Δ, near -8..+3Δ, vertical phoria <= 1Δ. Any tropia is abnormal;
 * a tropia with diplopia is flagged critical (acquired palsy needs work-up).
 */
import type { Deviation, PatientFindings, PatientProfile, RevealedFinding } from '@core';
import { describe, resolve, type Target, type Truth } from './model';

export function flagFor(dev: Deviation, target: Target, diplopia: string | undefined): RevealedFinding['flag'] {
  const t = resolve(dev);
  if (t.kind === 'ortho') return 'normal';
  if (t.kind === 'tropia' || t.kind === 'intermittent') return diplopia && diplopia !== 'none' ? 'critical' : 'abnormal';
  const lo = target === 'near' ? -8 : -4;
  const hi = target === 'near' ? 3 : 2;
  return t.h >= lo && t.h <= hi && Math.abs(t.v) <= 1 ? 'normal' : 'abnormal';
}

/** Distance/near pattern in the sense used for classifying horizontal deviations. */
export function pattern(d: Truth, n: Truth): string | null {
  if (d.dir !== n.dir || (d.dir !== 'eso' && d.dir !== 'exo')) return null;
  const diff = n.mag - d.mag;
  if (d.dir === 'eso') {
    if (diff >= 10) return 'Near > distance: convergence excess pattern';
    if (diff <= -10) return 'Distance > near: divergence insufficiency pattern';
  } else {
    if (diff >= 10) return 'Near > distance: convergence insufficiency pattern';
    if (diff <= -10) return 'Distance > near: divergence excess pattern';
  }
  return null;
}

const POSTURE: Record<string, string> = {
  'turn-left': 'face turn left', 'turn-right': 'face turn right', 'tilt-left': 'head tilt left',
  'tilt-right': 'head tilt right', 'chin-down': 'chin down', 'chin-up': 'chin up',
};

export function report(findings: PatientFindings, _patient?: PatientProfile): RevealedFinding[] {
  const m = findings.motility;
  const out: RevealedFinding[] = [];
  for (const [target, dev] of [['distance', m.distance], ['near', m.near]] as const) {
    const t = resolve(dev);
    const eye = t.eye === 'OD' || t.eye === 'OS' ? t.eye : 'OU';
    out.push({ label: target === 'distance' ? 'Cover test (distance)' : 'Cover test (near)', value: describe(t), eye, flag: flagFor(dev, target, m.diplopia) });
  }
  const p = pattern(resolve(m.distance), resolve(m.near));
  if (p) out.push({ label: 'Distance vs near', value: p, eye: 'OU', flag: 'abnormal' });
  if (m.headPosture && m.headPosture !== 'none') out.push({ label: 'Head posture', value: POSTURE[m.headPosture] ?? m.headPosture, eye: 'OU', flag: 'abnormal' });
  return out;
}
