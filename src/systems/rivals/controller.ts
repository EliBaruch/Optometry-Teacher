/**
 * Binds the pure league logic to the game: persisted slot, bus listeners, rewards, toasts and juice.
 * UI components reach the controller through `rivalsFor(services)`.
 */
import type { GameServices, Signal } from '@core';
import {
  PLAYER_ID, STATE_VERSION, applyCase, checkSlipped, initialState, playerRank, rollWeek, standings, weekReward,
  type RivalsState, type Standing,
} from './league';
import { RIVAL_BY_ID, ROSTER, type Rival } from './roster';
import { humanizeId, simulateRival, simulateRivalGeneric, type RivalCaseResult } from './sim';

export const SYSTEM_ID = 'rivals';
export const ACCENT = '#4ade80';
export const SLOT = `sys:${SYSTEM_ID}`;

export interface RivalsController {
  state: Signal<RivalsState>;
  now(): number;
  standings(at?: number): Standing[];
  rank(at?: number): number;
  rival(id: string): Rival | undefined;
  /** How every colleague did on a case (deterministic). */
  simulate(caseId: string): RivalCaseResult[];
  diagnosisName(id: string): string;
}

const controllers = new WeakMap<GameServices, RivalsController>();

export function createController(services: GameServices): RivalsController {
  const now = () => services.clock.now();
  const state = services.save.slot<RivalsState>(SLOT, initialState(now()), { version: STATE_VERSION });
  const diagnosisName = (id: string) => services.registries.diagnoses.get(id)?.name ?? humanizeId(id);
  const ctl: RivalsController = {
    state,
    now,
    standings: (at = now()) => standings(state.get(), at),
    rank: (at = now()) => playerRank(standings(state.get(), at)),
    rival: (id) => RIVAL_BY_ID[id as Rival['id']],
    diagnosisName,
    simulate(caseId) {
      const kase = services.registries.cases.get(caseId);
      return ROSTER.map((r) => (kase ? simulateRival(r, kase, { diagnosisName }) : simulateRivalGeneric(r, caseId)));
    },
  };
  return ctl;
}

/** The controller for these services (created on demand so widgets also work in isolation). */
export function rivalsFor(services: GameServices): RivalsController {
  let c = controllers.get(services);
  if (!c) {
    c = createController(services);
    controllers.set(services, c);
  }
  return c;
}

function screenCenter(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: Math.min(window.innerHeight * 0.32, 260) };
}

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    /* juice must never break the game */
  }
}

