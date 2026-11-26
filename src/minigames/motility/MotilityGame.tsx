import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Eye, Gaze, MiniGameContext, MiniGameDone } from '@core';
import { Button, Icon, ProgressBar } from '@ui-kit';
import { pickStrings } from '@core';
import { eyeStateFromFindings } from '@render';
import {
  EYES, GAZE_IDS, GAZE_X, GAZE_Y, NODES, classifyMotility, emptyGrid, eyeGazeAt, gradeText, misalignment, multiplierGrid, nodeNear, trueGrid,
  type Grid,
} from './model';
import { gradingScore, motilityAccuracy, missedDeficitShare } from './scoring';
import { reportMotilityFor } from './report';
import { motilityChallenge, motilityTeach } from './practice';
import { S, fixBidi, patternChart } from './strings';
import { Debrief, EyePair, Face, openLid, SKIN_HEX, Tutorial, useNudge, type EyeFrame } from './ui';

const STEP_TARGETS = ['.mot-wand__halo', '.mot-eyes', '.mot-panel'];
const whereName = (x: number, y: number, t: typeof S.en) => {
  const u = x < -0.35 ? -1 : x > 0.35 ? 1 : 0, v = y < -0.35 ? -1 : y > 0.35 ? 1 : 0;
  const n = NODES.find((q) => q.u === u && q.v === v)!;
  return n.id === 'primary' ? t.straightAhead : t.nodeNames[n.id].replace(/^./, (c) => c.toUpperCase());
};
const ID = (id: string) => `mot-${id}`;
type GradeSel = { eye: Eye; gaze: Gaze } | null;
const GRADES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

function HChart({ t, eye, grid, truth, sel, onSel }: { t: typeof S.en; eye: Eye; grid: Record<Gaze, number>; truth?: Record<Gaze, number>; sel: GradeSel; onSel?: (g: Gaze) => void }) {
  return (
    <div class="mot-chart" role="group" aria-label={t.chartAria(eye === 'OD')}>
      <p class="mot-chart__t"><b>{eye}</b><span>{t.eyeName(eye === 'OD')}</span></p>
      <div class="mot-chart__grid" dir="ltr">
        {NODES.map((n) => {
          if (n.id === 'primary') return <span key={n.id} class="mot-cellc mot-cellc--c" aria-hidden="true">+</span>;
          const g = grid[n.id as Gaze];
          const tv = truth?.[n.id as Gaze];
          const state = tv == null ? '' : g === tv ? ' is-ok' : Math.abs(g - tv) === 1 ? ' is-near' : ' is-off';
          const on = sel?.eye === eye && sel.gaze === n.id;
          return (
            <button key={n.id} type="button" class={`mot-cellc${on ? ' is-sel' : ''}${state}`} data-g={truth ? tv : g} disabled={!onSel}
              aria-label={t.cellAria(eye, t.nodeNames[n.id], gradeText(truth ? tv! : g))} aria-pressed={on} onFocus={() => { if (!on) onSel?.(n.id as Gaze); }} onClick={() => onSel?.(n.id as Gaze)}>
              <span class="mot-num" key={truth ? tv : g}>{gradeText(truth ? tv! : g)}</span>
              {truth && g !== tv ? <small>{t.youGraded(gradeText(g))}</small> : null}
            </button>
          );
        })}
      </div>
      <div class="mot-chart__cap" aria-hidden="true" dir="ltr"><span>{t.capR}</span><span>{t.capL}</span></div>
    </div>
  );
}

