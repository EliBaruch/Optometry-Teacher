import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import {
  COMEBACK_AFTER_MS, COMEBACK_COINS, DAY, EARN_CAP_HOURS, GIFT_CALENDAR, INITIAL, MIN_AWAY_MS, RATE_BASE, RATE_SKILL,
  SATCHEL_BONUS, arrive, claimGift, collect, dismissWelcome, earningsFor, formatDuration, giftReady, jarCapacity,
  msUntilTomorrow, ratePerHour, recordCase, rollRarity, sanitize, satchelOdds, skillOf, salutation, welcomeLine, collectable, grandSatchelHint,
  type ComfortState,
} from './logic';

const H = 3_600_000;
const T0 = new Date(2026, 10, 24, 20, 0, 0).getTime(); // 24 Nov 2026, 8pm local

const withSkill = (q: number, n = 5): ComfortState => ({ ...INITIAL, recent: Array(n).fill(q) });

describe('earnings rate follows learning quality, not time played', () => {
  it('uses the base rate before any case and rises with case quality', () => {
    expect(ratePerHour(INITIAL)).toBe(RATE_BASE);
    expect(ratePerHour(withSkill(1))).toBe(RATE_BASE + RATE_SKILL);
    expect(ratePerHour(withSkill(0.5))).toBeCloseTo(RATE_BASE + RATE_SKILL / 2);
  });

  it('records case quality as score share, keeping a bounded window', () => {
    let s = INITIAL;
    for (let i = 0; i < 30; i++) s = recordCase(s, 1300, 1300, T0);
    s = recordCase(s, 0, 1300, T0);
    expect(s.recent.length).toBeLessThanOrEqual(12);
    expect(s.recent.at(-1)).toBe(0);
    expect(skillOf(s)).toBeLessThan(1);
    expect(recordCase(INITIAL, 5, 0, T0).recent).toEqual([0]);
  });

  it('counts patients per day and restarts the count on a new day', () => {
    let s = recordCase(INITIAL, 1, 2, T0);
    s = recordCase(s, 1, 2, T0 + H);
    expect(s.today.cases).toBe(2);
    s = recordCase(s, 1, 2, T0 + DAY);
    expect(s.today.cases).toBe(1);
  });

  it('caps an absence at 8 hours', () => {
    const s = withSkill(1);
    expect(earningsFor(s, 2 * H)).toBeCloseTo(2 * ratePerHour(s));
    expect(earningsFor(s, 30 * H)).toBeCloseTo(EARN_CAP_HOURS * ratePerHour(s));
    expect(earningsFor(s, -5)).toBe(0);
  });
});

describe('arrive (returning to the clinic)', () => {
  it('anchors the first visit without paying anything', () => {
    const s = arrive(INITIAL, T0);
    expect(s.lastSeenAt).toBe(T0);
    expect(s.jar).toBe(0);
    expect(s.welcome).toBeNull();
  });

  it('ignores short tab switches and clocks moving backwards', () => {
    const base = { ...INITIAL, lastSeenAt: T0 };
    expect(arrive(base, T0 + MIN_AWAY_MS - 1).welcome).toBeNull();
    const back = arrive(base, T0 - 5 * H);
    expect(back.jar).toBe(0);
    expect(back.lastSeenAt).toBe(T0 - 5 * H);
  });

  it('fills the jar and prepares a welcome note after a real absence', () => {
    const s = arrive({ ...withSkill(1), lastSeenAt: T0 }, T0 + 3 * H);
    expect(s.jar).toBeCloseTo(3 * (RATE_BASE + RATE_SKILL));
    expect(s.welcome?.coins).toBe(Math.floor(s.jar));
    expect(s.welcome?.comebackCoins).toBe(0);
  });

  it('never fills the jar beyond its capacity, even across several absences', () => {
    let s: ComfortState = { ...withSkill(0.6), lastSeenAt: T0 };
    for (let i = 1; i <= 5; i++) s = arrive(s, T0 + i * 10 * H);
    expect(s.jar).toBeCloseTo(jarCapacity(s));
  });

  it('gives a comeback bonus after 3+ days, at most once a week', () => {
    const s1 = arrive({ ...INITIAL, lastSeenAt: T0 }, T0 + COMEBACK_AFTER_MS);
    expect(s1.welcome?.comebackCoins).toBe(COMEBACK_COINS);
    const { state: s2 } = collect(s1);
    const s3 = arrive({ ...s2 }, T0 + COMEBACK_AFTER_MS + 4 * DAY);
    expect(s3.welcome?.comebackCoins ?? 0).toBe(0); // within the cooldown window
    const s4 = arrive({ ...collect(s3).state }, T0 + COMEBACK_AFTER_MS + 4 * DAY + COMEBACK_AFTER_MS);
    expect(s4.welcome?.comebackCoins).toBe(COMEBACK_COINS);
  });
});

