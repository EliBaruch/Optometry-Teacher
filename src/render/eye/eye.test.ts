import { describe, expect, it } from 'vitest';
import { buildFindings, type StainPattern } from '@core';
import { acDepthAtMm, centralAcDepthMm } from './slit';
import { kpDots, lesionSpot, stainGeometry, sunCellCount, vanHerickRatio } from './features';
import { eyeStateFromFindings } from './findings';
import { autoReflexMm, eyeGeometry, HIRSCHBERG_PD_PER_MM, nasalSign, prismToGaze } from './geometry';
import { eyeState } from './types';

const ALL_STAINS: Record<StainPattern, true> = {
  'none': true, 'inferior-punctate': true, 'diffuse-punctate': true, 'linear-abrasion': true, 'dendritic': true,
  'round-ulcer': true, 'vertical-linear-scratches': true, 'interpalpebral': true, 'focal': true,
};

const centroid = (pts: [number, number][]) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);

describe('corneal feature geometry', () => {
  it('produces geometry for every fluorescein pattern (and nothing for none)', () => {
    for (const p of Object.keys(ALL_STAINS) as StainPattern[]) {
      const g = stainGeometry(p, 17);
      const n = g.dots.length + g.lines.length + g.blobs.length;
      if (p === 'none') expect(n).toBe(0);
      else expect(n, p).toBeGreaterThan(0);
      // everything stays on the cornea (radius 5.75 mm)
      const pts = [...g.dots.map((d) => [d.x, d.y]), ...g.lines.flatMap((l) => l.pts), ...g.blobs.flatMap((b) => b.pts)];
      for (const [x, y] of pts) expect(Math.hypot(x!, y!), p).toBeLessThan(6.2);
    }
  });

  it('stains the ulcer and the foreign body exactly where they are drawn in white light', () => {
    for (const seed of [1, 7, 99]) {
      const ulcer = lesionSpot(seed, 'ulcer');
      const [ux, uy] = centroid(stainGeometry('round-ulcer', seed).blobs[0]!.pts);
      expect(Math.hypot(ux - ulcer.x, uy - ulcer.y)).toBeLessThan(0.2);
      const fb = lesionSpot(seed, 'fb');
      const [fx, fy] = centroid(stainGeometry('focal', seed).blobs[0]!.pts);
      expect(Math.hypot(fx - fb.x, fy - fb.y)).toBeLessThan(0.15);
    }
  });

  it('keeps punctate patterns in their anatomical distribution', () => {
    const inf = stainGeometry('inferior-punctate', 3).dots;
    expect(inf.every((d) => d.y > 1.3)).toBe(true);
    const ip = stainGeometry('interpalpebral', 3).dots;
    expect(ip.every((d) => Math.abs(d.y) < 2.9)).toBe(true);
  });

  it('places KPs inferiorly (Arlt triangle) with larger ones lower', () => {
    const kp = kpDots(5);
    expect(kp.every((d) => d.y > 0)).toBe(true);
    const upper = kp.filter((d) => d.y < 2).map((d) => d.r);
    const lower = kp.filter((d) => d.y > 3.5).map((d) => d.r);
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
    expect(avg(lower)).toBeGreaterThan(avg(upper));
  });

  it('is deterministic per seed', () => {
    expect(stainGeometry('dendritic', 42)).toEqual(stainGeometry('dendritic', 42));
    expect(stainGeometry('dendritic', 42)).not.toEqual(stainGeometry('dendritic', 43));
  });
});

describe('anterior chamber grading', () => {
  it('maps Van Herick grades to the right peripheral depth / corneal thickness ratio', () => {
    expect(vanHerickRatio(4)).toBeGreaterThanOrEqual(1);
    expect(vanHerickRatio(3)).toBeGreaterThanOrEqual(0.25);
    expect(vanHerickRatio(3)).toBeLessThanOrEqual(0.5);
    expect(vanHerickRatio(2)).toBeCloseTo(0.25, 5);
    expect(vanHerickRatio(1)).toBeLessThan(0.25);
  });

  it('shallows the periphery per grade while the centre follows the depth grade', () => {
    const base = { acDepth: 'normal' as const, cornealHaze: 0 };
    const p1 = acDepthAtMm(0.96, { ...base, vanHerick: 1 });
    const p4 = acDepthAtMm(0.96, { ...base, vanHerick: 4 });
    expect(p1).toBeLessThan(p4);
    expect(acDepthAtMm(0, { ...base, vanHerick: 1 })).toBeCloseTo(centralAcDepthMm('normal'), 5);
    expect(centralAcDepthMm('shallow')).toBeLessThan(centralAcDepthMm('normal'));
  });

  it('follows the SUN cell bands', () => {
    expect(sunCellCount(0)).toBe(0);
    expect(sunCellCount(0.5)).toBeGreaterThanOrEqual(1);
    expect(sunCellCount(0.5)).toBeLessThanOrEqual(5);
    expect(sunCellCount(1)).toBeGreaterThanOrEqual(6);
    expect(sunCellCount(1)).toBeLessThanOrEqual(15);
    expect(sunCellCount(2)).toBeGreaterThanOrEqual(16);
    expect(sunCellCount(3)).toBeGreaterThanOrEqual(26);
    expect(sunCellCount(4)).toBeGreaterThan(50);
  });
});

