/**
 * Gallery catalogue: which cards exist (one per registered diagnosis), their
 * order/numbering, and per-category "sets" (the Gallery's wings).
 */
import type { Diagnosis, DiagnosisCategory } from '@core';
import type { CollectionState } from './model';

export const CATEGORY_ORDER: readonly DiagnosisCategory[] = [
  'refractive', 'binocular', 'anterior', 'cornea', 'glaucoma', 'lens', 'retina', 'neuro', 'systemic', 'normal',
];

export interface WingInfo {
  /** Short label for chips. */
  label: string;
  /** Gallery wing name for set titles. */
  wing: string;
  /** Jewel accent used for the card's category pill & palette. */
  color: string;
}

export const WINGS: Record<DiagnosisCategory, WingInfo> = {
  refractive: { label: 'Refractive', wing: 'Hall of Lenses', color: '#38bdf8' },
  binocular: { label: 'Binocular', wing: 'Binocular Gallery', color: '#a78bfa' },
  anterior: { label: 'Anterior Segment', wing: 'Anterior Arcade', color: '#f472b6' },
  cornea: { label: 'Cornea', wing: 'Corneal Rotunda', color: '#5eead4' },
  glaucoma: { label: 'Glaucoma', wing: 'Pressure Chamber', color: '#4ade80' },
  lens: { label: 'Lens', wing: 'Crystal Room', color: '#fde68a' },
  retina: { label: 'Retina', wing: 'Retina Nave', color: '#fb7185' },
  neuro: { label: 'Neuro-ophthalmic', wing: 'Neuro Observatory', color: '#c084fc' },
  systemic: { label: 'Systemic', wing: 'Systemic Study', color: '#fb923c' },
  normal: { label: 'Healthy Eyes', wing: 'Healthy Eye Alcove', color: '#ffd27a' },
};

export function wingOf(category: DiagnosisCategory | undefined): WingInfo {
  return (category && WINGS[category]) || { label: 'Clinic', wing: 'Main Hall', color: '#f472b6' };
}

/** All diagnoses in Gallery order: by category, then by name. */
export function orderedDiagnoses(all: readonly Diagnosis[]): Diagnosis[] {
  const idx = (c: DiagnosisCategory) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i < 0 ? CATEGORY_ORDER.length : i;
  };
  return [...all].sort((a, b) => idx(a.category) - idx(b.category) || a.name.localeCompare(b.name));
}

/** 1-based card number for a diagnosis (0 if not in the catalogue). */
export function cardNumber(ordered: readonly Diagnosis[], dx: string): number {
  return ordered.findIndex((d) => d.id === dx) + 1;
}

export interface SetProgress {
  category: DiagnosisCategory;
  info: WingInfo;
  owned: number;
  total: number;
  complete: boolean;
}

export function setProgress(state: CollectionState, all: readonly Diagnosis[]): SetProgress[] {
  const out: SetProgress[] = [];
  for (const category of CATEGORY_ORDER) {
    const members = all.filter((d) => d.category === category);
    if (!members.length) continue;
    const owned = members.filter((d) => !!state.cards[d.id]).length;
    out.push({ category, info: WINGS[category], owned, total: members.length, complete: owned === members.length });
  }
  return out;
}

/** Categories that are complete now but were not yet rewarded. */
export function newlyCompletedSets(state: CollectionState, all: readonly Diagnosis[]): SetProgress[] {
  return setProgress(state, all).filter((s) => s.complete && !state.completedSets.includes(s.category));
}

/** Readable date for card faces, e.g. "24 Nov 2026". */
export function formatCardDate(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
