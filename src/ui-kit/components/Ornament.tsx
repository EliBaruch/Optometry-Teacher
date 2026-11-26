import type { ComponentChildren } from 'preact';
import { cx } from '../lib/cx';
import './Ornament.css';

/** Quiet lens mark: a small eye-shaped outline with a teal iris. Purely decorative. */
export function Ornament(props: { width?: number; class?: string; color?: string }) {
  const w = props.width ?? 132;
  return (
    <svg
      class={cx('lm-ornament', props.class)}
      viewBox="0 0 132 24"
      width={w}
      height={(w / 132) * 24}
      aria-hidden="true"
      fill="none"
      stroke={props.color ?? 'currentColor'}
      stroke-width="1.4"
      stroke-linecap="round"
    >
      <path d="M53 12c3.6-4.6 9.4-4.6 13-4.6s9.4 0 13 4.6c-3.6 4.6-9.4 4.6-13 4.6s-9.4 0-13-4.6z" stroke-opacity="0.55" />
      <circle cx="66" cy="12" r="3.1" fill={props.color ?? 'currentColor'} stroke="none" />
      <circle cx="67.1" cy="10.9" r="0.9" fill="#fff" stroke="none" />
    </svg>
  );
}

export interface DividerProps {
  /** Optional centred label (small caps) instead of the ornament. */
  label?: ComponentChildren;
  /** 'ornament' (default) shows a small lens mark; 'line' is a plain hairline. */
  variant?: 'ornament' | 'line';
  class?: string;
}

/** Full-width quiet divider: hairlines around a centred lens mark or label. */
export function Divider({ label, variant = 'ornament', class: klass }: DividerProps) {
  return (
    <div class={cx('lm-divider', `lm-divider--${variant}`, klass)} role="separator">
      <span class="lm-divider__line" />
      {label ? <span class="lm-divider__label lm-eyebrow">{label}</span> : variant === 'ornament' ? <Ornament width={120} /> : null}
      <span class="lm-divider__line lm-divider__line--r" />
    </div>
  );
}
