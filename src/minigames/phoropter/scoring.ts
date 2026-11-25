/**
 * Technique scoring for the refraction. Pure.
 *   Rx error: spherical-equivalent error and cylinder vector distance (2·|ΔJ|),
 *   graded to the quarter dioptre; over-minus costs extra ("treat minus like money").
 *   Protocol: fog first, cross-cylinder when there is cylinder, duochrome check.
 *   Efficiency: number of questions / clicks.
 */
import type { Eye } from '@core';
import { toVector, type Lens } from './optics';

export interface EyeProtocol {
  /** the eye was put on the plus side (residual ≤ −0.50 D) at some point */
  fogged: boolean;
  /** questions asked ("one or two?", JCC flips, duochrome, readings) */
  asks: number;
  /** "one or two?" comparisons of sphere/cylinder changes */
  sphereAsks: number;
  jccAxisFlips: number;
  jccPowerFlips: number;
  duochrome: boolean;
  /** lens clicks on this eye */
  clicks: number;
}

export const emptyProtocol = (): EyeProtocol => ({ fogged: false, asks: 0, sphereAsks: 0, jccAxisFlips: 0, jccPowerFlips: 0, duochrome: false, clicks: 0 });

export interface RxError {
  /** final M − true M (negative = over-minused) */
  dM: number;
  /** cylinder-equivalent vector distance, D */
  dCyl: number;
  /** within a quarter-dioptre: |dM| ≤ 0.125 and dCyl ≤ 0.25 */
  exact: boolean;
}

export function rxError(final: Lens, truth: Lens): RxError {
  const a = toVector(final);
  const b = toVector(truth);
  const dM = a.M - b.M;
  const dCyl = 2 * Math.hypot(a.J0 - b.J0, a.J45 - b.J45);
  return { dM, dCyl, exact: Math.abs(dM) <= 0.13 && dCyl <= 0.26 };
}

/** 0..1 for one eye's final Rx. */
export function eyeScore(e: RxError): number {
  let s = 1 - Math.max(0, Math.abs(e.dM) - 0.13) * 0.9 - Math.max(0, e.dCyl - 0.26) * 0.6;
  if (e.dM <= -0.24) s -= 0.08; // over-minus
  return Math.max(0, Math.min(1, s));
}

export interface ProtocolContext {
  /** true cylinder magnitude in this eye */
  trueCyl: number;
  /** best-corrected logMAR (duochrome unreliable worse than ~20/40) */
  best: number;
}

/** 0..1 protocol adherence for one eye. */
export function protocolScore(p: EyeProtocol, c: ProtocolContext): number {
  const parts: number[] = [p.fogged ? 1 : 0];
  if (c.trueCyl >= 0.5) {
    const axis = p.jccAxisFlips > 0 ? 1 : 0;
    const power = p.jccPowerFlips > 0 ? 1 : 0;
    parts.push((axis + power) / 2);
  }
  if (c.best <= 0.3) parts.push(p.duochrome ? 1 : 0);
  parts.push(p.asks > 0 ? 1 : 0);
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

/** 0..1 efficiency from total questions + clicks across both eyes. */
export function efficiency(totalSteps: number): number {
  return Math.max(0.4, Math.min(1, 1 - Math.max(0, totalSteps - 60) / 120));
}

export interface Assessment {
  accuracy: number;
  perfect: boolean;
  perEye: Record<Eye, { error: RxError; score: number; protocol: number }>;
  efficiency: number;
  balanced: boolean;
}

export function assess(
  finals: Record<Eye, Lens>,
  truths: Record<Eye, Lens>,
  protocol: Record<Eye, EyeProtocol>,
  ctx: Record<Eye, ProtocolContext>,
  balanceChecked: boolean,
): Assessment {
  const perEye = {} as Assessment['perEye'];
  let steps = 0;
  for (const eye of ['OD', 'OS'] as const) {
    const error = rxError(finals[eye], truths[eye]);
    // An Rx the patient was never asked about is an unverified guess (e.g. the autorefraction copied over).
    const verified = protocol[eye].asks >= 3 ? 1 : protocol[eye].asks > 0 ? 0.75 : 0.5;
    perEye[eye] = { error, score: eyeScore(error) * verified, protocol: protocolScore(protocol[eye], ctx[eye]) };
    steps += protocol[eye].asks + protocol[eye].clicks;
  }
  const eff = efficiency(steps);
  const rx = (perEye.OD.score + perEye.OS.score) / 2;
  const proto = Math.min(1, (perEye.OD.protocol + perEye.OS.protocol) / 2 + (balanceChecked ? 0.1 : 0));
  const accuracy = Math.max(0, Math.min(1, 0.6 * rx + 0.28 * proto + 0.12 * eff));
  const perfect = perEye.OD.error.exact && perEye.OS.error.exact && perEye.OD.protocol >= 0.99 && perEye.OS.protocol >= 0.99;
  return { accuracy: Math.round(accuracy * 1000) / 1000, perfect, perEye, efficiency: eff, balanced: balanceChecked };
}
