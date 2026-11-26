/**
 * The biomicroscope view. A cached "world" bitmap of the eye (white-light
 * modes) or a live optical section (narrow / conical beams) is cropped and
 * magnified into a round ocular, then dressed with filters, retro-illumination,
 * the corneal overlays the eye renderer does not draw, pins and the mini-map.
 */
import { drawEye, drawSlitSection, eyeGeometry, eyeState, type EyeState } from '@render';
import { gateState, type PresentSigns } from './gate';
import { beamWidth, clarity, conePos, RESOLVABLE, technique, windowMm, ZOOM, type LampSetting } from './model';
import { clampPan, mmToScreen, type Pan } from './geo';

const WS = 1200;
const TAU = Math.PI * 2;

export interface Pin { x: number; y: number; color: string; age: number; mark: 'check' | 'cross' | 'dot' }

export interface FrameParams {
  base: EyeState;
  present: PresentSigns;
  setting: LampSetting;
  pan: Pan;
  /** seconds, animation clock (0 when reduced motion). */
  t: number;
  /** CSS px diameter of the ocular. */
  d: number;
  pins: Pin[];
  pending: { x: number; y: number } | null;
  seed: number;
  eye: 'OD' | 'OS';
  /** pulse 0..1 for the mini-map and hint ring */
  hint: { x: number; y: number } | null;
}

export interface LampPainter {
  paint(p: FrameParams): void;
  /** True when the next paint will redraw the world (cheap check for throttling). */
  animated(p: FrameParams): boolean;
  dispose(): void;
}

