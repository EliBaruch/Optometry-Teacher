import type { ComponentChildren, JSX } from 'preact';
import type { SfxId } from '@core';
import { useSfx } from '../hooks/useSfx';
import { Icon, type IconName } from '../icons/Icon';
import { cx } from '../lib/cx';
import './GlassPanel.css';

export interface GlassPanelProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title' | 'icon' | 'ref'> {
  as?: 'div' | 'section' | 'article' | 'aside';
  /** CSS colour: tints border, header icon and the soft outer glow. */
  accent?: string;
  /** Show the accent glow halo. */
  glow?: boolean;
  title?: ComponentChildren;
  eyebrow?: ComponentChildren;
  icon?: IconName;
  /** Right side of the header (buttons, badges…) */
  actions?: ComponentChildren;
  /** Fully custom header (replaces title/eyebrow/icon/actions). */
  header?: ComponentChildren;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Opaque-ish glass for dense text. */
  strong?: boolean;
  /** Hover lift + pointer — for clickable cards. With onClick it becomes a keyboard-operable button. */
  interactive?: boolean;
  /** Click sound for interactive cards (default 'click'; false = silent). */
  sfx?: SfxId | false;
  children?: ComponentChildren;
}

export function GlassPanel({
  as = 'div', accent, glow = false, title, eyebrow, icon, actions, header, padding = 'md', strong, interactive, sfx = 'click',
  class: klass, style, children, tabIndex, role, onClick, onKeyDown, ...rest
}: GlassPanelProps) {
  const Tag = as as 'div';
  const play = useSfx();
  const hasHeader = header !== undefined || title !== undefined || eyebrow !== undefined || actions !== undefined;
  const accentStyle = accent ? { '--panel-accent': accent } : null;
  const asButton = !!(interactive && onClick);
  const activate = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (asButton && sfx) play(sfx);
    (onClick as ((e: JSX.TargetedMouseEvent<HTMLDivElement>) => void) | undefined)?.(e);
  };
  const handleKey = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    (onKeyDown as ((e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => void) | undefined)?.(e);
    // Only the card itself, not buttons/inputs nested inside it.
    if (!asButton || e.defaultPrevented || e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  };
  return (
    <Tag
      class={cx('lm-panel', `lm-panel--pad-${padding}`, glow && 'lm-panel--glow', strong && 'lm-panel--strong', interactive && 'lm-panel--interactive', accent && 'lm-panel--accent', klass as string)}
      style={accentStyle ? { ...accentStyle, ...(typeof style === 'object' ? (style as object) : {}) } : style}
      tabIndex={asButton && tabIndex === undefined ? 0 : tabIndex}
      role={role ?? (asButton ? 'button' : undefined)}
      onClick={onClick ? activate : undefined}
      onKeyDown={asButton || onKeyDown ? handleKey : undefined}
      {...rest}
    >
      {hasHeader && (
        <header class="lm-panel__header">
          {header ?? (
            <>
              {icon && (
                <span class="lm-panel__icon">
                  <Icon name={icon} />
                </span>
              )}
              <div class="lm-panel__titles">
                {eyebrow && <div class="lm-eyebrow lm-panel__eyebrow">{eyebrow}</div>}
                {title && <h3 class="lm-panel__title">{title}</h3>}
              </div>
              {actions && <div class="lm-panel__actions">{actions}</div>}
            </>
          )}
        </header>
      )}
      {children}
    </Tag>
  );
}

/** A clickable glass card (GlassPanel with hover lift). */
export function Card(props: GlassPanelProps) {
  return <GlassPanel interactive {...props} />;
}
