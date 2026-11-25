/** DOM side of the exam loop: measuring the field and painting beam, pen, ring, gauge overlay and trace. */
import { EYES, type Eye } from '@core';
import type { EyeState } from '@render';
import { DWELL_RING_S, type Engine, type Live } from './engine';
import { DWELL_FULL_S } from './scoring';
import { gaugeHalfPath } from './geom';
import { drawTrace } from './trace';

export interface Dom {
  field: HTMLDivElement | null;
  eyes: Record<Eye, HTMLDivElement | null>;
  gaugePaths: Record<Eye, SVGPathElement | null>;
  spot: HTMLDivElement | null;
  pen: HTMLDivElement | null;
  ringBox: SVGSVGElement | null;
  ring: SVGCircleElement | null;
  trace: HTMLCanvasElement | null;
}
export const emptyDom = (): Dom => ({
  field: null, eyes: { OD: null, OS: null }, gaugePaths: { OD: null, OS: null }, spot: null, pen: null, ringBox: null, ring: null, trace: null,
});

/** Pen body is drawn offset from the light spot so it never hides the pupil being lit. */
const PEN_OFFSET = { x: 40, y: 34 };

export function measureField(dom: Dom, eng: Engine): void {
  if (!dom.field) return;
  const fr = dom.field.getBoundingClientRect();
  eng.geo.fw = fr.width;
  eng.geo.fh = fr.height;
  for (const e of EYES) {
    const r = dom.eyes[e]?.getBoundingClientRect();
    if (r) eng.geo.centers[e] = { x: r.left - fr.left + r.width / 2, y: r.top - fr.top + r.height / 2 + 2 };
  }
}

export function paintFrame(dom: Dom, eng: Engine, L: Live, eyeStates: Record<Eye, EyeState>): void {
  const { x, y } = eng.beam;
  const on = eng.penOn ? '1' : '0';
  if (dom.spot) { dom.spot.style.transform = `translate(${x}px, ${y}px)`; dom.spot.style.opacity = on; }
  if (dom.pen) { dom.pen.style.transform = `translate(${x + PEN_OFFSET.x}px, ${y + PEN_OFFSET.y}px) rotate(58deg)`; dom.pen.style.opacity = on; }
  if (dom.ringBox) { dom.ringBox.style.transform = `translate(${x}px, ${y}px)`; dom.ringBox.style.opacity = eng.penOn && eng.curEye ? '1' : '0'; }
  if (dom.ring) {
    dom.ring.style.strokeDashoffset = String(100 - Math.min(1, eng.dwell / DWELL_RING_S) * 100);
    dom.ring.style.stroke = eng.dwell >= DWELL_FULL_S ? '#ffd27a' : 'rgba(255,255,255,0.85)';
  }
  for (const e of EYES) {
    const path = dom.gaugePaths[e];
    if (!path) continue;
    const show = L.eye === e && L.phase === 'exam' && !L.tutorial;
    path.style.opacity = show ? '1' : '0';
    if (show) path.setAttribute('d', gaugeHalfPath(L.eyeW, L.eyeH, eyeStates[e].gaze.x, L.gauge));
  }
  const tc = dom.trace;
  const g = tc?.getContext('2d') ?? null;
  if (tc && g) drawTrace(g, tc, eng.trace, eng.t);
}
