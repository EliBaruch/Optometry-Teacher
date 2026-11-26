import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { beginRun, modeText, type ModeModule, type SceneProps } from '@core';
import { Divider, HudSlot, IconButton, Screen, useReducedMotion, useRegistry, useSignal, useStrings } from '@ui-kit';
import { S } from './strings';
import { useNarrow } from './useNarrow';
import { ModeCard, SoonCard, WingTile } from './Cards';
import { DoorTransition } from './DoorTransition';
import { WaitingRoom } from './WaitingRoom';
import { buildWings, greetingFor, splitModes, type WingView } from './logic';
import './hub.css';

const DOOR_MS = 760;

export function HubScene({ services }: SceneProps) {
  const t = useStrings(S);
  const locale = services.locale;
  const reduced = useReducedMotion();
  const narrow = useNarrow(960);
  const settings = useSignal(services.settings);
  const modes = useRegistry(services.registries.modes);
  const entries = useRegistry(services.registries.hub);
  const scenes = useRegistry(services.registries.scenes);
  const hud = useRegistry(services.registries.hud);
  const [door, setDoor] = useState<string | null>(null);
  const [soonNote, setSoonNote] = useState('');
  const busy = useRef(false);
  const timer = useRef<number>(0);

  const cancel = useCallback(() => {
    if (!busy.current) return;
    window.clearTimeout(timer.current);
    busy.current = false;
    setDoor(null);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && busy.current) { e.preventDefault(); cancel(); } };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.clearTimeout(timer.current); busy.current = false; };
  }, [cancel]);

  const sceneIds = useMemo(() => new Set(scenes.map((s) => s.id)), [scenes]);
  const { playable, soon } = useMemo(() => splitModes(modes, (m) => m.locked?.(services)), [modes, services]);
  const wings = useMemo(
    () => buildWings(entries, (id) => sceneIds.has(id), { badge: (e) => e.badge?.(services), locked: (e) => e.locked?.(services) }, locale),
    [entries, sceneIds, services, locale],
  );
  const hasBanner = hud.some((w) => w.slot === 'hub-banner');
  const hasSidebar = hud.some((w) => w.slot === 'hub-sidebar');

  const start = (mode: ModeModule, el: HTMLElement) => {
    if (busy.current) return;
    busy.current = true;
    const r = el.getBoundingClientRect();
    services.audio.unlock();
    services.audio.play('door');
    services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'sparks', count: 24, color: mode.accent });
    const go = () => {
      const ok = beginRun(services, mode.id);
      busy.current = false;
      if (!ok) setDoor(null);
    };
    if (reduced) return go();
    setDoor(mode.accent);
    services.fx.flash(mode.accent, 500);
    timer.current = window.setTimeout(go, DOOR_MS);
  };
  const open = (w: WingView) => services.router.go(w.sceneId, w.params);

  const name = (settings.playerName && settings.playerName !== 'Doctor' ? settings.playerName : t.doctor);
  const none = modes.length === 0;

  return (
    <Screen
      backdrop="hub" class="hub" contentClass="hub-content"
      left={<button type="button" class="hub-who" onClick={() => services.router.go('profile')} aria-label={t.openProfile(name)} disabled={!sceneIds.has('profile')}>
        <span class="hub-who__dot" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
        <span class="hub-who__name">{name}</span>
      </button>}
      right={sceneIds.has('settings') ? <IconButton icon="settings" label={t.settings} onClick={() => services.router.go('settings')} /> : undefined}
    >
      <div class="hub-grid">
        <header class="hub-hero">
          <div class="lm-eyebrow">{t.eyebrow}</div>
          <h1 class="hub-hero__title">{greetingFor(new Date().getHours(), locale)}, <span class="hub-hero__name">{name}</span></h1>
          <p class="hub-hero__sub">{t.sub}</p>
        </header>

        <section class="hub-modes" aria-label={t.chooseSession}>
          {none && <p class="hub-empty">{t.preparing}</p>}
          {playable.map((m, i) => <ModeCard key={m.id} mode={m} index={i} pending={!!door} onStart={start} />)}
        </section>

        {soon.length > 0 && (
          <section class="hub-soon-wrap" aria-label={t.comingUp}>
            <div class="hub-soon-head lm-eyebrow">{t.comingUp}</div>
            <div class="hub-soon-list">
              {soon.map((s) => <SoonCard key={s.mode.id} mode={s.mode} reason={s.reason} onDenied={(m, r) => setSoonNote(`${modeText(m, locale).title}: ${r}`)} />)}
            </div>
            <p class="hub-soon-note" role="status" aria-live="polite">{soonNote}</p>
          </section>
        )}

        {wings.length > 0 && (
          <section class="hub-wings-wrap" aria-label={t.wingsLabel}>
            <Divider label={t.wingsHeading} />
            <div class="hub-wings">
              {wings.map((w, i) => <WingTile key={w.key} wing={w} index={i + playable.length} onOpen={open} />)}
            </div>
          </section>
        )}

        {hasBanner && <section class="hub-banner" aria-label={t.today}><HudSlot slot="hub-banner" /></section>}

        <div class="hub-aside">
          <WaitingRoom compact={narrow} />
          {hasSidebar && <section class="hub-side" aria-label={t.glance}><HudSlot slot="hub-sidebar" /></section>}
        </div>
      </div>
      {door && <DoorTransition accent={door} onCancel={cancel} />}
    </Screen>
  );
}
