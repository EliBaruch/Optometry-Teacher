import { useEffect, useState } from 'preact/hooks';
import { beginRun, type GameServices, type ModeModule, type RewardGrant, type ScoreBreakdown } from '@core';
import { Button, HudSlot, RewardChip, Screen, useSignal } from '@ui-kit';
import comfort, { comfortOf } from '../../../systems/comfort';
import { LoungeScene } from '../../../systems/comfort/ui/LoungeScene';
import { INITIAL, SLOT } from '../../../systems/comfort/logic';
import type { SandboxPage } from '../Sandbox';

/**
 * Lounge (system 'comfort') preview:
 *   ?sandbox=page/sys-comfort            hub banner + controls
 *   ?sandbox=page/sys-comfort&view=scene the lounge scene
 *   ?sandbox=page/sys-comfort&view=other a plain screen (welcome note via the top-bar host)
 *   &away=9h | 4d                        simulate an absence on load (welcome back modal)
 */
const MODE_LOADERS = import.meta.glob<{ default: ModeModule }>('../../../modes/*/index.ts');
const H = 3_600_000;

function fakeScore(grade: 'S' | 'B' | 'F'): ScoreBreakdown {
  const total = grade === 'S' ? 1240 : grade === 'B' ? 880 : 260;
  return {
    total, max: 1300, grade, perfect: grade === 'S', diagnosisCorrect: grade !== 'F', urgencyCorrect: grade !== 'F',
    correctDiagnosisId: 'acute-angle-closure', chosenDiagnosisId: grade === 'F' ? 'viral-conjunctivitis' : 'acute-angle-closure',
    parts: [], essentialMissed: [], unnecessaryTests: [], keyQuestionsAsked: 3, keyQuestionsTotal: 4, skillAvg: 0.8, elapsedSec: 140, parSec: 150,
  };
}

function parseAway(v: string | null): number {
  const m = v && /^(\d+(?:\.\d+)?)([hdm])$/.exec(v);
  if (!m) return 0;
  return Number(m[1]) * (m[2] === 'd' ? 24 * H : m[2] === 'h' ? H : 60_000);
}

