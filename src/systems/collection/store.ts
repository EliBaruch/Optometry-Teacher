/**
 * Gallery runtime: persisted state + bus wiring. Logic only (no UI), so it is
 * fully testable with createServices().
 */
import {
  createRng, hashString, signal,
  type Diagnosis, type GameEvents, type GameServices, type Signal,
} from '@core';
import { newlyCompletedSets, orderedDiagnoses, setReward, wingOf } from './catalog';
import {
  FRAME_LABEL, FRAME_TIERS, FRAME_XP, INITIAL_STATE, acquire, glimpse, markAllSeen, markSeen, newMilestones, oddsFor, rollRarity,
  type CollectionState, type Pull,
} from './model';

export const SYSTEM_ID = 'collection';
export const SAVE_KEY = 'sys:collection';
export const SAVE_VERSION = 1;
export const GALLERY_COLOR = '#f472b6';
export const RARITY_HEX = { common: '#cbd5e1', rare: '#38bdf8', epic: '#c084fc', legendary: '#ffd27a' } as const;
export const RARITY_NAME = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' } as const;
export const DEFAULT_IRIS = '#4a6b8a';

export interface CollectionStore {
  services: GameServices;
  state: Signal<CollectionState>;
  /** False after uninstall: widgets render nothing (registries cannot unregister). */
  active: Signal<boolean>;
  catalog(): Diagnosis[];
  diagnosis(id: string): Diagnosis | undefined;
  markSeen(dx: string): void;
  markAllSeen(): void;
}

export interface StoreOptions {
  /** Inject a roll in [0,1) for tests; default is a seeded roll per case. */
  roll?: (caseId: string, at: number) => number;
}

export function createStore(services: GameServices): CollectionStore {
  const state = services.save.slot<CollectionState>(SAVE_KEY, INITIAL_STATE, { version: SAVE_VERSION });
  return {
    services,
    state,
    active: signal(true),
    catalog: () => orderedDiagnoses(services.registries.diagnoses.all()),
    diagnosis: (id) => services.registries.diagnoses.get(id),
    markSeen: (dx) => state.update((s) => markSeen(s, dx)),
    markAllSeen: () => state.update((s) => markAllSeen(s)),
  };
}

const defaultRoll = (caseId: string, at: number) => createRng(hashString(`collection|${caseId}|${at}`)).next();

/** Handle one completed case. Returns the pull (or null when the diagnosis was missed). */
export function onCaseCompleted(store: CollectionStore, ev: GameEvents['case:completed'], opts: StoreOptions = {}): Pull | null {
  const { services } = store;
  const { bus, registries, clock } = services;
  const { score, caseId } = ev;
  const dxId = score.correctDiagnosisId;
  const at = clock.now();
  if (!score.diagnosisCorrect) {
    store.state.update((s) => glimpse(s, dxId, caseId, at));
    return null;
  }
  const kase = registries.cases.get(caseId);
  const dx = registries.diagnoses.get(dxId);
  const irisColor = kase?.patient.avatar.irisColor ?? DEFAULT_IRIS;
  const odds = oddsFor(score.grade, score.perfect, dx?.rarity);
  const rarity = rollRarity(odds, (opts.roll ?? defaultRoll)(caseId, at));
  const seed = hashString(`${caseId}|${irisColor}`);
  const prev = store.state.get();
  const { state: afterPull, pull } = acquire(prev, dxId, {
    caseId, patient: kase?.patient.name ?? 'A visiting patient', irisColor, grade: score.grade, rarity, at, seed,
  });
  let next = afterPull;

  const name = dx?.name ?? dxId;
  const frameUp = pull.frameAfter !== pull.frameBefore;
  bus.emit('reward:granted', {
    source: SYSTEM_ID,
    label: `Iris card · ${name}`,
    value: pull.isNew ? 'NEW!' : frameUp ? `${FRAME_LABEL[pull.frameAfter]} frame` : pull.rarityUp ? `${RARITY_NAME[rarity]}!` : `+${pull.shineGained} shine`,
    icon: 'gem',
    color: RARITY_HEX[rarity],
    rarity,
  });
  if (frameUp) {
    // Sum every tier crossed (a big S duplicate can jump more than one).
    const from = FRAME_TIERS.indexOf(pull.frameBefore);
    const to = FRAME_TIERS.indexOf(pull.frameAfter);
    const xp = FRAME_TIERS.slice(from + 1, to + 1).reduce((s, t) => s + FRAME_XP[t], 0);
    if (xp > 0) bus.emit('xp:grant', { amount: xp, reason: `Gallery: ${name} polished to ${FRAME_LABEL[pull.frameAfter]}` });
  }

  const all = registries.diagnoses.all();
  for (const set of newlyCompletedSets(next, all)) {
    const { xp, coins } = setReward(set.total);
    next = { ...next, completedSets: [...next.completedSets, set.category] };
    pull.setCompleted = set.category;
    bus.emit('xp:grant', { amount: xp, reason: `Gallery set complete: ${set.info.wing}` });
    bus.emit('currency:grant', { amount: coins, reason: `Gallery set complete: ${set.info.wing}` });
    bus.emit('reward:granted', {
      source: SYSTEM_ID, label: `Set complete · ${set.info.wing}`, value: `+${xp} XP`, icon: 'trophy', color: set.info.color, rarity: 'epic',
    });
    bus.emit('achievement:unlocked', {
      id: `collection:set:${set.category}`,
      title: `${set.info.wing} complete`,
      description: `Collected every ${set.info.label.toLowerCase()} iris card (${set.total}).`,
      icon: 'trophy',
      system: SYSTEM_ID,
    });
    bus.emit('toast', { message: `Gallery set complete: ${set.info.wing}!`, icon: 'trophy', tone: 'epic' });
  }

  for (const m of newMilestones(next, all.length)) {
    next = { ...next, achievements: [...next.achievements, m.id] };
    bus.emit('achievement:unlocked', { id: `collection:${m.id}`, title: m.title, description: m.description, icon: m.icon, system: SYSTEM_ID });
  }

  next = { ...next, lastPull: { ...pull } };
  store.state.set(next);
  return next.lastPull;
}

/** Subscribe the store to the bus. Returns the unsubscribe function. */
export function wireStore(store: CollectionStore, opts: StoreOptions = {}): () => void {
  const offs = [store.services.bus.on('case:completed', (ev) => void onCaseCompleted(store, ev, opts))];
  return () => offs.forEach((off) => off());
}

/** Accent for a diagnosis's wing (falls back to the Gallery rose). */
export function accentFor(dx: Diagnosis | undefined): string {
  return wingOf(dx?.category).color;
}
