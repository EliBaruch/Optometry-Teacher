/** Pure helpers for the settings scene (unit-tested). */

export const NAME_MAX = 24;
export const DEFAULT_NAME = 'Doctor';
const SAVE_PREFIX = 'lumen:';
/** The namespace the core settings slice is persisted under. */
export const SETTINGS_KEY = SAVE_PREFIX + 'settings';

/** Trim, collapse whitespace, strip control/markup characters and cap the length. */
export function sanitizeName(raw: string): string {
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f<>{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  return cleaned || DEFAULT_NAME;
}

/** 0..1 → "80%" */
export function percent(v: number): string {
  const n = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  return `${Math.round(n * 100)}%`;
}

/** Snap a slider value to 1% steps and clamp to 0..1. */
export function snapVolume(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
}

/** "lumen-save-2026-11-24.json" (local date). */
export function saveFileName(nowMs: number): string {
  const d = new Date(nowMs);
  const p = (n: number) => String(n).padStart(2, '0');
  return `lumen-save-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** How many module records an exported save string contains. */
export function countRecords(exported: string): number {
  try {
    const o = JSON.parse(exported) as Record<string, unknown>;
    return Object.keys(o).filter((k) => k.startsWith(SAVE_PREFIX)).length;
  } catch {
    return 0;
  }
}

export type ImportCheck =
  | { ok: true; json: string; records: number; hasSettings: boolean }
  | { ok: false; error: string };

/**
 * Validate a save file before handing it to SaveService.importAll. Accepts only
 * a flat object of "lumen:*" keys whose values are JSON envelope strings.
 */
export function validateImport(text: string): ImportCheck {
  if (!text.trim()) return { ok: false, error: 'That file is empty.' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not a Lumen save (it is not valid JSON).' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'That file is not a Lumen save.' };
  }
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (!k.startsWith(SAVE_PREFIX)) continue;
    if (typeof v !== 'string') return { ok: false, error: `The record “${k.slice(SAVE_PREFIX.length)}” is damaged.` };
    try {
      const env = JSON.parse(v) as { v?: unknown };
      if (!env || typeof env !== 'object' || typeof env.v !== 'number') throw new Error('bad envelope');
    } catch {
      return { ok: false, error: `The record “${k.slice(SAVE_PREFIX.length)}” is damaged.` };
    }
    clean[k] = v;
  }
  const records = Object.keys(clean).length;
  if (!records) return { ok: false, error: 'No Lumen progress was found in that file.' };
  return { ok: true, json: JSON.stringify(clean), records, hasSettings: SETTINGS_KEY in clean };
}

/** From a full export, keep only the settings record (so "reset progress" can keep volume & name). */
export function settingsOnly(exported: string): string | null {
  try {
    const o = JSON.parse(exported) as Record<string, unknown>;
    const v = o[SETTINGS_KEY];
    return typeof v === 'string' ? JSON.stringify({ [SETTINGS_KEY]: v }) : null;
  } catch {
    return null;
  }
}
