import { buildFindings, type ClinicalCase } from '@core';

/** Adenoviral keratoconjunctivitis — follicles, a node, a cold, and a classroom outbreak. */
const viralConjCase: ClinicalCase = {
  id: 'ant-viral-conj-teacher',
  difficulty: 3,
  tags: ['red-eye', 'conjunctivitis', 'contagious', 'watery'],
  patient: {
    name: 'Tomás Herrera',
    age: 36,
    sex: 'M',
    occupation: 'Primary school teacher',
    personality: 'Knows every germ in Year 3 by first name; laughs at his own misfortune.',
    avatar: {
      skin: 2, hair: 'short', hairColor: '#3a2a1d', irisColor: '#5a3b22',
      glasses: 'square', facialHair: 'stubble', outfit: '#3d6b4f',
    },
  },
  chiefComplaint:
    "My right eye went pink and watery three days ago, and this morning the left one joined the party. It feels like sand under the lids. Half my class has the same thing.",
  history: [
    { id: 'onset', category: 'onset', q: 'Which eye started first, and when?', a: 'The right, three days ago. The left started this morning and it’s not as bad.', relevance: 'key' },
    { id: 'uri', category: 'medical', q: 'Any recent cold or sore throat?', a: 'A snotty cold last week — sore throat, the works.', relevance: 'key' },
    { id: 'discharge', category: 'symptoms', q: 'What kind of discharge?', a: 'Watery, like I’m crying all day. A little crust on waking, nothing thick.', relevance: 'key' },
    { id: 'node', category: 'symptoms', q: 'Any tender lump in front of your ear?', a: 'Huh — yes, there’s a sore pea just in front of my right ear.', relevance: 'key' },
    { id: 'hsv', category: 'ocular-history', q: 'Ever had cold sores or blisters on the eyelid?', a: 'Never had a cold sore in my life.', relevance: 'key' },
    { id: 'itch', category: 'symptoms', q: 'Is it itchy?', a: 'Mildly. More sandy than itchy.', relevance: 'helpful' },
    { id: 'cl', category: 'ocular-history', q: 'Do you wear contact lenses?', a: 'Glasses only — and they’re steamed up with tears.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Any medicines?', a: 'Paracetamol for the cold. That’s it.', relevance: 'neutral' },
    { id: 'fhx', category: 'family', q: 'Anyone at home with diabetes?', a: 'My grandfather, back in Valencia.', relevance: 'red-herring' },
  ],
  findings: buildFindings(36, {
    va: {
      OD: { uncorrected: 0.8, bestCorrected: 0.1, pinhole: 0.2 },
      OS: { uncorrected: 0.7, bestCorrected: 0.0, pinhole: 0.1 },
    },
    refraction: {
      OD: { sphere: -1.75, cylinder: 0, axis: 180 },
      OS: { sphere: -1.75, cylinder: 0, axis: 180 },
    },
    anterior: {
      OD: {
        lids: ['lid-edema'],
        conjunctiva: ['diffuse-injection', 'follicles', 'discharge-watery', 'preauricular-node'],
        cornea: ['punctate-keratitis'],
        fluorescein: 'diffuse-punctate',
      },
      OS: { conjunctiva: ['diffuse-injection', 'follicles', 'discharge-watery'] },
    },
    external: { redEye: ['OD', 'OS'], tearing: ['OD', 'OS'] },
  }),
  essentialTests: ['slit-lamp', 'fluorescein'],
  helpfulTests: ['visual-acuity'],
  diagnosis: 'viral-conjunctivitis',
  differentials: ['bacterial-conjunctivitis', 'allergic-conjunctivitis', 'hsv-keratitis', 'anterior-uveitis'],
  urgency: 'routine',
  management:
    'Supportive care: cold compresses and preservative-free lubricants; antibiotics do not help and no antiviral is proven for adenovirus. It is highly contagious for about two weeks — strict hand hygiene, his own towels, time off work per local policy, and disinfect your slit lamp and tonometer. Review in 1–2 weeks, or sooner if vision drops or light sensitivity grows (subepithelial infiltrates); steroids only under specialist care, once HSV has been excluded.',
  teachingPoints: [
    'Follicles, watery discharge, a tender preauricular node and a recent cold are the adenoviral fingerprint.',
    'It typically starts in one eye and spreads to the second, which is usually milder.',
    'Always stain with fluorescein: a branching dendrite with terminal bulbs means HSV, not adenovirus.',
    'Subepithelial infiltrates appearing at 1–2 weeks cause blur and glare long after the redness settles.',
  ],
  redFlags: [
    'A dendrite on fluorescein — HSV, and steroids are contraindicated.',
    'Marked drop in vision or a pseudomembrane.',
    'Conjunctivitis in a newborn.',
  ],
  sources: [
    'https://eyewiki.aao.org/Epidemic_Keratoconjunctivitis',
    'https://www.ncbi.nlm.nih.gov/books/NBK470271/',
  ],
};

export default viralConjCase;
