/** Pure optics/clinical model for the motility (H-pattern) and convergence mini-games. */
import type { Eye, Gaze, PatientFindings, Rng } from '@core';

export const EYES: readonly Eye[] = ['OD', 'OS'];
export type NodeId = Gaze | 'primary';

/**
 * The nine diagnostic positions of gaze, laid out as the EXAMINER sees them:
 * the patient's right is on the examiner's left (u = -1). v = -1 is up.
 */
export interface GazeNode { id: NodeId; u: -1 | 0 | 1; v: -1 | 0 | 1; name: string; short: string; key: string }
export const NODES: readonly GazeNode[] = [
  { id: 'upRight', u: -1, v: -1, name: 'up and right', short: 'UR', key: '7' },
  { id: 'up', u: 0, v: -1, name: 'up', short: 'U', key: '8' },
  { id: 'upLeft', u: 1, v: -1, name: 'up and left', short: 'UL', key: '9' },
  { id: 'right', u: -1, v: 0, name: 'right', short: 'R', key: '4' },
  { id: 'primary', u: 0, v: 0, name: 'straight ahead', short: 'P', key: '5' },
  { id: 'left', u: 1, v: 0, name: 'left', short: 'L', key: '6' },
  { id: 'downRight', u: -1, v: 1, name: 'down and right', short: 'DR', key: '1' },
  { id: 'down', u: 0, v: 1, name: 'down', short: 'D', key: '2' },
  { id: 'downLeft', u: 1, v: 1, name: 'down and left', short: 'DL', key: '3' },
];
export const nodeById = (id: NodeId): GazeNode => NODES.find((n) => n.id === id)!;
export const GAZE_IDS: readonly Gaze[] = NODES.filter((n) => n.id !== 'primary').map((n) => n.id as Gaze);

export type Grid = Record<Eye, Record<Gaze, number>>;
export const emptyGrid = (): Grid => ({
  OD: Object.fromEntries(GAZE_IDS.map((g) => [g, 0])) as Record<Gaze, number>,
  OS: Object.fromEntries(GAZE_IDS.map((g) => [g, 0])) as Record<Gaze, number>,
});

const clampGrade = (n: number) => Math.max(-4, Math.min(4, Math.round(n)));
/** The true -4..+4 grades for the 16 eye/gaze cells. */
export function trueGrid(f: PatientFindings): Grid {
  const g = emptyGrid();
  for (const id of GAZE_IDS) for (const e of EYES) g[e][id] = clampGrade(f.motility.versions[id]?.[e] ?? 0);
  return g;
}
export const gradeText = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** The eye that abducts / adducts in a horizontal gaze (patient frame). */
export const ABD_GAZE: Record<Eye, Gaze> = { OD: 'right', OS: 'left' };
export const ADD_GAZE: Record<Eye, Gaze> = { OD: 'left', OS: 'right' };
export const SO_GAZE: Record<Eye, Gaze> = { OD: 'downLeft', OS: 'downRight' };
export const IO_GAZE: Record<Eye, Gaze> = { OD: 'upLeft', OS: 'upRight' };

// ───────────────────────── eye rotation for a target position
/** Largest natural rotation, in the painter's -1..1 gaze units (1 ≈ 40°). */
export const GAZE_X = 0.92;
export const GAZE_Y = 0.78;
/** Each grade of under/over-action changes the excursion by this fraction. */
const K = 0.2;

interface Mult { mx: number; my: number }

/** 3x3 excursion multipliers per node (row-major, examiner frame). */
export function multiplierGrid(f: PatientFindings, eye: Eye): Mult[] {
  return NODES.map((n) => {
    const grade = n.id === 'primary' ? 0 : f.motility.versions[n.id]?.[eye] ?? 0;
    const m = Math.max(0.16, Math.min(1.7, 1 + K * grade));
    // horizontal gaze: the horizontal recti act; vertical and oblique gazes: elevators/depressors
    return n.v === 0 ? { mx: m, my: 1 } : { mx: 1, my: m };
  });
}

