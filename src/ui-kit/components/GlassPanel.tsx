import type { ComponentChildren, JSX } from 'preact';
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
  /** Hover lift + pointer — for clickable cards. */
  interactive?: boolean;
  children?: ComponentChildren;
}

export function GlassPanel({
  as = 'div', accent, glow = false, title, eyebrow, icon, actions, header, padding = 'md', strong, interactive,
  class: klass, style, children, tabIndex, ...rest
}: GlassPanelProps) {
  const Tag = as as 'div';
  const hasHeader = header !== undefined || title !== undefined || eyebrow !== undefined || actions !== undefined;
  const accentStyle = accent ? { '--panel-accent': accent } : null;
  return (
    <Tag
      class={cx('lm-panel', `lm-panel--pad-${padding}`, glow && 'lm-panel--glow', strong && 'lm-panel--strong', interactive && 'lm-panel--interactive', accent && 'lm-panel--accent', klass as string)}
      style={accentStyle ? { ...accentStyle, ...(typeof style === 'object' ? (style as object) : {}) } : style}
      tabIndex={interactive && rest.onClick && tabIndex === undefined ? 0 : tabIndex}
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
