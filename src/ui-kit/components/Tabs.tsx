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
      setEdges({ start: list.scrollLeft > 2, end: max > 2 && list.scrollLeft < max - 2 });
    };
    // Keep the active tab in view on narrow screens (without scrolling the page).
    const el = list.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
    if (el && list.scrollWidth > list.clientWidth) {
      const left = el.offsetLeft - 24;
      const right = el.offsetLeft + el.offsetWidth + 24 - list.clientWidth;
      if (list.scrollLeft > left) list.scrollLeft = Math.max(0, left);
      else if (list.scrollLeft < right) list.scrollLeft = right;
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
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % enabled.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + enabled.length) % enabled.length;
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
