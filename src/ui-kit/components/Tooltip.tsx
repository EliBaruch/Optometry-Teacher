import { cloneElement, isValidElement, type ComponentChildren, type VNode } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { cx } from '../lib/cx';
import './Tooltip.css';

export interface TooltipProps {
  content: ComponentChildren;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Hover delay in ms (focus opens immediately). */
  delay?: number;
  /** A single focusable element works best (it receives aria-describedby). */
  children: ComponentChildren;
  class?: string;
}

export function Tooltip({ content, placement = 'top', delay = 260, children, class: klass }: TooltipProps) {
  const id = 'lm-tip-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const trigger = isValidElement(children) ? cloneElement(children as VNode<Record<string, unknown>>, { 'aria-describedby': id }) : children;
  return (
    <span
      class={cx('lm-tip', klass)}
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return;
        clear();
        timer.current = setTimeout(() => setOpen(true), delay);
      }}
      onPointerLeave={() => {
        clear();
        setOpen(false);
      }}
      onFocusIn={() => setOpen(true)}
      onFocusOut={() => setOpen(false)}
      onPointerDown={(e) => {
        // touch: tap toggles
        if (e.pointerType === 'touch') setOpen((o) => !o);
      }}
    >
      {trigger}
      <span id={id} role="tooltip" class={cx('lm-tip__bubble', `lm-tip__bubble--${placement}`, open && 'is-open')}>
        {content}
      </span>
    </span>
  );
}
