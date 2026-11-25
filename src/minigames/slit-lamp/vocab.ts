/**
 * Clinical vocabulary for the slit-lamp mini-game: the menu tree the player
 * walks (region → sign → grade) and the mapping from the canonical clinical
 * enums to that tree. Pure data — no rendering here.
 */
import type { ConjSign, CorneaSign, IrisSign, LensSign, LidSign } from '@core';

export type RegionId = 'lids' | 'conj' | 'cornea' | 'chamber' | 'iris' | 'lens';
export const REGION_IDS: readonly RegionId[] = ['lids', 'conj', 'cornea', 'chamber', 'iris', 'lens'];

export interface MenuNode {
  id: string;
  /** Full path, e.g. "cornea/epithelium/dendrite" */
  path: string;
  label: string;
  /** Group node whose children are the grade choices of this sign. */
  graded?: boolean;
  children?: MenuNode[];
}

type Raw = { id: string; label: string; graded?: boolean; children?: Raw[] };
const n = (id: string, label: string, children?: Raw[], graded = false): Raw => ({ id, label, children, graded });
const grades = (ids: [string, string][]): Raw[] => ids.map(([id, label]) => n(id, label));

const RAW: Raw[] = [
  n('lids', 'Lids', [
    n('anterior-blepharitis', 'Anterior blepharitis'),
    n('meibomian-dysfunction', 'Meibomian dysfunction'),
    n('chalazion', 'Chalazion'),
    n('hordeolum', 'Hordeolum (stye)'),
    n('ptosis', 'Ptosis'),
    n('lid-edema', 'Lid oedema'),
    n('vesicles', 'Lid vesicles'),
    n('trichiasis', 'Trichiasis'),
    n('ectropion', 'Ectropion'),
    n('entropion', 'Entropion'),
  ]),
  n('conj', 'Conjunctiva', [
    n('injection', 'Injection', [
      n('diffuse-injection', 'Diffuse injection'),
      n('ciliary-flush', 'Ciliary flush'),
      n('sectoral-injection', 'Sectoral injection'),
    ]),
    n('discharge', 'Discharge', [
      n('discharge-mucopurulent', 'Mucopurulent'),
      n('discharge-watery', 'Watery'),
      n('discharge-stringy', 'Stringy mucus'),
    ]),
    n('papillae', 'Papillae'),
    n('giant-papillae', 'Giant papillae'),
    n('follicles', 'Follicles'),
    n('subconjunctival-hemorrhage', 'Subconj. haemorrhage'),
    n('pinguecula', 'Pinguecula'),
    n('pterygium', 'Pterygium'),
    n('chemosis', 'Chemosis'),
  ]),
  n('cornea', 'Cornea', [
    n('epithelium', 'Epithelium', [
      n('punctate-keratitis', 'Punctate keratitis'),
      n('abrasion', 'Abrasion'),
      n('dendrite', 'Dendrite'),
      n('pseudodendrite', 'Pseudodendrite'),
    ]),
    n('deposits', 'Deposits', [
      n('keratic-precipitates', 'Keratic precipitates'),
      n('foreign-body', 'Foreign body'),
      n('rust-ring', 'Rust ring'),
      n('fleischer-ring', 'Fleischer ring'),
    ]),
    n('stroma', 'Stroma', [
      n('ulcer', 'Ulcer'),
      n('infiltrate', 'Infiltrate'),
      n('edema', 'Corneal oedema'),
      n('vogt-striae', 'Vogt striae'),
      n('cone-thinning', 'Cone / thinning'),
      n('pannus', 'Pannus'),
    ]),
  ]),
  n('chamber', 'Chamber', [
    n('van-herick', 'Van Herick', grades([
      ['1', 'Grade 1 · < ¼ CT'],
      ['2', 'Grade 2 · ¼ CT'],
      ['3', 'Grade 3 · ¼–½ CT'],
      ['4', 'Grade 4 · ≥ CT'],
    ]), true),
    n('cells', 'AC cells', grades([
      ['0.5', '0.5+ (1–5)'],
      ['1', '1+ (6–15)'],
      ['2', '2+ (16–25)'],
      ['3', '3+ (26–50)'],
      ['4', '4+ (> 50)'],
    ]), true),
    n('flare', 'AC flare', grades([
      ['1', '1+ faint'],
      ['2', '2+ moderate'],
      ['3', '3+ marked'],
      ['4', '4+ intense'],
    ]), true),
    n('hypopyon', 'Hypopyon'),
    n('hyphema', 'Hyphaema'),
  ]),
  n('iris', 'Iris', [
    n('posterior-synechiae', 'Posterior synechiae'),
    n('neovascularization', 'Rubeosis'),
    n('transillumination', 'Transillumination'),
    n('heterochromia', 'Heterochromia'),
    n('nevus', 'Iris nevus'),
  ]),
  n('lens', 'Lens', [
    n('nuclear-sclerosis', 'Nuclear sclerosis', grades([['1', 'Grade 1'], ['2', 'Grade 2'], ['3', 'Grade 3'], ['4', 'Grade 4']]), true),
    n('cortical-cataract', 'Cortical cataract', grades([['1', 'Grade 1'], ['2', 'Grade 2'], ['3', 'Grade 3'], ['4', 'Grade 4']]), true),
    n('posterior-subcapsular', 'Posterior subcapsular', grades([['1', 'Grade 1'], ['2', 'Grade 2'], ['3', 'Grade 3'], ['4', 'Grade 4']]), true),
    n('iol', 'IOL in the bag'),
    n('phacodonesis', 'Phacodonesis'),
  ]),
];

