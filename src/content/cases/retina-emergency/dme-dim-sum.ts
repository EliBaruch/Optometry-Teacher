import { buildFindings, type ClinicalCase } from '@core';

/** Centre-involving diabetic macular oedema masquerading as "I need new readers". */
const dmeDimSum: ClinicalCase = {
  id: 'dme-dim-sum',
  difficulty: 3,
  tags: ['diabetes', 'blurred-vision', 'reading', 'macula'],
  patient: {
    name: 'Wei Zhang',
    age: 64,
    sex: 'M',
    occupation: 'Dim sum restaurant owner',
    personality: 'Up at 4 a.m. folding dumplings; measures his life in perfect pleats.',
    avatar: {
      skin: 2, hair: 'short', hairColor: '#8a8a8a', irisColor: '#2b1a10',
      glasses: 'half-rim', facialHair: 'none', headwear: 'none', accessory: 'none', outfit: '#e9e4da',
    },
  },
  chiefComplaint:
    "My right eye has gone smudgy in the middle. I count pleats on every dumpling — eighteen — and now the pleats run together. I bought stronger readers at the pharmacy. They didn't help one bit.",
  history: [
    { id: 'onset', category: 'onset', q: 'How long, and did it come on suddenly or gradually?', a: 'Slowly, over two or three months. Not overnight. Some mornings worse than others.', relevance: 'key' },
    { id: 'laterality', category: 'symptoms', q: 'Is it one eye or both?', a: 'Mostly the right. I closed my left eye to check — the right is the problem.', relevance: 'key' },
    { id: 'distortion', category: 'symptoms', q: 'Do straight lines look bent or wavy?', a: 'The tiles behind my steamers look a little… swollen in the middle. Not bent, just puffy.', relevance: 'key' },
    { id: 'dm', category: 'medical', q: 'Do you have diabetes? How is your control?', a: 'Fifteen years. Last A1c 9.1. My daughter says I eat too many custard tarts. She is right.', relevance: 'key' },
    { id: 'bp', category: 'medical', q: 'Blood pressure, cholesterol or kidney issues?', a: 'Blood pressure tablets, yes, amlodipine. Cholesterol tablet also.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Any diabetes tablets like pioglitazone, or recent new medicines?', a: 'Metformin and gliclazide. Nothing new.', relevance: 'helpful' },
    { id: 'last-exam', category: 'ocular-history', q: 'Have you had a dilated eye exam before?', a: 'Five years ago in Guangzhou. They said "a little diabetes in the eye". I forgot until now.', relevance: 'helpful' },
    { id: 'flashes', category: 'symptoms', q: 'Any flashes, floaters or a curtain?', a: 'No flashes. No curtain.', relevance: 'neutral' },
    { id: 'steam', category: 'social', q: 'Could the kitchen steam be irritating your eyes?', a: 'Forty years of steam! My eyes are made of bamboo by now.', relevance: 'red-herring' },
  ],
  findings: buildFindings(64, {
    va: {
      OD: { uncorrected: 0.6, bestCorrected: 0.5, pinhole: 0.5, nearUncorrected: 0.9 },
      OS: { uncorrected: 0.2, bestCorrected: 0.1, pinhole: 0.1, nearUncorrected: 0.6 },
    },
    refraction: {
      OD: { sphere: 1.0, cylinder: -0.5, axis: 95, add: 2.5 },
      OS: { sphere: 0.5, cylinder: -0.5, axis: 85, add: 2.5 },
    },
    amsler: { OD: { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 3 } },
    posterior: {
      OD: {
        vessels: { avRatio: 0.55 },
        lesions: [
          { type: 'macular-edema', zone: 'macula', density: 3 },
          { type: 'hard-exudate', zone: 'macula', density: 4 },
          { type: 'microaneurysm', zone: 'macula', density: 3 },
          { type: 'dot-blot-hemorrhage', zone: 'superotemporal', density: 3 },
          { type: 'dot-blot-hemorrhage', zone: 'inferotemporal', density: 2 },
        ],
      },
      OS: {
        vessels: { avRatio: 0.55 },
        lesions: [
          { type: 'microaneurysm', zone: 'superotemporal', density: 2 },
          { type: 'dot-blot-hemorrhage', zone: 'inferotemporal', density: 2 },
          { type: 'hard-exudate', zone: 'inferotemporal', density: 1 },
        ],
      },
    },
  }),
  essentialTests: ['visual-acuity', 'ophthalmoscopy'],
  helpfulTests: ['pinhole', 'amsler', 'phoropter', 'slit-lamp', 'tonometry'],
  diagnosis: 'diabetic-macular-edema',
  differentials: ['npdr', 'cataract', 'wet-amd', 'brvo'],
  urgency: 'soon',
  management:
    'Centre-involving diabetic macular oedema in the right eye (circinate exudates and thickening at the fovea, 20/63 not improving with pinhole), on a background of moderate NPDR in both eyes. Refer to a retina service within a couple of weeks for OCT and intravitreal anti-VEGF; letter to his GP for glucose, blood pressure and lipid control. Do not just change the reading glasses.',
  teachingPoints: [
    'A pinhole that does not improve vision says "not refractive": think macula, media or nerve.',
    'Hard exudates in a ring (circinate) around leaking microaneurysms near the fovea are the classic sign of diabetic macular oedema; confirm thickening on OCT.',
    'Macular oedema can cause a small hyperopic shift as the retina is pushed forward — a changing Rx in a diabetic is a reason to dilate.',
    'Wet AMD presents with sudden distortion and subretinal blood in someone without a diabetic background of microaneurysms in both eyes.',
    'Early nuclear sclerosis is present but mild — it does not explain 20/63 in one eye only.',
  ],
  redFlags: ['Centre-involving oedema with reduced acuity', 'New vessels on disc or elsewhere'],
  sources: [
    'https://eyewiki.aao.org/Diabetic_Retinopathy',
    'https://aao.org/Assets/dba38b76-3095-4360-8cb6-00adab3aad68/635919125497230000/diabetic-retinopathy-ppp-pdf',
    'https://www.ccjm.org/content/91/8/503',
  ],
};

export default dmeDimSum;
