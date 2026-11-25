/**
 * Ophthalmoscopy — pure model: tag taxonomy, ground truth extracted from the
 * patient's PosteriorSegment, tag matching and scoring. No DOM, no canvas.
 */
import { hashString, type Eye, type LesionType, type OpticDisc, type PatientFindings, type PosteriorSegment, type RedReflex } from '@core';
import { fundusMap, isDetachedAt, type FundusMap } from '@render';

// ───────────────────────── tag taxonomy

export type TagKind =
  | Exclude<LesionType, 'drusen-small' | 'drusen-large'>
  | 'drusen'
  | 'retinal-detachment'
  | 'macula-ok';

export interface TagInfo {
  kind: TagKind;
  label: string;
  short: string;
  /** one-line teaching description */
  hint: string;
}

export const TAGS: Record<TagKind, TagInfo> = {
  'dot-blot-hemorrhage': { kind: 'dot-blot-hemorrhage', label: 'Dot-blot haemorrhage', short: 'Blot', hint: 'Round, dark red, deep in the retina (inner nuclear layer)' },
  'flame-hemorrhage': { kind: 'flame-hemorrhage', label: 'Flame haemorrhage', short: 'Flame', hint: 'Feathered streak that follows the nerve-fibre layer' },
  'preretinal-hemorrhage': { kind: 'preretinal-hemorrhage', label: 'Pre-retinal haemorrhage', short: 'Boat', hint: 'Boat-shaped bleed with a flat top, between retina and vitreous' },
  'subretinal-hemorrhage': { kind: 'subretinal-hemorrhage', label: 'Sub-retinal haemorrhage', short: 'Sub-ret', hint: 'Dark, dome-shaped bleed under the retina' },
  'disc-hemorrhage': { kind: 'disc-hemorrhage', label: 'Disc-margin haemorrhage', short: 'Disc bleed', hint: 'Splinter bleed crossing the rim' },
  'microaneurysm': { kind: 'microaneurysm', label: 'Microaneurysm', short: 'MA', hint: 'Tiny sharp red dot (< 125 µm)' },
  'cotton-wool-spot': { kind: 'cotton-wool-spot', label: 'Cotton-wool spot', short: 'CWS', hint: 'Fluffy white patch of nerve-fibre-layer ischaemia' },
  'hard-exudate': { kind: 'hard-exudate', label: 'Hard exudate', short: 'Exudate', hint: 'Waxy, sharp-edged yellow lipid, often in rings or a macular star' },
  'drusen': { kind: 'drusen', label: 'Drusen', short: 'Drusen', hint: 'Yellow-white sub-RPE deposits' },
  'retinal-whitening': { kind: 'retinal-whitening', label: 'Retinal whitening', short: 'Whitening', hint: 'Milky, swollen, ischaemic retina' },
  'cherry-red-spot': { kind: 'cherry-red-spot', label: 'Cherry-red spot', short: 'Cherry', hint: 'Red fovea against pale, ischaemic retina' },
  'neovascularization': { kind: 'neovascularization', label: 'Neovascularisation', short: 'NV', hint: 'Fine, fragile new vessels on the disc (NVD) or elsewhere (NVE)' },
  'venous-beading': { kind: 'venous-beading', label: 'Venous beading', short: 'Beading', hint: 'Sausage-like irregular vein calibre' },
  'irma': { kind: 'irma', label: 'IRMA', short: 'IRMA', hint: 'Intraretinal microvascular abnormality: tortuous shunt vessels' },
  'hollenhorst-plaque': { kind: 'hollenhorst-plaque', label: 'Embolus (Hollenhorst)', short: 'Embolus', hint: 'Bright cholesterol plaque at an arteriolar bifurcation' },
  'macular-edema': { kind: 'macular-edema', label: 'Macular oedema', short: 'Oedema', hint: 'Thickened, glistening macula with a lost foveal reflex' },
  'geographic-atrophy': { kind: 'geographic-atrophy', label: 'Geographic atrophy', short: 'Atrophy', hint: 'Sharply demarcated area of RPE loss with visible choroid' },
  'pigment-clumping': { kind: 'pigment-clumping', label: 'Pigment clumping', short: 'Pigment', hint: 'Dark RPE clumps' },
  'macular-hole': { kind: 'macular-hole', label: 'Macular hole', short: 'Hole', hint: 'Round, punched-out red defect at the fovea' },
  'epiretinal-membrane': { kind: 'epiretinal-membrane', label: 'Epiretinal membrane', short: 'ERM', hint: 'Cellophane sheen with fine retinal striae' },
  'laser-scars': { kind: 'laser-scars', label: 'Laser scars', short: 'Laser', hint: 'Evenly spaced pigmented burns from photocoagulation' },
  'nevus': { kind: 'nevus', label: 'Choroidal naevus', short: 'Naevus', hint: 'Flat, slate-grey, well-defined choroidal lesion' },
  'retinal-tear': { kind: 'retinal-tear', label: 'Retinal tear', short: 'Tear', hint: 'Horseshoe-shaped red break' },
  'lattice': { kind: 'lattice', label: 'Lattice degeneration', short: 'Lattice', hint: 'Spindle-shaped thinned area with white lines' },
  'retinal-detachment': { kind: 'retinal-detachment', label: 'Retinal detachment', short: 'Detached', hint: 'Grey, billowing retina with folds' },
  'macula-ok': { kind: 'macula-ok', label: 'Macula healthy', short: 'Macula OK', hint: 'Flat macula with a bright foveal reflex' },
};

