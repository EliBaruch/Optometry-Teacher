import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { beginRun, type ModeModule, type SceneProps } from '@core';
import { Divider, HudSlot, IconButton, Screen, useReducedMotion, useRegistry, useSignal } from '@ui-kit';
import { useNarrow } from './useNarrow';
import { ModeCard, WingTile } from './Cards';
import { DoorTransition } from './DoorTransition';
import { WaitingRoom } from './WaitingRoom';
import { buildWings, byOrder, greetingFor, modeLock, type WingView } from './logic';
import './hub.css';

const DOOR_MS = 760;

export function HubScene({ services }: SceneProps) {
  const reduced = useReducedMotion();
  const narrow = useNarrow(960);
  const settings = useSignal(services.settings);
  const modes = useRegistry(services.registries.modes);
  const entries = useRegistry(services.registries.hub);
  const scenes = useRegistry(services.registries.scenes);
  const hud = useRegistry(services.registries.hud);
  const [door, setDoor] = useState<string | null>(null);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const sceneIds = useMemo(() => new Set(scenes.map((s) => s.id)), [scenes]);
  const sortedModes = useMemo(() => byOrder(modes), [modes]);
  const wings = useMemo(
    () => buildWings(entries, (id) => sceneIds.has(id), { badge: (e) => e.badge?.(services), locked: (e) => e.locked?.(services) }),
    [entries, sceneIds, services],
  );
  const hasBanner = hud.some((w) => w.slot === 'hub-banner');
  const hasSidebar = hud.some((w) => w.slot === 'hub-sidebar');

  const start = (mode: ModeModule, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    services.audio.unlock();
    services.audio.play('door');
    services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'sparks', count: 24, color: mode.accent });
    const go = () => {
      if (!beginRun(services, mode.id)) setDoor(null);
    };
    if (reduced) return go();
    setDoor(mode.accent);
    services.fx.flash(mode.accent, 500);
    timer.current = window.setTimeout(go, DOOR_MS);
  };
  const open = (w: WingView) => services.router.go(w.sceneId, w.params);

  const hour = new Date().getHours();
  const name = settings.playerName || 'Doctor';

  return (
    <Screen
      backdrop="hub" class="hub" contentClass="hub-content"
      left={<button type="button" class="hub-who" onClick={() => services.router.go('profile')} aria-label={`${name}, open profile`} disabled={!sceneIds.has('profile')}>
        <span class="hub-who__dot" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
        <span class="hub-who__name">{name}</span>
      </button>}
      right={sceneIds.has('settings') ? <IconButton icon="settings" label="Settings" onClick={() => services.router.go('settings')} /> : undefined}
    >
      <div class="hub-grid">
        <header class="hub-hero">
          <div class="lm-eyebrow">Lumen · The Eye Clinic</div>
          <h1 class="hub-hero__title">{greetingFor(hour)}, <em>{name}</em></h1>
          <p class="hub-hero__sub">The waiting room is filling up. Who will you see first?</p>
        </header>

        <aside class="hub-room-wrap">
          <WaitingRoom compact={narrow} />
        </aside>

        {hasBanner && <section class="hub-banner" aria-label="Today"><HudSlot slot="hub-banner" /></section>}

        <section class="hub-modes" aria-label="Choose a session">
          {sortedModes.length === 0 && <p class="hub-empty">The clinic is being prepared. Check back in a moment.</p>}
          {sortedModes.map((m, i) => (
            <ModeCard key={m.id} mode={m} index={i} pending={!!door} lockedReason={modeLock(m, (x) => x.locked?.(services))} onStart={start} />
          ))}
        </section>

        {wings.length > 0 && (
          <section class="hub-wings-wrap" aria-label="Clinic wings">
            <Divider label="The clinic wings" />
            <div class="hub-wings">
              {wings.map((w, i) => <WingTile key={w.key} wing={w} index={i + sortedModes.length} onOpen={open} />)}
            </div>
          </section>
        )}

        {hasSidebar && <section class="hub-side" aria-label="At a glance"><HudSlot slot="hub-sidebar" /></section>}
      </div>
      {door && <DoorTransition accent={door} />}
    </Screen>
  );
}
