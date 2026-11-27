/**
 * Tapered rim light: the sliver of a shape left uncovered when the shape is
 * nudged away from the key light, filled with a radial gold falloff. The rim
 * is widest where the contour faces the light and fades to nothing along it,
 * instead of a constant-width stroke that reads as a hard stripe.
 */
import { GOLD } from '../palette';
import type { PaintCtx } from './ctx';

export interface RimOpts {
  /** shape the rim hugs */
  d: string;
  /** offset away from the light (default: left and slightly down) */
  dx?: number;
  dy?: number;
  /** hot spot of the light along the contour, and its reach */
  cx: number;
  cy: number;
  r: number;
  opacity?: number;
  color?: string;
}

export function RimLight({ c, name, o }: { c: PaintCtx; name: string; o: RimOpts }) {
  const clip = c.id(`rimC-${name}`);
  const grad = c.id(`rimG-${name}`);
  // Soft 1px inner highlight: no wide offset (reads as mis-registered print).
  const dx = Math.sign(o.dx ?? 1) * 1;
  const dy = 0;
  const op = Math.min(o.opacity ?? 0.85, 0.35);
  const col = o.color ?? GOLD;
  // Everything outside the shifted shape, clipped to the shape = the crescent.
  // (A clip + even-odd fill rasterises far cheaper than a luminance mask.)
  const outside = `M${o.cx - o.r - 8},${o.cy - o.r - 8}H${o.cx + o.r + 8}V${o.cy + o.r + 8}H${o.cx - o.r - 8}Z${o.d}`;
  return (
    <g>
      <clipPath id={clip}>
        <path d={o.d} />
      </clipPath>
      <radialGradient id={grad} gradientUnits="userSpaceOnUse" cx={o.cx} cy={o.cy} r={o.r}>
        <stop offset="0" stop-color={col} stop-opacity={op} />
        <stop offset="0.5" stop-color={col} stop-opacity={op * 0.45} />
        <stop offset="1" stop-color={col} stop-opacity="0" />
      </radialGradient>
      <g clip-path={`url(#${clip})`}>
        <path d={outside} fill-rule="evenodd" fill={`url(#${grad})`} transform={`translate(${-dx} ${dy})`} />
      </g>
    </g>
  );
}
