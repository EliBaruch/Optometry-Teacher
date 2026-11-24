import { buildFindings, type ClinicalCase } from '@core';

/** Dramatic-looking, harmless — unless there was trauma. Check the blood pressure. */
const schCase: ClinicalCase = {
  id: 'ant-sch-allotment',
  difficulty: 1,
  tags: ['red-eye', 'painless', 'anticoagulant', 'reassurance'],
  patient: {
    name: 'Hal Brennan',
    age: 71,
    sex: 'M',
    occupation: 'Retired postman and allotment champion',
    personality: 'Brought you a courgette. Mostly worried about his wife’s scream.',
    avatar: {
      skin: 0, hair: 'bald', hairColor: '#c9c4bd', irisColor: '#6a8caf',
      glasses: 'round', facialHair: 'moustache', outfit: '#6b4f3a',
    },
  },
  chiefComplaint:
    "My wife screamed when she saw me at breakfast. The white of my left eye is red as a tomato! Doesn't hurt a bit and I can see perfectly.",
  triageNote: 'Tech note: blood pressure at check-in 152/88 mmHg.',
  history: [
    { id: 'trauma', category: 'onset', q: 'Any knock, poke or injury to the eye?', a: 'No knocks, no gardening accidents. I just woke up like this.', relevance: 'key' },
    { id: 'symptoms', category: 'symptoms', q: 'Any pain, discharge or blurred vision?', a: 'None at all. Only knew because of the mirror and the scream.', relevance: 'key' },
    { id: 'valsalva', category: 'medical', q: 'Any coughing, straining or heavy lifting lately?', a: 'Chest cold this week — coughing like an old tractor all night.', relevance: 'key' },
    { id: 'anticoag', category: 'medications', q: 'Do you take blood thinners?', a: 'Apixaban, for my heart rhythm. Plus my blood pressure tablet.', relevance: 'key' },
    { id: 'bp', category: 'medical', q: 'When was your blood pressure last checked?', a: 'Spring, I think. They said it was “fine-ish”.', relevance: 'key' },
    { id: 'recurrent', category: 'ocular-history', q: 'Has this happened before?', a: 'First time ever.', relevance: 'helpful' },
    { id: 'bleeding', category: 'medical', q: 'Easy bruising, nosebleeds or bleeding gums?', a: 'I bruise like a peach, but that’s the apixaban.', relevance: 'helpful' },
    { id: 'fhx', category: 'family', q: 'Any glaucoma in the family?', a: 'No idea. We didn’t do doctors much.', relevance: 'red-herring' },
  ],
  findings: buildFindings(71, {
    va: {
      OD: { uncorrected: 0.2, bestCorrected: 0.0, pinhole: 0.0 },
      OS: { uncorrected: 0.2, bestCorrected: 0.0, pinhole: 0.0 },
    },
    refraction: {
      OD: { sphere: 1.0, cylinder: -0.5, axis: 90 },
      OS: { sphere: 1.0, cylinder: -0.5, axis: 85 },
    },
    anterior: { OS: { conjunctiva: ['subconjunctival-hemorrhage'] } },
    external: { redEye: ['OS'] },
  }),
  essentialTests: ['slit-lamp', 'visual-acuity'],
  helpfulTests: ['pupils', 'tonometry', 'fluorescein'],
  diagnosis: 'subconjunctival-hemorrhage',
  differentials: ['bacterial-conjunctivitis', 'episcleritis', 'anterior-uveitis', 'viral-conjunctivitis'],
  urgency: 'routine',
  management:
    'Reassure: it will fade over 2–3 weeks, changing colour like a bruise, and needs no drops beyond lubricants for comfort. Do not stop the apixaban. His blood pressure is mildly raised, so ask his GP to recheck it (send same day if it were 180/110 or higher with symptoms); recurrent bleeds would warrant a check of clotting and medication.',
  teachingPoints: [
    'Flat, sharply demarcated blood under the conjunctiva, with normal vision, no pain and no discharge, is a subconjunctival haemorrhage.',
    'Common triggers: coughing, straining, anticoagulants and high blood pressure — always measure the blood pressure.',
    'There is no inflammation: no ciliary flush, no cells, a normal pupil and a clear cornea separate it from uveitis and keratitis.',
    'After trauma, a 360° bullous haemorrhage with low pressure or a peaked pupil is an open globe until proven otherwise.',
  ],
  redFlags: [
    'Trauma with 360° bullous haemorrhage, reduced vision, low pressure or a peaked pupil — shield and send to the emergency department.',
    'Recurrent bleeds — check blood pressure, clotting and medication (INR if on warfarin).',
  ],
  sources: [
    'https://www.ncbi.nlm.nih.gov/books/NBK551666/',
    'https://www.merckmanuals.com/professional/eye-disorders/conjunctival-and-scleral-disorders/subconjunctival-hemorrhages',
  ],
};

export default schCase;
