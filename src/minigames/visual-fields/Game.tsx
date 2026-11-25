import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EYES, otherEye, type Eye, type MiniGameContext, type MiniGameResult, type SfxId } from '@core';
import { Button, Icon, Kbd } from '@ui-kit';
import { Bowl, type BowlLiveRef } from './Bowl';
import { Console } from './Console';
import { Debrief } from './Debrief';
import { Pathway } from './Pathway';
import { Picker } from './Picker';
import { Printout } from './Printout';
import { Tutorial, tutorialSeen } from './Tutorial';
import { localise, patternOf, type Localisation, type Pattern } from './interpret';
import { grid242, pointKey, type FieldPoint } from './model';
import { makeResponder, MAX_DB, type PointResult, type Responder, type TestMode } from './patient';
import { report, fieldOf } from './report';
import { Runner } from './runner';
import { classifyScore, localisationScore, MIN_POINTS, scoreExam, techniqueScore, type ExamScore, type TechniqueScore } from './scoring';

type Phase = 'test' | 'interpret' | 'debrief';

interface EyeWork {
  results: Map<string, PointResult>;
  catches: { trials: number; losses: number };
  stimuli: number;
}

const EYE_NAME: Record<Eye, string> = { OD: 'right eye', OS: 'left eye' };

export interface GameProps {
  ctx: MiniGameContext;
  finish: (r: MiniGameResult) => void;
}

function usePrintSize(ref: { current: HTMLElement | null }, phase: Phase): number {
  const [s, setS] = useState(200);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (phase === 'test') setS(Math.max(150, Math.min(220, Math.floor(r.width - 64))));
      else setS(Math.max(130, Math.min(290, Math.floor(r.width / 2 - 60), Math.floor(r.height - 120))));
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [phase]);
  return s;
}

