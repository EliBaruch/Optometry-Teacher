import type { VNode } from 'preact';
import { createRng } from '@core';
import { luminance, mix, shade } from '../../fx/color';
import { CX, type Side } from '../geometry';
import { P } from '../paths';
import type { AttrMap } from '../rig';
import type { PaintCtx } from './ctx';

function strabOffset(c: PaintCtx, side: Side): [number, number] {
  const s = c.strabismus;
  if (!s) return [0, 0];
  const eyeSide: Side = s.eye === 'OD' ? -1 : 1;
  if (eyeSide !== side) return [0, 0];
  const h = c.g.eyeW * 0.46;
  const v = c.g.eyeH * 0.5;
  switch (s.direction) {
    case 'in': return [-side * h, 0]; // toward the nose
    case 'out': return [side * h, 0];
    case 'up': return [0, -v];
    case 'down': return [0, v];
  }
}

function vessels(c: PaintCtx, side: Side): string {
  const r = createRng((c.t.seed ^ (side > 0 ? 0xa11 : 0xb22)) >>> 0);
  const { g } = c;
  const ex = CX + side * g.eyeDX;
  const ey = g.eyeY;
  let d = '';
  for (let i = 0; i < 9; i++) {
    const fromOuter = i % 2 === 0;
    const sx = ex + (fromOuter ? side : -side) * (g.eyeW + 0.5);
    let x = sx;
    let y = ey + r.float(-g.eyeH * 0.7, g.eyeLow * 1.1);
    d += `M${P(x, y)}`;
    const steps = r.int(3, 5);
    const dir = fromOuter ? -side : side;
    for (let k = 0; k < steps; k++) {
      const nx = x + dir * r.float(0.9, 1.9);
      const ny = y + r.float(-1.1, 1.1);
      d += `Q${P((x + nx) / 2 + r.float(-0.6, 0.6), (y + ny) / 2 + r.float(-0.8, 0.8))} ${P(nx, ny)}`;
      x = nx;
      y = ny;
    }
  }
  return d;
}

function Eye({ c, a, side }: { c: PaintCtx; a: AttrMap; side: Side }) {
  const { g, skin } = c;
  const key = side < 0 ? 'L' : 'R';
  const eye = side < 0 ? 'OD' : 'OS';
  const ex = CX + side * g.eyeDX;
  const ey = g.eyeY;
  const red = c.ext.redEye?.includes(eye);
  const tear = c.ext.tearing?.includes(eye);
  const [ox, oy] = strabOffset(c, side);
  const R = g.irisR;
  const pr = R * 0.4 * (side < 0 ? c.pupils.L : c.pupils.R);
  const clip = c.id(`eye${key}`);
  const lash = mix(c.hair, '#140c0a', 0.75);
  const rashSide = c.ext.rash === 'forehead-dermatomal' && c.signSide === side;
  const lidFill = rashSide ? mix(skin.base, '#d4545a', 0.28) : mix(skin.base, skin.shadow, 0.35);
  const fibres: VNode[] = [];
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2 + (i % 2) * 0.08;
    const r0 = pr + 0.4;
    const r1 = R * (0.78 + (i % 3) * 0.06);
    fibres.push(<path key={i} d={`M${P(Math.cos(ang) * r0, Math.sin(ang) * r0)}L${P(Math.cos(ang + 0.05) * r1, Math.sin(ang + 0.05) * r1)}`} />);
  }
  return (
    <g>
      <clipPath id={clip}>
        <path data-r={`clip${key}`} {...a[`clip${key}`]} />
      </clipPath>
      <path data-r={`crease${key}`} {...a[`crease${key}`]} fill="none" stroke={skin.deep} stroke-opacity="0.42" stroke-width="0.95" stroke-linecap="round" />
      <g clip-path={`url(#${clip})`}>
        <rect x={ex - g.eyeW - 2} y={ey - g.eyeH * 2.2} width={g.eyeW * 2 + 4} height={g.eyeH * 2.2 + g.eyeLow * 2.6} fill={`url(#${c.id(red ? 'scleraRed' : 'sclera')})`} />
        {red && <path d={vessels(c, side)} stroke="#c22f3a" stroke-opacity="0.7" stroke-width="0.32" fill="none" stroke-linecap="round" />}
        <g data-r={`iris${key}`} {...a[`iris${key}`]}>
          <g transform={`translate(${ex + ox} ${ey + oy})`}>
            <circle r={R + 0.5} fill={shade(c.spec.irisColor, -0.6)} opacity="0.35" />
            <circle r={R} fill={`url(#${c.id('iris')})`} />
            <g stroke={shade(c.spec.irisColor, 0.5)} stroke-opacity="0.35" stroke-width="0.32">{fibres}</g>
            <circle r={R * 0.58} fill="none" stroke={shade(c.spec.irisColor, 0.45)} stroke-opacity="0.45" stroke-width="0.5" stroke-dasharray="0.9 0.6" />
            <circle r={R - 0.25} fill="none" stroke={shade(c.spec.irisColor, -0.65)} stroke-width="0.7" />
            <circle r={pr} fill="#0b0708" />
            <circle r={pr} fill="none" stroke={shade(c.spec.irisColor, -0.3)} stroke-width="0.35" opacity="0.8" />
          </g>
        </g>
        <g data-r={`glint${key}`} {...a[`glint${key}`]}>
          <ellipse cx={ex + 1.9} cy={ey - 1.9} rx={1.45 + g.child * 0.4} ry={1.2 + g.child * 0.35} fill="#fffaf0" opacity="0.95" />
          <circle cx={ex - 1.6} cy={ey + 1.8} r="0.55" fill="#fff" opacity="0.6" />
        </g>
        <path data-r={`shade${key}`} {...a[`shade${key}`]} fill="none" stroke={skin.deep} stroke-opacity="0.38" stroke-width="3.4" filter={`url(#${c.id('soft')})`} />
        {tear && <path data-r={`tear${key}`} {...a[`tear${key}`]} fill="none" stroke="#e9f6ff" stroke-opacity="0.9" stroke-width="1.3" />}
        <path data-r={`lid${key}`} {...a[`lid${key}`]} fill={lidFill} />
      </g>
      <path data-r={`low${key}`} {...a[`low${key}`]} fill="none" stroke={skin.deep} stroke-opacity="0.5" stroke-width="0.75" stroke-linecap="round" />
      <path data-r={`lash${key}`} {...a[`lash${key}`]} fill="none" stroke={lash} stroke-width={c.sex === 'F' ? 1.9 : 1.5} stroke-linecap="round" />
      <path d={`M${P(ex + side * (g.eyeW - 0.5), ey - 1.1)}q${P(side * 1.9, -0.6)} ${P(side * 2.9, -2.2)}`} fill="none" stroke={lash} stroke-width={c.sex === 'F' ? 1.3 : 0.9} stroke-linecap="round" />
    </g>
  );
}

