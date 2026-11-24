import { buildFindings, type ClinicalCase } from '@core';

/** School-age myopia, progressing: the classic "can't see the board" teenager. */
const myopiaBackRow: ClinicalCase = {
  id: 'myopia-back-row',
  difficulty: 1,
  tags: ['refractive', 'paediatric', 'gradual-blur', 'myopia-control'],
  patient: {
    name: 'Min-jun Park',
    age: 14,
    sex: 'M',
    occupation: 'Year 9 student, robotics club captain',
    personality: 'Polite, slightly embarrassed, explains everything in terms of video-game frame rates.',
    avatar: {
      skin: 1,
      hair: 'swept',
      hairColor: '#1b1410',
      irisColor: '#3b2416',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'none',
      outfit: '#2c7a7b',
    },
  },
  chiefComplaint:
    "I moved to the back row because my friends sit there, and now the whiteboard is basically a low-resolution texture. I have to squint or copy off my mate's notes. Up close my phone is perfectly fine though.",
  triageNote: 'Accompanied by mum. Failed distance chart at school screening last month. No previous glasses.',
  history: [
    { id: 'onset', category: 'onset', q: 'When did the board start looking blurry?', a: "Last year it was a bit soft. This term it's properly bad. It crept up, it didn't happen overnight.", relevance: 'key' },
    { id: 'near', category: 'symptoms', q: 'How is your vision up close, reading or on your phone?', a: 'Perfect. I can read tiny text on my phone. That is not the problem.', relevance: 'key' },
    { id: 'both-eyes', category: 'symptoms', q: 'Is it both eyes, or one more than the other?', a: 'Both, I think. Maybe the left is a tiny bit worse? I tried closing each one in the car.', relevance: 'helpful' },
    { id: 'parents', category: 'family', q: 'Do your parents wear glasses for distance?', a: "Mum: \"Both of us do. I've been short-sighted since I was ten, and his dad's glasses are thicker than mine.\"", relevance: 'key' },
    { id: 'outdoors', category: 'social', q: 'How much time do you spend outdoors each day?', a: 'Like... the walk to the bus? Robotics, homework, gaming. Maybe half an hour outside on a good day.', relevance: 'helpful' },
    { id: 'fluctuate', category: 'symptoms', q: 'Does the distance blur come and go, or get worse after a long session of reading?', a: "It's pretty much always blurry. Maybe slightly worse after a big gaming session, but it doesn't clear up.", relevance: 'helpful' },
    { id: 'headache', category: 'symptoms', q: 'Any headaches, pain, redness or flashing lights?', a: 'Sometimes a headache after school from squinting. No pain in the eyes, nothing red, no flashing.', relevance: 'neutral' },
    { id: 'meds', category: 'medications', q: 'Any medicines or health problems?', a: 'Nope. I had asthma when I was little but I grew out of it.', relevance: 'neutral' },
    { id: 'diet', category: 'social', q: 'Do you eat carrots? Your granny says they help your eyes.', a: "I mean... in stir-fry? I don't think carrots are going to fix this.", relevance: 'red-herring' },
  ],
  findings: buildFindings(14, {
    va: {
      OD: { uncorrected: 0.9, bestCorrected: -0.1, pinhole: 0.1, nearUncorrected: 0 },
      OS: { uncorrected: 1.0, bestCorrected: -0.1, pinhole: 0.1, nearUncorrected: 0 },
    },
    refraction: {
      OD: { sphere: -2.25, cylinder: 0, axis: 180 },
      OS: { sphere: -2.5, cylinder: -0.5, axis: 175 },
    },
    keratometry: {
      OD: { k1: 43.5, k2: 43.75, axisK1: 180, mires: 'regular' },
      OS: { k1: 43.5, k2: 44.0, axisK1: 175, mires: 'regular' },
    },
    motility: { near: { horizontal: -3, vertical: 0, type: 'phoria' } },
  }),
  essentialTests: ['visual-acuity', 'retinoscopy'],
  helpfulTests: ['phoropter', 'pinhole', 'keratometry', 'cover-test', 'ophthalmoscopy'],
  diagnosis: 'myopia',
  differentials: ['astigmatism', 'keratoconus', 'hyperopia', 'amblyopia'],
  urgency: 'routine',
  management:
    'Prescribe full distance correction (OD −2.25 DS, OS −2.50 −0.50 × 175), ideally confirmed by cycloplegic retinoscopy in a child. Because he is young and progressing with two myopic parents, offer myopia control: low-dose atropine, defocus-incorporating spectacles (DIMS/HAL), dual-focus soft lenses or orthokeratology. Advise about 2 hours a day outdoors and regular near-work breaks; recheck in 6 months, with axial length if available.',
  teachingPoints: [
    'Pinhole brings VA from 20/160 to about 20/25: the blur is refractive, not pathology.',
    'Rule of thumb: roughly one Snellen line lost per −0.25 D of uncorrected myopia, so −2.25 D lands near 20/160–20/200.',
    'In children, confirm the refraction with cycloplegia to unmask pseudomyopia (accommodative spasm), which shows much less minus once accommodation is relaxed.',
    'Regular, low corneal cylinder with clean mires argues against keratoconus; a scissors reflex or irregular mires would change that.',
    'Two myopic parents and little time outdoors are the biggest modifiable and non-modifiable risks; early onset means more time to progress to high myopia.',
  ],
  redFlags: [
    'A sudden myopic shift in an adult suggests diabetes, nuclear cataract or a drug effect (e.g. topiramate with angle closure).',
    'Progression to high myopia (≤ −6.00 D) raises lifelong risk of retinal detachment, myopic maculopathy and glaucoma.',
  ],
  sources: [
    'https://myopiainstitute.org/imi-whitepaper/defining-and-classifying-myopia',
    'https://pubmed.ncbi.nlm.nih.gov/38494130/',
  ],
};

export default myopiaBackRow;
