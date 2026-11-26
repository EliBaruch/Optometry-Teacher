import { useEffect, useMemo, useState } from 'preact/hooks';
import { defineStrings, pickStrings, type ClinicalCase, type GameServices, type Grade, type ScoreBreakdown } from '@core';
import { HudSlot, asComponent, useSignal } from '@ui-kit';
import collection from '../../../systems/collection';
import { CARD_RARITIES, FRAME_THRESHOLDS, FRAME_TIERS, INITIAL_STATE, type CollectionState, type OwnedCard } from '../../../systems/collection/model';
import { IrisCard } from '../../../systems/collection/ui/IrisCard';
import { cardNumber, orderedDiagnoses } from '../../../systems/collection/catalog';
import { SAVE_KEY, SAVE_VERSION } from '../../../systems/collection/store';
import type { SandboxPage } from '../Sandbox';

/**
 * Gallery (collection) sandbox. Query params for screenshots:
 *   &view=reveal|hub|gallery|showcase   &fill=<n> (pre-collect n cards)   &grade=S|A|B|C|miss (auto-treat one patient)
 */
type View = 'reveal' | 'hub' | 'gallery' | 'showcase';
type Outcome = Grade | 'miss';

const T = defineStrings({
  en: {
    noDx: 'No diagnoses registered.', noCases: 'No cases registered.', reset: 'Collection reset',
    title: 'Gallery · iris cards',
    blurb: 'Treat a synthetic patient with a chosen grade; the results-extra widget opens the card sleeve. Cards persist in this browser.',
    showcase: 'Rarity (columns) × frame (rows)', results: 'Results screen · results-extra slot',
    hubSlot: 'Hub · hub-sidebar slot', profileSlot: 'Profile · profile slot',
    view: 'View', grade: 'Grade', vReveal: 'Results reveal', vHub: 'Hub sidebar', vGallery: 'Gallery scene', vShowcase: 'Showcase',
    miss: 'Missed dx', treat: 'Treat next patient', eight: '+8 patients', resetBtn: 'Reset',
    meta: (c: number, p: number) => `${c} cards · ${p} pulls`,
  },
  he: {
    noDx: 'אין אבחנות רשומות.', noCases: 'אין מקרים רשומים.', reset: 'האוסף אופס',
    title: 'גלריה · כרטיסי קשתית',
    blurb: 'מטפלים במטופל מדומה בציון לבחירתכם, והווידג׳ט במסך התוצאות פותח את שקית הכרטיסים. הכרטיסים נשמרים בדפדפן הזה.',
    showcase: 'נדירות (עמודות) × מסגרת (שורות)', results: 'מסך תוצאות · משבצת results-extra',
    hubSlot: 'מרכז · משבצת hub-sidebar', profileSlot: 'פרופיל · משבצת profile',
    view: 'תצוגה', grade: 'ציון', vReveal: 'חשיפת תוצאות', vHub: 'סרגל המרכז', vGallery: 'סצנת הגלריה', vShowcase: 'ויטרינה',
    miss: 'אבחנה שהוחמצה', treat: 'המטופל הבא', eight: '+8 מטופלים', resetBtn: 'איפוס',
    meta: (c: number, p: number) => `${c} כרטיסים · ${p} פתיחות`,
  },
});

