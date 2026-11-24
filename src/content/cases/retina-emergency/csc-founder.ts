import { buildFindings, type ClinicalCase } from '@core';

/** Acute central serous chorioretinopathy: stress + corticosteroids, hyperopic shift, no RAPD. */
const cscFounder: ClinicalCase = {
  id: 'csc-founder',
  difficulty: 5,
  tags: ['blurred-vision', 'young-adult', 'macula', 'steroids', 'distortion'],
  patient: {
    name: 'Mateo Silva',
    age: 37,
    sex: 'M',
    occupation: 'Start-up founder (fintech, Series A next month)',
    personality: 'Talks fast, sleeps four hours, answers emails during the exam until you take his phone.',
    avatar: {
      skin: 2, hair: 'swept', hairColor: '#2a1c14', irisColor: '#4a3322',
      glasses: 'none', facialHair: 'stubble', headwear: 'none', accessory: 'none', outfit: '#1e2a3a',
    },
  },
  chiefComplaint:
    "There's a grey smudge in the centre of my left eye, like a thumbprint on a camera lens, and everything through it looks slightly smaller and dimmer. It started a week ago — the same week our lead investor pulled out. Coincidence, obviously.",
  history: [
    { id: 'onset', category: 'onset', q: 'When did it start, and was it sudden? One eye or both?', a: 'Last Monday, left eye only. I noticed it on a slide deck — the centre bar chart looked shrunken.', relevance: 'key' },
    { id: 'steroids', category: 'medications', q: 'Any steroid medicines — tablets, inhalers, nasal sprays, creams or injections?', a: "Huh. A steroid nasal spray for hay fever, every day, and a hydrocortisone cream for eczema on my hands. And my physio gave me a steroid shot in the shoulder a month ago. Do those count?", relevance: 'key' },
    { id: 'stress', category: 'social', q: 'How are sleep and stress at the moment?', a: "Stress is a ten. Sleep is a four — hours, not score. Six espressos to get to lunch.", relevance: 'key' },
    { id: 'pain-eom', category: 'symptoms', q: 'Any pain, especially when moving the eye? Are colours washed out?', a: 'No pain at all. Colours are maybe a touch dull in that spot, but red still looks red.', relevance: 'key' },
    { id: 'previous', category: 'ocular-history', q: 'Has this happened before? Any eye problems?', a: "Never. I've never even needed glasses — 20/20 at my last driving test.", relevance: 'helpful' },
    { id: 'flashes', category: 'symptoms', q: 'Any flashes, floaters or a curtain?', a: 'None of that. It is just the middle.', relevance: 'helpful' },
    { id: 'meds-other', category: 'medications', q: 'Anything else — supplements, pre-workout, erectile-dysfunction tablets?', a: 'Pre-workout powder sometimes. Nothing else.', relevance: 'neutral' },
    { id: 'screens', category: 'social', q: 'How many hours a day are you on screens?', a: "All of them. But I've done that for ten years and this is new.", relevance: 'red-herring' },
  ],
  findings: buildFindings(37, {
    va: {
      OD: { uncorrected: -0.1, bestCorrected: -0.1, pinhole: 0.0 },
      OS: { uncorrected: 0.3, bestCorrected: 0.2, pinhole: 0.2 },
    },
    refraction: {
      OD: { sphere: 0, cylinder: 0, axis: 180 },
      OS: { sphere: 0.75, cylinder: 0, axis: 180 },
    },
    amsler: { OS: { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 3 } },
    colorVision: { OS: { type: 'normal', severity: 'none', redDesaturation: false } },
    posterior: {
      OS: {
        lesions: [{ type: 'pigment-clumping', zone: 'macula', density: 1 }],
        detachment: { zones: ['macula'], maculaOff: true },
      },
    },
  }),
  essentialTests: ['amsler', 'ophthalmoscopy', 'visual-acuity'],
  helpfulTests: ['pupils', 'phoropter', 'pinhole', 'color-vision'],
  diagnosis: 'central-serous',
  differentials: ['hyperopia', 'optic-neuritis', 'wet-amd', 'retinal-detachment'],
  urgency: 'routine',
  management:
    'Acute central serous chorioretinopathy, left eye: a round serous blister of neurosensory retina at the macula, with a small hyperopic shift, mild metamorphopsia, no RAPD and no haemorrhage. Arrange OCT to confirm subretinal fluid (non-urgent retina referral, or within weeks if no OCT on site). Ask every prescriber to review the corticosteroids — never stop systemic steroids abruptly — and address sleep and stress. Most cases resolve in 3–4 months; persistent or recurrent fluid is referred for treatment such as photodynamic therapy.',
  teachingPoints: [
    'Think central serous in a young-to-middle-aged man with stress, a type-A life and ANY corticosteroid: sprays, creams, inhalers and joint injections all count.',
    'Fluid lifts the retina forward, shortening the eye optically: a new small hyperopic shift that partly improves acuity is a clue, not a cure — do not just prescribe glasses.',
    'No pain on eye movement, no RAPD, colours mostly preserved: that separates it from optic neuritis.',
    'A clear serous dome without blood or exudate in a 37-year-old is not wet AMD, and a shallow posterior pole blister without a break or curtain is not a rhegmatogenous detachment.',
  ],
  redFlags: ['Subretinal haemorrhage (consider choroidal neovascularisation)', 'Persistence beyond 3–4 months', 'Recurrent or bilateral disease'],
  sources: [
    'https://eyewiki.aao.org/Central_Serous_Chorioretinopathy',
  ],
};

export default cscFounder;
