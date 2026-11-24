/**
 * Slit-lamp optical section overlay, in the same geometry as drawEye.
 * Light from the side (angleDeg) makes deeper structures appear displaced away
 * from the source: cornea (parallelepiped / optic section) → dark anterior
 * chamber (flare haze + drifting cells) → iris band or lens section.
 * The peripheral AC gap vs corneal thickness reproduces the Van Herick grade.
 */
import { createRng } from '@core';
import { hexToRgb, mix, rgba, shade } from './color';
import { kpDots, lesionSpot, sunCellCount, vanHerickRatio } from './features';
import type { EyeGeometry } from './geometry';
import { irisTexture } from './iris';
import { ANATOMY, type EyeState } from './types';

export interface SlitBeam {
  /** −1..1 across the cornea (0 = centre, ±1 = limbus), image x. */
  x: number;
  /** beam width in mm (0.1 optic section … 2–4 parallelepiped) */
  width: number;
  /** angle between illumination and viewing axis; + = light from the viewer's left */
  angleDeg: number;
  /** beam height in mm (default 8) */
  height?: number;
}

const RC = 7.8; // anterior corneal radius of curvature, mm
const sag = (r: number) => RC - Math.sqrt(Math.max(0, RC * RC - r * r));

/** Central AC depth for a qualitative depth grade (mm). */
export function centralAcDepthMm(d: EyeState['acDepth']): number {
  return d === 'deep' ? 3.8 : d === 'shallow' ? 2.2 : d === 'flat' ? 0.6 : ANATOMY.centralAcDepth;
}

export function cornealThicknessMm(xn: number, haze: number): number {
  const ct = ANATOMY.centralCornealThickness + (ANATOMY.peripheralCornealThickness - ANATOMY.centralCornealThickness) * xn * xn;
  return ct * (1 + Math.min(1, haze) * 0.35);
}

/** AC depth (mm) at normalised corneal position xn (0 centre, 1 limbus). Peripheral value follows Van Herick. */
export function acDepthAtMm(xn: number, s: Pick<EyeState, 'acDepth' | 'vanHerick' | 'cornealHaze'>): number {
  const a = Math.min(1, Math.abs(xn));
  const central = centralAcDepthMm(s.acDepth);
  const vh = vanHerickRatio(s.vanHerick) * cornealThicknessMm(0.95, 0);
  const u = Math.max(0, Math.min(1, (a - 0.25) / 0.7));
  const f = u * u * (3 - 2 * u);
  return central + (vh - central) * f;
}

