import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Eye, Gaze, MiniGameContext, MiniGameDone } from '@core';
import { Button, Icon, ProgressBar } from '@ui-kit';
import { eyeStateFromFindings } from '@render';
import {
  EYES, GAZE_IDS, GAZE_X, GAZE_Y, NODES, classifyMotility, emptyGrid, eyeGazeAt, gradeText, misalignment, multiplierGrid, nodeNear, trueGrid,
  type Grid,
} from './model';
import { gradingScore, motilityAccuracy } from './scoring';
import { reportMotility } from './report';
import { motilityChallenge, motilityTeach } from './practice';
import { Debrief, EyePair, Face, SKIN_HEX, Tutorial, type EyeFrame, type TutStep } from './ui';

const STEPS: TutStep[] = [
  { title: 'Lead the eyes through the H', body: 'Drag the glowing wand, or use the arrow keys, to the nine positions of gaze: straight ahead, right, left, up, down and the four diagonals. Hold briefly at each one so the patient can follow.', keys: ['Drag', '← ↑ → ↓', '1–9'] },
  { title: 'Watch both eyes, and listen', body: 'Both eyes should move together, smoothly and fully. Notice an eye that stops short (underaction) or overshoots (overaction), and any double vision or pain the patient reports.', keys: ['Eyes', 'Patient'] },
  { title: 'Grade every gaze for each eye', body: 'Pick a cell on the OD or OS chart, then grade it: 0 is full movement, −1 to −4 is increasing underaction, +1 to +4 overaction. Record when you are done.', keys: ['+', '−', '0'] },
];
const DIP_WORD = { horizontal: 'side by side', vertical: 'one above the other', oblique: 'at a slant' } as const;
const ID = (id: string) => `mot-${id}`;
type GradeSel = { eye: Eye; gaze: Gaze } | null;
const GRADES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

function HChart({ eye, grid, truth, sel, onSel }: { eye: Eye; grid: Record<Gaze, number>; truth?: Record<Gaze, number>; sel: GradeSel; onSel?: (g: Gaze) => void }) {
  return (
    <div class="mot-chart" role="group" aria-label={`${eye === 'OD' ? 'Right' : 'Left'} eye motility chart`}>
      <p class="mot-chart__t"><b>{eye}</b><span>{eye === 'OD' ? 'right eye' : 'left eye'}</span></p>
      <div class="mot-chart__grid">
        {NODES.map((n) => {
          if (n.id === 'primary') return <span key={n.id} class="mot-cellc mot-cellc--c" aria-hidden="true">+</span>;
          const g = grid[n.id as Gaze];
          const t = truth?.[n.id as Gaze];
          const state = t == null ? '' : g === t ? ' is-ok' : Math.abs(g - t) === 1 ? ' is-near' : ' is-off';
          const on = sel?.eye === eye && sel.gaze === n.id;
          return (
            <button key={n.id} type="button" class={`mot-cellc${on ? ' is-sel' : ''}${state}`} data-g={truth ? t : g} disabled={!onSel}
              aria-label={`${eye} ${n.name} gaze, grade ${gradeText(truth ? t! : g)}`} aria-pressed={on} onClick={() => onSel?.(n.id as Gaze)}>
              <span class="mot-num">{gradeText(truth ? t! : g)}</span>
              {truth && g !== t ? <small>you {gradeText(g)}</small> : null}
            </button>
          );
        })}
      </div>
      <div class="mot-chart__cap" aria-hidden="true"><span>R gaze</span><span>L gaze</span></div>
    </div>
  );
}

