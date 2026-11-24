import { buildFindings, type ClinicalCase } from '@core';

/** Symptomatic convergence insufficiency in a teenage student. */
const convergenceInsufficiency: ClinicalCase = {
  id: 'convergence-insufficiency-floating-words',
  difficulty: 2,
  tags: ['binocular-vision', 'reading', 'paediatric', 'headache'],
  patient: {
    name: 'Priya Raman',
    age: 15,
    sex: 'F',
    occupation: 'Year 10 student, debate team',
    personality: 'Articulate and frustrated; used to love reading and wants that back.',
    avatar: {
      skin: 3,
      hair: 'ponytail',
      hairColor: '#140d0a',
      irisColor: '#2f1b10',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'earrings',
      outfit: '#4f46e5',
    },
  },
  chiefComplaint:
    "After about ten minutes of reading the words start to float and swim, I lose my place and have to use my finger like a little kid. Then I get a headache. Sometimes the page actually goes double. My history teacher thinks I'm just not trying.",
  history: [
    { id: 'near-vs-far', category: 'symptoms', q: 'Do you ever see double when looking far away, like at the board or when driving with family?', a: 'Never far away. Only close up, and only after I have been reading for a while.', relevance: 'key' },
    { id: 'duration', category: 'onset', q: 'How long has this been happening?', a: "Since about the start of last year, when the reading load went up. It's worst at the end of the day.", relevance: 'helpful' },
    { id: 'head-injury', category: 'medical', q: 'Have you had any head injury or concussion?', a: 'No. I play badminton, but nothing has ever hit my head. Well, apart from a shuttlecock once.', relevance: 'key' },
    { id: 'closing-eye', category: 'symptoms', q: 'Does closing or covering one eye make reading easier?', a: 'Actually... yes. I sometimes read with my hand over one eye and it feels calmer.', relevance: 'key' },
    { id: 'avoid', category: 'social', q: 'Do you avoid reading or homework now?', a: 'I leave it to the last minute because I know it will hurt. Audiobooks have become my best friend.', relevance: 'helpful' },
    { id: 'blur', category: 'symptoms', q: 'Is the distance blurry, or does near print blur?', a: "Distance is fine. Near goes a bit blurry when I'm tired, but mostly it moves.", relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Any medicines or medical conditions?', a: 'None. Just hay fever spray in spring.', relevance: 'neutral' },
    { id: 'phone', category: 'social', q: 'Is it the blue light from your phone?', a: 'My mum keeps saying that. I put the night mode on and nothing changed.', relevance: 'red-herring' },
  ],
  findings: buildFindings(15, {
    va: {
      OD: { uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0 },
      OS: { uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0 },
    },
    refraction: {
      OD: { sphere: 0.25, cylinder: 0, axis: 180 },
      OS: { sphere: 0, cylinder: -0.25, axis: 180 },
    },
    motility: {
      distance: { horizontal: -1, vertical: 0, type: 'phoria' },
      near: { horizontal: -10, vertical: 0, type: 'phoria' },
      npcCm: 12,
      diplopia: 'none',
    },
    accommodation: { amplitudeD: { OD: 13.5, OS: 13.5 }, facilityCpm: 5 },
  }),
  essentialTests: ['cover-test', 'convergence'],
  helpfulTests: ['visual-acuity', 'retinoscopy', 'motility', 'phoropter'],
  diagnosis: 'convergence-insufficiency',
  differentials: ['hyperopia', 'intermittent-exotropia', 'dry-eye', 'astigmatism'],
  urgency: 'routine',
  management:
    'Confirm with a symptom survey (CISS) and near fusional vergence (base-out) measurement, then start office-based vergence/accommodative therapy with home reinforcement for about 12 weeks, the most effective option in the CITT trials. Pencil push-ups alone are less effective. A letter to school explaining the condition helps; recheck symptoms and NPC at the end of therapy.',
  teachingPoints: [
    'The signature: ortho or small exophoria at distance, a larger exophoria at near (≥4Δ more), and a receded near point of convergence (≥6 cm break).',
    'Symptoms are near-only: words floating, losing place, headaches, near diplopia, and relief from covering one eye.',
    'Normal accommodative amplitude for age points to a vergence problem; accommodative insufficiency would show a low amplitude instead.',
    'Intermittent exotropia breaks down into a visible tropia, typically at distance first; CI stays a phoria held with effort at near.',
    'Always ask about concussion: post-traumatic CI is common and changes the referral pathway.',
  ],
  redFlags: [
    'New convergence problems in an adult with other neurological signs, or any acute diplopia, need a neurological evaluation.',
  ],
  sources: [
    'https://eyewiki.aao.org/Convergence_Insufficiency',
    'https://pubmed.ncbi.nlm.nih.gov/18852411/',
  ],
};

export default convergenceInsufficiency;
