import type { VNode } from 'preact';
import { createRng } from '@core';
import { luminance, mix, shade } from '../../fx/color';
import { CX, type Side } from '../geometry';
import { GOLD } from '../palette';
import { P, headPath, smooth, type Pt } from '../paths';
import type { AttrMap } from '../rig';
import type { PaintCtx } from './ctx';

/** Soft radial falloff — a cheap stand-in for a blurred ellipse. */
function softGrad(c: PaintCtx, name: string, color: string) {
  return (
    <radialGradient id={c.id(name)}>
      <stop offset="0" stop-color={color} stop-opacity="1" />
      <stop offset="0.45" stop-color={color} stop-opacity="0.7" />
      <stop offset="1" stop-color={color} stop-opacity="0" />
    </radialGradient>
  );
}

export function faceDefs(c: PaintCtx) {
  const { skin, g } = c;
  return (
    <>
      <radialGradient id={c.id('skin')} gradientUnits="userSpaceOnUse" cx={CX + 10} cy={g.eyeY - 6} r={g.headW * 1.55}>
        <stop offset="0" stop-color={skin.light} />
        <stop offset="0.42" stop-color={skin.base} />
        <stop offset="0.82" stop-color={skin.shadow} />
        <stop offset="1" stop-color={skin.deep} />
      </radialGradient>
      <linearGradient id={c.id('skinSide')} gradientUnits="userSpaceOnUse" x1={CX - g.headW} y1="0" x2={CX + g.headW} y2="0">
        <stop offset="0" stop-color={skin.deep} stop-opacity="0.55" />
        <stop offset="0.3" stop-color={skin.deep} stop-opacity="0" />
        <stop offset="1" stop-color={skin.deep} stop-opacity="0" />
      </linearGradient>
      <linearGradient id={c.id('rim')} gradientUnits="userSpaceOnUse" x1={CX + g.headW * 0.45} y1="0" x2={CX + g.headW + 2} y2="0">
        <stop offset="0" stop-color={GOLD} stop-opacity="0" />
        <stop offset="1" stop-color={GOLD} stop-opacity="0.95" />
      </linearGradient>
      <radialGradient id={c.id('blush')}>
        <stop offset="0" stop-color={skin.blush} stop-opacity="0.75" />
        <stop offset="1" stop-color={skin.blush} stop-opacity="0" />
      </radialGradient>
      <radialGradient id={c.id('sclera')} gradientUnits="objectBoundingBox" cx="0.5" cy="0.6" r="0.6">
        <stop offset="0" stop-color="#fdfaf5" />
        <stop offset="0.7" stop-color="#efe6df" />
        <stop offset="1" stop-color="#d6c7c0" />
      </radialGradient>
      <radialGradient id={c.id('scleraRed')} gradientUnits="objectBoundingBox" cx="0.5" cy="0.55" r="0.62">
        <stop offset="0" stop-color="#f9e2dc" />
        <stop offset="0.55" stop-color="#f1b4ad" />
        <stop offset="1" stop-color="#d9636a" />
      </radialGradient>
      <radialGradient id={c.id('iris')} gradientUnits="objectBoundingBox" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color={shade(c.spec.irisColor, 0.35)} />
        <stop offset="0.38" stop-color={shade(c.spec.irisColor, 0.22)} />
        <stop offset="0.75" stop-color={c.spec.irisColor} />
        <stop offset="1" stop-color={shade(c.spec.irisColor, -0.55)} />
      </radialGradient>
      {softGrad(c, 'gDeep', skin.deep)}
      {softGrad(c, 'gShadow', skin.shadow)}
      {softGrad(c, 'gLight', skin.light)}
      {softGrad(c, 'gWhite', '#ffffff')}
      {softGrad(c, 'gBlack', '#000000')}
      {softGrad(c, 'gSheen', mix(c.hair, GOLD, 0.35))}
      <filter id={c.id('soft')} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.1" />
      </filter>
      <filter id={c.id('soft2')} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
      <clipPath id={c.id('headClip')}>
        <path d={headPath(g)} />
      </clipPath>
    </>
  );
}

function earPath(c: PaintCtx, side: Side): { outer: string; inner: string } {
  const { g } = c;
  const x0 = CX + side * (g.headW - 4.5);
  const w = g.earW;
  const t = g.earTop;
  const b = g.earBot;
  const outer = smooth(
    [
      [x0, t + 2],
      [x0 + side * w * 0.7, t - 1],
      [x0 + side * w * 1.05, t + (b - t) * 0.3],
      [x0 + side * w * 0.75, t + (b - t) * 0.7],
      [x0 + side * w * 0.35, b],
      [x0 - side * 1, b - 2],
    ],
    false,
  ) + 'Z';
  const inner = `M${P(x0 + side * w * 0.25, t + 5)}C${P(x0 + side * w * 0.8, t + 3)} ${P(x0 + side * w * 0.85, t + (b - t) * 0.55)} ${P(x0 + side * w * 0.35, t + (b - t) * 0.75)}`;
  return { outer, inner };
}

