import { useEffect, useRef } from 'preact/hooks';
import type { AmslerFinding, Eye } from '@core';
import { HALF_DEG, type Mask } from './geometry';
import { CardPainter, layoutFor, toDeg, type CardLayout, type CardState } from './painter';

export interface CardProps {
  finding: AmslerFinding;
  eye: Eye | null;
  /** 1 = show the patient's perception, 0 = the clean card */
  perception: 0 | 1;
  strength: number;
  /** bump to fire the lens ripple */
  rippleKey: number;
  mask: Mask;
  /** changes whenever the mask's contents (or its eye) change */
  maskKey: string;
  sideLabels: 'field' | 'patient';
  showTruth: boolean;
  idle: boolean;
  tool: 'paint' | 'erase';
  brush: number;
  interactive: boolean;
  reducedMotion: boolean;
  onStroke: (ax: number, ay: number, bx: number, by: number, start: boolean) => void;
  onStrokeEnd: () => void;
  onKey: (e: KeyboardEvent) => boolean;
  /** mouse wheel over the live card: +1 grows the brush, -1 shrinks it */
  onWheelBrush?: (dir: 1 | -1) => void;
  label: string;
  locale?: import('@core').Locale;
}

/** px of brass bezel around the canvas (keep in sync with amsler.css) */
const BEZEL = 12;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** The Amsler card canvas: owns its animation loop, pointer + keyboard drawing. */
export function Card(p: CardProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const props = useRef(p);
  props.current = p;
  const st = useRef({
    painter: null as CardPainter | null,
    layout: null as CardLayout | null,
    perception: p.perception as number,
    truth: p.showTruth ? 1 : 0,
    idle: p.idle ? 1 : 0,
    rippleStart: -1,
    cursor: null as CardState['cursor'],
    raf: 0,
    last: 0,
    drawing: false,
    prev: null as { x: number; y: number } | null,
    kb: { x: 0, y: 0, painting: false },
  });

  const kick = () => {
    const s = st.current;
    if (!s.raf) s.raf = requestAnimationFrame(frame);
  };

  const frame = (now: number) => {
    const s = st.current;
    s.raf = 0;
    const P = props.current;
    if (!s.painter || !s.layout) return;
    const dt = s.last ? Math.min(64, now - s.last) : 16;
    s.last = now;
    const rate = P.reducedMotion ? 1 : dt / 380;
    let moving = false;
    const approach = (cur: number, target: number) => {
      if (Math.abs(cur - target) < 0.002) return target;
      moving = true;
      return cur + (target - cur) * Math.min(1, rate * 2.2);
    };
    s.perception = approach(s.perception, P.perception);
    s.truth = approach(s.truth, P.showTruth ? 1 : 0);
    s.idle = approach(s.idle, P.idle ? 1 : 0);
    let ripple = -1;
    if (s.rippleStart >= 0 && !P.reducedMotion) {
      const t = (now - s.rippleStart) / 1300;
      if (t < 1) {
        ripple = easeOut(t);
        moving = true;
      } else s.rippleStart = -1;
    }
    s.painter.draw(s.layout, {
      finding: P.finding,
      eye: P.eye,
      perception: s.perception,
      strength: P.strength,
      ripple,
      mask: P.mask,
      maskKey: P.maskKey,
      sideLabels: P.sideLabels,
      truth: s.truth,
      cursor: P.interactive ? s.cursor : null,
      idle: s.idle,
      locale: P.locale,
    });
    if (moving) s.raf = requestAnimationFrame(frame);
    else s.last = 0;
  };

  // painter + resize
  useEffect(() => {
    const canvas = canvasRef.current!;
    const el = wrap.current!;
    const s = st.current;
    s.painter = new CardPainter(canvas);
    const fit = () => {
      const r = el.getBoundingClientRect();
      const size = Math.max(160, Math.floor(Math.min(r.width, r.height) - BEZEL * 2));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      s.layout = layoutFor(size, dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      s.painter!.resize(s.layout);
      kick();
    };
    fit();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', fit);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.painter = null;
    };
  }, []);

  // wheel over the live card resizes the brush (non-passive so the page does not scroll)
  useEffect(() => {
    const canvas = canvasRef.current!;
    const onWheel = (e: WheelEvent) => {
      const P = props.current;
      if (!P.interactive || !P.onWheelBrush || e.deltaY === 0) return;
      e.preventDefault();
      P.onWheelBrush(e.deltaY < 0 ? 1 : -1);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    if (p.rippleKey > 0) st.current.rippleStart = performance.now();
    kick();
  }, [p.rippleKey]);

  // any visual prop change → redraw
  useEffect(kick, [p.finding, p.eye, p.perception, p.strength, p.maskKey, p.sideLabels, p.showTruth, p.idle, p.tool, p.brush, p.interactive]);

  useEffect(() => {
    const s = st.current;
    if (s.cursor) {
      s.cursor = { ...s.cursor, r: p.brush, erase: p.tool === 'erase' };
      kick();
    }
  }, [p.brush, p.tool]);

  const degAt = (e: PointerEvent) => {
    const s = st.current;
    const r = canvasRef.current!.getBoundingClientRect();
    return toDeg(s.layout!, e.clientX - r.left, e.clientY - r.top);
  };
  const clampG = (v: number) => Math.max(-HALF_DEG - 1, Math.min(HALF_DEG + 1, v));

  const onPointerDown = (e: PointerEvent) => {
    if (!props.current.interactive || !st.current.layout) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
    const d = degAt(e);
    const s = st.current;
    s.drawing = true;
    s.prev = d;
    s.cursor = { x: d.x, y: d.y, r: props.current.brush, erase: props.current.tool === 'erase', keyboard: false };
    props.current.onStroke(d.x, d.y, d.x, d.y, true);
    kick();
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!props.current.interactive || !st.current.layout) return;
    const d = degAt(e);
    const s = st.current;
    s.cursor = { x: d.x, y: d.y, r: props.current.brush, erase: props.current.tool === 'erase', keyboard: false };
    if (s.drawing && s.prev) {
      props.current.onStroke(s.prev.x, s.prev.y, d.x, d.y, false);
      s.prev = d;
    }
    kick();
  };
  const endStroke = () => {
    const s = st.current;
    if (s.drawing) props.current.onStrokeEnd();
    s.drawing = false;
    s.prev = null;
  };
  const onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !st.current.drawing) {
      st.current.cursor = null;
      kick();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (props.current.onKey(e)) return;
    if (!props.current.interactive) return;
    const s = st.current;
    const kb = s.kb;
    const stepDeg = e.shiftKey ? 2 : 0.5;
    let nx = kb.x;
    let ny = kb.y;
    if (e.key === 'ArrowLeft') nx -= stepDeg;
    else if (e.key === 'ArrowRight') nx += stepDeg;
    else if (e.key === 'ArrowUp') ny += stepDeg;
    else if (e.key === 'ArrowDown') ny -= stepDeg;
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!kb.painting) {
        kb.painting = true;
        props.current.onStroke(kb.x, kb.y, kb.x, kb.y, true);
      }
      s.cursor = { x: kb.x, y: kb.y, r: props.current.brush, erase: props.current.tool === 'erase', keyboard: true };
      kick();
      return;
    } else return;
    e.preventDefault();
    nx = clampG(nx);
    ny = clampG(ny);
    if (kb.painting) props.current.onStroke(kb.x, kb.y, nx, ny, false);
    kb.x = nx;
    kb.y = ny;
    s.cursor = { x: nx, y: ny, r: props.current.brush, erase: props.current.tool === 'erase', keyboard: true };
    kick();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && st.current.kb.painting) {
      st.current.kb.painting = false;
      props.current.onStrokeEnd();
    }
  };
  const onFocus = () => {
    const s = st.current;
    if (!s.cursor && props.current.interactive) {
      s.cursor = { x: s.kb.x, y: s.kb.y, r: props.current.brush, erase: props.current.tool === 'erase', keyboard: true };
      kick();
    }
  };
  const onBlur = () => {
    const s = st.current;
    if (s.kb.painting) {
      s.kb.painting = false;
      props.current.onStrokeEnd();
    }
    if (s.cursor?.keyboard) {
      s.cursor = null;
      kick();
    }
  };

  return (
    <div class="amsler-card" ref={wrap} dir="ltr">
      <div class="amsler-card__plate">
        <canvas
          ref={canvasRef}
          class={`amsler-card__canvas${p.interactive ? ' is-live' : ''}`}
          tabIndex={0}
          role="img"
          aria-label={p.label}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <div class="amsler-card__sheen" aria-hidden="true" />
      </div>
    </div>
  );
}
