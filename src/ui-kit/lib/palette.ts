import type { Grade, RewardGrant } from '@core';

/** JS mirror of the colour tokens (for canvas / SVG drawing). Keep in sync with styles/tokens.css. */
export const palette = {
  // Daylight canvas & surfaces
  canvas: '#f4f7fa',
  surface: '#ffffff',
  border: '#e1e8ef',
  // Legacy keys (remapped like the CSS tokens): "ink" = page background, "ivory" = text, "gold" = accent.
  ink: '#f4f7fa',
  inkDeep: '#e4ebf1',
  aubergine: '#eaf0f5',
  plum: '#dbe4ec',
  gold: '#087882',
  goldDeep: '#0a616a',
  ivory: '#0d1b2a',
  muted: '#5b6878',
  // Brand + text
  brand: '#087882',
  brandBright: '#0b929b',
  brandSoft: '#ebfafa',
  text: '#0d1b2a',
  coin: '#e9a20b',
  // System accents
  career: '#7c3aed',
  economy: '#d98a06',
  rivals: '#16a34a',
  streaks: '#ea580c',
  gallery: '#db2777',
  codeRed: '#dc2626',
  lounge: '#0284c7',
  // Clinical states
  normal: '#0f9f8f',
  abnormal: '#d97706',
  critical: '#e11d48',
} as const;

export type Rarity = NonNullable<RewardGrant['rarity']>;
export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#64748b',
  rare: '#0284c7',
  epic: '#9333ea',
  legendary: '#d98a06',
};
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};

export const GRADE_COLOR: Record<Grade, string> = {
  S: '#d98a06',
  A: '#0f9f8f',
  B: '#0284c7',
  C: '#7c3aed',
  D: '#ea580c',
  F: '#e11d48',
};
export const GRADE_WORD: Record<Grade, string> = {
  S: 'Exemplary', A: 'Excellent', B: 'Solid', C: 'Adequate', D: 'Needs review', F: 'Missed',
};

export type Tone = 'neutral' | 'gold' | 'info' | 'good' | 'warn' | 'bad' | 'epic' | 'normal' | 'abnormal' | 'critical';
export const TONE_COLOR: Record<Tone, string> = {
  neutral: '#64748b',
  gold: '#087882',
  info: '#0284c7',
  good: '#0f9f8f',
  warn: '#d97706',
  bad: '#e11d48',
  epic: '#9333ea',
  normal: '#0f9f8f',
  abnormal: '#d97706',
  critical: '#e11d48',
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
