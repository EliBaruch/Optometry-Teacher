import { buildFindings, type ClinicalCase } from '@core';

/** A worried 12-year-old with lifelong vitreous floaters: the whole exam is normal. */
const healthyFloatersKid: ClinicalCase = {
  id: 'healthy-floaters-kid',
  difficulty: 2,
  tags: ['paediatric', 'floaters', 'reassurance', 'normal-exam'],
  patient: {
    name: 'Amara Diallo',
    age: 12,
    sex: 'F',
    occupation: 'Year 7 student, aspiring astronaut',
    personality: 'Reads everything on the internet, asks better questions than most adults, braver than she feels.',
    avatar: {
      skin: 4, hair: 'braids', hairColor: '#1a1210', irisColor: '#2c1a10',
      glasses: 'none', facialHair: 'none', headwear: 'beanie', accessory: 'earrings', outfit: '#e0a93b',
    },
  },
  chiefComplaint:
    "When I look at the sky there are see-through squiggly worms that slide away when I try to look at them, and sometimes tiny bright dots zooming about. My grandma's retina came off last year and I read online that floaters mean that. Is mine going to come off?",
  triageNote: 'Attends with her mother. School vision screening passed in September.',
  history: [
    { id: 'onset', category: 'onset', q: 'When did you first notice the squiggly worms? Is it new?', a: "I think I've always had them? I only really looked properly after Grandma's operation. They haven't changed.", relevance: 'key' },
    { id: 'sudden', category: 'symptoms', q: 'Has there been a sudden shower of new floaters, or flashes of light like lightning?', a: 'No shower. No lightning. The bright dots are only against blue sky — they wiggle along little paths.', relevance: 'key' },
    { id: 'curtain', category: 'symptoms', q: 'Is any part of your vision missing or covered by a shadow?', a: "No. I tested myself covering each eye like the video said. It's all there.", relevance: 'key' },
    { id: 'trauma', category: 'onset', q: 'Have you hit your eye or head — sports, falls?', a: 'I play netball, but nothing hit my face. Mum checked my whole netball history.', relevance: 'key' },
    { id: 'grandma', category: 'family', q: 'What happened with Grandma\'s eye?', a: "She's seventy-eight and very short-sighted, and she'd had a cataract operation. Mum says it happened after that.", relevance: 'helpful' },
    { id: 'family-myopia', category: 'family', q: 'Is anyone else in the family very short-sighted, or have joint or hearing problems?', a: 'Mum wears glasses for driving. Nobody has bendy joints or hearing aids.', relevance: 'helpful' },
    { id: 'headache', category: 'symptoms', q: 'Any headaches, double vision or blurry vision?', a: 'Only a headache when I forget to drink water at school.', relevance: 'neutral' },
    { id: 'screen', category: 'social', q: 'Does too much tablet time cause floaters?', a: "Mum says yes. I say that's not a scientific source.", relevance: 'red-herring' },
  ],
  findings: buildFindings(12, {
    va: {
      OD: { uncorrected: -0.1, bestCorrected: -0.1, pinhole: 0.0, nearUncorrected: 0.0 },
      OS: { uncorrected: -0.1, bestCorrected: -0.1, pinhole: 0.0, nearUncorrected: 0.0 },
    },
    refraction: {
      OD: { sphere: 0.5, cylinder: 0, axis: 180 },
      OS: { sphere: 0.5, cylinder: -0.25, axis: 180 },
    },
    pupils: { sizeLightMm: { OD: 3.5, OS: 3.5 }, sizeDarkMm: { OD: 7, OS: 7 } },
    posterior: {
      OD: { fundusTone: 'dark', disc: { cdr: 0.25 } },
      OS: { fundusTone: 'dark', disc: { cdr: 0.25 } },
    },
  }),
  essentialTests: ['ophthalmoscopy', 'visual-acuity'],
  helpfulTests: ['slit-lamp', 'pupils', 'visual-fields', 'retinoscopy'],
  diagnosis: 'healthy-eyes',
  differentials: ['pvd', 'retinal-tear', 'retinal-detachment', 'myopia'],
  urgency: 'routine',
  management:
    'Healthy eyes: normal acuity, low physiological hyperopia, clear vitreous with no pigment or blood, flat retina to the periphery and full fields. Explain physiological floaters (normal vitreous strands) and the blue-field entoptic phenomenon (white blood cells moving through retinal capillaries, seen against blue sky). Give simple warning signs for the future, write to reassure the family, and recall for a routine eye exam in 1–2 years.',
  teachingPoints: [
    'Restraint is a skill: a normal dilated exam with full fields and no vitreous pigment means reassurance, not referral.',
    'Long-standing, unchanged floaters that slide away when you look at them are physiological vitreous condensations; new showers, flashes or a curtain are what matter.',
    'Bright dots darting along curved paths against blue sky are white blood cells in retinal capillaries (blue-field entoptic phenomenon) — a normal finding.',
    'A grandparent\'s detachment after cataract surgery in high myopia is not a hereditary risk for a mildly hyperopic child; ask about Stickler features (high myopia, joint, hearing or palate problems) when there is a strong family story.',
    'PVD is rare at 12; tears need trauma, high myopia or a syndrome — she has none.',
  ],
  sources: [
    'https://eyewiki.aao.org/Posterior_Vitreous_Detachment',
    'https://eyewiki.aao.org/Retinal_Detachment',
  ],
};

export default healthyFloatersKid;
