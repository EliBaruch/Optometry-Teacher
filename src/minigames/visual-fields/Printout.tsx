import { useEffect, useRef, useState } from 'preact/hooks';
import type { Eye, FieldDefect } from '@core';
import { paintPrintout } from './paint';
import type { PointResult } from './patient';

export interface PrintoutProps {
  eye: Eye;
  results: ReadonlyMap<string, PointResult>;
  version: number;
  view: 'grey' | 'numeric';
  size: number;
  fresh?: string | null;
  stimuli: number;
  catches: { trials: number; losses: number };
  truth?: FieldDefect | null;
  reduced: boolean;
  active?: boolean;
  caption?: string;
  onClick?: () => void;
}

/** Ivory greyscale printout that builds up as points are tested. */
export function Printout(p: PrintoutProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [reveal, setReveal] = useState(p.truth ? (p.reduced ? 1 : 0) : 0);

  useEffect(() => {
    if (!p.truth) {
      setReveal(0);
      return;
    }
    if (p.reduced) {
      setReveal(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / 900);
      setReveal(1 - Math.pow(1 - u, 3));
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [p.truth, p.reduced]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2.5, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    const W = Math.round(p.size * dpr);
    if (c.width !== W) {
      c.width = W;
      c.height = W;
    }
    const g = c.getContext('2d');
    if (!g) return;
    paintPrintout(g, W, W, dpr, {
      eye: p.eye,
      results: p.results,
      view: p.view,
      fresh: p.fresh,
      truth: p.truth ? { defect: p.truth, reveal } : null,
    });
  }, [p.eye, p.version, p.view, p.size, p.fresh, p.truth, reveal]);

  const fl = p.catches.trials ? `${p.catches.losses}/${p.catches.trials}` : '0/0';
  const flBad = p.catches.trials >= 3 && p.catches.losses / p.catches.trials > 0.2;
  const Tag = p.onClick ? 'button' : 'div';
  return (
    <Tag
      type={p.onClick ? 'button' : undefined}
      class={`vf-print${p.active ? ' is-active' : ''}${p.onClick ? ' is-button' : ''}`}
      onClick={p.onClick}
      aria-label={p.onClick ? `Select the ${p.eye === 'OD' ? 'right' : 'left'} eye plot` : undefined}
    >
      <div class="vf-print__head">
        <strong>{p.eye}</strong>
        <span>Central 30-2 · GIII white</span>
      </div>
      <div class="vf-print__paper">
        <span class="vf-print__side vf-print__side--l">{p.eye === 'OD' ? 'N' : 'T'}</span>
        <canvas ref={ref} style={{ width: p.size, height: p.size }} aria-hidden="true" />
        <span class="vf-print__side vf-print__side--r">{p.eye === 'OD' ? 'T' : 'N'}</span>
      </div>
      <div class="vf-print__foot">
        <span>Pts <b>{p.results.size}</b></span>
        <span>Stim <b>{p.stimuli}</b></span>
        <span class={flBad ? 'is-bad' : ''}>FL <b>{fl}</b></span>
      </div>
      {p.caption && <div class="vf-print__caption">{p.caption}</div>}
    </Tag>
  );
}
