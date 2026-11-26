import { useId, useMemo } from 'preact/hooks';
import { createRng } from '@core';
import { cx } from '@ui-kit';

interface Coin {
  x: number;
  y: number;
  /** 0..1 — how full the jar must be before this coin appears */
  level: number;
  rx: number;
  ry: number;
  tilt: number;
  edge: boolean;
  tone: 0 | 1;
}

/** Interior half-width of the jar at height y (the clip path trims the rest). */
const halfWidth = (y: number) => 38 - Math.max(0, y - 100) * 0.6 - Math.max(0, 56 - y) * 0.5;

/** How much higher the pile sits in the middle than at the glass (a gentle heap). */
const heap = (x: number, fill: number) => 0.075 * Math.min(1, fill * 3) * ((x - 60) / 38) ** 2;

/**
 * A fixed, seeded pool of coins. Each has a fill level at which it appears, so
 * the pile grows naturally: tilted coins at every angle, a few standing on edge,
 * two shades of gold, and a dome that rises in the middle as the jar fills.
 */
const POOL: readonly Coin[] = (() => {
  const rng = createRng('lounge-jar');
  const n = 150;
  const out: Coin[] = [];
  for (let i = 0; i < n; i++) {
    const level = Math.min(1, (i + rng.next() * 3) / n);
    const y = 117 - level * 70 + (rng.next() - 0.5) * 3;
    const hw = halfWidth(y);
    const x = 60 + (rng.next() * 2 - 1) * hw;
    const edge = rng.next() < 0.11;
    const rx = 5.4 + rng.next() * 2.8;
    out.push({
      x,
      y,
      level,
      rx,
      ry: rx * (0.28 + rng.next() * 0.34),
      tilt: (rng.next() * 2 - 1) * (edge ? 22 : 34),
      edge,
      tone: rng.next() < 0.35 ? 1 : 0,
    });
  }
  // paint from the bottom up so higher coins rest on lower ones
  return out.sort((a, b) => b.y - a.y);
})();

/**
 * A blown-glass tip jar with a brass lid. Gold coins pile up to `fill` (0..1)
 * with a soft heap on top; an inner glow brightens as it fills.
 */
