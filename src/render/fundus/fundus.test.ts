import { describe, expect, it } from 'vitest';
import { buildFindings, type DeepPartial, type LesionType, type PosteriorSegment } from '@core';
import { canvasToFundus, fundusToCanvas, hitTestFundus } from './geometry';
import { computeFundusLayout, isDetachedAt, layoutToMap } from './layout';
import { fundusMap, paintFundus } from './paint';

const post = (p: DeepPartial<PosteriorSegment> = {}): PosteriorSegment =>
  buildFindings(60, { posterior: { OD: p } }).posterior.OD;

/** Exhaustive: adding a LesionType to core without rendering it fails to compile here. */
const LESION_SET: Record<LesionType, true> = {
  'dot-blot-hemorrhage': true, 'flame-hemorrhage': true, 'microaneurysm': true, 'cotton-wool-spot': true, 'hard-exudate': true,
  'drusen-small': true, 'drusen-large': true, 'geographic-atrophy': true, 'subretinal-hemorrhage': true, 'neovascularization': true,
  'retinal-tear': true, 'lattice': true, 'nevus': true, 'pigment-clumping': true, 'laser-scars': true, 'hollenhorst-plaque': true,
  'retinal-whitening': true, 'cherry-red-spot': true, 'macular-edema': true, 'epiretinal-membrane': true, 'macular-hole': true,
  'disc-hemorrhage': true, 'venous-beading': true, 'irma': true, 'preretinal-hemorrhage': true,
};
const ALL_LESIONS = Object.keys(LESION_SET) as LesionType[];

