import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import { useStrings } from '@ui-kit';
import { S } from '../strings';
import { itemById, type CatalogItem, type ThemePalette } from '../catalog';

/* ── Eyewear frames (SVG, 200×80) ─────────────────────────────────────── */

interface FrameShape {
  lens: string; // left lens path (mirrored for right)
  bridge: string;
  temples?: string;
  stroke: number;
  extra?: () => JSX.Element | null;
  /** vertical offset of the lens glint */
  glintY?: number;
}

const mirror = 'translate(200 0) scale(-1 1)';

const SHAPES: Record<string, FrameShape> = {
  'clinic-classic': {
    lens: 'M20 22 Q20 18 26 18 H82 Q88 18 88 24 V50 Q88 62 74 62 H32 Q20 62 20 50 Z',
    bridge: 'M88 28 Q100 20 112 28', temples: 'M20 24 L4 22 M180 24 L196 22', stroke: 5,
  },
  'half-eye': {
    lens: 'M22 38 H86 V48 Q86 62 70 62 H38 Q22 62 22 48 Z',
    bridge: 'M86 42 Q100 34 114 42', temples: 'M22 40 L4 36 M178 40 L196 36', stroke: 3.5, glintY: 18,
  },
  windsor: {
    lens: 'M54 16 A26 26 0 1 1 53.9 16 Z',
    bridge: 'M80 36 Q100 22 120 36', temples: 'M28 38 L4 34 M172 38 L196 34', stroke: 2.4,
  },
  browline: {
    lens: 'M22 22 Q22 18 28 18 H82 Q88 18 88 24 V44 Q88 62 70 62 H38 Q22 62 22 46 Z',
    bridge: 'M88 26 Q100 20 112 26', temples: 'M22 24 L4 22 M178 24 L196 22', stroke: 2,
    extra: () => (
      <g>
        <path d="M18 20 Q18 14 28 14 H84 Q92 14 92 22 V30 Q70 26 50 28 Q30 30 18 34 Z" fill="currentColor" />
        <path d="M182 20 Q182 14 172 14 H116 Q108 14 108 22 V30 Q130 26 150 28 Q170 30 182 34 Z" fill="currentColor" />
        <path d="M92 22 Q100 18 108 22" stroke="currentColor" stroke-width="5" fill="none" />
      </g>
    ),
  },
  'cat-eye': {
    lens: 'M14 18 Q40 22 86 24 Q90 26 88 36 Q84 60 58 62 Q28 62 22 44 Q18 30 14 18 Z',
    bridge: 'M88 30 Q100 22 112 30', temples: 'M16 20 L4 18 M184 20 L196 18', stroke: 5,
  },
  aviator: {
    lens: 'M22 20 Q54 14 86 22 Q92 26 88 40 Q80 66 52 66 Q24 64 20 40 Q18 26 22 20 Z',
    bridge: 'M86 24 Q100 18 114 24', temples: 'M22 22 L4 20 M178 22 L196 20', stroke: 2.4,
    extra: () => <path d="M80 18 Q100 12 120 18" stroke="currentColor" stroke-width="2.4" fill="none" />,
  },
  'tortoise-keyhole': {
    lens: 'M24 26 Q24 16 40 16 H74 Q88 16 88 30 V44 Q88 64 62 64 H48 Q24 64 24 44 Z',
    bridge: 'M88 34 Q92 22 100 22 Q108 22 112 34', temples: 'M24 26 L4 24 M176 26 L196 24', stroke: 7,
  },
  'gilded-pince-nez': {
    lens: 'M56 20 A28 22 0 1 1 55.9 20 Z',
    bridge: 'M84 38 Q90 26 100 26 Q110 26 116 38', stroke: 2.2,
    extra: () => (
      <g fill="none" stroke="currentColor">
        <path d="M172 52 Q186 72 170 80 Q140 92 120 86" stroke-width="1.4" stroke-dasharray="2.2 1.6" />
        <circle cx="100" cy="26" r="3.2" fill="currentColor" />
      </g>
    ),
  },
};

