import type { VNode } from 'preact';
import { createRng } from '@core';
import { mix, shade } from '../../fx/color';
import { CX, VIEW_H, VIEW_W, type Geo } from '../geometry';
import { P, smooth, type Pt } from '../paths';
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
      <pattern id={c.id('strandTex')} width="4.2" height="26" patternUnits="userSpaceOnUse" patternTransform={`rotate(${c.t.partLeft ? 18 : -18})`}>
        <path d="M2.1,0C0.8,6.5 3.4,13 2.1,19.5S0.8,26 2.1,26" stroke={shade(h, -0.5)} stroke-width="0.55" fill="none" opacity="0.7" />
        <path d="M0.4,4C-0.4,10 1.2,15 0.4,22" stroke={shade(h, 0.35)} stroke-width="0.35" fill="none" opacity="0.5" />
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
}

/** Hair hugging the cranium, ending in a hairline across the forehead. */
export function capPath(g: Geo, o: CapOpts): string {
  const W = g.headW + (o.extra ?? 0);
  const T = g.headTop - o.lift;
  const H = o.hairline;
  const E = o.temple;
  const right: Pt[] = [
    [CX, T],
    [CX + W * 0.62, T + 3 + o.lift * 0.15],
    [CX + W * 0.97, T + (g.eyeY - T) * 0.38],
    [CX + W + 0.6, E],
    [CX + g.headW - 2.4, E + 0.5],
    [CX + g.headW - 4.5, H + 9],
    [CX + g.headW * 0.62, H + 1.5],
    [CX + g.headW * 0.25, H - 0.5],
  ];
  const pts: Pt[] = [...right];
  const left = right.slice(1).map(([x, y]) => [2 * CX - x, y] as Pt).reverse();
  pts.push([CX, H + (o.part !== undefined ? 0 : 0.6)]);
  pts.push(...left);
  return smooth(pts, true, 0.95);
}

/** Hair mass: feathered edge + gradient fill + fine strand texture. */
function mass(c: PaintCtx, d: string, key?: string): VNode {
  return (
    <g key={key}>
      <path d={d} fill="none" stroke={c.hair} stroke-opacity="0.4" stroke-width="1.8" stroke-linejoin="round" />
      <path d={d} fill={`url(#${c.id('hair')})`} />
      <path d={d} fill={`url(#${c.id('strandTex')})`} opacity="0.45" />
    </g>
  );
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

function strands(c: PaintCtx, from: Pt[], to: Pt[], o = 0.3): VNode {
  const d = from.map((a, i) => {
    const b = to[i]!;
    const mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.12;
    const my = (a[1] + b[1]) / 2 - Math.abs(b[0] - a[0]) * 0.08;
    return `M${P(a[0], a[1])}Q${P(mx, my)} ${P(b[0], b[1])}`;
  }).join('');
  return <path d={d} fill="none" stroke={shade(c.hair, -0.45)} stroke-opacity={o} stroke-width="0.8" stroke-linecap="round" />;
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
      const d = capPath(g, { lift: 6, hairline: H, temple: E - 7, extra: 1.6 });
      const px = CX + side * 13;
      const tuft = smooth([[px, H - 8], [CX - side * 4, H - 6], [CX - side * W * 0.62, H + 1], [CX - side * (W - 3), H + 8], [CX - side * (W - 6), H - 4], [CX - side * W * 0.4, H - 11], [px, H - 11]], true);
      return {
        back: null,
        front: (
          <g>
            {mass(c, d)}
            {mass(c, tuft)}
            <path d={`M${P(px, H - 10)}Q${P(px + side * 1, T + 8)} ${P(px - side * 3, T - 2)}`} stroke={shade(c.hair, -0.45)} stroke-width="1" stroke-opacity="0.5" fill="none" />
            {strands(c, [[px - side * 3, H - 9], [px - side * 9, H - 8], [px - side * 16, H - 6]], [[CX - side * W * 0.7, H + 3], [CX - side * W * 0.8, H + 5], [CX - side * (W - 2), H + 9]], 0.35)}
            {sheen(c, CX + 12, T + 6, 13, -18)}
          </g>
        ),
      };
    }
    case 'swept': {
      const d = capPath(g, { lift: 9, hairline: H - 1, temple: E - 7, extra: 1.8 });
      const quiff = smooth([[CX - W * 0.95, H + 2], [CX - W * 0.85, T + 6], [CX - W * 0.25, T - 14], [CX + W * 0.4, T - 13], [CX + W * 0.95, T + 6], [CX + W * 0.75, H - 4], [CX + W * 0.1, H - 6], [CX - W * 0.5, H - 3]], true);
      return {
        back: null,
        front: (
          <g>
            {mass(c, d)}
            {mass(c, quiff)}
            {strands(c, [[CX - W * 0.7, H - 1], [CX - W * 0.35, H - 4], [CX, H - 5], [CX + W * 0.35, H - 4]], [[CX - W * 0.2, T - 10], [CX + W * 0.15, T - 11], [CX + W * 0.55, T - 6], [CX + W * 0.85, T + 4]], 0.4)}
            {sheen(c, CX + 4, T - 6, 18, -8)}
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
            {mass(c, d)}
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
      return {
        back: (
          <g>
            <path d={backShape} fill={back} />
            {strands(c, [[CX - outW + 4, E], [CX - outW + 7, E + 20], [CX + outW - 4, E], [CX + outW - 7, E + 20]], [[CX - outW + 2, bottom - 4], [CX - outW + 9, bottom], [CX + outW - 2, bottom - 4], [CX + outW - 9, bottom]], 0.3)}
          </g>
        ),
        front: (
          <g>
            {mass(c, capD)}
            {mass(c, curtain(-1))}
            {mass(c, curtain(1))}
            {bangs && mass(c, bangs)}
            {!isBob && <path d={`M${P(CX + side * 6, H - 4)}Q${P(CX + side * 7, T + 8)} ${P(CX + side * 2, T - 3)}`} stroke={shade(c.hair, -0.5)} stroke-width="1" stroke-opacity="0.5" fill="none" />}
            {strands(c, [[CX + 8, H], [CX + W * 0.6, H + 4], [CX - 8, H], [CX - W * 0.6, H + 4]], [[CX + W + 2, E + 20], [CX + W + 5, bottom - 8], [CX - W - 2, E + 20], [CX - W - 5, bottom - 8]], 0.28)}
            {sheen(c, CX + 12, T + 7, 15, -20)}
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
            {mass(c, capD)}
            {strands(c, [[CX - W * 0.6, H + 2], [CX - W * 0.2, H], [CX + W * 0.2, H], [CX + W * 0.6, H + 2]], [[CX - 6, T + 1], [CX - 2, T - 1], [CX + 3, T - 1], [CX + 8, T + 1]], 0.35)}
            {sheen(c, CX + 12, T + 7, 12, -20)}
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
            <path d={tail} fill={back} />
            {strands(c, [[CX + s * (W + 4), T + 30], [CX + s * (W + 6), E]], [[CX + s * (W + 3), g.chinY], [CX + s * (W + 5), g.chinY - 8]], 0.35)}
          </g>
        ),
        front: (
          <g>
            {mass(c, capD)}
            {strands(c, [[CX - W * 0.6, H + 2], [CX, H], [CX + W * 0.6, H + 2]], [[CX + s * W * 0.7, T + 16], [CX + s * W * 0.75, T + 18], [CX + s * W * 0.8, T + 20]], 0.35)}
            {sheen(c, CX + 10, T + 6, 13, -18)}
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
            {mass(c, capD)}
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
