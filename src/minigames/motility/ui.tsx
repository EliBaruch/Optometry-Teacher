import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Eye } from '@core';
import { Button, Kbd } from '@ui-kit';
import { drawEye, type EyeState } from '@render';
import type { Challenge } from './practice';

export const SKIN_HEX = ['#f7dccb', '#eec3a2', '#d6a27a', '#b77d55', '#8c5a3b', '#5f3b26'];

export interface EyeFrame { OD: EyeState; OS: EyeState }
/**
 * Two live eye canvases (OD on the examiner's left). `frame` is called once per animation frame
 * and may also drive other DOM through refs, so a whole instrument runs from one RAF.
 */
export function EyePair({ frame, covered }: { frame: (dtMs: number, nowMs: number) => EyeFrame; covered?: Eye | null }) {
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
    let raf = 0, last = performance.now(), nextBlink = last + 2500 + Math.random() * 2500, blinkAt = -1;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(64, now - last); last = now;
      if (blinkAt < 0 && now > nextBlink) { blinkAt = now; nextBlink = now + 3000 + Math.random() * 3500; }
      let blink = 1;
      if (blinkAt >= 0) {
        const p = (now - blinkAt) / 170;
        if (p >= 1) blinkAt = -1; else blink = Math.max(0.04, Math.abs(p * 2 - 1));
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
        <div key={e} ref={cells[e]} class={`mot-cell${covered === e ? ' is-covered' : ''}`}>
          <canvas ref={cvs[e]} class="mot-canvas" aria-hidden="true" />
          <span class="mot-eyelab">{e}</span>
          {covered === e ? <span class="mot-occluder" aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  );
}

export interface TutStep { title: string; body: string; keys: string[] }
export function Tutorial({ eyebrow, steps, onClose }: { eyebrow: string; steps: TutStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = steps[i]!;
  const last = i === steps.length - 1;
  return (
    <div class="mot-overlay" role="dialog" aria-modal="true" aria-labelledby="mot-tut-title">
      <div class="mot-card" key={i}>
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
