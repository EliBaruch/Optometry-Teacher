import type { ComponentChildren } from 'preact';
import { cx } from '../lib/cx';
import './Ornament.css';

/** Quiet editorial accent: a short azure bar on a hairline. Purely decorative. */
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
    >
      <rect x="0" y="11.5" width="132" height="1" rx="0.5" fill="currentColor" opacity="0.14" />
      <rect x="48" y="10" width="36" height="4" rx="2" fill={props.color ?? 'currentColor'} />
    </svg>
  );
}

export interface DividerProps {
  /** Optional centred label (small caps) instead of the ornament. */
  label?: ComponentChildren;
  /** 'ornament' (default) shows a short azure accent bar; 'line' is a plain hairline. */
  variant?: 'ornament' | 'line';
  class?: string;
}

/** Full-width quiet divider: hairlines around a centred accent bar or label. */
export function Divider({ label, variant = 'ornament', class: klass }: DividerProps) {
  return (
    <div class={cx('lm-divider', `lm-divider--${variant}`, klass)} role="separator">
      <span class="lm-divider__line" />
      {label ? <span class="lm-divider__label lm-eyebrow">{label}</span> : variant === 'ornament' ? <Ornament width={120} /> : null}
      <span class="lm-divider__line lm-divider__line--r" />
    </div>
  );
}
