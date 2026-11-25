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
import type { Eye, FieldDefect, RevealedFinding } from '@core';

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

export const FAMILY_LABEL: Record<Family, string> = {
  full: 'Full field',
  constricted: 'Constriction',
  central: 'Central scotoma',
  cecocentral: 'Cecocentral scotoma',
  'blind-spot': 'Enlarged blind spot',
  arcuate: 'Arcuate',
  'nasal-step': 'Nasal step',
  altitudinal: 'Altitudinal',
  hemianopia: 'Hemianopia',
  quadrantanopia: 'Quadrantanopia',
  curtain: 'Peripheral curtain',
  island: 'Temporal island',
};

export const FAMILY_SUB: Record<Family, string> = {
  full: 'Only the physiological blind spot',
  constricted: 'Tunnel — periphery lost all round',
  central: 'Fixation lost',
  cecocentral: 'Fixation to blind spot',
  'blind-spot': 'Grown around the disc',
  arcuate: 'Arc from the blind spot',
  'nasal-step': 'Step at the nasal meridian',
  altitudinal: 'Upper or lower half',
  hemianopia: 'Half — respects vertical',
  quadrantanopia: 'One quarter',
  curtain: 'Edge loss, fixation spared',
  island: 'Almost all lost',
};

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
export function anatomicalSide(side: Side, eye: Eye): string {
  const lr = (s: 'left' | 'right') => (s === temporalSide(eye) ? 'temporal' : 'nasal');
  switch (side) {
    case 'superior': return 'superior';
    case 'inferior': return 'inferior';
    case 'left': return lr('left');
    case 'right': return lr('right');
    case 'superior-left': return `supero${lr('left')}`;
    case 'superior-right': return `supero${lr('right')}`;
    case 'inferior-left': return `infero${lr('left')}`;
    case 'inferior-right': return `infero${lr('right')}`;
  }
}

export const SIDE_LABEL: Record<Side, string> = {
  superior: 'Upper', inferior: 'Lower', left: 'Left', right: 'Right',
  'superior-left': 'Upper left', 'superior-right': 'Upper right',
  'inferior-left': 'Lower left', 'inferior-right': 'Lower right',
};

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

export const LOCALISATION_LABEL: Record<Localisation, string> = {
  none: 'No pathway defect',
  prechiasmal: 'Retina / optic nerve (pre-chiasmal)',
  chiasm: 'Optic chiasm',
  'retro-right': 'Right retrochiasmal pathway',
  'retro-left': 'Left retrochiasmal pathway',
};

export const LOCALISATION_SUB: Record<Localisation, string> = {
  none: 'Both fields full',
  prechiasmal: 'One eye’s own pattern',
  chiasm: 'Crossing nasal fibres',
  'retro-right': 'Tract · radiation · occipital',
  'retro-left': 'Tract · radiation · occipital',
};

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
export function describeEye(defect: FieldDefect, eye: Eye): string {
  const p = patternOf(defect, eye);
  const anat = p.side ? anatomicalSide(p.side, eye) : '';
  switch (p.family) {
    case 'full': return 'Full — physiological blind spot only';
    case 'constricted': return 'Constricted — central island of ~12° only';
    case 'central': return 'Central scotoma — fixation involved';
    case 'cecocentral': return 'Cecocentral scotoma — fixation to blind spot';
    case 'blind-spot': return 'Enlarged blind spot';
    case 'arcuate': return `${cap(anat)} arcuate — respects the horizontal meridian`;
    case 'nasal-step': return 'Superior nasal step';
    case 'altitudinal': return `${cap(anat)} altitudinal — respects the horizontal meridian`;
    case 'hemianopia': return `${p.side === 'left' ? 'Left' : 'Right'} (${anat}) hemianopia — respects the vertical meridian`;
    case 'quadrantanopia': return `${SIDE_LABEL[p.side!]} (${anat}) quadrantanopia`;
    case 'curtain': return `${cap(anat)} peripheral loss — fixation spared`;
    case 'island': return 'Near-total loss — small temporal island only';
  }
}

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

