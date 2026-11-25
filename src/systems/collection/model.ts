/**
 * Gallery (collection) — pure model. No DOM, no services: everything here is
 * deterministic and unit-tested.
 *
 * One card per diagnosis. The first correct diagnosis of a condition collects
 * its iris card; later correct diagnoses are duplicates that add "shine"
 * (weighted by grade) and polish the frame bronze → silver → gold → prismatic.
 * Rarity is rolled from the case grade, so better work-ups paint rarer art.
 */
import type { DiagnosisId, Grade } from '@core';

export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';
export const CARD_RARITIES: readonly CardRarity[] = ['common', 'rare', 'epic', 'legendary'];

export type FrameTier = 'bronze' | 'silver' | 'gold' | 'prismatic';
export const FRAME_TIERS: readonly FrameTier[] = ['bronze', 'silver', 'gold', 'prismatic'];
/** Shine needed to reach each frame. */
export const FRAME_THRESHOLDS: Record<FrameTier, number> = { bronze: 0, silver: 2, gold: 6, prismatic: 12 };
export const FRAME_LABEL: Record<FrameTier, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', prismatic: 'Prismatic',
};
/** XP paid (via xp:grant) when a duplicate polishes the frame up to this tier. */
export const FRAME_XP: Record<FrameTier, number> = { bronze: 0, silver: 30, gold: 60, prismatic: 120 };

/** Rewards for completing every card of a diagnosis category. */
export const SET_REWARD = { xpPerCard: 40, xpMin: 120, coinsPerCard: 25, coinsMin: 80 } as const;
export function setReward(size: number): { xp: number; coins: number } {
  return {
    xp: Math.max(SET_REWARD.xpMin, size * SET_REWARD.xpPerCard),
    coins: Math.max(SET_REWARD.coinsMin, size * SET_REWARD.coinsPerCard),
  };
}

/** Shine a duplicate adds, by grade (learning quality, never time). */
export function shineFor(grade: Grade): number {
  return grade === 'S' ? 3 : grade === 'A' ? 2 : 1;
}

export function frameFor(shine: number): FrameTier {
  let tier: FrameTier = 'bronze';
  for (const t of FRAME_TIERS) if (shine >= FRAME_THRESHOLDS[t]) tier = t;
  return tier;
}

/** Progress toward the next frame: null when already prismatic. */
export function nextFrame(shine: number): { tier: FrameTier; need: number; from: number; to: number } | null {
  const cur = FRAME_TIERS.indexOf(frameFor(shine));
  const next = FRAME_TIERS[cur + 1];
  if (!next) return null;
  const from = FRAME_THRESHOLDS[FRAME_TIERS[cur]!];
  const to = FRAME_THRESHOLDS[next];
  return { tier: next, need: to - shine, from, to };
}

export type Odds = Record<CardRarity, number>;

/**
 * Published drop odds (shown to players — transparency is a guardrail).
 * Only correct diagnoses roll at all.
 */
export const BASE_ODDS: Record<Grade, Odds> = {
  S: { common: 0.1, rare: 0.4, epic: 0.38, legendary: 0.12 },
  A: { common: 0.35, rare: 0.45, epic: 0.17, legendary: 0.03 },
  B: { common: 0.6, rare: 0.34, epic: 0.06, legendary: 0 },
  C: { common: 0.8, rare: 0.2, epic: 0, legendary: 0 },
  D: { common: 1, rare: 0, epic: 0, legendary: 0 },
  F: { common: 1, rare: 0, epic: 0, legendary: 0 },
};
/** A flawless case (perfect work-up) moves this much from common/rare to legendary. */
export const PERFECT_LEGENDARY_BONUS = 0.08;
/** Clinically rare conditions ("zebras") move this much from common to epic. */
export const ZEBRA_EPIC_BONUS = 0.05;

