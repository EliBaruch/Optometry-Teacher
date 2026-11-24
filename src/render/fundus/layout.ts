/**
 * computeFundusLayout — every geometric decision about a fundus, made once,
 * deterministically, with no canvas: disc/cup profile, vasculature, lesion
 * instances, detachment outline. Painting and hit-testing both read this.
 */
import { createRng, type Eye, type LesionType, type PosteriorSegment, type Rng, type Zone } from '@core';
import { anatomy, inZone, samplePoint, zoneOf, type Anatomy } from './geometry';
import { U, type FundusMap, type FundusMark, type FundusViewport } from './types';
import { buildVessels, findCrossings, type VesselTree } from './vessels';

export interface LesionInst extends FundusMark {
  /** orientation (radians) */
  a: number;
  /** per-instance seed for shape detail */
  seed: number;
  /** pattern variant, e.g. 'star' | 'circinate' | 'nvd' | 'prp' | 'sector' */
  variant?: string;
}

export interface CupProfile {
  /** cup radius as a fraction of the disc radius in direction θ (image angle, +y down) */
  r(theta: number): number;
  /** centre offset in disc-radius units (temporal shift) */
  dx: number;
  dy: number;
  verticalCdr: number;
}

export interface FundusLayout {
  a: Anatomy;
  post: PosteriorSegment;
  seed: number;
  swelling: number;
  cup: CupProfile;
  tree: VesselTree;
  lesions: LesionInst[];
  beads: { x: number; y: number; r: number }[];
  detachment?: { zones: Zone[]; maculaOff: boolean; polygon: [number, number][] };
}

export function cupProfile(post: PosteriorSegment, nasal: 1 | -1): CupProfile {
  const d = post.disc;
  const swollen = !!d.edema || d.margins === 'elevated';
  let cdr = Math.max(0.05, Math.min(0.95, d.cdr));
  if (swollen) cdr = Math.min(cdr, 0.12); // the cup fills in as the nerve head swells
  const thin = d.rimThinning ?? 'none';
  const shift = thin === 'inferior' ? 0.13 : thin === 'superior' ? -0.13 : thin === 'diffuse' ? 0 : -0.04;
  const top = Math.min(0.95, cdr * (1 - shift));
  const bottom = Math.min(0.95, cdr * (1 + shift));
  const hz = cdr * (cdr > 0.6 ? 0.88 : 1.05);
  const tOff = 0.07; // cups sit slightly temporal
  const temporal = Math.min(0.95, hz + tOff);
  const nasalR = Math.max(0.04, hz - tOff);
  const notchAt = thin === 'inferior' ? Math.PI / 2 : thin === 'superior' ? -Math.PI / 2 : NaN;
  const notchTheta = Number.isNaN(notchAt) ? NaN : Math.atan2(Math.sin(notchAt) * 0.9, -nasal * 0.45);
  return {
    dx: 0,
    dy: 0,
    verticalCdr: (top + bottom) / 2,
    r(theta: number) {
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const rx = c * nasal > 0 ? nasalR : temporal;
      const ry = s > 0 ? bottom : top;
      let r = 1 / Math.sqrt((c / rx) ** 2 + (s / ry) ** 2);
      if (!Number.isNaN(notchTheta) && cdr >= 0.6) {
        let dt = theta - notchTheta;
        while (dt > Math.PI) dt -= Math.PI * 2;
        while (dt < -Math.PI) dt += Math.PI * 2;
        r = Math.min(0.95, r + 0.1 * Math.exp(-(dt * dt) / 0.06));
      }
      return r;
    },
  };
}

const COUNT: Partial<Record<LesionType, (d: number) => number>> = {
  'microaneurysm': (d) => 6 * d,
  'dot-blot-hemorrhage': (d) => 4 * d,
  'flame-hemorrhage': (d) => 2 * d + 1,
  'cotton-wool-spot': (d) => Math.min(8, d + 1),
  'hard-exudate': (d) => d,
  'drusen-small': (d) => 14 * d,
  'drusen-large': (d) => 6 * d,
  'pigment-clumping': (d) => 3 * d,
  'lattice': (d) => d,
  'retinal-tear': (d) => (d > 3 ? 2 : 1),
  'neovascularization': (d) => Math.max(1, Math.ceil(d / 2)),
  'hollenhorst-plaque': (d) => Math.min(3, d),
  'disc-hemorrhage': (d) => (d > 2 ? 2 : 1),
};