/** Rotation of one eye (gaze units) for a wand at (u, v) in -1..1, interpolating the nine nodes. */
export function eyeGazeAt(grid: Mult[], u: number, v: number): { x: number; y: number } {
  const cu = Math.max(-1, Math.min(1, u)) + 1;
  const cv = Math.max(-1, Math.min(1, v)) + 1;
  const i0 = Math.min(1, Math.floor(cu)), j0 = Math.min(1, Math.floor(cv));
  const tu = cu - i0, tv = cv - j0;
  let mx = 0, my = 0;
  for (const [di, dj, w] of [[0, 0, (1 - tu) * (1 - tv)], [1, 0, tu * (1 - tv)], [0, 1, (1 - tu) * tv], [1, 1, tu * tv]] as const) {
    const m = grid[(j0 + dj) * 3 + i0 + di]!;
    mx += m.mx * w; my += m.my * w;
  }
  return { x: u * GAZE_X * mx, y: v * GAZE_Y * my };
}

/** Nearest diagnostic position to a wand location (null when between positions). */
export function nodeNear(u: number, v: number, radius = 0.22): GazeNode | null {
  let best: GazeNode | null = null, bd = radius;
  for (const n of NODES) {
    const d = Math.hypot(u - n.u, v - n.v);
    if (d <= bd) { best = n; bd = d; }
  }
  return best;
}

export type DiplopiaKind = 'horizontal' | 'vertical' | 'oblique';
export interface Misalignment { dx: number; dy: number; kind: DiplopiaKind | null; prismH: number; prismV: number }
const DEG = Math.PI / 180;
const toPrism = (gazeUnits: number) => Math.round(100 * Math.tan(Math.abs(gazeUnits) * 40 * DEG));
/** Difference between the two eyes' rotations (image coords); > ~2° is perceived as double. */
export function misalignment(od: { x: number; y: number }, os: { x: number; y: number }): Misalignment {
  const dx = od.x - os.x, dy = od.y - os.y;
  const h = Math.abs(dx) > 0.05, vv = Math.abs(dy) > 0.05;
  return { dx, dy, kind: h && vv ? 'oblique' : h ? 'horizontal' : vv ? 'vertical' : null, prismH: toPrism(dx), prismV: toPrism(dy) };
}

// ───────────────────────── pattern recognition (chart wording and practice answers)
export interface MotilityPattern {
  id: 'normal' | 'cn6' | 'cn4' | 'cn3' | 'restrictive' | 'pain';
  eye?: Eye;
  /** Pattern wording for the chart (no diagnosis). */
  chart: string;
  /** Clinical label used in practice answers. */
  label: string;
}
const sideWord = (e: Eye) => (e === 'OD' ? 'right' : 'left');

export function classifyMotility(f: PatientFindings): MotilityPattern {
  const g = trueGrid(f);
  const ptosis = (f.external?.ptosis?.length ?? 0) > 0 || EYES.some((e) => f.anterior[e].lids.includes('ptosis'));
  for (const e of EYES) {
    const adductionLoss = g[e][ADD_GAZE[e]] <= -2;
    const vertLoss = (['up', 'down', 'upLeft', 'upRight', 'downLeft', 'downRight'] as Gaze[]).filter((x) => g[e][x] <= -2).length;
    if (adductionLoss && (vertLoss >= 2 || ptosis)) {
      return { id: 'cn3', eye: e, chart: `Multiple recti underacting ${e}: adduction, elevation and depression limited`, label: `${sideWord(e)} oculomotor (CN III) palsy` };
    }
  }
  for (const e of EYES) {
    if (g[e][SO_GAZE[e]] <= -1 && g[e][IO_GAZE[e]] >= 1) {
      return { id: 'cn4', eye: e, chart: `Depression in adduction deficit ${e} with inferior oblique overaction`, label: `${sideWord(e)} trochlear (CN IV) palsy` };
    }
  }
  for (const e of EYES) {
    if (g[e][ABD_GAZE[e]] <= -1) {
      return { id: 'cn6', eye: e, chart: `Abduction deficit ${e}`, label: `${sideWord(e)} abducens (CN VI) palsy` };
    }
  }
  for (const e of EYES) {
    if (g[e].up <= -2 && g[e].upLeft <= -1 && g[e].upRight <= -1) {
      return { id: 'restrictive', eye: e, chart: `Elevation limited ${e} (all upgaze positions)`, label: `${sideWord(e)} restrictive elevation deficit (e.g. thyroid eye disease or orbital floor)` };
    }
  }
  if (f.motility.painOnMovement) return { id: 'pain', chart: 'Full ductions; pain on eye movement', label: 'full movements with pain on eye movement (optic neuritis pattern)' };
  return { id: 'normal', chart: 'Full, smooth, equal', label: 'full motility (no palsy)' };
}

