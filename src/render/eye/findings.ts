import type { Eye, PatientFindings } from '@core';
import { nasalSign, prismToGaze } from './geometry';
import { DEFAULT_EYE_STATE, type EyeLighting, type EyeState, type LensOpacityType } from './types';

export interface EyeStateOptions {
  lighting?: EyeLighting;
  irisColor?: string;
  irisSeed?: number;
  skinTone?: string;
  /** Where the patient looks (−1..1). Default: straight at the examiner. */
  gaze?: { x: number; y: number };
  /** Distance or near deviation for Hirschberg (default distance). */
  fixation?: 'distance' | 'near';
  /** Which eye is fixating when a tropia is present (default: the non-deviating eye). */
  fixingEye?: Eye;
}

/**
 * Translate the canonical clinical findings for one eye into an EyeState the
 * painter understands. Pure; every field is derived, nothing random.
 */
export function eyeStateFromFindings(f: PatientFindings, eye: Eye, opts: EyeStateOptions = {}): EyeState {
  const a = f.anterior[eye];
  const lighting = opts.lighting ?? 'room';
  const conj = new Set(a.conjunctiva);
  const cornea = new Set(a.cornea);
  const lids = new Set(a.lids);
  const lens = new Set(a.lens);
  const iris = new Set(a.iris);
  const ac = a.anteriorChamber;
  const ext = f.external ?? {};

  // pupils
  const dark = lighting === 'dim' || lighting === 'slit' || lighting === 'cobalt';
  let pupilMm = dark ? f.pupils.sizeDarkMm[eye] : f.pupils.sizeLightMm[eye];
  const shape = f.pupils.shape?.[eye] ?? 'round';
  if (shape === 'mid-dilated') pupilMm = Math.max(pupilMm, 5);
  if (lighting === 'penlight' && f.pupils.reactivity[eye] === 'brisk') pupilMm = Math.min(pupilMm, f.pupils.sizeLightMm[eye]);

  // redness
  let redness = 0.08;
  let pattern: EyeState['rednessPattern'] = 'diffuse';
  if (conj.has('diffuse-injection')) { redness = 0.75; pattern = 'diffuse'; }
  if (conj.has('papillae') || conj.has('follicles') || conj.has('giant-papillae')) redness = Math.max(redness, 0.45);
  if (conj.has('sectoral-injection')) { redness = Math.max(redness, 0.8); pattern = 'sectoral'; }
  if (conj.has('ciliary-flush') || ac.cells >= 1) { redness = Math.max(redness, 0.8); pattern = 'ciliary-flush'; }
  if (ext.redEye?.includes(eye)) redness = Math.max(redness, 0.6);

  // lids
  let lidAperture = 1;
  if (lids.has('ptosis') || ext.ptosis?.includes(eye)) lidAperture = 0.62;
  const lidSwelling = lids.has('lid-edema') || lids.has('hordeolum') || lids.has('chalazion') ? 0.6 : lids.has('vesicles') ? 0.4 : 0;
  if (lidSwelling) lidAperture = Math.min(lidAperture, 0.8);
  if (ext.squinting || ext.photophobia) lidAperture = Math.min(lidAperture, 0.78);

  // lens
  let lensType: LensOpacityType = 'none';
  if (lens.has('nuclear-sclerosis')) lensType = 'nuclear';
  if (lens.has('cortical-cataract')) lensType = 'cortical';
  if (lens.has('posterior-subcapsular')) lensType = 'psc';
  const lensOpacity = lensType === 'none' ? 0 : Math.max(0.2, Math.min(1, (a.lensGrade ?? 2) / 4));

  // discharge
  const discharge: EyeState['discharge'] = conj.has('discharge-mucopurulent') ? 'mucopurulent'
    : conj.has('discharge-stringy') ? 'stringy' : conj.has('discharge-watery') || ext.tearing?.includes(eye) ? 'watery' : 'none';

  // gaze & Hirschberg from the motility deviation
  let gaze = { ...(opts.gaze ?? { x: 0, y: 0 }) };
  const dev = opts.fixation === 'near' ? f.motility.near : f.motility.distance;
  const isTropia = dev.type === 'tropia' || dev.type === 'intermittent-tropia';
  if (isTropia) {
    const deviating = dev.deviatingEye === 'alternating' || !dev.deviatingEye
      ? (opts.fixingEye ? (opts.fixingEye === 'OD' ? 'OS' : 'OD') : 'OS')
      : dev.deviatingEye;
    const fixing = opts.fixingEye ?? (deviating === 'OD' ? 'OS' : 'OD');
    if (eye === deviating && eye !== fixing) {
      // eso (+) turns the eye nasally; exo (−) temporally
      gaze.x += prismToGaze(Math.abs(dev.horizontal)) * Math.sign(dev.horizontal) * nasalSign(eye);
      // vertical: + = right hyper. A hyper eye looks up (−y in image).
      const vSign = dev.vertical === 0 ? 0 : (dev.vertical > 0) === (eye === 'OD') ? -1 : 1;
      gaze.y += prismToGaze(Math.abs(dev.vertical)) * vSign;
    }
  }
  gaze = { x: Math.max(-1, Math.min(1, gaze.x)), y: Math.max(-1, Math.min(1, gaze.y)) };

  return {
    ...DEFAULT_EYE_STATE,
    eye,
    irisColor: opts.irisColor ?? DEFAULT_EYE_STATE.irisColor,
    irisSeed: opts.irisSeed ?? (eye === 'OD' ? 11 : 12),
    skinTone: opts.skinTone,
    pupilMm,
    pupilShape: iris.has('posterior-synechiae') ? 'irregular' : shape,
    gaze,
    lidAperture,
    lighting,
    redness,
    rednessPattern: pattern,
    subconjHemorrhage: conj.has('subconjunctival-hemorrhage'),
    chemosis: conj.has('chemosis') ? 0.7 : 0,
    pinguecula: conj.has('pinguecula'),
    pterygium: conj.has('pterygium'),
    papillae: conj.has('papillae') || conj.has('giant-papillae'),
    follicles: conj.has('follicles'),
    discharge,
    lidSwelling,
    lidMarginRed: lids.has('anterior-blepharitis') || lids.has('meibomian-dysfunction'),
    cornealHaze: cornea.has('edema') ? 0.7 : cornea.has('pannus') ? 0.25 : 0,
    dendrite: cornea.has('dendrite'),
    ulcer: cornea.has('ulcer') ? 'ulcer' : cornea.has('infiltrate') ? 'infiltrate' : 'none',
    keraticPrecipitates: cornea.has('keratic-precipitates'),
    abrasion: cornea.has('abrasion'),
    foreignBody: cornea.has('foreign-body'),
    punctateKeratitis: cornea.has('punctate-keratitis'),
    hypopyon: ac.hypopyon ? 0.14 : 0,
    hyphema: ac.hyphema ? 0.2 : 0,
    vanHerick: ac.vanHerick,
    acCells: ac.cells,
    acFlare: ac.flare,
    acDepth: ac.depth,
    lensOpacity,
    lensType,
    iol: lens.has('iol'),
    irisNeovascularization: iris.has('neovascularization'),
    posteriorSynechiae: iris.has('posterior-synechiae'),
    irisNevus: iris.has('nevus'),
    stain: a.fluorescein,
    reflex: undefined,
  };
}
