import { buildFindings, type ClinicalCase } from '@core';

/** Moderate NPDR found at a licence-renewal exam: asymptomatic, 20/20, and still sick. */
const npdrModerate: ClinicalCase = {
  id: 'npdr-moderate',
  difficulty: 2,
  tags: ['diabetes', 'screening', 'asymptomatic', 'fundus'],
  patient: {
    name: 'Deshawn Carter',
    age: 52,
    sex: 'M',
    occupation: 'Long-haul truck driver',
    personality: 'Easy laugh, a thermos of sweet tea, and a firm belief that eyes are fine if they can read road signs.',
    avatar: {
      skin: 5, hair: 'buzz', hairColor: '#1c1a1a', irisColor: '#3b2414',
      glasses: 'none', facialHair: 'beard', headwear: 'cap', accessory: 'none', outfit: '#25406b',
    },
  },
  chiefComplaint:
    "Nothing's wrong, Doc — I need the form signed for my commercial licence. I can read a mile marker before my co-driver can. Small print's getting short-armed, that's all.",
  triageNote: 'Licence renewal. Type 2 diabetes on file. Last dilated eye exam: "can\'t remember".',
  history: [
    { id: 'dm-duration', category: 'medical', q: 'Do you have diabetes? How long, and how well controlled?', a: "Type 2, nine years now. Last A1c was 8.9 — the nurse wasn't thrilled. Truck-stop dinners don't help.", relevance: 'key' },
    { id: 'last-dilated', category: 'ocular-history', q: 'When did you last have a dilated eye exam?', a: "Dilated? Like the drops? Never had those. Just the licence chart every couple of years.", relevance: 'key' },
    { id: 'vision-change', category: 'symptoms', q: 'Any blur, distortion, dark spots or floaters?', a: "Not in the distance. Reading my logbook I hold it out further than I used to.", relevance: 'helpful' },
    { id: 'bp-lipids', category: 'medical', q: 'Blood pressure or cholesterol problems? Kidneys?', a: "Pressure's borderline, they've got me on lisinopril. Cholesterol pill too. Kidneys fine as far as I know.", relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'What medicines do you take?', a: "Metformin twice a day, lisinopril, atorvastatin. They talked about insulin if my numbers don't come down.", relevance: 'helpful' },
    { id: 'family', category: 'family', q: 'Any eye disease in the family?', a: "My mother had diabetes too. She had laser on her eyes in her sixties.", relevance: 'neutral' },
    { id: 'driving-hours', category: 'social', q: 'How many hours a day do you spend driving?', a: "Ten, eleven hours. Night runs mostly. Headlights don't bother me.", relevance: 'red-herring' },
    { id: 'smoking', category: 'social', q: 'Do you smoke?', a: "Quit six years ago. Chew sunflower seeds instead — the cab's full of shells.", relevance: 'neutral' },
  ],
  findings: buildFindings(52, {
    va: {
      OD: { uncorrected: 0.0, bestCorrected: 0.0, pinhole: 0.0, nearUncorrected: 0.5 },
      OS: { uncorrected: 0.0, bestCorrected: 0.0, pinhole: 0.0, nearUncorrected: 0.5 },
    },
    refraction: {
      OD: { sphere: 0.25, cylinder: -0.25, axis: 90, add: 2.0 },
      OS: { sphere: 0.25, cylinder: 0, axis: 180, add: 2.0 },
    },
    posterior: {
      OD: {
        fundusTone: 'dark',
        vessels: { avRatio: 0.6 },
        lesions: [
          { type: 'microaneurysm', zone: 'superotemporal', density: 3 },
          { type: 'microaneurysm', zone: 'inferotemporal', density: 2 },
          { type: 'dot-blot-hemorrhage', zone: 'inferotemporal', density: 3 },
          { type: 'dot-blot-hemorrhage', zone: 'superotemporal', density: 2 },
          { type: 'hard-exudate', zone: 'inferotemporal', density: 2 },
        ],
      },
      OS: {
        fundusTone: 'dark',
        vessels: { avRatio: 0.6 },
        lesions: [
          { type: 'microaneurysm', zone: 'superotemporal', density: 2 },
          { type: 'microaneurysm', zone: 'superonasal', density: 2 },
          { type: 'dot-blot-hemorrhage', zone: 'superotemporal', density: 3 },
          { type: 'hard-exudate', zone: 'superotemporal', density: 1 },
          { type: 'cotton-wool-spot', zone: 'superonasal', density: 1 },
        ],
      },
    },
  }),
  essentialTests: ['ophthalmoscopy'],
  helpfulTests: ['visual-acuity', 'amsler', 'slit-lamp', 'tonometry', 'phoropter'],
  diagnosis: 'npdr',
  differentials: ['pdr', 'diabetic-macular-edema', 'hypertensive-retinopathy', 'brvo'],
  urgency: 'routine',
  management:
    'Moderate non-proliferative diabetic retinopathy in both eyes, no macular oedema and no neovascularisation. Write to his GP/endocrinologist: tighter control of glucose, blood pressure and lipids slows progression. Re-examine dilated in about 6 months (6–12 months per AAO), prescribe readers, and give clear return-now advice for sudden floaters or blur. Fundus photography documents the baseline.',
  teachingPoints: [
    '20/20 does not mean a healthy retina: diabetic retinopathy is silent until the macula or vitreous gets involved — dilate every diabetic, every year at minimum.',
    'Moderate NPDR = more than microaneurysms alone, but short of the 4-2-1 rule (haemorrhages in 4 quadrants, venous beading in 2, or IRMA in 1 = severe).',
    'Exudates away from the fovea are not macular oedema; centre-involving thickening (OCT) is what changes the plan.',
    'No new vessels on the disc or elsewhere = not proliferative. Look at the disc, the arcades and the iris before you sign the form.',
    'Hypertensive retinopathy gives flame haemorrhages and AV nicking; the diabetic signature is microaneurysms + dot-blot haemorrhages.',
  ],
  redFlags: ['New vessels at the disc or elsewhere', 'Venous beading or IRMA (severe NPDR)', 'Centre-involving macular oedema', 'Sudden shower of floaters (vitreous haemorrhage)'],
  sources: [
    'https://eyewiki.aao.org/Diabetic_Retinopathy',
    'https://aao.org/Assets/dba38b76-3095-4360-8cb6-00adab3aad68/635919125497230000/diabetic-retinopathy-ppp-pdf',
    'https://eyewiki.aao.org/Diabetic_Retinopathy_Screening',
  ],
};

export default npdrModerate;
