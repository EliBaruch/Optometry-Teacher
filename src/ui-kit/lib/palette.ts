import type { Grade, RewardGrant } from '@core';

/** JS mirror of the colour tokens (for canvas / SVG drawing). Keep in sync with styles/tokens.css. */
export const palette = {
  ink: '#0b0716',
  inkDeep: '#06030d',
  aubergine: '#1a0f2e',
  plum: '#2a1846',
  gold: '#ffd27a',
  goldDeep: '#f5b942',
  ivory: '#f6efe4',
  muted: '#a99bbd',
  career: '#a78bfa',
  economy: '#f5b942',
  rivals: '#4ade80',
  streaks: '#fb923c',
  gallery: '#f472b6',
  codeRed: '#ef4444',
  lounge: '#38bdf8',
  normal: '#5eead4',
  abnormal: '#fbbf24',
  critical: '#f43f5e',
} as const;

export type Rarity = NonNullable<RewardGrant['rarity']>;
export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#cbd5e1',
  rare: '#38bdf8',
  epic: '#c084fc',
  legendary: '#ffd27a',
};
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};

export const GRADE_COLOR: Record<Grade, string> = {
  S: '#ffd27a',
  A: '#5eead4',
  B: '#38bdf8',
  C: '#a78bfa',
  D: '#fb923c',
  F: '#f43f5e',
};
export const GRADE_WORD: Record<Grade, string> = {
  S: 'Exemplary', A: 'Excellent', B: 'Solid', C: 'Adequate', D: 'Needs review', F: 'Missed',
};

export type Tone = 'neutral' | 'gold' | 'info' | 'good' | 'warn' | 'bad' | 'epic' | 'normal' | 'abnormal' | 'critical';
export const TONE_COLOR: Record<Tone, string> = {
  neutral: '#a99bbd',
  gold: '#ffd27a',
  info: '#38bdf8',
  good: '#5eead4',
  warn: '#fbbf24',
  bad: '#f43f5e',
  epic: '#c084fc',
  normal: '#5eead4',
  abnormal: '#fbbf24',
  critical: '#f43f5e',
};

/** "#rrggbb" + alpha → "rgba(r,g,b,a)". Falls back to the input for non-hex colours. */
export function withAlpha(hex: string, a: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