export function FrameArt(props: { id: string; width?: number | string; class?: string }) {
  const uid = 'eco-fr-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const shape = SHAPES[props.id] ?? SHAPES['clinic-classic']!;
  const item = itemById(props.id);
  const tint = item?.tint ?? '#2a2233';
  const tortoise = props.id === 'tortoise-keyhole';
  const metal = ['windsor', 'aviator', 'gilded-pince-nez', 'browline'].includes(props.id);
  const stroke = tortoise ? `url(#${uid}-tort)` : metal ? `url(#${uid}-metal)` : `url(#${uid}-acetate)`;
  const w = props.width ?? 200;
  return (
    <svg
      viewBox="0 0 200 92" width={typeof w === 'number' ? `${w}px` : w} aria-hidden="true" focusable="false"
      class={`eco-frame${props.class ? ' ' + props.class : ''}`} style={{ color: props.id === 'browline' ? '#1d1a20' : tint }}
    >
      <defs>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d9ecff" stop-opacity=".28" />
          <stop offset="0.45" stop-color="#9fc2ff" stop-opacity=".08" />
          <stop offset="1" stop-color="#ffd27a" stop-opacity=".16" />
        </linearGradient>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff3cf" />
          <stop offset="0.5" stop-color={tint} />
          <stop offset="1" stop-color="#6b4512" />
        </linearGradient>
        <linearGradient id={`${uid}-acetate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={tint} stop-opacity=".9" />
          <stop offset="0.25" stop-color="#ffffff" stop-opacity=".35" />
          <stop offset="0.4" stop-color={tint} />
          <stop offset="1" stop-color={tint} />
        </linearGradient>
        <pattern id={`${uid}-tort`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
          <rect width="14" height="14" fill="#7a4a1e" />
          <ellipse cx="4" cy="5" rx="3.5" ry="2" fill="#2e1608" />
          <ellipse cx="11" cy="11" rx="2.5" ry="1.5" fill="#c08040" />
          <ellipse cx="10" cy="3" rx="1.8" ry="1" fill="#1d0c04" />
        </pattern>
      </defs>
      {shape.temples && <path d={shape.temples} stroke={stroke} stroke-width={Math.max(2.5, shape.stroke * 0.7)} stroke-linecap="round" fill="none" />}
      {[undefined, mirror].map((t, i) => (
        <g key={i} transform={t}>
          <path d={shape.lens} fill={`url(#${uid}-glass)`} />
          <path d={shape.lens} fill="none" stroke={stroke} stroke-width={shape.stroke} stroke-linejoin="round" />
          <path d={shape.lens} fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".8" transform="translate(0 -1)" />
          <g transform={`translate(0 ${shape.glintY ?? 0})`}>
            <path d="M36 27 L48 23" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round" />
            <path d="M36 34 L41 32" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round" />
          </g>
        </g>
      ))}
      {shape.extra?.()}
      <path d={shape.bridge} stroke={stroke} stroke-width={Math.max(2.4, shape.stroke * 0.8)} fill="none" stroke-linecap="round" />
    </svg>
  );
}

/* ── Nameplates (styled HTML) ─────────────────────────────────────────── */

export function Nameplate(props: { id: string; name: string; title?: string; size?: 'sm' | 'md' | 'lg'; class?: string }) {
  const t = useStrings(S);
  const name = props.name === 'Doctor' ? t.defaultName : props.name;
  return (
    <div class={`eco-np eco-np--${props.id} eco-np--${props.size ?? 'md'}${props.class ? ' ' + props.class : ''}`}>
      {props.id === 'gilded-marquee' && <span class="eco-np__bulbs" aria-hidden="true" />}
      {props.id === 'star-chart' && <span class="eco-np__stars" aria-hidden="true" />}
      <span class="eco-np__name">{name}</span>
      <span class="eco-np__title">{props.title ?? t.nameplateTitle}</span>
    </div>
  );
}

/* ── Clinic theme swatch: a tiny observatory under that theme's light ──── */

