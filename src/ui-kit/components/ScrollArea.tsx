import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { cx } from '../lib/cx';
import './ScrollArea.css';

export interface ScrollAreaProps {
  children: ComponentChildren;
  /** CSS max-height (e.g. 320 or '50vh'); omit to fill the parent. */
  maxHeight?: number | string;
  /** Fade the edges where more content is hidden (default true). */
  fade?: boolean;
  direction?: 'vertical' | 'horizontal';
  class?: string;
  style?: JSX.CSSProperties;
  ariaLabel?: string;
}

/** Scroll container with slim neutral scrollbars and soft fade masks at overflowing edges. */
export function ScrollArea({ children, maxHeight, fade = true, direction = 'vertical', class: klass, style, ariaLabel }: ScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el || !fade) return;
    const update = () => {
      const h = direction === 'vertical';
      const pos = h ? el.scrollTop : el.scrollLeft;
      const max = h ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
      const next = { start: pos > 2, end: pos < max - 2 };
      setEdges((p) => (p.start === next.start && p.end === next.end ? p : next));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [fade, direction]);

  return (
    <div
      ref={ref}
      class={cx('lm-scroll', `lm-scroll--${direction}`, fade && edges.start && 'fade-start', fade && edges.end && 'fade-end', klass)}
      style={{ ...(maxHeight !== undefined ? { maxHeight } : {}), ...(style as object) }}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
    >
      <div class="lm-scroll__content">{children}</div>
    </div>
  );
}
