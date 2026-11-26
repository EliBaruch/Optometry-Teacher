import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import { useStrings } from '@ui-kit';
import { S } from '../strings';
import { itemById, type CatalogItem } from '../catalog';

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
      class={`eco-frame${props.class ? ' ' + props.class : ''}`} style={{ color: props.id === 'browline' ? '#14213d' : tint }}
    >
      <defs>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".75" />
          <stop offset="0.5" stop-color="#bcd2ff" stop-opacity=".3" />
          <stop offset="1" stop-color="#8eaeff" stop-opacity=".22" />
        </linearGradient>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.45" stop-color={tint} />
          <stop offset="1" stop-color={tint} />
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
          <path d={shape.lens} fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".8" transform="translate(0 -1)" />
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

/* ── Clinic theme swatch: a tiny Clinic Glass screen in that theme's colours ── */

export function ThemeSwatch(props: { item: CatalogItem; class?: string }) {
  const p = props.item.palette!;
  const uid = 'eco-sw-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <div
      class={`eco-swatch eco-swatch--${props.item.id}${props.class ? ' ' + props.class : ''}`}
      style={{ '--sw-accent': p.accent, '--sw-deep': p.deep, '--sw-pale': p.pale, '--sw-ink': p.ink, '--sw-sky0': p.sky[0], '--sw-sky1': p.sky[1] }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 100" class="eco-swatch__scene" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${uid}-cap`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color={p.accent} />
            <stop offset="1" stop-color={p.to ?? p.deep} />
          </linearGradient>
          <linearGradient id={`${uid}-gl`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity=".92" />
            <stop offset="1" stop-color="#fff" stop-opacity=".62" />
          </linearGradient>
        </defs>
        {/* the glass card */}
        <rect x="14" y="14" width="132" height="72" rx="14" fill={`url(#${uid}-gl)`} stroke="#fff" stroke-width="1.2" />
        <rect x="14" y="14" width="132" height="72" rx="14" fill="none" stroke="#0a1633" stroke-opacity=".08" />
        {/* editorial heading + body lines */}
        <rect x="26" y="26" width="58" height="7" rx="3.5" fill="#0a1633" />
        <rect x="26" y="38" width="86" height="4" rx="2" fill="#0a1633" opacity=".22" />
        {/* ring numeral */}
        <circle cx="123" cy="35" r="11" fill="none" stroke="#0a1633" stroke-opacity=".1" stroke-width="4" />
        <circle cx="123" cy="35" r="11" fill="none" stroke={p.accent} stroke-width="4" stroke-linecap="round" stroke-dasharray="48 70" transform="rotate(-90 123 35)" />
        {/* the primary capsule */}
        <rect x="26" y="52" width="46" height="16" rx="8" fill={`url(#${uid}-cap)`} />
        <rect x="26" y="52" width="46" height="8" rx="4" fill="#fff" opacity=".22" />
        <rect x="38" y="58.5" width="22" height="3.2" rx="1.6" fill={p.ink} />
        {/* vivid labels */}
        <rect x="78" y="52" width="24" height="16" rx="8" fill="#00c875" />
        <rect x="106" y="52" width="24" height="16" rx="8" fill="#fdab3d" />
        <rect x="84" y="58.5" width="12" height="3.2" rx="1.6" fill="#0a1633" opacity=".75" />
        <rect x="112" y="58.5" width="12" height="3.2" rx="1.6" fill="#0a1633" opacity=".75" />
        {/* progress */}
        <rect x="26" y="75" width="104" height="4" rx="2" fill="#0a1633" opacity=".1" />
        <rect x="26" y="75" width="68" height="4" rx="2" fill={`url(#${uid}-cap)`} />
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

/** Preview art for any catalogue item. */
export function ItemArt(props: { item: CatalogItem; playerName: string; compact?: boolean }) {
  const { item } = props;
  if (item.kind === 'theme') return <ThemeSwatch item={item} />;
  if (item.kind === 'frame') return <FrameArt id={item.id} width="88%" />;
  return <Nameplate id={item.id} name={props.playerName} size={props.compact ? 'sm' : 'md'} />;
}
