import { useEffect, useState } from 'preact/hooks';
import { URGENCIES, type ClinicalCase, type GameServices, type RewardGrant, type Urgency } from '@core';
import { Backdrop, Button, HudSlot, RewardChip, ToastHost, useRegistry, useSignal } from '@ui-kit';
import emergencies from '../../../systems/emergencies';
import { grandRoundsCase, INITIAL_STATS, recordOutcome } from '../../../systems/emergencies/logic';
import { statsSlot } from '../../../systems/emergencies/state';
import type { SandboxPage } from '../Sandbox';

/**
 * Code Red (system 'emergencies') preview:
 *   ?sandbox=page/sys-emergencies
 *   &auto=arrive | short | saved | full | under | over | referred | miss | timeout   run a scenario on load
 *   &dock=0                                                   hide the control dock (clean screenshots)
 *   &case=<id>                                                pick the emergency case
 *   &stats=1                                                  seed a lived-in emergency record
 *   &view=exam | hub | results | profile                      show one slot only
 */
type Auto = 'arrive' | 'short' | 'saved' | 'full' | 'under' | 'over' | 'referred' | 'miss' | 'timeout';
type Kind = 'saved' | 'full' | 'under' | 'over' | 'referred' | 'miss';

const step = (u: Urgency, d: number): Urgency => URGENCIES[Math.max(0, Math.min(URGENCIES.length - 1, URGENCIES.indexOf(u) + d))]!;

function seedStats(services: GameServices, cases: ClinicalCase[]) {
  let s = INITIAL_STATS;
  const em = cases.filter((c) => c.emergency);
  const outcomes = ['saved', 'saved', 'missed', 'saved', 'under-triaged', 'over-triaged', 'saved', 'referred', 'timeout', 'saved'] as const;
  outcomes.forEach((o, i) => {
    const c = em[i % em.length]!;
    s = recordOutcome(s, { caseId: c.id, diagnosisId: c.diagnosis, outcome: o, sec: 38 + i * 9, at: Date.now() - i * 3600_000 });
  });
  statsSlot(services).set({ ...s, grandRoundsTotal: 2 });
}

