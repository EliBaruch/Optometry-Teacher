import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  abandonRun, modeText, pickStrings,
  type ClinicalCase, type Confidence, type MiniGameModule, type MiniGameResult, type SceneProps, type Urgency,
} from '@core';
import {
  Badge, Button, HudSlot, Icon, IconButton, Modal, Screen, Tabs, useReducedMotion, useRegistry, useSfx, useSignal, type IconName,
} from '@ui-kit';
import { ChartPanel } from './ChartPanel';
import { DiagnosisBoard } from './DiagnosisBoard';
import { findChartTarget, flyChips } from './fly';
import { HistoryPanel, type LogEntry } from './HistoryPanel';
import { useMedia, useTick } from './hooks';
import { InstrumentTray } from './InstrumentTray';
import {
  chartKey, expressionFor, fmtClock, groupHistory, MAX_SUSPECTS, moveSuspect, nextHint, orderInstruments, pinSuspect, runProgress,
  techAllowed, techResult, timePressure, unpinSuspect,
} from './logic';
import { PatientPanel, type Utterance } from './PatientPanel';
import { Suspects } from './Suspects';
import { TestStage } from './TestStage';
import { S } from './strings';
import './exam.css';

type Tab = 'patient' | 'tests' | 'chart';
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

/** The player's pinned suspects survive a remount of the scene (same case, same session start). */
const suspectMemory = new Map<string, string[]>();

