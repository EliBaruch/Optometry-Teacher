/** Teaching text. Pure. */
import { baseWord, describe, kindLabel, lowerLabel, type Dir, type Truth } from './model';

/** The refixation / recovery movement the examiner sees for a deviation. */
export function movementWord(dir: Dir): string {
  switch (dir) {
    case 'eso': return 'outward';
    case 'exo': return 'inward';
    case 'hyperR':
    case 'hyperL': return 'downward';
    default: return 'none';
  }
}

const NEUTRAL: Record<Dir, string> = {
  none: 'no prism is needed',
  eso: baseWord('BO'),
  exo: baseWord('BI'),
  hyperR: 'base-down over the right eye (or base-up over the left)',
  hyperL: 'base-down over the left eye (or base-up over the right)',
};

export function explain(t: Truth): string {
  const mv = movementWord(t.dir);
  const hyperEye = t.dir === 'hyperR' ? 'right' : 'left';
  const who = t.eye === 'alternating' ? 'either eye' : t.eye === 'OD' ? 'right eye' : 'left eye';
  const other = t.eye === 'OD' ? 'left' : 'right';
  switch (t.kind) {
    case 'ortho':
      return 'No movement on cover, uncover or alternate cover: the eyes are aligned (orthophoria). Normal distance alignment is about 1Δ exo; near about 3Δ exo.';
    case 'phoria':
      return `The uncovered eye did not move, so there is no tropia. Behind the paddle the covered eye drifted and, on uncover, recovered ${mv === 'downward' ? `${mv} (${hyperEye} eye)` : mv}: a latent ${describe(t).replace(/^\d+Δ /, '')} that fusion controls. Alternate cover shows the full ${t.mag}Δ; neutralise it with ${NEUTRAL[t.dir]}.`;
    case 'tropia':
      return `Covering the fixing eye made the ${who === 'either eye' ? 'other eye' : who} move ${mv} to take up fixation: a manifest ${lowerLabel(kindLabel('tropia', t.dir, t.eye))} of ${t.mag}Δ. ${t.eye === 'alternating' ? 'Either eye can fixate, so vision develops in both.' : `The ${other} eye is the preferred fixing eye.`} Neutralise with ${NEUTRAL[t.dir]}.`;
    case 'intermittent':
      return `Fusion controls the deviation most of the time; the eye shows it when control breaks (fatigue, occlusion). On cover it either refixates ${mv} or drifts and recovers slowly: an ${lowerLabel(kindLabel('intermittent', t.dir, t.eye))}, ${t.mag}Δ. Neutralise with ${NEUTRAL[t.dir]}.`;
  }
}