export function Game({ ctx, finish }: GameProps) {
  const t0 = useRef(performance.now());
  const finished = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  const plotsRef = useRef<HTMLDivElement>(null);
  const stimRef = useRef<HTMLSpanElement>(null);
  const meterRef = useRef<HTMLSpanElement>(null);
  const practice = ctx.mode === 'practice';

  const runner = useMemo(() => new Runner(ctx.rng.fork('vf-runner')), []);
  const responders = useMemo<Record<Eye, Responder>>(
    () => ({
      OD: makeResponder(fieldOf(ctx.findings, 'OD'), 'OD', ctx.patient.age, ctx.difficulty),
      OS: makeResponder(fieldOf(ctx.findings, 'OS'), 'OS', ctx.patient.age, ctx.difficulty),
    }),
    [],
  );
  const work = useRef<Record<Eye, EyeWork>>({
    OD: { results: new Map(), catches: { trials: 0, losses: 0 }, stimuli: 0 },
    OS: { results: new Map(), catches: { trials: 0, losses: 0 }, stimuli: 0 },
  });
  const live = useRef<BowlLiveRef>({ flash: null, buzzAt: -1e9, queued: [] });

  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const [eye, setEye] = useState<Eye>('OD');
  const [phase, setPhase] = useState<Phase>('test');
  const [mode, setMode] = useState<TestMode>('threshold');
  const [offset, setOffset] = useState(6);
  const [view, setView] = useState<'grey' | 'numeric'>('grey');
  const [sweeping, setSweeping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [glance, setGlance] = useState<{ x: number; y: number } | null>(null);
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  const [picks, setPicks] = useState<Record<Eye, Pattern | null>>({ OD: null, OS: null });
  const [loc, setLoc] = useState<Localisation | null>(null);
  const [scores, setScores] = useState<{ technique: Record<Eye, TechniqueScore>; classify: Record<Eye, number>; exam: ExamScore } | null>(null);
  const [examTime, setExamTime] = useState(0);
  const timers = useRef<number[]>([]);
  const printSize = usePrintSize(phase === 'test' ? sideRef : plotsRef, phase);

  const play = (id: SfxId, opts?: { volume?: number; pitch?: number }) => {
    try {
      ctx.audio.play(id, opts);
    } catch {
      /* audio never breaks the game */
    }
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => {
    timers.current.forEach((t) => clearTimeout(t));
    runner.cancel();
  }, []);

  const truthLoc = useMemo(
    () => localise(patternOf(fieldOf(ctx.findings, 'OD'), 'OD'), patternOf(fieldOf(ctx.findings, 'OS'), 'OS')),
    [],
  );
  const w = work.current[eye];
  const remaining242 = grid242(eye).filter((p) => !w.results.has(pointKey(p))).length;
  const enoughFor = (e: Eye) => work.current[e].results.size >= MIN_POINTS;
  const canInterpret = EYES.every(enoughFor);

  // ── engine tick (called by the bowl's RAF)
  const onFrame = (now: number) => {
    const events = runner.update(now);
    if (!events.length) return;
    let changed = false;
    for (const ev of events) {
      if (ev.type === 'flash') {
        live.current.flash = { flash: ev.flash, at: ev.at, until: ev.until };
        work.current[ev.eye].stimuli++;
        play('tick', { volume: 0.07, pitch: 1.8 });
        const lum = 1 - Math.min(MAX_DB, ev.flash.db) / MAX_DB;
        if (stimRef.current) stimRef.current.textContent = `${ev.flash.db} dB`;
        if (meterRef.current) meterRef.current.style.transform = `scaleX(${0.06 + 0.94 * lum})`;
      } else if (ev.type === 'buzz') {
        live.current.buzzAt = now;
        play('pop', { volume: 0.22, pitch: 0.9 + ctx.rng.next() * 0.15 });
      } else if (ev.type === 'catch') {
        const c = work.current[ev.eye].catches;
        c.trials++;
        if (ev.lost) {
          c.losses++;
          // the eye darts toward the stimulus: a fixation loss
          setGlance({ x: ev.eye === 'OD' ? -0.35 : 0.35, y: 0.05 });
          later(() => setGlance(null), 420);
        }
        changed = true;
      } else if (ev.type === 'result') {
        work.current[ev.eye].results.set(pointKey(ev.result), ev.result);
        setFresh(pointKey(ev.result));
        changed = true;
      } else if (ev.type === 'idle') {
        runner.speed = 1;
        setSweeping(false);
        setBusy(false);
      }
    }
    live.current.queued = runner.queued();
    if (changed) bump();
  };

  const test = (p: FieldPoint) => {
    if (phase !== 'test' || sweeping) return;
    if (runner.enqueue(responders[eye], p, mode, offset)) {
      live.current.queued = runner.queued();
      setBusy(true);
      play('lens-click', { volume: 0.4, pitch: 1.25 });
    }
  };

  const sweep = () => {
    if (phase !== 'test' || runner.busy) return;
    const pts = grid242(eye).filter((p) => !w.results.has(pointKey(p)));
    if (!pts.length) return;
    runner.speed = ctx.reducedMotion ? 3 : 2.4;
    for (const p of pts) runner.enqueue(responders[eye], p, 'threshold', offset);
    live.current.queued = runner.queued();
    setSweeping(true);
    setBusy(true);
    play('whoosh', { volume: 0.35 });
  };

  const stop = () => {
    runner.cancel();
    runner.speed = 1;
    live.current.queued = [];
    setSweeping(false);
    setBusy(false);
    play('back', { volume: 0.5 });
  };

  const switchEye = (e: Eye) => {
    if (e === eye) return;
    if (phase === 'test') {
      runner.cancel();
      runner.speed = 1;
      live.current.queued = [];
      live.current.flash = null;
      setSweeping(false);
      setBusy(false);
    }
    setEye(e);
    setFresh(null);
    play('lens-click', { pitch: e === 'OD' ? 1 : 1.12 });
  };

  const changeMode = (m: TestMode) => {
    if (m === mode) return;
    setMode(m);
    play('lens-click', { pitch: m === 'screen' ? 0.9 : 1.05 });
  };

  const toInterpret = () => {
    if (!canInterpret || phase !== 'test') return;
    runner.cancel();
    live.current.queued = [];
    setSweeping(false);
    setBusy(false);
    setExamTime(performance.now() - t0.current);
    setEye('OD');
    setFresh(null);
    setPhase('interpret');
    play('reveal', { volume: 0.6 });
  };

  const pickPattern = (p: Pattern) => {
    setPicks((cur) => ({ ...cur, [eye]: p }));
    play('select');
  };

  const pickLoc = (l: Localisation) => {
    setLoc(l);
    play('select', { pitch: 1.1 });
  };

  const interpretDone = EYES.every((e) => picks[e]) && !!loc;

  const record = () => {
    if (!interpretDone || phase !== 'interpret') return;
    const technique = {} as Record<Eye, TechniqueScore>;
    const classify = {} as Record<Eye, number>;
    for (const e of EYES) {
      const truth = fieldOf(ctx.findings, e);
      technique[e] = techniqueScore([...work.current[e].results.values()], truth, e);
      classify[e] = classifyScore(picks[e], patternOf(truth, e));
    }
    const exam = scoreExam({ technique, classify, localisation: localisationScore(loc, truthLoc) });
    setScores({ technique, classify, exam });
    setPhase('debrief');
    play('stamp');
    later(() => play(exam.classify >= 0.999 && loc === truthLoc ? 'success' : 'fail', { volume: 0.7 }), 260);
    const r = recordRef.current?.getBoundingClientRect();
    if (exam.perfect && r) {
      ctx.fx.burst(r.left + r.width / 2, r.top, { kind: 'sparks', count: 30, color: '#ffd27a' });
      play('sparkle');
    } else if (loc !== truthLoc) {
      ctx.fx.shake(ctx.reducedMotion ? 0 : 0.3, 220);
    }
    if (practice && r) {
      const ok = loc === truthLoc;
      ctx.fx.floatText(ok ? 'Correct' : 'Not quite', r.left + r.width / 2, r.top - 10, { color: ok ? '#5eead4' : '#f43f5e' });
    }
  };

  const complete = () => {
    if (finished.current || !scores) return;
    finished.current = true;
    play('stamp');
    finish({
      testId: 'visual-fields',
      accuracy: Math.round(scores.exam.accuracy * 1000) / 1000,
      timeMs: Math.round(examTime),
      findings: report(ctx.findings, ctx.patient),
      perfect: scores.exam.perfect,
    });
  };

  // shortcuts (when focus is inside the game)
  const onKey = (e: KeyboardEvent): boolean => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const k = e.key.toLowerCase();
    if (phase === 'test') {
      if (k === 't') changeMode('threshold');
      else if (k === 's') changeMode('screen');
      else if (k === 'a') (sweeping ? stop() : sweep());
      else if (k === 'g') setView((v) => (v === 'grey' ? 'numeric' : 'grey'));
      else if (k === '[' && mode === 'screen') setOffset((o) => Math.max(2, o - 1));
      else if (k === ']' && mode === 'screen') setOffset((o) => Math.min(16, o + 1));
      else return false;
    } else if (k === 'g') setView((v) => (v === 'grey' ? 'numeric' : 'grey'));
    else return false;
    e.preventDefault();
    return true;
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('.vf-dial__knob, .vf-tutorial, .vf-bowl__dish')) return;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      onKey(e);
    };
    el.addEventListener('keydown', h);
    return () => el.removeEventListener('keydown', h);
  });

  const statusText = (() => {
    if (phase === 'interpret') {
      const missing = EYES.filter((e) => !picks[e]);
      if (missing.length) return `Name the pattern for ${missing.map((m) => m).join(' and ')}`;
      return loc ? 'Ready to record' : 'Where is the lesion?';
    }
    if (phase === 'debrief') return 'Debrief';
    if (sweeping) return `Auto sweep — ${runner.queued().length} left`;
    if (!enoughFor(eye)) return `Test at least ${MIN_POINTS} points (${w.results.size}/${MIN_POINTS}) in the ${EYE_NAME[eye]}`;
    if (!enoughFor(otherEye(eye))) return `Good — now test the ${EYE_NAME[otherEye(eye)]}`;
    return 'Both eyes plotted — refine or interpret';
  })();

  const instruction =
    phase === 'test'
      ? `${EYE_NAME[otherEye(eye)].replace(/^\w/, (c) => c.toUpperCase())} patched, eye on the amber light — click the bowl to flash a stimulus.`
      : phase === 'interpret'
        ? 'Name each eye’s pattern, then decide where along the pathway the lesion sits.'
        : 'Your plots against the true fields.';

  const printout = (e: Eye, big: boolean) => (
      <Printout
        key={e}
        eye={e}
        results={work.current[e].results}
        version={version + (e === 'OS' ? 100000 : 0)}
        view={view}
        size={printSize}
        fresh={phase === 'test' && e === eye ? fresh : null}
        stimuli={work.current[e].stimuli}
        catches={work.current[e].catches}
        truth={phase === 'debrief' ? fieldOf(ctx.findings, e) : null}
        reduced={ctx.reducedMotion}
        active={big && e === eye}
        onClick={big && phase === 'interpret' ? () => switchEye(e) : undefined}
      />
  );

  return (
    <div class={`vf vf--${phase}${ctx.reducedMotion ? ' is-reduced' : ''}`} ref={rootRef}>
      <header class="vf__head">
        <div class="vf__title">
          <Icon name="visual-fields" size={20} class="vf__title-icon" />
          <div>
            <h2>Visual Fields</h2>
            <p>{instruction}</p>
          </div>
        </div>
        <div class="vf-eyes" role="tablist" aria-label="Eye">
          {EYES.map((e) => {
            const done = phase === 'test' ? enoughFor(e) : !!picks[e];
            return (
              <button
                key={e}
                type="button"
                role="tab"
                aria-selected={eye === e}
                class={`vf-eyes__btn${eye === e ? ' is-on' : ''}${done ? ' is-done' : ''}`}
                onClick={() => switchEye(e)}
                data-testid={`vf-eye-${e}`}
              >
                <span class="vf-eyes__code">{e}</span>
                <span class="vf-eyes__name">{e === 'OD' ? 'Right' : 'Left'}</span>
                {done && <Icon name="check" size={13} class="vf-eyes__check" />}
              </button>
            );
          })}
        </div>
      </header>

      {phase === 'test' ? (
        <div class="vf__body">
          <section class="vf__stage">
            <Bowl
              eye={eye}
              results={w.results}
              version={version}
              live={live.current}
              patient={ctx.patient}
              findings={ctx.findings}
              interactive={!sweeping}
              reduced={ctx.reducedMotion}
              glance={glance}
              onFrame={onFrame}
              onTest={test}
              onKey={onKey}
            />
          </section>
          <aside class="vf__side" ref={sideRef}>
            <div class="vf-printwrap">
              {printout(eye, false)}
              <div class="vf-viewtoggle" role="group" aria-label="Printout view">
                <button type="button" class={view === 'grey' ? 'is-on' : ''} aria-pressed={view === 'grey'} onClick={() => { setView('grey'); play('click'); }}>Greyscale</button>
                <button type="button" class={view === 'numeric' ? 'is-on' : ''} aria-pressed={view === 'numeric'} onClick={() => { setView('numeric'); play('click'); }}>dB values</button>
              </div>
            </div>
            <Console
              mode={mode}
              onMode={changeMode}
              offset={offset}
              onOffset={(v) => { setOffset(v); play('dial', { volume: 0.5, pitch: 0.8 + v / 20 }); }}
              sweeping={sweeping}
              busy={busy}
              remaining242={remaining242}
              onSweep={sweep}
              onStop={stop}
              stimRef={stimRef}
              meterRef={meterRef}
            />
          </aside>
        </div>
      ) : (
        <div class="vf__body vf__body--read">
          <section class="vf__plots" ref={plotsRef}>
            <div class="vf__plots-row">{printout('OS', true)}{printout('OD', true)}</div>
            <p class="vf__plots-note">Plotted as the patient sees: left eye on the left, right eye on the right · <Kbd>G</Kbd> greyscale / dB</p>
          </section>
          <aside class="vf__side vf__side--read">
            {phase === 'interpret' && (
              <>
                <div class="vf-section">
                  <h3>{eye} — {EYE_NAME[eye]} pattern</h3>
                  <Picker eye={eye} value={picks[eye]} onChange={pickPattern} />
                  {picks[eye] && !picks[otherEye(eye)] && (
                    <button type="button" class="vf-next" onClick={() => switchEye(otherEye(eye))}>
                      Next: {otherEye(eye)} <Icon name="arrow-right" size={13} />
                    </button>
                  )}
                </div>
                <div class="vf-section">
                  <h3>{practice ? 'Challenge — ' : ''}Where is the lesion?</h3>
                  <Pathway value={loc} onChange={pickLoc} />
                </div>
              </>
            )}
            {phase === 'debrief' && scores && (
              <>
                <Debrief
                  ctx={ctx}
                  picks={picks}
                  classify={scores.classify}
                  technique={scores.technique}
                  loc={loc}
                  truthLoc={truthLoc}
                  score={scores.exam}
                />
                <div class="vf-section vf-section--path">
                  <Pathway value={loc} truth={truthLoc} disabled />
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      <footer class="vf__foot">
        <div class="vf-progress">
          {EYES.map((e) => {
            const n = work.current[e].results.size;
            const done = phase === 'test' ? n >= MIN_POINTS : !!picks[e];
            return (
              <span key={e} class={`vf-progress__pip${done ? ' is-done' : ''}${eye === e ? ' is-cur' : ''}`}>
                <i />{e} <b>{n}</b>
              </span>
            );
          })}
          <span class="vf-progress__txt" aria-live="polite">{statusText}</span>
        </div>
        <div ref={recordRef}>
          {phase === 'test' && (
            <Button variant="primary" icon="arrow-right" sfx={false} disabled={!canInterpret} onClick={toInterpret} data-testid="vf-interpret">
              Interpret fields
            </Button>
          )}
          {phase === 'interpret' && (
            <Button variant="primary" icon="check" sfx={false} disabled={!interpretDone} onClick={record} data-testid="vf-record">
              Record findings
            </Button>
          )}
          {phase === 'debrief' && (
            <Button variant="primary" icon="arrow-right" sfx={false} onClick={complete} data-testid="vf-finish">
              {practice ? 'Finish' : 'Add to chart'}
            </Button>
          )}
        </div>
      </footer>

      {tutorial && <Tutorial reducedMotion={ctx.reducedMotion} onClose={() => { setTutorial(false); play('click'); }} />}
    </div>
  );
}