function quadrantOk(a: Anatomy, zone: Zone, x: number, y: number): boolean {
  if (zone === 'periphery' || zone === 'diffuse' || zone === 'macula' || zone === 'disc') return true;
  const sup = y < a.fovea.y;
  const temporal = (x - a.disc.x) * a.nasal < 0;
  if (zone === 'superotemporal') return sup && temporal;
  if (zone === 'inferotemporal') return !sup && temporal;
  if (zone === 'superonasal') return sup && !temporal;
  return !sup && !temporal;
}

function placeLesions(a: Anatomy, post: PosteriorSegment, tree: VesselTree, seed: number): { lesions: LesionInst[]; beads: { x: number; y: number; r: number }[] } {
  const lesions: LesionInst[] = [];
  const beads: { x: number; y: number; r: number }[] = [];
  const nflAngle = (x: number, y: number) => Math.atan2(y - a.disc.y, x - a.disc.x);
  const hypertensive = post.vessels.copperWiring || post.vessels.avNicking || !!post.disc.edema;
  post.lesions.forEach((L, src) => {
    const rng: Rng = createRng(seed).fork(`les-${src}-${L.type}`);
    const d = Math.max(1, Math.min(5, Math.round(L.density)));
    const zone = L.zone;
    const push = (x: number, y: number, rMm: number, extra: Partial<LesionInst> = {}) =>
      lesions.push({ type: L.type, zone, x, y, r: rMm * U, source: src, a: extra.a ?? 0, seed: rng.int(1, 1e9), ...extra });
    const n = COUNT[L.type]?.(d) ?? 1;
    const pt = (accept?: (x: number, y: number) => boolean) => samplePoint(a, zone, rng, accept);
    switch (L.type) {
      case 'microaneurysm':
        for (let i = 0; i < n; i++) { const [x, y] = pt(); push(x, y, rng.float(0.035, 0.06)); }
        break;
      case 'dot-blot-hemorrhage':
        for (let i = 0; i < n; i++) { const [x, y] = pt(); push(x, y, rng.float(0.08, 0.22)); }
        break;
      case 'flame-hemorrhage':
        for (let i = 0; i < n; i++) { const [x, y] = pt(); push(x, y, rng.float(0.25, 0.55), { a: nflAngle(x, y) }); }
        break;
      case 'cotton-wool-spot':
        for (let i = 0; i < n; i++) {
          // CWS cluster along the arcades / around the disc
          const [x, y] = pt((px, py) => Math.hypot(px - a.disc.x, py - a.disc.y) < 6 * U);
          push(x, y, rng.float(0.16, 0.32), { a: nflAngle(x, y) });
        }
        break;
      case 'hard-exudate': {
        const star = zone === 'macula' && hypertensive;
        if (star) {
          push(a.fovea.x, a.fovea.y, 1.5, { variant: 'star' });
        } else {
          for (let i = 0; i < n; i++) {
            const [x, y] = pt();
            push(x, y, rng.float(0.45, 0.95), { variant: rng.chance(0.6) ? 'circinate' : 'cluster' });
          }
        }
        break;
      }
      case 'drusen-small':
      case 'drusen-large': {
        const big = L.type === 'drusen-large';
        for (let i = 0; i < n; i++) {
          const [x, y] = zone === 'macula'
            ? (() => { const ang = rng.float(0, Math.PI * 2); const r = Math.pow(rng.next(), 0.7) * 2.2 * U; return [a.fovea.x + Math.cos(ang) * r, a.fovea.y + Math.sin(ang) * r * 0.85] as [number, number]; })()
            : pt();
          push(x, y, big ? rng.float(0.07, 0.15) : rng.float(0.022, 0.045));
        }
        break;
      }
      case 'geographic-atrophy': {
        const ang = rng.float(0, Math.PI * 2);
        const off = rng.float(0.1, 0.5) * U;
        push(a.fovea.x + Math.cos(ang) * off, a.fovea.y + Math.sin(ang) * off, 0.45 + 0.28 * d);
        break;
      }
      case 'subretinal-hemorrhage': {
        const [x, y] = zone === 'macula' ? [a.fovea.x + rng.float(-0.3, 0.3) * U, a.fovea.y + rng.float(-0.2, 0.3) * U] : pt();
        push(x, y, 0.6 + 0.32 * d);
        break;
      }
      case 'neovascularization':
        if (zone === 'disc') {
          push(a.disc.x, a.disc.y, 1.0 + 0.1 * d, { variant: 'nvd' });
        } else {
          for (let i = 0; i < n; i++) {
            // NVE grows from veins, usually along the arcades
            const veins = tree.vessels.filter((v) => v.kind === 'vein' && v.depth === 0);
            let best: [number, number] | null = null;
            for (let k = 0; k < 60 && !best; k++) {
              const v = veins[rng.int(0, veins.length - 1)]!;
              const p = v.pts[rng.int(Math.floor(v.pts.length * 0.15), v.pts.length - 1)]!;
              if (inZone(a, zone === 'periphery' ? 'diffuse' : zone, p[0], p[1]) || zone === 'diffuse') best = p;
            }
            const [x, y] = best ?? pt();
            push(x, y, rng.float(0.45, 0.8), { variant: 'nve' });
          }
        }
        break;
      case 'retinal-tear':
        for (let i = 0; i < n; i++) {
          const [x, y] = pt((px, py) => Math.hypot(px - 0.5, py - 0.5) > 0.36);
          push(x, y, rng.float(0.55, 0.85), { a: Math.atan2(0.5 - y, 0.5 - x) });
        }
        break;
      case 'lattice':
        for (let i = 0; i < n; i++) {
          const [x, y] = pt((px, py) => Math.hypot(px - 0.5, py - 0.5) > 0.36);
          push(x, y, rng.float(0.9, 1.6), { a: Math.atan2(y - 0.5, x - 0.5) + Math.PI / 2 });
        }
        break;
      case 'nevus': {
        const [x, y] = pt();
        push(x, y, rng.float(0.8, 1.3));
        break;
      }
      case 'pigment-clumping':
        for (let i = 0; i < n; i++) { const [x, y] = pt(); push(x, y, rng.float(0.08, 0.28), { a: rng.float(0, Math.PI) }); }
        break;
      case 'laser-scars':
        if (zone === 'macula') {
          for (let i = 0; i < 10 * d; i++) {
            const ang = rng.float(0, Math.PI * 2);
            const r = rng.float(0.7, 2.0) * U;
            push(a.fovea.x + Math.cos(ang) * r, a.fovea.y + Math.sin(ang) * r, rng.float(0.05, 0.08), { variant: 'grid' });
          }
        } else {
          // PRP: burns one burn-width apart, outside the arcades, sparing the disc & macula
          const sp = 0.62 * U;
          const jit = createRng(seed ^ 0x9e9);
          const keep = 0.35 + d * 0.13;
          for (let gy = 0.03; gy < 0.97; gy += sp * 0.87) {
            for (let gx = 0.03 + ((Math.round(gy / sp) % 2) * sp) / 2; gx < 0.97; gx += sp) {
              const x = gx + jit.float(-0.12, 0.12) * sp;
              const y = gy + jit.float(-0.12, 0.12) * sp;
              if (Math.hypot(x - 0.5, y - 0.5) > 0.47) continue;
              if (Math.hypot(x - a.fovea.x, y - a.fovea.y) < 3.6 * U) continue;
              if (Math.hypot(x - a.disc.x, y - a.disc.y) < 2.6 * U) continue;
              if (!quadrantOk(a, zone, x, y)) continue;
              if (jit.next() > keep) continue;
              push(x, y, jit.float(0.17, 0.24), { variant: 'prp' });
            }
          }
        }
        break;
      case 'hollenhorst-plaque': {
        const cands = tree.bifurcations.filter((b) => quadrantOk(a, zone, b.x, b.y) && Math.hypot(b.x - a.disc.x, b.y - a.disc.y) > 1.2 * U);
        for (let i = 0; i < n; i++) {
          const b = cands.length ? cands[rng.int(0, cands.length - 1)]! : { x: pt()[0], y: pt()[1] };
          push(b.x, b.y, 0.07);
        }
        break;
      }
      case 'retinal-whitening':
        if (zone === 'macula' || zone === 'diffuse' || zone === 'disc') {
          push((a.fovea.x + a.disc.x) / 2, a.fovea.y, 4.2, { variant: 'pole' });
        } else {
          const [x, y] = pt((px, py) => Math.hypot(px - a.fovea.x, py - a.fovea.y) < 4.5 * U);
          push(x, y, 1.8 + 0.25 * d, { variant: 'sector', a: Math.atan2(y - a.disc.y, x - a.disc.x) });
        }
        break;
      case 'cherry-red-spot':
        push(a.fovea.x, a.fovea.y, 0.32);
        break;
      case 'macular-edema':
        push(a.fovea.x, a.fovea.y, 1.0 + 0.2 * d);
        break;
      case 'epiretinal-membrane':
        push(a.fovea.x + rng.float(-0.4, 0.4) * U, a.fovea.y + rng.float(-0.3, 0.3) * U, 1.4 + 0.15 * d, { a: rng.float(0, Math.PI) });
        break;
      case 'macular-hole':
        push(a.fovea.x, a.fovea.y, 0.14 + 0.04 * d);
        break;
      case 'disc-hemorrhage':
        for (let i = 0; i < n; i++) {
          // splinter haemorrhage crossing the rim, classically inferotemporal
          const inferior = i === 0 ? rng.chance(0.75) : rng.chance(0.5);
          const ang = Math.atan2(inferior ? 0.85 : -0.85, -a.nasal * 0.55) + rng.float(-0.25, 0.25);
          const rr = 1.02;
          push(a.disc.x + Math.cos(ang) * a.disc.rx * rr, a.disc.y + Math.sin(ang) * a.disc.ry * rr, 0.22, { a: ang, zone: 'disc' });
        }
        break;
      case 'venous-beading': {
        const veins = tree.vessels.filter((v) => v.kind === 'vein' && v.depth <= 1);
        let placed = 0;
        for (let k = 0; k < 400 && placed < Math.max(1, d); k++) {
          const v = veins[rng.int(0, veins.length - 1)]!;
          const p = v.pts[rng.int(Math.floor(v.pts.length * 0.2), v.pts.length - 1)]!;
          if (!quadrantOk(a, zone, p[0], p[1]) || Math.hypot(p[0] - 0.5, p[1] - 0.5) > 0.44) continue;
          beads.push({ x: p[0], y: p[1], r: 0.9 * U });
          push(p[0], p[1], 0.9);
          placed++;
        }
        break;
      }
    }
  });
  return { lesions, beads };
}

