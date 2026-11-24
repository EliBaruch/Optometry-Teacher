import { buildFindings, type ClinicalCase } from '@core';

/** Left anisometropic amblyopia found on school screening: no eye turn, no complaints. */
const amblyopiaSchoolScreening: ClinicalCase = {
  id: 'amblyopia-school-screening',
  difficulty: 3,
  tags: ['paediatric', 'amblyopia', 'screening', 'refractive'],
  patient: {
    name: 'Leila Haddad',
    age: 5,
    sex: 'F',
    occupation: 'Kindergartner and self-declared dinosaur expert',
    personality: 'Chatty, fearless, will tell you the full name of every sauropod given half a chance.',
    avatar: {
      skin: 2,
      hair: 'curly',
      hairColor: '#2a1a12',
      irisColor: '#5a3a1e',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'none',
      outfit: '#f59e0b',
    },
  },
  chiefComplaint:
    "Mum: \"The school nurse sent a letter saying her left eye failed the chart. She has never once complained!\" Leila: \"I can see EVERYTHING. I saw a beetle this morning.\"",
  triageNote: 'Referred from school vision screening: failed OS only. Parent reports no visible eye turn.',
  history: [
    { id: 'turn', category: 'ocular-history', q: 'Have you ever noticed either eye turning in or out, even when she is tired?', a: 'Mum: "Never. We have hundreds of photos. Her eyes always look straight."', relevance: 'key' },
    { id: 'family', category: 'family', q: 'Is there any family history of lazy eye, squint or strong glasses?', a: 'Mum: "My brother had a patch as a boy. And I am long-sighted myself."', relevance: 'key' },
    { id: 'birth', category: 'medical', q: 'Was she born on time, and has her development been normal?', a: 'Mum: "Full-term, no problems at all. She was walking at eleven months and hasn\'t sat down since."', relevance: 'helpful' },
    { id: 'covering', category: 'symptoms', q: 'Does she ever cover or close one eye, tilt her head, or squint?', a: 'Mum: "No... although she does fuss if you cover her right eye during the pirate game."', relevance: 'key' },
    { id: 'white-pupil', category: 'symptoms', q: 'Have you ever seen a white or odd glow in her pupil in photos?', a: 'Mum: "No, always the red-eye like everyone else."', relevance: 'key' },
    { id: 'trauma', category: 'ocular-history', q: 'Any injuries to the eye, or eye infections?', a: 'Leila: "I fell off the climbing frame but I landed on my KNEE." Mum: "Nothing to the eyes."', relevance: 'neutral' },
    { id: 'screen', category: 'social', q: 'How much tablet time does she get?', a: 'Mum: "An hour of dinosaur documentaries on weekends. Is that why?"', relevance: 'red-herring' },
  ],
  findings: buildFindings(5, {
    va: {
      OD: { uncorrected: 0, bestCorrected: 0, pinhole: 0, nearUncorrected: 0 },
      OS: { uncorrected: 0.6, bestCorrected: 0.5, pinhole: 0.6, nearUncorrected: 0.6 },
    },
    refraction: {
      OD: { sphere: 0.5, cylinder: 0, axis: 180 },
      OS: { sphere: 3.5, cylinder: -1.0, axis: 180 },
    },
    keratometry: {
      OD: { k1: 43.25, k2: 43.5, axisK1: 180, mires: 'regular' },
      OS: { k1: 43.0, k2: 44.0, axisK1: 180, mires: 'regular' },
    },
    motility: {
      distance: { horizontal: 0, vertical: 0, type: 'ortho' },
      near: { horizontal: 0, vertical: 0, type: 'ortho' },
    },
    accommodation: { amplitudeD: { OD: 17, OS: 13 } },
  }),
  essentialTests: ['visual-acuity', 'retinoscopy', 'cover-test'],
  helpfulTests: ['pinhole', 'ophthalmoscopy', 'pupils', 'keratometry'],
  diagnosis: 'amblyopia',
  differentials: ['anisometropia', 'accommodative-esotropia', 'cataract', 'hyperopia'],
  urgency: 'routine',
  management:
    'Prescribe the full cycloplegic correction (OD +0.50 DS, OS +3.50 −1.00 × 180) for full-time wear and let glasses alone work first: many children gain two or more lines over about 15 weeks. Recheck every 6–8 weeks; if acuity plateaus, add part-time patching of the right eye (2 hours a day for moderate amblyopia) or atropine penalisation. Treatment works best the younger she is, so start now.',
  teachingPoints: [
    'Amblyopia is a diagnosis of exclusion: normal red reflex, pupils (no RAPD) and fundus are required before you call it.',
    'Unlike pure anisometropia, best-corrected acuity in the amblyopic eye does not reach 20/20 on the day you put the lenses in front of it, and pinhole does not help.',
    'Hyperopic anisometropia of +1.50 D or more is amblyogenic because the child focuses for the better eye, leaving the other permanently blurred.',
    'Orthophoria on cover test separates this from strabismic amblyopia; there is no visible clue, which is why screening matters.',
    'Glasses first, then patching or atropine; about a quarter of children regress after stopping, so taper and monitor.',
  ],
  redFlags: [
    'Leukocoria or an asymmetric red reflex, an RAPD, or an abnormal disc/macula mean this is not simple amblyopia: urgent work-up (e.g. retinoblastoma, cataract).',
  ],
  sources: [
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC4549157',
    'https://www.aafp.org/pubs/afp/issues/2013/0301/p348.html',
  ],
};

export default amblyopiaSchoolScreening;
