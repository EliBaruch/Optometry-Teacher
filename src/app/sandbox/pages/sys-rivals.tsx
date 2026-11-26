import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  TEST_CATALOG, defineStrings, pickStrings, scoreCase, type ClinicalCase, type GameServices, type MiniGameResult, type RewardGrant, type ScoreBreakdown, type TestId,
} from '@core';
import { Button, HudSlot, ToastHost, asComponent, useRegistry, useSignal } from '@ui-kit';
import rivals, { rivalsFor } from '../../../systems/rivals';
import { applyCase, initialState } from '../../../systems/rivals/league';
import { DAY_MS, WEEK_MS, weekStart } from '../../../systems/rivals/week';
import type { SandboxPage } from '../Sandbox';

/**
 * Rivals system preview:
 *   ?sandbox=page/sys-rivals            widgets (top bar, hub card, results panel) + controls
 *   ?sandbox=page/sys-rivals&demo=1     seeds a believable week first
 *   ?sandbox=page/sys-rivals&demo=1&view=scene   opens the Rivals scene
 */

type Quality = 'great' | 'average' | 'wrong';

function fakeWorkup(kase: ClinicalCase, q: Quality, elapsedScale = 1): { score: ScoreBreakdown; tests: TestId[]; asked: string[]; elapsedSec: number; diagnosisId: string; urgency: ClinicalCase['urgency'] } {
  const essentials = q === 'average' ? kase.essentialTests.slice(0, Math.max(0, kase.essentialTests.length - 1)) : kase.essentialTests;
  const testsDone: Partial<Record<TestId, MiniGameResult>> = {};
  for (const t of [...essentials, ...(q === 'great' ? kase.helpfulTests.slice(0, 1) : [])]) {
    testsDone[t] = { testId: t, accuracy: q === 'great' ? 0.95 : 0.75, timeMs: 1000, findings: [] };
  }
  const keyQs = kase.history.filter((h) => h.relevance === 'key').map((h) => h.id);
  const asked = q === 'great' ? keyQs : keyQs.slice(0, Math.ceil(keyQs.length / 2));
  const diagnosisId = q === 'wrong' ? kase.differentials[0] ?? 'healthy-eyes' : kase.diagnosis;
  const urgency = q === 'wrong' ? 'routine' : kase.urgency;
  const elapsedSec = Math.round((60 + kase.difficulty * 30) * (q === 'great' ? 0.7 : 1.3) * elapsedScale);
  const score = scoreCase({ kase, diagnosisId, urgency, testsDone, askedQuestions: asked, elapsedSec, hintsUsed: 0 });
  return { score, tests: Object.keys(testsDone) as TestId[], asked, elapsedSec, diagnosisId, urgency };
}

const fakeScore = (kase: ClinicalCase, q: Quality, elapsedScale = 1) => fakeWorkup(kase, q, elapsedScale).score;

const T = defineStrings({
  en: {
    title: 'Rivals — system preview',
    sub: (clock: string, cases: number, tests: number) => `Sandbox clock: ${clock}. ${cases} cases registered. Tests known: ${tests}.`,
    shiftStarted: '— shift started —',
    finishPatient: 'Finish a patient', great: 'Excellent case', average: 'Average case', wrong: 'Wrong diagnosis',
    examShift: 'Exam & shift', examBusy: 'Exam in progress', startExam: 'Start an exam', startShift: 'Start a shift',
    showResults: 'Show results view', showSummary: 'Show run-summary view',
    time: 'Time', plus6h: '+6 hours', plus1d: '+1 day', nextWeek: 'Next week',
    state: 'State', seed: 'Seed demo week', reset: 'Reset', openScene: 'Open Rivals scene', log: 'reward:granted log',
  },
  he: {
    title: 'עמיתים — תצוגה מקדימה של המערכת',
    sub: (clock: string, cases: number, tests: number) => `שעון הארגז: ${clock}. ${cases} מקרים רשומים. בדיקות מוכרות: ${tests}.`,
    shiftStarted: '— המשמרת התחילה —',
    finishPatient: 'סיום טיפול במטופל', great: 'מקרה מצוין', average: 'מקרה בינוני', wrong: 'אבחנה שגויה',
    examShift: 'בדיקה ומשמרת', examBusy: 'בדיקה מתנהלת', startExam: 'התחלת בדיקה', startShift: 'התחלת משמרת',
    showResults: 'הצגת תצוגת התוצאות', showSummary: 'הצגת סיכום הסבב',
    time: 'זמן', plus6h: '+6 שעות', plus1d: '+יום', nextWeek: 'השבוע הבא',
    state: 'מצב', seed: 'מילוי שבוע לדוגמה', reset: 'איפוס', openScene: 'פתיחת מסך העמיתים', log: 'יומן reward:granted',
  },
});