export function Ears({ c }: { c: PaintCtx }) {
  const { skin } = c;
  return (
    <g>
      {([-1, 1] as Side[]).map((side) => {
        const e = earPath(c, side);
        return (
          <g key={side}>
            <path d={e.outer} fill={side < 0 ? skin.shadow : skin.base} />
            <path d={e.outer} fill={skin.warm} opacity="0.35" />
            <path d={e.inner} fill="none" stroke={skin.deep} stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
            {side > 0 && <path d={e.outer} fill="none" stroke={GOLD} stroke-opacity="0.55" stroke-width="1" />}
          </g>
        );
      })}
    </g>
  );
}

export function Head({ c, a }: { c: PaintCtx; a: AttrMap }) {
  const { g, skin } = c;
  const head = headPath(g);
  const child = g.child;
  const blushO = 0.22 + child * 0.25;
  const ey = g.eyeY;
  return (
    <g>
      <path d={head} fill={`url(#${c.id('skin')})`} />
      <g clip-path={`url(#${c.id('headClip')})`}>
        <path d={head} fill={`url(#${c.id('skinSide')})`} />
        {/* cheekbone & temple contour on the shadow side */}
        <ellipse cx={CX - g.cheekW + 4} cy={ey + 16} rx={(9) * 1.45} ry={(16) * 1.45} fill={`url(#${c.id('gDeep')})`} opacity="0.16"/>
        {/* under-jaw occlusion */}
        <path d={headPath(g, 0)} fill="none" stroke={skin.deep} stroke-opacity="0.08" stroke-width="6" transform="translate(-2 -1)" />
        <path d={headPath(g, 0)} fill="none" stroke={skin.deep} stroke-opacity="0.08" stroke-width="3" transform="translate(-2 -1)" />
        {/* forehead sheen from the key light */}
        <ellipse cx={CX + 9} cy={g.hairline + 12} rx={(15) * 1.45} ry={(7) * 1.45} fill={`url(#${c.id('gLight')})`} opacity="0.4"/>
        {/* eye sockets */}
        <ellipse cx={CX - g.eyeDX} cy={ey - 1} rx={(g.eyeW + 3.5) * 1.45} ry={(g.eyeH + 3.2) * 1.45} fill={`url(#${c.id('gShadow')})`} opacity="0.32"/>
        <ellipse cx={CX + g.eyeDX} cy={ey - 1} rx={(g.eyeW + 3.5) * 1.45} ry={(g.eyeH + 3.2) * 1.45} fill={`url(#${c.id('gShadow')})`} opacity="0.24"/>
        <g data-r="cheeks" {...a.cheeks}>
          <ellipse cx={CX - 24} cy={ey + 20} rx="10" ry="6.5" fill={`url(#${c.id('blush')})`} opacity={blushO} />
          <ellipse cx={CX + 24} cy={ey + 20} rx="10" ry="6.5" fill={`url(#${c.id('blush')})`} opacity={blushO} />
          <ellipse cx={CX + 25} cy={ey + 15} rx={(5) * 1.45} ry={(2.2) * 1.45} fill={`url(#${c.id('gLight')})`} opacity="0.35"/>
        </g>
        {/* chin highlight + soft shadow under the lower lip */}
        <ellipse cx={CX + 2} cy={g.chinY - 7} rx={(7) * 1.45} ry={(3.2) * 1.45} fill={`url(#${c.id('gLight')})`} opacity="0.22"/>
        <ellipse cx={CX} cy={g.mouthY + g.lipL * 2 + 3.2} rx={(g.mouthW * 0.5) * 1.45} ry={(1.7) * 1.45} fill={`url(#${c.id('gDeep')})`} opacity="0.28"/>
        {/* rim light from the gold key */}
        <path d={head} fill="none" stroke={`url(#${c.id('rim')})`} stroke-width="3.2" />
      </g>
    </g>
  );
}

