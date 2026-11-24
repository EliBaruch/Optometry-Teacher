/**
 * The economy store: persisted wallet, crates and wardrobe + all bus wiring.
 * One store per GameServices (WeakMap) so install() is idempotent and UI can
 * find it without globals.
 */
import { signal, type GameServices, type Rng, type ScoreBreakdown, type Signal } from '@core';
import {
  CRATES, DAILY_PRACTICE_CAP, DEFAULT_EQUIPPED, ECONOMY_COLOR, COIN, MAX_UNOPENED, STARTER_ITEMS, isMomentumMilestone,
  itemById, type CrateKind, type ItemKind, type Rarity,
} from './catalog';
import { caseFee, dayKey, practiceFee, rollCrate, type CrateDrop, type FeeResult } from './logic';
import { applyTheme, removeThemeLayer } from './theme';

export const SYSTEM_ID = 'economy';
export const SLOT = 'sys:economy';
export const SLOT_VERSION = 1;

export interface StoredCrate {
  id: string;
  kind: CrateKind;
  seed: number;
  earnedAt: number;
  reason: string;
}

export interface DropRecord {
  kind: CrateKind;
  rarity: Rarity;
  content: CrateDrop['content'];
  at: number;
}

export interface EconomyState {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  crates: StoredCrate[];
  crateSeq: number;
  cratesOpened: number;
  pity: number;
  hintTokens: number;
  owned: string[];
  equipped: Record<ItemKind, string>;
  day: { key: string; caseCoins: number; practiceCoins: number };
  drops: DropRecord[];
  flags: string[];
  maxRank: number;
}

export const initialState = (): EconomyState => ({
  balance: 0,
  lifetimeEarned: 0,
  lifetimeSpent: 0,
  crates: [],
  crateSeq: 0,
  cratesOpened: 0,
  pity: 0,
  hintTokens: 0,
  owned: [...STARTER_ITEMS],
  equipped: { ...DEFAULT_EQUIPPED },
  day: { key: '', caseCoins: 0, practiceCoins: 0 },
  drops: [],
  flags: [],
  maxRank: 1,
});

/** What the results screen shows for the case just finished. */
export interface CaseReceipt {
  caseId: string;
  fee: FeeResult;
  grade: ScoreBreakdown['grade'];
  coveredHints: number;
  crates: StoredCrate[];
  streak: number;
}

export interface GainPulse {
  delta: number;
  seq: number;
  reason: string;
}

export type BuyResult = 'ok' | 'owned' | 'funds' | 'unknown';

export class Economy {
  readonly state: Signal<EconomyState>;
  readonly lastCase = signal<CaseReceipt | null>(null);
  readonly gain = signal<GainPulse | null>(null);
  readonly active = signal(false);
  private seeds: Rng;
  private gainSeq = 0;
  private streak = 0;
  private hints = { caseId: '', covered: 0 };
  private offs: (() => void)[] = [];
  private previewing: string | null = null;

  constructor(readonly services: GameServices) {
    this.state = services.save.slot<EconomyState>(SLOT, initialState(), { version: SLOT_VERSION });
    this.seeds = services.rng.fork('economy:crates');
    // Repair a save that lost starter items or has an unowned item equipped.
    const s = this.state.get();
    const owned = [...new Set([...STARTER_ITEMS, ...(s.owned ?? [])])];
    const equipped = { ...DEFAULT_EQUIPPED, ...s.equipped };
    for (const k of Object.keys(equipped) as ItemKind[]) if (!owned.includes(equipped[k])) equipped[k] = DEFAULT_EQUIPPED[k];
    this.state.set({ ...s, owned, equipped });
  }

  /* ── lifecycle ──────────────────────────────────────────────────────── */

  start(): void {
    if (this.active.get()) return;
    const { bus } = this.services;
    this.offs = [
      bus.on('case:started', (e) => {
        this.hints = { caseId: e.caseId, covered: 0 };
      }),
      bus.on('hint:used', (e) => this.onHint(e.caseId)),
      bus.on('case:completed', (e) => this.onCaseCompleted(e.caseId, e.score)),
      bus.on('case:failed', () => {
        this.streak = 0;
      }),
      bus.on('mode:started', () => {
        this.streak = 0;
      }),
      bus.on('practice:completed', (e) => this.onPractice(e.result.accuracy)),
      bus.on('currency:grant', (e) => {
        const n = Math.round(Number(e.amount));
        if (Number.isFinite(n) && n > 0) this.credit(n, e.reason || 'Gift');
      }),
      bus.on('rank:changed', (e) => this.onRank(e.level, e.title)),
      this.state.subscribe((s, prev) => {
        if (s.equipped.theme !== prev.equipped.theme && !this.previewing) applyTheme(s.equipped.theme);
      }),
    ];
    applyTheme(this.state.get().equipped.theme);
    this.active.set(true);
  }

