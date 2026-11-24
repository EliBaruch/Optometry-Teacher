import { useEffect, useState } from 'preact/hooks';
import type { GameServices, Grade, RewardGrant, ScoreBreakdown } from '@core';
import { Button, GlassPanel, RewardChip, Screen, ToastHost, asComponent, useSignal } from '@ui-kit';
import economy, { economyFor } from '../../../systems/economy';
import type { SandboxPage } from '../Sandbox';

/*
 * Economy lab: installs the system into the sandbox services and fires synthetic
 * events so every widget, the crate theatre and the Boutique can be reviewed.
 *   ?sandbox=page/sys-economy                 lab
 *   ?sandbox=page/sys-economy&rich=1          start with lumens + crates
 *   ?sandbox=page/sys-economy&view=boutique   open the Boutique scene
 *   ?sandbox=page/sys-economy&theme=aurora    try a clinic theme
 */
const CSS = `
.sbe { max-width: 1180px; margin: 0 auto; display: grid; gap: 18px; grid-template-columns: 1fr 1fr; align-items: start; }
.sbe-full { grid-column: 1 / -1; }
.sbe-row { display: flex; flex-wrap: wrap; gap: 8px; }
.sbe-sub { font: 600 10px/1 var(--lm-font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--lm-muted-2); margin: 14px 0 8px; }
.sbe-sub:first-child { margin-top: 0; }
.sbe-chips { display: grid; gap: 8px; }
.sbe-empty { color: var(--lm-muted); font-size: 13px; }
@media (max-width: 860px) { .sbe { grid-template-columns: 1fr; } }
`;

const TOTALS: Record<Grade, number> = { S: 1250, A: 1080, B: 900, C: 720, D: 420, F: 160 };
let caseSeq = 0;

function fakeScore(grade: Grade, perfect = false): ScoreBreakdown {
  const correct = grade !== 'D' && grade !== 'F';
  const total = TOTALS[grade];
  return {
    total, max: 1300, grade, perfect, diagnosisCorrect: correct, urgencyCorrect: correct,
    correctDiagnosisId: 'acute-angle-closure', chosenDiagnosisId: correct ? 'acute-angle-closure' : 'viral-conjunctivitis',
    parts: [
      { id: 'diagnosis', label: 'Diagnosis', points: correct ? 500 : 0, max: 500 },
      { id: 'efficiency', label: 'Efficiency', points: grade === 'S' ? 100 : 60, max: 100 },
    ],
    essentialMissed: [], unnecessaryTests: [], keyQuestionsAsked: 3, keyQuestionsTotal: 3, skillAvg: 0.9, elapsedSec: 95, parSec: 150,
  };
}

