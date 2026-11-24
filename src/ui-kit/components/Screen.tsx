import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { HudSlot, useOptionalServices } from '../context';
import { useSfx } from '../hooks/useSfx';
import { cx } from '../lib/cx';
import { Backdrop, type BackdropVariant } from './Backdrop';
import { IconButton } from './IconButton';
import './Screen.css';

export interface ScreenProps {
  title?: ComponentChildren;
  eyebrow?: ComponentChildren;
  /** Shows a back button (top-left) when provided. */
  onBack?: () => void;
  backLabel?: string;
  /** Esc triggers onBack (default false; modals stop Esc from reaching this). */
  escToBack?: boolean;
  /** Scene background; false for none (e.g. the scene paints its own). */
  backdrop?: BackdropVariant | false;
  /** Render HudSlot 'topbar-left' / 'topbar-right' (when inside a ServicesProvider). */
  hud?: boolean;
  /** Extra items at the top-left (after the back button) / top-right (before HUD). */
  left?: ComponentChildren;
  right?: ComponentChildren;
  /** Hide the top bar entirely (title screen). */
  bare?: boolean;
  /** Content is a non-scrolling stage (exam room, games). */
  fill?: boolean;
  class?: string;
  contentClass?: string;
  children?: ComponentChildren;
}

/** Fixed full-viewport scene frame: backdrop + top bar (back · HUD · title · HUD) + content. */
export function Screen({
  title, eyebrow, onBack, backLabel = 'Back', escToBack = false, backdrop = 'hub', hud = true, left, right, bare, fill,
  class: klass, contentClass, children,
}: ScreenProps) {
  const services = useOptionalServices();
  const play = useSfx();

  useEffect(() => {
    if (!escToBack || !onBack) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        play('back');
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [escToBack, onBack]);

  const showHud = hud && !!services;
  return (
    <div class={cx('lm-screen', fill && 'lm-screen--fill', bare && 'lm-screen--bare', klass)}>
      {backdrop && <Backdrop variant={backdrop} />}
      {!bare && (
        <header class="lm-screen__bar">
          <div class="lm-screen__side lm-screen__side--left">
            {onBack && <IconButton icon="chevron-left" label={backLabel} onClick={onBack} sfx="back" class="lm-screen__back" />}
            {left}
            {showHud && <HudSlot slot="topbar-left" />}
          </div>
          {(title || eyebrow) && (
            <div class="lm-screen__title">
              {eyebrow && <div class="lm-eyebrow">{eyebrow}</div>}
              {title && <h1>{title}</h1>}
            </div>
          )}
          <div class="lm-screen__side lm-screen__side--right">
            {right}
            {showHud && <HudSlot slot="topbar-right" />}
          </div>
        </header>
      )}
      <main class={cx('lm-screen__content', contentClass)}>{children}</main>
    </div>
  );
}
