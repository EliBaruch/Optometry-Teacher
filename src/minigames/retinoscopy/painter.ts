/**
 * The retinoscope's-eye view. A dark room, a streak of light sweeping across the patient's face,
 * and inside the big pupil the red-orange reflex doing what the optics say it must.
 *
 * Scene (eye, lids, iris) is painted once per eye/size to an offscreen canvas; every frame we
 * darken it except for the streak, then draw the reflex bands inside the pupil.
 */
import type { RetinoscopyReflex } from '@core';
import { paintIris } from '@render';
import { clamp, rad, reflexGeo, smooth, wrapPhi, type ReflexGeo } from './optics';

const SKIN = ['#f2cfb4', '#e6b896', '#cf9a72', '#b57a52', '#8a5636', '#5b3824'];

export interface EyeLook {
  skin: number;
  iris: string;
  seed: number;
  /** pupil diameter / iris diameter */
  pupilFrac: number;
}

export interface ScopeScene {
  t: number;
  /** displayed sweep meridian (clinical deg) */
  phi: number;
  /** streak position along the sweep, in pupil radii (0 = centred) */
  s: number;
  e1: number;
  e2: number;
  axis: number;
  quality: RetinoscopyReflex;
  reduced: boolean;
  /** 0..1 fixation drift / pupil unrest */
  unrest: number;
}

export interface ScopeArt {
  resize(cssPx: number, dpr: number): void;
  setLook(look: EyeLook): void;
  draw(sc: ScopeScene): ReflexGeo;
  /** pupil radius in CSS px */
  pupilCss(): number;
  /** neutral-glow for the DOM ring (0..1) */
  glow(): number;
}

interface Band { e1: number; e2: number; k: number; wob: number }

function bandsFor(q: RetinoscopyReflex, e1: number, e2: number): Band[] {
  switch (q) {
    case 'scissors': return [{ e1: e1 + 0.8, e2: e2 + 0.8, k: 0.85, wob: 0 }, { e1: e1 - 0.8, e2: e2 - 0.8, k: 0.85, wob: 1.3 }];
    case 'irregular': return [{ e1: e1 - 0.9, e2: e2 - 0.9, k: 0.7, wob: 0.4 }, { e1: e1 + 0.25, e2: e2 + 0.25, k: 0.8, wob: 2.1 }, { e1: e1 + 1.1, e2: e2 + 1.1, k: 0.65, wob: 3.3 }];
    case 'absent': return [];
    default: return [{ e1, e2, k: 1, wob: 0 }];
  }
}

