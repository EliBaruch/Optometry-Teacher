import type { VNode } from 'preact';
import { mix, shade } from '../../fx/color';
import { CX, VIEW_H, type Side } from '../geometry';
import { GOLD } from '../palette';
import { P, jawPath, smooth, type Pt } from '../paths';
import type { PaintCtx } from './ctx';

const HAT_COLORS = ['#2c3e66', '#7a2f3f', '#2f5b4a', '#3b2f5c', '#8a6a2a', '#1f2937', '#5b3a29'] as const;
const SCARF_COLORS = ['#6b2d4f', '#2f4f6b', '#7a4a2a', '#3f5f4a', '#5a3a7a', '#8a3a3a', '#2d5a5a'] as const;

// ---------------------------------------------------------------------------
// Facial hair

function beardShape(c: PaintCtx): string {
  const { g } = c;
  const W = g.headW;
  const E = g.eyeY;
  const outer = jawPath(g, 2.2);
  const inner: Pt[] = [
    [CX + W - 2, E + 1],
    [CX + W - 8, E + 18],
    [CX + 20, E + 23],
    [CX + g.mouthW + 5, g.noseY + 4],
    [CX + 4, g.noseY + 6],
    [CX - 4, g.noseY + 6],
    [CX - g.mouthW - 5, g.noseY + 4],
    [CX - 20, E + 23],
    [CX - W + 8, E + 18],
    [CX - W + 2, E + 1],
  ];
  const back = smooth(inner, false).replace(/^M/, 'L');
  const mouthHole = `M${P(CX - g.mouthW - 2.5, g.mouthY)}Q${P(CX, g.mouthY - g.lipU * 2.4)} ${P(CX + g.mouthW + 2.5, g.mouthY)}Q${P(CX, g.mouthY + g.lipL * 3.2 + 3)} ${P(CX - g.mouthW - 2.5, g.mouthY)}Z`;
  // outer runs left->right along the jaw; return over the cheeks right->left
  return `${outer}${back}Z${mouthHole}`;
}

function moustacheShape(c: PaintCtx): string {
  const { g } = c;
  const y = g.mouthY - g.lipU * 0.4;
  const w = g.mouthW + 2.5;
  return smooth(
    [
      [CX - w, y + 2.5],
      [CX - w * 0.7, g.noseY + 6.5],
      [CX - 3, g.noseY + 5.2],
      [CX, g.noseY + 6.2],
      [CX + 3, g.noseY + 5.2],
      [CX + w * 0.7, g.noseY + 6.5],
      [CX + w, y + 2.5],
      [CX + w * 0.55, y - 0.5],
      [CX, y - 1.2],
      [CX - w * 0.55, y - 0.5],
    ],
    true,
  );
}

export function FacialHairUnder({ c }: { c: PaintCtx }) {
  const kind = c.spec.facialHair ?? 'none';
  if (kind === 'stubble') {
    const d = beardShape(c);
    return (
      <g fill-rule="evenodd" clip-path={`url(#${c.id('headClip')})`}>
        <path d={d} fill={mix(c.hair, c.skin.deep, 0.5)} opacity="0.22" filter={`url(#${c.id('soft')})`} />
        <path d={d} fill={`url(#${c.id('stubble')})`} opacity="0.5" />
      </g>
    );
  }
  if (kind === 'beard') {
    const d = beardShape(c);
    const strokes: string[] = [];
    for (let i = -5; i <= 5; i++) {
      const x = CX + i * 5.2;
      const y0 = c.g.chinY - 14 + Math.abs(i) * -1.8;
      strokes.push(`M${P(x, y0)}q${P(i * 0.3, 5)} ${P(i * 0.2, 9 - Math.abs(i) * 0.5)}`);
    }
    return (
      <g fill-rule="evenodd">
        <path d={d} fill={`url(#${c.id('hair')})`} />
        <path d={d} fill={`url(#${c.id('stipple')})`} opacity="0.35" />
        <path d={strokes.join('')} stroke={shade(c.hair, -0.4)} stroke-opacity="0.45" stroke-width="0.8" fill="none" stroke-linecap="round" />
        <path d={strokes.join('')} stroke={mix(c.hair, GOLD, 0.4)} stroke-opacity="0.25" stroke-width="0.5" fill="none" transform="translate(1.2 0)" />
      </g>
    );
  }
  return null;
}

