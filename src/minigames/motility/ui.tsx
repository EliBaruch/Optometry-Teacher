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

/**
 * Sculpted examiner's-eye face drawn as layered SVG (brows, lid creases, under-eye shadow, nose bridge, alae,
 * philtrum, lips, chin and cheek light). Coordinates are percentages of the stage so the eye canvases line up.
 * `dy` lifts the whole face (the convergence stage seats the eyes higher).
 */
export function Face({ dy = 0 }: { dy?: number }) {
  return (
    <svg class="mot-face" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="mf-fore" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff2dc" stop-opacity="0.26" /><stop offset="1" stop-color="#fff2dc" stop-opacity="0" /></radialGradient>
        <radialGradient id="mf-cheek" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd9bd" stop-opacity="0.2" /><stop offset="1" stop-color="#ffd9bd" stop-opacity="0" /></radialGradient>
        <radialGradient id="mf-shade" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#1a0a12" stop-opacity="0.5" /><stop offset="1" stop-color="#1a0a12" stop-opacity="0" /></radialGradient>
        <linearGradient id="mf-bridge" x1="0" x2="1"><stop offset="0" stop-color="#14060e" stop-opacity="0.38" /><stop offset="0.35" stop-color="#14060e" stop-opacity="0" /><stop offset="0.5" stop-color="#fff0d8" stop-opacity="0.16" /><stop offset="0.65" stop-color="#14060e" stop-opacity="0" /><stop offset="1" stop-color="#14060e" stop-opacity="0.38" /></linearGradient>
        <linearGradient id="mf-jaw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07030d" stop-opacity="0" /><stop offset="1" stop-color="#07030d" stop-opacity="0.78" /></linearGradient>
        <linearGradient id="mf-brow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b0e0c" stop-opacity="0.9" /><stop offset="1" stop-color="#1b0e0c" stop-opacity="0.45" /></linearGradient>
        <linearGradient id="mf-lip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e3944" stop-opacity="0.78" /><stop offset="1" stop-color="#b9535f" stop-opacity="0.7" /></linearGradient>
        <filter id="mf-b1" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="0.35 0.55" /></filter>
        <filter id="mf-b2" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="1.1 1.6" /></filter>
        <filter id="mf-b3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4 3.2" /></filter>
        <filter id="mf-noise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0.55 -0.12" /></filter>
      </defs>
      <g transform={`translate(0 ${dy})`}>
        <ellipse cx="50" cy="12" rx="34" ry="13" fill="url(#mf-fore)" />
        <ellipse cx="22" cy="64" rx="17" ry="13" fill="url(#mf-cheek)" /><ellipse cx="78" cy="64" rx="17" ry="13" fill="url(#mf-cheek)" />
        <ellipse cx="50" cy="40" rx="6" ry="5" fill="url(#mf-shade)" opacity="0.55" filter="url(#mf-b3)" />
        {/* brows: tapered, heavier medially, arched */}
        <path d="M15.5 36.5 C19 30.5 30 27.8 46.5 31.4 C37 31.8 27 33 19.5 37.6 Z" fill="url(#mf-brow)" filter="url(#mf-b1)" />
        <path d="M84.5 36.5 C81 30.5 70 27.8 53.5 31.4 C63 31.8 73 33 80.5 37.6 Z" fill="url(#mf-brow)" filter="url(#mf-b1)" />
        {/* upper lid crease + under-eye shadow */}
        <path d="M17.5 45 C24 35.5 40 34.8 47 44.5" fill="none" stroke="#1a0a12" stroke-opacity="0.5" stroke-width="1.5" stroke-linecap="round" vector-effect="non-scaling-stroke" filter="url(#mf-b1)" />
        <path d="M82.5 45 C76 35.5 60 34.8 53 44.5" fill="none" stroke="#1a0a12" stroke-opacity="0.5" stroke-width="1.5" stroke-linecap="round" vector-effect="non-scaling-stroke" filter="url(#mf-b1)" />
        <path d="M19 62 C27 70 41 70 47.5 62" fill="none" stroke="#1a0a12" stroke-opacity="0.34" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke" filter="url(#mf-b2)" />
        <path d="M81 62 C73 70 59 70 52.5 62" fill="none" stroke="#1a0a12" stroke-opacity="0.34" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke" filter="url(#mf-b2)" />
        {/* nose: bridge shading, tip highlight, alae, nostrils */}
        <rect x="42.5" y="42" width="15" height="31" fill="url(#mf-bridge)" filter="url(#mf-b2)" />
        <ellipse cx="50" cy="71" rx="3.2" ry="2.6" fill="#fff0d8" fill-opacity="0.2" filter="url(#mf-b2)" />
        <path d="M43.5 70 C43 75.5 46.5 77 50 77 C53.5 77 57 75.5 56.5 70" fill="none" stroke="#14060e" stroke-opacity="0.38" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke" filter="url(#mf-b1)" />
        <ellipse cx="46.6" cy="75.4" rx="2.1" ry="1" fill="#14060e" fill-opacity="0.7" filter="url(#mf-b1)" /><ellipse cx="53.4" cy="75.4" rx="2.1" ry="1" fill="#14060e" fill-opacity="0.7" filter="url(#mf-b1)" />
        {/* philtrum and lips */}
        <path d="M48.3 78 L47.6 83.4 M51.7 78 L52.4 83.4" stroke="#14060e" stroke-opacity="0.2" stroke-width="1.6" vector-effect="non-scaling-stroke" filter="url(#mf-b1)" />
        <path d="M40 87.6 C44 84.4 47 84 50 85.6 C53 84 56 84.4 60 87.6 C55 88.7 45 88.7 40 87.6 Z" fill="url(#mf-lip)" filter="url(#mf-b1)" />
        <path d="M40.6 88.2 C46 90 54 90 59.4 88.2 C56 94 44 94 40.6 88.2 Z" fill="url(#mf-lip)" fill-opacity="0.85" filter="url(#mf-b1)" />
        <path d="M40.2 87.8 C46 89.4 54 89.4 59.8 87.8" fill="none" stroke="#1a060c" stroke-opacity="0.65" stroke-width="1.2" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        <ellipse cx="50" cy="97" rx="9" ry="2.6" fill="#fff0d8" fill-opacity="0.12" filter="url(#mf-b2)" />
      </g>
      <rect x="0" y="72" width="100" height="28" fill="url(#mf-jaw)" />
      <rect width="100" height="100" filter="url(#mf-noise)" opacity="0.22" style="mix-blend-mode:overlay" />
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
