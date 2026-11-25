import type { VNode } from 'preact';
import { createRng } from '@core';
import { luminance, mix, shade } from '../color';
import { GOLD } from '../palette';
import { RimLight } from './rim';
import { CX, VIEW_H, VIEW_W, type Geo } from '../geometry';
import { P, ribbon, smooth, type Pt } from '../paths';
import type { PaintCtx } from './ctx';

export function hairDefs(c: PaintCtx) {
  const h = c.hair;
  return (
    <>
      <linearGradient id={c.id('hair')} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color={shade(h, 0.2)} />
        <stop offset="0.5" stop-color={h} />
        <stop offset="1" stop-color={shade(h, -0.32)} />
      </linearGradient>
      <linearGradient id={c.id('hairBack')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color={shade(h, -0.15)} />
        <stop offset="1" stop-color={shade(h, -0.5)} />
      </linearGradient>
      <pattern id={c.id('stipple')} width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
        <circle cx="0.6" cy="0.6" r="0.45" fill={shade(h, -0.4)} />
        <circle cx="1.8" cy="1.7" r="0.35" fill={shade(h, 0.25)} />
      </pattern>
      <pattern id={c.id('stubble')} width="1.5" height="1.5" patternUnits="userSpaceOnUse" patternTransform="rotate(33)">
        <circle cx="0.4" cy="0.4" r="0.26" fill={shade(h, -0.35)} />
        <circle cx="1.15" cy="1.1" r="0.2" fill={shade(h, -0.2)} />
      </pattern>
      <pattern id={c.id('coils')} width="5.5" height="5" patternUnits="userSpaceOnUse">
        <path d="M0.6,2.6a1.4,1.4 0 1 1 2.4,1.1M3.2,0.4a1.3,1.3 0 1 0 2,1.3" stroke={shade(h, -0.5)} stroke-width="0.55" fill="none" />
        <path d="M1.2,1.9a1.2,1.2 0 0 1 1.6,-0.4M3.6,3.9a1.1,1.1 0 0 1 1.5,0.2" stroke={shade(h, 0.4)} stroke-width="0.4" fill="none" opacity="0.7" />
      </pattern>
      <pattern id={c.id('beardTex')} width="6.4" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(4)">
        <path d="M1,0.5q-0.8,3 0.2,5.5M4.2,3q0.8,3.2 -0.2,6.4M2.6,7.5q-0.7,2.6 0.3,5M5.6,9.4q0.5,1.8 -0.1,3.4" stroke={shade(h, -0.45)} stroke-width="0.5" fill="none" stroke-linecap="round" />
        <path d="M2.2,1.6q0.5,2.4 -0.1,4.4M5.2,6q-0.6,2 0.1,4M0.6,8.4q0.4,1.8 -0.1,3.4" stroke={shade(h, 0.45)} stroke-width="0.35" fill="none" opacity="0.7" stroke-linecap="round" />
      </pattern>
      <clipPath id={c.id('belowHat')}>
        <rect x="0" y={c.g.hairline - 4} width={VIEW_W} height={VIEW_H} />
      </clipPath>
    </>
  );
}

interface CapOpts {
  lift: number;
  hairline: number;
  temple: number;
  extra?: number;
  /** x of a side part (adds a notch to the hairline) */
  part?: number;
  /** clumped, gently scalloped crown silhouette (px) */
  bumps?: number;
  /** temple recession: pulls the hairline corners up and back (0..1) */
  recede?: number;
}

/** Hair hugging the cranium, ending in a hairline across the forehead. */
export function capPath(g: Geo, o: CapOpts): string {
  const W = g.headW + (o.extra ?? 0);
  const T = g.headTop - o.lift;
  const H = o.hairline;
  const E = o.temple;
  const rc = o.recede ?? 0;
  const outer: Pt[] = [
    [CX, T],
    [CX + W * 0.62, T + 3 + o.lift * 0.15],
    [CX + W * 0.97, T + (g.eyeY - T) * 0.38],
    [CX + W + 0.6, E],
  ];
  let top: Pt[] = outer;
  if (o.bumps) {
    // insert midpoints pushed out/in from the skull centre -> clumped silhouette
    const oc: Pt = [CX, g.eyeY - 8];
    top = [outer[0]!];
    for (let i = 1; i < outer.length; i++) {
      const a = outer[i - 1]!;
      const b = outer[i]!;
      for (const [f, k] of [[0.33, 1], [0.66, -0.35]] as const) {
        const x = a[0] + (b[0] - a[0]) * f;
        const y = a[1] + (b[1] - a[1]) * f;
        const l = Math.hypot(x - oc[0], y - oc[1]) || 1;
        const amt = o.bumps * k * (i === outer.length - 1 ? 0.5 : 1);
        top.push([x + ((x - oc[0]) / l) * amt, y + ((y - oc[1]) / l) * amt]);
      }
      top.push(b);
    }
  }
  const right: Pt[] = [
    ...top,
    [CX + g.headW - 2.4, E + 0.5],
    [CX + g.headW - 4.5 - rc * 3, H + 9 - rc * 7],
    [CX + g.headW * 0.62 - rc * 2, H + 1.5 - rc * 3],
    [CX + g.headW * 0.25, H - 0.5],
  ];
  const pts: Pt[] = [...right];
  const left = right.slice(1).map(([x, y]) => [2 * CX - x, y] as Pt).reverse();
  pts.push([CX, H + (o.part !== undefined ? 0 : 0.6)]);
  pts.push(...left);
  return smooth(pts, true, 0.95);
}

type Pair = readonly [Pt, Pt];

const quad = (a: Pt, k: Pt, b: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * k[0] + t * t * b[0], u * u * a[1] + 2 * u * t * k[1] + t * t * b[1]];
};

