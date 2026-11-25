/**
 * Streaks controller: owns the persisted slice and the live combo, listens to the bus,
 * pays rewards through events (never by calling other systems) and adds juice.
 */
import { dayKey, signal, type GameEvents, type GameServices, type ScoreBreakdown, type Signal } from '@core';
import { applyCase, applyFailure, formatMult, freshCombo, tierIndex, EMPTY_COMBO, type ComboState, type ComboStep } from './combo';
import { earnFreeze, isSolid, progressMend, touchDay, viewDaily, MEND_NEED, type DailyView, type DayOutcome, type Milestone } from './daily';
import { ACCENT, INITIAL, SLOT, SLOT_VERSION, SYSTEM_ID, bestFor, sanitize, withBest, type StreaksState } from './state';

export const ICE = '#7dd3fc';

/** What the last finished patient did to the combo, the flame and the bests (results panel). */
export interface CaseEcho {
  caseId: string;
  modeId: string;
  step: ComboStep;
  caseScore: number | null;
  prevCaseBest: number;
  newCaseBest: boolean;
  day: DayOutcome;
  usedFreezes: number;
  freezeEarned: boolean;
  milestones: Milestone[];
  mended: boolean;
  lostStreak: number;
}

export interface RunEcho {
  modeId: string;
  total: number;
  cases: number;
  prevBest: number;
  isNewBest: boolean;
  bestCombo: number;
}

export interface StreaksController {
  services: GameServices;
  state: Signal<StreaksState>;
  combo: Signal<ComboState>;
  echo: Signal<CaseEcho | null>;
  runEcho: Signal<RunEcho | null>;
  today(): string;
  view(): DailyView;
  modeTitle(modeId: string): string;
}

const controllers = new WeakMap<GameServices, StreaksController>();

/** The installed Streaks controller for these services (null when the system is not installed). */
export function streaksOf(services: GameServices): StreaksController | null {
  return controllers.get(services) ?? null;
}

export function createController(services: GameServices): StreaksController {
  const state = services.save.slot<StreaksState>(SLOT, INITIAL, { version: SLOT_VERSION, migrate: (old) => sanitize(old) });
  state.set(sanitize(state.get()));
  const today = () => dayKey(services.clock.now());
  return {
    services,
    state,
    combo: signal<ComboState>(EMPTY_COMBO),
    echo: signal<CaseEcho | null>(null),
    runEcho: signal<RunEcho | null>(null),
    today,
    view: () => viewDaily(state.get().daily, today()),
    modeTitle(modeId) {
      if (modeId === 'single') return 'single patient';
      return services.registries.modes.get(modeId)?.title ?? 'clinic';
    },
  };
}

/* ── Event handling ───────────────────────────────────────────────────── */

export function onCaseCompleted(ctl: StreaksController, ev: GameEvents['case:completed']): CaseEcho {
  const { state } = ctl;
  const { score, modeId } = ev;
  const day = ctl.today();
  const step = applyCase(ctl.combo.get(), modeId, score);
  ctl.combo.set(step.combo);

  const s0 = state.get();
  const touched = touchDay(s0.daily, day);
  const mend = progressMend(touched.daily, day, score.diagnosisCorrect, modeId === 'review');
  const frozen = earnFreeze(mend.daily, isSolid(score));
  const prevBest = bestFor(s0, modeId);
  let next: StreaksState = { ...s0, daily: frozen.daily, bestCombo: Math.max(s0.bestCombo, step.combo.count) };
  next = withBest(next, modeId, { caseScore: score.total, combo: step.combo.count });
  state.set(next);

  const echo: CaseEcho = {
    caseId: ev.caseId,
    modeId,
    step,
    caseScore: score.total,
    prevCaseBest: prevBest.caseScore,
    newCaseBest: score.total > prevBest.caseScore && prevBest.caseScore > 0,
    day: touched.outcome,
    usedFreezes: touched.usedFreezes,
    freezeEarned: frozen.earned,
    milestones: [...touched.milestones, ...mend.milestones],
    mended: mend.mended,
    lostStreak: touched.lostStreak,
  };
  ctl.echo.set(echo);
  announce(ctl, echo, score);
  return echo;
}

