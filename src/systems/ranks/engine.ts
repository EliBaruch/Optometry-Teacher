import { pickStrings, type ClinicalCase, type DiagnosisId, type GameServices, type RewardGrant, type Signal } from '@core';
import { newlyUnlocked, type AchievementDef, type AchievementEnv } from './model/achievements';
import { levelForXp, levelInfo, type LevelInfo } from './model/ladder';
import { starsOf } from './model/mastery';
import { achText, starLabel } from './model/locale';
import { S } from './strings';
import {
  applyCase, applyFailure, applyGrant, applyRunEnded, applyTest, setBestStars,
} from './model/reduce';
import { ranksSlot, type RanksState } from './model/state';
import { clampGrant, type XpLine } from './model/xp';

export const SYSTEM_ID = 'ranks';
export const CAREER_COLOR = '#a78bfa';

/** A moment the UI layer should stage (trophy plaque, promotion ceremony). */
export type Moment =
  | { kind: 'trophy'; def: AchievementDef }
  | { kind: 'rank'; info: LevelInfo; from: LevelInfo; newRank: boolean };

export interface EngineHooks {
  /** Stage a moment after `delayMs` (the results stamp lands first). */
  present?(m: Moment, delayMs: number): void;
}

const isEmergencyCase = (c: ClinicalCase) => !!c.emergency || c.urgency === 'emergency';

export function buildEnv(services: GameServices, s: RanksState): AchievementEnv {
  const r = services.registries;
  const emergencies = new Set<DiagnosisId>();
  for (const c of r.cases.all()) if (isEmergencyCase(c)) emergencies.add(c.diagnosis);
  return {
    diagnoses: r.diagnoses.all(),
    emergencyDiagnoses: [...emergencies],
    availableTests: r.minigames.all().map((m) => m.id),
    stars: (id) => starsOf(services.learning, s.dx[id], id),
    level: levelForXp(s.xp),
  };
}

/** ms before staging a moment: let the results stamp / mini-game close land first. */
export const DELAY = { now: 250, test: 700, case: 1500 } as const;

const xpRarity = (xp: number): RewardGrant['rarity'] => (xp >= 300 ? 'legendary' : xp >= 200 ? 'epic' : xp >= 120 ? 'rare' : 'common');

/**
 * Wires the bus to the Career state. Pure folding lives in model/*; this file
 * only translates events, emits rewards and asks the UI to stage moments.
 */
