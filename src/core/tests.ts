import type { PatientFindings } from './clinical';

/**
 * Catalogue of clinical tests. A test is a *clinical concept*; a mini-game is one
 * possible *implementation* of it (registered separately). If no mini-game is
 * registered for a test the exam room simply doesn't offer it — nothing breaks.
 */
export type TestId =
  | 'visual-acuity' | 'pinhole' | 'retinoscopy' | 'phoropter' | 'keratometry'
  | 'pupils' | 'cover-test' | 'motility' | 'convergence'
  | 'color-vision' | 'amsler' | 'visual-fields'
  | 'slit-lamp' | 'fluorescein' | 'tonometry' | 'ophthalmoscopy';

export type TestCategory = 'acuity' | 'refraction' | 'binocular' | 'neuro' | 'anterior' | 'posterior' | 'pressure';

export interface TestInfo {
  id: TestId;
  name: string;
  category: TestCategory;
  /** In-game clinic minutes the test consumes (efficiency scoring / time pressure) */
  minutes: number;
  /** Which slices of PatientFindings the test can reveal */
  reveals: (keyof PatientFindings)[];
  blurb: string;
}

export const TEST_CATALOG: Record<TestId, TestInfo> = {
  'visual-acuity': { id: 'visual-acuity', name: 'Visual Acuity', category: 'acuity', minutes: 2, reveals: ['va'], blurb: 'Read the chart, eye by eye.' },
  'pinhole': { id: 'pinhole', name: 'Pinhole', category: 'acuity', minutes: 1, reveals: ['va'], blurb: 'Does a pinhole improve it? Refractive vs pathology.' },
  'retinoscopy': { id: 'retinoscopy', name: 'Retinoscopy', category: 'refraction', minutes: 4, reveals: ['refraction', 'retinoscopyReflex'], blurb: 'Neutralise the reflex: with or against?' },
  'phoropter': { id: 'phoropter', name: 'Subjective Refraction', category: 'refraction', minutes: 5, reveals: ['refraction', 'va'], blurb: '"Which is better, one or two?"' },
  'keratometry': { id: 'keratometry', name: 'Keratometry', category: 'refraction', minutes: 2, reveals: ['keratometry'], blurb: 'Align the mires, measure corneal curvature.' },
  'pupils': { id: 'pupils', name: 'Pupils', category: 'neuro', minutes: 2, reveals: ['pupils'], blurb: 'Swinging flashlight — spot the RAPD.' },
  'cover-test': { id: 'cover-test', name: 'Cover Test', category: 'binocular', minutes: 2, reveals: ['motility'], blurb: 'Cover, uncover, watch the eyes move.' },
  'motility': { id: 'motility', name: 'Extraocular Motility', category: 'binocular', minutes: 2, reveals: ['motility'], blurb: 'Follow the target through the H.' },
  'convergence': { id: 'convergence', name: 'Near Point of Convergence', category: 'binocular', minutes: 1, reveals: ['motility', 'accommodation'], blurb: 'Bring the target in until it doubles.' },
  'color-vision': { id: 'color-vision', name: 'Colour Vision', category: 'neuro', minutes: 2, reveals: ['colorVision'], blurb: 'Pseudo-isochromatic plates.' },
  'amsler': { id: 'amsler', name: 'Amsler Grid', category: 'posterior', minutes: 1, reveals: ['amsler'], blurb: 'Wavy lines? Missing squares?' },
  'visual-fields': { id: 'visual-fields', name: 'Visual Fields', category: 'neuro', minutes: 4, reveals: ['fields'], blurb: 'Map the island of vision.' },
  'slit-lamp': { id: 'slit-lamp', name: 'Slit Lamp', category: 'anterior', minutes: 4, reveals: ['anterior'], blurb: 'Lids, conjunctiva, cornea, chamber, lens.' },
  'fluorescein': { id: 'fluorescein', name: 'Fluorescein', category: 'anterior', minutes: 2, reveals: ['anterior'], blurb: 'Cobalt blue reveals what white light hides.' },
  'tonometry': { id: 'tonometry', name: 'Tonometry', category: 'pressure', minutes: 2, reveals: ['iop'], blurb: 'Align the mires, read the pressure.' },
  'ophthalmoscopy': { id: 'ophthalmoscopy', name: 'Ophthalmoscopy', category: 'posterior', minutes: 4, reveals: ['posterior', 'redReflex'], blurb: 'Explore the fundus: disc, vessels, macula.' },
};

export const ALL_TESTS = Object.keys(TEST_CATALOG) as TestId[];
