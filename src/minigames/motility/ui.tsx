import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Eye, Locale } from '@core';
import { Button, Kbd } from '@ui-kit';
import { drawEye, type EyeState } from '@render';
import type { Challenge } from './practice';
import { fixBidi, type S } from './strings';

type Tx = typeof S.en;

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

const BROW_HAIRS = 74;
function browHairs(side: 'L' | 'R'): { d: string; o: number; w: number }[] {
  const out: { d: string; o: number; w: number }[] = [];
  const med = side === 'L' ? 43 : 57, lat = side === 'L' ? 8 : 92;
  for (let i = 0; i < BROW_HAIRS; i++) {
    const s = i / (BROW_HAIRS - 1);
    const j = Math.sin(i * 12.9898) * 43758.5453, r = j - Math.floor(j);
    const x = med + (lat - med) * s;
    const arch = 15.2 - 4.4 * Math.sin(Math.PI * Math.min(1, s * 0.92)) + 3.2 * s * s * s;
    const y = arch + (r - 0.5) * 2.4 * (0.6 + 0.4 * Math.sin(Math.PI * s));
    const dir = side === 'L' ? -1 : 1, len = 1.4 + r * 1.2;
    out.push({ d: `M${x.toFixed(2)} ${y.toFixed(2)} q${(dir * len * 0.6).toFixed(2)} ${(-len * 0.7).toFixed(2)} ${(dir * len).toFixed(2)} ${(-len * 0.35 - s * 0.6).toFixed(2)}`, o: 0.5 + r * 0.45, w: 0.8 + r * 1.1 });
  }
  return out;
}
const HAIRS = { L: browHairs('L'), R: browHairs('R') };

/**
 * Soft periocular framing behind the two @render eye canvases: brows, lid-fold and orbital shadow, a gentle nose
 * bridge. Deliberately no nose tip or mouth: the eyes are the subject. `dy` shifts the framing in stage percent.
 */
export function Face({ dy = 0 }: { dy?: number }) {
  return (
    <svg class="mot-face" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <filter id="mf-b4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <filter id="mf-b9" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.4" /></filter>
        <linearGradient id="mf-bridge" x1="0" x2="1">
          <stop offset="0" stop-color="#1a0a0c" stop-opacity="0.16" /><stop offset="0.5" stop-color="#fff0dc" stop-opacity="0.14" /><stop offset="1" stop-color="#1a0a0c" stop-opacity="0.16" />
        </linearGradient>
      </defs>
      <g transform={`translate(0 ${dy})`}>
        <g filter="url(#mf-b9)" fill="#1a0a0c"><ellipse cx="25" cy="22" rx="20" ry="4.5" opacity="0.14" /><ellipse cx="75" cy="22" rx="20" ry="4.5" opacity="0.14" /></g>
        <g filter="url(#mf-b4)" fill="none" stroke="#2a1410" stroke-linecap="round">
          <path d="M8 31 Q25 22.5 43 29" stroke-width="2.4" opacity="0.36" vector-effect="non-scaling-stroke" />
          <path d="M92 31 Q75 22.5 57 29" stroke-width="2.4" opacity="0.36" vector-effect="non-scaling-stroke" />
        </g>
        <rect x="43.5" y="12" width="13" height="70" fill="url(#mf-bridge)" filter="url(#mf-b9)" />
        {(['L', 'R'] as const).map((s) => (
          <g key={s} fill="none" stroke="#150a0a" stroke-linecap="round">
            {HAIRS[s].map((h, i) => <path key={i} d={h.d} opacity={h.o} stroke-width={h.w} vector-effect="non-scaling-stroke" />)}
          </g>
        ))}
      </g>
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
export function Tutorial({ t, loc, eyebrow, steps, onClose, onStep }: { t: Tx; loc: Locale; eyebrow: string; steps: TutStep[]; onClose: () => void; onStep?: (i: number) => void }) {
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
      // narrow screens: park the card at the far edge, away from the highlighted control and the instrument it drives
      if (O.width <= 560) { setPos({ left: cx, top: sp.y + sp.h / 2 > O.height / 2 ? m : O.height - ch - m }); return; }
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
        <p class="mot-card__body">{fixBidi(s.body, loc)}</p>
        <p class="mot-card__keys" dir="ltr">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="mot-dots" aria-hidden="true">{steps.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="mot-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={onClose}>{t.skip}</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? onClose() : setI(i + 1))} autoFocus>
            {last ? t.startExamining : t.next}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Multiple-choice recognition challenge shown after practice runs. */
export function ChallengeBox({ t, loc, c, picked, onPick }: { t: Tx; loc: Locale; c: Challenge; picked: number | null; onPick: (i: number) => void }) {
  return (
    <div class="mot-chal">
      <p class="mot-eyebrow">{t.recognition}</p>
      <h4 class="mot-chal__q">{c.question}</h4>
      <div class="mot-chal__opts" role="radiogroup" aria-label={c.question}>
        {c.options.map((o, i) => {
          const state = picked == null ? '' : i === c.correct ? ' is-right' : i === picked ? ' is-wrong' : ' is-dim';
          return (
            <button key={i} type="button" role="radio" aria-checked={picked === i} class={`mot-opt${state}`} disabled={picked != null} onClick={() => onPick(i)}>
              <span class="mot-opt__k">{String.fromCharCode(65 + i)}</span><span>{fixBidi(o, loc)}</span>
            </button>
          );
        })}
      </div>
      {picked != null ? (
        <p class={`mot-chal__fb ${picked === c.correct ? 'ok' : 'no'}`} role="status">
          <b>{picked === c.correct ? t.correct : t.notQuite}</b>{fixBidi(c.explain, loc)}
        </p>
      ) : null}
    </div>
  );
}

export function Debrief({ t, loc, title, score, children, challenge, picked, onPick, onFinish, finishLabel }: {
  t: Tx; loc: Locale; title: string; score: number; children: ComponentChildren; challenge: Challenge | null; picked: number | null; onPick: (i: number) => void; onFinish: () => void; finishLabel: string;
}) {
  const ready = !challenge || picked != null;
  return (
    <div class="mot-overlay mot-overlay--scroll" role="dialog" aria-modal="true" aria-label={title}>
      <div class="mot-card mot-card--wide">
        <p class="mot-eyebrow">{title}</p>
        <div class="mot-score"><span class="mot-num">{Math.round(score * 100)}</span><small>{t.techniqueSuffix}</small></div>
        {children}
        {challenge ? <ChallengeBox t={t} loc={loc} c={challenge} picked={picked} onPick={onPick} /> : null}
        <div class="mot-card__actions">
          <Button variant="primary" trailingIcon="check" disabled={!ready} onClick={onFinish} autoFocus={!challenge}>{finishLabel}</Button>
        </div>
      </div>
    </div>
  );
}
