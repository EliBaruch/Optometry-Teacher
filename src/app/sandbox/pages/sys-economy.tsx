import { useEffect, useState } from 'preact/hooks';
import { defineStrings, pickStrings } from '@core';
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
.sbe-sub { font: 600 10px/1 var(--lm-font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--lm-ink-3); margin: 14px 0 8px; }
.sbe-sub:first-child { margin-top: 0; }
.sbe-chips { display: grid; gap: 8px; }
.sbe-empty { color: var(--lm-ink-3); font-size: 13px; }
@media (max-width: 860px) { .sbe { grid-template-columns: 1fr; } }
`;

const T = defineStrings({
  en: {
    title: 'Economy lab', eyebrow: 'Sandbox · Boutique & coins', fire: 'Fire events', synth: 'Synthetic bus traffic',
    completed: 'Case completed', flawless: 'S · flawless', wrong: 'Wrong diagnosis', other: 'Other systems', gift: 'Gift +250',
    giftReason: 'Daily gift', promo: 'Promotion', practice: 'Practice', note: '+1 consult note', hint: 'Use hint',
    nav: 'Navigate', boutique: 'Open the Boutique', resetW: 'Reset wallet', state: 'State', chips: 'Reward chips',
    chipsEye: 'As the results screen shows them', empty: 'Complete a case to see rewards cascade.',
    ranks: ['Intern', 'Resident', 'Associate', 'Senior', 'Clinic Director', 'Living Legend'],
    stateLine: (b: number, c: number, n: number, p: number, d: number) => `${b} lumens · ${c} crates · ${n} notes · pity ${p} · today ${d}`,
  },
  he: {
    title: 'מעבדת כלכלה', eyebrow: 'ארגז חול · הבוטיק והניצוצות', fire: 'הפעלת אירועים', synth: 'תעבורת אירועים מדומה',
    completed: 'סיום מקרה', flawless: 'S · ללא רבב', wrong: 'אבחנה שגויה', other: 'מערכות אחרות', gift: 'מתנה +250',
    giftReason: 'מתנה יומית', promo: 'קידום', practice: 'אימון', note: '+1 פתק ייעוץ', hint: 'שימוש ברמז',
    nav: 'ניווט', boutique: 'פתיחת הבוטיק', resetW: 'איפוס הארנק', state: 'מצב', chips: 'פרסים',
    chipsEye: 'כפי שהם מופיעים במסך התוצאות', empty: 'סיימו מקרה כדי לראות את הפרסים נופלים.',
    ranks: ['סטאז׳ר', 'מתמחה', 'מומחה', 'בכיר', 'מנהל מרפאה', 'אגדה חיה'],
    stateLine: (b: number, c: number, n: number, p: number, d: number) => `${b} ניצוצות · ${c} ארגזים · ${n} פתקים · רשת ביטחון ${p} · היום ${d}`,
  },
});

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
  const t = pickStrings(T, services.locale);
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
    <Screen title={t.title} eyebrow={t.eyebrow} backdrop="hub">
      <div class="sbe">
        <GlassPanel title={t.fire} eyebrow={t.synth} icon="lightning">
          <p class="sbe-sub">{t.completed}</p>
          <div class="sbe-row">
            <Button size="sm" variant="primary" onClick={() => complete('S', true)} data-testid="eco-s">{t.flawless}</Button>
            <Button size="sm" onClick={() => complete('S')}>S</Button>
            <Button size="sm" variant="glass" onClick={() => complete('A')}>A</Button>
            <Button size="sm" variant="glass" onClick={() => complete('B')}>B</Button>
            <Button size="sm" variant="glass" onClick={() => complete('C')}>C</Button>
            <Button size="sm" variant="ghost" onClick={() => complete('F')}>{t.wrong}</Button>
          </div>
          <p class="sbe-sub">{t.other}</p>
          <div class="sbe-row">
            <Button size="sm" variant="glass" icon="gift" onClick={() => services.bus.emit('currency:grant', { amount: 250, reason: t.giftReason })} data-testid="eco-gift">{t.gift}</Button>
            <Button size="sm" variant="glass" icon="crown" onClick={() => { const n = rank + 1; setRank(n); services.bus.emit('rank:changed', { level: n, title: t.ranks[Math.min(5, n - 2)]! }); }} data-testid="eco-rank">{t.promo}</Button>
            <Button size="sm" variant="glass" icon="target" onClick={() => services.bus.emit('practice:completed', { testId: 'tonometry', result: { testId: 'tonometry', accuracy: 0.92, timeMs: 9000, findings: [] } })}>{t.practice}</Button>
            <Button size="sm" variant="glass" icon="book" onClick={() => store.state.update((s) => ({ ...s, hintTokens: s.hintTokens + 1 }))}>{t.note}</Button>
            <Button size="sm" variant="glass" icon="info" onClick={() => services.bus.emit('hint:used', { caseId: 'next' })}>{t.hint}</Button>
          </div>
          <p class="sbe-sub">{t.nav}</p>
          <div class="sbe-row">
            <Button size="sm" variant="primary" icon="gem" onClick={() => services.router.go('boutique')} data-testid="eco-boutique">{t.boutique}</Button>
            <Button size="sm" variant="danger" onClick={() => { store.state.set({ ...store.state.get(), balance: 0, crates: [], owned: ['candlelight', 'clinic-classic', 'ivory-card'], equipped: { theme: 'candlelight', frame: 'clinic-classic', nameplate: 'ivory-card' }, drops: [], pity: 0 }); setChips([]); }}>{t.resetW}</Button>
          </div>
          <p class="sbe-sub">{t.state}</p>
          <p class="sbe-empty" dir="auto">{t.stateLine(state.balance, state.crates.length, state.hintTokens, state.pity, state.day.caseCoins)}</p>
        </GlassPanel>

        <div class="sbe-chips">
          <Results services={services} />
          <GlassPanel title={t.chips} eyebrow={t.chipsEye} padding="sm">
            <div class="sbe-chips">
              {chips.length ? chips.map((g, i) => <RewardChip key={`${chips.length}-${i}`} grant={g} index={i} sfx={false} />) : <p class="sbe-empty">{t.empty}</p>}
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
