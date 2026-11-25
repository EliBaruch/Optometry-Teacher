import { useEffect, useState } from 'preact/hooks';
import { dayKey, defineStrings, modeText, pickStrings, type ClinicalCase, type GameServices, type Grade, type ModeModule, type RewardGrant, type ScoreBreakdown } from '@core';
import { Button, HudSlot, RewardChip, Screen, useSignal } from '@ui-kit';
import streaks, { streaksOf } from '../../../systems/streaks';
import { INITIAL } from '../../../systems/streaks/state';
import { addDays } from '../../../systems/streaks/days';
import type { SandboxPage } from '../Sandbox';

/**
 * Streaks (system 'streaks') preview:
 *   ?sandbox=page/sys-streaks                  topbar flame · exam combo meter · results panel · hub card
 *   &preset=fresh | demo (default) | hot | resting | protected
 *   &view=details                              open the streak details modal
 *   &end=1                                     end the seeded run (run-summary variant of the panel)
 *   &dock=0                                    collapse the controls
 */
const MODE_LOADERS = import.meta.glob<{ default: ModeModule }>('../../../modes/*/index.ts');
const DAY = 86_400_000;

type Kind = 'S' | 'A' | 'B' | 'safe-miss' | 'miss';

function fakeScore(kind: Kind): ScoreBreakdown {
  const correct = kind === 'S' || kind === 'A' || kind === 'B';
  const total = { S: 1250, A: 1080, B: 900, 'safe-miss': 640, miss: 260 }[kind];
  const grade: Grade = correct ? (kind as Grade) : kind === 'safe-miss' ? 'D' : 'F';
  return {
    total, max: 1300, grade, perfect: kind === 'S', diagnosisCorrect: correct, urgencyCorrect: kind !== 'miss',
    correctDiagnosisId: 'acute-angle-closure', chosenDiagnosisId: correct ? 'acute-angle-closure' : 'viral-conjunctivitis',
    parts: [], essentialMissed: kind === 'miss' ? ['tonometry'] : [], unnecessaryTests: [], keyQuestionsAsked: 3, keyQuestionsTotal: 4,
    skillAvg: 0.8, elapsedSec: 140, parSec: 150,
  };
}

const T = defineStrings({
  en: {
    lighting: 'Lighting the lamps…', title: 'Streaks', eyebrow: 'Sandbox · system preview',
    runLine: (mode: string | undefined, n: number, pts: number) => `Run: ${mode} · ${n} correct · ${pts} pts`,
    startHint: 'Start a run, then finish patients →',
    dock: 'Streaks sandbox', run: 'Run:', shift: 'Clinic Shift', rush: 'Rush Hour', endRun: 'End run',
    patient: 'Patient:', missSafe: 'Miss (safe)', miss: 'Miss', timeout: 'Timeout', next: 'Next patient',
    clock: 'Clock:', plus1: '+1 day', plus2: '+2 days', plus4: '+4 days', reset: 'Reset',
  },
  he: {
    lighting: 'מדליקים את המנורות…', title: 'רצפים', eyebrow: 'ארגז חול · תצוגה מקדימה של המערכת',
    runLine: (mode: string | undefined, n: number, pts: number) => `סבב: ${mode} · ${n} נכונים · ${pts} נק׳`,
    startHint: 'התחילו סבב וסיימו טיפול במטופלים ←',
    dock: 'ארגז החול של הרצפים', run: 'סבב:', shift: 'משמרת במרפאה', rush: 'שעת עומס', endRun: 'סיום הסבב',
    patient: 'מטופל:', missSafe: 'פספוס (בטוח)', miss: 'פספוס', timeout: 'נגמר הזמן', next: 'המטופל הבא',
    clock: 'שעון:', plus1: '+יום', plus2: '+יומיים', plus4: '+4 ימים', reset: 'איפוס',
  },
});

