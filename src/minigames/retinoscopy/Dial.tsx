import { useEffect, useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import { fmtAxis, wrapPhi } from './optics';

export interface MeridianDialProps {
  /** clinical meridian, 0..179 */
  value: number;
  onChange: (phi: number, how: 'drag' | 'step') => void;
  disabled?: boolean;
  /** shown under the readout when the dial is locked */
  lockedNote?: string;
}

const clamp180 = (a: number) => wrapPhi(a);

/** Rotary sleeve: drag, wheel or arrow keys set the meridian the streak is swept along. */
export function MeridianDial(p: MeridianDialProps) {
  const ref = useRef<SVGSVGElement>(null);
  const live = useRef(p);
  live.current = p;

  useEffect(() => {
    const el = ref.current!;
    let id = -1;
    const angleOf = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      return clamp180((Math.atan2(-dy, dx) * 180) / Math.PI);
    };
    const down = (e: PointerEvent) => {
      if (live.current.disabled) return;
      id = e.pointerId;
      el.setPointerCapture(id);
      el.classList.add('is-grabbed');
      live.current.onChange(Math.round(angleOf(e)) % 180, 'drag');
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      live.current.onChange(Math.round(angleOf(e)) % 180, 'drag');
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      el.classList.remove('is-grabbed');
    };
    let acc = 0;
    const wheel = (e: WheelEvent) => {
      if (live.current.disabled) return;
      e.preventDefault();
      acc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const n = Math.trunc(acc / 40);
      if (n) {
        acc -= n * 40;
        live.current.onChange(clamp180(live.current.value - n * (e.shiftKey ? 5 : 1)), 'step');
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, []);

  const onKey = (e: JSX.TargetedKeyboardEvent<SVGSVGElement>) => {
    if (p.disabled) return;
    const step = e.shiftKey ? 1 : 5;
    const map: Record<string, number> = { ArrowRight: -step, ArrowUp: step, ArrowLeft: step, ArrowDown: -step, PageUp: 15, PageDown: -15 };
    const n = map[e.key];
    if (n !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      p.onChange(clamp180(p.value + n), 'step');
    }
  };

  const ticks: JSX.Element[] = [];
  for (let a = 0; a < 360; a += 5) {
    const major = a % 45 === 0;
    const mid = a % 15 === 0;
    const r1 = 86;
    const r2 = major ? 74 : mid ? 79 : 82;
    const t = (a * Math.PI) / 180;
    ticks.push(
      <line key={a} class={major ? 'is-major' : mid ? 'is-mid' : ''} x1={100 + Math.cos(t) * r1} y1={100 - Math.sin(t) * r1} x2={100 + Math.cos(t) * r2} y2={100 - Math.sin(t) * r2} />,
    );
  }
  const labels = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
    const t = (a * Math.PI) / 180;
    return <text key={a} class="rt-dial__num" x={100 + Math.cos(t) * 64} y={100 - Math.sin(t) * 64}>{a % 180 === 0 && a !== 0 ? 180 : a % 180}</text>;
  });
  const v = p.value;
  return (
    <svg
      ref={ref} class={`rt-dial${p.disabled ? ' is-disabled' : ''}`} viewBox="0 0 200 200" role="slider" tabIndex={p.disabled ? -1 : 0}
      aria-label="Sweep meridian" aria-valuemin={0} aria-valuemax={180} aria-valuenow={Math.round(v) || 180} aria-valuetext={`${fmtAxis(Math.round(v) || 180)} degrees`}
      aria-disabled={p.disabled || undefined} onKeyDown={onKey}
    >
      <defs>
        <linearGradient id="rt-dial-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff0c9" /><stop offset="0.45" stop-color="#d9a64a" /><stop offset="1" stop-color="#6b4512" />
        </linearGradient>
        <radialGradient id="rt-dial-face" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stop-color="#2a1a47" /><stop offset="1" stop-color="#0b0716" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="97" fill="url(#rt-dial-brass)" />
      <circle cx="100" cy="100" r="92" fill="url(#rt-dial-face)" />
      <g class="rt-dial__ticks">{ticks}</g>
      {labels}
      <g class="rt-dial__pointer" style={{ transform: `rotate(${-v}deg)` }}>
        {/* streak: perpendicular to the sweep */}
        <rect x="97.4" y="22" width="5.2" height="156" rx="2.6" class="rt-dial__streak" />
        <line x1="22" y1="100" x2="178" y2="100" class="rt-dial__axis" />
        <path d="M178 100 l-12 -6 v12 z" class="rt-dial__arrow" />
        <path d="M22 100 l12 -6 v12 z" class="rt-dial__arrow" />
      </g>
      <circle cx="100" cy="100" r="14" fill="url(#rt-dial-brass)" />
      <circle cx="100" cy="100" r="9" fill="#150b26" />
      <text x="100" y="104" class="rt-dial__read">{String(Math.round(v) || 180)}</text>
    </svg>
  );
}
