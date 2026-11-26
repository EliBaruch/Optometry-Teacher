import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { Locale } from '@core';
import { slT } from './strings';
import { menuLabel, type MenuNode } from './vocab';

export interface RadialMenuProps {
  roots: MenuNode[];
  /** Click position, relative to the stage. */
  anchor: { x: number; y: number };
  stage: { w: number; h: number };
  title?: string;
  locale?: Locale;
  onPick: (leafPath: string) => void;
  onClose: () => void;
  sfx?: (id: 'pop' | 'select' | 'back') => void;
}

const TINT: Record<string, string> = {
  lids: '#fbbf77', conj: '#f9a8c9', cornea: '#8fd3ff', chamber: '#c4b5fd', iris: '#5eead4', lens: '#ffd27a',
};
const W = 180; // petal width
const H = 36;

/**
 * Two-level (or three-level) fan menu opened where the player tapped. On narrow
 * stages it becomes a bottom sheet with the same data and keyboard behaviour.
 */
export function RadialMenu(p: RadialMenuProps) {
  const [stack, setStack] = useState<MenuNode[]>([]);
  const locale = p.locale ?? 'en';
  const t = slT(locale);
  const lab = (n: MenuNode) => menuLabel(n, locale);
  const root = useRef<HTMLDivElement>(null);
  const items = stack.length ? stack[stack.length - 1]!.children ?? [] : p.roots;
  const narrow = p.stage.w < 560;
  const tint = TINT[stack[0]?.id ?? ''] ?? '#ffd27a';

  useEffect(() => {
    p.sfx?.('pop');
  }, []);
  useEffect(() => {
    const first = root.current?.querySelector<HTMLButtonElement>('.sl-petal');
    first?.focus({ preventScroll: true });
  }, [stack.length]);

  const back = () => {
    p.sfx?.('back');
    if (stack.length) setStack(stack.slice(0, -1));
    else p.onClose();
  };
  const pick = (n: MenuNode) => {
    p.sfx?.('select');
    if (n.children?.length) setStack([...stack, n]);
    else p.onPick(n.path);
  };
  const onKey = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    const btns = [...(root.current?.querySelectorAll<HTMLButtonElement>('.sl-petal') ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); back(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); btns[(i + 1) % btns.length]?.focus(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); btns[(i - 1 + btns.length) % btns.length]?.focus(); }
  };
  const crumb = stack.map(lab).join(' › ');

  if (narrow) {
    return (
      <div class="sl-menu-scrim" onPointerDown={(e) => e.target === e.currentTarget && p.onClose()}>
        <div class="sl-sheet" ref={root} role="menu" aria-label={t.menuAria} onKeyDown={onKey} style={{ '--sl-tint': tint } as JSX.CSSProperties}>
          <div class="sl-sheet__head">
            <button type="button" class="sl-hub sl-hub--sm" onClick={back} aria-label={stack.length ? t.back : t.close}>{stack.length ? '‹' : '✕'}</button>
            <span>{crumb || p.title || t.whatIsThis}</span>
          </div>
          <div class="sl-sheet__grid" key={stack.length}>
            {items.map((n, i) => (
              <button key={n.path} type="button" role="menuitem" class="sl-petal sl-petal--chip" style={{ '--i': i } as JSX.CSSProperties} onClick={() => pick(n)}>
                {lab(n)}{n.children?.length && !n.graded ? <b aria-hidden="true">›</b> : n.graded ? <b aria-hidden="true">#</b> : null}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const n = items.length;
  const right = items.slice(0, Math.ceil(n / 2));
  const left = items.slice(Math.ceil(n / 2));
  const rows = Math.max(right.length, left.length);
  const halfW = 56 + W + 28;
  const cx = Math.max(halfW, Math.min(p.stage.w - halfW, p.anchor.x));
  const cy = Math.max(rows * 20 + 26, Math.min(p.stage.h - rows * 20 - 26, p.anchor.y));
  const place = (list: MenuNode[], side: 1 | -1) =>
    list.map((node, k) => {
      const y = (k - (list.length - 1) / 2) * (H + 5);
      const bulge = 24 * Math.cos((y / (rows * 21 + 1)) * (Math.PI / 2));
      const x = side * (52 + bulge);
      const idx = side === 1 ? k : right.length + k;
      return { node, x, y, side, idx };
    });
  const spots = [...place(right, 1), ...place(left, -1)];

  return (
    <div class="sl-menu-scrim" onPointerDown={(e) => e.target === e.currentTarget && p.onClose()}>
      <div class="sl-menu" dir="ltr" ref={root} role="menu" aria-label={t.menuAria} onKeyDown={onKey}
        style={{ left: `${cx}px`, top: `${cy}px`, '--sl-tint': tint } as JSX.CSSProperties}>
        <svg class="sl-menu__lines" width="1" height="1" overflow="visible" aria-hidden="true">
          {spots.map((s) => (
            <path key={s.node.path} d={`M0 0 Q ${s.x * 0.45} ${s.y * 0.2} ${s.x - s.side * 4} ${s.y}`} />
          ))}
        </svg>
        <button type="button" class="sl-hub" onClick={back} aria-label={stack.length ? t.back : t.closeMenu}>{stack.length ? '‹' : '✕'}</button>
        {crumb && <span class="sl-menu__crumb" dir="auto">{crumb}</span>}
        {spots.map((s) => (
          <button
            key={s.node.path}
            type="button"
            role="menuitem"
            class={`sl-petal sl-petal--${s.side === 1 ? 'r' : 'l'}`}
            style={{ '--x': `${s.x}px`, '--y': `${s.y}px`, '--i': s.idx, width: `${W}px`, height: `${H}px` } as JSX.CSSProperties}
            onClick={() => pick(s.node)}
          >
            <span dir="auto">{lab(s.node)}</span>
            {s.node.children?.length && !s.node.graded ? <b aria-hidden="true">›</b> : s.node.graded ? <b aria-hidden="true">#</b> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