export function Eyes({ c, a }: { c: PaintCtx; a: AttrMap }) {
  return (
    <g>
      <Eye c={c} a={a} side={-1} />
      <Eye c={c} a={a} side={1} />
    </g>
  );
}

export function Brows({ c, a }: { c: PaintCtx; a: AttrMap }) {
  const lum = luminance(c.hair);
  const col = mix(c.hair, '#1a120c', lum > 0.55 ? 0.2 : lum > 0.3 ? 0.15 : 0.05);
  const o = 0.92 - c.g.child * 0.2;
  return (
    <g fill={col} opacity={o}>
      <path data-r="browL" {...a.browL} />
      <path data-r="browR" {...a.browR} />
    </g>
  );
}

export function Mouth({ c, a }: { c: PaintCtx; a: AttrMap }) {
  const { skin } = c;
  const lipBase = c.sex === 'M' ? mix(skin.lip, skin.base, 0.3) : c.g.child > 0.5 ? mix(skin.lip, '#e07a7a', 0.15) : skin.lip;
  const lipTop = mix(c.sex === 'M' ? mix(skin.lipDark, skin.shadow, 0.3) : skin.lipDark, lipBase, 0.25);
  const mc = c.id('mouthClip');
  const lg = c.id('lowLip');
  return (
    <g>
      <defs>
        <linearGradient id={lg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={shade(lipBase, -0.08)} />
          <stop offset="0.45" stop-color={shade(lipBase, 0.12)} />
          <stop offset="1" stop-color={shade(lipBase, -0.12)} />
        </linearGradient>
        <clipPath id={mc}>
          <path data-r="mClip" {...a.mClip} />
        </clipPath>
      </defs>
      <path data-r="mOpen" {...a.mOpen} fill="#3a141c" />
      <g clip-path={`url(#${mc})`}>
        <ellipse cx={CX} cy={c.g.mouthY + 8} rx={c.g.mouthW * 0.7} ry="4" fill="#9a3f4c" opacity="0.8" />
        <path data-r="mTeeth" {...a.mTeeth} fill="#f8f1e6" />
      </g>
      <path data-r="mUpper" {...a.mUpper} fill={lipTop} />
      <path data-r="mLower" {...a.mLower} fill={`url(#${lg})`} />
      <path data-r="mLine" {...a.mLine} fill="none" stroke={shade(skin.lipDark, -0.35)} stroke-width="1.05" stroke-linecap="round" />
      <path data-r="mCornerL" {...a.mCornerL} fill="none" stroke={skin.deep} stroke-opacity="0.35" stroke-width="0.8" stroke-linecap="round" />
      <path data-r="mCornerR" {...a.mCornerR} fill="none" stroke={skin.deep} stroke-opacity="0.3" stroke-width="0.8" stroke-linecap="round" />
    </g>
  );
}
