import { buildFindings, type ClinicalCase } from '@core';

/** Isolated left sixth-nerve palsy, presumed microvascular, in a vasculopathic driver. */
const cn6PalsyTrucker: ClinicalCase = {
  id: 'cn6-palsy-trucker',
  difficulty: 3,
  tags: ['diplopia', 'neuro', 'diabetes', 'strabismus'],
  patient: {
    name: 'Harold Jenkins',
    age: 64,
    sex: 'M',
    occupation: 'Long-haul lorry driver',
    personality: 'Laconic, practical, deeply worried about his licence; calls everyone "chief".',
    avatar: {
      skin: 4,
      hair: 'bald',
      hairColor: '#3a3a3a',
      irisColor: '#2e1a10',
      glasses: 'half-rim',
      facialHair: 'beard',
      headwear: 'cap',
      accessory: 'none',
      outfit: '#1e3a5f',
    },
  },
  chiefComplaint:
    "Since yesterday morning I see two of everything, side by side. Two lorries coming at me on the motorway, chief, and that's one too many. It's worse looking far away and worse when I look to my left. Shut one eye and it's gone.",
  triageNote: 'BP 168/94. Capillary glucose 11.2 mmol/L (non-fasting). Has parked his lorry and come in by taxi.',
  history: [
    { id: 'monocular', category: 'symptoms', q: 'Does the doubling go away if you cover either eye?', a: 'Either eye, yes. Cover one, single picture. Uncover, two again.', relevance: 'key' },
    { id: 'direction', category: 'symptoms', q: 'Are the two images side by side or one above the other, and where is it worst?', a: 'Side by side. Far away is worst, and looking over to my left mirror is terrible. Reading my phone is nearly fine.', relevance: 'key' },
    { id: 'onset', category: 'onset', q: 'Did it come on suddenly?', a: "Woke up with it yesterday. Thought I was just tired after a long run, but it hasn't shifted.", relevance: 'key' },
    { id: 'vascular', category: 'medical', q: 'Do you have diabetes, high blood pressure or high cholesterol?', a: 'Type 2 diabetes about fifteen years, and blood pressure. Not as good with the tablets as the wife would like.', relevance: 'key' },
    { id: 'gca', category: 'symptoms', q: 'Any jaw pain when chewing, scalp tenderness, new headaches, weight loss or aching shoulders?', a: "No jaw pain. Scalp's fine. Bit of an ache around the left eye yesterday but nothing much.", relevance: 'key' },
    { id: 'icp', category: 'symptoms', q: 'Any headaches worse lying down, whooshing in the ears, or vision greying out for seconds?', a: 'None of that.', relevance: 'helpful' },
    { id: 'neuro', category: 'symptoms', q: 'Any weakness, numbness, droopy eyelid, trouble swallowing or speaking?', a: 'No, chief. Everything else works.', relevance: 'key' },
    { id: 'meds', category: 'medications', q: 'What medicines do you take?', a: 'Metformin, gliclazide, ramipril and a statin. When I remember.', relevance: 'helpful' },
    { id: 'trauma', category: 'medical', q: 'Any knock to the head or face?', a: 'No.', relevance: 'neutral' },
    { id: 'energy-drink', category: 'social', q: 'How many energy drinks do you get through on a long shift?', a: "Two, maybe three. You're not going to blame those for this, are you?", relevance: 'red-herring' },
  ],
  findings: buildFindings(64, {
    va: {
      OD: { uncorrected: 0.1, bestCorrected: 0, pinhole: 0.1, nearUncorrected: 0.6 },
      OS: { uncorrected: 0.1, bestCorrected: 0, pinhole: 0.1, nearUncorrected: 0.6 },
    },
    refraction: {
      OD: { sphere: 0.5, cylinder: -0.5, axis: 90, add: 2.5 },
      OS: { sphere: 0.5, cylinder: -0.25, axis: 85, add: 2.5 },
    },
    motility: {
      distance: { horizontal: 20, vertical: 0, type: 'tropia', deviatingEye: 'OS' },
      near: { horizontal: 8, vertical: 0, type: 'intermittent-tropia', deviatingEye: 'OS' },
      versions: {
        left: { OD: 0, OS: -3 },
        upLeft: { OD: 0, OS: -2 },
        downLeft: { OD: 0, OS: -2 },
      },
      npcCm: 8,
      diplopia: 'horizontal',
      headPosture: 'turn-left',
    },
    posterior: {
      OD: { lesions: [{ type: 'microaneurysm', zone: 'superotemporal', density: 1 }, { type: 'dot-blot-hemorrhage', zone: 'inferotemporal', density: 1 }], vessels: { avRatio: 0.55 } },
      OS: { lesions: [{ type: 'microaneurysm', zone: 'inferotemporal', density: 1 }], vessels: { avRatio: 0.55 } },
    },
  }),
  essentialTests: ['motility', 'cover-test', 'ophthalmoscopy'],
  helpfulTests: ['pupils', 'visual-acuity', 'slit-lamp'],
  diagnosis: 'cn6-palsy',
  differentials: ['cn3-palsy', 'cn4-palsy', 'papilledema', 'giant-cell-arteritis'],
  urgency: 'urgent',
  management:
    'Refer same day / within 24 hours to neurology or the acute eye service: ESR, CRP and full blood count to exclude giant cell arteritis, BP and glucose review, and neuroimaging (MRI) per local pathway, which is mandatory if anything is atypical. Advise him not to drive and inform the licensing authority; occlude one eye or fit a Fresnel prism for comfort. Microvascular palsies usually recover within about 3–6 months; no improvement, progression or new signs demand imaging.',
  teachingPoints: [
    'Binocular horizontal diplopia, worse at distance and on gaze towards the affected side = lateral rectus underaction (CN VI).',
    'The esotropia is incomitant: larger in left gaze and at distance, smaller at near. He turns his face left to keep the eye out of the weak field.',
    'Always look at the discs: bilateral papilloedema makes a sixth-nerve palsy a false-localising sign of raised intracranial pressure.',
    'Normal pupils and lids, and full adduction/elevation/depression, keep this an isolated CN VI rather than CN III or multiple nerves.',
    'Over 50 with new diplopia: ask the GCA questions and check ESR/CRP every time.',
  ],
  redFlags: [
    'Papilloedema, other cranial nerve or brainstem signs, age under 50 without vascular risk, severe headache, or failure to recover within 3 months.',
  ],
  sources: [
    'https://eyewiki.aao.org/Abducens_Nerve_Palsy',
    'https://www.ncbi.nlm.nih.gov/books/NBK430711/',
  ],
};

export default cn6PalsyTrucker;
