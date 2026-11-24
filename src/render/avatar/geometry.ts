/**
 * Face geometry for the 200x240 portrait viewBox. Proportions follow classic
 * portrait canons (eye line ~ mid-head for adults, lower for children) and are
 * nudged per patient by stable "traits" hashed from their spec.
 */
import { createRng, hashString, type AvatarSpec } from '@core';
import type { AvatarSex } from './generate';

export const VIEW_W = 200;
export const VIEW_H = 240;
export const CX = 100;

export interface Traits {
  jaw: number; // -1..1 narrow..wide
  faceLen: number; // -1..1 short..long
  eyeSpace: number; // -1..1
  nose: number; // -1..1 narrow..broad
  mouth: number; // -1..1 small..wide
  lips: number; // 0..1 fullness
  brow: number; // 0..1 thickness
  collar: 0 | 1 | 2 | 3;
  frame: string; // glasses frame colour
  partLeft: boolean;
  seed: number;
}

export interface Geo {
  child: number; // 0 adult .. 1 small child
  age: number;
  headTop: number;
  headW: number;
  cheekW: number;
  jawW: number;
  chinY: number;
  chinW: number;
  hairline: number;
  eyeY: number;
  eyeDX: number;
  eyeW: number;
  eyeH: number;
  eyeLow: number;
  irisR: number;
  browY: number;
  browThick: number;
  noseY: number;
  noseW: number;
  mouthY: number;
  mouthW: number;
  lipU: number;
  lipL: number;
  earTop: number;
  earBot: number;
  earW: number;
  neckW: number;
  shoulderY: number;
  shoulderW: number;
}

const FRAMES = ['#1d1820', '#5a3a22', '#7a4b2a', '#c9a35a', '#6e2a3a', '#2d3b55', '#8b8f98'] as const;

export function traitsFor(spec: AvatarSpec, age: number, sex: AvatarSex): Traits {
  const key = `${spec.skin}|${spec.hair}|${spec.hairColor}|${spec.irisColor}|${spec.outfit}|${spec.glasses ?? ''}|${spec.facialHair ?? ''}|${spec.headwear ?? ''}|${spec.accessory ?? ''}|${Math.round(age)}|${sex}`;
  const seed = hashString(key);
  const r = createRng(seed);
  const s = () => r.float(-1, 1);
  return {
    jaw: s(),
    faceLen: s(),
    eyeSpace: s(),
    nose: s(),
    mouth: s(),
    lips: r.next(),
    brow: r.next(),
    collar: r.int(0, 3) as Traits['collar'],
    frame: r.pick(FRAMES),
    partLeft: r.chance(0.5),
    seed,
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function buildGeo(age: number, sex: AvatarSex, t: Traits): Geo {
  // 1 for toddlers, fading to 0 by 15
  const child = clamp((15 - age) / 11, 0, 1);
  const old = clamp((age - 55) / 30, 0, 1);
  const m = sex === 'M' ? 1 : sex === 'F' ? -1 : 0;

  const headW = 38.6 + child * 3 + t.jaw * 0.6;
  const g: Geo = {
    child,
    age,
    headTop: 43 + child * 3 - t.faceLen * 1.2,
    headW,
    cheekW: 39.6 + child * 3.6 + t.jaw * 0.8,
    jawW: 31.5 + child * 3 + t.jaw * 3 + m * 1.6,
    chinY: 160 - child * 11 + t.faceLen * 3 + m * 1.5,
    chinW: 11 + child * 3 + m * 1.6 + t.jaw * 1.2,
    hairline: 0,
    eyeY: 104 + child * 3.5,
    eyeDX: 18.6 + t.eyeSpace * 0.8 - child * 0.3,
    eyeW: 10 + child * 1.3 - old * 0.3,
    eyeH: 5.7 + child * 1.7 - old * 0.4,
    eyeLow: 3.7 + child * 0.6,
    irisR: 5.9 + child * 1,
    browY: 92.2 + child * 3,
    browThick: 0.85 + t.brow * 0.35 + m * 0.18 - child * 0.15,
    noseY: 126 - child * 5 + t.faceLen * 1,
    noseW: 6.8 + t.nose * 1.3 - child * 1.8 + m * 0.4,
    mouthY: 142.5 - child * 7 + t.faceLen * 1.5,
    mouthW: 11.6 + t.mouth * 1.3 - child * 2.4 - m * 0.2,
    lipU: (2.7 + t.lips * 1.2 - m * 0.35) * (1 - old * 0.35),
    lipL: (3.5 + t.lips * 1.4 - m * 0.35) * (1 - old * 0.3),
    earTop: 97 + child * 4,
    earBot: 123 + child * 1 + old * 3,
    earW: 9 + old * 1.2,
    neckW: 16.5 + m * 2 - child * 3.5,
    shoulderY: 0,
    shoulderW: 94 + m * 6 - child * 22,
  };
  g.shoulderY = g.chinY + 30 - child * 5;
  g.hairline = g.headTop + (g.eyeY - g.headTop) * (0.34 + child * 0.04);
  return g;
}

export type Side = -1 | 1;
/** Viewer-left eye (x < CX) is the patient's RIGHT eye (OD). */
export const SIDE_OD: Side = -1;
export const SIDE_OS: Side = 1;

export function eyeCenter(g: Geo, side: Side): { x: number; y: number } {
  return { x: CX + side * g.eyeDX, y: g.eyeY };
}
