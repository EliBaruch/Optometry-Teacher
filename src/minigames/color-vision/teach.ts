import type { CvClass } from './clinical';

export const CLASS_LABEL: Record<CvClass, string> = {
  normal: 'Normal',
  protan: 'Protan',
  deutan: 'Deutan',
  tritan: 'Tritan',
  acquired: 'Acquired',
};

export const CLASS_HINT: Record<CvClass, string> = {
  normal: 'reads every plate',
  protan: 'red-green · L-cone',
  deutan: 'red-green · M-cone',
  tritan: 'blue-yellow · S-cone',
  acquired: 'retina / optic nerve',
};

/** Short elaborated feedback shown after the player commits. */
export const TEACHING: Record<CvClass, string> = {
  normal:
    'Every screening plate read, no hidden figures seen and the blue-yellow symbols named in each eye: normal trichromatic colour vision. Plates screen red-green loss best — a pass does not exclude subtle acquired loss, so compare red saturation if the history points to the optic nerve.',
  deutan:
    'Same result in both eyes: the screening numbers vanish, the transformation plates show the "other" number and the hidden figure appears. On the classification plate only the left digit — drawn on a protan confusion line — is seen, so the missing signal is the M-cone: deutan. Congenital, X-linked (about 5% of men), stable and otherwise symptom-free.',
  protan:
    'Symmetrical red-green failures with dichromat transformations, and on the classification plate only the right digit — drawn on a deutan confusion line — is seen, so the L-cone signal is missing: protan. Reds also look darker to protans (brake lights, warning LEDs). Congenital and X-linked, about 1–2% of men.',
  tritan:
    'Red-green plates pass, but the blue-yellow (S-cone) symbols are missed in both eyes. Congenital tritan defects are rare (autosomal dominant, about 1 in 10,000) and red-green style books miss them entirely — use plates with blue-yellow symbols. Bilateral, symmetric and stable.',
  acquired:
    'Asymmetric between the eyes, often with reduced acuity and no clean dichromat pattern: an acquired defect. Köllner’s rule — optic nerve disease (optic neuritis, ischaemic or compressive neuropathy) tends to give red-green loss with red desaturation; outer retinal / macular disease (central serous, AMD, diabetic maculopathy) tends to give blue-yellow loss. Check pupils for an RAPD and refer by urgency.',
};

export const DISCLAIMER = 'Screen colours are uncalibrated — these plates are a teaching simulation, not a diagnostic test.';