function detachmentPolygon(a: Anatomy, zones: Zone[], maculaOff: boolean, seed: number): [number, number][] {
  const rng = createRng(seed ^ 0x7d7d);
  const sectors: [number, number][] = [];
  // image angles (+y down): superior = negative sin; temporal = cos·nasal < 0
  const T = a.nasal > 0 ? Math.PI : 0; // temporal direction angle
  const N = a.nasal > 0 ? 0 : Math.PI;
  const addQuad = (vert: number, horiz: number) => {
    const mid = Math.atan2(vert, Math.cos(horiz)) ;
    sectors.push([mid - Math.PI / 4 - 0.25, mid + Math.PI / 4 + 0.25]);
  };
  for (const z of zones) {
    if (z === 'superotemporal') addQuad(-1, T);
    else if (z === 'inferotemporal') addQuad(1, T);
    else if (z === 'superonasal') addQuad(-1, N);
    else if (z === 'inferonasal') addQuad(1, N);
    else if (z === 'diffuse' || z === 'periphery') sectors.push([-Math.PI, Math.PI]);
    else if (z === 'macula') sectors.push([T - 0.9, T + 0.9]);
  }
  if (!sectors.length) sectors.push([-Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9]);
  const total = sectors.some(([s0, s1]) => s1 - s0 >= Math.PI * 1.99);
  let a0 = Math.min(...sectors.map((s) => s[0]));
  let a1 = Math.max(...sectors.map((s) => s[1]));
  if (total) { a0 = -Math.PI; a1 = Math.PI; }
  const fovAng = Math.atan2(a.fovea.y - 0.5, a.fovea.x - 0.5);
  const fovR = Math.hypot(a.fovea.x - 0.5, a.fovea.y - 0.5);
  if (maculaOff && !total) {
    // extend the sector so it reaches the fovea
    let fa = fovAng;
    while (fa < a0) fa += Math.PI * 2;
    if (fa > a1) a1 = Math.max(a1, fa + 0.5);
  }
  const pts: [number, number][] = [];
  const steps = 64;
  const ph = rng.float(0, 6);
  const inner = (ang: number) => {
    let r = total ? 0.16 : 0.27 + 0.04 * Math.sin(ang * 3 + ph);
    if (maculaOff) {
      let dd = Math.abs(ang - fovAng);
      if (dd > Math.PI) dd = Math.PI * 2 - dd;
      r = Math.min(r, fovR - 0.07 + dd * 0.25);
    } else {
      // macula-on: boundary stays outside the fovea
      r = Math.max(r, Math.min(0.3, fovR + 0.12 + 0 * ang));
    }
    return Math.max(0.03, r);
  };
  if (total) {
    for (let i = 0; i < steps; i++) {
      const ang = (i / steps) * Math.PI * 2;
      const r = inner(ang);
      pts.push([0.5 + Math.cos(ang) * r, 0.5 + Math.sin(ang) * r]);
    }
    return pts; // inner boundary only — everything outside it is detached
  }
  for (let i = 0; i <= steps; i++) {
    const ang = a0 + ((a1 - a0) * i) / steps;
    pts.push([0.5 + Math.cos(ang) * 0.75, 0.5 + Math.sin(ang) * 0.75]);
  }
  for (let i = steps; i >= 0; i--) {
    const ang = a0 + ((a1 - a0) * i) / steps;
    const r = inner(ang);
    pts.push([0.5 + Math.cos(ang) * r, 0.5 + Math.sin(ang) * r]);
  }
  return pts;
}

