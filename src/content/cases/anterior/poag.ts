import { buildFindings, type ClinicalCase } from '@core';

/** Asymptomatic, asymmetric primary open-angle glaucoma found at a "reading glasses" visit. */
const poagCase: ClinicalCase = {
  id: 'ant-poag-night-bus',
  difficulty: 5,
  tags: ['glaucoma', 'asymptomatic', 'screening', 'family-history', 'optic-nerve'],
  patient: {
    name: 'Winston Clarke',
    age: 61,
    sex: 'M',
    occupation: 'Night-bus driver',
    personality: 'Thirty-one years without a single complaint — including about his eyes.',
    avatar: {
      skin: 4, hair: 'buzz', hairColor: '#5a5450', irisColor: '#2d1d12',
      glasses: 'half-rim', facialHair: 'beard', outfit: '#1e3a5f',
    },
  },
  chiefComplaint:
    "Nothing's wrong with my eyes, doc. Just need stronger readers — the timetable print keeps shrinking. My wife made me book because my brother's on eye drops.",
  triageNote: 'Tech note: central corneal thickness 528 µm OD / 531 µm OS.',
  history: [
    { id: 'fhx', category: 'family', q: 'Is there glaucoma in the family?', a: 'My older brother puts drops in every night for "pressure". Our mother went blind late in life — nobody ever told us why.', relevance: 'key' },
    { id: 'symptoms', category: 'symptoms', q: 'Have you noticed any problem with your vision?', a: 'Only the small print. Driving is fine.', relevance: 'key' },
    { id: 'steroids', category: 'medications', q: 'Any steroids — inhalers, creams, tablets or eye drops?', a: 'No, none.', relevance: 'key' },
    { id: 'aac', category: 'symptoms', q: 'Any eye pain, halos or headaches?', a: 'None at all.', relevance: 'helpful' },
    { id: 'trauma', category: 'ocular-history', q: 'Any injury to either eye?', a: 'Never.', relevance: 'helpful' },
    { id: 'systemic', category: 'medical', q: 'Blood pressure, diabetes, sleep apnoea?', a: 'Blood pressure tablets. And my wife says I snore like a bus engine.', relevance: 'helpful' },
    { id: 'driving', category: 'social', q: 'Do you drive?', a: 'Professionally — night routes across the city.', relevance: 'helpful' },
    { id: 'ntg', category: 'medical', q: 'Migraines or cold hands and feet?', a: 'No, warm as toast.', relevance: 'neutral' },
    { id: 'vitamins', category: 'medications', q: 'Do you take any vitamins?', a: 'Cod liver oil, like my mother did.', relevance: 'red-herring' },
  ],
  findings: buildFindings(61, {
    va: {
      OD: { uncorrected: 0.1, bestCorrected: 0.0, pinhole: 0.0 },
      OS: { uncorrected: 0.1, bestCorrected: 0.0, pinhole: 0.0 },
    },
    refraction: {
      OD: { sphere: 0.75, cylinder: 0, axis: 180 },
      OS: { sphere: 0.75, cylinder: 0, axis: 180 },
    },
    pupils: { rapd: 'OD', rapdGrade: 1 },
    iop: { OD: 27, OS: 21 },
    posterior: {
      OD: {
        disc: { cdr: 0.8, rimThinning: 'inferior' },
        lesions: [{ type: 'disc-hemorrhage', zone: 'disc', density: 1 }],
        fundusTone: 'dark',
      },
      OS: { disc: { cdr: 0.6, rimThinning: 'none' }, fundusTone: 'dark' },
    },
    fields: { OD: 'superior-arcuate', OS: 'full' },
  }),
  essentialTests: ['ophthalmoscopy', 'tonometry', 'visual-fields'],
  helpfulTests: ['pupils', 'slit-lamp', 'visual-acuity'],
  diagnosis: 'poag',
  differentials: ['ocular-hypertension', 'normal-tension-glaucoma', 'pituitary-adenoma', 'acute-angle-closure', 'presbyopia'],
  urgency: 'routine',
  management:
    'Confirm open angles on gonioscopy and document the nerve with OCT and a repeat 24-2 field. Start a prostaglandin analogue at night (or offer selective laser trabeculoplasty) aiming for at least a 25–30% pressure reduction, or refer to a glaucoma service within weeks if outside your scope. Update his readers, advise screening for his siblings and children, and check he meets professional driving field standards.',
  teachingPoints: [
    'Glaucoma is silent: central vision stays 20/20 until late, so the history is about risk (family, ancestry, age, steroids), not symptoms.',
    'Inferior rim thinning (ISNT rule broken) matches a superior arcuate defect that respects the horizontal midline.',
    'A disc haemorrhage is a marker of progression; asymmetric cupping (0.8 vs 0.6) and an RAPD in the worse eye support true damage.',
    'Ocular hypertension = raised pressure with a healthy nerve and field; normal-tension glaucoma = glaucomatous damage with pressure always ≤21.',
    'A field defect respecting the vertical midline or pallor out of proportion to cupping points to a compressive lesion — image.',
  ],
  redFlags: [
    'Pallor greater than cupping, or a defect respecting the vertical midline (compressive lesion).',
    'Pressure above about 40 mmHg — exclude angle closure or a secondary cause.',
  ],
  sources: [
    'https://www.aoa.org/documents/EBO/GLAUCOMA/FINAL_EBO_Glaucoma_Guildline_digital_10_28_24.pdf',
    'https://pubmed.ncbi.nlm.nih.gov/26581556/',
    'https://reviewofoptometry.com/article/monitor-or-medicate',
  ],
};

export default poagCase;
