import { buildFindings, type ClinicalCase } from '@core';

/** Non-ischaemic CRVO in an untreated ocular hypertensive with systemic hypertension. */
const crvoLibrarian: ClinicalCase = {
  id: 'crvo-librarian',
  difficulty: 3,
  tags: ['sudden-vision-loss', 'painless', 'vascular', 'glaucoma-risk', 'elderly'],
  patient: {
    name: 'Ruth Goldberg',
    age: 69,
    sex: 'F',
    occupation: 'Retired reference librarian',
    personality: 'Brings a printed list of questions with footnotes; dry wit; reads three books a week.',
    avatar: {
      skin: 1, hair: 'curly', hairColor: '#b8b2ac', irisColor: '#6b4a2e',
      glasses: 'square', facialHair: 'none', headwear: 'none', accessory: 'necklace', outfit: '#3f5a7a',
    },
  },
  chiefComplaint:
    "I woke up yesterday and my right eye was like reading through smoke. Not painful, not red — just foggy, and it hasn't cleared. I've checked: it is not my glasses, I cleaned them four times.",
  history: [
    { id: 'onset', category: 'onset', q: 'When did you notice it, and was it sudden?', a: 'On waking, yesterday. It was fine when I went to bed. One eye only — the right.', relevance: 'key' },
    { id: 'pain', category: 'symptoms', q: 'Any pain, redness, haloes or headache?', a: 'None at all. That almost worries me more.', relevance: 'key' },
    { id: 'pressure', category: 'ocular-history', q: 'Have you ever been told your eye pressure was high? Any drops?', a: 'Yes — "pressure on the high side" three years ago. I had drops, then the bottle ran out and I… didn\'t replace it.', relevance: 'key' },
    { id: 'bp', category: 'medical', q: 'Do you have high blood pressure, diabetes or cholesterol problems?', a: 'Blood pressure for fifteen years. Cholesterol borderline. No diabetes.', relevance: 'key' },
    { id: 'gca', category: 'symptoms', q: 'Any new headache, scalp tenderness or jaw ache when chewing?', a: 'No. I can chew my bagel perfectly well, thank you.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'What medicines do you take?', a: 'Amlodipine, a statin, and vitamin D. I stopped the eye drops, as I admitted.', relevance: 'helpful' },
    { id: 'clots', category: 'medical', q: 'Any history of blood clots or blood disorders?', a: 'Never. My sister had a DVT after a long flight, if that counts.', relevance: 'neutral' },
    { id: 'reading', category: 'social', q: 'Have you been reading more than usual lately?', a: 'I always read too much. This is not eye strain, I promise you.', relevance: 'red-herring' },
  ],
  findings: buildFindings(69, {
    va: {
      OD: { uncorrected: 1.0, bestCorrected: 0.6, pinhole: 0.6, nearUncorrected: 0.8 },
      OS: { uncorrected: 0.6, bestCorrected: 0.0, pinhole: 0.1, nearUncorrected: 0.4 },
    },
    refraction: {
      OD: { sphere: -1.0, cylinder: -0.75, axis: 15, add: 2.5 },
      OS: { sphere: -1.25, cylinder: -0.5, axis: 165, add: 2.5 },
    },
    iop: { OD: 27, OS: 25 },
    amsler: { OD: { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 4 } },
    posterior: {
      OD: {
        disc: { cdr: 0.5, color: 'hyperemic', margins: 'blurred', edema: true, svp: false },
        vessels: { avRatio: 0.45, tortuosity: 'increased', venousDilation: true },
        lesions: [
          { type: 'flame-hemorrhage', zone: 'diffuse', density: 5 },
          { type: 'dot-blot-hemorrhage', zone: 'diffuse', density: 4 },
          { type: 'cotton-wool-spot', zone: 'superotemporal', density: 2 },
          { type: 'macular-edema', zone: 'macula', density: 3 },
        ],
      },
      OS: {
        disc: { cdr: 0.5 },
        vessels: { avRatio: 0.55 },
      },
    },
  }),
  essentialTests: ['ophthalmoscopy', 'visual-acuity'],
  helpfulTests: ['pupils', 'tonometry', 'slit-lamp', 'amsler', 'pinhole'],
  diagnosis: 'crvo',
  differentials: ['brvo', 'hypertensive-retinopathy', 'npdr', 'crao'],
  urgency: 'soon',
  management:
    'Central retinal vein occlusion, right eye, likely non-ischaemic (20/80, no RAPD): four-quadrant haemorrhages, dilated tortuous veins, mild disc swelling and macular oedema. Refer to retina within days for OCT and anti-VEGF for the macular oedema; restart IOP-lowering treatment (both eyes are raised) and send a letter to her GP for blood pressure and lipids. Monitor for iris and angle neovascularisation monthly for the first few months — escalate same day if it appears.',
  teachingPoints: [
    'Haemorrhages in all four quadrants with dilated, tortuous veins = CRVO ("blood and thunder"). Sectoral haemorrhages respecting the horizontal raphe = BRVO.',
    'Raised IOP and glaucoma are major risk factors for CRVO — measure both eyes and treat.',
    'No RAPD and acuity better than 20/200 suggest non-ischaemic CRVO, but a third can convert: follow closely.',
    'Neovascular glaucoma (the "90-day glaucoma") is the dreaded complication: look at the iris and the angle at every visit.',
    'CRAO is a pale, bloodless retina; hypertensive retinopathy is bilateral.',
  ],
  redFlags: ['Iris or angle neovascularisation', 'RAPD (ischaemic conversion)', 'Raised IOP'],
  sources: [
    'https://eyewiki.aao.org/Central_Retinal_Vein_Occlusion',
    'https://aao.org/eyenet/article/diagnosis-of-central-retinal-vein-occlusion',
    'https://www.ncbi.nlm.nih.gov/sites/books/NBK525985/',
  ],
};

export default crvoLibrarian;
