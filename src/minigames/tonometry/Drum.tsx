/**
 * The Goldmann measuring drum: a brass knob whose engraved scale (grams; one
 * division = 1 mmHg) turns under a fixed gold index. Drag round it, scroll, or
 * use the arrow keys (Shift = x5, PageUp/PageDown = x10).
 */
import { useEffect, useRef } from 'preact/hooks';
import { clamp, DIAL_MAX, DIAL_MIN } from './optics';
import { useT } from './locale';

const DEG_PER_MMHG = 9;

export interface DrumProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label?: string;
}

export function Drum({ value, onChange, disabled, label }: DrumProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef({ value, onChange, disabled });
  live.current = { value, onChange, disabled };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let drag: { id: number; last: number } | null = null;
    const set = (v: number) => live.current.onChange(clamp(v, DIAL_MIN, DIAL_MAX));
    const angleAt = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    };
    const down = (e: PointerEvent) => {
      if (live.current.disabled) return;
      drag = { id: e.pointerId, last: angleAt(e) };
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
      el.focus();
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const a = angleAt(e);
      let d = a - drag.last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      drag.last = a;
      set(live.current.value + d / DEG_PER_MMHG);
    };
    const up = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) drag = null;
    };
    const wheel = (e: WheelEvent) => {
      if (live.current.disabled) return;
      e.preventDefault();
      set(Math.round(live.current.value) + (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 5 : 1));
    };
    const key = (e: KeyboardEvent) => {
      if (live.current.disabled) return;
      const big = e.shiftKey ? 5 : 1;
      let d = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') d = big;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') d = -big;
      else if (e.key === 'PageUp') d = 10;
      else if (e.key === 'PageDown') d = -10;
      else return;
      e.preventDefault();
      e.stopPropagation();
      set(Math.round(live.current.value) + d);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('keydown', key);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('keydown', key);
    };
  }, []);

  const base = Math.floor(value);
  const ticks = [];
  for (let k = base - 22; k <= base + 22; k++) {
    if (k < DIAL_MIN || k > DIAL_MAX) continue;
    const ang = (k - value) * DEG_PER_MMHG - 90;
    const major = k % 10 === 0;
    const half = k % 5 === 0;
    const r1 = 82;
    const r2 = major ? 70 : half ? 74 : 77;
    const a = (ang * Math.PI) / 180;
    ticks.push(
      <line key={k} x1={100 + Math.cos(a) * r1} y1={100 + Math.sin(a) * r1} x2={100 + Math.cos(a) * r2} y2={100 + Math.sin(a) * r2}
        stroke={major ? '#ffe3a0' : '#c9a35a'} stroke-width={major ? 2.4 : half ? 1.6 : 1} stroke-linecap="round" />,
    );
    if (half) {
      const rt = major ? 57 : 62;
      ticks.push(
        <text key={`t${k}`} x={100 + Math.cos(a) * rt} y={100 + Math.sin(a) * rt} fill={major ? '#ffe3a0' : '#c9a35a'}
          font-size={major ? 12 : 9} font-family="var(--lm-font-num, sans-serif)" font-weight="700" text-anchor="middle" dominant-baseline="central">
          {(k / 10).toFixed(k % 10 === 0 ? 0 : 1)}
        </text>,
      );
    }
  }
  const grip = [];
  for (let i = 0; i < 36; i++) {
    const a = ((i * 10 - value * 4.5) * Math.PI) / 180;
    grip.push(<line key={i} x1={100 + Math.cos(a) * 91} y1={100 + Math.sin(a) * 91} x2={100 + Math.cos(a) * 97} y2={100 + Math.sin(a) * 97} stroke="rgba(0,0,0,0.55)" stroke-width="2.6" />);
  }
  return (
    <div
      ref={ref}
      class="tn-drum"
      dir="ltr"
      tabIndex={0}
      role="slider"
      aria-label={label ?? t.drumLabel}
      aria-valuemin={DIAL_MIN}
      aria-valuemax={DIAL_MAX}
      aria-valuenow={Math.round(value)}
      aria-valuetext={t.drumValue(Math.round(value))}
      aria-disabled={disabled || undefined}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id="tn-brass" cx="35%" cy="30%" r="85%">
            <stop offset="0" stop-color="#ffe9b3" />
            <stop offset="0.45" stop-color="#c8963c" />
            <stop offset="1" stop-color="#4a3010" />
          </radialGradient>
          <radialGradient id="tn-face" cx="50%" cy="45%" r="60%">
            <stop offset="0" stop-color="#241640" />
            <stop offset="1" stop-color="#0a0516" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="99" fill="url(#tn-brass)" />
        {grip}
        <circle cx="100" cy="100" r="88" fill="url(#tn-face)" stroke="#1a0f08" stroke-width="2" />
        {ticks}
        <circle cx="100" cy="100" r="40" fill="url(#tn-brass)" opacity="0.92" />
        <circle cx="100" cy="100" r="34" fill="#12091f" stroke="rgba(255,226,160,0.35)" />
        <text x="100" y="96" text-anchor="middle" font-size="22" font-weight="800" fill="#ffe3a0" font-family="var(--lm-font-num, sans-serif)">{Math.round(value)}</text>
        <text x="100" y="114" text-anchor="middle" font-size="8.5" fill="#c9a35a" letter-spacing="1" font-family="var(--lm-font-ui, sans-serif)">mmHg</text>
        <path d="M100 4 L93 -7 L107 -7 Z" transform="translate(0 14)" fill="#ffd27a" stroke="#4a3010" stroke-width="1" />
      </svg>
    </div>
  );
}