/** A recording stand-in for CanvasRenderingContext2D (no canvas in tests). */
function mockCtx(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const grad = { addColorStop() {} };
  const target: Record<string, unknown> = {
    canvas: { width: 400, height: 400 },
    createRadialGradient: () => grad,
    createLinearGradient: () => grad,
    createConicGradient: () => grad,
    createPattern: () => null,
    createImageData: undefined,
  };
  const ctx = new Proxy(target, {
    get(t, k: string) {
      if (k in t) return t[k];
      return (...args: unknown[]) => {
        calls.push(`${k}(${args.map((a) => (typeof a === 'number' ? a.toFixed(4) : typeof a)).join(',')})`);
      };
    },
    set(t, k: string, v) {
      t[k] = v;
      calls.push(`${k}=${typeof v === 'number' ? v.toFixed(4) : String(v)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('fundus geometry', () => {
  it('places the disc nasal to the fovea: right of the image for OD, left for OS', () => {
    const od = fundusMap(post(), 'OD', 1);
    const os = fundusMap(post(), 'OS', 1);
    expect(od.disc.x).toBeGreaterThan(od.fovea.x);
    expect(os.disc.x).toBeLessThan(os.fovea.x);
    // ~4.5 mm (≈ 2.5 disc diameters) between disc centre and fovea
    const dMm = Math.hypot(od.disc.x - od.fovea.x, od.disc.y - od.fovea.y) * od.mmPerUnit;
    expect(dMm).toBeGreaterThan(4.2);
    expect(dMm).toBeLessThan(4.8);
    // disc ≈ 1.5–1.9 mm, vertically oval
    expect(od.disc.ry * 2 * od.mmPerUnit).toBeGreaterThan(1.5);
    expect(od.disc.ry * 2 * od.mmPerUnit).toBeLessThan(2.0);
    expect(od.disc.ry).toBeGreaterThan(od.disc.rx);
    // mirror symmetry
    expect(od.disc.x + os.disc.x).toBeCloseTo(1, 5);
  });

  it('honours the vertical cup-to-disc ratio', () => {
    for (const cdr of [0.2, 0.3, 0.5, 0.65, 0.8, 0.9]) {
      const m = fundusMap(post({ disc: { cdr } }), 'OD', 3);
      expect(Math.abs(m.cup.cdr - cdr)).toBeLessThan(0.03);
      expect(m.cup.ry / m.disc.ry).toBeCloseTo(m.cup.cdr, 5);
    }
  });

  it('thins the inferior rim when the ISNT rule is violated inferiorly', () => {
    const L = computeFundusLayout(post({ disc: { cdr: 0.8, rimThinning: 'inferior' } }), 'OD', 2);
    const inferiorRim = 1 - L.cup.r(Math.PI / 2);
    const superiorRim = 1 - L.cup.r(-Math.PI / 2);
    expect(inferiorRim).toBeLessThan(superiorRim);
    const normal = computeFundusLayout(post({ disc: { cdr: 0.4 } }), 'OD', 2);
    expect(1 - normal.cup.r(Math.PI / 2)).toBeGreaterThanOrEqual(1 - normal.cup.r(-Math.PI / 2));
  });

  it('is deterministic per seed and varies between seeds', () => {
    const p = post({ lesions: [{ type: 'dot-blot-hemorrhage', zone: 'diffuse', density: 3 }, { type: 'drusen-small', zone: 'macula', density: 2 }] });
    const a = JSON.stringify(layoutToMap(computeFundusLayout(p, 'OD', 42), { cx: 0.5, cy: 0.5, zoom: 1 }));
    const b = JSON.stringify(layoutToMap(computeFundusLayout(p, 'OD', 42), { cx: 0.5, cy: 0.5, zoom: 1 }));
    const c = JSON.stringify(layoutToMap(computeFundusLayout(p, 'OD', 43), { cx: 0.5, cy: 0.5, zoom: 1 }));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    const v1 = computeFundusLayout(p, 'OD', 42).tree.vessels.map((v) => v.pts.length).join();
    const v2 = computeFundusLayout(p, 'OD', 42).tree.vessels.map((v) => v.pts.length).join();
    expect(v1).toBe(v2);
  });

  it('renders every lesion type as hit-testable marks inside the world', () => {
    for (const type of ALL_LESIONS) {
      const zone = type === 'disc-hemorrhage' ? 'disc' : ['retinal-tear', 'lattice'].includes(type) ? 'periphery' : type.startsWith('drusen') || type.startsWith('macular') || type === 'cherry-red-spot' || type === 'geographic-atrophy' ? 'macula' : 'superotemporal';
      const m = fundusMap(post({ lesions: [{ type, zone, density: 3 }] }), 'OD', 9);
      const mine = m.lesions.filter((l) => l.type === type);
      expect(mine.length, type).toBeGreaterThan(0);
      for (const l of mine) {
        expect(l.x).toBeGreaterThan(-0.01);
        expect(l.x).toBeLessThan(1.01);
        expect(l.y).toBeGreaterThan(-0.01);
        expect(l.y).toBeLessThan(1.01);
        expect(l.r).toBeGreaterThan(0);
        expect(l.source).toBe(0);
      }
      const hit = hitTestFundus(m, mine[0]!.x, mine[0]!.y);
      expect(hit.some((h) => h.type === type), type).toBe(true);
    }
  });

  it('scales lesion counts with density and respects zones', () => {
    const few = fundusMap(post({ lesions: [{ type: 'microaneurysm', zone: 'inferotemporal', density: 1 }] }), 'OD', 5);
    const many = fundusMap(post({ lesions: [{ type: 'microaneurysm', zone: 'inferotemporal', density: 5 }] }), 'OD', 5);
    expect(many.lesions.length).toBeGreaterThan(few.lesions.length);
    for (const l of many.lesions) {
      expect(l.y).toBeGreaterThan(many.fovea.y); // inferior
      expect(l.x).toBeLessThan(many.disc.x); // temporal of the OD disc (image left)
    }
    const mac = fundusMap(post({ lesions: [{ type: 'drusen-large', zone: 'macula', density: 4 }] }), 'OD', 5);
    for (const l of mac.lesions) expect(Math.hypot(l.x - mac.fovea.x, l.y - mac.fovea.y) * mac.mmPerUnit).toBeLessThan(2.6);
  });

  it('models macula-on vs macula-off detachments', () => {
    const off = fundusMap(post({ detachment: { zones: ['superotemporal'], maculaOff: true } }), 'OD', 4);
    const on = fundusMap(post({ detachment: { zones: ['superotemporal'], maculaOff: false } }), 'OD', 4);
    expect(isDetachedAt(off, off.fovea.x, off.fovea.y)).toBe(true);
    expect(isDetachedAt(on, on.fovea.x, on.fovea.y)).toBe(false);
    // superotemporal periphery detached; inferonasal periphery attached
    const st = { x: on.fovea.x - 0.15, y: 0.15 };
    expect(isDetachedAt(on, st.x, st.y)).toBe(true);
    expect(isDetachedAt(on, on.disc.x + 0.1, 0.85)).toBe(false);
    expect(on.lesions.some((l) => l.type === 'retinal-detachment')).toBe(true);
  });

  it('round-trips world ↔ canvas coordinates for any view', () => {
    const view = { cx: 0.62, cy: 0.41, zoom: 2.7 };
    const p = fundusToCanvas(view, 640, 480, 0.7, 0.33);
    const w = canvasToFundus(view, 640, 480, p.x, p.y);
    expect(w.x).toBeCloseTo(0.7, 9);
    expect(w.y).toBeCloseTo(0.33, 9);
    expect(fundusToCanvas(view, 640, 480, 0.62, 0.41)).toEqual({ x: 320, y: 240 });
  });

  it('paints deterministically (same draw calls) and returns the map', () => {
    const p = post({ vessels: { avNicking: true, copperWiring: true }, lesions: ALL_LESIONS.map((type) => ({ type, zone: 'diffuse' as const, density: 2 })), vitreous: 'weiss-ring' });
    const r1 = mockCtx();
    const r2 = mockCtx();
    const m1 = paintFundus(r1.ctx, 400, 400, p, { eye: 'OS', seed: 11 });
    const m2 = paintFundus(r2.ctx, 400, 400, p, { eye: 'OS', seed: 11 });
    expect(r1.calls.length).toBeGreaterThan(500);
    expect(r1.calls.join('\n')).toBe(r2.calls.join('\n'));
    expect(m1).toEqual(m2);
    expect(m1.disc.x).toBeLessThan(m1.fovea.x);
  });

  it('visibly paints every lesion type', () => {
    for (const type of ALL_LESIONS) {
      const base = mockCtx();
      paintFundus(base.ctx, 300, 300, post(), { eye: 'OD', seed: 5 });
      const r = mockCtx();
      paintFundus(r.ctx, 300, 300, post({ lesions: [{ type, zone: type === 'disc-hemorrhage' ? 'disc' : 'superotemporal', density: 3 }] }), { eye: 'OD', seed: 5 });
      // beading modulates the vein calibre (same calls, different widths); everything else adds marks
      if (type === 'venous-beading') expect(r.calls.join('\n'), type).not.toBe(base.calls.join('\n'));
      else expect(r.calls.length, type).toBeGreaterThan(base.calls.length);
    }
  });

  it('places flame haemorrhages along the nerve-fibre direction and near veins', () => {
    const m = computeFundusLayout(post({ lesions: [{ type: 'flame-hemorrhage', zone: 'inferotemporal', density: 4 }] }), 'OD', 12);
    expect(m.lesions.length).toBe(13);
    for (const l of m.lesions) {
      const radial = Math.atan2(l.y - m.a.disc.y, l.x - m.a.disc.x);
      expect(Math.abs(Math.sin(l.a - radial))).toBeLessThan(1e-9);
    }
  });

  it('computes a full pathological layout quickly', () => {
    const p = post({ vessels: { avNicking: true, venousDilation: true, tortuosity: 'increased' }, lesions: ALL_LESIONS.map((type) => ({ type, zone: 'diffuse' as const, density: 5 })), detachment: { zones: ['inferonasal'], maculaOff: false } });
    const t0 = performance.now();
    computeFundusLayout(p, 'OD', 77);
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});
