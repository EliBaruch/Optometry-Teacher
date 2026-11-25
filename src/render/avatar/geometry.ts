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
  jaw: number; // -1..1 narrow..wide (square)
  width: number; // -1..1 slim..broad face
  faceLen: number; // -1..1 short..long
  chin: number; // -1..1 pointed..broad chin
  eyeSpace: number; // -1..1
  eyeSize: number; // -1..1
  eyeOpen: number; // -1..1 narrow (hooded) .. round
  eyeTilt: number; // -1..1 down-turned .. up-turned outer canthus
  nose: number; // -1..1 narrow..broad
  noseLen: number; // -1..1 short..long
  mouth: number; // -1..1 small..wide
  lips: number; // 0..1 fullness
  brow: number; // 0..1 thickness
  browArch: number; // -1..1 flat..arched
  ears: number; // -1..1 small..large
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
  /** outer-canthus lift in px (+ = up-turned) */
  eyeTilt: number;
  /** extra lid-crease height (- = hooded) */
  crease: number;
  irisR: number;
  browY: number;
  browThick: number;
  browArch: number;
  noseY: number;
  noseW: number;
  bridgeW: number;
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
  // Sum of two uniforms: most faces near the middle, a few distinctive ones.
  const s = () => (r.float(-1, 1) + r.float(-1, 1)) * 0.62;
  const c1 = (v: number) => Math.max(-1, Math.min(1, v));
  return {
    jaw: c1(s()),
    width: c1(s()),
    faceLen: c1(s()),
    chin: c1(s()),
    eyeSpace: c1(s()),
    eyeSize: c1(s()),
    eyeOpen: c1(s()),
    eyeTilt: c1(s()),
    nose: c1(s()),
    noseLen: c1(s()),
    mouth: c1(s()),
    lips: r.next(),
    brow: r.next(),
    browArch: c1(s()),
    ears: c1(s()),
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
  const adult = 1 - child;
  const old = clamp((age - 55) / 30, 0, 1);
  const m = sex === 'M' ? 1 : sex === 'F' ? -1 : 0;
  // children vary less (baby fat evens faces out)
  const v = 0.45 + adult * 0.55;

  const headW = 38.6 + child * 3 + t.width * 2.4 * v + t.jaw * 0.6;
  const eyeW = 10 + child * 1.3 - old * 0.3 + t.eyeSize * 1.1 * v;
  const g: Geo = {
    child,
    age,
    headTop: 43 + child * 3 - t.faceLen * 2.8 * v,
    headW,
    cheekW: headW + 1 + child * 0.6 + t.width * 0.6 * v,
    jawW: 31.5 + child * 4 + t.jaw * 4.6 * v + t.width * 1.6 * v + m * 1.8 * adult,
    chinY: 160 - child * 16 + t.faceLen * 6 * adult + m * 1.5 * adult,
    chinW: 11 + child * 3 + m * 1.6 * adult + t.jaw * 1.2 + t.chin * 2.6 * v,
    hairline: 0,
    eyeY: 104 + child * 3.5,
    eyeDX: 18.6 + t.eyeSpace * 1.7 * v - child * 0.3 + t.width * 0.6 * v,
    eyeW,
    eyeH: (5.7 + child * 1.7 - old * 0.4) * (1 + t.eyeOpen * 0.17 * v) * (eyeW / 10.4),
    eyeLow: (3.7 + child * 0.6) * (1 + t.eyeOpen * 0.12 * v),
    eyeTilt: t.eyeTilt * 1.7 * v - old * 0.5,
    crease: t.eyeOpen * 1.4 * v - old * 1.1,
    irisR: 5.9 + child * 1 + t.eyeSize * 0.35 * v,
    browY: 92.2 + child * 3 - t.eyeOpen * 0.9 * v,
    browThick: 0.85 + t.brow * 0.42 + m * 0.2 - child * 0.15,
    browArch: 1 + t.browArch * 1.9 * v - m * 0.5,
    noseY: 126 - child * 6.5 + t.faceLen * 1.6 * adult + t.noseLen * 3.4 * v,
    noseW: 6.8 + t.nose * 2.3 * v - child * 1.8 + m * 0.5,
    bridgeW: 4.2 + t.nose * 0.9 * v - child * 0.6,
    mouthY: 142.5 - child * 10 + t.faceLen * 3 * adult + t.noseLen * 1.4 * v,
    mouthW: 11.6 + t.mouth * 2.4 * v - child * 2.4 - m * 0.2,
    lipU: (2.6 + t.lips * 1.9 - m * 0.4) * (1 - old * 0.35),
    lipL: (3.3 + t.lips * 2.2 - m * 0.35) * (1 - old * 0.3),
    earTop: 97 + child * 4 - t.ears * 2.2 * v,
    earBot: 123 + child * 1 + old * 3 + t.ears * 2.4 * v,
    earW: 9 + old * 1.2 + t.ears * 1.7 * v,
    neckW: 16.5 + m * 2 - child * 3.5 + t.width * 1.4 * v,
    shoulderY: 0,
    shoulderW: 94 + m * 6 - child * 22 + t.width * 4 * v,
  };
  g.shoulderY = g.chinY + 30 - child * 5;
  g.hairline = g.headTop + (g.eyeY - g.headTop) * (0.34 + child * 0.04);
  return g;
}

export type Side = -1 | 1;
