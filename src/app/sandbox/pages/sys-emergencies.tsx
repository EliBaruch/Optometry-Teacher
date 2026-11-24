import { useEffect, useState } from 'preact/hooks';
import type { ClinicalCase, GameServices, RewardGrant } from '@core';
import { Backdrop, Button, HudSlot, RewardChip, ToastHost, useRegistry, useSignal } from '@ui-kit';
import emergencies from '../../../systems/emergencies';
import { grandRoundsCase, INITIAL_STATS, recordOutcome } from '../../../systems/emergencies/logic';
import { statsSlot } from '../../../systems/emergencies/state';
import type { SandboxPage } from '../Sandbox';

/**
 * Code Red (system 'emergencies') preview:
 *   ?sandbox=page/sys-emergencies
 *   &auto=arrive | short | saved | under | miss | timeout   run a scenario on load
 *   &stats=1                                                  seed a lived-in emergency record
 *   &view=exam | hub | results | profile                      show one slot only
 */
type Auto = 'arrive' | 'short' | 'saved' | 'under' | 'miss' | 'timeout';

function seedStats(services: GameServices, cases: ClinicalCase[]) {
  let s = INITIAL_STATS;
  const em = cases.filter((c) => c.emergency);
  const outcomes = ['saved', 'saved', 'missed', 'saved', 'under-triaged', 'saved', 'saved', 'timeout', 'saved'] as const;
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
  const submit = (kind: 'saved' | 'under' | 'miss') => {
    const s = services.session.state.get();
    const c = s && services.registries.cases.get(s.caseId);
    if (!c || s.submitted || s.failed) return;
    if (kind === 'saved') services.session.submit(c.diagnosis, c.urgency);
    if (kind === 'under') services.session.submit(c.diagnosis, 'soon');
    if (kind === 'miss') services.session.submit(c.differentials[0] ?? 'healthy-eyes', 'routine');
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
    start(auto === 'short' ? 12 : undefined, cases[0]);
    const t = setTimeout(() => {
      if (auto === 'saved') submit('saved');
      if (auto === 'under') submit('under');
      if (auto === 'miss') submit('miss');
      if (auto === 'timeout') timeout();
    }, 900);
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
            <div class="crsb-label">hub-banner {featured && <span>· this week: {featured.id}</span>}</div>
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

      <aside class="crsb-dock" aria-label="Sandbox controls">
        <div class="crsb-row">
          <select value={kase?.id} onChange={(e) => setCaseId((e.target as HTMLSelectElement).value)} aria-label="Emergency case">
            {cases.map((c) => <option key={c.id} value={c.id}>{c.id} ({c.emergency?.timeLimitSec}s)</option>)}
          </select>
        </div>
        <div class="crsb-row">
          <Button size="sm" variant="danger" icon="alert" onClick={() => start()}>Patient arrives</Button>
          <Button size="sm" onClick={() => start(14)}>14 s clock</Button>
          <Button size="sm" icon="crown" onClick={() => start(undefined, featured)}>Grand Rounds</Button>
        </div>
        <div class="crsb-row">
          <Button size="sm" variant="primary" onClick={() => submit('saved')}>Correct call</Button>
          <Button size="sm" onClick={() => submit('under')}>Under-triage</Button>
          <Button size="sm" onClick={() => submit('miss')}>Wrong diagnosis</Button>
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
.crsb-head h1 { margin: 4px 0 0; font-size: var(--lm-fs-3xl); }
.crsb-label { font: 600 10px/1 var(--lm-font-num); letter-spacing: .14em; text-transform: uppercase; color: var(--lm-muted-2); margin-bottom: 8px; }
.crsb-label span { text-transform: none; letter-spacing: 0; }
.crsb-exam { position: relative; min-height: 190px; border-radius: 20px; padding: 16px; background: rgba(6,3,13,.35); box-shadow: inset 0 0 0 1px var(--lm-hairline); }
.crsb-overlay { position: absolute; top: 14px; right: 14px; }
.crsb-room { padding-top: 70px; color: var(--lm-ivory-dim); }
.crsb-two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; }
.crsb-hint { font-size: 13px; }
.crsb-dock { position: fixed; z-index: 900; right: 12px; bottom: 12px; width: min(470px, calc(100vw - 24px)); box-sizing: border-box; padding: 10px; border-radius: 14px;
  background: rgba(10, 6, 20, 0.9); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(10px); display: grid; gap: 6px; }
.crsb-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.crsb-dock select { width: 100%; background: #1a0f2e; color: var(--lm-ivory); border: 1px solid rgba(255,255,255,.18); border-radius: 8px; padding: 6px; font: 12px var(--lm-font-num); }
@media (max-width: 760px) {
  .crsb-two { grid-template-columns: 1fr; }
  .crsb-overlay { left: 14px; right: auto; }
}
`;

const page: SandboxPage = { id: 'sys-emergencies', title: 'System · Code Red', component: Page };
export default page;