export interface TagGroup {
  id: string;
  label: string;
  kinds: TagKind[];
}

/** Second-level radial menus. */
export const TAG_GROUPS: TagGroup[] = [
  { id: 'bleeds', label: 'Haemorrhages', kinds: ['dot-blot-hemorrhage', 'flame-hemorrhage', 'preretinal-hemorrhage', 'subretinal-hemorrhage', 'disc-hemorrhage'] },
  { id: 'bright', label: 'Exudates & spots', kinds: ['cotton-wool-spot', 'hard-exudate', 'drusen', 'retinal-whitening', 'cherry-red-spot'] },
  { id: 'vascular', label: 'Vessel lesions', kinds: ['microaneurysm', 'neovascularization', 'venous-beading', 'irma', 'hollenhorst-plaque'] },
  { id: 'macular', label: 'Macula & pigment', kinds: ['macular-edema', 'geographic-atrophy', 'pigment-clumping', 'macular-hole', 'epiretinal-membrane', 'laser-scars', 'nevus'] },
  { id: 'periphery', label: 'Periphery', kinds: ['retinal-tear', 'lattice', 'retinal-detachment'] },
];

export function kindOf(t: LesionType): TagKind {
  return t === 'drusen-small' || t === 'drusen-large' ? 'drusen' : t;
}

const FAMILY: Partial<Record<TagKind, string>> = {
  'microaneurysm': 'red-dot',
  'dot-blot-hemorrhage': 'red-dot',
  'venous-beading': 'dr-vessel',
  'irma': 'dr-vessel',
};

export const MACULAR_TYPES: ReadonlySet<LesionType> = new Set<LesionType>([
  'macular-edema', 'macular-hole', 'epiretinal-membrane', 'geographic-atrophy', 'cherry-red-spot',
]);

/** Findings the chart treats as time-critical. */
export const CRITICAL_TYPES: ReadonlySet<LesionType> = new Set<LesionType>([
  'cherry-red-spot', 'retinal-whitening', 'subretinal-hemorrhage', 'retinal-tear', 'neovascularization', 'preretinal-hemorrhage',
]);

// ───────────────────────── truth

export interface TruthItem {
  id: string;
  kind: TagKind;
  label: string;
}

export type ReflexChoice = 'normal' | 'dull' | 'absent' | 'leukocoria';
export const REFLEX_CHOICES: readonly ReflexChoice[] = ['normal', 'dull', 'absent', 'leukocoria'];

export function reflexTruth(r: RedReflex): ReflexChoice {
  return r === 'asymmetric' ? 'dull' : r;
}

/** Media opacity dense enough that the fundus cannot be properly seen. */
export function viewObscured(r: RedReflex): boolean {
  return r === 'absent' || r === 'leukocoria';
}

export type VesselBucket = 'normal' | 'narrow' | 'severe';
export const BUCKETS: readonly VesselBucket[] = ['normal', 'narrow', 'severe'];
export const BUCKET_LABEL: Record<VesselBucket, string> = { normal: '2:3 (normal)', narrow: '1:2 (narrowed)', severe: '1:3 or less (severe)' };

export function avBucket(ratio: number): VesselBucket {
  return ratio >= 0.6 ? 'normal' : ratio >= 0.45 ? 'narrow' : 'severe';
}