export function ExamScene({ services, params }: SceneProps) {
  const reduced = useReducedMotion();
  const play = useSfx();
  const session = useSignal(services.session.state);
  const run = useSignal(services.run.state);
  const minigames = useRegistry(services.registries.minigames);
  const diagnoses = useRegistry(services.registries.diagnoses);
  const narrow = useMedia('(max-width: 1023px)');
  const locale = services.locale;
  const t = pickStrings(S, locale);

  /* ── Resolve the case; start a session only when none is active for it ── */
  const kase: ClinicalCase | undefined = useMemo(() => {
    const cases = services.registries.cases;
    const id = str(params.caseId) ?? str(params.case) ?? services.session.state.get()?.caseId ?? cases.all()[0]?.id;
    return id ? cases.get(id) : undefined;
  }, [params, services]);
  const [ready, setReady] = useState(false);
  const modeId = str(params.modeId) ?? session?.modeId ?? 'single';
  const mode = services.registries.modes.get(modeId);

  useEffect(() => {
    if (!kase) return;
    const cur = services.session.state.get();
    if (cur && cur.caseId === kase.id) {
      if (cur.submitted || cur.failed) {
        services.router.replace('results', { caseId: kase.id, modeId: cur.modeId, ...(cur.failed === 'timeout' ? { timeout: true } : {}) });
        return;
      }
    } else {
      services.session.clear();
      services.session.start(kase, modeId, kase.emergency?.timeLimitSec ?? mode?.rules.timeLimitSec);
      services.bus.emit('patient:arriving', { caseId: kase.id, modeId });
    }
    setReady(true);
  }, [kase?.id]);

  const timed = !!session?.timeLimitSec;
  useEffect(() => {
    if (ready && timed) services.audio.music('emergency');
  }, [ready, timed]);
  useEffect(() => {
    if (ready) play('door', { volume: 0.7 });
  }, [ready]);

  /* ── Local scene state ── */
  const [tab, setTab] = useState<Tab>('patient');
  const [stage, setStage] = useState<MiniGameModule | null>(null);
  const [board, setBoard] = useState(false);
  const [leave, setLeave] = useState(false);
  const [relieved, setRelieved] = useState(false);
  const [utterance, setUtterance] = useState<Utterance>({ key: 0, text: kase?.chiefComplaint ?? '', delay: 1700 });
  const [log, setLog] = useState<LogEntry[]>(() => {
    const cur = services.session.state.get();
    if (!kase || !cur || cur.caseId !== kase.id) return [];
    return cur.askedQuestions.flatMap((id) => {
      const q = kase.history.find((h) => h.id === id);
      return q ? [{ kind: 'qa' as const, id, q: q.q, a: q.a }] : [];
    });
  });
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [pulse, setPulse] = useState(0);
  const [hintsGiven, setHintsGiven] = useState<string[]>([]);
  const [nudge, setNudge] = useState<{ key: number; text: string } | null>(null);
  const [pinned, setPinned] = useState<string[]>(() => (kase && session ? suspectMemory.get(`${kase.id}:${session.startedAt}`) ?? [] : []));
  const cancels = useRef(new Set<() => void>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);
  useEffect(
    () => () => {
      cancels.current.forEach((c) => c());
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  useEffect(() => {
    if (kase && session) suspectMemory.set(`${kase.id}:${session.startedAt}`, pinned);
  }, [pinned, kase?.id, session?.startedAt]);

  /* ── Clock, emergency pressure, timeout ── */
  const clockOn = ready && !!session && !session.submitted && !session.failed;
  useTick(250, clockOn);
  const elapsed = services.session.elapsedSec();
  const limit = session?.timeLimitSec;
  const remaining = limit ? Math.max(0, limit - elapsed) : undefined;
  const pressure = timePressure(elapsed, limit);
  const timedOut = useRef(false);
  const lastBeat = useRef(0);
  useEffect(() => {
    if (!clockOn || remaining === undefined) return;
    if (remaining <= 0 && !timedOut.current) {
      timedOut.current = true;
      setStage(null);
      setBoard(false);
      play('alarm');
      services.fx.flash('#ef4444', 400);
      try {
        services.session.fail('timeout');
      } catch (err) {
        console.error('[exam] timeout', err);
      }
      services.router.go('results', { caseId: kase!.id, modeId, timeout: true });
      return;
    }
    const sec = Math.ceil(remaining);
    if (sec !== lastBeat.current) {
      lastBeat.current = sec;
      if (sec <= 10) play('tick', { volume: 0.5, pitch: 1.2 });
      else if (pressure > 0.5 && sec % 2 === 0) play('heartbeat', { volume: 0.5 });
    }
  });

  /* ── Derived ── */
  const asked = session?.askedQuestions ?? [];
  const testsDone = session?.testsDone ?? {};
  const chart = session?.chart ?? [];
  const groups = useMemo(() => (kase ? groupHistory(kase, locale) : []), [kase, locale]);
  const instruments = useMemo(() => orderInstruments(minigames), [minigames]);
  const available = useMemo(() => new Set(instruments.map((m) => m.id)), [instruments]);
  const techOk = techAllowed(mode);
  const hintsOk = mode?.rules.hints !== false;
  const hintLeft = kase && session ? nextHint({ kase, testsDone, asked, available, given: hintsGiven, locale }) : null;
  const progress = runProgress(run, mode);
  const expression = kase ? expressionFor(kase, relieved) : 'neutral';

  /* ── Actions ── */
  const ask = (id: string) => {
    if (!kase || !session) return;
    const q = kase.history.find((h) => h.id === id);
    if (!q || asked.includes(id)) return;
    try {
      services.session.ask(id);
    } catch (err) {
      console.error('[exam] ask', err);
      return;
    }
    setLog((l) => [...l, { kind: 'qa', id, q: q.q, a: q.a }]);
    setUtterance((u) => ({ key: u.key + 1, text: q.a, delay: 120 }));
  };

  const useHint = () => {
    if (!kase || !session) return;
    if (!hintLeft) {
      play('error', { volume: 0.4 });
      return;
    }
    try {
      services.session.useHint();
      services.bus.emit('hint:used', { caseId: kase.id });
    } catch (err) {
      console.error('[exam] hint', err);
      return;
    }
    play('sparkle');
    setHintsGiven((g) => [...g, hintLeft.id]);
    setLog((l) => [...l, { kind: 'hint', id: `hint-${hintLeft.id}`, text: hintLeft.text }]);
    setNudge({ key: Date.now(), text: hintLeft.text });
  };
  useEffect(() => {
    if (!nudge) return;
    const t = setTimeout(() => setNudge(null), 9000);
    return () => clearTimeout(t);
  }, [nudge?.key]);

  const openStage = (mg: MiniGameModule) => {
    if (!kase) return;
    services.bus.emit('test:started', { caseId: kase.id, testId: mg.id });
    play('lens-click');
    setStage(mg);
  };

  /** Write a result to the chart and play the "chart updated" flourish from `origin`. */
  const record = (result: MiniGameResult, origin: HTMLElement | null) => {
    if (!kase) return;
    const rect = origin?.getBoundingClientRect();
    const from = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
    try {
      services.session.recordTest(result);
    } catch (err) {
      console.error('[exam] recordTest', err);
      return;
    }
    setStage(null);
    const rows = result.findings;
    setFresh(new Set(rows.map(chartKey)));
    later(() => setFresh(new Set()), 6000);
    const worst = rows.some((r) => r.flag === 'critical') ? 'critical' : rows.some((r) => r.flag === 'abnormal') ? 'abnormal' : 'normal';
    play(worst === 'critical' ? 'rare' : 'success');
    if (worst === 'critical') services.fx.vignette('#f43f5e', 900);
    const colorOf = (f: string) => (f === 'critical' ? '#f43f5e' : f === 'abnormal' ? '#fbbf24' : '#5eead4');
    const arrive = (x: number, y: number) => {
      play('reveal', { volume: 0.7 });
      setPulse((n) => n + 1);
      services.fx.burst(x, y, { kind: 'sparks', count: 16, color: colorOf(worst) });
      services.fx.floatText(t.chartUpdated, x, Math.max(y + 70, 190), { color: '#ffd27a', size: 18 });
    };
    // Let the stage fade before the findings take flight.
    later(() => {
      if (reduced) {
        const t = findChartTarget()?.getBoundingClientRect();
        arrive(t ? t.left + t.width / 2 : from.x, t ? t.top + 40 : from.y);
        return;
      }
      const held: { cancel?: () => void } = {};
      held.cancel = flyChips(
        from,
        findChartTarget(),
        rows.slice(0, 5).map((r) => ({ text: `${r.label} ${r.value}`, color: colorOf(r.flag) })),
        (x, y) => {
          if (held.cancel) cancels.current.delete(held.cancel);
          arrive(x, y);
        },
      );
      cancels.current.add(held.cancel);
    }, reduced ? 0 : 220);
  };

  const techRun = (mg: MiniGameModule, originEl?: HTMLElement | null) => {
    if (!kase) return;
    let result: MiniGameResult;
    try {
      result = techResult(mg, kase);
    } catch (err) {
      console.error(`[exam] technician could not run ${mg.id}`, err);
      play('error');
      return;
    }
    play('dial', { volume: 0.5 });
    services.bus.emit('test:started', { caseId: kase.id, testId: mg.id });
    record(result, originEl ?? null);
  };

  const submit = (dx: string, urgency: Urgency, confidence: Confidence) => {
    services.session.submit(dx, urgency, confidence);
    setRelieved(true);
  };
  const finished = () => services.router.go('results', { caseId: kase!.id, modeId });

  const leaveRoom = () => {
    try {
      if (!services.session.state.get()?.submitted) services.session.fail('abandoned');
    } catch (err) {
      console.error('[exam] abandon', err);
    }
    abandonRun(services);
  };

  /* ── Render ── */
  if (!kase) {
    return (
      <Screen backdrop="exam" title={t.screenTitle} onBack={() => services.router.go('hub')}>
        <div class="exm-missing">
          <Icon name="warning" size={40} />
          <h2>{t.missingTitle}</h2>
          <p class="lm-muted">{t.missingBody}</p>
          <Button variant="primary" onClick={() => services.router.go('hub')}>{t.missingBtn}</Button>
        </div>
      </Screen>
    );
  }

  const testCount = Object.keys(testsDone).length;
  const clinicMin = session?.clinicMinutes ?? 0;
  const urgentClock = remaining !== undefined;
  const tabItems = [
    { id: 'patient', label: t.tabPatient, icon: 'user' as IconName, badge: asked.length || undefined },
    { id: 'tests', label: t.tabTests, icon: 'eye' as IconName, badge: testCount || undefined },
    { id: 'chart', label: t.tabChart, icon: 'chart' as IconName, badge: chart.length || undefined },
  ];

  const patientPanel = <PatientPanel kase={kase} expression={expression} utterance={utterance} reduced={reduced} />;
  const history = <HistoryPanel groups={groups} asked={asked} log={log} patientName={kase.patient.name} sex={kase.patient.sex} onAsk={ask} />;
  const tray = (
    <InstrumentTray
      instruments={instruments}
      done={testsDone}
      techOk={techOk}
      onOpen={openStage}
      onTech={(mg, el) => techRun(mg, el.closest<HTMLElement>('.exm-tool') ?? el)}
    />
  );
  const chartPanel = <ChartPanel chart={chart} testsDone={testsDone} fresh={fresh} pulse={pulse} />;
  const suspects = (
    <Suspects
      pinned={pinned}
      diagnoses={diagnoses}
      onPin={(id) => setPinned((l) => pinSuspect(l, id))}
      onUnpin={(id) => setPinned((l) => unpinSuspect(l, id))}
      onMove={(i, d) => setPinned((l) => moveSuspect(l, i, d))}
    />
  );

  const barRight = (
    <div class="exm-bar">
      <span class="exm-chip" title={t.clinicTime}>
        <Icon name="clock" size={15} />
        <b class="lm-num">{clinicMin}</b>
        <span>{t.min}</span>
      </span>
      {urgentClock ? (
        <span class={`exm-clock lm-num${pressure > 0.5 ? ' is-late' : ''}`} role="timer" aria-label={t.timeLeft} dir="ltr">
          <Icon name="alert" size={15} />
          {fmtClock(remaining!)}
        </span>
      ) : (
        <span class="exm-chip exm-chip--time lm-num" role="timer" aria-label={t.timeElapsed} dir="ltr">{fmtClock(elapsed)}</span>
      )}
      {hintsOk && (
        <IconButton
          icon="sparkle"
          label={hintLeft ? t.hintAsk(session?.hintsUsed ?? 0) : t.hintNone}
          badge={session?.hintsUsed || undefined}
          onClick={useHint}
          disabled={!hintLeft}
          variant="glass"
          sfx={false}
        />
      )}
    </div>
  );

  const left = progress ? (
    <Badge tone="gold" variant="outline" size="sm" class="exm-progress">
      {t.progress(progress.index, progress.total)}
    </Badge>
  ) : undefined;

  const showTab = (t: Tab) => !narrow || tab === t;
  return (
    <Screen
      class={`exm${reduced ? ' is-reduced' : ''}${timed ? ' is-timed' : ''}`}
      fill
      hud={!narrow}
      backdrop="exam"
      eyebrow={mode ? modeText(mode, locale).title : t.singleCase}
      title={t.screenTitle}
      onBack={() => setLeave(true)}
      backLabel={t.leaveBack}
      left={left}
      right={barRight}
    >
      <div class="exm-stage" style={{ '--p': pressure }} data-ready={ready ? '1' : '0'}>
        {timed && pressure > 0 && <div class="exm-pressure" aria-hidden="true" />}
        <div class="exm-overlay"><HudSlot slot="exam-overlay" /></div>
        {nudge && (
          <div class="exm-nudge" key={nudge.key} role="status">
            <Icon name="sparkle" size={18} />
            <p>{nudge.text}</p>
            <IconButton icon="close" label={t.dismiss} size="sm" variant="ghost" onClick={() => setNudge(null)} sfx="back" />
          </div>
        )}
        {narrow && (
          <Tabs id="exm-tabs" label={t.tabsLabel} items={tabItems} value={tab} onChange={(t) => setTab(t as Tab)} block class="exm-tabs" />
        )}
        {ready && (
          <div class={`exm-cols${narrow ? ' is-narrow' : ''}`}>
            <div class="exm-col exm-col--patient" hidden={!showTab('patient')} id="exm-tabs-panel-patient" role={narrow ? 'tabpanel' : undefined} aria-labelledby={narrow ? 'exm-tabs-tab-patient' : undefined}>
              {patientPanel}
              {narrow && history}
            </div>
            <div class="exm-col exm-col--centre" hidden={!showTab('tests')} id="exm-tabs-panel-tests" role={narrow ? 'tabpanel' : undefined} aria-labelledby={narrow ? 'exm-tabs-tab-tests' : undefined}>
              {tray}
              {!narrow && history}
            </div>
            <div class="exm-col exm-col--chart" hidden={!showTab('chart')} id="exm-tabs-panel-chart" role={narrow ? 'tabpanel' : undefined} aria-labelledby={narrow ? 'exm-tabs-tab-chart' : undefined}>
              {chartPanel}
              {suspects}
            </div>
          </div>
        )}
        <footer class="exm-dock">
          <p class="exm-dock__status lm-num">
            <span>{t.dockAsked(asked.length)}</span>
            <span>{t.dockTests(testCount)}</span>
            <span>{t.dockFindings(chart.length)}</span>
            {pinned.length > 0 && <span>{t.dockSuspects(pinned.length, MAX_SUSPECTS)}</span>}
          </p>
          <Button variant="primary" size="lg" icon="target" onClick={() => { play('drumroll', { volume: 0.5 }); setBoard(true); }} disabled={!ready} sfx={false} class="exm-dock__go">
            {t.diagnose}
          </Button>
        </footer>
      </div>

      <TestStage
        services={services}
        kase={kase}
        mg={stage}
        reduced={reduced}
        techOk={techOk}
        onResult={record}
        onTech={(mg) => techRun(mg)}
        onClose={() => setStage(null)}
      />

      {board && (
        <DiagnosisBoard
          services={services}
          kase={kase}
          pinned={pinned}
          clock={urgentClock ? fmtClock(remaining!) : undefined}
          pressure={pressure}
          onClose={() => setBoard(false)}
          onSubmit={submit}
          onFinished={finished}
        />
      )}

      <Modal
        open={leave}
        onClose={() => setLeave(false)}
        size="sm"
        icon="warning"
        title={t.leaveTitle}
        footer={
          <>
            <Button variant="glass" onClick={() => setLeave(false)}>{t.leaveStay}</Button>
            <Button variant="danger" onClick={leaveRoom}>{t.leaveGo}</Button>
          </>
        }
      >
        <p>{t.leaveBody(kase.patient.name.split(' ')[0] ?? kase.patient.name, kase.patient.sex, !!run)}</p>
      </Modal>
    </Screen>
  );
}
