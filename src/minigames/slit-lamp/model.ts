/**
 * Pure model of the slit-lamp examination: the instrument setting, which signs
 * are optically resolvable under which setting (`clarity`), where the signs sit
 * on the eye (`buildSites`), how a player's tag is judged and how the whole
 * session is scored. Nothing here touches the DOM.
 *
 * Coordinates are millimetres from the corneal centre, image axes
 * (+x = examiner's right, +y = down). OD temporal is on the examiner's left.
 */
import { createRng, type Eye, type Locale, type PatientFindings } from '@core';
import { HINT_HE, TECHNIQUE_HE } from './he';
import { eyeGeometry, stainGeometry, type EyeState } from '@render';
import {
  conjPath, corneaPath, irisPath, lensPath, lidPath, parseSelection, REGION_IDS, regionOf, type RegionId,
} from './vocab';

/** +1 when the nasal side of this eye is on the examiner's right (OD). */
export const nasalSignOf = (eye: Eye): 1 | -1 => (eye === 'OD' ? 1 : -1);

// ───────────────────────── instrument

export type Technique = 'diffuse' | 'broad' | 'section' | 'conical' | 'retro';
export type FilterId = 'white' | 'cobalt' | 'redfree';
export type Mag = 10 | 16 | 25;
export const MAGS: readonly Mag[] = [10, 16, 25];

export interface LampSetting {
  /** Beam width in mm (0.05 slit … 12 diffuser). */
  widthMm: number;
  /** Height-limited 1 × 1 mm beam (the "cone"). */
  short: boolean;
  retro: boolean;
  /** Angle between illumination and viewing arm, degrees; sign = side. */
  angle: number;
  mag: Mag;
  filter: FilterId;
  lightsOff: boolean;
}

export const TECHNIQUES: Technique[] = ['diffuse', 'broad', 'section', 'conical', 'retro'];
export const TECHNIQUE_LABEL: Record<Technique, string> = {
  diffuse: 'Diffuse', broad: 'Broad', section: 'Section', conical: 'Cone', retro: 'Retro',
};

/** Technique name in the edition's language. */
export const techniqueLabel = (t: Technique, locale: Locale = 'en'): string => (locale === 'he' ? TECHNIQUE_HE[t] : TECHNIQUE_LABEL[t]);

export function technique(s: LampSetting): Technique {
  if (s.retro) return 'retro';
  if (s.short) return 'conical';
  if (s.widthMm >= 8) return 'diffuse';
  if (s.widthMm >= 1.5) return 'broad';
  return 'section';
}

export function presetSetting(t: Technique, prev: LampSetting): LampSetting {
  const side = prev.angle < 0 ? -1 : 1;
  const a = Math.max(15, Math.abs(prev.angle));
  switch (t) {
    case 'diffuse': return { ...prev, widthMm: 12, short: false, retro: false, angle: side * Math.min(a, 30) };
    case 'broad': return { ...prev, widthMm: 3, short: false, retro: false, angle: side * Math.min(a, 45) };
    case 'section': return { ...prev, widthMm: 0.15, short: false, retro: false, angle: side * Math.max(a, 40) };
    case 'conical': return { ...prev, widthMm: 1, short: true, retro: false, angle: side * Math.max(30, Math.min(a, 60)) };
    case 'retro': return { ...prev, widthMm: 2.2, short: false, retro: true, angle: side * Math.min(a, 15) };
  }
}

/** Illumination arm on the temporal side — where an examiner normally sets it. */
export const temporalSide = (eye: Eye): 1 | -1 => (eye === 'OD' ? 1 : -1);

export function defaultSetting(eye: Eye): LampSetting {
  return { widthMm: 12, short: false, retro: false, angle: 30 * temporalSide(eye), mag: 10, filter: 'white', lightsOff: false };
}

/** Field of view (mm across) for a magnification. */
export const windowMm = (mag: Mag): number => 34 / ZOOM[mag];
export const ZOOM: Record<Mag, number> = { 10: 1, 16: 1.64, 25: 2.77 };

/** The part of the beam that actually lights tissue (mm, across). */
export function beamWidth(s: LampSetting): number {
  return technique(s) === 'diffuse' ? 40 : s.short ? 1 : s.widthMm;
}

// ───────────────────────── optics: what can be resolved?

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * How clearly a sign can be seen with this setting, 0..1 (≥ 0.5 = resolvable).
 * `grade` lets dense lens opacities show through coarser views.
 */
