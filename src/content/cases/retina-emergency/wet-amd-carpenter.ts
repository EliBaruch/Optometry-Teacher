import { buildFindings, type ClinicalCase } from '@core';

/** Neovascular AMD OS: sudden metamorphopsia, central scotoma, subretinal blood. */
const wetAmdCarpenter: ClinicalCase = {
  id: 'wet-amd-carpenter',
  difficulty: 2,
  tags: ['elderly', 'distortion', 'sudden-vision-loss', 'macula', 'amsler'],
  patient: {
    name: 'Rafael Mendoza',
    age: 77,
    sex: 'M',
    occupation: 'Retired master carpenter',
    personality: 'Still builds cradles for the neighbourhood; trusts a spirit level more than most people.',
    avatar: {
      skin: 3, hair: 'swept', hairColor: '#c9c4bc', irisColor: '#3d2a1a',
      glasses: 'square', facialHair: 'moustache', headwear: 'none', accessory: 'hearing-aid', outfit: '#7a5a3a',
    },
  },
  chiefComplaint:
    "Three days ago I put my level on a shelf and the lines on it bent like a snake — only through the left eye. Now there's a grey thumbprint right where I look. Fifty years I've cut straight lines. Something is wrong.",
  history: [
    { id: 'onset', category: 'onset', q: 'When did it start, and how quickly?', a: 'Saturday morning, all at once. Friday everything was straight.', relevance: 'key' },
    { id: 'distortion', category: 'symptoms', q: 'Do straight lines look bent or wavy? Is something missing in the middle?', a: 'Door frames bow in the middle, and faces have a grey blob over the nose. Only the left eye.', relevance: 'key' },
    { id: 'known-amd', category: 'ocular-history', q: 'Has anyone mentioned spots at the back of your eyes before?', a: 'The last eye doctor said "drusen" — I thought it was a Dutch word for nothing much.', relevance: 'key' },
    { id: 'supplements', category: 'medications', q: 'Do you take eye vitamins or blood thinners?', a: 'The eye vitamins, yes, most days. And a baby aspirin for my heart.', relevance: 'helpful' },
    { id: 'smoking', category: 'social', q: 'Do you smoke, or did you?', a: 'Pipe, for thirty years. Stopped when my grandson was born.', relevance: 'helpful' },
    { id: 'pain', category: 'symptoms', q: 'Is the eye painful or red?', a: 'No pain. It looks normal. That is what makes it strange.', relevance: 'helpful' },
    { id: 'flashes', category: 'symptoms', q: 'Any flashes, floaters or a curtain from the edge?', a: 'No flashes. No curtain. It is the centre that is wrong, the edges are fine.', relevance: 'helpful' },
    { id: 'diabetes', category: 'medical', q: 'Do you have diabetes?', a: 'No. Blood pressure pills only.', relevance: 'neutral' },
    { id: 'sawdust', category: 'social', q: 'Could sawdust have got into the eye?', a: 'I wear goggles since 1979. My wife made me promise.', relevance: 'red-herring' },
  ],
  findings: buildFindings(77, {
    va: {
      OD: { uncorrected: 0.5, bestCorrected: 0.1, pinhole: 0.2, nearUncorrected: 1.0 },
      OS: { uncorrected: 1.0, bestCorrected: 0.9, pinhole: 0.9, nearUncorrected: 1.2 },
    },
    refraction: {
      OD: { sphere: 1.25, cylinder: -0.5, axis: 90, add: 2.5 },
      OS: { sphere: 1.25, cylinder: -0.75, axis: 85, add: 2.5 },
    },
    anterior: {
      OD: { lens: ['nuclear-sclerosis'], lensGrade: 2 },
      OS: { lens: ['nuclear-sclerosis'], lensGrade: 2 },
    },
    amsler: {
      OD: { result: 'normal' },
      OS: { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 4 },
    },
    posterior: {
      OD: {
        lesions: [
          { type: 'drusen-large', zone: 'macula', density: 3 },
          { type: 'drusen-small', zone: 'macula', density: 2 },
          { type: 'pigment-clumping', zone: 'macula', density: 1 },
        ],
      },
      OS: {
        lesions: [
          { type: 'subretinal-hemorrhage', zone: 'macula', density: 3 },
          { type: 'macular-edema', zone: 'macula', density: 3 },
          { type: 'hard-exudate', zone: 'macula', density: 1 },
          { type: 'drusen-large', zone: 'macula', density: 2 },
        ],
      },
    },
  }),
  essentialTests: ['amsler', 'ophthalmoscopy', 'visual-acuity'],
  helpfulTests: ['pinhole', 'slit-lamp', 'pupils', 'phoropter'],
  diagnosis: 'wet-amd',
  differentials: ['dry-amd', 'central-serous', 'diabetic-macular-edema', 'brvo'],
  urgency: 'urgent',
  management:
    'Neovascular (wet) AMD in the left eye: sudden metamorphopsia and central scotoma with subretinal haemorrhage and fluid on a background of drusen. Phone the retina service today: he should be seen within 24-48 hours for OCT and intravitreal anti-VEGF, and a large submacular bleed may need displacement within days. Every week of delay costs letters. Continue AREDS2, teach daily Amsler monitoring of the right eye, and do not stop his aspirin without his cardiologist.',
  teachingPoints: [
    'New distortion + grey scotoma + blood under the macula in someone with drusen = wet AMD until proven otherwise. The speed of referral decides the final acuity.',
    'The Amsler grid is the cheapest early-warning device in optometry. He reports both signs: the wavy lines are the fluid, the grey missing patch is the scotoma under the blood.',
    'Dry AMD declines over years; wet AMD changes over days.',
    'Central serous strikes younger, stressed patients and causes a clear serous blister — not haemorrhage.',
    'Cataract dims vision gradually and evenly; it never bends a straight line.',
  ],
  redFlags: ['Subretinal haemorrhage', 'Sudden metamorphopsia', 'Fellow eye with large drusen (high risk of conversion)'],
  sources: [
    'https://eyewiki.aao.org/Age-Related_Macular_Degeneration',
    'https://www1.racgp.org.au/ajgp/2026/july/age-related-macular-degeneration',
    'https://www.mdfoundation.com.au/news/seeing-the-unseen/',
  ],
};

export default wetAmdCarpenter;
