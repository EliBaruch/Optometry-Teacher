import { useEffect, useRef, useState } from 'preact/hooks';
import type { Eye, PatientFindings, PatientProfile } from '@core';
import { EyeCanvas, eyeStateFromFindings } from '@render';
import { GRID_30_2, pointKey, snapToGrid, temporalOf, type FieldPoint } from './model';
import { frameFor, paintBowlBase, paintBowlLive, toDeg } from './paint';
import type { Flash, PointResult } from './patient';

/** Mutable per-frame state shared with the game (no re-render per flash). */
export interface BowlLiveRef {
  flash: { flash: Flash; at: number; until: number } | null;
  buzzAt: number;
  queued: FieldPoint[];
}

export interface BowlProps {
  eye: Eye;
  results: ReadonlyMap<string, PointResult>;
  version: number;
  live: BowlLiveRef;
  patient: PatientProfile;
  findings: PatientFindings;
  interactive: boolean;
  reduced: boolean;
  glance: { x: number; y: number } | null;
  onFrame: (now: number) => void;
  onTest: (p: FieldPoint) => void;
  onKey?: (e: KeyboardEvent) => boolean;
}

export function describePoint(p: FieldPoint, eye: Eye): string {
  const t = temporalOf(eye, p.x);
  return `${t > 0 ? 'Temporal' : 'Nasal'} ${Math.abs(t)}° · ${p.y > 0 ? 'Superior' : 'Inferior'} ${Math.abs(p.y)}°`;
}

/** Find the next 30-2 location from `from` in a direction (keyboard navigation). */
export function stepFocus(from: FieldPoint, dx: number, dy: number): FieldPoint {
  for (let s = 1; s <= 10; s++) {
    const x = from.x + dx * 6 * s;
    const y = from.y + dy * 6 * s;
    const hit = GRID_30_2.find((p) => p.x === x && p.y === y);
    if (hit) return hit;
    if (Math.abs(x) > 30 || Math.abs(y) > 30) break;
  }
  return from;
}

export function Bowl(props: BowlProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLCanvasElement>(null);
  const top = useRef<HTMLCanvasElement>(null);
  const lamp = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [hover, setHover] = useState<FieldPoint | null>(null);
  const [focus, setFocus] = useState<FieldPoint | null>(null);
  const latest = useRef({ props, hover, focus });
  latest.current = { props, hover, focus };
  const dprRef = useRef(1);

  // measure the stage
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize(Math.max(200, Math.floor(Math.min(r.width, r.height))));
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  // static bowl
  useEffect(() => {
    const c = base.current;
    if (!c || !size) return;
    const dpr = Math.min(2.5, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    dprRef.current = dpr;
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    const g = c.getContext('2d');
    if (g) paintBowlBase(g, c.width, c.height, dpr);
    const t = top.current;
    if (t) {
      t.width = c.width;
      t.height = c.height;
    }
  }, [size]);

  // live layer + engine tick
  useEffect(() => {
    let raf = 0;
    let alive = true;
    const frame = () => {
      if (!alive) return;
      const now = performance.now();
      const { props: p, hover: hv, focus: fc } = latest.current;
      p.onFrame(now);
      const c = top.current;
      const g = c?.getContext('2d');
      if (c && g && c.width) {
        paintBowlLive(g, c.width, c.height, dprRef.current, {
          eye: p.eye,
          results: p.results,
          queued: p.live.queued,
          hover: hv,
          focus: fc,
          flash: p.live.flash,
          age: p.patient.age,
          now,
          reduced: p.reduced,
          interactive: p.interactive,
        });
      }
      const l = lamp.current;
      if (l) l.classList.toggle('is-on', now - p.live.buzzAt < (p.reduced ? 320 : 260));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const pointAt = (e: PointerEvent): FieldPoint | null => {
    const c = top.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const f = frameFor(r.width, r.height);
    const d = toDeg(f, e.clientX - r.left, e.clientY - r.top);
    return snapToGrid(d.x, d.y);
  };

  const down = useRef<{ x: number; y: number } | null>(null);
  const shown = hover ?? focus;
  const monitorState = eyeStateFromFindings(props.findings, props.eye, {
    lighting: 'dim',
    irisColor: props.patient.avatar.irisColor,
    gaze: props.glance ?? { x: 0, y: 0 },
  });

  return (
    <div class="vf-bowl" ref={wrap}>
      <div
        class={`vf-bowl__dish${props.interactive ? ' is-live' : ''}`}
        style={{ width: size, height: size }}
        tabIndex={props.interactive ? 0 : -1}
        role="application"
        aria-roledescription="perimeter bowl"
        aria-label={`Perimeter bowl, ${props.eye === 'OD' ? 'right' : 'left'} eye. Arrow keys choose a test location; Enter or Space presents it.${shown ? ` Selected: ${describePoint(shown, props.eye)}.` : ''}`}
        data-testid="vf-bowl"
        onPointerMove={(e) => {
          if (e.pointerType === 'touch') return;
          const p = pointAt(e);
          if ((p && pointKey(p)) !== (hover && pointKey(hover))) setHover(p);
        }}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const d = down.current;
          down.current = null;
          if (!d || !props.interactive || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
          const p = pointAt(e);
          if (p) {
            setFocus(p);
            props.onTest(p);
          }
        }}
        onFocus={() => {
          if (!focus) setFocus({ x: 3, y: 3 });
        }}
        onBlur={() => setFocus(null)}
        onKeyDown={(e) => {
          if (!props.interactive) return;
          const cur = focus ?? { x: 3, y: 3 };
          const dir: Record<string, [number, number]> = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
          const m = dir[e.key];
          if (m) {
            e.preventDefault();
            e.stopPropagation();
            setHover(null);
            setFocus(stepFocus(cur, m[0], m[1]));
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            props.onTest(cur);
            return;
          }
          if (props.onKey?.(e)) e.stopPropagation();
        }}
      >
        <canvas ref={base} class="vf-bowl__canvas" aria-hidden="true" />
        <canvas ref={top} class="vf-bowl__canvas" aria-hidden="true" />
      </div>

      <div class="vf-monitor" aria-hidden="true">
        <div class="vf-monitor__screen">
          <EyeCanvas state={monitorState} width={112} height={70} animate={!props.reduced} blink reducedMotion={props.reduced} />
          <span class="vf-monitor__rec" />
        </div>
        <span class="vf-monitor__label">Gaze monitor · {props.eye}</span>
      </div>

      <div class="vf-readout" aria-live="off">
        {shown ? describePoint(shown, props.eye) : props.interactive ? 'Choose a location' : '—'}
      </div>

      <div class="vf-buzzer">
        <div class="vf-buzzer__lamp" ref={lamp} data-testid="vf-buzzer" />
        <span>Patient<br />response</span>
      </div>
    </div>
  );
}
