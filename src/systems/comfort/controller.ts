import { dayKey, type GameServices, type Signal } from '@core';
import {
  INITIAL, SLOT, SLOT_VERSION, arrive, claimGift, collect, dismissWelcome, recordCase, sanitize,
  type ComfortState, type GiftResult,
} from './logic';
import { planResume, runPlan, type ResumePlan } from './resume';

export const SYSTEM_ID = 'comfort';
export const ACCENT = '#38bdf8';
/** Heartbeat interval: how often "last seen" is refreshed while the game is visible. */
export const HEARTBEAT_MS = 60_000;

declare module '@core/events' {
  interface GameEvents {
    /** The Lounge's daily gift was opened (informational; coins are paid via currency:grant). */
    'comfort:gift-opened': { day: number; coins: number; satchel: 'common' | 'rare' | 'epic' | 'legendary' | null };
  }
}

export interface ComfortController {
  services: GameServices;
  state: Signal<ComfortState>;
  /** Re-evaluate an absence (boot, tab shown again). */
  checkReturn(): void;
  /** Mark the player as present now. */
  beat(): void;
  openGift(): GiftResult | null;
  /** Pay out the jar (+ comeback bonus). Returns the coins paid. */
  collectEarnings(): number;
  dismissWelcome(): void;
  setQuiet(on: boolean): void;
  plan(): ResumePlan | null;
  resume(): boolean;
}

const controllers = new WeakMap<GameServices, ComfortController>();

/** The installed Lounge controller for these services (null when the system is not installed). */
export function comfortOf(services: GameServices): ComfortController | null {
  return controllers.get(services) ?? null;
}

export function createController(services: GameServices): ComfortController {
  const state = services.save.slot<ComfortState>(SLOT, INITIAL, {
    version: SLOT_VERSION,
    migrate: (old) => sanitize(old as Partial<ComfortState>),
  });
  state.set(sanitize(state.get()));
  const rng = services.rng.fork('lounge');
  const now = () => services.clock.now();
  const { bus } = services;

  const ctl: ComfortController = {
    services,
    state,
    checkReturn() {
      const before = state.get().welcome;
      state.set(arrive(state.get(), now()));
      const after = state.get().welcome;
      if (after && after !== before) {
        try {
          services.audio.play('sparkle', { volume: 0.5 });
        } catch {
          /* audio never breaks the clinic */
        }
      }
    },
    beat() {
      state.update((s) => ({ ...s, lastSeenAt: now() }));
    },
    openGift() {
      const out = claimGift(state.get(), now(), rng.next());
      if (!out) return null;
      state.set(out.state);
      const { result } = out;
      bus.emit('currency:grant', { amount: result.total, reason: `Lounge gift · day ${result.day.day}` });
      bus.emit('reward:granted', {
        source: SYSTEM_ID,
        label: `Daily gift · day ${result.day.day}`,
        value: `+${result.coins}`,
        icon: 'gift',
        color: ACCENT,
        rarity: result.day.day === 7 ? 'rare' : 'common',
      });
      if (result.satchel) {
        bus.emit('reward:granted', {
          source: SYSTEM_ID,
          label: `${result.day.label} (${result.satchel.rarity})`,
          value: `+${result.satchel.coins}`,
          icon: 'crate',
          color: ACCENT,
          rarity: result.satchel.rarity,
        });
      }
      bus.emit('comfort:gift-opened', { day: result.day.day, coins: result.total, satchel: result.satchel?.rarity ?? null });
      if (result.day.day === 7) {
        bus.emit('achievement:unlocked', {
          id: `lounge-week-${state.get().gift.totalClaims}`,
          title: 'A Week of Evenings',
          description: 'Opened all seven gifts on the Lounge calendar.',
          icon: 'gift',
          system: SYSTEM_ID,
        });
      }
      return result;
    },
    collectEarnings() {
      const out = collect(state.get());
      state.set(out.state);
      const paid = out.coins + out.comeback;
      if (out.coins > 0) {
        bus.emit('currency:grant', { amount: out.coins, reason: 'Clinic earnings while away' });
        bus.emit('reward:granted', { source: SYSTEM_ID, label: 'Clinic earnings', value: `+${out.coins}`, icon: 'coin', color: ACCENT, rarity: 'common' });
      }
      if (out.comeback > 0) {
        bus.emit('currency:grant', { amount: out.comeback, reason: 'Welcome back bonus' });
        bus.emit('reward:granted', { source: SYSTEM_ID, label: 'Welcome back bonus', value: `+${out.comeback}`, icon: 'heart', color: ACCENT, rarity: 'rare' });
      }
      return paid;
    },
    dismissWelcome() {
      state.set(dismissWelcome(state.get()));
    },
    setQuiet(on) {
      state.update((s) => ({ ...s, quiet: on }));
    },
    plan() {
      return planResume(services, state.get().dailyDoneDay);
    },
    resume() {
      const p = ctl.plan();
      if (!p) return false;
      try {
        return runPlan(services, p);
      } catch (err) {
        console.error('[lounge] could not resume', err);
        return false;
      }
    },
  };

  return ctl;
}

/** Wire the controller to the bus and the page lifecycle. Returns the teardown. */
export function attach(ctl: ComfortController): () => void {
  const { services, state } = ctl;
  const { bus } = services;
  const now = () => services.clock.now();
  const offs: (() => void)[] = [];

  offs.push(
    bus.on('case:completed', ({ score }) => {
      state.set(recordCase(state.get(), score.total, score.max, now()));
    }),
    bus.on('mode:ended', ({ modeId, casesCompleted }) => {
      if (modeId === 'daily' && casesCompleted > 0) state.update((s) => ({ ...s, dailyDoneDay: dayKey(now()) }));
    }),
  );

  ctl.checkReturn();

  const hasDoc = typeof document !== 'undefined';
  const visible = () => !hasDoc || !document.hidden;
  // checkReturn doubles as the heartbeat: a short gap just refreshes "last seen",
  // a long one (laptop lid closed with the game open) counts as time away.
  const timer = setInterval(() => {
    if (visible()) ctl.checkReturn();
  }, HEARTBEAT_MS);
  offs.push(() => clearInterval(timer));

  if (hasDoc && typeof window !== 'undefined') {
    const onVis = () => {
      if (document.hidden) ctl.beat();
      else ctl.checkReturn();
    };
    const onHide = () => ctl.beat();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    offs.push(() => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
    });
  }

  return () => {
    for (const off of offs.splice(0)) off();
  };
}

export function register(ctl: ComfortController) {
  controllers.set(ctl.services, ctl);
}
export function unregister(ctl: ComfortController) {
  if (controllers.get(ctl.services) === ctl) controllers.delete(ctl.services);
}
