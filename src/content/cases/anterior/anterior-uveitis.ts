import { buildFindings, type ClinicalCase } from '@core';

/** Recurrent HLA-B27-pattern acute anterior uveitis in a young man with inflammatory back pain. */
const uveitisCase: ClinicalCase = {
  id: 'ant-uveitis-carpenter',
  difficulty: 4,
  tags: ['red-eye', 'painful', 'photophobia', 'inflammatory', 'systemic'],
  patient: {
    name: 'Daniel Ben-Ami',
    age: 34,
    sex: 'M',
    occupation: 'Carpenter and weekend rock climber',
    personality: 'Stoic to a fault — only came in because he couldn’t look at the sawdust in the sunlight.',
    avatar: {
      skin: 1, hair: 'curly', hairColor: '#3b2a1e', irisColor: '#5b4a2e',
      facialHair: 'beard', headwear: 'kippah', outfit: '#556b2f',
    },
  },
  chiefComplaint:
    "My right eye aches deep inside, like a bruise behind it. It's red around the coloured part, and light is agony — even when you shine it in my left eye, the right one hurts.",
  history: [
    { id: 'onset', category: 'onset', q: 'When did it start — one eye or both?', a: 'Two days ago, right eye only. Getting steadily worse.', relevance: 'key' },
    { id: 'discharge', category: 'symptoms', q: 'Any discharge or stickiness?', a: 'None. It just waters.', relevance: 'key' },
    { id: 'back', category: 'medical', q: 'Any back pain or stiffness?', a: 'My lower back is like concrete every morning — it loosens up once I get moving. Has been for years.', relevance: 'key' },
    { id: 'previous', category: 'ocular-history', q: 'Ever had anything like this before?', a: 'The left eye, three years ago. It settled after a few weeks and I forgot about it.', relevance: 'key' },
    { id: 'aac', category: 'symptoms', q: 'Any halos around lights, nausea or headache?', a: 'No halos, no nausea. Just this ache.', relevance: 'helpful' },
    { id: 'systemic', category: 'medical', q: 'Gut problems, skin rashes, swollen joints or heel pain?', a: 'My heels ache in the morning. Gut’s fine, no rashes.', relevance: 'helpful' },
    { id: 'cl-trauma', category: 'ocular-history', q: 'Contact lenses, an injury, or eye surgery?', a: 'None of those.', relevance: 'helpful' },
    { id: 'fhx', category: 'family', q: 'Any arthritis in the family?', a: 'My dad has a stiff, bent spine — some kind of arthritis.', relevance: 'helpful' },
    { id: 'social', category: 'social', q: 'Do you drink alcohol?', a: 'A glass of wine on Friday nights.', relevance: 'red-herring' },
  ],
  findings: buildFindings(34, {
    va: { OD: { uncorrected: 0.2, bestCorrected: 0.2, pinhole: 0.2 } },
    pupils: {
      sizeLightMm: { OD: 2 },
      sizeDarkMm: { OD: 3.5 },
      reactivity: { OD: 'sluggish' },
      shape: { OD: 'irregular' },
    },
    anterior: {
      OD: {
        conjunctiva: ['ciliary-flush'],
        cornea: ['keratic-precipitates'],
        anteriorChamber: { cells: 2, flare: 1 },
        iris: ['posterior-synechiae'],
      },
    },
    iop: { OD: 11, OS: 15 },
    external: { redEye: ['OD'], tearing: ['OD'], photophobia: true, squinting: true },
  }),
  essentialTests: ['slit-lamp', 'pupils'],
  helpfulTests: ['tonometry', 'fluorescein', 'visual-acuity', 'ophthalmoscopy'],
  diagnosis: 'anterior-uveitis',
  differentials: ['acute-angle-closure', 'microbial-keratitis', 'episcleritis', 'hsv-keratitis', 'viral-conjunctivitis'],
  urgency: 'urgent',
  management:
    'Treat or refer the same day: topical prednisolone acetate 1% (frequently at first, e.g. every 1–2 hours) plus a cycloplegic (cyclopentolate 1% or homatropine) to ease the spasm and break the fresh synechiae, then a slow taper over weeks with pressure checks. Review in about a week and dilate to check the posterior segment. As this is recurrent with inflammatory back pain, arrange HLA-B27 testing and a rheumatology referral for suspected axial spondyloarthritis.',
  teachingPoints: [
    'Ciliary flush, cells and flare (SUN grading in a 1×1 mm beam), and fine keratic precipitates define anterior uveitis.',
    'Pain when light is shone in the other eye (consensual photophobia) points to iris inflammation, not surface disease.',
    'The pupil is small and may be irregular from posterior synechiae; in angle closure it is mid-dilated and fixed.',
    'Pressure is usually normal or low as the ciliary body shuts down — very high pressure suggests angle closure or a herpetic cause.',
    'Recurrent, alternating unilateral attacks with morning back stiffness are the HLA-B27 pattern.',
  ],
  redFlags: [
    'Hypopyon, vitritis or retinitis.',
    'Recent eye surgery or injection (endophthalmitis).',
    'Granulomatous ("mutton-fat") precipitates — consider sarcoid, TB or syphilis.',
    'Raised pressure.',
  ],
  sources: [
    'https://eyewiki.aao.org/Acute_Anterior_Uveitis',
    'https://www.ncbi.nlm.nih.gov/books/NBK540993/',
  ],
};

export default uveitisCase;