function Page({ services }: { services: GameServices }) {
  const t = pickStrings(T, services.locale);
  const q = new URLSearchParams(location.search);
  const [ready, setReady] = useState(false);
  const [rewards, setRewards] = useState<RewardGrant[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [n, setN] = useState(0);
  const run = useSignal(services.run.state);

  useEffect(() => {
    const realNow = services.clock.now.bind(services.clock);
    const push = (s: string) => setLog((l) => [...l.slice(-5), s]);
    const offs = [
      services.bus.on('reward:granted', (r) => setRewards((xs) => [...xs.slice(-9), r])),
      services.bus.on('xp:grant', (e) => push(`xp:grant +${e.amount} (${e.reason})`)),
      services.bus.on('currency:grant', (e) => push(`currency:grant +${e.amount} (${e.reason})`)),
      services.bus.on('achievement:unlocked', (e) => push(`achievement: ${e.title}`)),
      services.bus.on('toast', (e) => push(`toast: ${e.message}`)),
    ];
    let alive = true;
    void Promise.allSettled(Object.values(MODE_LOADERS).map((l) => l())).then((res) => {
      if (!alive) return;
      for (const r of res) if (r.status === 'fulfilled' && r.value.default && !services.registries.modes.has(r.value.default.id)) services.registries.modes.register(r.value.default);
      offs.push(streaks.install(services));
      seed(services, q.get('preset') ?? 'demo');
      if (q.get('end') === '1' && services.run.state.get()) {
        services.run.end();
        services.router.replace('run-summary', {});
      }
      setReady(true);
      if (q.get('view') === 'details') setTimeout(() => (document.querySelector('.sk-chip') as HTMLButtonElement | null)?.click(), 60);
    });
    return () => {
      alive = false;
      services.clock.now = realNow;
      offs.forEach((o) => o());
    };
  }, []);

  if (!ready) return <p style={{ padding: 24 }}>{t.lighting}</p>;
  const ctl = streaksOf(services)!;

  const shiftDays = (d: number) => {
    const next = offset + d;
    setOffset(next);
    const base = Date.now;
    services.clock.now = () => base() + next * DAY;
    ctl.state.set({ ...ctl.state.get() }); // re-render widgets
    setLog((l) => [...l.slice(-5), `clock → ${dayKey(services.clock.now())}`]);
  };
  const startRun = (modeId: string) => {
    const mode = services.registries.modes.get(modeId);
    if (!mode) return;
    if (services.run.state.get()) services.run.end();
    services.router.replace('sandbox', {});
    services.run.start(mode, `sandbox:${modeId}:${Date.now()}`);
    nextPatient(modeId);
  };
  const nextPatient = (modeId = services.run.state.get()?.modeId ?? 'shift') => {
    const id = `sandbox-${n + 1}`;
    setN(n + 1);
    services.session.clear();
    services.session.start({ id, emergency: undefined } as unknown as ClinicalCase, modeId);
    return id;
  };
  const finish = (kind: Kind) => {
    const modeId = services.run.state.get()?.modeId ?? 'shift';
    const s = services.session.state.get();
    const caseId = s && !s.submitted ? s.caseId : nextPatient(modeId);
    const score = fakeScore(kind);
    services.bus.emit('case:completed', { caseId, modeId, score });
    if (services.run.state.get()) services.run.report(caseId, score);
  };
  const timeout = () => {
    const modeId = services.run.state.get()?.modeId ?? 'shift';
    const s = services.session.state.get();
    const caseId = s && !s.submitted ? s.caseId : nextPatient(modeId);
    services.bus.emit('case:failed', { caseId, modeId, reason: 'timeout' });
  };
  const endRun = () => {
    services.run.end();
    services.router.replace('run-summary', {});
  };
  const reset = () => {
    ctl.state.set(INITIAL);
    ctl.combo.set({ modeId: null, count: 0, best: 0, graceUsed: false, cases: 0 });
    ctl.echo.set(null);
    ctl.runEcho.set(null);
    services.run.end();
    services.session.clear();
    services.router.replace('sandbox', {});
    setRewards([]);
  };

  return (
    <Screen title={t.title} eyebrow={t.eyebrow} backdrop="hub" class="sksb">
      <style>{CSS}</style>
      <div class="sksb-grid">
        <section class="sksb-col">
          <h2 class="sksb-h">exam-overlay</h2>
          <div class="sksb-exam">
            <div class="sksb-exam__overlay"><HudSlot slot="exam-overlay" /></div>
            <p class="sksb-exam__hint">{run ? t.runLine((() => { const m = services.registries.modes.get(run.modeId); return m ? modeText(m, services.locale).title : undefined; })(), run.completed.length, run.totalScore) : t.startHint}</p>
          </div>
          <h2 class="sksb-h">results-extra</h2>
          <HudSlot slot="results-extra" />
        </section>
        <section class="sksb-col">
          <h2 class="sksb-h">hub-sidebar</h2>
          <HudSlot slot="hub-sidebar" />
        </section>
      </div>

      <details class="sksb-dock" open={q.get('dock') !== '0'}>
        <summary>{t.dock} · {dayKey(services.clock.now())}</summary>
        <div class="sksb-row">
          <span>{t.run}</span>
          <Button size="sm" onClick={() => startRun('shift')}>{t.shift}</Button>
          <Button size="sm" onClick={() => startRun('rush')}>{t.rush}</Button>
          <Button size="sm" variant="ghost" onClick={endRun}>{t.endRun}</Button>
        </div>
        <div class="sksb-row">
          <span>{t.patient}</span>
          <Button size="sm" onClick={() => finish('S')}>S</Button>
          <Button size="sm" onClick={() => finish('A')}>A</Button>
          <Button size="sm" onClick={() => finish('B')}>B</Button>
          <Button size="sm" onClick={() => finish('safe-miss')}>{t.missSafe}</Button>
          <Button size="sm" onClick={() => finish('miss')}>{t.miss}</Button>
          <Button size="sm" onClick={timeout}>{t.timeout}</Button>
          <Button size="sm" variant="ghost" onClick={() => nextPatient()}>{t.next}</Button>
        </div>
        <div class="sksb-row">
          <span>{t.clock}</span>
          <Button size="sm" onClick={() => shiftDays(1)}>{t.plus1}</Button>
          <Button size="sm" onClick={() => shiftDays(2)}>{t.plus2}</Button>
          <Button size="sm" onClick={() => shiftDays(4)}>{t.plus4}</Button>
          <Button size="sm" variant="ghost" onClick={reset}>{t.reset}</Button>
        </div>
        <div class="sksb-meta">{log.map((l, i) => <div key={i}>{l}</div>)}</div>
        <div class="sksb-rewards">{rewards.map((r, i) => <RewardChip key={i} grant={r} index={i} animate={false} />)}</div>
      </details>
    </Screen>
  );
}

/** Deterministic starting states for screenshots. */
function seed(services: GameServices, preset: string) {
  const ctl = streaksOf(services)!;
  const today = dayKey(services.clock.now());
  const back = (k: number) => addDays(today, -k);
  const playedRange = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, i) => back(from - i));
  if (preset === 'fresh') {
    ctl.state.set(INITIAL);
    return;
  }
  if (preset === 'resting') {
    ctl.state.set({ ...INITIAL, daily: { ...INITIAL.daily, current: 9, best: 9, lastDay: back(4), played: playedRange(12, 4), totalDays: 14, claimed: [3, 7] } });
    return;
  }
  if (preset === 'protected') {
    ctl.state.set({ ...INITIAL, daily: { ...INITIAL.daily, current: 6, best: 8, lastDay: back(2), played: playedRange(7, 2), freezes: 1, totalDays: 15, claimed: [3] } });
    return;
  }
  const hot = preset === 'hot';
  const played = [...playedRange(13, 3), back(1)];
  ctl.state.set({
    ...INITIAL,
    daily: {
      ...INITIAL.daily, current: 12, best: 12, lastDay: back(1), played, frozen: [back(2)], freezes: 1, freezeProgress: 3,
      claimed: [3, 7], totalDays: 19,
    },
    bests: { shift: { run: 5600, runCases: 5, caseScore: 1230, combo: 4 }, rush: { run: 8900, runCases: 9, caseScore: 1190, combo: 6 } },
    bestCombo: 6,
  });
  // Play a short run so every widget has something to show.
  const mode = services.registries.modes.get('shift');
  if (!mode) return;
  services.run.start(mode, 'sandbox:seed');
  const kinds: ScoreBreakdown[] = hot ? ['S', 'A', 'S', 'A', 'S'].map((k) => fakeScore(k as Kind)) : ['A', 'S'].map((k) => fakeScore(k as Kind));
  kinds.forEach((score, i) => {
    const id = `seed-${i}`;
    services.session.clear();
    services.session.start({ id } as unknown as ClinicalCase, 'shift');
    services.bus.emit('case:completed', { caseId: id, modeId: 'shift', score });
    services.run.report(id, score);
  });
}

