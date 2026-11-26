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
  /** Primary fill: deep and legible on white, carries white text. */
  accent: string;
  /** Darker accent, for accent-coloured text on white and hover states. */
  deep: string;
  /** Lightest tint (chips, soft fills). */
  pale: string;
  /** Darkest shade. */
  shade: string;
  /** Text drawn on top of accent fills. */
  ink: string;
  /** Two light tints mixed into the daylight mesh behind the glass. */
  sky: [string, string];
  /** Optional second colour: the primary gradient sweeps from accent to this. */
  to?: string;
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
    id: 'candlelight', kind: 'theme', name: 'Lumen Azure', rarity: 'common', price: 0,
    blurb: 'The signature Clinic Glass look: electric azure over a sunlit mesh.',
    palette: { accent: '#2257f0', deep: '#1b45c4', pale: '#eef3ff', shade: '#1a3a9c', ink: '#ffffff', sky: ['#7aa2ff', '#6fd6ff'] },
  },
  {
    id: 'moonstone', kind: 'theme', name: 'Moonstone', rarity: 'rare', price: 450,
    blurb: 'Cool slate-blue, like a slit lamp beam on a clear cornea.',
    palette: { accent: '#3f55a5', deep: '#33448a', pale: '#eef1fa', shade: '#27356d', ink: '#ffffff', sky: ['#a9b8e8', '#c9d4f0'] },
  },
  {
    id: 'rose-quartz', kind: 'theme', name: 'Rose Quartz', rarity: 'rare', price: 450,
    blurb: 'Soft rose accents and a blush of morning light.',
    palette: { accent: '#c2255c', deep: '#a61e4d', pale: '#fff0f5', shade: '#8a1a42', ink: '#ffffff', sky: ['#ffb3c7', '#ffd0b8'] },
  },
  {
    id: 'jade-lantern', kind: 'theme', name: 'Jade', rarity: 'epic', price: 900,
    blurb: 'Calm clinical green, like the red-free filter on a fundus camera.',
    palette: { accent: '#0b7a53', deep: '#096347', pale: '#e9fbf2', shade: '#064d38', ink: '#ffffff', sky: ['#7be0b5', '#a8e8d0'] },
  },
  {
    id: 'amethyst-hour', kind: 'theme', name: 'Amethyst', rarity: 'epic', price: 900,
    blurb: 'Rich violet with a soft lilac glow.',
    palette: { accent: '#7c3aed', deep: '#6428c9', pale: '#f4efff', shade: '#4c1d95', ink: '#ffffff', sky: ['#c4b5fd', '#e0c3fc'] },
  },
  {
    id: 'aurora', kind: 'theme', name: 'Aurora', rarity: 'legendary', price: 1800,
    blurb: 'Teal and violet light ripple across the glass. Rarely seen.',
    palette: { accent: '#0f766e', deep: '#0b5f58', pale: '#e6fbf8', shade: '#134e4a', ink: '#ffffff', sky: ['#6ee7d3', '#c4b5fd'], to: '#6d28d9' },
  },
];

export const FRAMES: CatalogItem[] = [
  { id: 'clinic-classic', kind: 'frame', name: 'Clinic Classic', rarity: 'common', price: 0, tint: '#1d2b4f', blurb: 'Sensible full-rim rectangles. Never out of style.' },
  { id: 'half-eye', kind: 'frame', name: 'Half-Eye Readers', rarity: 'common', price: 300, tint: '#6b4a2f', blurb: 'For near work over the top — very presbyopia-chic.' },
  { id: 'windsor', kind: 'frame', name: 'Windsor Round', rarity: 'common', price: 280, tint: '#c9a45c', blurb: 'Fine gold wire, perfectly round lenses.' },
  { id: 'browline', kind: 'frame', name: 'Browline', rarity: 'rare', price: 480, tint: '#1d1a20', blurb: 'Bold brow bar, wire below: the senior consultant look.' },
  { id: 'cat-eye', kind: 'frame', name: 'Cat-Eye', rarity: 'rare', price: 500, tint: '#7a1f3d', blurb: 'Upswept corners in garnet acetate.' },
  { id: 'aviator', kind: 'frame', name: 'Aviator', rarity: 'epic', price: 880, tint: '#d4b06a', blurb: 'Teardrop lenses and a double bridge.' },
  { id: 'tortoise-keyhole', kind: 'frame', name: 'Tortoiseshell Keyhole', rarity: 'epic', price: 920, tint: '#8a5a2b', blurb: 'Hand-polished tortoiseshell with a keyhole bridge.' },
  { id: 'gilded-pince-nez', kind: 'frame', name: 'Golden Pince-Nez', rarity: 'legendary', price: 1650, tint: '#e0a526', blurb: 'Clip-on oval lenses with a gold chain. Pure theatre.' },
];

export const NAMEPLATES: CatalogItem[] = [
  { id: 'ivory-card', kind: 'nameplate', name: 'Clean Card', rarity: 'common', price: 0, tint: '#ffffff', blurb: 'A crisp white name card.' },
  { id: 'brass-plaque', kind: 'nameplate', name: 'Steel Plaque', rarity: 'common', price: 260, tint: '#8a97ad', blurb: 'Brushed steel, mounted on the consulting-room door.' },
  { id: 'velvet-sash', kind: 'nameplate', name: 'Ribbon Banner', rarity: 'rare', price: 460, tint: '#e11d48', blurb: 'A bold crimson ribbon with crisp white lettering.' },
  { id: 'stained-glass', kind: 'nameplate', name: 'Prism Glass', rarity: 'epic', price: 940, tint: '#a78bfa', blurb: 'Jewel-bright glass that splits the light into colour.' },
  { id: 'star-chart', kind: 'nameplate', name: 'Star Chart', rarity: 'epic', price: 960, tint: '#38bdf8', blurb: 'Your name among the stars of the mastery map.' },
  { id: 'gilded-marquee', kind: 'nameplate', name: 'Spotlight Marquee', rarity: 'legendary', price: 1700, tint: '#f5a524', blurb: 'Bulb-lit marquee lettering. Top billing.' },
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
  /** Body tint / ribbon colour for the crate art. */
  wood: string;
  trim: string;
}

export const CRATES: Record<CrateKind, CrateSpec> = {
  case: {
    kind: 'case', name: 'Supply crate', earn: 'Exemplary (S) cases — and sometimes excellent (A) ones',
    odds: { common: 62, rare: 27, epic: 9, legendary: 2 }, wood: '#e8f0ff', trim: '#2257f0',
  },
  momentum: {
    kind: 'momentum', name: 'Momentum crate', earn: 'Correct-diagnosis runs of 3, 5, 10, 15…',
    odds: { common: 45, rare: 35, epic: 15, legendary: 5 }, wood: '#fff0e0', trim: '#ea580c',
  },
  promotion: {
    kind: 'promotion', name: 'Promotion crate', earn: 'Every career promotion',
    odds: { common: 15, rare: 45, epic: 28, legendary: 12 }, wood: '#f1eaff', trim: '#7c3aed',
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
