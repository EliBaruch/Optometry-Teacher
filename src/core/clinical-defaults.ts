import type {
  AnteriorSegment, DeepPartial, Eye, PatientFindings, PerEye, PosteriorSegment,
} from './clinical';

const both = <T>(make: () => T): PerEye<T> => ({ OD: make(), OS: make() });

/** Typical accommodative amplitude by age (Hofstetter average: 18.5 - 0.3*age, floored). */
export function expectedAmplitude(age: number): number {
  return Math.max(0.5, Math.round((18.5 - 0.3 * age) * 4) / 4);
}

/** Typical near add for a presbyope by age (0 below ~40). */
export function typicalAdd(age: number): number {
  if (age < 40) return 0;
  if (age < 45) return 1.0;
  if (age < 50) return 1.5;
  if (age < 55) return 2.0;
  return 2.5;
}

function normalAnterior(age: number): AnteriorSegment {
  return {
    lids: ['normal'],
    conjunctiva: ['normal'],
    cornea: ['clear'],
    anteriorChamber: { depth: 'normal', vanHerick: 4, cells: 0, flare: 0 },
    iris: ['normal'],
    lens: age >= 60 ? ['nuclear-sclerosis'] : ['clear'],
    lensGrade: age >= 60 ? 1 : 0,
    fluorescein: 'none',
    tbutSec: 12,
  };
}

function normalPosterior(): PosteriorSegment {
  return {
    vitreous: 'clear',
    disc: { cdr: 0.3, color: 'pink', margins: 'sharp', rimThinning: 'none', edema: false, svp: true },
    vessels: { avRatio: 0.67, avNicking: false, copperWiring: false, tortuosity: 'normal', venousDilation: false },
    lesions: [],
    fundusTone: 'medium',
  };
}

/** A healthy, emmetropic eye exam for a patient of the given age. */
export function normalFindings(age = 30): PatientFindings {
  const add = typicalAdd(age);
  const amp = expectedAmplitude(age);
  return {
    va: both(() => ({ uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: add > 0 ? Math.min(0.7, add * 0.3) : 0 })),
    refraction: both(() => ({ sphere: 0, cylinder: 0, axis: 180, add: add || undefined })),
    retinoscopyReflex: both(() => 'normal' as const),
    redReflex: both(() => 'normal' as const),
    keratometry: both(() => ({ k1: 43.25, k2: 43.75, axisK1: 180, mires: 'regular' as const })),
    pupils: {
      sizeLightMm: { OD: 3, OS: 3 },
      sizeDarkMm: { OD: age > 60 ? 5 : 6, OS: age > 60 ? 5 : 6 },
      reactivity: { OD: 'brisk', OS: 'brisk' },
      rapd: 'none',
      nearResponse: 'normal',
      shape: { OD: 'round', OS: 'round' },
    },
    motility: {
      distance: { horizontal: 0, vertical: 0, type: 'ortho' },
      near: { horizontal: -2, vertical: 0, type: 'phoria' },
      versions: {},
      npcCm: 5,
      diplopia: 'none',
      headPosture: 'none',
    },
    anterior: both(() => normalAnterior(age)),
    posterior: both(normalPosterior),
    iop: { OD: 15, OS: 15 },
    colorVision: both(() => ({ type: 'normal' as const, severity: 'none' as const })),
    fields: both(() => 'full' as const),
    amsler: both(() => ({ result: 'normal' as const })),
    accommodation: { amplitudeD: { OD: amp, OS: amp }, facilityCpm: 11 },
    external: {},
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep merge; arrays and primitives in `patch` replace those in `base`. */
export function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (patch === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const b = out[k];
    out[k] = isPlainObject(b) && isPlainObject(v) ? deepMerge(b, v as never) : v;
  }
  return out as T;
}

/**
 * Build a complete PatientFindings from a sparse description:
 *   findings(62, { iop: { OD: 48 }, anterior: { OD: { cornea: ['edema'] } } })
 */
export function buildFindings(age: number, patch?: DeepPartial<PatientFindings>): PatientFindings {
  return deepMerge(normalFindings(age), patch);
}

/** Apply the same patch to both eyes. */
export function bothEyes<T>(patch: T): { OD: T; OS: T } {
  return { OD: patch, OS: patch };
}

export function otherEye(eye: Eye): Eye {
  return eye === 'OD' ? 'OS' : 'OD';
}