export function createPainter(canvas: HTMLCanvasElement): LampPainter {
  const world = document.createElement('canvas');
  world.width = WS;
  world.height = WS;
  const wctx = world.getContext('2d')!;
  const vctx = canvas.getContext('2d')!;
  let worldKey = '';
  const geo = eyeGeometry(WS, WS, eyeState());
  const pxmm = geo.pxmm;
  const ix = geo.ix;
  const iy = geo.iy;

  const keyOf = (p: FrameParams, st: EyeState): string => {
    const s = p.setting;
    const tech = technique(s);
    const f = [p.eye, tech, s.filter, s.lightsOff ? 1 : 0, st.acCells, st.acFlare, st.keraticPrecipitates ? 1 : 0, st.punctateKeratitis ? 1 : 0,
      st.dendrite ? 1 : 0, st.abrasion ? 1 : 0, st.ulcer, st.cornealHaze, st.lensOpacity, st.lensType, st.hypopyon, st.hyphema,
      st.papillae ? 1 : 0, st.irisNeovascularization ? 1 : 0, st.pupilShape, st.foreignBody ? 1 : 0, st.pupilMm.toFixed(1)].join('|');
    if (tech === 'section' || tech === 'conical') return `${f}|${s.widthMm.toFixed(2)}|${s.angle}|${p.pan.x.toFixed(2)}|${p.pan.y.toFixed(2)}|${p.t.toFixed(1)}`;
    return f;
  };

  const renderWorld = (p: FrameParams, st: EyeState) => {
    const s = p.setting;
    const tech = technique(s);
    wctx.save();
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, WS, WS);
    if (tech === 'section' || tech === 'conical') {
      wctx.fillStyle = '#050307';
      wctx.fillRect(0, 0, WS, WS);
      wctx.translate(0, -p.pan.y * pxmm);
      const beam = {
        x: Math.max(-1.15, Math.min(1.15, p.pan.x / 5.75)),
        width: s.short ? 1 : s.widthMm,
        angleDeg: s.angle,
        height: s.short ? 1 : 9,
        mag: 1,
      };
      drawSlitSection(wctx, WS, WS, st, beam, p.t);
    } else {
      const lighting = s.filter === 'cobalt' ? 'cobalt' : s.lightsOff || tech === 'retro' ? 'dim' : 'room';
      drawEye(wctx, WS, WS, { ...st, lighting }, p.t);
    }
    wctx.restore();
  };

  const paint = (p: FrameParams) => {
    const st = gateState(p.base, p.setting, p.present);
    const key = keyOf(p, st);
    if (key !== worldKey) {
      worldKey = key;
      renderWorld(p, st);
    }
    composite(p, st);
  };

  const composite = (p: FrameParams, st: EyeState) => {
    const { d, setting: s, pan } = p;
    const dpr = canvas.width / d;
    const tech = technique(s);
    const z = ZOOM[s.mag];
    const c = vctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, d, d);
    c.save();
    c.beginPath();
    c.arc(d / 2, d / 2, d / 2, 0, TAU);
    c.clip();
    c.fillStyle = '#040208';
    c.fillRect(0, 0, d, d);

    // ── crop the world
    const side = WS / z;
    const cx = ix + pan.x * pxmm;
    const cy = tech === 'section' || tech === 'conical' ? iy : iy + pan.y * pxmm;
    if (s.filter === 'redfree' && 'filter' in c) c.filter = 'contrast(1.3) saturate(0.35) brightness(1.05)';
    c.imageSmoothingQuality = 'high';
    c.drawImage(world, cx - side / 2, cy - side / 2, side, side, 0, 0, d, d);
    if ('filter' in c) c.filter = 'none';

    const sc = (d / 34) * z; // px per mm on screen
    const toS = (x: number, y: number) => mmToScreen(x, y, pan, d, s.mag);

    // ── white-light beams: a lit strip, the rest of the field falls into shadow
    if (tech === 'broad' || tech === 'retro') {
      const w = beamWidth(s) * sc;
      const x0 = d / 2 - w / 2;
      const feather = Math.max(8, w * 0.18);
      const slant = Math.tan((Math.min(75, Math.abs(s.angle)) * Math.PI) / 180) * 0.1 * Math.sign(s.angle || 1);
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.translate(d / 2, d / 2);
      c.transform(1, 0, slant, 1, 0, 0);
      c.translate(-d / 2, -d / 2);
      const g = c.createLinearGradient(0, 0, d, 0);
      const dark = tech === 'retro' ? 'rgb(120,100,125)' : 'rgb(64,52,76)';
      const stop = (x: number) => Math.max(0, Math.min(1, x / d));
      g.addColorStop(0, dark);
      g.addColorStop(stop(x0 - feather), dark);
      g.addColorStop(stop(x0), 'rgb(255,255,255)');
      g.addColorStop(stop(x0 + w), 'rgb(255,255,255)');
      g.addColorStop(stop(x0 + w + feather), dark);
      g.addColorStop(1, dark);
      c.fillStyle = g;
      c.fillRect(-d, -d, d * 3, d * 3);
      c.restore();
      // beam glow along the edges
      c.save();
      c.globalCompositeOperation = 'lighter';
      const eg = c.createLinearGradient(x0, 0, x0 + w, 0);
      eg.addColorStop(0, 'rgba(255,236,200,0.16)');
      eg.addColorStop(0.08, 'rgba(255,236,200,0)');
      eg.addColorStop(0.92, 'rgba(255,236,200,0)');
      eg.addColorStop(1, 'rgba(255,236,200,0.16)');
      c.fillStyle = eg;
      c.fillRect(x0, 0, w, d);
      c.restore();
    }

    // ── cornea overlays the eye renderer does not draw
    drawConeOverlays(c, p, toS, sc);

    // ── retro-illumination: red reflex with silhouettes of lens opacities
    if (tech === 'retro') drawRetro(c, p, st, toS, sc);

    // ── filters
    if (s.filter === 'redfree') {
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = 'rgb(150,240,176)';
      c.fillRect(0, 0, d, d);
      c.globalCompositeOperation = 'screen';
      c.fillStyle = 'rgba(8,40,22,0.42)';
      c.fillRect(0, 0, d, d);
      c.restore();
    } else if (s.filter === 'cobalt' && (tech === 'section' || tech === 'conical')) {
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = 'rgb(70,100,255)';
      c.fillRect(0, 0, d, d);
      c.restore();
    }

    // ── SUN field reticle for the cone: a 1 × 1 mm box
    if (tech === 'conical') {
      const b = 1 * sc;
      c.save();
      c.strokeStyle = 'rgba(190,215,255,0.55)';
      c.lineWidth = 1;
      c.setLineDash([3, 4]);
      c.strokeRect(d / 2 - b / 2, d / 2 - b / 2, b, b);
      c.restore();
    }

    drawPins(c, p, toS);
    drawVignette(c, d);
    c.restore();
    drawMiniMap(c, p, d);
  };

  return {
    paint,
    animated: (p) => {
      const tech = technique(p.setting);
      return tech === 'section' || tech === 'conical';
    },
    dispose() {
      world.width = 1;
      world.height = 1;
    },
  };
}

