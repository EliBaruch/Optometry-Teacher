/**
 * The concrete FxPort: a full-screen particle canvas plus DOM overlays for
 * floating numbers, flashes and vignettes, and a noise-driven camera shake.
 * Framework-free. RAF runs only while something is moving.
 */
import type { BurstOptions, FxPort } from '@core';
import { drawParticles } from './draw';
import { fbm1 } from './noise';
import { DEFAULT_COUNT, ParticlePool, type ParticleKind } from './particles';
import { ensureFxStyles } from './styles';

export interface FxOptions {
  reducedMotion: () => boolean;
  /** Injected for tests; defaults to Math.random. */
  random?: () => number;
}

export interface FxController extends FxPort {
  /** Remove canvas/overlays, cancel RAF and timers, restore the shake target. */
  destroy(): void;
  /** Alive particle count (diagnostics / tests). */
  readonly particleCount: number;
}

const REDUCED_PARTICLES = 0.3;
const MAX_DPR = 2;
const KINDS: readonly ParticleKind[] = ['confetti', 'sparks', 'coins', 'stars', 'hearts', 'embers'];

export function createFxController(layer: HTMLElement, shakeTarget: HTMLElement, opts: FxOptions): FxController {
  ensureFxStyles();
  const rand = opts.random ?? Math.random;
  const pool = new ParticlePool();
  const doc = layer.ownerDocument;
  const win = doc.defaultView ?? window;

  const canvas = doc.createElement('canvas');
  canvas.className = 'lfx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  layer.appendChild(canvas);
  let g: CanvasRenderingContext2D | null = null;
  try {
    g = canvas.getContext('2d');
  } catch {
    g = null;
  }

  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  const resize = () => {
    const r = layer.getBoundingClientRect();
    cssW = Math.max(1, r.width || win.innerWidth);
    cssH = Math.max(1, r.height || win.innerHeight);
    dpr = Math.min(MAX_DPR, win.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  };
  resize();
  win.addEventListener('resize', resize);

  const overlays = new Set<HTMLElement>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let raf = 0;
  let last = 0;
  let frozenUntil = 0;
  let destroyed = false;

  // --- shake state ---------------------------------------------------------
  let shakeBase: string | null = null; // original inline transform while shaking
  let shakeAmp = 0;
  let shakeStart = 0;
  let shakeMs = 0;
  let shakeSeed = 0;

  const now = () => (win.performance ? win.performance.now() : Date.now());
  const reduced = () => {
    try {
      return !!opts.reducedMotion();
    } catch {
      return false;
    }
  };

  const layerOffset = () => {
    const r = layer.getBoundingClientRect();
    return { x: r.left, y: r.top };
  };

  function later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  }

  function addOverlay(el: HTMLElement, keyframes: Keyframe[], timing: KeyframeAnimationOptions) {
    layer.appendChild(el);
    overlays.add(el);
    const done = () => {
      overlays.delete(el);
      el.remove();
    };
    const dur = typeof timing.duration === 'number' ? timing.duration : 600;
    if (typeof el.animate === 'function') {
      try {
        const anim = el.animate(keyframes, timing);
        anim.onfinish = done;
        anim.oncancel = done;
        return;
      } catch {
        /* fall through */
      }
    }
    later(done, dur + ((timing.delay as number) || 0));
  }

  function shakeOffset(t: number) {
    const p = Math.min(1, (t - shakeStart) / Math.max(1, shakeMs));
    const amp = shakeAmp * (1 - p) * (1 - p);
    const k = (t - shakeStart) / 1000 * 18;
    return {
      done: p >= 1,
      x: fbm1(k + shakeSeed) * amp,
      y: fbm1(k + shakeSeed + 31.4) * amp,
      r: fbm1(k + shakeSeed + 77.7) * amp * 0.09,
    };
  }

  function endShake() {
    if (shakeBase !== null) {
      shakeTarget.style.transform = shakeBase;
      shakeBase = null;
    }
    shakeAmp = 0;
  }

  function frame(t: number) {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 1 / 60);
    last = t;
    if (t >= frozenUntil) pool.step(dt);

    if (g) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      if (pool.count > 0) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawParticles(g, pool);
      }
    }

    if (shakeBase !== null) {
      const o = shakeOffset(t);
      if (o.done) endShake();
      else shakeTarget.style.transform = `${shakeBase === 'none' ? '' : shakeBase} translate(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px) rotate(${o.r.toFixed(3)}deg)`.trim();
    }

    if (pool.count > 0 || shakeBase !== null) raf = win.requestAnimationFrame(frame);
    else last = 0;
  }

  function wake() {
    if (!raf && !destroyed) {
      raf = win.requestAnimationFrame(frame);
    }
  }

  const api: FxController = {
    get particleCount() {
      return pool.count;
    },

    burst(x: number, y: number, o: BurstOptions = {}) {
      if (destroyed) return;
      const kind: ParticleKind = o.kind && KINDS.includes(o.kind) ? o.kind : 'confetti';
      let count = Math.max(0, Math.round(o.count ?? DEFAULT_COUNT[kind]));
      if (reduced()) count = Math.max(1, Math.round(count * REDUCED_PARTICLES));
      if (count === 0) return;
      const off = layerOffset();
      const scale = Math.max(0.55, Math.min(1.15, Math.min(cssW, cssH) / 820));
      pool.spawn(kind, x - off.x, y - off.y, count, o.color, rand, scale);
      wake();
    },

    floatText(text: string, x: number, y: number, o: { color?: string; size?: number } = {}) {
      if (destroyed) return;
      const off = layerOffset();
      const el = doc.createElement('div');
      el.className = 'lfx-float';
      el.textContent = text;
      el.setAttribute('aria-hidden', 'true');
      const color = o.color ?? '#ffd27a';
      const size = o.size ?? 30;
      el.style.left = `${x - off.x}px`;
      el.style.top = `${y - off.y}px`;
      el.style.fontSize = `${size}px`;
      el.style.setProperty('--lfx-c', color);
      const rm = reduced();
      const drift = (rand() - 0.5) * 24;
      const kf: Keyframe[] = rm
        ? [
            { opacity: 0, transform: 'translate(-50%,-50%)' },
            { opacity: 1, transform: 'translate(-50%,-50%)', offset: 0.15 },
            { opacity: 1, transform: 'translate(-50%,-50%)', offset: 0.7 },
            { opacity: 0, transform: 'translate(-50%,-50%)' },
          ]
        : [
            { opacity: 0, transform: 'translate(-50%,-50%) translateY(10px) scale(0.5)' },
            { opacity: 1, transform: 'translate(-50%,-50%) translateY(-8px) scale(1.18)', offset: 0.14, easing: 'cubic-bezier(.2,.8,.2,1)' },
            { opacity: 1, transform: 'translate(-50%,-50%) translateY(-22px) scale(1)', offset: 0.3 },
            { opacity: 1, transform: `translate(-50%,-50%) translate(${drift * 0.6}px,-58px) scale(1)`, offset: 0.7 },
            { opacity: 0, transform: `translate(-50%,-50%) translate(${drift}px,-86px) scale(0.92)` },
          ];
      addOverlay(el, kf, { duration: rm ? 1000 : 1250, easing: 'linear', fill: 'forwards' });
    },

    shake(strength = 9, ms = 380) {
      if (destroyed || reduced() || strength <= 0 || ms <= 0) return;
      const t = now();
      if (shakeBase === null) {
        shakeBase = shakeTarget.style.transform || '';
        shakeAmp = strength;
        shakeSeed = rand() * 100;
      } else {
        // combine with a shake already in flight: keep whichever is stronger now
        const p = Math.min(1, (t - shakeStart) / Math.max(1, shakeMs));
        const remaining = shakeAmp * (1 - p) * (1 - p);
        shakeAmp = Math.max(remaining, strength) + Math.min(remaining, strength) * 0.35;
      }
      shakeStart = t;
      shakeMs = ms;
      wake();
    },

    flash(color = '#fff4d6', ms = 260) {
      if (destroyed || reduced()) return;
      const el = doc.createElement('div');
      el.className = 'lfx-flash';
      el.style.background = `radial-gradient(ellipse at center, ${color} 0%, ${color} 45%, transparent 120%)`;
      addOverlay(el, [{ opacity: 0 }, { opacity: 0.78, offset: 0.12 }, { opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    },

    vignette(color: string, ms = 900) {
      if (destroyed) return;
      const el = doc.createElement('div');
      el.className = 'lfx-vignette';
      el.style.setProperty('--lfx-c', color);
      const kf: Keyframe[] = reduced()
        ? [{ opacity: 0 }, { opacity: 0.7, offset: 0.25 }, { opacity: 0 }]
        : [{ opacity: 0 }, { opacity: 1, offset: 0.16 }, { opacity: 0.55, offset: 0.38 }, { opacity: 0.9, offset: 0.58 }, { opacity: 0 }];
      addOverlay(el, kf, { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    },

    hitstop(ms = 90) {
      if (destroyed || ms <= 0) return;
      const until = now() + ms;
      frozenUntil = Math.max(frozenUntil, until);
      shakeTarget.classList.add('fx-hitstop');
      later(() => {
        if (now() + 1 >= frozenUntil) shakeTarget.classList.remove('fx-hitstop');
      }, ms);
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
      win.removeEventListener('resize', resize);
      for (const t of timers) clearTimeout(t);
      timers.clear();
      for (const el of overlays) {
        el.remove();
      }
      overlays.clear();
      endShake();
      shakeTarget.classList.remove('fx-hitstop');
      pool.clear();
      canvas.remove();
    },
  };
  return api;
}