export function drawSlitBeam(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState, beam: SlitBeam, t: number): void {
  const { pxmm, ix, iy, irisR } = g;
  const R = irisR;
  const xn = Math.max(-1.15, Math.min(1.15, beam.x));
  const bx = ix + xn * R * g.foreX;
  const dir = beam.angleDeg >= 0 ? 1 : -1;
  const k = Math.sin((Math.min(80, Math.abs(beam.angleDeg)) * Math.PI) / 180);
  const bw = Math.max(0.6, beam.width * pxmm);
  const halfH = ((beam.height ?? 8) / 2) * pxmm;
  const chord = Math.sqrt(Math.max(0, R * R - (bx - ix) ** 2));
  const y0 = iy - Math.min(halfH, chord);
  const y1 = iy + Math.min(halfH, chord);
  const xm = ((bx - ix) / pxmm);
  const ct = cornealThicknessMm(Math.abs(xn), s.cornealHaze);
  const haze = Math.min(1, s.cornealHaze);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // beam scatter on the conjunctiva / lids outside the cornea (soft, warm)
  const scat = ctx.createLinearGradient(0, iy - halfH, 0, iy + halfH);
  scat.addColorStop(0, 'rgba(255,240,210,0)');
  scat.addColorStop(0.15, 'rgba(255,240,210,0.22)');
  scat.addColorStop(0.85, 'rgba(255,240,210,0.22)');
  scat.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = scat;
  ctx.fillRect(bx - bw / 2, iy - halfH, bw, halfH * 2);
  if (y1 <= y0) {
    ctx.restore();
    return;
  }

  // sample the section row by row
  const step = Math.max(1, pxmm * 0.08);
  type Row = { y: number; front: number; back: number; iris: number; inPupil: boolean };
  const rows: Row[] = [];
  for (let y = y0; y <= y1; y += step) {
    const ym = (y - iy) / pxmm;
    const r = Math.sqrt(xm * xm + ym * ym);
    const d = (sag(r) - sag(Math.abs(xm))) * k * pxmm * dir; // surface curvature bow
    const front = bx + d;
    const back = front + dir * ct * k * pxmm;
    const rn = Math.min(1, r / (ANATOMY.corneaDiameter / 2));
    const acd = acDepthAtMm(rn, s);
    const iris = back + dir * acd * k * pxmm;
    const inPupil = Math.hypot(iris - ix, y - iy) < g.pupilR;
    rows.push({ y, front, back, iris, inPupil });
  }
  const poly = (fx: (r: Row) => number, w: number) => {
    ctx.beginPath();
    rows.forEach((r, i) => (i ? ctx.lineTo(fx(r) - w / 2, r.y) : ctx.moveTo(fx(r) - w / 2, r.y)));
    for (let i = rows.length - 1; i >= 0; i--) ctx.lineTo(fx(rows[i]!) + w / 2, rows[i]!.y);
    ctx.closePath();
  };
  const fadeY = (alpha: number, rgb: [number, number, number]) => {
    const gr = ctx.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, rgba(rgb, 0));
    gr.addColorStop(0.12, rgba(rgb, alpha));
    gr.addColorStop(0.88, rgba(rgb, alpha));
    gr.addColorStop(1, rgba(rgb, 0));
    return gr;
  };

  // 1 · corneal section: stroma body between epithelium and endothelium
  ctx.beginPath();
  rows.forEach((r, i) => (i ? ctx.lineTo(Math.min(r.front, r.back + dir * bw) - (dir < 0 ? bw : 0), r.y) : ctx.moveTo(r.front - (dir < 0 ? bw : 0), r.y)));
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]!;
    ctx.lineTo((dir > 0 ? r.back + bw : r.back) , r.y);
  }
  ctx.closePath();
  ctx.fillStyle = fadeY(0.32 + haze * 0.4, [200, 215, 235]);
  ctx.fill();
  // tear film / epithelium: brightest front edge
  poly((r) => r.front + (dir > 0 ? bw / 2 : -bw / 2) - dir * bw / 2, Math.max(1.2, pxmm * 0.07));
  ctx.fillStyle = fadeY(0.95, [255, 252, 240]);
  ctx.fill();
  // endothelium: thin fainter back edge
  poly((r) => r.back, Math.max(0.8, pxmm * 0.04));
  ctx.fillStyle = fadeY(0.55, [220, 235, 255]);
  ctx.fill();

  // stromal opacity crossed by the beam
  if (s.ulcer && s.ulcer !== 'none') {
    const sp = lesionSpot(s.irisSeed, s.ulcer);
    if (Math.abs(sp.x - xm) < sp.r * 1.2) {
      const yy = iy + sp.y * pxmm;
      const row = rows.reduce((a, r) => (Math.abs(r.y - yy) < Math.abs(a.y - yy) ? r : a), rows[0]!);
      const cxp = (row.front + row.back) / 2 + (dir * bw) / 2;
      const gr = ctx.createRadialGradient(cxp, yy, 0, cxp, yy, sp.r * pxmm);
      gr.addColorStop(0, 'rgba(255,255,250,0.9)');
      gr.addColorStop(1, 'rgba(255,255,250,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(cxp, yy, Math.abs(row.back - row.front) + bw, sp.r * pxmm, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // KPs on the endothelium
  if (s.keraticPrecipitates) {
    for (const d of kpDots(s.irisSeed)) {
      if (Math.abs(d.x - xm) > beam.width / 2 + 0.25) continue;
      const yy = iy + d.y * pxmm;
      const row = rows.find((r) => Math.abs(r.y - yy) <= step);
      if (!row) continue;
      ctx.fillStyle = 'rgba(255,255,245,0.95)';
      ctx.beginPath();
      ctx.arc(row.back + (dir * bw) / 2, yy, Math.max(1, d.r * pxmm * 1.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2 · anterior chamber: flare = Tyndall haze in the beam path; cells drift
  const flare = s.acFlare;
  const acQuad = () => {
    ctx.beginPath();
    rows.forEach((r, i) => (i ? ctx.lineTo(r.back + (dir > 0 ? 0 : -bw), r.y) : ctx.moveTo(r.back + (dir > 0 ? 0 : -bw), r.y)));
    for (let i = rows.length - 1; i >= 0; i--) ctx.lineTo(rows[i]!.iris + (dir > 0 ? bw : 0), rows[i]!.y);
    ctx.closePath();
  };
  if (flare > 0) {
    acQuad();
    ctx.fillStyle = fadeY(0.05 + flare * 0.07, [215, 225, 255]);
    ctx.fill();
  }
  const cells = sunCellCount(s.acCells);
  if (cells > 0) {
    // scale the SUN count (1×1 mm field) to the visible beam area
    const area = Math.max(0.15, beam.width) * ((y1 - y0) / pxmm);
    const n = Math.round(cells * Math.min(4, area));
    const rng = createRng(s.irisSeed ^ 0xce11);
    ctx.save();
    acQuad();
    ctx.clip();
    for (let i = 0; i < n; i++) {
      const u = rng.next(); // 0 = cornea side, 1 = iris side
      const sp = rng.float(0.15, 0.4) * pxmm; // px/s
      const v = (u > 0.5 ? -1 : 1) * sp; // convection: up near the warm iris, down near the cold cornea
      const span = y1 - y0;
      const yy = y0 + ((((rng.next() * span + v * t) % span) + span) % span);
      const row = rows[Math.min(rows.length - 1, Math.max(0, Math.round((yy - y0) / step)))]!;
      const x = row.back + (row.iris - row.back) * u + (dir > 0 ? bw : -bw) * rng.next() * 0.5 + Math.sin(t * 1.7 + i) * pxmm * 0.03;
      const r = Math.max(0.8, pxmm * rng.float(0.03, 0.06));
      ctx.fillStyle = `rgba(255,255,250,${rng.float(0.7, 1)})`;
      ctx.beginPath();
      ctx.arc(x, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3 · iris band (beam lands on the iris) & lens section (through the pupil)
  ctx.save();
  poly((r) => r.iris + (dir * bw) / 2, bw);
  ctx.clip();
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix - R * 2, iy - R * 2, R * 4, R * 4);
  ctx.arc(ix, iy, g.pupilR, 0, Math.PI * 2, true);
  ctx.clip('evenodd');
  const tex = irisTexture(R, g.pupilR, { color: s.irisColor, seed: s.irisSeed, pupilShape: s.pupilShape ?? 'round' });
  if (tex) {
    ctx.globalAlpha = 0.95;
    ctx.drawImage(tex as CanvasImageSource, ix - R - 1, iy - R - 1);
    ctx.globalAlpha = 1;
  }
  const iris = hexToRgb(s.irisColor);
  ctx.fillStyle = fadeY(0.35, mix(iris, [255, 240, 220], 0.45) as [number, number, number]);
  ctx.fillRect(ix - R * 2, y0, R * 4, y1 - y0);
  ctx.restore();
  // lens section through the pupil
  ctx.beginPath();
  ctx.arc(ix, iy, g.pupilR, 0, Math.PI * 2);
  ctx.clip();
  const o = Math.max(0, Math.min(1, s.lensOpacity));
  const lensTint: [number, number, number] = s.lensType === 'nuclear' ? (mix([200, 210, 230], [220, 170, 80], 0.3 + o * 0.6) as [number, number, number]) : [190, 205, 235];
  ctx.fillStyle = fadeY(0.22 + (s.lensType === 'nuclear' ? o * 0.35 : 0) + (s.lensType === 'none' ? 0 : 0.05), lensTint);
  ctx.fillRect(ix - R, y0, R * 2, y1 - y0);
  // anterior capsule: crisp bright line
  ctx.fillStyle = fadeY(0.75, [240, 245, 255]);
  ctx.beginPath();
  rows.forEach((r, i) => (i ? ctx.lineTo(r.iris + (dir < 0 ? bw : 0), r.y) : ctx.moveTo(r.iris + (dir < 0 ? bw : 0), r.y)));
  for (let i = rows.length - 1; i >= 0; i--) ctx.lineTo(rows[i]!.iris + (dir < 0 ? bw : 0) + dir * Math.max(1, pxmm * 0.06), rows[i]!.y);
  ctx.closePath();
  ctx.fill();
  if (s.lensType === 'cortical' && o > 0) {
    const rng = createRng(s.irisSeed ^ 0xc0e7);
    for (let i = 0; i < 5 + o * 8; i++) {
      const yy = rng.float(y0, y1);
      ctx.fillStyle = `rgba(255,255,250,${0.4 + o * 0.5})`;
      ctx.fillRect(ix - R, yy, R * 2, Math.max(1, pxmm * rng.float(0.05, 0.18)));
    }
  }
  ctx.restore();

  // 4 · gravity levels in the AC catch the beam
  for (const [frac, col] of [[s.hypopyon ?? 0, [255, 250, 235]], [s.hyphema ?? 0, [210, 40, 40]]] as const) {
    if (frac <= 0) continue;
    const top = iy + R - frac * 2 * R;
    ctx.save();
    acQuad();
    ctx.clip();
    ctx.fillStyle = rgba(col as unknown as [number, number, number], 0.75);
    ctx.fillRect(ix - R * 2, top, R * 4, R * 2);
    ctx.restore();
  }
  ctx.restore();

  // specular reflection of the beam on the tear film
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = fadeY(0.25, shade([255, 255, 255], 1) as [number, number, number]);
  ctx.fillRect(bx - dir * pxmm * 1.6 - 1, y0, Math.max(1.5, bw * 0.4), y1 - y0);
  ctx.restore();
}
