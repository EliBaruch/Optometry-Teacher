import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng } from '@core';
import { noise1 } from './noise';
import { ParticlePool } from './particles';
import { mix, parseColor, shade } from './color';
import { createFxController } from './engine';

describe('noise1', () => {
  it('is deterministic, bounded and smooth', () => {
    let prev = noise1(0);
    for (let x = 0; x < 20; x += 0.01) {
      const v = noise1(x);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
      expect(Math.abs(v - prev)).toBeLessThan(0.1);
      expect(noise1(x)).toBe(v);
      prev = v;
    }
  });
});

describe('color', () => {
  it('parses hex and rgb and mixes', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('#102030')).toEqual([16, 32, 48]);
    expect(parseColor('rgba(1, 2, 3, 0.5)')).toEqual([1, 2, 3]);
    expect(parseColor('nonsense')).toEqual([128, 128, 128]);
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(shade('#808080', -1)).toBe('#000000');
  });
});

describe('ParticlePool', () => {
  const rng = createRng(7);
  const rand = () => rng.next();

  it('spawns, simulates and expires particles of every kind', () => {
    const pool = new ParticlePool(500);
    for (const k of ['confetti', 'sparks', 'coins', 'stars', 'hearts', 'embers'] as const) {
      expect(pool.spawn(k, 100, 100, 10, undefined, rand)).toBe(10);
    }
    expect(pool.count).toBeGreaterThanOrEqual(60);
    for (let i = 0; i < 400; i++) pool.step(1 / 60);
    expect(pool.count).toBe(0);
  });

  it('applies gravity: coins rise then fall', () => {
    const pool = new ParticlePool(10);
    pool.spawn('coins', 0, 500, 1, undefined, rand);
    const ys: number[] = [];
    for (let i = 0; i < 60; i++) {
      pool.step(1 / 60);
      pool.forEach((p) => p.kind === 'coins' && ys.push(p.y));
    }
    const minY = Math.min(...ys);
    expect(minY).toBeLessThan(500);
    expect(ys[ys.length - 1]!).toBeGreaterThan(minY);
  });

  it('is hard-capped and recycles slots', () => {
    const pool = new ParticlePool(20);
    expect(pool.spawn('sparks', 0, 0, 50, undefined, rand)).toBe(20);
    for (let i = 0; i < 120; i++) pool.step(1 / 30);
    expect(pool.count).toBe(0);
    expect(pool.spawn('stars', 0, 0, 5, '#ff0000', rand)).toBe(5);
  });
});

describe('createFxController', () => {
  let layer: HTMLElement;
  let target: HTMLElement;
  let reduced = false;
  beforeEach(() => {
    vi.useFakeTimers();
    layer = document.createElement('div');
    target = document.createElement('div');
    document.body.append(layer, target);
    reduced = false;
  });
  afterEach(() => {
    vi.useRealTimers();
    layer.remove();
    target.remove();
  });

  it('mounts a canvas and cleans everything up on destroy', () => {
    const fx = createFxController(layer, target, { reducedMotion: () => reduced });
    expect(layer.querySelector('canvas')).not.toBeNull();
    fx.floatText('+120', 50, 50);
    fx.vignette('#ef4444', 500);
    fx.flash();
    fx.burst(10, 10, { kind: 'confetti', count: 10 });
    expect(fx.particleCount).toBeGreaterThan(0);
    fx.destroy();
    expect(layer.children.length).toBe(0);
    expect(fx.particleCount).toBe(0);
  });

  it('reduces particles to ~30% and skips shake/flash under reduced motion', () => {
    reduced = true;
    const fx = createFxController(layer, target, { reducedMotion: () => reduced, random: () => 0.5 });
    fx.burst(0, 0, { kind: 'sparks', count: 20 });
    // 6 sparks + 1 shock ring
    expect(fx.particleCount).toBe(7);
    target.style.transform = 'scale(1)';
    fx.shake(10, 300);
    fx.flash('#fff', 200);
    expect(target.style.transform).toBe('scale(1)');
    expect(layer.querySelectorAll('.lfx-flash').length).toBe(0);
    fx.destroy();
  });

  it('restores the shake target transform exactly', () => {
    const fx = createFxController(layer, target, { reducedMotion: () => false });
    target.style.transform = 'translateX(3px)';
    fx.shake(12, 200);
    fx.destroy();
    expect(target.style.transform).toBe('translateX(3px)');
  });

  it('hitstop toggles the fx-hitstop class', () => {
    const fx = createFxController(layer, target, { reducedMotion: () => false });
    fx.hitstop(80);
    expect(target.classList.contains('fx-hitstop')).toBe(true);
    vi.advanceTimersByTime(200);
    expect(target.classList.contains('fx-hitstop')).toBe(false);
    fx.destroy();
  });
});