function Page({ services }: { services: GameServices }) {
  const q = new URLSearchParams(location.search);
  const view = q.get('view');
  const cases = useRegistry(services.registries.cases).filter((c) => c.emergency).sort((a, b) => a.id.localeCompare(b.id));
  const [caseId, setCaseId] = useState<string>('');
  const [rewards, setRewards] = useState<RewardGrant[]>([]);
  const session = useSignal(services.session.state);
  const kase = services.registries.cases.get(caseId) ?? cases[0];

  useEffect(() => {
    const off = emergencies.install(services);
    const offR = services.bus.on('reward:granted', (r) => setRewards((xs) => [...xs.slice(-5), r]));
    return () => {
      offR();
      off();
      services.session.clear();
    };
  }, []);

  const start = (limit?: number, c: ClinicalCase | undefined = kase) => {
    if (!c) return;
    setRewards([]);
    services.session.clear();
    services.session.start(c, 'code-red', limit);
  };
  /** A thorough work-up: every essential test done well and every key history question asked. */
  const workUp = (c: ClinicalCase) => {
    for (const h of c.history) if (h.relevance === 'key') services.session.ask(h.id);
    for (const t of c.essentialTests) services.session.recordTest({ testId: t, accuracy: 0.92, timeMs: 9000, findings: [] });
  };
  const submit = (kind: Kind) => {
    const s = services.session.state.get();
    const c = s && services.registries.cases.get(s.caseId);
    if (!c || s.submitted || s.failed) return;
    const wrong = c.differentials[0] ?? 'healthy-eyes';
    if (kind === 'full') workUp(c);
    if (kind === 'saved' || kind === 'full') services.session.submit(c.diagnosis, c.urgency);
    if (kind === 'under') services.session.submit(c.diagnosis, step(c.urgency, -2));
    if (kind === 'over') services.session.submit(c.diagnosis, c.urgency === 'emergency' ? 'emergency' : step(c.urgency, 1));
    if (kind === 'referred') services.session.submit(wrong, c.urgency);
    if (kind === 'miss') services.session.submit(wrong, 'routine');
  };
  const timeout = () => {
    const s = services.session.state.get();
    if (s && !s.submitted && !s.failed) services.session.fail('timeout');
  };

  // Scripted scenarios for screenshots.
  useEffect(() => {
    if (!cases.length) return;
    if (q.get('stats')) seedStats(services, cases);
    const auto = q.get('auto') as Auto | null;
    if (!auto) return;
    const pick = services.registries.cases.get(q.get('case') ?? '') ?? (auto === 'over' ? cases.find((c) => c.urgency !== 'emergency') : undefined) ?? cases[0];
    if (pick) setCaseId(pick.id);
    start(auto === 'short' ? 12 : undefined, pick);
    const t = setTimeout(() => {
      if (auto === 'timeout') timeout();
      else if (auto !== 'arrive' && auto !== 'short') submit(auto);
    }, auto === 'full' ? 2400 : 900);
    return () => clearTimeout(t);
  }, [cases.length > 0]);

  const featured = grandRoundsCase(services.registries.cases.all(), services.clock.now());
  const show = (v: string) => !view || view === v;

  return (
    <div class="crsb">
      <style>{CSS}</style>
      <Backdrop variant={session && !session.submitted && session.timeLimitSec ? 'emergency' : 'hub'} />
      <ToastHost position="top" />
      <main class="crsb-main">
        <header class="crsb-head">
          <span class="lm-eyebrow">Sandbox · engagement system</span>
          <h1 class="lm-display">Code Red</h1>
        </header>

        {show('exam') && (
          <section class="crsb-exam" aria-label="Exam room preview">
            <div class="crsb-label">exam-overlay</div>
            <div class="crsb-overlay"><HudSlot slot="exam-overlay" /></div>
            <div class="crsb-room">
              {session ? (
                <p>
                  <b>{services.registries.cases.get(session.caseId)?.patient.name}</b> is on the exam chair
                  {session.submitted ? ' — decision made.' : session.failed ? ' — out of time.' : '.'}
                </p>
              ) : (
                <p class="lm-muted">No patient. Choose an emergency below and press “Patient arrives”.</p>
              )}
            </div>
          </section>
        )}

        {show('hub') && (
          <section>
            <div class="crsb-label">hub-banner</div>
            <HudSlot slot="hub-banner" />
          </section>
        )}

        <div class="crsb-two">
          {show('results') && (
            <section>
              <div class="crsb-label">results-extra</div>
              <HudSlot slot="results-extra" />
              {!session?.submitted && !session?.failed && <p class="lm-muted crsb-hint">Resolve a case to see the debrief.</p>}
            </section>
          )}
          {show('profile') && (
            <section>
              <div class="crsb-label">profile</div>
              <HudSlot slot="profile" />
            </section>
          )}
        </div>
      </main>

      <aside class="crsb-dock" aria-label="Sandbox controls" hidden={q.get('dock') === '0'}>
        <div class="crsb-row">
          <select value={kase?.id} onChange={(e) => setCaseId((e.target as HTMLSelectElement).value)} aria-label="Emergency case">
            {cases.map((c) => <option key={c.id} value={c.id}>{c.id} ({c.urgency}, {c.emergency?.timeLimitSec}s)</option>)}
          </select>
        </div>
        <div class="crsb-row">
          <Button size="sm" variant="danger" icon="alert" onClick={() => start()}>Patient arrives</Button>
          <Button size="sm" onClick={() => start(14)}>14 s clock</Button>
          <Button size="sm" icon="crown" onClick={() => start(undefined, featured)}>Grand Rounds</Button>
        </div>
        <div class="crsb-row">
          <Button size="sm" variant="primary" onClick={() => submit('full')}>Full work-up + call</Button>
          <Button size="sm" onClick={() => submit('saved')}>Blind correct guess</Button>
          <Button size="sm" onClick={() => submit('over')}>Over-triage</Button>
          <Button size="sm" onClick={() => submit('under')}>Under-triage</Button>
        </div>
        <div class="crsb-row">
          <Button size="sm" onClick={() => submit('referred')}>Wrong dx, right urgency</Button>
          <Button size="sm" onClick={() => submit('miss')}>Wrong dx, too slow</Button>
          <Button size="sm" onClick={timeout}>Time out</Button>
        </div>
        <div class="crsb-row">
          <Button size="sm" variant="ghost" onClick={() => seedStats(services, cases)}>Seed record</Button>
          <Button size="sm" variant="ghost" onClick={() => statsSlot(services).set(INITIAL_STATS)}>Reset record</Button>
          <Button size="sm" variant="ghost" onClick={() => services.session.clear()}>Clear chair</Button>
        </div>
        {rewards.length > 0 && <div class="crsb-row">{rewards.map((r, i) => <RewardChip key={i} grant={r} index={i} />)}</div>}
      </aside>
    </div>
  );
}

const CSS = `
.crsb { position: absolute; inset: 0; overflow: auto; color: var(--lm-ivory); font-family: var(--lm-font-ui); }
.crsb-main { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 28px 16px 300px; display: grid; gap: 22px; }
.crsb-head h1 { margin: 4px 0 0; font-size: var(--lm-fs-3xl); font-weight: 800; letter-spacing: var(--lm-tracking-display); }
.crsb-label { font: 600 10px/1 var(--lm-font-num); letter-spacing: .14em; text-transform: uppercase; color: var(--lm-muted-2); margin-bottom: 8px; }
.crsb-label span { text-transform: none; letter-spacing: 0; }
.crsb-exam { position: relative; border-radius: 20px; padding: 16px; background: var(--lm-glass); backdrop-filter: var(--lm-glass-blur); box-shadow: var(--lm-glass-highlight), var(--lm-glass-shadow); }
.crsb-overlay { display: flex; justify-content: flex-end; min-height: 96px; margin-bottom: 12px; }
.crsb-room { padding-top: 0; color: var(--lm-ivory-dim); }
.crsb-two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; }
.crsb-hint { font-size: 13px; }
.crsb-dock { position: fixed; z-index: 900; right: 12px; bottom: 12px; width: min(470px, calc(100vw - 24px)); box-sizing: border-box; padding: 10px; border-radius: 22px;
  background: var(--lm-glass); box-shadow: var(--lm-glass-highlight), var(--lm-glass-shadow); backdrop-filter: var(--lm-glass-blur); display: grid; gap: 6px; }
.crsb-dock[hidden] { display: none; }
.crsb-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.crsb-dock select { width: 100%; background: var(--lm-surface); color: var(--lm-ink); border: 1px solid var(--lm-border-strong); border-radius: 10px; padding: 6px; font: 12px var(--lm-font-num); }
@media (max-width: 760px) {
  .crsb-two { grid-template-columns: 1fr; }
  .crsb-overlay { justify-content: flex-start; }
}
`;

const page: SandboxPage = { id: 'sys-emergencies', title: 'System · Code Red', component: Page };
export default page;