export function ThemeSwatch(props: { item: CatalogItem; class?: string }) {
  const p = props.item.palette!;
  const uid = 'eco-sw-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // Rose window: eight leaded panes cycling through the theme's accent family.
  const panes = [p.accent, p.deep, p.pale, p.deep, p.accent, p.shade, p.pale, p.deep];
  const petal = (i: number) => {
    const a0 = ((i * 45 - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * 45 - 90) * Math.PI) / 180;
    const pt = (a: number, r: number) => `${(80 + Math.cos(a) * r).toFixed(2)} ${(52 + Math.sin(a) * r).toFixed(2)}`;
    return `M${pt(a0, 5)} L${pt(a0, 15)} A15 15 0 0 1 ${pt(a1, 15)} L${pt(a1, 5)} A5 5 0 0 0 ${pt(a0, 5)} Z`;
  };
  return (
    <div
      class={`eco-swatch eco-swatch--${props.item.id}${props.class ? ' ' + props.class : ''}`}
      style={{ '--sw-accent': p.accent, '--sw-deep': p.deep, '--sw-pale': p.pale, '--sw-ink': p.ink, '--sw-sky0': p.sky[0], '--sw-sky1': p.sky[1] }}
      aria-hidden="true"
    >
      <svg viewBox="-40 0 240 100" class="eco-swatch__scene" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id={`${uid}-rib`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color={p.sky[1]} stop-opacity="0" />
            <stop offset="0.45" stop-color={p.sky[1]} stop-opacity=".55" />
            <stop offset="1" stop-color={p.accent} stop-opacity="0" />
          </linearGradient>
          <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color={p.accent} stop-opacity=".55" />
            <stop offset="1" stop-color={p.accent} stop-opacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-sun`} cx="50%" cy="45%" r="55%">
            <stop offset="0" stop-color={p.pale} />
            <stop offset="0.6" stop-color={p.accent} />
            <stop offset="1" stop-color={p.deep} />
          </radialGradient>
          <linearGradient id={`${uid}-dawn`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color={p.sky[1]} stop-opacity="0" />
            <stop offset="1" stop-color={p.sky[1]} stop-opacity=".55" />
          </linearGradient>
          {[[p.accent, p.deep], [p.sky[1], p.accent], [p.pale, p.sky[1]]].map(([a, b], i) => (
            <linearGradient key={i} id={`${uid}-cur${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color={a} stop-opacity="0" />
              <stop offset="0.55" stop-color={a} stop-opacity={i === 2 ? '.35' : '.6'} />
              <stop offset="1" stop-color={b} stop-opacity="0" />
            </linearGradient>
          ))}
          <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0" />
            <stop offset="0.5" stop-color="#fff" stop-opacity="1" />
            <stop offset="1" stop-color="#fff" stop-opacity="0" />
          </linearGradient>
          <pattern id={`${uid}-rays`} width="7" height="100" patternUnits="userSpaceOnUse">
            <rect x="1" width="1.2" height="100" fill={p.pale} opacity=".22" />
            <rect x="4.4" width="0.6" height="100" fill={p.pale} opacity=".12" />
          </pattern>
          <linearGradient id={`${uid}-beam`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color={p.pale} stop-opacity=".5" />
            <stop offset="1" stop-color={p.pale} stop-opacity="0" />
          </linearGradient>
        </defs>
        {/* sky: a ribbon of the theme's second light, stars and a crescent moon */}
        <path class="eco-swatch__ribbon" d="M-50 34 C-10 12 30 40 100 18 S170 8 210 26 L210 36 C160 22 120 30 100 30 S20 22 -50 46 Z" fill={`url(#${uid}-rib)`} />
        {[[14, 14, 0.9], [34, 30, 0.6], [128, 12, 0.8], [146, 36, 0.6], [112, 34, 0.5], [22, 46, 0.5], [58, 10, 0.7], [-24, 20, 0.8], [-10, 52, 0.5], [176, 16, 0.7], [188, 48, 0.6], [-30, 70, 0.4], [180, 74, 0.4]].map(([x, y, r], i) => (
          <circle key={i} class="eco-swatch__star" cx={x} cy={y} r={r} fill={p.pale} style={{ '--i': i }} />
        ))}
        <Motif id={props.item.id} p={p} uid={uid} />
        {/* the observatory: slit beam, dome, rose window, colonnade */}
        <path d="M76 40 L70 -4 H90 L84 40 Z" fill={`url(#${uid}-beam)`} />
        <circle cx="80" cy="52" r="30" fill={`url(#${uid}-halo)`} />
        <path d="M44 100 V60 A36 34 0 0 1 116 60 V100 Z" fill="#07040e" />
        <path d="M44 60 A36 34 0 0 1 116 60" fill="none" stroke={p.accent} stroke-opacity=".55" stroke-width="1" />
        <path d="M77 27 H83 V40 H77 Z" fill={p.pale} opacity=".8" />
        <circle cx="80" cy="52" r="17" fill="#120a1c" />
        {panes.map((c, i) => <path key={i} d={petal(i)} fill={c} opacity=".92" />)}
        <circle cx="80" cy="52" r="4.2" fill={p.pale} />
        <circle cx="80" cy="52" r="15.6" fill="none" stroke="#120a1c" stroke-width="1.2" />
        <path d="M40 74 H120 V78 H40 Z" fill={p.shade} opacity=".9" />
        {[52, 64, 96, 108].map((x) => <rect key={x} x={x - 2} y="78" width="4" height="22" fill={p.deep} opacity=".55" />)}
        <path d="M30 100 Q80 86 130 100 Z" fill="#050309" />
        {props.item.id === 'candlelight' && <Candles p={p} />}
      </svg>
      {props.item.id === 'aurora' && <span class="eco-swatch__shimmer" />}
      <span class="eco-swatch__dots">
        <i style={{ background: p.pale }} />
        <i style={{ background: p.accent }} />
        <i style={{ background: p.deep }} />
        <i style={{ background: p.shade }} />
      </span>
    </div>
  );
}

