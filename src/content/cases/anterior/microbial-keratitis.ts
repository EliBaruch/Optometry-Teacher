import { buildFindings, type ClinicalCase } from '@core';

/** Contact-lens-related bacterial keratitis — a sight-threatening race against the clock. */
const microbialKeratitisCase: ClinicalCase = {
  id: 'ant-microbial-keratitis-dj',
  difficulty: 4,
  tags: ['red-eye', 'painful', 'contact-lens', 'corneal', 'infection', 'sight-threatening', 'time-critical'],
  patient: {
    name: 'River Coleman',
    age: 22,
    sex: 'X',
    occupation: 'Sound-design student and weekend DJ',
    personality: 'Sunglasses on indoors — for once, with a very good reason.',
    avatar: {
      skin: 4, hair: 'afro', hairColor: '#1c140f', irisColor: '#3a2614',
      accessory: 'earrings', outfit: '#7c3aed',
    },
  },
  chiefComplaint:
    "My right eye is on fire. Light feels like knives, it's blurry, and there's a white spot on it I can see in the mirror. I… might have slept in my contacts after a few gigs. Most gigs.",
  triageNote: 'Front desk: walked in holding a hand over the right eye; contact lens case in pocket. Tech photo: white spot ~2.5 mm across, its edge ~2 mm from the centre of the cornea.',
  history: [
    { id: 'cl-habits', category: 'ocular-history', q: 'Tell me about your contact lens habits.', a: 'Monthlies. I sleep in them after gigs, and when the solution runs out I rinse the case with tap water.', relevance: 'key' },
    { id: 'onset', category: 'onset', q: 'When did this start, and how fast is it changing?', a: 'Scratchy yesterday morning. Since then it’s gone off a cliff.', relevance: 'key' },
    { id: 'pain', category: 'symptoms', q: 'How bad is the pain?', a: 'Eight out of ten. It woke me up at 4 a.m.', relevance: 'key' },
    { id: 'discharge', category: 'symptoms', q: 'Any discharge?', a: 'Yellowish goo in the corner.', relevance: 'helpful' },
    { id: 'water', category: 'social', q: 'Swimming or hot tubs in your lenses?', a: 'Festival hot tub last weekend. In lenses, yes.', relevance: 'helpful' },
    { id: 'plant', category: 'onset', q: 'Any scratch from a plant, twig or soil?', a: 'No, nothing like that.', relevance: 'helpful' },
    { id: 'drops', category: 'medications', q: 'Have you put anything in the eye?', a: 'Some old redness-relief drops from my gig bag. They made it sting.', relevance: 'helpful' },
    { id: 'fhx', category: 'family', q: 'Any glaucoma in the family?', a: 'No idea, honestly.', relevance: 'red-herring' },
  ],
  findings: buildFindings(22, {
    va: {
      OD: { uncorrected: 1.3, bestCorrected: 1.0, pinhole: 1.0 },
      OS: { uncorrected: 1.2, bestCorrected: -0.1, pinhole: 0.2 },
    },
    refraction: {
      OD: { sphere: -3.0, cylinder: 0, axis: 180 },
      OS: { sphere: -3.0, cylinder: 0, axis: 180 },
    },
    pupils: { sizeLightMm: { OD: 2.5 }, sizeDarkMm: { OD: 4 } },
    anterior: {
      OD: {
        lids: ['lid-edema'],
        conjunctiva: ['diffuse-injection', 'ciliary-flush', 'discharge-mucopurulent'],
        cornea: ['ulcer', 'infiltrate', 'edema'],
        anteriorChamber: { cells: 2, flare: 1 },
        fluorescein: 'round-ulcer',
      },
    },
    redReflex: { OD: 'dull' },
    external: { redEye: ['OD'], tearing: ['OD'], photophobia: true, squinting: true },
  }),
  essentialTests: ['slit-lamp', 'fluorescein', 'visual-acuity'],
  helpfulTests: ['pupils'],
  diagnosis: 'microbial-keratitis',
  differentials: ['corneal-abrasion', 'hsv-keratitis', 'anterior-uveitis', 'bacterial-conjunctivitis'],
  urgency: 'urgent',
  management:
    'Stop all contact lens wear and keep the lenses and case for culture. Same-day referral to a cornea or eye casualty service: this paracentral ulcer meets the "1-2-3" culture rule (≥1+ cells, ≥2 mm infiltrate, within 3 mm of centre), so it needs scraping for Gram stain and culture, then hourly broad-spectrum antibiotic drops day and night (a fluoroquinolone, or fortified vancomycin plus tobramycin). No patching and no steroids at presentation; daily review until improving.',
  teachingPoints: [
    'Contact lens wearer + pain + photophobia + a white stromal infiltrate with an overlying staining defect = microbial keratitis until proven otherwise.',
    'Overnight wear and tap water are the big risk factors; Pseudomonas can melt a cornea within 24–48 hours.',
    'Sterile contact-lens infiltrates are small, peripheral, with little staining, pain or chamber reaction — this is none of those.',
    'Pain out of proportion, a ring infiltrate and water exposure (hot tubs, tap water) should raise Acanthamoeba.',
    'Never patch a contact-lens-related corneal defect.',
  ],
  redFlags: [
    'Hypopyon, corneal thinning or perforation.',
    'Ring infiltrate or radial perineuritis (Acanthamoeba).',
    'Feathery margins or satellite lesions (fungal).',
  ],
  emergency: { timeLimitSec: 150 },
  sources: [
    'https://eyewiki.aao.org/Bacterial_Keratitis',
    'https://eyewiki.aao.org/Pseudomonas_Keratitis',
  ],
};

export default microbialKeratitisCase;
