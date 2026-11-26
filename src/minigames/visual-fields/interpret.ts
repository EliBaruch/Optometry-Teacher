/**
 * Clinical interpretation of field defects — pure.
 *
 * Each eye's FieldDefect is reduced to a canonical, GEOMETRIC pattern
 * (family + side as plotted: left/right = patient's left/right), so that
 * e.g. OS "temporal hemianopia" and OS "left hemianopia" are the same picture.
 * The binocular combination then localises the lesion along the pathway:
 * temporal halves of both eyes = chiasm; same side in both eyes = retrochiasmal
 * on the OPPOSITE side of the brain; anything else = pre-chiasmal (retina / nerve).
 */
import type { Eye, FieldDefect, Locale, RevealedFinding } from '@core';
import { iso, S, vfT, type AnatKey, type ChiasmWhat, type RetroWhat, type RetroWhere } from './strings';

export type Family =
  | 'full' | 'constricted' | 'central' | 'cecocentral' | 'blind-spot'
  | 'arcuate' | 'nasal-step' | 'altitudinal' | 'hemianopia' | 'quadrantanopia'
  | 'curtain' | 'island';

export type Side =
  | 'superior' | 'inferior' | 'left' | 'right'
  | 'superior-left' | 'superior-right' | 'inferior-left' | 'inferior-right';

export interface Pattern {
  family: Family;
  side?: Side;
}

export const FAMILIES: readonly Family[] = [
  'full', 'constricted', 'central', 'cecocentral', 'blind-spot', 'arcuate',
  'nasal-step', 'altitudinal', 'hemianopia', 'quadrantanopia', 'curtain', 'island',
];

export const FAMILY_LABEL: Record<Family, string> = S.en.famLabel;

export const FAMILY_SUB: Record<Family, string> = S.en.famSub;

export const FAMILY_SIDES: Record<Family, readonly Side[]> = {
  full: [], constricted: [], central: [], cecocentral: [], 'blind-spot': [], 'nasal-step': [], island: [],
  arcuate: ['superior', 'inferior'],
  altitudinal: ['superior', 'inferior'],
  hemianopia: ['left', 'right'],
  quadrantanopia: ['superior-left', 'superior-right', 'inferior-left', 'inferior-right'],
  curtain: ['superior', 'inferior', 'left', 'right'],
};

const temporalSide = (eye: Eye): 'left' | 'right' => (eye === 'OD' ? 'right' : 'left');
const nasalSide = (eye: Eye): 'left' | 'right' => (eye === 'OD' ? 'left' : 'right');

/** Field terms for a geometric side in this eye ("right" in OD = temporal). */
export function anatomicalSide(side: Side, eye: Eye, locale: Locale = 'en'): string {
  const lr = (s: 'left' | 'right') => (s === temporalSide(eye) ? 'temporal' : 'nasal');
  let key: AnatKey;
  switch (side) {
    case 'superior': key = 'superior'; break;
    case 'inferior': key = 'inferior'; break;
    case 'left': key = lr('left'); break;
    case 'right': key = lr('right'); break;
    case 'superior-left': key = `supero${lr('left')}`; break;
    case 'superior-right': key = `supero${lr('right')}`; break;
    case 'inferior-left': key = `infero${lr('left')}`; break;
    case 'inferior-right': key = `infero${lr('right')}`; break;
  }
  return vfT(locale).anat[key];
}

export const SIDE_LABEL: Record<Side, string> = S.en.sideLabel;

