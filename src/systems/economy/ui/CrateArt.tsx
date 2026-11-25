import { useId } from 'preact/hooks';
import { CRATES, type CrateKind } from '../catalog';

/**
 * A brass-bound supply crate (procedural SVG). The lid is its own group
 * (.eco-crate__lid) so CSS can shake, crack and blow it open; light leaks
 * through the seams via the --leak custom property (0..1).
 */
export function CrateArt(props: { kind: CrateKind; size?: number | string; class?: string }) {
  const spec = CRATES[props.kind];
  const id = 'eco-crate-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = props.size ?? 160;
  const dim = typeof size === 'number' ? `${size}px` : size;
  const glyph =
    props.kind === 'promotion'
      ? 'M100 101 l5 10 11 1.5 -8 7.5 2 11 -10 -5.3 -10 5.3 2 -11 -8 -7.5 11 -1.5 z'
      : props.kind === 'momentum'
        ? 'M101 99 c6 7 9 12 9 18 a10 10 0 0 1 -20 0 c0 -4 2 -7 5 -10 c0 4 2 6 4 6 c-1 -5 0 -9 2 -14 z'
        : 'M100 98 C101.2 108 104 111 112 112.5 C104 114 101.2 117 100 127 C98.8 117 96 114 88 112.5 C96 111 98.8 108 100 98 Z';
  return (
    <svg
      viewBox="0 0 200 190" width={dim} height={dim} aria-hidden="true" focusable="false"
      class={`eco-crate eco-crate--${props.kind}${props.class ? ' ' + props.class : ''}`}
      style={{ '--trim': spec.trim }}
    >
      <defs>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={spec.wood} />
          <stop offset="1" stop-color="#140a10" />
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={spec.wood} stop-opacity=".75" />
          <stop offset="1" stop-color={spec.wood} />
        </linearGradient>
        <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff1c4" />
          <stop offset="0.3" stop-color={spec.trim} />
          <stop offset="0.7" stop-color="#7a4b12" />
          <stop offset="1" stop-color={spec.trim} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#fffbe8" />
          <stop offset="0.4" stop-color={spec.trim} stop-opacity=".9" />
          <stop offset="1" stop-color={spec.trim} stop-opacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-shaft`} x1="0" y1="84" x2="0" y2="-60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#fffbe8" stop-opacity=".95" />
          <stop offset="0.25" stop-color={spec.trim} stop-opacity=".55" />
          <stop offset="1" stop-color={spec.trim} stop-opacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-ao`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity=".7" />
          <stop offset="1" stop-color="#000" stop-opacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color={spec.trim} stop-opacity="0" />
          <stop offset="0.3" stop-color="#fff6d6" stop-opacity=".75" />
          <stop offset="0.7" stop-color={spec.trim} stop-opacity=".45" />
          <stop offset="1" stop-color={spec.trim} stop-opacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0" />
          <stop offset="0.5" stop-color="#fff" stop-opacity=".85" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <clipPath id={`${id}-metal`}>
          <rect x="52" y="58" width="12" height="110" />
          <rect x="136" y="58" width="12" height="110" />
          <rect x="82" y="94" width="36" height="38" rx="7" />
          <rect x="88" y="70" width="24" height="18" rx="4" />
          <path d="M30 152 h16 v16 h-11 a5 5 0 0 1 -5 -5 z M170 152 h-16 v16 h11 a5 5 0 0 0 5 -5 z" />
        </clipPath>
        <pattern id={`${id}-grain`} width="140" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 3 Q35 1 70 4 T140 3 M0 8 Q40 10 80 7 T140 9" stroke="#000" stroke-opacity=".18" fill="none" stroke-width=".8" />
        </pattern>
      </defs>

      <ellipse cx="100" cy="176" rx="78" ry="9" fill="#000" opacity=".45" />
      {/* inner glow that spills out when the lid lifts */}
      <ellipse class="eco-crate__inner" cx="100" cy="78" rx="70" ry="18" fill={`url(#${id}-glow)`} />

      {/* body */}
      <g class="eco-crate__body">
        <rect x="30" y="84" width="140" height="84" rx="5" fill={`url(#${id}-wood)`} />
        <rect x="30" y="84" width="140" height="84" rx="5" fill={`url(#${id}-grain)`} />
        <path d="M30 112 H170 M30 140 H170" stroke="#000" stroke-opacity=".35" stroke-width="1.2" />
        <path d="M30 113 H170 M30 141 H170" stroke="#fff" stroke-opacity=".06" stroke-width="1" />
        <rect x="52" y="84" width="12" height="84" fill={`url(#${id}-brass)`} opacity=".9" />
        <rect x="136" y="84" width="12" height="84" fill={`url(#${id}-brass)`} opacity=".9" />
        {[[30, 152], [154, 152]].map(([x, y]) => (
          <path key={x} d={`M${x} ${y} h16 v16 h-11 a5 5 0 0 1 -5 -5 z`} fill={`url(#${id}-brass)`} transform={x! > 100 ? `translate(${2 * x! + 16} 0) scale(-1 1)` : undefined} />
        ))}
        {/* lock plate + emblem */}
        <rect x="82" y="94" width="36" height="38" rx="7" fill={`url(#${id}-brass)`} />
        <rect x="85" y="97" width="30" height="32" rx="5" fill="#2a1606" opacity=".55" />
        <path d={glyph} fill={spec.trim} class="eco-crate__emblem" />
        {/* ambient occlusion under the lid overhang + a warm rim light along the edges */}
        <rect x="30" y="84" width="140" height="12" fill={`url(#${id}-ao)`} />
        <path d="M31 90 V160" stroke={`url(#${id}-rim)`} stroke-width="1.2" opacity=".5" />
        <rect x="30" y="84" width="140" height="84" rx="5" fill="none" stroke="#000" stroke-opacity=".5" />
      </g>

      {/* light shafts escaping under the lid as the crate strains */}
      <g class="eco-crate__shafts" fill={`url(#${id}-shaft)`}>
        <path d="M40 84 L-6 -50 L22 -50 L52 84 Z" />
        <path d="M70 84 L46 -60 L66 -60 L80 84 Z" />
        <path d="M94 84 L88 -70 L112 -70 L106 84 Z" />
        <path d="M120 84 L134 -60 L154 -60 L130 84 Z" />
        <path d="M148 84 L178 -50 L206 -50 L160 84 Z" />
      </g>
      {/* light leaking through the plank gaps and the keyhole */}
      <g class="eco-crate__cracks" stroke="#fff6d6" stroke-linecap="round">
        <path d="M66 112 H82 M118 112 H134 M66 140 H134" stroke-width="1.6" />
      </g>
      <circle class="eco-crate__keyhole" cx="100" cy="79" r="5" fill="#fff6d6" />
      {/* light leaking through the seam */}
      <rect class="eco-crate__seam" x="32" y="81" width="136" height="5" rx="2.5" fill="#fff6d6" />

      {/* lid */}
      <g class="eco-crate__lid">
        <path d="M38 40 H162 L174 58 H26 Z" fill={`url(#${id}-top)`} />
        <path d="M38 40 H162 L174 58 H26 Z" fill={`url(#${id}-grain)`} />
        <path d="M70 40 L64 58 M130 40 L136 58" stroke="#000" stroke-opacity=".3" />
        <rect x="24" y="58" width="152" height="26" rx="4" fill={`url(#${id}-wood)`} />
        <rect x="24" y="58" width="152" height="26" rx="4" fill={`url(#${id}-grain)`} />
        <rect x="24" y="58" width="152" height="5" rx="2" fill="#fff" opacity=".08" />
        <rect x="52" y="58" width="12" height="26" fill={`url(#${id}-brass)`} />
        <rect x="136" y="58" width="12" height="26" fill={`url(#${id}-brass)`} />
        <path d="M58 40 L56 58 H66 L64 40 Z M142 40 L144 58 H134 L136 40 Z" fill={`url(#${id}-brass)`} opacity=".85" />
        <rect x="88" y="70" width="24" height="18" rx="4" fill={`url(#${id}-brass)`} />
        <circle cx="100" cy="79" r="3" fill="#2a1606" />
        <rect x="24" y="58" width="152" height="26" rx="4" fill="none" stroke="#000" stroke-opacity=".5" />
        <path d="M40 40.6 H160" stroke={`url(#${id}-rim)`} stroke-width="1.4" />
        <path d="M25 58.6 H175" stroke={`url(#${id}-rim)`} stroke-width="1" opacity=".8" />
        <rect x="24" y="80" width="152" height="4" rx="2" fill="#000" opacity=".28" />
      </g>
      {/* a slow specular sweep across every piece of brass */}
      <g clip-path={`url(#${id}-metal)`} class="eco-crate__sheen-clip" aria-hidden="true">
        <rect class="eco-crate__sheen" x="-30" y="40" width="30" height="140" fill={`url(#${id}-sheen)`} transform="skewX(-18)" />
      </g>
      {/* glints */}
      <path class="eco-crate__glint" d="M150 64 l2 -6 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 z" fill="#fffbe8" />
    </svg>
  );
}
