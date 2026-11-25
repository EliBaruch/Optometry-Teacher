import { useEffect, useRef } from 'preact/hooks';
import type { Eye, FieldDefect } from '@core';
import { paintGlyph } from './paint';

/** A tiny field map of a defect pattern, drawn with the same geometric model. */
export function Glyph({ defect, eye, size = 34, tone = 'dark' }: { defect: FieldDefect; eye: Eye; size?: number; tone?: 'dark' | 'gold' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2.5, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    const W = Math.round(size * dpr);
    c.width = W;
    c.height = W;
    const g = c.getContext('2d');
    if (g) paintGlyph(g, W, defect, eye, tone);
  }, [defect, eye, size, tone]);
  return <canvas ref={ref} class="vf-glyph" style={{ width: size, height: size }} aria-hidden="true" />;
}
