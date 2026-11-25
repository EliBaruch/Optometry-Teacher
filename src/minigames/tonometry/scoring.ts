/** How well the player performed tonometry. Pure. */
import { EYES, type Eye } from '@core';
import { alignQuality, CONTACT_LIMIT_S, CONTACT_WARN_S, dyeInBand, type Method } from './optics';

export interface EyeMeasure {
  eye: Eye;
  method: Method;
  reading: number;
  truth: number;
  /** ring-centre error at the moment of locking (Goldmann) / mean over shots (iCare) */
  centreErr: number;
  dye: number;
  contactS: number;
  shots?: number;
}

export interface EyeScore {
  eye: Eye;
  err: number;
  endpoint: number;
  align: number;
  technique: number;
  score: number;
  perfect: boolean;
}

/** |error| mmHg -> 0..1. Goldmann tolerance +/-1 is gold; iCare is a less exact device. */
export function endpointScore(err: number, method: Method = 'goldmann'): number {
  const e = Math.abs(err) / (method === 'icare' ? 1.6 : 1);
  if (e <= 1) return 1;
  if (e <= 2) return 0.85;
  if (e <= 3) return 0.65;
  if (e <= 5) return 0.4;
  if (e <= 8) return 0.15;
  return 0;
}

export function contactPenalty(s: number): number {
  return s > CONTACT_LIMIT_S ? 0.2 : s > CONTACT_WARN_S ? 0.08 : 0;
}

export function scoreEye(m: EyeMeasure): EyeScore {
  const err = m.reading - m.truth;
  const endpoint = endpointScore(err, m.method);
  const align = alignQuality(m.centreErr);
  const technique = m.method === 'goldmann' ? (dyeInBand(m.dye) ? 1 : 0.6) : Math.min(1, (m.shots ?? 6) / 6);
  let score = 0.7 * endpoint + 0.2 * align + 0.1 * technique - contactPenalty(m.contactS);
  if (m.method === 'icare') score = Math.min(0.92, score);
  score = Math.max(0, Math.min(1, score));
  const perfect = endpoint === 1 && align >= 0.85 && technique === 1 && contactPenalty(m.contactS) === 0;
  return { eye: m.eye, err, endpoint, align, technique, score, perfect };
}

export interface Assessment { eyes: EyeScore[]; accuracy: number; perfect: boolean }

export function assess(measures: Partial<Record<Eye, EyeMeasure>>, timeMs: number): Assessment {
  const eyes = EYES.filter((e) => measures[e]).map((e) => scoreEye(measures[e]!));
  if (eyes.length === 0) return { eyes, accuracy: 0, perfect: false };
  let acc = eyes.reduce((s, e) => s + e.score, 0) / eyes.length;
  if (eyes.length < 2) acc *= 0.7; // incomplete: only one eye measured
  const slow = Math.max(0, (timeMs / 1000 - 150) / 300);
  acc = Math.max(0, Math.min(1, acc - Math.min(0.1, slow * 0.1)));
  return { eyes, accuracy: acc, perfect: eyes.length === 2 && eyes.every((e) => e.perfect) && timeMs < 180_000 };
}