export function MotilityGame({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const { audio, fx } = ctx;
  const t = pickStrings(S, ctx.locale);
  const loc = ctx.locale;
  const f = ctx.findings;
  const rng = useMemo(() => ctx.rng.fork('motility'), []);
  const truth = useMemo(() => trueGrid(f), []);
  const pat = useMemo(() => classifyMotility(f), []);
  const mult = useMemo(() => ({ OD: multiplierGrid(f, 'OD'), OS: multiplierGrid(f, 'OS') }), []);
  const base = useMemo(() => {
    const o = { irisColor: ctx.patient.avatar.irisColor, skinTone: SKIN_HEX[ctx.patient.avatar.skin] };
    return { OD: eyeStateFromFindings(f, 'OD', o), OS: eyeStateFromFindings(f, 'OS', o) };
  }, []);
  const challenge = useMemo(() => (ctx.mode === 'practice' ? motilityChallenge(f, rng.fork('q'), ctx.locale) : null), []);

  const [tutorial, setTutorial] = useState(true);
  const [mine, setMine] = useState<Grid>(emptyGrid);
  const [sel, setSel] = useState<GradeSel>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [touched, setTouched] = useState<string[]>([]);
  const [say, setSay] = useState<{ id: number; text: string } | null>(null);
  const [debrief, setDebrief] = useState<{ grading: number; technique: number } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [nudge, setNudge] = useNudge();
  const [log, setLog] = useState<{ id: number; where: string; text: string }[]>([]);
  const [tab, setTab] = useState<'sweep' | 'grade'>('sweep');
  const autoTab = useRef(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const wandEl = useRef<HTMLDivElement>(null);
  const ghostEl = useRef<HTMLDivElement>(null);
  const dims = useRef({ w: 600, h: 440 });
  const wand = useRef({ x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, drag: false, glide: false });
  const heldKeys = useRef(new Map<string, number>());
  const sim = useRef({ dwell: {} as Record<string, number>, seen: new Set<string>(), dip: false, dipAt: -1e9, painAt: -1e9, painUntil: 0, sayId: 0, moved: 0, lastX: 0, lastY: 0, tutorial: true, debrief: false });
  const startAt = useRef(performance.now());
  const doneRef = useRef(false);
  const timers = useRef<number[]>([]);
  sim.current.tutorial = tutorial; sim.current.debrief = !!debrief;

  const speak = (text: string, where = '') => {
    const id = ++sim.current.sayId;
    setSay({ id, text });
    setLog((l) => [...l.slice(-5), { id, where, text }]);
  };
  const play = (id: Parameters<typeof audio.play>[0], o?: { volume?: number; pitch?: number }) => audio.play(id, o);

  useEffect(() => {
    const el = stageRef.current!;
    const measure = () => { const r = el.getBoundingClientRect(); dims.current = { w: r.width, h: r.height }; };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    el.focus({ preventScroll: true });
    return () => { ro?.disconnect(); timers.current.forEach((t) => clearTimeout(t)); };
  }, []);

  // one animation frame: input -> wand -> eyes -> patient
  const frame = (dt: number, now: number): EyeFrame => {
    const w = wand.current, s = sim.current;
    const active = !s.tutorial && !s.debrief;
    if (active && heldKeys.current.size) {
      // a tap steps to the next position of gaze (see onKey); holding past 280 ms sweeps smoothly
      const sp = (heldKeys.current.has('Shift') ? 0.45 : 1.5) * dt / 1000;
      let moved = false;
      for (const [k, t0] of heldKeys.current) {
        if (now - t0 < 280) continue;
        if (k === 'ArrowLeft') w.tx -= sp; else if (k === 'ArrowRight') w.tx += sp; else if (k === 'ArrowUp') w.ty -= sp; else if (k === 'ArrowDown') w.ty += sp; else continue;
        moved = true;
      }
      if (moved) { w.tx = Math.max(-1, Math.min(1, w.tx)); w.ty = Math.max(-1, Math.min(1, w.ty)); w.glide = false; }
    }
    const tau = w.drag ? 35 : w.glide ? 120 : 70;
    const k = 1 - Math.exp(-dt / tau);
    w.x += (w.tx - w.x) * k; w.y += (w.ty - w.y) * k;
    // the eyes follow with a short pursuit lag (none under reduced motion)
    const pk = ctx.reducedMotion ? 1 : 1 - Math.exp(-dt / 95);
    w.px += (w.x - w.px) * pk; w.py += (w.y - w.py) * pk;
    const speed = Math.hypot(w.x - s.lastX, w.y - s.lastY) / Math.max(1, dt) * 1000;
    s.lastX = w.x; s.lastY = w.y;

    const out = {} as EyeFrame;
    const fin = {} as Record<Eye, { x: number; y: number }>;
    const nys = f.motility.nystagmus ? Math.sin(now / 55) * 0.018 + ((now / 260) % 1 - 0.5) * 0.03 : 0;
    for (const e of EYES) {
      const g = eyeGazeAt(mult[e], w.px, w.py);
      const b = base[e];
      const x = Math.max(-1, Math.min(1, b.gaze.x + g.x + nys));
      const y = Math.max(-1, Math.min(1, b.gaze.y + g.y));
      fin[e] = { x, y };
      out[e] = { ...b, gaze: { x, y }, lidAperture: openLid(b.lidAperture) * (now < s.painUntil ? 0.82 : 1), pupilMm: b.pupilMm };
    }
    const mis = misalignment(fin.OD, fin.OS);
    const seesDouble = f.motility.diplopia !== 'none' && mis.kind != null;

    // DOM: wand + ghost image
    const { w: W, h: H } = dims.current;
    const wx = W / 2 + w.x * 0.4 * W, wy = H / 2 + w.y * 0.38 * H;
    if (wandEl.current) wandEl.current.style.transform = `translate(${wx.toFixed(1)}px, ${wy.toFixed(1)}px)`;
    if (ghostEl.current) {
      const devOD = Math.hypot(fin.OD.x - w.px * GAZE_X, fin.OD.y - w.py * GAZE_Y) > Math.hypot(fin.OS.x - w.px * GAZE_X, fin.OS.y - w.py * GAZE_Y);
      const sgn = devOD ? -1 : 1;
      // separation is drawn in proportion to the true misalignment; where the outer nodes leave no room it folds back inside the stage
      const room = (v: number, pos: number, size: number) => { const t = pos + v; return t < 16 ? pos + Math.abs(v) : t > size - 16 ? pos - Math.abs(v) : t; };
      const ghx = room(sgn * mis.dx * 0.2 * W, wx, W), ghy = room(sgn * mis.dy * 0.2 * W, wy, H);
      ghostEl.current.style.transform = `translate(${ghx.toFixed(1)}px, ${ghy.toFixed(1)}px)`;
      ghostEl.current.style.opacity = seesDouble ? '0.8' : '0';
    }
    if (!active) return out;

    // examined positions: hold near a node for ~0.45 s
    const n = nodeNear(w.x, w.y);
    if (n && !s.seen.has(n.id)) {
      s.dwell[n.id] = (s.dwell[n.id] ?? 0) + dt;
      if (s.dwell[n.id]! > 380) {
        s.seen.add(n.id);
        setVisited([...s.seen]);
        play('lens-click', { pitch: 1 + s.seen.size * 0.04 });
        try { if (!ctx.reducedMotion) navigator.vibrate?.(8); } catch { /* optional */ }
      }
    }
    // the patient reports what the patient would feel
    if (seesDouble && !s.dip && now - s.dipAt > 1800) {
      s.dip = true; s.dipAt = now;
      speak(t.sawTwo(t.dip[mis.kind!]), whereName(w.x, w.y, t));
      play('pop', { pitch: 0.8 });
    } else if (!seesDouble && s.dip) s.dip = false;
    if (f.motility.painOnMovement && speed > 0.25 && Math.hypot(w.x, w.y) > 0.45 && now - s.painAt > 3500) {
      s.painAt = now; s.painUntil = now + 900;
      speak(t.painSay, whereName(w.x, w.y, t));
      play('thud', { volume: 0.5 });
    }
    return out;
  };

  const setWand = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    wand.current.tx = Math.max(-1, Math.min(1, (clientX - r.left - r.width / 2) / (0.4 * r.width)));
    wand.current.ty = Math.max(-1, Math.min(1, (clientY - r.top - r.height / 2) / (0.38 * r.height)));
  };
  const onDown = (e: PointerEvent) => {
    if (tutorial || debrief) return;
    stageRef.current!.setPointerCapture?.(e.pointerId);
    stageRef.current!.focus({ preventScroll: true });
    wand.current.drag = true; wand.current.glide = false;
    setWand(e.clientX, e.clientY);
  };
  const onMove = (e: PointerEvent) => { if (wand.current.drag) setWand(e.clientX, e.clientY); };
  const onUp = () => { wand.current.drag = false; };
  const stepTo = (t: number, dir: number) => {
    const r = Math.round(t);
    return Math.max(-1, Math.min(1, Math.abs(t - r) < 0.15 ? r + dir : dir > 0 ? Math.ceil(t) : Math.floor(t)));
  };
  const onKeyUp = (e: KeyboardEvent) => { heldKeys.current.delete(e.key); };

  const grade = (v: number) => {
    if (!sel) { setNudge(t.nudgeTapCell); play('error', { volume: 0.4 }); return; }
    const nv = Math.max(-4, Math.min(4, v));
    setMine((m) => ({ ...m, [sel.eye]: { ...m[sel.eye], [sel.gaze]: nv } }));
    setTouched((t) => (t.includes(`${sel.eye}:${sel.gaze}`) ? t : [...t, `${sel.eye}:${sel.gaze}`]));
    play('dial', { pitch: 0.9 + (nv + 4) * 0.04 });
  };
  const onRootKey = (e: KeyboardEvent) => {
    if (tutorial || debrief || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement;
    const inChart = !!t.closest?.('.mot-chart__grid');
    // roving focus inside a chart: arrows move between cells (each focused cell is selected for grading)
    if (inChart && e.key.startsWith('Arrow')) {
      const cells = Array.from(t.closest('.mot-chart__grid')!.children) as HTMLElement[];
      const i = cells.indexOf(t.closest('button') as HTMLElement);
      const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -3 : 3;
      let j = i + d;
      while (j >= 0 && j < 9 && j !== i && cells[j]!.tagName !== 'BUTTON') j += d;
      if (j >= 0 && j < 9 && cells[j]!.tagName === 'BUTTON') (cells[j] as HTMLElement).focus();
      e.preventDefault(); return;
    }
    if (e.key === 'Shift') { heldKeys.current.set('Shift', 0); return; }
    if (e.key.startsWith('Arrow')) {
      if (!e.repeat && !heldKeys.current.has(e.key)) {
        const w = wand.current, dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') w.tx = stepTo(w.tx, dir); else w.ty = stepTo(w.ty, dir);
        w.glide = true;
        heldKeys.current.set(e.key, performance.now());
      }
      e.preventDefault(); return;
    }
    if (sel && (e.key === '+' || e.key === '=')) { grade(mine[sel.eye][sel.gaze] + 1); e.preventDefault(); return; }
    if (sel && (e.key === '-' || e.key === '_')) { grade(mine[sel.eye][sel.gaze] - 1); e.preventDefault(); return; }
    if (sel && e.key === '0') { grade(0); e.preventDefault(); return; }
    const n = NODES.find((x) => x.key === e.key);
    if (n) { wand.current.tx = n.u; wand.current.ty = n.v; wand.current.glide = true; e.preventDefault(); }
  };

  const gradedCount = EYES.reduce((n, e) => n + GAZE_IDS.filter((g) => mine[e][g] !== 0).length, 0);
  const canRecord = visited.length >= 9 && touched.length >= 16;
  const gateHint = visited.length < 9 ? t.gateSweep(visited.length) : t.gateGrade(touched.length);
  const record = () => {
    if (!canRecord) { setNudge(gateHint); play('error', { volume: 0.5 }); return; }
    const grading = gradingScore(mine, truth);
    const technique = motilityAccuracy({ grading, visited: visited.length, seconds: (performance.now() - startAt.current) / 1000, missedShare: missedDeficitShare(mine, truth) });
    play('stamp');
    setDebrief({ grading, technique });
  };
  const finish = () => {
    if (doneRef.current || !debrief) return;
    doneRef.current = true;
    const right = challenge && picked === challenge.correct;
    const accuracy = challenge ? 0.65 * debrief.technique + 0.35 * (right ? 1 : 0) : debrief.technique;
    const perfect = debrief.grading >= 0.97 && visited.length === 9 && accuracy >= 0.95;
    play(accuracy > 0.7 ? 'success' : 'select');
    done({ testId: 'motility', accuracy: Math.max(0, Math.min(1, accuracy)), timeMs: Math.round(performance.now() - startAt.current), findings: reportMotilityFor(f, ctx.patient, ctx.locale), perfect });
  };
  const pick = (i: number) => {
    setPicked(i);
    if (challenge) { play(i === challenge.correct ? 'success' : 'fail'); if (i !== challenge.correct) fx.shake(0.4, 200); }
  };

  const all = visited.length >= 9;
  useEffect(() => {
    if (all && !autoTab.current) { autoTab.current = true; setTab('grade'); setNudge(t.nudgeAllSeen); }
  }, [all]);
  const hint = tutorial ? t.watchTutorial : !all ? t.hintSweep : t.hintGrade;
  const cur = sel ? mine[sel.eye][sel.gaze] : 0;

  return (
    <div class={`mot-root${ctx.reducedMotion ? ' is-rm' : ''}`} onKeyDown={onRootKey} onKeyUp={onKeyUp} onBlur={(e) => { if (!(e.relatedTarget as HTMLElement | null)?.closest?.('.mot-root')) heldKeys.current.clear(); }}>
      <header class="mot-head">
        <div class="mot-head__title"><Icon name="motility" size={20} /> {t.motTitle}</div>
        <p class="mot-head__hint" key={hint} aria-live="polite">{fixBidi(hint, loc)}</p>
        <button type="button" class="mot-help" onClick={() => setTutorial(true)} aria-label={t.showTutorial}><Icon name="info" size={18} /></button>
      </header>
      <div class="mot-main" data-tab={tab}>
        <div class="mot-tabs" role="tablist" aria-label={t.tabsAria}>
          <button type="button" role="tab" aria-selected={tab === 'sweep'} class={tab === 'sweep' ? 'is-on' : ''} onClick={() => setTab('sweep')}>{t.tabSweep} <small dir="ltr">{visited.length}/9</small></button>
          <button type="button" role="tab" aria-selected={tab === 'grade'} class={tab === 'grade' ? 'is-on' : ''} onClick={() => setTab('grade')}>{t.tabGrade} <small>{gradedCount}</small></button>
        </div>
        <div class="mot-wrap">
          <div class="mot-sayrow" aria-live="polite">{say ? <div class="mot-say" key={say.id} role="status"><span>{ctx.patient.name.split(' ')[0]}</span>{say.text}</div> : null}</div>
          <div ref={stageRef} class="mot-stage" tabIndex={0} role="application" aria-label={t.stageAria} dir="ltr"
            style={{ '--mot-skin': SKIN_HEX[ctx.patient.avatar.skin] } as never}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <Face dy={22} />
            <div class="mot-kbd" aria-hidden="true" dir={loc === 'he' ? 'rtl' : 'ltr'}><kbd dir="ltr">← ↑ → ↓</kbd> {t.kbdStep} · {t.kbdHold} · <kbd dir="ltr">1–9</kbd> {t.kbdJump}</div>
            <svg class="mot-h" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M10 12H90M10 50H90M10 88H90M50 12V88" />
            </svg>
            {NODES.map((n) => (
              <i key={n.id} id={ID(n.id)} class={`mot-node${visited.includes(n.id) ? ' is-seen' : ''}`} aria-hidden="true"
                style={{ left: `${50 + n.u * 40}%`, top: `${50 + n.v * 38}%` }}><b>{visited.includes(n.id) ? '✓' : n.key}</b></i>
            ))}
            <div class="mot-side mot-side--l" aria-hidden="true">{t.patientsRight}</div><div class="mot-side mot-side--r" aria-hidden="true">{t.patientsLeft}</div>
            <EyePair frame={frame} />
            <div ref={ghostEl} class="mot-ghost" aria-hidden="true" />
            <div ref={wandEl} class="mot-wand" aria-hidden="true"><span class="mot-wand__halo" /><span class="mot-wand__core" /></div>
          </div>
        </div>
        <aside class="mot-panel" aria-label={t.panelAria}>
          <div class="mot-charts" dir="ltr">
            <HChart t={t} eye="OD" grid={mine.OD} sel={sel} onSel={(g) => { setSel({ eye: 'OD', gaze: g }); play('dial', { volume: 0.4 }); }} />
            <HChart t={t} eye="OS" grid={mine.OS} sel={sel} onSel={(g) => { setSel({ eye: 'OS', gaze: g }); play('dial', { volume: 0.4 }); }} />
          </div>
          <div class="mot-strip" role="group" aria-label={t.gradeAria}>
            <p class="mot-eyebrow">{sel ? fixBidi(t.selLabel(sel.eye, t.nodeNames[sel.gaze]), loc) : t.tapCell}</p>
            <div class="mot-strip__row" dir="ltr">
              {GRADES.map((g) => (
                <button key={g} type="button" class={`mot-g${sel && cur === g ? ' is-on' : ''}`} data-g={g} aria-pressed={!!sel && cur === g} aria-label={t.gradeBtnAria(gradeText(g))} onClick={() => grade(g)}>{gradeText(g)}</button>
              ))}
            </div>
            <p class="mot-legend" dir="ltr"><span>{t.under}</span><span>{t.full}</span><span>{t.over}</span></p>
          </div>
          <div class="mot-log" aria-label={t.reportsAria} aria-live="polite">
            <p class="mot-eyebrow">{t.reportsTitle}</p>
            {log.length ? (
              <ul>{log.slice().reverse().map((l, i) => <li key={l.id} class={i === 0 ? 'is-latest' : ''}>{l.where ? <b>{l.where}</b> : null}{l.text}</li>)}</ul>
            ) : <p class="mot-log__empty">{t.reportsEmpty}</p>}
          </div>
          <div class="mot-look" aria-label={t.lookAria}>
            <p class="mot-eyebrow">{t.lookTitle}</p>
            <ul>
              <li><b>{t.lookRange[0]}</b> {t.lookRange[1]}</li>
              <li><b>{t.lookOver[0]}</b> {t.lookOver[1]}</li>
              <li><b>{t.lookSym[0]}</b> {t.lookSym[1]}</li>
            </ul>
          </div>
          <div class="mot-legendcard" aria-label={t.keyAria}>
            <p class="mot-eyebrow">{t.keyTitle}</p>
            <ul>
              <li><i data-g="0" /><b>0</b> {t.key0}</li>
              <li><i data-g="-1" /><b dir="ltr">−1 / −2</b> {t.key1}</li>
              <li><i data-g="-3" /><b dir="ltr">−3 / −4</b> {fixBidi(t.key3, loc)}</li>
              <li><i data-g="2" /><b dir="ltr">{loc === 'he' ? '+1…+4' : '+1 to +4'}</b> {t.keyPlus}</li>
            </ul>
          </div>
        </aside>
      </div>
      {nudge ? <div class="mot-toast" role="status" key={nudge}>{fixBidi(nudge, loc)}</div> : null}
      <footer class="mot-foot">
        <div class="mot-foot__bar"><span class="mot-foot__lab mot-num">{t.positionsLabel(visited.length)}<em>{t.gradedLabel(touched.length)}</em></span><ProgressBar value={visited.length} max={9} ariaLabel={t.positionsAria} accent="#2257f0" size="sm" /></div>
        {!canRecord && !tutorial ? <span class="mot-foot__note" id="mot-gate">{fixBidi(gateHint, loc)}</span> : null}
        <Button variant="primary" icon="check" onClick={record} disabled={tutorial || !!debrief || !canRecord} aria-describedby={canRecord ? undefined : 'mot-gate'}>{t.recordFindings}</Button>
      </footer>
      {tutorial ? <Tutorial t={t} loc={loc} eyebrow={t.motTitle} steps={t.motSteps.map((s, i) => ({ ...s, target: STEP_TARGETS[i] }))} onStep={(i) => setTab(i === 2 ? 'grade' : 'sweep')} onClose={() => { setTutorial(false); setTab('sweep'); timers.current.push(window.setTimeout(() => stageRef.current?.focus({ preventScroll: true }), 0)); }} /> : null}
      {debrief ? (
        <Debrief t={t} loc={loc} title={t.chartTitle} score={debrief.technique} challenge={challenge} picked={picked} onPick={pick} onFinish={finish} finishLabel={ctx.mode === 'practice' ? t.finish : t.writeToChart}>
          <div class="mot-charts mot-charts--debrief" dir="ltr">
            <HChart t={t} eye="OD" grid={mine.OD} truth={truth.OD} sel={null} />
            <HChart t={t} eye="OS" grid={mine.OS} truth={truth.OS} sel={null} />
          </div>
          {ctx.mode === 'case' || picked != null
            ? <p class="mot-card__body"><b>{fixBidi(patternChart(pat, loc), loc)}.</b> {fixBidi(motilityTeach(pat, loc), loc)}</p>
            : <p class="mot-card__body">{t.answerToSee}</p>}
        </Debrief>
      ) : null}
    </div>
  );
}
