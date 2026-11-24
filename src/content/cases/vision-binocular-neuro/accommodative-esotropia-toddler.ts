import { buildFindings, type ClinicalCase } from '@core';

/** Refractive accommodative esotropia in a toddler: hyperopia drives the turn. */
const accommodativeEsotropia: ClinicalCase = {
  id: 'accommodative-esotropia-toddler',
  difficulty: 3,
  tags: ['paediatric', 'strabismus', 'eye-turn', 'hyperopia'],
  patient: {
    name: 'Noa Ben-David',
    age: 2,
    sex: 'F',
    occupation: 'Professional toddler, picture-book critic',
    personality: 'Shy for the first minute, then insists on high-fiving every instrument.',
    avatar: {
      skin: 1,
      hair: 'curly',
      hairColor: '#c9a66b',
      irisColor: '#6b8e9e',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'none',
      outfit: '#f472b6',
    },
  },
  chiefComplaint:
    "Dad: \"Her eye turns in. Mostly when she's looking at books or her toys up close, and more when she's tired. It started a few months ago, around her second birthday. Her grandmother is convinced she's doing it on purpose.\"",
  triageNote: 'Toddler. Parent reports intermittent inward eye turn, mostly at near. Bring stickers.',
  history: [
    { id: 'onset', category: 'onset', q: 'When did you first notice the eye turning, and was it sudden?', a: 'Dad: "Gradually, around her second birthday. At first only now and then, now most evenings."', relevance: 'key' },
    { id: 'which-eye', category: 'symptoms', q: 'Is it always the same eye?', a: 'Dad: "Usually the right... but I\'ve seen the left go in too. We argue about it."', relevance: 'key' },
    { id: 'near', category: 'symptoms', q: 'Is it worse looking at things close up or far away?', a: 'Dad: "Close. Picture books, puzzles, when she\'s feeding the cat. Watching the garden it\'s usually straight."', relevance: 'key' },
    { id: 'family', category: 'family', q: 'Does anyone in the family have a squint or wear strong glasses?', a: 'Dad: "My sister had glasses from age three for a turned eye. I wear reading glasses already and I\'m only 36."', relevance: 'helpful' },
    { id: 'illness', category: 'medical', q: 'Has she been unwell, had a fall, headaches, vomiting or unsteadiness?', a: 'Dad: "No. She\'s healthy, eating well, climbing everything. No knocks to the head that we know of."', relevance: 'key' },
    { id: 'birth', category: 'medical', q: 'Was she premature, and is development on track?', a: 'Dad: "Born at 39 weeks, all milestones on time."', relevance: 'helpful' },
    { id: 'reflex', category: 'symptoms', q: 'Have you ever seen a white glow in her pupil in photos?', a: 'Dad: "No, just normal red eyes."', relevance: 'helpful' },
    { id: 'teething', category: 'medical', q: 'Could teething cause it?', a: 'Dad: "Her grandmother blames teething for everything, including the weather."', relevance: 'red-herring' },
  ],
  findings: buildFindings(2, {
    va: {
      OD: { uncorrected: 0.3, bestCorrected: 0.2, pinhole: 0.3, nearUncorrected: 0.3 },
      OS: { uncorrected: 0.3, bestCorrected: 0.2, pinhole: 0.3, nearUncorrected: 0.3 },
    },
    refraction: {
      OD: { sphere: 4.0, cylinder: 0, axis: 180 },
      OS: { sphere: 4.0, cylinder: -0.25, axis: 180 },
    },
    motility: {
      distance: { horizontal: 20, vertical: 0, type: 'intermittent-tropia', deviatingEye: 'alternating' },
      near: { horizontal: 25, vertical: 0, type: 'tropia', deviatingEye: 'alternating' },
      versions: {},
      npcCm: 4,
      diplopia: 'none',
      headPosture: 'none',
    },
  }),
  essentialTests: ['cover-test', 'retinoscopy', 'motility'],
  helpfulTests: ['visual-acuity', 'ophthalmoscopy', 'pupils'],
  diagnosis: 'accommodative-esotropia',
  differentials: ['cn6-palsy', 'intermittent-exotropia', 'amblyopia', 'cataract'],
  urgency: 'routine',
  management:
    'Prescribe the full cycloplegic hyperopic correction (+4.00 DS OU) for full-time wear and recheck the cover test in glasses at 4–6 weeks; most refractive accommodative esotropias straighten fully. Monitor acuity for amblyopia. If a residual near esotropia persists in glasses (high AC/A), add a bifocal; refer to paediatric ophthalmology for any non-accommodative component.',
  teachingPoints: [
    'Typical story: onset around age 2–3, moderate hyperopia (mean about +4 D), larger turn at near, worse when tired.',
    'Full abduction in both eyes makes it comitant. An abduction deficit with a larger turn at distance would point to a sixth-nerve palsy.',
    'Cycloplegic retinoscopy is essential: a toddler can accommodate away several dioptres on a dry refraction.',
    'Alternating fixation lowers amblyopia risk; a constant unilateral turn raises it.',
    'Proof of diagnosis: the eyes straighten (ortho or small phoria) once the full plus is worn.',
  ],
  redFlags: [
    'Leukocoria, abnormal red reflex, an abduction deficit, papilloedema or sudden onset with headache or vomiting need urgent investigation.',
  ],
  sources: [
    'https://eyewiki.aao.org/Accommodative_Esotropia',
    'https://www.aao.org/disease-review/strabismus-accommodative-esotropia',
  ],
};

export default accommodativeEsotropia;