function Lab({ services }: { services: GameServices }) {
  const store = economyFor(services);
  const state = useSignal(store.state);
  const [chips, setChips] = useState<RewardGrant[]>([]);
  const [rank, setRank] = useState(1);
  const Results = asComponent(services.registries.hud.get('economy:receipt')!.component);
  const Profile = asComponent(services.registries.hud.get('economy:wardrobe')!.component);

  useEffect(() => services.bus.on('reward:granted', (r) => setChips((c) => [...c, r])), []);

  const complete = (grade: Grade, perfect = false) => {
    setChips([]);
    const caseId = services.registries.cases.all()[caseSeq % Math.max(1, services.registries.cases.all().length)]?.id ?? `sandbox-${caseSeq}`;
    caseSeq++;
    services.bus.emit('case:started', { caseId, modeId: 'shift', emergency: false });
    services.bus.emit('case:completed', { caseId, modeId: 'shift', score: fakeScore(grade, perfect) });
  };

  return (
    <Screen title="Economy lab" eyebrow="Sandbox · Boutique & coins" backdrop="hub">
      <div class="sbe">
        <GlassPanel title="Fire events" eyebrow="Synthetic bus traffic" icon="lightning">
          <p class="sbe-sub">Case completed</p>
          <div class="sbe-row">
            <Button size="sm" variant="primary" onClick={() => complete('S', true)} data-testid="eco-s">S · flawless</Button>
            <Button size="sm" onClick={() => complete('S')}>S</Button>
            <Button size="sm" variant="glass" onClick={() => complete('A')}>A</Button>
            <Button size="sm" variant="glass" onClick={() => complete('B')}>B</Button>
            <Button size="sm" variant="glass" onClick={() => complete('C')}>C</Button>
            <Button size="sm" variant="ghost" onClick={() => complete('F')}>Wrong diagnosis</Button>
          </div>
          <p class="sbe-sub">Other systems</p>
          <div class="sbe-row">
            <Button size="sm" variant="glass" icon="gift" onClick={() => services.bus.emit('currency:grant', { amount: 250, reason: 'Daily gift' })} data-testid="eco-gift">Gift +250</Button>
            <Button size="sm" variant="glass" icon="crown" onClick={() => { const n = rank + 1; setRank(n); services.bus.emit('rank:changed', { level: n, title: ['Intern', 'Resident', 'Associate', 'Senior', 'Clinic Director', 'Living Legend'][Math.min(5, n - 2)]! }); }} data-testid="eco-rank">Promotion</Button>
            <Button size="sm" variant="glass" icon="target" onClick={() => services.bus.emit('practice:completed', { testId: 'tonometry', result: { testId: 'tonometry', accuracy: 0.92, timeMs: 9000, findings: [] } })}>Practice</Button>
            <Button size="sm" variant="glass" icon="book" onClick={() => store.state.update((s) => ({ ...s, hintTokens: s.hintTokens + 1 }))}>+1 consult note</Button>
            <Button size="sm" variant="glass" icon="info" onClick={() => services.bus.emit('hint:used', { caseId: 'next' })}>Use hint</Button>
          </div>
          <p class="sbe-sub">Navigate</p>
          <div class="sbe-row">
            <Button size="sm" variant="primary" icon="gem" onClick={() => services.router.go('boutique')} data-testid="eco-boutique">Open the Boutique</Button>
            <Button size="sm" variant="danger" onClick={() => { store.state.set({ ...store.state.get(), balance: 0, crates: [], owned: ['candlelight', 'clinic-classic', 'ivory-card'], equipped: { theme: 'candlelight', frame: 'clinic-classic', nameplate: 'ivory-card' }, drops: [], pity: 0 }); setChips([]); }}>Reset wallet</Button>
          </div>
          <p class="sbe-sub">State</p>
          <p class="sbe-empty">{state.balance} lumens · {state.crates.length} crates · {state.hintTokens} notes · pity {state.pity} · today {state.day.caseCoins}</p>
        </GlassPanel>

        <div class="sbe-chips">
          <Results services={services} />
          <GlassPanel title="Reward chips" eyebrow="As the results screen shows them" padding="sm">
            <div class="sbe-chips">
              {chips.length ? chips.map((g, i) => <RewardChip key={`${chips.length}-${i}`} grant={g} index={i} sfx={false} />) : <p class="sbe-empty">Complete a case to see rewards cascade.</p>}
            </div>
          </GlassPanel>
        </div>

        <div class="sbe-full">
          <Profile services={services} />
        </div>
      </div>
    </Screen>
  );
}

function EconomyPage({ services }: { services: GameServices }) {
  const route = useSignal(services.router.current);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const uninstall = economy.install(services);
    const q = new URLSearchParams(location.search);
    if (q.get('rich')) {
      const store = economyFor(services);
      if (store.balance < 3000) services.bus.emit('currency:grant', { amount: 3200, reason: 'Sandbox' });
      for (let i = store.state.get().crates.length; i < 3; i++) store.earnCrate((['case', 'momentum', 'promotion'] as const)[i]!, 'Sandbox delivery');
    }
    const theme = q.get('theme');
    if (theme) {
      const store = economyFor(services);
      store.state.update((s) => ({ ...s, owned: s.owned.includes(theme) ? s.owned : [...s.owned, theme] }));
      store.equip(theme);
    }
    if (q.get('view') === 'boutique') services.router.replace('boutique');
    else services.router.replace('economy-lab');
    setReady(true);
    return uninstall;
  }, []);

  if (!ready) return null;
  const scene = route.id === 'boutique' ? services.registries.scenes.get('boutique') : undefined;
  const Scene = scene ? asComponent(scene.component) : null;
  return (
    <>
      <style>{CSS}</style>
      {Scene ? <Scene services={services} params={route.params} /> : <Lab services={services} />}
      <ToastHost />
    </>
  );
}

const page: SandboxPage = { id: 'sys-economy', title: 'System · Boutique & coins', component: EconomyPage };
export default page;
