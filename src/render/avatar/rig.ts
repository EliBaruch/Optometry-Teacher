/**
 * The facial rig: numeric expression parameters -> SVG attributes for every
 * animated part (lids, irises, brows, mouth, wrinkles). Pure functions so the
 * static render and the animation loop share one source of truth.
 */
import type { Eye, PatientFindings } from '@core';
import { CX, type Geo, type Side } from './geometry';
import { P, f, quadRibbon } from './paths';

export type Expression = 'neutral' | 'worried' | 'pain' | 'happy' | 'relieved' | 'squint' | 'surprised';
export const EXPRESSIONS: readonly Expression[] = ['neutral', 'worried', 'pain', 'happy', 'relieved', 'squint', 'surprised'];

export type External = NonNullable<PatientFindings['external']>;
export interface Strabismus {
  eye: Eye;
  direction: 'in' | 'out' | 'up' | 'down';
}

export interface RigParams {
  /** upper-lid closure 0 open .. 1 shut; L = viewer-left = OD */
  lidL: number;
  lidR: number;
  /** extra eye opening (lid retraction / surprise), 0..1 */
  wideL: number;
  wideR: number;
  /** lower-lid raise 0..1 (smile / squint) */
  lowL: number;
  lowR: number;
  /** brow offsets in px; negative = raised */
  browInL: number;
  browOutL: number;
  browInR: number;
  browOutR: number;
  /** inner brows pulled toward the midline (corrugator) */
  knit: number;
  /** mouth width multiplier */
  mouthW: number;
  /** + smile / - frown */
  curve: number;
  /** 0..1 */
  open: number;
  teeth: number;
  cheek: number;
  forehead: number;
  frown: number;
}

const BASE: RigParams = {
  lidL: 0.1, lidR: 0.1, wideL: 0, wideR: 0, lowL: 0, lowR: 0,
  browInL: 0, browOutL: 0, browInR: 0, browOutR: 0, knit: 0,
  mouthW: 1, curve: 0.7, open: 0, teeth: 0, cheek: 0, forehead: 0, frown: 0,
};

