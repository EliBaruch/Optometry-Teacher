import type { ComponentChildren, JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { SfxId } from '@core';
import { Icon, type IconName } from '../icons/Icon';
import { useSfx } from '../hooks/useSfx';
import { cx } from '../lib/cx';
import './Button.css';

export type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'size' | 'loading'> {
  /** primary = candle-gold call to action */
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /** Sound on press (default 'click'); false for silence. */
  sfx?: SfxId | false;
  children?: ComponentChildren;
}

export function Button({
  variant = 'glass',
  size = 'md',
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  block = false,
  type = 'button',
  sfx = 'click',
  class: klass,
  className,
  children,
  onClick,
  onPointerDown,
  ...rest
}: ButtonProps) {
  const play = useSfx();
  const [ripple, setRipple] = useState<{ k: number; x: number; y: number } | null>(null);
  const inert = disabled || loading;

  return (
    <button
      type={type}
      class={cx('lm-btn', `lm-btn--${variant}`, `lm-btn--${size}`, block && 'lm-btn--block', loading && 'is-loading', klass as string, className as string)}
      disabled={disabled}
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      onPointerDown={(e) => {
        if (!inert) {
          const r = e.currentTarget.getBoundingClientRect();
          setRipple({ k: (ripple?.k ?? 0) + 1, x: e.clientX - r.left, y: e.clientY - r.top });
        }
        onPointerDown?.(e);
      }}
      onClick={(e) => {
        if (inert) {
          e.preventDefault();
          return;
        }
        if (sfx) play(sfx);
        onClick?.(e);
      }}
      {...rest}
    >
      <span class="lm-btn__sheen" aria-hidden="true" />
      {ripple && <span key={ripple.k} class="lm-btn__ripple" style={{ left: ripple.x, top: ripple.y }} aria-hidden="true" />}
      {loading ? <span class="lm-btn__spinner" aria-hidden="true" /> : icon && <Icon name={icon} class="lm-btn__icon" />}
      {children != null && <span class="lm-btn__label">{children}</span>}
      {trailingIcon && !loading && <Icon name={trailingIcon} class="lm-btn__icon lm-btn__icon--trail" />}
    </button>
  );
}
