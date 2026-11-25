import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EYES, otherEye, type Eye, type MiniGameContext, type MiniGameResult, type SfxId } from '@core';
import { Button, Icon, Kbd } from '@ui-kit';
import type { BowlLiveRef } from './Bowl';
import { DebriefPane, InterpretPane, TestPane } from './Panes';
import { Printout } from './Printout';
import { Tutorial, tutorialSeen } from './Tutorial';
import { usePrintSize } from './usePrintSize';
import { localise, patternOf, type Localisation, type Pattern } from './interpret';
import { grid242, pointKey, type FieldPoint } from './model';
import { makeResponder, MAX_DB, type PointResult, type Responder, type TestMode } from './patient';
import { reportFor, fieldOf } from './report';
import { iso, vfT } from './strings';
import { VfLocale } from './useVf';
import { FAST_POINT_MS, Runner } from './runner';
import { classifyScore, localisationScore, MIN_POINTS, scoreExam, techniqueScore, type ExamScore, type TechniqueScore } from './scoring';

type Phase = 'test' | 'interpret' | 'debrief';

interface EyeWork {
  results: Map<string, PointResult>;
  catches: { trials: number; losses: number };
  stimuli: number;
}

export interface GameProps {
  ctx: MiniGameContext;
  finish: (r: MiniGameResult) => void;
}

