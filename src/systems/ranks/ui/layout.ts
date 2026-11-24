import { hash01 } from './hooks';

export interface StarPoint {
  id: string;
  x: number;
  y: number;
}

/**
 * Deterministic constellation layout: stars scattered (with a minimum spacing)
 * inside a w×h box, then joined by a nearest-neighbour path so each category
 * reads as a single figure. Same ids → same sky, every time.
 */
export function layoutConstellation(ids: string[], w: number, h: number, pad = 18): { points: StarPoint[]; edges: [number, number][] } {
  const n = ids.length;
  const points: StarPoint[] = [];
  const minD = Math.max(22, Math.min(46, Math.sqrt(((w - 2 * pad) * (h - 2 * pad)) / Math.max(1, n)) * 0.72));
  ids.forEach((id, i) => {
    let best: StarPoint | null = null;
    let bestD = -1;
    for (let k = 0; k < 40; k++) {
      const x = pad + hash01(id, k * 2 + 1) * (w - 2 * pad);
      const y = pad + hash01(id, k * 2 + 2) * (h - 2 * pad);
      const d = points.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), Infinity);
      if (d >= minD) {
        best = { id, x, y };
        break;
      }
      if (d > bestD) {
        bestD = d;
        best = { id, x, y };
      }
    }
    points.push(best ?? { id, x: pad + ((i + 0.5) / n) * (w - 2 * pad), y: h / 2 });
  });

  const edges: [number, number][] = [];
  if (n > 1) {
    const left = points.reduce((b, p, i) => (p.x < points[b]!.x ? i : b), 0);
    const visited = new Set([left]);
    let cur = left;
    while (visited.size < n) {
      let nxt = -1;
      let d = Infinity;
      points.forEach((p, i) => {
        if (visited.has(i)) return;
        const dd = Math.hypot(p.x - points[cur]!.x, p.y - points[cur]!.y);
        if (dd < d) {
          d = dd;
          nxt = i;
        }
      });
      edges.push([cur, nxt]);
      visited.add(nxt);
      cur = nxt;
    }
  }
  return { points, edges };
}
