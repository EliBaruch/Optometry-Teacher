import { pickStrings, type HubEntry, type Locale, type ModeModule, type ModeRules } from '@core';
import { S } from './strings';

/** Short rule chips for a mode card: '5 patients', 'Endless', '3 lives', '90 s each', '×1.5 score'. */
export function rulesSummary(rules: ModeRules, locale: Locale = 'en'): string[] {
  const t = pickStrings(S, locale);
  const out: string[] = [];
  if (rules.length === 'endless') out.push(t.endless);
  else out.push(t.patients(rules.length));
  if (rules.lives != null) out.push(t.lives(rules.lives));
  if (rules.timeLimitSec) out.push(rules.timeLimitSec >= 120 && rules.timeLimitSec % 60 === 0 ? t.minEach(rules.timeLimitSec / 60) : t.secEach(rules.timeLimitSec));
  if (rules.scoreMultiplier && rules.scoreMultiplier !== 1) out.push(t.scoreMult(+rules.scoreMultiplier.toFixed(2)));
  if (rules.hints === false) out.push(t.noHints);
  return out;
}

export const byOrder = <T extends { order: number; id: string }>(list: readonly T[]): T[] =>
  [...list].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export function greetingFor(hour: number, locale: Locale = 'en'): string {
  const t = pickStrings(S, locale);
  if (hour < 5) return t.greetNight;
  if (hour < 12) return t.greetMorning;
  if (locale === 'he' && hour >= 16 && hour < 18) return t.greetLateAfternoon;
  if (hour < 18) return t.greetAfternoon;
  return t.greetEvening;
}

/** Angles in degrees for an analogue clock. */
export function clockAngles(d: Date): { hour: number; minute: number; second: number } {
  const s = d.getSeconds();
  const m = d.getMinutes() + s / 60;
  const h = (d.getHours() % 12) + m / 60;
  return { hour: h * 30, minute: m * 6, second: s * 6 };
}

export interface CoreTile {
  id: string;
  sceneId: string;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
}

/** Built-in wings, shown only when their scene is registered. */
export const CORE_TILES: CoreTile[] = [
  { id: 'core-arcade', sceneId: 'arcade', title: 'Arcade', subtitle: 'Sharpen one test at a time', icon: 'target', accent: '#0284c7' },
  { id: 'core-codex', sceneId: 'codex', title: 'Codex', subtitle: 'Every diagnosis you have met', icon: 'book', accent: '#7c3aed' },
  { id: 'core-profile', sceneId: 'profile', title: 'Profile', subtitle: 'Your record and specialty atlas', icon: 'user', accent: '#2257f0' },
];

export interface WingView {
  key: string;
  sceneId: string;
  params?: Record<string, unknown>;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  badge?: string;
  lockedReason?: string;
}

/** Merge registry hub entries with core tiles; hides entries whose scene is absent. */
export function buildWings(
  entries: HubEntry[],
  hasScene: (id: string) => boolean,
  ctx: { badge: (e: HubEntry) => string | undefined; locked: (e: HubEntry) => string | undefined },
  locale: Locale = 'en',
): WingView[] {
  const t = pickStrings(S, locale);
  const names: Record<string, readonly string[]> = { arcade: t.arcade, codex: t.codex, profile: t.profile };
  const taken = new Set(entries.map((e) => e.sceneId));
  const wings: WingView[] = byOrder(entries)
    .filter((e) => hasScene(e.sceneId))
    .map((e) => ({
      key: e.id, sceneId: e.sceneId, params: e.params, title: e.title, subtitle: e.subtitle, icon: e.icon, accent: e.accent,
      badge: safe(() => ctx.badge(e)), lockedReason: safe(() => ctx.locked(e)),
    }));
  for (const c of CORE_TILES) if (!taken.has(c.sceneId) && hasScene(c.sceneId)) wings.push({ key: c.id, ...c, ...(names[c.sceneId] ? { title: names[c.sceneId]![0], subtitle: names[c.sceneId]![1] } : {}) });
  return wings;
}

function safe<T>(fn: () => T): T | undefined {
  try { return fn(); } catch { return undefined; }
}

export function modeLock(mode: ModeModule, lock: (m: ModeModule) => string | undefined): string | undefined {
  return safe(() => lock(mode));
}

export interface ModeSplit<T> { playable: T[]; soon: { mode: T; reason: string }[] }

/** Splits ordered modes into playable ones and locked ("coming up") ones with their reasons. */
export function splitModes<T extends { order: number; id: string }>(
  modes: readonly T[],
  lock: (m: T) => string | undefined,
): ModeSplit<T> {
  const out: ModeSplit<T> = { playable: [], soon: [] };
  for (const m of byOrder(modes)) {
    const reason = safe(() => lock(m));
    if (reason) out.soon.push({ mode: m, reason });
    else out.playable.push(m);
  }
  return out;
}

export interface Sitter { seed: number; age: number; sex: 'M' | 'F' }
const SITTER_POOL: Sitter[] = [
  { seed: 11, age: 71, sex: 'F' }, { seed: 42, age: 9, sex: 'M' }, { seed: 77, age: 38, sex: 'M' },
  { seed: 5, age: 54, sex: 'F' }, { seed: 93, age: 27, sex: 'F' }, { seed: 130, age: 66, sex: 'M' },
  { seed: 61, age: 12, sex: 'F' }, { seed: 208, age: 45, sex: 'M' },
];

/** Picks `n` distinct waiting-room patients, varying with `salt` (e.g. the visit time). */
export function pickSitters(salt: number, n = 3): Sitter[] {
  const pool = [...SITTER_POOL];
  let s = (salt >>> 0) || 1;
  const out: Sitter[] = [];
  while (out.length < n && pool.length) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out.push(pool.splice(s % pool.length, 1)[0]!);
  }
  return out;
}