export function onCaseFailed(ctl: StreaksController, ev: GameEvents['case:failed']): void {
  const step = applyFailure(ctl.combo.get(), ev.modeId);
  ctl.combo.set(step.combo);
  ctl.echo.set({
    caseId: ev.caseId, modeId: ev.modeId, step, caseScore: null, prevCaseBest: bestFor(ctl.state.get(), ev.modeId).caseScore,
    newCaseBest: false, day: 'same', usedFreezes: 0, freezeEarned: false, milestones: [], mended: false, lostStreak: 0,
  });
}

export function onModeEnded(ctl: StreaksController, ev: GameEvents['mode:ended']): RunEcho {
  const s0 = ctl.state.get();
  const prevBest = bestFor(s0, ev.modeId).run;
  const combo = ctl.combo.get();
  const isNewBest = ev.casesCompleted > 0 && ev.totalScore > prevBest;
  ctl.state.set(withBest(s0, ev.modeId, { run: ev.totalScore, runCases: ev.casesCompleted }));
  const run: RunEcho = {
    modeId: ev.modeId, total: ev.totalScore, cases: ev.casesCompleted, prevBest, isNewBest,
    bestCombo: combo.modeId === ev.modeId ? combo.best : 0,
  };
  ctl.runEcho.set(run);
  ctl.combo.set(freshCombo(null)); // the run is over; its peak lives on in runEcho
  if (isNewBest && prevBest > 0) {
    safe(() => ctl.services.audio.play('rare', { volume: 0.6 }));
    ctl.services.bus.emit('toast', { message: `New personal best in ${ctl.modeTitle(ev.modeId)}: ${ev.totalScore} points`, icon: 'trophy', tone: 'epic' });
  }
  return run;
}

/* ── Rewards, toasts & juice ──────────────────────────────────────────── */

function announce(ctl: StreaksController, e: CaseEcho, score: ScoreBreakdown) {
  const { bus, audio } = ctl.services;
  const { step } = e;
  const mult = step.tier.mult;
  const idx = tierIndex(step.combo.count);

  if (step.outcome === 'built' && mult > 1) {
    if (step.bonusXp > 0) bus.emit('xp:grant', { amount: step.bonusXp, reason: `Combo ${formatMult(mult)}` });
    bus.emit('reward:granted', {
      source: SYSTEM_ID,
      label: `Combo ${formatMult(mult)} · ${step.combo.count} in a row`,
      value: step.bonusXp > 0 ? `+${step.bonusXp} XP` : formatMult(mult),
      icon: 'flame',
      color: step.tier.color,
      rarity: mult >= 3 ? 'epic' : mult >= 2 ? 'rare' : 'common',
    });
  } else if (step.outcome === 'saved') {
    bus.emit('reward:granted', {
      source: SYSTEM_ID, label: 'Combo saved · thorough work-up, safe triage', value: formatMult(mult), icon: 'heart', color: ACCENT, rarity: 'common',
    });
  }
  if (e.newCaseBest) {
    bus.emit('reward:granted', {
      source: SYSTEM_ID, label: `Personal best · ${ctl.modeTitle(e.modeId)} patient`, value: String(score.total), icon: 'trophy', color: '#ffd27a', rarity: 'rare',
    });
  }
  if (e.freezeEarned) {
    bus.emit('reward:granted', { source: SYSTEM_ID, label: 'Streak freeze banked', value: '+1', icon: 'sparkle', color: ICE, rarity: 'rare' });
  }
  const daily = ctl.state.get().daily;
  if (e.mended) {
    bus.emit('reward:granted', { source: SYSTEM_ID, label: 'Flame rekindled', value: `${daily.current} days`, icon: 'flame', color: ACCENT, rarity: 'epic' });
  }
  for (const m of e.milestones) {
    bus.emit('currency:grant', { amount: m.coins, reason: `Streak milestone · ${m.days} days` });
    bus.emit('reward:granted', { source: SYSTEM_ID, label: `${m.days}-day streak · ${m.title}`, value: `+${m.coins}`, icon: 'flame', color: ACCENT, rarity: m.rarity });
    if (m.achievement) bus.emit('achievement:unlocked', { ...m.achievement, icon: 'flame', system: SYSTEM_ID });
  }
  dayToast(ctl, e);

  // Sound & screen juice (audio and fx must never break the clinic).
  if (step.outcome === 'built' && step.combo.count >= 2) {
    safe(() => audio.play('combo', { volume: 0.55 + 0.1 * idx, pitch: 1 + 0.06 * Math.min(step.combo.count, 8) }));
    if (step.tierUp && mult >= 3) safe(() => audio.play('streak-fire', { volume: 0.7 }));
  } else if (step.outcome === 'saved') {
    safe(() => audio.play('sparkle', { volume: 0.5 }));
  }
  if (e.milestones.length || e.mended) safe(() => audio.play('streak-fire', { volume: 0.8 }));
  if ((step.tierUp || e.milestones.length) && !reduced(ctl.services)) {
    const { x, y } = flameAnchor();
    safe(() => {
      ctl.services.fx.burst(x, y, { kind: 'embers', count: 14 + 10 * idx, color: step.tier.color });
      if (step.tierUp) ctl.services.fx.floatText(`${formatMult(mult)} combo`, x - 40, y + 30, { color: step.tier.color, size: 22 + 4 * idx });
    });
  }
}