describe('eye geometry', () => {
  it('puts the nasal side on the viewer’s right for OD and left for OS', () => {
    expect(nasalSign('OD')).toBe(1);
    expect(nasalSign('OS')).toBe(-1);
    const od = eyeGeometry(680, 380, eyeState({ eye: 'OD' }));
    expect(od.medialCanthus[0]).toBeGreaterThan(od.lateralCanthus[0]);
    const os = eyeGeometry(680, 380, eyeState({ eye: 'OS' }));
    expect(os.medialCanthus[0]).toBeLessThan(os.lateralCanthus[0]);
  });

  it('scales the cornea to ~11.5 mm and the pupil proportionally', () => {
    const g = eyeGeometry(680, 380, eyeState({ pupilMm: 4 }));
    expect((g.irisR * 2) / g.pxmm).toBeCloseTo(11.5, 5);
    expect((g.pupilR * 2) / g.pxmm).toBeCloseTo(4, 5);
  });

  it('decentres the Hirschberg reflex opposite to the turn (~22Δ per mm)', () => {
    // OD turned nasally (eso) → the eye rotates to the viewer's right → reflex shifts temporally (left)
    const g = prismToGaze(22);
    const r = autoReflexMm('OD', { x: g, y: 0 });
    const r0 = autoReflexMm('OD', { x: 0, y: 0 });
    expect(r.x - r0.x).toBeLessThan(0);
    expect(Math.abs(r.x - r0.x) * HIRSCHBERG_PD_PER_MM).toBeGreaterThan(14);
    expect(Math.abs(r.x - r0.x) * HIRSCHBERG_PD_PER_MM).toBeLessThan(30);
    // normal positive angle kappa: reflex slightly nasal
    expect(r0.x).toBeGreaterThan(0);
    expect(autoReflexMm('OS', { x: 0, y: 0 }).x).toBeLessThan(0);
  });
});

describe('eyeStateFromFindings', () => {
  it('produces a quiet eye for a normal exam', () => {
    const s = eyeStateFromFindings(buildFindings(30), 'OD');
    expect(s.redness).toBeLessThan(0.2);
    expect(s.cornealHaze).toBe(0);
    expect(s.lensType).toBe('none');
    expect(s.stain).toBe('none');
    expect(s.pupilMm).toBe(3);
  });

  it('uses the dark pupil size in dim / slit lighting', () => {
    const f = buildFindings(30);
    expect(eyeStateFromFindings(f, 'OD', { lighting: 'dim' }).pupilMm).toBe(6);
    expect(eyeStateFromFindings(f, 'OD', { lighting: 'room' }).pupilMm).toBe(3);
  });

  it('translates acute angle closure', () => {
    const f = buildFindings(66, {
      anterior: { OD: { conjunctiva: ['ciliary-flush'], cornea: ['edema'], anteriorChamber: { depth: 'shallow', vanHerick: 1 } } },
      pupils: { sizeLightMm: { OD: 5.5 }, shape: { OD: 'mid-dilated' } },
    });
    const s = eyeStateFromFindings(f, 'OD');
    expect(s.rednessPattern).toBe('ciliary-flush');
    expect(s.cornealHaze).toBeGreaterThan(0.5);
    expect(s.vanHerick).toBe(1);
    expect(s.pupilMm).toBeGreaterThanOrEqual(5);
    // the other eye stays quiet
    expect(eyeStateFromFindings(f, 'OS').rednessPattern).toBe('diffuse');
  });

  it('maps lens, AC, cornea and stain findings', () => {
    const f = buildFindings(70, {
      anterior: { OS: {
        lens: ['cortical-cataract'], lensGrade: 4, cornea: ['rust-ring', 'keratic-precipitates'],
        anteriorChamber: { hypopyon: true, cells: 3, flare: 2 }, fluorescein: 'focal',
      } },
    });
    const s = eyeStateFromFindings(f, 'OS');
    expect(s.lensType).toBe('cortical');
    expect(s.lensOpacity).toBe(1);
    expect(s.foreignBody).toBe(true);
    expect(s.rustRing).toBe(true);
    expect(s.keraticPrecipitates).toBe(true);
    expect(s.hypopyon).toBeGreaterThan(0);
    expect(s.acCells).toBe(3);
    expect(s.stain).toBe('focal');
  });

  it('turns the deviating eye for a tropia so the reflex decentres', () => {
    const f = buildFindings(6, { motility: { distance: { horizontal: 30, vertical: 0, type: 'tropia', deviatingEye: 'OS' } } });
    const os = eyeStateFromFindings(f, 'OS');
    const od = eyeStateFromFindings(f, 'OD');
    expect(od.gaze.x).toBe(0);
    // OS esotropia: turned nasally = toward the viewer's left for a left eye
    expect(os.gaze.x).toBeLessThan(0);
  });
});
