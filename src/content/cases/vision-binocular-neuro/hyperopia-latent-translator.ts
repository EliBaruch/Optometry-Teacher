import { buildFindings, type ClinicalCase } from '@core';

/** Latent hyperopia causing accommodative asthenopia in a 30-something near worker. */
const hyperopiaLatentTranslator: ClinicalCase = {
  id: 'hyperopia-latent-translator',
  difficulty: 2,
  tags: ['refractive', 'eyestrain', 'headache', 'near-work'],
  patient: {
    name: 'Adaeze Okafor',
    age: 33,
    sex: 'F',
    occupation: 'Legal translator (English, Igbo and French)',
    personality: 'Precise, dry-humoured, has timed exactly how many pages it takes before the headache starts.',
    avatar: {
      skin: 5,
      hair: 'braids',
      hairColor: '#120c0a',
      irisColor: '#2a160c',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'earrings',
      outfit: '#8e3b5f',
    },
  },
  chiefComplaint:
    "By page twelve of a contract my eyes are burning and I've got a headache right across my forehead. Distance is perfect, I passed my driving test chart easily. Is it the screen? Am I just getting old?",
  history: [
    { id: 'timing', category: 'onset', q: 'When do the symptoms come on during the day?', a: 'Mornings are fine. By mid-afternoon after hours of documents, the words start to blur and swim, and the headache arrives. Weekends are lovely.', relevance: 'key' },
    { id: 'distance', category: 'symptoms', q: 'How is your distance vision, driving or TV?', a: 'Sharp. Honestly, better than my husband\'s. That\'s why this is so confusing.', relevance: 'key' },
    { id: 'previous-rx', category: 'ocular-history', q: 'Has anyone ever told you that you need glasses?', a: 'At school in Enugu a nurse said I was "a little long-sighted" but that I would grow out of it. I never wore anything.', relevance: 'key' },
    { id: 'double', category: 'symptoms', q: 'Do you ever see double, or does print move around?', a: 'No double. Sometimes it goes soft and I have to blink hard to pull it back into focus.', relevance: 'helpful' },
    { id: 'dry', category: 'symptoms', q: 'Do your eyes feel gritty or dry, or water a lot?', a: 'A little tired, not gritty. They don\'t water. Eye drops from the pharmacy did nothing.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Do you take any regular medications?', a: 'Just a vitamin D in winter.', relevance: 'neutral' },
    { id: 'red-flags', category: 'symptoms', q: 'Is the headache ever worse lying down, in the morning, or with vomiting or visual blackouts?', a: 'No, never in the morning. It goes away if I stop reading and go for a walk.', relevance: 'helpful' },
    { id: 'coffee', category: 'social', q: 'How much coffee do you drink?', a: 'Three cups. Four on deadline days. Please don\'t take it away from me.', relevance: 'red-herring' },
  ],
  findings: buildFindings(33, {
    va: {
      OD: { uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0.2 },
      OS: { uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0.2 },
    },
    refraction: {
      OD: { sphere: 1.75, cylinder: -0.25, axis: 180 },
      OS: { sphere: 1.75, cylinder: 0, axis: 180 },
    },
    motility: { near: { horizontal: 4, vertical: 0, type: 'phoria' }, npcCm: 5 },
    accommodation: { amplitudeD: { OD: 7.5, OS: 7.5 }, facilityCpm: 7 },
  }),
  essentialTests: ['visual-acuity', 'retinoscopy'],
  helpfulTests: ['phoropter', 'cover-test', 'convergence', 'slit-lamp'],
  diagnosis: 'hyperopia',
  differentials: ['presbyopia', 'convergence-insufficiency', 'dry-eye', 'astigmatism'],
  urgency: 'routine',
  management:
    'Prescribe plus lenses for near and prolonged screen work (about +1.50 DS OU to start, or full-time wear if she prefers), guided by a cycloplegic or well-fogged refraction. Explain that she has been focusing all day just to see clearly. Review in 4–6 weeks; increase towards the full hyperopia as she adapts.',
  teachingPoints: [
    '20/20 unaided distance acuity does not exclude hyperopia: young eyes hide it with accommodation.',
    'Retinoscopy shows "with" motion; cycloplegia or fogging usually reveals more plus than a quick manifest refraction (latent hyperopia).',
    'Push-up amplitude measured without correction is reduced by roughly the uncorrected hyperopia, so she looks "presbyopic early".',
    'A small near esophoria fits accommodative effort driving convergence; convergence insufficiency gives a near exophoria with a receded NPC instead.',
    'Normal tear break-up time and quiet lids steer away from dry eye as the cause of end-of-day strain.',
  ],
  redFlags: [
    'Headache worse on waking or lying down, with vomiting or transient visual obscurations, needs disc examination for raised intracranial pressure.',
    'High hyperopes have short eyes and crowded angles: check van Herick before dilating.',
  ],
  sources: [
    'https://eyewiki.aao.org/Accommodative_Esotropia',
    'https://www.aao.org/disease-review/strabismus-accommodative-esotropia',
  ],
};

export default hyperopiaLatentTranslator;