/** Abbreviated abnormal cells for one eye, e.g. "L −3, UL −2". */
export function cellsText(grid: Record<Gaze, number>): string {
  return NODES.filter((n) => n.id !== 'primary' && grid[n.id as Gaze] !== 0)
    .map((n) => `${n.short} ${gradeText(grid[n.id as Gaze])}`).join(', ');
}

// ───────────────────────── convergence & accommodation
export const PD_MM = 62;
/** Rotation (degrees) of each eye to fixate a target on the midline at distCm. */
export const convergenceDeg = (distCm: number) => Math.atan((PD_MM / 2) / (distCm * 10)) / DEG;
export const convergenceGaze = (distCm: number) => convergenceDeg(distCm) / 40;
/** Prism dioptres of convergence demanded at distCm (PD in cm x diopters). */
export const convergenceDemandPD = (distCm: number) => Math.round((PD_MM / 10) * (100 / distCm));

export const NPC_NORMAL_BREAK = 6;
export const NPC_RECEDED = 10;
/** Recovery is always at least as far as the break; CI patients recover further out. */
export const recoveryFor = (breakCm: number) => Math.round((breakCm + 1.5 + 0.2 * Math.max(0, breakCm - 6)) * 10) / 10;
export const breakFor = (f: PatientFindings) => Math.max(2.5, Math.round(f.motility.npcCm * 10) / 10);

/** Hofstetter: minimum, average and maximum accommodative amplitude (D) for age. */
export const hofstetter = (age: number) => ({
  min: Math.max(0, 15 - 0.25 * age),
  avg: Math.max(0, 18.5 - 0.3 * age),
  max: Math.max(0, 25 - 0.4 * age),
});
/** Push-up ruler far end: beyond this the patient simply reads "already blurry". */
export const PUSHUP_FAR_CM = 60;
/** The patient reports "first sustained blur" once defocus exceeds this (D). */
export const BLUR_REPORT_D = 0.25;
export const defocusD = (distCm: number, ampD: number) => Math.max(0, 100 / distCm - ampD);
/** What a perfect push-up reading reports (clipped at the far end of the ruler). */
export const expectedPushupD = (ampD: number) => Math.max(ampD, 100 / PUSHUP_FAR_CM);

export type ConvState = 'fused' | 'broken';
export interface ConvTruth { breakCm: number; recoveryCm: number; deviatingEye: Eye; silent: boolean }
export function convTruth(f: PatientFindings, rng: Rng, difficulty: number): ConvTruth {
  const dev = f.motility.near.deviatingEye;
  const eye: Eye = dev === 'OD' || dev === 'OS' ? dev : rng.chance(0.5) ? 'OD' : 'OS';
  const b = breakFor(f);
  return { breakCm: b, recoveryCm: recoveryFor(b), deviatingEye: eye, silent: rng.chance(0.15 + 0.35 * difficulty) };
}

/** Break/recovery state machine with hysteresis; `drift` (0..1) animates the outward drift. */
export class ConvSim {
  state: ConvState = 'fused';
  drift = 0;
  /** distance at which the state last flipped */
  constructor(readonly t: ConvTruth) {}
  step(dtMs: number, distCm: number): ConvState {
    if (this.state === 'fused' && distCm <= this.t.breakCm) this.state = 'broken';
    else if (this.state === 'broken' && distCm >= this.t.recoveryCm) this.state = 'fused';
    const goal = this.state === 'broken' ? 1 : 0;
    const k = 1 - Math.exp(-dtMs / (goal ? 70 : 110));
    this.drift += (goal - this.drift) * k;
    return this.state;
  }
}