export function MotilityGame({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const { audio, fx } = ctx;
  const f = ctx.findings;
  const rng = useMemo(() => ctx.rng.fork('motility'), []);
  const truth = useMemo(() => trueGrid(f), []);
  const pat = useMemo(() => classifyMotility(f), []);
  const mult = useMemo(() => ({ OD: multiplierGrid(f, 'OD'), OS: multiplierGrid(f, 'OS') }), []);
  const base = useMemo(() => {
    const o = { irisColor: ctx.patient.avatar.irisColor, skinTone: SKIN_HEX[ctx.patient.avatar.skin] };
    return { OD: eyeStateFromFindings(f, 'OD', o), OS: eyeStateFromFindings(f, 'OS', o) };
  }, []);
  const challenge = useMemo(() => (ctx.mode === 'practice' ? motilityChallenge(f, rng.fork('q')) : null), []);

  const [tutorial, setTutorial] = useState(true);
  const [mine, setMine] = useState<Grid>(emptyGrid);
  const [sel, setSel] = useState<GradeSel>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [say, setSay] = useState<{ id: number; text: string } | null>(null);
  const [debrief, setDebrief] = useState<{ grading: number; technique: number } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [nudge, setNudge] = useState('');
  const [tab, setTab] = useState<'sweep' | 'grade'>('sweep');
  const autoTab = useRef(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const wandEl = useRef<HTMLDivElement>(null);
  const ghostEl = useRef<HTMLDivElement>(null);
  const dims = useRef({ w: 600, h: 440 });
  const wand = useRef({ x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, drag: false, glide: false });
  const keys = useRef(new Set<string>());
  const sim = useRef({ dwell: {} as Record<string, number>, seen: new Set<string>(), dip: false, dipAt: -1e9, painAt: -1e9, painUntil: 0, sayId: 0, moved: 0, lastX: 0, lastY: 0, tutorial: true, debrief: false });
  const startAt = useRef(performance.now());
  const doneRef = useRef(false);
  const timers = useRef<number[]>([]);
  sim.current.tutorial = tutorial; sim.current.debrief = !!debrief;

  const speak = (text: string) => setSay({ id: ++sim.current.sayId, text });
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
    if (active && keys.current.size) {
      const sp = (keys.current.has('Shift') ? 0.45 : 1.5) * dt / 1000;
      if (keys.current.has('ArrowLeft')) w.tx -= sp;
      if (keys.current.has('ArrowRight')) w.tx += sp;
      if (keys.current.has('ArrowUp')) w.ty -= sp;
      if (keys.current.has('ArrowDown')) w.ty += sp;
      w.tx = Math.max(-1, Math.min(1, w.tx)); w.ty = Math.max(-1, Math.min(1, w.ty));
      w.glide = false;
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
      out[e] = { ...b, gaze: { x, y }, lidAperture: b.lidAperture * (now < s.painUntil ? 0.82 : 1), pupilMm: b.pupilMm };
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
      const gx = Math.max(-W / 2 + 14 - wx + W / 2, Math.min(W - 14 - wx, Math.max(-64, Math.min(64, sgn * mis.dx * 150)))), gy = Math.max(-64, Math.min(64, sgn * mis.dy * 150));
      ghostEl.current.style.transform = `translate(${(wx + gx).toFixed(1)}px, ${(wy + gy).toFixed(1)}px)`;
      ghostEl.current.style.opacity = seesDouble ? '0.8' : '0';
    }
    if (!active) return out;

    // examined positions: hold near a node for ~0.45 s
    const n = nodeNear(w.x, w.y);
    if (n && !s.seen.has(n.id)) {
      s.dwell[n.id] = (s.dwell[n.id] ?? 0) + dt;
      if (s.dwell[n.id]! > 450) {
        s.seen.add(n.id);
        setVisited([...s.seen]);
        play('lens-click', { pitch: 1 + s.seen.size * 0.04 });
        const r = stageRef.current!.getBoundingClientRect();
        fx.burst(r.left + wx, r.top + wy, { kind: 'sparks', count: 14, color: '#ffd27a' });
      }
    }
    // the patient reports what the patient would feel
    if (seesDouble && !s.dip && now - s.dipAt > 1800) {
      s.dip = true; s.dipAt = now;
      speak(`I see two! ${DIP_WORD[mis.kind!].replace(/^./, (c) => c.toUpperCase())}.`);
      play('pop', { pitch: 0.8 });
    } else if (!seesDouble && s.dip) s.dip = false;
    if (f.motility.painOnMovement && speed > 0.25 && Math.hypot(w.x, w.y) > 0.45 && now - s.painAt > 3500) {
      s.painAt = now; s.painUntil = now + 900;
      speak('Ow — it hurts when I move my eyes that way.');
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
  const onKey = (e: KeyboardEvent) => {
    if (e.key.startsWith('Arrow') || e.key === 'Shift') { keys.current.add(e.key); if (e.key !== 'Shift') e.preventDefault(); return; }
    const n = NODES.find((x) => x.key === e.key);
    if (n) { wand.current.tx = n.u; wand.current.ty = n.v; wand.current.glide = true; e.preventDefault(); }
  };
  const onKeyUp = (e: KeyboardEvent) => { keys.current.delete(e.key); };

  const grade = (v: number) => {
    if (!sel) return;
    const nv = Math.max(-4, Math.min(4, v));
    setMine((m) => ({ ...m, [sel.eye]: { ...m[sel.eye], [sel.gaze]: nv } }));
    play('dial', { pitch: 0.9 + (nv + 4) * 0.04 });
  };
  const onRootKey = (e: KeyboardEvent) => {
    if (!sel || tutorial || debrief) return;
    const cur = mine[sel.eye][sel.gaze];
    if (e.key === '+' || e.key === '=') { grade(cur + 1); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { grade(cur - 1); e.preventDefault(); }
    else if (e.key === '0' && !(e.target as HTMLElement).closest?.('.mot-stage')) { grade(0); e.preventDefault(); }
  };

  const gradedCount = EYES.reduce((n, e) => n + GAZE_IDS.filter((g) => mine[e][g] !== 0).length, 0);
  const canRecord = visited.length >= 5;
  const record = () => {
    if (!canRecord) { setNudge('Examine at least five positions of gaze first.'); play('error', { volume: 0.5 }); return; }
    const grading = gradingScore(mine, truth);
    const technique = motilityAccuracy({ grading, visited: visited.length, seconds: (performance.now() - startAt.current) / 1000 });
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
    done({ testId: 'motility', accuracy: Math.max(0, Math.min(1, accuracy)), timeMs: Math.round(performance.now() - startAt.current), findings: reportMotility(f, ctx.patient), perfect });
  };
  const pick = (i: number) => {
    setPicked(i);
    if (challenge) { play(i === challenge.correct ? 'success' : 'fail'); if (i !== challenge.correct) fx.shake(0.4, 200); }
  };

  const all = visited.length >= 9;
  useEffect(() => {
    if (all && !autoTab.current) { autoTab.current = true; setTab('grade'); setNudge('All nine positions seen. Now grade each eye.'); }
  }, [all]);
  const hint = tutorial ? 'Watch the tutorial, or skip it.' : !all ? 'Guide the wand through all nine positions of gaze and watch each eye follow.' : 'Now grade each eye in every gaze: 0 full, − underaction, + overaction.';
  const cur = sel ? mine[sel.eye][sel.gaze] : 0;

  return (
    <div class="mot-root" onKeyDown={onRootKey}>
      <header class="mot-head">
        <div class="mot-head__title"><Icon name="motility" size={20} /> Extraocular motility</div>
        <p class="mot-head__hint" key={hint} aria-live="polite">{hint}</p>
        <button type="button" class="mot-help" onClick={() => setTutorial(true)} aria-label="Show tutorial"><Icon name="info" size={18} /></button>
      </header>
      <div class="mot-main" data-tab={tab}>
        <div class="mot-tabs" role="tablist" aria-label="Examination step">
          <button type="button" role="tab" aria-selected={tab === 'sweep'} class={tab === 'sweep' ? 'is-on' : ''} onClick={() => setTab('sweep')}>1 · Sweep <small>{visited.length}/9</small></button>
          <button type="button" role="tab" aria-selected={tab === 'grade'} class={tab === 'grade' ? 'is-on' : ''} onClick={() => setTab('grade')}>2 · Grade <small>{gradedCount}</small></button>
        </div>
        <div class="mot-wrap">
          <div ref={stageRef} class="mot-stage" tabIndex={0} role="application" aria-label="Fixation wand. Arrow keys move it; number keys jump to the nine positions of gaze."
            style={{ '--mot-skin': SKIN_HEX[ctx.patient.avatar.skin] } as never}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey} onKeyUp={onKeyUp} onBlur={() => keys.current.clear()}>
            <Face />
            <svg class="mot-h" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M10 12H90M10 50H90M10 88H90M50 12V88" />
            </svg>
            {NODES.map((n) => (
              <i key={n.id} id={ID(n.id)} class={`mot-node${visited.includes(n.id) ? ' is-seen' : ''}`} aria-hidden="true"
                style={{ left: `${50 + n.u * 40}%`, top: `${50 + n.v * 38}%` }}><b>{visited.includes(n.id) ? '✓' : n.key}</b></i>
            ))}
            <div class="mot-side mot-side--l" aria-hidden="true">Patient's right</div><div class="mot-side mot-side--r" aria-hidden="true">Patient's left</div>
            <EyePair frame={frame} />
            <div ref={ghostEl} class="mot-ghost" aria-hidden="true" />
            <div ref={wandEl} class="mot-wand" aria-hidden="true"><span class="mot-wand__halo" /><span class="mot-wand__core" /></div>
            {say ? <div class="mot-say" key={say.id} role="status"><span>{ctx.patient.name.split(' ')[0]}</span>{say.text}</div> : null}
          </div>
        </div>
        <aside class="mot-panel" aria-label="Motility chart">
          <div class="mot-charts">
            <HChart eye="OD" grid={mine.OD} sel={sel} onSel={(g) => { setSel({ eye: 'OD', gaze: g }); play('dial', { volume: 0.4 }); }} />
            <HChart eye="OS" grid={mine.OS} sel={sel} onSel={(g) => { setSel({ eye: 'OS', gaze: g }); play('dial', { volume: 0.4 }); }} />
          </div>
          <div class="mot-strip" role="group" aria-label="Grade">
            <p class="mot-eyebrow">{sel ? `${sel.eye} · ${NODES.find((n) => n.id === sel.gaze)!.name} gaze` : 'Tap a cell, then grade it'}</p>
            <div class="mot-strip__row">
              {GRADES.map((g) => (
                <button key={g} type="button" disabled={!sel} class={`mot-g${sel && cur === g ? ' is-on' : ''}`} data-g={g} aria-pressed={!!sel && cur === g} aria-label={`Grade ${gradeText(g)}`} onClick={() => grade(g)}>{gradeText(g)}</button>
              ))}
            </div>
            <p class="mot-legend"><span>underaction</span><span>full</span><span>overaction</span></p>
          </div>
        </aside>
      </div>
      <footer class="mot-foot">
        <div class="mot-foot__bar"><ProgressBar value={visited.length} max={9} label="Positions examined" valueText={`${visited.length} / 9`} accent="#ffd27a" size="sm" /></div>
        <span class="mot-foot__note" role="status">{nudge || `${gradedCount} cells graded`}</span>
        <Button variant="primary" icon="check" onClick={record} disabled={tutorial || !!debrief}>Record findings</Button>
      </footer>
      {tutorial ? <Tutorial eyebrow="Extraocular motility" steps={STEPS} onClose={() => { setTutorial(false); stageRef.current?.focus({ preventScroll: true }); }} /> : null}
      {debrief ? (
        <Debrief title="Motility chart" score={debrief.technique} challenge={challenge} picked={picked} onPick={pick} onFinish={finish} finishLabel={ctx.mode === 'practice' ? 'Finish' : 'Write to chart'}>
          <div class="mot-charts mot-charts--debrief">
            <HChart eye="OD" grid={mine.OD} truth={truth.OD} sel={null} />
            <HChart eye="OS" grid={mine.OS} truth={truth.OS} sel={null} />
          </div>
          {ctx.mode === 'case' || picked != null
            ? <p class="mot-card__body"><b>{pat.chart}.</b> {motilityTeach(pat)}</p>
            : <p class="mot-card__body">Answer the question to see the explanation.</p>}
        </Debrief>
      ) : null}
    </div>
  );
}
