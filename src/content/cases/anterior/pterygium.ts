import { buildFindings, type ClinicalCase } from '@core';

/** UV-driven fibrovascular wedge crossing the limbus and inducing astigmatism. */
const pterygiumCase: ClinicalCase = {
  id: 'ant-pterygium-surf-instructor',
  difficulty: 2,
  tags: ['ocular-surface', 'uv-exposure', 'astigmatism', 'outdoor-worker'],
  patient: {
    name: 'Keoni Kahale',
    age: 47,
    sex: 'M',
    occupation: 'Surf instructor',
    personality: 'Calls everyone “cuz”; measures time in tides.',
    avatar: {
      skin: 3, hair: 'long', hairColor: '#7a5a36', irisColor: '#3b2a1a',
      facialHair: 'stubble', accessory: 'necklace', outfit: '#1f8a8a',
    },
  },
  chiefComplaint:
    "There's a pink, fleshy wedge on the white of my right eye, creeping toward the middle. It gets angry and red after a big day in the water. My students think it's a battle scar.",
  history: [
    { id: 'uv', category: 'social', q: 'How much time do you spend outdoors?', a: 'Thirty years on the water, sunrise to sunset. Sunglasses fall off on the first wave.', relevance: 'key' },
    { id: 'growth', category: 'onset', q: 'How long has it been there — is it growing?', a: 'Noticed it ten years back. These last two years it’s been creeping in.', relevance: 'key' },
    { id: 'vision', category: 'symptoms', q: 'Has your vision changed in that eye?', a: 'Right eye’s a bit smeary lately. Left is still sharp.', relevance: 'key' },
    { id: 'irritation', category: 'symptoms', q: 'Does it get irritated?', a: 'Gritty and red after wind and salt. Settles overnight.', relevance: 'helpful' },
    { id: 'burn', category: 'ocular-history', q: 'Any previous injury, chemical burn or surgery to that eye?', a: 'Never. Reef cut my foot, not my eye.', relevance: 'helpful' },
    { id: 'pain', category: 'symptoms', q: 'Any pain or discharge?', a: 'No pain, no gunk.', relevance: 'helpful' },
    { id: 'skin', category: 'medical', q: 'Any skin cancers?', a: 'Skin doctor froze a spot off my nose last year.', relevance: 'neutral' },
    { id: 'fhx', category: 'family', q: 'Anyone in the family with cataracts?', a: 'My grandma, in her eighties.', relevance: 'red-herring' },
  ],
  findings: buildFindings(47, {
    va: { OD: { uncorrected: 0.3, bestCorrected: 0.0, pinhole: 0.1 } },
    refraction: { OD: { sphere: 0.25, cylinder: -1.75, axis: 175 } },
    keratometry: { OD: { k1: 42.25, k2: 44.0, axisK1: 175, mires: 'regular' } },
    anterior: {
      OD: { conjunctiva: ['pterygium', 'sectoral-injection'] },
      OS: { conjunctiva: ['pinguecula'] },
    },
    external: { redEye: ['OD'] },
  }),
  essentialTests: ['slit-lamp'],
  helpfulTests: ['keratometry', 'phoropter', 'visual-acuity'],
  diagnosis: 'pterygium',
  differentials: ['pinguecula', 'episcleritis', 'subconjunctival-hemorrhage', 'astigmatism'],
  urgency: 'routine',
  management:
    'UV protection (wraparound polarised sunglasses with a strap, a hat), lubricants, and a short anti-inflammatory course for flares. Photograph and measure the encroachment onto the cornea. Because it is advancing and now inducing 1.75 D of astigmatism, refer routinely to a cornea surgeon to discuss excision with a conjunctival autograft.',
  teachingPoints: [
    'A pterygium crosses the limbus onto the cornea; a pinguecula stays on the conjunctiva (note the pinguecula in his other eye).',
    'Pterygia flatten the horizontal meridian and induce with-the-rule astigmatism — compare K readings with the refraction.',
    'Excision with conjunctival autograft has far lower recurrence than bare-sclera excision.',
    'Gelatinous or leukoplakic lesions with feeder vessels, or atypical locations, suggest ocular surface squamous neoplasia — biopsy.',
  ],
  redFlags: [
    'Rapid growth, gelatinous texture or feeder vessels (possible surface neoplasia).',
    'Encroachment toward the visual axis.',
  ],
  sources: [
    'https://eyewiki.aao.org/Pterygium',
    'https://www.ncbi.nlm.nih.gov/books/NBK558907/',
  ],
};

export default pterygiumCase;