const CSS = `
.sbc { position: fixed; inset: 0; overflow: auto; color: var(--lm-ink); font-family: var(--lm-font-ui);
  background-color: var(--lm-canvas); background-image: radial-gradient(60% 55% at 92% 2%, rgba(122,162,255,.55), transparent 70%), radial-gradient(50% 50% at 6% 10%, rgba(111,214,255,.42), transparent 70%), radial-gradient(55% 50% at 70% 100%, rgba(196,181,253,.45), transparent 70%), radial-gradient(45% 45% at 10% 95%, rgba(255,200,170,.4), transparent 70%), linear-gradient(180deg,#f3f6fd,var(--lm-canvas)); }
.sbc-main { max-width: 860px; margin: 0 auto; padding: 24px 16px 200px; display: grid; gap: 18px; }
.sbc-main h1 { margin: 0; font-family: var(--lm-font-display); font-weight: 800; letter-spacing: var(--lm-tracking-display); font-size: 40px; color: var(--lm-ink); }
.sbc-main > p { margin: 0; color: var(--lm-ink-3); font-size: 14px; }
.sbc-mock { padding: 18px; border-radius: var(--lm-r-lg); background: var(--lm-glass); backdrop-filter: var(--lm-glass-blur); box-shadow: var(--lm-glass-highlight), var(--lm-glass-shadow); display: grid; gap: 14px; }
.sbc-mock h2 { margin: 0; font: 700 11px/1 var(--lm-font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--lm-brand-700); }
.sbc-hub { max-width: 360px; }
.sbc-profile { max-width: 560px; }
.sbc-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
.sbc-grid figure { margin: 0; display: grid; gap: 8px; }
.sbc-grid figcaption { font: 700 10px/1.3 var(--lm-font-ui); letter-spacing: .1em; text-transform: uppercase; color: var(--lm-ink-3); text-align: center; }
@media (max-width: 560px) { .sbc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
.sbc-dock { position: fixed; z-index: 900; left: 50%; bottom: max(12px, env(safe-area-inset-bottom)); transform: translateX(-50%);
  width: min(860px, calc(100% - 24px)); box-sizing: border-box; padding: 10px; border-radius: var(--lm-r-lg); display: grid; gap: 8px;
  background: var(--lm-glass); backdrop-filter: var(--lm-glass-blur); box-shadow: var(--lm-glass-highlight), var(--lm-glass-shadow); }
.sbc-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.sbc-label { font: 700 10px/1 var(--lm-font-ui); letter-spacing: .12em; text-transform: uppercase; color: var(--lm-ink-3); min-width: 52px; }
.sbc-btn { appearance: none; border: 0; background: var(--lm-surface); color: var(--lm-ink); font: 600 12px/1 var(--lm-font-ui);
  padding: 8px 12px; border-radius: var(--lm-r-pill); cursor: pointer; min-height: 34px; box-shadow: 0 0 0 1px var(--lm-border), var(--lm-shadow-1); transition: transform var(--lm-dur-fast) var(--lm-ease-spring); }
.sbc-btn:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px var(--lm-glass-border-hi), var(--lm-shadow-2); } .sbc-btn:focus-visible { outline: 2px solid var(--lm-brand-600); outline-offset: 2px; }
.sbc-btn[aria-pressed="true"] { background: var(--lm-brand-50); color: var(--lm-brand-700); box-shadow: 0 0 0 1.5px var(--lm-brand-600); }
.sbc-btn--go { background: var(--lm-accent-gradient); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.4), var(--lm-shadow-2); }
.sbc-meta { margin-left: auto; font: 500 11px var(--lm-font-num); color: var(--lm-ink-3); }
@media (max-width: 560px) { .sbc-label { display: none; } .sbc-btn { padding: 7px 9px; font-size: 11px; } .sbc-meta { margin-left: 0; } }
`;

const GRADE_RATIO: Record<Grade, number> = { S: 0.96, A: 0.85, B: 0.7, C: 0.55, D: 0.4, F: 0.2 };

function fakeScore(kase: ClinicalCase, outcome: Outcome): ScoreBreakdown {
  const miss = outcome === 'miss';
  const grade: Grade = miss ? 'F' : outcome;
  const max = 1300;
  return {
    total: Math.round(max * GRADE_RATIO[grade]), max, grade, perfect: grade === 'S', diagnosisCorrect: !miss, urgencyCorrect: !miss,
    correctDiagnosisId: kase.diagnosis, chosenDiagnosisId: miss ? kase.differentials[0] ?? 'healthy-eyes' : kase.diagnosis,
    parts: [], essentialMissed: [], unnecessaryTests: [], keyQuestionsAsked: 2, keyQuestionsTotal: 3, skillAvg: 0.8, elapsedSec: 90, parSec: 120,
  };
}