/** Canonical geometric pattern of a FieldDefect in a given eye. */
export function patternOf(defect: FieldDefect, eye: Eye): Pattern {
  switch (defect) {
    case 'full': return { family: 'full' };
    case 'constricted': return { family: 'constricted' };
    case 'central-scotoma': return { family: 'central' };
    case 'cecocentral-scotoma': return { family: 'cecocentral' };
    case 'enlarged-blind-spot': return { family: 'blind-spot' };
    case 'superior-arcuate': return { family: 'arcuate', side: 'superior' };
    case 'inferior-arcuate': return { family: 'arcuate', side: 'inferior' };
    case 'nasal-step': return { family: 'nasal-step' };
    case 'superior-altitudinal': return { family: 'altitudinal', side: 'superior' };
    case 'inferior-altitudinal': return { family: 'altitudinal', side: 'inferior' };
    case 'temporal-hemianopia': return { family: 'hemianopia', side: temporalSide(eye) };
    case 'nasal-hemianopia': return { family: 'hemianopia', side: nasalSide(eye) };
    case 'left-hemianopia': return { family: 'hemianopia', side: 'left' };
    case 'right-hemianopia': return { family: 'hemianopia', side: 'right' };
    case 'left-superior-quadrantanopia': return { family: 'quadrantanopia', side: 'superior-left' };
    case 'right-superior-quadrantanopia': return { family: 'quadrantanopia', side: 'superior-right' };
    case 'left-inferior-quadrantanopia': return { family: 'quadrantanopia', side: 'inferior-left' };
    case 'right-inferior-quadrantanopia': return { family: 'quadrantanopia', side: 'inferior-right' };
    case 'curtain-superior': return { family: 'curtain', side: 'superior' };
    case 'curtain-inferior': return { family: 'curtain', side: 'inferior' };
    case 'curtain-temporal': return { family: 'curtain', side: temporalSide(eye) };
    case 'curtain-nasal': return { family: 'curtain', side: nasalSide(eye) };
    case 'temporal-island': return { family: 'island' };
    default: return { family: 'full' };
  }
}

/** A representative FieldDefect for a pattern in an eye (for glyphs & previews). */
export function defectOf(p: Pattern, eye: Eye): FieldDefect {
  const s = p.side;
  switch (p.family) {
    case 'full': return 'full';
    case 'constricted': return 'constricted';
    case 'central': return 'central-scotoma';
    case 'cecocentral': return 'cecocentral-scotoma';
    case 'blind-spot': return 'enlarged-blind-spot';
    case 'arcuate': return s === 'inferior' ? 'inferior-arcuate' : 'superior-arcuate';
    case 'nasal-step': return 'nasal-step';
    case 'altitudinal': return s === 'inferior' ? 'inferior-altitudinal' : 'superior-altitudinal';
    case 'hemianopia': return s === 'left' ? 'left-hemianopia' : 'right-hemianopia';
    case 'quadrantanopia':
      return s === 'superior-left' ? 'left-superior-quadrantanopia'
        : s === 'inferior-left' ? 'left-inferior-quadrantanopia'
          : s === 'inferior-right' ? 'right-inferior-quadrantanopia' : 'right-superior-quadrantanopia';
    case 'curtain':
      if (s === 'inferior') return 'curtain-inferior';
      if (s === 'left' || s === 'right') return s === temporalSide(eye) ? 'curtain-temporal' : 'curtain-nasal';
      return 'curtain-superior';
    case 'island': return 'temporal-island';
  }
}

export const samePattern = (a: Pattern, b: Pattern) => a.family === b.family && (a.side ?? null) === (b.side ?? null);

/** Horizontal half of a hemianopic/quadrantic pattern, or null. */
function lateralHalf(p: Pattern): 'left' | 'right' | null {
  if (p.family !== 'hemianopia' && p.family !== 'quadrantanopia') return null;
  return p.side?.endsWith('left') ? 'left' : 'right';
}

// ───────────────────────── localisation

export type Localisation = 'none' | 'prechiasmal' | 'chiasm' | 'retro-right' | 'retro-left';

export const LOCALISATIONS: readonly Localisation[] = ['none', 'prechiasmal', 'chiasm', 'retro-right', 'retro-left'];

export const LOCALISATION_LABEL: Record<Localisation, string> = S.en.locLabel;

export const LOCALISATION_SUB: Record<Localisation, string> = S.en.locSub;

/** Where along the visual pathway is the lesion? */
export function localise(od: Pattern, os: Pattern): Localisation {
  if (od.family === 'full' && os.family === 'full') return 'none';
  const hOD = lateralHalf(od);
  const hOS = lateralHalf(os);
  if (hOD && hOS) {
    // Same half in both eyes = homonymous = retrochiasmal, on the OPPOSITE side.
    if (hOD === hOS) return hOD === 'left' ? 'retro-right' : 'retro-left';
    // Temporal halves of both eyes = bitemporal = chiasm.
    if (hOD === 'right' && hOS === 'left') return 'chiasm';
    return 'prechiasmal'; // binasal: two separate pre-chiasmal lesions
  }
  // A lone temporal hemianopia respecting the vertical midline: junctional (chiasmal) lesion.
  if ((hOD === 'right' && os.family === 'full') || (hOS === 'left' && od.family === 'full')) return 'chiasm';
  return 'prechiasmal';
}

