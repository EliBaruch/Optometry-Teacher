import { useId } from 'preact/hooks';
import { CRATES, type CrateKind } from '../catalog';

/**
 * A glossy supply crate (procedural SVG): a pearl-white box with a vivid ribbon. The lid is its
 * own group (.eco-crate__lid) so CSS can shake, crack and blow it open; light leaks through the
 * seam via the --leak custom property (0..1).
 */
export function CrateArt(props: { kind: CrateKind; size?: number | string; class?: string }) {
  const spec = CRATES[props.kind];
  const id = 'eco-crate-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = props.size ?? 160;
  const dim = typeof size === 'number' ? `${size}px` : size;
  const glyph =
    props.kind === 'promotion'
      ? 'M100 115 l4 8.4 9.2 1.2 -6.7 6.3 1.7 9.1 -8.2 -4.4 -8.2 4.4 1.7 -9.1 -6.7 -6.3 9.2 -1.2 z'
      : props.kind === 'momentum'
        ? 'M101 113 c5 6 7.5 10 7.5 15 a8.5 8.5 0 0 1 -17 0 c0 -3.4 1.7 -6 4.3 -8.5 c0 3.4 1.7 5 3.4 5 c-0.9 -4.3 0 -7.6 1.8 -11.5 z'
        : 'M100 112 C101 120 103.4 122.6 110 123.8 C103.4 125 101 127.6 100 136 C99 127.6 96.6 125 90 123.8 C96.6 122.6 99 120 100 112 Z';
  return (
    <svg
      viewBox="0 0 200 190" width={dim} height={dim} aria-hidden="true" focusable="false"
      class={`eco-crate eco-crate--${props.kind}${props.class ? ' ' + props.class : ''}`}
      style={{ '--trim': spec.trim }}
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.6" stop-color={spec.wood} />
          <stop offset="1" stop-color={spec.wood} />
        </linearGradient>
        <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="1" stop-color={spec.wood} />
        </linearGradient>
        <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color={spec.trim} />
          <stop offset="0.45" stop-color={spec.trim} stop-opacity=".82" />
          <stop offset="1" stop-color={spec.trim} />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity=".7" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.4" stop-color={spec.trim} stop-opacity=".8" />
          <stop offset="1" stop-color={spec.trim} stop-opacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-shaft`} x1="0" y1="84" x2="0" y2="-60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".95" />
          <stop offset="0.25" stop-color={spec.trim} stop-opacity=".4" />
          <stop offset="1" stop-color={spec.trim} stop-opacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0" />
          <stop offset="0.5" stop-color="#fff" stop-opacity=".95" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <clipPath id={`${id}-metal`}>
          <rect x="86" y="58" width="28" height="110" />
          <path d="M100 52 C84 30 70 38 78 50 C84 58 96 54 100 52 Z M100 52 C116 30 130 38 122 50 C116 58 104 54 100 52 Z" />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="176" rx="74" ry="8" fill="#0a1633" opacity=".16" />
      {/* inner glow that spills out when the lid lifts */}
      <ellipse class="eco-crate__inner" cx="100" cy="78" rx="70" ry="18" fill={`url(#${id}-glow)`} />

      {/* body */}
      <g class="eco-crate__body">
        <rect x="30" y="82" width="140" height="86" rx="12" fill={`url(#${id}-body)`} />
        <rect x="30" y="82" width="140" height="86" rx="12" fill="none" stroke="#0a1633" stroke-opacity=".1" />
        <rect x="86" y="82" width="28" height="86" fill={`url(#${id}-ribbon)`} />
        <rect x="86" y="82" width="28" height="86" fill={`url(#${id}-gloss)`} opacity=".35" />
        <circle cx="100" cy="126" r="16" fill="#ffffff" stroke={spec.trim} stroke-opacity=".35" stroke-width="1.5" />
        <path d={glyph} fill={spec.trim} class="eco-crate__emblem" />
        <rect x="34" y="86" width="132" height="22" rx="8" fill={`url(#${id}-gloss)`} opacity=".45" />
      </g>

      {/* light shafts escaping under the lid as the crate strains */}
      <g class="eco-crate__shafts" fill={`url(#${id}-shaft)`}>
        <path d="M40 84 L-6 -50 L22 -50 L52 84 Z" />
        <path d="M70 84 L46 -60 L66 -60 L80 84 Z" />
        <path d="M94 84 L88 -70 L112 -70 L106 84 Z" />
        <path d="M120 84 L134 -60 L154 -60 L130 84 Z" />
        <path d="M148 84 L178 -50 L206 -50 L160 84 Z" />
      </g>
      <g class="eco-crate__cracks" />
      <circle class="eco-crate__keyhole" cx="100" cy="79" r="0.1" fill="none" />
      {/* light leaking through the seam */}
      <rect class="eco-crate__seam" x="32" y="80" width="136" height="5" rx="2.5" fill="#ffffff" />

      {/* lid */}
      <g class="eco-crate__lid">
        <rect x="24" y="56" width="152" height="30" rx="11" fill={`url(#${id}-lid)`} />
        <rect x="24" y="56" width="152" height="30" rx="11" fill="none" stroke="#0a1633" stroke-opacity=".1" />
        <rect x="86" y="56" width="28" height="30" fill={`url(#${id}-ribbon)`} />
        <rect x="28" y="59" width="144" height="10" rx="5" fill={`url(#${id}-gloss)`} opacity=".8" />
        {/* the bow */}
        <path d="M100 54 C84 28 66 36 76 50 C83 59 96 56 100 54 Z" fill={spec.trim} />
        <path d="M100 54 C116 28 134 36 124 50 C117 59 104 56 100 54 Z" fill={spec.trim} />
        <path d="M100 54 C88 40 80 42 83 49" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round" />
        <circle cx="100" cy="54" r="6.5" fill={spec.trim} />
        <circle cx="98" cy="52" r="2.2" fill="#fff" opacity=".6" />
      </g>
      {/* a slow specular sweep across the ribbon and bow */}
      <g clip-path={`url(#${id}-metal)`} class="eco-crate__sheen-clip" aria-hidden="true">
        <rect class="eco-crate__sheen" x="-30" y="30" width="30" height="150" fill={`url(#${id}-sheen)`} transform="skewX(-18)" />
      </g>
      {/* glints */}
      <path class="eco-crate__glint" d="M150 64 l2 -6 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 z" fill="#ffffff" stroke={spec.trim} stroke-width=".6" />
    </svg>
  );
}
