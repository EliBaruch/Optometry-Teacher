import type { ComponentChildren } from 'preact';
import { cx } from '../lib/cx';
import { TONE_COLOR, type Tone } from '../lib/palette';
import { Icon, type IconName } from '../icons/Icon';
import './Badge.css';

export interface BadgeProps {
  tone?: Tone;
  /** Overrides tone with any CSS colour. */
  color?: string;
  variant?: 'soft' | 'solid' | 'outline';
  icon?: IconName;
  /** Pulsing live dot (e.g. "LIVE", "3 NEW"). */
  pulse?: boolean;
  size?: 'sm' | 'md';
  class?: string;
  title?: string;
  children?: ComponentChildren;
}

export function Badge({ tone = 'gold', color, variant = 'soft', icon, pulse, size = 'md', class: klass, title, children }: BadgeProps) {
  return (
    <span class={cx('lm-badge', `lm-badge--${variant}`, `lm-badge--${size}`, klass)} style={{ '--badge-c': color ?? TONE_COLOR[tone] }} title={title}>
      {pulse && <span class="lm-badge__dot" aria-hidden="true" />}
      {icon && <Icon name={icon} class="lm-badge__icon" />}
      {children}
    </span>
  );
}
