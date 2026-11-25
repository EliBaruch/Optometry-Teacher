import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EYES, type Eye, type MiniGameContext, type MiniGameDone } from '@core';
import { EyeCanvas, eyeStateFromFindings, type EyeState } from '@render';
import { Button, Icon, Kbd, ProgressBar } from '@ui-kit';
import { pickStrings } from '@core';
import { fix, S } from './strings';
import { LocaleContext } from './locale';
import { Gauge, G_STEP } from './Gauge';
import { Tutorial } from './Tutorial';
import { Debrief } from './Debrief';
import { profiles, PupilSim, trueSize, type Cond, type Room } from './model';
import { Engine, type Live } from './engine';
import { emptyDom, measureField, paintFrame, type Dom } from './paint';
import { bindKeys } from './keys';
import { buildTasks } from './tasks';
import { assess, DWELL_FULL_S, emptyMeasures, goodSwings, SWINGS_NEEDED, truthCall, type Call, type Measures, type Swing, type Tech } from './scoring';
import { explain, makeChallenge } from './practice';
import { reportFor } from './report';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const GAP = 14;
const EYE_COLOR: Record<Eye, string> = { OD: '#ffd27a', OS: '#7fe3ff' };
/** Below this stage width the eyes stack and the gauge docks under them. */
const STACK_BELOW_PX = 620;
const SETTLED_S = 1.2;
const EYE_ASPECT = 0.54;
const GOOD_SIZE_MM = 0.3;
const FAR_SIZE_MM = 0.6;
const UI_TICK_MS = 130;
const REDUCED_PAINT_MS = 110;
/** Phone layout: height reserved for the docked gauge, the action row and paddings. */
const DOCK_H = 172;
const ACTIONS_H = 48;
const BODY_PAD = 34;
const MIN_EYE_W = 160;
/** Only dock the gauge when the stacked eyes stay at least this wide. */
const MIN_DOCK_EYE_W = 200;

interface Layout { eyeW: number; eyeH: number; stack: boolean; dock: boolean }
interface Ui { settled: boolean; lit: Eye | null; dwell: number; nearS: number }
type Tone = 'ok' | 'warn' | 'info';

