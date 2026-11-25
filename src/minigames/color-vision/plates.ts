/**
 * The plate booklet, the patient's response model, and dot colouring.
 *
 * Plate types (after Hardy-Rand-Rittler / classic pseudo-isochromatic books):
 *  - demo:       read by everyone with adequate acuity (not scored)
 *  - vanish:     normals read it, red-green defectives see nothing
 *  - transform:  normals read A, red-green dichromats read a different B
 *  - hidden:     only red-green dichromats see the figure
 *  - classify:   two digits; left on a protan confusion line, right on a deutan
 *                one -> protans read the right digit only, deutans the left
 *  - tritan:     blue-yellow symbol (HRR style) missed by tritan / acquired B-Y loss
 *  - path:       a winding line for non-readers (vanishing type)
 */
import { createRng, type ColorVision, type Locale, type Rng } from '@core';
import { T } from './strings';
import { hexToLinear, rgbToLms, offsetLms, clampRgb, simulate, simulateAcquired, type Vec3 } from './color';
import { digitAt, inFigure, numberFigure, pathFigure, symbolFigure, type Figure, type SymbolName } from './glyphs';
import type { Dot } from './packing';

export type PlateKind = 'demo' | 'transform' | 'vanish' | 'hidden' | 'classify' | 'tritan' | 'path';

export interface PlateDef {
  kind: PlateKind;
  /** chromatic contrast 0..1 — weaker plates catch milder defects */
  strength: number;
}

/** The standard booklet: plate 1 is the demonstration plate, plates 2..11 are scored. */
export const BOOKLET: readonly PlateDef[] = [
  { kind: 'demo', strength: 1 },
  { kind: 'transform', strength: 0.95 },
  { kind: 'vanish', strength: 1 },
  { kind: 'transform', strength: 0.6 },
  { kind: 'vanish', strength: 0.72 },
  { kind: 'hidden', strength: 0.85 },
  { kind: 'vanish', strength: 0.46 },
  { kind: 'path', strength: 0.78 },
  { kind: 'classify', strength: 0.9 },
  { kind: 'tritan', strength: 0.95 },
  { kind: 'tritan', strength: 0.5 },
];
export const SCORED_PLATES = BOOKLET.length - 1;
export const RED_GREEN_KINDS: readonly PlateKind[] = ['transform', 'vanish', 'hidden', 'path', 'classify'];

export interface Plate extends PlateDef {
  index: number;
  /** what a colour-normal observer reports ('' = nothing) */
  key: string;
  /** transform: what a red-green dichromat reads; hidden: the hidden figure */
  alt?: string;
  symbol?: SymbolName;
  pathVariant?: number;
}

const TRANSFORM_PAIRS: readonly [string, string][] = [
  ['74', '21'], ['6', '5'], ['8', '3'], ['3', '5'], ['15', '17'], ['29', '70'], ['5', '2'], ['57', '35'],
];
const VANISH_NUMBERS = ['97', '45', '5', '7', '16', '73', '2', '42', '35', '96', '8', '29'];
const HIDDEN_NUMBERS = ['5', '2', '45', '73'];
const CLASSIFY_NUMBERS = ['26', '42', '35', '96'];
const SYMBOL_NAMES: readonly SymbolName[] = ['circle', 'triangle', 'cross'];

export function generatePlates(rng: Rng, defs: readonly PlateDef[] = BOOKLET): Plate[] {
  const used = new Set<string>();
  const fresh = (list: readonly string[]) => {
    const options = list.filter((x) => !used.has(x));
    const v = rng.pick(options.length ? options : list);
    used.add(v);
    return v;
  };
  let lastSymbol: SymbolName | null = null;
  return defs.map((d, index) => {
    switch (d.kind) {
      case 'demo':
        return { ...d, index, key: '12' };
      case 'transform': {
        const pairs = TRANSFORM_PAIRS.filter(([a]) => !used.has(a));
        const [a, b] = rng.pick(pairs.length ? pairs : TRANSFORM_PAIRS);
        used.add(a);
        return { ...d, index, key: a, alt: b };
      }
      case 'vanish':
        return { ...d, index, key: fresh(VANISH_NUMBERS) };
      case 'hidden':
        return { ...d, index, key: '', alt: fresh(HIDDEN_NUMBERS) };
      case 'classify':
        return { ...d, index, key: fresh(CLASSIFY_NUMBERS) };
      case 'tritan': {
        const s = rng.pick(SYMBOL_NAMES.filter((x) => x !== lastSymbol));
        lastSymbol = s;
        return { ...d, index, key: s, symbol: s };
      }
      case 'path':
        return { ...d, index, key: 'path', pathVariant: rng.int(0, 2) };
    }
  });
}

/** A fixed, canonical booklet (for pure reporting & tests). */
export function canonicalPlates(): Plate[] {
  return generatePlates(createRng(7));
}

// ───────────────────────────────────────────────────────── patient model

export const SEVERITY_LEVEL: Record<ColorVision['severity'], number> = { none: 0, mild: 0.45, moderate: 0.72, severe: 0.95 };
/** Effective contrast a patient needs to make a figure out. */
export const SEE_THRESHOLD = 0.35;
/** Best-corrected logMAR beyond which plates cannot be read at all (≈ worse than 20/200). */
export const PLATE_VA_LIMIT = 1.0;

