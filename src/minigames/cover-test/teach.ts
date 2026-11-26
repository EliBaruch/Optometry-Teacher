/** Teaching text. Pure. */
import { isolateLtrRuns, pickStrings, type Locale } from '@core';
import { describe, kindLabel, lowerLabel, type Dir, type Truth } from './model';
import { S } from './strings';

/** The refixation / recovery movement the examiner sees for a deviation. */
export function movementWord(dir: Dir, locale: Locale = 'en'): string {
  const t = pickStrings(S, locale).mv;
  switch (dir) {
    case 'eso': return t.outward!;
    case 'exo': return t.inward!;
    case 'hyperR':
    case 'hyperL': return t.downward!;
    default: return t.none!;
  }
}

export function explain(t: Truth, locale: Locale = 'en'): string {
  const w = pickStrings(S, locale);
  const he = locale === 'he';
  const mv = movementWord(t.dir, locale);
  const neut = w.neutral[t.dir === 'eso' ? 'eso' : t.dir === 'exo' ? 'exo' : t.dir]!;
  const hyperEye = t.dir === 'hyperR' ? w.hyperEyeName.right : w.hyperEyeName.left;
  const who = t.eye === 'alternating' ? w.eyeWho.either : t.eye === 'OD' ? w.eyeWho.right : w.eyeWho.left;
  const out = ((): string => {
    switch (t.kind) {
      case 'ortho':
        return w.exOrtho;
      case 'phoria': {
        const rec = mv === w.mv.downward ? w.recHyper(mv, hyperEye) : mv;
        const name = he ? describe(t, locale).replace(/^\d+Δ /, '') : describe(t).replace(/^\d+Δ /, '');
        return w.exPhoria(rec, name, t.mag, neut);
      }
      case 'tropia': {
        const name = lowerLabel(kindLabel('tropia', t.dir, t.eye, locale), locale);
        const tail = t.eye === 'alternating' ? w.tailAlt : w.tailPref(w.otherSide[t.eye === 'OD' ? 'OD' : 'OS']);
        return w.exTropia(t.eye === 'alternating' ? w.eyeWho.otherEye : who, mv, name, t.mag, tail, neut);
      }
      case 'intermittent': {
        const name = lowerLabel(kindLabel('intermittent', t.dir, t.eye, locale), locale);
        return w.exInter(mv, he ? name : name, t.mag, neut);
      }
    }
  })();
  return he ? isolateLtrRuns(out) : out;
}
