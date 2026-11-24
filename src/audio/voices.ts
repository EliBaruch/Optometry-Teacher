/**
 * Polyphony + spam control for SFX. Pure bookkeeping keyed on AudioContext
 * time: per-id max simultaneous instances (oldest is stolen) and a minimum
 * re-trigger interval for chatty ids such as 'hover' and 'dial'.
 */
export interface VoiceRule {
  max: number;
  cooldown: number;
}

export interface VoiceHandle {
  id: string;
  start: number;
  end: number;
  /** Fade the voice out quickly from time `at`. */
  stop(at: number): void;
}

export class VoiceLimiter {
  private active = new Map<string, VoiceHandle[]>();
  private last = new Map<string, number>();
  private globalMax: number;

  constructor(globalMax = 24) {
    this.globalMax = globalMax;
  }

  /**
   * Ask to start a voice of `id` at `now`. Returns `null` if it is blocked by
   * the cooldown; otherwise the voices that must be stolen to make room.
   */
  admit(id: string, now: number, rule: VoiceRule): VoiceHandle[] | null {
    this.prune(now);
    const prev = this.last.get(id);
    if (prev !== undefined && now - prev < rule.cooldown) return null;
    const list = this.active.get(id) ?? [];
    const steal: VoiceHandle[] = [];
    const max = Math.max(1, rule.max);
    while (list.length - steal.length >= max) steal.push(list[steal.length]!);
    if (this.total() - steal.length >= this.globalMax) {
      const oldest = this.oldest(steal);
      if (oldest) steal.push(oldest);
    }
    for (const v of steal) this.remove(v);
    this.last.set(id, now);
    return steal;
  }

  register(v: VoiceHandle): void {
    const list = this.active.get(v.id) ?? [];
    list.push(v);
    this.active.set(v.id, list);
  }

  count(id: string, now: number): number {
    this.prune(now);
    return this.active.get(id)?.length ?? 0;
  }

  total(): number {
    let n = 0;
    for (const l of this.active.values()) n += l.length;
    return n;
  }

  prune(now: number): void {
    for (const [id, list] of this.active) {
      const live = list.filter((v) => v.end > now);
      if (live.length) this.active.set(id, live);
      else this.active.delete(id);
    }
  }

  clear(): void {
    this.active.clear();
    this.last.clear();
  }

  private remove(v: VoiceHandle) {
    const list = this.active.get(v.id);
    if (!list) return;
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
    if (!list.length) this.active.delete(v.id);
  }

  private oldest(exclude: VoiceHandle[]): VoiceHandle | undefined {
    let best: VoiceHandle | undefined;
    for (const l of this.active.values())
      for (const v of l) if (!exclude.includes(v) && (!best || v.start < best.start)) best = v;
    return best;
  }
}
