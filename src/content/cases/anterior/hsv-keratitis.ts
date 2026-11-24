import { buildFindings, type ClinicalCase } from '@core';

/** Recurrent HSV epithelial keratitis — and a dangerous bottle of old steroid drops. */
const hsvCase: ClinicalCase = {
  id: 'ant-hsv-dendrite-barista',
  difficulty: 3,
  tags: ['red-eye', 'corneal', 'viral', 'recurrent', 'steroid-trap'],
  patient: {
    name: 'Leila Haddad',
    age: 27,
    sex: 'F',
    occupation: 'Barista and spoken-word poet',
    personality: 'Describes her symptoms in vivid metaphors, then apologises for being dramatic.',
    avatar: {
      skin: 2, hair: 'curly', hairColor: '#2b1d16', irisColor: '#4a2e1c',
      accessory: 'earrings', outfit: '#8a3b5c',
    },
  },
  chiefComplaint:
    "My right eye has been watery and scratchy for two days, and the café lights are suddenly brutal. Weirdly, it doesn't hurt as much as it looks like it should.",
  history: [
    { id: 'laterality', category: 'onset', q: 'One eye or both, and since when?', a: 'Only the right. Started two days ago.', relevance: 'key' },
    { id: 'coldsores', category: 'ocular-history', q: 'Do you get cold sores?', a: 'Since I was a kid. Had one last week — exam stress.', relevance: 'key' },
    { id: 'previous', category: 'ocular-history', q: 'Has this eye had anything like this before?', a: 'Two years ago. A doctor gave me drops and it took ages to settle.', relevance: 'key' },
    { id: 'steroid', category: 'medications', q: 'Are you using any drops now — especially steroid drops?', a: 'I still have the old bottle… “Pred” something? I was going to start it tonight. Should I?', relevance: 'key' },
    { id: 'discharge', category: 'symptoms', q: 'Any discharge?', a: 'Just watery.', relevance: 'helpful' },
    { id: 'cl', category: 'ocular-history', q: 'Do you wear contact lenses?', a: 'Daily disposables. I took them out the moment it started.', relevance: 'helpful' },
    { id: 'uri', category: 'medical', q: 'Any recent cold or fever?', a: 'Just run down. Too many night shifts.', relevance: 'neutral' },
    { id: 'fhx', category: 'family', q: 'Any eye disease in the family?', a: 'Mum is very short-sighted.', relevance: 'red-herring' },
  ],
  findings: buildFindings(27, {
    va: {
      OD: { uncorrected: 0.7, bestCorrected: 0.2, pinhole: 0.3 },
      OS: { uncorrected: 0.7, bestCorrected: -0.1, pinhole: 0.2 },
    },
    refraction: {
      OD: { sphere: -2.0, cylinder: 0, axis: 180 },
      OS: { sphere: -2.0, cylinder: 0, axis: 180 },
    },
    anterior: {
      OD: {
        conjunctiva: ['diffuse-injection'],
        cornea: ['dendrite'],
        fluorescein: 'dendritic',
        anteriorChamber: { cells: 0.5 },
      },
    },
    external: { redEye: ['OD'], tearing: ['OD'], photophobia: true },
  }),
  essentialTests: ['fluorescein', 'slit-lamp'],
  helpfulTests: ['visual-acuity', 'tonometry'],
  diagnosis: 'hsv-keratitis',
  differentials: ['viral-conjunctivitis', 'corneal-abrasion', 'herpes-zoster-ophthalmicus', 'microbial-keratitis', 'anterior-uveitis'],
  urgency: 'urgent',
  management:
    'Start an antiviral today: ganciclovir 0.15% gel 5×/day until the epithelium heals, or oral acyclovir 400 mg 5×/day (valacyclovir 500 mg three times daily), which avoids drop toxicity. No steroid drops for epithelial disease — tell her to throw the old bottle away — and no contact lenses until healed. Review within a week (sooner if worse) and, given recurrences, discuss long-term oral acyclovir prophylaxis with the cornea service.',
  teachingPoints: [
    'A branching dendrite with terminal bulbs that stains with fluorescein is herpes simplex until proven otherwise.',
    'Corneal sensation is reduced: test it before any anaesthetic drop — it explains why the pain seems out of proportion (too little).',
    'Steroids on an active dendrite can turn it into a large geographic ulcer — one of the classic iatrogenic disasters.',
    'Zoster pseudodendrites are raised, stain poorly and lack terminal bulbs; adenovirus gives follicles and a node, not a dendrite.',
    'Long-term oral acyclovir roughly halves recurrences in patients with repeated episodes.',
  ],
  redFlags: [
    'Steroid use on epithelial disease.',
    'Stromal haze, thinning or a non-healing epithelial defect.',
    'Raised pressure or anterior uveitis.',
  ],
  sources: [
    'https://eyewiki.aao.org/Herpes_Simplex_Virus_Keratitis',
    'https://www.msdmanuals.com/professional/eye-disorders/corneal-disorders/herpes-simplex-keratitis',
  ],
};

export default hsvCase;
