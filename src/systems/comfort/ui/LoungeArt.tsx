import type { JSX } from 'preact';
import { useId, useMemo } from 'preact/hooks';
import { createRng } from '@core';
import { cx } from '@ui-kit';
import { centerOf } from './hooks';

export interface LoungeArtProps {
  lampOn: boolean;
  /** Bumped on each sip: retriggers the steam puff. */
  sip: number;
  /** Bumped on each pet: the cat's ear twitch. */
  pet: number;
  quiet: boolean;
  /** Narrow screens keep the cosy corner (cat, lamp) in frame. */
  align?: 'center' | 'right';
  onCat: (e: { x: number; y: number }) => void;
  onCoffee: (e: { x: number; y: number }) => void;
  onLamp: () => void;
  class?: string;
}

const SNELLEN = [
  { t: 'E', s: 34 },
  { t: 'F P', s: 20 },
  { t: 'T O Z', s: 14 },
  { t: 'L P E D', s: 10 },
  { t: 'P E C F D', s: 7.5 },
  { t: 'E D F C Z P', s: 5.5 },
];

/**
 * Keyboard + pointer activation for an SVG group acting as a button.
 * NB: the attribute must be the lowercase `tabindex` — Preact writes props on
 * SVG elements verbatim, and SVG ignores the camelCase `tabIndex` spelling, which
 * would leave the control unreachable by keyboard.
 */
export function act(fn: (p: { x: number; y: number }) => void) {
  return {
    role: 'button' as const,
    tabindex: 0,
    onClick: (e: MouseEvent) => fn(centerOf(e.currentTarget as Element)),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn(centerOf(e.currentTarget as Element));
      }
    },
  };
}

/**
 * The Lounge, painted procedurally: an arched observatory window with a
 * stained-glass fanlight and rain sliding down the glass, a monstera in a
 * glazed pot, a velvet armchair with a sleeping cat, a brass floor lamp and
 * a coffee that never goes cold. A framed Snellen chart, because of course.
 */