export function oddsFor(grade: Grade, perfect = false, clinicalRarity?: 'common' | 'uncommon' | 'rare'): Odds {
  const o = { ...BASE_ODDS[grade] };
  const take = (amount: number, to: CardRarity, from: CardRarity[]) => {
    let left = amount;
    for (const f of from) {
      const d = Math.min(o[f], left);
      o[f] -= d;
      o[to] += d;
      left -= d;
      if (left <= 1e-9) break;
    }
  };
  if (perfect && grade === 'S') take(PERFECT_LEGENDARY_BONUS, 'legendary', ['common', 'rare']);
  if (clinicalRarity === 'rare' && grade !== 'D' && grade !== 'F') take(ZEBRA_EPIC_BONUS, 'epic', ['common', 'rare']);
  return o;
}

/** Pick a rarity from odds using a uniform roll in [0,1). */
export function rollRarity(odds: Odds, roll: number): CardRarity {
  let acc = 0;
  for (const r of CARD_RARITIES) {
    acc += odds[r];
    if (roll < acc) return r;
  }
  // float slop: return the rarest tier with non-zero odds
  for (let i = CARD_RARITIES.length - 1; i >= 0; i--) if (odds[CARD_RARITIES[i]!] > 0) return CARD_RARITIES[i]!;
  return 'common';
}

export const rarityRank = (r: CardRarity) => CARD_RARITIES.indexOf(r);
export const gradeRank = (g: Grade) => ['F', 'D', 'C', 'B', 'A', 'S'].indexOf(g);

/** One patient who left this card behind. */
export interface Acquisition {
  caseId: string;
  patient: string;
  irisColor: string;
  grade: Grade;
  rarity: CardRarity;
  at: number;
  seed: number;
}

export interface OwnedCard {
  dx: DiagnosisId;
  /** Best rarity ever pulled — the art on display. */
  rarity: CardRarity;
  /** The acquisition whose art/patient the card shows (best rarity, first reached). */
  featured: Acquisition;
  copies: number;
  shine: number;
  bestGrade: Grade;
  firstAt: number;
  lastAt: number;
  /** Most recent first, capped. */
  history: Acquisition[];
  /** False until the player has looked at it in the Gallery. */
  seen: boolean;
}

/** What the last correct case pulled — drives the results-screen reveal. */
export interface Pull {
  caseId: string;
  dx: DiagnosisId;
  rarity: CardRarity;
  isNew: boolean;
  rarityUp: boolean;
  frameBefore: FrameTier;
  frameAfter: FrameTier;
  shineGained: number;
  setCompleted?: string;
  at: number;
}

export interface CollectionState {
  cards: Record<DiagnosisId, OwnedCard>;
  /** Diagnoses met but missed — silhouettes with a name, collectable next time. */
  glimpsed: DiagnosisId[];
  completedSets: string[];
  achievements: string[];
  lastPull: Pull | null;
  /** Most recent glimpse (incorrect diagnosis) for the results screen. */
  lastGlimpse: { caseId: string; dx: DiagnosisId; at: number } | null;
  pulls: number;
}

export const INITIAL_STATE: CollectionState = {
  cards: {},
  glimpsed: [],
  completedSets: [],
  achievements: [],
  lastPull: null,
  lastGlimpse: null,
  pulls: 0,
};

export const HISTORY_CAP = 8;

/** Fold one correct diagnosis into the collection. Pure. */
export function acquire(state: CollectionState, dx: DiagnosisId, acq: Acquisition): { state: CollectionState; pull: Pull } {
  const prev = state.cards[dx];
  let card: OwnedCard;
  let pull: Pull;
  if (!prev) {
    card = {
      dx, rarity: acq.rarity, featured: acq, copies: 1, shine: 0, bestGrade: acq.grade,
      firstAt: acq.at, lastAt: acq.at, history: [acq], seen: false,
    };
    pull = {
      caseId: acq.caseId, dx, rarity: acq.rarity, isNew: true, rarityUp: false,
      frameBefore: 'bronze', frameAfter: 'bronze', shineGained: 0, at: acq.at,
    };
  } else {
    const gained = shineFor(acq.grade);
    const shine = prev.shine + gained;
    const rarityUp = rarityRank(acq.rarity) > rarityRank(prev.rarity);
    card = {
      ...prev,
      rarity: rarityUp ? acq.rarity : prev.rarity,
      featured: rarityUp ? acq : prev.featured,
      copies: prev.copies + 1,
      shine,
      bestGrade: gradeRank(acq.grade) > gradeRank(prev.bestGrade) ? acq.grade : prev.bestGrade,
      lastAt: acq.at,
      history: [acq, ...prev.history].slice(0, HISTORY_CAP),
      seen: prev.seen && !rarityUp && frameFor(shine) === frameFor(prev.shine),
    };
    pull = {
      caseId: acq.caseId, dx, rarity: acq.rarity, isNew: false, rarityUp,
      frameBefore: frameFor(prev.shine), frameAfter: frameFor(shine), shineGained: gained, at: acq.at,
    };
  }
  return {
    state: {
      ...state,
      cards: { ...state.cards, [dx]: card },
      glimpsed: state.glimpsed.filter((g) => g !== dx),
      lastPull: pull,
      pulls: state.pulls + 1,
    },
    pull,
  };
}