  stop(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
    this.previewing = null;
    removeThemeLayer();
    this.active.set(false);
  }

  /* ── wallet ─────────────────────────────────────────────────────────── */

  get balance(): number {
    return this.state.get().balance;
  }

  credit(amount: number, reason: string): void {
    if (amount <= 0) return;
    this.state.update((s) => ({ ...s, balance: s.balance + amount, lifetimeEarned: s.lifetimeEarned + amount }));
    this.services.bus.emit('currency:changed', { balance: this.balance, delta: amount });
    this.gain.set({ delta: amount, seq: ++this.gainSeq, reason });
  }

  private spend(amount: number): boolean {
    if (amount < 0 || this.balance < amount) return false;
    this.state.update((s) => ({ ...s, balance: s.balance - amount, lifetimeSpent: s.lifetimeSpent + amount }));
    this.services.bus.emit('currency:changed', { balance: this.balance, delta: -amount });
    return true;
  }

  private rollDay(): EconomyState['day'] {
    const key = dayKey(this.services.clock.now());
    const s = this.state.get();
    if (s.day.key === key) return s.day;
    const day = { key, caseCoins: 0, practiceCoins: 0 };
    this.state.set({ ...s, day });
    return day;
  }

  /* ── boutique ───────────────────────────────────────────────────────── */

  owns(id: string): boolean {
    return this.state.get().owned.includes(id);
  }

  buy(id: string): BuyResult {
    const item = itemById(id);
    if (!item) return 'unknown';
    if (this.owns(id)) return 'owned';
    if (!this.spend(item.price)) return 'funds';
    this.state.update((s) => ({ ...s, owned: [...s.owned, id] }));
    this.flag('first-purchase', 'Boutique regular', `Bought your first piece: ${item.name}.`, 'gem');
    return 'ok';
  }

  equip(id: string): boolean {
    const item = itemById(id);
    if (!item || !this.owns(id)) return false;
    this.previewing = null;
    this.state.update((s) => ({ ...s, equipped: { ...s.equipped, [item.kind]: id } }));
    applyTheme(this.state.get().equipped.theme);
    return true;
  }

  /** Temporarily show a theme (null restores the equipped one). */
  preview(id: string | null): void {
    this.previewing = id;
    applyTheme(id ?? this.state.get().equipped.theme);
  }

  /* ── crates ─────────────────────────────────────────────────────────── */

  earnCrate(kind: CrateKind, reason: string): StoredCrate | null {
    const s = this.state.get();
    if (s.crates.length >= MAX_UNOPENED) {
      this.credit(60, 'Crate storage full');
      return null;
    }
    const crate: StoredCrate = {
      id: `c${s.crateSeq + 1}`, kind, seed: this.seeds.int(1, 0x7fffffff), earnedAt: this.services.clock.now(), reason,
    };
    this.state.set({ ...s, crateSeq: s.crateSeq + 1, crates: [...s.crates, crate] });
    return crate;
  }

  /** Open a crate (first unopened when no id). Applies the contents and returns them. */
  openCrate(id?: string): { crate: StoredCrate; drop: CrateDrop } | null {
    const s = this.state.get();
    const crate = id ? s.crates.find((c) => c.id === id) : s.crates[0];
    if (!crate) return null;
    const drop = rollCrate(crate.seed, crate.kind, s.pity, s.owned);
    const c = drop.content;
    this.state.set({
      ...s,
      crates: s.crates.filter((x) => x.id !== crate.id),
      cratesOpened: s.cratesOpened + 1,
      pity: drop.pity,
      hintTokens: s.hintTokens + (c.type === 'hints' ? c.amount : 0),
      owned: c.type === 'cosmetic' && !s.owned.includes(c.itemId) ? [...s.owned, c.itemId] : s.owned,
      drops: [{ kind: crate.kind, rarity: drop.rarity, content: c, at: this.services.clock.now() }, ...s.drops].slice(0, 12),
    });
    if (c.type === 'coins') this.credit(c.amount, CRATES[crate.kind].name);
    this.flag('first-crate', 'Special delivery', 'Opened your first supply crate.', 'crate');
    if (drop.rarity === 'legendary') this.flag('legendary', 'Museum piece', 'Found a legendary treasure in a supply crate.', 'crown');
    return { crate, drop };
  }