function treat(services: GameServices, kase: ClinicalCase, outcome: Outcome) {
  services.session.start(kase, 'sandbox');
  services.bus.emit('case:completed', { caseId: kase.id, modeId: 'sandbox', score: fakeScore(kase, outcome) });
}

const IRISES = ['#5a3a22', '#3b6ea5', '#6b8e4e', '#8a6a3a', '#4a6b8a', '#2e1c12', '#7a8f9c', '#9a7b4f'];

/** Every rarity × frame on real diagnoses, so reviewers can judge the art and foil without grinding. */
function Showcase({ services }: { services: GameServices }) {
  const t = pickStrings(T, services.locale);
  const catalog = orderedDiagnoses(services.registries.diagnoses.all());
  if (!catalog.length) return <p>{t.noDx}</p>;
  const cell = (i: number, rarity: (typeof CARD_RARITIES)[number], tier: (typeof FRAME_TIERS)[number]) => {
    const dx = catalog[(i * 7) % catalog.length]!;
    const at = Date.UTC(2026, 10, 3 + i);
    const acq = { caseId: `showcase-${i}`, patient: ['Grace Okafor', 'Mei-Ling Chen', 'Tomás Herrera', 'Priya Raman'][i % 4]!, irisColor: IRISES[i % IRISES.length]!, grade: 'S' as const, rarity, at, seed: 1000 + i * 7919 };
    const card: OwnedCard = { dx: dx.id, rarity, featured: acq, copies: 1 + FRAME_TIERS.indexOf(tier) * 3, shine: FRAME_THRESHOLDS[tier], bestGrade: 'S', firstAt: at, lastAt: at, history: [acq], seen: true };
    return { dxId: dx.id, dx, card, number: cardNumber(catalog, dx.id), total: catalog.length };
  };
  return (
    <section class="sbc-mock">
      <h2>{t.showcase}</h2>
      <div class="sbc-grid">
        {FRAME_TIERS.flatMap((tier, row) => CARD_RARITIES.map((rarity, col) => (
          <figure key={`${tier}-${rarity}`}>
            <IrisCard view={cell(row * 4 + col, rarity, tier)} size="sm" ribbon={row === 0 && col === 0 ? 'NEW' : undefined} />
            <figcaption>{rarity} · {tier}</figcaption>
          </figure>
        )))}
      </div>
    </section>
  );
}