export function startEngine(services: GameServices, hooks: EngineHooks = {}): { state: Signal<RanksState>; stop: () => void } {
  const { bus } = services;
  const locale = services.locale;
  const t = pickStrings(S, locale);
  const state = ranksSlot(services);
  const confidence = new Map<string, 'guessing' | 'fairly-sure' | 'certain'>();
  const pendingGrants = new Map<string, XpLine[]>();

  const emitReward = (r: Omit<RewardGrant, 'source'>) => bus.emit('reward:granted', { source: SYSTEM_ID, ...r });
  const present = (m: Moment, delay: number) => {
    try {
      hooks.present?.(m, delay);
    } catch (err) {
      console.error('[career] could not stage moment', err);
    }
  };

  /** Commit a new state; detect promotions and newly earned trophies. */
  const commit = (next: RanksState, base: number) => {
    const prev = state.get();
    const fromLevel = levelForXp(prev.xp);
    const toLevel = levelForXp(next.xp);
    // Trophies are evaluated against the committed state (incl. the new level).
    const fresh = newlyUnlocked(next, buildEnv(services, next));
    const now = services.clock.now();
    if (fresh.length) {
      const achievements = { ...next.achievements };
      for (const a of fresh) achievements[a.id] = now;
      next = { ...next, achievements, unseen: [...next.unseen, ...fresh.map((a) => a.id).filter((id) => !next.unseen.includes(id))] };
    }
    state.set(next);

    if (toLevel > fromLevel) {
      const info = levelInfo(next.xp, locale);
      const from = levelInfo(prev.xp, locale);
      const newRank = info.rankIndex > from.rankIndex;
      bus.emit('rank:changed', { level: info.number, title: info.title });
      emitReward({
        label: newRank ? t.rewardPromotion : t.rewardLevel,
        value: info.title,
        icon: newRank ? 'crown' : 'trophy',
        color: info.rank.color,
        rarity: newRank ? (info.rankIndex >= 5 ? 'legendary' : 'epic') : 'rare',
      });
      present({ kind: 'rank', info, from, newRank }, base + 900);
    }
    fresh.forEach((def, i) => {
      const at = achText(def, locale);
      bus.emit('achievement:unlocked', { id: def.id, title: at.title, description: at.description, icon: def.icon, system: SYSTEM_ID });
      emitReward({ label: t.rewardTrophy(at.title), value: t.rewardNew, icon: 'trophy', color: CAREER_COLOR, rarity: def.rarity });
      present({ kind: 'trophy', def }, base + (toLevel > fromLevel ? 5200 : 0) + i * 650);
    });
  };

  /** Refresh "best stars" for a diagnosis; announce a newly earned star. */
  const refreshStars = (s: RanksState, id: DiagnosisId, announce: boolean): RanksState => {
    const stars = starsOf(services.learning, s.dx[id], id);
    const before = s.dx[id]?.bestStars ?? 0;
    const next = setBestStars(s, id, stars);
    if (announce && next !== s && stars > before) {
      const name = services.registries.diagnoses.get(id)?.name ?? id;
      emitReward({ label: `${starLabel(stars, locale)} · ${name}`, value: '★'.repeat(stars), icon: 'star', color: '#ffd27a', rarity: stars >= 3 ? 'legendary' : stars === 2 ? 'epic' : 'rare' });
    }
    return next;
  };

  const offs = [
    bus.on('diagnosis:submitted', (p) => {
      if (p.confidence) confidence.set(p.caseId, p.confidence);
      else confidence.delete(p.caseId);
    }),

    bus.on('test:completed', ({ caseId, result }) => {
      const kase = services.registries.cases.get(caseId);
      commit(applyTest(state.get(), result, { practice: false, findings: kase?.findings }), DELAY.test);
    }),

    bus.on('practice:completed', ({ result }) => {
      commit(applyTest(state.get(), result, { practice: true }), DELAY.now);
    }),

    bus.on('case:completed', ({ caseId, modeId, score }) => {
      const kase = services.registries.cases.get(caseId);
      const dx = services.registries.diagnoses.get(score.correctDiagnosisId);
      const { next, gain } = applyCase(state.get(), {
        caseId,
        modeId,
        score,
        difficulty: kase?.difficulty ?? 2,
        emergency: kase ? isEmergencyCase(kase) : false,
        rare: dx?.rarity === 'rare',
        confidence: confidence.get(caseId),
        now: services.clock.now(),
      });
      confidence.delete(caseId);
      let s = next;
      const early = pendingGrants.get(caseId);
      if (early && s.lastGain) {
        const sum = early.reduce((a, l) => a + l.xp, 0);
        s = { ...s, lastGain: { ...s.lastGain, fromXp: s.lastGain.fromXp - sum, lines: [...s.lastGain.lines, ...early] } };
      }
      pendingGrants.delete(caseId);
      if (score.diagnosisCorrect) s = refreshStars(s, score.correctDiagnosisId, true);
      emitReward({ label: t.rewardXp, value: `+${gain.total} XP`, icon: 'star', color: CAREER_COLOR, rarity: xpRarity(gain.total) });
      commit(s, DELAY.case);
    }),

    // The learning port records after each case; keep "best stars" in step (silently).
    bus.on('learning:reviewed', ({ diagnosisId }) => {
      const s = state.get();
      const next = refreshStars(s, diagnosisId, false);
      if (next !== s) commit(next, DELAY.case);
    }),

    bus.on('case:failed', () => commit(applyFailure(state.get()), DELAY.now)),

    bus.on('mode:ended', ({ modeId, casesCompleted }) => {
      // casesCompleted counts correct cases; any finished run with a correct call counts.
      commit(applyRunEnded(state.get(), modeId, casesCompleted), DELAY.now);
    }),

    bus.on('xp:grant', ({ amount, reason }) => {
      const n = clampGrant(amount);
      if (!n) return;
      const sess = services.session.state.get();
      const activeCaseId = sess?.submitted ? sess.caseId : null;
      const s = state.get();
      if (activeCaseId && s.lastGain?.caseId !== activeCaseId) {
        // Granted before our own case handler ran: attach it once the case lands.
        const list = pendingGrants.get(activeCaseId) ?? [];
        list.push({ id: 'bonus', label: reason || 'Bonus', xp: n });
        pendingGrants.set(activeCaseId, list);
      }
      commit(applyGrant(s, n, reason, activeCaseId), activeCaseId ? DELAY.case : DELAY.now);
    }),
  ];

  return {
    state,
    stop: () => {
      offs.forEach((off) => off());
      confidence.clear();
      pendingGrants.clear();
    },
  };
}

/** Mark trophies as seen (the trophy wall was viewed). */
export function markSeen(state: Signal<RanksState>, ids?: string[]) {
  state.update((s) => {
    if (!s.unseen.length) return s;
    const unseen = ids ? s.unseen.filter((id) => !ids.includes(id)) : [];
    return unseen.length === s.unseen.length ? s : { ...s, unseen };
  });
}
