/**
 * Front (examiner's) view of a brass-and-enamel refractor head. Purely a
 * display: it mirrors the dialled lenses, cylinder axis, cross-cylinder,
 * occluder and prisms. The patient's right eye (OD) is on the examiner's LEFT.
 * Axes follow TABO: 0° at the examiner's right, counter-clockwise to 180°.
 */
import type { Eye } from '@core';
import { useT } from './strings';
import { formatDiopters } from '@core';
import type { JccMode, Lens } from './optics';

export interface PhoropterProps {
  lenses: Record<Eye, Lens>;
  /** which battery the dials drive */
  active: Eye | 'OU';
  occluded: Record<Eye, boolean>;
  jcc: JccMode | null;
  /** red-dot axis of the cross-cylinder currently in place */
  jccRed: number | null;
  /** increments on every flip (re-triggers the flip animation) */
  flipKey: number;
  prism: boolean;
  /** 1 / 2 presentation badge */
  badge?: string | null;
}

const R = 112;
const CY = 186;
const CX: Record<Eye, number> = { OD: 176, OS: 464 };
const rad = (d: number) => (d * Math.PI) / 180;
/** TABO angle → SVG point at radius r (y down). */
const pt = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))] as const;

function AxisScale({ cx }: { cx: number }) {
  const ticks = [];
  for (let d = 0; d <= 180; d += 5) {
    const major = d % 30 === 0;
    const mid = d % 10 === 0;
    const [x1, y1] = pt(cx, CY, major ? 52 : 55, d);
    const [x2, y2] = pt(cx, CY, mid ? 64 : 61, d);
    ticks.push(<line key={d} x1={x1} y1={y1} x2={x2} y2={y2} class={major ? 'php-tick php-tick--major' : 'php-tick'} />);
  }
  const nums = [0, 30, 60, 90, 120, 150, 180].map((d) => {
    const [x, y] = pt(cx, CY, 75, d);
    return <text key={d} x={x} y={y + 3} class="php-scale-num" text-anchor="middle">{d}</text>;
  });
  return <g>{ticks}{nums}</g>;
}

function Screw({ x, y, a = 30 }: { x: number; y: number; a?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <circle r="4.2" fill="url(#php-brass-r)" stroke="#6b7690" stroke-width="0.8" />
      <line x1="-3" y1="0" x2="3" y2="0" stroke="#3a4660" stroke-width="1.2" />
    </g>
  );
}

function Drum({ x, value }: { x: number; value: number }) {
  // Knurled sphere drum: ridges scroll with each 0.25 D click.
  const phase = (((value * 4) % 2) + 2) % 2; // 0..2 ridge spacings
  const ridges = [];
  for (let i = -1; i < 14; i++) {
    const y = CY - 50 + (i + phase / 2) * 7.5;
    if (y < CY - 50 || y > CY + 50) continue;
    const t = Math.abs(y - CY) / 50; // curvature shading
    ridges.push(<rect key={i} x={x - 13} y={y} width="26" height="2.6" rx="1" fill={`rgba(40,50,80,${0.55 - t * 0.3})`} />);
  }
  return (
    <g class="php-drum">
      <rect x={x - 15} y={CY - 54} width="30" height="108" rx="9" fill="url(#php-drum)" stroke="#6b7690" stroke-width="1.2" />
      {ridges}
      <rect x={x - 15} y={CY - 54} width="30" height="108" rx="9" fill="url(#php-drum-shade)" />
    </g>
  );
}