export function clarity(sign: string, s: LampSetting, grade = 0): number {
  const tech = technique(s);
  const hi = s.mag >= 16;
  const white = s.filter === 'cobalt' ? 0.28 : 1;
  const by = (m: Partial<Record<Technique, number>>) => m[tech] ?? 0;
  const a = Math.abs(s.angle);
  switch (sign) {
    // — lids & conjunctiva: bright, broad light at modest power
    case 'lids/ptosis': case 'lids/lid-edema': case 'lids/chalazion': case 'lids/hordeolum':
    case 'lids/ectropion': case 'lids/entropion': case 'lids/meibomian-dysfunction':
    case 'conj/injection/diffuse-injection': case 'conj/injection/ciliary-flush': case 'conj/injection/sectoral-injection':
    case 'conj/discharge/discharge-mucopurulent': case 'conj/discharge/discharge-watery': case 'conj/discharge/discharge-stringy':
    case 'conj/subconjunctival-hemorrhage': case 'conj/pinguecula': case 'conj/pterygium': case 'conj/chemosis':
      return white * by({ diffuse: 1, broad: 0.9, section: 0.25, conical: 0.2, retro: 0.2 });
    case 'lids/anterior-blepharitis': case 'lids/trichiasis': case 'lids/vesicles':
    case 'conj/papillae': case 'conj/giant-papillae': case 'conj/follicles':
      return white * by({ diffuse: hi ? 1 : 0.4, broad: hi ? 0.95 : 0.4, section: 0.2, conical: 0.2, retro: 0.2 });
    // — cornea
    case 'cornea/stroma/ulcer': case 'cornea/stroma/infiltrate': case 'cornea/deposits/foreign-body':
    case 'cornea/deposits/rust-ring': case 'cornea/stroma/pannus':
      return white * by({ diffuse: 0.95, broad: 1, section: 0.8, conical: 0.4, retro: 0.5 });
    case 'cornea/stroma/edema':
      return white * by({ diffuse: 0.7, broad: 1, section: 0.85, conical: 0.4, retro: 0.9 });
    case 'cornea/epithelium/punctate-keratitis': case 'cornea/epithelium/abrasion':
    case 'cornea/epithelium/dendrite': case 'cornea/epithelium/pseudodendrite':
      return white * (hi ? 1 : 0.45) * by({ diffuse: 0.5, broad: 1, section: 0.9, conical: 0.3, retro: 0.55 });
    case 'cornea/deposits/keratic-precipitates':
      return white * (hi ? 1 : 0.45) * by({ diffuse: 0.3, broad: 1, section: 1, conical: 0.3, retro: 0.8 });
    case 'cornea/deposits/fleischer-ring':
      return (hi ? 1 : 0.6) * (s.filter === 'cobalt' ? 1 : s.filter === 'redfree' ? 0.35 : 1) * by({ diffuse: 0.45, broad: 0.8, section: 0.6, conical: 0.2, retro: 0.3 });
    case 'cornea/stroma/vogt-striae':
      return white * (hi ? 1 : 0.5) * by({ diffuse: 0.15, broad: 0.45, section: 1, conical: 0.2, retro: 0.3 });
    case 'cornea/stroma/cone-thinning':
      return white * by({ diffuse: 0.4, broad: 0.8, section: 1, conical: 0.2, retro: 0.4 });
    // — chamber
    case 'chamber/van-herick':
      return tech === 'section' ? (a >= 40 ? 1 : a >= 28 ? 0.55 : 0.25) * (s.widthMm <= 0.4 ? 1 : 0.5) : tech === 'broad' ? 0.1 : 0.1;
    case 'chamber/cells': case 'chamber/flare': {
      const base = tech === 'conical' ? 1 : tech === 'section' && s.widthMm <= 0.6 ? 0.55 : 0.08;
      const magF = s.mag === 25 ? 1 : s.mag === 16 ? 0.85 : 0.3;
      const darkF = s.lightsOff ? 1 : 0.4;
      const angF = a >= 30 && a <= 65 ? 1 : a >= 15 && a <= 75 ? 0.7 : 0.35;
      return clamp01(base * magF * darkF * angF * (s.filter === 'cobalt' ? 0.25 : 1));
    }
    case 'chamber/hypopyon': case 'chamber/hyphema':
      return white * by({ diffuse: 1, broad: 1, section: 0.7, conical: 0.4, retro: 0.3 });
    // — iris
    case 'iris/posterior-synechiae':
      return white * by({ diffuse: 1, broad: 1, section: 0.35, conical: 0.2, retro: 0.6 });
    case 'iris/neovascularization':
      return white * by({ diffuse: hi ? 1 : 0.4, broad: hi ? 1 : 0.4, section: 0.2, conical: 0.15, retro: 0.2 });
    case 'iris/transillumination':
      return white * by({ diffuse: 0.15, broad: 0.2, section: 0.1, conical: 0.1, retro: 1 });
    case 'iris/heterochromia': case 'iris/nevus':
      return white * by({ diffuse: 1, broad: 1, section: 0.4, conical: 0.2, retro: 0.3 });
    // — lens
    case 'lens/nuclear-sclerosis':
      return white * (hi ? 1 : 0.75) * by({ diffuse: grade >= 3 ? 0.55 : 0.3, broad: 0.45, section: 1, conical: 0.3, retro: 0.6 });
    case 'lens/cortical-cataract':
      return white * (hi ? 1 : 0.7) * by({ diffuse: grade >= 3 ? 0.55 : 0.25, broad: 0.4, section: 0.9, conical: 0.3, retro: 1 });
    case 'lens/posterior-subcapsular':
      return white * (hi ? 1 : 0.6) * by({ diffuse: grade >= 4 ? 0.5 : 0.2, broad: 0.3, section: 0.85, conical: 0.3, retro: 1 });
    case 'lens/iol':
      return white * by({ diffuse: 0.9, broad: 0.9, section: 0.9, conical: 0.4, retro: 0.8 });
    case 'lens/phacodonesis':
      return white * by({ diffuse: 0.9, broad: 0.9, section: 0.5, conical: 0.2, retro: 0.3 });
    default:
      return 0.6;
  }
}