const PRESETS: Record<Expression, Partial<RigParams>> = {
  neutral: {},
  worried: { lidL: 0.04, lidR: 0.04, browInL: -4.2, browInR: -4.2, browOutL: 1, browOutR: 1, knit: 1.2, curve: -2.2, mouthW: 0.92, forehead: 0.9, frown: 0.3 },
  pain: { lidL: 0.62, lidR: 0.62, lowL: 0.5, lowR: 0.5, browInL: -1.2, browInR: -1.2, browOutL: 2.2, browOutR: 2.2, knit: 2.8, curve: -1.8, open: 0.38, teeth: 1, mouthW: 1.08, frown: 1, forehead: 0.35 },
  happy: { lidL: 0.3, lidR: 0.3, lowL: 0.55, lowR: 0.55, browInL: -1.6, browInR: -1.6, browOutL: -1.2, browOutR: -1.2, curve: 4.4, open: 0.5, teeth: 1, mouthW: 1.12, cheek: 1 },
  relieved: { lidL: 0.34, lidR: 0.34, lowL: 0.2, lowR: 0.2, browInL: -2.2, browInR: -2.2, browOutL: 0.6, browOutR: 0.6, curve: 2.6, mouthW: 1.03, cheek: 0.45, forehead: 0.25 },
  squint: { lidL: 0.56, lidR: 0.56, lowL: 0.48, lowR: 0.48, browInL: 2.4, browInR: 2.4, browOutL: 1.4, browOutR: 1.4, knit: 1.6, curve: -0.4, frown: 0.75 },
  surprised: { lidL: 0, lidR: 0, wideL: 0.75, wideR: 0.75, lowL: 0, lowR: 0, browInL: -6.5, browInR: -6.5, browOutL: -5, browOutR: -5, curve: 0, open: 0.85, teeth: 0.25, mouthW: 0.8, forehead: 1 },
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Target rig for an expression with clinical signs layered on top. */
export function targetRig(expression: Expression = 'neutral', ext?: External): RigParams {
  const p: RigParams = { ...BASE, ...PRESETS[expression] };
  if (!ext) return p;
  if (ext.squinting || ext.photophobia) {
    p.lidL = Math.max(p.lidL, 0.5);
    p.lidR = Math.max(p.lidR, 0.5);
    p.lowL = Math.max(p.lowL, 0.4);
    p.lowR = Math.max(p.lowR, 0.4);
    p.browInL += 2;
    p.browInR += 2;
    p.knit = Math.max(p.knit, 1.4);
    p.frown = Math.max(p.frown, 0.7);
    p.wideL = p.wideR = 0;
  }
  for (const eye of ext.ptosis ?? []) {
    // Drooping upper lid; ipsilateral brow lifts (frontalis compensation).
    if (eye === 'OD') {
      p.lidL = clamp(p.lidL + 0.45, 0, 0.82);
      p.wideL = 0;
      p.browInL -= 2;
      p.browOutL -= 2.8;
    } else {
      p.lidR = clamp(p.lidR + 0.45, 0, 0.82);
      p.wideR = 0;
      p.browInR -= 2;
      p.browOutR -= 2.8;
    }
    p.forehead = Math.max(p.forehead, 0.4);
  }
  for (const eye of ext.proptosis ?? []) {
    // Lid retraction + inferior scleral show.
    if (eye === 'OD') {
      p.lidL = 0;
      p.wideL = Math.max(p.wideL, 0.9);
      p.lowL = Math.min(p.lowL, -0.45);
    } else {
      p.lidR = 0;
      p.wideR = Math.max(p.wideR, 0.9);
      p.lowR = Math.min(p.lowR, -0.45);
    }
  }
  return p;
}

export function lerpRig(a: RigParams, b: RigParams, t: number): RigParams {
  const out = { ...a };
  for (const k of Object.keys(b) as (keyof RigParams)[]) out[k] = lerp(a[k], b[k], t);
  return out;
}

export function rigDistance(a: RigParams, b: RigParams): number {
  let d = 0;
  for (const k of Object.keys(b) as (keyof RigParams)[]) d = Math.max(d, Math.abs(a[k] - b[k]));
  return d;
}

// ---------------------------------------------------------------------------
// Eyes

export interface EyeShape {
  almond: string;
  lid: string;
  lidEdge: string;
  lower: string;
  crease: string;
}

export function eyeShape(g: Geo, side: Side, closure: number, wide: number, low: number): EyeShape {
  const ex = CX + side * g.eyeDX;
  const ey = g.eyeY;
  const xi = ex - side * g.eyeW; // inner canthus (toward nose)
  const xo = ex + side * g.eyeW; // outer canthus
  const yi = ey + 0.5;
  const yo = ey - 0.9;
  const w = wide;
  const h = g.eyeH * (1 + w * 0.32);
  const L = g.eyeLow * (1 - clamp(low, -1, 1) * 0.85);
  const ux1 = xo + (xi - xo) * 0.22;
  const ux2 = xo + (xi - xo) * 0.68;
  const uy1 = ey - h * 1.34;
  const uy2 = ey - h * 1.4;
  const lx1 = xo + (xi - xo) * 0.72;
  const lx2 = xo + (xi - xo) * 0.26;
  const ly1 = ey + L * 1.3;
  const ly2 = ey + L * 1.36;
  const c = clamp(closure, 0, 1);
  // lid edge drifts from the upper contour to the lower contour as it closes
  const ey1 = lerp(uy1, ly2 - 0.6, c);
  const ey2 = lerp(uy2, ly1 - 0.6, c);
  const almond = `M${P(xo, yo)}C${P(ux1, uy1)} ${P(ux2, uy2)} ${P(xi, yi)}C${P(lx1, ly1)} ${P(lx2, ly2)} ${P(xo, yo)}Z`;
  const lidEdge = `M${P(xo, yo)}C${P(ux1, ey1)} ${P(ux2, ey2)} ${P(xi, yi)}`;
  const lid = `M${P(xo, yo)}C${P(ux1, uy1 - 0.4)} ${P(ux2, uy2 - 0.4)} ${P(xi, yi)}C${P(ux2, ey2)} ${P(ux1, ey1)} ${P(xo, yo)}Z`;
  const lower = `M${P(xi, yi)}C${P(lx1, ly1)} ${P(lx2, ly2)} ${P(xo, yo)}`;
  const ch = h * 1.42 + 3.2 - c * 1.2;
  const crease = `M${P(xo - side * 0.6, yo - 1.6)}C${P(ux1, ey - ch)} ${P(ux2, ey - ch - 0.4)} ${P(xi + side * 1.5, yi - 3.4)}`;
  return { almond, lid, lidEdge, lower, crease };
}

// ---------------------------------------------------------------------------
// Brows

export function browPath(g: Geo, side: Side, inY: number, outY: number, knit: number): string {
  const by = g.browY;
  const t = g.browThick;
  const inner: [number, number] = [CX + side * (5.8 - knit * 0.9), by + 1.2 + inY];
  const outer: [number, number] = [CX + side * (g.eyeDX + g.eyeW + 4.2), by + 3.2 + outY];
  const ctrl: [number, number] = [CX + side * (g.eyeDX + 2.5), by - 4.4 + (inY + outY) * 0.5];
  return quadRibbon(inner, ctrl, outer, (u) => (3.3 - u * 2.2 + Math.sin(u * Math.PI) * 0.6) * t, 9);
}

// ---------------------------------------------------------------------------
// Mouth

export interface MouthShape {
  open: string;
  teeth: string;
  upper: string;
  lower: string;
  line: string;
  cornerL: string;
  cornerR: string;
}

export function mouthShape(g: Geo, p: RigParams): MouthShape {
  const y = g.mouthY;
  const w = g.mouthW * p.mouthW;
  const curve = p.curve;
  const c = -curve * 0.78; // corner lift
  const k = curve * 0.5; // centre dip of the lip line
  const o = clamp(p.open, 0, 1) * 9;
  const lx = CX - w;
  const rx = CX + w;
  const cy = y + c;
  const upInner = y + k - o * 0.18;
  const loInner = y + k + o * 1.35;
  const smile = clamp(curve / 4.4, 0, 1);
  const tu = g.lipU * (1 - smile * 0.25);
  const tl = g.lipL * (1 - smile * 0.4 - clamp(p.open, 0, 1) * 0.15);
  const upperTop = y - tu + k * 0.35 - o * 0.18;

  const open = `M${P(lx, cy)}Q${P(CX, upInner * 2 - (cy + cy) / 2)} ${P(rx, cy)}Q${P(CX, loInner * 2 - cy)} ${P(lx, cy)}Z`;
  const th = Math.min(o * 0.62, 4.4) * clamp(p.teeth, 0, 1);
  const lowerTeeth = p.teeth > 0.6 && o < 5 && curve < 1 ? Math.min(o * 0.5, 2.6) : 0;
  const teeth =
    th > 0.05
      ? `M${P(lx - 1, cy - 6)}L${P(rx + 1, cy - 6)}L${P(rx + 1, cy + th)}Q${P(CX, upInner * 2 - cy + th)} ${P(lx - 1, cy + th)}Z` +
        (lowerTeeth > 0 ? `M${P(lx - 1, cy + 14)}L${P(rx + 1, cy + 14)}L${P(rx + 1, cy - lowerTeeth)}Q${P(CX, loInner * 2 - cy - lowerTeeth)} ${P(lx - 1, cy - lowerTeeth)}Z` : '')
      : '';

  // Upper lip with cupid's bow
  const bowW = w * 0.22;
  const upper =
    `M${P(lx, cy)}` +
    `C${P(lx + w * 0.35, cy - tu * 0.35)} ${P(CX - bowW * 1.6, upperTop + 0.2)} ${P(CX - bowW, upperTop)}` +
    `Q${P(CX - bowW * 0.4, upperTop - 0.1)} ${P(CX, upperTop + tu * 0.28)}` +
    `Q${P(CX + bowW * 0.4, upperTop - 0.1)} ${P(CX + bowW, upperTop)}` +
    `C${P(CX + bowW * 1.6, upperTop + 0.2)} ${P(rx - w * 0.35, cy - tu * 0.35)} ${P(rx, cy)}` +
    `Q${P(CX, upInner * 2 - cy)} ${P(lx, cy)}Z`;
  const loBottom = loInner + tl * 1.25;
  const lower =
    `M${P(rx, cy)}` +
    `C${P(rx - w * 0.2, loBottom - tl * 0.3)} ${P(CX + w * 0.45, loBottom)} ${P(CX, loBottom)}` +
    `C${P(CX - w * 0.45, loBottom)} ${P(lx + w * 0.2, loBottom - tl * 0.3)} ${P(lx, cy)}` +
    `Q${P(CX, loInner * 2 - cy)} ${P(rx, cy)}Z`;
  const lineY = o < 0.5 ? (upInner + loInner) / 2 : upInner;
  const line = `M${P(lx - 0.6, cy + 0.2)}Q${P(CX, lineY * 2 - cy)} ${P(rx + 0.6, cy + 0.2)}`;
  const dimple = Math.max(0, curve) * 0.5;
  const cornerL = `M${P(lx - 0.5, cy - 0.8 - dimple)}Q${P(lx - 2 - dimple * 0.5, cy + 0.2)} ${P(lx - 0.4, cy + 1.4)}`;
  const cornerR = `M${P(rx + 0.5, cy - 0.8 - dimple)}Q${P(rx + 2 + dimple * 0.5, cy + 0.2)} ${P(rx + 0.4, cy + 1.4)}`;
  return { open, teeth, upper, lower, line, cornerL, cornerR };
}

// ---------------------------------------------------------------------------
// Everything animated, as attribute maps keyed by data-r name.

export interface Gaze {
  x: number;
  y: number;
}

export interface RigInput {
  params: RigParams;
  gazeL: Gaze;
  gazeR: Gaze;
  blink: number;
  breath: number; // -1..1
  sway: number; // -1..1
  nod: number; // -1..1
}

export type AttrMap = Record<string, Record<string, string>>;

export function rigAttrs(g: Geo, r: RigInput): AttrMap {
  const p = r.params;
  const out: AttrMap = {};
  const eye = (side: Side, key: 'L' | 'R') => {
    const gz = key === 'L' ? r.gazeL : r.gazeR;
    const gy = clamp(gz.y, -1.6, 1.6);
    // the upper lid follows vertical gaze (lid–globe synergy)
    const base = clamp((key === 'L' ? p.lidL : p.lidR) + Math.max(0, gy) * 0.2, 0, 1);
    const blink = clamp(r.blink, 0, 1);
    const closure = base + (1 - base) * blink;
    const wide = ((key === 'L' ? p.wideL : p.wideR) + Math.max(0, -gy) * 0.18) * (1 - blink);
    const low = key === 'L' ? p.lowL : p.lowR;
    const s = eyeShape(g, side, closure, wide, low);
    const ix = clamp(gz.x, -1.6, 1.6) * g.eyeW * 0.44;
    const iy = gy * g.eyeH * 0.42;
    out[`clip${key}`] = { d: s.almond };
    out[`lid${key}`] = { d: s.lid };
    out[`lash${key}`] = { d: s.lidEdge };
    out[`shade${key}`] = { d: s.lidEdge };
    out[`low${key}`] = { d: s.lower };
    out[`tear${key}`] = { d: s.lower };
    out[`crease${key}`] = { d: s.crease };
    out[`iris${key}`] = { transform: `translate(${f(ix)} ${f(iy)})` };
    // corneal reflex barely moves with rotation — so a deviated eye shows a
    // decentred reflex (Hirschberg), exactly as in clinic.
    out[`glint${key}`] = { transform: `translate(${f(ix * 0.3)} ${f(iy * 0.3)})` };
  };
  eye(-1, 'L');
  eye(1, 'R');
  out.browL = { d: browPath(g, -1, p.browInL, p.browOutL, p.knit) };
  out.browR = { d: browPath(g, 1, p.browInR, p.browOutR, p.knit) };
  const m = mouthShape(g, p);
  out.mOpen = { d: m.open };
  out.mClip = { d: m.open };
  out.mTeeth = { d: m.teeth || 'M0,0' };
  out.mUpper = { d: m.upper };
  out.mLower = { d: m.lower };
  out.mLine = { d: m.line, opacity: f(clamp(1 - p.open * 3, 0, 1)) };
  out.mCornerL = { d: m.cornerL };
  out.mCornerR = { d: m.cornerR };
  out.cheeks = { opacity: f(0.35 + p.cheek * 0.65), transform: `translate(0 ${f(-p.cheek * 1.6)})` };
  out.nlf = { opacity: f(clamp(0.35 + p.cheek * 0.6 + Math.max(0, -p.curve) * 0.05, 0, 1)) };
  out.fhead = { opacity: f(clamp(p.forehead, 0, 1)) };
  out.glab = { opacity: f(clamp(p.frown, 0, 1)) };
  const by = r.breath;
  out.body = { transform: `translate(0 ${f(by * 0.9)}) scale(1 ${f(1 + by * 0.004)})` };
  const rot = r.sway * 1.4;
  out.head = { transform: `translate(${f(r.sway * 0.6)} ${f(by * 0.55 + r.nod * 0.7)}) rotate(${f(rot)} ${CX} ${f(g.chinY + 6)})` };
  return out;
}
