import type { VNode } from 'preact';
import { createRng } from '@core';
import { luminance, mix, shade } from '../color';
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

/**
 * Conjunctival vessel tree: trunks running in from the canthi and fornices,
 * branching and thinning toward the limbus. Returns [trunks, branches].
 */
function vessels(c: PaintCtx, side: Side): [string, string] {
  const r = createRng((c.t.seed ^ (side > 0 ? 0xa11 : 0xb22)) >>> 0);
  const { g } = c;
  const ex = CX + side * g.eyeDX;
  const ey = g.eyeY;
  let trunks = '';
  let branches = '';
  const walk = (x0: number, y0: number, dx: number, dy: number, steps: number, step: number, branchy: boolean): string => {
    let x = x0;
    let y = y0;
    let d = `M${P(x, y)}`;
    for (let k = 0; k < steps; k++) {
      const nx = x + dx * step + r.float(-0.5, 0.5);
      const ny = y + dy * step + r.float(-0.7, 0.7);
      d += `Q${P((x + nx) / 2 + r.float(-0.7, 0.7), (y + ny) / 2 + r.float(-0.7, 0.7))} ${P(nx, ny)}`;
      if (branchy && r.chance(0.55)) branches += walk(nx, ny, dx * 0.6 + r.float(-0.5, 0.5), dy * 0.6 + r.float(-0.8, 0.8), r.int(1, 3), step * 0.7, false);
      x = nx;
      y = ny;
    }
    return d;
  };
  for (let i = 0; i < 16; i++) {
    const zone = i % 4;
    let x0: number;
    let y0: number;
    let dx: number;
    let dy: number;
    if (zone === 0) {
      // from the outer canthus
      x0 = ex + side * (g.eyeW + 0.8);
      y0 = ey + r.float(-g.eyeH * 0.6, g.eyeLow * 0.9);
      dx = -side;
      dy = r.float(-0.3, 0.3);
    } else if (zone === 1) {
      // from the inner canthus
      x0 = ex - side * (g.eyeW + 0.8);
      y0 = ey + r.float(-g.eyeH * 0.5, g.eyeLow * 0.8);
      dx = side;
      dy = r.float(-0.3, 0.3);
    } else {
      // from the upper / lower fornix
      const up = zone === 2;
      x0 = ex + r.float(-g.eyeW * 0.85, g.eyeW * 0.85);
      y0 = up ? ey - g.eyeH * 1.5 : ey + g.eyeLow * 1.4;
      dx = (ex - x0) / g.eyeW * 0.5;
      dy = up ? 0.9 : -0.9;
    }
    trunks += walk(x0, y0, dx, dy, r.int(3, 5), r.float(1.2, 1.9), true);
  }
  return [trunks, branches];
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
  const flick = (c.sex === 'F' ? 1 : 0.75) * (1 - g.child * 0.6);
  const inj = c.id(`inj${key}`);
  const canth = c.id(`canth${key}`);
  const limb = c.id(`limb${key}`);
  const vt = red ? vessels(c, side) : null;
  const icx = ex + ox;
  const icy = ey + oy;
  const rG = g.eyeW * 1.12;
  const lum = luminance(c.spec.irisColor);
  const ruff = mix(c.spec.irisColor, '#f0d6ae', lum < 0.22 ? 0.5 : 0.32);
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
      {red && (
        <defs>
          <radialGradient id={inj} gradientUnits="userSpaceOnUse" cx={icx} cy={icy} r={rG} gradientTransform={`translate(${icx} ${icy}) scale(1 0.62) translate(${-icx} ${-icy})`}>
            <stop offset="0" stop-color="#f4cdc6" />
            <stop offset={Math.min(0.5, (R * 1.05) / rG)} stop-color="#eeaaa8" />
            <stop offset="0.62" stop-color="#e2808a" />
            <stop offset="0.84" stop-color="#d1525f" />
            <stop offset="1" stop-color="#b8324a" />
          </radialGradient>
          <radialGradient id={canth}>
            <stop offset="0" stop-color="#c8303f" stop-opacity="0.75" />
            <stop offset="1" stop-color="#c8303f" stop-opacity="0" />
          </radialGradient>
          <radialGradient id={limb}>
            <stop offset="0.62" stop-color="#f8dcd5" stop-opacity="0.4" />
            <stop offset="1" stop-color="#f8dcd5" stop-opacity="0" />
          </radialGradient>
        </defs>
      )}
      <path data-r={`crease${key}`} {...a[`crease${key}`]} fill="none" stroke={skin.deep} stroke-opacity="0.42" stroke-width="0.95" stroke-linecap="round" />
      <g clip-path={`url(#${clip})`}>
        <rect x={ex - g.eyeW - 2} y={ey - g.eyeH * 2.2} width={g.eyeW * 2 + 4} height={g.eyeH * 2.2 + g.eyeLow * 2.6} fill={red ? `url(#${inj})` : c.url('sclera')} />
        {red && vt && (
          <g fill="none" stroke-linecap="round">
            {/* canthal + fornix injection is the most intense */}
            <ellipse cx={ex - side * (g.eyeW - 1)} cy={ey + 0.5} rx="3.6" ry="3.2" fill={`url(#${canth})`} />
            <ellipse cx={ex + side * (g.eyeW - 0.6)} cy={ey - 0.4} rx="3.4" ry="3" fill={`url(#${canth})`} />
            <path d={vt[0]} stroke="#9c1428" stroke-opacity="0.92" stroke-width="0.7" />
            <path d={vt[1]} stroke="#ad1d30" stroke-opacity="0.8" stroke-width="0.4" />
            {/* relatively clear perilimbal zone (conjunctival, not ciliary, pattern) */}
            <circle cx={ex + ox} cy={ey + oy} r={R * 1.3} fill={`url(#${limb})`} />
          </g>
        )}
        <g data-r={`iris${key}`} {...a[`iris${key}`]}>
          <g transform={`translate(${ex + ox} ${ey + oy})`}>
            <circle r={R + 0.5} fill={shade(c.spec.irisColor, -0.6)} opacity="0.35" />
            <circle r={R} fill={`url(#${c.id('iris')})`} />
            <g stroke={shade(c.spec.irisColor, 0.5)} stroke-opacity="0.35" stroke-width="0.32">{fibres}</g>
            <circle r={R * 0.58} fill="none" stroke={shade(c.spec.irisColor, 0.45)} stroke-opacity="0.45" stroke-width="0.5" stroke-dasharray="0.9 0.6" />
            <circle r={R - 0.25} fill="none" stroke={shade(c.spec.irisColor, -0.65)} stroke-width="0.7" />
            {/* light collarette around the pupil so its size reads on any iris */}
            <circle r={pr + 0.75} fill="none" stroke={ruff} stroke-width="1.1" opacity="0.6" />
            <circle r={pr} fill="#0b0708" />
            <circle r={pr} fill="none" stroke={shade(c.spec.irisColor, -0.45)} stroke-width="0.4" opacity="0.9" />
          </g>
        </g>
        <g data-r={`glint${key}`} {...a[`glint${key}`]}>
          <ellipse cx={ex + 1.9} cy={ey - 1.9} rx={1.45 + g.child * 0.4} ry={1.2 + g.child * 0.35} fill="#fffaf0" opacity="0.95" />
          <circle cx={ex - 1.6} cy={ey + 1.8} r="0.55" fill="#fff" opacity="0.6" />
        </g>
        <path data-r={`shade${key}`} {...a[`shade${key}`]} fill="none" stroke={skin.deep} stroke-opacity="0.2" stroke-width="3.6" />
        {tear && <path data-r={`tear${key}`} {...a[`tear${key}`]} fill="none" stroke="#e9f6ff" stroke-opacity="0.9" stroke-width="1.3" />}
        <path data-r={`lid${key}`} {...a[`lid${key}`]} fill={lidFill} />
      </g>
      <path data-r={`low${key}`} {...a[`low${key}`]} fill="none" stroke={red ? '#b8404c' : skin.deep} stroke-opacity={red ? 0.75 : 0.5} stroke-width={red ? 0.95 : 0.75} stroke-linecap="round" />
      <path data-r={`lash${key}`} {...a[`lash${key}`]} fill="none" stroke={lash} stroke-width={(c.sex === 'F' ? 1.9 : 1.5) - g.child * 0.4} stroke-linecap="round" />
      <path d={`M${P(ex + side * (g.eyeW - 0.5), ey - 1.1)}q${P(side * 1.9 * flick, -0.6 * flick)} ${P(side * 2.9 * flick, -2.2 * flick)}`} fill="none" stroke={lash} stroke-width={c.sex === 'F' ? 1.3 : 0.9} stroke-linecap="round" />
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
