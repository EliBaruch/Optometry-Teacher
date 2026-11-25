import { ANATOMY } from '@render';

const DEG = Math.PI / 180;
/** Mirror of the eye painter's geometry: where the pupil sits in a w*h canvas and how big a mm is. */
export function pupilFrame(w: number, h: number, gazeX: number, gazeY = 0) {
  const pxmm = Math.min(w / 34, h / 17.5);
  const ax = Math.max(-1, Math.min(1, gazeX)) * ANATOMY.maxGazeDeg * DEG;
  const ay = Math.max(-1, Math.min(1, gazeY)) * ANATOMY.maxGazeDeg * DEG;
  return {
    pxmm,
    x: w / 2 + ANATOMY.pupilArm * Math.sin(ax) * pxmm,
    y: h / 2 + pxmm * 0.2 + ANATOMY.pupilArm * Math.sin(ay) * pxmm,
    foreX: Math.cos(ax),
    foreY: Math.cos(ay),
  };
}

/** SVG path for the left half of a pupil-gauge disc of `mm` diameter, drawn at the pupil. */
export function gaugeHalfPath(w: number, h: number, gazeX: number, mm: number): string {
  const f = pupilFrame(w, h, gazeX);
  const r = (mm / 2) * f.pxmm;
  const rx = r * f.foreX;
  return `M ${f.x.toFixed(1)} ${(f.y - r).toFixed(1)} A ${rx.toFixed(1)} ${r.toFixed(1)} 0 0 0 ${f.x.toFixed(1)} ${(f.y + r).toFixed(1)} Z`;
}
