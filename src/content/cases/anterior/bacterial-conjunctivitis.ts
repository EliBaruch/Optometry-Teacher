import { buildFindings, type ClinicalCase } from '@core';

/** Mucopurulent conjunctivitis — the cornea must be clear for this to stay routine. */
const bacterialConjCase: ClinicalCase = {
  id: 'ant-bacterial-conj-wedding-planner',
  difficulty: 1,
  tags: ['red-eye', 'conjunctivitis', 'discharge', 'infection'],
  patient: {
    name: 'Grace Okafor',
    age: 41,
    sex: 'F',
    occupation: 'Wedding planner',
    personality: 'Answers your questions while texting a florist; magnificently unflappable.',
    avatar: {
      skin: 5, hair: 'braids', hairColor: '#1a1110', irisColor: '#2a1a10',
      accessory: 'earrings', outfit: '#b0436e',
    },
  },
  chiefComplaint:
    "I had to peel my left eye open with a warm flannel this morning — yellow-green gunk, lashes glued together. Three weddings this weekend and I look like a pirate.",
  history: [
    { id: 'onset', category: 'onset', q: 'When did it start — one eye or both?', a: 'Yesterday afternoon, just the left. The right one is behaving itself so far.', relevance: 'key' },
    { id: 'discharge', category: 'symptoms', q: 'What is the discharge like?', a: 'Thick and yellowy. I wipe it and ten minutes later it’s back.', relevance: 'key' },
    { id: 'pain', category: 'symptoms', q: 'Any pain, light sensitivity or loss of vision?', a: 'Gritty, not painful. Light is fine. It’s blurry until I blink the goo away, then it’s clear.', relevance: 'key' },
    { id: 'cl', category: 'ocular-history', q: 'Do you wear contact lenses?', a: 'Never. Reading glasses for menus, that’s it.', relevance: 'key' },
    { id: 'itch', category: 'symptoms', q: 'Is it itchy?', a: "A little, but it's not my hay-fever itch.", relevance: 'helpful' },
    { id: 'contacts', category: 'social', q: 'Anyone around you with a red eye?', a: 'My niece had pink eye last week and I was cuddling her all through the christening.', relevance: 'helpful' },
    { id: 'cold', category: 'medical', q: 'Any recent cold or sore throat?', a: 'No, I’m never ill — I don’t have time to be.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Any medicines or allergies?', a: 'Nothing regular. Allergic to nothing except bad DJs.', relevance: 'neutral' },
    { id: 'fhx', category: 'family', q: 'Any glaucoma in the family?', a: 'Not that I know of.', relevance: 'red-herring' },
  ],
  findings: buildFindings(41, {
    va: { OS: { uncorrected: 0.1, bestCorrected: 0.0, pinhole: 0.0 } },
    anterior: {
      OS: {
        lids: ['lid-edema'],
        conjunctiva: ['diffuse-injection', 'papillae', 'discharge-mucopurulent'],
      },
    },
    external: { redEye: ['OS'] },
  }),
  essentialTests: ['slit-lamp', 'visual-acuity'],
  helpfulTests: ['fluorescein'],
  diagnosis: 'bacterial-conjunctivitis',
  differentials: ['viral-conjunctivitis', 'allergic-conjunctivitis', 'microbial-keratitis', 'hordeolum'],
  urgency: 'routine',
  management:
    'Clean the lids with cooled boiled water, strict hand hygiene, no shared towels or eye make-up. Most cases settle within a week on their own; a broad-spectrum topical antibiotic (e.g. chloramphenicol, or polymyxin B/trimethoprim 4×/day for 5–7 days) shortens the course and is reasonable for her work. Return at once if pain, light sensitivity or reduced vision develop, or if it is no better in 3–5 days.',
  teachingPoints: [
    'Mucopurulent discharge with lids stuck shut and no preauricular node is the bacterial pattern; watery discharge with follicles and a node is viral.',
    'The cornea must be clear: any white infiltrate or staining turns "conjunctivitis" into keratitis.',
    'Itch is the hallmark of allergy; a little itch with pus is still infective.',
    'Hyperacute, copious pus with chemosis suggests gonococcus — same-day culture and systemic treatment.',
    'Steroid drops have no place in bacterial conjunctivitis.',
  ],
  redFlags: [
    'Hyperacute copious discharge (gonococcal) — same day.',
    'A newborn with conjunctivitis.',
    'Contact lens wearer with pain or photophobia — examine for keratitis.',
    'Reduced vision or a corneal infiltrate.',
  ],
  sources: [
    'https://www.ncbi.nlm.nih.gov/books/NBK546683/',
    'https://eyewiki.aao.org/Bacterial_Conjunctivitis',
    'https://aao.org/education/preferred-practice-pattern/conjunctivitis-ppp-2023',
  ],
};

export default bacterialConjCase;