function Page({ services }: { services: GameServices }) {
  const q = new URLSearchParams(location.search);
  const [view, setView] = useState(() => {
    const v = q.get('view');
    return v === 'scene' || v === 'other' ? v : 'banner';
  });
  const [ready, setReady] = useState(false);
  const [rewards, setRewards] = useState<RewardGrant[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const route = useSignal(services.router.current);

  useEffect(() => {
    const offs = [
      services.bus.on('reward:granted', (r) => setRewards((xs) => [...xs.slice(-7), r])),
      services.bus.on('currency:grant', (e) => setLog((l) => [...l.slice(-5), `currency:grant +${e.amount} (${e.reason})`])),
      services.bus.on('achievement:unlocked', (e) => setLog((l) => [...l.slice(-5), `achievement: ${e.title}`])),
    ];
    let alive = true;
    void Promise.allSettled(Object.values(MODE_LOADERS).map((l) => l())).then((res) => {
      if (!alive) return;
      for (const r of res) if (r.status === 'fulfilled' && r.value.default && !services.registries.modes.has(r.value.default.id)) services.registries.modes.register(r.value.default);
      const away = parseAway(q.get('away'));
      if (away) {
        const slot = services.save.slot<{ lastSeenAt: number | null }>(SLOT, { lastSeenAt: null });
        slot.set({ ...slot.get(), lastSeenAt: services.clock.now() - away });
      }
      const off = comfort.install(services);
      offs.push(off);
      setReady(true);
    });
    return () => {
      alive = false;
      offs.forEach((o) => o());
    };
  }, []);

  if (!ready) return <p style={{ padding: 24 }}>Lighting the lamps…</p>;
  const ctl = comfortOf(services)!;

  const away = (ms: number) => {
    ctl.state.update((s) => ({ ...s, lastSeenAt: services.clock.now() - ms }));
    ctl.checkReturn();
  };
  const tomorrow = () => ctl.state.update((s) => ({ ...s, gift: { ...s.gift, lastClaimDay: '2000-01-01' } }));
  const reset = () => {
    // back to a brand-new player (jar, kept gift, calendar, notes, lifetime) — only the clock anchor and quiet toggle stay
    const cur = ctl.state.get();
    ctl.state.set({ ...INITIAL, lastSeenAt: services.clock.now(), quiet: cur.quiet });
    setRewards([]);
  };
  const complete = (g: 'S' | 'B' | 'F') => services.bus.emit('case:completed', { caseId: 'sandbox', modeId: 'shift', score: fakeScore(g) });

  const controls = (
    <details class="cfsb-dock" open={q.get('dock') !== '0'}>
      <summary>Lounge sandbox</summary>
      <div class="cfsb-row">
        <Button size="sm" variant={view === 'banner' ? 'primary' : 'glass'} onClick={() => setView('banner')}>Hub banner</Button>
        <Button size="sm" variant={view === 'scene' ? 'primary' : 'glass'} onClick={() => setView('scene')}>Lounge scene</Button>
        <Button size="sm" variant={view === 'other' ? 'primary' : 'glass'} onClick={() => setView('other')}>Other screen</Button>
      </div>
      <div class="cfsb-row">
        <span>Away:</span>
        <Button size="sm" onClick={() => away(10 * 60_000)}>10m</Button>
        <Button size="sm" onClick={() => away(3 * H)}>3h</Button>
        <Button size="sm" onClick={() => away(11 * H)}>11h</Button>
        <Button size="sm" onClick={() => away(4 * 24 * H)}>4 days</Button>
      </div>
      <div class="cfsb-row">
        <span>Case:</span>
        <Button size="sm" onClick={() => complete('S')}>S</Button>
        <Button size="sm" onClick={() => complete('B')}>B</Button>
        <Button size="sm" onClick={() => complete('F')}>F</Button>
        <Button size="sm" onClick={tomorrow}>Next day</Button>
        <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
        <Button size="sm" variant="ghost" onClick={() => beginRun(services, 'shift')}>beginRun(shift)</Button>
      </div>
      <div class="cfsb-meta">
        route: <code>{route.id}</code> {JSON.stringify(route.params).slice(0, 60)}
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <div class="cfsb-rewards">{rewards.map((r, i) => <RewardChip key={i} grant={r} index={i} />)}</div>
    </details>
  );

  return (
    <div class="cfsb">
      <style>{CSS}</style>
      {view === 'scene' ? (
        <LoungeScene services={services} params={{}} />
      ) : view === 'other' ? (
        <Screen eyebrow="Any other screen" title="Stand-in scene" backdrop="calm">
          <p style={{ padding: 24, color: 'var(--lm-muted)' }}>No hub banner here: the welcome note is hosted by the invisible top-bar widget.</p>
        </Screen>
      ) : (
        <div class="cfsb-hub">
          <h1 class="cfsb-h">Hub preview · <span>hub-banner slot</span></h1>
          <HudSlot slot="hub-banner" />
        </div>
      )}
      {controls}
    </div>
  );
}

const CSS = `
.cfsb-hub { max-width: 1100px; margin: 0 auto; padding: 32px 16px 280px; display: flex; flex-direction: column; gap: 18px; }
.cfsb-h { font-size: 22px; color: var(--lm-ivory); } .cfsb-h span { color: var(--lm-muted); font-size: 14px; }
.cfsb-dock { position: fixed; z-index: 900; right: 12px; bottom: 12px; width: min(460px, calc(100vw - 24px)); padding: 10px; border-radius: 14px;
  background: rgba(10, 6, 20, 0.88); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(10px); display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--lm-muted); }
.cfsb-dock summary { cursor: pointer; color: var(--lm-ivory); font-weight: 600; }
.cfsb-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.cfsb-meta { font-family: var(--lm-font-num); font-size: 11px; max-height: 70px; overflow: auto; }
.cfsb-rewards { display: flex; flex-wrap: wrap; gap: 4px; }
`;

const page: SandboxPage = { id: 'sys-comfort', title: 'System · Lounge', component: Page };
export default page;