export function Nose({ c }: { c: PaintCtx }) {
  const { g, skin } = c;
  const ny = g.noseY;
  const w = g.noseW;
  const top = g.eyeY - 2;
  const dark = skin.deep;
  return (
    <g>
      {/* bridge shadow on the far side */}
      <path d={`M${P(CX - 4.2, top)}C${P(CX - 5, top + 10)} ${P(CX - 6.5, ny - 10)} ${P(CX - w + 0.5, ny - 3)}`} stroke={skin.shadow} stroke-width="3.2" fill="none" opacity="0.28" stroke-linecap="round" />
      {/* bridge highlight */}
      <path d={`M${P(CX + 1.2, top + 6)}L${P(CX + 1.8, ny - 6)}`} stroke={skin.light} stroke-width="2" stroke-linecap="round" opacity="0.3" />
      {/* tip + alae */}
      <ellipse cx={CX} cy={ny - 1.2} rx={w * 0.55} ry="3.6" fill={skin.warm} opacity="0.35" />
      <path d={`M${P(CX - w, ny - 2.5)}C${P(CX - w - 2.2, ny + 1)} ${P(CX - w + 1.2, ny + 3.4)} ${P(CX - w * 0.42, ny + 2.6)}`} stroke={dark} stroke-width="1.15" fill="none" stroke-linecap="round" opacity="0.6" />
      <path d={`M${P(CX + w, ny - 2.5)}C${P(CX + w + 2.2, ny + 1)} ${P(CX + w - 1.2, ny + 3.4)} ${P(CX + w * 0.42, ny + 2.6)}`} stroke={dark} stroke-width="1.15" fill="none" stroke-linecap="round" opacity="0.45" />
      <ellipse cx={CX - w * 0.42} cy={ny + 2.2} rx="1.5" ry="0.8" fill={shade(dark, -0.3)} opacity="0.42" transform={`rotate(-18 ${CX - w * 0.42} ${ny + 2.2})`} />
      <ellipse cx={CX + w * 0.42} cy={ny + 2.2} rx="1.5" ry="0.8" fill={shade(dark, -0.3)} opacity="0.34" transform={`rotate(18 ${CX + w * 0.42} ${ny + 2.2})`} />
      <path d={`M${P(CX - w * 0.3, ny + 3.2)}Q${P(CX, ny + 4.4)} ${P(CX + w * 0.3, ny + 3.2)}`} stroke={dark} stroke-width="0.8" fill="none" opacity="0.35" />
      <ellipse cx={CX + 1.2} cy={ny - 3} rx="1.8" ry="1.1" fill="#fff" opacity="0.38" />
      {/* philtrum */}
      <path d={`M${P(CX - 1.8, ny + 5.5)}L${P(CX - 2.2, g.mouthY - g.lipU - 0.5)}M${P(CX + 1.8, ny + 5.5)}L${P(CX + 2.2, g.mouthY - g.lipU - 0.5)}`} stroke={skin.shadow} stroke-width="1.4" opacity="0.14" />
    </g>
  );
}