export function Game({ ctx, finish }: GameProps) {
  const locale = ctx.locale;
  const t = vfT(locale);
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
  // Plotted-point counts live in React state so every control that depends on them re-renders.
  const [counts, setCounts] = useState<Record<Eye, number>>({ OD: 0, OS: 0 });
  const [tab, setTab] = useState<'bowl' | 'plot'>('bowl');
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

  useEffect(() => {
    const b = rootRef.current?.querySelector('.vf__body');
    if (b) b.scrollTop = 0;
  }, [phase]);

  const truthLoc = useMemo(
    () => localise(patternOf(fieldOf(ctx.findings, 'OD'), 'OD'), patternOf(fieldOf(ctx.findings, 'OS'), 'OS')),
    [],
  );
  const w = work.current[eye];
  const remaining242 = grid242(eye).filter((p) => !w.results.has(pointKey(p))).length;
  const enoughFor = (e: Eye) => counts[e] >= MIN_POINTS;
  const canInterpret = EYES.every(enoughFor);

  // ── engine tick (called by the bowl's RAF)
  const onFrame = (now: number) => {
    const events = runner.update(now);
    if (!events.length) return;
    let changed = false;
    for (const ev of events) {
      if (ev.type === 'flash') {
        live.current.flash = { flash: ev.flash, at: ev.at, until: ev.until };
        work.current[ev.eye].stimuli += ev.n ?? 1;
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
        setCounts((c) => ({ ...c, [ev.eye]: work.current[ev.eye].results.size }));
        changed = true;
      } else if (ev.type === 'idle') {
        runner.speed = 1;
        runner.fast = false;
        setSweeping(false);
        setBusy(false);
        setCounts({ OD: work.current.OD.results.size, OS: work.current.OS.results.size });
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
    runner.fast = true;
    runner.fastMs = ctx.reducedMotion ? 90 : FAST_POINT_MS;
    for (const p of pts) runner.enqueue(responders[eye], p, 'threshold', offset);
    live.current.queued = runner.queued();
    setSweeping(true);
    setBusy(true);
    play('whoosh', { volume: 0.35 });
  };

  const stop = () => {
    runner.cancel();
    runner.speed = 1;
    runner.fast = false;
    live.current.queued = [];
    setSweeping(false);
    setBusy(false);
    setCounts({ OD: work.current.OD.results.size, OS: work.current.OS.results.size });
    play('back', { volume: 0.5 });
  };

  const switchEye = (e: Eye) => {
    if (e === eye) return;
    if (phase === 'test') {
      runner.cancel();
      runner.speed = 1;
      runner.fast = false;
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
      ctx.fx.floatText(ok ? t.floatOk : t.floatNo, r.left + r.width / 2, r.top - 10, { color: ok ? '#5eead4' : '#f43f5e' });
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
      findings: reportFor(ctx.findings, locale),
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
      if (missing.length) return t.stNamePattern(missing.join(locale === 'he' ? ' · ' : ' and '));
      return loc ? t.stReady : t.stWhere;
    }
    if (phase === 'debrief') return t.stDebrief;
    if (sweeping) return t.stSweep(runner.queued().length);
    if (!enoughFor(eye)) return t.stNeed(MIN_POINTS, w.results.size, t.eyeName[eye]);
    if (!enoughFor(otherEye(eye))) return t.stNext(t.eyeName[otherEye(eye)]);
    return t.stBoth;
  })();

  const instruction =
    phase === 'test'
      ? t.instrTest(t.eyeName[otherEye(eye)])
      : phase === 'interpret'
        ? t.instrInterpret
        : t.instrDebrief;

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
    <VfLocale.Provider value={locale}>
    <div class={`vf vf--${phase}${ctx.reducedMotion ? ' is-reduced' : ''}`} ref={rootRef}>
      <header class="vf__head">
        <div class="vf__title">
          <Icon name="visual-fields" size={20} class="vf__title-icon" />
          <div>
            <h2>{t.title}</h2>
            <p>{instruction}</p>
          </div>
        </div>
        <div class="vf-eyes" role="tablist" aria-label={t.eyeAria} dir="ltr">
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
                <span class="vf-eyes__name">{e === 'OD' ? t.eyeRight : t.eyeLeft}</span>
                {done && <Icon name="check" size={13} class="vf-eyes__check" />}
              </button>
            );
          })}
        </div>
      </header>

      <p class="vf__line" data-testid="vf-line">{instruction}</p>
      {phase === 'test' && (
        <div class="vf-tabs" role="tablist" aria-label={t.viewAria}>
          {(['bowl', 'plot'] as const).map((tb) => (
            <button key={tb} type="button" role="tab" aria-selected={tab === tb} class={tab === tb ? 'is-on' : ''} data-testid={`vf-tab-${tb}`} onClick={() => { setTab(tb); play('click'); requestAnimationFrame(() => { const b = rootRef.current?.querySelector('.vf__body'); if (b) b.scrollTop = 0; }); }}>
              {tb === 'bowl' ? t.tabBowl : t.tabPlot(counts[eye])}
            </button>
          ))}
        </div>
      )}
      {phase === 'test' ? (
        <TestPane
          tab={tab}
          eye={eye}
          sideRef={sideRef}
          bowl={{ results: w.results, version, live: live.current, patient: ctx.patient, findings: ctx.findings, interactive: !sweeping, reduced: ctx.reducedMotion, glance, onFrame, onTest: test, onKey }}
          printout={printout(eye, false)}
          view={view}
          onView={(v) => { setView(v); play('click'); }}
          console={{ mode, onMode: changeMode, offset, onOffset: (v) => { setOffset(v); play('dial', { volume: 0.5, pitch: 0.8 + v / 20 }); }, sweeping, busy, remaining242, onSweep: sweep, onStop: stop, stimRef, meterRef }}
        />
      ) : (
        <div class="vf__body vf__body--read">
          <section class="vf__plots" ref={plotsRef}>
            <div class="vf__plots-row" dir="ltr">{printout('OS', true)}{printout('OD', true)}</div>
            <p class="vf__plots-note">{t.plotsNote} · <Kbd>G</Kbd> {t.plotsKey}</p>
          </section>
          <aside class="vf__side vf__side--read">
            {phase === 'interpret' && (
              <InterpretPane eye={eye} picks={picks} loc={loc} practice={practice} onPick={pickPattern} onLoc={pickLoc} onEye={switchEye} />
            )}
            {phase === 'debrief' && scores && (
              <DebriefPane ctx={ctx} picks={picks} loc={loc} truthLoc={truthLoc} scores={scores} />
            )}
          </aside>
        </div>
      )}

      <footer class="vf__foot">
        <div class="vf-progress">
          {EYES.map((e) => {
            const n = counts[e];
            const done = phase === 'test' ? n >= MIN_POINTS : !!picks[e];
            return (
              <span key={e} class={`vf-progress__pip${done ? ' is-done' : ''}${eye === e ? ' is-cur' : ''}`}>
                <i /><bdi>{e}</bdi> <b>{n}</b>
              </span>
            );
          })}
          <span class="vf-progress__txt" aria-live="polite">{iso(locale, statusText)}</span>
        </div>
        <div ref={recordRef}>
          {phase === 'test' && (
            <Button variant="primary" icon="arrow-right" sfx={false} disabled={!canInterpret} onClick={toInterpret} data-testid="vf-interpret">
              {t.btnInterpret}
            </Button>
          )}
          {phase === 'interpret' && (
            <Button variant="primary" icon="check" sfx={false} disabled={!interpretDone} onClick={record} data-testid="vf-record">
              {t.btnRecord}
            </Button>
          )}
          {phase === 'debrief' && (
            <Button variant="primary" icon="arrow-right" sfx={false} onClick={complete} data-testid="vf-finish">
              {practice ? t.btnFinish : t.btnAdd}
            </Button>
          )}
        </div>
      </footer>

      {tutorial && <Tutorial reducedMotion={ctx.reducedMotion} onClose={() => { setTutorial(false); play('click'); }} />}
    </div>
    </VfLocale.Provider>
  );
}