export const RESOLVABLE = 0.5;

/** One-line instruction on how to bring a sign into view (the Hint button). */
export function techniqueHint(sign: string, locale: Locale = 'en'): string {
  const he = locale === 'he';
  const r = regionOf(sign);
  if (sign === 'chamber/van-herick') return he ? HINT_HE.vanHerick : 'Thin section (~0.15 mm), arm at 45–60°, aimed at the temporal limbus.';
  if (sign === 'chamber/cells' || sign === 'chamber/flare') return he ? HINT_HE.cellsFlare : 'Room lights off, 1 mm cone, 25×, arm 45–60°, aimed through the pupil.';
  if (sign === 'chamber/hypopyon' || sign === 'chamber/hyphema') return he ? HINT_HE.hypopyonHyphema : 'Broad or diffuse light — gravity pools the level in the lower chamber.';
  if (sign === 'cornea/deposits/fleischer-ring') return he ? HINT_HE.fleischer : 'Cobalt blue filter highlights the iron line round the cone base.';
  if (sign === 'cornea/stroma/vogt-striae' || sign === 'cornea/stroma/cone-thinning') return he ? HINT_HE.vogtCone : 'Optic section through the cone; Vogt striae sit deep in the stroma.';
  if (sign.startsWith('cornea/')) return he ? HINT_HE.cornea : 'Parallelepiped or optic section at 16× or more, scanning the cornea.';
  if (sign === 'iris/transillumination') return he ? HINT_HE.transillum : 'Retro-illumination: bounce light off the fundus and look for light through the iris.';
  if (sign.startsWith('iris/')) return he ? HINT_HE.iris : 'Broad beam or diffuse light, 16×, across the iris surface.';
  if (sign.startsWith('lens/')) return he ? HINT_HE.lens : 'Optic section through the pupil, or retro-illumination against the red reflex, 16×+.';
  if (r === 'lids' || r === 'conj') return he ? HINT_HE.lidsConj : 'Diffuse light at low power — then 16× for fine detail such as follicles.';
  return he ? HINT_HE.fallback : 'Change the beam, magnification or filter and look again.';
}

// ───────────────────────── sites: where the true signs are

export interface Site {
  id: string;
  eye: Eye;
  region: RegionId;
  /** Menu path of the sign (no grade). */
  sign: string;
  /** True grade id for graded signs. */
  grade?: string;
  /** Circle anchor (mm); ignored when `zone` is set. */
  x: number;
  y: number;
  radius: number;
  /** Matches any click inside this anatomical zone. */
  zone?: 'lids' | 'conj' | 'cornea';
  weight: number;
}

type Pt = [number, number];
const centroid = (pts: Pt[]): Pt => {
  const n = Math.max(1, pts.length);
  return [pts.reduce((a, p) => a + p[0], 0) / n, pts.reduce((a, p) => a + p[1], 0) / n];
};

