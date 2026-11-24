import { describe, expect, it } from 'vitest';
import { createRng, type ColorVision } from '@core';
import { opponentDistance, type Vec3 } from './color';
import { inFigure, numberFigure, symbolFigure, DIGITS } from './glyphs';
import { coverage, packCircles } from './packing';
import { BOOKLET, canonicalPlates, dotColors, generatePlates, perceivedColors, plateFigures, readPlate, respond, type EyeVision, type Plate } from './plates';

const eye = (type: ColorVision['type'], severity: ColorVision['severity'] = 'moderate', va = 0): EyeVision => ({ cv: { type, severity }, va });

describe('glyphs', () => {
  it('defines all ten digits', () => {
    expect(Object.keys(DIGITS).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });
  it('masks points on and off the stroke', () => {
    const one = numberFigure('1');
    expect(inFigure(one, 0.05, 0)).toBe(true);
    expect(inFigure(one, 0.7, 0.7)).toBe(false);
    const ring = symbolFigure('circle');
    expect(inFigure(ring, 0, 0)).toBe(false);
    expect(inFigure(ring, 0.576, 0)).toBe(true);
  });
});

describe('circle packing', () => {
  const dots = packCircles(createRng(3));
  it('packs hundreds of non-overlapping dots inside the disc', () => {
    expect(dots.length).toBeGreaterThan(500);
    let bad = 0;
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i]!;
      if (Math.hypot(a.x, a.y) + a.r > 0.986) bad++;
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j]!;
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) bad++;
      }
    }
    expect(bad).toBe(0);
  });
  it('covers most of the plate', () => {
    expect(coverage(dots)).toBeGreaterThan(0.55);
  });
  it('is deterministic for a seed', () => {
    expect(packCircles(createRng(9))).toEqual(packCircles(createRng(9)));
  });
});

describe('booklet', () => {
  it('starts with the demonstration plate and has every plate type', () => {
    expect(BOOKLET[0]!.kind).toBe('demo');
    for (const k of ['transform', 'vanish', 'hidden', 'classify', 'tritan', 'path']) expect(BOOKLET.some((p) => p.kind === k)).toBe(true);
  });
  it('generates transformation plates with differing normal/defective readings', () => {
    for (let s = 0; s < 20; s++) {
      const plates = generatePlates(createRng(s));
      for (const p of plates.filter((x) => x.kind === 'transform')) {
        expect(p.alt).toBeTruthy();
        expect(p.alt).not.toBe(p.key);
      }
      expect(plates.find((p) => p.kind === 'classify')!.key).toHaveLength(2);
    }
  });
});

