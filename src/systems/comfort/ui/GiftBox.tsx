import { useId } from 'preact/hooks';
import { cx } from '@ui-kit';

export type GiftPhase = 'idle' | 'ready' | 'shaking' | 'open' | 'spent';

/**
 * Procedural gift box: navy lacquer, ice-blue silk ribbon and a
 * brass clasp. `ready` bobs and glows, `shaking` wobbles in anticipation,
 * `open` throws the lid off with a spring and spills light rays.
 */
export function GiftBox(props: { phase: GiftPhase; size?: number; grand?: boolean; class?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const size = props.size ?? 120;
  const ribbon = props.grand ? '#ffcb00' : '#ffffff';
  const ribbonDeep = props.grand ? '#f5a524' : '#dce6ff';
  return (
    <svg
      class={cx('cf-gift', `cf-gift--${props.phase}`, props.grand && 'cf-gift--grand', props.class)}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#5c87ff" />
          <stop offset="0.55" stop-color="#2257f0" />
          <stop offset="1" stop-color="#1b45c4" />
        </linearGradient>
        <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7a9eff" />
          <stop offset="1" stop-color="#3b6bff" />
        </linearGradient>
        <linearGradient id={`${id}-rib`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color={ribbonDeep} />
          <stop offset="0.45" stop-color={ribbon} />
          <stop offset="0.55" stop-color="#ffffff" />
          <stop offset="1" stop-color={ribbonDeep} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="0.35" stop-color={ribbon} stop-opacity="0.55" />
          <stop offset="1" stop-color={ribbon} stop-opacity="0" />
        </radialGradient>
      </defs>

      {/* halo + rays (visible when ready / open) */}
      <circle class="cf-gift__halo" cx="60" cy="66" r="56" fill={`url(#${id}-glow)`} />
      <g class="cf-gift__rays" transform="translate(60 58)">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M-3 0 L0 -58 L3 0 Z" fill="#ffcb00" opacity="0.35" transform={`rotate(${i * 30})`} />
        ))}
      </g>

      <ellipse cx="60" cy="108" rx="38" ry="5" fill="#0a1633" opacity="0.14" class="cf-gift__shadow" />

      <g class="cf-gift__box">
        {/* body */}
        <rect x="22" y="52" width="76" height="54" rx="5" fill={`url(#${id}-body)`} />
        <rect x="22" y="52" width="76" height="54" rx="5" fill="none" stroke="rgba(10,22,51,.12)" stroke-width="1" />
        {/* glossy sheen */}
        <path d="M26 56 h30 l-18 46 h-12 z" fill="#fff" opacity="0.2" />
        <rect x="54" y="52" width="12" height="54" fill={`url(#${id}-rib)`} />
        {/* inner glow escaping when opened */}
        <rect class="cf-gift__inner" x="24" y="50" width="72" height="6" rx="2" fill="#ffffff" />

        {/* lid + bow */}
        <g class="cf-gift__lid">
          <rect x="16" y="38" width="88" height="17" rx="4" fill={`url(#${id}-lid)`} />
          <rect x="16" y="38" width="88" height="17" rx="4" fill="none" stroke="rgba(10,22,51,.12)" stroke-width="1" />
          <rect x="16" y="38" width="88" height="4" rx="2" fill="#fff" opacity="0.35" />
          <rect x="53" y="38" width="14" height="17" fill={`url(#${id}-rib)`} />
          <path d="M60 38 C46 18, 26 26, 40 37 C46 41, 54 39, 60 38 Z" fill={ribbon} stroke={ribbonDeep} stroke-width="1" />
          <path d="M60 38 C74 18, 94 26, 80 37 C74 41, 66 39, 60 38 Z" fill={ribbon} stroke={ribbonDeep} stroke-width="1" />
          <path d="M48 30 C52 32, 56 35, 59 37" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.8" />
          <path d="M72 30 C68 32, 64 35, 61 37" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.6" />
          <circle cx="60" cy="38" r="5" fill="#ffcb00" stroke="#d98a0a" stroke-width="1" />
          <circle cx="58.6" cy="36.6" r="1.4" fill="#fff" />
        </g>
      </g>
    </svg>
  );
}