export function FacialHairOver({ c }: { c: PaintCtx }) {
  const kind = c.spec.facialHair ?? 'none';
  if (kind === 'beard' || kind === 'moustache') {
    const d = moustacheShape(c);
    return (
      <g>
        <path d={d} fill={`url(#${c.id('hair')})`} />
        <path d={d} fill="none" stroke={shade(c.hair, -0.4)} stroke-opacity="0.4" stroke-width="0.5" />
      </g>
    );
  }
  if (kind === 'stubble') {
    return <path d={moustacheShape(c)} fill={`url(#${c.id('stubble')})`} opacity="0.45" />;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Glasses

function lensPath(style: string, ex: number, ey: number, side: Side, k: number): string {
  const s = (v: number) => v * k;
  switch (style) {
    case 'round':
      return `M${P(ex - s(11.5), ey)}a${s(11.5)} ${s(11.5)} 0 1 0 ${s(23)} 0a${s(11.5)} ${s(11.5)} 0 1 0 ${-s(23)} 0Z`;
    case 'cat-eye':
      return smooth([[ex - side * s(12), ey - s(7.5)], [ex, ey - s(9.5)], [ex + side * s(14.5), ey - s(11.5)], [ex + side * s(12.5), ey + s(2)], [ex + side * s(6), ey + s(8)], [ex - side * s(5), ey + s(8.5)], [ex - side * s(12.2), ey + s(2)]], true, 0.8);
    case 'aviator':
      return smooth([[ex - side * s(11.5), ey - s(8.5)], [ex + side * s(2), ey - s(9.5)], [ex + side * s(13), ey - s(8)], [ex + side * s(12), ey + s(5)], [ex + side * s(4), ey + s(11)], [ex - side * s(6), ey + s(9)], [ex - side * s(11.5), ey + s(1)]], true, 0.9);
    default: {
      // square & half-rim share a softened rectangle
      const w = s(13.5);
      const h = s(9.5);
      return `M${P(ex - w + 3, ey - h)}H${f2(ex + w - 3)}Q${P(ex + w, ey - h)} ${P(ex + w, ey - h + 3)}V${f2(ey + h - 3)}Q${P(ex + w, ey + h)} ${P(ex + w - 3, ey + h)}H${f2(ex - w + 3)}Q${P(ex - w, ey + h)} ${P(ex - w, ey + h - 3)}V${f2(ey - h + 3)}Q${P(ex - w, ey - h)} ${P(ex - w + 3, ey - h)}Z`;
    }
  }
}
const f2 = (n: number) => (Math.round(n * 100) / 100).toString();

export function Glasses({ c }: { c: PaintCtx }) {
  const style = c.spec.glasses ?? 'none';
  if (style === 'none') return null;
  const { g } = c;
  const k = 1 - g.child * 0.12;
  const frame = style === 'aviator' ? '#c9a35a' : c.t.frame;
  const sw = style === 'aviator' ? 0.9 : style === 'half-rim' ? 0.5 : 1.7;
  const ey = g.eyeY + 0.5;
  const els: VNode[] = [];
  for (const side of [-1, 1] as Side[]) {
    const ex = CX + side * g.eyeDX;
    const d = lensPath(style, ex, ey, side, k);
    const clip = c.id(`lens${side}`);
    els.push(
      <g key={side}>
        <clipPath id={clip}><path d={d} /></clipPath>
        <path d={d} fill="#e8f2ff" opacity={style === 'aviator' ? 0.16 : 0.07} />
        <g clip-path={`url(#${clip})`}>
          <path d={`M${P(ex - 14, ey + 4)}L${P(ex - 2, ey - 12)}L${P(ex + 3, ey - 12)}L${P(ex - 9, ey + 4)}Z`} fill="#fff" opacity="0.18" />
          <path d={`M${P(ex + 4, ey + 10)}L${P(ex + 12, ey - 2)}L${P(ex + 13.5, ey - 2)}L${P(ex + 5.5, ey + 10)}Z`} fill="#fff" opacity="0.1" />
        </g>
        {style === 'half-rim' ? (
          <>
            <path d={d} fill="none" stroke={frame} stroke-width="0.45" stroke-opacity="0.45" />
            <path d={`M${P(ex - 13.5 * k, ey - 6)}Q${P(ex - 13.5 * k, ey - 9.5 * k)} ${P(ex - 10, ey - 9.5 * k)}H${f2(ex + 10)}Q${P(ex + 13.5 * k, ey - 9.5 * k)} ${P(ex + 13.5 * k, ey - 6)}`} fill="none" stroke={frame} stroke-width="2.6" stroke-linecap="round" />
          </>
        ) : (
          <>
            <path d={d} fill="none" stroke={shade(frame, -0.3)} stroke-width={sw + 0.6} />
            <path d={d} fill="none" stroke={frame} stroke-width={sw} />
            <path d={d} fill="none" stroke={mix(frame, GOLD, 0.5)} stroke-width="0.4" stroke-opacity="0.6" transform="translate(0.4 -0.4)" />
          </>
        )}
        {/* temple arm toward the ear */}
        <path d={`M${P(ex + side * 13 * k, ey - 5)}L${P(CX + side * (g.headW - 1), ey - 3)}`} stroke={frame} stroke-width={style === 'aviator' ? 0.9 : 1.6} stroke-linecap="round" />
      </g>,
    );
  }
  const bx = g.eyeDX - 11.5 * k;
  const bridge = `M${P(CX - bx, ey - 3)}Q${P(CX, ey - 6.5)} ${P(CX + bx, ey - 3)}`;
  return (
    <g>
      {els}
      <path d={bridge} fill="none" stroke={frame} stroke-width={style === 'aviator' ? 1 : 1.7} stroke-linecap="round" />
      {style === 'aviator' && <path d={`M${P(CX - bx - 1, ey - 8)}H${f2(CX + bx + 1)}`} stroke={frame} stroke-width="0.9" />}
      {/* nose pads */}
      <ellipse cx={CX - 4} cy={ey + 1} rx="1" ry="1.8" fill="#fff" opacity="0.3" />
      <ellipse cx={CX + 4} cy={ey + 1} rx="1" ry="1.8" fill="#fff" opacity="0.3" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Headwear

export function headwearColor(c: PaintCtx, scarf = false): string {
  const list = scarf ? SCARF_COLORS : HAT_COLORS;
  return list[c.t.seed % list.length]!;
}

export function ScarfBack({ c }: { c: PaintCtx }) {
  if (!c.scarf) return null;
  const { g } = c;
  const col = headwearColor(c, true);
  const W = g.headW;
  const outer = smooth(
    [
      [CX, g.headTop - 9],
      [CX + W + 9, g.headTop + 14],
      [CX + W + 12, g.eyeY + 12],
      [CX + g.jawW + 12, g.chinY + 6],
      [CX + g.neckW + 26, g.shoulderY],
      [CX + g.shoulderW * 0.78, VIEW_H + 6],
      [CX - g.shoulderW * 0.78, VIEW_H + 6],
      [CX - g.neckW - 26, g.shoulderY],
      [CX - g.jawW - 12, g.chinY + 6],
      [CX - W - 12, g.eyeY + 12],
      [CX - W - 9, g.headTop + 14],
    ],
    true,
  );
  return <path d={outer} fill={shade(col, -0.25)} />;
}

export function Headwear({ c }: { c: PaintCtx }) {
  const kind = c.spec.headwear ?? 'none';
  const { g } = c;
  const W = g.headW;
  const T = g.headTop;
  const H = g.hairline;
  if (kind === 'none') return null;
  const gid = c.id('hat');
  const grad = (col: string) => (
    <linearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color={shade(col, 0.22)} />
      <stop offset="1" stop-color={shade(col, -0.35)} />
    </linearGradient>
  );
  if (kind === 'headscarf') {
    const col = headwearColor(c, true);
    const face = smooth(
      [
        [CX, H - 3],
        [CX + W - 5, H + 5],
        [CX + g.cheekW - 3, g.eyeY + 6],
        [CX + g.jawW - 2, g.chinY - 16],
        [CX + g.chinW + 3, g.chinY - 1],
        [CX, g.chinY + 2],
        [CX - g.chinW - 3, g.chinY - 1],
        [CX - g.jawW + 2, g.chinY - 16],
        [CX - g.cheekW + 3, g.eyeY + 6],
        [CX - W + 5, H + 5],
      ],
      true,
    );
    const outer = smooth(
      [
        [CX, T - 8],
        [CX + W + 8, T + 14],
        [CX + W + 10, g.eyeY + 12],
        [CX + g.jawW + 9, g.chinY + 4],
        [CX + g.neckW + 20, g.shoulderY + 2],
        [CX + g.shoulderW * 0.6, VIEW_H + 6],
        [CX - g.shoulderW * 0.6, VIEW_H + 6],
        [CX - g.neckW - 20, g.shoulderY + 2],
        [CX - g.jawW - 9, g.chinY + 4],
        [CX - W - 10, g.eyeY + 12],
        [CX - W - 8, T + 14],
      ],
      true,
    );
    return (
      <g>
        <defs>{grad(col)}</defs>
        <path d={outer + face} fill={`url(#${gid})`} fill-rule="evenodd" />
        <path d={face} fill="none" stroke={shade(col, -0.4)} stroke-width="1.6" />
        <path d={face} fill="none" stroke={shade(col, 0.3)} stroke-width="0.6" transform="translate(0.6 -0.8)" opacity="0.7" />
        <g stroke={shade(col, -0.4)} stroke-opacity="0.45" stroke-width="1" fill="none" stroke-linecap="round">
          <path d={`M${P(CX + W + 4, g.eyeY + 20)}Q${P(CX + W - 2, g.chinY + 8)} ${P(CX + 12, g.shoulderY + 10)}`} />
          <path d={`M${P(CX - W - 4, g.eyeY + 24)}Q${P(CX - W + 4, g.chinY + 10)} ${P(CX - 18, g.shoulderY + 14)}`} />
          <path d={`M${P(CX + 6, T - 4)}Q${P(CX + W, T + 4)} ${P(CX + W + 6, g.eyeY - 4)}`} />
        </g>
        <path d={outer} fill="none" stroke={`url(#${c.id('rimBody')})`} stroke-width="1.6" />
      </g>
    );
  }
  if (kind === 'kippah') {
    return (
      <g>
        <ellipse cx={CX + 3} cy={T + 3} rx="15" ry="5.5" fill={HAT_COLORS[c.t.seed % 3]} transform={`rotate(-6 ${CX + 3} ${T + 3})`} />
        <ellipse cx={CX + 3} cy={T + 3} rx="11" ry="3.6" fill="none" stroke={GOLD} stroke-opacity="0.55" stroke-width="0.8" stroke-dasharray="1.6 1" transform={`rotate(-6 ${CX + 3} ${T + 3})`} />
      </g>
    );
  }
  if (kind === 'hard-hat') {
    const col = '#f2b631';
    const dome = smooth([[CX - W - 3, H + 1], [CX - W - 1, T + 4], [CX - W * 0.45, T - 12], [CX + W * 0.45, T - 12], [CX + W + 1, T + 4], [CX + W + 3, H + 1]], false) + 'Z';
    return (
      <g>
        <defs>{grad(col)}</defs>
        <path d={dome} fill={`url(#${gid})`} />
        <path d={`M${P(CX - 4, T - 12)}Q${P(CX, T - 16)} ${P(CX + 4, T - 12)}L${P(CX + 5, H)}L${P(CX - 5, H)}Z`} fill={shade(col, 0.2)} opacity="0.9" />
        <path d={`M${P(CX - W - 9, H + 2)}Q${P(CX, H + 10)} ${P(CX + W + 9, H + 2)}Q${P(CX, H - 2)} ${P(CX - W - 9, H + 2)}Z`} fill={shade(col, -0.15)} />
        <ellipse cx={CX + 10} cy={T - 4} rx="10" ry="4" fill="#fff" opacity="0.35" filter={`url(#${c.id('soft')})`} />
      </g>
    );
  }
  if (kind === 'beanie') {
    const col = headwearColor(c);
    const dome = smooth([[CX - W - 2.5, H + 3], [CX - W - 1, T + 6], [CX - W * 0.5, T - 9], [CX + W * 0.5, T - 9], [CX + W + 1, T + 6], [CX + W + 2.5, H + 3]], false) + 'Z';
    const ribs: string[] = [];
    for (let i = -8; i <= 8; i++) ribs.push(`M${P(CX + i * 4.4, H - 6)}L${P(CX + i * 4.6, H + 5)}`);
    return (
      <g>
        <defs>{grad(col)}</defs>
        <path d={dome} fill={`url(#${gid})`} />
        <path d={`M${P(CX - W - 3.5, H - 6)}Q${P(CX, H - 10)} ${P(CX + W + 3.5, H - 6)}L${P(CX + W + 3, H + 5)}Q${P(CX, H + 2)} ${P(CX - W - 3, H + 5)}Z`} fill={shade(col, -0.12)} />
        <path d={ribs.join('')} stroke={shade(col, -0.4)} stroke-opacity="0.5" stroke-width="0.9" />
        {g.child > 0.3 && <circle cx={CX} cy={T - 10} r="7" fill={shade(col, 0.3)} />}
        <ellipse cx={CX + 10} cy={T + 2} rx="11" ry="4" fill="#fff" opacity="0.18" filter={`url(#${c.id('soft')})`} />
      </g>
    );
  }
  // cap
  const col = headwearColor(c);
  const crown = smooth([[CX - W - 2, H + 2], [CX - W, T + 6], [CX - W * 0.5, T - 7], [CX + W * 0.5, T - 7], [CX + W, T + 6], [CX + W + 2, H + 2]], false) + 'Z';
  return (
    <g>
      <defs>{grad(col)}</defs>
      <path d={crown} fill={`url(#${gid})`} />
      <path d={`M${P(CX, T - 7)}Q${P(CX - 2, H - 6)} ${P(CX - 1, H + 2)}M${P(CX - W * 0.55, T - 2)}Q${P(CX - W * 0.6, H - 6)} ${P(CX - W * 0.68, H + 2)}M${P(CX + W * 0.55, T - 2)}Q${P(CX + W * 0.6, H - 6)} ${P(CX + W * 0.68, H + 2)}`} stroke={shade(col, -0.4)} stroke-opacity="0.5" stroke-width="0.8" fill="none" />
      <circle cx={CX} cy={T - 7} r="2" fill={shade(col, -0.2)} />
      <ellipse cx={CX} cy={H + 6} rx={W * 0.9} ry="3" fill="#000" opacity="0.25" filter={`url(#${c.id('soft')})`} />
      <path d={`M${P(CX - W - 2, H + 2)}Q${P(CX, H + 15)} ${P(CX + W + 2, H + 2)}Q${P(CX, H + 6)} ${P(CX - W - 2, H + 2)}Z`} fill={shade(col, -0.2)} />
      <path d={`M${P(CX - W - 2, H + 2)}Q${P(CX, H + 15)} ${P(CX + W + 2, H + 2)}`} stroke={shade(col, 0.25)} stroke-width="0.7" fill="none" />
      <ellipse cx={CX + 10} cy={T + 2} rx="10" ry="4" fill="#fff" opacity="0.2" filter={`url(#${c.id('soft')})`} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Accessories

export function AccessoryEar({ c }: { c: PaintCtx }) {
  const kind = c.spec.accessory ?? 'none';
  const { g } = c;
  if (kind === 'earrings') {
    const hoop = c.t.seed % 2 === 0;
    return (
      <g>
        {([-1, 1] as Side[]).map((s) => {
          const x = CX + s * (g.headW - 3 + g.earW * 0.45);
          const y = g.earBot + 0.5;
          return hoop ? (
            <circle key={s} cx={x} cy={y + 3} r="3.2" fill="none" stroke={GOLD} stroke-width="1.1" />
          ) : (
            <g key={s}>
              <circle cx={x} cy={y} r="1.7" fill={GOLD} />
              <circle cx={x - 0.5} cy={y - 0.5} r="0.6" fill="#fff" opacity="0.8" />
            </g>
          );
        })}
      </g>
    );
  }
  if (kind === 'hearing-aid') {
    return (
      <g>
        {([-1, 1] as Side[]).map((s) => {
          const x = CX + s * (g.headW - 3 + g.earW * 0.95);
          const y = g.earTop + 2;
          return (
            <g key={s}>
              <path d={`M${P(x - s * 1, y - 2)}q${P(s * 3.5, 1)} ${P(s * 3, 9)}q${P(-s * 1, 3)} ${P(-s * 3, 2)}Z`} fill="#c9b9a6" stroke="#8a7a68" stroke-width="0.4" />
              <path d={`M${P(x - s * 0.5, y - 1.5)}q${P(-s * 3, -1.5)} ${P(-s * 5, 6)}`} fill="none" stroke="#e8e2d8" stroke-opacity="0.8" stroke-width="0.6" />
            </g>
          );
        })}
      </g>
    );
  }
  return null;
}

export function AccessoryBody({ c }: { c: PaintCtx }) {
  if ((c.spec.accessory ?? 'none') !== 'necklace') return null;
  const { g } = c;
  const y = g.shoulderY - 10;
  const d = `M${P(CX - g.neckW - 1, y)}Q${P(CX, y + 22)} ${P(CX + g.neckW + 1, y)}`;
  return (
    <g>
      <path d={d} fill="none" stroke={shade(GOLD, -0.3)} stroke-width="1.2" />
      <path d={d} fill="none" stroke={GOLD} stroke-width="0.8" stroke-dasharray="1.2 0.8" />
      <path d={`M${P(CX, y + 10.5)}l2.6 3.6l-2.6 3.6l-2.6 -3.6Z`} fill={GOLD} stroke={shade(GOLD, -0.35)} stroke-width="0.4" />
      <circle cx={CX - 0.7} cy={y + 13} r="0.6" fill="#fff" />
    </g>
  );
}

export function Bandage({ c }: { c: PaintCtx }) {
  if ((c.spec.accessory ?? 'none') !== 'bandage') return null;
  const { g } = c;
  const x = CX + 17;
  const y = g.hairline + 9;
  return (
    <g transform={`rotate(-24 ${x} ${y})`}>
      <rect x={x - 10} y={y - 3.2} width="20" height="6.4" rx="3.2" fill="#e9c9a3" stroke="#c9a37a" stroke-width="0.4" />
      <rect x={x - 3.5} y={y - 2.6} width="7" height="5.2" rx="0.8" fill="#f3e2cc" />
      {[-7, -5, 5, 7].map((dx) => <circle key={dx} cx={x + dx} cy={y} r="0.4" fill="#b88a5e" />)}
    </g>
  );
}
