/**
 * The patient reading a line aloud. Lines above threshold are read cleanly;
 * the threshold line is read with more than half right (characteristic
 * confusions: O↔C, H↔N, R↔K…); the next line down drops to half or fewer;
 * smaller lines are guesses or "just smudges". Pure (seeded rng).
 */
import { pickStrings, type Locale, type Rng } from '@core';
import { expectedLineIndex, symbolSet, type ChartLine, type Optotype } from './charts';
import { S } from './strings';

export type ReadingKind = 'read' | 'cannot' | 'dark' | 'unknown-optotype';
export type Mood = 'confident' | 'hesitant' | 'struggling' | 'lost';

export interface Reading {
  kind: ReadingKind;
  /** What the patient called each optotype ('' = skipped) */
  said: string[];
  correct: boolean[];
  nCorrect: number;
  /** More than half correct */
  passed: boolean;
  mood: Mood;
  /** Speech-bubble text */
  text: string;
}

/** Characteristic confusions between Sloan letters (and the odd non-Sloan guess). */
export const CONFUSIONS: Record<string, string[]> = {
  C: ['O', 'G'], D: ['O', 'B'], H: ['N', 'M'], K: ['R', 'X'], N: ['H', 'M'],
  O: ['C', 'D', 'Q'], R: ['K', 'P', 'B'], S: ['C', 'Z'], V: ['Y', 'U'], Z: ['S', 'N'],
  // Blurred LEA symbols all collapse towards the circle — by design of the test.
  apple: ['circle'], house: ['square', 'circle'], circle: ['apple'], square: ['house', 'circle'],
  right: ['left', 'up', 'down'], left: ['right', 'up', 'down'], up: ['down', 'left', 'right'], down: ['up', 'left', 'right'],
};

/** Child-friendly names for LEA symbols / directions for the tumbling E. */
export function spoken(sym: string, locale: Locale = 'en'): string {
  return pickStrings(S, locale).spoken[sym] ?? sym;
}

/** Latin letters and arrows inside Hebrew text: LRM keeps the closing punctuation on the right side of the run. */
const LRM = '\u200E';

function substitute(sym: string, rng: Rng, set: readonly string[]): string {
  const c = CONFUSIONS[sym];
  if (c && rng.chance(0.8)) return rng.pick(c);
  const others = set.filter((s) => s !== sym);
  return others.length ? rng.pick(others) : sym;
}

function speechFor(said: string[], mood: Mood, optotype: Optotype, locale: Locale): string {
  const t = pickStrings(S, locale);
  const he = locale === 'he';
  const words = said.map((s) => (s ? spoken(s, locale) : '…'));
  if (optotype === 'tumbling-e') {
    // A child points rather than reads; the bubble shows the pointing.
    const out = mood === 'confident' ? `${words.join('  ')}` : words.map((w, i) => (i % 2 === 1 ? `${w}?` : w)).join('  … ');
    return he ? LRM + out : out;
  }
  const cap = (w: string) => (optotype === 'lea' ? w : w.toUpperCase());
  let out: string;
  switch (mood) {
    case 'confident':
      out = words.map(cap).join(', ') + '.';
      break;
    case 'hesitant':
      out = t.umPrefix + words.map((w, i) => (i === said.length - 1 ? `${cap(w)}?` : cap(w))).join(', ');
      break;
    case 'struggling':
      out = words.map((w, i) => (i % 2 ? `${cap(w)}?` : `${cap(w)}…`)).join(' ') + t.maybeSuffix;
      break;
    default:
      out = words.map(cap).join('? ') + '?';
  }
  return he && optotype === 'letters' && mood !== 'struggling' ? out + LRM : out;
}

export interface ReadOptions {
  lines: readonly ChartLine[];
  index: number;
  symbols: string[];
  /** true logMAR with the current eye(s); null = both eyes covered */
  trueLogmar: number | null;
  optotype: Optotype;
  age: number;
  /** Can the patient name these optotypes at all? */
  knowsOptotype: boolean;
  difficulty: number;
  rng: Rng;
  locale?: Locale;
}

export function readLine(o: ReadOptions): Reading {
  const locale = o.locale ?? 'en';
  const t = pickStrings(S, locale);
  const n = o.symbols.length;
  const blank = (kind: ReadingKind, text: string, mood: Mood): Reading => ({
    kind, said: o.symbols.map(() => ''), correct: o.symbols.map(() => false), nCorrect: 0, passed: false, mood, text,
  });
  if (o.trueLogmar === null) return blank('dark', t.bothCovered, 'lost');
  if (!o.knowsOptotype) {
    const text = o.optotype === 'letters' ? t.needsPictures : t.needsDirection;
    return blank('unknown-optotype', text, 'lost');
  }
  const exp = expectedLineIndex(o.lines, o.trueLogmar);
  const line = o.lines[o.index]!;
  const child = o.age < 8;
  const set = symbolSet(o.optotype);

  let nCorrect: number;
  let mood: Mood;
  if (exp >= 0 && o.index < exp) {
    // Comfortably above threshold. On hard settings a long line one above threshold may cost a slip.
    const slip = o.index === exp - 1 && n >= 5 && o.rng.chance(0.15 + o.difficulty * 0.35) ? 1 : 0;
    nCorrect = n - slip;
    mood = slip ? 'hesitant' : 'confident';
  } else if (exp >= 0 && o.index === exp) {
    const maxMiss = Math.ceil(n / 2) - 1;
    // How deep into the line's range the true acuity sits: right at the edge → more misses.
    const depth = Math.max(0, Math.min(1, (o.trueLogmar - (line.logmar - 0.1)) / 0.1));
    const k = Math.round(maxMiss * Math.min(1, depth * (0.6 + o.difficulty * 0.6) * (0.5 + o.rng.next())));
    nCorrect = n - Math.min(maxMiss, k);
    mood = nCorrect === n ? 'confident' : 'hesitant';
  } else {
    const below = exp >= 0 ? o.index - exp : o.index + 1;
    const gap = line.logmar - o.trueLogmar;
    if (gap < -0.28 || (below >= 3 && o.rng.chance(0.7))) {
      return blank('cannot', o.rng.pick(child ? t.cannotChild : t.cannot), 'lost');
    }
    const half = Math.floor(n / 2);
    if (below === 1) {
      const lo = Math.max(0, half - 1 - Math.round(o.rng.next() * 1.4));
      nCorrect = Math.min(half, lo + (o.rng.chance(0.35 + o.difficulty * 0.3) ? 1 : 0));
      if (n === 1) nCorrect = 0;
      mood = 'struggling';
    } else {
      nCorrect = n >= 4 && o.rng.chance(0.4) ? 1 : 0;
      mood = 'lost';
    }
  }

  const wrongIdx = new Set(o.rng.shuffle([...Array(n).keys()]).slice(0, n - nCorrect));
  const said = o.symbols.map((s, i) => (wrongIdx.has(i) ? substitute(s, o.rng, set) : s));
  // Guarantee the substitution actually differs from the target.
  said.forEach((s, i) => {
    if (wrongIdx.has(i) && s === o.symbols[i]) said[i] = set.find((x) => x !== s) ?? s;
  });
  const correct = said.map((s, i) => s === o.symbols[i]);
  const nc = correct.filter(Boolean).length;
  return { kind: 'read', said, correct, nCorrect: nc, passed: nc * 2 > n, mood, text: speechFor(said, mood, o.optotype, locale) };
}