function dayToast(ctl: StreaksController, e: CaseEcho) {
  const { bus } = ctl.services;
  const d = ctl.state.get().daily;
  const msg = (message: string, tone: 'info' | 'good' | 'epic' = 'good') => bus.emit('toast', { message, icon: 'flame', tone });
  switch (e.day) {
    case 'started':
      msg(d.totalDays <= 1 ? 'Your clinic flame is lit — see a patient tomorrow to keep it glowing.' : 'A fresh flame is lit — day 1.');
      break;
    case 'continued':
      if (!e.milestones.length) msg(`Day ${d.current} — flame lit for today.`);
      break;
    case 'frozen':
      msg(`A streak freeze covered the quiet ${e.usedFreezes === 1 ? 'day' : 'days'} — day ${d.current}.`, 'info');
      break;
    case 'broken':
      if (e.mended) break;
      msg(
        d.mend
          ? `A fresh flame — day 1. ${MEND_NEED} correct diagnoses by tomorrow rekindle your ${d.mend.lost}-day streak.`
          : 'A fresh flame is lit — day 1.',
        'info',
      );
      break;
    default:
      break;
  }
  if (e.mended) msg(`Flame rekindled — ${d.current} days and counting.`, 'epic');
}

function reduced(services: GameServices): boolean {
  if (services.settings.get().reducedMotion) return true;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduced-motion')) return true;
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Screen point near the top-right flame chip, where embers burst from. */
function flameAnchor(): { x: number; y: number } {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  return { x: Math.max(40, w - 72), y: 34 };
}

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    /* juice never breaks the clinic */
  }
}

/** Wire the controller to the bus. Returns the teardown. */
export function attach(ctl: StreaksController): () => void {
  const { bus } = ctl.services;
  const offs = [
    bus.on('mode:started', ({ modeId }) => {
      ctl.combo.set(freshCombo(modeId));
      ctl.runEcho.set(null);
    }),
    bus.on('case:completed', (ev) => void onCaseCompleted(ctl, ev)),
    bus.on('case:failed', (ev) => onCaseFailed(ctl, ev)),
    bus.on('mode:ended', (ev) => void onModeEnded(ctl, ev)),
  ];
  return () => {
    for (const off of offs.splice(0)) off();
  };
}

export function register(ctl: StreaksController) {
  controllers.set(ctl.services, ctl);
}
export function unregister(ctl: StreaksController) {
  if (controllers.get(ctl.services) === ctl) controllers.delete(ctl.services);
}
