import { buildFindings, type ClinicalCase } from '@core';

/** Acute primary angle-closure crisis after a dark cinema and an anticholinergic cold remedy. */
const angleClosureCase: ClinicalCase = {
  id: 'ant-angle-closure-cinema',
  difficulty: 4,
  tags: ['red-eye', 'painful', 'sudden-vision-loss', 'glaucoma', 'sight-threatening', 'emergency'],
  patient: {
    name: 'Mei-Ling Chen',
    age: 66,
    sex: 'F',
    occupation: 'Retired piano teacher',
    personality: 'Composed and polite even while clearly in agony.',
    avatar: {
      skin: 1, hair: 'bun', hairColor: '#4a4a4a', irisColor: '#2a1c14',
      glasses: 'round', accessory: 'earrings', outfit: '#9b2335',
    },
  },
  chiefComplaint:
    "It started at the cinema last night — my right eye began pounding and every exit sign had a rainbow ring around it. Now my whole head is splitting and I've been sick twice. I thought it was a migraine, but I don't get migraines.",
  triageNote: 'Front desk: pale and vomiting in the waiting room; right eye very red. Please see next.',
  history: [
    { id: 'onset', category: 'onset', q: 'When and where did it start?', a: 'In the dark cinema, around nine last night. More than twelve hours now.', relevance: 'key' },
    { id: 'halos', category: 'symptoms', q: 'Any coloured halos around lights, or misty vision?', a: 'Rainbow rings around every light, and the eye is all misty.', relevance: 'key' },
    { id: 'nausea', category: 'symptoms', q: 'Headache, nausea or vomiting?', a: 'Sick twice. The headache sits over my right eyebrow like a hammer.', relevance: 'key' },
    { id: 'prior', category: 'ocular-history', q: 'Have you had shorter episodes like this before?', a: 'A few evenings this year — blurry with halos — but it went away after I slept.', relevance: 'key' },
    { id: 'meds', category: 'medications', q: 'Any new medicines — cold remedies, antihistamines, anything for the bladder or mood?', a: 'My grandson gave me a night-time cold-and-flu tablet before the film.', relevance: 'key' },
    { id: 'hyperope', category: 'ocular-history', q: 'Are you long-sighted?', a: 'Very! Thick glasses for distance and reading since I was forty.', relevance: 'helpful' },
    { id: 'topiramate', category: 'medications', q: 'Do you take topiramate or any sulfa-type medicine?', a: 'No, nothing like that.', relevance: 'helpful' },
    { id: 'fhx', category: 'family', q: 'Any glaucoma in the family?', a: 'My older sister had laser on both eyes in Taipei.', relevance: 'helpful' },
    { id: 'sinus', category: 'medical', q: 'Any sinus trouble?', a: 'A bit of a cold, hence the tablet.', relevance: 'red-herring' },
  ],
  findings: buildFindings(66, {
    va: {
      OD: { uncorrected: 1.1, bestCorrected: 1.0, pinhole: 1.0 },
      OS: { uncorrected: 0.6, bestCorrected: 0.0, pinhole: 0.2 },
    },
    refraction: {
      OD: { sphere: 2.75, cylinder: -0.5, axis: 90 },
      OS: { sphere: 2.75, cylinder: -0.5, axis: 90 },
    },
    pupils: {
      sizeLightMm: { OD: 5.5, OS: 2.5 },
      sizeDarkMm: { OD: 5.5, OS: 4.5 },
      reactivity: { OD: 'fixed', OS: 'brisk' },
      shape: { OD: 'mid-dilated', OS: 'round' },
    },
    anterior: {
      OD: {
        conjunctiva: ['diffuse-injection', 'ciliary-flush'],
        cornea: ['edema'],
        anteriorChamber: { depth: 'shallow', vanHerick: 1, cells: 0.5, flare: 1 },
        lensGrade: 2,
      },
      OS: {
        anteriorChamber: { depth: 'shallow', vanHerick: 1 },
        lensGrade: 2,
      },
    },
    redReflex: { OD: 'dull' },
    iop: { OD: 56, OS: 18 },
    external: { redEye: ['OD'], tearing: ['OD'], photophobia: true },
  }),
  essentialTests: ['tonometry', 'slit-lamp', 'pupils'],
  helpfulTests: ['visual-acuity', 'ophthalmoscopy'],
  diagnosis: 'acute-angle-closure',
  differentials: ['anterior-uveitis', 'giant-cell-arteritis', 'microbial-keratitis', 'bacterial-conjunctivitis'],
  urgency: 'emergency',
  management:
    'Emergency: same-hour transfer to ophthalmology or eye casualty — do not dilate. While transfer is arranged, start pressure-lowering treatment if within your scope: topical timolol, an alpha-agonist and a carbonic anhydrase inhibitor, oral acetazolamide 500 mg (if no contraindication), and pilocarpine 1–2% once the pressure begins to fall. Definitive care is laser peripheral iridotomy in this eye and prophylactic iridotomy in the fellow eye, which is also van Herick grade 1.',
  teachingPoints: [
    'Red painful eye + coloured halos + nausea/vomiting + mid-dilated fixed pupil + hazy cornea + pressure in the 50s = acute angle closure.',
    'Always check the other eye: a shallow chamber with van Herick grade 1 confirms the anatomy and the risk.',
    'Dim light and anticholinergic or sympathomimetic medicines (cold remedies, antihistamines) dilate the pupil and trigger attacks in short, hyperopic eyes.',
    'Uveitis gives a small pupil and normal or low pressure; angle closure gives a mid-dilated pupil and very high pressure.',
    'Nausea and headache make this a classic emergency-department misdiagnosis (migraine, gastroenteritis) — measure the pressure.',
  ],
  redFlags: [
    'Pressure above 40 mmHg with corneal oedema and a fixed mid-dilated pupil.',
    'Previous self-resolving evening episodes of halos (intermittent closure).',
    'Bilateral closure with a myopic shift after starting topiramate — a different mechanism; pilocarpine and iridotomy do not help.',
  ],
  emergency: { timeLimitSec: 120 },
  sources: [
    'https://wikem.org/wiki/Acute_angle-closure_glaucoma',
    'https://eyewiki.aao.org/Primary_vs._Secondary_Angle_Closure_Glaucoma',
    'https://www.msdmanuals.com/professional/eye-disorders/glaucoma/angle-closure-glaucoma',
  ],
};

export default angleClosureCase;
