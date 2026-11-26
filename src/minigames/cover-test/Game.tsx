import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Eye, MiniGameContext, MiniGameDone, PatientFindings } from '@core';
import { Button, Icon, ProgressBar } from '@ui-kit';
import { pickStrings } from '@core';
import { fix, S } from './strings';
import { LocaleContext } from './locale';
import { drawEye, eyeStateFromFindings, type EyeState } from '@render';
import {
  CoverSim, NEAR_CONVERGENCE, baseWord, turnToGaze, truthOf, TARGETS, type Dir, type Kind, type Prism, type Target, type Truth,
} from './model';
import { scoreCall, totalScore, type Call } from './scoring';
import { makeChallenge, type Challenge } from './practice';
import { reportFor } from './report';
import { PrismBar } from './PrismBar';
import { Tutorial } from './Tutorial';
import { Debrief } from './Debrief';
import { Face } from './Face';

const SKIN_HEX = ['#f7dccb', '#eec3a2', '#d6a27a', '#b77d55', '#8c5a3b', '#5f3b26'];
const ORTHO = { horizontal: 0, vertical: 0, type: 'ortho' as const };
const EYES_LIST: Eye[] = ['OD', 'OS'];
const EYE_ASPECT = 1.9;
/** Visual gain on the eye turn so small deviations stay readable (render only; truth unchanged). */
const GAZE_GAIN = 1.35;
interface Draft { kind: Kind | null; dir: Dir | null; eye: 'OD' | 'OS' | 'alternating' | null }
const EMPTY: Draft = { kind: null, dir: null, eye: null };
const KIND_IDS: Kind[] = ['ortho', 'phoria', 'tropia', 'intermittent'];
const DIR_IDS: Dir[] = ['eso', 'exo', 'hyperR', 'hyperL'];
const DEV_EYE_IDS: ('OD' | 'OS' | 'alternating')[] = ['OD', 'OS', 'alternating'];

interface Pad { x: number; y: number; tx: number; ty: number; drag: boolean; auto: boolean; autoT: number; autoEye: Eye; ox: number; oy: number }
interface Lay { W: number; H: number; bw: number; bh: number; cell: Record<Eye, { x0: number; y0: number; x1: number; y1: number }>; rest: { x: number; y: number } }

