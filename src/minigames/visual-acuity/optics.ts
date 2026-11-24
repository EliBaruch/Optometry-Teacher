/**
 * Patient-view optics: turns the findings into what the open eye actually sees
 * on the chart. Acuity itself always comes from findings.va (the source of
 * truth); the refraction only shapes the blur (astigmatism smears along one
 * meridian), and pathology adds veil / distortion / scotoma. Pure — no DOM.
 */
import type { Eye, PatientFindings, Refraction } from '@core';

export interface OpenEyes {
  OD: boolean;
  OS: boolean;
}

export interface BlurSpec {
  /** Gaussian sigma along the major axis, arcmin of visual angle */
  major: number;
  minor: number;
  /** Major-axis direction as the patient sees the chart, degrees CCW from horizontal */
  angle: number;
  /** 0..1 milky veil (cataract, corneal oedema) */
  veil: number;
  /** 0..1 metamorphopsia (macular disease) */
  warp: number;
  /** 0..1 central scotoma */
  scotoma: number;
  /** 1 = full chart luminance; the pinhole cuts the light */
  luminance: number;
  /** true when nothing can be seen (both eyes covered / NLP) */
  dark: boolean;
}

export const SHARP: BlurSpec = { major: 0, minor: 0, angle: 0, veil: 0, warp: 0, scotoma: 0, luminance: 1, dark: false };

/** Minimum angle of resolution in arcmin. */
export const mar = (logmar: number) => Math.pow(10, logmar);

/** Blur sigma per arcmin of *excess* MAR. 0.55 puts letters at threshold right on the edge of legibility. */
export const BLUR_PER_MAR = 0.55;

/** A gain of ≥ 2 lines with the pinhole counts as "improves" (1 line is test–retest noise). */
export const PINHOLE_GAIN = 0.15;

/**
 * Pinhole acuity. Uses findings.va.pinhole when the case provides it; otherwise
 * the pinhole removes ~94 % of the defocus blur but can never beat the
 * pathology limit (best-corrected VA) or ~20/20–20/25 (diffraction + dimming).
 */
export function pinholeLogmar(f: PatientFindings, eye: Eye): number {
  const va = f.va[eye];
  // A pinhole never makes the reading worse in this model (it only removes defocus).
  if (va.pinhole !== undefined) return Math.min(va.pinhole, va.uncorrected);
  const floor = Math.max(mar(va.bestCorrected), mar(0.05));
  const excess = Math.max(0, mar(va.uncorrected) - mar(va.bestCorrected));
  const est = Math.log10(floor + excess * 0.06);
  return Math.round(Math.min(va.uncorrected, est) * 100) / 100;
}

export function pinholeImproves(f: PatientFindings, eye: Eye): boolean {
  return f.va[eye].uncorrected - pinholeLogmar(f, eye) >= PINHOLE_GAIN - 1e-9;
}

/** Binocular summation: both eyes open read ~a letter or two better than the better eye. */
export function binocularLogmar(od: number, os: number): number {
  const best = Math.min(od, os);
  return Math.abs(od - os) < 0.15 ? best - 0.04 : best;
}

/** The acuity actually achieved with these eyes open (null when both are covered). */
export function effectiveLogmar(f: PatientFindings, open: OpenEyes, pinhole = false): number | null {
  const one = (e: Eye) => (pinhole ? pinholeLogmar(f, e) : f.va[e].uncorrected);
  if (open.OD && open.OS) return binocularLogmar(one('OD'), one('OS'));
  if (open.OD) return one('OD');
  if (open.OS) return one('OS');
  return null;
}

/**
 * Principal-meridian refractive errors after the patient's own accommodation
 * (a young hyperope focuses part of the error away).
 * Minus-cyl Rx S / C × A: the meridian along A needs S, the one at A+90 needs S+C.
 */
export function meridianErrors(rx: Refraction, amplitude: number): { alongAxis: number; perpendicular: number } {
  const se = rx.sphere + rx.cylinder / 2;
  const accom = se > 0 ? Math.min(se, Math.max(0, amplitude) * 0.67) : 0;
  return { alongAxis: rx.sphere - accom, perpendicular: rx.sphere + rx.cylinder - accom };
}

/**
 * Shape of the defocus ellipse: unit-RMS axes and the screen angle.
 * A meridian with power error spreads each point along that meridian.
 * TABO axes are measured as the examiner faces the patient; the patient sees the
 * chart mirrored left–right, so the on-chart angle is 180 − axis.
 */