/** Ribbon along part [t0, t1] of a quadratic, tapering to points at both ends. */
function strand(a: Pt, k: Pt, b: Pt, t0: number, t1: number, w: number, taperIn = true): string {
  const s: [number, number, number][] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const [x, y] = quad(a, k, b, t0 + (t1 - t0) * u);
    const prof = taperIn ? Math.sin(Math.PI * u) : Math.sin((Math.PI / 2) * (1 - u)) * 0.85 + 0.15 * (1 - u);
    s.push([x, y, Math.max(0.05, w * Math.pow(Math.max(0, prof), 0.7))]);
  }
  return ribbon(s);
}

function ctrlFor(a: Pt, b: Pt, bend: number): Pt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return [(a[0] + b[0]) / 2 - dy * bend, (a[1] + b[1]) / 2 + dx * bend];
}

/** Evenly spaced points along a polyline (hairline/temple contour). */
export function along(poly: readonly Pt[], n: number): Pt[] {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < poly.length; i++) {
    const l = Math.hypot(poly[i]![0] - poly[i - 1]![0], poly[i]![1] - poly[i - 1]![1]);
    seg.push(l);
    total += l;
  }
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    let d = (total * k) / Math.max(1, n - 1);
    let i = 0;
    while (i < seg.length - 1 && d > seg[i]!) d -= seg[i++]!;
    const f = seg[i] ? d / seg[i]! : 0;
    const a = poly[i]!;
    const b = poly[i + 1]!;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

export interface LockOpts {
  /** flow lines, root -> tip */
  flow: readonly Pair[];
  /** curvature of every lock (+/- bends opposite ways) */
  bend?: number;
  /** where along each lock the sheen band sits (0 root .. 1 tip) */
  band?: [number, number];
  /** pointed lock ends breaking the silhouette at the tips */
  tips?: number;
  /** key-light rim hot spot */
  rim?: Pt;
  /** base fill (defaults to the lit hair gradient) */
  fill?: string;
}

/**
 * Hair as clumped locks: a gradient mass, alternating light/dark lock bodies,
 * tapered separations, a broken sheen band and pointed tips — no repeating
 * texture, so it reads as hair rather than a ribbed cap.
 */
