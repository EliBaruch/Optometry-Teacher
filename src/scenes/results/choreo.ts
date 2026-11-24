/**
 * Results choreography — when each beat lands (ms after mount).
 *   1 verdict  — the diagnosis card flips
 *   2 stamp    — the grade stamp slams in
 *   3 ledger   — score parts count up one by one, then the total
 *   4 teaching — the case review fades up
 *   5 rewards  — reward chips cascade in
 * Reduced motion (or a skip) collapses everything to 0.
 */
export interface Beats {
  flip: number;
  /** When the flipped card faces the player (impact: sparks / shake / sound) */
  verdict: number;
  stamp: number;
  ledger: number;
  /** Gap between score parts */
  partStep: number;
  total: number;
  teaching: number;
  rewards: number;
  /** Everything has landed; the skip hint disappears */
  settled: number;
}

export const FLIP_MS = 820;

export function beats(parts: number, reduced: boolean, timeout = false): Beats {
  if (reduced) return { flip: 0, verdict: 0, stamp: 0, ledger: 0, partStep: 0, total: 0, teaching: 0, rewards: 0, settled: 0 };
  const flip = 450;
  const verdict = flip + Math.round(FLIP_MS * 0.55);
  const stamp = verdict + (timeout ? 500 : 650);
  const ledger = stamp + 700;
  const partStep = 240;
  const total = ledger + parts * partStep + 200;
  const teaching = total + 450;
  const rewards = total + 700;
  return { flip, verdict, stamp, ledger, partStep, total, teaching, rewards, settled: rewards + 400 };
}

export type Beat = keyof Omit<Beats, 'partStep'>;
export const BEAT_ORDER: Beat[] = ['flip', 'verdict', 'stamp', 'ledger', 'total', 'teaching', 'rewards', 'settled'];

/** Beats reached at time t (ms). */
export function reached(b: Beats, t: number): Set<Beat> {
  return new Set(BEAT_ORDER.filter((k) => b[k] <= t));
}