// ───────────────────────── overlays

function drawConeOverlays(c: CanvasRenderingContext2D, p: FrameParams, toS: (x: number, y: number) => { x: number; y: number }, sc: number): void {
  const has = (k: string) => p.present.has(k);
  if (!has('cornea/stroma/cone-thinning') && !has('cornea/stroma/vogt-striae') && !has('cornea/deposits/fleischer-ring')) return;
  const cone = conePos(p.seed, p.eye);
  const o = toS(cone.x, cone.y);
  const s = p.setting;
  const tech = technique(s);
  c.save();
  if (has('cornea/deposits/fleischer-ring') && clarity('cornea/deposits/fleischer-ring', s) >= RESOLVABLE) {
    const cobalt = s.filter === 'cobalt';
    c.strokeStyle = cobalt ? 'rgba(20,24,60,0.85)' : 'rgba(176,120,52,0.78)';
    c.lineWidth = Math.max(1.4, 0.26 * sc);
    c.lineCap = 'round';
    c.beginPath();
    c.arc(o.x, o.y, 1.9 * sc, Math.PI * 0.12, Math.PI * 0.92);
    c.stroke();
    c.lineWidth = Math.max(1, 0.12 * sc);
    c.strokeStyle = cobalt ? 'rgba(10,12,40,0.8)' : 'rgba(120,70,28,0.7)';
    c.beginPath();
    c.arc(o.x, o.y, 1.95 * sc, Math.PI * 0.2, Math.PI * 0.8);
    c.stroke();
  }
  if (has('cornea/stroma/vogt-striae') && clarity('cornea/stroma/vogt-striae', s) >= RESOLVABLE) {
    c.strokeStyle = tech === 'section' ? 'rgba(255,250,236,0.55)' : 'rgba(255,250,236,0.28)';
    c.lineWidth = Math.max(0.8, 0.045 * sc);
    for (let i = -3; i <= 3; i++) {
      const x = o.x + i * 0.34 * sc;
      c.beginPath();
      c.moveTo(x, o.y - (0.9 - Math.abs(i) * 0.08) * sc);
      c.lineTo(x + Math.sin(i) * 0.03 * sc, o.y + (0.9 - Math.abs(i) * 0.08) * sc);
      c.stroke();
    }
  }
  if (has('cornea/stroma/cone-thinning') && clarity('cornea/stroma/cone-thinning', s) >= RESOLVABLE) {
    const r = 1.7 * sc;
    const g = c.createRadialGradient(o.x, o.y + 0.2 * sc, 0, o.x, o.y + 0.2 * sc, r);
    g.addColorStop(0, 'rgba(255,248,235,0.30)');
    g.addColorStop(0.55, 'rgba(255,248,235,0.12)');
    g.addColorStop(1, 'rgba(255,248,235,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(o.x, o.y + 0.2 * sc, r, r * 1.25, 0, 0, TAU);
    c.fill();
    // the steepened apex bends the reflection: a crescent shadow beneath it
    c.strokeStyle = 'rgba(20,10,30,0.4)';
    c.lineWidth = Math.max(1.5, 0.22 * sc);
    c.beginPath();
    c.arc(o.x, o.y - 0.15 * sc, 1.5 * sc, Math.PI * 0.2, Math.PI * 0.8);
    c.stroke();
  }
  c.restore();
}

function drawRetro(c: CanvasRenderingContext2D, p: FrameParams, st: EyeState, toS: (x: number, y: number) => { x: number; y: number }, sc: number): void {
  const o = toS(0, 0);
  const pr = (Math.max(1.5, Math.min(9, st.pupilMm)) / 2) * sc;
  // light enters the pupil only when the beam passes through it
  const lit = Math.max(0, 1 - Math.max(0, Math.abs(p.pan.x) - 0.6) / 3.2);
  c.save();
  c.beginPath();
  c.arc(o.x, o.y, pr, 0, TAU);
  c.clip();
  c.globalCompositeOperation = 'screen';
  const g = c.createRadialGradient(o.x - pr * 0.15, o.y - pr * 0.1, pr * 0.05, o.x, o.y, pr);
  g.addColorStop(0, `rgba(255,130,70,${0.95 * lit})`);
  g.addColorStop(0.7, `rgba(226,86,40,${0.88 * lit})`);
  g.addColorStop(1, `rgba(150,40,24,${0.8 * lit})`);
  c.fillStyle = g;
  c.fillRect(o.x - pr, o.y - pr, pr * 2, pr * 2);
  c.globalCompositeOperation = 'source-over';
  const sign = [...p.present.keys()].find((k) => k.startsWith('lens/'));
  const grade = Number(p.present.get(sign ?? '') ?? 1) || 1;
  if (sign && clarity(sign, p.setting, grade) >= RESOLVABLE && lit > 0.2) {
    const a = Math.min(0.92, 0.38 + grade * 0.14) * lit;
    c.fillStyle = `rgba(40,8,6,${a})`;
    if (sign === 'lens/cortical-cataract') {
      const spokes = 9 + grade * 2;
      for (let i = 0; i < spokes; i++) {
        const ang = (i / spokes) * TAU + p.seed * 0.17;
        const len = pr * (0.45 + ((i * 7) % 5) * 0.1);
        c.beginPath();
        c.moveTo(o.x + Math.cos(ang - 0.06) * pr * 1.02, o.y + Math.sin(ang - 0.06) * pr * 1.02);
        c.lineTo(o.x + Math.cos(ang) * (pr - len), o.y + Math.sin(ang) * (pr - len));
        c.lineTo(o.x + Math.cos(ang + 0.06) * pr * 1.02, o.y + Math.sin(ang + 0.06) * pr * 1.02);
        c.closePath();
        c.fill();
      }
    } else if (sign === 'lens/posterior-subcapsular') {
      const g2 = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, pr * (0.3 + grade * 0.1));
      g2.addColorStop(0, `rgba(30,6,4,${a})`);
      g2.addColorStop(0.7, `rgba(30,6,4,${a * 0.7})`);
      g2.addColorStop(1, 'rgba(30,6,4,0)');
      c.fillStyle = g2;
      c.fillRect(o.x - pr, o.y - pr, pr * 2, pr * 2);
      for (let i = 0; i < 18; i++) {
        c.beginPath();
        c.arc(o.x + Math.cos(i * 2.4) * pr * 0.35 * ((i % 4) / 3), o.y + Math.sin(i * 2.4) * pr * 0.35 * ((i % 4) / 3), pr * 0.04, 0, TAU);
        c.fill();
      }
    } else if (sign === 'lens/nuclear-sclerosis') {
      const g2 = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, pr * 0.8);
      g2.addColorStop(0, `rgba(60,22,8,${a * 0.9})`);
      g2.addColorStop(1, 'rgba(60,22,8,0)');
      c.fillStyle = g2;
      c.fillRect(o.x - pr, o.y - pr, pr * 2, pr * 2);
    }
  }
  c.restore();
  c.save();
  c.strokeStyle = 'rgba(255,210,170,0.2)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(o.x, o.y, pr, 0, TAU);
  c.stroke();
  c.restore();
}

