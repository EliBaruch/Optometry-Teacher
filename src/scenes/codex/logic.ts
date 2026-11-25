/** Pure helpers for the Codex scene (unit-tested). */
import type { ClinicalCase, Diagnosis, DiagnosisCategory, DiagnosisId, Urgency } from '@core';

export interface CategoryMeta {
  label: string;
  blurb: string;
  /** IconName from @ui-kit */
  icon: string;
  accent: string;
}

export const CATEGORY_ORDER: DiagnosisCategory[] = [
  'refractive', 'binocular', 'anterior', 'cornea', 'glaucoma', 'lens', 'retina', 'neuro', 'systemic', 'normal',
];

export const CATEGORY_META: Record<DiagnosisCategory, CategoryMeta> = {
  refractive: { label: 'Refraction', blurb: 'How light is focused — and how lenses set it right.', icon: 'phoropter', accent: '#ffd27a' },
  binocular: { label: 'Binocular Vision', blurb: 'Two eyes, one picture: alignment, focusing and the nerves that steer.', icon: 'cover-test', accent: '#a78bfa' },
  anterior: { label: 'Lids & Anterior Eye', blurb: 'Lids, lashes, conjunctiva and sclera — the red eyes of the world.', icon: 'slit-lamp', accent: '#f472b6' },
  cornea: { label: 'Cornea', blurb: 'The clear window: abrasions, infections and shape.', icon: 'fluorescein', accent: '#38bdf8' },
  glaucoma: { label: 'Glaucoma & Uvea', blurb: 'Pressure, drainage angles and inflammation inside the eye.', icon: 'tonometry', accent: '#4ade80' },
  lens: { label: 'Lens', blurb: 'The crystalline lens and its slow clouding.', icon: 'eye', accent: '#fde68a' },
  retina: { label: 'Retina & Vitreous', blurb: 'The living film: vessels, macula and detachments.', icon: 'ophthalmoscopy', accent: '#fb923c' },
  neuro: { label: 'Neuro-Ophthalmology', blurb: 'Optic nerves, pupils, pathways and the brain behind the eye.', icon: 'visual-fields', accent: '#c084fc' },
  systemic: { label: 'Systemic Disease', blurb: 'When the body speaks through the eye.', icon: 'heart', accent: '#ef4444' },
  normal: { label: 'Healthy Eyes', blurb: 'Knowing normal is half of every diagnosis.', icon: 'star', accent: '#5eead4' },
};

export const URGENCY_META: Record<Urgency, { label: string; when: string; color: string; rank: number }> = {
  routine: { label: 'Routine', when: 'Book a normal appointment — weeks to months.', color: '#5eead4', rank: 0 },
  soon: { label: 'Soon', when: 'See within days.', color: '#38bdf8', rank: 1 },
  urgent: { label: 'Urgent', when: 'Same day, or within 24 hours.', color: '#fbbf24', rank: 2 },
  emergency: { label: 'Emergency', when: 'Immediately — sight- or life-threatening.', color: '#f43f5e', rank: 3 },
};

export const RARITY_META: Record<Diagnosis['rarity'], { label: string; color: string }> = {
  common: { label: 'Common', color: '#cbd5e1' },
  uncommon: { label: 'Uncommon', color: '#38bdf8' },
  rare: { label: 'Rare', color: '#c084fc' },
};

export function categoryMeta(c: string): CategoryMeta {
  return CATEGORY_META[c as DiagnosisCategory] ?? { label: c.charAt(0).toUpperCase() + c.slice(1), blurb: '', icon: 'book', accent: '#ffd27a' };
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Every whitespace-separated token must appear in the name, aliases, id or key findings. */
export function matchesQuery(d: Diagnosis, query: string): boolean {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const hay = norm([d.name, d.id, ...(d.aka ?? []), ...d.keyFindings].join(' '));
  return tokens.every((t) => hay.includes(t));
}

export interface CodexGroup {
  category: DiagnosisCategory;
  items: Diagnosis[];
}

/** Group by category in canonical order (unknown categories last), entries sorted by name. */
export function groupDiagnoses(list: readonly Diagnosis[], opts: { category?: string | null; query?: string } = {}): CodexGroup[] {
  const byCat = new Map<DiagnosisCategory, Diagnosis[]>();
  for (const d of list) {
    if (opts.category && d.category !== opts.category) continue;
    if (opts.query && !matchesQuery(d, opts.query)) continue;
    const arr = byCat.get(d.category) ?? [];
    arr.push(d);
    byCat.set(d.category, arr);
  }
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c as DiagnosisCategory);
    return i < 0 ? 99 : i;
  };
  return [...byCat.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([category, items]) => ({ category, items: items.sort((x, y) => x.name.localeCompare(y.name)) }));
}

/** Friendly label for a reference URL. */
export function referenceLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('eyewiki')) return 'EyeWiki';
    if (host.includes('ncbi.nlm.nih.gov')) return 'StatPearls';
    if (host.includes('aao.org')) return 'American Academy of Ophthalmology';
    if (host.includes('college-optometrists')) return 'College of Optometrists';
    return host;
  } catch {
    return 'Reference';
  }
}

/** Only http(s) links are ever rendered as anchors. */
export function safeUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

export function casesFor(cases: readonly ClinicalCase[], id: DiagnosisId): ClinicalCase[] {
  return cases.filter((c) => c.diagnosis === id);
}

/**
 * Diagnoses most often confused with `id`: differentials of its cases, plus
 * diagnoses of cases that list it as a differential. Most frequent first.
 */
export function confusedWith(cases: readonly ClinicalCase[], id: DiagnosisId, limit = 6): DiagnosisId[] {
  const count = new Map<DiagnosisId, number>();
  const bump = (k: DiagnosisId) => k !== id && count.set(k, (count.get(k) ?? 0) + 1);
  for (const c of cases) {
    if (c.diagnosis === id) c.differentials.forEach(bump);
    else if (c.differentials.includes(id)) bump(c.diagnosis);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([k]) => k);
}

export type MasteryTier = 'Unstudied' | 'Novice' | 'Familiar' | 'Proficient' | 'Mastered';
export function masteryTier(m: number, seen: boolean): MasteryTier {
  if (!seen) return 'Unstudied';
  if (m >= 0.8) return 'Mastered';
  if (m >= 0.55) return 'Proficient';
  if (m >= 0.25) return 'Familiar';
  return 'Novice';
}

/** Word lengths of a name, for the locked "silhouette" bars. */
export function silhouette(name: string): number[] {
  return name.split(/\s+/).filter(Boolean).map((w) => Math.min(12, w.length));
}

/** The entry before/after `id` in a flat list (wraps). */
export function neighbour(ids: readonly string[], id: string, dir: 1 | -1): string | null {
  const i = ids.indexOf(id);
  if (i < 0 || ids.length < 2) return null;
  return ids[(i + dir + ids.length) % ids.length]!;
}

/** Folio numbering for the atlas pages (1 → I, 14 → XIV). Non-positive input yields ''. */
export function toRoman(n: number): string {
  let v = Math.floor(n);
  if (!(v > 0)) return '';
  const table: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [k, r] of table) while (v >= k) { out += r; v -= k; }
  return out;
}
