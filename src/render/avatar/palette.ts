/**
 * Colour data for portraits. Skin tones run 0 (very fair) .. 5 (very deep);
 * each has a hand-tuned base, shadow, highlight, lip and blush so every tone
 * reads as warm, lit and dignified — never grey or caricatured.
 */
import type { SkinTone } from '@core';

export interface SkinPalette {
  base: string;
  shadow: string;
  deep: string;
  light: string;
  lip: string;
  lipDark: string;
  blush: string;
  /** subsurface warm tint for ears/nose tip */
  warm: string;
}

export const SKIN: Record<SkinTone, SkinPalette> = {
  0: { base: '#f7dccb', shadow: '#e2b29c', deep: '#c48a76', light: '#fff1e6', lip: '#d98b8b', lipDark: '#b4636a', blush: '#f2a5a0', warm: '#f3b9a6' },
  1: { base: '#eec3a2', shadow: '#d29b7b', deep: '#b0755a', light: '#fbe0c9', lip: '#c97c74', lipDark: '#a3585a', blush: '#e69a86', warm: '#e8a487' },
  2: { base: '#d6a27a', shadow: '#b67c58', deep: '#935b3d', light: '#ecc39e', lip: '#b56a5e', lipDark: '#8c4a44', blush: '#cf8064', warm: '#cf8a66' },
  3: { base: '#b77d55', shadow: '#94603e', deep: '#73452b', light: '#d29b6f', lip: '#9a5547', lipDark: '#6f3a32', blush: '#b36549', warm: '#b66d4b' },
  4: { base: '#8c5a3b', shadow: '#6e4329', deep: '#52301c', light: '#a9724d', lip: '#78423a', lipDark: '#542a26', blush: '#93503a', warm: '#985a3d' },
  5: { base: '#5f3b26', shadow: '#4a2c1b', deep: '#331d11', light: '#7c5135', lip: '#59302b', lipDark: '#3c1f1c', blush: '#6e3a2a', warm: '#71412b' },
};

/** Natural hair colours, weighted toward darker shades for deeper skin tones. */
export const HAIR_DARK = ['#1c1410', '#2a1d16', '#3a2719', '#24180f'] as const;
export const HAIR_MID = ['#4a3122', '#5e3d27', '#6b4a2f', '#7a5534'] as const;
export const HAIR_LIGHT = ['#a77b48', '#c49a5c', '#d8b679', '#b0803f'] as const;
export const HAIR_RED = ['#8e3f1f', '#a8522a', '#c06a35'] as const;
export const HAIR_GREY = ['#8f8a86', '#a7a29c', '#7d7873'] as const;
export const HAIR_WHITE = ['#e6e1da', '#d8d2ca', '#f0ece6'] as const;

export const IRIS_BROWN = ['#5a3a22', '#6b4426', '#3f2a1a', '#7a4f2a', '#4b3020'] as const;
export const IRIS_HAZEL = ['#8a6a35', '#7a6a3a', '#93743f'] as const;
export const IRIS_GREEN = ['#5f7d4a', '#4f7a5f', '#6c8a52'] as const;
export const IRIS_BLUE = ['#4f7ca8', '#5e8fb8', '#3f6f9c', '#7aa0c2'] as const;
export const IRIS_GREY = ['#7f8f99', '#8a98a0'] as const;

/** Outfit colours; also tint the pastel studio backdrop. */
export const OUTFITS = [
  '#3d5a80', '#7b3f61', '#2f6b5e', '#8a5a2b', '#4a3f7a', '#9c3d3d', '#2c4a6e',
  '#6d6a3a', '#5a2e5f', '#33576b', '#a0643a', '#2e3a4f', '#6a3b2e', '#3f6e8c',
] as const;

export const GOLD = '#3b6bff';
