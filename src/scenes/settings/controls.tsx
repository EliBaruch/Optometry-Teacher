import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon, cx, useSfx, useStrings, type IconName } from '@ui-kit';
import { S } from './strings';
import { percent, snapVolume } from './logic';

/* ── Brass slider: a native range input (accessible, touch-friendly) dressed as an instrument dial ── */
export function VolumeSlider(props: {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  value: number;
  accent?: string;
  disabled?: boolean;
  onInput: (v: number) => void;
  /** Fired on release (preview chime). */
  onCommit?: (v: number) => void;
  /** Mute toggle beside the slider. */
  onToggleMute?: () => void;
}) {
  const t = useStrings(S);
  const v = snapVolume(props.value);
  const muted = v === 0;
  return (
    <div class={cx('settings-slider', muted && 'is-muted', props.disabled && 'is-disabled')} style={{ '--val': v, '--acc': props.accent ?? 'var(--lm-gold)' }}>
      <div class="settings-slider__head">
        <label for={props.id} class="settings-slider__label">
          <span class="settings-slider__icon"><Icon name={props.icon} /></span>
          <span>
            <span class="settings-slider__name">{props.label}</span>
            {props.hint && <span class="settings-slider__hint">{props.hint}</span>}
          </span>
        </label>
        <span class="settings-slider__readout lm-num" aria-hidden="true">{percent(v)}</span>
        {props.onToggleMute && (
          <button
            type="button"
            class="settings-slider__mute"
            aria-label={muted ? t.unmute(props.label) : t.mute(props.label)}
            aria-pressed={muted}
            onClick={props.onToggleMute}
          >
            <Icon name={muted ? 'sound-off' : 'sound-on'} />
          </button>
        )}
      </div>
      <div class="settings-slider__track" dir="ltr">
        <div class="settings-slider__ticks" aria-hidden="true">
          {Array.from({ length: 11 }, (_, i) => <span key={i} class={cx(i / 10 <= v + 1e-6 && 'is-lit')} />)}
        </div>
        <input
          id={props.id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(v * 100)}
          disabled={props.disabled}
          aria-valuetext={percent(v)}
          onInput={(e) => props.onInput(snapVolume(Number((e.currentTarget as HTMLInputElement).value) / 100))}
          onChange={(e) => props.onCommit?.(snapVolume(Number((e.currentTarget as HTMLInputElement).value) / 100))}
        />
      </div>
    </div>
  );
}

/* ── Switch row: label, description, optional live preview, and a jewelled toggle ── */
export function SwitchRow(props: {
  id: string;
  label: string;
  description: ComponentChildren;
  icon: IconName;
  checked: boolean;
  onChange: (next: boolean) => void;
  preview?: ComponentChildren;
}) {
  const play = useSfx();
  const labelId = `${props.id}-label`;
  const descId = `${props.id}-desc`;
  return (
    <div class={cx('settings-switch', props.checked && 'is-on')}>
      <span class="settings-switch__icon" aria-hidden="true"><Icon name={props.icon} /></span>
      <div class="settings-switch__text">
        <span id={labelId} class="settings-switch__label">{props.label}</span>
        <span id={descId} class="settings-switch__desc">{props.description}</span>
      </div>
      {props.preview && <div class="settings-switch__preview" aria-hidden="true">{props.preview}</div>}
      <button
        id={props.id}
        type="button"
        role="switch"
        class="settings-switch__toggle"
        aria-checked={props.checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        onClick={() => {
          play(props.checked ? 'back' : 'select', { volume: 0.7 });
          props.onChange(!props.checked);
        }}
      >
        <span class="settings-switch__knob" />
      </button>
    </div>
  );
}

/**
 * Press-and-hold confirmation for destructive actions (pointer, Enter or Space).
 * Releasing early cancels. Works identically with reduced motion (the fill is functional, not decorative).
 */
export function HoldButton(props: { label: string; holdMs?: number; onConfirm: () => void; icon?: IconName }) {
  const t = useStrings(S);
  const hold = props.holdMs ?? 1400;
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const t0 = useRef(-1);
  const fired = useRef(false);
  const play = useSfx();
  const lastTick = useRef(0);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    t0.current = -1;
    if (!fired.current) setProgress(0);
  };
  const start = () => {
    if (raf.current || fired.current) return;
    play('drumroll', { volume: 0.5 });
    const step = (now: number) => {
      if (t0.current < 0) t0.current = now;
      const p = Math.min(1, (now - t0.current) / hold);
      setProgress(p);
      if (now - lastTick.current > 160) {
        lastTick.current = now;
        play('tick', { volume: 0.4, pitch: 0.8 + p * 0.8 });
      }
      if (p >= 1) {
        fired.current = true;
        raf.current = 0;
        props.onConfirm();
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const holding = progress > 0 && progress < 1;
  return (
    <button
      type="button"
      class={cx('settings-hold', progress > 0 && 'is-holding')}
      style={{ '--p': progress }}
      onPointerDown={(e) => {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        } catch {
          /* synthetic / already-released pointer */
        }
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') stop();
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={t.holdAria(props.label)}
    >
      <span class="settings-hold__fill" aria-hidden="true" />
      {/* Both labels share one grid cell, so the button keeps the width of the wider one and nothing reflows mid-hold. */}
      <span class="settings-hold__labels">
        <span class={cx('settings-hold__label', holding && 'is-hidden')} aria-hidden={holding}>
          {props.icon && <Icon name={props.icon} />}
          {props.label}
        </span>
        <span class={cx('settings-hold__label', !holding && 'is-hidden')} aria-hidden={!holding}>
          {props.icon && <Icon name={props.icon} />}
          {t.keepHolding}
        </span>
      </span>
    </button>
  );
}

/** Download / upload tray glyph (the shared icon set has no transfer icons). Inherits the button's icon styling. */
export function TransferGlyph(props: { dir: 'down' | 'up' }) {
  const arrow = props.dir === 'down' ? 'M12 3.5v11m-4.5-4.5L12 14.5 16.5 10' : 'M12 14.5v-11M7.5 8 12 3.5 16.5 8';
  return (
    <svg class="lm-btn__icon settings-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={arrow} />
      <path d="M4 15.5v2.5a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-2.5" />
    </svg>
  );
}
