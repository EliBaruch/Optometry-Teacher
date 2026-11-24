import { useId } from 'preact/hooks';
import { cx } from '@ui-kit';

/**
 * A blown-glass tip jar with a brass lid. Gold coins settle in layers up to
 * `fill` (0..1); a soft inner candle-glow brightens as it fills.
 */
export function Jar(props: { fill: number; size?: number; class?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const fill = Math.max(0, Math.min(1, props.fill));
  const size = props.size ?? 120;
  // interior spans y=46..118; coins stack from the bottom
  const top = 118 - fill * 70;
  const rows = Math.round(fill * 12);
  const coins: { x: number; y: number; r: number; tilt: number }[] = [];
  for (let row = 0; row < rows; row++) {
    const y = 114 - row * 5.8;
    const n = 4 + (row % 2);
    for (let i = 0; i < n; i++) {
      const x = 38 + ((i + (row % 2 ? 0.5 : 0)) * 44) / n + ((row * 7 + i * 13) % 5) - 2;
      coins.push({ x, y, r: 6.2, tilt: ((row * 31 + i * 17) % 40) - 20 });
    }
  }
  return (
    <svg class={cx('cf-jar', props.class)} viewBox="0 0 120 130" width={size} height={(size * 130) / 120} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#bfe8ff" stop-opacity="0.32" />
          <stop offset="0.18" stop-color="#bfe8ff" stop-opacity="0.08" />
          <stop offset="0.8" stop-color="#bfe8ff" stop-opacity="0.05" />
          <stop offset="1" stop-color="#bfe8ff" stop-opacity="0.26" />
        </linearGradient>
        <radialGradient id={`${id}-coin`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stop-color="#fff4da" />
          <stop offset="0.45" stop-color="#ffd27a" />
          <stop offset="1" stop-color="#a86d17" />
        </radialGradient>
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
      <ellipse cx="60" cy="124" rx="40" ry="4.5" fill="#000" opacity="0.4" />
      <ellipse class="cf-jar__warm" cx="60" cy="96" rx="52" ry="40" fill={`url(#${id}-warm)`} />
      <g clip-path={`url(#${id}-clip)`}>
        <rect x="18" y={top} width="84" height={124 - top} fill="#ffd27a" opacity={fill > 0 ? 0.06 : 0} />
        {coins.map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.tilt})`}>
            <ellipse rx={c.r} ry={c.r * 0.42} fill={`url(#${id}-coin)`} stroke="#8a5a12" stroke-width="0.6" />
            <ellipse rx={c.r * 0.55} ry={c.r * 0.22} fill="none" stroke="#fff4da" stroke-width="0.5" opacity="0.6" />
          </g>
        ))}
      </g>
      {/* glass */}
      <path
        d="M30 40 C22 50 20 62 20 80 C20 104 26 122 60 122 C94 122 100 104 100 80 C100 62 98 50 90 40 Z"
        fill={`url(#${id}-glass)`}
        stroke="rgba(200,235,255,.55)"
        stroke-width="1.3"
      />
      <path d="M28 56 C25 70 25 92 30 108" stroke="#f0fbff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.35" />
      <path d="M92 60 C94 70 94 80 93 88" stroke="#f0fbff" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.25" />
      {/* neck + brass lid */}
      <rect x="32" y="33" width="56" height="9" rx="3" fill="rgba(190,230,255,.14)" stroke="rgba(200,235,255,.5)" stroke-width="1" />
      <rect x="28" y="20" width="64" height="14" rx="4" fill={`url(#${id}-brass)`} />
      <rect x="28" y="20" width="64" height="3.5" rx="2" fill="#fff4da" opacity="0.45" />
      <path d="M34 27 h52" stroke="#7a4d10" stroke-width="0.8" opacity="0.6" />
      <circle cx="60" cy="16" r="5" fill={`url(#${id}-brass)`} />
      {/* little parchment tag */}
      <g transform="translate(86 46) rotate(12)">
        <path d="M0 0 L22 0 L26 7 L22 14 L0 14 Z" fill="#f6efe4" opacity="0.92" />
        <circle cx="21" cy="7" r="1.4" fill="#a99bbd" />
        <path d="M4 5 h12 M4 9 h9" stroke="#7d6f95" stroke-width="1" />
      </g>
      <path d="M86 47 C80 40 82 34 88 32" stroke="#d9962a" stroke-width="0.8" fill="none" />
    </svg>
  );
}
