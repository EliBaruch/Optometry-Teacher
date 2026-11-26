import { useEffect, useRef, useState } from 'preact/hooks';
import type { BlurKernel } from './optics';
import { ChartPainter, type ChartFrame } from './chart';
import { useT } from './strings';

export interface ChartViewProps {
  frame: ChartFrame;
  reducedMotion: boolean;
  /** badge shown over the chart while presenting ("1" / "2") */
  badge?: string | null;
  /** small read-out over the chart's corner (phones, where the label row is dropped) */
  caption?: string;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpKernel(a: BlurKernel, b: BlurKernel, t: number): BlurKernel {
  let d = (((b.angle - a.angle) % 180) + 270) % 180 - 90; // shortest path (period 180°)
  if (Math.abs(a.major - a.minor) < 0.05) d = b.angle - a.angle; // circular: angle is irrelevant
  return { major: lerp(a.major, b.major, t), minor: lerp(a.minor, b.minor, t), angle: a.angle + d * t };
}

function lerpFrame(a: ChartFrame, b: ChartFrame, t: number): ChartFrame {
  if (a.layout !== b.layout || !!a.dark !== !!b.dark || a.win !== b.win) return b;
  return {
    layout: b.layout,
    dark: b.dark,
    a: lerpKernel(a.a, b.a, t),
    b: a.b && b.b ? lerpKernel(a.b, b.b, t) : b.b,
    scale: lerp(a.scale, b.scale, t),
    haze: lerp(a.haze, b.haze, t),
    dim: lerp(a.dim, b.dim, t),
    win: b.win,
  };
}

/** The patient's view of the projected chart, with eased focus changes. */
export function ChartView({ frame, reducedMotion, badge, caption }: ChartViewProps) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const painter = useRef<ChartPainter | null>(null);
  const shown = useRef<ChartFrame>(frame);
  const target = useRef<ChartFrame>(frame);
  const raf = useRef(0);
  const [labels, setLabels] = useState<{ y: number; h: number; denom: number }[]>([]);
  const labelKey = useRef('');

  const paint = (f: ChartFrame) => {
    if (!painter.current) return;
    const all = painter.current.draw(f);
    // Drop labels that would collide with the one above (tiny lines on small screens).
    const ls: typeof all = [];
    for (const l of all) {
      const prev = ls[ls.length - 1];
      if (!prev || l.y + l.h / 2 - (prev.y + prev.h / 2) >= 11) ls.push(l);
    }
    const key = ls.map((l) => `${l.denom}:${Math.round(l.y)}`).join('|');
    if (key !== labelKey.current) {
      labelKey.current = key;
      setLabels(ls);
    }
  };

  const animate = () => {
    cancelAnimationFrame(raf.current);
    if (reducedMotion) {
      shown.current = target.current;
      paint(shown.current);
      return;
    }
    const from = shown.current;
    const to = target.current;
    const t0 = performance.now();
    const dur = 220;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      shown.current = lerpFrame(from, to, e);
      paint(shown.current);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const el = wrap.current!;
    painter.current = new ChartPainter(canvas.current!);
    const fit = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      painter.current!.resize(r.width, r.height, window.devicePixelRatio || 1);
      paint(shown.current);
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(raf.current);
      painter.current = null;
    };
  }, []);

  useEffect(() => {
    target.current = frame;
    animate();
  }, [frame]);

  return (
    <div class="php-chart" ref={wrap} dir="ltr">
      <canvas ref={canvas} class="php-chart__canvas" aria-hidden="true" />
      {!frame.dark && frame.layout !== 'balance' && (
        <div class="php-chart__labels" aria-hidden="true">
          {labels.map((l) => (
            <span key={l.denom} style={{ top: `${l.y + l.h / 2}px` }}>20/{l.denom}</span>
          ))}
        </div>
      )}
      {!frame.dark && frame.layout === 'balance' && (
        <div class="php-chart__labels php-chart__labels--balance" aria-hidden="true">
          {labels.map((l) => (
            <span key={l.denom} dir="auto" style={{ top: `${Math.max(10, l.y - 12)}px` }}>{l.denom === -1 ? t.chartTop : t.chartBottom}</span>
          ))}
        </div>
      )}
      {frame.dark && <div class="php-chart__dark" dir="auto">{t.occluded}</div>}
      {caption && <div class="php-chart__cap php-num" aria-hidden="true">{caption}</div>}
      {badge && <div class="php-chart__badge" key={badge}>{badge}</div>}
      <div class="php-chart__vignette" aria-hidden="true" />
    </div>
  );
}
