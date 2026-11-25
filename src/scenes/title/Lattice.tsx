import { useMemo } from 'preact/hooks';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TINTS = ['120,90,220', '255,210,122', '60,140,160', '190,90,140'];

/** Irregular leaded-glass window: jittered grid, varied lead widths/opacities, a few tinted panes. */
export function Lattice({ cols, rows, seed, strong }: { cols: number; rows: number; seed: number; strong: boolean }) {
  const { lines, panes } = useMemo(() => {
    const r = rng(seed);
    const W = 1000, H = 1000;
    const pts: { x: number; y: number }[][] = [];
    for (let j = 0; j <= rows; j++) {
      const row: { x: number; y: number }[] = [];
      for (let i = 0; i <= cols; i++) {
        const sk = (j - rows / 2) * 0.05 * (W / cols);
        row.push({
          x: (i / cols) * W + (r() - 0.5) * (W / cols) * 0.35 + sk,
          y: (j / rows) * H + (r() - 0.5) * (H / rows) * 0.35,
        });
      }
      pts.push(row);
    }
    const lines: { d: string; w: number; o: number }[] = [];
    for (let j = 0; j <= rows; j++) lines.push({ d: 'M' + pts[j]!.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L'), w: 0.5 + r() * (strong ? 3.2 : 1.6), o: 0.05 + r() * 0.28 });
    for (let i = 0; i <= cols; i++) lines.push({ d: 'M' + pts.map((row) => `${row[i]!.x.toFixed(1)} ${row[i]!.y.toFixed(1)}`).join('L'), w: 0.5 + r() * (strong ? 3.2 : 1.6), o: 0.05 + r() * 0.28 });
    const panes: { d: string; c: string; o: number }[] = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (r() > 0.2) continue;
      const a = pts[j]![i]!, b = pts[j]![i + 1]!, c = pts[j + 1]![i + 1]!, d = pts[j + 1]![i]!;
      panes.push({ d: `M${a.x} ${a.y}L${b.x} ${b.y}L${c.x} ${c.y}L${d.x} ${d.y}Z`, c: TINTS[Math.floor(r() * TINTS.length)]!, o: 0.05 + r() * 0.1 });
    }
    return { lines, panes };
  }, [cols, rows, seed, strong]);
  return (
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      {panes.map((p, i) => <path key={i} d={p.d} fill={`rgba(${p.c},${p.o})`} />)}
      <g fill="none" stroke="rgb(214,200,255)" stroke-linejoin="round">
        {lines.map((l, i) => <path key={i} d={l.d} stroke-width={l.w} stroke-opacity={l.o} />)}
      </g>
    </svg>
  );
}
