import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSfx } from '../hooks/useSfx';
import { Icon, type IconName } from '../icons/Icon';
import { IconButton } from './IconButton';
import { cx } from '../lib/cx';
import { isolate } from '../lib/isolate';
import './Modal.css';
import { useUiStrings } from '../strings';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ComponentChildren;
  eyebrow?: ComponentChildren;
  icon?: IconName;
  /** Accessible name when there is no visible title. */
  ariaLabel?: string;
  children?: ComponentChildren;
  footer?: ComponentChildren;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'stage';
  accent?: string;
  /** Esc / close button / backdrop click close the dialog (default true). */
  dismissible?: boolean;
  closeOnBackdrop?: boolean;
  /**
   * CSS selector of the element to focus first. Default: the first footer
   * button that is not destructive (so Enter on a confirmation never erases
   * anything), else the first focusable element.
   */
  initialFocus?: string;
  /** Remove body padding (mini-game stages, media). */
  flush?: boolean;
  class?: string;
}

const EXIT_MS = 240;
const SAFE_FOOTER_ACTION = '.lm-modal__footer button:not(.lm-btn--danger):not([disabled])';

/**
 * Accessible dialog rendered in place (no portal): fixed overlay with a
 * focus trap, Esc to close, scale + blur entrance and exit.
 */
export function Modal({
  open, onClose, title, eyebrow, icon, ariaLabel, children, footer, size = 'md', accent, dismissible = true,
  closeOnBackdrop = true, initialFocus, flush, class: klass,
}: ModalProps) {
  const ui = useUiStrings();
  const reduced = useReducedMotion();
  const play = useSfx();
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = 'lm-modal-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      play('whoosh', { volume: 0.45 });
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, reduced ? 0 : EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // While open: everything outside the dialog is inert and the scroll
  // containers holding it stop scrolling (wheel on the scrim would otherwise
  // chain into the scene behind).
  const root = useRef<HTMLDivElement>(null);
  const isOpen = mounted && !closing;
  useEffect(() => {
    const el = root.current;
    if (!isOpen || !el) return;
    return isolate(el);
  }, [isOpen]);
  // Declared after isolation so its cleanup (restoring focus to the opener)
  // runs once the opener is no longer inert.
  useFocusTrap(panel, isOpen, initialFocus ?? SAFE_FOOTER_ACTION);

  if (!mounted) return null;
  const close = () => dismissible && onClose();
  return (
    <div ref={root} class={cx('lm-modal', closing ? 'is-closing' : 'is-open', klass)} style={accent ? { '--modal-c': accent } : undefined}>
      <div class="lm-modal__scrim" onClick={() => closeOnBackdrop && close()} aria-hidden="true" />
      <div
        ref={panel}
        class={cx('lm-modal__panel', `lm-modal__panel--${size}`, flush && 'is-flush')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && dismissible) {
            e.stopPropagation();
            e.preventDefault();
            play('back');
            onClose();
          }
        }}
      >
        {(title || eyebrow || dismissible) && (
          <header class={cx('lm-modal__header', !title && !eyebrow && 'is-bare')}>
            {icon && (
              <span class="lm-modal__icon">
                <Icon name={icon} />
              </span>
            )}
            <div class="lm-modal__titles">
              {eyebrow && <div class="lm-eyebrow">{eyebrow}</div>}
              {title && (
                <h2 id={titleId} class="lm-modal__title">
                  {title}
                </h2>
              )}
            </div>
            {dismissible && <IconButton class="lm-modal__close" icon="close" label={ui.close} variant="ghost" size="sm" sfx="back" onClick={onClose} />}
          </header>
        )}
        <div class="lm-modal__body">{children}</div>
        {footer && <footer class="lm-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
