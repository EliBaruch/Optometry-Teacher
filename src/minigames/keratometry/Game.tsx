import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EYES, otherEye, type Eye, type MiniGameContext, type MiniGameDone } from '@core';
import { Button, Icon } from '@ui-kit';
import { Drum } from './Drum';
import { Eyepiece } from './Eyepiece';
import {
  clamp, DRUM, eighth, FOCUS, fusedH, fusedV, layout, MIRE_GRADES, normalizeK, radiusMm, readingOf, wrapAxis,
  type Instrument, type MireGrade,
} from './optics';
import type { ViewScene } from './painter';
import { makeChallenge, type Challenge } from './practice';
import { ChallengeCard, Debrief } from './Results';
import { report } from './report';
import { assess, type Assessment, type EyeReading } from './scoring';
import { Tutorial } from './Tutorial';

const TUT_KEY = 'lumen.keratometry.tutorial.v1';
function tutorialSeen(): boolean {
  try { return localStorage.getItem(TUT_KEY) === '1'; } catch { return false; }
}
function markTutorialSeen(): void {
  try { localStorage.setItem(TUT_KEY, '1'); } catch { /* private mode */ }
}

interface EyeSession {
  ins: Instrument;
  mires: MireGrade | null;
  touched: { focus: boolean; rot: boolean; h: boolean; v: boolean };
  locked: EyeReading | null;
}

type Phase = 'measure' | 'challenge' | 'debrief';

const MIRE_LABEL: Record<MireGrade, string> = { regular: 'Regular', irregular: 'Irregular', distorted: 'Distorted' };