/** Age lines, folds and spots. Animated folds carry data-r ids. */
export function AgeMarks({ c, a }: { c: PaintCtx; a: AttrMap }) {
  const { g, skin, age } = c;
  const k = Math.max(0, Math.min(1, (age - 30) / 45));
  const line = skin.deep;
  const ey = g.eyeY;
  const my = g.mouthY;
  const items: VNode[] = [];
  const nl = (side: Side) => `M${P(CX + side * (g.noseW + 2.5), g.noseY - 1)}C${P(CX + side * (g.noseW + 7.5), g.noseY + 6)} ${P(CX + side * (g.mouthW + 5), my - 4)} ${P(CX + side * (g.mouthW + 4), my + 4 + k * 3)}`;
  items.push(
    <g key="nlf" data-r="nlf" {...a.nlf} stroke={line} fill="none" stroke-linecap="round">
      <path d={nl(-1)} stroke-width="1.2" stroke-opacity={0.12 + k * 0.4} />
      <path d={nl(1)} stroke-width="1.1" stroke-opacity={0.1 + k * 0.32} />
    </g>,
  );
  // forehead lines: always rendered, opacity = expression + age
  const fo = Math.max(0, (age - 45) / 40);
  const fy = g.hairline + (g.browY - g.hairline) * 0.45;
  const fl = (dy: number, w: number) => `M${P(CX - w, fy + dy + 1)}Q${P(CX - w / 2, fy + dy - 1.2)} ${P(CX, fy + dy)}T${P(CX + w, fy + dy + 0.8)}`;
  items.push(
    <g key="fstatic" stroke={line} fill="none" stroke-linecap="round" stroke-opacity={fo * 0.35}>
      <path d={fl(0, 18)} stroke-width="0.9" />
      <path d={fl(5, 15)} stroke-width="0.8" />
    </g>,
    <g key="fdyn" data-r="fhead" {...a.fhead} stroke={line} fill="none" stroke-linecap="round" stroke-opacity={0.28 + k * 0.2}>
      <path d={fl(-4, 14)} stroke-width="0.9" />
      <path d={fl(0.5, 19)} stroke-width="1" />
      <path d={fl(5.5, 16)} stroke-width="0.9" />
    </g>,
    <g key="glab" data-r="glab" {...a.glab} stroke={line} fill="none" stroke-linecap="round" stroke-opacity="0.45">
      <path d={`M${P(CX - 2.6, g.browY - 4)}Q${P(CX - 3.6, g.browY + 1)} ${P(CX - 2.2, g.browY + 5)}`} stroke-width="1" />
      <path d={`M${P(CX + 2.6, g.browY - 4)}Q${P(CX + 3.6, g.browY + 1)} ${P(CX + 2.2, g.browY + 5)}`} stroke-width="1" />
      <path d={`M${P(CX - 4, g.noseY - 22)}Q${P(CX, g.noseY - 20.5)} ${P(CX + 4, g.noseY - 22)}`} stroke-width="0.8" />
    </g>,
  );
  if (age >= 40) {
    const o = Math.min(1, (age - 40) / 35);
    for (const side of [-1, 1] as Side[]) {
      const ex = CX + side * g.eyeDX;
      items.push(
        <path key={`bag${side}`} d={`M${P(ex - side * 6, ey + g.eyeLow + 3.2)}Q${P(ex, ey + g.eyeLow + 6.5 + o)} ${P(ex + side * 7, ey + g.eyeLow + 2.2)}`} stroke={line} stroke-opacity={0.18 + o * 0.25} stroke-width="0.9" fill="none" stroke-linecap="round" />,
      );
      if (age >= 48) {
        const xo = ex + side * (g.eyeW + 2);
        items.push(
          <g key={`crow${side}`} stroke={line} stroke-opacity={0.2 + o * 0.3} stroke-width="0.75" fill="none" stroke-linecap="round">
            <path d={`M${P(xo, ey - 2)}L${P(xo + side * 4.5, ey - 4.2)}`} />
            <path d={`M${P(xo + side * 0.5, ey + 0.6)}L${P(xo + side * 5.2, ey + 0.8)}`} />
            <path d={`M${P(xo, ey + 3)}L${P(xo + side * 4.2, ey + 5.6)}`} />
          </g>,
        );
      }
    }
  }
  if (age >= 62) {
    const o = Math.min(1, (age - 62) / 20);
    for (const side of [-1, 1] as Side[]) {
      items.push(
        <path key={`mar${side}`} d={`M${P(CX + side * (g.mouthW + 2.5), my + 4)}Q${P(CX + side * (g.mouthW + 3.5), my + 9)} ${P(CX + side * (g.mouthW + 2), my + 13)}`} stroke={line} stroke-opacity={0.2 + o * 0.25} stroke-width="0.9" fill="none" stroke-linecap="round" />,
      );
    }
    // lip lines
    items.push(
      <g key="lip-lines" stroke={line} stroke-opacity={0.15 + o * 0.15} stroke-width="0.5" stroke-linecap="round">
        <path d={`M${P(CX - 5, my - g.lipU - 2.5)}L${P(CX - 4.6, my - g.lipU - 0.2)}`} />
        <path d={`M${P(CX + 4, my - g.lipU - 2.2)}L${P(CX + 3.7, my - g.lipU - 0.2)}`} />
      </g>,
    );
  }
  if (age >= 70) {
    const r = createRng(c.t.seed ^ 0x5eed);
    const spots: Pt[] = [];
    const n = r.int(4, 8);
    for (let i = 0; i < n; i++) {
      const side = r.chance(0.5) ? -1 : 1;
      const zone = r.int(0, 2);
      if (zone === 0) spots.push([CX + side * r.float(8, 28), r.float(g.hairline + 3, g.browY - 8)]);
      else if (zone === 1) spots.push([CX + side * r.float(g.headW - 9, g.headW - 4), r.float(g.eyeY - 16, g.eyeY - 4)]);
      else spots.push([CX + side * r.float(18, 30), r.float(g.eyeY + 14, g.eyeY + 26)]);
    }
    items.push(
      <g key="spots" fill={mix(skin.deep, '#5a3a20', 0.4)} opacity={luminance(skin.base) > 0.45 ? 0.32 : 0.22}>
        {spots.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={0.9 + (i % 3) * 0.5} ry={0.7 + (i % 2) * 0.4} />)}
      </g>,
    );
  }
  return <g>{items}</g>;
}
