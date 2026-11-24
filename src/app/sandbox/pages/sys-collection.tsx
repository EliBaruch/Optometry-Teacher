import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ClinicalCase, GameServices, Grade, ScoreBreakdown } from '@core';
import { HudSlot, asComponent, useSignal } from '@ui-kit';
import collection from '../../../systems/collection';
import { INITIAL_STATE, type CollectionState } from '../../../systems/collection/model';
import { SAVE_KEY, SAVE_VERSION } from '../../../systems/collection/store';
import type { SandboxPage } from '../Sandbox';

/**
 * Gallery (collection) sandbox. Query params for screenshots:
 *   &view=reveal|hub|gallery   &fill=<n> (pre-collect n cards)   &grade=S|A|B|C|miss (auto-treat one patient)
 */
type View = 'reveal' | 'hub' | 'gallery';
type Outcome = Grade | 'miss';

const CSS = `
.sbc { position: fixed; inset: 0; overflow: auto; color: #f6efe4; font-family: var(--lm-font-ui);
  background: radial-gradient(120% 80% at 50% 0%, #2a1748 0%, #1a0f2e 45%, #0b0716 100%); }
.sbc-main { max-width: 860px; margin: 0 auto; padding: 24px 16px 200px; display: grid; gap: 18px; }
.sbc-main h1 { margin: 0; font-family: var(--lm-font-display); font-weight: 520; font-size: 30px; color: #ffd27a; }
.sbc-main p { margin: 0; color: #a99bbd; font-size: 13px; }
.sbc-mock { padding: 18px; border-radius: 22px; background: #ffffff08; box-shadow: inset 0 0 0 1px #ffffff14; display: grid; gap: 14px; }
.sbc-mock h2 { margin: 0; font: 600 11px/1 var(--lm-font-ui); letter-spacing: .16em; text-transform: uppercase; color: #a99bbd; }
.sbc-hub { max-width: 360px; }
.sbc-dock { position: fixed; z-index: 900; left: 50%; bottom: max(12px, env(safe-area-inset-bottom)); transform: translateX(-50%);
  width: min(860px, calc(100% - 24px)); box-sizing: border-box; padding: 10px; border-radius: 18px; display: grid; gap: 8px;
  background: linear-gradient(180deg, #2a1846ee, #140c26f2); box-shadow: 0 20px 60px #0009, inset 0 0 0 1px #ffd27a33; backdrop-filter: blur(12px); }
.sbc-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.sbc-label { font: 700 10px/1 var(--lm-font-ui); letter-spacing: .14em; text-transform: uppercase; color: #a99bbd; min-width: 52px; }
.sbc-btn { appearance: none; border: 1px solid #ffffff22; background: #ffffff0d; color: #f6efe4; font: 600 12px/1 var(--lm-font-ui);
  padding: 8px 11px; border-radius: 10px; cursor: pointer; min-height: 34px; }
.sbc-btn:hover { border-color: #ffd27a88; } .sbc-btn:focus-visible { outline: 2px solid #ffd27a; outline-offset: 2px; }
.sbc-btn[aria-pressed="true"] { background: #ffd27a2e; border-color: #ffd27a; }
.sbc-btn--go { background: linear-gradient(180deg, #ffd27a, #f5b942); color: #2a1a05; border-color: #ffd27a; }
.sbc-meta { margin-left: auto; font: 500 11px var(--lm-font-num); color: #a99bbd; }
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

function CollectionSandbox({ services }: { services: GameServices }) {
  const q = useMemo(() => new URLSearchParams(location.search), []);
  const [tab, setTab] = useState<Exclude<View, 'gallery'>>(q.get('view') === 'hub' ? 'hub' : 'reveal');
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
    if (!cases.length) return setLog('No cases registered.');
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
          <h1>Gallery · iris cards</h1>
          <p>Treat a synthetic patient with a chosen grade; the results-extra widget opens the card sleeve. Cards persist in this browser.</p>
          {view === 'reveal' && (
            <section class="sbc-mock">
              <h2>Results screen · results-extra slot</h2>
              <HudSlot slot="results-extra" />
            </section>
          )}
          {view === 'hub' && (
            <section class="sbc-mock sbc-hub">
              <h2>Hub · hub-sidebar slot</h2>
              <HudSlot slot="hub-sidebar" />
            </section>
          )}
        </main>
      )}
      <div class="sbc-dock">
        <div class="sbc-row">
          <span class="sbc-label">View</span>
          {(['reveal', 'hub', 'gallery'] as View[]).map((v) => (
            <button key={v} type="button" class="sbc-btn" aria-pressed={view === v} data-view={v}
              onClick={() => { if (v === 'gallery') services.router.go('gallery'); else { if (route.id === 'gallery') services.router.replace('sandbox'); setTab(v); } }}>
              {v === 'reveal' ? 'Results reveal' : v === 'hub' ? 'Hub sidebar' : 'Gallery scene'}
            </button>
          ))}
          <span class="sbc-meta">{owned} cards · {state.pulls} pulls</span>
        </div>
        <div class="sbc-row">
          <span class="sbc-label">Grade</span>
          {(['S', 'A', 'B', 'C', 'miss'] as Outcome[]).map((o) => (
            <button key={o} type="button" class="sbc-btn" aria-pressed={outcome === o} onClick={() => setOutcome(o)}>{o === 'miss' ? 'Missed dx' : o}</button>
          ))}
          <button type="button" class="sbc-btn sbc-btn--go" data-act="treat" onClick={() => next()}>Treat next patient</button>
          <button type="button" class="sbc-btn" onClick={() => { for (let i = 0; i < 8; i++) next(i % 3 ? 'A' : 'S'); }}>+8 patients</button>
          <button type="button" class="sbc-btn" onClick={() => { slot.set(INITIAL_STATE); services.session.clear(); setLog('Collection reset'); }}>Reset</button>
        </div>
        {log && <div class="sbc-row"><span class="sbc-meta" style={{ marginLeft: 0 }}>{log}</span></div>}
      </div>
    </div>
  );
}

const page: SandboxPage = { id: 'sys-collection', title: 'System · Gallery (iris cards)', component: CollectionSandbox };
export default page;
