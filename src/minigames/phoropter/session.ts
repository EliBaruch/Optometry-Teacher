/**
 * Refraction session state: dialled lenses, instrument configuration and the
 * protocol trail used for coaching and scoring. Pure, immutable updates.
 */
import { EYES, pickStrings, type Eye, type Locale } from '@core';
import { clamp, effectiveResidual, quarter, wrapAxis, type EyeModel, type JccMode, type Lens } from './optics';
import { emptyProtocol, type EyeProtocol } from './scoring';
import { S } from './strings';

export type Battery = Eye | 'OU';

export interface SessionState {
  lenses: Record<Eye, Lens>;
  /** lens state at the last question — "one" in the next comparison */
  base: Record<Eye, Lens>;
  /** the autorefraction starting point */
  start: Record<Eye, Lens>;
  active: Battery;
  jcc: JccMode | null;
  duo: boolean;
  prism: boolean;
  proto: Record<Eye, EyeProtocol>;
  /** sphere owed to hold the spherical equivalent during JCC power changes */
  seOwed: Record<Eye, number>;
  balanceChecked: boolean;
}

const copy = (l: Lens): Lens => ({ ...l });

export function initSession(start: Record<Eye, Lens>): SessionState {
  return {
    lenses: { OD: copy(start.OD), OS: copy(start.OS) },
    base: { OD: copy(start.OD), OS: copy(start.OS) },
    start: { OD: copy(start.OD), OS: copy(start.OS) },
    active: 'OD',
    jcc: null,
    duo: false,
    prism: false,
    proto: { OD: emptyProtocol(), OS: emptyProtocol() },
    seOwed: { OD: 0, OS: 0 },
    balanceChecked: false,
  };
}

export const eyesOf = (b: Battery): Eye[] => (b === 'OU' ? [...EYES] : [b]);

function withFog(s: SessionState, eyes: Eye[], models: Record<Eye, EyeModel>): SessionState {
  const proto = { ...s.proto };
  for (const e of eyes) {
    if (proto[e].fogged) continue;
    if (effectiveResidual(models[e], s.lenses[e]).raw.M <= -0.5) proto[e] = { ...proto[e], fogged: true };
  }
  return { ...s, proto };
}

function bump(s: SessionState, eyes: Eye[], n: number): Record<Eye, EyeProtocol> {
  const proto = { ...s.proto };
  for (const e of eyes) proto[e] = { ...proto[e], clicks: proto[e].clicks + Math.abs(n) };
  return proto;
}

export function stepSphere(s: SessionState, n: number, models: Record<Eye, EyeModel>, only?: Eye): SessionState {
  const eyes = only ? [only] : eyesOf(s.active);
  const lenses = { ...s.lenses };
  for (const e of eyes) lenses[e] = { ...lenses[e], sphere: clamp(quarter(lenses[e].sphere + n * 0.25), -20, 20) };
  return withFog({ ...s, lenses, proto: bump(s, eyes, n) }, eyes, models);
}

/** Cylinder in −0.25 D clicks (n > 0 = more minus). In JCC power mode the sphere follows to hold the SE. */
export function stepCyl(s: SessionState, n: number, models: Record<Eye, EyeModel>): { state: SessionState; seShift: number } {
  if (s.active === 'OU') return { state: s, seShift: 0 };
  const e = s.active;
  const l = s.lenses[e];
  const cyl = clamp(quarter(l.cyl - n * 0.25), -8, 0);
  const dCyl = cyl - l.cyl;
  let sphere = l.sphere;
  let owed = s.seOwed[e];
  let seShift = 0;
  if (s.jcc === 'power' && dCyl !== 0) {
    owed += -dCyl / 2;
    while (Math.abs(owed) >= 0.25 - 1e-9) {
      const st = Math.sign(owed) * 0.25;
      sphere = quarter(sphere + st);
      owed -= st;
      seShift += st;
    }
  }
  const next: SessionState = {
    ...s,
    lenses: { ...s.lenses, [e]: { ...l, cyl: cyl === 0 ? 0 : cyl, sphere } },
    seOwed: { ...s.seOwed, [e]: owed },
    proto: bump(s, [e], n),
  };
  return { state: withFog(next, [e], models), seShift };
}