function Battery(props: { eye: Eye; lens: Lens; on: boolean; occluded: boolean; jcc: JccMode | null; jccRed: number | null; flipKey: number; prism: boolean }) {
  const { eye, lens, on, occluded } = props;
  const cx = CX[eye];
  const outer = eye === 'OD' ? -1 : 1;
  const hasCyl = lens.cyl <= -0.125;
  const minus = Math.max(0, -lens.sphere);
  const plus = Math.max(0, lens.sphere);
  const handle = props.jcc && props.jccRed != null ? (props.jcc === 'axis' ? lens.axis : lens.axis + 45) : 0;
  const redRel = props.jccRed != null ? props.jccRed - handle : 45;
  const [nx, ny] = pt(cx, CY, 47, lens.axis);
  const [ax1, ay1] = pt(cx, CY, 39, lens.axis);
  const [ax2, ay2] = pt(cx, CY, 39, lens.axis + 180);

  return (
    <g class={`php-bat${on ? ' is-on' : ''}`}>
      <circle cx={cx} cy={CY} r={R + 16} class="php-bat__aura" />
      <Drum x={cx + outer * (R + 10)} value={lens.sphere} />
      {/* housing */}
      <circle cx={cx} cy={CY + 4} r={R} fill="rgba(10,22,51,0.3)" filter="url(#php-soft)" />
      <circle cx={cx} cy={CY} r={R} fill="url(#php-enamel)" stroke="url(#php-brass)" stroke-width="5" />
      <circle cx={cx} cy={CY} r={R - 10} fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1" />
      <circle cx={cx} cy={CY} r={R - 13} fill="none" stroke="rgba(10,22,51,0.14)" stroke-width="1" />
      <path d={`M ${cx - R + 8} ${CY - 20} A ${R - 8} ${R - 8} 0 0 1 ${cx + R - 8} ${CY - 20}`} fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="10" />
      {[45, 135, 225, 315].map((a) => { const [x, y] = pt(cx, CY, R - 20, a); return <Screw key={a} x={x} y={y} a={a} />; })}
      <AxisScale cx={cx} />
      {/* windows */}
      <g class="php-win">
        <rect x={cx - 31} y={CY + 50} width="62" height="19" rx="4" />
        <text x={cx - 25} y={CY + 63} class="php-win__k">S</text>
        <text x={cx + 26} y={CY + 64} text-anchor="end" class="php-win__v">{formatDiopters(lens.sphere)}</text>
        <rect x={cx - 31} y={CY + 73} width="62" height="19" rx="4" />
        <text x={cx - 25} y={CY + 86} class="php-win__k">C</text>
        <text x={cx + 26} y={CY + 87} text-anchor="end" class="php-win__v">{hasCyl ? formatDiopters(lens.cyl) : '0.00'}</text>
      </g>
      <text x={cx} y={CY + 133} text-anchor="middle" class="php-eye-label">{eye}</text>
      {/* aperture */}
      <circle cx={cx} cy={CY} r="45.5" fill="#0b101f" stroke="url(#php-brass)" stroke-width="3.5" />
      <circle cx={cx} cy={CY} r="40" fill="url(#php-glass)" />
      <circle cx={cx} cy={CY} r="40" fill="url(#php-glass-plus)" style={{ opacity: Math.min(0.9, plus / 5) }} class="php-fade" />
      <circle cx={cx} cy={CY} r={40 - Math.min(8, minus * 0.9) / 2} fill="none" stroke="rgba(150,170,255,0.55)" stroke-width={Math.min(8, minus * 0.9)} class="php-fade" />
      <circle cx={cx} cy={CY} r="40" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
      {hasCyl && <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} class="php-cyl-line" />}
      <ellipse cx={cx - 14} cy={CY - 16} rx="15" ry="8" transform={`rotate(-30 ${cx - 14} ${CY - 16})`} fill="rgba(255,255,255,0.34)" />
      <ellipse cx={cx + 17} cy={CY + 19} rx="6" ry="3" transform={`rotate(-30 ${cx + 17} ${CY + 19})`} fill="rgba(255,255,255,0.14)" />
      {/* axis needle */}
      {hasCyl && (
        <g transform={`translate(${nx} ${ny}) rotate(${-lens.axis})`} class="php-needle">
          <path d="M 0 -4.5 L 9 0 L 0 4.5 Z" />
        </g>
      )}
      {/* cross-cylinder */}
      <g class={`php-jcc${props.jcc ? ' is-in' : ''}`} style={{ transformOrigin: `${cx}px ${CY - R - 6}px` }}>
        <g transform={`translate(${cx} ${CY}) rotate(${-handle})`}>
          <rect x="34" y="-4" width="40" height="8" rx="3" fill="url(#php-brass)" />
          <circle cx="78" cy="0" r="6" fill="url(#php-brass-r)" />
          <g class="php-jcc__flip" key={props.flipKey}>
            <circle r="36" fill="rgba(200,215,255,0.16)" stroke="url(#php-brass)" stroke-width="4" />
            <circle r="31" fill="none" stroke="rgba(255,255,255,0.2)" />
            {[0, 180].map((o) => {
              const [rx, ry] = pt(0, 0, 25, redRel + o);
              const [wx, wy] = pt(0, 0, 25, redRel + 90 + o);
              return (
                <g key={o}>
                  <circle cx={rx} cy={ry} r="4.2" class="php-dot php-dot--red" />
                  <circle cx={wx} cy={wy} r="4.2" class="php-dot php-dot--white" />
                </g>
              );
            })}
          </g>
        </g>
      </g>
      {/* Risley prism */}
      <g class={`php-prism${props.prism ? ' is-in' : ''}`}>
        <circle cx={cx} cy={CY} r="44" fill="rgba(140,200,255,0.12)" stroke="rgba(180,220,255,0.6)" stroke-width="2" stroke-dasharray="3 3" />
        <path d={eye === 'OD' ? `M ${cx} ${CY + 26} L ${cx - 8} ${CY + 14} L ${cx + 8} ${CY + 14} Z` : `M ${cx} ${CY - 26} L ${cx - 8} ${CY - 14} L ${cx + 8} ${CY - 14} Z`} fill="rgba(200,235,255,0.85)" />
        <text x={cx} y={eye === 'OD' ? CY - 18 : CY + 26} text-anchor="middle" class="php-prism__t">3Δ {eye === 'OD' ? 'BU' : 'BD'}</text>
      </g>
      {/* occluder */}
      <g class={`php-occ${occluded ? ' is-in' : ''}`} style={{ '--php-occ-x': `${outer * 120}px` }}>
        <circle cx={cx} cy={CY} r="44" fill="url(#php-occ)" stroke="url(#php-brass)" stroke-width="2" />
        <text x={cx} y={CY + 5} text-anchor="middle" class="php-occ__t">OC</text>
      </g>
    </g>
  );
}

