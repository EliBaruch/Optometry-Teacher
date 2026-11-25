import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { EYES, hashString, type Eye, type MiniGameContext, type MiniGameDone, type StainPattern } from '@core';
import { Button, Icon, IconButton, ProgressBar } from '@ui-kit';
import { eyeStateFromFindings, stainGeometry } from '@render';
import { BLINK_SECONDS, freshEye, patternCredit, PATTERNS, scoreFluo, tbutCredit, tbutTolerance, VIEW_SECONDS, type FluoEye } from './fluo-model';
import { createFluoPainter, type FluoPainter } from './fluo-paint';
import { makeFluoChallenge } from './fluo-practice';
import { clampPan, viewScale, type Pan } from './geo';
import { MAGS, type Mag } from './model';
import { Challenge, Debrief, Tutorial, type DebriefItem, type TutStep } from './Overlays';
import { fluoReport, STAIN_CARD, STAIN_LABEL, STAIN_MEANING, STAIN_SHORT, tbutOf, TBUT_NORMAL } from './report';

const TUT_KEY = 'lumen.fluorescein.tutorial.v1';
const tutorialSeen = () => { try { return localStorage.getItem(TUT_KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(TUT_KEY, '1'); } catch { /* private mode */ } };

const TUT: TutStep[] = [
  { title: 'Instil one drop, then blink', body: 'Drag the strip onto the eye (or press the button) to touch the lower fornix — one small drop is plenty. Ask the patient to blink so the dye spreads across the cornea.', keys: ['D', 'B'] },
  { title: 'Cobalt blue + yellow barrier', body: 'Switch on the cobalt blue light to excite the dye, then the yellow barrier filter to block the glare. Fluorescein glows green where the epithelium is missing or the tear film pools.', keys: ['C', 'Y'] },
  { title: 'Name the stain, time the film', body: 'Choose the pattern you see. Then press Start: the patient blinks and holds. Press Stop (or T) at the first dark spot in the green tear film — that is the break-up time (normal ≥ 10 s).', keys: ['T'] },
];

interface Toast { text: string; tone: 'good' | 'warn' | 'bad' | 'info'; key: number }
interface Timer { running: boolean; t0: number }

function Glyph({ p, seed }: { p: StainPattern; seed: number }) {
  const g = stainGeometry(p, seed);
  const k = 7.4;
  const pt = (x: number, y: number) => `${(x * k).toFixed(1)},${(y * k).toFixed(1)}`;
  return (
    <svg viewBox="-46 -46 92 92" class="sl-glyphsvg" aria-hidden="true">
      <circle r={42} class="sl-glyphsvg__c" />
      {p === 'none' && <circle r={18} class="sl-glyphsvg__faint" />}
      {g.blobs.map((b, i) => <polygon key={`b${i}`} points={b.pts.map(([x, y]) => pt(x, y)).join(' ')} class="sl-glyphsvg__fill" />)}
      {g.lines.map((l, i) => <polyline key={`l${i}`} points={l.pts.map(([x, y]) => pt(x, y)).join(' ')} class="sl-glyphsvg__line" style={{ strokeWidth: Math.max(2, l.width * k * 1.3) }} />)}
      {p === 'dendritic' && g.lines.map((l, i) => { const e = l.pts[l.pts.length - 1]!; return <circle key={`e${i}`} cx={e[0] * k} cy={e[1] * k} r={3.2} class="sl-glyphsvg__fill" />; })}
      {g.dots.map((d, i) => <circle key={`d${i}`} cx={d.x * k} cy={d.y * k} r={Math.max(1.6, d.r * k * 1.4)} class="sl-glyphsvg__fill" />)}
    </svg>
  );
}

export function Fluorescein({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const f = ctx.findings;
  const practice = ctx.mode === 'practice';
  const reduced = ctx.reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const world = useMemo(() => {
    const iris = ctx.patient.avatar.irisColor;
    const mk = (eye: Eye) => {
      const seed = (hashString(`${ctx.patient.name}|${eye}`) % 9000) + 100;
      return { seed, base: eyeStateFromFindings(f, eye, { irisColor: iris, irisSeed: seed, lighting: 'room' }) };
    };
    return { OD: mk('OD'), OS: mk('OS') };
  }, []);
  const questions = useMemo(() => (practice ? makeFluoChallenge(f, ctx.rng.fork('fluo-challenge')) : []), []);

  const S = useRef({
    eye: 'OD' as Eye,
    mag: 16 as Mag,
    pan: { x: 0, y: 1.2 } as Pan,
    eyes: { OD: freshEye(), OS: freshEye() } as Record<Eye, FluoEye>,
    dyeAt: { OD: -1, OS: -1 } as Record<Eye, number>,
    blinkAt: { OD: -1, OS: -1 } as Record<Eye, number>,
    spreadAt: { OD: -1, OS: -1 } as Record<Eye, number>,
    timer: { OD: { running: false, t0: 0 }, OS: { running: false, t0: 0 } } as Record<Eye, Timer>,
    cobalt: false,
    barrier: false,
    d: 480,
    t0: performance.now(),
    finished: false,
    busy: false,
    last: { OD: 0, OS: 0 } as Record<Eye, number>,
  });
  const [eye, setEyeState] = useState<Eye>('OD');
  const [eyes, setEyes] = useState(S.current.eyes);
  const [mag, setMagState] = useState<Mag>(16);
  const [cobalt, setCobaltState] = useState(false);
  const [barrier, setBarrierState] = useState(false);
  const [clock, setClock] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  const [phase, setPhase] = useState<'exam' | 'challenge' | 'debrief'>('exam');
  const [right, setRight] = useState<boolean[]>([]);
  const [dim, setDim] = useState({ d: 480 });
  const [stripOff, setStripOff] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef(0);
  const timers = useRef<number[]>([]);
  const busy = tutorial || phase !== 'exam';
  S.current.busy = busy;
  const lastSfx = useRef(0);

  const sfx = (id: Parameters<typeof ctx.audio.play>[0], pitch = 1, volume = 0.5) => {
    const now = performance.now();
    if ((id === 'tick' || id === 'dial') && now - lastSfx.current < 60) return;
    lastSfx.current = now;
    ctx.audio.play(id, { pitch, volume });
  };
  const say = (text: string, tone: Toast['tone'] = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ text, tone, key: performance.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 3800);
  };
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => { timers.current = timers.current.filter((x) => x !== id); fn(); }, ms);
    timers.current.push(id);
  };
  const sync = () => setEyes({ OD: { ...S.current.eyes.OD }, OS: { ...S.current.eyes.OS } });
  const cur = () => S.current.eyes[S.current.eye];

  // ── actions
  const instil = () => {
    const s = S.current;
    if (s.busy) return;
    if (s.dyeAt[s.eye] >= 0) { say('One drop is enough — more dye floods the view and dilutes the contrast.', 'info'); return; }
    const t = performance.now();
    s.dyeAt[s.eye] = t;
    cur().dyed = true;
    sync();
    sfx('whoosh', 1.1, 0.5);
    later(reduced ? 0 : 1100, () => { sfx('pop', 1.3, 0.6); const r = canvasRef.current?.getBoundingClientRect(); if (r) ctx.fx.burst(r.left + r.width * 0.55, r.top + r.height * 0.78, { kind: 'sparks', count: 14, color: '#ffe066' }); });
    say('A drop of fluorescein lands in the lower fornix. Ask the patient to blink.', 'good');
  };
  const doBlink = () => {
    const s = S.current;
    if (s.busy) return;
    const t = performance.now();
    s.blinkAt[s.eye] = t;
    s.timer[s.eye] = { running: false, t0: 0 };
    if (s.dyeAt[s.eye] >= 0 && s.spreadAt[s.eye] < 0) {
      s.spreadAt[s.eye] = t;
      cur().blinked = true;
      sync();
      sfx('sparkle', 1, 0.4);
      say('The blink spreads the dye over the cornea.', 'good');
    } else sfx('tick', 0.9, 0.3);
  };
  const setCobalt = (v: boolean) => { S.current.cobalt = v; setCobaltState(v); sfx('lens-click', v ? 1.1 : 0.8); if (v && S.current.dyeAt[S.current.eye] < 0) say('Cobalt blue alone shows nothing — instil fluorescein first.', 'info'); };
  const setBarrier = (v: boolean) => { S.current.barrier = v; setBarrierState(v); sfx('lens-click', v ? 1.3 : 0.9); };
  const setMag = (m: Mag) => { S.current.mag = m; setMagState(m); sfx('lens-click', 1 + MAGS.indexOf(m) * 0.1); };
  const switchEye = (e: Eye) => { if (e === S.current.eye || S.current.busy) return; S.current.eye = e; S.current.pan = { x: 0, y: 1.2 }; setEyeState(e); sfx('lens-click', 0.7); };
  const pickPattern = (p: StainPattern) => {
    if (S.current.busy) return;
    cur().pattern = p;
    sync();
    sfx('select', 1.1, 0.5);
  };
  const ready = () => { const s = S.current; return s.dyeAt[s.eye] >= 0 && s.spreadAt[s.eye] >= 0 && s.cobalt && s.barrier; };
  const startTimer = () => {
    const s = S.current;
    if (s.busy || s.timer[s.eye].running) return;
    if (!ready()) { say('Instil dye, blink, then switch on cobalt blue and the yellow barrier before timing.', 'warn'); sfx('error', 1, 0.4); return; }
    if (cur().tbut.length >= 3) { say('Three readings is the standard — you have enough.', 'info'); return; }
    const t = performance.now();
    s.blinkAt[s.eye] = t;
    s.timer[s.eye] = { running: true, t0: t + BLINK_SECONDS * 1000 };
    sfx('countdown', 1.2, 0.4);
  };
  const stopTimer = () => {
    const s = S.current;
    const tm = s.timer[s.eye];
    if (!tm.running) return;
    const el = Math.max(0, (performance.now() - tm.t0) / 1000);
    s.timer[s.eye] = { running: false, t0: tm.t0 };
    cur().tbut = [...cur().tbut, Math.round(el * 10) / 10];
    s.last[s.eye] = el;
    sync();
    sfx('stamp', 1.1, 0.5);
    say(`Break-up time recorded: ${el.toFixed(1)} s. The patient blinks.`, 'good');
    const stoppedEye = s.eye;
    later(reduced ? 0 : 700, () => { S.current.blinkAt[stoppedEye] = performance.now(); });
  };

  // ── layout
  useEffect(() => {
    const el = stageRef.current!;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const d = Math.max(220, Math.floor(Math.min(r.width - 12, r.height - 12)));
      S.current.d = d;
      setDim({ d });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const painter: FluoPainter = createFluoPainter(canvas);
    let raf = 0;
    let last = performance.now();
    let lastClock = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.06, (now - last) / 1000);
      last = now;
      const s = S.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(s.d * dpr)) { canvas.width = Math.round(s.d * dpr); canvas.height = Math.round(s.d * dpr); }
      const e = s.eye;
      const tm = s.timer[e];
      const truth = tbutOf(f.anterior[e]);
      // view time under cobalt + barrier with dye spread
      if (!s.busy && s.cobalt && s.barrier && s.spreadAt[e] >= 0 && now - s.spreadAt[e] > 1600) {
        const fe = s.eyes[e];
        if (fe.viewed < VIEW_SECONDS + 1) { fe.viewed += dt; if (fe.viewed >= VIEW_SECONDS && fe.viewed - dt < VIEW_SECONDS) { setEyes({ OD: { ...s.eyes.OD }, OS: { ...s.eyes.OS } }); sfx('sparkle', 1.2, 0.35); say('Under cobalt blue the dye glows — choose the pattern you see.', 'good'); } }
      }
      let elapsed = 0;
      if (tm.t0 > 0) elapsed = Math.max(0, (now - tm.t0) / 1000);
      if (tm.running && elapsed > truth + 9) {
        // the patient could not hold any longer
        stopTimerFrom(elapsed);
      }
      if (now - lastClock > 90) { lastClock = now; setClock(tm.running ? elapsed : 0); }
      const breakAge = tm.t0 > 0 && elapsed >= truth && s.blinkAt[e] <= tm.t0 ? elapsed - truth : -1;
      painter.paint({
        base: world[e].base, stain: f.anterior[e].fluorescein, d: s.d, mag: s.mag, pan: s.pan, now, dyeAt: s.dyeAt[e], blinkAt: s.blinkAt[e],
        spreadAt: s.spreadAt[e], cobalt: s.cobalt, barrier: s.barrier, breakAge, seed: world[e].seed, reduced, hasTimer: tm.running,
      });
    };
    const stopTimerFrom = (el: number) => {
      const s = S.current;
      const e = s.eye;
      s.timer[e] = { running: false, t0: s.timer[e].t0 };
      s.eyes[e].tbut = [...s.eyes[e].tbut, Math.round(el * 10) / 10];
      setEyes({ OD: { ...s.eyes.OD }, OS: { ...s.eyes.OS } });
      say('The patient had to blink — reading recorded.', 'warn');
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); painter.dispose(); };
  }, []);

  // ── keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (S.current.busy || e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target as HTMLElement;
      if (tgt?.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'd') instil();
      else if (k === 'b') doBlink();
      else if (k === 'c') setCobalt(!S.current.cobalt);
      else if (k === 'y') setBarrier(!S.current.barrier);
      else if (k === 'e') switchEye(S.current.eye === 'OD' ? 'OS' : 'OD');
      else if (k === 'm') setMag(MAGS[(MAGS.indexOf(S.current.mag) + 1) % 3]!);
      else if (k === 't' || k === ' ') { e.preventDefault(); S.current.timer[S.current.eye].running ? stopTimer() : startTimer(); }
      else if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
        const st = 0.9;
        S.current.pan = clampPan({ x: S.current.pan.x + (k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0), y: S.current.pan.y + (k === 'ArrowUp' ? -st : k === 'ArrowDown' ? st : 0) });
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);
  useEffect(() => () => { clearTimeout(toastTimer.current); timers.current.forEach(clearTimeout); }, []);
  useEffect(() => { if (!tutorial) rootRef.current?.focus({ preventScroll: true }); }, [tutorial]);

  // ── drag the strip onto the eye
  const dragStrip = useRef<{ x: number; y: number } | null>(null);
  const onStripDown = (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    if (busy) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStrip.current = { x: e.clientX, y: e.clientY };
    setStripOff({ x: 0, y: 0 });
  };
  const onStripMove = (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    const d = dragStrip.current;
    if (d) setStripOff({ x: e.clientX - d.x, y: e.clientY - d.y });
  };
  const onStripUp = (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    const d = dragStrip.current;
    dragStrip.current = null;
    setStripOff(null);
    if (!d) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    const r = canvasRef.current!.getBoundingClientRect();
    const onEye = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < r.width / 2;
    if (moved < 6 || onEye) instil();
  };

  // ── pan the view by dragging
  const drag = useRef<{ x: number; y: number; pan: Pan } | null>(null);

  // ── derived
  const fe = eyes[eye];
  const tm = S.current.timer[eye];
  const running = tm.running;
  const rawEl = running ? clock : 0;
  const lastRead = fe.tbut[fe.tbut.length - 1];
  const mean = fe.tbut.length ? fe.tbut.reduce((a, b) => a + b, 0) / fe.tbut.length : null;
  const done4 = (e: FluoEye) => (e.dyed ? 1 : 0) + (e.viewed >= VIEW_SECONDS ? 1 : 0) + (e.pattern ? 1 : 0) + (e.tbut.length ? 1 : 0);
  const prog = (done4(eyes.OD) + done4(eyes.OS)) / 8;
  const canRecord = !!eyes.OD.pattern && !!eyes.OS.pattern;
  const guidance = !fe.dyed ? 'Touch the strip to the lower lid — one small drop is enough.'
    : !fe.blinked ? 'Ask the patient to blink so the dye spreads over the cornea.'
      : !(cobalt && barrier) ? 'Switch on the cobalt blue light, then the yellow barrier filter.'
        : fe.viewed < VIEW_SECONDS ? 'Look closely: stain glows green where the epithelium is damaged.'
          : !fe.pattern ? 'Choose the stain pattern you see.'
            : !fe.tbut.length ? 'Now time the tear film: Start, watch for the first dark spot, then Stop.'
              : `${eye === 'OD' ? 'Right' : 'Left'} eye done — switch eyes (E), repeat, then record.`;

  const record = () => {
    if (!canRecord) { say('Choose a stain pattern for both eyes first.', 'warn'); sfx('error'); return; }
    sfx('stamp', 1, 0.6);
    setPhase(practice ? 'challenge' : 'debrief');
  };
  const score = useMemo(() => scoreFluo(f, eyes), [eyes, phase]);
  const finalAcc = () => (practice && questions.length ? score.accuracy * 0.65 + (right.filter(Boolean).length / questions.length) * 0.35 : score.accuracy);
  const finish = () => {
    if (S.current.finished) return;
    S.current.finished = true;
    done({
      testId: 'fluorescein',
      accuracy: Math.max(0, Math.min(1, finalAcc())),
      timeMs: Math.round(performance.now() - S.current.t0),
      findings: fluoReport(f),
      perfect: score.perfect && (!practice || right.every(Boolean)),
    });
  };
  const debrief = useMemo<{ heading: string; items: DebriefItem[] }[] | null>(() => {
    if (phase !== 'debrief') return null;
    return EYES.map((e) => {
      const a = f.anterior[e];
      const fe2 = eyes[e];
      const pc = patternCredit(a.fluorescein, fe2.pattern);
      const t = tbutOf(a);
      const tc = tbutCredit(t, fe2.tbut);
      const m = fe2.tbut.length ? fe2.tbut.reduce((x, y) => x + y, 0) / fe2.tbut.length : null;
      const tech: string[] = [];
      if (!fe2.dyed) tech.push('no dye instilled');
      else if (!fe2.blinked) tech.push('no blink to spread the dye');
      if (fe2.viewed < VIEW_SECONDS) tech.push('too little time under cobalt + barrier');
      return {
        heading: e === 'OD' ? 'Right eye (OD)' : 'Left eye (OS)',
        items: [
          { label: STAIN_LABEL[a.fluorescein], status: pc >= 1 ? 'found' : pc > 0 ? 'partial' : 'missed', note: pc >= 1 ? STAIN_MEANING[a.fluorescein] : `You chose ${fe2.pattern ? STAIN_SHORT[fe2.pattern] : 'nothing'}. ${STAIN_MEANING[a.fluorescein]}` },
          { label: `TBUT ${t} s${t < TBUT_NORMAL ? ' (reduced)' : ''}`, status: tc >= 1 ? 'found' : tc > 0 ? 'partial' : 'missed', note: m === null ? 'not timed' : `you measured ${m.toFixed(1)} s (±${tbutTolerance(t).toFixed(1)} s counts)` },
          { label: 'Technique', status: tech.length ? 'partial' : 'found', note: tech.length ? tech.join('; ') : undefined },
        ] as DebriefItem[],
      };
    });
  }, [phase]);

  return (
    <div class="sl-root sl-root--fluo" ref={rootRef} tabIndex={-1} data-eye={eye}>
      <header class="sl-head">
        <div class="sl-head__title"><Icon name="fluorescein" size={20} /><span>Fluorescein</span></div>
        <p class="sl-head__hint" key={guidance}>{guidance}</p>
        <div class="sl-seg" role="radiogroup" aria-label="Eye">
          {EYES.map((e) => (
            <button key={e} type="button" role="radio" aria-checked={eye === e} class={`sl-seg__b${eye === e ? ' is-on' : ''}`} onClick={() => switchEye(e)} disabled={busy}>
              {e}{done4(eyes[e]) >= 4 && <Icon name="check" size={13} class="sl-seg__ok" />}
            </button>
          ))}
        </div>
        <div class="sl-seg sl-seg--sm" role="radiogroup" aria-label="Magnification">
          {MAGS.map((m) => <button key={m} type="button" role="radio" aria-checked={mag === m} class={`sl-seg__b${mag === m ? ' is-on' : ''}`} disabled={busy} onClick={() => setMag(m)}>{m}×</button>)}
        </div>
        <IconButton icon="book" label="Show the tutorial" size="sm" onClick={() => setTutorial(true)} />
      </header>

      <div class="sl-main">
        <div class="sl-stage" ref={stageRef}>
          <div class="sl-ocular" style={{ width: `${dim.d}px`, height: `${dim.d}px` }}>
            <canvas
              ref={canvasRef}
              class="sl-canvas sl-canvas--grab"
              style={{ width: `${dim.d}px`, height: `${dim.d}px` }}
              tabIndex={0}
              role="img"
              aria-label="Eye under the biomicroscope. Drag to move the view."
              onPointerDown={(e) => { if (busy) return; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, pan: { ...S.current.pan } }; }}
              onPointerMove={(e) => { const d = drag.current; if (!d) return; const sc = viewScale(S.current.d, S.current.mag); S.current.pan = clampPan({ x: d.pan.x - (e.clientX - d.x) / sc, y: d.pan.y - (e.clientY - d.y) / sc }); }}
              onPointerUp={() => { drag.current = null; }}
              onPointerCancel={() => { drag.current = null; }}
              onWheel={(e) => { if (busy) return; e.preventDefault(); const i = MAGS.indexOf(S.current.mag) + (e.deltaY < 0 ? 1 : -1); if (i >= 0 && i < 3) setMag(MAGS[i]!); }}
            />
            <div class="sl-hud">
              <span>{mag}×</span><i /><span>{cobalt ? 'Cobalt blue' : 'White light'}</span>{barrier && <><i /><span>Barrier</span></>}
            </div>
            {(running || lastRead !== undefined) && (
              <div class={`sl-watch${running ? ' is-running' : ''}`} aria-live="off">
                <b>{(running ? rawEl : lastRead ?? 0).toFixed(1)}</b><small>s</small>
              </div>
            )}
            {toast && <div class={`sl-toast sl-toast--${toast.tone}`} key={toast.key} role="status">{toast.text}</div>}
          </div>
        </div>

        <aside class="sl-panel" aria-label="Fluorescein controls">
          <section class="sl-sec">
            <h4 class="sl-sec__t">1 · Dye <em class={fe.dyed ? 'is-ok' : ''}>{fe.dyed ? (fe.blinked ? 'spread' : 'instilled') : 'none'}</em></h4>
            <div class="sl-dye">
              <button
                type="button"
                class={`sl-strip${stripOff ? ' is-drag' : ''}`}
                style={stripOff ? { transform: `translate(${stripOff.x}px, ${stripOff.y}px) rotate(-8deg)`, transition: 'none' } : undefined}
                onPointerDown={onStripDown} onPointerMove={onStripMove} onPointerUp={onStripUp} onPointerCancel={() => { dragStrip.current = null; setStripOff(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); instil(); } }}
                disabled={busy}
                aria-label="Fluorescein strip: drag onto the eye, or press Enter, to instil a drop"
              >
                <i class="sl-strip__paper" /><i class="sl-strip__tip" /><span>Drag to eye</span>
              </button>
              <Button variant="glass" size="sm" onClick={doBlink} disabled={busy || !fe.dyed} icon="refresh">Blink</Button>
            </div>
          </section>

          <section class="sl-sec">
            <h4 class="sl-sec__t">2 · Light</h4>
            <div class="sl-toggles">
              <button type="button" role="switch" aria-checked={cobalt} class={`sl-sw${cobalt ? ' is-on' : ''}`} onClick={() => setCobalt(!cobalt)} disabled={busy}><i class="sl-swatch sl-swatch--cobalt" />Cobalt<kbd>C</kbd></button>
              <button type="button" role="switch" aria-checked={barrier} class={`sl-sw sl-sw--yellow${barrier ? ' is-on' : ''}`} onClick={() => setBarrier(!barrier)} disabled={busy}><i class="sl-swatch sl-swatch--yellow" />Barrier<kbd>Y</kbd></button>
            </div>
          </section>

          <section class="sl-sec">
            <h4 class="sl-sec__t">3 · Pattern <em class={fe.pattern ? 'is-ok' : ''}>{fe.pattern ? STAIN_SHORT[fe.pattern] : 'choose'}</em></h4>
            <div class="sl-patterns" role="radiogroup" aria-label="Stain pattern">
              {PATTERNS.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={fe.pattern === p} class={`sl-pat${fe.pattern === p ? ' is-on' : ''}`} onClick={() => pickPattern(p)} disabled={busy} title={STAIN_LABEL[p]}>
                  <Glyph p={p} seed={world[eye].seed} />
                  <span>{STAIN_CARD[p]}</span>
                </button>
              ))}
            </div>
          </section>

          <section class="sl-sec">
            <h4 class="sl-sec__t">4 · Tear break-up time{mean !== null && <em class="is-ok">mean {mean.toFixed(1)} s</em>}</h4>
            <div class="sl-tbut">
              <div class={`sl-stopwatch${running ? ' is-running' : ''}`}><b>{(running ? rawEl : lastRead ?? 0).toFixed(1)}</b><small>s</small></div>
              {running
                ? <Button variant="danger" size="sm" onClick={stopTimer} icon="pause">Stop <kbd class="sl-kbd">T</kbd></Button>
                : <Button variant="primary" size="sm" onClick={startTimer} disabled={busy} icon="play">{fe.tbut.length ? 'Repeat' : 'Start'} <kbd class="sl-kbd">T</kbd></Button>}
            </div>
            <div class="sl-reads" aria-label="Readings">{[0, 1, 2].map((i) => <span key={i} class={fe.tbut[i] !== undefined ? 'is-on' : ''}>{fe.tbut[i] !== undefined ? `${fe.tbut[i]!.toFixed(1)} s` : '—'}</span>)}</div>
          </section>
        </aside>
      </div>

      <footer class="sl-foot">
        <div class="sl-foot__prog">
          <ProgressBar value={prog} max={1} size="sm" accent="var(--lm-gold)" ariaLabel="Test completeness" label="Test" valueText={`${done4(eyes.OD) + done4(eyes.OS)}/8`} />
        </div>
        <Button variant="primary" icon="check" onClick={record} disabled={busy} class={canRecord ? 'sl-rec is-ready' : 'sl-rec'}>Record findings</Button>
      </footer>

      {tutorial && <Tutorial eyebrow="Fluorescein" steps={TUT} cta="Start the test" onClose={() => { markSeen(); setTutorial(false); }} />}
      {phase === 'challenge' && <Challenge questions={questions} audio={ctx.audio as never} onFinish={(r) => { setRight(r); setPhase('debrief'); }} />}
      {phase === 'debrief' && debrief && (
        <Debrief
          title="Fluorescein test"
          accuracy={finalAcc()}
          perfect={score.perfect}
          groups={debrief}
          stats={[
            { label: 'patterns right', value: `${EYES.filter((e) => patternCredit(f.anterior[e].fluorescein, eyes[e].pattern) >= 1).length}/2` },
            { label: 'TBUT in range', value: `${EYES.filter((e) => tbutCredit(tbutOf(f.anterior[e]), eyes[e].tbut) >= 1).length}/2` },
          ]}
          challenge={practice && questions.length ? { right: right.filter(Boolean).length, total: questions.length } : undefined}
          finishLabel={practice ? 'Finish' : 'Add to chart'}
          onFinish={finish}
        />
      )}
    </div>
  );
}
