/**
 * Boutique catalogue: every cosmetic, crate kind and published drop table.
 * Pure data — no DOM, no services. Prices are in lumens (✦), never real money.
 */
import type { RewardGrant } from '@core';

export type Rarity = NonNullable<RewardGrant['rarity']>;
export const RARITY_ORDER: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const COIN = '✦';
export const ECONOMY_COLOR = '#f5b942';

export type ItemKind = 'theme' | 'frame' | 'nameplate';

/** Accent palette a clinic theme applies to the whole game (see theme.ts). */
export interface ThemePalette {
  /** Main accent (replaces candle gold #ffd27a). */
  accent: string;
  /** Deeper accent (replaces #f5b942). */
  deep: string;
  /** Lightest tint (replaces #fff4da). */
  pale: string;
  /** Darkest shade (replaces #a86d17). */
  shade: string;
  /** Text drawn on top of accent buttons. */
  ink: string;
  /** Two background tints mixed into the night sky. */
  sky: [string, string];
}

export interface CatalogItem {
  id: string;
  kind: ItemKind;
  name: string;
  blurb: string;
  rarity: Rarity;
  /** 0 = owned from the start. */
  price: number;
  /** Theme accents (kind === 'theme'). */
  palette?: ThemePalette;
  /** Base colour hint for frames / nameplates (UI art). */
  tint?: string;
}

export const DEFAULT_EQUIPPED = { theme: 'candlelight', frame: 'clinic-classic', nameplate: 'ivory-card' } as const;

export const THEMES: CatalogItem[] = [
  {
    id: 'candlelight', kind: 'theme', name: 'Candlelight', rarity: 'common', price: 0,
    blurb: 'The observatory as you found it: warm gold on midnight ink.',
    palette: { accent: '#ffd27a', deep: '#f5b942', pale: '#fff4da', shade: '#a86d17', ink: '#2a1a05', sky: ['#4c2e80', '#ffbe6e'] },
  },
  {
    id: 'moonstone', kind: 'theme', name: 'Moonstone', rarity: 'rare', price: 450,
    blurb: 'Cool silver-blue light, like a slit lamp beam on a clear cornea.',
    palette: { accent: '#c9dcff', deep: '#93b4ee', pale: '#eef4ff', shade: '#4d6aa8', ink: '#0d1830', sky: ['#2c3f86', '#9cc4ff'] },
  },
  {
    id: 'rose-quartz', kind: 'theme', name: 'Rose Quartz', rarity: 'rare', price: 450,
    blurb: 'Rose-gold trims and a blush of dawn over the dome.',
    palette: { accent: '#f8c4b4', deep: '#e8977f', pale: '#fff0ea', shade: '#a65a45', ink: '#2c120b', sky: ['#6a2d5c', '#ffb59e'] },
  },
  {
    id: 'jade-lantern', kind: 'theme', name: 'Jade Lantern', rarity: 'epic', price: 900,
    blurb: 'Lantern-lit jade — the calm green of a fundus camera’s red-free filter.',
    palette: { accent: '#a3efc9', deep: '#55cf98', pale: '#e9fff3', shade: '#2a7f5a', ink: '#06261a', sky: ['#1d4d4a', '#7ef0c0'] },
  },
  {
    id: 'amethyst-hour', kind: 'theme', name: 'Amethyst Hour', rarity: 'epic', price: 900,
    blurb: 'The violet hour after the last patient leaves.',
    palette: { accent: '#d8c3ff', deep: '#ad8af6', pale: '#f5efff', shade: '#6a49b8', ink: '#1c0f3a', sky: ['#4b2a96', '#d6a8ff'] },
  },
  {
    id: 'aurora', kind: 'theme', name: 'Aurora', rarity: 'legendary', price: 1800,
    blurb: 'Northern lights ripple across the glass dome. Rarely seen.',
    palette: { accent: '#9ff4e4', deep: '#4fd8c8', pale: '#e8fffa', shade: '#1f8f86', ink: '#04241f', sky: ['#1a6a6a', '#b48bff'] },
  },
];

export const FRAMES: CatalogItem[] = [
  { id: 'clinic-classic', kind: 'frame', name: 'Clinic Classic', rarity: 'common', price: 0, tint: '#2a2233', blurb: 'Sensible full-rim rectangles. Never out of style.' },
  { id: 'half-eye', kind: 'frame', name: 'Half-Eye Readers', rarity: 'common', price: 300, tint: '#6b4a2f', blurb: 'For near work over the top — very presbyopia-chic.' },
  { id: 'windsor', kind: 'frame', name: 'Windsor Round', rarity: 'common', price: 280, tint: '#c9a45c', blurb: 'Fine gold wire, perfectly round lenses.' },
  { id: 'browline', kind: 'frame', name: 'Browline', rarity: 'rare', price: 480, tint: '#1d1a20', blurb: 'Bold brow bar, wire below: the senior consultant look.' },
  { id: 'cat-eye', kind: 'frame', name: 'Cat-Eye', rarity: 'rare', price: 500, tint: '#7a1f3d', blurb: 'Upswept corners in garnet acetate.' },
  { id: 'aviator', kind: 'frame', name: 'Aviator', rarity: 'epic', price: 880, tint: '#d4b06a', blurb: 'Teardrop lenses and a double bridge.' },
  { id: 'tortoise-keyhole', kind: 'frame', name: 'Tortoiseshell Keyhole', rarity: 'epic', price: 920, tint: '#8a5a2b', blurb: 'Hand-polished tortoiseshell with a keyhole bridge.' },
  { id: 'gilded-pince-nez', kind: 'frame', name: 'Gilded Pince-Nez', rarity: 'legendary', price: 1650, tint: '#ffd27a', blurb: 'Clip-on oval lenses with a gold chain. Pure theatre.' },
];

