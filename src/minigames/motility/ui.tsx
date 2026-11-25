import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Eye } from '@core';
import { Button, Kbd } from '@ui-kit';
import { drawEye, type EyeState } from '@render';
import type { Challenge } from './practice';

export const SKIN_HEX = ['#f7dccb', '#eec3a2', '#d6a27a', '#b77d55', '#8c5a3b', '#5f3b26'];

/** Rest aperture for the examination: a normal wide palpebral fissure unless the case has true ptosis or lid swelling. */
export const openLid = (a: number) => (a < 0.7 ? a : Math.max(a, 1.08));

export interface EyeFrame { OD: EyeState; OS: EyeState }
/**
 * Two live eye canvases (OD on the examiner's left). `frame` is called once per animation frame
 * and may also drive other DOM through refs, so a whole instrument runs from one RAF.
 */
export function EyePair({ frame, covered, flag }: { frame: (dtMs: number, nowMs: number) => EyeFrame; covered?: Eye | null; flag?: Eye | null }) {
  const cvs = { OD: useRef<HTMLCanvasElement>(null), OS: useRef<HTMLCanvasElement>(null) };
  const cells = { OD: useRef<HTMLDivElement>(null), OS: useRef<HTMLDivElement>(null) };
  const live = useRef(frame);
  live.current = frame;
  useEffect(() => {
    const dim = { OD: { w: 0, h: 0, dpr: 1 }, OS: { w: 0, h: 0, dpr: 1 } };
    const measure = () => {
      for (const e of ['OD', 'OS'] as Eye[]) {
        const c = cells[e].current, cv = cvs[e].current;
        if (!c || !cv) continue;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(40, Math.round(c.clientWidth)), h = Math.max(30, Math.round(c.clientHeight));
        dim[e] = { w, h, dpr };
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      }
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(cells.OD.current!);
    let raf = 0, last = performance.now(), nextBlink = last + 3500 + Math.random() * 3500, blinkAt = -1;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(64, now - last); last = now;
      if (blinkAt < 0 && now > nextBlink) { blinkAt = now; nextBlink = now + 3000 + Math.random() * 3500; }
      let blink = 1;
      if (blinkAt >= 0) {
        const p = (now - blinkAt) / 140;
        if (p >= 1) blinkAt = -1; else blink = Math.max(0.1, Math.abs(p * 2 - 1));
      }
      const st = live.current(dt, now);
      for (const e of ['OD', 'OS'] as Eye[]) {
        const cv = cvs[e].current, d = dim[e];
        const g = cv?.getContext('2d');
        if (!cv || !g || !d.w) continue;
        g.setTransform(d.dpr, 0, 0, d.dpr, 0, 0);
        g.clearRect(0, 0, d.w, d.h);
        drawEye(g, d.w, d.h, { ...st[e], lidAperture: st[e].lidAperture * blink }, now / 1000);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, []);
  return (
    <div class="mot-eyes">
      {(['OD', 'OS'] as Eye[]).map((e) => (
        <div key={e} ref={cells[e]} class={`mot-cell${covered === e ? ' is-covered' : ''}${flag === e ? ' is-flag' : ''}`}>
          <canvas ref={cvs[e]} class="mot-canvas" aria-hidden="true" />
          <span class="mot-eyelab">{e}</span>
          {covered === e ? <span class="mot-occluder" aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  );
}

/** Deterministic brow hair strokes: [x1,y1,x2,y2] along a tapered arch, fanning upward then sweeping outward. */
function browHairs(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const N = 46;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const r = Math.sin(i * 12.9898) * 43758.5453; const j = r - Math.floor(r);
    // spine from the medial head (t=0) to the lateral tail (t=1), arched
    const sx = 47 - t * 31, sy = 34.6 - 3.8 * Math.sin(Math.min(1, t * 1.15) * 2.1) + t * t * 5.2;
    const half = (1 - t * 0.85) * 2.6 + 0.4;
    const off = (j - 0.5) * 2 * half;
    const len = 2.4 + (1 - t) * 1.4 + j * 0.8;
    const ang = (-62 + t * 52 + (j - 0.5) * 14) * Math.PI / 180;
    const x = sx, y = sy + off;
    out.push([x, y, x - Math.cos(ang) * len * 1.0, y + Math.sin(ang) * len]);
  }
  return out;
}

/**
 * Crisp, key-lit examiner's-eye portrait drawn as layered SVG. One light from the upper left: brow hair strokes,
 * sharp lid creases with a lit lower edge, an edge-lit nose bridge with crisp alae and nostrils, defined lips.
 * Coordinates are percentages of the stage so the eye canvases line up. `dy` lifts the face (convergence).
 */
export function Face({ dy = 0 }: { dy?: number }) {
  const hairsR = browHairs();
  const mirror = (h: [number, number, number, number]) => `M${100 - h[0]} ${h[1]} L${100 - h[2]} ${h[3]}`;
  return (
    <svg class="mot-face" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="mf-key" cx="30%" cy="22%" r="75%"><stop offset="0" stop-color="#fff1dc" stop-opacity="0.3" /><stop offset="0.55" stop-color="#fff1dc" stop-opacity="0.06" /><stop offset="1" stop-color="#0b0414" stop-opacity="0.45" /></radialGradient>
        <linearGradient id="mf-fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0.62" stop-color="#07030d" stop-opacity="0" /><stop offset="1" stop-color="#07030d" stop-opacity="0.82" /></linearGradient>
        <linearGradient id="mf-nside" x1="0" x2="1"><stop offset="0" stop-color="#fff0d8" stop-opacity="0.2" /><stop offset="0.38" stop-color="#fff0d8" stop-opacity="0" /><stop offset="0.62" stop-color="#1a0a12" stop-opacity="0" /><stop offset="1" stop-color="#1a0a12" stop-opacity="0.34" /></linearGradient>
        <linearGradient id="mf-lip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a404c" /><stop offset="1" stop-color="#c25c68" /></linearGradient>
        <filter id="mf-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.8 2.4" /></filter>
        <filter id="mf-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.38  0 0 0 0 0.32  0 0 0 0.5 -0.14" /></filter>
      </defs>
      <rect width="100" height="100" fill="url(#mf-key)" />
      <g transform={`translate(0 ${dy})`}>
        {/* brows: individual hair strokes over a faint base so they read as hair, not a smudge */}
        <g stroke="#1a0d0a" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke">
          <path d="M16 37.2 C20 31.5 31 28.6 46.8 32.2 C38 32.6 28 33.6 20 38 Z" fill="#1a0d0a" fill-opacity="0.34" stroke="none" />
          <path d="M84 37.2 C80 31.5 69 28.6 53.2 32.2 C62 32.6 72 33.6 80 38 Z" fill="#1a0d0a" fill-opacity="0.34" stroke="none" />
          <path d={hairsR.map((h) => `M${h[0]} ${h[1]} L${h[2]} ${h[3]}`).join(' ')} stroke-width="1.15" stroke-opacity="0.78" />
          <path d={hairsR.map(mirror).join(' ')} stroke-width="1.15" stroke-opacity="0.78" />
        </g>
        {/* soft orbital depth (broad and gentle: it reads as bone structure, not as a halo) */}
        <g fill="#1a0a12" opacity="0.2" filter="url(#mf-soft)"><ellipse cx="50" cy="43" rx="6.5" ry="6" /><path d="M18 40 C28 34 41 34 47 42 C41 38 28 38 18 44 Z" /><path d="M82 40 C72 34 59 34 53 42 C59 38 72 38 82 44 Z" /></g>
        {/* upper lid crease (crisp) with a lit edge just above it, lower-lid shadow line below */}
        <g fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke">
          <path d="M17.5 44 C24 34.6 40 33.8 47 43.6" stroke="#1a0a12" stroke-opacity="0.62" stroke-width="1.3" />
          <path d="M17.5 42.4 C24 33 40 32.2 47 42" stroke="#fff0d8" stroke-opacity="0.2" stroke-width="1" />
          <path d="M82.5 44 C76 34.6 60 33.8 53 43.6" stroke="#1a0a12" stroke-opacity="0.62" stroke-width="1.3" />
          <path d="M82.5 42.4 C76 33 60 32.2 53 42" stroke="#fff0d8" stroke-opacity="0.2" stroke-width="1" />
          <path d="M20.5 61.6 C28 67 40 67 46.5 61" stroke="#1a0a12" stroke-opacity="0.34" stroke-width="1" />
          <path d="M79.5 61.6 C72 67 60 67 53.5 61" stroke="#1a0a12" stroke-opacity="0.34" stroke-width="1" />
        </g>
        {/* nose: one lit plane (left) and one shadow plane (right), crisp alae and nostrils */}
        <path d="M45.2 44 C46.4 56 45.3 65 43.3 71 L56.7 71 C54.7 65 53.6 56 54.8 44 Z" fill="url(#mf-nside)" />
        <path d="M46.2 46 C47.2 56 46.4 64 44.6 70" fill="none" stroke="#fff0d8" stroke-opacity="0.26" stroke-width="1.1" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        <path d="M53.8 46 C52.9 56 53.6 64 55.4 70" fill="none" stroke="#14060e" stroke-opacity="0.3" stroke-width="1.1" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        <ellipse cx="49.2" cy="70.4" rx="2.4" ry="1.7" fill="#fff0d8" fill-opacity="0.3" />
        <path d="M43.2 71.6 C42.4 76.4 45.4 77.8 50 77.8 C54.6 77.8 57.6 76.4 56.8 71.6" fill="none" stroke="#14060e" stroke-opacity="0.5" stroke-width="1.1" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        <path d="M44.6 75 C45.4 73.8 47.8 73.8 48.6 75.4 C47.6 76.4 45.6 76.4 44.6 75 Z M55.4 75 C54.6 73.8 52.2 73.8 51.4 75.4 C52.4 76.4 54.4 76.4 55.4 75 Z" fill="#12050b" fill-opacity="0.8" />
        {/* philtrum, lips */}
        <path d="M48.4 78.6 L47.8 84 M51.6 78.6 L52.2 84" stroke="#14060e" stroke-opacity="0.22" stroke-width="1" vector-effect="non-scaling-stroke" />
        <path d="M40 88 C44 84.6 47 84.2 50 85.8 C53 84.2 56 84.6 60 88 C55 89 45 89 40 88 Z" fill="url(#mf-lip)" fill-opacity="0.92" />
        <path d="M40.6 88.4 C46 90.4 54 90.4 59.4 88.4 C56 94.6 44 94.6 40.6 88.4 Z" fill="url(#mf-lip)" fill-opacity="0.92" />
        <path d="M44.5 91.6 C48 92.8 52 92.8 55.5 91.6" stroke="#ffd6c4" stroke-opacity="0.35" stroke-width="1" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        <path d="M40 88 C46 89.6 54 89.6 60 88" fill="none" stroke="#1a060c" stroke-opacity="0.8" stroke-width="1.1" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      </g>
      <rect width="100" height="100" fill="url(#mf-fall)" />
      <rect width="100" height="100" filter="url(#mf-grain)" opacity="0.2" style="mix-blend-mode:overlay" />
    </svg>
  );
}

/** Auto-clearing status nudge (timer cleaned on unmount). */
export function useNudge(ms = 4200): [string, (t: string) => void] {
  const [text, setText] = useState('');
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [text, (t: string) => { clearTimeout(timer.current); setText(t); if (t) timer.current = window.setTimeout(() => setText(''), ms); }];
}

export interface TutStep { title: string; body: string; keys: string[]; /** CSS selector (within the game) the step spotlights */ target?: string }
interface Spot { x: number; y: number; w: number; h: number }
/**
 * Skippable micro-tutorial. Each step cuts a spotlight hole around the control it describes (no blur, light dim)
 * and docks its card beside it, so the instrument stays visible. Esc skips.
 */
export function Tutorial({ eyebrow, steps, onClose, onStep }: { eyebrow: string; steps: TutStep[]; onClose: () => void; onStep?: (i: number) => void }) {
  const [i, setI] = useState(0);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const ov = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const s = steps[i]!;
  const last = i === steps.length - 1;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Esc skips even if focus has not reached the dialog yet
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);
  useLayoutEffect(() => {
    onStep?.(i);
    let raf = 0, tm = 0;
    const measure = () => {
      const o = ov.current, c = card.current;
      if (!o || !c) return;
      const root = o.parentElement!, O = o.getBoundingClientRect();
      const t = s.target ? root.querySelector<HTMLElement>(s.target) : null;
      const r = t?.getBoundingClientRect();
      const cw = c.offsetWidth, ch = c.offsetHeight, m = 12;
      if (!r || r.width < 4 || r.height < 4) { setSpot(null); setPos({ left: (O.width - cw) / 2, top: (O.height - ch) / 2 }); return; }
      const sp = { x: r.left - O.left - 5, y: r.top - O.top - 5, w: r.width + 10, h: r.height + 10 };
      setSpot(sp);
      const clampX = (x: number) => Math.max(m, Math.min(O.width - cw - m, x));
      const clampY = (y: number) => Math.max(m, Math.min(O.height - ch - m, y));
      const cx = clampX(sp.x + sp.w / 2 - cw / 2), cy = clampY(sp.y + sp.h / 2 - ch / 2);
      if (O.height - (sp.y + sp.h) >= ch + m * 2) setPos({ left: cx, top: sp.y + sp.h + m });
      else if (sp.y >= ch + m * 2) setPos({ left: cx, top: sp.y - ch - m });
      else if (O.width - (sp.x + sp.w) >= cw + m * 2) setPos({ left: sp.x + sp.w + m, top: cy });
      else if (sp.x >= cw + m * 2) setPos({ left: sp.x - cw - m, top: cy });
      else setPos({ left: cx, top: O.height - ch - m });
    };
    measure();
    raf = requestAnimationFrame(() => { measure(); tm = window.setTimeout(measure, 120); });
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); clearTimeout(tm); window.removeEventListener('resize', measure); };
  }, [i]);
  return (
    <div ref={ov} class={`mot-overlay mot-overlay--tut${spot ? ' has-spot' : ''}`} role="dialog" aria-modal="true" aria-labelledby="mot-tut-title">
      {spot ? <div class="mot-spot" style={{ left: `${spot.x}px`, top: `${spot.y}px`, width: `${spot.w}px`, height: `${spot.h}px` }} aria-hidden="true" /> : null}
      <div ref={card} class="mot-card mot-card--tut" key={i} style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : { visibility: 'hidden' }}>
        <p class="mot-eyebrow">{eyebrow} · {i + 1}/{steps.length}</p>
        <h3 id="mot-tut-title" class="mot-card__title">{s.title}</h3>
        <p class="mot-card__body">{s.body}</p>
        <p class="mot-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="mot-dots" aria-hidden="true">{steps.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="mot-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={onClose}>Skip</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? onClose() : setI(i + 1))} autoFocus>
            {last ? 'Start examining' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Multiple-choice recognition challenge shown after practice runs. */
export function ChallengeBox({ c, picked, onPick }: { c: Challenge; picked: number | null; onPick: (i: number) => void }) {
  return (
    <div class="mot-chal">
      <p class="mot-eyebrow">Recognition challenge</p>
      <h4 class="mot-chal__q">{c.question}</h4>
      <div class="mot-chal__opts" role="radiogroup" aria-label={c.question}>
        {c.options.map((o, i) => {
          const state = picked == null ? '' : i === c.correct ? ' is-right' : i === picked ? ' is-wrong' : ' is-dim';
          return (
            <button key={i} type="button" role="radio" aria-checked={picked === i} class={`mot-opt${state}`} disabled={picked != null} onClick={() => onPick(i)}>
              <span class="mot-opt__k">{String.fromCharCode(65 + i)}</span><span>{o}</span>
            </button>
          );
        })}
      </div>
      {picked != null ? (
        <p class={`mot-chal__fb ${picked === c.correct ? 'ok' : 'no'}`} role="status">
          <b>{picked === c.correct ? 'Correct. ' : 'Not quite. '}</b>{c.explain}
        </p>
      ) : null}
    </div>
  );
}

export function Debrief({ title, score, children, challenge, picked, onPick, onFinish, finishLabel }: {
  title: string; score: number; children: ComponentChildren; challenge: Challenge | null; picked: number | null; onPick: (i: number) => void; onFinish: () => void; finishLabel: string;
}) {
  const ready = !challenge || picked != null;
  return (
    <div class="mot-overlay mot-overlay--scroll" role="dialog" aria-modal="true" aria-label={title}>
      <div class="mot-card mot-card--wide">
        <p class="mot-eyebrow">{title}</p>
        <div class="mot-score"><span class="mot-num">{Math.round(score * 100)}</span><small>% technique</small></div>
        {children}
        {challenge ? <ChallengeBox c={challenge} picked={picked} onPick={onPick} /> : null}
        <div class="mot-card__actions">
          <Button variant="primary" trailingIcon="check" disabled={!ready} onClick={onFinish} autoFocus={!challenge}>{finishLabel}</Button>
        </div>
      </div>
    </div>
  );
}
