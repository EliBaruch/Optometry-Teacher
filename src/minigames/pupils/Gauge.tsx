import { useRef } from 'preact/hooks';

export const G_MIN = 2;
export const G_MAX = 9;
export const G_STEP = 0.5;
const SLOT = 46;
const W = SLOT * (G_MAX - G_MIN + 1);
const clampG = (v: number) => Math.max(G_MIN, Math.min(G_MAX, Math.round(v / G_STEP) * G_STEP));

/** A plastic pupil gauge: black half-circles from 2 to 9 mm. Drag, wheel or arrows to pick the one that matches. */
export function Gauge(props: { value: number; onChange: (v: number) => void; label: string; valueText?: (v: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const fromX = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const u = (clientX - r.left) / r.width;
    return clampG(G_MIN - 0.5 + u * (G_MAX - G_MIN + 1));
  };
  const markX = ((props.value - G_MIN + 0.5) / (G_MAX - G_MIN + 1)) * W;
  return (
    <div
      ref={ref}
      dir="ltr"
      class="pu-gauge"
      role="slider"
      tabIndex={0}
      aria-label={props.label}
      aria-valuemin={G_MIN}
      aria-valuemax={G_MAX}
      aria-valuenow={props.value}
      aria-valuetext={props.valueText ? props.valueText(props.value.toFixed(1)) : `${props.value.toFixed(1)} millimetres`}
      onPointerDown={(e) => { drag.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); props.onChange(fromX(e.clientX)); }}
      onPointerMove={(e) => { if (drag.current) props.onChange(fromX(e.clientX)); }}
      onPointerUp={() => { drag.current = false; }}
      onPointerCancel={() => { drag.current = false; }}
      onWheel={(e) => { e.preventDefault(); props.onChange(clampG(props.value + (e.deltaY < 0 ? G_STEP : -G_STEP))); }}
      onKeyDown={(e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? G_STEP : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -G_STEP : 0;
        if (d) { e.preventDefault(); e.stopPropagation(); props.onChange(clampG(props.value + d)); }
      }}
    >
      <svg viewBox={`0 0 ${W} 74`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="pu-gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1330" /><stop offset="1" stop-color="#0a0614" /></linearGradient>
        </defs>
        {Array.from({ length: G_MAX - G_MIN + 1 }, (_, i) => {
          const mm = G_MIN + i;
          const r = mm * 2.15;
          const cx = SLOT * i + SLOT / 2;
          const on = Math.abs(props.value - mm) < 0.26;
          return (
            <g key={mm}>
              <path d={`M ${cx - r} 36 A ${r} ${r} 0 0 1 ${cx + r} 36 Z`} fill="url(#pu-gg)" stroke={on ? '#ffd27a' : 'rgba(255,226,160,0.28)'} stroke-width={on ? 1.6 : 1} />
              <text x={cx} y="56" text-anchor="middle" class="pu-gauge__n" fill={on ? '#ffd27a' : '#a99bbd'}>{mm}</text>
            </g>
          );
        })}
        <line x1="0" x2={W} y1="36" y2="36" stroke="rgba(255,226,160,0.3)" />
        <g style={{ transform: `translateX(${markX}px)`, transition: 'transform 140ms cubic-bezier(.2,.8,.2,1)' }}>
          <path d="M 0 40 l -6 10 h 12 z" fill="#ffd27a" />
          <line x1="0" x2="0" y1="0" y2="36" stroke="#ffd27a" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}
