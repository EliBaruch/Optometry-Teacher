/**
 * Binds the pure league logic to the game: persisted slot, bus listeners, rewards, toasts and juice.
 * UI components reach the controller through `rivalsFor(services)`.
 */
import { type GameServices, type Signal } from '@core';
import {
  PLAYER_ID, STATE_VERSION, applyCase, checkSlipped, initialState, playerRank, rollWeek, standings, startRun, weekReward,
  type RivalsState, type Standing,
} from './league';
import { isoWeekStart } from './week';
import { RIVAL_BY_ID, ROSTER, type Rival } from './roster';
import { rivalText, text } from './strings';
import { humanizeId, simulateRival, simulateRivalGeneric, type RivalCaseResult } from './sim';

export const SYSTEM_ID = 'rivals';
export const ACCENT = '#4ade80';
export const SLOT = `sys:${SYSTEM_ID}`;

export interface RivalsController {
  state: Signal<RivalsState>;
  /** The game clock, never earlier than the start of the stored week (a clock moved back can't rewind the board). */
  now(): number;
  /** The state as it should be displayed at `at`: a finished week already reads as rolled. */
  view(at?: number): RivalsState;
  standings(at?: number): Standing[];
  rank(at?: number): number;
  rival(id: string): Rival | undefined;
  /** How every colleague did on a case (deterministic). */
  simulate(caseId: string): RivalCaseResult[];
  /** Share of the registered cases this colleague diagnoses correctly (their profile figure). */
  accuracy(id: Rival['id']): number;
  diagnosisName(id: string): string;
}

const controllers = new WeakMap<GameServices, RivalsController>();

export function createController(services: GameServices): RivalsController {
  const clock = () => services.clock.now();
  const state = services.save.slot<RivalsState>(SLOT, initialState(clock()), { version: STATE_VERSION });
  const now = () => Math.max(clock(), isoWeekStart(state.get().weekKey));
  const view = (at = now()) => rollWeek(state.get(), at);
  const diagnosisName = (id: string) => services.registries.diagnoses.get(id)?.name ?? humanizeId(id);
  let accCache: { n: number; byId: Map<string, number> } | null = null;
  const ctl: RivalsController = {
    state,
    now,
    view,
    standings: (at = now()) => standings(view(at), at),
    rank: (at = now()) => playerRank(standings(view(at), at)),
    rival: (id) => RIVAL_BY_ID[id as Rival['id']],
    diagnosisName,
    simulate(caseId) {
      const kase = services.registries.cases.get(caseId);
      const diagnosis = (id: string) => services.registries.diagnoses.get(id);
      return ROSTER.map((r) => (kase ? simulateRival(r, kase, { diagnosisName, diagnosis, locale: services.locale }) : simulateRivalGeneric(r, caseId)));
    },
    accuracy(id) {
      const cases = services.registries.cases.all();
      const fallback = RIVAL_BY_ID[id]?.accuracy ?? 0;
      if (!cases.length) return fallback;
      if (!accCache || accCache.n !== cases.length) {
        const byId = new Map<string, number>();
        const diagnosis = (d: string) => services.registries.diagnoses.get(d);
        for (const r of ROSTER) {
          const ok = cases.filter((k) => simulateRival(r, k, { diagnosisName, diagnosis, locale: services.locale }).diagnosisCorrect).length;
          byId.set(r.id, ok / cases.length);
        }
        accCache = { n: cases.length, byId };
      }
      return accCache.byId.get(id) ?? fallback;
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
  const t = text(services.locale);
  const locale = services.locale;
  const rt = (r: Rival) => rivalText(r, services.locale);
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
      message: top ? t.toastTop(lw.field) : lw.rank <= 3 ? t.toastPodium(lw.rank, lw.field) : t.toastWeek(lw.cases, lw.points),
      icon: top ? 'crown' : 'users',
      tone: top ? 'epic' : 'good',
    });
    if (coins > 0) bus.emit('currency:grant', { amount: coins, reason: t.weekReason });
    if (top) unlock('top-week', t.achTopTitle, t.achTopDesc, 'crown');
  };

  const nudge = () => {
    const r = checkSlipped(ctl.state.get(), ctl.now());
    if (r.state !== ctl.state.get()) ctl.state.set(r.state);
    if (r.passedBy?.rival && r.gap !== undefined) {
      const gap = Math.max(1, r.gap);
      // One excellent case earns up to ~160 points; don't promise more than that.
      bus.emit('toast', {
        message: t.nudgeMsg(rt(r.passedBy.rival).short, gap, t.nudgeClose(gap), r.passedBy.rival.avatar.sex === 'F'),
        icon: 'users',
        tone: 'info',
      });
    }
  };

  offs.push(
    bus.on('case:completed', ({ caseId, modeId, score }) => {
      const rivals = ctl.simulate(caseId);
      const res = applyCase(ctl.state.get(), ctl.now(), caseId, score, rivals, undefined, modeId);
      ctl.state.set(res.state);
      const rank = playerRank(res.after);

      bus.emit('reward:granted', {
        source: SYSTEM_ID,
        label: t.rewardBoard,
        value: locale === 'he' ? `\u2066+${res.points}\u2069` : `+${res.points}`,
        icon: 'users',
        color: ACCENT,
        rarity: res.points >= 140 ? 'rare' : 'common',
      });

      if (res.bestOnCase) {
        bus.emit('reward:granted', { source: SYSTEM_ID, label: t.rewardBestLabel, value: t.rewardBestValue, icon: 'star', color: ACCENT, rarity: 'rare' });
        unlock('best-on-case', t.achBestTitle, t.achBestDesc, 'star');
      }

      if (res.passed.length) {
        const lead = res.passed[0]!;
        const names = res.passed.map((r) => rt(r).short);
        const label = t.rewardPassed(names);
        bus.emit('reward:granted', {
          source: SYSTEM_ID,
          label,
          value: locale === 'he' ? `\u2066#${rank}\u2069` : `#${rank}`,
          icon: rank === 1 ? 'crown' : 'trophy',
          color: rank === 1 ? '#ffcb00' : ACCENT,
          rarity: rank === 1 ? 'epic' : 'rare',
        });
        unlock('first-pass', t.achPassTitle, t.achPassDesc, 'trophy');
        // Celebrate only on a correct diagnosis: confetti over a missed case teaches the wrong lesson.
        if (score.diagnosisCorrect) later(() => {
          bus.emit('toast', {
            message: rank === 1 ? t.toastPassTop(rt(lead).short) : t.toastPass(names, rank),
            icon: rank === 1 ? 'crown' : 'trophy',
            tone: rank === 1 ? 'epic' : 'good',
          });
          safe(() => {
            const { x, y } = screenCenter();
            services.fx.burst(x, y, { kind: rank === 1 ? 'confetti' : 'sparks', count: rank === 1 ? 60 : 32, color: rank === 1 ? '#ffcb00' : lead.color });
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
  offs.push(bus.on('mode:started', ({ modeId }) => ctl.state.set(startRun(ctl.state.get(), ctl.now(), modeId))));

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
