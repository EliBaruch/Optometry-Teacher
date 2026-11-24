import { buildFindings, type ClinicalCase } from '@core';

/** V1 shingles with a positive Hutchinson sign, keratitis and anterior uveitis. */
const hzoCase: ClinicalCase = {
  id: 'ant-hzo-librarian',
  difficulty: 3,
  tags: ['red-eye', 'rash', 'viral', 'elderly', 'corneal'],
  patient: {
    name: 'Beatriz Santos',
    age: 79,
    sex: 'F',
    occupation: 'Retired librarian',
    personality: 'Has already read three websites about her rash and has follow-up questions.',
    avatar: {
      skin: 2, hair: 'bob', hairColor: '#d8d4cf', irisColor: '#5a4030',
      glasses: 'cat-eye', accessory: 'necklace', outfit: '#7a4b8c',
    },
  },
  chiefComplaint:
    "Four days ago one side of my forehead started burning like a sunburn. Now there are blisters up into my hair and on the tip of my nose, and my right eye is red, gritty and hates the light.",
  history: [
    { id: 'prodrome', category: 'onset', q: 'Did the pain come before the rash?', a: 'Yes — two days of burning and tingling in my scalp before a single spot. I thought it was a migraine.', relevance: 'key' },
    { id: 'midline', category: 'symptoms', q: 'Does the rash cross the middle of your forehead?', a: 'No. It stops dead at the midline, as if someone drew it with a ruler.', relevance: 'key' },
    { id: 'nose', category: 'symptoms', q: 'Any blisters on the tip or side of the nose?', a: 'One on the very tip. Is that bad?', relevance: 'key' },
    { id: 'chickenpox', category: 'medical', q: 'Did you have chickenpox? Any shingles vaccine?', a: 'Chickenpox with my sisters in 1952. I never got round to the vaccine.', relevance: 'key' },
    { id: 'immune', category: 'medical', q: 'Anything weakening your immune system — diabetes, steroids, chemotherapy?', a: 'Type 2 diabetes, on tablets. Nothing else.', relevance: 'helpful' },
    { id: 'vision', category: 'symptoms', q: 'How is the vision in that eye?', a: 'Blurrier than usual, and bright light makes it ache.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'What medicines do you take?', a: 'Metformin and amlodipine.', relevance: 'neutral' },
    { id: 'fhx', category: 'family', q: 'Any glaucoma in the family?', a: 'My brother had cataracts, if that counts.', relevance: 'red-herring' },
  ],
  findings: buildFindings(79, {
    va: {
      OD: { uncorrected: 0.5, bestCorrected: 0.2, pinhole: 0.2 },
      OS: { uncorrected: 0.4, bestCorrected: 0.1, pinhole: 0.1 },
    },
    refraction: {
      OD: { sphere: 1.5, cylinder: -0.5, axis: 90 },
      OS: { sphere: 1.5, cylinder: -0.5, axis: 90 },
    },
    anterior: {
      OD: {
        lids: ['vesicles', 'lid-edema'],
        conjunctiva: ['diffuse-injection'],
        cornea: ['punctate-keratitis'],
        fluorescein: 'diffuse-punctate',
        anteriorChamber: { cells: 1, flare: 1 },
      },
    },
    iop: { OD: 19, OS: 15 },
    external: { rash: 'forehead-dermatomal', redEye: ['OD'], tearing: ['OD'], photophobia: true },
  }),
  essentialTests: ['slit-lamp', 'fluorescein'],
  helpfulTests: ['visual-acuity', 'tonometry', 'pupils', 'motility', 'ophthalmoscopy'],
  diagnosis: 'herpes-zoster-ophthalmicus',
  differentials: ['hsv-keratitis', 'anterior-uveitis', 'bacterial-conjunctivitis', 'viral-conjunctivitis'],
  urgency: 'urgent',
  management:
    'Start an oral antiviral today (valacyclovir 1 g three times daily or acyclovir 800 mg 5×/day for 7–10 days) — ideally within 72 hours of the rash, but still worthwhile now with active eye involvement. Arrange same- or next-day ophthalmology for the keratitis and uveitis (topical steroid and cycloplegic under specialist care, with pressure monitoring). Involve her GP for pain control and diabetes, and recommend the recombinant zoster vaccine once she has recovered.',
  teachingPoints: [
    'Hutchinson sign — vesicles on the tip or side of the nose (nasociliary branch) — strongly predicts eye involvement.',
    'Shingles respects the midline and a dermatome; prodromal pain often precedes the rash by days.',
    'Zoster pseudodendrites are raised, stain poorly and lack the terminal bulbs of herpes simplex dendrites.',
    'Check pressure: zoster uveitis and trabeculitis can push it up, and corneal sensation may be reduced.',
  ],
  redFlags: [
    'Reduced vision, uveitis or raised pressure.',
    'Immunosuppression, or restricted eye movements and ptosis beyond lid swelling.',
    'Retinal whitening (acute retinal necrosis).',
  ],
  sources: [
    'https://eyewiki.aao.org/Herpes_Zoster_Ophthalmicus',
  ],
};

export default hzoCase;
