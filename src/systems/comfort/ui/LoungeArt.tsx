import type { JSX } from 'preact';
import { useId, useMemo } from 'preact/hooks';
import { createRng, pickStrings } from '@core';
import { cx, useOptionalServices } from '@ui-kit';
import { S } from '../strings';
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
 * The Lounge, painted procedurally as a bright modern staff room: an arched
 * window onto a sunny sky, a monstera in a white pot, a light sofa with a
 * napping cat, a graphite floor lamp, a coffee machine with a steaming cup and
 * a framed Snellen chart, because of course.
 */
export function LoungeArt(p: LoungeArtProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const t = pickStrings(S, useOptionalServices()?.locale ?? 'en');
  const u = (n: string) => `url(#${id}-${n})`;

  const scene = useMemo(() => {
    const rng = createRng('lounge-art');
    const clouds = Array.from({ length: 4 }, (_, i) => ({
      x: 300 + i * 90 + rng.next() * 40,
      y: 70 + rng.next() * 150,
      s: 0.7 + rng.next() * 0.7,
      dur: 24 + rng.next() * 18,
      delay: -rng.next() * 20,
    }));
    return { clouds };
  }, []);

  const windowPath = 'M284 400 V210 A186 186 0 0 1 656 210 V400 Z';

  return (
    <svg
      class={cx('cf-art', !p.lampOn && 'is-dim', p.quiet && 'is-quiet', p.class)}
      viewBox="-300 0 1500 520"
      preserveAspectRatio={p.align === 'right' ? 'xMaxYMid slice' : 'xMidYMid slice'}
      role="group"
      aria-label={t.artAria}
    >
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f7f9fe" />
          <stop offset="1" stop-color="#e6edf9" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#efe3cf" />
          <stop offset="1" stop-color="#dcc9a8" />
        </linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7fc4ff" />
          <stop offset="0.6" stop-color="#bfe3ff" />
          <stop offset="1" stop-color="#eaf6ff" />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stop-color="#fff7d6" stop-opacity="1" />
          <stop offset="0.35" stop-color="#ffe9a3" stop-opacity="0.7" />
          <stop offset="1" stop-color="#ffe9a3" stop-opacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-lamp`}>
          <stop offset="0" stop-color="#fff4c9" stop-opacity="0.75" />
          <stop offset="1" stop-color="#fff4c9" stop-opacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-spill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff6d8" stop-opacity="0.75" />
          <stop offset="1" stop-color="#fff6d8" stop-opacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3fd08a" />
          <stop offset="1" stop-color="#0f9d63" />
        </linearGradient>
        <linearGradient id={`${id}-sofa`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9db8ff" />
          <stop offset="1" stop-color="#6f93f5" />
        </linearGradient>
        <linearGradient id={`${id}-cat`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffb86b" />
          <stop offset="1" stop-color="#f0933f" />
        </linearGradient>
        <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#cfd6e4" />
          <stop offset="0.5" stop-color="#f4f6fb" />
          <stop offset="1" stop-color="#b9c2d4" />
        </linearGradient>
        <clipPath id={`${id}-win`}>
          <path d={windowPath} />
        </clipPath>
      </defs>

      {/* ── room shell ───────────────────────────────────────── */}
      <rect x="-300" y="0" width="1500" height="440" fill={u('wall')} />
      <rect x="-300" y="428" width="1500" height="14" fill="#ffffff" />
      <rect x="-300" y="440" width="1500" height="80" fill={u('floor')} />
      <path d="M-300 440 H1200" stroke="#0a1633" stroke-opacity="0.06" />
      <ellipse cx="940" cy="478" rx="330" ry="26" fill="#bcd0ff" opacity="0.55" />
      <ellipse cx="940" cy="476" rx="300" ry="20" fill="#d7e3ff" opacity="0.8" />
      <path d="M284 440 L656 440 L760 520 L200 520 Z" fill={u('spill')} class="cf-art__spill" />

      {/* ── window: sunny sky ────────────────────────────────── */}
      <g clip-path={`url(#${id}-win)`}>
        <rect x="284" y="20" width="372" height="390" fill={u('sky')} />
        <circle cx="578" cy="104" r="96" fill={u('sun')} class="cf-art__moon" />
        <circle cx="578" cy="104" r="22" fill="#fff6c9" />
        {scene.clouds.map((c, i) => (
          <g key={i} class="cf-art__cloud" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
            <g transform={`translate(${c.x.toFixed(0)} ${c.y.toFixed(0)}) scale(${c.s.toFixed(2)})`} fill="#fff" opacity="0.92">
              <ellipse cx="0" cy="0" rx="46" ry="14" />
              <ellipse cx="-16" cy="-10" rx="22" ry="14" />
              <ellipse cx="14" cy="-14" rx="26" ry="16" />
            </g>
          </g>
        ))}
        <path d="M284 372 C340 340 380 352 430 336 C490 318 530 346 590 330 C620 322 640 330 656 326 V410 H284 Z" fill="#a9d4f5" opacity="0.9" />
        <path d="M284 392 C350 368 410 380 470 366 C540 350 600 380 656 364 V410 H284 Z" fill="#7fc2a0" opacity="0.85" />
        {[318, 352, 388, 428].map((x, i) => (
          <rect key={x} x={x} y={352 - (i % 2) * 16} width="22" height={44 + (i % 2) * 16} rx="3" fill="#ffffff" opacity="0.7" />
        ))}
      </g>
      <path d={windowPath} fill="none" stroke="#ffffff" stroke-width="12" />
      <path d={windowPath} fill="none" stroke="#0a1633" stroke-opacity="0.12" stroke-width="1" />
      <path d="M470 30 V400 M284 262 H656" stroke="#ffffff" stroke-width="7" opacity="0.95" />
      <rect x="268" y="400" width="404" height="14" rx="6" fill="#ffffff" />
      <rect x="268" y="400" width="404" height="3" rx="1.5" fill="#0a1633" opacity="0.06" />
      <path d="M284 410 L656 410 L700 440 L240 440 Z" fill="#fff8e0" opacity="0.6" class="cf-art__spill" />

      {/* ── sheer curtains (drawn closed in quiet mode) ──────── */}
      <g>
        <rect x="236" y="8" width="468" height="8" rx="4" fill="#cfd6e4" />
        <g class="cf-art__curtain cf-art__curtain--l">
          <path d="M244 12 H466 V404 C440 396 420 404 396 398 C370 392 340 402 316 396 C292 392 268 400 244 396 Z" fill="#ffffff" opacity="0.7" />
          <path d="M290 12 V396 M340 12 V398 M392 12 V396 M440 12 V402" stroke="#0a1633" stroke-opacity="0.05" />
        </g>
        <g class="cf-art__curtain cf-art__curtain--r">
          <path d="M696 12 H474 V404 C500 396 520 404 544 398 C570 392 600 402 624 396 C648 392 672 400 696 396 Z" fill="#ffffff" opacity="0.7" />
          <path d="M650 12 V396 M600 12 V398 M548 12 V396 M500 12 V402" stroke="#0a1633" stroke-opacity="0.05" />
        </g>
        <path class="cf-art__tie" d="M244 262 C256 270 278 270 292 258" stroke="#2257f0" stroke-width="4" stroke-linecap="round" fill="none" />
        <path class="cf-art__tie" d="M696 262 C684 270 662 270 648 258" stroke="#2257f0" stroke-width="4" stroke-linecap="round" fill="none" />
      </g>

      {/* ── framed Snellen chart ─────────────────────────────── */}
      <g transform="translate(868 70)">
        <rect x="-8" y="-8" width="116" height="172" rx="10" fill="#ffffff" />
        <rect x="-8" y="-8" width="116" height="172" rx="10" fill="none" stroke="#0a1633" stroke-opacity="0.1" />
        <rect width="100" height="156" rx="4" fill="#fbfcff" />
        {SNELLEN.reduce<{ y: number; els: JSX.Element[] }>(
          (acc, row, i) => {
            const y = acc.y + row.s + 3;
            acc.els.push(
              <text key={i} x="50" y={y} text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size={row.s} fill="#0a1633" letter-spacing={row.s * 0.25}>
                {row.t}
              </text>,
            );
            return { y: y + 3, els: acc.els };
          },
          { y: 6, els: [] },
        ).els}
      </g>

      {/* ── plant ────────────────────────────────────────────── */}
      <g class="cf-art__plant" transform="translate(110 0)">
        <g class="cf-art__leaves">
          <path d="M175 380 C150 300 90 280 70 230 C120 240 170 280 175 380 Z" fill={u('leaf')} />
          <path d="M178 380 C170 290 200 220 250 180 C250 250 220 320 178 380 Z" fill={u('leaf')} />
          <path d="M172 380 C130 330 120 270 140 200 C170 260 180 320 172 380 Z" fill={u('leaf')} opacity="0.92" />
          <path d="M182 382 C220 340 270 330 300 290 C290 350 240 380 182 382 Z" fill={u('leaf')} />
          <path d="M176 380 C176 320 160 250 180 150 C200 240 192 320 176 380 Z" fill={u('leaf')} opacity="0.96" />
          <g stroke="#ffffff" stroke-width="1.3" fill="none" opacity="0.5">
            <path d="M175 380 C150 310 110 270 75 234" />
            <path d="M178 380 C190 300 215 230 248 184" />
            <path d="M176 380 C180 300 178 220 180 154" />
            <path d="M182 382 C230 360 270 330 298 294" />
          </g>
        </g>
        <path d="M138 380 H218 L208 440 H148 Z" fill="#ffffff" />
        <path d="M138 380 H218 L208 440 H148 Z" fill="none" stroke="#0a1633" stroke-opacity="0.1" />
        <rect x="132" y="374" width="92" height="12" rx="6" fill="#ffffff" />
        <rect x="132" y="374" width="92" height="12" rx="6" fill="none" stroke="#0a1633" stroke-opacity="0.1" />
        <ellipse cx="178" cy="443" rx="34" ry="5" fill="#0a1633" opacity="0.1" />
      </g>

      {/* ── counter, coffee machine, cup ─────────────────────── */}
      <g>
        <rect x="672" y="372" width="196" height="14" rx="7" fill="#ffffff" />
        <rect x="672" y="372" width="196" height="14" rx="7" fill="none" stroke="#0a1633" stroke-opacity="0.1" />
        <rect x="684" y="386" width="172" height="54" rx="6" fill="#f1f5fc" />
        <rect x="684" y="386" width="172" height="54" rx="6" fill="none" stroke="#0a1633" stroke-opacity="0.08" />
        <path d="M770 392 V434" stroke="#0a1633" stroke-opacity="0.08" />
        <rect x="690" y="290" width="54" height="82" rx="10" fill={u('steel')} />
        <rect x="690" y="290" width="54" height="82" rx="10" fill="none" stroke="#0a1633" stroke-opacity="0.15" />
        <rect x="698" y="298" width="38" height="20" rx="5" fill="#0a1633" />
        <circle cx="708" cy="308" r="3" fill="#00c875" />
        <rect x="716" y="305" width="14" height="3" rx="1.5" fill="#579bfc" />
        <rect x="716" y="310" width="10" height="3" rx="1.5" fill="#ffffff" opacity="0.6" />
        <rect x="708" y="322" width="18" height="10" rx="2" fill="#0a1633" opacity="0.8" />
        <rect x="696" y="356" width="42" height="10" rx="3" fill="#cfd6e4" />
        <rect x="694" y="344" width="46" height="8" rx="2" fill="#579bfc" opacity="0" />
        <g class="cf-art__coffee" {...act(p.onCoffee)} aria-label={t.sip}>
          <rect x="740" y="262" width="96" height="108" fill="transparent" />
          <ellipse cx="784" cy="370" rx="24" ry="5" fill="#e3e9f5" />
          <path d="M768 336 H800 L797 360 C796 364 772 364 771 360 Z" fill="#ffffff" />
          <path d="M768 336 H800 L797 360 C796 364 772 364 771 360 Z" fill="none" stroke="#0a1633" stroke-opacity="0.18" />
          <path d="M800 341 C812 341 812 354 798 354" stroke="#ffffff" stroke-width="3.5" fill="none" />
          <path d="M800 341 C812 341 812 354 798 354" stroke="#0a1633" stroke-opacity="0.18" stroke-width="0.8" fill="none" />
          <ellipse cx="784" cy="337" rx="16" ry="3.6" fill="#7a4524" />
          <ellipse cx="781" cy="336.4" rx="5" ry="1.1" fill="#d7a77a" opacity="0.8" />
          <path d="M772 350 h24" stroke="#2257f0" stroke-opacity="0.7" stroke-width="2" stroke-linecap="round" />
          <g key={p.sip} class={cx('cf-art__steam', p.sip > 0 && 'is-puff')} stroke="#8a95ab" fill="none" stroke-linecap="round">
            <path d="M778 330 C772 320 786 312 778 300 C772 292 782 284 778 276" stroke-width="2.4" />
            <path d="M786 330 C792 318 780 310 788 298 C794 290 784 282 790 272" stroke-width="2" />
            <path d="M794 330 C798 322 792 316 796 306" stroke-width="1.6" />
          </g>
        </g>
      </g>

      {/* ── sofa + cat ───────────────────────────────────────── */}
      <g>
        <path d="M850 260 C850 228 870 214 940 214 C1010 214 1030 228 1030 260 V372 H850 Z" fill={u('sofa')} />
        <path d="M864 262 C868 240 884 232 940 232 C996 232 1012 240 1016 262" stroke="#ffffff" stroke-opacity="0.5" fill="none" stroke-width="2" />
        <rect x="842" y="350" width="196" height="46" rx="16" fill="#86a3fa" />
        <rect x="842" y="350" width="196" height="8" rx="4" fill="#ffffff" opacity="0.4" />
        <path d="M826 300 C826 284 852 284 852 300 V404 H826 Z" fill="#7b9af7" />
        <path d="M1028 300 C1028 284 1054 284 1054 300 V404 H1028 Z" fill="#7b9af7" />
        <rect x="826" y="396" width="228" height="20" rx="8" fill="#5d82f0" />
        <path d="M842 416 l-4 26 M1038 416 l4 26" stroke="#2c3a55" stroke-width="5" stroke-linecap="round" />
        <rect x="982" y="300" width="52" height="46" rx="12" fill="#ffd8e9" transform="rotate(8 1008 323)" />

        <g class="cf-art__cat" {...act(p.onCat)} aria-label={t.petCat}>
          <rect x="866" y="272" width="152" height="96" fill="transparent" />
          <g class="cf-art__cat-body">
            <path d="M884 352 C878 322 914 306 952 308 C990 310 1004 330 998 352 Z" fill={u('cat')} />
            <path d="M900 330 C920 322 940 322 958 326" stroke="#c76a1f" stroke-width="2.4" fill="none" opacity="0.5" />
            <path d="M908 340 C930 334 952 334 972 338" stroke="#c76a1f" stroke-width="2.4" fill="none" opacity="0.45" />
            <path d="M958 314 C964 322 968 330 970 340" stroke="#c76a1f" stroke-width="2.2" fill="none" opacity="0.4" />
          </g>
          <path class="cf-art__tail" d="M996 350 C1014 352 1010 364 990 364 C960 366 920 364 900 358" stroke={u('cat')} stroke-width="11" stroke-linecap="round" fill="none" />
          <g class="cf-art__cat-head" key={p.pet}>
            <path d="M876 338 C870 318 884 308 900 310 C916 312 922 326 918 340 C912 352 884 352 876 338 Z" fill="#ffae5a" />
            <path class="cf-art__ear" d="M880 318 L878 296 L894 310 Z" fill="#ffae5a" />
            <path class="cf-art__ear cf-art__ear--r" d="M904 310 L916 294 L916 316 Z" fill="#ffae5a" />
            <path d="M882 314 L881 302 L890 310 Z M907 311 L913 302 L913 314 Z" fill="#ffc9b0" opacity="0.9" />
            <path d="M884 330 q5 3 10 0 M902 330 q5 3 10 0" stroke="#4a230b" stroke-width="1.8" fill="none" stroke-linecap="round" />
            <path d="M896 336 l2 2 2 -2" stroke="#b5502b" stroke-width="1.3" fill="#f7a4a4" />
            <path d="M880 338 h-10 M880 341 l-9 3 M914 338 h10 M914 341 l9 3" stroke="#ffffff" stroke-width="0.8" opacity="0.9" />
          </g>
          <text class="cf-art__zzz" x="930" y="296" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="14" fill="#2257f0">z</text>
          <text class="cf-art__zzz cf-art__zzz--2" x="944" y="282" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="11" fill="#2257f0">z</text>
        </g>
      </g>

      {/* quiet mode: the room softens into a calm pastel haze */}
      <rect class="cf-art__hush" x="-300" width="1500" height="520" fill="#dbe6fa" aria-hidden="true" />

      {/* ── floor lamp ───────────────────────────────────────── */}
      <g>
        <circle class="cf-art__lamp-glow" cx="1110" cy="150" r="260" fill={u('lamp')} />
        <path d="M1110 170 V436" stroke="#2c3a55" stroke-width="5" stroke-linecap="round" />
        <ellipse cx="1110" cy="440" rx="34" ry="7" fill="#2c3a55" />
        <ellipse cx="1110" cy="438" rx="30" ry="5" fill="#56637d" />
        <g class="cf-art__lampshade" {...act(() => p.onLamp())} aria-label={p.lampOn ? t.dimLamp : t.lightLamp} aria-pressed={p.lampOn}>
          <rect x="1046" y="96" width="128" height="128" fill="transparent" />
          <path d="M1062 168 L1078 104 H1142 L1158 168 Z" fill="#ffffff" />
          <path d="M1062 168 L1078 104 H1142 L1158 168 Z" fill="none" stroke="#0a1633" stroke-opacity="0.16" />
          <path d="M1062 168 H1158" stroke="#2c3a55" stroke-width="3" />
          <path class="cf-art__bulb" d="M1068 168 L1152 168 L1170 220 H1050 Z" fill="#fff3bf" opacity="0.5" />
          <path d="M1090 112 L1080 160" stroke="#fff" stroke-opacity="0.8" stroke-width="3" stroke-linecap="round" />
        </g>
      </g>

      <ellipse class="cf-art__pool" cx="980" cy="470" rx="230" ry="44" fill="#fff3bf" opacity="0.45" />
    </svg>
  );
}
