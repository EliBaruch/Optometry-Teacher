import type { JSX } from 'preact';
import type { SfxId } from '@core';
import { Icon, type IconName } from '../icons/Icon';
import { useSfx } from '../hooks/useSfx';
import { cx } from '../lib/cx';
import './IconButton.css';

export interface IconButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'size' | 'label'> {
  icon: IconName;
  /** Required accessible name (also used as the native tooltip). */
  label: string;
  variant?: 'glass' | 'ghost' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  /** Small count / dot in the corner. `true` = dot only. */
  badge?: number | string | boolean;
  pressed?: boolean;
  disabled?: boolean;
  sfx?: SfxId | false;
}

export function IconButton({
  icon, label, variant = 'glass', size = 'md', badge, pressed, disabled, sfx = 'click', class: klass, onClick, ...rest
}: IconButtonProps) {
  const play = useSfx();
  return (
    <button
      type="button"
      class={cx('lm-iconbtn', `lm-iconbtn--${variant}`, `lm-iconbtn--${size}`, pressed && 'is-pressed', klass as string)}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={(e) => {
        if (sfx) play(sfx);
        onClick?.(e);
      }}
      {...rest}
    >
      <Icon name={icon} class="lm-iconbtn__icon" />
      {badge !== undefined && badge !== false && badge !== 0 && (
        <span class={cx('lm-iconbtn__badge', badge === true && 'is-dot')} aria-hidden="true">
          {badge === true ? '' : badge}
        </span>
      )}
    </button>
  );
}