export function Game({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const f = ctx.findings;
  const d = clamp(ctx.difficulty, 0, 1);
  const truth = useMemo(() => ({ OD: normalizeK(f.keratometry.OD), OS: normalizeK(f.keratometry.OS) }), []);
  const hidden = useMemo(() => {
    const r = ctx.rng.fork('keratometer');
    const focus = (): number => (r.chance(0.5) ? 1 : -1) * r.float(0.6, 1.1 + 1.4 * d);
    return {
      focus: { OD: focus(), OS: focus() } as Record<Eye, number>,
      seed: { OD: r.int(1, 9999), OS: r.int(1, 9999) } as Record<Eye, number>,
      irisSeed: r.int(1, 99999),
      startK: d < 0.4 ? 43 : eighth(r.float(40, 46)),
    };
  }, []);
  (window as unknown as Record<string, unknown>).__krDebug = { hidden, truth }; // TEMP-DEBUG
  const challenge = useMemo<Challenge | null>(() => (ctx.mode === 'practice' ? makeChallenge(f, ctx.rng.fork('challenge')) : null), []);

  const fresh = (): EyeSession => ({
    ins: { focus: 0, theta: 0, pH: hidden.startK, pV: hidden.startK },
    mires: null,
    touched: { focus: false, rot: false, h: false, v: false },
    locked: null,
  });
  const [eye, setEye] = useState<Eye>('OD');
  const [eyes, setEyes] = useState<Record<Eye, EyeSession>>(() => ({ OD: fresh(), OS: fresh() }));
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  const [phase, setPhase] = useState<Phase>('measure');
  const [result, setResult] = useState<Assessment | null>(null);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [switching, setSwitching] = useState(0);
  const live = useRef(eyes);
  live.current = eyes;
  const eyeRef = useRef(eye);
  eyeRef.current = eye;
  const t0 = useRef(performance.now());
  const finished = useRef(false);
  const timers = useRef<number[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const lastSfx = useRef(0);
  const fuseState = useRef({ h: false, v: false });
  const glow = useRef({ h: 0, v: 0 });

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
  };
  useEffect(() => () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; }, []);
  useEffect(() => {
    if (!tutorial) rootRef.current?.focus({ preventScroll: true });
  }, [tutorial]);

  const cur = eyes[eye];
  const busy = tutorial || phase !== 'measure';
  const locked = cur.locked !== null;
  const focusErr = cur.ins.focus - hidden.focus[eye];
  const lay = layout(truth[eye], cur.ins, focusErr, hidden.seed[eye]);
  const fh = fusedH(lay);
  const fv = fusedV(lay);

  // a soft click the moment a sign pair fuses (what the examiner sees: one crisp sign)
  useEffect(() => {
    const prev = fuseState.current;
    if (!busy && d < 0.5 && ((fh && !prev.h) || (fv && !prev.v))) ctx.audio.play('lens-click', { pitch: 1.35, volume: 0.35 });
    fuseState.current = { h: fh, v: fv };
  }, [fh, fv]);

  const sfx = (id: 'dial' | 'tick' | 'lens-click', pitch = 1, volume = 0.5) => {
    const now = performance.now();
    if (now - lastSfx.current < 45) return;
    lastSfx.current = now;
    ctx.audio.play(id, { pitch, volume });
  };

  const update = (fn: (s: EyeSession) => EyeSession) => {
    const e = eyeRef.current;
    setEyes((p) => ({ ...p, [e]: fn(p[e]) }));
  };
  const canAdjust = () => !busy && live.current[eyeRef.current].locked === null;

  const onFocus = (n: number, fine: boolean) => {
    if (!canAdjust()) return;
    const step = fine ? FOCUS.fine : FOCUS.step;
    update((s) => ({ ...s, touched: { ...s.touched, focus: true }, ins: { ...s.ins, focus: clamp(Math.round((s.ins.focus + n * step) / FOCUS.fine) * FOCUS.fine, FOCUS.min, FOCUS.max) } }));
    sfx('dial', 0.8 + Math.random() * 0.08, 0.45);
  };
  const onDrum = (which: 'pH' | 'pV') => (n: number) => {
    if (!canAdjust()) return;
    update((s) => ({
      ...s,
      touched: { ...s.touched, [which === 'pH' ? 'h' : 'v']: true },
      ins: { ...s.ins, [which]: clamp(eighth(s.ins[which] + n * DRUM.step), DRUM.min, DRUM.max) },
    }));
    sfx('dial', which === 'pH' ? 1.1 : 1.22, 0.5);
  };
  const onRotate = (deg: number) => {
    if (!canAdjust()) return;
    update((s) => ({ ...s, touched: { ...s.touched, rot: true }, ins: { ...s.ins, theta: Math.round(s.ins.theta + deg) } }));
    sfx('tick', 1.1, 0.35);
  };
  const setMires = (m: MireGrade) => {
    if (!canAdjust()) return;
    update((s) => ({ ...s, mires: m }));
    ctx.audio.play('select', { volume: 0.5 });
  };

  const switchEye = (e: Eye) => {
    if (busy || e === eye) return;
    setEye(e);
    setSwitching((n) => n + 1);
    ctx.audio.play('whoosh', { volume: 0.45 });
  };

  const lock = () => {
    if (busy) return;
    const s = live.current[eye];
    if (s.locked) {
      update((x) => ({ ...x, locked: null }));
      ctx.audio.play('back', { volume: 0.5 });
      return;
    }
    if (!s.mires) return;
    const reading: EyeReading = { ins: { ...s.ins, theta: wrapAxis(s.ins.theta) % 180 }, focusErr: s.ins.focus - hidden.focus[eye], mires: s.mires };
    update((x) => ({ ...x, locked: reading }));
    ctx.audio.play('select', { pitch: 1.2 });
    const r = lockRef.current?.getBoundingClientRect();
    if (r) ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'sparks', count: 14, color: '#ffd27a' });
    const other = otherEye(eye);
    if (!live.current[other].locked) later(ctx.reducedMotion ? 150 : 520, () => switchEyeRef.current(other));
  };
  const switchEyeRef = useRef(switchEye);
  switchEyeRef.current = switchEye;

  const anyLocked = EYES.some((e) => eyes[e].locked);
  const record = () => {
    if (busy || !anyLocked) return;
    const readings: Partial<Record<Eye, EyeReading>> = {};
    for (const e of EYES) if (eyes[e].locked) readings[e] = eyes[e].locked!;
    const a = assess(truth, readings, performance.now() - t0.current);
    setResult(a);
    ctx.audio.play(a.perfect ? 'levelup' : 'success');
    const r = recordRef.current?.getBoundingClientRect();
    if (r) {
      ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: a.perfect ? 'stars' : 'sparks', count: a.perfect ? 40 : 18, color: '#ffd27a' });
      if (a.perfect) ctx.fx.floatText('Perfect alignment', r.left + r.width / 2, r.top - 12, { color: '#ffd27a' });
    }
    setPhase(challenge ? 'challenge' : 'debrief');
  };

  const onAnswer = (ok: boolean) => {
    setAnswer(ok);
    ctx.audio.play(ok ? 'success' : 'fail');
    if (!ok && !ctx.reducedMotion) ctx.fx.shake(4, 220);
  };

  const finish = () => {
    if (finished.current || !result) return;
    finished.current = true;
    const tech = result.accuracy;
    const accuracy = answer === null ? tech : 0.7 * tech + 0.3 * (answer ? 1 : 0);
    done({
      testId: ctx.testId,
      accuracy: Math.round(accuracy * 1000) / 1000,
      timeMs: Math.round(performance.now() - t0.current),
      findings: report(ctx.findings),
      perfect: result.perfect && answer !== false,
    });
  };

  const closeTutorial = () => {
    markTutorialSeen();
    setTutorial(false);
    t0.current = performance.now();
  };

  // root keyboard shortcuts
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || busy) return;
    const k = e.key.toLowerCase();
    const map: Record<string, () => void> = {
      e: () => switchEye(otherEye(eye)),
      l: lock,
      '[': () => onRotate(1),
      ']': () => onRotate(-1),
      '1': () => setMires('regular'),
      '2': () => setMires('irregular'),
      '3': () => setMires('distorted'),
    };
    const fn = map[k];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  // animated fusion bloom, read by the painter each frame
  const scene = (t: number): ViewScene => {
    const e = eyeRef.current;
    const s = live.current[e];
    const fe = s.ins.focus - hidden.focus[e];
    const l = layout(truth[e], s.ins, fe, hidden.seed[e]);
    const g = glow.current;
    const k = ctx.reducedMotion ? 1 : 0.12;
    g.h += ((fusedH(l) ? 1 : 0) - g.h) * k;
    g.v += ((fusedV(l) ? 1 : 0) - g.v) * k;
    const amp = ctx.reducedMotion ? 0 : 0.004 + 0.008 * d;
    const drift = { x: amp * (Math.sin(t * 0.71) + 0.5 * Math.sin(t * 1.93 + 1)), y: amp * (Math.sin(t * 0.53 + 2) + 0.4 * Math.sin(t * 2.3)) };
    return { k: truth[e], lay: l, theta: s.ins.theta, seed: hidden.seed[e], t, drift, glowH: g.h, glowV: g.v, iris: null };
  };

  const rd = readingOf(cur.ins);
  const cylNow = Math.abs(rd.k2 - rd.k1);
  const axis = String(wrapAxis(cur.ins.theta)).padStart(3, '0');
  const axisV = String(wrapAxis(cur.ins.theta + 90)).padStart(3, '0');
  const other = otherEye(eye);
  const hint = tutorial
    ? 'Measure the curvature of the front of the cornea.'
    : locked
      ? eyes[other].locked ? 'Both eyes measured — record your findings.' : `${eye} locked. Switch to ${other} (E).`
      : !cur.touched.focus ? 'Turn Focus until the lower-right ring stops doubling and its edge is crisp.'
        : !cur.touched.rot ? 'Rotate the bezel until the plus-sign bars run in one unbroken line.'
          : !cur.touched.h ? 'Turn the horizontal drum to superimpose the gold plus signs.'
            : !cur.touched.v ? 'Turn the vertical drum to superimpose the blue minus signs.'
              : !cur.mires ? 'Judge the mires — round and crisp, wavy, or broken?'
                : `Happy with the alignment? Lock the ${eye} reading (L).`;
  const pupil = f.pupils?.sizeLightMm?.[eye] ?? 3.5;

  return (
    <div class="kr-root" ref={rootRef} tabIndex={-1} onKeyDown={onKey}>
      <header class="kr-head">
        <div class="kr-head__title"><Icon name="keratometry" /> <span>Keratometer</span></div>
        <p class="kr-head__hint" key={hint} aria-live="polite">{hint}</p>
        <div class="kr-seg" role="radiogroup" aria-label="Eye">
          {EYES.map((e) => (
            <button key={e} type="button" role="radio" aria-checked={eye === e} class={`kr-seg__b${eye === e ? ' is-on' : ''}`} onClick={() => switchEye(e)} disabled={busy}>
              {e}
              {eyes[e].locked && <Icon name="check" class="kr-seg__ok" />}
            </button>
          ))}
        </div>
      </header>

      <main class="kr-stage">
        <section class={`kr-scope${switching ? ' is-switching' : ''}`} key={`scope-${switching}`} aria-label={`Eyepiece view, ${eye}`}>
          <Eyepiece
            scene={scene}
            theta={cur.ins.theta}
            axisLabel={axis}
            onRotate={(n) => onRotate(n)}
            disabled={busy || locked}
            reduced={ctx.reducedMotion}
            iris={{ color: ctx.patient.avatar.irisColor, seed: hidden.irisSeed + (eye === 'OS' ? 7 : 0), pupilFrac: clamp(pupil / 11.8, 0.16, 0.6) }}
            version={0}
          />
          <span class="kr-scope__eye" aria-hidden="true">{eye}</span>
          {locked && <span class="kr-scope__lock"><Icon name="lock" /> Locked</span>}
        </section>

        <section class="kr-panel" aria-label="Instrument controls">
          <Drum
            id="kr-focus" label="Focus" kind="knurl" accent="violet"
            display={`${cur.ins.focus >= 0 ? '+' : '−'}${Math.abs(cur.ins.focus).toFixed(2)} mm`}
            value={cur.ins.focus} min={FOCUS.min} max={FOCUS.max} step={FOCUS.step} ppu={60}
            onStep={onFocus} disabled={busy || locked}
          />
          <Drum
            id="kr-h" label={`Horizontal · ${axis}°`} kind="scale" accent="gold"
            display={`${cur.ins.pH.toFixed(2)} D`} sub={`r ${radiusMm(cur.ins.pH).toFixed(2)} mm`}
            value={cur.ins.pH} min={DRUM.min} max={DRUM.max} step={DRUM.step} ppu={44}
            onStep={onDrum('pH')} disabled={busy || locked}
          />
          <Drum
            id="kr-v" label={`Vertical · ${axisV}°`} kind="scale" accent="ice"
            display={`${cur.ins.pV.toFixed(2)} D`} sub={`r ${radiusMm(cur.ins.pV).toFixed(2)} mm`}
            value={cur.ins.pV} min={DRUM.min} max={DRUM.max} step={DRUM.step} ppu={44}
            onStep={onDrum('pV')} disabled={busy || locked}
          />

          <div class="kr-readout" aria-live="off">
            <div><span>K1 flat</span><b class="kr-num">{rd.k1.toFixed(2)}</b><em class="kr-num">@ {String(rd.axisK1).padStart(3, '0')}</em></div>
            <div><span>K2 steep</span><b class="kr-num">{rd.k2.toFixed(2)}</b><em class="kr-num">@ {String(wrapAxis(rd.axisK1 + 90)).padStart(3, '0')}</em></div>
            <div class="kr-readout__cyl"><span>Cyl = K2 − K1</span><b class="kr-num">{cylNow.toFixed(2)}</b><em>D</em></div>
          </div>

          <div class="kr-mires">
            <span class="kr-mires__k" id="kr-mires-k">Mires</span>
            <div class="kr-chips" role="radiogroup" aria-labelledby="kr-mires-k">
              {MIRE_GRADES.map((m, i) => (
                <button key={m} type="button" role="radio" aria-checked={cur.mires === m} class={`kr-chip${cur.mires === m ? ' is-on' : ''}`} onClick={() => setMires(m)} disabled={busy || locked} title={`${MIRE_LABEL[m]} (${i + 1})`}>
                  {MIRE_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <div class="kr-lock" ref={lockRef}>
            <Button
              variant={locked ? 'ghost' : 'glass'} size="sm" icon={locked ? 'unlock' : 'lock'} block
              onClick={lock} disabled={busy || (!locked && !cur.mires)} sfx={false}
              title={!locked && !cur.mires ? 'Grade the mires first' : undefined}
            >
              {locked ? `Re-measure ${eye}` : cur.mires ? `Lock ${eye} reading` : 'Grade the mires to lock'}
            </Button>
          </div>
        </section>
      </main>

      <footer class="kr-foot">
        <div class="kr-progress">
          {EYES.map((e) => {
            const l = eyes[e].locked;
            return (
              <span key={e} class={`kr-progress__e${l ? ' is-done' : ''}${e === eye ? ' is-cur' : ''}`}>
                <b>{e}</b>
                <span class="kr-num">{l ? `${readingOf(l.ins).k1.toFixed(2)} / ${readingOf(l.ins).k2.toFixed(2)} @ ${String(readingOf(l.ins).axisK1).padStart(3, '0')}` : 'not measured'}</span>
              </span>
            );
          })}
        </div>
        <div ref={recordRef}>
          <Button variant="primary" icon="check" onClick={record} disabled={busy || !anyLocked} sfx={false}>Record findings</Button>
        </div>
      </footer>

      {tutorial && <Tutorial onClose={closeTutorial} />}
      {phase === 'challenge' && challenge && <ChallengeCard challenge={challenge} onAnswer={onAnswer} onNext={() => setPhase('debrief')} />}
      {phase === 'debrief' && result && (
        <Debrief assessment={result} truth={truth} practice={ctx.mode === 'practice'} challengeCorrect={answer} onDone={finish} />
      )}
    </div>
  );
}