const CSS = `
.sbrv { position: absolute; inset: 0; overflow: auto; color: var(--lm-ink); font-family: var(--lm-font-ui);
  background-color: var(--lm-canvas);
  background-image: radial-gradient(60% 55% at 92% 2%, rgba(122, 162, 255, 0.55), transparent 70%), radial-gradient(50% 50% at 6% 10%, rgba(111, 214, 255, 0.42), transparent 70%),
    radial-gradient(55% 50% at 70% 100%, rgba(196, 181, 253, 0.45), transparent 70%), radial-gradient(45% 45% at 10% 95%, rgba(255, 200, 170, 0.4), transparent 70%); }
.sbrv-wrap { max-width: 1240px; margin: 0 auto; padding: 20px 16px 60px; display: grid; gap: 18px; box-sizing: border-box; }
.sbrv h1 { font-family: var(--lm-font-display); font-weight: 800; letter-spacing: var(--lm-tracking-display); font-size: 32px; margin: 0; color: var(--lm-ink); }
.sbrv-sub { color: var(--lm-ink-3); font-size: 13px; margin: 4px 0 0; }
.sbrv-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; height: 60px; padding: 0 16px; border-radius: var(--lm-r-pill);
  background: var(--lm-glass); box-shadow: var(--lm-glass-highlight), var(--lm-glass-shadow); backdrop-filter: var(--lm-glass-blur); -webkit-backdrop-filter: var(--lm-glass-blur); }
.sbrv-bar > span { font: 650 10px/1 var(--lm-font-ui); letter-spacing: var(--lm-tracking-caps); text-transform: uppercase; color: var(--lm-ink-3); }
.sbrv-bar .hud-slot { display: flex; gap: 8px; align-items: center; }
.sbrv-grid { display: grid; grid-template-columns: 340px 1fr; gap: 18px; align-items: start; }
.sbrv-ctl { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px; border-radius: var(--lm-r-lg); background: var(--lm-glass); box-shadow: var(--lm-glass-highlight), var(--lm-glass-shadow); }
.sbrv-ctl b { width: 100%; font: 650 10px/1 var(--lm-font-ui); letter-spacing: var(--lm-tracking-caps); text-transform: uppercase; color: var(--lm-ink-3); }
.sbrv-log { font: 500 12px/1.5 var(--lm-font-num); color: var(--lm-ink-2); margin: 0; padding: 0 0 0 16px; max-height: 160px; overflow: auto; }
.sbrv-col { display: grid; gap: 18px; min-width: 0; }
.sbrv .hud-slot--results-extra, .sbrv .hud-slot--hub-sidebar, .sbrv .hud-slot--profile { display: grid; gap: 14px; }
@media (max-width: 860px) { .sbrv-grid { grid-template-columns: 1fr; } }
`;

