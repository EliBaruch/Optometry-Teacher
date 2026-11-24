import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  TEST_CATALOG, scoreCase, type ClinicalCase, type GameServices, type MiniGameResult, type RewardGrant, type ScoreBreakdown, type TestId,
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

function fakeScore(kase: ClinicalCase, q: Quality, elapsedScale = 1): ScoreBreakdown {
  const essentials = q === 'average' ? kase.essentialTests.slice(0, Math.max(0, kase.essentialTests.length - 1)) : kase.essentialTests;
  const testsDone: Partial<Record<TestId, MiniGameResult>> = {};
  for (const t of [...essentials, ...(q === 'great' ? kase.helpfulTests.slice(0, 1) : [])]) {
    testsDone[t] = { testId: t, accuracy: q === 'great' ? 0.95 : 0.75, timeMs: 1000, findings: [] };
  }
  const keyQs = kase.history.filter((h) => h.relevance === 'key').map((h) => h.id);
  return scoreCase({
    kase,
    diagnosisId: q === 'wrong' ? kase.differentials[0] ?? 'healthy-eyes' : kase.diagnosis,
    urgency: q === 'wrong' ? 'routine' : kase.urgency,
    testsDone,
    askedQuestions: q === 'great' ? keyQs : keyQs.slice(0, Math.ceil(keyQs.length / 2)),
    elapsedSec: Math.round((60 + kase.difficulty * 30) * (q === 'great' ? 0.7 : 1.3) * elapsedScale),
    hintsUsed: 0,
  });
}

const CSS = `
.sbrv { position: absolute; inset: 0; overflow: auto; color: #f6efe4; font-family: var(--lm-font-ui);
  background: radial-gradient(120% 80% at 30% 0%, #2a1748 0%, #1a0f2e 50%, #0b0716 100%); }
.sbrv-wrap { max-width: 1240px; margin: 0 auto; padding: 20px 16px 60px; display: grid; gap: 18px; box-sizing: border-box; }
.sbrv h1 { font-family: var(--lm-font-display); font-weight: 500; font-size: 28px; margin: 0; color: #ffe7b3; }
.sbrv-sub { color: #a99bbd; font-size: 13px; margin: 4px 0 0; }
.sbrv-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; height: 60px; padding: 0 16px; border-radius: 16px;
  background: linear-gradient(180deg, rgba(6,3,13,.7), rgba(6,3,13,.2)); box-shadow: inset 0 0 0 1px #ffd27a22; }
.sbrv-bar span { font: 600 10px/1 var(--lm-font-ui); letter-spacing: .14em; text-transform: uppercase; color: #a99bbd; }
.sbrv-bar .hud-slot { display: flex; gap: 8px; align-items: center; }
.sbrv-grid { display: grid; grid-template-columns: 340px 1fr; gap: 18px; align-items: start; }
.sbrv-ctl { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px; border-radius: 16px; background: #ffffff08; box-shadow: inset 0 0 0 1px #ffffff14; }
.sbrv-ctl b { width: 100%; font: 600 10px/1 var(--lm-font-ui); letter-spacing: .14em; text-transform: uppercase; color: #a99bbd; }
.sbrv-log { font: 500 12px/1.5 var(--lm-font-num); color: #ddd3c4; margin: 0; padding: 0 0 0 16px; max-height: 160px; overflow: auto; }
.sbrv-col { display: grid; gap: 18px; min-width: 0; }
.sbrv .hud-slot--results-extra, .sbrv .hud-slot--hub-sidebar, .sbrv .hud-slot--profile { display: grid; gap: 14px; }
@media (max-width: 860px) { .sbrv-grid { grid-template-columns: 1fr; } }
`;

function SysRivalsPage({ services }: { services: GameServices }) {
  const offset = useRef(0);
  const q = useMemo(() => new URLSearchParams(location.search), []);
  const [rewards, setRewards] = useState<string[]>([]);
  const [clockLabel, setClockLabel] = useState('');
  const route = useSignal(services.router.current);
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

  const tick = () => setClockLabel(new Date(services.clock.now()).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));

  const complete = (quality: Quality) => {
    const kase = cases[Math.floor(Math.random() * cases.length)];
    if (!kase) return;
    services.bus.emit('case:completed', { caseId: kase.id, modeId: 'shift', score: fakeScore(kase, quality) });
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
    const kase = cases.find((c) => c.id === 'ant-angle-closure-cinema') ?? cases[0];
    if (kase) services.bus.emit('case:completed', { caseId: kase.id, modeId: 'shift', score: fakeScore(kase, 'great') });
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
          <h1>Rivals — system preview</h1>
          <p class="sbrv-sub">Sandbox clock: {clockLabel}. {cases.length} cases registered. Tests known: {Object.keys(TEST_CATALOG).length}.</p>
        </header>
        <div class="sbrv-bar">
          <span>topbar-right</span>
          <HudSlot slot="topbar-right" />
        </div>
        <div class="sbrv-grid">
          <div class="sbrv-col">
            <div class="sbrv-ctl">
              <b>Finish a patient</b>
              <Button size="sm" variant="primary" onClick={() => complete('great')}>Excellent case</Button>
              <Button size="sm" onClick={() => complete('average')}>Average case</Button>
              <Button size="sm" onClick={() => complete('wrong')}>Wrong diagnosis</Button>
            </div>
            <div class="sbrv-ctl">
              <b>Time</b>
              <Button size="sm" onClick={() => shift(6 * 3_600_000)}>+6 hours</Button>
              <Button size="sm" onClick={() => shift(DAY_MS)}>+1 day</Button>
              <Button size="sm" onClick={() => shift(WEEK_MS)}>Next week</Button>
            </div>
            <div class="sbrv-ctl">
              <b>State</b>
              <Button size="sm" onClick={seedDemo}>Seed demo week</Button>
              <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
              <Button size="sm" icon="users" onClick={() => services.router.go('rivals')}>Open Rivals scene</Button>
            </div>
            <div class="sbrv-ctl">
              <b>reward:granted log</b>
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