const CSS = `
.sksb .lm-screen__content { overflow: auto; }
.sksb-grid { max-width: 1120px; margin: 0 auto; padding: 20px 16px 300px; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.85fr); gap: 24px; }
.sksb-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.sksb-col .hud-slot { display: flex; flex-direction: column; gap: 14px; }
.sksb-h { margin: 6px 0 0; font: 650 11px/1 var(--lm-font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--lm-muted-2); }
.sksb-exam { position: relative; min-height: 120px; border-radius: 18px; padding: 14px; background: radial-gradient(120% 90% at 30% 20%, rgba(80, 52, 130, .35), rgba(10, 6, 20, .5)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
.sksb-exam__overlay { display: flex; justify-content: flex-end; min-height: 40px; }
.sksb-exam__hint { margin: 30px 0 0; color: var(--lm-muted); font-size: 13px; }
.sksb-dock { position: fixed; z-index: 900; right: 12px; bottom: 12px; width: min(470px, calc(100vw - 24px)); padding: 10px; border-radius: 14px;
  background: rgba(10, 6, 20, 0.9); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(10px); display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--lm-muted); }
.sksb-dock summary { cursor: pointer; color: var(--lm-ivory); font-weight: 600; }
.sksb-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 4px; }
.sksb-meta { font-family: var(--lm-font-num); font-size: 11px; max-height: 64px; overflow: auto; }
.sksb-rewards { display: flex; flex-wrap: wrap; gap: 4px; }
@media (max-width: 860px) { .sksb-grid { grid-template-columns: 1fr; } }
`;

const page: SandboxPage = { id: 'sys-streaks', title: 'System · Streaks', component: Page };
export default page;
