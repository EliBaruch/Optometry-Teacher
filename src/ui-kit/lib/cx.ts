/** Join class names, skipping falsy values. `cx('a', cond && 'b', { c: true })` */
export type ClassValue = string | number | false | null | undefined | Record<string, boolean | undefined | null>;

export function cx(...parts: ClassValue[]): string {
  let out = '';
  for (const p of parts) {
    if (!p && p !== 0) continue;
    if (typeof p === 'object') {
      for (const k in p) if (p[k]) out += (out ? ' ' : '') + k;
    } else {
      out += (out ? ' ' : '') + p;
    }
  }
  return out;
}