export function stepAxis(s: SessionState, n: number, fine: boolean): SessionState {
  if (s.active === 'OU') return s;
  const e = s.active;
  const l = s.lenses[e];
  return { ...s, lenses: { ...s.lenses, [e]: { ...l, axis: wrapAxis(l.axis + n * (fine ? 1 : 5)) } }, proto: bump(s, [e], n) };
}

export function setActive(s: SessionState, b: Battery): SessionState {
  if (s.active === b) return s;
  return { ...s, active: b, jcc: b === 'OU' ? null : s.jcc, prism: b === 'OU' ? s.prism : false, base: { OD: copy(s.lenses.OD), OS: copy(s.lenses.OS) } };
}

export type AskKind = 'lens' | 'jcc-axis' | 'jcc-power' | 'duochrome' | 'read' | 'balance';

/** Record a question; for lens comparisons the current lens becomes the next "one". */
export function recordAsk(s: SessionState, kind: AskKind): SessionState {
  const eyes = eyesOf(s.active);
  const proto = { ...s.proto };
  for (const e of eyes) {
    const p = { ...proto[e], asks: proto[e].asks + 1 };
    if (kind === 'lens') p.sphereAsks += 1;
    if (kind === 'jcc-axis') p.jccAxisFlips += 1;
    if (kind === 'jcc-power') p.jccPowerFlips += 1;
    if (kind === 'duochrome') p.duochrome = true;
    proto[e] = p;
  }
  const base = kind === 'lens' ? { OD: copy(s.lenses.OD), OS: copy(s.lenses.OS) } : s.base;
  return { ...s, proto, base, balanceChecked: s.balanceChecked || kind === 'balance' };
}

export const sameLens = (a: Lens, b: Lens) =>
  Math.abs(a.sphere - b.sphere) < 1e-6 && Math.abs(a.cyl - b.cyl) < 1e-6 && (a.cyl === 0 || a.axis === b.axis);

/** Has the active battery changed since the last question? */
export function changedSinceAsk(s: SessionState): boolean {
  return eyesOf(s.active).some((e) => !sameLens(s.lenses[e], s.base[e]));
}

// ───────────────────────── coaching

export interface Stages {
  fog: boolean;
  sphere: boolean;
  axis: boolean;
  power: boolean;
  duo: boolean;
}

export function stages(s: SessionState, e: Eye): Stages {
  const p = s.proto[e];
  return {
    fog: p.fogged,
    sphere: p.fogged && p.sphereAsks >= 2,
    axis: p.jccAxisFlips > 0,
    power: p.jccPowerFlips > 0,
    duo: p.duochrome,
  };
}

export const eyeComplete = (s: SessionState, e: Eye) => {
  const st = stages(s, e);
  return st.fog && st.sphere && st.duo;
};

/** One-line instruction for the header. */
export function hint(s: SessionState, locale: Locale = 'en'): string {
  const t = pickStrings(S, locale);
  if (s.active === 'OU') {
    if (s.prism) return t.hintOuPrism;
    return t.hintOu;
  }
  const e = s.active;
  const st = stages(s, e);
  const other: Eye = e === 'OD' ? 'OS' : 'OD';
  if (s.jcc === 'axis') return t.hintJccAxis;
  if (s.jcc === 'power') return t.hintJccPower;
  if (s.duo) return t.hintDuo;
  if (!st.fog) return t.hintFog(e);
  if (!st.sphere) return t.hintSphere;
  if (s.lenses[e].cyl < 0 && !st.axis) return t.hintAxis;
  if (s.lenses[e].cyl < 0 && !st.power) return t.hintPower;
  if (!st.duo) return t.hintPushPlus;
  if (!eyeComplete(s, other)) return t.hintSwitch(e, other);
  return t.hintDone;
}