function mass(c: PaintCtx, d: string, o: LockOpts, key: string): VNode {
  const h = c.hair;
  const lum = luminance(h);
  const light = lum > 0.55;
  const clip = c.id(`hm-${key}`);
  const bend = o.bend ?? 0.12;
  const [b0, b1] = o.band ?? [0.22, 0.5];
  const r = createRng((c.t.seed ^ (key.length * 977 + key.charCodeAt(0) * 13)) >>> 0);
  let bodiesL = '';
  let bodiesD = '';
  let seps = '';
  let sheen = '';
  let sheenHot = '';
  let tips = '';
  const xs = o.flow.map(([, b]) => b[0]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  o.flow.forEach(([a, b], i) => {
    const jitter = r.float(-0.35, 0.35);
    const k = ctrlFor(a, b, bend + jitter * 0.12);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const w = Math.min(5.2, Math.max(2.6, len * 0.16));
    const body = strand(a, k, b, 0, 1, w * r.float(0.9, 1.25));
    if (i % 2) bodiesL += body;
    else bodiesD += body;
    // separation between this lock and the next
    const nb = o.flow[i + 1];
    if (nb) {
      const ma: Pt = [(a[0] + nb[0][0]) / 2, (a[1] + nb[0][1]) / 2];
      const mb: Pt = [(b[0] + nb[1][0]) / 2, (b[1] + nb[1][1]) / 2];
      seps += strand(ma, ctrlFor(ma, mb, bend + jitter * 0.1), mb, r.float(0.05, 0.25), r.float(0.82, 1), r.float(0.55, 0.95));
    }
    // sheen: brighter toward the key light (viewer right)
    const xr = maxX > minX ? (b[0] - minX) / (maxX - minX) : 0.5;
    const t0 = b0 + r.float(-0.07, 0.05);
    const t1 = b1 + r.float(-0.05, 0.08);
    // light catches the lock as a long thin glint, sometimes split in two
    const off = (w * 0.22) / Math.max(1, len) * len;
    const a2: Pt = [a[0] + off * 0.3, a[1]];
    const seg = strand(a, k, b, t0, t1, w * 0.3 * r.float(0.8, 1.25)) + (r.chance(0.45) ? strand(a2, k, [b[0] + off, b[1]], t0 + 0.06, t1 - 0.04, w * 0.18) : '');
    if (xr > 0.5 && r.chance(0.8)) sheenHot += seg;
    else if (r.chance(0.8)) sheen += seg;
    if (o.tips && r.chance(0.7)) {
      const dx = b[0] - k[0];
      const dy = b[1] - k[1];
      const l = Math.hypot(dx, dy) || 1;
      const reach = o.tips * r.float(0.55, 1.1);
      const ext: Pt = [b[0] + (dx / l) * reach, b[1] + (dy / l) * reach];
      const back: Pt = [b[0] - (dx / l) * 7, b[1] - (dy / l) * 7];
      tips += strand(back, [(back[0] + ext[0]) / 2 + (-dy / l) * 0.8, (back[1] + ext[1]) / 2 + (dx / l) * 0.8], ext, 0, 1, w * 0.55, false);
    }
  });
  const sepCol = shade(h, light ? -0.32 : -0.5);
  const sheenCol = light ? mix(h, '#ffffff', 0.55) : mix(shade(h, 0.32), GOLD, 0.18);
  const hotCol = light ? '#ffffff' : mix(shade(h, 0.5), GOLD, 0.3);
  const rim = o.rim;
  return (
    <g key={key}>
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={o.fill ?? c.url('hair')} />
      <g clip-path={`url(#${clip})`}>
        <path d={bodiesD} fill={shade(h, light ? -0.1 : -0.16)} opacity="0.55" />
        <path d={bodiesL} fill={shade(h, light ? 0.08 : 0.1)} opacity="0.45" />
        <path d={seps} fill={sepCol} opacity={light ? 0.5 : 0.7} />
        <path d={sheen} fill={sheenCol} opacity={light ? 0.4 : 0.32} />
        <path d={sheenHot} fill={hotCol} opacity={light ? 0.55 : 0.42} />
      </g>
      {tips && <path d={tips} fill={c.url('hair')} />}
      {tips && <path d={tips} fill={sepCol} opacity="0.18" />}
      {rim && <RimLight c={c} name={`h${clip}`} o={{ d, dx: 2.2, dy: 1.4, cx: rim[0], cy: rim[1], r: 34, opacity: 0.6 }} />}
    </g>
  );
}

/** Temple -> hairline -> temple contour (left to right). */
function hairlinePoly(W: number, H: number, temple: number): Pt[] {
  return [
    [CX - W, temple],
    [CX - W * 0.93, H + 8],
    [CX - W * 0.62, H + 1.5],
    [CX - W * 0.25, H - 0.4],
    [CX, H],
    [CX + W * 0.25, H - 0.4],
    [CX + W * 0.62, H + 1.5],
    [CX + W * 0.93, H + 8],
    [CX + W, temple],
  ];
}

/** Soft contact shadow the hair casts on the forehead / temples. */
function castShadow(c: PaintCtx, d: string): VNode {
  return <path d={d} fill={c.skin.deep} opacity="0.28" transform="translate(-0.8 2.2)" clip-path={c.url('headClip')} />;
}

/** Deterministic scatter of tiny coils, clipped by the caller. */
function coilScatter(c: PaintCtx, cx: number, cy: number, rx: number, ry: number, n: number, seed: number): VNode {
  const r = createRng(seed);
  let dark = '';
  let light = '';
  for (let i = 0; i < n; i++) {
    const a = r.float(0, Math.PI * 2);
    const d = Math.sqrt(r.next());
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const rr = r.float(0.9, 1.8);
    const s0 = r.float(0, Math.PI * 2);
    const x1 = x + Math.cos(s0) * rr;
    const y1 = y + Math.sin(s0) * rr;
    const x2 = x + Math.cos(s0 + 2.6) * rr;
    const y2 = y + Math.sin(s0 + 2.6) * rr;
    const seg = `M${P(x1, y1)}A${rr} ${rr} 0 1 1 ${P(x2, y2)}`;
    if (r.chance(0.35)) light += seg;
    else dark += seg;
  }
  return (
    <g fill="none" stroke-linecap="round">
      <path d={dark} stroke={shade(c.hair, -0.45)} stroke-width="0.6" stroke-opacity="0.75" />
      <path d={light} stroke={shade(c.hair, 0.4)} stroke-width="0.45" stroke-opacity="0.6" />
    </g>
  );
}

function sheen(c: PaintCtx, x: number, y: number, w: number, rot = -12): VNode {
  return (
    <ellipse cx={x} cy={y} rx={(w) * 1.45} ry={(w * 0.22) * 1.45} transform={`rotate(${rot} ${x} ${y})`} fill={`url(#${c.id('gSheen')})`} opacity="0.5"/>
  );
}

function curlRing(c: PaintCtx, cx: number, cy: number, rx: number, ry: number, from: number, to: number, n: number, r: number, seed: number): VNode {
  const rng = createRng(seed);
  const items: VNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = from + ((to - from) * i) / (n - 1);
    const x = cx + Math.cos(t) * rx + rng.float(-1, 1);
    const y = cy + Math.sin(t) * ry + rng.float(-1, 1);
    const rr = r * rng.float(0.8, 1.2);
    items.push(
      <g key={i}>
        <circle cx={x} cy={y} r={rr} fill={`url(#${c.id('hair')})`} />
        <path d={`M${P(x - rr * 0.55, y - rr * 0.1)}A${rr * 0.6} ${rr * 0.6} 0 0 1 ${P(x + rr * 0.35, y - rr * 0.45)}`} fill="none" stroke={shade(c.hair, 0.35)} stroke-opacity="0.55" stroke-width="0.8" stroke-linecap="round" />
      </g>,
    );
  }
  return <g>{items}</g>;
}