export function Game({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const { audio, fx } = ctx;
  const t = pickStrings(S, ctx.locale);
  const fixL = (s: string) => fix(ctx.locale, s);
  const reduced = ctx.reducedMotion;
  const f = ctx.findings;
  const rng = useMemo(() => ctx.rng.fork('pupils'), []);
  const prof = useMemo(() => profiles(f), []);

  const [room, setRoom] = useState<Room>('dim');
  const [near, setNear] = useState(false);
  const [tutorial, setTutorial] = useState(true);
  const [phase, setPhase] = useState<'exam' | 'debrief'>('exam');
  const [eye, setEye] = useState<Eye>('OD');
  const [gauge, setGauge] = useState(4);
  const [measures, setMeasures] = useState<Measures>(emptyMeasures());
  const [swings, setSwings] = useState<Swing[]>([]);
  const [call, setCall] = useState<Call>({ side: null, grade: null });
  const [layout, setLayout] = useState<Layout>({ eyeW: 420, eyeH: 220, stack: false, dock: false });
  const [ui, setUi] = useState<Ui>({ settled: false, lit: null, dwell: 0, nearS: 0 });
  const [toast, setToast] = useState<{ text: string; tone: Tone; k: number } | null>(null);
  const [, setTick] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dom = useRef<Dom>(emptyDom());
  const calledRef = useRef(false);
  const toastK = useRef(0);
  const gaugeAt = useRef(0);

  const eyeStates = useMemo(() => {
    const mk = (e: Eye): EyeState => ({ ...eyeStateFromFindings(f, e, { lighting: 'dim', irisColor: ctx.patient.avatar.irisColor }), pupilMm: prof[e].dark });
    return { OD: mk('OD'), OS: mk('OS') } as Record<Eye, EyeState>;
  }, []);

  const play = (id: Parameters<typeof audio.play>[0], o?: { volume?: number; pitch?: number }) => audio.play(id, o);
  const say = (text: string, tone: Tone = 'info') => setToast({ text, tone, k: ++toastK.current });

  // The engine is created once; its hooks reach the latest closures through `act`.
  const act = useRef({ onSwing: (_s: Swing) => {}, onCue: () => {} });
  const eng = useMemo(
    () => new Engine(
      new PupilSim(prof, { hippus: reduced ? 0 : 0.08 + 0.14 * ctx.difficulty, phase: rng.float(0, 6) }), eyeStates, reduced,
      { onSwing: (s) => act.current.onSwing(s), onDwellCue: () => act.current.onCue() },
    ),
    [],
  );
  const live = useRef<Live>({ room, near, tutorial, phase, eye, gauge, eyeW: layout.eyeW, eyeH: layout.eyeH, stack: layout.stack });
  live.current = { room, near, tutorial, phase, eye, gauge, eyeW: layout.eyeW, eyeH: layout.eyeH, stack: layout.stack };

  // ───────────── stage fitting
  useEffect(() => {
    const el = wrapRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const fit = () => {
      const w = el.clientWidth;
      if (!w) return;
      const stack = w < STACK_BELOW_PX;
      let eyeW = stack ? w : (w - GAP) / 2;
      let dock = false;
      if (stack && root.clientHeight) {
        // Both stacked eyes plus actions, gauge dock and padding must fit in the body, measured live.
        const body = root.querySelector('.pu-body') as HTMLElement | null;
        const gaugeEl = root.querySelector('.pu-panel--gauge') as HTMLElement | null;
        const actionsEl = root.querySelector('.pu-actions-row') as HTMLElement | null;
        const avail = body ? body.clientHeight : 0;
        const dockH = Math.max(gaugeEl?.offsetHeight ?? 0, DOCK_H);
        const actionsH = Math.max(actionsEl?.offsetHeight ?? 0, ACTIONS_H);
        const free = avail - dockH - actionsH - BODY_PAD - 2 * GAP;
        const fitW = (free - GAP) / (2 * EYE_ASPECT);
        dock = avail > 0 && fitW >= MIN_DOCK_EYE_W;
        if (dock) eyeW = Math.min(eyeW, fitW);
      }
      eyeW = Math.round(clamp(eyeW, MIN_EYE_W, 520));
      const eyeH = Math.round(Math.min(eyeW * EYE_ASPECT, 290));
      setLayout((p) => (p.eyeW === eyeW && p.eyeH === eyeH && p.stack === stack && p.dock === dock ? p : { eyeW, eyeH, stack, dock }));
    };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    ro?.observe(root);
    fit();
    return () => ro?.disconnect();
  }, []);

  // ───────────── frame loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let uiAt = 0;
    let tickAt = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      measureField(dom.current, eng);
      const L = live.current;
      eng.update(dt, L);
      paintFrame(dom.current, eng, L, eyeStates);
      if (reduced && now - tickAt > REDUCED_PAINT_MS) { tickAt = now; setTick((n) => n + 1); }
      if (now - uiAt > UI_TICK_MS) {
        uiAt = now;
        setUi({ settled: eng.stable > SETTLED_S, lit: eng.curEye, dwell: eng.dwell, nearS: eng.nearSecs });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ───────────── swings
  act.current.onCue = () => play('lens-click', { pitch: 1.4, volume: 0.5 });
  act.current.onSwing = (sw) => {
    const all = [...eng.swings];
    setSwings(all);
    const good = sw.dwell >= DWELL_FULL_S;
    play(good ? 'flashlight' : 'tick', { pitch: good ? 1 : 0.8 });
    const fr = dom.current.field?.getBoundingClientRect();
    if (fr) fx.floatText(good ? t.swing(all.length) : t.holdLonger, fr.left + eng.beam.x, fr.top + eng.beam.y - 40, { color: good ? '#ffd27a' : '#ffb36b', size: 22 });
    say(good ? t.swingRecorded(all.length) : fixL(t.heldShort(sw.dwell.toFixed(1))), good ? 'ok' : 'warn');
    if (sw.transit > 1.6) say(t.swingFaster, 'warn');
    if (good && goodSwings(all) === SWINGS_NEEDED) { play('success'); fx.burst(innerWidth / 2, innerHeight / 2, { kind: 'sparks', count: 20, color: '#ffd27a' }); }
  };

  // ───────────── penlight pointer
  const toField = (ev: PointerEvent) => {
    const r = dom.current.field!.getBoundingClientRect();
    return { x: clamp(ev.clientX - r.left, 0, r.width), y: clamp(ev.clientY - r.top, 0, r.height) };
  };
  const onDown = (ev: PointerEvent) => {
    if (live.current.tutorial || live.current.near) return;
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    eng.dragging = true;
    const p = toField(ev);
    eng.aimAt(p.x, p.y);
    if (live.current.room === 'dim') play('flashlight', { volume: 0.5 });
  };
  const onMove = (ev: PointerEvent) => {
    if (!eng.dragging) return;
    const p = toField(ev);
    eng.aimAt(p.x, p.y);
  };
  const onUp = () => { eng.dragging = false; };

  // ───────────── actions
  const setNearMode = (on: boolean) => {
    if (on && live.current.room === 'bright') { say(t.dimFirst, 'warn'); return; }
    play(on ? 'whoosh' : 'tick', { pitch: 1.2 });
    live.current.near = on;
    setNear(on);
  };
  const setRoomMode = (r: Room) => {
    if (r === live.current.room) return;
    play(r === 'bright' ? 'whoosh' : 'click');
    if (r === 'bright' && !reduced) fx.flash('#fff6df', 240);
    if (r === 'bright' && live.current.near) setNearMode(false);
    live.current.room = r;
    setRoom(r);
  };
  const pickEye = (e: Eye) => { if (e !== live.current.eye) { play('lens-click', { volume: 0.5 }); live.current.eye = e; setEye(e); } };
  const setG = (v: number) => {
    const L = live.current;
    if (v === L.gauge) return;
    L.gauge = v;
    setGauge(v);
    if (eng.t - gaugeAt.current > 0.04) { gaugeAt.current = eng.t; play('dial', { pitch: 0.85 + v / 14, volume: 0.6 }); }
  };
  const swingOver = () => {
    const L = live.current;
    if (!L.tutorial && !L.near && L.room === 'dim') eng.swingOver();
  };
  const aim = (e: Eye) => { const L = live.current; if (L.room === 'dim' && !L.near) eng.aimEye(e); };

  /** Which condition a reading taken now would count for, or null if it cannot be taken. */
  const canMeasure = (): Cond | null => {
    const L = live.current;
    if (L.near) return null;
    if (L.room === 'bright') return 'light';
    return eng.curEye === L.eye || eng.cov[L.eye] > 0.15 ? null : 'dark';
  };

  const record = () => {
    const L = live.current;
    if (L.phase !== 'exam' || L.tutorial) return;
    const cond = canMeasure();
    if (!cond) {
      say(L.near ? t.removeNear : t.moveAway, 'warn');
      play('error', { volume: 0.5 });
      return;
    }
    const mm = L.gauge;
    const err = mm - trueSize(f, L.eye, cond);
    const settled = eng.stable > SETTLED_S;
    const next: Measures = { ...measuresRef.current, [cond]: { ...measuresRef.current[cond], [L.eye]: { mm, settled } } };
    measuresRef.current = next;
    setMeasures(next);
    play('lens-click');
    const fr = rootRef.current?.getBoundingClientRect();
    if (Math.abs(err) <= GOOD_SIZE_MM && settled) {
      play('success', { volume: 0.7 });
      if (fr) fx.burst(fr.left + fr.width / 2, fr.top + fr.height * 0.4, { kind: 'stars', count: 14, color: '#ffd27a' });
      say(fixL(t.spotOn(L.eye, t.cond[cond], mm.toFixed(1))), 'ok');
    } else if (!settled) say(fixL(t.stillMoving(L.eye, t.cond[cond], mm.toFixed(1))), 'warn');
    else if (Math.abs(err) > FAR_SIZE_MM) say(fixL(t.looksOff(L.eye, t.cond[cond], mm.toFixed(1), err > 0)), 'warn');
    else say(fixL(t.sizeRecorded(L.eye, t.cond[cond], mm.toFixed(1))), 'ok');
    const other: Eye = L.eye === 'OD' ? 'OS' : 'OD';
    if (!next[cond][other]) pickEye(other);
  };
  const measuresRef = useRef(measures);

  // ───────────── keyboard
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const off = bindKeys(root, {
      active: () => !live.current.tutorial && live.current.phase === 'exam',
      aim, swing: swingOver, record,
      toggleRoom: () => setRoomMode(live.current.room === 'bright' ? 'dim' : 'bright'),
      toggleNear: () => setNearMode(!live.current.near),
      gaugeBy: (d) => setG(clamp(live.current.gauge + d * G_STEP, 2, 9)),
      otherEye: () => pickEye(live.current.eye === 'OD' ? 'OS' : 'OD'),
    });
    root.focus({ preventScroll: true });
    return off;
  }, []);

  // ───────────── finishing
  const techNow = (): Tech => ({ measures, swings, nearSeconds: eng.nearSecs, call, timeMs: Math.round(eng.active * 1000) });
  const assessment = useMemo(() => assess(f, techNow()), [phase]);
  const tech = useMemo(techNow, [phase]);
  const challenge = useMemo(() => (ctx.mode === 'practice' && phase === 'debrief' ? makeChallenge(f, rng.fork('quiz'), ctx.locale) : null), [phase]);
  const tasks = buildTasks(measures, swings, ui.nearS, call, ctx.locale);
  const doneCount = tasks.filter((t) => t.done).length;

  const recordAll = () => {
    if (live.current.phase !== 'exam') return;
    play('stamp');
    live.current.phase = 'debrief';
    setPhase('debrief');
  };
  const finish = (quizCorrect: boolean | null) => {
    if (calledRef.current) return;
    calledRef.current = true;
    const a = assessment;
    const accuracy = quizCorrect === null ? a.accuracy : a.accuracy * 0.75 + (quizCorrect ? 0.25 : 0);
    play(accuracy > 0.65 ? 'success' : 'fail');
    done({ testId: 'pupils', accuracy: clamp(accuracy, 0, 1), timeMs: tech.timeMs, findings: reportFor(f, ctx.locale), perfect: a.perfect && (quizCorrect === null || quizCorrect) });
  };

  // ───────────── derived UI
  const measurable = canMeasure();
  const hint = tutorial ? t.hintTut
    : near ? t.hintNear
    : room === 'bright' ? t.hintBright
    : ui.lit ? t.hintLit(ui.lit)
    : t.hintDim;
  const { eyeW, eyeH, stack, dock } = layout;
  const fieldH = stack ? eyeH * 2 + GAP : eyeH;
  const calledSide = call.side;

  return (
    <LocaleContext.Provider value={ctx.locale}>
    <div class={`pu-root${stack ? ' is-compact' : ''}${dock ? ' is-docked' : ''}`} ref={rootRef} tabIndex={-1} data-phase={phase} data-lit={ui.lit ?? ''} data-room={room} data-swings={swings.length} data-good-swings={goodSwings(swings)}>
      <header class="pu-head">
        <div class="pu-head__title"><Icon name="pupils" /> {t.title}</div>
        <p class="pu-head__hint" key={hint} aria-live="polite">{hint}</p>
        <div class="pu-seg" role="group" aria-label={t.roomLighting}>
          {(['bright', 'dim'] as Room[]).map((r) => (
            <button key={r} type="button" class={`pu-seg__b${room === r ? ' is-on' : ''}`} aria-pressed={room === r} onClick={() => setRoomMode(r)}>{r === 'bright' ? t.lightsOn : t.dimRoom}</button>
          ))}
        </div>
      </header>

      <div class="pu-body">
        <div class="pu-fieldwrap" ref={wrapRef}>
          <div
            dir="ltr"
            class={`pu-field${stack ? ' is-stack' : ''}${room === 'bright' ? ' is-bright' : ''}`}
            ref={(el) => { dom.current.field = el; }}
            style={{ height: `${fieldH}px` }}
            onPointerDown={onDown as never}
            onPointerMove={onMove as never}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <div class="pu-eyes" style={{ gap: `${GAP}px`, flexDirection: stack ? 'column' : 'row' }}>
              {EYES.map((e) => (
                <div key={e} class={`pu-eye${ui.lit === e ? ' is-lit' : ''}${eye === e ? ' is-active' : ''}`} ref={(el) => { dom.current.eyes[e] = el; }} style={{ width: `${eyeW}px`, height: `${eyeH}px` }}>
                  <EyeCanvas state={reduced ? { ...eyeStates[e] } : eyeStates[e]} width={eyeW} height={eyeH} reducedMotion={reduced} blink={!reduced} label={t.eyeName(e)} />
                  <svg class="pu-eye__ov" viewBox={`0 0 ${eyeW} ${eyeH}`} aria-hidden="true">
                    <path ref={(el) => { dom.current.gaugePaths[e] = el; }} class="pu-gpath" d="" />
                  </svg>
                  <button type="button" class="pu-eye__tag" onClick={(ev) => { ev.stopPropagation(); pickEye(e); }} onPointerDown={(ev) => ev.stopPropagation()} aria-pressed={eye === e} aria-label={t.selectEye(e)}>
                    <i style={{ background: EYE_COLOR[e] }} />{e}<small>{t.eyeSide(e)}</small>
                  </button>
                </div>
              ))}
            </div>
            <div class={`pu-nearpin${near ? ' is-on' : ''}`} aria-hidden="true"><b>{t.near}</b><i>33 cm</i></div>
            <div class="pu-spot" ref={(el) => { dom.current.spot = el; }} style={{ ['--r' as never]: `${Math.round(eyeW * 0.2)}px` }} aria-hidden="true" />
            <svg class="pu-ring" ref={(el) => { dom.current.ringBox = el; }} width="84" height="84" viewBox="-42 -42 84 84" aria-hidden="true">
              <circle r="36" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="3" />
              <circle ref={(el) => { dom.current.ring = el; }} r="36" fill="none" stroke-width="3.5" stroke-linecap="round" pathLength={100} stroke-dasharray="100" style={{ strokeDashoffset: '100', transform: 'rotate(-90deg)' }} />
            </svg>
            <div class="pu-pen" ref={(el) => { dom.current.pen = el; }} aria-hidden="true"><i /></div>
            {room === 'dim' && !near && !tutorial && swings.length === 0 && !ui.lit && <p class="pu-field__tip">{t.dragPen}</p>}
          </div>
          <div class="pu-actions-row">
            <Button variant="glass" size="sm" icon="arrow-right" sfx={false} disabled={room === 'bright' || near} onClick={swingOver}>{t.swingLight} <Kbd>Space</Kbd></Button>
            <Button variant={near ? 'primary' : 'glass'} size="sm" icon="eye" sfx={false} aria-pressed={near} onClick={() => setNearMode(!near)}>{near ? t.removeNearBtn : t.nearBtn} <Kbd>N</Kbd></Button>
          </div>
        </div>

        <div class="pu-dock">
          <section class="pu-panel pu-panel--gauge" aria-label={t.gaugePanel}>
            <div class="pu-panel__h"><span class="pu-eyebrow">{t.gaugePanel}</span>
              <div class="pu-seg pu-seg--sm" dir="ltr" role="group" aria-label={t.eyeMeasured}>
                {EYES.map((e) => <button key={e} type="button" class={`pu-seg__b${eye === e ? ' is-on' : ''}`} aria-pressed={eye === e} onClick={() => pickEye(e)}>{e}</button>)}
              </div>
            </div>
            <Gauge value={gauge} onChange={setG} label={t.gaugeLabel(eye)} valueText={t.millimetres} />
            <div class="pu-readrow">
              <div class="pu-lcd"><b class="pu-num">{gauge.toFixed(1)}</b><small>mm</small></div>
              <div class={`pu-settle${ui.settled ? ' is-ok' : ''}`}><i />{ui.settled ? t.settled : t.moving}</div>
              <Button variant="primary" size="sm" sfx={false} disabled={!measurable} onClick={record}>{t.recordSize}</Button>
            </div>
            <table class="pu-meas" dir="ltr" aria-label={t.recordedSizes}>
              <thead><tr><th /><th>OD</th><th>OS</th></tr></thead>
              <tbody>
                {(['light', 'dark'] as Cond[]).map((c) => (
                  <tr key={c}><th>{t.condCap[c]}</th>
                    {EYES.map((e) => <td key={e} class="pu-num">{measures[c][e] ? `${measures[c][e]!.mm.toFixed(1)}` : '·'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </section>

          <section class="pu-panel pu-panel--trace" aria-label={t.pupillometerAria}>
            <div class="pu-panel__h"><span class="pu-eyebrow">{t.pupillometer}</span>
              <span class="pu-legend" dir="ltr"><i style={{ background: EYE_COLOR.OD }} />OD <i style={{ background: EYE_COLOR.OS }} />OS</span></div>
            <canvas ref={(el) => { dom.current.trace = el; }} class="pu-trace" width={360} height={96} role="img" aria-label={t.traceLabel} />
            <ul class="pu-tasks">
              {tasks.map((t) => (
                <li key={t.id} class={t.done ? 'is-done' : ''}>
                  <span class="pu-tick">{t.done ? <Icon name="check" /> : null}</span>
                  <span class="pu-tasks__l"><b>{t.label}</b><small>{t.sub}</small></span>
                  <span class="pu-num pu-tasks__p">{t.prog}</span>
                </li>
              ))}
            </ul>
          </section>

          <section class="pu-panel pu-panel--call" aria-label={t.yourCall}>
            <div class="pu-panel__h"><span class="pu-eyebrow">{t.yourCall}</span></div>
            <p class="pu-note">{t.callQ}</p>
            <div class="pu-seg pu-seg--wide" role="radiogroup" aria-label={t.rapdSide}>
              {([['none', t.noRapd], ['OD', 'OD'], ['OS', 'OS']] as const).map(([v, label]) => (
                <button key={v} type="button" role="radio" aria-checked={calledSide === v} class={`pu-seg__b${calledSide === v ? ' is-on' : ''}`}
                  onClick={() => { play('lens-click', { volume: 0.5 }); setCall({ side: v, grade: v === 'none' ? null : call.grade }); }}>{label}</button>
              ))}
            </div>
            <div class={`pu-grades${calledSide === 'OD' || calledSide === 'OS' ? '' : ' is-off'}`} role="radiogroup" aria-label={t.rapdGrade}>
              {([1, 2, 3, 4] as const).map((g) => (
                <button key={g} type="button" role="radio" aria-checked={call.grade === g} disabled={calledSide !== 'OD' && calledSide !== 'OS'} class={`pu-seg__b${call.grade === g ? ' is-on' : ''}`}
                  onClick={() => { play('tick', { pitch: 0.8 + g * 0.1 }); setCall({ ...call, grade: g }); }}>{g}+</button>
              ))}
            </div>
            <p class="pu-note pu-note--dim">{fixL(t.gradeNote)}</p>
          </section>
        </div>
      </div>

      <footer class="pu-foot">
        <ProgressBar value={doneCount} max={tasks.length} size="sm" label={t.steps(doneCount, tasks.length)} ariaLabel={t.examProgress} />
        <div class="pu-toast" role="status" aria-live="polite">{toast && <span key={toast.k} class={`pu-toast__t is-${toast.tone}`}>{toast.text}</span>}</div>
        <Button variant="primary" size="md" icon="check" sfx={false} onClick={recordAll} disabled={tutorial}>{t.recordFindings}</Button>
      </footer>

      {tutorial && <Tutorial onClose={() => { live.current.tutorial = false; setTutorial(false); rootRef.current?.focus({ preventScroll: true }); }} />}
      {phase === 'debrief' && <Debrief teach={explain(f, ctx.locale)} assessment={assessment} tech={tech} truthCall={truthCall(f)} challenge={challenge} onFinish={finish} />}
    </div>
    </LocaleContext.Provider>
  );
}