function drawPins(c: CanvasRenderingContext2D, p: FrameParams, toS: (x: number, y: number) => { x: number; y: number }): void {
  for (const pin of p.pins) {
    const o = toS(pin.x, pin.y);
    const k = Math.min(1, pin.age / 0.28);
    const e = 1 - (1 - k) ** 3;
    const r = 11 * (0.4 + 0.6 * e) + (pin.age < 0.5 ? Math.sin(pin.age * 12) * 1.2 : 0);
    c.save();
    c.globalAlpha = Math.min(1, e);
    c.shadowColor = pin.color;
    c.shadowBlur = 12;
    c.strokeStyle = pin.color;
    c.lineWidth = 2;
    c.fillStyle = 'rgba(8,4,16,0.55)';
    c.beginPath();
    c.arc(o.x, o.y, r, 0, TAU);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.lineWidth = 2;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    if (pin.mark === 'check') { c.moveTo(o.x - 4.5, o.y); c.lineTo(o.x - 1.2, o.y + 3.6); c.lineTo(o.x + 5, o.y - 3.8); }
    else if (pin.mark === 'cross') { c.moveTo(o.x - 4, o.y - 4); c.lineTo(o.x + 4, o.y + 4); c.moveTo(o.x + 4, o.y - 4); c.lineTo(o.x - 4, o.y + 4); }
    else { c.arc(o.x, o.y, 2, 0, TAU); }
    c.stroke();
    c.restore();
  }
  if (p.pending) {
    const o = toS(p.pending.x, p.pending.y);
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 1.5;
    c.setLineDash([4, 3]);
    c.beginPath();
    c.arc(o.x, o.y, 13, 0, TAU);
    c.stroke();
    c.restore();
  }
  if (p.hint) {
    const o = toS(p.hint.x, p.hint.y);
    const pulse = (Math.sin(p.t * 5) + 1) / 2;
    c.save();
    c.strokeStyle = `rgba(150,230,255,${0.35 + pulse * 0.4})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(o.x, o.y, 26 + pulse * 8, 0, TAU);
    c.stroke();
    c.restore();
  }
}

function drawVignette(c: CanvasRenderingContext2D, d: number): void {
  const g = c.createRadialGradient(d / 2, d / 2, d * 0.34, d / 2, d / 2, d * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.75, 'rgba(2,1,6,0.5)');
  g.addColorStop(1, 'rgba(2,1,6,0.95)');
  c.fillStyle = g;
  c.fillRect(0, 0, d, d);
  // eyepiece glass: a faint highlight arc, upper left
  c.save();
  c.globalCompositeOperation = 'lighter';
  const h = c.createLinearGradient(0, 0, d * 0.6, d * 0.6);
  h.addColorStop(0, 'rgba(255,240,255,0.07)');
  h.addColorStop(0.35, 'rgba(255,240,255,0)');
  c.fillStyle = h;
  c.fillRect(0, 0, d, d);
  c.restore();
}

function drawMiniMap(c: CanvasRenderingContext2D, p: FrameParams, d: number): void {
  const mw = Math.min(96, d * 0.2);
  const mh = mw * 0.58;
  const x0 = d / 2 - mw / 2;
  const y0 = d - mh - d * 0.075;
  const k = mw / 34;
  const cx = x0 + mw / 2;
  const cy = y0 + mh / 2;
  const s = p.setting;
  const tech = technique(s);
  const half = windowMm(s.mag) / 2;
  const pan = clampPan(p.pan);
  c.save();
  c.globalAlpha = 0.9;
  c.fillStyle = 'rgba(8,4,18,0.62)';
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 1;
  roundRect(c, x0 - 6, y0 - 6, mw + 12, mh + 12, 9);
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.beginPath();
  c.ellipse(cx, cy, 15 * k, 5.6 * k, 0, 0, TAU);
  c.stroke();
  c.strokeStyle = 'rgba(160,190,255,0.7)';
  c.beginPath();
  c.arc(cx, cy, 5.75 * k, 0, TAU);
  c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.9)';
  c.beginPath();
  c.arc(cx, cy, 1.6 * k, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(126,170,255,0.98)';
  c.lineWidth = 1.2;
  const wx = cx + (pan.x - half) * k;
  const wy = cy + (pan.y - half) * k;
  c.strokeRect(Math.max(x0 - 4, wx), Math.max(y0 - 4, wy), Math.min(mw + 8, half * 2 * k), Math.min(mh + 8, half * 2 * k));
  if (tech !== 'diffuse') {
    const bw = Math.max(1.2, beamWidth(s) * k);
    c.fillStyle = 'rgba(255,244,214,0.75)';
    const by = tech === 'conical' ? cy + pan.y * k - 1 : y0;
    c.fillRect(cx + pan.x * k - bw / 2, by, bw, tech === 'conical' ? 2 : mh);
  }
  c.restore();
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
