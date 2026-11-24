import { useEffect, useRef, useState } from 'preact/hooks';
import type { EventBus, GameEvents, SfxId } from '@core';
import { useOptionalServices } from '../context';
import { useSfx } from '../hooks/useSfx';
import { Icon, IconOrText, type IconName } from '../icons/Icon';
import { TONE_COLOR } from '../lib/palette';
import { cx } from '../lib/cx';
import './ToastHost.css';

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
  position?: 'top' | 'bottom';
  max?: number;
  /** ms on screen (epic toasts stay 1.5× longer) */
  duration?: number;
}

/** Stacks `toast` events from the bus; auto-dismiss, click to dismiss, tone colours. Mount once per app/scene. */
export function ToastHost({ bus, position = 'top', max = 4, duration = 3600 }: ToastHostProps) {
  const services = useOptionalServices();
  const source = bus ?? services?.bus;
  const play = useSfx();
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const seq = useRef(0);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };
  const dismiss = (id: number) => {
    setItems((list) => list.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    later(() => setItems((list) => list.filter((x) => x.id !== id)), 320);
  };

  useEffect(() => {
    if (!source) return;
    const off = source.on('toast', (p) => {
      const id = ++seq.current;
      const tone = p.tone ?? 'info';
      play(TONE_SFX[tone], { volume: 0.5 });
      setItems((list) => {
        const next = [...list, { ...p, id, leaving: false }];
        return next.length > max ? next.slice(next.length - max) : next;
      });
      later(() => dismiss(id), tone === 'epic' ? duration * 1.5 : duration);
    });
    return () => {
      off();
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, [source]);

  return (
    <div class={cx('lm-toasts', `lm-toasts--${position}`)} role="status" aria-live="polite" aria-relevant="additions">
      {items.map((t) => {
        const tone = t.tone ?? 'info';
        return (
          <button
            type="button"
            key={t.id}
            class={cx('lm-toast', `lm-toast--${tone}`, t.leaving && 'is-leaving')}
            style={{ '--toast-c': TONE_TINT[tone] }}
            onClick={() => dismiss(t.id)}
            aria-label={`${t.message} (dismiss)`}
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