export function defocusShape(rx: Refraction, amplitude: number): { major: number; minor: number; angle: number } {
  const { alongAxis, perpendicular } = meridianErrors(rx, amplitude);
  let a = Math.abs(alongAxis);
  let b = Math.abs(perpendicular);
  if (a + b < 0.05) {
    a = 1;
    b = 1;
  }
  // Each meridian keeps at least a third of the blur: the eye's own aberrations never make it a perfect line.
  const lo = Math.max(Math.min(a, b), Math.max(a, b) * 0.33);
  const hi = Math.max(a, b);
  const rms = Math.sqrt((hi * hi + lo * lo) / 2);
  const axisAngle = a >= b ? rx.axis : rx.axis + 90;
  const angle = (((180 - axisAngle) % 180) + 180) % 180;
  return { major: hi / rms, minor: lo / rms, angle };
}

function pathologySigns(f: PatientFindings, eye: Eye): { veil: number; warp: number; scotoma: number } {
  const ant = f.anterior[eye];
  const post = f.posterior[eye];
  let veil = 0;
  const lensGrade = ant.lensGrade ?? 0;
  if (ant.lens.some((l) => l === 'nuclear-sclerosis' || l === 'cortical-cataract' || l === 'posterior-subcapsular')) {
    veil = Math.max(veil, Math.min(0.6, lensGrade * 0.14 + (ant.lens.includes('posterior-subcapsular') ? 0.15 : 0)));
  }
  if (ant.cornea.includes('edema')) veil = Math.max(veil, 0.45);
  if (ant.anteriorChamber.cells >= 2 || post.vitreous === 'hemorrhage') veil = Math.max(veil, 0.35);

  const macular = post.lesions.filter((l) => l.zone === 'macula');
  let warp = 0;
  if (f.amsler[eye].result === 'metamorphopsia') warp = 0.7;
  if (macular.some((l) => ['macular-edema', 'epiretinal-membrane', 'subretinal-hemorrhage', 'drusen-large'].includes(l.type))) warp = Math.max(warp, 0.55);
  if (post.detachment && post.detachment.maculaOff) warp = Math.max(warp, 0.8);

  let scotoma = 0;
  const am = f.amsler[eye].result;
  if (am === 'central-scotoma') scotoma = 0.75;
  if (am === 'paracentral-scotoma') scotoma = Math.max(scotoma, 0.4);
  if (macular.some((l) => l.type === 'geographic-atrophy' || l.type === 'macular-hole' || l.type === 'cherry-red-spot')) scotoma = Math.max(scotoma, 0.6);
  if (f.fields[eye] === 'central-scotoma' || f.fields[eye] === 'cecocentral-scotoma') scotoma = Math.max(scotoma, 0.7);
  return { veil, warp, scotoma };
}

/** What one eye sees: defocus (direction from the Rx) + pathology blur + signs. */
export function eyeBlur(f: PatientFindings, eye: Eye, pinhole = false): BlurSpec {
  const va = f.va[eye];
  const sc = pinhole ? pinholeLogmar(f, eye) : va.uncorrected;
  if (sc >= 2.95) return { ...SHARP, dark: true };
  const bc = Math.min(va.bestCorrected, sc);
  // Neural / pathological limit: isotropic, only beyond a normal 20/20 eye.
  const pathSigma = BLUR_PER_MAR * Math.max(0, mar(bc) - 1);
  // Refractive excess: directional, shaped by the Rx.
  const refSigma = BLUR_PER_MAR * Math.max(0, mar(sc) - Math.max(mar(bc), 1));
  const shape = defocusShape(f.refraction[eye], f.accommodation.amplitudeD[eye]);
  const major = Math.hypot(refSigma * shape.major, pathSigma);
  const minor = Math.hypot(refSigma * shape.minor, pathSigma);
  const signs = pathologySigns(f, eye);
  return {
    major, minor, angle: shape.angle,
    // The pinhole also trims the light-scatter of a cloudy lens a little.
    veil: pinhole ? signs.veil * 0.8 : signs.veil,
    warp: signs.warp, scotoma: signs.scotoma,
    luminance: pinhole ? 0.62 : 1,
    dark: false,
  };
}

/** What the patient sees with these eyes open. Binocular viewing: the better eye wins. */
export function viewBlur(f: PatientFindings, open: OpenEyes, pinhole = false): BlurSpec {
  if (!open.OD && !open.OS) return { ...SHARP, dark: true };
  if (open.OD && open.OS) {
    const od = eyeBlur(f, 'OD', pinhole);
    const os = eyeBlur(f, 'OS', pinhole);
    const pick = od.dark ? os : os.dark ? od : Math.hypot(od.major, od.minor) <= Math.hypot(os.major, os.minor) ? od : os;
    return { ...pick, scotoma: Math.min(od.scotoma, os.scotoma), warp: Math.min(od.warp, os.warp) * 0.5 };
  }
  return eyeBlur(f, open.OD ? 'OD' : 'OS', pinhole);
}