/** Mirrors the renderer's private lesion placement so tags line up with what is drawn. */
export function lesionSpot(seed: number, kind: 'ulcer' | 'infiltrate' | 'fb'): { x: number; y: number; r: number } {
  const rng = createRng(seed ^ (kind === 'ulcer' ? 0x0c1 : kind === 'infiltrate' ? 0x1f1 : 0xfb));
  if (kind === 'infiltrate') {
    const a = rng.float(0, Math.PI * 2);
    return { x: Math.cos(a) * 3.9, y: Math.sin(a) * 3.9, r: rng.float(0.45, 0.75) };
  }
  if (kind === 'fb') return { x: rng.float(-2, 2), y: rng.float(-1.2, 2.2), r: 0.18 };
  return { x: rng.float(-1.2, 1.2), y: rng.float(0, 1.8), r: rng.float(0.9, 1.3) };
}

/** Where the keratoconic cone sits (also used by the overlay painter). */
export function conePos(seed: number, eye: Eye): { x: number; y: number } {
  const rng = createRng(seed ^ 0xc0ae);
  return { x: rng.float(-0.4, 0.4) + nasalSignOf(eye) * 0.2, y: rng.float(1.2, 1.9) };
}

export function buildSites(f: PatientFindings, eye: Eye, seed: number): Site[] {
  const a = f.anterior[eye];
  const out: Site[] = [];
  const add = (sign: string | undefined, region: RegionId, shape: { x?: number; y?: number; r?: number; zone?: Site['zone'] }, grade?: string, weight = 1) => {
    if (!sign) return;
    out.push({
      id: `${eye}:${sign}`, eye, region, sign, grade, x: shape.x ?? 0, y: shape.y ?? 0, radius: shape.r ?? 0, zone: shape.zone, weight,
    });
  };
  const nas = nasalSignOf(eye);
  for (const l of a.lids) if (l !== 'normal') add(lidPath(l), 'lids', { zone: 'lids' });
  for (const c of a.conjunctiva) {
    if (c === 'normal' || c === 'preauricular-node') continue;
    if (c === 'pterygium') add(conjPath(c), 'conj', { x: nas * 7.2, y: 0.4, r: 3.4 });
    else add(conjPath(c), 'conj', { zone: 'conj' });
  }
  const dendr = centroid(stainGeometry('dendritic', seed).lines.flatMap((l) => l.pts));
  const abr = centroid(stainGeometry('linear-abrasion', seed).blobs.flatMap((b) => b.pts));
  const cone = conePos(seed, eye);
  for (const c of a.cornea) {
    const p = corneaPath(c);
    if (!p) continue;
    switch (c) {
      case 'dendrite': case 'pseudodendrite': add(p, 'cornea', { x: dendr[0], y: dendr[1], r: 2.4 }); break;
      case 'abrasion': add(p, 'cornea', { x: abr[0], y: abr[1], r: 2.6 }); break;
      case 'ulcer': { const s = lesionSpot(seed, 'ulcer'); add(p, 'cornea', { x: s.x, y: s.y, r: s.r + 0.9 }); break; }
      case 'infiltrate': { const s = lesionSpot(seed, 'infiltrate'); add(p, 'cornea', { x: s.x, y: s.y, r: s.r + 1 }); break; }
      case 'foreign-body': case 'rust-ring': { const s = lesionSpot(seed, 'fb'); add(p, 'cornea', { x: s.x, y: s.y, r: 1.1 }); break; }
      case 'keratic-precipitates': add(p, 'cornea', { x: 0, y: 2.6, r: 2.8 }); break;
      case 'punctate-keratitis': add(p, 'cornea', { x: 0, y: 1.2, r: 4.4 }); break;
      case 'edema': add(p, 'cornea', { x: 0, y: 0, r: 5.6 }); break;
      case 'pannus': add(p, 'cornea', { x: 0, y: -4.2, r: 3.2 }); break;
      case 'vogt-striae': case 'cone-thinning': case 'fleischer-ring': add(p, 'cornea', { x: cone.x, y: cone.y, r: 2.7 }); break;
      default: break;
    }
  }
  // chamber: Van Herick is always measured; the rest only when present
  const ac = a.anteriorChamber;
  add('chamber/van-herick', 'chamber', { x: -nas * 5.0, y: 0.2, r: 2.4 }, String(ac.vanHerick), 1.4);
  if (ac.cells > 0) add('chamber/cells', 'chamber', { x: 0, y: 0, r: 5.4 }, String(ac.cells), 1.3);
  if (ac.flare > 0) add('chamber/flare', 'chamber', { x: 0, y: 0, r: 5.4 }, String(ac.flare), 1);
  if (ac.hypopyon) add('chamber/hypopyon', 'chamber', { x: 0, y: 4.2, r: 4.6 });
  if (ac.hyphema) add('chamber/hyphema', 'chamber', { x: 0, y: 4.2, r: 4.6 });
  for (const i of a.iris) {
    if (i === 'normal') continue;
    add(irisPath(i), 'iris', { x: 0, y: 0, r: 5.4 });
  }
  const lg = Math.max(1, Math.min(4, Math.round(a.lensGrade ?? 1)));
  for (const l of a.lens) {
    if (l === 'clear') continue;
    const p = lensPath(l);
    const graded = l === 'nuclear-sclerosis' || l === 'cortical-cataract' || l === 'posterior-subcapsular';
    add(p, 'lens', { x: 0, y: 0, r: 3.6 }, graded ? String(lg) : undefined, graded ? 1.2 : 1);
  }
  return out;
}

