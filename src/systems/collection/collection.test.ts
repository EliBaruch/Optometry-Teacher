import { describe, expect, it } from 'vitest';
import { createServices, type ClinicalCase, type Diagnosis, type GameServices, type Grade, type RewardGrant, type ScoreBreakdown } from '@core';
import { WINGS, cardNumber, formatCardDate, newlyCompletedSets, orderedDiagnoses, setProgress } from './catalog';
import {
  BASE_ODDS, CARD_RARITIES, FRAME_LABEL, INITIAL_STATE, MILESTONES, acquire, finestCards, frameFor, glimpse, markAllSeen, newMilestones, nextFrame,
  oddsFor, pickPearl, rollRarity, shineFor, unseenCount, type Acquisition, type CardRarity,
} from './model';
import { cardPalette, cardPaletteInfo, hexToHsl, hslToHex, hueDelta, irisHue } from './palette';
import { createStore, onCaseCompleted, wireStore } from './store';
import collection from './index';

const acq = (over: Partial<Acquisition> = {}): Acquisition => ({
  caseId: 'c1', patient: 'Grace Okafor', irisColor: '#3a2412', grade: 'A', rarity: 'common', at: 1000, seed: 7, ...over,
});

const dx = (id: string, category: Diagnosis['category'], rarity: Diagnosis['rarity'] = 'common'): Diagnosis => ({
  id, name: id.toUpperCase(), category, summary: '', keyFindings: ['k1', 'k2'], typicalUrgency: 'routine', pearls: ['p1', 'p2'], rarity,
});

const score = (over: Partial<ScoreBreakdown> = {}): ScoreBreakdown => ({
  total: 1200, max: 1300, grade: 'S', perfect: false, diagnosisCorrect: true, urgencyCorrect: true,
  correctDiagnosisId: 'lens-a', chosenDiagnosisId: 'lens-a', parts: [], essentialMissed: [], unnecessaryTests: [],
  keyQuestionsAsked: 2, keyQuestionsTotal: 2, skillAvg: 0.9, elapsedSec: 60, parSec: 90, ...over,
});

