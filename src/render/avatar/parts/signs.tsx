/**
 * Visible clinical signs painted on the portrait. Laterality: OD = patient's
 * right = viewer's LEFT (side -1); OS = viewer's right (side +1).
 */
import type { VNode } from 'preact';
import { createRng } from '@core';
import { mix, shade } from '../color';
import { GOLD } from '../palette';
import { CX, VIEW_H, VIEW_W, type Side } from '../geometry';
import { P, ribbon, smooth, type Pt } from '../paths';
import type { PaintCtx } from './ctx';

const sideOf = (eye: 'OD' | 'OS'): Side => (eye === 'OD' ? -1 : 1);

export function TearStreaks({ c }: { c: PaintCtx }) {
  const eyes = c.ext.tearing ?? [];
  if (!eyes.length) return null;
  const { g } = c;
  return (
    <g>
      {eyes.map((e) => {
        const s = sideOf(e);
        const ex = CX + s * g.eyeDX;
        const x = ex + s * g.eyeW * 0.15;
        const y0 = g.eyeY + g.eyeLow + 1.2;
        const pts: Pt[] = [[x, y0], [x + s * 1.2, y0 + 7], [x + s * 0.3, y0 + 15], [x + s * 1.6, y0 + 23]];
        const d = smooth(pts);
        const end = pts[pts.length - 1]!;
        return (
          <g key={e}>
            <path d={d} fill="none" stroke="#cfe8ff" stroke-opacity="0.22" stroke-width="2.4" stroke-linecap="round" />
            <path d={d} fill="none" stroke={c.skin.deep} stroke-opacity="0.18" stroke-width="0.6" stroke-linecap="round" transform={`translate(${s * 0.9} 0.3)`} />
            <path d={d} fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.45" stroke-linecap="round" transform={`translate(${s * -0.5} 0)`} />
            <g class={c.animated ? 'lav-drop' : undefined}>
              <path d={`M${P(end[0], end[1] - 1.5)}q1.7 2.6 0 3.9q-1.7 -1.3 0 -3.9Z`} fill="#d8efff" opacity="0.85" />
              <circle cx={end[0] - 0.4} cy={end[1] + 0.8} r="0.45" fill="#fff" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** Herpes zoster (V1): vesicles on erythematous base, respecting the midline. */
export function Rash({ c }: { c: PaintCtx }) {
  if (c.ext.rash !== 'forehead-dermatomal') return null;
  const { g } = c;
  const s = c.signSide;
  const r = createRng((c.t.seed ^ 0x2057) >>> 0);
  const blot = c.id('blot');
  const clip = c.id('rashClip');
  const blobs: VNode[] = [];
  const ves: VNode[] = [];
  const top = g.hairline - 4;
  const bottom = g.browY - 2;
  const clusters: Pt[] = [];
  for (let i = 0; i < 9; i++) clusters.push([CX + s * r.float(3, g.headW - 7), r.float(top, bottom)]);
  // upper lid + medial canthus (V1 also supplies the lid)
  clusters.push([CX + s * (g.eyeDX - 2), g.eyeY - g.eyeH - 5]);
  clusters.push([CX + s * 6, g.eyeY - 6]);
  clusters.forEach(([x, y], i) => {
    blobs.push(<ellipse key={`b${i}`} cx={x} cy={y} rx={r.float(5, 8)} ry={r.float(3.5, 5.5)} fill={`url(#${blot})`} />);
    const n = r.int(3, 6);
    for (let k = 0; k < n; k++) {
      const vx = x + r.float(-3.6, 3.6);
      const vy = y + r.float(-2.4, 2.4);
      const crust = r.chance(0.3);
      ves.push(
        crust ? (
          <ellipse key={`v${i}-${k}`} cx={vx} cy={vy} rx={r.float(0.8, 1.4)} ry={r.float(0.6, 1)} fill="#8a4a2a" opacity="0.85" />
        ) : (
          <g key={`v${i}-${k}`}>
            <circle cx={vx} cy={vy} r={r.float(0.6, 1.05)} fill="#f3e2c4" stroke="#c23b40" stroke-width="0.4" />
            <circle cx={vx - 0.3} cy={vy - 0.3} r="0.3" fill="#fff" />
          </g>
        ),
      );
    }
  });
  return (
    <g>
      <defs>
        <radialGradient id={blot}>
          <stop offset="0" stop-color="#d0434b" stop-opacity="0.55" />
          <stop offset="1" stop-color="#d0434b" stop-opacity="0" />
        </radialGradient>
        <clipPath id={clip}>
          <rect x={s < 0 ? 0 : CX + 0.4} y="0" width={s < 0 ? CX - 0.4 : VIEW_W - CX} height={VIEW_H} />
        </clipPath>
      </defs>
      <g clip-path={`url(#${clip})`}>
        <g clip-path={`url(#${c.id('headClip')})`}>{blobs}</g>
        {ves}
      </g>
    </g>
  );
}

/** Centre-line of the frontal branch of the superficial temporal artery. */
function arteryLine(c: PaintCtx): Pt[] {
  const { g } = c;
  const s = c.signSide;
  const W = g.headW;
  // preauricular -> up the temple -> curving forward toward the frontal hairline
  const base: Pt[] = [
    [CX + s * (W - 2.6), g.earTop + 5],
    [CX + s * (W - 3.6), g.eyeY - 9],
    [CX + s * (W - 5.8), g.browY - 7],
    [CX + s * (W - 10.5), g.hairline + 7],
    [CX + s * (W - 17), g.hairline + 1.5],
  ];
  // resample and add a tortuous (beaded, kinked) wiggle perpendicular to the path
  const out: Pt[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * (base.length - 1);
    const k = Math.min(base.length - 2, Math.floor(u));
    const f = u - k;
    const a = base[k]!;
    const b = base[k + 1]!;
    const x = a[0] + (b[0] - a[0]) * f;
    const y = a[1] + (b[1] - a[1]) * f;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const amp = 1.5 * Math.sin((i / n) * Math.PI * 0.9 + 0.3);
    const w = Math.sin(i * 1.25) * amp;
    out.push([x + (-dy / len) * w, y + (dx / len) * w]);
  }
  return out;
}

/** Hair on the affected temple is tucked back so the artery can be seen. */
export function templeMask(c: PaintCtx) {
  if (!c.ext.templeTenderness) return null;
  const { g } = c;
  const s = c.signSide;
  const fade = c.id('templeFade');
  const cy = (g.hairline + g.earTop) / 2 + 3;
  return (
    <>
      <radialGradient id={fade}>
        <stop offset="0" stop-color="#000" stop-opacity="1" />
        <stop offset="0.62" stop-color="#000" stop-opacity="0.95" />
        <stop offset="1" stop-color="#000" stop-opacity="0" />
      </radialGradient>
      <mask id={c.id('templeMask')} maskUnits="userSpaceOnUse" x="-60" y="-60" width={VIEW_W + 120} height={VIEW_H + 120}>
        <rect x="-60" y="-60" width={VIEW_W + 120} height={VIEW_H + 120} fill="#fff" />
        <ellipse cx={CX + s * (g.headW - 7)} cy={cy} rx="13" ry={(g.earTop - g.hairline) / 2 + 9} fill={`url(#${fade})`} />
      </mask>
    </>
  );
}

/** Prominent, tortuous, raised superficial temporal artery (a giant-cell arteritis cue). */
export function TemporalArtery({ c }: { c: PaintCtx }) {
  if (!c.ext.templeTenderness) return null;
  const { skin } = c;
  const pts = arteryLine(c);
  const d = smooth(pts);
  const cord = mix(skin.shadow, '#7d2440', 0.42);
  const nodes = [5, 11, 17, 22].map((i) => pts[i]!);
  return (
    <g stroke-linecap="round" stroke-linejoin="round" fill="none">
      {/* erythema of the overlying skin */}
      <path d={d} stroke="#d9465a" stroke-opacity="0.16" stroke-width="8" />
      <path d={d} stroke="#d9465a" stroke-opacity="0.2" stroke-width="4.6" />
      {/* cast shadow (key light is upper right) then the raised cord */}
      <path d={d} stroke={skin.deep} stroke-opacity="0.55" stroke-width="2.8" transform="translate(-0.7 0.8)" />
      <path d={d} stroke={cord} stroke-width="2.5" />
      <path d={d} stroke={mix(cord, '#b04a64', 0.5)} stroke-width="1.2" />
      <path d={d} stroke={mix(skin.light, '#ffe2d8', 0.4)} stroke-opacity="0.7" stroke-width="0.6" transform="translate(0.45 -0.55)" />
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="1.75" fill={cord} stroke="none" />
          <circle cx={x + 0.4} cy={y - 0.5} r="0.55" fill={skin.light} opacity="0.65" stroke="none" />
        </g>
      ))}
    </g>
  );
}

export function EyePatch({ c }: { c: PaintCtx }) {
  const e = c.ext.eyePatch;
  if (!e) return null;
  const { g } = c;
  const s = sideOf(e);
  const x = CX + s * g.eyeDX;
  const y = g.eyeY + 1;
  const pad = c.id('pad');
  const kid = g.child > 0.4;
  return (
    <g>
      <defs>
        <radialGradient id={pad} cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stop-color="#fffaf1" />
          <stop offset="1" stop-color="#e4d6c0" />
        </radialGradient>
      </defs>
      <ellipse cx={x + 0.6} cy={y + 1.2} rx={(14) * 1.45} ry={(11.5) * 1.45} fill={`url(#${c.id('gBlack')})`} opacity="0.18"/>
      <ellipse cx={x} cy={y} rx="14.5" ry="12" fill="#efe3cf" stroke="#d6c4a8" stroke-width="0.6" />
      <ellipse cx={x} cy={y} rx="10.5" ry="8.4" fill={`url(#${pad})`} />
      <ellipse cx={x} cy={y} rx="12.3" ry="10.2" fill="none" stroke="#cdb894" stroke-width="0.4" stroke-dasharray="1 0.9" />
      {kid && (
        <g>
          <path d={`M${P(x - 4, y - 3)}l0.9 1.9l2 0.3l-1.5 1.4l0.4 2l-1.8 -1l-1.8 1l0.4 -2l-1.5 -1.4l2 -0.3Z`} fill="#f5b942" />
          <circle cx={x + 4} cy={y + 2.5} r="1.3" fill="#38bdf8" />
          <circle cx={x + 3} cy={y - 4} r="0.9" fill="#f472b6" />
        </g>
      )}
    </g>
  );
}

/** Tapered capsule along a quadratic curve (fingers, thumb). */
function digit(p0: Pt, ctrl: Pt, p2: Pt, w: number, tipRound = 0.75): string {
  const pts: [number, number, number][] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    // full width along the finger, rounding off at the tip
    const tip = t > tipRound ? Math.sqrt(Math.max(0, 1 - ((t - tipRound) / (1 - tipRound)) ** 2)) : 1;
    pts.push([u * u * p0[0] + 2 * u * t * ctrl[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * ctrl[1] + t * t * p2[1], Math.max(0.15, w * (1 - t * 0.12) * tip)]);
  }
  return ribbon(pts);
}

const qpt = (p0: Pt, c: Pt, p2: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1]];
};

/**
 * Photophobia: the patient's left hand (viewer's right) held palm-down as a
 * visor just above the brows, fingers together and slightly cupped, casting
 * a shadow over both eyes.
 */
export function ShieldHand({ c }: { c: PaintCtx }) {
  if (!c.ext.photophobia) return null;
  const { g, skin } = c;
  const W = g.headW;
  const by = g.browY - 4.5;
  const k = 1 - g.child * 0.22;
  const hand = c.id('hand');
  const handLo = c.id('handLo');
  const shadow = c.id('handShadow');
  const outline = mix(skin.deep, '#2a160e', 0.25);
  // index (back/top) .. little (front/bottom); x of the knuckle, tip reach, width, cup
  const fingers = [
    { y: by - 11.2, x0: CX + 12.5, reach: 26 * k, w: 4, cup: 0.5 },
    { y: by - 7.3, x0: CX + 11.5, reach: 30 * k, w: 4.3, cup: 1.4 },
    { y: by - 3.4, x0: CX + 10.5, reach: 27 * k, w: 4.15, cup: 2.4 },
    { y: by + 0.3, x0: CX + 10, reach: 20.5 * k, w: 3.7, cup: 3.2 },
  ];
  const dorsum = smooth(
    [
      [CX + W + 13, by - 9.5],
      [CX + 27, by - 13.6],
      [CX + 12, by - 13.6],
      [CX + 8.5, by - 6],
      [CX + 8.5, by + 2.4],
      [CX + 24, by + 4.6],
      [CX + W + 11, by + 5.5],
    ],
    true,
    0.85,
  );
  const thumbA: Pt = [CX + W + 6, by + 3.5];
  const thumbC: Pt = [CX + 30, by + 10.5];
  const thumbB: Pt = [CX + 18.5, by + 8.6];
  // forearm drops steeply toward an elbow just outside the frame (foreshortened)
  const arm = `M${P(CX + W + 13, by - 9.5)}C${P(CX + W + 24, by - 2)} ${P(VIEW_W - 4, by + 40)} ${P(VIEW_W + 8, by + 92)}L${P(VIEW_W - 12, by + 104)}C${P(VIEW_W - 22, by + 54)} ${P(CX + W + 14, by + 16)} ${P(CX + W + 11, by + 5.5)}Z`;
  const shadowD = `M${P(CX - W - 4, by + 1)}L${P(CX + W + 4, by + 2)}L${P(CX + W + 4, by + 27)}L${P(CX - W - 4, by + 25)}Z`;
  return (
    <g>
      <defs>
        <linearGradient id={hand} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={mix(skin.light, skin.base, 0.25)} />
          <stop offset="0.55" stop-color={skin.base} />
          <stop offset="1" stop-color={mix(skin.base, skin.shadow, 0.7)} />
        </linearGradient>
        <linearGradient id={handLo} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={skin.base} />
          <stop offset="1" stop-color={skin.shadow} />
        </linearGradient>
        <linearGradient id={shadow} gradientUnits="userSpaceOnUse" x1="0" y1={by + 1} x2="0" y2={by + 27}>
          <stop offset="0" stop-color={skin.deep} stop-opacity="0.62" />
          <stop offset="0.45" stop-color={skin.deep} stop-opacity="0.34" />
          <stop offset="1" stop-color={skin.deep} stop-opacity="0" />
        </linearGradient>
      </defs>
      {/* shade cast over the brows and eyes */}
      <path d={shadowD} fill={`url(#${shadow})`} clip-path={c.url('headClip')} />
      <path d={arm} fill={`url(#${handLo})`} stroke={outline} stroke-opacity="0.35" stroke-width="0.6" />
      <path d={`M${P(CX + W + 20, by - 4)}C${P(VIEW_W - 10, by + 30)} ${P(VIEW_W, by + 56)} ${P(VIEW_W + 6, by + 80)}`} stroke={GOLD} stroke-opacity="0.3" stroke-width="1" fill="none" stroke-linecap="round" />
      {/* thumb tucked under the palm */}
      <path d={digit(thumbA, thumbC, thumbB, 4.6, 0.7)} fill={`url(#${handLo})`} stroke={outline} stroke-opacity="0.45" stroke-width="0.5" />
      <ellipse cx={thumbB[0] + 2} cy={thumbB[1] - 0.4} rx="1.9" ry="1.3" fill={mix(skin.light, '#f2d3c8', 0.4)} opacity="0.6" />
      <path d={dorsum} fill={`url(#${hand})`} stroke={outline} stroke-opacity="0.4" stroke-width="0.55" />
      {/* extensor tendons fanning to the knuckles */}
      <g stroke={skin.shadow} stroke-opacity="0.35" stroke-width="0.6" fill="none" stroke-linecap="round">
        {fingers.map((f, i) => (
          <path key={i} d={`M${P(CX + W + 6, by - 3 + i * 0.6)}Q${P(CX + 26, f.y + 1)} ${P(f.x0 + 4, f.y + 0.3)}`} />
        ))}
      </g>
      {fingers.map((f, i) => {
        const p0: Pt = [f.x0 + 2, f.y];
        const p2: Pt = [f.x0 - f.reach, f.y + f.cup];
        const ctrl: Pt = [f.x0 - f.reach * 0.55, f.y - 0.9 + f.cup * 0.15];
        const d = digit(p0, ctrl, p2, f.w);
        const pip = qpt(p0, ctrl, p2, 0.42);
        const dip = qpt(p0, ctrl, p2, 0.72);
        const nail = qpt(p0, ctrl, p2, 0.9);
        return (
          <g key={i}>
            {/* contact shadow on the finger behind */}
            <path d={d} fill={skin.deep} opacity="0.28" transform="translate(0.5 0.9)" />
            <path d={d} fill={`url(#${hand})`} stroke={outline} stroke-opacity="0.5" stroke-width="0.5" />
            {/* knuckle (MCP) highlight */}
            <ellipse cx={f.x0 + 1.4} cy={f.y - 0.6} rx="2.4" ry="1.5" fill={skin.light} opacity="0.5" />
            <path d={`M${P(pip[0] + 0.6, pip[1] - f.w * 0.42)}q-1 ${f.w * 0.42} 0 ${f.w * 0.84}`} stroke={outline} stroke-opacity="0.35" stroke-width="0.45" fill="none" />
            <path d={`M${P(dip[0] + 0.4, dip[1] - f.w * 0.36)}q-0.7 ${f.w * 0.36} 0 ${f.w * 0.72}`} stroke={outline} stroke-opacity="0.28" stroke-width="0.4" fill="none" />
            <ellipse cx={nail[0]} cy={nail[1] - 0.2} rx="2" ry={f.w * 0.3} fill={mix(skin.light, '#f6dcd2', 0.5)} opacity="0.75" />
            <path d={`M${P(p0[0] - 2, f.y - f.w * 0.38)}L${P(nail[0] + 2, nail[1] - f.w * 0.4)}`} stroke={shade(skin.light, 0.2)} stroke-opacity="0.45" stroke-width="0.5" stroke-linecap="round" />
          </g>
        );
      })}
      {/* key-light rim along the top of the hand */}
      <path d={`M${P(CX + W + 12, by - 9.8)}C${P(CX + 32, by - 14)} ${P(CX + 16, by - 14.2)} ${P(CX + 4, by - 13.2)}`} stroke={GOLD} stroke-opacity="0.55" stroke-width="0.8" fill="none" stroke-linecap="round" />
    </g>
  );
}
