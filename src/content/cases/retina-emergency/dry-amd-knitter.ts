import { buildFindings, type ClinicalCase } from '@core';

/** Advanced dry AMD: foveal-sparing geographic atrophy OD, large drusen OS. */
const dryAmdKnitter: ClinicalCase = {
  id: 'dry-amd-knitter',
  difficulty: 1,
  tags: ['elderly', 'gradual-vision-loss', 'reading', 'macula', 'low-vision'],
  patient: {
    name: 'Margit Svensson',
    age: 91,
    sex: 'F',
    occupation: 'Retired seamstress, champion knitter',
    personality: 'Knits a scarf for every great-grandchild; has strong opinions about acrylic yarn.',
    avatar: {
      skin: 0, hair: 'bun', hairColor: '#eeeae4', irisColor: '#6a8fb8',
      glasses: 'cat-eye', facialHair: 'none', headwear: 'none', accessory: 'necklace', outfit: '#9c4a5a',
    },
  },
  chiefComplaint:
    "I drop stitches now. I need the big lamp, then a bigger lamp. And the vicar's face at church — I know it's him by the voice, but the middle of him goes missing. It's been creeping up on me for two years, dear.",
  history: [
    { id: 'onset', category: 'onset', q: 'Did this come on suddenly, or slowly?', a: 'Slowly. Like a tide going out. Nothing sudden at all.', relevance: 'key' },
    { id: 'distortion', category: 'symptoms', q: 'Do straight lines look wavy or bent?', a: "No, not wavy. There are just bits missing beside the middle, as if the moths got at it.", relevance: 'key' },
    { id: 'smoking', category: 'social', q: 'Have you ever smoked?', a: 'Forty years of cigarettes, darling. Gave up when my husband did, in 1989.', relevance: 'key' },
    { id: 'family', category: 'family', q: 'Did anyone in your family have macular trouble?', a: 'My older sister Ingrid. She went "blind in the middle" in her eighties.', relevance: 'helpful' },
    { id: 'supplements', category: 'medications', q: 'Do you take any eye vitamins?', a: 'Cod liver oil, every morning since I was a girl. Nothing for the eyes in particular.', relevance: 'helpful' },
    { id: 'light', category: 'symptoms', q: 'Is it harder going from bright light into the dark?', a: "Terrible. Coming in from the garden I stand in the hall like a statue until the room comes back.", relevance: 'helpful' },
    { id: 'cataract', category: 'ocular-history', q: 'Have you had cataract surgery?', a: 'Both eyes, eight years ago. Marvellous at the time.', relevance: 'helpful' },
    { id: 'hallucinations', category: 'symptoms', q: 'Do you ever see things that you know are not really there?', a: "Sometimes little patterned wallpaper on blank walls. I didn't like to mention it — I'm not going dotty, am I?", relevance: 'neutral' },
    { id: 'yarn', category: 'social', q: 'Is it only dark-coloured yarn that is difficult?', a: 'Navy is impossible, but navy was always a beast.', relevance: 'red-herring' },
  ],
  findings: buildFindings(91, {
    va: {
      OD: { uncorrected: 0.5, bestCorrected: 0.3, pinhole: 0.3, nearUncorrected: 1.0 },
      OS: { uncorrected: 0.4, bestCorrected: 0.2, pinhole: 0.2, nearUncorrected: 0.9 },
    },
    refraction: {
      OD: { sphere: -0.5, cylinder: -0.75, axis: 100, add: 3.0 },
      OS: { sphere: -0.25, cylinder: -0.75, axis: 80, add: 3.0 },
    },
    anterior: {
      OD: { lens: ['iol'], lensGrade: 0 },
      OS: { lens: ['iol'], lensGrade: 0 },
    },
    pupils: { sizeLightMm: { OD: 2.5, OS: 2.5 }, sizeDarkMm: { OD: 4, OS: 4 } },
    amsler: {
      OD: { result: 'paracentral-scotoma', center: { x: 2, y: 0 }, radius: 2 },
      OS: { result: 'normal' },
    },
    posterior: {
      OD: {
        fundusTone: 'light',
        disc: { cdr: 0.35 },
        vessels: { avRatio: 0.6 },
        lesions: [
          { type: 'geographic-atrophy', zone: 'macula', density: 3 },
          { type: 'drusen-large', zone: 'macula', density: 3 },
          { type: 'pigment-clumping', zone: 'macula', density: 2 },
        ],
      },
      OS: {
        fundusTone: 'light',
        disc: { cdr: 0.35 },
        vessels: { avRatio: 0.6 },
        lesions: [
          { type: 'drusen-large', zone: 'macula', density: 4 },
          { type: 'drusen-small', zone: 'diffuse', density: 2 },
          { type: 'pigment-clumping', zone: 'macula', density: 1 },
        ],
      },
    },
  }),
  essentialTests: ['ophthalmoscopy', 'amsler'],
  helpfulTests: ['visual-acuity', 'pinhole', 'phoropter', 'slit-lamp'],
  diagnosis: 'dry-amd',
  differentials: ['wet-amd', 'cataract', 'diabetic-macular-edema', 'central-serous'],
  urgency: 'routine',
  management:
    'Advanced dry AMD: foveal-sparing geographic atrophy in the right eye, intermediate AMD (large drusen with pigment change) in the left. Start an AREDS2-formula supplement, update the spectacles with a stronger reading add, and refer to low-vision services (magnifiers, task lighting, contrast). Teach daily one-eye-at-a-time Amsler monitoring; a non-urgent retina referral can discuss complement-inhibitor injections for GA. Review in 6–12 months — sooner, same week, for any new distortion.',
  teachingPoints: [
    'Gradual, painless central loss with drusen and no fluid or blood = dry AMD. Sudden distortion is the signal for conversion to wet AMD.',
    'Foveal-sparing geographic atrophy can keep acuity at 20/40 while reading collapses — patches of absolute scotoma sit right beside fixation.',
    'AREDS2 (vitamins C and E, zinc, copper, lutein, zeaxanthin, no beta-carotene) is for intermediate AMD or advanced AMD in one eye — not for people with only a few small drusen.',
    'Her lenses are implants: a clear IOL removes cataract from the differential.',
    'Seeing formed patterns in areas of vision loss is Charles Bonnet syndrome — name it and reassure; it is common and not a mental illness.',
  ],
  redFlags: ['New metamorphopsia', 'Sudden drop in acuity', 'Haemorrhage at the macula'],
  sources: [
    'https://eyewiki.aao.org/Age-Related_Macular_Degeneration',
    'https://www.nei.nih.gov/research/clinical-trials/age-related-eye-disease-study-areds/areds-background-and-results',
  ],
};

export default dryAmdKnitter;
