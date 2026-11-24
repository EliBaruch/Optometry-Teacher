/**
 * Typewriter timing: a per-character reveal schedule where punctuation adds
 * natural pauses ("Hmm… it's blurry. Mostly at night."). Pure and unit-tested.
 */
const PAUSES: Record<string, number> = {
  ',': 4, ';': 5, ':': 5, '.': 9, '!': 9, '?': 9, '…': 12, '—': 6, '\n': 8,
};

/** Cumulative reveal time (ms) at which each character becomes visible. */
export function buildSchedule(text: string, charsPerSecond = 45): number[] {
  const step = 1000 / Math.max(1, charsPerSecond);
  const out: number[] = new Array(text.length);
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    t += step;
    out[i] = t;
    const ch = text[i]!;
    const pause = PAUSES[ch];
    // Only pause on punctuation that ends a clause (followed by space/end), not "3.5" or "e.g."
    if (pause && (i === text.length - 1 || /\s/.test(text[i + 1]!))) t += step * pause;
  }
  return out;
}

/** How many characters are visible after `elapsed` ms. */
export function visibleChars(schedule: readonly number[], elapsed: number): number {
  let lo = 0;
  let hi = schedule.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (schedule[mid]! <= elapsed) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function totalDuration(schedule: readonly number[]): number {
  return schedule.length ? schedule[schedule.length - 1]! : 0;
}
