/**
 * Code Red engine: listens to the bus, drives the heartbeat / vignette pulse
 * while an emergency clock runs, resolves outcomes into stats, rewards and
 * teaching, and stages the arrival banner and the "sight saved" finale.
 *
 * It only DISPLAYS time — the exam scene enforces the timeout.
 */
import type { ClinicalCase, GameServices, ScoreBreakdown } from '@core';
import {
  classify, clockPhase, grandRoundsCase, grandRoundsClaimed, heartbeatIntervalMs, intensity, keyRedFlag,
  newMilestones, recordOutcome, remainingSec, rescueReward, teachingMessage, weekKey, type Outcome, type RescueReward,
} from './logic';
import { ACCENT, SYSTEM_ID, statsSlot } from './state';

/** What the stage (DOM overlays) needs; injectable so the engine is testable without a DOM. */
export interface Stage {
  arrival(info: ArrivalInfo): void;
  saved(info: SavedInfo): void;
  destroy(): void;
}

export interface ArrivalInfo {
  kase?: ClinicalCase;
  limitSec: number;
  grandRounds: boolean;
  reduced: boolean;
}

export interface SavedInfo {
  kase?: ClinicalCase;
  dxName: string;
  sec: number;
  reward: RescueReward;
  reduced: boolean;
}

interface Active {
  caseId: string;
  limitSec: number;
  startedAt: number;
  /** Week key when this is the current, unclaimed Grand Rounds case */
  grandWeek?: string;
}

export interface EngineOptions {
  stage?: Stage;
  /** Override reduced-motion detection (tests). */
  reducedMotion?: () => boolean;
}