  /* ── event handlers ─────────────────────────────────────────────────── */

  private onHint(caseId: string): void {
    const s = this.state.get();
    if (s.hintTokens <= 0) return;
    if (this.hints.caseId !== caseId) this.hints = { caseId, covered: 0 };
    this.hints.covered++;
    this.state.set({ ...s, hintTokens: s.hintTokens - 1 });
    this.services.bus.emit('toast', { message: 'Consult note applied — this hint won’t reduce your fee.', icon: 'book', tone: 'info' });
  }

  private onCaseCompleted(caseId: string, score: ScoreBreakdown): void {
    const day = this.rollDay();
    const kase = this.services.registries.cases.get(caseId);
    const covered = this.hints.caseId === caseId ? this.hints.covered : 0;
    const prior = this.streak;
    const fee = caseFee({ score, difficulty: kase?.difficulty, priorStreak: prior, coveredHints: covered, earnedToday: day.caseCoins });
    this.streak = score.diagnosisCorrect ? prior + 1 : 0;
    this.hints = { caseId: '', covered: 0 };

    this.state.update((s) => ({ ...s, day: { ...s.day, caseCoins: s.day.caseCoins + fee.total } }));
    this.credit(fee.total, 'Consultation fee');
    const { bus } = this.services;
    bus.emit('reward:granted', {
      source: SYSTEM_ID, label: 'Consultation fee', value: `+${fee.total} ${COIN}`, icon: 'coin', color: ECONOMY_COLOR,
      rarity: score.grade === 'S' ? 'rare' : 'common',
    });

    const crates: StoredCrate[] = [];
    const add = (kind: CrateKind, reason: string) => {
      const c = this.earnCrate(kind, reason);
      if (c) crates.push(c);
    };
    if (score.grade === 'S') add('case', 'Exemplary case');
    else if (score.grade === 'A' && score.diagnosisCorrect && this.seeds.chance(0.2)) add('case', 'Excellent case — lucky find');
    if (score.diagnosisCorrect && isMomentumMilestone(this.streak)) add('momentum', `${this.streak} correct in a row`);
    for (const c of crates) {
      bus.emit('reward:granted', {
        source: SYSTEM_ID, label: CRATES[c.kind].name, value: 'NEW', icon: 'crate', color: CRATES[c.kind].trim,
        rarity: c.kind === 'case' ? 'rare' : 'epic',
      });
    }
    if (crates.length) bus.emit('toast', { message: `${CRATES[crates[0]!.kind].name} earned — ${crates[0]!.reason.toLowerCase()}!`, icon: 'crate', tone: 'epic' });
    this.lastCase.set({ caseId, fee, grade: score.grade, coveredHints: covered, crates, streak: this.streak });
  }

  private onPractice(accuracy: number): void {
    const day = this.rollDay();
    const pay = practiceFee(accuracy, day.practiceCoins, DAILY_PRACTICE_CAP);
    if (pay <= 0) return;
    this.state.update((s) => ({ ...s, day: { ...s.day, practiceCoins: s.day.practiceCoins + pay } }));
    this.credit(pay, 'Practice');
  }

  private onRank(level: number, title: string): void {
    const s = this.state.get();
    if (!Number.isFinite(level) || level <= Math.max(1, s.maxRank)) return;
    this.state.set({ ...s, maxRank: level });
    const c = this.earnCrate('promotion', `Promoted to ${title}`);
    if (!c) return;
    this.services.bus.emit('reward:granted', {
      source: SYSTEM_ID, label: CRATES.promotion.name, value: 'NEW', icon: 'crate', color: CRATES.promotion.trim, rarity: 'epic',
    });
    this.services.bus.emit('toast', { message: `Promotion crate delivered — congratulations, ${title}!`, icon: 'crate', tone: 'epic' });
  }

  private flag(key: string, title: string, description: string, icon: string): void {
    const s = this.state.get();
    if (s.flags.includes(key)) return;
    this.state.set({ ...s, flags: [...s.flags, key] });
    this.services.bus.emit('achievement:unlocked', { id: `economy:${key}`, title, description, icon, system: SYSTEM_ID });
  }
}

/* ── per-services registry ────────────────────────────────────────────── */

const stores = new WeakMap<GameServices, Economy>();

export function economyFor(services: GameServices): Economy {
  let e = stores.get(services);
  if (!e) stores.set(services, (e = new Economy(services)));
  return e;
}

/** The store only while the system is installed (UI renders nothing otherwise). */
export function activeEconomy(services: GameServices): Economy | null {
  const e = stores.get(services);
  return e && e.active.get() ? e : null;
}
