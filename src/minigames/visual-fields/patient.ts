/**
 * The patient at the bowl — pure psychophysics.
 *
 * Responses follow a frequency-of-seeing curve around the TRUE threshold at each
 * location (from the geometric model), with a little false-positive /
 * false-negative noise that grows with difficulty. Stimulus intensity is in dB
 * of attenuation: higher dB = DIMMER; 0 dB is the brightest the bowl can do.
 */
import type { Eye, FieldDefect, Rng } from '@core';
import { BLIND_SPOT, normalSensitivity, trueThreshold, type FieldPoint } from './model';

export const MAX_DB = 40;

export interface Responder {
  defect: FieldDefect;
  eye: Eye;
  age: number;
  /** probability of pressing with nothing seen */
  falsePos: number;
  /** probability of missing a clearly visible stimulus */
  falseNeg: number;
  /** probability of looking at the stimulus instead of the fixation light */
  fixationLoss: number;
  /** frequency-of-seeing slope (dB) — wider = noisier */
  slope: number;
}

export function makeResponder(defect: FieldDefect, eye: Eye, age: number, difficulty: number): Responder {
  const d = Math.max(0, Math.min(1, difficulty));
  return {
    defect,
    eye,
    age,
    falsePos: 0.01 + 0.025 * d,
    falseNeg: 0.01 + 0.02 * d,
    fixationLoss: 0.03 + 0.1 * d,
    slope: 0.9 + 0.8 * d,
  };
}

/** Probability of seeing a stimulus of `db` at a location with threshold `thr`. */
export function seeingProbability(thr: number, db: number, r: Pick<Responder, 'falsePos' | 'falseNeg' | 'slope'>): number {
  const core = 1 / (1 + Math.exp(-(thr - db) / r.slope));
  return r.falsePos + (1 - r.falsePos - r.falseNeg) * core;
}

export function respond(r: Responder, p: FieldPoint, db: number, rng: Rng): boolean {
  const thr = trueThreshold(r.defect, r.eye, p.x, p.y, r.age);
  return rng.next() < seeingProbability(thr, db, r);
}

export interface Flash {
  x: number;
  y: number;
  db: number;
  seen: boolean;
  /** Heijl–Krakau blind-spot catch trial */
  catchTrial?: boolean;
}

export type TestMode = 'threshold' | 'screen';

export interface PointResult {
  x: number;
  y: number;
  mode: TestMode;
  /** threshold: measured dB (null = <0, not seen at max); screen: stimulus dB used */
  db: number | null;
  seen: boolean;
  flashes: number;
}

/** Age-normal expected sensitivity, rounded — where a staircase begins. */
export function expectedDb(p: FieldPoint, age: number): number {
  return Math.round(normalSensitivity(p.x, p.y, age));
}

/**
 * 4-2 dB full-threshold staircase (Humphrey "Full Threshold"): step 4 dB until
 * the first reversal, then 2 dB; stop after the second reversal and record the
 * last seen intensity. Two misses in a row from the start jump straight to 0 dB
 * to confirm an absolute defect quickly.
 */
export function thresholdStaircase(r: Responder, p: FieldPoint, rng: Rng): { flashes: Flash[]; result: PointResult } {
  const flashes: Flash[] = [];
  let db = Math.min(MAX_DB, expectedDb(p, r.age));
  let step = 4;
  let last: boolean | null = null;
  let reversals = 0;
  let lastSeen: number | null = null;
  let missesFromStart = 0;
  for (let i = 0; i < 10; i++) {
    const seen = respond(r, p, db, rng);
    flashes.push({ x: p.x, y: p.y, db, seen });
    if (seen) lastSeen = db;
    if (last !== null && seen !== last) {
      reversals++;
      step = 2;
    }
    if (reversals >= 2) break;
    if (!seen && lastSeen === null) {
      missesFromStart++;
      if (db <= 0) break; // not seen at maximum brightness: <0 dB
      if (missesFromStart >= 2) {
        db = 0;
        last = seen;
        continue;
      }
    }
    last = seen;
    db = seen ? Math.min(MAX_DB, db + step) : Math.max(0, db - step);
  }
  return {
    flashes,
    result: { x: p.x, y: p.y, mode: 'threshold', db: lastSeen, seen: lastSeen !== null, flashes: flashes.length },
  };
}

/** Threshold-related supra-threshold screening: one flash, `offset` dB brighter than age-normal. */
export function screenPoint(r: Responder, p: FieldPoint, offset: number, rng: Rng): { flashes: Flash[]; result: PointResult } {
  const db = Math.max(0, Math.min(MAX_DB, expectedDb(p, r.age) - offset));
  const seen = respond(r, p, db, rng);
  return {
    flashes: [{ x: p.x, y: p.y, db, seen }],
    result: { x: p.x, y: p.y, mode: 'screen', db, seen, flashes: 1 },
  };
}

/** Heijl–Krakau catch trial: a bright stimulus into the blind spot. A response = fixation loss. */
export function catchTrial(r: Responder, rng: Rng): Flash {
  const x = r.eye === 'OD' ? BLIND_SPOT.t : -BLIND_SPOT.t;
  const y = BLIND_SPOT.y;
  const seen = rng.next() < r.fixationLoss;
  return { x, y, db: 10, seen, catchTrial: true };
}
