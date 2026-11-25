import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Icon, type IconName } from '../icons/Icon';
import { useSfx } from '../hooks/useSfx';
import { cx } from '../lib/cx';
import './Tabs.css';

export interface TabItem {
  id: string;
  label: ComponentChildren;
  icon?: IconName;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Prefix for tab/panel ids so <TabPanel tabsId=…> can link up. */
  id: string;
  label?: string;
  variant?: 'pill' | 'underline';
  accent?: string;
  block?: boolean;
  class?: string;
}

/** Accessible tablist with a gliding indicator. Arrow keys / Home / End move between tabs. */
export function Tabs({ items, value, onChange, id, label, variant = 'pill', accent, block, class: klass }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const play = useSfx();

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
      if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
      const max = list.scrollWidth - list.clientWidth;
      // scrollLeft is <= 0 in RTL; |scrollLeft| is the distance scrolled from the logical start.
      const off = Math.abs(list.scrollLeft);
      setEdges({ start: off > 2, end: max > 2 && off < max - 2 });
    };
    // Keep the active tab in view on narrow screens (without scrolling the page).
    const el = list.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
    if (el && list.scrollWidth > list.clientWidth) {
      const rtl = getComputedStyle(list).direction === 'rtl';
      const sign = rtl ? -1 : 1;
      // Work in logical offsets from the inline start, then convert back to scrollLeft.
      const startEdge = rtl ? list.scrollWidth - (el.offsetLeft + el.offsetWidth) : el.offsetLeft;
      const lo = startEdge - 24;
      const hi = startEdge + el.offsetWidth + 24 - list.clientWidth;
      const cur = Math.abs(list.scrollLeft);
      if (cur > lo) list.scrollLeft = sign * Math.max(0, lo);
      else if (cur < hi) list.scrollLeft = sign * hi;
    }
    measure();
    list.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(list);
    return () => {
      list.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [value, items.length]);

  const enabled = items.filter((t) => !t.disabled);
  const select = (tid: string, focus: boolean) => {
    if (tid !== value) {
      play('select');
      onChange(tid);
    }
    if (focus) listRef.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(tid)}"]`)?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const i = enabled.findIndex((t) => t.id === value);
    let next = -1;
    const rtl = !!listRef.current && getComputedStyle(listRef.current).direction === 'rtl';
    const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd || e.key === 'ArrowDown') next = (i + 1) % enabled.length;
    else if (e.key === back || e.key === 'ArrowUp') next = (i - 1 + enabled.length) % enabled.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = enabled.length - 1;
    if (next >= 0) {
      e.preventDefault();
      select(enabled[next]!.id, true);
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      class={cx('lm-tabs', `lm-tabs--${variant}`, block && 'lm-tabs--block', edges.start && 'fade-start', edges.end && 'fade-end', klass)}
      style={accent ? { '--tabs-c': accent } : undefined}
      onKeyDown={onKey}
    >
      {ind && <span class="lm-tabs__ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} aria-hidden="true" />}
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${id}-tab-${t.id}`}
            aria-controls={`${id}-panel-${t.id}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={t.disabled}
            data-tab={t.id}
            class={cx('lm-tabs__tab', active && 'is-active')}
            onClick={() => select(t.id, false)}
          >
            {t.icon && <Icon name={t.icon} class="lm-tabs__icon" />}
            <span>{t.label}</span>
            {t.badge !== undefined && <span class="lm-tabs__badge lm-num">{t.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel(props: { tabsId: string; id: string; value: string; children: ComponentChildren; class?: string }) {
  const active = props.id === props.value;
  return (
    <div
      role="tabpanel"
      id={`${props.tabsId}-panel-${props.id}`}
      aria-labelledby={`${props.tabsId}-tab-${props.id}`}
      hidden={!active}
      tabIndex={0}
      class={cx('lm-tabpanel', props.class)}
    >
      {active && props.children}
    </div>
  );
}