export function Game({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const { audio, fx } = ctx;
  const t = pickStrings(S, ctx.locale);
  const reduced = ctx.reducedMotion;
  const rng = useMemo(() => ctx.rng.fork('cover-test'), []);
  const truths = useMemo(() => ({ distance: truthOf(ctx.findings, 'distance'), near: truthOf(ctx.findings, 'near') }) as Record<Target, Truth>, []);
  const sims = useMemo(() => ({
    distance: new CoverSim(truths.distance, rng.fork('d'), ctx.difficulty),
    near: new CoverSim(truths.near, rng.fork('n'), ctx.difficulty),
  }) as Record<Target, CoverSim>, []);
  const bases = useMemo(() => {
    const f: PatientFindings = { ...ctx.findings, motility: { ...ctx.findings.motility, distance: ORTHO, near: ORTHO } };
    const o = { irisColor: ctx.patient.avatar.irisColor, skinTone: SKIN_HEX[ctx.patient.avatar.skin] };
    return { OD: eyeStateFromFindings(f, 'OD', o), OS: eyeStateFromFindings(f, 'OS', o) } as Record<Eye, EyeState>;
  }, []);

  const [target, setTarget] = useState<Target>('distance');
  const [tutorial, setTutorial] = useState(true);
  const [phase, setPhase] = useState<'play' | 'debrief'>('play');
  const [drafts, setDrafts] = useState<Record<Target, Draft>>({ distance: EMPTY, near: EMPTY });
  const [calls, setCalls] = useState<Record<Target, Call | null>>({ distance: null, near: null });
  const [prisms, setPrisms] = useState<Record<Target, Prism>>({ distance: { mag: 0, base: 'BO', eye: 'OS' }, near: { mag: 0, base: 'BO', eye: 'OS' } });
  const [slow, setSlow] = useState(false);
  const [tab, setTab] = useState<'call' | 'measure'>('call');
  const [spot, setSpot] = useState<'stage' | 'panel' | null>('stage');
  const tabAuto = useRef({ toMeasure: false, toCall: false });
  const [autoAlt, setAutoAlt] = useState(false);
  const [snap, setSnap] = useState({ od: false, os: false, unc: false, alt: 0, pr: 0, covered: null as Eye | null });
  const [final, setFinal] = useState<{ challenge: Challenge | null; accuracy: number; perfect: boolean; scores: ReturnType<typeof scoreAll> } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const paddleRef = useRef<HTMLDivElement>(null);
  const cvs = { OD: useRef<HTMLCanvasElement>(null), OS: useRef<HTMLCanvasElement>(null) };
  const cellRef = { OD: useRef<HTMLDivElement>(null), OS: useRef<HTMLDivElement>(null) };
  const startAt = useRef(performance.now());
  const pad = useRef<Pad>({ x: 0, y: 0, tx: 0, ty: 0, drag: false, auto: false, autoT: 0, autoEye: 'OD', ox: 0, oy: 0 });
  const lay = useRef<Lay | null>(null);
  const live = useRef({ target, tutorial, phase, slow, calls });
  live.current = { target, tutorial, phase, slow, calls };
  const doneRef = useRef(false);

  const play = (id: Parameters<typeof audio.play>[0], o?: { volume?: number; pitch?: number }) => audio.play(id, o);

  // ───────────── paddle targets
  const restPos = () => lay.current?.rest ?? { x: 0, y: 0 };
  const coverPos = (e: Eye) => { const c = lay.current!.cell[e]; return { x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 }; };
  const goCover = (e: Eye | null, manual = true) => {
    const L = lay.current;
    if (!L) return;
    if (manual && pad.current.auto) { pad.current.auto = false; setAutoAlt(false); }
    const p = e ? coverPos(e) : restPos();
    pad.current.tx = p.x; pad.current.ty = p.y;
  };
  const toggleAuto = () => {
    const p = pad.current;
    p.auto = !p.auto;
    p.autoT = 0;
    p.autoEye = sims[live.current.target].cover === 'OD' ? 'OS' : 'OD';
    setAutoAlt(p.auto);
    play('click');
    if (!p.auto) goCover(null, false);
  };
  const switchTarget = (t: Target) => {
    if (t === target) return;
    play('lens-click', { pitch: t === 'near' ? 1.15 : 0.9 });
    pad.current.auto = false; setAutoAlt(false);
    goCover(null, false);
    setTarget(t);
  };

  // ───────────── render loop (canvas eyes + paddle + simulator)
  useEffect(() => {
    const stage = stageRef.current!;
    const paddle = paddleRef.current!;
    const ctxs: Partial<Record<Eye, CanvasRenderingContext2D>> = {};
    const basePupil = { OD: bases.OD.pupilMm, OS: bases.OS.pupilMm };
    const dims = { OD: { w: 0, h: 0, dpr: 1, cw: 0, ch: 0 }, OS: { w: 0, h: 0, dpr: 1, cw: 0, ch: 0 } };
    const measure = () => {
      const sr = stage.getBoundingClientRect();
      const cell = {} as Lay['cell'];
      for (const e of EYES_LIST) {
        const cr = cellRef[e].current!.getBoundingClientRect();
        cell[e] = { x0: cr.left - sr.left, y0: cr.top - sr.top, x1: cr.right - sr.left, y1: cr.bottom - sr.top };
        const c = cvs[e].current!;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cw0 = Math.max(40, Math.round(cr.width));
        const ch0 = Math.max(24, Math.round(cr.height));
        // close-up crop: the canvas is larger than its cell and centred; the cell clips it
        const w = Math.max(cw0, Math.round(ch0 * EYE_ASPECT));
        const h = Math.round(w / EYE_ASPECT);
        c.style.width = `${w}px`; c.style.height = `${h}px`;
        c.style.left = `${Math.round((cw0 - w) / 2)}px`; c.style.top = `${Math.round((ch0 - h) / 2)}px`;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
        dims[e] = { w, h, dpr, cw: cw0, ch: ch0 };
        ctxs[e] = c.getContext('2d') ?? undefined;
      }
      const cw = cell.OD.x1 - cell.OD.x0;
      const ch = cell.OD.y1 - cell.OD.y0;
      const bw = cw * 0.9;
      const bh = ch * 0.8;
      const peek = sr.width <= 760 ? 30 : 50; // how much blade shows above the stage edge when parked
      const rest = { x: sr.width / 2, y: sr.height + bh * 0.5 - peek };
      const first = !lay.current;
      lay.current = { W: sr.width, H: sr.height, bw, bh, cell, rest };
      paddle.style.width = `${bw}px`;
      paddle.style.height = `${bh}px`;
      if (first) { pad.current.x = pad.current.tx = rest.x; pad.current.y = pad.current.ty = rest.y; }
      else {
        // keep the paddle on the same eye after a resize
        const c = sims[live.current.target].cover;
        const p = c ? { x: (cell[c].x0 + cell[c].x1) / 2, y: (cell[c].y0 + cell[c].y1) / 2 } : rest;
        if (!pad.current.drag) { pad.current.tx = p.x; pad.current.ty = p.y; }
      }
    };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(stage);
    for (const e of EYES_LIST) if (cellRef[e].current) ro?.observe(cellRef[e].current!);
    measure();
    window.addEventListener('resize', measure);

    let raf = 0;
    let last = performance.now();
    let uiAt = 0;
    let lastCover: Eye | null = null;
    let lastMoveAt = -1;
    let t = 0;
    const overlap = (L: Lay, e: Eye) => {
      const c = L.cell[e];
      const fx0 = c.x0 + (c.x1 - c.x0) * 0.06, fx1 = c.x1 - (c.x1 - c.x0) * 0.06;
      const fy0 = c.y0 + (c.y1 - c.y0) * 0.12, fy1 = c.y1 - (c.y1 - c.y0) * 0.12;
      const p = pad.current;
      const ix = Math.max(0, Math.min(p.x + L.bw / 2, fx1) - Math.max(p.x - L.bw / 2, fx0));
      const iy = Math.max(0, Math.min(p.y + L.bh / 2, fy1) - Math.max(p.y - L.bh / 2, fy0));
      return (ix * iy) / ((fx1 - fx0) * (fy1 - fy0));
    };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const L = lay.current;
      const lv = live.current;
      const p = pad.current;
      const sim = sims[lv.target];
      sim.slow = lv.slow ? 2.4 : 1;
      if (L) {
        if (p.auto && !lv.tutorial) {
          p.autoT -= dt;
          if (p.autoT <= 0) { p.autoEye = p.autoEye === 'OD' ? 'OS' : 'OD'; const c = coverPos(p.autoEye); p.tx = c.x; p.ty = c.y; p.autoT = lv.slow ? 3.4 : 1.5; }
        }
        const k = reduced ? 1 : 1 - Math.exp(-dt * (p.drag ? 34 : p.auto ? 30 : 17));
        p.x += (p.tx - p.x) * k;
        p.y += (p.ty - p.y) * k;
        paddle.style.transform = `translate3d(${p.x - L.bw / 2}px, ${p.y - L.bh / 2}px, 0)`;
        const oD = overlap(L, 'OD');
        const oS = overlap(L, 'OS');
        const raw: Eye | null = oD >= 0.55 && oD >= oS ? 'OD' : oS >= 0.55 ? 'OS' : null;
        sim.setRawCover(raw);
        sim.step(dt);
        if (sim.cover !== lastCover) { lastCover = sim.cover; audio.play('lens-click', { pitch: sim.cover ? 0.8 : 1.25, volume: 0.6 }); }
        const lm = sim.lastMove;
        if (lm && lm.at !== lastMoveAt && sim.t >= lm.at) { lastMoveAt = lm.at; if (Math.hypot(lm.dh, lm.dv) >= 3) audio.play('tick', { pitch: 1.5, volume: 0.35 }); }
        const near = lv.target === 'near';
        const tt = reduced ? 0 : t;
        for (const e of EYES_LIST) {
          const g = ctxs[e];
          const d = dims[e];
          if (!g) continue;
          const pos = sim.pos[e];
          const st = bases[e];
          const tg = turnToGaze(e, pos.h + (near ? NEAR_CONVERGENCE : 0), pos.v);
          st.gaze = { x: Math.max(-1, Math.min(1, tg.x * GAZE_GAIN)), y: Math.max(-1, Math.min(1, tg.y * GAZE_GAIN)) };
          st.pupilMm = basePupil[e] - (near ? 0.6 : 0);
          g.setTransform(d.dpr, 0, 0, d.dpr, 0, 0);
          g.clearRect(0, 0, d.w, d.h);
          drawEye(g, d.w, d.h, st, tt);
          // straight-ahead reference ring: makes small shifts easy to read
          g.save();
          g.strokeStyle = 'rgba(10, 22, 51, 0.35)'; g.lineWidth = 1.2; g.setLineDash([4, 5]);
          g.beginPath(); g.arc(d.w / 2, d.h / 2, Math.min(d.ch * 0.27, d.cw * 0.2), 0, Math.PI * 2); g.stroke();
          g.setLineDash([]); g.beginPath();
          g.moveTo(d.w / 2, d.h / 2 - d.ch * 0.46); g.lineTo(d.w / 2, d.h / 2 - d.ch * 0.4); g.moveTo(d.w / 2, d.h / 2 + d.ch * 0.4); g.lineTo(d.w / 2, d.h / 2 + d.ch * 0.46);
          g.stroke(); g.restore();
        }
        if (now - uiAt > 140) {
          uiAt = now;
          const s = sim.stats;
          const next = { od: !!s.held.OD, os: !!s.held.OS, unc: !!(s.uncovered.OD || s.uncovered.OS), alt: s.alt, pr: s.neutralised ? 2 : s.prismUsed ? 1 : 0, covered: sim.cover };
          setSnap((o) => (o.od === next.od && o.os === next.os && o.unc === next.unc && o.alt === next.alt && o.pr === next.pr && o.covered === next.covered ? o : next));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // ───────────── paddle dragging
  const onPaddleDown = (e: PointerEvent) => {
    if (live.current.tutorial || live.current.phase !== 'play') return;
    const L = lay.current;
    if (!L) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const sr = stageRef.current!.getBoundingClientRect();
    const p = pad.current;
    p.drag = true; p.auto = false; setAutoAlt(false);
    p.ox = e.clientX - sr.left - p.x; p.oy = e.clientY - sr.top - p.y;
    e.preventDefault();
  };
  const onPaddleMove = (e: PointerEvent) => {
    const p = pad.current;
    const L = lay.current;
    if (!p.drag || !L) return;
    const sr = stageRef.current!.getBoundingClientRect();
    p.tx = Math.max(L.bw * 0.25, Math.min(L.W - L.bw * 0.25, e.clientX - sr.left - p.ox));
    p.ty = Math.max(L.bh * 0.3, Math.min(L.H + L.bh * 0.3, e.clientY - sr.top - p.oy));
  };
  const onPaddleUp = () => {
    const p = pad.current;
    const L = lay.current;
    p.drag = false;
    if (!L) return;
    // snap onto the nearest eye if mostly over it
    for (const e of EYES_LIST) {
      const c = coverPos(e);
      if (Math.abs(p.tx - c.x) < L.bw * 0.4 && Math.abs(p.ty - c.y) < L.bh * 0.45) { p.tx = c.x; p.ty = c.y; return; }
    }
  };
  const tapEye = (e: Eye) => {
    if (live.current.tutorial || live.current.phase !== 'play') return;
    goCover(sims[live.current.target].cover === e ? null : e);
  };

  // ───────────── keyboard
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const down = (e: KeyboardEvent) => {
      if (live.current.tutorial || live.current.phase !== 'play' || e.ctrlKey || e.metaKey || e.altKey) return;
      const onBtn = (e.target as HTMLElement).tagName === 'BUTTON';
      if (e.key === 'ArrowLeft') { e.preventDefault(); goCover('OD'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goCover('OS'); }
      else if (e.key === 'ArrowDown' || e.key === 'Escape') { e.preventDefault(); goCover(null); }
      else if (e.key === ' ' && !onBtn) { e.preventDefault(); goCover(null); }
      else if (e.key === 'a' || e.key === 'A') toggleAuto();
      else if (e.key === 't' || e.key === 'T') switchTarget(live.current.target === 'distance' ? 'near' : 'distance');
    };
    root.addEventListener('keydown', down);
    return () => root.removeEventListener('keydown', down);
  }, [target]);
  useEffect(() => { rootRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => () => { doneRef.current = true; }, []);

  // ───────────── prism + call
  const prism = prisms[target];
  const onPrism = (p: Prism) => {
    setPrisms((o) => ({ ...o, [target]: p }));
    sims[target].setPrism(p);
    if (calls[target]) setCalls((o) => ({ ...o, [target]: null }));
  };
  const draft = drafts[target];
  const setDraft = (patch: Partial<Draft>) => {
    play('select', { volume: 0.5 });
    setDrafts((o) => {
      const d = { ...o[target], ...patch };
      if (d.kind === 'ortho') { d.dir = null; d.eye = null; }
      if (d.kind === 'phoria' || d.kind === 'ortho') d.eye = null;
      return { ...o, [target]: d };
    });
    if (calls[target]) setCalls((o) => ({ ...o, [target]: null }));
  };
  const needDir = draft.kind !== null && draft.kind !== 'ortho';
  const needEye = draft.kind === 'tropia' || draft.kind === 'intermittent';
  const complete = draft.kind !== null && (!needDir || draft.dir !== null) && (!needEye || draft.eye !== null);
  const locked = calls[target];
  const lockCall = () => {
    if (locked) { setCalls((o) => ({ ...o, [target]: null })); play('click'); return; }
    if (!complete) return;
    const c: Call = { kind: draft.kind!, dir: draft.kind === 'ortho' ? 'none' : draft.dir!, eye: needEye ? draft.eye ?? undefined : undefined, prism: prism.mag > 0 ? { ...prism } : null };
    setCalls((o) => ({ ...o, [target]: c }));
    play('stamp', { volume: 0.7 });
    fx.flash('#ffffff', 140);
  };

  // guide the learner to the prism tab once the alternate cover is done, and back to the call once neutralised
  useEffect(() => {
    const a = tabAuto.current;
    if (!tutorial && snap.alt >= 2 && snap.pr < 2 && !a.toMeasure) { a.toMeasure = true; setTab('measure'); }
    else if (snap.pr === 2 && a.toMeasure && !a.toCall) { a.toCall = true; setTab('call'); }
  }, [snap.alt, snap.pr, tutorial]);

  // ───────────── finish
  const anyCall = !!(calls.distance || calls.near);
  const stepFlags = [snap.od, snap.os, snap.unc, snap.alt >= 2, snap.pr === 2, !!locked];
  const tgWord = target === 'near' ? t.hintNearTarget : t.hintFarTarget;
  const hint = !snap.od && !snap.os ? t.hint1(tgWord)
    : !snap.unc ? t.hint2
      : !(snap.od && snap.os) ? t.hint3
        : snap.alt < 2 ? t.hint4
          : snap.pr < 2 ? t.hint5
            : !locked ? t.hint6
              : target === 'distance' && !calls.near ? t.hint7 : t.hint8;

  const hintShort = !snap.od && !snap.os ? t.s1
    : !snap.unc ? t.s2
      : !(snap.od && snap.os) ? t.s3
        : snap.alt < 2 ? t.s4
          : snap.pr < 2 ? t.s5
            : !locked ? t.s6
              : t.s7;

  function scoreAll(c: Record<Target, Call | null>) {
    return { distance: scoreCall(truths.distance, c.distance), near: scoreCall(truths.near, c.near) };
  }
  const record = () => {
    if (!anyCall) return;
    const stats = [sims.distance.stats, sims.near.stats];
    const tot = totalScore([truths.distance, truths.near], [calls.distance, calls.near], stats);
    const ch = ctx.mode === 'practice' ? makeChallenge(ctx.findings, rng.fork('challenge'), ctx.locale) : null;
    const fin = { challenge: ch, accuracy: tot.accuracy, perfect: tot.perfect, scores: scoreAll(calls) };
    if (!ch) { play('reveal'); finish(null, fin); return; } // case mode: Record findings files the chart straight away
    setFinal(fin);
    setPhase('debrief');
    play('reveal');
  };
  const finish = (chOk: boolean | null, fin = final) => {
    if (doneRef.current || !fin) return;
    doneRef.current = true;
    const accuracy = chOk === null ? fin.accuracy : 0.68 * fin.accuracy + 0.32 * (chOk ? 1 : 0);
    const perfect = fin.perfect && chOk !== false;
    if (perfect) { play('success'); fx.burst(window.innerWidth / 2, window.innerHeight / 2, { kind: 'stars', count: 36 }); }
    done({ testId: 'cover-test', accuracy: Math.max(0, Math.min(1, accuracy)), timeMs: Math.round(performance.now() - startAt.current), findings: reportFor(ctx.findings, ctx.locale), perfect });
  };

  const missing = !calls.distance ? t.distNotCalled : !calls.near ? t.nearNotCalled : '';
  const done6 = stepFlags.filter(Boolean).length;
  const covered = snap.covered;

  return (
    <LocaleContext.Provider value={ctx.locale}>
    <div class="cvt-root" ref={rootRef} tabIndex={-1} aria-label={t.coverTestAria} data-spot={tutorial ? spot ?? '' : ''}>
      <header class="cvt-head">
        <div class="cvt-head__title"><Icon name="cover-test" size={18} /> {t.headTitle}</div>
        <p class="cvt-head__hint" key={hint.slice(0, 18)} aria-live="polite"><span class="cvt-hint-long">{hint}</span><span class="cvt-hint-short">{hintShort}</span></p>
        <div class="cvt-seg" role="radiogroup" aria-label={t.fixDistance}>
          {TARGETS.map((tg) => (
            <button key={tg} type="button" role="radio" aria-checked={target === tg} class={`cvt-seg__b${target === tg ? ' is-on' : ''}`} onClick={() => switchTarget(tg)}>
              {tg === 'distance' ? t.distanceBtn : t.nearBtn}{calls[tg] && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      </header>

      <div class="cvt-main">
        <section class="cvt-wrap">
          <div class="cvt-stage" ref={stageRef} style={{ '--cvt-skin': SKIN_HEX[ctx.patient.avatar.skin] ?? SKIN_HEX[1] } as Record<string, string>}>
            <div class={`cvt-fix cvt-fix--${target}`} aria-hidden="true"><span class="cvt-fix__dot" /><span class="cvt-fix__lab">{target === 'near' ? t.fixNear : t.fixFar}</span></div>
            <Face />
            <div class="cvt-eyes">
              {EYES_LIST.map((e) => (
                <div key={e} class={`cvt-cell${covered === e ? ' is-covered' : ''}`} ref={cellRef[e]} onPointerDown={() => tapEye(e)}>
                  <canvas ref={cvs[e]} class="cvt-canvas" role="img" aria-label={t.eyeAria(e)} />
                  <span class="cvt-eyelab">{e}</span>
                  {prism.mag > 0 && prism.eye === e && (
                    <div class={`cvt-slab cvt-slab--${prism.base}`} aria-hidden="true">
                      <span class="cvt-slab__lab cvt-num">{prism.mag}Δ {prism.base}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div class="cvt-paddle" ref={paddleRef} onPointerDown={onPaddleDown} onPointerMove={onPaddleMove} onPointerUp={onPaddleUp} onPointerCancel={onPaddleUp} role="img" aria-label={t.paddleAria}>
              <div class="cvt-paddle__shadow" /><div class="cvt-paddle__blade" /><div class="cvt-paddle__grip" aria-hidden="true"><i /><i /><i /></div>
            </div>
          </div>
          <div class="cvt-tools" dir="ltr" role="toolbar" aria-label={t.occluderControls}>
            <Button variant="glass" size="sm" sfx={false} icon="chevron-left" onClick={() => goCover('OD')} aria-pressed={covered === 'OD'}>{t.coverOD}</Button>
            <Button variant="glass" size="sm" sfx={false} onClick={() => goCover(null)}>{t.uncover}</Button>
            <Button variant="glass" size="sm" sfx={false} trailingIcon="chevron-right" onClick={() => goCover('OS')} aria-pressed={covered === 'OS'}>{t.coverOS}</Button>
            <span class="cvt-tools__sp" />
            <Button variant={autoAlt ? 'primary' : 'glass'} size="sm" sfx={false} icon="refresh" onClick={toggleAuto} aria-pressed={autoAlt}>{t.alternate}</Button>
            <Button variant={slow ? 'primary' : 'glass'} size="sm" sfx={false} icon="clock" onClick={() => { setSlow(!slow); play('click'); }} aria-pressed={slow} title={t.slowTitle}>{t.slow}</Button>
          </div>
        </section>

        <aside class={`cvt-panel is-tab-${tab}`} aria-label={t.findings}>
          <div class="cvt-tabs" role="tablist" aria-label={t.findingsSteps}>
            <button type="button" role="tab" aria-selected={tab === 'call'} class={`cvt-tab${tab === 'call' ? ' is-on' : ''}`} onClick={() => { setTab('call'); play('click', { volume: 0.4 }); }}>{t.tabCall}</button>
            <button type="button" role="tab" aria-selected={tab === 'measure'} class={`cvt-tab${tab === 'measure' ? ' is-on' : ''}`} onClick={() => { setTab('measure'); play('click', { volume: 0.4 }); }}>{t.tabPrism}{snap.alt >= 2 && snap.pr < 2 && <i class="cvt-tab__dot" />}</button>
          </div>
          <div class="cvt-sec cvt-sec--call">
          <p class="cvt-eyebrow">{t.seeQ} · {target === 'distance' ? t.distanceWord : t.nearWord}</p>
          <div class="cvt-group" role="radiogroup" aria-label={t.devType}>
            {KIND_IDS.map((k) => <button key={k} type="button" role="radio" aria-checked={draft.kind === k} class={`cvt-chip${draft.kind === k ? ' is-on' : ''}`} onClick={() => setDraft({ kind: k })}>{t.kinds[k]}</button>)}
          </div>
          {needDir && (
            <div class="cvt-group" role="radiogroup" aria-label={t.devDir}>
              {DIR_IDS.map((k) => <button key={k} type="button" role="radio" aria-checked={draft.dir === k} class={`cvt-chip${draft.dir === k ? ' is-on' : ''}`} onClick={() => setDraft({ dir: k })}>{t.dirs[k as 'eso']}</button>)}
            </div>
          )}
          {needEye && (
            <div class="cvt-group" role="radiogroup" aria-label={t.devEye}>
              {DEV_EYE_IDS.map((k) => <button key={k} type="button" role="radio" aria-checked={draft.eye === k} class={`cvt-chip${draft.eye === k ? ' is-on' : ''}`} onClick={() => setDraft({ eye: k })}>{t.devEyes[k]}</button>)}
            </div>
          )}
          </div>
          <div class="cvt-sec cvt-sec--measure">
          <PrismBar prism={prism} onChange={onPrism} sound={(pitch) => play('dial', { pitch, volume: 0.5 })} />
          <p class="cvt-note">{fix(ctx.locale, t.prismNote)}</p>
          </div>
          <div class="cvt-sec cvt-sec--lock">
          <Button variant={locked ? 'glass' : 'primary'} size="md" block disabled={!locked && !complete} icon={locked ? 'check' : 'lock'} onClick={lockCall} sfx={false}>
            {locked ? t.callLocked : t.lockCall}
          </Button>
          {locked && <p class="cvt-locked" role="status"><bdi>{locked.prism ? `${locked.prism.mag}Δ ${baseWord(locked.prism.base, ctx.locale)}` : t.noPrism}</bdi> · {locked.kind === 'ortho' ? t.orthophoriaLower : (ctx.locale === 'he' ? `${t.kinds[locked.kind]}, ${locked.dir === 'none' ? '' : t.dirs[locked.dir]}` : `${locked.kind}, ${locked.dir}`)}</p>}
          </div>
        </aside>
      </div>

      <footer class="cvt-foot">
        <div class="cvt-steps" aria-label={t.techChecklist}>
          {t.stepLabels.map((s, i) => <span key={s} class={`cvt-step${stepFlags[i] ? ' is-done' : ''}`}>{stepFlags[i] ? <Icon name="check" size={11} /> : <i />}{s}</span>)}
        </div>
        <div class="cvt-foot__bar"><ProgressBar value={done6} max={6} size="sm" ariaLabel={t.techProgress} /><span class="cvt-num">{done6}/6</span></div>
        <div class="cvt-foot__go">
          {missing && anyCall && <span class="cvt-foot__note">{missing}</span>}
          <Button variant="primary" size="md" icon="check" disabled={!anyCall} onClick={record}>{t.record}</Button>
        </div>
      </footer>

      {tutorial && <Tutorial onStep={(i) => { setSpot(i === 2 ? 'panel' : 'stage'); if (i === 2) setTab('measure'); }} onClose={() => { setTutorial(false); setSpot(null); setTab('call'); rootRef.current?.focus({ preventScroll: true }); }} />}
      {phase === 'debrief' && final && (
        <Debrief truths={truths} calls={calls} scores={final.scores} challenge={final.challenge} accuracy={final.accuracy} onFinish={finish} />
      )}
    </div>
    </LocaleContext.Provider>
  );
}
