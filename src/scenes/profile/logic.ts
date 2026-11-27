/** Pure helpers for the profile scene (unit-tested). */
import type { Diagnosis } from '@core';

export type CrestRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** The crest becomes more brilliant as diagnoses are mastered. */
export const CREST_TIERS: { rarity: CrestRarity; at: number; label: string }[] = [
  { rarity: 'common', at: 0, label: 'Polished' },
  { rarity: 'rare', at: 5, label: 'Lustrous' },
  { rarity: 'epic', at: 15, label: 'Radiant' },
  { rarity: 'legendary', at: 30, label: 'Luminous' },
];

export function crestTier(mastered: number) {
  let idx = 0;
  CREST_TIERS.forEach((t, i) => {
    if (mastered >= t.at) idx = i;
  });
  const next = CREST_TIERS[idx + 1];
  return { ...CREST_TIERS[idx]!, next: next ? { ...next, remaining: next.at - mastered } : null };
}

const PALETTES = [
  ['#3b6e8f', '#8fd3ff', '#1d3550', '#ffd27a'],
  ['#5b3f8c', '#c4a8ff', '#2a1846', '#f9c97c'],
  ['#2f7a5f', '#8ef0c4', '#173d30', '#ffe7a3'],
  ['#8a4b2a', '#ffb070', '#3d1f10', '#ffe0a8'],
  ['#7a2f55', '#ff9cc8', '#3a1328', '#ffd27a'],
  ['#3a4f8a', '#9fb4ff', '#1a2348', '#f6efe4'],
];

export function crestPalette(seed: number): string[] {
  return PALETTES[(seed >>> 0) % PALETTES.length]!;
}

export function initials(name: string, fallback = 'L'): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0]!.charAt(0) + (parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '')).toUpperCase();
}

export function greeting(hour: number): string {
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const NAME_MAX = 24;
export function cleanName(raw: string, fallback = ''): string {
  const s = raw.replace(/[\u0000-\u001f\u007f<>{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  return s || fallback;
}

export interface CategoryStat {
  category: string;
  total: number;
  seen: number;
  mastered: number;
  /** mean mastery over all entries in the category (unseen count as 0) */
  mastery: number;
}

export function categoryStats(
  list: readonly Diagnosis[],
  seen: (id: string) => boolean,
  mastery: (id: string) => number,
  masteredAt = 0.8,
): CategoryStat[] {
  const map = new Map<string, CategoryStat>();
  for (const d of list) {
    const s = map.get(d.category) ?? { category: d.category, total: 0, seen: 0, mastered: 0, mastery: 0 };
    s.total += 1;
    if (seen(d.id)) {
      s.seen += 1;
      const m = mastery(d.id);
      s.mastery += m;
      if (m >= masteredAt) s.mastered += 1;
    }
    map.set(d.category, s);
  }
  const order = ['refractive', 'binocular', 'anterior', 'cornea', 'glaucoma', 'lens', 'retina', 'neuro', 'systemic', 'normal'];
  const rank = (c: string) => (order.indexOf(c) < 0 ? 99 : order.indexOf(c));
  return [...map.values()]
    .map((s) => ({ ...s, mastery: s.total ? s.mastery / s.total : 0 }))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.category.localeCompare(b.category));
}

/** The strongest and weakest categories among those the player has started. */
export function strongestWeakest(stats: readonly CategoryStat[]): { strongest: CategoryStat | null; weakest: CategoryStat | null } {
  const started = stats.filter((s) => s.seen > 0);
  if (!started.length) return { strongest: null, weakest: null };
  const avg = (s: CategoryStat) => s.mastery * s.total / Math.max(1, s.seen);
  const sorted = [...started].sort((a, b) => avg(b) - avg(a));
  return { strongest: sorted[0]!, weakest: sorted.length > 1 ? sorted[sorted.length - 1]! : null };
}

export const CATEGORY_LABEL: Record<string, { label: string; accent: string }> = {
  refractive: { label: 'Refraction', accent: '#2257f0' },
  binocular: { label: 'Binocular Vision', accent: '#7c3aed' },
  anterior: { label: 'Lids & Anterior Eye', accent: '#db2777' },
  cornea: { label: 'Cornea', accent: '#0284c7' },
  glaucoma: { label: 'Glaucoma & Uvea', accent: '#059669' },
  lens: { label: 'Lens', accent: '#a16207' },
  retina: { label: 'Retina & Vitreous', accent: '#ea580c' },
  neuro: { label: 'Neuro-Ophthalmology', accent: '#9333ea' },
  systemic: { label: 'Systemic Disease', accent: '#e11d48' },
  normal: { label: 'Healthy Eyes', accent: '#0d9488' },
};

export function categoryLabel(c: string) {
  return CATEGORY_LABEL[c] ?? { label: c.charAt(0).toUpperCase() + c.slice(1), accent: '#2257f0' };
}
