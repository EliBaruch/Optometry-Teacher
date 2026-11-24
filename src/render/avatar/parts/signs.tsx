/**
 * Visible clinical signs painted on the portrait. Laterality: OD = patient's
 * right = viewer's LEFT (side -1); OS = viewer's right (side +1).
 */
import type { VNode } from 'preact';
import { createRng } from '@core';
import { mix, shade } from '../../fx/color';
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

/** Prominent, tortuous superficial temporal artery (a giant-cell arteritis cue). */
export function TemporalArtery({ c }: { c: PaintCtx }) {
  if (!c.ext.templeTenderness) return null;
  const { g, skin } = c;
  const s = c.signSide;
  const x = CX + s * (g.headW - 5);
  const pts: Pt[] = [];
  for (let i = 0; i <= 6; i++) pts.push([x + (i % 2 ? s * 2.2 : -s * 0.6), g.hairline + 2 + i * 3.6]);
  const d = smooth(pts);
  return (
    <g>
      <path d={d} fill="none" stroke={mix(skin.deep, '#7a2a3a', 0.3)} stroke-opacity="0.55" stroke-width="1.8" stroke-linecap="round" />
      <path d={d} fill="none" stroke={skin.light} stroke-opacity="0.5" stroke-width="0.6" stroke-linecap="round" transform={`translate(${s * -0.6} -0.4)`} />
      <ellipse cx={x} cy={g.hairline + 12} rx="5" ry="9" fill="#d05a5a" opacity="0.1" />
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
      <ellipse cx={x + 0.6} cy={y + 1.2} rx="14" ry="11.5" fill="#000" opacity="0.18" filter={`url(#${c.id('soft')})`} />
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

/** Photophobia: the patient's left hand shades both eyes from the light. */
export function ShieldHand({ c }: { c: PaintCtx }) {
  if (!c.ext.photophobia) return null;
  const { g, skin } = c;
  const by = g.browY - 8;
  const W = g.headW;
  const hand = c.id('hand');
  const kx = CX + 8; // knuckle line
  const back = smooth(
    [
      [CX + W + 12, by - 7],
      [CX + 26, by - 10],
      [kx, by - 11],
      [kx - 2, by - 3],
      [CX + 24, by + 2],
      [CX + W + 10, by + 7],
    ],
    true,
  );
  const fingers: VNode[] = [];
  const lens = [24, 27, 25, 20];
  for (let i = 3; i >= 0; i--) {
    const y0 = by - 9.6 + i * 2.5;
    const len = lens[i]!;
    const tip = kx - len;
    const d = quadRibbonClosed([kx + 3, y0], [kx - len * 0.5, y0 - 1.2 + i * 0.3], [tip, y0 + 0.8 + i * 0.6], 3.4 - i * 0.15);
    fingers.push(
      <g key={i}>
        <path d={d} fill={`url(#${hand})`} stroke={skin.deep} stroke-opacity="0.35" stroke-width="0.55" />
        <path d={`M${P(kx - len * 0.45, y0 - 1)}q1 0.9 0 1.8`} stroke={skin.deep} stroke-opacity="0.3" stroke-width="0.45" fill="none" />
      </g>,
    );
  }
  const thumb = smooth([[CX + 34, by + 1], [CX + 26, by + 5], [CX + 17, by + 8.5], [CX + 14.5, by + 7], [CX + 22, by + 1.5]], true);
  const arm = `M${P(CX + W + 10, by - 7)}C${P(CX + W + 26, by + 10)} ${P(VIEW_W, by + 60)} ${P(VIEW_W + 12, VIEW_H)}L${P(VIEW_W - 16, VIEW_H)}C${P(CX + W + 16, by + 70)} ${P(CX + W + 4, by + 22)} ${P(CX + W + 8, by + 7)}Z`;
  const sleeve = `M${P(VIEW_W - 30, by + 78)}L${P(VIEW_W + 12, by + 54)}L${P(VIEW_W + 12, VIEW_H)}L${P(VIEW_W - 26, VIEW_H)}Z`;
  return (
    <g>
      <defs>
        <linearGradient id={hand} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={mix(skin.light, skin.base, 0.3)} />
          <stop offset="0.65" stop-color={skin.base} />
          <stop offset="1" stop-color={skin.shadow} />
        </linearGradient>
      </defs>
      {/* shade cast over the eyes */}
      <g clip-path={`url(#${c.id('headClip')})`}>
        <rect x="0" y={by + 4} width={VIEW_W} height="20" fill={skin.deep} opacity="0.22" filter={`url(#${c.id('soft2')})`} />
      </g>
      <path d={arm} fill={`url(#${hand})`} />
      <path d={arm} fill="none" stroke={skin.deep} stroke-opacity="0.25" stroke-width="0.6" />
      <path d={sleeve} fill={c.spec.outfit} />
      <path d={sleeve} fill="#000" opacity="0.15" />
      <path d={back} fill={`url(#${hand})`} stroke={skin.deep} stroke-opacity="0.3" stroke-width="0.6" />
      {fingers}
      <path d={thumb} fill={skin.base} stroke={skin.deep} stroke-opacity="0.35" stroke-width="0.55" />
      <path d={`M${P(CX + 30, by - 9.5)}Q${P(CX + 16, by - 12)} ${P(kx - 18, by - 11.6)}`} stroke={shade(skin.light, 0.25)} stroke-opacity="0.55" stroke-width="0.8" fill="none" stroke-linecap="round" />
    </g>
  );
}

/** Closed tapered capsule along a quadratic curve (fingers). */
function quadRibbonClosed(p0: Pt, ctrl: Pt, p2: Pt, w: number): string {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const u = 1 - t;
    pts.push([u * u * p0[0] + 2 * u * t * ctrl[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * ctrl[1] + t * t * p2[1], w * (1 - t * 0.18)]);
  }
  return ribbon(pts);
}
