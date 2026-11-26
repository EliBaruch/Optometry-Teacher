/** Shared UI bits: hooks, portraits, sparkline. */
import { useMemo, useState } from 'preact/hooks';
import { createRng, type AvatarSpec, type GameServices } from '@core';
import type { ComponentChildren } from 'preact';
import { useInterval, useLocale, useSignal, useStrings } from '@ui-kit';
import { AvatarBust, generateAvatar } from '@render';
import { rivalsFor, type RivalsController } from '../controller';
import type { RivalsState } from '../league';
import type { Rival } from '../roster';
import { S, rivalText } from '../strings';
import './rivals.css';

/**
 * Controller + the state as displayed now + a clock that ticks so colleagues' points keep growing
 * on screen. The clock is re-read whenever the state changes (a case finished, a nudge fired), and a
 * week that has just ended already reads as rolled (no last-week points against this week's field).
 */
export function useRivals(services: GameServices, tickMs = 30_000): { ctl: RivalsController; state: RivalsState; now: number } {
  const ctl = rivalsFor(services);
  const raw = useSignal(ctl.state);
  const [tick, setTick] = useState(0);
  useInterval(() => setTick((n) => n + 1), tickMs);
  const now = useMemo(() => ctl.now(), [raw, tick]);
  const state = useMemo(() => ctl.view(now), [raw, now]);
  return { ctl, state, now };
}

const specCache = new Map<string, AvatarSpec>();
export function rivalSpec(r: Rival): AvatarSpec {
  let s = specCache.get(r.id);
  if (!s) {
    const base = generateAvatar(createRng(r.avatar.seed), { age: r.avatar.age, sex: r.avatar.sex });
    s = { ...base, ...r.avatar.look, headwear: 'none' };
    specCache.set(r.id, s);
  }
  return s;
}

export function RivalPortrait(props: { rival: Rival; size?: number; animated?: boolean; reduced?: boolean; class?: string }) {
  const { rival, size = 44 } = props;
  const locale = useLocale();
  const spec = useMemo(() => rivalSpec(rival), [rival.id]);
  return (
    <span class={`rv-portrait ${props.class ?? ''}`} style={{ '--rv-c': rival.color, width: `${size}px`, height: `${size}px` }}>
      <AvatarBust
        spec={spec}
        age={rival.avatar.age}
        sex={rival.avatar.sex}
        size={size}
        ring={rival.color}
        animated={props.animated}
        reducedMotion={props.reduced}
        label={rivalText(rival, locale).name}
      />
    </span>
  );
}

/** The player's medallion: an azure disc with their initial. */
export function PlayerPortrait(props: { name: string; size?: number; class?: string }) {
  const t = useStrings(S);
  const size = props.size ?? 44;
  const initial = (props.name.replace(/^dr\.?\s*/i, '').trim()[0] ?? 'Y').toUpperCase();
  return (
    <span class={`rv-portrait rv-portrait--you ${props.class ?? ''}`} style={{ width: `${size}px`, height: `${size}px` }} role="img" aria-label={t.youAria}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id="rv-you-g" cx="50%" cy="32%" r="70%">
            <stop offset="0" stop-color="#5c87ff" />
            <stop offset="0.55" stop-color="#2257f0" />
            <stop offset="1" stop-color="#1b45c4" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="23" fill="url(#rv-you-g)" />
        <circle cx="24" cy="24" r="23" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1" />
        <ellipse cx="19" cy="12" rx="12" ry="6" fill="#fff" opacity="0.22" />
        <text x="24" y="31" text-anchor="middle" font-family="Plus Jakarta Sans Variable, Inter Variable, system-ui, sans-serif" font-size="21" font-weight="800" fill="#ffffff">
          {initial}
        </text>
      </svg>
    </span>
  );
}

export interface Series {
  id: string;
  color: string;
  points: { t: number; p: number }[];
  highlight?: boolean;
  label?: string;
}

/**
 * Multi-line sparkline over a fixed time window. Lines use non-scaling strokes so the chart
 * can stretch to any width; end dots are HTML so they stay round.
 */
export function Sparkline(props: { series: Series[]; t0: number; t1: number; height?: number; days?: boolean; nowAt?: number; class?: string; label: string }) {
  const { series, t0, t1, height = 64 } = props;
  const t = useStrings(S);
  const W = 1000;
  const H = 300;
  const maxP = Math.max(10, ...series.flatMap((s) => s.points.map((p) => p.p))) * 1.08;
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * W;
  const y = (p: number) => H - (p / maxP) * (H - 12) - 6;
  const path = (pts: { t: number; p: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.p).toFixed(1)}`).join(' ');
  const ordered = [...series].sort((a, b) => Number(!!a.highlight) - Number(!!b.highlight));
  const gid = `rv-area-${props.label.replace(/\W/g, '')}`;
  return (
    <div class={`rv-spark ${props.class ?? ''}`} style={{ height: `${height}px` }} role="img" aria-label={props.label} dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2257f0" stop-opacity="0.22" />
            <stop offset="1" stop-color="#2257f0" stop-opacity="0" />
          </linearGradient>
        </defs>
        {props.days &&
          Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1={((i + 1) * W) / 7} x2={((i + 1) * W) / 7} y1="0" y2={H} class="rv-spark__grid" vector-effect="non-scaling-stroke" />
          ))}
        {ordered.map((s) => {
          if (s.points.length < 2) return null;
          const d = path(s.points);
          const last = s.points[s.points.length - 1]!;
          return (
            <g key={s.id} class={s.highlight ? 'rv-spark__you' : 'rv-spark__rival'}>
              {s.highlight && <path d={`${d} L${x(last.t).toFixed(1)},${H} L${x(s.points[0]!.t).toFixed(1)},${H} Z`} fill={`url(#${gid})`} stroke="none" />}
              <path d={d} fill="none" stroke={s.color} stroke-width={s.highlight ? 2.6 : 1.5} vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" class="rv-spark__line" pathLength={1} />
            </g>
          );
        })}
      </svg>
      {ordered.map((s) => {
        const last = s.points[s.points.length - 1];
        if (!last) return null;
        return (
          <span
            key={s.id}
            class={`rv-spark__dot${s.highlight ? ' is-you' : ''}`}
            style={{ left: `${(x(last.t) / W) * 100}%`, top: `${(y(last.p) / H) * 100}%`, '--rv-c': s.color }}
          />
        );
      })}
      {props.nowAt !== undefined && props.nowAt < t1 && (
        <span class="rv-spark__now" style={{ left: `${(x(props.nowAt) / W) * 100}%` }} aria-hidden="true">
          <span>{t.now}</span>
        </span>
      )}
      {props.days && (
        <div class="rv-spark__days" aria-hidden="true">
          {t.weekdays.map((d) => <span key={d}>{d}</span>)}
        </div>
      )}
    </div>
  );
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

/** The edition's ordinal ("3rd" / "מקום 3"). */
export function useOrdinal(): (n: number) => string {
  return useStrings(S).ordinal;
}

/**
 * Tiny inline markup for strings with a bold run: `**x**` is a bold number, `__x__` a bold name
 * in the given colour. Keeps word order in the string table, so Hebrew can reorder freely.
 */
export function Rich(props: { text: string; color?: string }): ComponentChildren {
  const parts = props.text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') ? <b key={i} class="lm-num" dir="ltr">{p.slice(2, -2)}</b>
        : p.startsWith('__') ? <b key={i} style={props.color ? { color: `color-mix(in srgb, ${props.color} 62%, #0a1633)` } : undefined}>{p.slice(2, -2)}</b>
        : p,
      )}
    </>
  );
}
