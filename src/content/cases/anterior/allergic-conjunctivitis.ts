import { buildFindings, type ClinicalCase } from '@core';

/** Seasonal allergic conjunctivitis in an atopic child — itch is the hallmark. */
const allergicConjCase: ClinicalCase = {
  id: 'ant-allergic-conj-goalkeeper',
  difficulty: 1,
  tags: ['red-eye', 'conjunctivitis', 'itch', 'paediatric', 'seasonal'],
  patient: {
    name: 'Ollie Mensah',
    age: 11,
    sex: 'M',
    occupation: 'Year 6 pupil and goalkeeper',
    personality: 'Narrates his symptoms like a football commentator.',
    avatar: {
      skin: 4, hair: 'curly', hairColor: '#1b1410', irisColor: '#3a2412',
      headwear: 'cap', outfit: '#e0a43a',
    },
  },
  chiefComplaint:
    "My eyes are SO itchy I want to take them out and scratch them. Every time we play on the big field. And they go all puffy like a frog's.",
  triageNote: 'Brought in by his dad after football practice.',
  history: [
    { id: 'itch', category: 'symptoms', q: 'Are they itchy, or sore?', a: 'ITCHY. So itchy. Dad says stop rubbing but I literally can’t.', relevance: 'key' },
    { id: 'season', category: 'onset', q: 'When does it happen?', a: 'Every spring. Worst after football when they’ve just mown the grass.', relevance: 'key' },
    { id: 'atopy', category: 'medical', q: 'Do you get sneezing, asthma or eczema?', a: 'I sneeze loads and I’ve got a blue inhaler for when I run a lot.', relevance: 'key' },
    { id: 'discharge', category: 'symptoms', q: 'Any discharge?', a: 'Sort of clear stringy stuff. Like slime.', relevance: 'helpful' },
    { id: 'both', category: 'onset', q: 'One eye or both?', a: 'Both. Exactly the same. Twins.', relevance: 'helpful' },
    { id: 'contacts', category: 'social', q: 'Has anyone at school got pink eye?', a: 'Don’t think so.', relevance: 'helpful' },
    { id: 'fhx', category: 'family', q: 'Does anyone in the family get hay fever?', a: 'Dad. He sneezes like a trumpet.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Have you taken anything for it?', a: 'Dad gave me an allergy tablet once. It helped a bit.', relevance: 'neutral' },
    { id: 'cl', category: 'ocular-history', q: 'Do you wear contact lenses?', a: 'No… I’m eleven.', relevance: 'red-herring' },
  ],
  findings: buildFindings(11, {
    anterior: {
      OD: { lids: ['lid-edema'], conjunctiva: ['diffuse-injection', 'papillae', 'chemosis', 'discharge-stringy'] },
      OS: { lids: ['lid-edema'], conjunctiva: ['diffuse-injection', 'papillae', 'chemosis', 'discharge-stringy'] },
    },
    external: { redEye: ['OD', 'OS'], tearing: ['OD', 'OS'] },
  }),
  essentialTests: ['slit-lamp'],
  helpfulTests: ['visual-acuity', 'fluorescein'],
  diagnosis: 'allergic-conjunctivitis',
  differentials: ['viral-conjunctivitis', 'bacterial-conjunctivitis', 'dry-eye', 'blepharitis'],
  urgency: 'routine',
  management:
    'Cold compresses, refrigerated lubricants, and no rubbing; wash face and hair after playing on grass. Start a dual-acting antihistamine/mast-cell stabiliser drop (e.g. olopatadine or ketotifen) through the pollen season, and next year begin before the season starts; his GP can manage the nose and chest. Review in 4–6 weeks; steroid drops only for severe flares under supervision, with pressure checks.',
  teachingPoints: [
    'Itch is the cardinal symptom of allergic eye disease — ask about it first.',
    'Papillae and chemosis, with no preauricular node, point to allergy; follicles plus a node point to a virus.',
    'Bilateral, seasonal, with hay fever or asthma: the history makes the diagnosis before the slit lamp does.',
    'Evert the upper lid in young boys: giant "cobblestone" papillae and a shield ulcer mean vernal keratoconjunctivitis.',
    'Chronic eye rubbing in an atopic child is a risk factor for keratoconus — teach him to stop now.',
  ],
  redFlags: [
    'Corneal shield ulcer or giant papillae (vernal disease).',
    'Long-term unsupervised steroid drops (raised pressure, cataract).',
  ],
  sources: [
    'https://www.ncbi.nlm.nih.gov/books/NBK470271/',
    'https://aao.org/education/preferred-practice-pattern/conjunctivitis-ppp-2023',
  ],
};

export default allergicConjCase;