export function flagOf(defect: FieldDefect): RevealedFinding['flag'] {
  const f = patternOf(defect, 'OD').family;
  if (f === 'full') return 'normal';
  if (f === 'altitudinal' || f === 'hemianopia' || f === 'quadrantanopia' || f === 'curtain' || f === 'island') return 'critical';
  return 'abnormal';
}

/** What a monocular pattern points to (pre-chiasmal hint). */
export function monocularHint(f: Family): string {
  switch (f) {
    case 'arcuate':
    case 'nasal-step': return 'nerve fibre layer at the disc (glaucomatous pattern; or a branch vein occlusion)';
    case 'central': return 'macula or optic nerve (e.g. optic neuritis)';
    case 'cecocentral': return 'papillomacular bundle (toxic, nutritional or hereditary optic neuropathy)';
    case 'blind-spot': return 'optic disc swelling';
    case 'altitudinal': return 'optic nerve head ischaemia (exclude giant cell arteritis) or branch artery occlusion';
    case 'constricted': return 'diffuse — retinitis pigmentosa, end-stage glaucoma or non-organic';
    case 'curtain': return 'retina — detachment in the opposite part of the fundus';
    case 'island': return 'central retinal artery occlusion';
    case 'hemianopia':
    case 'quadrantanopia': return 'respects the vertical midline';
    case 'full': return 'none';
  }
}

/** One-line localisation for the chart, with a hint where the lesion sits. */
export function localisationLine(od: FieldDefect, os: FieldDefect): { value: string; flag: RevealedFinding['flag'] } {
  const pOD = patternOf(od, 'OD');
  const pOS = patternOf(os, 'OS');
  const loc = localise(pOD, pOS);
  switch (loc) {
    case 'none':
      return { value: 'Full fields OU — no pathway defect', flag: 'normal' };
    case 'chiasm': {
      const both = pOD.family !== 'full' && pOS.family !== 'full';
      const quad = [pOD, pOS].find((p) => p.family === 'quadrantanopia');
      const what = !both
        ? 'junctional temporal hemianopia'
        : quad ? `bitemporal ${quad.side?.startsWith('inferior') ? 'inferior' : 'superior'} quadrantanopia` : 'bitemporal hemianopia';
      return { value: `Chiasm — ${what}; image the pituitary region`, flag: 'critical' };
    }
    case 'retro-right':
    case 'retro-left': {
      const field = loc === 'retro-right' ? 'Left' : 'Right';
      const brain = loc === 'retro-right' ? 'Right' : 'Left';
      const quads = [pOD, pOS].filter((p) => p.family === 'quadrantanopia');
      let where = 'optic tract, radiation or occipital cortex';
      let what = 'homonymous hemianopia';
      if (quads.length === 2) {
        const sup = quads.every((p) => p.side?.startsWith('superior'));
        const inf = quads.every((p) => p.side?.startsWith('inferior'));
        if (sup) { what = 'superior homonymous quadrantanopia'; where = 'temporal lobe (Meyer’s loop)'; }
        else if (inf) { what = 'inferior homonymous quadrantanopia'; where = 'parietal lobe radiation'; }
      }
      return { value: `${brain} retrochiasmal — ${field.toLowerCase()} ${what} (${where})`, flag: 'critical' };
    }
    case 'prechiasmal': {
      const parts: string[] = [];
      const bilateral = pOD.family !== 'full' && pOS.family !== 'full';
      if (bilateral && pOD.family === 'blind-spot' && pOS.family === 'blind-spot') {
        return { value: 'Pre-chiasmal OU — bilateral enlarged blind spots: check for disc swelling (papilloedema)', flag: 'critical' };
      }
      for (const [eye, p] of [['OD', pOD], ['OS', pOS]] as const) {
        if (p.family !== 'full') parts.push(`${eye}: ${monocularHint(p.family)}`);
      }
      const flag = [od, os].some((d) => flagOf(d) === 'critical') ? 'critical' : 'abnormal';
      return { value: `Pre-chiasmal — ${parts.join('; ')}`, flag };
    }
  }
}