function CollectionSandbox({ services }: { services: GameServices }) {
  const t = pickStrings(T, services.locale);
  const q = useMemo(() => new URLSearchParams(location.search), []);
  const initialTab = q.get('view');
  const [tab, setTab] = useState<Exclude<View, 'gallery'>>(initialTab === 'hub' || initialTab === 'showcase' ? initialTab : 'reveal');
  const [outcome, setOutcome] = useState<Outcome>((q.get('grade') as Outcome) || 'S');
  const [log, setLog] = useState<string>('');
  const [cursor, setCursor] = useState(0);
  const slot = useMemo(() => services.save.slot<CollectionState>(SAVE_KEY, INITIAL_STATE, { version: SAVE_VERSION }), []);
  const state = useSignal(slot);
  const route = useSignal(services.router.current);
  const cases = services.registries.cases.all();

  useEffect(() => {
    const off = collection.install(services);
    const offs = [
      services.bus.on('reward:granted', (r) => setLog(`${r.label} · ${r.value}`)),
      services.bus.on('toast', (t) => setLog(t.message)),
    ];
    const fill = Number(q.get('fill') ?? 0);
    if (fill > 0 && slot.get().pulls === 0) {
      const outcomes: Outcome[] = ['S', 'A', 'S', 'B', 'A', 'C', 'S'];
      const seen = new Set<string>();
      cases.filter((c) => !seen.has(c.diagnosis) && seen.add(c.diagnosis)).slice(0, fill)
        .forEach((c, i) => treat(services, c, outcomes[i % outcomes.length]!));
      // a few duplicates so frames polish, and a couple of glimpses
      cases.slice(0, Math.min(6, fill)).forEach((c) => treat(services, c, 'S'));
      cases.slice(0, Math.min(3, fill)).forEach((c) => treat(services, c, 'A'));
      cases.slice(-3).forEach((c) => treat(services, c, 'miss'));
      services.session.clear();
    }
    const g = q.get('grade');
    if (g && cases.length) treat(services, cases[(fill + 3) % cases.length]!, g as Outcome);
    if (q.get('view') === 'gallery') services.router.go('gallery');
    return () => {
      offs.forEach((o) => o());
      off();
    };
  }, []);

  const view: View = route.id === 'gallery' ? 'gallery' : tab;

  const next = (o: Outcome = outcome) => {
    if (!cases.length) return setLog(t.noCases);
    const kase = cases[cursor % cases.length]!;
    setCursor((c) => c + 1);
    if (services.router.current.get().id === 'gallery') services.router.replace('sandbox');
    treat(services, kase, o);
  };
  const scene = services.registries.scenes.get('gallery');
  const Scene = scene ? asComponent(scene.component) : null;
  const owned = Object.keys(state.cards).length;

  return (
    <div class="sbc">
      <style>{CSS}</style>
      {view === 'gallery' && Scene ? (
        <Scene services={services} params={{}} />
      ) : (
        <main class="sbc-main">
          <h1>{t.title}</h1>
          <p>{t.blurb}</p>
          {view === 'reveal' && (
            <section class="sbc-mock">
              <h2>{t.results}</h2>
              <HudSlot slot="results-extra" />
            </section>
          )}
          {view === 'showcase' && <Showcase services={services} />}
          {view === 'hub' && (
            <>
              <section class="sbc-mock sbc-hub">
                <h2>{t.hubSlot}</h2>
                <HudSlot slot="hub-sidebar" />
              </section>
              <section class="sbc-mock sbc-profile">
                <h2>{t.profileSlot}</h2>
                <HudSlot slot="profile" />
              </section>
            </>
          )}
        </main>
      )}
      <div class="sbc-dock">
        <div class="sbc-row">
          <span class="sbc-label">{t.view}</span>
          {(['reveal', 'hub', 'gallery', 'showcase'] as View[]).map((v) => (
            <button key={v} type="button" class="sbc-btn" aria-pressed={view === v} data-view={v}
              onClick={() => { if (v === 'gallery') services.router.go('gallery'); else { if (route.id === 'gallery') services.router.replace('sandbox'); setTab(v); } }}>
              {v === 'reveal' ? t.vReveal : v === 'hub' ? t.vHub : v === 'gallery' ? t.vGallery : t.vShowcase}
            </button>
          ))}
          <span class="sbc-meta">{t.meta(owned, state.pulls)}</span>
        </div>
        <div class="sbc-row">
          <span class="sbc-label">{t.grade}</span>
          {(['S', 'A', 'B', 'C', 'miss'] as Outcome[]).map((o) => (
            <button key={o} type="button" class="sbc-btn" aria-pressed={outcome === o} onClick={() => setOutcome(o)}>{o === 'miss' ? t.miss : o}</button>
          ))}
          <button type="button" class="sbc-btn sbc-btn--go" data-act="treat" onClick={() => next()}>{t.treat}</button>
          <button type="button" class="sbc-btn" onClick={() => { for (let i = 0; i < 8; i++) next(i % 3 ? 'A' : 'S'); }}>{t.eight}</button>
          <button type="button" class="sbc-btn" onClick={() => { slot.set(INITIAL_STATE); services.session.clear(); setLog(t.reset); }}>{t.resetBtn}</button>
        </div>
        {log && <div class="sbc-row"><span class="sbc-meta" style={{ marginLeft: 0 }}>{log}</span></div>}
      </div>
    </div>
  );
}

const page: SandboxPage = { id: 'sys-collection', title: 'System · Gallery (iris cards)', component: CollectionSandbox };
export default page;
