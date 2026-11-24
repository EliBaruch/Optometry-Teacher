import { buildFindings, type ClinicalCase } from '@core';

/** Nuclear cataract with glare and a myopic shift ("second sight"). */
const cataractCase: ClinicalCase = {
  id: 'ant-cataract-seamstress',
  difficulty: 2,
  tags: ['gradual-vision-loss', 'glare', 'elderly', 'lens'],
  patient: {
    name: 'Agnes Mwangi',
    age: 90,
    sex: 'F',
    occupation: 'Retired seamstress and choir soprano',
    personality: 'Sharp as a pin, outlives her optometrists, sings while she waits.',
    avatar: {
      skin: 5, hair: 'short', hairColor: '#e8e4de', irisColor: '#3a2414',
      glasses: 'round', headwear: 'headscarf', accessory: 'hearing-aid', outfit: '#2e7d6b',
    },
  },
  chiefComplaint:
    "At night every headlight is a starburst and I have to wait on the kerb until the car has gone. Colours look like they've been left in the sun. But here's the miracle — I can thread a needle without my reading glasses again!",
  history: [
    { id: 'onset', category: 'onset', q: 'Did it come on suddenly or gradually?', a: 'Creeping on for two years. Nothing sudden.', relevance: 'key' },
    { id: 'glare', category: 'symptoms', q: 'Is glare from lights a problem?', a: 'Terrible. Headlights, the sun on the pavement, the stage lights at choir.', relevance: 'key' },
    { id: 'amsler', category: 'symptoms', q: 'Do straight lines look wavy, or is there a missing patch in the centre?', a: 'No, lines are straight — just foggy, like a steamed-up window.', relevance: 'key' },
    { id: 'function', category: 'social', q: 'What do you most need your eyes for?', a: 'Reading my choir music, my sewing, and walking to my granddaughter’s after dark.', relevance: 'key' },
    { id: 'which', category: 'symptoms', q: 'Is one eye worse?', a: 'The right, I think. When I cover the left the world is foggier.', relevance: 'helpful' },
    { id: 'steroids', category: 'medications', q: 'Any steroid tablets, inhalers or creams?', a: 'An inhaler for my chest, and a course of prednisolone last winter.', relevance: 'helpful' },
    { id: 'diabetes', category: 'medical', q: 'Do you have diabetes?', a: 'No, the nurse checks my sugar every year.', relevance: 'helpful' },
    { id: 'pain', category: 'symptoms', q: 'Any pain, redness, flashes or floaters?', a: 'None of that, thank goodness.', relevance: 'neutral' },
    { id: 'fhx', category: 'family', q: 'Anyone in the family colour-blind?', a: 'Not that I know of.', relevance: 'red-herring' },
  ],
  findings: buildFindings(90, {
    va: {
      OD: { uncorrected: 0.7, bestCorrected: 0.4, pinhole: 0.4, nearUncorrected: 0.4 },
      OS: { uncorrected: 0.4, bestCorrected: 0.3, pinhole: 0.3, nearUncorrected: 0.5 },
    },
    refraction: {
      OD: { sphere: -1.25, cylinder: -0.75, axis: 90 },
      OS: { sphere: -0.5, cylinder: -0.5, axis: 85 },
    },
    retinoscopyReflex: { OD: 'dull', OS: 'dull' },
    redReflex: { OD: 'dull', OS: 'dull' },
    pupils: { sizeLightMm: { OD: 2.5, OS: 2.5 }, sizeDarkMm: { OD: 4, OS: 4 } },
    anterior: {
      OD: { lens: ['nuclear-sclerosis', 'cortical-cataract'], lensGrade: 3 },
      OS: { lens: ['nuclear-sclerosis'], lensGrade: 2 },
    },
    posterior: {
      OD: { disc: { cdr: 0.35 } },
      OS: { disc: { cdr: 0.35 } },
    },
    accommodation: { amplitudeD: { OD: 0.5, OS: 0.5 } },
  }),
  essentialTests: ['slit-lamp', 'visual-acuity', 'pinhole'],
  helpfulTests: ['phoropter', 'ophthalmoscopy', 'amsler', 'retinoscopy', 'pupils'],
  diagnosis: 'cataract',
  differentials: ['dry-amd', 'myopia', 'presbyopia', 'diabetic-macular-edema'],
  urgency: 'routine',
  management:
    'Update the spectacles only if it gives a worthwhile gain (here it barely does), and give glare advice. Refer routinely to ophthalmology for cataract surgery, right eye first, because her vision now limits the things she values — the decision is driven by function, not a fixed acuity cut-off, and age alone is no barrier. Discuss lens implant options and what recovery involves.',
  teachingPoints: [
    'The pinhole only clears the refractive part of the blur and stalls at the best-corrected level — it never reaches normal acuity, so the remaining loss is not refractive: think media (cataract) or retina/nerve.',
    'Nuclear sclerosis raises the lens refractive index and causes a myopic shift — "second sight" for reading.',
    'Glare and faded colours are classic; a dull red reflex and a dull retinoscopy reflex fit media opacity.',
    'Cataract never causes a relative afferent pupillary defect — if you find one, look for optic nerve or extensive retinal disease.',
    'Straight lines staying straight on the Amsler grid help separate cataract from macular disease.',
  ],
  redFlags: [
    'A relative afferent pupillary defect or distortion — look beyond the lens.',
    'A mature, swollen lens with a shallow chamber and high pressure (phacomorphic angle closure).',
  ],
  sources: [
    'https://www.ncbi.nlm.nih.gov/books/NBK539699/',
    'https://eyewiki.aao.org/Cataract',
  ],
};

export default cataractCase;