/** Crescent moon shared by several skies. */
const Crescent = ({ fill, x = 136, y = 22 }: { fill: string; x?: number; y?: number }) => (
  <path d={`M${x} ${y} a8 8 0 1 0 6 -11 a6.4 6.4 0 1 1 -6 11 Z`} fill={fill} opacity=".85" />
);

/** Each theme's sky gets its own signature, so the six read apart at a glance. */
function Motif({ id, p, uid }: { id: string; p: ThemePalette; uid: string }) {
  switch (id) {
    case 'moonstone':
      return (
        <g>
          <circle cx="128" cy="24" r="20" fill={p.pale} opacity=".12" />
          <circle cx="128" cy="24" r="10" fill={p.pale} />
          <circle cx="124.5" cy="21" r="2.2" fill={p.deep} opacity=".35" />
          <circle cx="131" cy="27.5" r="1.6" fill={p.deep} opacity=".3" />
          <circle cx="130" cy="19.5" r="1" fill={p.deep} opacity=".3" />
          <path class="eco-swatch__beam" d="M120 30 L60 74 L66 78 L124 34 Z" fill={p.pale} opacity=".22" />
        </g>
      );
    case 'rose-quartz':
      return (
        <g>
          <rect x="-50" y="58" width="260" height="44" fill={`url(#${uid}-dawn)`} />
          <circle cx="16" cy="91" r="30" fill={`url(#${uid}-halo)`} />
          <circle class="eco-swatch__sun" cx="16" cy="91" r="12" fill={`url(#${uid}-sun)`} />
          <path d="M-50 92 Q-10 86 30 93 T130 94 T210 90 V100 H-50 Z" fill="#0a0612" opacity=".92" />
          <Crescent fill={p.pale} />
        </g>
      );
    case 'jade-lantern':
      return (
        <g>
          <Crescent fill={p.pale} x={140} y={24} />
          {[[20, 30, 0], [142, 44, 1]].map(([x, y, i]) => (
            <g key={i} class="eco-swatch__lantern" style={{ '--i': i, transformOrigin: `${x}px 0px` }}>
              <path d={`M${x} 0 V${y! - 8}`} stroke={p.pale} stroke-opacity=".4" stroke-width=".6" />
              <circle cx={x} cy={y} r="12" fill={p.accent} opacity=".16" />
              <path d={`M${x! - 3} ${y! - 8} h6 l2 3 v10 l-2 3 h-6 l-2 -3 v-10 z`} fill={p.deep} />
              <path d={`M${x! - 1.2} ${y! - 4} h2.4 v8 h-2.4 z`} fill={p.pale} opacity=".9" />
            </g>
          ))}
        </g>
      );
    case 'amethyst-hour':
      return (
        <g>
          <circle cx="132" cy="24" r="7.5" fill={p.deep} />
          <path d="M126 22 a7.5 7.5 0 0 1 12 -3" fill="none" stroke={p.pale} stroke-opacity=".7" stroke-width="1.4" />
          <ellipse cx="132" cy="24" rx="15" ry="3.6" fill="none" stroke={p.pale} stroke-opacity=".75" stroke-width="1" transform="rotate(-18 132 24)" />
          <path class="eco-swatch__meteor" d="M20 8 L44 20" stroke={p.pale} stroke-width="1.2" stroke-linecap="round" />
        </g>
      );
    case 'aurora':
      return (
        <g class="eco-swatch__curtains">
          {[
            ['M-140 10 C-60 -4 0 24 70 8 S170 -2 320 14 L320 54 C220 40 130 60 70 46 S-40 46 -140 60 Z', 0],
            ['M-140 22 C-40 8 40 36 90 20 S200 10 320 28 L320 62 C230 48 140 68 90 54 S-20 54 -140 68 Z', 1],
            ['M-140 2 C-40 8 30 -6 80 4 S190 12 320 0 L320 36 C220 30 130 42 80 30 S-20 26 -140 38 Z', 2],
          ].map(([d, i]) => (
            <g key={i as number} class="eco-swatch__curtain" style={{ '--i': i }}>
              <path d={d as string} fill={`url(#${uid}-cur${i})`} />
              <mask id={`${uid}-m${i}`}>
                <path d={d as string} fill={`url(#${uid}-fade)`} />
              </mask>
              <rect x="-140" y="-10" width="460" height="90" fill={`url(#${uid}-rays)`} mask={`url(#${uid}-m${i})`} />
            </g>
          ))}
          <Crescent fill={p.pale} x={140} y={22} />
        </g>
      );
    default: // candlelight: the crescent; its candles stand in front (see Candles)
      return <Crescent fill={p.pale} />;
  }
}

