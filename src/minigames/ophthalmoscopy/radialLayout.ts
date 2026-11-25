/** Pure geometry for the tag wheel: two fan columns of fixed-size petals around the hub. */

export interface PetalSpec {
  /** petal width, px */
  w: number;
  /** petal height, px (at least 44 for touch) */
  h: number;
  /** vertical gap between petals in a column */
  gap: number;
  /** how far the widest petals bulge away from the hub, beyond the minimum offset */
  bulge: number;
  /** clear space kept between the hub and the nearest petal edge */
  hubGap: number;
}

export interface WheelLayout {
  /** petal centres relative to the hub, in item order (right column top to bottom, then left column bottom to top) */
  pos: { x: number; y: number }[];
  halfW: number;
  halfH: number;
}

export const HUB_R = 22;

export function petalSpec(stageW: number): PetalSpec {
  return stageW < 480 ? { w: 124, h: 46, gap: 6, bulge: 26, hubGap: 12 } : { w: 156, h: 46, gap: 8, bulge: 44, hubGap: 16 };
}

/**
 * Lay `n` petals around the hub. Petals in a column never overlap vertically; the two
 * columns never overlap because every petal's inner edge sits at least `hubGap` from the hub axis.
 * `maxHeight` squeezes the column pitch when the stage is short (never below h + 2).
 */
export function layoutPetals(n: number, spec: PetalSpec, maxHeight = Infinity): WheelLayout {
  const right = Math.ceil(n / 2);
  const left = n - right;
  const rows = Math.max(right, 1);
  let pitch = spec.h + spec.gap;
  if (rows > 1 && Number.isFinite(maxHeight)) pitch = Math.max(spec.h + 2, Math.min(pitch, (maxHeight - spec.h) / (rows - 1)));
  const minX = spec.w / 2 + spec.hubGap + HUB_R * 0.2;
  const maxX = minX + spec.bulge;
  const colY = (k: number, m: number) => (k - (m - 1) / 2) * pitch;
  const ySpan = Math.max(1, ((rows - 1) / 2) * pitch + spec.h);
  const xAt = (y: number) => minX + spec.bulge * Math.sqrt(Math.max(0, 1 - (y / ySpan) ** 2));
  const pos: { x: number; y: number }[] = [];
  for (let k = 0; k < right; k++) {
    const y = colY(k, right);
    pos.push({ x: xAt(y), y });
  }
  for (let k = 0; k < left; k++) {
    const y = colY(left - 1 - k, left);
    pos.push({ x: -xAt(y), y });
  }
  const halfW = maxX + spec.w / 2;
  const halfH = Math.max(HUB_R, ((rows - 1) / 2) * pitch + spec.h / 2);
  return { pos, halfW, halfH };
}

/** Keep the whole wheel inside the stage; the hub moves, the petals never clip. */
export function clampCentre(v: number, half: number, size: number, margin = 8): number {
  const lo = half + margin;
  return size >= lo * 2 ? Math.max(lo, Math.min(size - lo, v)) : size / 2;
}

export interface Rect { x: number; y: number; w: number; h: number }
export const petalRects = (l: WheelLayout, spec: PetalSpec): Rect[] => l.pos.map((p) => ({ x: p.x - spec.w / 2, y: p.y - spec.h / 2, w: spec.w, h: spec.h }));
export const overlaps = (a: Rect, b: Rect, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