export interface HairLayers {
  back: VNode | null;
  front: VNode | null;
  /** drawn over the head but under the face (scalp shine etc.) */
  scalp?: VNode | null;
}

export function hairLayers(c: PaintCtx): HairLayers {
  const { g, t } = c;
  const W = g.headW;
  const T = g.headTop;
  const E = g.eyeY;
  const H = g.hairline;
  const fill = `url(#${c.id('hair')})`;
  const back = `url(#${c.id('hairBack')})`;
  const side = t.partLeft ? -1 : 1;
  const style = c.spec.hair;
  const seed = t.seed;

  switch (style) {
    case 'bald': {
      const fringe = c.age >= 35;
      return {
        back: fringe ? (
          <g fill={fill} opacity="0.95">
            {[-1, 1].map((s) => (
              <path key={s} d={smooth([[CX + s * (W - 2), E - 20], [CX + s * (W + 2.5), E - 12], [CX + s * (W + 1.5), E + 2], [CX + s * (W - 3), E + 4], [CX + s * (W - 2.5), E - 10]], true)} />
            ))}
          </g>
        ) : null,
        front: null,
        scalp: <ellipse cx={CX + 8} cy={T + 11} rx={(14) * 1.45} ry={(6) * 1.45} fill={`url(#${c.id('gWhite')})`} opacity="0.2"/>,
      };
    }
    case 'buzz': {
      const d = capPath(g, { lift: 1.2, hairline: H - 1, temple: E - 9, extra: 0.4 });
      return {
        back: null,
        front: (
          <g>
            <path d={d} fill={mix(c.hair, c.skin.base, 0.25)} opacity="0.95" />
            <path d={d} fill={`url(#${c.id('stipple')})`} opacity="0.7" />
            {sheen(c, CX + 10, T + 9, 12)}
          </g>
        ),
      };
    }
    case 'short': {
      const d = capPath(g, { lift: 6, hairline: H, temple: E - 10, extra: 1.6, bumps: 1.6, recede: c.sex === 'M' ? 0.6 : 0.2 });
      const crown: Pt = [CX + side * 12, T - 4];
      const flow = along(hairlinePoly(W + 1, H + 1, E - 7), 17).map((b) => [crown, b] as Pair);
      return {
        back: null,
        front: (
          <g>
            {castShadow(c, d)}
            {mass(c, d, { flow, bend: 0.13 * side, band: [0.18, 0.5], tips: 2.4, rim: [CX + W + 2, T + 16] }, 'short')}
            <path d={`M${P(crown[0], crown[1] + 3)}Q${P(crown[0] - side * 1.5, T + 9)} ${P(crown[0] - side * 4.5, H - 9)}`} stroke={shade(c.hair, -0.5)} stroke-width="0.9" stroke-opacity="0.45" fill="none" stroke-linecap="round" />
          </g>
        ),
      };
    }
    case 'swept': {
      const d = capPath(g, { lift: 9, hairline: H - 1, temple: E - 10, extra: 1.8, bumps: 1.2, recede: c.sex === 'M' ? 0.7 : 0.2 });
      const quiff = smooth([[CX - W * 0.95, H + 2], [CX - W * 0.85, T + 6], [CX - W * 0.25, T - 14], [CX + W * 0.4, T - 13], [CX + W * 0.95, T + 6], [CX + W * 0.75, H - 4], [CX + W * 0.1, H - 6], [CX - W * 0.5, H - 3]], true);
      const roots = along(hairlinePoly(W - 1, H - 1, E - 8), 15);
      const ends = along([[CX - W * 1.02, T + 8], [CX - W * 0.55, T - 9], [CX + W * 0.1, T - 14.5], [CX + W * 0.7, T - 7], [CX + W * 1.02, T + 10]], 15);
      const flow = roots.map((a, i) => [a, ends[i]!] as Pair);
      return {
        back: null,
        front: (
          <g>
            {castShadow(c, d)}
            {mass(c, d, { flow, bend: -0.08, band: [0.5, 0.82], rim: [CX + W + 2, T + 10] }, 'swept')}
            {mass(c, quiff, { flow, bend: -0.1, band: [0.5, 0.86], rim: [CX + W, T] }, 'quiff')}
          </g>
        ),
      };
    }
    case 'curly': {
      const d = capPath(g, { lift: 8, hairline: H + 1, temple: E - 4, extra: 3 });
      return {
        back: curlRing(c, CX, T + (E - T) * 0.5, W + 4, (E - T) * 0.62, Math.PI * 0.92, Math.PI * 2.08, 15, 7.2, seed),
        front: (
          <g>
            {castShadow(c, d)}
            {mass(c, d, { flow: along(hairlinePoly(W + 2, H + 1, E - 5), 13).map((b) => [[CX + side * 6, T - 6], b] as Pair), bend: 0.05, band: [0.15, 0.4], rim: [CX + W + 3, T + 14] }, 'curly')}
            {curlRing(c, CX, T + (E - T) * 0.5, W + 1, (E - T) * 0.58, Math.PI * 1.05, Math.PI * 1.95, 11, 6.2, seed + 1)}
            {curlRing(c, CX, H + 14, W * 0.8, 15, Math.PI * 1.12, Math.PI * 1.88, 8, 4.6, seed + 2)}
          </g>
        ),
      };
    }
    case 'afro': {
      const cy = T + (E - T) * 0.48;
      const rx = W + 18;
      const ry = (E - T) * 0.82 + 8;
      const blob: Pt[] = [];
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const bump = i % 2 ? 1 : 0.94;
        blob.push([CX + Math.cos(a) * rx * bump, cy + Math.sin(a) * ry * bump * (Math.sin(a) > 0.3 ? 0.88 : 1)]);
      }
      const front = capPath(g, { lift: 4, hairline: H + 1, temple: E - 2, extra: 3 });
      return {
        back: (
          <g>
            <path d={smooth(blob, true)} fill={fill} />
            <clipPath id={c.id('afroClip')}><path d={smooth(blob, true)} /></clipPath>
            <g clip-path={`url(#${c.id('afroClip')})`}>{coilScatter(c, CX, cy, rx, ry, 260, seed)}</g>
            {sheen(c, CX + 12, cy - ry * 0.7, 22, -10)}
          </g>
        ),
        front: (
          <g>
            <path d={front} fill={`url(#${c.id('hair')})`} />
            <clipPath id={c.id('afroFront')}><path d={front} /></clipPath>
            <g clip-path={`url(#${c.id('afroFront')})`}>{coilScatter(c, CX, T + 10, W + 4, 26, 110, seed + 9)}</g>
          </g>
        ),
      };
    }
    case 'long':
    case 'bob': {
      const isBob = style === 'bob';
      const bottom = isBob ? g.chinY - 4 : 222;
      const outW = isBob ? W + 8 : W + 10;
      const backShape = smooth(
        [
          [CX, T - 6],
          [CX + outW * 0.8, T + 4],
          [CX + outW, E - 6],
          [CX + outW + (isBob ? 1 : 3), (E + bottom) / 2],
          [CX + outW - (isBob ? 3 : -4), bottom],
          [CX + outW * 0.45, bottom + (isBob ? 2 : 6)],
          [CX, bottom + (isBob ? 0 : 8)],
          [CX - outW * 0.45, bottom + (isBob ? 2 : 6)],
          [CX - outW + (isBob ? 3 : -4), bottom],
          [CX - outW - (isBob ? 1 : 3), (E + bottom) / 2],
          [CX - outW, E - 6],
          [CX - outW * 0.8, T + 4],
        ],
        true,
      );
      const capD = capPath(g, { lift: 5, hairline: isBob ? g.browY - 9 : H, temple: E + 2, extra: 2.5 });
      const curtain = (s: number) =>
        smooth(
          [
            [CX + s * 4, H - 3],
            [CX + s * (W * 0.75), H + 2],
            [CX + s * (W + 1), E - 2],
            [CX + s * (W + 3.5), (E + bottom) / 2],
            [CX + s * (W + (isBob ? 6 : 8)), bottom - 1],
            [CX + s * (W - 3), bottom - (isBob ? 3 : 10)],
            [CX + s * (W - 5), E + 14],
            [CX + s * (W - 6), E - 6],
            [CX + s * (W * 0.45), H + 6],
          ],
          true,
        );
      const bangs = isBob
        ? smooth([[CX - W + 2, g.browY - 6], [CX - W * 0.5, g.browY - 8.5], [CX, g.browY - 7], [CX + W * 0.5, g.browY - 8.5], [CX + W - 2, g.browY - 6], [CX + W * 0.6, H - 6], [CX - W * 0.6, H - 6]], true)
        : null;
      const part: Pt = [CX + side * 6, T - 3];
      const capFlow = along([[CX - W - 2, E + 2], [CX - W, E - 10], [CX - W * 0.62, H + 2], [CX, H], [CX + W * 0.62, H + 2], [CX + W, E - 10], [CX + W + 2, E + 2]], 17).map((b) => [part, b] as Pair);
      const curtainFlow = (sd: number) => {
        const tops = along([[CX + sd * 6, H - 2], [CX + sd * W * 0.75, H + 3], [CX + sd * (W + 1), E - 2], [CX + sd * (W + 3), E + 14]], 8);
        const bots = along([[CX + sd * (W - 5), bottom - (isBob ? 4 : 12)], [CX + sd * (W + 2), bottom - 2], [CX + sd * (W + (isBob ? 6 : 8)), bottom]], 8);
        return tops.map((a, i) => [a, bots[i]!] as Pair);
      };
      const bangFlow = along([[CX - W + 2, g.browY - 6], [CX, g.browY - 7], [CX + W - 2, g.browY - 6]], 11).map((b) => [[CX + side * 8, H - 9], b] as Pair);
      const backFlow = along([[CX - outW + 3, E - 6], [CX - outW * 0.6, T + 2], [CX + outW * 0.6, T + 2], [CX + outW - 3, E - 6]], 14).map((a) => [a, [CX + (a[0] - CX) * 1.12, bottom + (isBob ? 0 : 4)]] as Pair);
      return {
        back: (
          <g>
            {mass(c, backShape, { flow: backFlow, bend: 0.03, band: [0.08, 0.22], fill: back }, 'back')}
          </g>
        ),
        front: (
          <g>
            {castShadow(c, capD)}
            {mass(c, capD, { flow: capFlow, bend: 0.06 * side, band: [0.18, 0.42], rim: [CX + W + 4, T + 18] }, 'cap')}
            {mass(c, curtain(-1), { flow: curtainFlow(-1), bend: -0.04, band: [0.12, 0.3], tips: 3, rim: [CX - W, E] }, 'curtL')}
            {mass(c, curtain(1), { flow: curtainFlow(1), bend: 0.04, band: [0.12, 0.3], tips: 3, rim: [CX + W + 6, E - 4] }, 'curtR')}
            {bangs && mass(c, bangs, { flow: bangFlow, bend: 0.08 * side, band: [0.25, 0.5], tips: 2.4 }, 'bangs')}
            {!isBob && <path d={`M${P(CX + side * 6, H - 4)}Q${P(CX + side * 7, T + 8)} ${P(CX + side * 2, T - 3)}`} stroke={shade(c.hair, -0.5)} stroke-width="1" stroke-opacity="0.5" fill="none" />}
          </g>
        ),
      };
    }
    case 'bun': {
      const capD = capPath(g, { lift: 2.5, hairline: H - 1, temple: E - 7, extra: 1 });
      return {
        back: (
          <g>
            <circle cx={CX + 2} cy={T - 7} r="13.5" fill={fill} />
            <path d={`M${P(CX - 8, T - 10)}A10 9 0 0 1 ${P(CX + 11, T - 9)}M${P(CX - 5, T - 4)}A8 7 0 0 1 ${P(CX + 9, T - 3)}`} fill="none" stroke={shade(c.hair, -0.4)} stroke-opacity="0.5" stroke-width="0.9" />
            {sheen(c, CX + 6, T - 14, 7, -15)}
          </g>
        ),
        front: (
          <g>
            {castShadow(c, capD)}
            {mass(c, capD, { flow: along(hairlinePoly(W + 1, H - 1, E - 7), 16).map((a) => [a, [CX + 2, T - 6]] as Pair), bend: 0.03, band: [0.4, 0.72], rim: [CX + W + 2, T + 14] }, 'bun')}
          </g>
        ),
      };
    }
    case 'ponytail': {
      const capD = capPath(g, { lift: 3.5, hairline: H - 1, temple: E - 7, extra: 1.2 });
      const s = side;
      const tail = smooth([[CX + s * W * 0.55, T + 16], [CX + s * (W + 6), T + 30], [CX + s * (W + 8.5), E + 10], [CX + s * (W + 5), g.chinY - 2], [CX + s * (W + 1), g.chinY + 6], [CX + s * (W - 2), E + 18], [CX + s * (W - 3), E - 6]], true);
      return {
        back: (
          <g>
            {mass(c, tail, { flow: along([[CX + s * W * 0.6, T + 17], [CX + s * (W + 6), T + 29], [CX + s * (W + 1), E - 2]], 7).map((a) => [a, [CX + s * (W + 3), g.chinY + 2]] as Pair), bend: 0.05 * s, band: [0.15, 0.35], tips: 3, fill: back }, 'tail')}
          </g>
        ),
        front: (
          <g>
            {castShadow(c, capD)}
            {mass(c, capD, { flow: along(hairlinePoly(W + 1, H - 1, E - 7), 16).map((a) => [a, [CX + s * W * 0.75, T + 12]] as Pair), bend: -0.06 * s, band: [0.42, 0.75], rim: [CX + W + 2, T + 14] }, 'pony')}
          </g>
        ),
      };
    }
    case 'braids': {
      const capD = capPath(g, { lift: 2.5, hairline: H, temple: E - 6, extra: 1 });
      const braids: VNode[] = [];
      for (const s of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          const x0 = CX + s * (W - 6 + k * 3.5);
          const y0 = E - 18 + k * 4;
          const x1 = CX + s * (W + 1 + k * 4.5);
          const y1 = 222 - k * 3;
          const n = 16;
          const links: VNode[] = [];
          for (let i = 0; i < n; i++) {
            const u = i / (n - 1);
            const x = x0 + (x1 - x0) * u;
            const y = y0 + (y1 - y0) * u;
            links.push(<ellipse key={i} cx={x + (i % 2 ? 0.8 : -0.8)} cy={y} rx="2.3" ry="3.6" transform={`rotate(${(i % 2 ? 1 : -1) * 28} ${x} ${y})`} />);
          }
          braids.push(<g key={`${s}-${k}`} fill={k % 2 ? shade(c.hair, -0.1) : c.hair} stroke={shade(c.hair, -0.45)} stroke-width="0.4">{links}</g>);
        }
      }
      const rows: string[] = [];
      for (let k = -3; k <= 3; k++) {
        const x = CX + k * 7.5;
        rows.push(`M${P(x, H + 1 - Math.abs(k) * 0.4)}Q${P(x + k * 1.6, T + 10)} ${P(CX + k * 3, T - 1)}`);
      }
      return {
        back: <g>{braids}</g>,
        front: (
          <g>
            {castShadow(c, capD)}
            {mass(c, capD, { flow: along(hairlinePoly(W, H, E - 6), 9).map((a) => [a, [CX + (a[0] - CX) * 0.3, T - 2]] as Pair), bend: 0, band: [0.45, 0.7], rim: [CX + W + 2, T + 14] }, 'braids')}
            <path d={rows.join('')} fill="none" stroke={shade(c.hair, -0.5)} stroke-width="1.1" stroke-opacity="0.55" stroke-linecap="round" />
            <path d={rows.join('')} fill="none" stroke={shade(c.hair, 0.3)} stroke-width="0.5" stroke-opacity="0.35" transform="translate(2 0)" />
            {sheen(c, CX + 10, T + 6, 12, -20)}
          </g>
        ),
      };
    }
  }
  return { back: null, front: null };
}
