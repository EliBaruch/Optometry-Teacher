import { buildFindings, type ClinicalCase } from '@core';

/** Evaporative dry eye in a heavy screen user — the tear film, not the prescription. */
const dryEyeCase: ClinicalCase = {
  id: 'ant-dry-eye-tax-season',
  difficulty: 2,
  tags: ['dry-eye', 'ocular-surface', 'screen-use', 'chronic'],
  patient: {
    name: 'Priya Raman',
    age: 54,
    sex: 'F',
    occupation: 'Tax accountant',
    personality: 'Runs on spreadsheets and cardamom tea; apologises for taking up your time.',
    avatar: {
      skin: 3, hair: 'bun', hairColor: '#2b2522', irisColor: '#3b2416',
      glasses: 'half-rim', accessory: 'earrings', outfit: '#2f4a6d',
    },
  },
  chiefComplaint:
    "By four o'clock my eyes feel like they've been rolled in sand. I blink and the spreadsheet snaps back into focus — for about three seconds. And, ridiculously, they water.",
  history: [
    { id: 'timing', category: 'onset', q: 'When is it at its worst?', a: 'End of the workday, every day since tax season started. Weekends are much better. The air-con vent blows straight onto my desk.', relevance: 'key' },
    { id: 'screen', category: 'social', q: 'How many hours a day on screens?', a: "Ten, eleven. Two monitors. My colleague says I stare at them like a hawk and forget to blink.", relevance: 'key' },
    { id: 'fluctuate', category: 'symptoms', q: 'Does your vision come and go with blinking?', a: 'Yes! Blurry, blink, clear, blurry again. My glasses are new so it can’t be them.', relevance: 'key' },
    { id: 'itch-discharge', category: 'symptoms', q: 'Any itching or sticky discharge?', a: "Not itchy — burning. No gunk, just this silly watering.", relevance: 'key' },
    { id: 'sjogren', category: 'medical', q: 'Dry mouth, aching joints, or menopause?', a: 'Mouth is fine and my joints are fine. Menopause was three years ago.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Do you take any regular medicines?', a: 'An antihistamine most nights for my blocked nose. That’s all.', relevance: 'helpful' },
    { id: 'cl', category: 'ocular-history', q: 'Contact lenses or laser eye surgery?', a: 'I gave up contacts years ago — scratchy by lunchtime. Never had surgery.', relevance: 'helpful' },
    { id: 'flashes', category: 'symptoms', q: 'Any flashes or floaters?', a: 'No, nothing like that.', relevance: 'neutral' },
    { id: 'fhx', category: 'family', q: 'Any glaucoma in the family?', a: 'An aunt, I think? She had drops.', relevance: 'red-herring' },
  ],
  findings: buildFindings(54, {
    anterior: {
      OD: { lids: ['meibomian-dysfunction'], cornea: ['punctate-keratitis', 'reduced-tbut'], fluorescein: 'inferior-punctate', tbutSec: 4 },
      OS: { lids: ['meibomian-dysfunction'], cornea: ['punctate-keratitis', 'reduced-tbut'], fluorescein: 'inferior-punctate', tbutSec: 5 },
    },
    external: { tearing: ['OD', 'OS'] },
  }),
  essentialTests: ['slit-lamp', 'fluorescein'],
  helpfulTests: ['visual-acuity', 'phoropter'],
  diagnosis: 'dry-eye',
  differentials: ['allergic-conjunctivitis', 'viral-conjunctivitis', 'presbyopia', 'bacterial-conjunctivitis'],
  urgency: 'routine',
  management:
    'Explain the tear film: screens roughly halve the blink rate, and a dry surface triggers reflex watering. Fix the environment (redirect the vent, lower the monitor, 20-20-20 breaks with full blinks), start preservative-free lubricants 4–6×/day and warm compresses with lid massage for the meibomian glands, and ask her GP whether the nightly antihistamine can be changed. Review in 6–8 weeks and step up (cyclosporine or lifitegrast, in-office gland therapy, punctal plugs) if symptoms persist.',
  teachingPoints: [
    'Tear break-up time under 10 seconds is abnormal; 4–5 s points to an unstable, evaporative tear film.',
    'Watery eyes are a classic dry-eye symptom: the irritated surface drives reflex tearing.',
    'Vision that blurs and then clears with a blink is a tear-film problem, not a refractive one.',
    'Burning without itch, no discharge and no follicles or papillae steers you away from allergic and infective conjunctivitis.',
    'Look at the lid margins: meibomian gland dysfunction drives most evaporative dry eye, and treating it is part of the plan.',
  ],
  redFlags: [
    'Dry mouth with joint pain: screen for Sjögren syndrome.',
    'A persistent epithelial defect with reduced corneal sensation (neurotrophic keratopathy).',
  ],
  sources: [
    'https://aao.org/eyenet/article/the-tfos-dry-eye-workshop-ii',
    'https://pubmed.ncbi.nlm.nih.gov/28736335/',
  ],
};

export default dryEyeCase;
