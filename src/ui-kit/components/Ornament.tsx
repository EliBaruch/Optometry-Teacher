import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { cx } from '../lib/cx';
import './Ornament.css';

/** Gold filigree flourish with a lens/iris at its heart. Purely decorative. */
export function Ornament(props: { width?: number; class?: string; color?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const w = props.width ?? 132;
  const half = (
    <>
      <path d="M50 12C43 12 41 5.5 35.5 5.5c-4.2 0-5.4 4.4-2.4 5.4 2.6.9 3.8-1.9 2-3" />
      <path d="M50 12c-7 0-9 6.5-14.5 6.5-4.2 0-5.4-4.4-2.4-5.4 2.6-.9 3.8 1.9 2 3" />
      <path d="M30 12H4" stroke-opacity="0.75" />
      <path d="M22 9.6 24.4 12 22 14.4 19.6 12z" fill={`url(#${id}-g)`} stroke="none" />
      <circle cx="12" cy="12" r="1" fill={`url(#${id}-g)`} stroke="none" />
    </>
  );
  return (
    <svg
      class={cx('lm-ornament', props.class)}
      viewBox="0 0 132 24"
      width={w}
      height={(w / 132) * 24}
      aria-hidden="true"
      fill="none"
      stroke={props.color ?? `url(#${id}-g)`}
      stroke-width="1.15"
      stroke-linecap="round"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="132" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#b8802a" stop-opacity="0.2" />
          <stop offset="0.3" stop-color="#f5b942" />
          <stop offset="0.5" stop-color="#fff0c9" />
          <stop offset="0.7" stop-color="#f5b942" />
          <stop offset="1" stop-color="#b8802a" stop-opacity="0.2" />
        </linearGradient>
        <radialGradient id={`${id}-iris`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#fff6df" />
          <stop offset="0.55" stop-color="#ffd27a" />
          <stop offset="1" stop-color="#c47f1e" />
        </radialGradient>
      </defs>
      <g>{half}</g>
      <g transform="translate(132 0) scale(-1 1)">{half}</g>
      <path d="M53 12c3.6-4.6 9.4-4.6 13-4.6s9.4 0 13 4.6c-3.6 4.6-9.4 4.6-13 4.6s-9.4 0-13-4.6z" />
      <circle cx="66" cy="12" r="3.1" fill={`url(#${id}-iris)`} stroke="none" />
      <circle cx="66" cy="12" r="1.1" fill="#1a0f2e" stroke="none" />
    </svg>
  );
}

export interface DividerProps {
  /** Optional centred label (small caps) instead of the ornament. */
  label?: ComponentChildren;
  /** 'ornament' (default) shows the filigree; 'line' is a plain luminous hairline. */
  variant?: 'ornament' | 'line';
  class?: string;
}

/** Full-width gold divider: luminous hairlines fading out from a centred ornament or label. */
export function Divider({ label, variant = 'ornament', class: klass }: DividerProps) {
  return (
    <div class={cx('lm-divider', `lm-divider--${variant}`, klass)} role="separator">
      <span class="lm-divider__line" />
      {label ? <span class="lm-divider__label lm-eyebrow">{label}</span> : variant === 'ornament' ? <Ornament width={120} /> : null}
      <span class="lm-divider__line lm-divider__line--r" />
    </div>
  );
}
