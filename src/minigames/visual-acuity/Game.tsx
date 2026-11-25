/**
 * Visual acuity / pinhole exam: projector chart (as the patient sees it),
 * patient with a hand-held occluder, projector remote. One component serves
 * both TestIds; `variant` switches the pinhole workflow on.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EYES, type Eye, type MiniGameContext, type MiniGameResult, type SfxId } from '@core';
import { Button, Icon, Kbd, SpeechBubble } from '@ui-kit';
import type { AvatarExpression } from '@render';
import { canUseOptotype, chartLines, defaultOptotype, expectedLevel, lineSymbols, levelLabel, type ChartKind, type Optotype } from './charts';
import { acuityChallenge, pinholeChallenge } from './challenge';
import { LowVisionCard } from './LowVision';
import { formatFeet } from './notation';
import { binocularLogmar, effectiveLogmar, pinholeLogmar, viewBlur, type OpenEyes } from './optics';
import { ChallengeCard, ChartedStamp, Tutorial } from './Overlays';
import { ChartLog } from './ChartLog';
import { PatientPane } from './PatientPane';
import { Projector } from './Projector';
import { readLine, type Mood } from './reader';
import { ProjectorControls, Remote, type Verdict } from './Remote';
import { pinholeExpected, reportAcuity, reportPinhole } from './report';
import { combineAcuity, scorePinhole, scoreRecord, type AcuityRecord, type PinholeEyeResult, type RecordScore, type Slot } from './scoring';
import { buildRecord, ladderRead, LADDER_MIN, logKey, openFor, recordFull, recordNotation, type LevelLog } from './session';
import { markTutorialSeen, STEPS, tutorialSeen, type Variant } from './steps';

export interface GameProps {
  ctx: MiniGameContext;
  variant: Variant;
  finish(r: MiniGameResult): void;
}

interface SlotRecord {
  rec: AcuityRecord | null;
  notation: string;
  /** notation with metric (and logMAR on ETDRS) for the chart stamp */
  full: string;
  pinhole: boolean;
  verdict?: Verdict;
}

interface Outcome {
  accuracy: number;
  perfect: boolean;
  timeMs: number;
  summary: { label: string; value: string; ok: boolean | null }[];
  notes: string[];
  stamp: string[];
}

const MOOD_FACE: Record<Mood, AvatarExpression> = { confident: 'neutral', hesitant: 'squint', struggling: 'squint', lost: 'worried' };
const SLOT_SALT: Record<Slot, number> = { OD: 0, OS: 7919, OU: 104729 };
const VERDICT_WORD: Record<Verdict, string> = { improves: 'improves', 'no-improvement': 'NI', 'not-needed': 'not needed' };