/** Which anatomical zone a point falls in, given the fissure outline (mm). */
export function zoneOf(fissure: Pt[], x: number, y: number): 'lids' | 'conj' | 'cornea' {
  let inside = false;
  for (let i = 0, j = fissure.length - 1; i < fissure.length; j = i++) {
    const [xi, yi] = fissure[i]!;
    const [xj, yj] = fissure[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  if (!inside) return 'lids';
  return Math.hypot(x, y) <= 5.9 ? 'cornea' : 'conj';
}

/** Fissure polygon in mm (+x examiner's right) for the current eye state. */
export function fissureMm(s: EyeState): Pt[] {
  const g = eyeGeometry(1000, 600, { ...s, gaze: { x: 0, y: 0 } });
  const pts = [...g.upper, ...g.lower];
  return pts.map(([x, y]) => [(x - g.ix) / g.pxmm, (y - g.iy) / g.pxmm] as Pt);
}

export function siteHit(site: Site, x: number, y: number, zone: 'lids' | 'conj' | 'cornea'): boolean {
  if (site.zone) return site.zone === zone || (site.zone === 'conj' && zone === 'cornea' && Math.hypot(x, y) > 5.2);
  return Math.hypot(x - site.x, y - site.y) <= site.radius;
}

/** Is the site inside what the beam actually lights (beam-based techniques)? */
export function beamCovers(site: Site, s: LampSetting, px: number, py: number): boolean {
  const tech = technique(s);
  if (tech === 'diffuse') return true;
  const w = beamWidth(s);
  const sx = site.zone ? px : site.x;
  const r = site.zone ? 0 : site.radius;
  if (Math.abs(sx - px) > w / 2 + r) return false;
  if (tech === 'conical') return Math.abs((site.zone ? py : site.y) - py) <= 0.5 + r;
  return true;
}

export function isResolvable(site: Site, s: LampSetting, px: number, py: number): boolean {
  const grade = site.grade ? Number(site.grade) : 0;
  return clarity(site.sign, s, grade) >= RESOLVABLE && beamCovers(site, s, px, py);
}

// ───────────────────────── tags

export type TagResult = 'correct' | 'partial' | 'wrong' | 'unseen';
export interface Tag {
  id: number;
  eye: Eye;
  x: number;
  y: number;
  sign: string;
  grade?: string;
  siteId?: string;
  result: TagResult;
  /** 0..1 of the site's weight earned */
  credit: number;
}

export interface TagInput {
  eye: Eye;
  x: number;
  y: number;
  zone: 'lids' | 'conj' | 'cornea';
  leaf: string;
}

const SIGN_SHARE = 0.65;

/** Judge a tag against the true sites. Pure. */
export function judgeTag(sites: Site[], taken: Set<string>, input: TagInput, s: LampSetting, px: number, py: number): Omit<Tag, 'id'> {
  const { sign, grade } = parseSelection(input.leaf);
  const base = { eye: input.eye, x: input.x, y: input.y, sign, grade };
  const cands = sites.filter((st) => st.eye === input.eye && st.sign === sign && !taken.has(st.id));
  const site = cands.find((c) => siteHit(c, input.x, input.y, input.zone));
  if (!site) return { ...base, result: 'wrong', credit: 0 };
  if (!isResolvable(site, s, px, py)) return { ...base, siteId: site.id, result: 'unseen', credit: 0 };
  if (site.grade === undefined) return { ...base, siteId: site.id, result: 'correct', credit: 1 };
  const diff = Math.abs(gradeValue(sign, grade) - gradeValue(sign, site.grade));
  if (diff === 0) return { ...base, siteId: site.id, result: 'correct', credit: 1 };
  return { ...base, siteId: site.id, result: 'partial', credit: SIGN_SHARE + (diff <= 1 ? (1 - SIGN_SHARE) * 0.5 : 0) };
}

/** Grades as ordinal steps (cells 0.5 → step 1 …). */
export function gradeValue(sign: string, grade?: string): number {
  if (grade === undefined) return 0;
  const g = Number(grade);
  if (sign === 'chamber/cells') return g === 0.5 ? 1 : g + 1;
  return g;
}

// ───────────────────────── coverage of the examination

export type Coverage = Record<RegionId, number>;
export const emptyCoverage = (): Coverage => ({ lids: 0, conj: 0, cornea: 0, chamber: 0, iris: 0, lens: 0 });
export const COVER_SECONDS: Record<RegionId, number> = { lids: 1.0, conj: 1.0, cornea: 1.6, chamber: 1.6, iris: 1.2, lens: 1.6 };

/** Is the examiner currently looking at this region the right way? */
export function regionActive(region: RegionId, s: LampSetting, px: number, py: number): boolean {
  const half = windowMm(s.mag) / 2;
  const tech = technique(s);
  switch (region) {
    case 'lids':
      return clarity('lids/ptosis', s) >= RESOLVABLE && (py - half <= -5 || py + half >= 5);
    case 'conj':
      return clarity('conj/pinguecula', s) >= RESOLVABLE && Math.abs(px) + half >= 8;
    case 'cornea':
      return clarity('cornea/deposits/keratic-precipitates', s) >= 0.8 && Math.abs(px) <= 4.5 && Math.abs(py) <= 3.6;
    case 'chamber':
      return clarity('chamber/cells', s) >= 0.7 && Math.abs(px) <= 3.6 && Math.abs(py) <= 2.6 && (tech === 'conical' || tech === 'section');
    case 'iris':
      return clarity('iris/neovascularization', s) >= 0.8 && Math.abs(px) <= 5.6;
    case 'lens':
      return clarity('lens/cortical-cataract', s) >= 0.7 && Math.abs(px) <= 2.8 && Math.abs(py) <= 2.8;
  }
}

export const coveredCount = (c: Coverage): number => REGION_IDS.filter((r) => c[r] >= COVER_SECONDS[r]).length;

// ───────────────────────── scoring

export interface SessionScore {
  recall: number;
  coverage: number;
  wrong: number;
  found: number;
  total: number;
  accuracy: number;
  perfect: boolean;
}

/** Time allowance: full marks inside 4 minutes, fading to none at 9. */
export const timeFactor = (ms: number): number => clamp01(1 - (ms / 1000 - 240) / 300);

export function scoreSession(sites: Site[], tags: Tag[], cov: Record<Eye, Coverage>, hints: number, timeMs = 0): SessionScore {
  const credit = new Map<string, number>();
  let wrong = 0;
  for (const t of tags) {
    if (t.result === 'wrong' || t.result === 'unseen') wrong += 1;
    else if (t.siteId) credit.set(t.siteId, Math.max(credit.get(t.siteId) ?? 0, t.credit));
  }
  const totalW = sites.reduce((a, st) => a + st.weight, 0) || 1;
  const gained = sites.reduce((a, st) => a + st.weight * (credit.get(st.id) ?? 0), 0);
  const recall = gained / totalW;
  const found = sites.filter((st) => (credit.get(st.id) ?? 0) > 0).length;
  const cells = (['OD', 'OS'] as Eye[]).flatMap((e) => REGION_IDS.map((r) => clamp01(cov[e][r] / COVER_SECONDS[r])));
  const coverage = cells.reduce((a, b) => a + b, 0) / cells.length;
  const effort = Math.min(1, recall + coverage);
  const accuracy = clamp01(recall * 0.62 + coverage * 0.26 + (clamp01(1 - hints * 0.25) * 0.07 + timeFactor(timeMs) * 0.05) * effort - Math.min(0.3, wrong * 0.05));
  const perfect = recall >= 0.999 && coverage >= 0.999 && wrong === 0 && hints === 0;
  return { recall, coverage, wrong, found, total: sites.length, accuracy, perfect };
}

/** Sign path → region helper re-exported for UI. */
export { regionOf };
