import type { ComponentChildren } from 'preact';
import type { SfxId } from '@core';
import { Icon, type IconName } from '../icons/Icon';
import { useSfx } from '../hooks/useSfx';
import { cx } from '../lib/cx';
import './Chip.css';

export interface ChipProps {
  children: ComponentChildren;
  icon?: IconName;
  /** CSS colour for the selected state & icon. */
  accent?: string;
  selected?: boolean;
  disabled?: boolean;
  /** Makes the chip a toggle button. */
  onClick?: (e: MouseEvent) => void;
  /** Adds a remove (×) affordance. */
  onRemove?: () => void;
  size?: 'sm' | 'md';
  class?: string;
  title?: string;
  sfx?: SfxId | false;
}

export function Chip({ children, icon, accent, selected, disabled, onClick, onRemove, size = 'md', class: klass, title, sfx = 'select' }: ChipProps) {
  const play = useSfx();
  const style = accent ? { '--chip-c': accent } : undefined;
  const body = (
    <>
      {icon && <Icon name={icon} class="lm-chip__icon" />}
      <span class="lm-chip__label">{children}</span>
      {selected && onClick && <Icon name="check" class="lm-chip__check" />}
    </>
  );
  const classes = cx('lm-chip', `lm-chip--${size}`, selected && 'is-selected', !!onClick && 'is-clickable', disabled && 'is-disabled', klass);
  if (onClick) {
    return (
      <button
        type="button"
        class={classes}
        style={style}
        aria-pressed={!!selected}
        disabled={disabled}
        title={title}
        onClick={(e) => {
          if (sfx) play(sfx);
          onClick(e);
        }}
      >
        {body}
      </button>
    );
  }
  return (
    <span class={classes} style={style} title={title}>
      {body}
      {onRemove && (
        <button type="button" class="lm-chip__remove" aria-label={`Remove ${typeof children === 'string' ? children : ''}`.trim()} onClick={() => {
            play('back', { volume: 0.6 });
            onRemove();
          }}>
          <Icon name="close" />
        </button>
      )}
    </span>
  );
}