export function createScope(canvas: HTMLCanvasElement): ScopeArt {
  const g = canvas.getContext('2d');
  let size = 0;
  let dpr = 1;
  let look: EyeLook = { skin: 2, iris: '#6b4a2e', seed: 1, pupilFrac: 0.5 };
  let scene: HTMLCanvasElement | null = null;
  let haze: HTMLCanvasElement | null = null;
  let Rv = 0;
  let Ri = 0;
  let Rp = 0;
  let glowNow = 0;

  const makeCanvas = (n: number): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = n;
    c.height = n;
    return c;
  };

  function build(): void {
    if (!g || size < 8) return;
    Rv = size / 2;
    Ri = Rv * 0.8;
    Rp = Ri * clamp(look.pupilFrac, 0.46, 0.62);
    const c = scene && scene.width === size ? scene : makeCanvas(size);
    scene = c;
    const x = c.getContext('2d')!;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, size, size);
    const cx = Rv;
    const cy = Rv;
    const skin = SKIN[look.skin] ?? SKIN[2]!;
    // skin around the eye
    const sg = x.createRadialGradient(cx, cy * 0.9, Rv * 0.2, cx, cy, Rv * 1.25);
    sg.addColorStop(0, skin);
    sg.addColorStop(1, '#2a1812');
    x.fillStyle = sg;
    x.fillRect(0, 0, size, size);
    // almond opening
    const almond = (): Path2D => {
      const p = new Path2D();
      p.moveTo(cx - Rv * 1.02, cy + Rv * 0.07);
      p.bezierCurveTo(cx - Rv * 0.5, cy - Rv * 0.8, cx + Rv * 0.5, cy - Rv * 0.8, cx + Rv * 1.02, cy + Rv * 0.07);
      p.bezierCurveTo(cx + Rv * 0.5, cy + Rv * 0.86, cx - Rv * 0.5, cy + Rv * 0.86, cx - Rv * 1.02, cy + Rv * 0.07);
      p.closePath();
      return p;
    };
    // crease above the lid
    x.save();
    x.strokeStyle = 'rgba(40,18,10,0.35)';
    x.lineWidth = Rv * 0.05;
    x.lineCap = 'round';
    x.filter = `blur(${Math.round(Rv * 0.02)}px)`;
    x.beginPath();
    x.moveTo(cx - Rv * 0.95, cy - Rv * 0.12);
    x.bezierCurveTo(cx - Rv * 0.5, cy - Rv * 0.98, cx + Rv * 0.5, cy - Rv * 0.98, cx + Rv * 0.95, cy - Rv * 0.12);
    x.stroke();
    x.restore();
    const a = almond();
    x.save();
    x.clip(a);
    const sc = x.createRadialGradient(cx, cy, Rv * 0.1, cx, cy, Rv * 1.05);
    sc.addColorStop(0, '#f1e9de');
    sc.addColorStop(0.7, '#dccbbd');
    sc.addColorStop(1, '#a98473');
    x.fillStyle = sc;
    x.fillRect(0, 0, size, size);
    paintIris(x, cx, cy, Ri, Rp, { color: look.iris, seed: look.seed });
    // limbal softening and lid shadows
    const upper = x.createLinearGradient(0, cy - Rv * 0.75, 0, cy - Rv * 0.2);
    upper.addColorStop(0, 'rgba(8,4,4,0.72)');
    upper.addColorStop(1, 'rgba(8,4,4,0)');
    x.fillStyle = upper;
    x.fillRect(0, 0, size, size);
    const lower = x.createLinearGradient(0, cy + Rv * 0.35, 0, cy + Rv * 0.78);
    lower.addColorStop(0, 'rgba(8,4,4,0)');
    lower.addColorStop(1, 'rgba(8,4,4,0.5)');
    x.fillStyle = lower;
    x.fillRect(0, 0, size, size);
    x.lineWidth = Rv * 0.12;
    x.strokeStyle = 'rgba(30,12,8,0.55)';
    x.filter = `blur(${Math.round(Rv * 0.05)}px)`;
    x.stroke(a);
    x.filter = 'none';
    // window glint on the cornea
    const gl = x.createRadialGradient(cx - Ri * 0.36, cy - Ri * 0.4, 0, cx - Ri * 0.36, cy - Ri * 0.4, Ri * 0.2);
    gl.addColorStop(0, 'rgba(255,255,255,0.55)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gl;
    x.fillRect(cx - Ri, cy - Ri, Ri * 2, Ri * 2);
    x.restore();
    // lash line and lower lid margin
    x.save();
    x.lineCap = 'round';
    x.strokeStyle = '#150a07';
    x.lineWidth = Rv * 0.045;
    x.beginPath();
    x.moveTo(cx - Rv * 1.02, cy + Rv * 0.07);
    x.bezierCurveTo(cx - Rv * 0.5, cy - Rv * 0.8, cx + Rv * 0.5, cy - Rv * 0.8, cx + Rv * 1.02, cy + Rv * 0.07);
    x.stroke();
    x.strokeStyle = 'rgba(214,150,140,0.55)';
    x.lineWidth = Rv * 0.022;
    x.beginPath();
    x.moveTo(cx - Rv * 1.0, cy + Rv * 0.09);
    x.bezierCurveTo(cx - Rv * 0.5, cy + Rv * 0.86, cx + Rv * 0.5, cy + Rv * 0.86, cx + Rv * 1.0, cy + Rv * 0.09);
    x.stroke();
    x.restore();

    // cataract haze texture (soft blotches), cached with the size
    const h = makeCanvas(Math.max(8, Math.round(Rp * 2)));
    const hx = h.getContext('2d')!;
    const hr = h.width / 2;
    let n = look.seed >>> 0 || 1;
    const rnd = () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296);
    hx.filter = `blur(${Math.round(hr * 0.12)}px)`;
    for (let i = 0; i < 26; i++) {
      const ang = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * hr * 0.9;
      const r = hr * (0.12 + rnd() * 0.3);
      hx.fillStyle = `rgba(${200 + Math.round(rnd() * 40)},${180 + Math.round(rnd() * 40)},${130 + Math.round(rnd() * 40)},${0.1 + rnd() * 0.22})`;
      hx.beginPath();
      hx.arc(hr + Math.cos(ang) * rr, hr + Math.sin(ang) * rr, r, 0, Math.PI * 2);
      hx.fill();
    }
    haze = h;
  }

  function band(
    x: CanvasRenderingContext2D, ctr: { x: number; y: number }, geo: ReflexGeo, s: number, win: number, k: number, hot: number,
  ): void {
    const w = geo.halfWidth;
    const c = s * geo.gain;
    const bright = geo.brightness * win * k;
    if (bright < 0.01) return;
    const x0 = ctr.x + geo.nx * (c - w) * Rp;
    const y0 = ctr.y + geo.ny * (c - w) * Rp;
    const x1 = ctr.x + geo.nx * (c + w) * Rp;
    const y1 = ctr.y + geo.ny * (c + w) * Rp;
    const gr = x.createLinearGradient(x0, y0, x1, y1);
    const a = clamp(bright, 0, 1);
    gr.addColorStop(0, 'rgba(255,50,20,0)');
    gr.addColorStop(0.2, `rgba(255,58,22,${(a * 0.6).toFixed(3)})`);
    gr.addColorStop(0.42, `rgba(255,98,34,${a.toFixed(3)})`);
    gr.addColorStop(0.5, `rgba(255,${Math.round(140 + 70 * hot)},${Math.round(66 + 60 * hot)},${a.toFixed(3)})`);
    gr.addColorStop(0.58, `rgba(255,98,34,${a.toFixed(3)})`);
    gr.addColorStop(0.8, `rgba(255,58,22,${(a * 0.6).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(255,50,20,0)');
    x.fillStyle = gr;
    x.fillRect(ctr.x - Rp * 1.2, ctr.y - Rp * 1.2, Rp * 2.4, Rp * 2.4);
  }

  function fillPupil(x: CanvasRenderingContext2D, ctr: { x: number; y: number }, amount: number, bright: number): void {
    if (amount < 0.01) return;
    const a = clamp(amount * bright, 0, 1);
    const gr = x.createRadialGradient(ctr.x, ctr.y, 0, ctr.x, ctr.y, Rp);
    gr.addColorStop(0, `rgba(255,190,110,${a.toFixed(3)})`);
    gr.addColorStop(0.55, `rgba(255,112,48,${(a * 0.97).toFixed(3)})`);
    gr.addColorStop(1, `rgba(236,62,28,${(a * 0.92).toFixed(3)})`);
    x.fillStyle = gr;
    x.fillRect(ctr.x - Rp, ctr.y - Rp, Rp * 2, Rp * 2);
  }

  return {
    resize(cssPx, ratio) {
      const next = Math.max(8, Math.round(cssPx * ratio));
      dpr = ratio;
      if (next === size && scene) return;
      size = next;
      canvas.width = size;
      canvas.height = size;
      build();
    },
    setLook(l) {
      look = l;
      build();
    },
    pupilCss: () => Rp / dpr,
    glow: () => glowNow,
    draw(sc) {
      const main = reflexGeo(sc.e1, sc.e2, sc.axis, sc.phi);
      if (!g || !scene) return main;
      const t = sc.t;
      const drift = sc.reduced ? 0 : sc.unrest * Rv * 0.006;
      const ox = drift * (Math.sin(t * 0.9) + 0.4 * Math.sin(t * 2.7 + 1));
      const oy = drift * (Math.sin(t * 0.7 + 2) + 0.4 * Math.sin(t * 2.1));
      const ctr = { x: Rv + ox, y: Rv + oy };
      const pr = sc.reduced ? 1 : 1 + 0.012 * sc.unrest * Math.sin(t * 3.1);
      const Rp0 = Rp;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.fillStyle = '#000';
      g.fillRect(0, 0, size, size);
      g.save();
      g.beginPath();
      g.arc(Rv, Rv, Rv, 0, Math.PI * 2);
      g.clip();
      g.drawImage(scene, ox, oy);

      // everything outside the streak sinks into the dark room
      g.save();
      g.translate(ctr.x, ctr.y);
      g.rotate(-rad(sc.phi));
      const hw = Rp0 * 0.22;
      const off = sc.s * Rp0;
      const d = g.createLinearGradient(off - hw * 2.6, 0, off + hw * 2.6, 0);
      const dk = (a: number) => `rgba(3,1,6,${a})`;
      d.addColorStop(0, dk(0.68));
      d.addColorStop(0.22, dk(0.68));
      d.addColorStop(0.38, dk(0.3));
      d.addColorStop(0.46, dk(0));
      d.addColorStop(0.54, dk(0));
      d.addColorStop(0.62, dk(0.3));
      d.addColorStop(0.78, dk(0.68));
      d.addColorStop(1, dk(0.68));
      g.fillStyle = d;
      g.fillRect(-Rv * 2, -Rv * 2, Rv * 4, Rv * 4);
      g.restore();

      // ── the reflex, inside the pupil
      const win = 1 - smooth(0.95, 1.3, Math.abs(sc.s));
      g.save();
      g.beginPath();
      g.arc(ctr.x, ctr.y, Rp0 * pr, 0, Math.PI * 2);
      g.clip();
      g.globalCompositeOperation = 'lighter';
      const q = sc.quality;
      const dull = q === 'dull' ? 0.55 : 1;
      const bands = bandsFor(q, sc.e1, sc.e2);
      const fillCap = q === 'scissors' || q === 'irregular' ? 0.45 : 1;
      let fillAmt = 0;
      bands.forEach((b, i) => {
        const geo = reflexGeo(b.e1, b.e2, sc.axis, sc.phi);
        const wob = b.wob && !sc.reduced ? 0.12 * Math.sin(t * 2.3 + b.wob * 3) : 0;
        const sPos = sc.s + wob;
        const bandGeo = q === 'scissors' ? { ...geo, nx: geo.nx, ny: geo.ny } : geo;
        if (q === 'scissors') {
          // blades open and close: tilt each band a few degrees about the pupil centre
          const tilt = (i === 0 ? 1 : -1) * rad(10 + 9 * Math.sin(sc.s * 1.7));
          const nx = bandGeo.nx * Math.cos(tilt) - bandGeo.ny * Math.sin(tilt);
          const ny = bandGeo.nx * Math.sin(tilt) + bandGeo.ny * Math.cos(tilt);
          bandGeo.nx = nx;
          bandGeo.ny = ny;
        }
        band(g, ctr, bandGeo, sPos, win, b.k * dull * (q === 'normal' ? 1 : 0.9), geo.fill);
        if (i === 0 || q === 'normal') fillAmt = Math.max(fillAmt, geo.fill);
      });
      const fill = fillAmt * win * fillCap;
      if (bands.length) fillPupil(g, ctr, fill, main.brightness * dull);
      glowNow = q === 'absent' ? 0 : main.fill * win;
      if (q === 'absent') {
        const gr = g.createRadialGradient(ctr.x, ctr.y, 0, ctr.x, ctr.y, Rp0);
        gr.addColorStop(0, 'rgba(70,80,110,0.16)');
        gr.addColorStop(1, 'rgba(30,34,54,0.05)');
        g.fillStyle = gr;
        g.fillRect(ctr.x - Rp0, ctr.y - Rp0, Rp0 * 2, Rp0 * 2);
      }
      g.globalCompositeOperation = 'source-over';
      if (q === 'dull' && haze) {
        g.globalAlpha = 0.34;
        g.drawImage(haze, ctr.x - haze.width / 2, ctr.y - haze.height / 2);
        g.globalAlpha = 1;
        const hz = g.createRadialGradient(ctr.x, ctr.y, 0, ctr.x, ctr.y, Rp0);
        hz.addColorStop(0, 'rgba(210,170,120,0.12)');
        hz.addColorStop(1, 'rgba(150,120,80,0.1)');
        g.fillStyle = hz;
        g.fillRect(ctr.x - Rp0, ctr.y - Rp0, Rp0 * 2, Rp0 * 2);
      }
      // a soft inner shadow so the pupil reads as a deep well
      const well = g.createRadialGradient(ctr.x, ctr.y, Rp0 * 0.72, ctr.x, ctr.y, Rp0 * 1.02);
      well.addColorStop(0, 'rgba(20,4,2,0)');
      well.addColorStop(1, 'rgba(20,4,2,0.55)');
      g.fillStyle = well;
      g.fillRect(ctr.x - Rp0, ctr.y - Rp0, Rp0 * 2, Rp0 * 2);
      g.restore();

      // spill of warm light onto the iris when the pupil fills
      if (fill > 0.02 && q !== 'absent') {
        g.globalCompositeOperation = 'lighter';
        const sp = g.createRadialGradient(ctr.x, ctr.y, Rp0 * 0.9, ctr.x, ctr.y, Rp0 * 1.7);
        sp.addColorStop(0, `rgba(255,110,50,${(0.3 * fill * main.brightness * dull).toFixed(3)})`);
        sp.addColorStop(1, 'rgba(255,90,40,0)');
        g.fillStyle = sp;
        g.beginPath();
        g.arc(ctr.x, ctr.y, Rp0 * 1.7, 0, Math.PI * 2);
        g.fill();
        g.globalCompositeOperation = 'source-over';
      }

      // the retinoscope's own glint riding on the cornea
      if (Math.abs(sc.s) < 1.5) {
        const P = rad(wrapPhi(sc.phi));
        const gx = ctr.x + Math.cos(P) * sc.s * Rp0;
        const gy = ctr.y - Math.sin(P) * sc.s * Rp0;
        const gg = g.createRadialGradient(gx, gy, 0, gx, gy, Rp0 * 0.1);
        gg.addColorStop(0, 'rgba(255,250,240,0.9)');
        gg.addColorStop(1, 'rgba(255,240,220,0)');
        g.fillStyle = gg;
        g.fillRect(gx - Rp0 * 0.1, gy - Rp0 * 0.1, Rp0 * 0.2, Rp0 * 0.2);
      }

      // aperture vignette
      const vg = g.createRadialGradient(Rv, Rv, Rv * 0.62, Rv, Rv, Rv);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(0.8, 'rgba(0,0,0,0.5)');
      vg.addColorStop(1, 'rgba(0,0,0,0.92)');
      g.fillStyle = vg;
      g.fillRect(0, 0, size, size);
      g.restore();
      return main;
    },
  };
}