describe('collect / dismiss', () => {
  it('pays whole coins and keeps the fraction in the jar', () => {
    const s = { ...INITIAL, jar: 12.75, welcome: { awayMs: H, coins: 12, comebackCoins: 0, at: T0 } };
    const out = collect(s);
    expect(out.coins).toBe(12);
    expect(out.state.jar).toBeCloseTo(0.75);
    expect(out.state.welcome).toBeNull();
    expect(out.state.lifetime.earned).toBe(12);
  });

  it('dismissing never loses anything: the comeback gift is kept for later', () => {
    const s = { ...INITIAL, jar: 10, welcome: { awayMs: 4 * DAY, coins: 10, comebackCoins: COMEBACK_COINS, at: T0 } };
    const d = dismissWelcome(s);
    expect(d.welcome).toBeNull();
    expect(d.jar).toBe(10);
    expect(d.bonus).toBe(COMEBACK_COINS);
    expect(collectable(d)).toBe(10 + COMEBACK_COINS);
    expect(dismissWelcome(INITIAL)).toBe(INITIAL);
    const out = collect(d);
    expect(out.coins + out.comeback).toBe(10 + COMEBACK_COINS);
    expect(out.state.bonus).toBe(0);
  });

  it('a kept comeback gift survives later absences (dismiss → arrive)', () => {
    // skill 0 → capacity 32: the reviewer's 182 → 32 repro
    const back = arrive({ ...INITIAL, lastSeenAt: T0, jar: 32 }, T0 + 4 * DAY);
    const kept = dismissWelcome(back);
    expect(collectable(kept)).toBe(32 + COMEBACK_COINS);
    const later = arrive(kept, T0 + 4 * DAY + 3 * H);
    expect(collectable(later)).toBe(32 + COMEBACK_COINS);
    const out = collect(later);
    expect(out.coins + out.comeback).toBe(32 + COMEBACK_COINS);
  });

  it('a drop in skill never trims coins already earned', () => {
    let s: ComfortState = arrive({ ...withSkill(1, 12), lastSeenAt: T0 }, T0 + 10 * H);
    const full = s.jar;
    expect(full).toBeCloseTo(jarCapacity(s));
    for (let i = 0; i < 12; i++) s = recordCase(s, 0, 1300, T0 + 10 * H);
    expect(jarCapacity(s)).toBeLessThan(full);
    s = arrive(s, T0 + 20 * H);
    expect(s.jar).toBe(full);
  });

  it('after "keep it in the jar" the note only returns once the jar has grown', () => {
    const s0 = arrive({ ...withSkill(1), lastSeenAt: T0 }, T0 + 2 * H);
    expect(s0.welcome).not.toBeNull();
    const kept = dismissWelcome(s0);
    const short = arrive(kept, T0 + 2 * H + 30 * 60_000); // +7.5 coins
    expect(short.welcome).toBeNull();
    const long = arrive(short, T0 + 2 * H + 30 * 60_000 + 2 * H); // +30 more
    expect(long.welcome).not.toBeNull();
    expect(long.keptCoins).toBeNull();
  });
});