function SysRivalsPage({ services }: { services: GameServices }) {
  const t = pickStrings(T, services.locale);
  const offset = useRef(0);
  const q = useMemo(() => new URLSearchParams(location.search), []);
  const [rewards, setRewards] = useState<string[]>([]);
  const [clockLabel, setClockLabel] = useState('');
  const [exam, setExam] = useState<string | null>(null);
  const route = useSignal(services.router.current);
  const home = useMemo(() => services.router.current.get().id, []);
  const scenes = useRegistry(services.registries.scenes);
  const cases = services.registries.cases.all();

  useEffect(() => {
    services.clock.now = () => Date.now() + offset.current;
    const uninstall = rivals.install(services);
    const off = services.bus.on('reward:granted', (r: RewardGrant) => setRewards((l) => [`${r.label} ${r.value} (${r.rarity ?? 'common'})`, ...l].slice(0, 12)));
    if (q.get('demo')) seedDemo();
    if (q.get('view') === 'scene') services.router.replace('rivals');
    tick();
    return () => {
      off();
      uninstall();
    };
  }, []);

  const tick = () => setClockLabel(new Date(services.clock.now()).toLocaleString(services.locale === 'he' ? 'he-IL' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));

  /** Run a real case session end to end (start → history → tests → submit), on the sandbox clock. */
  const begin = (kase: ClinicalCase) => {
    services.session.start(kase, 'shift');
    setExam(kase.id);
  };
  const finish = (kase: ClinicalCase, quality: Quality) => {
    const w = fakeWorkup(kase, quality);
    if (services.session.state.get()?.caseId !== kase.id || services.session.state.get()?.submitted) begin(kase);
    for (const id of w.asked) services.session.ask(id);
    for (const t of w.tests) services.session.recordTest({ testId: t, accuracy: quality === 'great' ? 0.95 : 0.75, timeMs: 1000, findings: [] });
    // The core session times the case with Date.now(): move it forward for the submit only, so the
    // player's time is believable; then keep the sandbox clock in step.
    const real = Date.now;
    Date.now = () => real.call(Date) + w.elapsedSec * 1000;
    try {
      services.session.submit(w.diagnosisId, w.urgency);
    } finally {
      Date.now = real;
    }
    offset.current += w.elapsedSec * 1000;
    setExam(null);
    tick();
  };

  const complete = (quality: Quality) => {
    const live = exam ? services.registries.cases.get(exam) : undefined;
    const kase = live ?? cases[Math.floor(Math.random() * cases.length)];
    if (kase) finish(kase, quality);
  };
  const startExam = () => {
    const kase = cases[Math.floor(Math.random() * cases.length)];
    if (kase) begin(kase);
  };
  const startShift = () => {
    services.bus.emit('mode:started', { modeId: 'shift' });
    setRewards((l) => [t.shiftStarted, ...l]);
  };
  const toggleSummary = () => {
    services.router.replace(route.id === 'run-summary' ? home : 'run-summary');
  };

  /** A believable week so far: a few sessions spread over the elapsed days, then one live case. */
  function seedDemo() {
    const ctl = rivalsFor(services);
    const now = services.clock.now();
    const ws = weekStart(now);
    let s = { ...initialState(ws - DAY_MS), weekKey: initialState(now).weekKey, joinedAt: ws - DAY_MS, scale: 1 };
    const span = Math.max(1, now - ws - 3_600_000);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const kase = cases[(i * 7) % cases.length];
      if (!kase) break;
      const t = ws + (span * (i + 0.5)) / n;
      const quality: Quality = i % 5 === 3 ? 'wrong' : i % 3 === 1 ? 'average' : 'great';
      s = applyCase(s, t, kase.id, fakeScore(kase, quality), ctl.simulate(kase.id)).state;
    }
    ctl.state.set(s);
    const kase = cases.find((c) => c.id === (q.get('case') ?? 'ant-angle-closure-cinema')) ?? cases[0];
    if (kase) finish(kase, q.get('quality') === 'average' ? 'average' : 'great');
  }

  const shift = (ms: number) => {
    offset.current += ms;
    tick();
    services.bus.emit('scene:changed', { id: 'hub', params: {} });
  };

  const reset = () => {
    offset.current = 0;
    rivalsFor(services).state.set(initialState(services.clock.now()));
    setRewards([]);
    tick();
  };

  const scene = scenes.find((s) => s.id === route.id);
  if (route.id === 'rivals' && scene) {
    const C = asComponent(scene.component);
    return (
      <>
        <C services={services} params={route.params} />
        <ToastHost />
      </>
    );
  }

  return (
    <div class="sbrv">
      <style>{CSS}</style>
      <div class="sbrv-wrap">
        <header>
          <h1>{t.title}</h1>
          <p class="sbrv-sub">{t.sub(clockLabel, cases.length, Object.keys(TEST_CATALOG).length)}</p>
        </header>
        <div class="sbrv-bar">
          <span>topbar-right</span>
          <HudSlot slot="topbar-right" />
        </div>
        <div class="sbrv-grid">
          <div class="sbrv-col">
            <div class="sbrv-ctl">
              <b>{t.finishPatient}</b>
              <Button size="sm" variant="primary" onClick={() => complete('great')}>{t.great}</Button>
              <Button size="sm" onClick={() => complete('average')}>{t.average}</Button>
              <Button size="sm" onClick={() => complete('wrong')}>{t.wrong}</Button>
            </div>
            <div class="sbrv-ctl">
              <b>{t.examShift}</b>
              <Button size="sm" onClick={startExam} disabled={!!exam}>{exam ? t.examBusy : t.startExam}</Button>
              <Button size="sm" onClick={startShift}>{t.startShift}</Button>
              <Button size="sm" variant={route.id === 'run-summary' ? 'primary' : 'glass'} onClick={toggleSummary}>
                {route.id === 'run-summary' ? t.showResults : t.showSummary}
              </Button>
            </div>
            <div class="sbrv-ctl">
              <b>{t.time}</b>
              <Button size="sm" onClick={() => shift(6 * 3_600_000)}>{t.plus6h}</Button>
              <Button size="sm" onClick={() => shift(DAY_MS)}>{t.plus1d}</Button>
              <Button size="sm" onClick={() => shift(WEEK_MS)}>{t.nextWeek}</Button>
            </div>
            <div class="sbrv-ctl">
              <b>{t.state}</b>
              <Button size="sm" onClick={seedDemo}>{t.seed}</Button>
              <Button size="sm" variant="ghost" onClick={reset}>{t.reset}</Button>
              <Button size="sm" icon="users" onClick={() => services.router.go('rivals')}>{t.openScene}</Button>
            </div>
            <div class="sbrv-ctl">
              <b>{t.log}</b>
              <ol class="sbrv-log">{rewards.map((r, i) => <li key={i}>{r}</li>)}</ol>
            </div>
            <HudSlot slot="hub-sidebar" />
          </div>
          <div class="sbrv-col">
            <HudSlot slot="results-extra" />
            <HudSlot slot="profile" />
          </div>
        </div>
      </div>
      <ToastHost />
    </div>
  );
}

const page: SandboxPage = { id: 'sys-rivals', title: 'System · Rivals', component: SysRivalsPage };
export default page;