export interface Deficit {
  /** red-green loss 0..1 */
  rg: number;
  /** blue-yellow loss 0..1 */
  by: number;
  axis: 'protan' | 'deutan' | null;
  congenital: boolean;
  acquired: boolean;
}

export function deficit(cv: ColorVision): Deficit {
  const s = SEVERITY_LEVEL[cv.severity] ?? 0;
  const none: Deficit = { rg: 0, by: 0, axis: null, congenital: false, acquired: false };
  if (s === 0 || cv.type === 'normal') return none;
  switch (cv.type) {
    case 'protan':
    case 'deutan':
      return { rg: s, by: 0, axis: cv.type, congenital: true, acquired: false };
    case 'tritan':
      return { rg: 0, by: s, axis: null, congenital: true, acquired: false };
    case 'acquired-red-green':
      return { rg: s, by: s * 0.5, axis: null, congenital: false, acquired: true };
    case 'acquired-blue-yellow':
      return { rg: s * 0.3, by: s, axis: null, congenital: false, acquired: true };
  }
}

export interface EyeVision {
  cv: ColorVision;
  /** best-corrected logMAR */
  va: number;
}

export interface PlateResponse {
  /** normalised reading ('' = nothing seen) */
  reading: string;
  correct: boolean;
  /** what the patient says aloud */
  said: string;
  /** true when the patient could not see the plate at all (acuity) */
  blur?: boolean;
}

const sees = (strength: number, loss: number, vaFactor: number) => strength * (1 - loss) * vaFactor >= SEE_THRESHOLD;

function vaFactor(va: number): number {
  return Math.max(0.6, Math.min(1, 1 - Math.max(0, va - 0.3) * 0.5));
}

/** What a patient with this eye reads on a plate (pure, deterministic). */
export function readPlate(plate: Plate, eye: EyeVision): { reading: string; hint?: string; blur?: boolean } {
  if (eye.va > PLATE_VA_LIMIT) return { reading: '', blur: true };
  const d = deficit(eye.cv);
  const vf = vaFactor(eye.va);
  switch (plate.kind) {
    case 'demo':
      return { reading: plate.key };
    case 'vanish':
    case 'path':
      return { reading: sees(plate.strength, d.rg, vf) ? plate.key : '' };
    case 'transform':
      if (sees(plate.strength, d.rg, vf)) return { reading: plate.key };
      return { reading: d.congenital && d.rg >= 0.7 ? plate.alt ?? '' : '' };
    case 'hidden':
      return { reading: d.congenital && d.rg >= 0.7 ? plate.alt ?? '' : '' };
    case 'classify': {
      // left digit lies on a protan confusion line, right digit on a deutan one
      const protanLoss = d.axis === 'protan' ? d.rg : d.axis === 'deutan' ? d.rg * 0.2 : d.rg;
      const deutanLoss = d.axis === 'deutan' ? d.rg : d.axis === 'protan' ? d.rg * 0.2 : d.rg;
      const left = sees(plate.strength, protanLoss, vf) ? plate.key[0] ?? '' : '';
      const right = sees(plate.strength, deutanLoss, vf) ? plate.key[1] ?? '' : '';
      const reading = left + right;
      let hint: string | undefined;
      if (reading.length === 2 && d.axis && d.rg >= 0.3) hint = d.axis === 'protan' ? plate.key[1] : plate.key[0];
      return { reading, hint };
    }
    case 'tritan':
      return { reading: sees(plate.strength, d.by, vf) ? plate.key : '' };
  }
}

const SYMBOL_HE: Record<string, string> = { circle: 'עיגול', triangle: 'משולש' };

export function speak(plate: Plate, r: { reading: string; hint?: string; blur?: boolean }, locale: Locale = 'en'): string {
  const t = T(locale);
  const NOTHING = t.nothing;
  const v = plate.index;
  if (r.blur) return t.blur;
  if (plate.kind === 'demo') return r.reading ? t.demoSaid : NOTHING[0]!;
  if (plate.kind === 'path') return r.reading ? t.pathSaid : t.pathNone;
  if (plate.kind === 'tritan') {
    if (!r.reading) return v % 2 ? t.tritanNoneA : t.tritanNoneB;
    return r.reading === 'cross' ? t.cross : t.symbol(locale === 'he' ? SYMBOL_HE[r.reading] ?? r.reading : r.reading);
  }
  if (plate.kind === 'hidden' && !r.reading) return v % 2 ? t.hiddenNoneA : t.hiddenNoneB;
  if (!r.reading) return NOTHING[v % NOTHING.length]!;
  if (plate.kind === 'classify') {
    if (r.reading.length === 1) return t.justA(r.reading);
    if (r.hint) return t.standsOut(r.reading, r.hint);
  }
  const n = Number(r.reading);
  const word = r.reading.length === 1 && t.numberWords[n] ? t.numberWords[n]! : r.reading;
  const frame = t.frames[v % t.frames.length]!;
  const out = frame.replace('{n}', word);
  return t.upper ? out[0]!.toUpperCase() + out.slice(1) : out;
}

