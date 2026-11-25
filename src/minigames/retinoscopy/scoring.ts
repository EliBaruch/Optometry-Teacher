/** Grades the player's retinoscopy against the truth. Pure. */
import { EYES, type Eye, type PatientFindings, type RetinoscopyReflex } from '@core';
import { accuracyFromError, axisError, clamp, principalMeridians, sphericalEquivalent, vectorError, type MeridianLock, type Rx } from './optics';
import { trueRx } from './report';

export interface EyeEntry {
  /** null when the player claimed "no reflex" */
  net: Rx | null;
  noReflex: boolean;
  reflex: RetinoscopyReflex | null;
  /** working-distance lens the player subtracted (D) */
  wdUsed: number;
  m1: MeridianLock | null;
  m2: MeridianLock | null;
}

export interface EyeAssess {
  eye: Eye;
  state: 'skipped' | 'no-reflex' | 'measured';
  truth: Rx;
  net: Rx | null;
  err: number;
  acc: number;
  axisErr: number | null;
  wdOk: boolean;
  forgotWd: boolean;
  reflexSaid: RetinoscopyReflex | null;
  reflexTrue: RetinoscopyReflex;
  reflexOk: boolean;
  perfect: boolean;
}

export interface Assessment {
  eyes: Record<Eye, EyeAssess>;
  accuracy: number;
  perfect: boolean;
  timeFactor: number;
}

/** Irregular reflexes have no true neutral point: allow a little extra slack. */
const SLACK: Partial<Record<RetinoscopyReflex, number>> = { scissors: 0.25, irregular: 0.25, dull: 0.1 };

export function assessEye(eye: Eye, findings: PatientFindings, wdTrue: number, entry: EyeEntry | null): EyeAssess {
  const truth = trueRx(findings, eye);
  const reflexTrue = findings.retinoscopyReflex?.[eye] ?? 'normal';
  const base = { eye, truth, reflexTrue, wdOk: true, forgotWd: false, axisErr: null, reflexSaid: entry?.reflex ?? null, perfect: false };
  if (!entry || (!entry.net && !entry.noReflex)) {
    return { ...base, state: 'skipped', net: null, err: NaN, acc: 0, reflexOk: false };
  }
  if (entry.noReflex || !entry.net) {
    const ok = reflexTrue === 'absent';
    return { ...base, state: 'no-reflex', net: null, err: NaN, acc: ok ? 1 : 0.1, reflexOk: ok, perfect: ok };
  }
  if (reflexTrue === 'absent') {
    // there was nothing to neutralise: any Rx is invented
    return { ...base, state: 'measured', net: entry.net, err: NaN, acc: 0.1, reflexOk: entry.reflex === 'absent', wdOk: false };
  }
  const err = vectorError(entry.net, truth);
  const eff = Math.max(0, err - (SLACK[reflexTrue] ?? 0));
  const reflexOk = entry.reflex === reflexTrue;
  const wdOk = Math.abs(entry.wdUsed - wdTrue) < 0.01;
  const forgotWd = entry.wdUsed < 0.01 && wdTrue > 0;
  const hasCyl = Math.abs(truth.cylinder) >= 0.5 && entry.m1;
  let axisErr: number | null = null;
  if (hasCyl && entry.m1) {
    const p = principalMeridians(truth);
    axisErr = Math.min(axisError(entry.m1.phi, p.phiA), axisError(entry.m1.phi, p.phiB));
  }
  const acc = accuracyFromError(eff) * (reflexOk ? 1 : 0.88);
  const perfect = eff <= 0.25 && reflexOk && wdOk;
  return { ...base, state: 'measured', net: entry.net, err, acc, axisErr, wdOk, forgotWd, reflexOk, perfect };
}

export function assess(
  findings: PatientFindings, wdTrue: number, entries: Record<Eye, EyeEntry | null>, timeMs: number, easyAssist: boolean,
): Assessment {
  const eyes = {} as Record<Eye, EyeAssess>;
  for (const e of EYES) eyes[e] = assessEye(e, findings, wdTrue, entries[e]);
  const mean = EYES.reduce((s, e) => s + eyes[e].acc, 0) / EYES.length;
  // a gentle speed term: nothing lost under 90 s, at most 8% lost by 4 minutes
  const timeFactor = 1 - 0.08 * clamp((timeMs / 1000 - 90) / 150, 0, 1);
  const accuracy = clamp(mean * timeFactor, 0, 1);
  const perfect = EYES.every((e) => eyes[e].perfect && eyes[e].state !== 'skipped') && !easyAssist;
  return { eyes, accuracy: Math.round(accuracy * 1000) / 1000, perfect, timeFactor };
}

export const seOf = sphericalEquivalent;
