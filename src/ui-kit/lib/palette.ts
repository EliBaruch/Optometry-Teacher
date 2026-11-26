import type { Grade, RewardGrant } from '@core';

/** JS mirror of the colour tokens (for canvas / SVG drawing). Keep in sync with styles/tokens.css. */
export const palette = {
  // Daylight canvas & surfaces
  canvas: '#eef2fa',
  surface: '#ffffff',
  border: '#dde3ee',
  // Legacy keys (remapped like the CSS tokens): "ink" = page background, "ivory" = text, "gold" = accent.
  ink: '#eef2fa',
  inkDeep: '#dfe6f3',
  aubergine: '#e6ebf6',
  plum: '#d9e1ef',
  gold: '#2257f0',
  goldDeep: '#1b45c4',
  ivory: '#0a1633',
  muted: '#56637d',
  // Brand + text
  brand: '#2257f0',
  brandBright: '#3b6bff',
  brandSoft: '#eef3ff',
  text: '#0a1633',
  coin: '#f5a524',
  // System accents
  career: '#7c3aed',
  economy: '#d97706',
  rivals: '#059669',
  streaks: '#ea580c',
  gallery: '#db2777',
  codeRed: '#e11d48',
  lounge: '#0284c7',
  // Vivid status labels (Monday-style: vivid fill, navy text)
  vividGreen: '#00c875',
  vividOrange: '#fdab3d',
  vividRed: '#ff5a6e',
  vividPurple: '#a25ddc',
  vividBlue: '#579bfc',
  vividPink: '#ff6ec7',
  vividSky: '#4eccf5',
  vividYellow: '#ffcb00',
  vividLime: '#9cd326',
  vividTeal: '#2dd4bf',
  // Clinical states
  normal: '#059669',
  abnormal: '#d97706',
  critical: '#e11d48',
} as const;

export type Rarity = NonNullable<RewardGrant['rarity']>;
export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#64748b',
  rare: '#0284c7',
  epic: '#9333ea',
  legendary: '#d97706',
};
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};

export const GRADE_COLOR: Record<Grade, string> = {
  S: '#d97706',
  A: '#059669',
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
  gold: '#2257f0',
  info: '#0284c7',
  good: '#059669',
  warn: '#d97706',
  bad: '#e11d48',
  epic: '#9333ea',
  normal: '#059669',
  abnormal: '#d97706',
  critical: '#e11d48',
};

/** Monday-style vivid label fill for each tone: pair with navy ink text (never white). */
export const TONE_VIVID: Record<Tone, string> = {
  neutral: '#c4ccdb',
  gold: '#579bfc',
  info: '#4eccf5',
  good: '#00c875',
  warn: '#fdab3d',
  bad: '#ff5a6e',
  epic: '#a25ddc',
  normal: '#00c875',
  abnormal: '#fdab3d',
  critical: '#ff5a6e',
};

/** Vivid medal fills for the grade badge (navy letter on top). */
export const GRADE_VIVID: Record<Grade, string> = {
  S: '#ffcb00',
  A: '#00c875',
  B: '#579bfc',
  C: '#a25ddc',
  D: '#fdab3d',
  F: '#ff5a6e',
};

/** Vivid label fill per rarity (rarity pills on reward chips). */
export const RARITY_VIVID: Record<Rarity, string> = {
  common: '#c4ccdb',
  rare: '#579bfc',
  epic: '#a25ddc',
  legendary: '#ffcb00',
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