export function Phoropter(p: PhoropterProps) {
  const t = useT();
  const on = (e: Eye) => p.active === 'OU' || p.active === e;
  const jccEye = p.active === 'OU' ? null : p.active;
  return (
    <svg class="php-phoropter" dir="ltr" viewBox="0 0 640 404" role="img" aria-label={t.phoropterAria(fmt(p.lenses.OD), fmt(p.lenses.OS))}>
      <defs>
        <linearGradient id="php-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.25" stop-color="#dfe5f0" />
          <stop offset="0.55" stop-color="#9ba7bd" />
          <stop offset="0.8" stop-color="#cfd7e6" />
          <stop offset="1" stop-color="#6b7690" />
        </linearGradient>
        <radialGradient id="php-brass-r" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.5" stop-color="#c9d2e3" />
          <stop offset="1" stop-color="#6b7690" />
        </radialGradient>
        <radialGradient id="php-enamel" cx="0.4" cy="0.3" r="0.85">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.55" stop-color="#eef2f9" />
          <stop offset="1" stop-color="#d3dbea" />
        </radialGradient>
        <radialGradient id="php-glass" cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stop-color="#4a64a8" stop-opacity="0.95" />
          <stop offset="0.6" stop-color="#1a1f3e" />
          <stop offset="1" stop-color="#0b0b1e" />
        </radialGradient>
        <radialGradient id="php-glass-plus" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.55" />
          <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="php-drum" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#8791a8" />
          <stop offset="0.35" stop-color="#f4f7fc" />
          <stop offset="0.6" stop-color="#c3cde0" />
          <stop offset="1" stop-color="#6b7690" />
        </linearGradient>
        <linearGradient id="php-drum-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.55" />
          <stop offset="0.25" stop-color="#000" stop-opacity="0" />
          <stop offset="0.75" stop-color="#000" stop-opacity="0" />
          <stop offset="1" stop-color="#000" stop-opacity="0.6" />
        </linearGradient>
        <radialGradient id="php-occ" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stop-color="#f4f7fc" />
          <stop offset="1" stop-color="#b8c3d8" />
        </radialGradient>
        <radialGradient id="php-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.72" stop-color="#8fb0ff" stop-opacity="0" />
          <stop offset="0.86" stop-color="#8fb0ff" stop-opacity="0.28" />
          <stop offset="1" stop-color="#8fb0ff" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="php-floor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#8fb0ff" stop-opacity="0.28" />
          <stop offset="0.6" stop-color="#5c87ff" stop-opacity="0.1" />
          <stop offset="1" stop-color="#5c87ff" stop-opacity="0" />
        </radialGradient>
        <filter id="php-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" /></filter>
      </defs>

      {/* suspension arm & bridge */}
      <rect x="311" y="0" width="18" height="40" fill="url(#php-drum)" />
      <rect x="34" y="40" width="572" height="26" rx="13" fill="url(#php-brass)" stroke="#6b7690" stroke-width="1" />
      <rect x="40" y="44" width="560" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
      <g>
        <rect x="286" y="45" width="68" height="16" rx="8" fill="#10201c" stroke="#6b7690" />
        <rect x="290" y="48" width="60" height="10" rx="5" fill="rgba(120,230,170,0.35)" />
        <circle cx="320" cy="53" r="4" fill="rgba(240,255,245,0.85)" />
        <line x1="312" y1="47" x2="312" y2="59" stroke="#2a3550" />
        <line x1="328" y1="47" x2="328" y2="59" stroke="#2a3550" />
      </g>
      {Array.from({ length: 21 }, (_, i) => (
        <line key={i} x1={226 + i * 9.4} y1="62" x2={226 + i * 9.4} y2={i % 5 === 0 ? 54 : 58} stroke="#3a4660" stroke-width="1" />
      ))}
      <text x="214" y="61" text-anchor="end" class="php-pd">PD 64</text>

      {/* face opening between the batteries */}
      <path d="M 284 330 C 286 284, 300 252, 320 250 C 340 252, 354 284, 356 330" fill="#e6ebf5" stroke="url(#php-brass)" stroke-width="2" />

      {/* forehead rest: rod, pad and thumbwheel between the batteries */}
      <g class="php-forehead">
        <rect x="311" y="66" width="18" height="40" fill="url(#php-drum)" stroke="#6b7690" stroke-width="0.8" />
        <rect x="296" y="104" width="48" height="26" rx="13" fill="url(#php-brass)" stroke="#6b7690" stroke-width="1" />
        <rect x="302" y="108" width="36" height="14" rx="7" fill="#dfe6f2" stroke="rgba(190,215,255,0.35)" />
        <circle cx="320" cy="138" r="9" fill="url(#php-brass-r)" stroke="#6b7690" stroke-width="1" />
        <line x1="314" y1="138" x2="326" y2="138" stroke="#3a4660" stroke-width="1.4" />
      </g>

      {/* base: maker's rail, engraved plaque and a warm pool of light */}
      <ellipse cx="320" cy="372" rx="262" ry="26" fill="url(#php-floor)" />
      <g class="php-base">
        <rect x="150" y="344" width="340" height="30" rx="15" fill="rgba(10,22,51,0.28)" filter="url(#php-soft)" transform="translate(0 4)" />
        <rect x="150" y="340" width="340" height="30" rx="15" fill="url(#php-brass)" stroke="#6b7690" stroke-width="1" />
        <rect x="158" y="343" width="324" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
        <rect x="204" y="350" width="232" height="15" rx="7" fill="#dfe6f2" stroke="rgba(10,22,51,0.18)" />
        <text x="320" y="361" text-anchor="middle" class="php-plaque">LUMEN · REFRACTOR · MODEL IV</text>
        {[170, 470].map((x) => <Screw key={x} x={x} y={355} a={x} />)}
      </g>
      <rect x="311" y="330" width="18" height="12" fill="url(#php-drum)" />

      <Battery eye="OD" lens={p.lenses.OD} on={on('OD')} occluded={p.occluded.OD} jcc={jccEye === 'OD' ? p.jcc : null} jccRed={jccEye === 'OD' ? p.jccRed : null} flipKey={p.flipKey} prism={p.prism} />
      <Battery eye="OS" lens={p.lenses.OS} on={on('OS')} occluded={p.occluded.OS} jcc={jccEye === 'OS' ? p.jcc : null} jccRed={jccEye === 'OS' ? p.jccRed : null} flipKey={p.flipKey} prism={p.prism} />

      {p.badge && (
        <g class="php-badge" key={p.badge}>
          <circle cx="320" cy="150" r="24" />
          <text x="320" y="159" text-anchor="middle">{p.badge}</text>
        </g>
      )}
    </svg>
  );
}

function fmt(l: Lens): string {
  return l.cyl <= -0.125 ? `${formatDiopters(l.sphere)} ${formatDiopters(l.cyl)} × ${l.axis}` : `${formatDiopters(l.sphere)} DS`;
}
