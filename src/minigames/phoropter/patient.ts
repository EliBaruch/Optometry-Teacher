/**
 * The patient behind the phoropter: answers "one or two?", the duochrome and
 * the balance question truthfully from the optics, with a just-noticeable
 * difference and a little noise that grows with difficulty — patients are
 * uncertain near the endpoint, exactly like real ones.
 */
import type { Eye, Rng } from '@core';
import {
  blurLoss, CHART_LINES, duochromeResiduals, effectiveResidual, jccRedAxis, jccVector, lensMagnification, perceivedVA, toVector, vlen,
  type EyeModel, type JccMode, type Lens,
} from './optics';

export type Choice = 'one' | 'two' | 'same';

export interface Answer {
  choice: Choice;
  /** true when the difference was close to the patient's threshold */
  unsure: boolean;
  /** what the patient says */
  text: string;
}

export interface Listener {
  rng: Rng;
  difficulty: number;
}

/** Just-noticeable logMAR difference: wider for eyes with pathology and for "harder" patients. */
export function jnd(eye: EyeModel, difficulty: number): number {
  return 0.035 * (1 + 2 * Math.max(0, eye.best)) + 0.015 * difficulty;
}

function gauss(rng: Rng): number {
  const u = Math.max(1e-9, rng.next());
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Decide from two logMAR values (lower = better). */
export function decide(va1: number, va2: number, eye: EyeModel, who: Listener): { choice: Choice; unsure: boolean } {
  const t = jnd(eye, who.difficulty);
  const noise = gauss(who.rng) * (0.012 + 0.025 * who.difficulty);
  const d = va1 - va2 + noise; // > 0 → two is better
  const unsure = Math.abs(va1 - va2) < t * 2;
  if (Math.abs(d) < t) return { choice: 'same', unsure };
  return { choice: d > 0 ? 'two' : 'one', unsure };
}

const pick = (rng: Rng, xs: string[]) => xs[Math.floor(rng.next() * xs.length)]!;

function sayChoice(c: Choice, unsure: boolean, rng: Rng, extra = ''): string {
  if (c === 'same') return pick(rng, ['They look about the same.', 'Honestly… no difference.', 'Same to me.', 'I can’t tell them apart.']) + extra;
  const n = c === 'one' ? 'One' : 'Two';
  if (unsure) return pick(rng, [`Um… maybe ${n.toLowerCase()}?`, `${n}, I think. Just barely.`, `Hmm. ${n}? It’s close.`]) + extra;
  return pick(rng, [`${n}. Definitely ${n.toLowerCase()}.`, `${n} — much clearer.`, `${n} is sharper.`, `${n}!`]) + extra;
}

/** Sphere / cylinder comparison: lens 1 (before your clicks) vs lens 2 (now). */
export function compareLenses(eye: EyeModel, one: Lens, two: Lens, who: Listener): Answer {
  const v1 = perceivedVA(eye, one);
  const v2 = perceivedVA(eye, two);
  const { choice, unsure } = decide(v1, v2, eye, who);
  let extra = '';
  if (choice === 'same') {
    const m1 = toVector(one).M;
    const m2 = toVector(two).M;
    if (Math.abs(m1 - m2) >= 0.2) {
      const smaller = lensMagnification(m2) < lensMagnification(m1) ? 'two' : 'one';
      extra = ` ${smaller === 'two' ? 'Two' : 'One'} looks smaller and darker, though.`;
    }
  }
  return { choice, unsure, text: sayChoice(choice, unsure, who.rng, extra) };
}

/** Jackson cross-cylinder flip: compares the lens with the JCC in position 1 vs 2. */
export function compareJcc(eye: EyeModel, lens: Lens, mode: JccMode, who: Listener): Answer {
  const v1 = perceivedVA(eye, lens, jccVector(jccRedAxis(mode, lens.axis, 1)));
  const v2 = perceivedVA(eye, lens, jccVector(jccRedAxis(mode, lens.axis, 2)));
  const { choice, unsure } = decide(v1, v2, eye, who);
  return { choice, unsure, text: sayChoice(choice, unsure, who.rng) };
}

export type DuoAnswer = 'red' | 'green' | 'equal' | 'unreliable';

export function duochrome(eye: EyeModel, lens: Lens, who: Listener): { answer: DuoAnswer; text: string } {
  const plain = perceivedVA(eye, lens);
  if (plain > 0.32) {
    return { answer: 'unreliable', text: pick(who.rng, ['Both sides are too fuzzy to compare.', 'I can’t really make out either side.']) };
  }
  const { red, green } = duochromeResiduals(eye, lens);
  const vr = eye.best + eye.k * blurLoss(vlen(red));
  const vg = eye.best + eye.k * blurLoss(vlen(green));
  const { choice } = decide(vr, vg, eye, who); // "one" = red better
  if (choice === 'same') return { answer: 'equal', text: pick(who.rng, ['They’re equally black.', 'Same on both sides.', 'Equal, I’d say.']) };
  const red1 = choice === 'one';
  return {
    answer: red1 ? 'red' : 'green',
    text: red1
      ? pick(who.rng, ['The letters on the red are blacker.', 'Red side is crisper.', 'Red. The red side.'])
      : pick(who.rng, ['The green side looks blacker.', 'Green is sharper.', 'Green, I think.']),
  };
}

/** Prism-dissociated balance: base-up before OD puts the right eye's image on the bottom. */
export function balance(
  eyes: Record<Eye, EyeModel>, lenses: Record<Eye, Lens>, who: Listener,
): { answer: 'top' | 'bottom' | 'equal'; text: string } {
  const vOD = perceivedVA(eyes.OD, lenses.OD);
  const vOS = perceivedVA(eyes.OS, lenses.OS);
  const model = eyes.OD.best > eyes.OS.best ? eyes.OD : eyes.OS;
  const { choice } = decide(vOS, vOD, model, who); // one = top (OS) better
  if (choice === 'same') return { answer: 'equal', text: pick(who.rng, ['Top and bottom look the same.', 'Equally blurry.', 'Both the same.']) };
  return choice === 'one'
    ? { answer: 'top', text: pick(who.rng, ['The top line is clearer.', 'Top.', 'The top one, a little.']) }
    : { answer: 'bottom', text: pick(who.rng, ['The bottom line is clearer.', 'Bottom.', 'Bottom is sharper.']) };
}

const CONFUSE: Record<string, string> = { C: 'O', O: 'C', D: 'O', H: 'N', N: 'H', K: 'R', R: 'K', S: 'Z', Z: 'S', V: 'K' };

/**
 * The patient reads the smallest line they can attempt: letters near
 * threshold are sometimes misread (C↔O, H↔N…). Returns the line and the reading.
 */
export function readChart(va: number, rng: Rng): { denom: number | null; text: string } {
  let line = null as (typeof CHART_LINES)[number] | null;
  for (const l of CHART_LINES) if (l.logmar >= va - 0.06) line = l;
  if (!line) return { denom: null, text: pick(rng, ['I can’t even make out the big letter.', 'Is there a letter up there? It’s all a smudge.']) };
  const margin = line.logmar - va; // > 0: comfortably above threshold
  const pWrong = margin > 0.06 ? 0.02 : margin > 0 ? 0.18 : 0.4;
  const said = [...line.letters].map((ch) => (rng.next() < pWrong ? `${CONFUSE[ch] ?? ch}?` : ch));
  const hesitant = margin < 0.03;
  const reading = said.join(hesitant ? '… ' : ' ');
  return { denom: line.denom, text: hesitant ? `${reading}… that’s my best guess.` : `${reading}.` };
}

/** Blur description the patient volunteers when the eye is changed / fogged. */
export function blurComment(eye: EyeModel, lens: Lens): string {
  const r = effectiveResidual(eye, lens);
  if (r.raw.M < -0.6) return 'Everything just went blurry.';
  if (r.B < 0.2) return 'That’s nice and clear.';
  return 'It’s a bit fuzzy.';
}