describe('comeback gifts stack', () => {
  it('a second comeback due while the first note is unread is added, not merged', () => {
    const s1 = arrive({ ...INITIAL, lastSeenAt: T0 }, T0 + 4 * DAY);
    expect(s1.welcome?.comebackCoins).toBe(COMEBACK_COINS);
    // the note is never read; the player is away again for long enough for another gift
    const s2 = arrive(s1, T0 + 4 * DAY + 8 * DAY);
    expect(s2.welcome?.comebackCoins).toBe(2 * COMEBACK_COINS);
    const out = collect(s2);
    expect(out.comeback).toBe(2 * COMEBACK_COINS);
  });
});

describe('no-loss property: only collect lowers what the player is owed', () => {
  const owed = (s: ComfortState) => s.jar + s.bonus + (s.welcome?.comebackCoins ?? 0);
  it('holds across thousands of random arrive / dismiss / recordCase / collect sequences', () => {
    const rng = createRng('lounge-property');
    for (let run = 0; run < 200; run++) {
      let s: ComfortState = { ...INITIAL, lastSeenAt: T0 };
      let t = T0;
      // comeback-gift ledger: every gift granted is either paid out or still held
      let granted = 0;
      let giftsPaid = 0;
      const giftsHeld = (x: ComfortState) => x.bonus + (x.welcome?.comebackCoins ?? 0);
      for (let step = 0; step < 40; step++) {
        const before = owed(s);
        const op = rng.next();
        if (op < 0.4) {
          const gaps = [5 * 60_000, 25 * 60_000, 3 * H, 9 * H, 2 * DAY, 4 * DAY, 9 * DAY];
          t += gaps[Math.floor(rng.next() * gaps.length)]!;
          const prevAt = s.comebackAt;
          s = arrive(s, t);
          if (s.comebackAt !== prevAt) granted += COMEBACK_COINS;
        } else if (op < 0.6) {
          s = dismissWelcome(s);
        } else if (op < 0.85) {
          s = recordCase(s, Math.floor(rng.next() * 1300), 1300, t);
        } else {
          const bonusBefore = s.bonus;
          const out = collect(s);
          expect(out.coins + out.comeback).toBeCloseTo(before - (s.jar % 1)); // only the fraction stays behind
          giftsPaid += bonusBefore + out.comeback;
          s = out.state;
          expect(owed(s)).toBeLessThan(1);
          expect(giftsPaid + giftsHeld(s)).toBe(granted);
          continue;
        }
        expect(owed(s)).toBeGreaterThanOrEqual(before - 1e-9);
        expect(s.jar).toBeGreaterThanOrEqual(0);
        expect(giftsPaid + giftsHeld(s)).toBe(granted); // comeback gifts never merge or vanish
      }
    }
  });
});