export function LoungeArt(p: LoungeArtProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const u = (n: string) => `url(#${id}-${n})`;

  const scene = useMemo(() => {
    const rng = createRng('lounge-art');
    const rain = Array.from({ length: 64 }, () => ({
      x: 285 + rng.next() * 370,
      len: 14 + rng.next() * 26,
      dur: 0.55 + rng.next() * 0.6,
      delay: -rng.next() * 2,
      o: 0.18 + rng.next() * 0.35,
    }));
    const drops = Array.from({ length: 16 }, () => ({
      x: 300 + rng.next() * 340,
      y: 60 + rng.next() * 300,
      r: 1.6 + rng.next() * 2.8,
      dur: 6 + rng.next() * 10,
      delay: -rng.next() * 12,
      slide: rng.next() < 0.6,
    }));
    const stars = Array.from({ length: 46 }, () => ({
      x: 285 + rng.next() * 370,
      y: 24 + rng.next() * 220,
      r: 0.4 + rng.next() * 1.1,
      d: rng.next() * 4,
    }));
    const lights = Array.from({ length: 22 }, () => ({
      x: 290 + rng.next() * 360,
      y: 330 + rng.next() * 50,
      w: 2 + rng.next() * 3,
    }));
    return { rain, drops, stars, lights };
  }, []);

  // stained-glass fanlight: 7 radial panes in the arch above the spring line
  const fan = useMemo(() => {
    const cx = 470;
    const cy = 210;
    const R = 186;
    const panes = ['#38bdf8', '#a78bfa', '#f472b6', '#ffd27a', '#f472b6', '#a78bfa', '#38bdf8'];
    return panes.map((c, i) => {
      const a0 = Math.PI + (i * Math.PI) / panes.length;
      const a1 = Math.PI + ((i + 1) * Math.PI) / panes.length;
      const r0 = 46;
      const pt = (a: number, r: number) => `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
      return { c, d: `M${pt(a0, r0)} L${pt(a0, R)} A${R} ${R} 0 0 1 ${pt(a1, R)} L${pt(a1, r0)} A${r0} ${r0} 0 0 0 ${pt(a0, r0)} Z` };
    });
  }, []);

  const windowPath = 'M284 400 V210 A186 186 0 0 1 656 210 V400 Z';

  return (
    <svg
      class={cx('cf-art', !p.lampOn && 'is-dim', p.quiet && 'is-quiet', p.class)}
      viewBox="-300 0 1500 520"
      preserveAspectRatio={p.align === 'right' ? 'xMaxYMid slice' : 'xMidYMid slice'}
      role="group"
      aria-label="The Lounge: a rainy arched window, a warm lamp, a sleeping cat in an armchair and a steaming coffee"
    >
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#160e2c" />
          <stop offset="0.7" stop-color="#1f1338" />
          <stop offset="1" stop-color="#170d2a" />
        </linearGradient>
        <pattern id={`${id}-paper`} width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M14 4 l3 6 -3 6 -3 -6z" fill="#ffd27a" opacity="0.045" />
          <rect x="0" width="1" height="28" fill="#ffd27a" opacity="0.03" />
        </pattern>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2a1830" />
          <stop offset="1" stop-color="#0c0612" />
        </linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#070d26" />
          <stop offset="0.55" stop-color="#16244e" />
          <stop offset="1" stop-color="#3b3468" />
        </linearGradient>
        <radialGradient id={`${id}-moon`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#e8f4ff" stop-opacity="0.9" />
          <stop offset="0.2" stop-color="#bfe3ff" stop-opacity="0.45" />
          <stop offset="1" stop-color="#7dd3fc" stop-opacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-lamp`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffe2a6" stop-opacity="0.75" />
          <stop offset="0.35" stop-color="#ffc56b" stop-opacity="0.28" />
          <stop offset="1" stop-color="#ff9e3d" stop-opacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff1cf" />
          <stop offset="1" stop-color="#f2b25a" />
        </linearGradient>
        <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#7a4d10" />
          <stop offset="0.5" stop-color="#ffd27a" />
          <stop offset="1" stop-color="#7a4d10" />
        </linearGradient>
        <linearGradient id={`${id}-velvet`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5b3477" />
          <stop offset="1" stop-color="#2a1640" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6fcf97" />
          <stop offset="1" stop-color="#1f5c45" />
        </linearGradient>
        <linearGradient id={`${id}-pot`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#0d3b4a" />
          <stop offset="0.45" stop-color="#1f7f8f" />
          <stop offset="1" stop-color="#0b2a36" />
        </linearGradient>
        <linearGradient id={`${id}-cat`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e59b57" />
          <stop offset="1" stop-color="#9c5524" />
        </linearGradient>
        <linearGradient id={`${id}-spill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7dd3fc" stop-opacity="0.16" />
          <stop offset="1" stop-color="#7dd3fc" stop-opacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-rug`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#5a2a3e" />
          <stop offset="0.7" stop-color="#3b1a33" />
          <stop offset="1" stop-color="#22101f" />
        </radialGradient>
        <linearGradient id={`${id}-drape`} x1="0" y1="0" x2="0.12" y2="0" spreadMethod="reflect">
          <stop offset="0" stop-color="#3a1d52" />
          <stop offset="0.55" stop-color="#5d3380" />
          <stop offset="1" stop-color="#26113a" />
        </linearGradient>
        <linearGradient id={`${id}-drapeShade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a0614" stop-opacity="0.55" />
          <stop offset="0.25" stop-color="#0a0614" stop-opacity="0" />
          <stop offset="1" stop-color="#0a0614" stop-opacity="0.35" />
        </linearGradient>
        <clipPath id={`${id}-win`}>
          <path d={windowPath} />
        </clipPath>
      </defs>

      {/* ── room ─────────────────────────────────────────────── */}
      <rect x="-300" width="1500" height="520" fill={u('wall')} />
      <rect x="-300" width="1500" height="440" fill={u('paper')} />
      <rect x="-300" y="356" width="1500" height="84" fill="#120a20" opacity="0.7" />
      <path d="M-300 356 H1200" stroke="#ffd27a" stroke-opacity="0.16" />
      {[-260, -90, 40, 230, 700, 1010].map((x) => (
        <rect key={x} x={x} y="372" width="150" height="54" rx="3" fill="none" stroke="#ffd27a" stroke-opacity="0.07" />
      ))}
      <rect x="-300" y="440" width="1500" height="80" fill={u('floor')} />
      {[-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <path key={i} d={`M${i * 150 - 40} 520 L${i * 150 + 20} 440`} stroke="#000" stroke-opacity="0.18" />
      ))}
      <ellipse cx="660" cy="478" rx="330" ry="34" fill={u('rug')} />
      <ellipse cx="660" cy="478" rx="300" ry="26" fill="none" stroke="#ffd27a" stroke-opacity="0.18" stroke-dasharray="2 6" />

      {/* window light spilling onto the floor */}
      <path d="M284 440 L656 440 L760 520 L200 520 Z" fill={u('spill')} class="cf-art__spill" />

      {/* ── window ───────────────────────────────────────────── */}
      <g clip-path={u('win')}>
        <rect x="280" y="0" width="380" height="410" fill={u('sky')} />
        <circle cx="578" cy="96" r="80" fill={u('moon')} class="cf-art__moon" />
        <circle cx="578" cy="96" r="13" fill="#eef7ff" opacity="0.85" />
        {scene.stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" class="cf-art__star" style={{ animationDelay: `${s.d}s` }} />
        ))}
        {/* hills, observatory dome and a sleepy town */}
        <path d="M280 352 C340 320 400 330 450 314 C520 292 590 318 660 300 V410 H280 Z" fill="#14183a" />
        <path d="M500 310 a30 30 0 0 1 60 0 z" fill="#1c2150" />
        <rect x="526" y="282" width="8" height="16" fill="#1c2150" transform="rotate(-24 530 290)" />
        <path d="M280 372 h40 v-22 h18 v14 h26 v-30 h20 v38 h34 v-18 h22 v24 h40 v-34 h16 v34 h36 v-16 h30 v20 h40 v-12 h38 V410 H280 Z" fill="#0d1030" />
        {scene.lights.map((l, i) => (
          <rect key={i} x={l.x} y={l.y} width={l.w} height={l.w * 1.3} fill="#ffcf7a" opacity="0.65" class="cf-art__townlight" style={{ animationDelay: `${i * 0.37}s` }} />
        ))}
        {/* rain beyond the glass */}
        <g class="cf-art__rain">
          {scene.rain.map((r, i) => (
            <line
              key={i}
              x1={r.x}
              y1={0}
              x2={r.x - r.len * 0.18}
              y2={r.len}
              stroke="#cfe6ff"
              stroke-width="1.1"
              stroke-linecap="round"
              opacity={r.o}
              style={{ animationDuration: `${r.dur}s`, animationDelay: `${r.delay}s` }}
            />
          ))}
        </g>
        {/* stained-glass fanlight */}
        <g class="cf-art__fan">
          {fan.map((f, i) => (
            <path key={i} d={f.d} fill={f.c} opacity="0.26" stroke="#0a0614" stroke-width="3" />
          ))}
          <circle cx="470" cy="210" r="46" fill="#0a0614" opacity="0.6" />
          <circle cx="470" cy="210" r="34" fill="#38bdf8" opacity="0.3" />
          <circle cx="470" cy="210" r="15" fill="#0a0614" opacity="0.8" />
          <circle cx="465" cy="205" r="4" fill="#e8f7ff" opacity="0.8" />
        </g>
        {/* droplets on the glass */}
        {scene.drops.map((d, i) => (
          <g key={i} class={cx('cf-art__drop', d.slide && 'is-sliding')} style={{ animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }}>
            <circle cx={d.x} cy={d.y} r={d.r} fill="#d6ecff" opacity="0.22" />
            <circle cx={d.x - d.r * 0.3} cy={d.y - d.r * 0.35} r={d.r * 0.35} fill="#fff" opacity="0.7" />
          </g>
        ))}
        <rect x="280" y="0" width="380" height="410" fill="#7dd3fc" opacity="0.035" />
      </g>
      {/* mullions + brass frame */}
      <g stroke={u('brass')} fill="none">
        <path d={windowPath} stroke-width="9" />
        <path d="M470 24 V400 M284 300 H656 M284 210 H656" stroke-width="4" />
      </g>
      <path d={windowPath} fill="none" stroke="#fff4da" stroke-opacity="0.25" stroke-width="1" />
      <rect x="266" y="398" width="408" height="14" rx="3" fill="#3a2230" />
      <rect x="266" y="398" width="408" height="3" rx="1.5" fill="#ffd27a" opacity="0.35" />

      {/* velvet curtains: tied back, drawn almost closed in quiet mode */}
      <g aria-hidden="true">
        <g class="cf-art__curtain cf-art__curtain--l">
          <path d="M244 14 H452 C450 140 446 300 440 418 C400 428 330 426 252 420 C246 300 244 140 244 14 Z" fill={u('drape')} />
          <path d="M244 14 H452 C450 140 446 300 440 418 C400 428 330 426 252 420 C246 300 244 140 244 14 Z" fill={u('drapeShade')} />
          <path d="M252 420 C330 426 400 428 440 418" stroke="#ffd27a" stroke-opacity="0.35" stroke-width="2" fill="none" />
        </g>
        <g class="cf-art__curtain cf-art__curtain--r">
          <path d="M696 14 H488 C490 140 494 300 500 418 C540 428 610 426 688 420 C694 300 696 140 696 14 Z" fill={u('drape')} />
          <path d="M696 14 H488 C490 140 494 300 500 418 C540 428 610 426 688 420 C694 300 696 140 696 14 Z" fill={u('drapeShade')} />
          <path d="M688 420 C610 426 540 428 500 418" stroke="#ffd27a" stroke-opacity="0.35" stroke-width="2" fill="none" />
        </g>
        <path class="cf-art__tie" d="M244 262 C256 270 278 270 292 258" stroke="#ffd27a" stroke-width="4" stroke-linecap="round" fill="none" />
        <path class="cf-art__tie" d="M696 262 C684 270 662 270 648 258" stroke="#ffd27a" stroke-width="4" stroke-linecap="round" fill="none" />
        <rect x="232" y="8" width="476" height="7" rx="3.5" fill={u('brass')} />
        <circle cx="230" cy="11.5" r="8" fill={u('brass')} />
        <circle cx="710" cy="11.5" r="8" fill={u('brass')} />
      </g>

      {/* ── framed Snellen chart ─────────────────────────────── */}
      <g transform="translate(868 70)">
        <rect x="-6" y="-6" width="112" height="168" rx="4" fill={u('brass')} />
        <rect width="100" height="156" rx="2" fill="#f4ecdc" />
        <rect width="100" height="156" rx="2" fill="#ffd27a" opacity="0.08" />
        {SNELLEN.reduce<{ y: number; els: JSX.Element[] }>(
          (acc, row, i) => {
            const y = acc.y + row.s + 3;
            acc.els.push(
              <text key={i} x="50" y={y} text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size={row.s} fill="#1a1020" letter-spacing={row.s * 0.25}>
                {row.t}
              </text>,
            );
            return { y: y + 3, els: acc.els };
          },
          { y: 6, els: [] },
        ).els}
      </g>

      {/* ── plant ────────────────────────────────────────────── */}
      {/* ── bookcase + sconce (left wall) ───────────────────── */}
      <g opacity="0.9">
        <rect x="-250" y="96" width="170" height="344" rx="4" fill="#1a0f2c" stroke="#ffd27a" stroke-opacity="0.12" />
        {[0, 1, 2, 3].map((r) => (
          <g key={r}>
            <rect x="-242" y={170 + r * 70} width="154" height="6" fill="#2b1840" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((b) => {
              const h = 38 + ((b * 7 + r * 11) % 22);
              const w = 10 + ((b * 5 + r * 3) % 8);
              const x = -238 + b * 16.5;
              const c = ['#3b2a63', '#5b2342', '#1d4e6b', '#6b4a12', '#2f5a45'][(b + r) % 5];
              return b * 16.5 + w < 150 ? <rect key={b} x={x} y={170 + r * 70 - h} width={w} height={h} rx="1.5" fill={c} opacity="0.85" /> : null;
            })}
          </g>
        ))}
        <circle cx="-120" cy="140" r="16" fill="#0f2a3a" stroke="#ffd27a" stroke-opacity="0.4" />
        <circle cx="-120" cy="140" r="7" fill="#38bdf8" opacity="0.45" />
      </g>
      <g transform="translate(-30 150)">
        <circle r="70" fill={u('lamp')} opacity="0.55" class="cf-art__sconce" />
        <path d="M-6 30 h12 v-18 h-12z" fill={u('brass')} />
        <path d="M-14 12 L-8 -10 H8 L14 12 Z" fill={u('shade')} opacity="0.9" />
      </g>

      <g class="cf-art__plant" transform="translate(110 0)">
        <g class="cf-art__leaves">
          <path d="M175 380 C150 300 90 280 70 230 C120 240 170 280 175 380 Z" fill={u('leaf')} />
          <path d="M178 380 C170 290 200 220 250 180 C250 250 220 320 178 380 Z" fill={u('leaf')} />
          <path d="M172 380 C130 330 120 270 140 200 C170 260 180 320 172 380 Z" fill={u('leaf')} opacity="0.9" />
          <path d="M182 382 C220 340 270 330 300 290 C290 350 240 380 182 382 Z" fill={u('leaf')} />
          <path d="M176 380 C176 320 160 250 180 150 C200 240 192 320 176 380 Z" fill={u('leaf')} opacity="0.95" />
          <g stroke="#0f3a2c" stroke-width="1.2" fill="none" opacity="0.6">
            <path d="M175 380 C150 310 110 270 75 234" />
            <path d="M178 380 C190 300 215 230 248 184" />
            <path d="M176 380 C180 300 178 220 180 154" />
            <path d="M182 382 C230 360 270 330 298 294" />
          </g>
          <g fill="#0f1a14" opacity="0.5">
            <ellipse cx="120" cy="262" rx="6" ry="3" transform="rotate(30 120 262)" />
            <ellipse cx="226" cy="240" rx="6" ry="3" transform="rotate(-50 226 240)" />
            <ellipse cx="250" cy="340" rx="6" ry="3" transform="rotate(-30 250 340)" />
          </g>
        </g>
        <path d="M138 380 H218 L208 440 H148 Z" fill={u('pot')} />
        <rect x="132" y="374" width="92" height="12" rx="4" fill="#1f7f8f" />
        <rect x="132" y="374" width="92" height="3" rx="1.5" fill="#bdf3ff" opacity="0.35" />
        <path d="M152 396 C170 402 188 402 204 396" stroke="#bdf3ff" stroke-opacity="0.2" fill="none" />
      </g>

      {/* ── side table, books, coffee ────────────────────────── */}
      <g>
        <ellipse cx="740" cy="372" rx="62" ry="12" fill="#3a2230" />
        <ellipse cx="740" cy="369" rx="62" ry="12" fill="#5a3446" />
        <ellipse cx="740" cy="367" rx="58" ry="9" fill="#ffd27a" opacity="0.06" />
        <path d="M736 380 V440 M744 380 V440" stroke={u('brass')} stroke-width="4" />
        <ellipse cx="740" cy="442" rx="30" ry="5" fill="#000" opacity="0.4" />
        <rect x="694" y="350" width="52" height="9" rx="2" fill="#1d4e6b" />
        <rect x="698" y="341" width="46" height="9" rx="2" fill="#7c2d4f" />
        <rect x="692" y="332" width="50" height="9" rx="2" fill="#a16207" />
        <path d="M696 336 h40 M700 345 h38 M698 354 h42" stroke="#ffd27a" stroke-opacity="0.35" stroke-width="0.8" />
        <g class="cf-art__coffee" {...act(p.onCoffee)} aria-label="Sip your coffee">
          <rect x="740" y="262" width="96" height="108" fill="transparent" />
          <ellipse cx="784" cy="362" rx="22" ry="5" fill="#efe6d8" />
          <path d="M768 336 H800 L797 358 C796 362 772 362 771 358 Z" fill="#f6efe4" />
          <path d="M800 341 C812 341 812 354 798 354" stroke="#f6efe4" stroke-width="3.5" fill="none" />
          <ellipse cx="784" cy="337" rx="16" ry="3.6" fill="#4a2b17" />
          <ellipse cx="781" cy="336.4" rx="5" ry="1.1" fill="#c08a5a" opacity="0.7" />
          <path d="M772 348 h24" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="1.5" />
          <g key={p.sip} class={cx('cf-art__steam', p.sip > 0 && 'is-puff')} stroke="#fff" fill="none" stroke-linecap="round">
            <path d="M778 330 C772 320 786 312 778 300 C772 292 782 284 778 276" stroke-width="2.4" />
            <path d="M786 330 C792 318 780 310 788 298 C794 290 784 282 790 272" stroke-width="2" />
            <path d="M794 330 C798 322 792 316 796 306" stroke-width="1.6" />
          </g>
        </g>
      </g>

      {/* ── armchair + cat ───────────────────────────────────── */}
      <g>
        <path d="M850 260 C850 228 870 214 940 214 C1010 214 1030 228 1030 260 V372 H850 Z" fill={u('velvet')} />
        <path d="M864 262 C868 240 884 232 940 232 C996 232 1012 240 1016 262" stroke="#c4a0e8" stroke-opacity="0.2" fill="none" stroke-width="2" />
        {[890, 940, 990].map((x) => (
          <circle key={x} cx={x} cy="270" r="2.4" fill="#ffd27a" opacity="0.5" />
        ))}
        <rect x="842" y="350" width="196" height="46" rx="14" fill="#4a2a63" />
        <rect x="842" y="350" width="196" height="8" rx="4" fill="#c4a0e8" opacity="0.18" />
        <path d="M826 300 C826 284 852 284 852 300 V404 H826 Z" fill="#5b3477" />
        <path d="M1028 300 C1028 284 1054 284 1054 300 V404 H1028 Z" fill="#5b3477" />
        <rect x="826" y="396" width="228" height="20" rx="6" fill="#2a1640" />
        <path d="M842 416 l-4 26 M1038 416 l4 26" stroke={u('brass')} stroke-width="5" stroke-linecap="round" />

        <g class="cf-art__cat" {...act(p.onCat)} aria-label="Pet the clinic cat">
          <rect x="866" y="272" width="152" height="96" fill="transparent" />
          <g class="cf-art__cat-body">
            <path d="M884 352 C878 322 914 306 952 308 C990 310 1004 330 998 352 Z" fill={u('cat')} />
            <path d="M900 330 C920 322 940 322 958 326" stroke="#7a3e16" stroke-width="2.4" fill="none" opacity="0.5" />
            <path d="M908 340 C930 334 952 334 972 338" stroke="#7a3e16" stroke-width="2.4" fill="none" opacity="0.45" />
            <path d="M958 314 C964 322 968 330 970 340" stroke="#7a3e16" stroke-width="2.2" fill="none" opacity="0.4" />
          </g>
          <path class="cf-art__tail" d="M996 350 C1014 352 1010 364 990 364 C960 366 920 364 900 358" stroke={u('cat')} stroke-width="11" stroke-linecap="round" fill="none" />
          <g class="cf-art__cat-head" key={p.pet}>
            <path d="M876 338 C870 318 884 308 900 310 C916 312 922 326 918 340 C912 352 884 352 876 338 Z" fill="#e59b57" />
            <path class="cf-art__ear" d="M880 318 L878 296 L894 310 Z" fill="#e59b57" />
            <path class="cf-art__ear cf-art__ear--r" d="M904 310 L916 294 L916 316 Z" fill="#e59b57" />
            <path d="M882 314 L881 302 L890 310 Z M907 311 L913 302 L913 314 Z" fill="#f7b9a1" opacity="0.8" />
            <path d="M884 330 q5 3 10 0 M902 330 q5 3 10 0" stroke="#4a230b" stroke-width="1.8" fill="none" stroke-linecap="round" />
            <path d="M896 336 l2 2 2 -2" stroke="#8a3d1e" stroke-width="1.3" fill="#f7a4a4" />
            <path d="M880 338 h-10 M880 341 l-9 3 M914 338 h10 M914 341 l9 3" stroke="#fff4da" stroke-width="0.8" opacity="0.6" />
          </g>
          <text class="cf-art__zzz" x="930" y="296" font-family="Georgia, serif" font-size="14" fill="#c4e8ff">z</text>
          <text class="cf-art__zzz cf-art__zzz--2" x="944" y="282" font-family="Georgia, serif" font-size="11" fill="#c4e8ff">z</text>
        </g>
      </g>

      {/* quiet mode: the room settles into a softer, dimmer hush (the lamp stays warm) */}
      <rect class="cf-art__hush" x="-300" width="1500" height="520" fill="#06031a" aria-hidden="true" />

      {/* ── floor lamp ───────────────────────────────────────── */}
      <g>
        <circle class="cf-art__lamp-glow" cx="1110" cy="150" r="300" fill={u('lamp')} />
        <path d="M1110 170 V436" stroke={u('brass')} stroke-width="5" />
        <ellipse cx="1110" cy="440" rx="34" ry="7" fill="#7a4d10" />
        <ellipse cx="1110" cy="438" rx="30" ry="5" fill="#d9962a" />
        <g class="cf-art__lampshade" {...act(() => p.onLamp())} aria-label={p.lampOn ? 'Dim the lamp' : 'Light the lamp'} aria-pressed={p.lampOn}>
          <rect x="1046" y="96" width="128" height="128" fill="transparent" />
          <path d="M1062 168 L1078 104 H1142 L1158 168 Z" fill={u('shade')} />
          <path d="M1062 168 H1158" stroke="#a86d17" stroke-width="3" />
          <path d="M1078 104 H1142" stroke="#a86d17" stroke-width="2" />
          <path class="cf-art__bulb" d="M1068 168 L1152 168 L1170 220 H1050 Z" fill="#ffe2a6" opacity="0.18" />
          <path d="M1090 112 L1080 160" stroke="#fff" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round" />
        </g>
      </g>

      {/* warm pool of light on the rug */}
      <ellipse class="cf-art__pool" cx="980" cy="470" rx="230" ry="44" fill="#ffc56b" opacity="0.12" />
    </svg>
  );
}