describe('patient response model', () => {
  const plates = canonicalPlates();
  const byKind = (k: Plate['kind']) => plates.filter((p) => p.kind === k);

  it('a normal observer reads every plate correctly and sees no hidden digit', () => {
    for (const p of plates) expect(respond(p, eye('normal', 'none')).correct).toBe(true);
    expect(readPlate(byKind('hidden')[0]!, eye('normal', 'none')).reading).toBe('');
  });

  it('everyone with adequate acuity reads the demonstration plate', () => {
    for (const t of ['protan', 'deutan', 'tritan', 'acquired-red-green', 'acquired-blue-yellow'] as const) {
      expect(readPlate(plates[0]!, eye(t, 'severe', 0.7)).reading).toBe('12');
    }
  });

  it('nobody reads plates when acuity is too poor', () => {
    const r = respond(plates[0]!, eye('normal', 'none', 1.3));
    expect(r.blur).toBe(true);
    expect(r.correct).toBe(false);
  });

  it('red-green dichromats see transformation digits and the hidden figure', () => {
    const t = byKind('transform')[0]!;
    expect(readPlate(t, eye('deutan', 'severe')).reading).toBe(t.alt);
    const h = byKind('hidden')[0]!;
    expect(readPlate(h, eye('protan', 'moderate')).reading).toBe(h.alt);
    expect(readPlate(byKind('vanish')[0]!, eye('protan', 'severe')).reading).toBe('');
  });

  it('classification plate separates protan from deutan', () => {
    const c = byKind('classify')[0]!;
    expect(readPlate(c, eye('protan', 'severe')).reading).toBe(c.key[1]);
    expect(readPlate(c, eye('deutan', 'severe')).reading).toBe(c.key[0]);
    const mild = readPlate(c, eye('deutan', 'mild'));
    expect(mild.reading).toBe(c.key);
    expect(mild.hint).toBe(c.key[0]);
  });

  it('mild anomalous trichromats only fail the weakest plates', () => {
    const wrong = plates.filter((p) => !respond(p, eye('deutan', 'mild')).correct);
    expect(wrong.length).toBeGreaterThan(0);
    expect(wrong.length).toBeLessThan(4);
    expect(wrong.every((p) => p.strength <= 0.6)).toBe(true);
  });

  it('tritans pass red-green plates but miss blue-yellow symbols', () => {
    for (const p of plates) {
      const r = respond(p, eye('tritan', 'severe'));
      expect(r.correct).toBe(p.kind !== 'tritan');
    }
  });

  it('acquired red-green loss fails screening plates without dichromat transformations', () => {
    const t = byKind('transform')[0]!;
    expect(readPlate(t, eye('acquired-red-green', 'moderate', 0.6)).reading).toBe('');
    expect(readPlate(byKind('hidden')[0]!, eye('acquired-red-green', 'severe', 0.6)).reading).toBe('');
  });

  it('speaks naturally and never echoes internal plate types', () => {
    for (const p of plates) {
      for (const v of [eye('normal', 'none'), eye('deutan'), eye('tritan', 'severe')]) {
        const said = respond(p, v).said;
        expect(said.length).toBeGreaterThan(2);
        expect(said).not.toMatch(/undefined|tritan|deutan|protan/);
      }
    }
  });
});

describe('plate colours', () => {
  const rng = createRng(11);
  const dots = packCircles(rng);
  const plates = canonicalPlates();

  /** mean opponent distance between figure and background dot colours */
  function separation(p: Plate, colors: Vec3[], which: 'a' | 'b'): number {
    const fig = plateFigures(p)[which]!;
    const inn: Vec3[] = [];
    const out: Vec3[] = [];
    dots.forEach((d, i) => (Math.hypot(d.x, d.y) < 0.8 ? (inFigureSafe(fig, d.x, d.y) ? inn : out).push(colors[i]!) : null));
    const mean = (xs: Vec3[]): Vec3 => xs.reduce((a, c) => [a[0] + c[0] / xs.length, a[1] + c[1] / xs.length, a[2] + c[2] / xs.length], [0, 0, 0] as Vec3);
    return opponentDistance(mean(inn), mean(out));
  }
  const inFigureSafe = (f: ReturnType<typeof plateFigures>['a'], x: number, y: number) => (f ? inFigure(f, x, y) : false);

  it('vanishing figure is clear to normals but collapses for a deutan dichromat', () => {
    const p = plates.find((x) => x.kind === 'vanish' && x.strength === 1)!;
    const colors = dotColors(p, dots, createRng(1));
    const normal = separation(p, colors, 'a');
    const deutan = separation(p, perceivedColors(colors, eye('deutan', 'severe')), 'a');
    expect(normal).toBeGreaterThan(deutan * 2.2);
  });

  it('tritan symbol vanishes for a tritan observer only', () => {
    const p = plates.find((x) => x.kind === 'tritan' && x.strength > 0.9)!;
    const colors = dotColors(p, dots, createRng(2));
    const normal = separation(p, colors, 'a');
    expect(separation(p, perceivedColors(colors, eye('deutan', 'severe')), 'a')).toBeGreaterThan(normal * 0.5);
    expect(separation(p, perceivedColors(colors, eye('tritan', 'severe')), 'a')).toBeLessThan(normal * 0.35);
  });

  it('produces in-gamut colours', () => {
    for (const p of plates) {
      for (const c of dotColors(p, dots.slice(0, 120), createRng(p.index))) for (const v of c) expect(v >= 0 && v <= 1).toBe(true);
    }
  });
});
