/**
 * Procedural flame icon (SVG): three layered tongues + glow + rising embers.
 * Intensity 0..3 follows the combo tier; variants for a protected (iced) or resting flame.
 */
import { useRef } from 'preact/hooks';
import { cx } from '@ui-kit';

let seq = 0;
const nextId = () => `skf${(++seq).toString(36)}`;

export type FlameVariant = 'fire' | 'ice' | 'ember';

const OUTER = 'M30 3C33 14 44 20 49 32C53 41 54 50 52 58C49 70 41 77 32 77C21 77 12 69 11 57C10 47 15 39 20 33C20 40 23 45 27 47C24 36 25 21 30 3Z';
const MID = 'M32 20C35 30 43 37 44.5 49C46 62 40 72 32 72C24 72 18.5 65 18.5 56C18.5 48 23.5 43 27 38C28 44 30 47 32.5 48C30 40 30 30 32 20Z';
const CORE = 'M32.5 40C34.5 48 40 52 40 60C40 66.5 36.5 71 32 71C27.5 71 24.5 67 24.5 61.5C24.5 55 30 51 32.5 40Z';

const PALETTE: Record<FlameVariant, { glow: string; o: [string, string, string]; m: [string, string]; c: [string, string] }> = {
  fire: { glow: '#fb923c', o: ['#ef4444', '#f97316', '#fbbf24'], m: ['#fb923c', '#fde047'], c: ['#fff3a8', '#ffffff'] },
  ice: { glow: '#4eccf5', o: ['#2257f0', '#3b9bff', '#a5e3fb'], m: ['#4eccf5', '#e0f7ff'], c: ['#e0f7ff', '#ffffff'] },
  ember: { glow: '#9a3412', o: ['#9ca3af', '#ea580c', '#fdba74'], m: ['#c2410c', '#fb923c'], c: ['#fb923c', '#fed7aa'] },
};

export interface FlameProps {
  size?: number;
  /** 0 = steady … 3 = white-hot */
  intensity?: number;
  variant?: FlameVariant;
  /** Rising embers (off for tiny chips). */
  embers?: boolean;
  class?: string;
  /** Accessible label; decorative when omitted. */
  label?: string;
}

export function Flame({ size = 48, intensity = 1, variant = 'fire', embers = true, class: klass, label }: FlameProps) {
  // Unique per instance (useId can repeat across portals/HUD roots, which would cross-wire gradients).
  const ref = useRef<string | null>(null);
  if (!ref.current) ref.current = nextId();
  const id = ref.current;
  const p = PALETTE[variant];
  const lvl = Math.max(0, Math.min(3, Math.round(intensity)));
  const hot = variant === 'fire' && lvl >= 3;
  const emberCount = !embers || variant === 'ember' ? 0 : 2 + lvl * 2;
  return (
    <span
      class={cx('sk-flame', `sk-flame--${variant}`, `sk-flame--l${lvl}`, klass)}
      style={{ width: `${size}px`, height: `${size * 1.25}px`, '--sk-glow': p.glow }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      <svg viewBox="0 0 64 80" width="100%" height="100%" overflow="visible">
        <defs>
          <radialGradient id={`${id}g`} cx="50%" cy="68%" r="55%">
            <stop offset="0%" stop-color={p.glow} stop-opacity={0.28 + lvl * 0.08} />
            <stop offset="100%" stop-color={p.glow} stop-opacity="0" />
          </radialGradient>
          <linearGradient id={`${id}o`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color={p.o[0]} />
            <stop offset="45%" stop-color={p.o[1]} />
            <stop offset="100%" stop-color={hot ? '#fde047' : p.o[2]} />
          </linearGradient>
          <linearGradient id={`${id}m`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color={p.m[0]} />
            <stop offset="100%" stop-color={hot ? '#fef9c3' : p.m[1]} />
          </linearGradient>
          <radialGradient id={`${id}c`} cx="50%" cy="78%" r="70%">
            <stop offset="0%" stop-color={hot ? '#ffffff' : p.c[1]} />
            <stop offset="70%" stop-color={p.c[0]} />
            <stop offset="100%" stop-color={p.c[0]} stop-opacity="0.2" />
          </radialGradient>
          <radialGradient id={`${id}b`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
          </radialGradient>
        </defs>
        <ellipse class="sk-flame__halo" cx="32" cy="54" rx={30 + lvl * 4} ry={30 + lvl * 4} fill={`url(#${id}g)`} />
        <g class="sk-flame__body">
          <path class="sk-flame__outer" d={OUTER} fill={`url(#${id}o)`} />
          <path class="sk-flame__mid" d={MID} fill={`url(#${id}m)`} />
          <path class="sk-flame__core" d={CORE} fill={`url(#${id}c)`} />
          {hot && <ellipse class="sk-flame__blue" cx="32" cy="69" rx="7" ry="4" fill={`url(#${id}b)`} />}
        </g>
        {Array.from({ length: emberCount }, (_, i) => (
          <circle
            key={i}
            class="sk-flame__ember"
            cx={22 + ((i * 37) % 22)}
            cy={30 + ((i * 13) % 16)}
            r={0.9 + (i % 3) * 0.45}
            fill={i % 2 ? p.m[1] : p.c[1]}
            style={{ '--sk-d': `${(i * 0.37) % 1.8}s`, '--sk-x': `${((i * 29) % 13) - 6}px`, '--sk-t': `${1.6 + (i % 4) * 0.35}s` }}
          />
        ))}
      </svg>
    </span>
  );
}

/** Small six-armed snowflake glyph for streak freezes. */
export function FreezeGlyph({ size = 14, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <svg class={cx('sk-freeze', dim && 'is-dim')} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none">
        {[0, 60, 120].map((a) => (
          <g key={a} transform={`rotate(${a} 12 12)`}>
            <path d="M12 2.5v19" />
            <path d="M9 5l3 2.5L15 5M9 19l3-2.5 3 2.5" />
          </g>
        ))}
      </g>
    </svg>
  );
}
