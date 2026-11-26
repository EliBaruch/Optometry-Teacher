import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Eye, MiniGameContext, MiniGameDone } from '@core';
import { Button, Icon, ProgressBar } from '@ui-kit';
import { pickStrings } from '@core';
import { eyeStateFromFindings, nasalSign } from '@render';
import {
  BLUR_REPORT_D, ConvSim, PUSHUP_FAR_CM, convTruth, convergenceDemandPD, convergenceGaze, defocusD, expectedPushupD, hofstetter, type ConvTruth,
} from './model';
import { convergenceAccuracy } from './scoring';
import { reportConvergenceFor } from './report';
import { S, fixBidi } from './strings';
import { convergenceChallenge } from './practice';
import { Debrief, EyePair, Face, openLid, SKIN_HEX, Tutorial, useNudge, type EyeFrame } from './ui';
import { PlanView, type PlanState } from './PlanView';

const STEP_TARGETS = ['.mot-ctl', '.mot-stage', '.mot-panel--conv'];
type Phase = 'brk' | 'rec' | 'amp';
/** Display gain so adduction reads on the face (true angle is small; drawn ~3x so near convergence is obvious). */
const CONV_VISUAL = 3.0;
/** How far (gaze units, temporal) the breaking eye swings out at full drift. */
const BREAK_SWING = 0.45;
const OTHER = (e: Eye): Eye => (e === 'OD' ? 'OS' : 'OD');
const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function ConvergenceGame({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const { audio, fx } = ctx;
  const t = pickStrings(S, ctx.locale);
  const loc = ctx.locale;
  const f = ctx.findings;
  const age = ctx.patient.age;
  const rng = useMemo(() => ctx.rng.fork('convergence'), []);
  const truth = useMemo<ConvTruth>(() => convTruth(f, rng.fork('t'), ctx.difficulty), []);
  const amps = f.accommodation.amplitudeD;
  const base = useMemo(() => {
    const ortho = { horizontal: 0, vertical: 0, type: 'ortho' as const };
    const nf = { ...f, motility: { ...f.motility, distance: ortho, near: ortho } };
    const o = { irisColor: ctx.patient.avatar.irisColor, skinTone: SKIN_HEX[ctx.patient.avatar.skin] };
    return { OD: eyeStateFromFindings(nf, 'OD', o), OS: eyeStateFromFindings(nf, 'OS', o) };
  }, []);
  const challenge = useMemo(() => (ctx.mode === 'practice' ? convergenceChallenge(f, age, rng.fork('q'), ctx.locale) : null), []);

  const [tutorial, setTutorial] = useState(true);
  const [phase, setPhase] = useState<Phase>('brk');
  const [ampEye, setAmpEye] = useState<Eye>('OD');
  const [marks, setMarks] = useState<{ brk: number | null; rec: number | null; amp: Partial<Record<Eye, number>> }>({ brk: null, rec: null, amp: {} });
  const [trials, setTrials] = useState(1);
  const [say, setSay] = useState<{ id: number; text: string } | null>(null);
  const [nudge, setNudge] = useNudge();
  const [debrief, setDebrief] = useState<{ accuracy: number } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [flag, setFlag] = useState<Eye | null>(null);

  const max = phase === 'amp' ? PUSHUP_FAR_CM : 40;
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLSpanElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);
  const liveRead = useRef<HTMLElement>(null);
  const livePD = useRef<HTMLElement>(null);
  const liveEyes = useRef<HTMLElement>(null);
  const gaugeRef = useRef<HTMLElement>(null);
  const planDraw = useRef<(s: PlanState) => void>(() => {});
  const pins = useRef<{ brk: number | null; rec: number | null }>({ brk: null, rec: null });
  const paceRef = useRef<HTMLSpanElement>(null);
  const paceTxt = useRef<HTMLSpanElement>(null);
  const c = useRef({ d: 40, td: 40, vel: 0, sp: 0, cg: convergenceGaze(40), drag: false, holdAt: 0, hold: 0 as -1 | 0 | 1, slow: false, fast: 0, moving: 0 });
  const sim = useRef(new ConvSim(truth));
  const live = useRef({ phase, ampEye, max, tutorial, debrief: false, silent: truth.silent, prev: 'fused' as 'fused' | 'broken', blurSaid: false, sayId: 0 });
  pins.current = { brk: marks.brk, rec: marks.rec };
  live.current.phase = phase; live.current.ampEye = ampEye; live.current.max = max; live.current.tutorial = tutorial; live.current.debrief = !!debrief;
  const startAt = useRef(performance.now());
  const doneRef = useRef(false);

  const play = (id: Parameters<typeof audio.play>[0], o?: { volume?: number; pitch?: number }) => audio.play(id, o);
  const speak = (text: string) => setSay({ id: ++live.current.sayId, text });
  useEffect(() => { rootRef.current?.focus({ preventScroll: true }); }, []);

  const frame = (dt: number): EyeFrame => {
    const L = live.current, k = c.current;
    const active = !L.tutorial && !L.debrief;
    if (active) {
      const target = k.hold * (k.slow ? 1.5 : 3);
      k.vel += (target - k.vel) * (1 - Math.exp(-dt / 140));
      if (!k.drag && Math.abs(k.vel) > 0.01) k.td += (k.vel * dt) / 1000;
    }
    k.td = Math.max(1.5, Math.min(L.max, k.td));
    const prevD = k.d;
    k.d += (k.td - k.d) * (1 - Math.exp(-dt / (k.drag ? 45 : 28)));
    const speed = (Math.abs(k.d - prevD) / Math.max(1, dt)) * 1000;
    k.sp += (speed - k.sp) * 0.12;
    const inBreakZone = L.phase !== 'amp' && k.d < truth.breakCm + 8;
    if (active && inBreakZone && k.sp > 0.4) { k.moving += dt; if (k.sp > 6) k.fast += dt; }

    let state = sim.current.state;
    if (L.phase !== 'amp') state = sim.current.step(dt, k.d);
    else sim.current.drift += (0 - sim.current.drift) * 0.2;
    if (active && L.phase !== 'amp' && state !== L.prev) {
      L.prev = state;
      setFlag(state === 'broken' ? truth.deviatingEye : null);
      if (state === 'broken') {
        play('thud', { volume: 0.4 });
        if (!L.silent) { speak(t.sayDouble); play('pop', { pitch: 0.8 }); }
      } else if (!L.silent) speak(t.saySingle);
    }
    k.cg += (convergenceGaze(k.d) - k.cg) * (1 - Math.exp(-dt / 70));

    const prox = Math.max(0, Math.min(1, 1 - k.d / 40));
    const out = {} as EyeFrame;
    for (const e of ['OD', 'OS'] as Eye[]) {
      const b = base[e];
      const drift = L.phase !== 'amp' && e === truth.deviatingEye ? sim.current.drift : 0;
      out[e] = { ...b, lidAperture: openLid(b.lidAperture), gaze: { x: Math.max(-1, Math.min(1, nasalSign(e) * (Math.min(1, k.cg * CONV_VISUAL) * (1 - drift) - BREAK_SWING * drift))), y: 0.04 + 0.06 * prox }, pupilMm: Math.max(2, b.pupilMm - 1.4 * prox) };
    }

    // DOM: ruler handle, front-view card, readouts
    const pct = (k.d / L.max) * 100;
    if (handleRef.current) handleRef.current.style.left = `${pct}%`;
    if (cardRef.current) {
      // perspective: the card swells, tips toward the examiner and throws a longer shadow as it nears the face
      const narrow = (rootRef.current?.clientWidth ?? 900) < 600;
      const sc = Math.min(narrow ? 0.95 : 1.5, 0.46 + 14 / (k.d + 6)), tilt = 26 * prox * prox;
      cardRef.current.style.transform = `translate(-50%, ${(-prox * 10).toFixed(1)}px) perspective(380px) rotateX(${tilt.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
      cardRef.current.style.setProperty('--p', prox.toFixed(3));
    }
    if (beamRef.current) { beamRef.current.style.opacity = String((0.25 + 0.75 * prox).toFixed(2)); beamRef.current.style.transform = `translateX(-50%) scaleX(${(0.6 + 1.2 * prox).toFixed(2)})`; }
    if (chipRef.current) chipRef.current.textContent = t.cm(fmt(k.d));
    if (liveRead.current) liveRead.current.textContent = t.cm(fmt(k.d));
    if (livePD.current) {
      // Demand = IPD(cm) x vergence(D); beyond ~100 Δ it is outside physiological convergence, so cap the display.
      const pd = convergenceDemandPD(Math.max(1.5, k.d));
      livePD.current.textContent = pd > 99 ? '>99 Δ' : `${pd} Δ`;
    }
    if (liveEyes.current) {
      const br = L.phase !== 'amp' && state === 'broken';
      liveEyes.current.textContent = L.phase === 'amp' ? t.stateAccom : br ? t.stateDrift : t.stateFused;
      liveEyes.current.dataset.s = br ? 'bad' : 'ok';
    }
    if (gaugeRef.current) gaugeRef.current.style.left = `${Math.min(100, (k.d / 20) * 100)}%`;
    planDraw.current({ d: k.d, drift: L.phase === 'amp' ? 0 : sim.current.drift, devEye: truth.deviatingEye, pins: pins.current });
    if (readRef.current) readRef.current.textContent = t.cm(fmt(k.d));
    if (paceRef.current) paceRef.current.style.width = `${Math.min(100, (k.sp / 8) * 100)}%`;
    if (paceTxt.current) {
      paceTxt.current.textContent = k.sp < 0.4 ? t.paceStill : k.sp > 5.5 ? t.paceFast : k.sp < 1.5 ? t.paceSlow : t.paceGood;
      paceTxt.current.dataset.s = k.sp > 5.5 ? 'fast' : k.sp >= 1.5 ? 'good' : 'idle';
    }
    if (lettersRef.current) {
      const dem = L.phase === 'amp' ? defocusD(k.d, amps[L.ampEye]) : 0;
      lettersRef.current.style.filter = dem > 0.05 ? `blur(${Math.min(6, dem * 2.6).toFixed(2)}px)` : 'none';
      if (L.phase === 'amp' && active) {
        if (dem >= BLUR_REPORT_D && !L.blurSaid) { L.blurSaid = true; speak(t.sayBlur); play('pop', { pitch: 1.2, volume: 0.5 }); }
        else if (dem < 0.05 && L.blurSaid) L.blurSaid = false;
      }
    }
    return out;
  };

  const resetTarget = (d: number) => { c.current.d = d; c.current.td = d; c.current.vel = 0; };
  const retry = () => {
    sim.current = new ConvSim(truth); live.current.prev = 'fused';
    resetTarget(40); c.current.fast = 0; c.current.moving = 0;
    setMarks((m) => ({ ...m, brk: null, rec: null })); setFlag(null); setPhase('brk'); setTrials((n) => n + 1); setSay(null); setNudge('');
    play('whoosh', { volume: 0.4 });
  };

  const mark = () => {
    if (tutorial || debrief) return;
    const d = c.current.d, st = sim.current.state;
    const h = handleRef.current?.getBoundingClientRect();
    const burst = () => h && fx.burst(h.left + h.width / 2, h.top, { kind: 'sparks', count: 8, color: '#2257f0' });
    setNudge('');
    if (phase === 'brk') {
      if (st !== 'broken') { setNudge(t.nudgeFused); play('error', { volume: 0.5 }); return; }
      setMarks((m) => ({ ...m, brk: d })); setPhase('rec'); play('lens-click'); burst();
    } else if (phase === 'rec') {
      if (st !== 'fused') { setNudge(t.nudgeOut); play('error', { volume: 0.5 }); return; }
      setMarks((m) => ({ ...m, rec: d })); play('lens-click'); burst();
      setPhase('amp'); resetTarget(PUSHUP_FAR_CM); live.current.blurSaid = false; setSay(null);
    } else {
      setMarks((m) => ({ ...m, amp: { ...m.amp, [ampEye]: 100 / d } })); play('lens-click', { pitch: 1.2 }); burst();
      const other = OTHER(ampEye);
      if (marks.amp[other] == null) { setAmpEye(other); resetTarget(PUSHUP_FAR_CM); live.current.blurSaid = false; setSay(null); }
    }
  };
  const chooseEye = (e: Eye) => { if (e === ampEye) return; setAmpEye(e); resetTarget(PUSHUP_FAR_CM); live.current.blurSaid = false; setSay(null); play('lens-click', { volume: 0.5 }); };

  const onKeyDown = (e: KeyboardEvent) => {
    if (tutorial || debrief) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      if (!e.repeat && c.current.hold !== dir) { c.current.td += dir; c.current.hold = dir; }   // a tap nudges 1 cm; holding glides
      e.preventDefault();
    }
    else if (e.key === 'Shift') c.current.slow = true;
    else if (e.key === 'b' || e.key === 'B') { mark(); e.preventDefault(); }
    else if ((e.key === ' ' || e.key === 'Enter') && !(e.target as HTMLElement).closest?.('button')) { mark(); e.preventDefault(); }
    else if ((e.key === 'r' || e.key === 'R') && phase !== 'amp') retry();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if ((e.key === 'ArrowLeft' && c.current.hold === -1) || (e.key === 'ArrowRight' && c.current.hold === 1)) c.current.hold = 0;
    if (e.key === 'Shift') c.current.slow = false;
  };
  const rulerTo = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    c.current.td = Math.max(1.5, Math.min(max, ((clientX - r.left) / r.width) * max));
  };
  // Hold buttons work with mouse, pen and touch; a quick tap nudges the target 2 cm so phones never depend on a long press.
  const hold = (dir: -1 | 1) => {
    const stop = (e?: PointerEvent) => {
      if (c.current.hold !== dir) return;
      c.current.hold = 0;
      if (e && e.type === 'pointerup' && performance.now() - c.current.holdAt < 220) c.current.td += dir * 2;
    };
    return {
      onPointerDown: (e: PointerEvent) => { try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } c.current.hold = dir; c.current.holdAt = performance.now(); e.preventDefault(); rootRef.current?.focus({ preventScroll: true }); },
      onPointerUp: stop, onPointerCancel: () => stop(), onLostPointerCapture: () => stop(), onContextMenu: (e: Event) => e.preventDefault(),
    };
  };

  const amp = (e: Eye) => marks.amp[e];
  const ampErr = (e: Eye) => (amp(e) == null ? null : amp(e)! - expectedPushupD(amps[e]));
  const stepsDone = (marks.brk != null ? 1 : 0) + (marks.rec != null ? 1 : 0) + (amp('OD') != null ? 1 : 0) + (amp('OS') != null ? 1 : 0);
  const canRecord = marks.brk != null && marks.rec != null && amp('OD') != null && amp('OS') != null;
  const gateHint = marks.brk == null ? t.gateBreak : marks.rec == null ? t.gateRecovery : t.gateAmp;
  const record = () => {
    if (!canRecord) { setNudge(gateHint); play('error', { volume: 0.5 }); return; }
    const k = c.current;
    const accuracy = convergenceAccuracy({
      breakErr: marks.brk! - truth.breakCm, recoveryErr: marks.rec! - truth.recoveryCm, breakCm: truth.breakCm, recoveryCm: truth.recoveryCm,
      ampErrD: [ampErr('OD'), ampErr('OS')], fastShare: k.moving > 0 ? k.fast / k.moving : 0, trials,
    });
    play('stamp'); setDebrief({ accuracy });
  };
  const finish = () => {
    if (doneRef.current || !debrief) return;
    doneRef.current = true;
    const right = challenge && picked === challenge.correct;
    const accuracy = Math.max(0, Math.min(1, challenge ? 0.65 * debrief.accuracy + 0.35 * (right ? 1 : 0) : debrief.accuracy));
    play(accuracy > 0.7 ? 'success' : 'select');
    done({ testId: 'convergence', accuracy, timeMs: Math.round(performance.now() - startAt.current), findings: reportConvergenceFor(f, ctx.patient, ctx.locale), perfect: accuracy >= 0.95 && amp('OD') != null && amp('OS') != null });
  };
  const pick = (i: number) => { setPicked(i); if (challenge) { play(i === challenge.correct ? 'success' : 'fail'); if (i !== challenge.correct) fx.shake(0.4, 200); } };

  const hint = tutorial ? t.watchTutorial
    : phase === 'brk' ? t.hintBreak
    : phase === 'rec' ? t.hintRecover
    : t.hintAmp(OTHER(ampEye));
  const label = phase === 'brk' ? t.lblBreak : phase === 'rec' ? t.lblRecovered : t.lblBlurry;
  const ticks = Array.from({ length: max + 1 }, (_, i) => i);
  const labelEvery = max > 40 ? 10 : 5;
  const h = hofstetter(age);

  return (
    <div class="mot-root" ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
      <header class="mot-head">
        <div class="mot-head__title"><Icon name="convergence" size={20} /> {t.convTitle}</div>
        <p class="mot-head__hint" key={hint} aria-live="polite">{fixBidi(hint, loc)}</p>
        {phase === 'amp' ? (
          <div class="mot-seg" role="group" aria-label={t.eyeUnderTest} dir="ltr">
            {(['OD', 'OS'] as Eye[]).map((e) => (
              <button key={e} type="button" class={`mot-seg__b${ampEye === e ? ' is-on' : ''}`} aria-pressed={ampEye === e} onClick={() => chooseEye(e)}>{e}{amp(e) != null ? ' ✓' : ''}</button>
            ))}
          </div>
        ) : null}
        <button type="button" class="mot-help" onClick={() => setTutorial(true)} aria-label={t.showTutorial}><Icon name="info" size={18} /></button>
      </header>
      <div class="mot-main mot-main--conv">
        <div class="mot-wrap">
          <div class="mot-sayrow" aria-live="polite">{say ? <div class="mot-say" key={say.id} role="status"><span>{ctx.patient.name.split(' ')[0]}</span>{say.text}</div> : null}</div>
          <div class="mot-stage mot-stage--conv" dir="ltr" style={{ '--mot-skin': SKIN_HEX[ctx.patient.avatar.skin] } as never}>
            <Face dy={-8} />
            <EyePair frame={frame} flag={phase === 'amp' || ctx.mode !== 'practice' ? null : flag} covered={phase === 'amp' ? OTHER(ampEye) : null} />
            <div ref={beamRef} class="mot-beam" aria-hidden="true" />
            <div ref={cardRef} class="mot-tcard" aria-hidden="true"><span class="mot-tcard__wand" /><span class="mot-tcard__grip" /><div ref={lettersRef} class="mot-tcard__l">E F P T</div><span ref={chipRef} class="mot-tcard__cm mot-num">{t.cm("40.0")}</span></div>
          </div>
          <div class="mot-ruler" aria-label={t.rulerAria} dir="ltr">
            <div class="mot-ruler__eye" aria-hidden="true"><Icon name="eye" size={20} /><small>{phase === 'amp' ? t.rulerEye : t.rulerNose}</small><span ref={readRef} class="mot-ruler__read mot-num">{t.cm("40.0")}</span></div>
            <div ref={trackRef} class="mot-ruler__track" onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); c.current.drag = true; rulerTo(e.clientX); rootRef.current?.focus({ preventScroll: true }); }}
              onPointerMove={(e) => { if (c.current.drag) rulerTo(e.clientX); }} onPointerUp={() => { c.current.drag = false; }} onPointerCancel={() => { c.current.drag = false; }}
              onWheel={(e) => { e.preventDefault(); c.current.td += Math.sign(e.deltaY) * 0.5; }}>
              <div class="mot-scale">
              <div class="mot-ticks" aria-hidden="true">
                {ticks.map((t) => <i key={t} class={t % labelEvery === 0 ? 'is-l' : t % 5 === 0 ? 'is-m' : ''} style={{ left: `${(t / max) * 100}%` }}>{t % labelEvery === 0 ? <b>{t}</b> : null}</i>)}
              </div>
              {marks.brk != null && phase !== 'amp' ? <span class="mot-pin mot-pin--b" style={{ left: `${(marks.brk / max) * 100}%` }}>B {fmt(marks.brk)}</span> : null}
              {marks.rec != null && phase !== 'amp' ? <span class="mot-pin mot-pin--r" style={{ left: `${(marks.rec / max) * 100}%` }}>R {fmt(marks.rec)}</span> : null}
              {phase === 'amp' && amp(ampEye) != null ? <span class="mot-pin mot-pin--b" style={{ left: `${(100 / amp(ampEye)! / max) * 100}%` }}>{fmt(amp(ampEye)!)} D</span> : null}
              <div ref={handleRef} class="mot-handle" role="slider" aria-label={t.sliderAria} aria-valuemin={1.5} aria-valuemax={max} aria-valuenow={Math.round(c.current.td)}>
                <span class="mot-handle__card">E</span>
              </div>
              </div>
            </div>
          </div>
          <div class="mot-ctl" dir="ltr">
            <button type="button" class="mot-hold" {...hold(-1)} aria-label={t.approachAria}><Icon name="chevron-left" size={18} /> {t.approach} <kbd>←</kbd></button>
            <div class="mot-pace" aria-hidden="true"><span class="mot-pace__bar"><i class="mot-pace__ok" /><i ref={paceRef} /></span><span ref={paceTxt} class="mot-pace__t">still</span></div>
            <button type="button" class="mot-hold" {...hold(1)} aria-label={t.retreatAria}><kbd>→</kbd> {t.retreat} <Icon name="chevron-right" size={18} /></button>
            <Button variant="primary" onClick={mark} icon="target" disabled={tutorial || !!debrief}>{label}</Button>
            {phase !== 'amp' ? <Button variant="ghost" size="sm" icon="refresh" onClick={retry} disabled={tutorial || !!debrief}>{t.repeat}</Button> : null}
          </div>
        </div>
        <aside class="mot-panel mot-panel--conv" aria-label={t.measAria}>
          <p class="mot-eyebrow">{t.planView}</p>
          <div class="mot-planwrap"><PlanView t={t} bind={(fn) => { planDraw.current = fn; }} /></div>
          <div class="mot-live" aria-hidden="true">
            <div><span>{t.liveTarget}</span><b ref={liveRead} class="mot-num">{t.cm("40.0")}</b></div>
            <div><span>{t.liveDemand}</span><b ref={livePD} class="mot-num" dir="ltr">16 Δ</b></div>
            <div><span>{t.liveEyes}</span><b ref={liveEyes} data-s="ok">{t.stateFused}</b></div>
          </div>
          <p class="mot-eyebrow">{t.measTitle}</p>
          <dl class="mot-meas">
            <div><dt>{t.mBreak}</dt><dd class="mot-num">{marks.brk != null ? t.cm(fmt(marks.brk)) : '—'}</dd></div>
            <div><dt>{t.mRecovery}</dt><dd class="mot-num">{marks.rec != null ? t.cm(fmt(marks.rec)) : '—'}</dd></div>
            <div><dt>{t.mAmpOD}</dt><dd class="mot-num">{amp('OD') != null ? `${fmt(amp('OD')!)} D` : '—'}</dd></div>
            <div><dt>{t.mAmpOS}</dt><dd class="mot-num">{amp('OS') != null ? `${fmt(amp('OS')!)} D` : '—'}</dd></div>
          </dl>
          <div class="mot-gauge" aria-hidden="true" dir="ltr">
            <div class="mot-gauge__bar"><i class="z-ok" /><i class="z-mid" /><i class="z-bad" /><span ref={gaugeRef} class="mot-gauge__now" />
              {marks.brk != null ? <span class="mot-gauge__pin" style={{ left: `${Math.min(100, (marks.brk / 20) * 100)}%` }}>B</span> : null}</div>
            <p><span>0</span><span>{t.gaugeNormal}</span><span>{t.gaugeReceded}</span><span>20</span></p>
          </div>
          <p class="mot-norms">{fixBidi(t.norms(age, fmt(Math.max(h.avg, 0.5)), h.min >= 0.5 ? fmt(h.min) : null), loc)}{' '}{t.normsKeys.map(([k, txt]) => <span key={k}><b dir="ltr">{k}</b>{txt}</span>)}</p>
        </aside>
      </div>
      {nudge ? <div class="mot-toast" role="status" key={nudge}>{fixBidi(nudge, loc)}</div> : null}
      <footer class="mot-foot">
        <div class="mot-foot__bar"><span class="mot-foot__lab mot-num">{t.measuredLabel(stepsDone)}</span><ProgressBar value={stepsDone} max={4} ariaLabel={t.measuredAria} accent="#2257f0" size="sm" /></div>
        {!canRecord && !tutorial ? <span class="mot-foot__note" id="mot-gate">{fixBidi(gateHint, loc)}</span> : null}
        <Button variant="primary" icon="check" onClick={record} disabled={tutorial || !!debrief || !canRecord} aria-describedby={canRecord ? undefined : 'mot-gate'}>{t.recordFindings}</Button>
      </footer>
      {tutorial ? <Tutorial t={t} loc={loc} eyebrow={t.convTutEyebrow} steps={t.convSteps.map((s, i) => ({ ...s, target: STEP_TARGETS[i] }))} onClose={() => { setTutorial(false); rootRef.current?.focus({ preventScroll: true }); }} /> : null}
      {debrief ? (
        <Debrief t={t} loc={loc} title={t.convTutEyebrow} score={debrief.accuracy} challenge={challenge} picked={picked} onPick={pick} onFinish={finish} finishLabel={ctx.mode === 'practice' ? t.finish : t.writeToChart}>
          <table class="mot-cmp">
            <thead><tr><th /><th>{t.cmp.you}</th><th>{t.cmp.actual}</th></tr></thead>
            <tbody>
              <tr><th>{t.mBreak}</th><td>{t.cm(fmt(marks.brk!))}</td><td>{t.cm(fmt(truth.breakCm))}</td></tr>
              <tr><th>{t.mRecovery}</th><td>{t.cm(fmt(marks.rec!))}</td><td>{t.cm(fmt(truth.recoveryCm))}</td></tr>
              {(['OD', 'OS'] as Eye[]).map((e) => (
                <tr key={e}><th>{t.cmp.ampOf(e)}</th><td>{amp(e) != null ? `${fmt(amp(e)!)} D` : t.cmp.notMeasured}</td><td>{amps[e] < 1.6 ? `≤ ${fmt(Math.max(amps[e], 1.5))}` : fmt(amps[e])} D</td></tr>
              ))}
            </tbody>
          </table>
        </Debrief>
      ) : null}
    </div>
  );
}