/** Wire the system into the game. Returns an uninstall that removes every listener and timer. */
export function bindRivals(services: GameServices): () => void {
  const ctl = rivalsFor(services);
  const { bus } = services;
  const offs: (() => void)[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };

  const unlock = (id: string, title: string, description: string, icon: string) => {
    const s = ctl.state.get();
    if (s.achievements.includes(id)) return;
    ctl.state.set({ ...s, achievements: [...s.achievements, id] });
    bus.emit('achievement:unlocked', { id: `rivals:${id}`, title, description, icon, system: SYSTEM_ID });
  };

  /** Close a finished week and, once, tell the player how it went. */
  const settleWeek = () => {
    const rolled = rollWeek(ctl.state.get(), ctl.now());
    if (rolled !== ctl.state.get()) ctl.state.set(rolled);
    const lw = ctl.state.get().lastWeek;
    if (!lw || lw.delivered) return;
    ctl.state.set({ ...ctl.state.get(), lastWeek: { ...lw, delivered: true } });
    const coins = weekReward(lw);
    const top = lw.rank === 1;
    bus.emit('toast', {
      message: top
        ? `Last week's board is closed — you finished top of ${lw.field}. A fresh week begins.`
        : lw.rank <= 3
          ? `Last week's board is closed — you finished #${lw.rank} of ${lw.field}. A fresh week begins.`
          : `Last week's board is closed — ${lw.cases} patients and ${lw.points.toLocaleString('en')} pts of good work. A fresh week begins.`,
      icon: top ? 'crown' : 'users',
      tone: top ? 'epic' : 'good',
    });
    if (coins > 0) bus.emit('currency:grant', { amount: coins, reason: 'Weekly colleagues board' });
    if (top) unlock('top-week', 'Top of the Board', 'Finish a week at the top of the colleagues board.', 'crown');
  };

  const nudge = () => {
    const r = checkSlipped(ctl.state.get(), ctl.now());
    if (r.state !== ctl.state.get()) ctl.state.set(r.state);
    if (r.passedBy?.rival && r.gap !== undefined) {
      const gap = Math.max(1, r.gap);
      bus.emit('toast', {
        message: `${r.passedBy.rival.short} edged ahead by ${gap} pts — one sharp work-up closes that gap.`,
        icon: 'users',
        tone: 'info',
      });
    }
  };

  offs.push(
    bus.on('case:completed', ({ caseId, score }) => {
      const rivals = ctl.simulate(caseId);
      const res = applyCase(ctl.state.get(), ctl.now(), caseId, score, rivals);
      ctl.state.set(res.state);
      const rank = playerRank(res.after);

      bus.emit('reward:granted', {
        source: SYSTEM_ID,
        label: 'Colleagues board',
        value: `+${res.points}`,
        icon: 'users',
        color: ACCENT,
        rarity: res.points >= 140 ? 'rare' : 'common',
      });

      if (res.bestOnCase) {
        bus.emit('reward:granted', { source: SYSTEM_ID, label: 'Best work-up on the ward', value: '1st', icon: 'star', color: ACCENT, rarity: 'rare' });
        unlock('best-on-case', 'Best on the Ward', 'Out-score every colleague on the same patient.', 'star');
      }

      if (res.passed.length) {
        const lead = res.passed[0]!;
        const names = res.passed.map((r) => r.short);
        const label = names.length === 1 ? `Passed ${names[0]}` : `Passed ${names.length} colleagues`;
        bus.emit('reward:granted', {
          source: SYSTEM_ID,
          label,
          value: `#${rank}`,
          icon: rank === 1 ? 'crown' : 'trophy',
          color: rank === 1 ? '#ffd27a' : ACCENT,
          rarity: rank === 1 ? 'epic' : 'rare',
        });
        unlock('first-pass', 'Fresh Competition', 'Overtake a colleague on the weekly board.', 'trophy');
        later(() => {
          bus.emit('toast', {
            message: rank === 1 ? `You passed ${lead.short} — top of the board!` : `You passed ${names.length === 1 ? lead.short : names.join(' and ')}! Now #${rank}.`,
            icon: rank === 1 ? 'crown' : 'trophy',
            tone: rank === 1 ? 'epic' : 'good',
          });
          safe(() => {
            const { x, y } = screenCenter();
            services.fx.burst(x, y, { kind: rank === 1 ? 'confetti' : 'sparks', count: rank === 1 ? 60 : 32, color: rank === 1 ? '#ffd27a' : lead.color });
            services.audio.play(rank === 1 ? 'legendary' : 'rare', { volume: 0.7 });
          });
        }, 900);
      }
    }),
  );

  offs.push(bus.on('app:ready', () => later(() => {
    settleWeek();
    nudge();
  }, 1200)));
  offs.push(
    bus.on('scene:changed', ({ id }) => {
      settleWeek();
      if (id === 'hub' || id === SYSTEM_ID) later(nudge, 900);
    }),
  );
  offs.push(bus.on('case:started', () => settleWeek()));

  // Close a stale week straight away (silently; the toast waits for the first scene).
  const rolled = rollWeek(ctl.state.get(), ctl.now());
  if (rolled !== ctl.state.get()) ctl.state.set(rolled);

  return () => {
    offs.forEach((o) => o());
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  };
}

export { PLAYER_ID };