export function respond(plate: Plate, eye: EyeVision, locale: Locale = 'en'): PlateResponse {
  const r = readPlate(plate, eye);
  return { reading: r.reading, correct: r.reading === plate.key, said: speak(plate, r, locale), blur: r.blur };
}

// ───────────────────────────────────────────────────────── dot colouring

export interface PlateFigures {
  a: Figure | null;
  b: Figure | null;
}

export function plateFigures(p: Plate): PlateFigures {
  switch (p.kind) {
    case 'demo':
    case 'vanish':
      return { a: numberFigure(p.key), b: null };
    case 'transform':
      return { a: numberFigure(p.key), b: numberFigure(p.alt ?? '', 0.085) };
    case 'hidden':
      return { a: null, b: numberFigure(p.alt ?? '') };
    case 'classify':
      return { a: digitAt(p.key, 0), b: digitAt(p.key, 1) };
    case 'tritan':
      return { a: symbolFigure(p.symbol ?? 'circle'), b: null };
    case 'path':
      return { a: pathFigure(p.pathVariant ?? 0), b: null };
  }
}

type Anchor = Vec3; // LMS
const lms = (hex: string): Anchor => rgbToLms(hexToLinear(hex));
const ANCHORS = {
  warm: [lms('#c49a5a'), lms('#b5a160'), lms('#cf9a63')],
  neutral: [lms('#a7a097'), lms('#9c9a93'), lms('#ada39a')],
  demo: [lms('#b39a72'), lms('#a99b7b')],
};

/** log-LMS shift that normals see as red↔green but red-green dichromats largely cannot. */
const RG_DELTA = 0.105;

/**
 * Linear-RGB colour for every dot. Figure and background differ only along
 * the relevant confusion axis; random luminance and anchor jitter camouflage
 * any non-colour cue, as in printed plates.
 */
export function dotColors(plate: Plate, dots: readonly Dot[], rng: Rng): Vec3[] {
  const { a, b } = plateFigures(plate);
  const k = plate.strength;
  const pool = plate.kind === 'classify' || plate.kind === 'tritan' ? ANCHORS.neutral : plate.kind === 'demo' ? ANCHORS.demo : ANCHORS.warm;
  return dots.map((dot) => {
    const inA = a ? inFigure(a, dot.x, dot.y) : false;
    const inB = b ? inFigure(b, dot.x, dot.y) : false;
    const anchor = pool[Math.floor(rng.next() * pool.length)]!;
    const lum = (rng.next() * 2 - 1) * 0.15;
    const j = () => (rng.next() * 2 - 1) * 0.012;
    let d: Vec3 = [lum + j(), lum + j(), lum + j() + (rng.next() * 2 - 1) * 0.06];
    const add = (v: Vec3) => (d = [d[0] + v[0], d[1] + v[1], d[2] + v[2]]);
    switch (plate.kind) {
      case 'demo':
        add(inA ? [0.24, -0.06, -0.55] : [-0.12, 0.06, 0.32]);
        break;
      case 'vanish':
      case 'path': {
        const s = inA ? 1 : -1;
        add([s * RG_DELTA * k, -s * RG_DELTA * k, inA ? -0.04 : 0.02]);
        break;
      }
      case 'transform': {
        const s = inA ? 1 : -1;
        add([s * RG_DELTA * k, -s * RG_DELTA * k, 0]);
        if (inB) add([-0.05, -0.05, 0.2]);
        break;
      }
      case 'hidden': {
        const s = rng.next() < 0.5 ? 1 : -1;
        add([s * RG_DELTA * 1.1, -s * RG_DELTA * 1.1, 0]);
        if (inB) add([-0.06, -0.06, 0.24]);
        break;
      }
      case 'classify':
        if (inA) add([0.2 * k, 0, 0]); // protan confusion line: L only
        else if (inB) add([0, -0.2 * k, 0]); // deutan confusion line: M only
        break;
      case 'tritan':
        add(inA ? [0, 0, 0.5 * k] : [0, 0, -0.12]); // tritan confusion line: S only
        break;
    }
    return clampRgb(offsetLms(anchor, d));
  });
}

/** How this eye would perceive the plate colours (teaching simulation). */
export function perceivedColors(colors: readonly Vec3[], eye: EyeVision): Vec3[] {
  const d = deficit(eye.cv);
  const t = eye.cv.type;
  if (t === 'normal' || (d.rg === 0 && d.by === 0)) return colors.map((c) => [...c] as Vec3);
  if (t === 'protan' || t === 'deutan') return colors.map((c) => clampRgb(simulate(c, t, d.rg)));
  if (t === 'tritan') return colors.map((c) => clampRgb(simulate(c, 'tritan', d.by)));
  if (t === 'acquired-blue-yellow') return colors.map((c) => clampRgb(simulate(simulateAcquired(c, d.rg, 0.5), 'tritan', d.by * 0.9)));
  return colors.map((c) => clampRgb(simulateAcquired(c, d.rg)));
}