export type DiscMargins = OpticDisc['margins'];
export type DiscColor = OpticDisc['color'];
export type Rim = NonNullable<OpticDisc['rimThinning']>;

export interface DiscCall {
  cdr: number;
  color: DiscColor;
  margins: DiscMargins;
  rim: Rim;
}

export interface VesselCall {
  bucket: VesselBucket;
  nicking: boolean;
  copper: boolean;
  /** dilated and/or tortuous veins */
  venous: boolean;
  /** boxcar segmentation of arterioles */
  segmentation: boolean;
}

export type VitreousCall = PosteriorSegment['vitreous'];
export const VITREOUS_CHOICES: readonly VitreousCall[] = ['clear', 'floaters', 'weiss-ring', 'hemorrhage', 'cells', 'pigment-shafer'];
export const VITREOUS_LABEL: Record<VitreousCall, string> = {
  'clear': 'Clear', 'floaters': 'Floaters', 'weiss-ring': 'Weiss ring', 'hemorrhage': 'Haemorrhage', 'cells': 'Cells / haze', 'pigment-shafer': 'Pigment dust',
};

export function isSwollen(d: OpticDisc): boolean {
  return !!d.edema || d.margins === 'elevated';
}

/** What the player can actually see: swollen discs hide the cup (the painter fills it in). */
export function effectiveCdr(d: OpticDisc): number {
  return isSwollen(d) ? Math.min(d.cdr, 0.12) : d.cdr;
}

export function discTruth(d: OpticDisc): DiscCall {
  return {
    cdr: effectiveCdr(d),
    color: d.color,
    margins: d.edema && d.margins === 'sharp' ? 'elevated' : d.margins,
    rim: d.rimThinning ?? 'none',
  };
}

export function vesselTruth(post: PosteriorSegment): VesselCall {
  const v = post.vessels;
  return {
    bucket: avBucket(v.avRatio),
    nicking: v.avNicking,
    copper: v.copperWiring,
    venous: v.venousDilation || v.tortuosity === 'increased',
    segmentation: !!v.segmentation,
  };
}

export function maculaAbnormal(post: PosteriorSegment): boolean {
  return post.lesions.some((l) => l.zone === 'macula' || MACULAR_TYPES.has(l.type)) || !!post.detachment?.maculaOff;
}

export interface EyeTruth {
  eye: Eye;
  seed: number;
  map: FundusMap;
  items: TruthItem[];
  disc: DiscCall;
  vessels: VesselCall;
  maculaNormal: boolean;
  vitreous: VitreousCall;
  reflex: ReflexChoice;
  obscured: boolean;
}

export function seedFor(patientName: string, eye: Eye): number {
  return (hashString(`fundus:${patientName}`) % 90000) + (eye === 'OD' ? 11 : 29);
}

export function truthFor(f: PatientFindings, eye: Eye, seed: number): EyeTruth {
  const post = f.posterior[eye];
  const map = fundusMap(post, eye, seed);
  const items: TruthItem[] = [];
  const seen = new Set<number>();
  for (const m of map.lesions) {
    if (m.source < 0 || seen.has(m.source)) continue;
    seen.add(m.source);
    const kind = kindOf(m.type as LesionType);
    items.push({ id: `les:${m.source}`, kind, label: TAGS[kind].label });
  }
  if (map.detachment) items.push({ id: 'det', kind: 'retinal-detachment', label: TAGS['retinal-detachment'].label });
  const maculaNormal = !maculaAbnormal(post);
  if (maculaNormal) items.push({ id: 'macula', kind: 'macula-ok', label: TAGS['macula-ok'].label });
  return {
    eye, seed, map, items,
    disc: discTruth(post.disc),
    vessels: vesselTruth(post),
    maculaNormal,
    vitreous: post.vitreous,
    reflex: reflexTruth(f.redReflex[eye]),
    obscured: viewObscured(f.redReflex[eye]),
  };
}

// ───────────────────────── tag matching

export interface Tag {
  id: number;
  kind: TagKind;
  x: number;
  y: number;
  /** hit tolerance (world units) captured at the zoom level the tag was placed at */
  tol?: number;
}