/** Candlelight's two candles on the colonnade, drawn in front of the dome. */
const Candles = ({ p }: { p: ThemePalette }) => (
  <g>
    {[38, 122].map((x, i) => (
      <g key={x}>
        <circle cx={x} cy="66" r="9" fill={p.accent} opacity=".2" />
        <rect x={x - 1.6} y="68" width="3.2" height="6" rx="0.8" fill={p.pale} opacity=".85" />
        <path class="eco-swatch__flame" style={{ '--i': i, transformOrigin: `${x}px 68px` }} d={`M${x} 59 C${x + 3.2} 63 ${x + 2.6} 67.5 ${x} 68 C${x - 2.6} 67.5 ${x - 3.2} 63 ${x} 59 Z`} fill={p.accent} />
        <path d={`M${x} 62.5 C${x + 1.2} 64.5 ${x + 1} 66.6 ${x} 67 C${x - 1} 66.6 ${x - 1.2} 64.5 ${x} 62.5 Z`} fill="#fff" opacity=".9" />
      </g>
    ))}
  </g>
);

/** Preview art for any catalogue item. */
export function ItemArt(props: { item: CatalogItem; playerName: string; compact?: boolean }) {
  const { item } = props;
  if (item.kind === 'theme') return <ThemeSwatch item={item} />;
  if (item.kind === 'frame') return <FrameArt id={item.id} width="88%" />;
  return <Nameplate id={item.id} name={props.playerName} size={props.compact ? 'sm' : 'md'} />;
}
