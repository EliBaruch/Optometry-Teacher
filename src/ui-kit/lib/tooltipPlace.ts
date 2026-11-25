/**
 * Tooltip placement math (pure; no DOM).
 *
 * Given the trigger's viewport rect, the bubble's size and the viewport, pick
 * the side that fits (flipping top/bottom or left/right when the preferred
 * side has no room) and compute how far to slide the bubble along that side so
 * it stays inside a safe margin. The arrow is shifted the opposite way so it
 * keeps pointing at the trigger (clamped so it never leaves the bubble's
 * rounded corners).
 */

export type TipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TipRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TipInput {
  trigger: TipRect;
  bubble: { width: number; height: number };
  viewport: { width: number; height: number };
  placement: TipPlacement;
  /** Distance between trigger and bubble (matches CSS: 10px). */
  gap?: number;
  /** Safe margin to keep from the viewport edges. */
  margin?: number;
  /** Arrow must stay at least this far from the bubble's ends (radius + half arrow). */
  arrowInset?: number;
}

export interface TipPlacementResult {
  placement: TipPlacement;
  /** Slide of the bubble along the cross axis (px; x for top/bottom, y for left/right). */
  shift: number;
  /** Offset of the arrow from the bubble's centre along the same axis (px). */
  arrow: number;
}

const clamp = (v: number, lo: number, hi: number) => (hi < lo ? lo : Math.min(hi, Math.max(lo, v)));

/** Slide a centred span of `size` around `centre` so it fits in [margin, extent - margin]. */
export function clampSpan(centre: number, size: number, extent: number, margin: number): number {
  const start = centre - size / 2;
  // If it cannot fit at all, pin to the leading margin (text start stays readable).
  const fitted = size + margin * 2 > extent ? margin : clamp(start, margin, extent - margin - size);
  return fitted - start;
}

export function placeTooltip({
  trigger, bubble, viewport, placement, gap = 10, margin = 8, arrowInset = 14,
}: TipInput): TipPlacementResult {
  const room = {
    top: trigger.top - gap - margin,
    bottom: viewport.height - (trigger.top + trigger.height) - gap - margin,
    left: trigger.left - gap - margin,
    right: viewport.width - (trigger.left + trigger.width) - gap - margin,
  };
  const need = (p: TipPlacement) => (p === 'top' || p === 'bottom' ? bubble.height : bubble.width);
  const opposite: Record<TipPlacement, TipPlacement> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

  let side = placement;
  if (room[side] < need(side)) {
    const alt = opposite[side];
    if (room[alt] >= need(alt)) side = alt;
    else if (side === 'left' || side === 'right') {
      // Neither horizontal side fits (narrow phone): fall back to the roomier vertical side.
      side = room.top >= room.bottom ? 'top' : 'bottom';
    } else if (room[alt] > room[side]) side = alt;
  }

  const vertical = side === 'top' || side === 'bottom';
  const centre = vertical ? trigger.left + trigger.width / 2 : trigger.top + trigger.height / 2;
  const size = vertical ? bubble.width : bubble.height;
  const extent = vertical ? viewport.width : viewport.height;
  const shift = Math.round(clampSpan(centre, size, extent, margin));
  const maxArrow = Math.max(0, size / 2 - arrowInset);
  const arrow = Math.round(clamp(-shift, -maxArrow, maxArrow));
  return { placement: side, shift, arrow: arrow === 0 ? 0 : arrow };
}
