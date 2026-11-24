import { buildFindings, type ClinicalCase } from '@core';

/** Metallic corneal foreign body with a rust ring — and the intraocular-foreign-body trap. */
const foreignBodyCase: ClinicalCase = {
  id: 'ant-foreign-body-grinder',
  difficulty: 2,
  tags: ['red-eye', 'painful', 'trauma', 'corneal', 'occupational'],
  patient: {
    name: 'Darek Kowalczyk',
    age: 44,
    sex: 'M',
    occupation: 'Metal fabricator',
    personality: 'Gruff, sheepish, and already knows what you’re going to say about goggles.',
    avatar: {
      skin: 1, hair: 'buzz', hairColor: '#5a4632', irisColor: '#7a8a6a',
      facialHair: 'beard', headwear: 'hard-hat', outfit: '#e06b1f',
    },
  },
  chiefComplaint:
    "I was grinding a bracket yesterday — goggles were on my head, not my eyes, before you say it. Now my left eye feels like there's a hot spark living in it.",
  history: [
    { id: 'task', category: 'onset', q: 'What were you doing exactly?', a: 'Angle grinder on mild steel. Sparks everywhere. Felt one land — a sting, then grit.', relevance: 'key' },
    { id: 'velocity', category: 'onset', q: 'Did anything hit at high speed, or were you hammering metal on metal?', a: 'No hammering — but that disc spins at ten thousand RPM, so the sparks come off quick. One hit hard enough to make me jump.', relevance: 'key' },
    { id: 'when', category: 'onset', q: 'How long ago?', a: 'About twenty hours. Thought it would wash out overnight.', relevance: 'key' },
    { id: 'vision', category: 'symptoms', q: 'How is the vision?', a: 'A bit misty. Mostly it just won’t stop watering.', relevance: 'helpful' },
    { id: 'attempts', category: 'ocular-history', q: 'Has anyone tried to remove it?', a: 'My mate had a go with the corner of a tissue. Scraped about a bit. Didn’t shift it, and it stung worse after.', relevance: 'helpful' },
    { id: 'cl', category: 'ocular-history', q: 'Do you wear contact lenses?', a: 'No.', relevance: 'helpful' },
    { id: 'tetanus', category: 'medical', q: 'Is your tetanus up to date?', a: 'Had a jab two years back when I cut my hand.', relevance: 'neutral' },
    { id: 'fhx', category: 'family', q: 'Any diabetes in the family?', a: 'My father, type 2.', relevance: 'red-herring' },
  ],
  findings: buildFindings(44, {
    va: { OS: { uncorrected: 0.1, bestCorrected: 0.1, pinhole: 0.1 } },
    anterior: {
      OS: {
        conjunctiva: ['diffuse-injection'],
        // Embedded iron fragment with its brown rust halo, plus the epithelial defect from
        // ~20 h of rubbing and the tissue-corner removal attempt — it lights up under cobalt.
        cornea: ['foreign-body', 'rust-ring'],
        anteriorChamber: { cells: 0.5 },
        fluorescein: 'focal',
      },
    },
    external: { redEye: ['OS'], tearing: ['OS'], photophobia: true },
  }),
  essentialTests: ['slit-lamp', 'visual-acuity', 'fluorescein', 'ophthalmoscopy'],
  helpfulTests: ['pupils', 'tonometry'],
  diagnosis: 'corneal-foreign-body',
  differentials: ['corneal-abrasion', 'microbial-keratitis', 'hsv-keratitis', 'anterior-uveitis'],
  urgency: 'urgent',
  management:
    'Same day: stain with fluorescein and run a Seidel test, evert both lids, then dilate and examine the fundus — a grinder fragment can penetrate, so have a low threshold for orbital CT (never MRI). If there is no penetration, remove the foreign body under topical anaesthetic at the slit lamp with a sterile needle or spud and clear the rust ring with a burr, or refer to eye casualty if it is deep or central. Topical antibiotic until healed, recheck in 24–48 hours, and supply polycarbonate safety eyewear.',
  teachingPoints: [
    'The brown halo around an iron fragment is a rust ring: it forms within hours, is toxic to the epithelium and must be removed.',
    'Grinding with a power tool counts as high-velocity, just like hammering metal on metal: always dilate to look for an intraocular foreign body, and have a low threshold for CT (never MRI).',
    'Fluorescein shows the epithelial defect around the site and the scuffs from rubbing; a negative Seidel test (no streaming of the dye) makes a leaking wound unlikely but cannot exclude a self-sealed entry — hence the dilated fundus exam.',
    'Mild anterior chamber cells a day after injury are a reaction, not uveitis; a white infiltrate around the site means infection.',
    'Staining alone looks like an abrasion — the embedded fragment at the slit lamp is what makes this a foreign body, and it changes the plan.',
  ],
  redFlags: [
    'Power-tool or hammering injury, an entry wound, or a lens or vitreous track — intraocular foreign body.',
    'Seidel-positive leak, peaked pupil or low pressure.',
    'Infiltrate around the site.',
  ],
  sources: [
    'https://www.msdmanuals.com/professional/injuries-poisoning/eye-trauma/corneal-abrasions-and-foreign-bodies',
    'https://www.aafp.org/pubs/afp/issues/2013/0115/p114.html',
    'https://www.ncbi.nlm.nih.gov/books/NBK532960/',
  ],
};

export default foreignBodyCase;
