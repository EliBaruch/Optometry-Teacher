import { buildFindings, type ClinicalCase } from '@core';

/** Fingernail abrasion — stain it, evert the lid, no patch, no anaesthetic drops to take home. */
const abrasionCase: ClinicalCase = {
  id: 'ant-abrasion-fingernail',
  difficulty: 2,
  tags: ['red-eye', 'painful', 'trauma', 'corneal'],
  patient: {
    name: 'Sofia Lindqvist',
    age: 32,
    sex: 'F',
    occupation: 'Architect on parental leave',
    personality: 'Running on four hours of sleep and impressive good humour.',
    avatar: {
      skin: 0, hair: 'ponytail', hairColor: '#d9b26a', irisColor: '#5b88a8',
      glasses: 'round', outfit: '#c9a4c2',
    },
  },
  chiefComplaint:
    "My seven-month-old grabbed my face and got me right in the eye with her tiny razor of a fingernail. It's streaming, I can't open it in the light, and it feels like there's a pebble in there.",
  history: [
    { id: 'mechanism', category: 'onset', q: 'What exactly hit the eye, and when?', a: 'Her fingernail, about three hours ago, during the 5 a.m. feed.', relevance: 'key' },
    { id: 'velocity', category: 'onset', q: 'Any chance of metal, high-speed fragments or chemicals?', a: 'No — just a very small, very fast human.', relevance: 'key' },
    { id: 'pain', category: 'symptoms', q: 'How does it feel — pain, light sensitivity?', a: 'Sharp and scratchy, worse every time I blink. Light is awful.', relevance: 'key' },
    { id: 'cl', category: 'ocular-history', q: 'Do you wear contact lenses?', a: 'Not since she was born — it’s glasses or nothing at 5 a.m.', relevance: 'key' },
    { id: 'discharge', category: 'symptoms', q: 'Any discharge?', a: 'Just tears. So many tears.', relevance: 'helpful' },
    { id: 'rce', category: 'ocular-history', q: 'Has that eye ever been painful on waking before?', a: 'Never.', relevance: 'helpful' },
    { id: 'feeding', category: 'medical', q: 'Any health problems — are you breastfeeding?', a: 'Healthy, and yes, still breastfeeding.', relevance: 'helpful' },
    { id: 'fhx', category: 'family', q: 'Any eye disease in the family?', a: 'Mum has macular degeneration.', relevance: 'red-herring' },
  ],
  findings: buildFindings(32, {
    va: {
      OD: { uncorrected: 0.5, bestCorrected: 0.2, pinhole: 0.2 },
      OS: { uncorrected: 0.4, bestCorrected: -0.1, pinhole: 0.1 },
    },
    refraction: {
      OD: { sphere: -1.0, cylinder: 0, axis: 180 },
      OS: { sphere: -1.0, cylinder: 0, axis: 180 },
    },
    anterior: {
      OD: { conjunctiva: ['diffuse-injection'], cornea: ['abrasion'], fluorescein: 'linear-abrasion' },
    },
    external: { redEye: ['OD'], tearing: ['OD'], photophobia: true, squinting: true },
  }),
  essentialTests: ['fluorescein', 'slit-lamp', 'visual-acuity'],
  helpfulTests: ['pupils'],
  diagnosis: 'corneal-abrasion',
  differentials: ['corneal-foreign-body', 'microbial-keratitis', 'hsv-keratitis', 'anterior-uveitis'],
  urgency: 'urgent',
  management:
    'Evert the upper lid to exclude a retained foreign body, then start a prophylactic topical antibiotic (e.g. chloramphenicol or erythromycin ointment 4×/day until healed) with breastfeeding-compatible oral analgesia and an optional cycloplegic for spasm pain. No patch, and never send her home with topical anaesthetic drops. Recheck in 24–48 hours; most small abrasions heal in 1–3 days.',
  teachingPoints: [
    'Fluorescein shows the epithelial defect bright green under cobalt blue — record its size and position.',
    'Multiple vertical linear scratches mean a foreign body under the upper lid: always evert.',
    'Contact lens wearers need anti-pseudomonal cover (a fluoroquinolone) and must never be patched.',
    'A white infiltrate under the defect means infection, not a simple abrasion.',
    'Fingernail injuries are notorious for later recurrent erosions — warn her about painful waking.',
  ],
  redFlags: [
    'High-velocity mechanism (hammering, grinding) — exclude an intraocular foreign body.',
    'Seidel-positive leak, peaked pupil or shallow chamber — open globe.',
    'Chemical injury — irrigate before anything else.',
  ],
  sources: [
    'https://www.aafp.org/pubs/afp/issues/2013/0115/p114.html',
    'https://www.ncbi.nlm.nih.gov/books/NBK532960/',
  ],
};

export default abrasionCase;