export function Game({ ctx, variant, finish }: GameProps) {
  const f = ctx.findings;
  const age = ctx.patient.age;
  const isPH = variant === 'pinhole';
  const practice = ctx.mode === 'practice';
  const seed = useMemo(() => ctx.rng.int(1, 1_000_000_000), []);
  const rng = useMemo(() => ctx.rng.fork(`va-reader-${variant}`), []);
  const quizRng = useMemo(() => ctx.rng.fork(`va-quiz-${variant}`), []);
  const required: Slot[] = ['OD', 'OS'];

  const [slot, setSlot] = useState<Slot>('OD');
  const [open, setOpen] = useState<OpenEyes>(isPH ? openFor('OD') : { OD: true, OS: true });
  const [chart, setChart] = useState<ChartKind>('snellen');
  const [optotype, setOptotype] = useState<Optotype>(() => defaultOptotype(age));
  const lines = chartLines(chart);
  const scLevel = (eye: Eye, kind: ChartKind = chart) => Math.max(LADDER_MIN, expectedLevel(chartLines(kind), f.va[eye].uncorrected));
  const [level, setLevel] = useState(() => (isPH ? scLevel('OD') : 0));
  const [pinholeOn, setPinholeOn] = useState(false);
  const [records, setRecords] = useState<Partial<Record<Slot, SlotRecord>>>({});
  const [verdicts, setVerdicts] = useState<Partial<Record<Eye, Verdict>>>({});
  const [speech, setSpeech] = useState<{ text: string; mood: Mood; n: number }>(() => ({
    text: isPH ? 'Paddle over my other eye — like this? Ready.' : 'Glasses off. Ready when you are!',
    mood: 'confident', n: 0,
  }));
  const [fingers, setFingers] = useState(2);
  const [phase, setPhase] = useState<'exam' | 'quiz' | 'stamp'>('exam');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [tutorial, setTutorial] = useState(() => !tutorialSeen(variant));
  const [, setTick] = useState(0);
  const logs = useRef(new Map<string, LevelLog>());
  const marks = useRef(new Map<string, Map<number, boolean[]>>());
  const t0 = useRef(performance.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const recBtn = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const quizOk = useRef(false);

  const play = (id: SfxId, opts?: { volume?: number; pitch?: number }) => {
    try {
      ctx.audio.play(id, opts);
    } catch {
      /* audio never breaks the game */
    }
  };
  const ph = isPH && pinholeOn;
  const condKey = `${slot}|${logKey(open, chart, ph)}`;
  const markKey = `${condKey}|${optotype}`;
  const blur = useMemo(() => viewBlur(f, open, ph), [f, open.OD, open.OS, ph]);
  const symbolsSeed = seed + SLOT_SALT[slot];

  // ── actions ──────────────────────────────────────────────────────────────
  const changeLevel = (next: number) => {
    const v = Math.max(LADDER_MIN, Math.min(lines.length - 1, next));
    if (v === level || phase !== 'exam') return;
    setLevel(v);
    play('dial', { volume: 0.55, pitch: 0.8 + (v - LADDER_MIN) / 30 });
  };

  const toggleEye = (e: Eye) => {
    if (phase !== 'exam') return;
    const nowCovered = open[e];
    setOpen((o) => ({ ...o, [e]: !o[e] }));
    play(nowCovered ? 'lens-click' : 'whoosh', { volume: nowCovered ? 0.8 : 0.35, pitch: e === 'OD' ? 1 : 1.1 });
  };

  const swapOccluder = () => {
    if (isPH || phase !== 'exam') return;
    if (open.OD !== open.OS) setOpen({ OD: !open.OD, OS: !open.OS });
    else if (open.OD) setOpen(slot === 'OS' ? { OD: false, OS: true } : { OD: true, OS: false });
    else setOpen({ OD: true, OS: true });
    play('lens-click');
  };

  const selectSlot = (s: Slot) => {
    if (s === slot || phase !== 'exam') return;
    setSlot(s);
    play('select', { volume: 0.6 });
    if (isPH) {
      setOpen(openFor(s));
      setPinholeOn(false);
      setLevel(scLevel(s as Eye));
      setSpeech({ text: 'Swapping the paddle over. Ready.', mood: 'confident', n: speech.n + 1 });
    }
  };

  const togglePinhole = () => {
    if (!isPH || phase !== 'exam') return;
    setPinholeOn((v) => !v);
    play('lens-click', { pitch: pinholeOn ? 0.9 : 1.3 });
    play('whoosh', { volume: 0.25 });
  };

  const ask = () => {
    if (phase !== 'exam') return;
    const eff = effectiveLogmar(f, open, ph);
    const log = logs.current.get(condKey) ?? new Map<number, { passed: boolean; nCorrect: number; n: number }>();
    logs.current.set(condKey, log);
    const n = speech.n + 1;
    if (level < 0) {
      const r = ladderRead(level, eff, rng);
      if (eff !== null) log.set(level, { passed: r.passed, nCorrect: r.passed ? 1 : 0, n: 1 });
      if (r.fingers) setFingers(r.fingers);
      setSpeech({ text: r.text, mood: r.mood, n });
      play(level <= -3 ? 'flashlight' : 'whoosh', { volume: 0.5 });
      return;
    }
    const symbols = lineSymbols(chart, optotype, level, symbolsSeed);
    const r = readLine({
      lines, index: level, symbols, trueLogmar: eff, optotype, age,
      knowsOptotype: canUseOptotype(age, optotype), difficulty: ctx.difficulty, rng,
    });
    if (r.kind === 'read' || r.kind === 'cannot') {
      log.set(level, { passed: r.passed, nCorrect: r.nCorrect, n: symbols.length });
      const m = marks.current.get(markKey) ?? new Map<number, boolean[]>();
      m.set(level, r.correct);
      marks.current.set(markKey, m);
    }
    setSpeech({ text: r.text, mood: r.mood, n });
    setTick((t) => t + 1);
    if (r.kind === 'read' && r.passed) play('tick', { volume: 0.5, pitch: 1.2 });
    else play('pop', { volume: 0.4, pitch: 0.8 });
  };

  const burstAt = (el: Element | null | undefined, kind: 'sparks' | 'stars' = 'sparks') => {
    const r = el?.getBoundingClientRect();
    if (r && !ctx.reducedMotion) ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind, count: 14, color: '#ffd27a' });
  };

  const occluderOkNow = () => (slot === 'OU' ? open.OD && open.OS : open[slot as Eye] && !open[slot === 'OD' ? 'OS' : 'OD']);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  const warn = (text: string) => {
    setToast((t) => ({ text, n: (t?.n ?? 0) + 1 }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
    play('fail', { volume: 0.4 });
  };

  const record = () => {
    if (phase !== 'exam') return;
    if (!isPH && !occluderOkNow()) {
      warn(slot === 'OU' ? 'Binocular acuity needs both eyes open — uncover the patient first.' : `Chart ${slot} only with ${slot === 'OD' ? 'OS' : 'OD'} covered and ${slot} open — set the occluder first.`);
      return;
    }
    let entry: SlotRecord;
    if (isPH) {
      const v = verdicts[slot as Eye];
      if (!v) return;
      if (v === 'not-needed') entry = { rec: null, notation: '—', full: '—', pinhole: false, verdict: v };
      else {
        const rec = buildRecord(slot, chart, level, open, logs.current.get(condKey), lines.length);
        entry = { rec, notation: recordNotation(lines, level, logs.current.get(condKey)), full: recordFull(lines, level, logs.current.get(condKey), chart), pinhole: ph, verdict: v };
      }
    } else {
      const rec = buildRecord(slot, chart, level, open, logs.current.get(condKey), lines.length);
      entry = { rec, notation: recordNotation(lines, level, logs.current.get(condKey)), full: recordFull(lines, level, logs.current.get(condKey), chart), pinhole: false };
    }
    const nextRecords = { ...records, [slot]: entry };
    setRecords(nextRecords);
    play('stamp', { volume: 0.7 });
    burstAt(rootRef.current?.querySelector('.va-key--rec'));
    const nextSlot = required.find((s) => !nextRecords[s]);
    if (nextSlot && nextSlot !== slot) {
      setSlot(nextSlot);
      if (isPH) {
        setOpen(openFor(nextSlot));
        setPinholeOn(false);
        setLevel(scLevel(nextSlot as Eye));
        setSpeech({ text: 'Other eye now? Paddle swapped.', mood: 'confident', n: speech.n + 1 });
      } else {
        setLevel(0);
        setSpeech({ text: 'Okay — which eye next?', mood: 'confident', n: speech.n + 1 });
      }
    }
  };

  const changeChart = (k: ChartKind) => {
    // Keep pointing at the same acuity on the new chart.
    const cur = levelLabel(lines, level).value;
    const nl = chartLines(k);
    let best = 0;
    if (level < 0) best = level;
    else nl.forEach((l, i) => Math.abs(l.logmar - cur) < Math.abs(nl[best]!.logmar - cur) && (best = i));
    setChart(k);
    setLevel(best);
    play('flashlight', { volume: 0.4 });
  };

  const changeOptotype = (o: Optotype) => {
    setOptotype(o);
    play('lens-click', { pitch: 0.85 });
  };

  // ── scoring ──────────────────────────────────────────────────────────────
  const truthFor = (s: Slot) => (s === 'OU' ? binocularLogmar(f.va.OD.uncorrected, f.va.OS.uncorrected) : f.va[s].uncorrected);
  const canFinish = required.every((s) => !!records[s]);

  const evaluate = (): Outcome => {
    const timeMs = Math.round(performance.now() - t0.current);
    if (!isPH) {
      const recs = required.map((s) => records[s]!.rec!);
      const scores: RecordScore[] = recs.map((r) => scoreRecord(r, truthFor(r.slot), chartLines(r.chart)));
      const c = combineAcuity(scores, required, timeMs, recs);
      const extra = records.OU?.rec ? [records.OU] : [];
      return {
        accuracy: c.accuracy, perfect: c.perfect, timeMs,
        summary: [
          ...required.map((s, i) => ({ label: `VA sc ${s}`, value: `${records[s]!.notation}  ·  true ${formatFeet(truthFor(s))}`, ok: scores[i]!.steps === 0 && scores[i]!.occlusionOk })),
          ...extra.map((r) => ({ label: 'VA sc OU', value: r!.notation, ok: null })),
        ],
        notes: scores.flatMap((s) => s.notes.map((n) => `${s.slot}: ${n}`)),
        stamp: required.map((s) => `${s}  ${records[s]!.full}`),
      };
    }
    const results: PinholeEyeResult[] = [];
    const notes: string[] = [];
    const summary: Outcome['summary'] = [];
    for (const eye of EYES) {
      const r = records[eye]!;
      const truth = pinholeExpected(f, eye);
      const verdictCorrect = r.verdict === truth;
      let steps: number | null = null;
      if (truth === 'not-needed' && verdictCorrect) steps = 0;
      else if (r.rec && r.pinhole && r.rec.read) steps = Math.abs(r.rec.level - expectedLevel(chartLines(r.rec.chart), pinholeLogmar(f, eye)));
      results.push({ eye, verdictCorrect, steps });
      const trueTxt = truth === 'not-needed' ? 'not needed' : `${formatFeet(pinholeLogmar(f, eye))} ${VERDICT_WORD[truth]}`;
      summary.push({ label: `PH ${eye}`, value: `${r.verdict === 'not-needed' ? 'not needed' : `${r.notation} ${VERDICT_WORD[r.verdict!]}`}  ·  true ${trueTxt}`, ok: verdictCorrect && steps === 0 });
      if (!verdictCorrect) notes.push(`${eye}: the right call was “${VERDICT_WORD[truth]}”.`);
      if (r.rec && !r.pinhole) notes.push(`${eye}: that line was read without the pinhole in place.`);
      else if (r.rec && !r.rec.read) notes.push(`${eye}: the charted line was never read through the pinhole.`);
      else if (steps !== null && steps > 0) notes.push(`${eye}: pinhole line ${steps} step${steps > 1 ? 's' : ''} off.`);
    }
    const c = scorePinhole(results, timeMs);
    return { accuracy: c.accuracy, perfect: c.perfect, timeMs, summary, notes, stamp: EYES.map((e) => `PH ${e}  ${records[e]!.verdict === 'not-needed' ? 'not needed' : `${records[e]!.full} ${VERDICT_WORD[records[e]!.verdict!]}`}`) };
  };

  const recordFindings = () => {
    if (!canFinish || phase !== 'exam') return;
    const o = evaluate();
    setOutcome(o);
    play('reveal');
    if (o.perfect) {
      burstAt(recBtn.current, 'stars');
      play('sparkle');
    }
    setPhase(practice ? 'quiz' : 'stamp');
  };

  const complete = (o: Outcome) => {
    if (finished.current) return;
    finished.current = true;
    let accuracy = o.accuracy;
    let perfect = o.perfect;
    if (practice) {
      accuracy = 0.75 * accuracy + 0.25 * (quizOk.current ? 1 : 0);
      perfect = perfect && quizOk.current;
    }
    finish({
      testId: isPH ? 'pinhole' : 'visual-acuity',
      accuracy: Math.round(Math.max(0, Math.min(1, accuracy)) * 1000) / 1000,
      timeMs: o.timeMs,
      findings: isPH ? reportPinhole(f, ctx.patient) : reportAcuity(f, ctx.patient),
      perfect,
    });
  };

  useEffect(() => {
    if (phase !== 'stamp' || !outcome) return;
    const t = setTimeout(() => complete(outcome), ctx.reducedMotion ? 700 : 1500);
    return () => clearTimeout(t);
  }, [phase, outcome]);

  const challenge = useMemo(() => (outcome && practice ? (isPH ? pinholeChallenge(f) : acuityChallenge(f, quizRng)) : null), [outcome]);

  // ── keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const h = (e: KeyboardEvent) => {
      if (tutorial || phase !== 'exam' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const ownsArrows = !!t?.closest('input, [role="slider"]');
      const onControl = ownsArrows || !!t?.closest('button, [role="radio"], [role="tab"]');
      const k = e.key;
      if (k === 'ArrowUp' && !ownsArrows) changeLevel(level - 1);
      else if (k === 'ArrowDown' && !ownsArrows) changeLevel(level + 1);
      else if (k === ' ' && !onControl) ask();
      else if (k === 'Enter' && !onControl) record();
      else if (k === 'c' || k === 'C') swapOccluder();
      else if (k === 'p' || k === 'P') togglePinhole();
      else return;
      e.preventDefault();
    };
    // After a mouse/touch click on a control, hand focus back to the instrument
    // so the line / read / chart keys keep working (keyboard activations keep focus).
    const refocus = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.detail > 0 && t?.closest('button') && !t.closest('.va-overlay')) el.focus({ preventScroll: true });
    };
    el.addEventListener('keydown', h);
    el.addEventListener('click', refocus);
    return () => {
      el.removeEventListener('keydown', h);
      el.removeEventListener('click', refocus);
    };
  });

  useEffect(() => {
    if (!tutorial) rootRef.current?.focus({ preventScroll: true });
  }, [tutorial]);

  const closeTutorial = () => {
    markTutorialSeen(variant);
    setTutorial(false);
    t0.current = performance.now();
    play('click');
  };

  // ── view ─────────────────────────────────────────────────────────────────
  const covered: OpenEyes = { OD: !open.OD, OS: !open.OS };
  const slots: Slot[] = isPH ? ['OD', 'OS'] : ['OD', 'OS', 'OU'];
  const curMarks = marks.current.get(markKey) ?? new Map<number, boolean[]>();
  const occluderHint = isPH
    ? `${slot === 'OD' ? 'OS' : 'OD'} occluded · pinhole ${ph ? 'on' : 'off'}`
    : open.OD && open.OS ? 'Both open — tap an eye to cover' : !open.OD && !open.OS ? 'Both eyes covered!' : `${open.OD ? 'OS' : 'OD'} covered · ${open.OD ? 'OD' : 'OS'} reading`;
  const occluderOk = isPH || occluderOkNow();
  const instruction = isPH
    ? 'Pinhole over the tested eye: re-measure, then judge — improves, or no improvement?'
    : 'Cover one eye, point to a line, chart the smallest line read — OD, then OS.';
  const done = (s: Slot) => !!records[s];

  return (
    <div class={`va${ctx.reducedMotion ? ' is-reduced' : ''}`} ref={rootRef} tabIndex={-1}>
      <header class="va__head">
        <div class="va__title">
          <Icon name={isPH ? 'pinhole' : 'visual-acuity'} size={22} class="va__title-icon" />
          <div>
            <h2>{isPH ? 'Pinhole Acuity' : 'Visual Acuity'}</h2>
            <p>{instruction}</p>
          </div>
        </div>
        <div class="va-eyes" role="tablist" aria-label="Recording for">
          {slots.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={slot === s}
              class={`va-eyes__btn${slot === s ? ' is-on' : ''}${done(s) ? ' is-done' : ''}${s === 'OU' ? ' is-opt' : ''}`}
              onClick={() => selectSlot(s)}
              disabled={phase !== 'exam'}
              data-testid={`va-slot-${s}`}
            >
              <span class="va-eyes__code">{s}</span>
              <span class="va-eyes__name">{s === 'OD' ? 'Right' : s === 'OS' ? 'Left' : 'Both'}</span>
              {done(s) && <Icon name="check" size={13} class="va-eyes__check" />}
            </button>
          ))}
        </div>
      </header>

      <div class="va__body">
        <section class="va__stage">
          <div class="va-bezel">
            <div class="va-screen">
              <Projector
                kind={chart}
                optotype={optotype}
                seed={symbolsSeed}
                index={Math.max(0, level)}
                blur={blur}
                marks={curMarks}
                pinhole={ph}
                reducedMotion={ctx.reducedMotion}
                onPick={(i) => changeLevel(i)}
              />
              {level < 0 && <LowVisionCard level={level} fingers={fingers} />}
            </div>
            <div class="va-bezel__pov" aria-hidden="true">{ph ? 'Through the pinhole' : 'Patient’s view'}</div>
            <div class="va-bezel__plate">
              <ProjectorControls chart={chart} optotype={optotype} disabled={phase !== 'exam'} pinhole={isPH} onChart={changeChart} onOptotype={changeOptotype} />
            </div>
          </div>
        </section>

        <aside class="va__side">
          <div class="va-patient">
            <PatientPane
              patient={{ ...ctx.patient, avatar: { ...ctx.patient.avatar, glasses: 'none' } }}
              covered={covered}
              pinholeEye={ph ? (slot as Eye) : null}
              expression={!open.OD && !open.OS ? 'surprised' : MOOD_FACE[speech.mood]}
              reducedMotion={ctx.reducedMotion}
              onToggleEye={isPH ? null : toggleEye}
            />
            <div class="va-patient__talk">
              <SpeechBubble key={speech.n} text={speech.text} speaker={ctx.patient.name.split(' ')[0]} tail="left" voice={false} speed={62} class="va-bubble" />
              <div class={`va-occhint${occluderOk ? '' : ' is-warn'}`}>
                <Icon name={occluderOk ? 'eye' : 'warning'} size={14} /> {occluderHint}
                {!isPH && <Kbd>C</Kbd>}
              </div>
            </div>
          </div>
          <Remote
            lines={lines}
            level={level}
            chart={chart}
            slot={slot}
            disabled={phase !== 'exam'}
            reference={isPH ? `sc ${formatFeet(f.va[slot as Eye].uncorrected)}` : undefined}
            onLevel={changeLevel}
            onAsk={ask}
            onRecord={record}
            recordDisabled={isPH && !verdicts[slot as Eye]}
            pinhole={isPH ? {
              on: pinholeOn,
              verdict: verdicts[slot as Eye] ?? null,
              onToggle: togglePinhole,
              onVerdict: (v) => {
                setVerdicts((d) => ({ ...d, [slot]: v }));
                play('select');
              },
            } : undefined}
          />
          <ChartLog slots={slots} records={records} current={slot} isPH={isPH} />
        </aside>
      </div>

      <footer class="va__foot">
        <ol class="va-progress" aria-label="Recorded">
          {slots.map((s) => (
            <li key={s} class={`${done(s) ? 'is-done' : ''}${slot === s ? ' is-cur' : ''}${s === 'OU' ? ' is-opt' : ''}`}>
              <i aria-hidden="true" />
              <span class="va-progress__code">{isPH ? `PH ${s}` : s}</span>
              <b>{records[s] ? (isPH ? (records[s]!.verdict === 'not-needed' ? 'not needed' : `${records[s]!.notation} · ${VERDICT_WORD[records[s]!.verdict!]}`) : records[s]!.notation) : s === 'OU' ? 'optional' : '—'}</b>
            </li>
          ))}
        </ol>
        <div ref={recBtn}>
          <Button variant="primary" icon="check" sfx={false} disabled={!canFinish || phase !== 'exam'} onClick={recordFindings} data-testid="va-record">
            Record findings
          </Button>
        </div>
      </footer>

      {toast && (
        <div class="va-toast" role="alert" key={toast.n}>
          <Icon name="warning" size={16} /> {toast.text}
        </div>
      )}
      {phase === 'quiz' && outcome && challenge && (
        <ChallengeCard
          challenge={challenge}
          summary={outcome.summary}
          notes={outcome.notes}
          onAnswer={(ok) => {
            quizOk.current = ok;
            if (ok) {
              play('success');
              burstAt(rootRef.current?.querySelector('.va-quiz__prompt'), 'stars');
            } else {
              play('fail');
              if (!ctx.reducedMotion) ctx.fx.shake(0.3, 220);
            }
          }}
          onFinish={() => complete(outcome)}
        />
      )}
      {phase === 'stamp' && outcome && <ChartedStamp lines={outcome.stamp} />}
      {tutorial && <Tutorial steps={STEPS[variant]} onClose={closeTutorial} />}
    </div>
  );
}
