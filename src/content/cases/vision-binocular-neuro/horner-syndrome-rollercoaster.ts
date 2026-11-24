import { buildFindings, type ClinicalCase } from '@core';

/** Acute painful left Horner syndrome: carotid artery dissection until proven otherwise. */
const hornerRollercoaster: ClinicalCase = {
  id: 'horner-syndrome-rollercoaster',
  difficulty: 5,
  tags: ['anisocoria', 'ptosis', 'neuro', 'emergency', 'neck-pain', 'stroke-risk'],
  patient: {
    name: 'Daniel Cohen',
    age: 44,
    sex: 'M',
    occupation: 'Sound engineer',
    personality: 'Self-deprecating, a little sheepish; convinced this is "just a pulled muscle".',
    avatar: {
      skin: 1,
      hair: 'short',
      hairColor: '#3b2a20',
      irisColor: '#6b4a2b',
      glasses: 'square',
      facialHair: 'beard',
      headwear: 'kippah',
      accessory: 'none',
      outfit: '#334155',
    },
  },
  chiefComplaint:
    "My wife says my left eye looks \"smaller and sleepy\" since yesterday. Honestly I only came because she booked it. I've had a pain down the left side of my neck since Sunday — I took the kids on the big rollercoaster and I think I pulled something — and a sort of ache around that eye.",
  triageNote: 'Mild left upper lid droop. Patient reports left neck pain for 3 days. BP 138/84.',
  history: [
    { id: 'neck-pain', category: 'onset', q: 'Tell me about the neck pain: where exactly, and when did it start?', a: 'Left side, running up under the jaw to behind the ear, and a dull ache around the left eye. Started Sunday evening after the ride. Paracetamol barely touches it.', relevance: 'key' },
    { id: 'eye-onset', category: 'onset', q: 'When did the eyelid and eye change appear? Could it be old — do you have recent photos?', a: 'My wife spotted it yesterday morning. We checked last week\'s photos from my nephew\'s bar mitzvah and my eyes were identical.', relevance: 'key' },
    { id: 'stroke', category: 'symptoms', q: 'Any weakness, numbness, clumsiness, trouble speaking, or loss of vision in one eye, even briefly?', a: 'Hm. Yesterday my right hand felt a bit clumsy for maybe ten minutes while I was mixing. It went away. I put it down to tiredness.', relevance: 'key' },
    { id: 'tinnitus', category: 'symptoms', q: 'Any noise in the ear, like a whooshing in time with your pulse, or a change in taste?', a: 'Actually yes, a whooshing in my left ear when it\'s quiet. Which, for a sound engineer, is extremely annoying.', relevance: 'helpful' },
    { id: 'drops', category: 'medications', q: 'Have you used any eye drops, or handled any medicines or patches?', a: 'Nothing in my eyes. I take nothing regularly.', relevance: 'helpful' },
    { id: 'diplopia', category: 'symptoms', q: 'Any double vision?', a: 'No. Just the droopy look.', relevance: 'helpful' },
    { id: 'sweat', category: 'symptoms', q: 'Have you noticed any difference in sweating or flushing between the two sides of your face?', a: 'Not that I have noticed. Both sides sweat equally when I panic about deadlines.', relevance: 'helpful' },
    { id: 'smoke', category: 'social', q: 'Do you smoke, or have a cough or chest symptoms?', a: 'Never smoked. No cough.', relevance: 'neutral' },
    { id: 'headphones', category: 'social', q: 'Do you wear heavy headphones all day?', a: 'Twelve hours a day, sometimes. You think they squashed my eyelid?', relevance: 'red-herring' },
  ],
  findings: buildFindings(44, {
    va: {
      OD: { uncorrected: 0.2, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0.2 },
      OS: { uncorrected: 0.2, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0.2 },
    },
    refraction: {
      OD: { sphere: -0.75, cylinder: -0.25, axis: 180, add: 0.75 },
      OS: { sphere: -0.75, cylinder: -0.5, axis: 175, add: 0.75 },
    },
    pupils: {
      sizeLightMm: { OD: 3.5, OS: 3 },
      sizeDarkMm: { OD: 6.5, OS: 4.5 },
      reactivity: { OD: 'brisk', OS: 'brisk' },
      rapd: 'none',
      nearResponse: 'normal',
      shape: { OD: 'round', OS: 'round' },
    },
    anterior: { OS: { lids: ['ptosis'] } },
    external: { ptosis: ['OS'] },
  }),
  essentialTests: ['pupils'],
  helpfulTests: ['motility', 'slit-lamp', 'visual-acuity', 'cover-test'],
  diagnosis: 'horner-syndrome',
  differentials: ['adie-pupil', 'cn3-palsy', 'healthy-eyes', 'anterior-uveitis'],
  urgency: 'emergency',
  management:
    'Emergency: an acute, painful Horner syndrome is a carotid artery dissection until proven otherwise, and his transient hand clumsiness was likely a warning event. Send him to the emergency department/stroke team now for CT or MR angiography of the head and neck; antithrombotic treatment is started once dissection is confirmed. Pharmacological confirmation (apraclonidine or cocaine drops) must not delay imaging.',
  teachingPoints: [
    'Anisocoria greater in the DARK means the small pupil is abnormal (failed dilation, sympathetic loss); both pupils still react briskly to light, and the small one shows dilation lag in the first seconds of darkness.',
    'Horner = mild ptosis (1–2 mm, Müller muscle) + miosis ± anhidrosis. Third-order (post-ganglionic) lesions along the carotid often spare facial sweating, so normal sweating does not exclude a dissection.',
    'Apraclonidine can be falsely negative in the first days to about two weeks of an acute Horner, because denervation supersensitivity has not developed yet: a negative drop test never cancels the scan.',
    'CN III palsy gives a BIG pupil with marked ptosis and a motility deficit; physiological anisocoria is equal in light and dark with no ptosis.',
    'Old photos are a cheap, powerful test: a new Horner with neck pain is an emergency; a lifelong one usually is not.',
  ],
  redFlags: [
    'Acute Horner with neck, face or ear pain, or any transient neurological symptoms (TIA): stroke risk from carotid dissection.',
    'Horner with arm pain/weakness or a smoking history: think apical lung tumour.',
  ],
  emergency: { timeLimitSec: 150 },
  sources: [
    'https://eyewiki.aao.org/Horner_Syndrome',
  ],
};

export default hornerRollercoaster;
