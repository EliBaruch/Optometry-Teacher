import { useEffect, useRef, useState } from 'preact/hooks';
import type { EventBus, GameEvents, SfxId } from '@core';
import { useOptionalServices } from '../context';
import { useSfx } from '../hooks/useSfx';
import { Icon, IconOrText, type IconName } from '../icons/Icon';
import { TONE_COLOR } from '../lib/palette';
import { cx } from '../lib/cx';
import './ToastHost.css';
import { useUiStrings } from '../strings';

type ToastPayload = GameEvents['toast'];
type ToastTone = NonNullable<ToastPayload['tone']>;

interface ToastItem extends ToastPayload {
  id: number;
  leaving: boolean;
}

const TONE_ICON: Record<ToastTone, IconName> = { info: 'info', good: 'check', bad: 'warning', epic: 'sparkle' };
const TONE_SFX: Record<ToastTone, SfxId> = { info: 'pop', good: 'success', bad: 'error', epic: 'rare' };
const TONE_TINT: Record<ToastTone, string> = { info: TONE_COLOR.info, good: TONE_COLOR.good, bad: TONE_COLOR.bad, epic: TONE_COLOR.gold };

export interface ToastHostProps {
  /** Defaults to services.bus from the ServicesProvider. */
  bus?: EventBus;
  /** 'auto' (default): below the top bar, or at the bottom on touch phones. */
  position?: 'top' | 'bottom' | 'auto';
  max?: number;
  /** ms on screen (epic toasts stay 1.5× longer) */
  duration?: number;
}

/** Stacks `toast` events from the bus; auto-dismiss, click to dismiss, tone colours. Mount once per app/scene. */
export function ToastHost({ bus, position = 'auto', max = 4, duration = 3600 }: ToastHostProps) {
  const ui = useUiStrings();
  const services = useOptionalServices();
  const source = bus ?? services?.bus;
  const play = useSfx();
  const [items, setItems] = useState<ToastItem[]>([]);
  const [paused, setPaused] = useState(false);
  /** Auto-dismiss clocks; paused while the stack is hovered or focused (WCAG 2.2.1). */
  const clocks = useRef(new Map<number, { remaining: number; started: number; timer: ReturnType<typeof setTimeout> | null }>());
  const exits = useRef(new Set<ReturnType<typeof setTimeout>>());
  const pausedRef = useRef(false);
  const hover = useRef(false);
  const focus = useRef(false);
  const seq = useRef(0);

  const dismiss = (id: number) => {
    const c = clocks.current.get(id);
    if (c?.timer) clearTimeout(c.timer);
    clocks.current.delete(id);
    setItems((list) => list.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    const t = setTimeout(() => {
      exits.current.delete(t);
      setItems((list) => list.filter((x) => x.id !== id));
    }, 320);
    exits.current.add(t);
  };
  const arm = (id: number) => {
    const c = clocks.current.get(id);
    if (!c) return;
    c.started = Date.now();
    c.timer = setTimeout(() => dismiss(id), c.remaining);
  };
  const syncPause = () => {
    const next = hover.current || focus.current;
    if (next === pausedRef.current) return;
    pausedRef.current = next;
    setPaused(next);
    clocks.current.forEach((c, id) => {
      if (next) {
        if (c.timer) clearTimeout(c.timer);
        c.timer = null;
        c.remaining = Math.max(400, c.remaining - (Date.now() - c.started));
      } else arm(id);
    });
  };

  useEffect(() => {
    if (!source) return;
    const off = source.on('toast', (p) => {
      const id = ++seq.current;
      const tone = p.tone ?? 'info';
      play(TONE_SFX[tone], { volume: 0.5 });
      setItems((list) => {
        const next = [...list, { ...p, id, leaving: false }];
        if (next.length <= max) return next;
        const dropped = next.slice(0, next.length - max);
        for (const d of dropped) {
          const c = clocks.current.get(d.id);
          if (c?.timer) clearTimeout(c.timer);
          clocks.current.delete(d.id);
        }
        return next.slice(next.length - max);
      });
      clocks.current.set(id, { remaining: tone === 'epic' ? duration * 1.5 : duration, started: Date.now(), timer: null });
      if (!pausedRef.current) arm(id);
    });
    return () => {
      off();
      clocks.current.forEach((c) => c.timer && clearTimeout(c.timer));
      clocks.current.clear();
      exits.current.forEach(clearTimeout);
      exits.current.clear();
    };
  }, [source]);

  return (
    <div
      class={cx('lm-toasts', `lm-toasts--${position}`, paused && 'is-paused')}
      role="status"
      aria-live="polite"
      aria-relevant="additions"
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') {
          hover.current = true;
          syncPause();
        }
      }}
      onPointerLeave={() => {
        hover.current = false;
        syncPause();
      }}
      onFocusIn={() => {
        focus.current = true;
        syncPause();
      }}
      onFocusOut={(e) => {
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
          focus.current = false;
          syncPause();
        }
      }}
    >
      {items.map((t) => {
        const tone = t.tone ?? 'info';
        return (
          <button
            type="button"
            key={t.id}
            class={cx('lm-toast', `lm-toast--${tone}`, t.leaving && 'is-leaving')}
            style={{ '--toast-c': TONE_TINT[tone] }}
            onClick={() => dismiss(t.id)}
            aria-label={ui.dismiss(t.message)}
          >
            <span class="lm-toast__icon">{t.icon ? <IconOrText icon={t.icon} /> : <Icon name={TONE_ICON[tone]} />}</span>
            <span class="lm-toast__msg">{t.message}</span>
            <span class="lm-toast__timer" style={{ animationDuration: `${tone === 'epic' ? duration * 1.5 : duration}ms` }} />
          </button>
        );
      })}
    </div>
  );
}