// ───────────────────────── chart text

/** e.g. "Superior arcuate — respects the horizontal meridian". */
export function describeEye(defect: FieldDefect, eye: Eye, locale: Locale = 'en'): string {
  const t = vfT(locale);
  const p = patternOf(defect, eye);
  const anat = p.side ? anatomicalSide(p.side, eye, locale) : '';
  const out = ((): string => {
    switch (p.family) {
      case 'full': return t.dFull;
      case 'constricted': return t.dConstricted;
      case 'central': return t.dCentral;
      case 'cecocentral': return t.dCecocentral;
      case 'blind-spot': return t.dBlindSpot;
      case 'arcuate': return t.dArcuate(anat);
      case 'nasal-step': return t.dNasalStep;
      case 'altitudinal': return t.dAltitudinal(anat);
      case 'hemianopia': return t.dHemianopia(p.side === 'left' ? 'left' : 'right', anat);
      case 'quadrantanopia': return t.dQuadrant(t.sideLabel[p.side!], anat);
      case 'curtain': return t.dCurtain(anat);
      case 'island': return t.dIsland;
    }
  })();
  return iso(locale, out);
}

export function flagOf(defect: FieldDefect): RevealedFinding['flag'] {
  const f = patternOf(defect, 'OD').family;
  if (f === 'full') return 'normal';
  if (f === 'altitudinal' || f === 'hemianopia' || f === 'quadrantanopia' || f === 'curtain' || f === 'island') return 'critical';
  return 'abnormal';
}

/** What a monocular pattern points to (pre-chiasmal hint). */
export function monocularHint(f: Family, locale: Locale = 'en'): string {
  return vfT(locale).hints[f];
}

/** One-line localisation for the chart, with a hint where the lesion sits. */
export function localisationLine(od: FieldDefect, os: FieldDefect, locale: Locale = 'en'): { value: string; flag: RevealedFinding['flag'] } {
  const t = vfT(locale);
  const r = (value: string, flag: RevealedFinding['flag']) => ({ value: iso(locale, value), flag });
  const pOD = patternOf(od, 'OD');
  const pOS = patternOf(os, 'OS');
  const loc = localise(pOD, pOS);
  switch (loc) {
    case 'none':
      return r(t.lineNone, 'normal');
    case 'chiasm': {
      const both = pOD.family !== 'full' && pOS.family !== 'full';
      const quad = [pOD, pOS].find((p) => p.family === 'quadrantanopia');
      const key: ChiasmWhat = !both
        ? 'junctional'
        : quad ? (quad.side?.startsWith('inferior') ? 'bitemporal-inferior' : 'bitemporal-superior') : 'bitemporal';
      return r(t.lineChiasm(t.chiasmWhat[key]), 'critical');
    }
    case 'retro-right':
    case 'retro-left': {
      const field = loc === 'retro-right' ? 'left' : 'right';
      const brain = loc === 'retro-right' ? 'right' : 'left';
      const quads = [pOD, pOS].filter((p) => p.family === 'quadrantanopia');
      let where: RetroWhere = 'general';
      let what: RetroWhat = 'hemi';
      if (quads.length === 2) {
        const sup = quads.every((p) => p.side?.startsWith('superior'));
        const inf = quads.every((p) => p.side?.startsWith('inferior'));
        if (sup) { what = 'superior'; where = 'temporal'; }
        else if (inf) { what = 'inferior'; where = 'parietal'; }
      }
      return r(t.lineRetro(brain, field, t.retroWhat[what], t.retroWhere[where]), 'critical');
    }
    case 'prechiasmal': {
      const parts: string[] = [];
      const bilateral = pOD.family !== 'full' && pOS.family !== 'full';
      if (bilateral && pOD.family === 'blind-spot' && pOS.family === 'blind-spot') {
        return r(t.linePapilloedema, 'critical');
      }
      for (const [eye, p] of [['OD', pOD], ['OS', pOS]] as const) {
        if (p.family !== 'full') parts.push(t.linePrePart(eye, t.hints[p.family]));
      }
      const flag = [od, os].some((d) => flagOf(d) === 'critical') ? 'critical' : 'abnormal';
      return r(t.linePre(parts.join('; ')), flag);
    }
  }
}
