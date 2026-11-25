import { useEffect, useRef } from 'preact/hooks';
import type { MutableRef } from 'preact/hooks';
import { createScope, type EyeLook, type ScopeArt, type ScopeScene } from './painter';
import type { ReflexGeo } from './optics';

export interface ScopeProps {
  look: EyeLook;
  /** called every animation frame; returns the scene to draw (and receives the drawn geo) */
  frame: MutableRef<(t: number, dt: number) => ScopeScene>;
  onGeo: MutableRef<(geo: ReflexGeo, glow: number) => void>;
  /** pointer position relative to the pupil centre, in pupil radii (x right, y down); null on release */
  onDrag: (p: { x: number; y: number } | null) => void;
  disabled?: boolean;
  label: string;
}

/** The round viewing aperture: a canvas painted every frame + pointer sweeping. */
export function Scope(p: ScopeProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const art = useRef<ScopeArt | null>(null);
  const lookRef = useRef(p.look);
  const live = useRef(p);
  live.current = p;

  useEffect(() => {
    const canvas = cv.current!;
    const box = wrap.current!;
    const a = createScope(canvas);
    art.current = a;
    const fit = () => {
      const r = box.getBoundingClientRect();
      a.resize(Math.max(120, Math.min(r.width, r.height)), Math.min(2, window.devicePixelRatio || 1));
      a.setLook(lookRef.current);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const geo = a.draw(live.current.frame.current(now / 1000, dt));
      live.current.onGeo.current(geo, a.glow());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // pointer sweep (mouse + touch + pen)
    let pid = -1;
    const toPupil = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const Rp = a.pupilCss();
      return { x: (e.clientX - (r.left + r.width / 2)) / Rp, y: (e.clientY - (r.top + r.height / 2)) / Rp };
    };
    const down = (e: PointerEvent) => {
      if (live.current.disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
      pid = e.pointerId;
      try { canvas.setPointerCapture(pid); } catch { /* not capturable */ }
      box.classList.add('is-sweeping');
      live.current.onDrag(toPupil(e));
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      live.current.onDrag(toPupil(e));
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      box.classList.remove('is-sweeping');
      live.current.onDrag(null);
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      art.current = null;
    };
  }, []);

  useEffect(() => {
    lookRef.current = p.look;
    art.current?.setLook(p.look);
  }, [p.look.skin, p.look.iris, p.look.seed, p.look.pupilFrac]);

  return (
    <div class="rt-aperture" ref={wrap}>
      <canvas ref={cv} class="rt-aperture__cv" role="img" aria-label={p.label} />
    </div>
  );
}
