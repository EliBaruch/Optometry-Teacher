import type { HubEntry, ModeModule, ModeRules } from '@core';

/** Short rule chips for a mode card: '5 patients', 'Endless', '3 lives', '90 s each', '×1.5 score'. */
export function rulesSummary(rules: ModeRules): string[] {
  const out: string[] = [];
  if (rules.length === 'endless') out.push('Endless');
  else out.push(`${rules.length} ${rules.length === 1 ? 'patient' : 'patients'}`);
  if (rules.lives != null) out.push(`${rules.lives} ${rules.lives === 1 ? 'life' : 'lives'}`);
  if (rules.timeLimitSec) out.push(rules.timeLimitSec >= 120 && rules.timeLimitSec % 60 === 0 ? `${rules.timeLimitSec / 60} min each` : `${rules.timeLimitSec} s each`);
  if (rules.scoreMultiplier && rules.scoreMultiplier !== 1) out.push(`×${+rules.scoreMultiplier.toFixed(2)} score`);
  if (rules.hints === false) out.push('No hints');
  return out;
}

export const byOrder = <T extends { order: number; id: string }>(list: readonly T[]): T[] =>
  [...list].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export function greetingFor(hour: number): string {
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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
  { id: 'core-arcade', sceneId: 'arcade', title: 'Arcade', subtitle: 'Sharpen one test at a time', icon: 'target', accent: '#38bdf8' },
  { id: 'core-codex', sceneId: 'codex', title: 'Codex', subtitle: 'Every diagnosis you have met', icon: 'book', accent: '#a78bfa' },
  { id: 'core-profile', sceneId: 'profile', title: 'Profile', subtitle: 'Your record and specialty atlas', icon: 'user', accent: '#ffd27a' },
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
): WingView[] {
  const taken = new Set(entries.map((e) => e.sceneId));
  const wings: WingView[] = byOrder(entries)
    .filter((e) => hasScene(e.sceneId))
    .map((e) => ({
      key: e.id, sceneId: e.sceneId, params: e.params, title: e.title, subtitle: e.subtitle, icon: e.icon, accent: e.accent,
      badge: safe(() => ctx.badge(e)), lockedReason: safe(() => ctx.locked(e)),
    }));
  for (const c of CORE_TILES) if (!taken.has(c.sceneId) && hasScene(c.sceneId)) wings.push({ key: c.id, ...c });
  return wings;
}

function safe<T>(fn: () => T): T | undefined {
  try { return fn(); } catch { return undefined; }
}

export function modeLock(mode: ModeModule, lock: (m: ModeModule) => string | undefined): string | undefined {
  return safe(() => lock(mode));
}
