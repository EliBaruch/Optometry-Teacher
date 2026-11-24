import { buildFindings, type ClinicalCase } from '@core';

/** Bitemporal hemianopia from chiasmal compression by a pituitary macroadenoma. */
const pituitaryWingMirrors: ClinicalCase = {
  id: 'pituitary-adenoma-wing-mirrors',
  difficulty: 4,
  tags: ['visual-field', 'neuro', 'chiasm', 'gradual-loss', 'driving'],
  patient: {
    name: 'Tomasz Nowak',
    age: 48,
    sex: 'M',
    occupation: 'Construction site foreman',
    personality: 'Big, gentle, blames himself for "getting clumsy"; carries a tape measure everywhere.',
    avatar: {
      skin: 0,
      hair: 'buzz',
      hairColor: '#8a7560',
      irisColor: '#7a8fa6',
      glasses: 'none',
      facialHair: 'stubble',
      headwear: 'hard-hat',
      accessory: 'none',
      outfit: '#f97316',
    },
  },
  chiefComplaint:
    "I keep bumping shoulders with people in doorways, and I've clipped both wing mirrors on the van this year. People just appear out of nowhere at the sides. My wife says I'm getting clumsy. My reading glasses from the chemist don't seem to help either.",
  history: [
    { id: 'onset', category: 'onset', q: 'How long has this been going on? Was it sudden or gradual?', a: 'Creeping up over maybe a year. No single day where it changed.', relevance: 'key' },
    { id: 'sides', category: 'symptoms', q: 'Which side do things appear from, and is it worse with one eye?', a: 'Both sides, honestly. Left and right. I never thought to test each eye.', relevance: 'key' },
    { id: 'headache', category: 'symptoms', q: 'Any headaches?', a: 'A dull ache behind the forehead most days for months. I put it down to the noise on site.', relevance: 'helpful' },
    { id: 'hormonal', category: 'medical', q: 'Any change in energy, libido, shoe or ring size, thirst, or nipple discharge?', a: 'Tired all the time, and... the bedroom side of things has gone quiet. I thought that was just being 48.', relevance: 'key' },
    { id: 'apoplexy', category: 'symptoms', q: 'Any sudden severe headache, double vision or drowsiness?', a: 'No, nothing sudden. No double vision.', relevance: 'key' },
    { id: 'glaucoma-fh', category: 'family', q: 'Any family history of glaucoma?', a: 'My dad had glaucoma drops in his seventies.', relevance: 'red-herring' },
    { id: 'meds', category: 'medications', q: 'Do you take any medicines?', a: 'Just ibuprofen for my back and the headaches.', relevance: 'neutral' },
    { id: 'diabetes', category: 'medical', q: 'Any diabetes or blood pressure problems?', a: 'Not that I know of. Haven\'t seen a doctor in years, to be honest.', relevance: 'neutral' },
  ],
  findings: buildFindings(48, {
    va: {
      OD: { uncorrected: 0.1, bestCorrected: 0.1, pinhole: 0.1, nearUncorrected: 0.5 },
      OS: { uncorrected: 0.1, bestCorrected: 0.1, pinhole: 0.1, nearUncorrected: 0.5 },
    },
    refraction: {
      OD: { sphere: 0, cylinder: -0.25, axis: 90, add: 1.5 },
      OS: { sphere: 0.25, cylinder: 0, axis: 180, add: 1.5 },
    },
    posterior: {
      OD: { disc: { cdr: 0.3, color: 'pale-sectoral', margins: 'sharp', rimThinning: 'none' } },
      OS: { disc: { cdr: 0.3, color: 'pale-sectoral', margins: 'sharp', rimThinning: 'none' } },
    },
    fields: { OD: 'temporal-hemianopia', OS: 'temporal-hemianopia' },
    iop: { OD: 16, OS: 16 },
  }),
  essentialTests: ['visual-fields'],
  helpfulTests: ['visual-acuity', 'pupils', 'ophthalmoscopy', 'color-vision', 'tonometry'],
  diagnosis: 'pituitary-adenoma',
  differentials: ['poag', 'homonymous-hemianopia', 'normal-tension-glaucoma', 'optic-neuritis'],
  urgency: 'soon',
  management:
    'Refer within days to neuro-ophthalmology/neurosurgery via the GP or hospital pathway for MRI of the pituitary with contrast and a pituitary hormone panel (prolactin, cortisol, thyroid, sex hormones). He should stop driving until fields are reassessed. Treatment is surgical (transsphenoidal) for most non-functioning macroadenomas or dopamine agonists for a prolactinoma; fields often improve after decompression.',
  teachingPoints: [
    'Bitemporal hemianopia respects the vertical midline in both eyes: the lesion is at the chiasm, where crossing nasal fibres serve the temporal fields. Homonymous defects (same side in both eyes) mean a lesion behind the chiasm.',
    'Glaucoma field loss respects the HORIZONTAL midline (arcuate, nasal step) and comes with cupping; this patient has normal cups and normal IOP.',
    'Quick bedside chiasm sign: hold a red cap either side of the vertical midline. It looks duller or washed out in the temporal half of each eye\'s field, often before a full field defect shows.',
    'Long-standing chiasmal compression gives "band" or bow-tie pallor of the nasal and temporal disc.',
    'Ask hormonal questions: fatigue, low libido, galactorrhoea or acromegalic change point to the pituitary.',
  ],
  redFlags: [
    'Sudden severe headache with ophthalmoplegia, falling vision or drowsiness = pituitary apoplexy, a neurosurgical emergency.',
  ],
  sources: [
    'https://eyewiki.aao.org/Pituitary_Adenoma',
    'https://www.ncbi.nlm.nih.gov/books/NBK545213/',
  ],
};

export default pituitaryWingMirrors;