function finalize(raw: Raw[], prefix: string): MenuNode[] {
  return raw.map((r) => {
    const path = prefix ? `${prefix}/${r.id}` : r.id;
    return { id: r.id, path, label: r.label, graded: r.graded, children: r.children ? finalize(r.children, path) : undefined };
  });
}

export const MENU: MenuNode[] = finalize(RAW, '');

const INDEX = new Map<string, { node: MenuNode; parent?: MenuNode }>();
(function walk(nodes: MenuNode[], parent?: MenuNode) {
  for (const node of nodes) {
    INDEX.set(node.path, { node, parent });
    if (node.children) walk(node.children, node);
  }
})(MENU);

export const nodeAt = (path: string): MenuNode | undefined => INDEX.get(path)?.node;
export const parentOf = (path: string): MenuNode | undefined => INDEX.get(path)?.parent;
export const regionOf = (path: string): RegionId => path.split('/')[0] as RegionId;

export const REGION_LABEL: Record<RegionId, string> = {
  lids: 'Lids', conj: 'Conjunctiva', cornea: 'Cornea', chamber: 'Chamber', iris: 'Iris', lens: 'Lens',
};

/** A selection ends on a leaf; split it into the sign (path) and the optional grade id. */
export function parseSelection(leaf: string): { sign: string; grade?: string } {
  const hit = INDEX.get(leaf);
  if (hit?.parent?.graded) return { sign: hit.parent.path, grade: hit.node.id };
  return { sign: leaf };
}

export function signLabel(sign: string): string {
  return nodeAt(sign)?.label ?? sign;
}
export function gradeLabel(sign: string, grade: string): string {
  return nodeAt(`${sign}/${grade}`)?.label ?? grade;
}
/** Short chart wording: "AC cells 2+", "Dendrite". */
export function describeSign(sign: string, grade?: string): string {
  if (grade === undefined) return signLabel(sign);
  const g = gradeLabel(sign, grade).replace(/\s*[·(].*$/, '');
  return `${signLabel(sign)} ${g}`;
}

// ───────────────────────── canonical enum → menu path

const LIDS: Partial<Record<LidSign, string>> = {
  'anterior-blepharitis': 'lids/anterior-blepharitis', 'meibomian-dysfunction': 'lids/meibomian-dysfunction',
  chalazion: 'lids/chalazion', hordeolum: 'lids/hordeolum', ptosis: 'lids/ptosis', 'lid-edema': 'lids/lid-edema',
  vesicles: 'lids/vesicles', trichiasis: 'lids/trichiasis', ectropion: 'lids/ectropion', entropion: 'lids/entropion',
};
const CONJ: Partial<Record<ConjSign, string>> = {
  'diffuse-injection': 'conj/injection/diffuse-injection', 'ciliary-flush': 'conj/injection/ciliary-flush',
  'sectoral-injection': 'conj/injection/sectoral-injection', papillae: 'conj/papillae', 'giant-papillae': 'conj/giant-papillae',
  follicles: 'conj/follicles', 'subconjunctival-hemorrhage': 'conj/subconjunctival-hemorrhage', pinguecula: 'conj/pinguecula',
  pterygium: 'conj/pterygium', chemosis: 'conj/chemosis', 'discharge-mucopurulent': 'conj/discharge/discharge-mucopurulent',
  'discharge-watery': 'conj/discharge/discharge-watery', 'discharge-stringy': 'conj/discharge/discharge-stringy',
};
const CORNEA: Partial<Record<CorneaSign, string>> = {
  'punctate-keratitis': 'cornea/epithelium/punctate-keratitis', abrasion: 'cornea/epithelium/abrasion',
  dendrite: 'cornea/epithelium/dendrite', pseudodendrite: 'cornea/epithelium/pseudodendrite',
  'keratic-precipitates': 'cornea/deposits/keratic-precipitates', 'foreign-body': 'cornea/deposits/foreign-body',
  'rust-ring': 'cornea/deposits/rust-ring', 'fleischer-ring': 'cornea/deposits/fleischer-ring',
  ulcer: 'cornea/stroma/ulcer', infiltrate: 'cornea/stroma/infiltrate', edema: 'cornea/stroma/edema',
  'vogt-striae': 'cornea/stroma/vogt-striae', 'cone-thinning': 'cornea/stroma/cone-thinning', pannus: 'cornea/stroma/pannus',
};
const IRIS: Partial<Record<IrisSign, string>> = {
  'posterior-synechiae': 'iris/posterior-synechiae', neovascularization: 'iris/neovascularization',
  transillumination: 'iris/transillumination', heterochromia: 'iris/heterochromia', nevus: 'iris/nevus',
};
const LENS: Partial<Record<LensSign, string>> = {
  'nuclear-sclerosis': 'lens/nuclear-sclerosis', 'cortical-cataract': 'lens/cortical-cataract',
  'posterior-subcapsular': 'lens/posterior-subcapsular', iol: 'lens/iol', phacodonesis: 'lens/phacodonesis',
};

export const lidPath = (s: LidSign) => LIDS[s];
export const conjPath = (s: ConjSign) => CONJ[s];
export const corneaPath = (s: CorneaSign) => CORNEA[s];
export const irisPath = (s: IrisSign) => IRIS[s];
export const lensPath = (s: LensSign) => LENS[s];