export function Jar(props: { fill: number; size?: number; class?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const fill = Math.max(0, Math.min(1, props.fill));
  const size = props.size ?? 120;
  const { coins, mass } = useMemo(() => {
    const shown = fill <= 0 ? [] : POOL.filter((c) => c.level + heap(c.x, fill) <= fill);
    // dark-amber body of the pile behind the visible coins, following the heap
    let mass = '';
    if (fill > 0.02) {
      const pts: string[] = [];
      for (let x = 16; x <= 104; x += 4) pts.push(`${x} ${(117 - (fill - heap(x, fill)) * 70 + 4).toFixed(1)}`);
      mass = `M16 124 L${pts.join(' L')} L104 124 Z`;
    }
    return { coins: shown, mass };
  }, [fill]);
  return (
    <svg class={cx('cf-jar', props.class)} viewBox="0 0 120 130" width={size} height={(size * 130) / 120} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#9ec5ff" stop-opacity="0.38" />
          <stop offset="0.18" stop-color="#bfe8ff" stop-opacity="0.18" />
          <stop offset="0.8" stop-color="#bfe8ff" stop-opacity="0.14" />
          <stop offset="1" stop-color="#9ec5ff" stop-opacity="0.38" />
        </linearGradient>
        <radialGradient id={`${id}-coin`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stop-color="#fff4da" />
          <stop offset="0.45" stop-color="#ffd27a" />
          <stop offset="1" stop-color="#a86d17" />
        </radialGradient>
        <radialGradient id={`${id}-coinb`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stop-color="#ffe9b0" />
          <stop offset="0.5" stop-color="#e0a84a" />
          <stop offset="1" stop-color="#8a5a12" />
        </radialGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#8a5a12" />
          <stop offset="0.5" stop-color="#ffe7b3" />
          <stop offset="1" stop-color="#8a5a12" />
        </linearGradient>
        <radialGradient id={`${id}-warm`} cx="0.5" cy="0.8" r="0.7">
          <stop offset="0" stop-color="#ffd27a" stop-opacity={0.15 + fill * 0.45} />
          <stop offset="1" stop-color="#ffd27a" stop-opacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffe7b3" />
          <stop offset="0.5" stop-color="#d9962a" />
          <stop offset="1" stop-color="#7a4d10" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M30 40 C22 50 20 62 20 80 C20 104 26 122 60 122 C94 122 100 104 100 80 C100 62 98 50 90 40 Z" />
        </clipPath>
      </defs>
      <ellipse cx="60" cy="124" rx="40" ry="4.5" fill="#0a1633" opacity="0.14" />
      <ellipse class="cf-jar__warm" cx="60" cy="96" rx="52" ry="40" fill={`url(#${id}-warm)`} />
      <g clip-path={`url(#${id}-clip)`}>
        {mass && <path d={mass} fill="#6b4410" opacity="0.85" />}
        {coins.map((c, i) =>
          c.edge ? (
            <g key={i} transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.tilt.toFixed(0)})`}>
              <rect x="-1.6" y={-c.rx} width="3.2" height={c.rx * 2} rx="1.4" fill={`url(#${id}-edge)`} stroke="#7a4d10" stroke-width="0.4" />
            </g>
          ) : (
            <g key={i} transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.tilt.toFixed(0)})`}>
              <ellipse cy={c.ry * 0.45} rx={c.rx} ry={c.ry} fill="#7a4d10" />
              <ellipse rx={c.rx} ry={c.ry} fill={`url(#${id}-coin${c.tone ? 'b' : ''})`} stroke="#a86d17" stroke-width="0.45" />
              <ellipse rx={c.rx * 0.62} ry={c.ry * 0.58} fill="none" stroke="#fff4da" stroke-width="0.5" opacity="0.5" />
            </g>
          ),
        )}
        {fill > 0.05 && (
          <path
            d={`M24 ${(117 - fill * 70 + 2).toFixed(1)} Q60 ${(117 - fill * 70 - 4).toFixed(1)} 96 ${(117 - fill * 70 + 2).toFixed(1)}`}
            stroke="#fff4da"
            stroke-opacity="0.35"
            stroke-width="1.2"
            fill="none"
            class="cf-jar__glint"
          />
        )}
      </g>
      {/* glass */}
      <path
        d="M30 40 C22 50 20 62 20 80 C20 104 26 122 60 122 C94 122 100 104 100 80 C100 62 98 50 90 40 Z"
        fill={`url(#${id}-glass)`}
        stroke="rgba(34,87,240,.35)"
        stroke-width="1.5"
      />
      <path d="M28 56 C25 70 25 92 30 108" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.9" />
      <path d="M92 60 C94 70 94 80 93 88" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.8" />
      {/* neck + brass lid */}
      <rect x="32" y="33" width="56" height="9" rx="3" fill="rgba(158,197,255,.3)" stroke="rgba(34,87,240,.3)" stroke-width="1" />
      <rect x="28" y="20" width="64" height="14" rx="4" fill={`url(#${id}-brass)`} />
      <rect x="28" y="20" width="64" height="3.5" rx="2" fill="#fff4da" opacity="0.45" />
      <path d="M34 27 h52" stroke="#7a4d10" stroke-width="0.8" opacity="0.6" />
      <circle cx="60" cy="16" r="5" fill={`url(#${id}-brass)`} />
      {/* little parchment tag */}
      <g transform="translate(86 46) rotate(12)">
        <path d="M0 0 L22 0 L26 7 L22 14 L0 14 Z" fill="#ffffff" />
        <circle cx="21" cy="7" r="1.4" fill="#8a95ab" />
        <path d="M4 5 h12 M4 9 h9" stroke="#56637d" stroke-width="1" />
      </g>
      <path d="M86 47 C80 40 82 34 88 32" stroke="#d9962a" stroke-width="0.8" fill="none" />
    </svg>
  );
}
