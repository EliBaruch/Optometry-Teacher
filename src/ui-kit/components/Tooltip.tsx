import { cloneElement, isValidElement, type ComponentChildren, type VNode } from 'preact';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { cx } from '../lib/cx';
import { placeTooltip, type TipPlacement, type TipPlacementResult } from '../lib/tooltipPlace';
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
  const wrap = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<TipPlacementResult>({ placement, shift: 0, arrow: 0 });

  // On open (and while open, on scroll/resize) measure and keep the bubble on
  // screen: flip to the side with room, then slide along it into an 8px margin.
  // The bubble is laid out (visibility: hidden) even while closed, so it can be
  // measured *before* opening: the entrance then animates straight to the
  // corrected spot instead of sliding sideways.
  const measure = () => {
    const t = wrap.current;
    const b = bubble.current;
    if (!t || !b) return;
    const r = t.getBoundingClientRect();
    const next = placeTooltip({
      trigger: { left: r.left, top: r.top, width: r.width, height: r.height },
      // offset* ignores the entrance scale transform.
      bubble: { width: b.offsetWidth, height: b.offsetHeight },
      viewport: { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight },
      placement,
    });
    setPos((p) => (p.placement === next.placement && p.shift === next.shift && p.arrow === next.arrow ? p : next));
  };
  const show = () => {
    measure();
    setOpen(true);
  };
  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, placement]);
  const side: TipPlacement = pos.placement;
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
      ref={wrap}
      class={cx('lm-tip', klass)}
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return;
        clear();
        timer.current = setTimeout(show, delay);
      }}
      onPointerLeave={() => {
        clear();
        setOpen(false);
      }}
      onFocusIn={show}
      onFocusOut={() => setOpen(false)}
      onPointerDown={(e) => {
        // touch: tap toggles
        if (e.pointerType !== 'touch') return;
        if (open) setOpen(false);
        else show();
      }}
    >
      {trigger}
      <span
        ref={bubble}
        id={id}
        role="tooltip"
        class={cx('lm-tip__bubble', `lm-tip__bubble--${side}`, open && 'is-open')}
        style={{ '--tip-shift': `${pos.shift}px`, '--tip-arrow': `${pos.arrow}px` }}
      >
        {content}
      </span>
    </span>
  );
}
