import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Eye, MiniGameContext, MiniGameDone } from '@core';
import { Button, Icon, ProgressBar } from '@ui-kit';
import { eyeStateFromFindings, nasalSign } from '@render';
import {
  BLUR_REPORT_D, ConvSim, PUSHUP_FAR_CM, convTruth, convergenceGaze, defocusD, expectedPushupD, hofstetter, type ConvTruth,
} from './model';
import { convergenceAccuracy } from './scoring';
import { reportConvergence } from './report';
import { convergenceChallenge } from './practice';
import { Debrief, EyePair, Face, openLid, SKIN_HEX, Tutorial, type EyeFrame, type TutStep } from './ui';

const STEPS: TutStep[] = [
  { title: 'Bring the target in slowly', body: 'Hold the approach button (or the left arrow) to slide the accommodative target toward the nose at a steady 2–5 cm per second. Too fast and you will overshoot the true break.', keys: ['← hold', 'Drag'] },
  { title: 'Break, then recovery', body: 'Watch both eyes. When one drifts outward the patient sees double: press Break. Then retreat slowly until the eye swings back in and single vision returns: press Recovered.', keys: ['B', 'Space'] },
  { title: 'Push-up amplitude', body: 'Cover one eye and bring a line of small letters toward it until they stay blurred: that near point gives the amplitude of accommodation in dioptres (100 ÷ cm). Repeat for the other eye.', keys: ['OD', 'OS'] },
];
type Phase = 'brk' | 'rec' | 'amp';
const OTHER = (e: Eye): Eye => (e === 'OD' ? 'OS' : 'OD');
const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function ConvergenceGame({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const { audio, fx } = ctx;
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
  const challenge = useMemo(() => (ctx.mode === 'practice' ? convergenceChallenge(f, age, rng.fork('q')) : null), []);

  const [tutorial, setTutorial] = useState(true);
  const [phase, setPhase] = useState<Phase>('brk');
  const [ampEye, setAmpEye] = useState<Eye>('OD');
  const [marks, setMarks] = useState<{ brk: number | null; rec: number | null; amp: Partial<Record<Eye, number>> }>({ brk: null, rec: null, amp: {} });
  const [trials, setTrials] = useState(1);
  const [say, setSay] = useState<{ id: number; text: string } | null>(null);
  const [nudge, setNudge] = useState('');
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
  const paceRef = useRef<HTMLSpanElement>(null);
  const paceTxt = useRef<HTMLSpanElement>(null);
  const c = useRef({ d: 40, td: 40, vel: 0, sp: 0, cg: convergenceGaze(40), drag: false, holdAt: 0, hold: 0 as -1 | 0 | 1, slow: false, fast: 0, moving: 0 });
  const sim = useRef(new ConvSim(truth));
  const live = useRef({ phase, ampEye, max, tutorial, debrief: false, silent: truth.silent, prev: 'fused' as 'fused' | 'broken', blurSaid: false, sayId: 0 });
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
        if (!L.silent) { speak('Double! Now I see two targets.'); play('pop', { pitch: 0.8 }); }
      } else if (!L.silent) speak('It is single again.');
    }
    k.cg += (convergenceGaze(k.d) - k.cg) * (1 - Math.exp(-dt / 70));

    const prox = Math.max(0, Math.min(1, 1 - k.d / 40));
    const out = {} as EyeFrame;
    for (const e of ['OD', 'OS'] as Eye[]) {
      const b = base[e];
      const drift = L.phase !== 'amp' && e === truth.deviatingEye ? sim.current.drift : 0;
      out[e] = { ...b, lidAperture: openLid(b.lidAperture), gaze: { x: nasalSign(e) * k.cg * (1 - 1.7 * drift), y: 0.05 + 0.08 * prox }, pupilMm: Math.max(2, b.pupilMm - 1.4 * prox) };
    }

    // DOM: ruler handle, front-view card, readouts
    const pct = (k.d / L.max) * 100;
    if (handleRef.current) handleRef.current.style.left = `${pct}%`;
    if (cardRef.current) cardRef.current.style.transform = `translate(-50%, 0) scale(${(0.3 + 14 / (k.d + 4)).toFixed(3)})`;
    if (readRef.current) readRef.current.textContent = `${fmt(k.d)} cm`;
    if (paceRef.current) paceRef.current.style.width = `${Math.min(100, (k.sp / 8) * 100)}%`;
    if (paceTxt.current) {
      paceTxt.current.textContent = k.sp < 0.4 ? 'still' : k.sp > 5.5 ? 'too fast' : k.sp < 1.5 ? 'slow' : 'good pace';
      paceTxt.current.dataset.s = k.sp > 5.5 ? 'fast' : k.sp >= 1.5 ? 'good' : 'idle';
    }
    if (lettersRef.current) {
      const dem = L.phase === 'amp' ? defocusD(k.d, amps[L.ampEye]) : 0;
      lettersRef.current.style.filter = dem > 0.05 ? `blur(${Math.min(6, dem * 2.6).toFixed(2)}px)` : 'none';
      if (L.phase === 'amp' && active) {
        if (dem >= BLUR_REPORT_D && !L.blurSaid) { L.blurSaid = true; speak('It is starting to blur.'); play('pop', { pitch: 1.2, volume: 0.5 }); }
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
    const burst = () => h && fx.burst(h.left + h.width / 2, h.top, { kind: 'sparks', count: 14, color: '#ffd27a' });
    setNudge('');
    if (phase === 'brk') {
      if (st !== 'broken') { setNudge('Both eyes are still fused. Keep advancing and watch for one eye to drift out.'); play('error', { volume: 0.5 }); return; }
      setMarks((m) => ({ ...m, brk: d })); setPhase('rec'); play('lens-click'); burst();
    } else if (phase === 'rec') {
      if (st !== 'fused') { setNudge('One eye is still out. Retreat slowly until it swings back in.'); play('error', { volume: 0.5 }); return; }
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
    if (e.key === 'ArrowLeft') { c.current.hold = -1; e.preventDefault(); }
    else if (e.key === 'ArrowRight') { c.current.hold = 1; e.preventDefault(); }
    else if (e.key === 'Shift') c.current.slow = true;
    else if ((e.key === 'b' || e.key === 'B' || e.key === ' ' || e.key === 'Enter') && !(e.target as HTMLElement).closest?.('button')) { mark(); e.preventDefault(); }
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
  const canRecord = marks.brk != null && marks.rec != null;
  const record = () => {
    if (!canRecord) { setNudge('Mark the break and the recovery first.'); play('error', { volume: 0.5 }); return; }
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
    done({ testId: 'convergence', accuracy, timeMs: Math.round(performance.now() - startAt.current), findings: reportConvergence(f, ctx.patient), perfect: accuracy >= 0.95 && amp('OD') != null && amp('OS') != null });
  };
  const pick = (i: number) => { setPicked(i); if (challenge) { play(i === challenge.correct ? 'success' : 'fail'); if (i !== challenge.correct) fx.shake(0.4, 200); } };

  const hint = tutorial ? 'Watch the tutorial, or skip it.'
    : phase === 'brk' ? 'Advance the target slowly toward the nose. Press Break the instant one eye drifts out.'
    : phase === 'rec' ? 'Now retreat slowly until both eyes straighten, then press Recovered.'
    : `Push-up with the ${OTHER(ampEye)} covered: bring the letters in until they stay blurred, then press Blurry.`;
  const label = phase === 'brk' ? 'Break!' : phase === 'rec' ? 'Recovered' : 'Blurry';
  const ticks = Array.from({ length: max + 1 }, (_, i) => i);
  const labelEvery = max > 40 ? 10 : 5;
  const h = hofstetter(age);

  return (
    <div class="mot-root" ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
      <header class="mot-head">
        <div class="mot-head__title"><Icon name="convergence" size={20} /> Near point of convergence</div>
        <p class="mot-head__hint" key={hint} aria-live="polite">{hint}</p>
        {phase === 'amp' ? (
          <div class="mot-seg" role="group" aria-label="Eye under test">
            {(['OD', 'OS'] as Eye[]).map((e) => (
              <button key={e} type="button" class={`mot-seg__b${ampEye === e ? ' is-on' : ''}`} aria-pressed={ampEye === e} onClick={() => chooseEye(e)}>{e}{amp(e) != null ? ' ✓' : ''}</button>
            ))}
          </div>
        ) : null}
        <button type="button" class="mot-help" onClick={() => setTutorial(true)} aria-label="Show tutorial"><Icon name="info" size={18} /></button>
      </header>
      <div class="mot-main mot-main--conv">
        <div class="mot-wrap">
          <div class="mot-stage mot-stage--conv" style={{ '--mot-skin': SKIN_HEX[ctx.patient.avatar.skin] } as never}>
            <Face />
            <EyePair frame={frame} flag={phase === 'amp' || ctx.mode !== 'practice' ? null : flag} covered={phase === 'amp' ? OTHER(ampEye) : null} />
            <div ref={cardRef} class="mot-tcard" aria-hidden="true"><div ref={lettersRef} class="mot-tcard__l">E F P T</div></div>
            {say ? <div class="mot-say" key={say.id} role="status"><span>{ctx.patient.name.split(' ')[0]}</span>{say.text}</div> : null}
          </div>
          <div class="mot-ruler" aria-label="Ruler">
            <div class="mot-ruler__eye" aria-hidden="true"><Icon name="eye" size={20} /><small>{phase === 'amp' ? 'eye' : 'nose'}</small><span ref={readRef} class="mot-ruler__read mot-num">40.0 cm</span></div>
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
              <div ref={handleRef} class="mot-handle" role="slider" aria-label="Target distance in centimetres" aria-valuemin={1.5} aria-valuemax={max} aria-valuenow={Math.round(c.current.td)}>
                <span class="mot-handle__card">E</span>
              </div>
              </div>
            </div>
          </div>
          <div class="mot-ctl">
            <button type="button" class="mot-hold" {...hold(-1)} aria-label="Hold to bring the target toward the nose"><Icon name="chevron-left" size={18} /> Approach</button>
            <div class="mot-pace" aria-hidden="true"><span class="mot-pace__bar"><i class="mot-pace__ok" /><i ref={paceRef} /></span><span ref={paceTxt} class="mot-pace__t">still</span></div>
            <button type="button" class="mot-hold" {...hold(1)} aria-label="Hold to move the target away">Retreat <Icon name="chevron-right" size={18} /></button>
            <Button variant="primary" onClick={mark} icon="target" disabled={tutorial || !!debrief}>{label}</Button>
            {phase !== 'amp' ? <Button variant="ghost" size="sm" icon="refresh" onClick={retry} disabled={tutorial || !!debrief}>Repeat</Button> : null}
          </div>
        </div>
        <aside class="mot-panel mot-panel--conv" aria-label="Measurements">
          <p class="mot-eyebrow">Measurements</p>
          <dl class="mot-meas">
            <div><dt>NPC break</dt><dd class="mot-num">{marks.brk != null ? `${fmt(marks.brk)} cm` : '—'}</dd></div>
            <div><dt>NPC recovery</dt><dd class="mot-num">{marks.rec != null ? `${fmt(marks.rec)} cm` : '—'}</dd></div>
            <div><dt>Amplitude OD</dt><dd class="mot-num">{amp('OD') != null ? `${fmt(amp('OD')!)} D` : '—'}</dd></div>
            <div><dt>Amplitude OS</dt><dd class="mot-num">{amp('OS') != null ? `${fmt(amp('OS')!)} D` : '—'}</dd></div>
          </dl>
          <p class="mot-norms">Normal NPC: break ≤ 6 cm, recovery ≤ 7 cm; receded beyond 10 cm. Expected amplitude for {age}: about {fmt(Math.max(h.avg, 0.5))} D ({h.min >= 0.5 ? `minimum ${fmt(h.min)} D` : 'no minimum expected at this age'}).</p>
          <p class="mot-norms">Keys: <b>← / →</b> move (Shift = slower), <b>B</b> or <b>Space</b> marks, <b>R</b> repeats.</p>
        </aside>
      </div>
      <footer class="mot-foot">
        <div class="mot-foot__bar"><span class="mot-foot__lab mot-num">{stepsDone}/4 measured</span><ProgressBar value={stepsDone} max={4} ariaLabel="Measurements completed" accent="#ffd27a" size="sm" /></div>
        <span class="mot-foot__note" role="status">{nudge}</span>
        <Button variant="primary" icon="check" onClick={record} disabled={tutorial || !!debrief}>Record findings</Button>
      </footer>
      {tutorial ? <Tutorial eyebrow="Convergence & accommodation" steps={STEPS} onClose={() => { setTutorial(false); rootRef.current?.focus({ preventScroll: true }); }} /> : null}
      {debrief ? (
        <Debrief title="Convergence & accommodation" score={debrief.accuracy} challenge={challenge} picked={picked} onPick={pick} onFinish={finish} finishLabel={ctx.mode === 'practice' ? 'Finish' : 'Write to chart'}>
          <table class="mot-cmp">
            <thead><tr><th /><th>You</th><th>Actual</th></tr></thead>
            <tbody>
              <tr><th>NPC break</th><td>{fmt(marks.brk!)} cm</td><td>{fmt(truth.breakCm)} cm</td></tr>
              <tr><th>NPC recovery</th><td>{fmt(marks.rec!)} cm</td><td>{fmt(truth.recoveryCm)} cm</td></tr>
              {(['OD', 'OS'] as Eye[]).map((e) => (
                <tr key={e}><th>Amplitude {e}</th><td>{amp(e) != null ? `${fmt(amp(e)!)} D` : 'not measured'}</td><td>{amps[e] < 1.6 ? `≤ ${fmt(Math.max(amps[e], 1.5))}` : fmt(amps[e])} D</td></tr>
              ))}
            </tbody>
          </table>
        </Debrief>
      ) : null}
    </div>
  );
}