export type MatchReason = 'ok' | 'family' | 'wrong-type' | 'empty' | 'macula-abnormal' | 'macula-miss';
export interface TagMatch {
  itemId: string | null;
  quality: number;
  reason: MatchReason;
  /** when the tag sat on a real lesion of another type */
  actual?: TagKind;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

/** Tolerance (world units) that shrinks as the player zooms in: ~14 screen px. */
export function tolerance(sizePx: number, zoom: number): number {
  return Math.max(0.006, 14 / (sizePx * Math.max(1, zoom)));
}

export function matchTag(truth: EyeTruth, tag: Pick<Tag, 'kind' | 'x' | 'y' | 'tol'>, tolDefault: number): TagMatch {
  const { map } = truth;
  const tol = tag.tol ?? tolDefault;
  if (tag.kind === 'macula-ok') {
    const near = dist(tag.x, tag.y, map.fovea.x, map.fovea.y) <= map.macula.r * 1.7;
    if (!near) return { itemId: null, quality: 0, reason: 'macula-miss' };
    return truth.maculaNormal ? { itemId: 'macula', quality: 1, reason: 'ok' } : { itemId: null, quality: 0, reason: 'macula-abnormal' };
  }
  if (tag.kind === 'retinal-detachment') {
    return map.detachment && isDetachedAt(map, tag.x, tag.y) ? { itemId: 'det', quality: 1, reason: 'ok' } : { itemId: null, quality: 0, reason: 'empty' };
  }
  let best: TagMatch = { itemId: null, quality: 0, reason: 'empty' };
  for (const m of map.lesions) {
    if (m.source < 0) continue;
    if (dist(m.x, m.y, tag.x, tag.y) - m.r > tol) continue;
    const k = kindOf(m.type as LesionType);
    const fam = FAMILY[tag.kind];
    if (k === tag.kind) return { itemId: `les:${m.source}`, quality: 1, reason: 'ok' };
    if (fam && FAMILY[k] === fam && best.quality < 0.5) best = { itemId: `les:${m.source}`, quality: 0.5, reason: 'family', actual: k };
    else if (best.reason === 'empty') best = { itemId: null, quality: 0, reason: 'wrong-type', actual: k };
  }
  return best;
}

// ───────────────────────── scoring

export interface TagScore {
  recall: number;
  precision: number;
  f1: number;
  found: string[];
  missed: TruthItem[];
  falseTags: number;
  duplicates: number;
}

export function scoreTags(truth: EyeTruth, tags: Tag[], tol: number, misfires = 0): TagScore {
  const credit = new Map<string, number>();
  let falseTags = misfires;
  let duplicates = 0;
  for (const t of tags) {
    const m = matchTag(truth, t, tol);
    if (!m.itemId) {
      falseTags++;
      continue;
    }
    const prev = credit.get(m.itemId);
    if (prev !== undefined) {
      duplicates++;
      if (m.quality > prev) credit.set(m.itemId, m.quality);
      continue;
    }
    credit.set(m.itemId, m.quality);
  }
  const total = truth.items.length;
  const earned = [...credit.values()].reduce((s, q) => s + q, 0);
  // a dense media opacity hides the detail: do not punish what could not be seen
  const recall = total === 0 || truth.obscured ? 1 : earned / total;
  const tp = credit.size;
  const precision = tp + falseTags === 0 ? 1 : tp / (tp + falseTags);
  const f1 = recall + precision === 0 ? 0 : (2 * recall * precision) / (recall + precision);
  return {
    recall, precision, f1,
    found: [...credit.keys()],
    missed: truth.items.filter((i) => !credit.has(i.id)),
    falseTags, duplicates,
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Gold ≤ 0.05; fades to nothing at 0.25 off. */
export function cdrScore(estimate: number, truth: number): number {
  return clamp01(1 - Math.max(0, Math.abs(estimate - truth) - 0.05) / 0.2);
}

export function discScore(call: DiscCall | null, truth: DiscCall): { score: number; cdr: number } {
  if (!call) return { score: 0, cdr: 0 };
  const cdr = cdrScore(call.cdr, truth.cdr);
  const colour = call.color === truth.color ? 1 : (call.color === 'pale' && truth.color === 'pale-sectoral') || (call.color === 'pale-sectoral' && truth.color === 'pale') ? 0.5 : 0;
  const rank: Record<DiscMargins, number> = { sharp: 0, blurred: 1, elevated: 2 };
  const margins = call.margins === truth.margins ? 1 : Math.abs(rank[call.margins] - rank[truth.margins]) === 1 ? 0.5 : 0;
  const rim = call.rim === truth.rim ? 1 : call.rim !== 'none' && truth.rim !== 'none' ? 0.4 : 0;
  return { score: 0.5 * cdr + 0.5 * ((colour + margins + rim) / 3), cdr };
}

export function vesselScore(call: VesselCall | null, truth: VesselCall): number {
  if (!call) return 0;
  const bi = BUCKETS.indexOf(call.bucket);
  const ti = BUCKETS.indexOf(truth.bucket);
  const bucket = bi === ti ? 1 : Math.abs(bi - ti) === 1 ? 0.5 : 0;
  const flags = (['nicking', 'copper', 'venous', 'segmentation'] as const).filter((k) => call[k] === truth[k]).length / 4;
  return 0.4 * bucket + 0.6 * flags;
}

export function vitreousScore(call: VitreousCall | null, truth: VitreousCall): number {
  const c = call ?? 'clear';
  if (c === truth) return 1;
  const soft = new Set<VitreousCall>(['floaters', 'weiss-ring']);
  if (soft.has(c) && soft.has(truth)) return 0.6;
  if (c === 'clear' || truth === 'clear') return 0;
  return 0.3;
}

export function reflexScore(call: ReflexChoice | null, truth: ReflexChoice): number {
  if (!call) return 0;
  if (call === truth) return 1;
  return (call === 'dull' && truth === 'absent') || (call === 'absent' && truth === 'dull') ? 0.4 : 0;
}

export interface EyeWork {
  reflex: ReflexChoice | null;
  disc: DiscCall | null;
  vessels: VesselCall | null;
  vitreous: VitreousCall | null;
  tags: Tag[];
  misfires: number;
}

export interface EyeScore {
  eye: Eye;
  reflex: number;
  disc: number;
  cdr: number;
  vessels: number;
  vitreous: number;
  tags: TagScore;
  total: number;
  complete: boolean;
}

export const WEIGHTS = { reflex: 0.1, disc: 0.25, vessels: 0.15, tags: 0.42, vitreous: 0.08 } as const;

/** Has the player looked at the macula (any tag placed on it)? */
export function maculaTouched(truth: EyeTruth, work: EyeWork): boolean {
  const { fovea, macula } = truth.map;
  return work.tags.some((t) => dist(t.x, t.y, fovea.x, fovea.y) <= macula.r * 1.7);
}

export function eyeComplete(truth: EyeTruth, work: EyeWork): boolean {
  return !!work.disc && !!work.vessels && maculaTouched(truth, work);
}

export function scoreEye(truth: EyeTruth, work: EyeWork, tol: number): EyeScore {
  const tags = scoreTags(truth, work.tags, tol, work.misfires);
  const reflex = reflexScore(work.reflex, truth.reflex);
  const d = discScore(work.disc, truth.disc);
  const vessels = vesselScore(work.vessels, truth.vessels);
  const vit = vitreousScore(work.vitreous, truth.vitreous);
  const total = WEIGHTS.reflex * reflex + WEIGHTS.disc * d.score + WEIGHTS.vessels * vessels + WEIGHTS.tags * tags.f1 + WEIGHTS.vitreous * vit;
  return { eye: truth.eye, reflex, disc: d.score, cdr: d.cdr, vessels, vitreous: vit, tags, total, complete: eyeComplete(truth, work) };
}

export interface ExamScore {
  accuracy: number;
  perfect: boolean;
}

/** Both eyes count equally; a slow exam loses up to 8 %. */
export function scoreExam(scores: EyeScore[], timeMs: number): ExamScore {
  const mean = scores.reduce((s, e) => s + e.total, 0) / Math.max(1, scores.length);
  const slow = clamp01((timeMs / 1000 - 240) / 240);
  const accuracy = clamp01(mean * (1 - 0.08 * slow));
  const perfect = accuracy >= 0.93 && scores.every((s) => s.complete && s.tags.falseTags === 0 && s.tags.missed.length === 0);
  return { accuracy: Math.round(accuracy * 1000) / 1000, perfect };
}

// ───────────────────────── optics

/** Spherical equivalent of the patient's eye: the lens-wheel setting that focuses a direct ophthalmoscope. */
export function focusNeeded(f: PatientFindings, eye: Eye): number {
  const r = f.refraction[eye];
  return Math.max(-10, Math.min(10, Math.round(r.sphere + r.cylinder / 2)));
}

/** CSS blur (px) for a direct ophthalmoscope lens wheel set to `dial` D. */
export function focusBlur(dial: number, needed: number): number {
  return Math.min(9, Math.abs(dial - needed) * 1.25);
}