export function computeFundusLayout(post: PosteriorSegment, eye: Eye, seed: number): FundusLayout {
  const swelling = post.disc.edema || post.disc.margins === 'elevated' ? 1.22 : 1;
  const a = anatomy(eye, swelling);
  const tree = buildVessels(a, post, seed);
  if (post.vessels.avNicking) tree.crossings = findCrossings(tree);
  const { lesions, beads } = placeLesions(a, post, tree, seed);
  const det = post.detachment;
  const totalLike = det?.zones.some((z) => z === 'diffuse');
  return {
    a, post, seed, swelling,
    cup: cupProfile(post, a.nasal),
    tree, lesions, beads,
    detachment: det && det.zones.length ? { zones: det.zones, maculaOff: det.maculaOff, polygon: detachmentPolygon(a, totalLike ? ['diffuse'] : det.zones, det.maculaOff, seed) } : undefined,
  };
}

/** The public, normalised hit-test map. */
export function layoutToMap(L: FundusLayout, view: FundusViewport): FundusMap {
  const { a, cup } = L;
  const r = (a.disc.rx + a.disc.ry) / 2;
  // measure the cup from its actual profile
  const top = cup.r(-Math.PI / 2);
  const bottom = cup.r(Math.PI / 2);
  const left = cup.r(Math.PI);
  const right = cup.r(0);
  const cx = a.disc.x + ((right - left) / 2) * a.disc.rx;
  const cy = a.disc.y + ((bottom - top) / 2) * a.disc.ry;
  const marks: FundusMark[] = L.lesions.map(({ type, zone, x, y, r: rr, source }) => ({ type, zone: zone === 'diffuse' ? zoneOf(a, x, y) === 'disc' ? 'diffuse' : zone : zone, x, y, r: rr, source }));
  if (L.detachment) {
    const poly = L.detachment.polygon;
    const c = poly.reduce((acc, p) => [acc[0] + p[0] / poly.length, acc[1] + p[1] / poly.length], [0, 0]);
    marks.push({ type: 'retinal-detachment', zone: L.detachment.zones[0] ?? 'periphery', x: c[0], y: c[1], r: 0.18, source: -1 });
  }
  if (L.post.vitreous === 'hemorrhage') marks.push({ type: 'vitreous-hemorrhage', zone: 'diffuse', x: 0.5, y: 0.6, r: 0.35, source: -1 });
  if (L.post.vitreous === 'weiss-ring') marks.push({ type: 'weiss-ring', zone: 'disc', x: a.disc.x - a.nasal * 0.04, y: a.disc.y - 0.03, r: 0.05, source: -1 });
  return {
    eye: a.eye,
    seed: L.seed,
    mmPerUnit: 1 / U,
    disc: { x: a.disc.x, y: a.disc.y, rx: a.disc.rx, ry: a.disc.ry, r },
    cup: { x: cx, y: cy, rx: ((left + right) / 2) * a.disc.rx, ry: ((top + bottom) / 2) * a.disc.ry, cdr: (top + bottom) / 2 },
    macula: { x: a.fovea.x, y: a.fovea.y, r: 2.75 * U },
    fovea: { x: a.fovea.x, y: a.fovea.y, r: 0.75 * U },
    lesions: marks,
    detachment: L.detachment ? { ...L.detachment } : undefined,
    view,
  };
}