export function startEngine(services: GameServices, opts: EngineOptions = {}): () => void {
  const { bus, audio, fx, clock, session, registries } = services;
  const stats = statsSlot(services);
  const stage = opts.stage;
  const reduced = () => {
    try {
      return opts.reducedMotion ? opts.reducedMotion() : services.settings.get().reducedMotion;
    } catch {
      return false;
    }
  };
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const safe = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* juice must never break the game */
    }
  };

  let active: Active | null = null;

  // ── Heartbeat / vignette pulse ────────────────────────────────────────
  let beatTimer: ReturnType<typeof setTimeout> | null = null;
  let marks = new Set<string>();
  let finalBeats = 0;
  const stopPulse = () => {
    if (beatTimer !== null) {
      clearTimeout(beatTimer);
      timers.delete(beatTimer);
      beatTimer = null;
    }
  };
  const beat = () => {
    beatTimer = null;
    const a = active;
    if (!a) return;
    const rem = remainingSec(a.startedAt, a.limitSec, clock.now());
    if (rem <= 0) return; // the exam scene owns the timeout
    const t = intensity(rem, a.limitSec);
    const interval = heartbeatIntervalMs(rem, a.limitSec);
    safe(() => audio.play('heartbeat', { volume: 0.35 + 0.5 * t, pitch: 1 + 0.22 * t }));
    const phase = clockPhase(rem, a.limitSec);
    const once = (key: string, fn: () => void) => {
      if (marks.has(key)) return;
      marks.add(key);
      safe(fn);
    };
    if (phase === 'tense') once('tense', () => fx.vignette(ACCENT, 1100));
    if (phase === 'critical') once('critical', () => fx.vignette(ACCENT, 1300));
    if (phase === 'final') {
      once('final', () => {
        audio.play('countdown', { volume: 0.7 });
        fx.vignette('#f43f5e', 900);
      });
      // A red throb on every other beat in the final seconds (motion-sensitive players get none).
      finalBeats++;
      if (!reduced() && finalBeats % 2 === 0) safe(() => fx.vignette('#f43f5e', Math.round(interval * 1.6)));
    }
    beatTimer = later(beat, interval);
  };

  const caseOf = (id: string) => registries.cases.get(id);
  const dxName = (id: string) => registries.diagnoses.get(id)?.name ?? id.replace(/-/g, ' ');

  // ── Start ─────────────────────────────────────────────────────────────
  const onStarted = bus.on('case:started', (p) => {
    stopPulse();
    active = null;
    if (!p.emergency || !p.timeLimitSec || p.timeLimitSec <= 0) return;
    const s = session.state.get();
    const now = clock.now();
    const week = weekKey(now);
    const feature = grandRoundsCase(registries.cases.all(), now);
    const isGrand = feature?.id === p.caseId && !grandRoundsClaimed(stats.get(), week);
    active = {
      caseId: p.caseId,
      limitSec: p.timeLimitSec,
      startedAt: s && s.caseId === p.caseId ? s.startedAt : now,
      grandWeek: isGrand ? week : undefined,
    };
    marks = new Set();
    finalBeats = 0;
    safe(() => audio.play('alarm', { volume: 0.8 }));
    safe(() => fx.vignette(ACCENT, reduced() ? 900 : 1500));
    safe(() => stage?.arrival({ kase: caseOf(p.caseId), limitSec: p.timeLimitSec!, grandRounds: isGrand, reduced: reduced() }));
    // First heartbeat lands just after the klaxon.
    beatTimer = later(beat, 1100);
  });

  // Session cleared / replaced / resolved → silence the heart immediately.
  const onSession = session.state.subscribe((s) => {
    if (!active) return;
    if (!s || s.caseId !== active.caseId) {
      stopPulse();
      active = null;
    } else if (s.submitted || s.failed) stopPulse();
  });

  // ── Resolve ───────────────────────────────────────────────────────────
  const record = (a: Active, outcome: Outcome, sec: number, diagnosisId: string, extra: { reward?: RescueReward; score?: ScoreBreakdown } = {}) => {
    const next = recordOutcome(stats.get(), {
      caseId: a.caseId, diagnosisId, outcome, sec, at: clock.now(),
      grandRoundsWeek: outcome === 'saved' ? a.grandWeek : undefined,
    });
    const earned = newMilestones(next, extra);
    stats.set(earned.length ? { ...next, achievements: [...next.achievements, ...earned.map((m) => m.id)] } : next);
    for (const m of earned) bus.emit('achievement:unlocked', { ...m, system: SYSTEM_ID });
  };

  const teach = (outcome: Exclude<Outcome, 'saved'>, kase: ClinicalCase | undefined) => {
    if (!kase) return;
    bus.emit('toast', {
      message: teachingMessage(outcome, dxName(kase.diagnosis), kase.urgency, keyRedFlag(kase)),
      icon: 'alert',
      tone: 'info',
    });
  };

  const celebrate = (a: Active, kase: ClinicalCase | undefined, score: ScoreBreakdown, sec: number) => {
    const reward = rescueReward(score, sec, a.limitSec, !!a.grandWeek);
    // Rewards are emitted synchronously so the case session collects them for the results screen.
    bus.emit('currency:grant', { amount: reward.coins, reason: 'Code Red: sight saved' });
    bus.emit('xp:grant', { amount: reward.xp, reason: 'Code Red: sight saved' });
    bus.emit('reward:granted', { source: SYSTEM_ID, label: 'Sight saved', value: `+${reward.coins} ✦`, icon: 'heart', color: ACCENT, rarity: reward.rarity });
    bus.emit('reward:granted', { source: SYSTEM_ID, label: 'Emergency XP', value: `+${reward.xp} XP`, icon: 'lightning', color: '#fb923c', rarity: 'rare' });
    if (a.grandWeek) {
      bus.emit('currency:grant', { amount: reward.grandCoins, reason: 'Grand Rounds' });
      bus.emit('xp:grant', { amount: reward.grandXp, reason: 'Grand Rounds' });
      bus.emit('reward:granted', {
        source: SYSTEM_ID, label: 'Grand Rounds', value: `+${reward.grandCoins} ✦ · +${reward.grandXp} XP`,
        icon: 'crown', color: '#ffd27a', rarity: 'legendary',
      });
    }
    // Cinematic: freeze-frame, white-gold flash, sparks; the stage plays the finale card.
    const r = reduced();
    safe(() => audio.play('success', { volume: 0.9 }));
    if (!r) safe(() => fx.hitstop(140));
    later(() => {
      safe(() => audio.play(reward.rarity === 'legendary' || a.grandWeek ? 'legendary' : 'rare', { volume: 0.8 }));
      safe(() => fx.flash('#fff1d6', 460));
      if (!r && typeof window !== 'undefined') {
        const x = window.innerWidth / 2;
        const y = window.innerHeight * 0.42;
        safe(() => fx.burst(x, y, { kind: 'sparks', count: 90, color: '#ffd27a' }));
        later(() => safe(() => fx.burst(x, y, { kind: 'embers', count: 40, color: ACCENT })), 120);
      }
      safe(() => stage?.saved({ kase, dxName: dxName(score.correctDiagnosisId), sec, reward, reduced: r }));
    }, r ? 0 : 150);
    return reward;
  };

  const onCompleted = bus.on('case:completed', (p) => {
    const a = active;
    if (!a || a.caseId !== p.caseId) return;
    stopPulse();
    active = null;
    const sec = Math.min(a.limitSec, Math.max(0, p.score.elapsedSec || (clock.now() - a.startedAt) / 1000));
    const outcome = classify(p.score);
    const kase = caseOf(p.caseId);
    if (outcome === 'saved') {
      const reward = celebrate(a, kase, p.score, sec);
      record(a, outcome, sec, p.score.correctDiagnosisId, { reward, score: p.score });
    } else {
      record(a, outcome, sec, p.score.correctDiagnosisId, { score: p.score });
      teach(outcome, kase);
    }
  });

  const onFailed = bus.on('case:failed', (p) => {
    const a = active;
    if (!a || a.caseId !== p.caseId) return;
    stopPulse();
    active = null;
    if (p.reason !== 'timeout') return; // walking away is not a loss
    const kase = caseOf(p.caseId);
    record(a, 'timeout', a.limitSec, kase?.diagnosis ?? '');
    teach('timeout', kase);
  });

  return () => {
    onStarted();
    onCompleted();
    onFailed();
    onSession();
    stopPulse();
    for (const t of timers) clearTimeout(t);
    timers.clear();
    active = null;
    stage?.destroy();
  };
}
