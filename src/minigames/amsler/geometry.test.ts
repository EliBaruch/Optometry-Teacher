import { describe, expect, it } from 'vitest';
import {
  MASK_N, classOf, createMask, iou, maskArea, maskCount, normalizeAmsler, paintDisc, paintStroke,
  scoreEye, scoreExam, scotomaDensity, trueRegionMask, warpOffset,
} from './geometry';

describe('masks', () => {
  it('paints a disc of roughly the right area', () => {
    const m = createMask();
    paintDisc(m, 0, 0, 4, 1);
    const cellArea = (20 / MASK_N) ** 2;
    const area = maskCount(m) * cellArea;
    expect(area).toBeGreaterThan(Math.PI * 16 * 0.92);
    expect(area).toBeLessThan(Math.PI * 16 * 1.08);
  });

  it('erases and reports change', () => {
    const m = createMask();
    expect(paintDisc(m, 0, 0, 2, 1)).toBe(true);
    expect(paintDisc(m, 0, 0, 2, 1)).toBe(false);
    expect(paintDisc(m, 0, 0, 3, 0)).toBe(true);
    expect(maskCount(m)).toBe(0);
  });

  it('clips at the grid edge', () => {
    const m = createMask();
    paintDisc(m, 10, 10, 3, 1);
    expect(maskArea(m)).toBeGreaterThan(0);
    expect(maskArea(m)).toBeLessThan((Math.PI * 9) / 400);
  });

  it('strokes leave no gaps on fast drags', () => {
    const m = createMask();
    paintStroke(m, -8, 0, 8, 0, 0.5, 1);
    // every column along y=0 is marked
    const row = Math.floor(MASK_N / 2);
    let gaps = 0;
    for (let i = 10; i < MASK_N - 10; i++) if (!m[row * MASK_N + i]) gaps++;
    expect(gaps).toBe(0);
  });

  it('iou: identical = 1, disjoint = 0, empty/empty = 1', () => {
    const a = createMask();
    const b = createMask();
    expect(iou(a, b)).toBe(1);
    paintDisc(a, -5, 0, 2, 1);
    expect(iou(a, a)).toBe(1);
    paintDisc(b, 5, 0, 2, 1);
    expect(iou(a, b)).toBe(0);
  });
});

describe('findings', () => {
  it('normalizes missing centre/radius', () => {
    expect(normalizeAmsler({ result: 'metamorphopsia' })).toEqual({ result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 3 });
    expect(normalizeAmsler({ result: 'paracentral-scotoma' }).center.x).not.toBe(0);
    expect(normalizeAmsler({ result: 'central-scotoma', center: { x: 40, y: -40 }, radius: 99 })).toEqual({
      result: 'central-scotoma', center: { x: 10, y: -10 }, radius: 14,
    });
  });

  it('classifies', () => {
    expect(classOf({ result: 'normal' })).toBe('normal');
    expect(classOf({ result: 'metamorphopsia' })).toBe('metamorphopsia');
    expect(classOf({ result: 'central-scotoma' })).toBe('scotoma');
    expect(classOf({ result: 'paracentral-scotoma' })).toBe('scotoma');
  });

  it('true region is empty for normal', () => {
    expect(maskCount(trueRegionMask({ result: 'normal' }))).toBe(0);
    expect(maskCount(trueRegionMask({ result: 'central-scotoma', center: { x: 0, y: 0 }, radius: 2 }))).toBeGreaterThan(0);
  });
});

describe('perception model', () => {
  const meta = { result: 'metamorphopsia' as const, center: { x: 3, y: 2 }, radius: 3 };
  it('warps only metamorphopsia, only near the lesion', () => {
    const near = warpOffset(4, 3, meta, 1);
    expect(Math.hypot(near.dx, near.dy)).toBeGreaterThan(0.05);
    const far = warpOffset(-9, -9, meta, 1);
    expect(Math.hypot(far.dx, far.dy)).toBeLessThan(1e-3);
    expect(warpOffset(4, 3, { result: 'central-scotoma', center: { x: 3, y: 2 }, radius: 3 }, 1)).toEqual({ dx: 0, dy: 0 });
  });

  it('warp scales with strength', () => {
    const a = warpOffset(4, 3, meta, 0.5);
    const b = warpOffset(4, 3, meta, 1);
    expect(b.dx).toBeCloseTo(a.dx * 2, 6);
  });

  it('scotoma is dense in the middle and absent far away', () => {
    const f = { result: 'paracentral-scotoma' as const, center: { x: -3, y: 0 }, radius: 2 };
    expect(scotomaDensity(-3, 0, f)).toBeCloseTo(1, 5);
    expect(scotomaDensity(6, 6, f)).toBe(0);
    expect(scotomaDensity(-3, 0, { result: 'normal' })).toBe(0);
  });
});

describe('scoring', () => {
  const truth = { result: 'metamorphopsia' as const, center: { x: 0, y: 0 }, radius: 4 };

  it('perfect map + right class scores 1', () => {
    const s = scoreEye({ truth, marked: trueRegionMask(truth), chosen: 'metamorphopsia' });
    expect(s.score).toBeCloseTo(1, 5);
    expect(s.classOk).toBe(true);
    expect(s.iou).toBe(1);
  });

  it('wrong class costs ~45%', () => {
    const s = scoreEye({ truth, marked: trueRegionMask(truth), chosen: 'scotoma' });
    expect(s.score).toBeCloseTo(0.55, 5);
  });

  it('a shifted map earns partial credit', () => {
    const m = createMask();
    paintDisc(m, 2, 0, 4, 1);
    const s = scoreEye({ truth, marked: m, chosen: 'metamorphopsia' });
    expect(s.iou!).toBeGreaterThan(0.3);
    expect(s.iou!).toBeLessThan(0.75);
    expect(s.score).toBeGreaterThan(0.6);
    expect(s.score).toBeLessThan(1);
  });

  it('stray marks on a normal grid are penalised', () => {
    const clean = scoreEye({ truth: { result: 'normal' }, marked: createMask(), chosen: 'normal' });
    expect(clean.score).toBe(1);
    const m = createMask();
    paintDisc(m, 0, 0, 5, 1);
    const messy = scoreEye({ truth: { result: 'normal' }, marked: m, chosen: 'normal' });
    expect(messy.score).toBeLessThan(0.8);
  });

  it('exam: perfect only when flawless and timely', () => {
    const perfect = scoreEye({ truth, marked: trueRegionMask(truth), chosen: 'metamorphopsia' });
    const normal = scoreEye({ truth: { result: 'normal' }, marked: createMask(), chosen: 'normal' });
    expect(scoreExam([perfect, normal], 30_000)).toEqual({ accuracy: 1, perfect: true });
    const slow = scoreExam([perfect, normal], 400_000);
    expect(slow.perfect).toBe(false);
    expect(slow.accuracy).toBeGreaterThanOrEqual(0.85);
    expect(slow.accuracy).toBeLessThan(1);
    expect(scoreExam([], 0)).toEqual({ accuracy: 0, perfect: false });
  });
});