describe('daily gift calendar', () => {
  it('escalates over seven evenings with satchels on 3 and 7', () => {
    expect(GIFT_CALENDAR).toHaveLength(7);
    for (let i = 1; i < 7; i++) expect(GIFT_CALENDAR[i]!.coins).toBeGreaterThan(GIFT_CALENDAR[i - 1]!.coins);
    expect(GIFT_CALENDAR.filter((g) => g.satchel).map((g) => g.day)).toEqual([3, 7]);
  });

  it('allows one claim per calendar day', () => {
    const a = claimGift(INITIAL, T0, 0.5)!;
    expect(a.result.coins).toBe(20);
    expect(giftReady(a.state, T0 + H)).toBe(false);
    expect(claimGift(a.state, T0 + H, 0.5)).toBeNull();
    expect(giftReady(a.state, T0 + DAY)).toBe(true);
  });

  it('never resets after missed days and cycles after day 7', () => {
    let s = INITIAL;
    for (let d = 0; d < 7; d++) s = claimGift(s, T0 + d * 3 * DAY, 0.1)!.state; // claim every third day
    expect(s.gift.next).toBe(0);
    expect(s.gift.totalClaims).toBe(7);
    const eighth = claimGift(s, T0 + 30 * DAY, 0.1)!;
    expect(eighth.result.day.day).toBe(1);
  });

  it('rolls a satchel with published odds that sum to one and tilt with skill', () => {
    for (const grand of [false, true]) {
      for (const k of [0, 0.5, 1]) {
        const o = satchelOdds(k, grand);
        expect(o.common + o.rare + o.epic + o.legendary).toBeCloseTo(1);
      }
      expect(satchelOdds(1, grand).legendary).toBeGreaterThan(satchelOdds(0, grand).legendary);
    }
    const o = satchelOdds(0, false);
    expect(rollRarity(o, 0)).toBe('common');
    expect(rollRarity(o, 0.9999)).toBe('legendary');
    let s: ComfortState = { ...INITIAL, gift: { lastClaimDay: null, next: 2, totalClaims: 2 } };
    const r = claimGift(s, T0, 0)!;
    expect(r.result.satchel).toEqual({ rarity: 'common', coins: SATCHEL_BONUS.common });
    expect(r.result.total).toBe(40 + SATCHEL_BONUS.common);
    s = r.state;
    expect(s.gift.next).toBe(3);
  });

  it('describes the way to the grand satchel without counting days', () => {
    const at = (next: number, totalClaims = next) => ({ ...INITIAL, gift: { lastClaimDay: null, next, totalClaims } });
    expect(grandSatchelHint(at(0, 0), true)).toBe('6 gifts until the grand satchel');
    expect(grandSatchelHint(at(1), false)).toBe('5 gifts until the grand satchel');
    expect(grandSatchelHint(at(5), true)).toBe('1 gift until the grand satchel');
    expect(grandSatchelHint(at(6), true)).toBe('Today: the grand satchel');
    expect(grandSatchelHint(at(6), false)).toBe('The grand satchel is next');
    expect(grandSatchelHint(at(0, 7), false)).toMatch(/fresh calendar/);
  });

  it('counts down to local midnight', () => {
    expect(msUntilTomorrow(T0)).toBe(4 * H);
  });
});

describe('sanitize & copy', () => {
  it('repairs corrupted saves', () => {
    const s = sanitize({ jar: -5, recent: [2, 0.5, 'x' as unknown as number], gift: { lastClaimDay: 3 as unknown as string, next: 99, totalClaims: -1 } });
    expect(s.jar).toBe(0);
    expect(s.recent).toEqual([0.5]);
    expect(s.gift).toEqual({ lastClaimDay: null, next: 6, totalClaims: 0 });
    expect(sanitize(null)).toEqual(INITIAL);
    expect(sanitize({ bonus: -3, keptCoins: 'x' as unknown as number }).bonus).toBe(0);
  });

  it('formats durations and never uses guilt in greetings', () => {
    expect(formatDuration(25 * 60_000)).toBe('25 min');
    expect(formatDuration(3 * H + 20 * 60_000)).toBe('3h 20m');
    expect(formatDuration(4 * DAY)).toBe('4 days');
    for (const h of [0, 8, 14, 20]) {
      for (const away of [H, 4 * DAY]) expect(welcomeLine(away, h)).not.toMatch(/miss(ed)?|lost|streak|abandon/i);
    }
  });
});

describe('salutation', () => {
  it('follows the clock', () => {
    expect(salutation(8)).toBe('Good morning');
    expect(salutation(14)).toBe('Good afternoon');
    expect(salutation(20)).toBe('Good evening');
    expect(salutation(2)).toBe('A calm late shift');
    expect(salutation(23)).toBe('A calm late shift');
  });
});
