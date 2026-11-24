import { useId } from 'preact/hooks';
import { RANKS, TIERS_PER_RANK, roman } from '../model/ladder';

export interface CrestProps {
  rankIndex: number;
  /** 1-based tier; pips (or a numeral for high Living Legend tiers). */
  tier?: number;
  size?: number;
  /** Rotating rays + shimmer (decorative; CSS honours reduced motion). */
  animate?: boolean;
  /** Dark silhouette for ranks not yet reached. */
  locked?: boolean;
  class?: string;
  label?: string;
}

const SHIELD = 'M60 10 L101 24 C102 46 102 60 100 72 C96 100 80 118 60 130 C40 118 24 100 20 72 C18 60 18 46 19 24 Z';
const SHIELD_INNER = 'M60 18 L94 29.5 C95 48 95 60 93.3 70.4 C89.8 94.8 76 110.4 60 120.8 C44 110.4 30.2 94.8 26.7 70.4 C25 60 25 48 26 29.5 Z';

function laurel(side: 1 | -1, leaves: number, fill: string) {
  const out = [];
  // Leaves sweep up the side of the shield along an arc (y points down: 90° = bottom, 180° = left).
  for (let i = 0; i < leaves; i++) {
    const t = i / Math.max(1, leaves - 1);
    const deg = 112 + t * 118;
    const a = (deg * Math.PI) / 180;
    const lx = 60 + Math.cos(a) * 50;
    const x = side === -1 ? lx : 120 - lx;
    const y = 76 + Math.sin(a) * 50;
    const rot = side === -1 ? deg + 25 : 180 - deg - 25;
    out.push(<ellipse key={i} cx={x} cy={y} rx={3} ry={7.2} transform={`rotate(${rot} ${x} ${y})`} fill={fill} opacity={0.75 + 0.25 * (1 - t)} />);
  }
  return out;
}

