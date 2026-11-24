import { buildFindings, type ClinicalCase } from '@core';

/** Classic early presbyopia: "my arms aren't long enough any more". */
const presbyopiaMenu: ClinicalCase = {
  id: 'presbyopia-menu-at-arms-length',
  difficulty: 1,
  tags: ['refractive', 'presbyopia', 'near-blur', 'gradual-blur'],
  patient: {
    name: 'Giovanni "Gio" Russo',
    age: 46,
    sex: 'M',
    occupation: 'Chef and owner of a 30-seat trattoria',
    personality: 'Loud, warm, gestures with both hands; refuses to admit he is a day over 39.',
    avatar: {
      skin: 2,
      hair: 'short',
      hairColor: '#4a3b33',
      irisColor: '#4b3621',
      glasses: 'none',
      facialHair: 'stubble',
      headwear: 'none',
      accessory: 'necklace',
      outfit: '#f6efe4',
    },
  },
  chiefComplaint:
    "Doc, my arms are too short. I hold the recipe cards out here like a trombone, and in the restaurant's lovely candlelight I can't read my own menu. My customers think it's charming. I do not.",
  history: [
    { id: 'gradual', category: 'onset', q: 'Did this come on suddenly or gradually?', a: 'Slowly, over the last year or so. First the small print on spice jars, now everything close.', relevance: 'key' },
    { id: 'distance', category: 'symptoms', q: 'How is your distance vision?', a: 'Perfect! I can read the specials board from the kitchen pass.', relevance: 'key' },
    { id: 'light', category: 'symptoms', q: 'Does better light help?', a: 'Enormously. In daylight on the terrace it is almost fine. In dim light, forget it.', relevance: 'helpful' },
    { id: 'one-eye', category: 'symptoms', q: 'Is one eye worse than the other, or any double vision?', a: 'Both the same. No double.', relevance: 'helpful' },
    { id: 'diabetes', category: 'medical', q: 'Any diabetes, or other medical conditions?', a: 'My doctor checked my sugar in the spring, all normal. Blood pressure a little high, I take a small tablet.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Do you take antihistamines or other medicines that might affect focusing?', a: 'Only the blood pressure pill, amlodipine. Hay fever tablets sometimes in May, but this is all year.', relevance: 'helpful' },
    { id: 'pain', category: 'symptoms', q: 'Any pain, redness, flashes or floaters?', a: 'No, no, none of that. Only the onions make me cry.', relevance: 'neutral' },
    { id: 'reading-glasses', category: 'social', q: 'Have you tried pharmacy reading glasses?', a: "My sous-chef lent me hers. Plus one point something. It was a miracle, which is exactly why I'm angry.", relevance: 'helpful' },
    { id: 'wine', category: 'social', q: 'Could it be the wine at service?', a: 'One glass with staff dinner. If wine did this, my nonna would have been blind at forty.', relevance: 'red-herring' },
  ],
  findings: buildFindings(46, {
    va: {
      OD: { uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0.4 },
      OS: { uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0.4 },
    },
    refraction: {
      OD: { sphere: 0.25, cylinder: 0, axis: 180, add: 1.25 },
      OS: { sphere: 0, cylinder: -0.25, axis: 90, add: 1.25 },
    },
    accommodation: { amplitudeD: { OD: 3.25, OS: 3.25 }, facilityCpm: 8 },
    motility: { npcCm: 8 },
    iop: { OD: 16, OS: 17 },
  }),
  essentialTests: ['visual-acuity', 'phoropter'],
  helpfulTests: ['convergence', 'slit-lamp', 'ophthalmoscopy', 'tonometry'],
  diagnosis: 'presbyopia',
  differentials: ['hyperopia', 'cataract', 'dry-eye', 'adie-pupil'],
  urgency: 'routine',
  management:
    'Prescribe a near addition of +1.25 D (single-vision readers, or progressives/occupational lenses for the kitchen pass and menu distance). Demonstrate the working distances he actually needs. Explain the add will increase over the next decade; complete a full eye-health check including IOP and dilated fundus as he is over 40. Recall in 1–2 years.',
  teachingPoints: [
    'Hofstetter average amplitude at 46 is 18.5 − 0.3 × 46 ≈ 4.7 D; holding half in reserve for comfortable 40 cm work (2.5 D) leaves him short, so he pushes print away.',
    'Distance 20/20, near 20/50 that clears fully with a plus add: a purely optical, bilateral, symmetric problem.',
    'Starting adds are individual, roughly +1.00 to +1.25 in the mid-40s, rising to +2.00 to +2.50 by about 60.',
    'Uncorrected hyperopes notice near blur earlier; a cycloplegic refraction tells the two apart.',
    'Sudden or one-sided near blur in a young adult is not presbyopia: think tonic pupil, third-nerve palsy, drugs or diabetes.',
  ],
  redFlags: [
    'New anisocoria or a unilateral loss of focusing needs a pupil and neuro work-up.',
  ],
  sources: [
    'https://www.ncbi.nlm.nih.gov/books/NBK560568/',
    'https://eyewiki.aao.org/Presbyopia',
  ],
};

export default presbyopiaMenu;
