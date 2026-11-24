import { mix, shade } from '../../fx/color';
import { CX, VIEW_H, VIEW_W } from '../geometry';
import { GOLD } from '../palette';
import { P, smooth, type Pt } from '../paths';
import type { PaintCtx } from './ctx';

export function bodyDefs(c: PaintCtx) {
  const o = c.spec.outfit;
  return (
    <>
      <linearGradient id={c.id('cloth')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color={shade(o, 0.12)} />
        <stop offset="0.55" stop-color={o} />
        <stop offset="1" stop-color={shade(o, -0.45)} />
      </linearGradient>
      <linearGradient id={c.id('clothSide')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0.35" />
        <stop offset="0.35" stop-color="#000" stop-opacity="0" />
        <stop offset="0.8" stop-color="#000" stop-opacity="0" />
        <stop offset="1" stop-color={GOLD} stop-opacity="0.12" />
      </linearGradient>
      <linearGradient id={c.id('neck')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color={c.skin.deep} />
        <stop offset="0.45" stop-color={c.skin.shadow} />
        <stop offset="1" stop-color={c.skin.base} />
      </linearGradient>
      <linearGradient id={c.id('rimBody')} gradientUnits="userSpaceOnUse" x1={CX + 40} y1="0" x2={VIEW_W} y2="0">
        <stop offset="0" stop-color={GOLD} stop-opacity="0" />
        <stop offset="1" stop-color={GOLD} stop-opacity="0.9" />
      </linearGradient>
    </>
  );
}

function shoulders(c: PaintCtx): string {
  const { g } = c;
  const sy = g.shoulderY;
  const sw = g.shoulderW;
  const nw = g.neckW + 3;
  const left: Pt[] = [
    [CX - nw, sy - 12],
    [CX - nw - 10, sy - 6],
    [CX - sw * 0.62, sy - 2],
    [CX - sw * 0.92, sy + 10],
    [CX - sw * 1.08, sy + 34],
  ];
  const pts: Pt[] = [...left];
  const right = left.map(([x, y]) => [2 * CX - x, y] as Pt).reverse();
  const top = smooth([...pts, [CX - sw * 1.2, VIEW_H + 10], [CX + sw * 1.2, VIEW_H + 10], ...right], false, 0.9);
  return top + `L${P(CX + nw, sy - 12)}Z`;
}

function neckline(c: PaintCtx): { cut: string; trim?: string; collar?: string } {
  const { g } = c;
  const sy = g.shoulderY;
  const nw = g.neckW + 3;
  switch (c.t.collar) {
    case 1: // V-neck
      return {
        cut: `M${P(CX - nw - 1, sy - 12)}L${P(CX, sy + 16)}L${P(CX + nw + 1, sy - 12)}Z`,
        trim: `M${P(CX - nw - 1, sy - 12)}L${P(CX, sy + 16)}L${P(CX + nw + 1, sy - 12)}`,
      };
    case 2: // shirt collar
      return {
        cut: `M${P(CX - nw, sy - 12)}L${P(CX, sy + 8)}L${P(CX + nw, sy - 12)}Z`,
        collar:
          `M${P(CX - nw - 2, sy - 14)}L${P(CX - 1, sy + 8)}L${P(CX - nw * 0.9, sy + 14)}L${P(CX - nw - 9, sy - 4)}Z` +
          `M${P(CX + nw + 2, sy - 14)}L${P(CX + 1, sy + 8)}L${P(CX + nw * 0.9, sy + 14)}L${P(CX + nw + 9, sy - 4)}Z`,
      };
    case 3: // high crew / turtleneck
      return {
        cut: `M${P(CX - nw + 1, sy - 13)}Q${P(CX, sy - 8)} ${P(CX + nw - 1, sy - 13)}Z`,
        trim: `M${P(CX - nw + 1, sy - 13)}Q${P(CX, sy - 8)} ${P(CX + nw - 1, sy - 13)}`,
      };
    default: // crew
      return {
        cut: `M${P(CX - nw, sy - 12)}Q${P(CX, sy + 10)} ${P(CX + nw, sy - 12)}Z`,
        trim: `M${P(CX - nw, sy - 12)}Q${P(CX, sy + 10)} ${P(CX + nw, sy - 12)}`,
      };
  }
}

export function Body({ c }: { c: PaintCtx }) {
  const { g, skin } = c;
  const nw = g.neckW;
  const top = g.chinY - 28;
  const sy = g.shoulderY;
  const neck = `M${P(CX - nw, top)}C${P(CX - nw, top + 20)} ${P(CX - nw - 1, sy - 22)} ${P(CX - nw - 5, sy - 6)}L${P(CX + nw + 5, sy - 6)}C${P(CX + nw + 1, sy - 22)} ${P(CX + nw, top + 20)} ${P(CX + nw, top)}Z`;
  const nl = neckline(c);
  const body = shoulders(c);
  const o = c.spec.outfit;
  const old = Math.max(0, (c.age - 58) / 30);
  return (
    <g>
      <path d={neck} fill={`url(#${c.id('neck')})`} />
      {/* sternocleidomastoid hint + neck rim */}
      <path d={`M${P(CX - nw + 3, top + 14)}Q${P(CX - 6, sy - 18)} ${P(CX - 3, sy - 8)}`} stroke={skin.deep} stroke-opacity="0.18" stroke-width="1.4" fill="none" stroke-linecap="round" />
      <path d={`M${P(CX + nw - 1, top + 6)}L${P(CX + nw + 3, sy - 8)}`} stroke={GOLD} stroke-opacity="0.45" stroke-width="1.4" fill="none" stroke-linecap="round" />
      {old > 0 && (
        <g stroke={skin.deep} stroke-opacity={0.22 * Math.min(1, old * 1.5)} stroke-width="0.9" fill="none" stroke-linecap="round">
          <path d={`M${P(CX - nw + 4, top + 22)}Q${P(CX, top + 26)} ${P(CX + nw - 4, top + 22)}`} />
          <path d={`M${P(CX - nw + 6, top + 30)}Q${P(CX, top + 33)} ${P(CX + nw - 6, top + 30)}`} />
        </g>
      )}
      <mask id={c.id('nlMask')}>
        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#fff" />
        <path d={nl.cut} fill="#000" />
      </mask>
      <g mask={`url(#${c.id('nlMask')})`}>
        <path d={body} fill={`url(#${c.id('cloth')})`} />
        <path d={body} fill={`url(#${c.id('clothSide')})`} />
        <path d={body} fill="none" stroke={`url(#${c.id('rimBody')})`} stroke-width="2.4" />
        {/* soft fabric folds */}
        <path d={`M${P(CX - g.shoulderW * 0.55, sy + 6)}Q${P(CX - g.shoulderW * 0.45, sy + 22)} ${P(CX - g.shoulderW * 0.5, VIEW_H)}`} stroke={shade(o, -0.4)} stroke-opacity="0.35" stroke-width="2" fill="none" />
        <path d={`M${P(CX + g.shoulderW * 0.5, sy + 8)}Q${P(CX + g.shoulderW * 0.42, sy + 22)} ${P(CX + g.shoulderW * 0.46, VIEW_H)}`} stroke={shade(o, 0.25)} stroke-opacity="0.22" stroke-width="1.5" fill="none" />
      </g>
      {nl.trim && <path d={nl.trim} fill="none" stroke={shade(o, -0.35)} stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />}
      {nl.trim && <path d={nl.trim} fill="none" stroke={shade(o, 0.2)} stroke-opacity="0.6" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />}
      {nl.collar && (
        <>
          <path d={nl.collar} fill={mix(o, '#f6efe4', 0.55)} stroke={shade(o, -0.3)} stroke-width="0.8" stroke-linejoin="round" />
          <path d={`M${P(CX, sy + 8)}L${P(CX, VIEW_H)}`} stroke={shade(o, -0.35)} stroke-width="0.9" />
          <circle cx={CX + 1.5} cy={sy + 18} r="1.1" fill={shade(o, 0.4)} />
          <circle cx={CX + 1.5} cy={sy + 30} r="1.1" fill={shade(o, 0.4)} />
        </>
      )}
    </g>
  );
}