const kase = (id: string, diagnosis: string): ClinicalCase => ({
  id, difficulty: 2, tags: [], chiefComplaint: '', history: [], findings: {} as ClinicalCase['findings'], essentialTests: [], helpfulTests: [],
  diagnosis, differentials: [], urgency: 'routine', management: '', teachingPoints: [],
  patient: { name: 'Hal Brennan', age: 60, sex: 'M', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#4f86b3', outfit: '#345' } },
});

describe('odds & rarity', () => {
  it('every grade table sums to 1', () => {
    for (const g of Object.keys(BASE_ODDS) as Grade[]) {
      const sum = CARD_RARITIES.reduce((s, r) => s + BASE_ODDS[g][r], 0);
      expect(sum).toBeCloseTo(1, 9);
    }
  });
  it('better grades never have worse legendary/epic odds', () => {
    const order: Grade[] = ['D', 'C', 'B', 'A', 'S'];
    for (let i = 1; i < order.length; i++) {
      const lo = BASE_ODDS[order[i - 1]!];
      const hi = BASE_ODDS[order[i]!];
      expect(hi.epic + hi.legendary).toBeGreaterThanOrEqual(lo.epic + lo.legendary);
    }
  });
  it('perfect S and zebra bonuses move probability up, keeping the total at 1', () => {
    const p = oddsFor('S', true);
    expect(p.legendary).toBeCloseTo(BASE_ODDS.S.legendary + 0.08);
    expect(CARD_RARITIES.reduce((s, r) => s + p[r], 0)).toBeCloseTo(1);
    const z = oddsFor('B', false, 'rare');
    expect(z.epic).toBeCloseTo(BASE_ODDS.B.epic + 0.05);
    expect(oddsFor('D', false, 'rare')).toEqual(BASE_ODDS.D);
  });
  it('rollRarity maps rolls onto cumulative odds', () => {
    const o = BASE_ODDS.A;
    expect(rollRarity(o, 0)).toBe('common');
    expect(rollRarity(o, 0.34)).toBe('common');
    expect(rollRarity(o, 0.36)).toBe('rare');
    expect(rollRarity(o, 0.81)).toBe('epic');
    expect(rollRarity(o, 0.99)).toBe('legendary');
    expect(rollRarity(BASE_ODDS.C, 0.999999999)).toBe('rare');
  });
});

describe('frames', () => {
  it('shine scales with grade', () => {
    expect(shineFor('S')).toBe(3);
    expect(shineFor('A')).toBe(2);
    expect(shineFor('C')).toBe(1);
  });
  it('frames follow thresholds', () => {
    expect(frameFor(0)).toBe('bronze');
    expect(frameFor(2)).toBe('silver');
    expect(frameFor(6)).toBe('gold');
    expect(frameFor(40)).toBe('prismatic');
    expect(nextFrame(3)).toEqual({ tier: 'gold', need: 3, from: 2, to: 6 });
    expect(nextFrame(12)).toBeNull();
  });
});

describe('acquire', () => {
  it('first copy is new, bronze, unseen', () => {
    const { state, pull } = acquire(INITIAL_STATE, 'dry-eye', acq());
    expect(pull.isNew).toBe(true);
    expect(state.cards['dry-eye']!.copies).toBe(1);
    expect(state.cards['dry-eye']!.seen).toBe(false);
    expect(unseenCount(state)).toBe(1);
    expect(state.pulls).toBe(1);
  });
  it('duplicates add shine, upgrade frames and keep the best rarity as featured art', () => {
    let s = acquire(INITIAL_STATE, 'dry-eye', acq({ rarity: 'rare' })).state;
    s = markAllSeen(s);
    const r1 = acquire(s, 'dry-eye', acq({ grade: 'S', rarity: 'common', caseId: 'c2', at: 2000 }));
    expect(r1.pull.isNew).toBe(false);
    expect(r1.pull.shineGained).toBe(3);
    expect(r1.pull.frameBefore).toBe('bronze');
    expect(r1.pull.frameAfter).toBe('silver');
    expect(r1.state.cards['dry-eye']!.rarity).toBe('rare');
    expect(r1.state.cards['dry-eye']!.featured.caseId).toBe('c1');
    expect(r1.state.cards['dry-eye']!.seen).toBe(false); // upgraded → highlight again
    const r2 = acquire(r1.state, 'dry-eye', acq({ grade: 'B', rarity: 'legendary', caseId: 'c3', at: 3000 }));
    expect(r2.pull.rarityUp).toBe(true);
    expect(r2.state.cards['dry-eye']!.featured.caseId).toBe('c3');
    expect(r2.state.cards['dry-eye']!.history.map((h) => h.caseId)).toEqual(['c3', 'c2', 'c1']);
    expect(r2.state.cards['dry-eye']!.bestGrade).toBe('S');
  });
  it('glimpses name a silhouette without penalty and clear once collected', () => {
    let s = glimpse(INITIAL_STATE, 'crao', 'c9', 5);
    s = glimpse(s, 'crao', 'c9', 6);
    expect(s.glimpsed).toEqual(['crao']);
    expect(s.lastGlimpse?.dx).toBe('crao');
    s = acquire(s, 'crao', acq()).state;
    expect(s.glimpsed).toEqual([]);
  });
  it('milestones fire once', () => {
    const s = acquire(INITIAL_STATE, 'a', acq({ rarity: 'legendary' })).state;
    const ids = newMilestones(s, 50).map((m) => m.id);
    expect(ids).toContain('first-light');
    expect(ids).toContain('first-legendary');
    expect(newMilestones({ ...s, achievements: ids }, 50)).toEqual([]);
  });
  it('pickPearl is deterministic', () => {
    expect(pickPearl(['a', 'b', 'c'], 4)).toBe('b');
    expect(pickPearl([], 4)).toBeUndefined();
  });
});

describe('catalog', () => {
  const all = [dx('b2', 'retina'), dx('a1', 'refractive'), dx('b1', 'retina'), dx('z', 'neuro')];
  it('orders by category then name and numbers cards', () => {
    expect(orderedDiagnoses(all).map((d) => d.id)).toEqual(['a1', 'b1', 'b2', 'z']);
    expect(cardNumber(orderedDiagnoses(all), 'b2')).toBe(3);
  });
  it('tracks set progress and completions', () => {
    let s = acquire(INITIAL_STATE, 'b1', acq()).state;
    expect(setProgress(s, all).find((p) => p.category === 'retina')).toMatchObject({ owned: 1, total: 2, complete: false });
    s = acquire(s, 'b2', acq()).state;
    expect(newlyCompletedSets(s, all).map((p) => p.category)).toEqual(['retina']);
    expect(newlyCompletedSets({ ...s, completedSets: ['retina'] }, all)).toEqual([]);
  });
  it('formats dates', () => {
    expect(formatCardDate(Date.UTC(2026, 10, 24, 12))).toMatch(/24 Nov 2026/);
  });
});

describe('palette', () => {
  it('round-trips hsl', () => {
    for (const hex of ['#4f86b3', '#3a2412', '#ffd27a', '#808080']) {
      const back = hslToHex(hexToHsl(hex));
      const diff = [1, 3, 5].map((i) => Math.abs(parseInt(back.slice(i, i + 2), 16) - parseInt(hex.slice(i, i + 2), 16)));
      expect(Math.max(...diff)).toBeLessThanOrEqual(1);
    }
  });
  // Real patient iris colours from the case library (mostly brown, plus hazel/green/blue/grey-blue).
  const IRISES = ['#2a1a10', '#3a2412', '#5b4a2e', '#2a160c', '#4b3621', '#6b4a2e', '#7a8a6a', '#5b7f4a', '#5d8a6a', '#4f86b3', '#8fb3cf', '#7a8fa6', '#6b8e9e'];
  const SEEDS = Array.from({ length: 40 }, (_, i) => (i * 2654435761) >>> 0);
  const hue = (hex: string) => hexToHsl(hex).h;

  it('paints every stromal colour from the iris hue family (common & rare)', () => {
    for (const iris of IRISES) {
      for (const seed of SEEDS) {
        for (const r of ['common', 'rare'] as const) {
          const p = cardPalette(iris, r, seed);
          for (const c of p) expect(Math.abs(hueDelta(hue(c), irisHue(iris))), `${iris} ${r} ${seed} ${c}`).toBeLessThanOrEqual(35);
        }
      }
    }
  });
  it('epic & legendary add exactly one exotic gem, as a minority entry', () => {
    for (const iris of IRISES) {
      for (const seed of SEEDS.slice(0, 12)) {
        for (const r of ['epic', 'legendary'] as const) {
          const { colors, exotic } = cardPaletteInfo(iris, r, seed);
          const off = colors.filter((c) => Math.abs(hueDelta(hue(c), irisHue(iris))) > 35);
          expect(off.length).toBeLessThanOrEqual(1);
          expect(exotic).toBe(colors.length - 1);
          expect(exotic).toBeGreaterThanOrEqual(4); // never the inner/mid/outer stroma
        }
      }
    }
  });
  it('a brown iris stays brown: warm, dark-to-mid and never neon', () => {
    for (const seed of SEEDS) {
      const [, mid] = cardPalette('#2a1a10', 'common', seed).map(hexToHsl);
      expect(mid!.h).toBeGreaterThan(5);
      expect(mid!.h).toBeLessThan(50);
      expect(mid!.l).toBeLessThan(0.45);
      expect(mid!.s).toBeLessThan(0.7);
    }
  });
  it('two cards with the same iris colour look clearly different by seed', () => {
    const a = cardPaletteInfo('#3a2412', 'common', 1);
    const b = cardPaletteInfo('#3a2412', 'common', 0xabcdef);
    const dist = (x: string, y: string) => {
      const p = hexToHsl(x);
      const q = hexToHsl(y);
      return Math.abs(hueDelta(p.h, q.h)) / 60 + Math.abs(p.l - q.l) * 4 + Math.abs(p.s - q.s) * 2;
    };
    const total = a.colors.reduce((s, c, i) => s + dist(c, b.colors[i]!), 0);
    expect(total).toBeGreaterThan(0.6);
    // across many seeds, every lighting character appears
    const chars = new Set(SEEDS.map((s) => cardPaletteInfo('#3a2412', 'common', s).character));
    expect(chars.size).toBe(3);
    expect(cardPalette('#5a3a22', 'epic', 42)).toEqual(cardPalette('#5a3a22', 'epic', 42));
  });
  it('handles odd input', () => {
    expect(cardPalette('nonsense', 'rare').every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
    expect(irisHue('#808080')).toBe(205);
    expect(hueDelta(350, 10)).toBe(-20);
    expect(hueDelta(10, 350)).toBe(20);
  });
});

function setup(): { services: GameServices; rewards: RewardGrant[]; events: string[]; xp: number[]; coins: number[] } {
  let t = 1_700_000_000_000;
  const services = createServices({ now: () => (t += 1000) });
  services.registries.diagnoses.register(dx('lens-a', 'lens'));
  services.registries.diagnoses.register(dx('ret-a', 'retina'));
  services.registries.diagnoses.register(dx('ret-b', 'retina', 'rare'));
  services.registries.cases.register(kase('case-1', 'lens-a'));
  const rewards: RewardGrant[] = [];
  const events: string[] = [];
  const xp: number[] = [];
  const coins: number[] = [];
  services.bus.on('reward:granted', (r) => void rewards.push(r));
  services.bus.on('xp:grant', (e) => void xp.push(e.amount));
  services.bus.on('currency:grant', (e) => void coins.push(e.amount));
  services.bus.onAny((e) => void events.push(e));
  return { services, rewards, events, xp, coins };
}

describe('store wiring', () => {
  it('a correct case grants a card with the patient and a reward chip', () => {
    const { services, rewards } = setup();
    const store = createStore(services);
    const pull = onCaseCompleted(store, { caseId: 'case-1', modeId: 'shift', score: score() }, { roll: () => 0.99 });
    expect(pull?.isNew).toBe(true);
    expect(pull?.rarity).toBe('legendary');
    const card = store.state.get().cards['lens-a']!;
    expect(card.featured.patient).toBe('Hal Brennan');
    expect(card.featured.irisColor).toBe('#4f86b3');
    expect(rewards[0]).toMatchObject({ source: 'collection', value: 'NEW!', rarity: 'legendary' });
  });

  it('completing a set pays xp + coins once and announces it', () => {
    const { services, rewards, xp, coins, events } = setup();
    const store = createStore(services);
    onCaseCompleted(store, { caseId: 'case-1', modeId: 'shift', score: score() }, { roll: () => 0.5 });
    expect(xp.length).toBe(1); // lens set (1 card) complete
    expect(coins.length).toBe(1);
    expect(rewards.some((r) => r.label.startsWith('Set complete'))).toBe(true);
    expect(events).toContain('achievement:unlocked');
    expect(store.state.get().completedSets).toEqual(['lens']);
    expect(store.state.get().lastPull?.setCompleted).toBe('lens');
    onCaseCompleted(store, { caseId: 'case-1', modeId: 'shift', score: score({ grade: 'C' }) }, { roll: () => 0.5 });
    expect(coins.length).toBe(1);
  });

  it('frame upgrades pay XP for each tier crossed', () => {
    const { services, xp } = setup();
    const store = createStore(services);
    const ev = { caseId: 'x', modeId: 'shift', score: score({ correctDiagnosisId: 'ret-a', chosenDiagnosisId: 'ret-a' }) };
    onCaseCompleted(store, ev, { roll: () => 0 });
    expect(xp).toEqual([]);
    onCaseCompleted(store, ev, { roll: () => 0 }); // shine 3 → silver
    expect(xp).toEqual([30]);
    onCaseCompleted(store, ev, { roll: () => 0 }); // 6 → gold
    expect(xp).toEqual([30, 60]);
  });

  it('a missed diagnosis only glimpses — no card, no rewards', () => {
    const { services, rewards } = setup();
    const store = createStore(services);
    const pull = onCaseCompleted(store, { caseId: 'case-1', modeId: 'shift', score: score({ diagnosisCorrect: false, grade: 'F', chosenDiagnosisId: 'ret-a' }) });
    expect(pull).toBeNull();
    expect(store.state.get().cards).toEqual({});
    expect(store.state.get().glimpsed).toEqual(['lens-a']);
    expect(rewards).toEqual([]);
  });

  it('wireStore listens to case:completed and unsubscribes cleanly', () => {
    const { services } = setup();
    const store = createStore(services);
    const off = wireStore(store, { roll: () => 0.1 });
    services.bus.emit('case:completed', { caseId: 'case-1', modeId: 'shift', score: score() });
    expect(Object.keys(store.state.get().cards)).toEqual(['lens-a']);
    off();
    services.bus.emit('case:completed', { caseId: 'y', modeId: 'shift', score: score({ correctDiagnosisId: 'ret-a' }) });
    expect(Object.keys(store.state.get().cards)).toEqual(['lens-a']);
  });

  it('rarity rolls are deterministic per case + time by default', () => {
    const a = setup();
    const b = setup();
    const pa = onCaseCompleted(createStore(a.services), { caseId: 'case-1', modeId: 'm', score: score() });
    const pb = onCaseCompleted(createStore(b.services), { caseId: 'case-1', modeId: 'm', score: score() });
    expect(pa?.rarity).toBe(pb?.rarity);
  });
});

describe('system module', () => {
  it('has a neutral player-facing name and registers UI', () => {
    expect(collection.id).toBe('collection');
    expect(collection.name).toBe('Gallery');
    const { services } = setup();
    const off = collection.install(services);
    expect(services.registries.scenes.has('gallery')).toBe(true);
    expect(services.registries.hub.has('gallery')).toBe(true);
    const slots = services.registries.hud.all().filter((w) => w.system === 'collection').map((w) => w.slot);
    expect(slots).toEqual(expect.arrayContaining(['results-extra', 'hub-sidebar', 'profile']));
    services.bus.emit('case:completed', { caseId: 'case-1', modeId: 'shift', score: score() });
    const hub = services.registries.hub.get('gallery')!;
    expect(hub.badge?.(services)).toBe('1 NEW');
    off();
    expect(hub.badge?.(services)).toBeUndefined();
  });

  it('installing twice does not double-grant', () => {
    const { services, rewards } = setup();
    collection.install(services);
    const off = collection.install(services);
    services.bus.emit('case:completed', { caseId: 'case-1', modeId: 'shift', score: score() });
    expect(rewards.filter((r) => r.label.startsWith('Iris card')).length).toBe(1);
    off();
  });
});

describe('finest cards', () => {
  it('ranks by rarity, then polish, then recency', () => {
    const acq = (caseId: string, rarity: CardRarity, at: number) => ({ caseId, patient: 'P', irisColor: '#456', grade: 'A' as const, rarity, at, seed: at });
    let s = INITIAL_STATE;
    s = acquire(s, 'a', acq('1', 'rare', 1)).state;
    s = acquire(s, 'b', acq('2', 'legendary', 2)).state;
    s = acquire(s, 'c', acq('3', 'rare', 3)).state;
    s = acquire(s, 'a', acq('4', 'common', 4)).state; // polishes 'a' (shine 2) without changing its rarity
    s = acquire(s, 'd', acq('5', 'common', 5)).state;
    expect(finestCards(s, 3).map((c) => c.dx)).toEqual(['b', 'a', 'c']);
    expect(finestCards(s, 0)).toEqual([]);
  });
});

describe('player-facing copy', () => {
  it('never uses the internal design-lens vocabulary', () => {
    const text = JSON.stringify([MILESTONES.map((m) => [m.title, m.description]), WINGS, FRAME_LABEL, collection.name]);
    expect(text).not.toMatch(/\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i);
  });
});