/** The rank crest: a jewelled shield with an iris at its heart; ornaments grow with rank. */
export function Crest({ rankIndex, tier = 1, size = 64, animate = false, locked = false, class: klass, label }: CrestProps) {
  const id = 'cr' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const r = Math.max(0, Math.min(RANKS.length - 1, rankIndex));
  const rank = RANKS[r]!;
  const legend = rank.id === 'legend';
  const c1 = locked ? '#3a2b5e' : rank.color;
  const c2 = locked ? '#54447a' : rank.color2;
  const metal = locked ? '#5a4a80' : legend ? `url(#${id}-irid)` : `url(#${id}-metal)`;
  const pips = Math.min(TIERS_PER_RANK, tier);
  const showNumeral = legend && tier > 1;

  return (
    <svg
      class={`rk-crest${animate && !locked ? ' is-anim' : ''}${locked ? ' is-locked' : ''}${klass ? ' ' + klass : ''}`}
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ '--crest-c': c1 }}
    >
      <defs>
        <linearGradient id={`${id}-face`} x1="0.2" y1="0" x2="0.75" y2="1">
          <stop offset="0" stop-color={c2} stop-opacity={locked ? 0.4 : 0.95} />
          <stop offset="0.38" stop-color={c1} />
          <stop offset="1" stop-color="#140c26" />
        </linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff4da" />
          <stop offset="0.35" stop-color="#ffd27a" />
          <stop offset="0.7" stop-color="#c98a26" />
          <stop offset="1" stop-color="#fff0c9" />
        </linearGradient>
        <linearGradient id={`${id}-irid`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffd27a" />
          <stop offset="0.3" stop-color="#ffb3d9" />
          <stop offset="0.55" stop-color="#b9a2ff" />
          <stop offset="0.8" stop-color="#8be9ff" />
          <stop offset="1" stop-color="#fff0a8" />
        </linearGradient>
        <radialGradient id={`${id}-iris`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stop-color={locked ? '#4a3a6b' : '#fffaf0'} />
          <stop offset="0.3" stop-color={c2} />
          <stop offset="0.75" stop-color={c1} />
          <stop offset="1" stop-color="#0b0716" />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color={c1} stop-opacity="0.55" />
          <stop offset="0.55" stop-color={c1} stop-opacity="0.14" />
          <stop offset="1" stop-color={c1} stop-opacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <path d={SHIELD} />
        </clipPath>
      </defs>

      {!locked && <circle cx="60" cy="70" r="62" fill={`url(#${id}-halo)`} class="rk-crest__halo" />}

      {r >= 3 && (
        <g class="rk-crest__rays" opacity={locked ? 0.25 : 0.7}>
          {Array.from({ length: 8 + r * 2 }, (_, i) => {
            const n = 8 + r * 2;
            const a = (i / n) * 360;
            const tip = i % 2 ? 58 : 66;
            return <path key={i} d={`M57.6 30 L60 ${70 - tip} L62.4 30 Z`} fill={metal} transform={`rotate(${a} 60 70)`} opacity={i % 2 ? 0.5 : 0.9} />;
          })}
        </g>
      )}

      {r >= 2 && (
        <g class="rk-crest__laurel" opacity={locked ? 0.5 : 1}>
          {laurel(1, 5 + r, metal)}
          {laurel(-1, 5 + r, metal)}
        </g>
      )}

      {/* shield */}
      <path d={SHIELD} fill={`url(#${id}-face)`} stroke={metal} stroke-width="3" stroke-linejoin="round" />
      <g clip-path={`url(#${id}-clip)`} opacity={locked ? 0.25 : 0.5}>
        <path d="M60 10 L60 130 M19 24 L60 70 L101 24 M20 72 L60 70 L100 72" stroke={c2} stroke-width="0.7" fill="none" opacity="0.6" />
        <path d="M19 24 L60 10 L101 24 L60 70 Z" fill="#ffffff" opacity="0.08" />
        {!locked && <rect class="rk-crest__sheen" x="-40" y="0" width="30" height="140" fill="#ffffff" opacity="0.16" transform="skewX(-18)" />}
      </g>
      <path d={SHIELD_INNER} fill="none" stroke={c2} stroke-opacity={locked ? 0.2 : 0.45} stroke-width="1" />

      {/* iris emblem */}
      <path d="M33 68 Q60 44 87 68 Q60 92 33 68 Z" fill="#0b0716" stroke={metal} stroke-width="1.6" />
      <circle cx="60" cy="68" r="12.5" fill={`url(#${id}-iris)`} />
      <g stroke={c2} stroke-opacity={locked ? 0.15 : 0.35} stroke-width="0.6">
        {Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2;
          return <line key={i} x1={60 + Math.cos(a) * 5.4} y1={68 + Math.sin(a) * 5.4} x2={60 + Math.cos(a) * 11.6} y2={68 + Math.sin(a) * 11.6} />;
        })}
      </g>
      <circle cx="60" cy="68" r="4.8" fill="#06030d" />
      {!locked && <circle cx="55.6" cy="63.4" r="2.3" fill="#ffffff" opacity="0.9" />}

      {/* star above the eye from Intern */}
      {r >= 1 && (
        <path
          d="M60 30 l2.4 5.2 5.7.6-4.3 3.9 1.2 5.6L60 42.4l-5 2.9 1.2-5.6-4.3-3.9 5.7-.6z"
          fill={metal}
          opacity={locked ? 0.5 : 1}
        />
      )}

      {/* crown for Clinic Director and Living Legend */}
      {r >= 5 && (
        <g transform="translate(0 -2)">
          <path d="M40 14 L44 2 L52 9 L60 -2 L68 9 L76 2 L80 14 Z" fill={metal} stroke="#4a2e06" stroke-width="0.8" stroke-linejoin="round" />
          {!locked && (
            <>
              <circle cx="60" cy="8" r="2.2" fill="#f472b6" />
              <circle cx="49" cy="10.5" r="1.4" fill="#38bdf8" />
              <circle cx="71" cy="10.5" r="1.4" fill="#5eead4" />
            </>
          )}
        </g>
      )}

      {/* ribbon with tier pips */}
      <g transform="translate(0 2)">
        <path d="M24 106 L96 106 L102 114 L96 122 L24 122 L18 114 Z" fill="#140c26" stroke={metal} stroke-width="1.4" stroke-linejoin="round" />
        {showNumeral ? (
          <text x="60" y="118.2" text-anchor="middle" class="rk-crest__numeral" fill={locked ? '#54486b' : '#fff4da'}>
            {roman(tier)}
          </text>
        ) : (
          Array.from({ length: TIERS_PER_RANK }, (_, i) => {
            const x = 60 + (i - 1) * 14;
            const on = i < pips && !locked;
            return <path key={i} d={`M${x} 109 L${x + 4.6} 114 L${x} 119 L${x - 4.6} 114 Z`} fill={on ? metal : 'none'} stroke={on ? 'none' : c2} stroke-opacity="0.5" stroke-width="1" />;
          })
        )}
      </g>
    </svg>
  );
}