export const NAMEPLATES: CatalogItem[] = [
  { id: 'ivory-card', kind: 'nameplate', name: 'Ivory Card', rarity: 'common', price: 0, tint: '#f6efe4', blurb: 'A crisp engraved card.' },
  { id: 'brass-plaque', kind: 'nameplate', name: 'Brass Plaque', rarity: 'common', price: 260, tint: '#c9963f', blurb: 'Screwed to the consulting-room door.' },
  { id: 'velvet-sash', kind: 'nameplate', name: 'Velvet Sash', rarity: 'rare', price: 460, tint: '#7a1236', blurb: 'Deep crimson velvet, gold stitched lettering.' },
  { id: 'stained-glass', kind: 'nameplate', name: 'Stained Glass', rarity: 'epic', price: 940, tint: '#a78bfa', blurb: 'Leaded jewel panes that catch the candlelight.' },
  { id: 'star-chart', kind: 'nameplate', name: 'Star Chart', rarity: 'epic', price: 960, tint: '#38bdf8', blurb: 'Your name among the constellations of the dome.' },
  { id: 'gilded-marquee', kind: 'nameplate', name: 'Gilded Marquee', rarity: 'legendary', price: 1700, tint: '#ffd27a', blurb: 'Bulb-lit marquee lettering. Top billing.' },
];

export const CATALOG: CatalogItem[] = [...THEMES, ...FRAMES, ...NAMEPLATES];
const BY_ID = new Map(CATALOG.map((i) => [i.id, i]));
export const itemById = (id: string): CatalogItem | undefined => BY_ID.get(id);
export const STARTER_ITEMS = CATALOG.filter((i) => i.price === 0).map((i) => i.id);

export const KIND_LABEL: Record<ItemKind, string> = { theme: 'Clinic theme', frame: 'Eyewear frame', nameplate: 'Nameplate' };

/* ── Supply crates ─────────────────────────────────────────────────────── */

export type CrateKind = 'case' | 'momentum' | 'promotion';

export interface CrateSpec {
  kind: CrateKind;
  name: string;
  /** How you earn it (shown in the Boutique). */
  earn: string;
  /** Percent weights per rarity — published to the player. */
  odds: Record<Rarity, number>;
  /** Base / trim colours for the crate art. */
  wood: string;
  trim: string;
}

export const CRATES: Record<CrateKind, CrateSpec> = {
  case: {
    kind: 'case', name: 'Supply crate', earn: 'Exemplary (S) cases — and sometimes excellent (A) ones',
    odds: { common: 62, rare: 27, epic: 9, legendary: 2 }, wood: '#5b3a24', trim: '#d9a54a',
  },
  momentum: {
    kind: 'momentum', name: 'Momentum crate', earn: 'Correct-diagnosis runs of 3, 5, 10, 15…',
    odds: { common: 45, rare: 35, epic: 15, legendary: 5 }, wood: '#4a2a4f', trim: '#fb923c',
  },
  promotion: {
    kind: 'promotion', name: 'Promotion crate', earn: 'Every career promotion',
    odds: { common: 15, rare: 45, epic: 28, legendary: 12 }, wood: '#2b2350', trim: '#c4b5fd',
  },
};

/** What a crate may hold, by percent (rarity is rolled first). */
export const CONTENT_ODDS = { coins: 45, cosmetic: 35, hints: 20 } as const;
export const COIN_RANGE: Record<Rarity, [number, number]> = {
  common: [40, 80], rare: [110, 170], epic: [240, 340], legendary: [520, 720],
};
export const HINT_TOKENS: Record<Rarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };
/** After this many crates in a row without epic-or-better, the next one is guaranteed epic+. */
export const PITY_LIMIT = 8;

/* ── Fees ─────────────────────────────────────────────────────────────── */

/** Case fees above this many lumens per day are paid at half rate (spacing beats cramming). */
export const DAILY_FULL_RATE = 2500;
/** Practice-room pay per day (arcade). */
export const DAILY_PRACTICE_CAP = 200;
export const PERFECT_BONUS = 25;
/** Points of the efficiency score a single hint costs in core scoring. */
export const HINT_POINTS = 20;
/** Points of the efficiency score each unnecessary test costs in core scoring. */
export const UNNECESSARY_TEST_POINTS = 25;
export const MAX_UNOPENED = 30;
/** Momentum milestones (consecutive correct diagnoses) that award a crate. */
export const isMomentumMilestone = (n: number) => n === 3 || n === 5 || (n >= 10 && n % 5 === 0);
