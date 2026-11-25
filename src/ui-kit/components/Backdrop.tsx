import { useEffect, useRef } from 'preact/hooks';
import { createRng } from '@core';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  VARIANTS, createDrop, createMote, moteAlpha, moteCount, stepDrops, stepMotes,
  type BackdropVariant, type Drop, type Mote,
} from '../lib/backdrop-sim';
import { cx } from '../lib/cx';
import { createFrameSampler, isLiteRendering, needsQualityProbe, onLiteRenderingChange, reportFrameWindow } from '../lib/quality';
import './Backdrop.css';

export type { BackdropVariant } from '../lib/backdrop-sim';

export interface BackdropProps {
  variant?: BackdropVariant;
  /** Rain on glass (defaults per variant). */
  rain?: boolean;
  grain?: boolean;
  vignette?: boolean;
  /** position: fixed (full viewport) instead of absolute (fills parent). */
  fixed?: boolean;
  class?: string;
}

/** Soft disc sprite (bokeh) or star-like sparkle, pre-rendered once per colour. */
function makeSprite(color: string, kind: 'bokeh' | 'spark'): HTMLCanvasElement {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  if (kind === 'bokeh') {
    grd.addColorStop(0, color + 'aa');
    grd.addColorStop(0.72, color + '88');
    grd.addColorStop(0.86, color + 'cc'); // brighter rim: lens bokeh
    grd.addColorStop(1, color + '00');
  } else {
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.12, color + 'ff');
    grd.addColorStop(0.35, color + '55');
    grd.addColorStop(1, color + '00');
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  return c;
}

/**
 * Animated scene background: night gradient + nebula (CSS), drifting light
 * motes / bokeh and optional rain on glass (canvas), film grain and vignette.
 * Cheap by design: sprite blits, DPR capped, pauses when hidden or offscreen,
 * static single frame when reduced motion is on.
 */
export function Backdrop({ variant = 'hub', rain, grain = true, vignette = true, fixed, class: klass }: BackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const spec = VARIANTS[variant];
  const withRain = rain ?? spec.rain;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rng = createRng(`backdrop:${variant}`);
    const rand = () => rng.next();
    const bokehSprites = spec.colors.map((c) => makeSprite(c, 'bokeh'));
    const sparkSprites = spec.colors.map((c) => makeSprite(c, 'spark'));

    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    let drops: Drop[] = [];
    let beads: { x: number; y: number; r: number; a: number }[] = [];
    let t = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nw = Math.max(1, Math.round(rect.width));
      const nh = Math.max(1, Math.round(rect.height));
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motes = Array.from({ length: moteCount(spec, w, h) }, () => createMote(spec, w, h, rand));
      if (withRain) {
        const n = Math.round(Math.min(46, (w * h) / 42000));
        drops = Array.from({ length: n }, () => createDrop(w, h, rand));
        beads = Array.from({ length: Math.round(n * 2.2) }, () => ({ x: rand() * w, y: rand() * h, r: 0.6 + rand() * 2.2, a: 0.08 + rand() * 0.18 }));
      }
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        const a = moteAlpha(m);
        if (a <= 0.003) continue;
        ctx.globalAlpha = a;
        const spr = (m.bokeh ? bokehSprites : sparkSprites)[m.color]!;
        const d = m.bokeh ? m.r * 2 : m.r * 5;
        ctx.drawImage(spr, m.x - d / 2, m.y - d / 2, d, d);
      }
      if (withRain) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        for (const b of beads) {
          ctx.globalAlpha = b.a;
          ctx.fillStyle = '#dfe9ff';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const d of drops) {
          const moving = d.hold <= 0 && d.v > 20;
          const len = moving ? d.len + d.v * 0.06 : 2;
          const grd = ctx.createLinearGradient(d.x, d.y - len, d.x, d.y);
          grd.addColorStop(0, 'rgba(220,232,255,0)');
          grd.addColorStop(1, `rgba(230,238,255,${d.a + 0.1})`);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = grd;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y - len);
          ctx.lineTo(d.x + 0.4, d.y);
          ctx.stroke();
          ctx.fillStyle = `rgba(240,246,255,${d.a + 0.18})`;
          ctx.beginPath();
          ctx.arc(d.x + 0.4, d.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    let raf = 0;
    let last = -1;
    let visible = true;
    // Slow drifting light reads perfectly at ~30 fps; rain streaks want a bit
    // more. Skipping frames lets the compositor idle (and the glass panels'
    // backdrop blur skip recomputing) on the frames in between.
    // On devices that cannot keep up (see lib/quality) drop to a gentler rate.
    const rateFor = (lite: boolean) => (lite ? 1000 / 20 : withRain ? 1000 / 45 : 1000 / 30);
    let frameMs = rateFor(isLiteRendering());
    const offLite = onLiteRenderingChange((lite) => (frameMs = rateFor(lite)));
    const sampler = needsQualityProbe() ? createFrameSampler() : null;
    const loop = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) {
        last = -1;
        sampler?.reset();
        return;
      }
      if (sampler && !sampler.done) {
        const windowMedian = sampler.tick(now);
        if (windowMedian !== null && needsQualityProbe()) reportFrameWindow(windowMedian);
      }
      if (last >= 0 && now - last < frameMs - 2) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 15);
      last = now;
      t += dt;
      stepMotes(motes, dt, w, h, t);
      if (withRain) stepDrops(drops, dt, w, h, rand);
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (reduced || raf || !visible || document.hidden) return;
      last = -1;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entries) => {
            visible = entries.some((e) => e.isIntersecting);
            if (visible) start();
            else stop();
          })
        : null;
    io?.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    start();

    return () => {
      stop();
      offLite();
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [variant, withRain, reduced]);

  return (
    <div class={cx('lm-backdrop', `lm-backdrop--${variant}`, fixed && 'is-fixed', reduced && 'is-static', klass)} aria-hidden="true">
      <div class="lm-backdrop__sky" />
      <div class="lm-backdrop__nebula" />
      <canvas ref={canvasRef} class="lm-backdrop__canvas" />
      {grain && <div class="lm-backdrop__grain" />}
      {vignette && <div class="lm-backdrop__vignette" />}
    </div>
  );
}
