import type { JSX } from 'preact';
import type { TestId } from '@core';
import { GLYPHS } from './glyphs';

export type IconName = keyof typeof GLYPHS;
/** Every clinical TestId has an icon of the same name. */
export type TestIconName = Extract<IconName, TestId>;

export const ICON_NAMES = Object.keys(GLYPHS) as IconName[];

export function isIconName(name: unknown): name is IconName {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(GLYPHS, name);
}

export interface IconProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'name' | 'size' | 'label'> {
  name: IconName;
  /** px number or CSS length; default 1.25em */
  size?: number | string;
  /** Accessible label. Omit for decorative icons (then aria-hidden). */
  label?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = '1.25em', label, strokeWidth = 1.75, class: klass, ...rest }: IconProps) {
  const glyph = GLYPHS[name];
  const dim = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      viewBox="0 0 24 24"
      width={dim}
      height={dim}
      fill="none"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      class={`lm-icon${klass ? ' ' + klass : ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-icon={name}
      {...rest}
    >
      {glyph}
    </svg>
  );
}

/**
 * Render a free-form icon string from content/plugins (HubEntry.icon, RewardGrant.icon, toasts):
 * a known IconName becomes an <Icon>, anything else (an emoji, "✦") is shown as text.
 */
export function IconOrText(props: { icon?: string; size?: number | string; class?: string }) {
  if (!props.icon) return null;
  if (isIconName(props.icon)) return <Icon name={props.icon} size={props.size} class={props.class} />;
  return (
    <span class={`lm-icon-text${props.class ? ' ' + props.class : ''}`} aria-hidden="true" style={props.size ? { fontSize: props.size } : undefined}>
      {props.icon}
    </span>
  );
}