/** Record a diagnosis met but missed (no penalty — it becomes a named silhouette). */
export function glimpse(state: CollectionState, dx: DiagnosisId, caseId: string, at: number): CollectionState {
  const owned = !!state.cards[dx];
  return {
    ...state,
    glimpsed: owned || state.glimpsed.includes(dx) ? state.glimpsed : [...state.glimpsed, dx],
    lastGlimpse: { caseId, dx, at },
  };
}

export function unseenCount(state: CollectionState): number {
  return Object.values(state.cards).filter((c) => !c.seen).length;
}

export function markAllSeen(state: CollectionState): CollectionState {
  if (!unseenCount(state)) return state;
  const cards: Record<DiagnosisId, OwnedCard> = {};
  for (const [k, c] of Object.entries(state.cards)) cards[k] = c.seen ? c : { ...c, seen: true };
  return { ...state, cards };
}

export function markSeen(state: CollectionState, dx: DiagnosisId): CollectionState {
  const c = state.cards[dx];
  if (!c || c.seen) return state;
  return { ...state, cards: { ...state.cards, [dx]: { ...c, seen: true } } };
}

/** Collection milestones (player-facing titles). */
export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  test(state: CollectionState, totalCards: number): boolean;
}

export const MILESTONES: Milestone[] = [
  { id: 'first-light', title: 'First Light', description: 'Collected your first iris card.', icon: 'gem', test: (s) => Object.keys(s.cards).length >= 1 },
  { id: 'ten-irises', title: 'A Wall of Irises', description: 'Collected 10 different iris cards.', icon: 'gem', test: (s) => Object.keys(s.cards).length >= 10 },
  { id: 'twenty-five', title: 'Exhibition Opening', description: 'Collected 25 different iris cards.', icon: 'crown', test: (s) => Object.keys(s.cards).length >= 25 },
  {
    id: 'curator', title: 'Curator', description: 'Collected every iris card in the Gallery.', icon: 'crown',
    test: (s, total) => total > 0 && Object.keys(s.cards).length >= total,
  },
  { id: 'first-legendary', title: 'Once in a Blue Moon', description: 'Earned a Legendary iris card.', icon: 'star', test: (s) => Object.values(s.cards).some((c) => c.rarity === 'legendary') },
  { id: 'first-prismatic', title: 'Prismatic', description: 'Polished a card to a Prismatic frame.', icon: 'sparkle', test: (s) => Object.values(s.cards).some((c) => frameFor(c.shine) === 'prismatic') },
];

/** Milestones newly satisfied (not yet in state.achievements). */
export function newMilestones(state: CollectionState, totalCards: number): Milestone[] {
  return MILESTONES.filter((m) => !state.achievements.includes(m.id) && m.test(state, totalCards));
}

/** Choose one teaching pearl deterministically for a card back. */
export function pickPearl(pearls: readonly string[], seed: number): string | undefined {
  if (!pearls.length) return undefined;
  return pearls[(seed >>> 0) % pearls.length];
}

/** The player's finest cards for showcases: rarest first, then most polished, then newest. */
export function finestCards(state: CollectionState, n: number): OwnedCard[] {
  return Object.values(state.cards)
    .sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.shine - a.shine || b.lastAt - a.lastAt)
    .slice(0, Math.max(0, n));
}
