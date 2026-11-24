import { buildFindings, type ClinicalCase } from '@core';

/** Embolic CRAO in a patient with AF off anticoagulation: a stroke of the eye. */
const craoChoir: ClinicalCase = {
  id: 'crao-choir',
  difficulty: 3,
  tags: ['sudden-vision-loss', 'painless', 'stroke', 'rapd', 'emergency', 'elderly'],
  patient: {
    name: 'Kwame Asante',
    age: 72,
    sex: 'M',
    occupation: 'Retired choir director',
    personality: 'Hums when nervous, dignified even in fear, calls everyone "my friend".',
    avatar: {
      skin: 5, hair: 'bald', hairColor: '#cfcac4', irisColor: '#24140c',
      glasses: 'square', facialHair: 'beard', headwear: 'none', accessory: 'hearing-aid', outfit: '#5a3f7a',
    },
  },
  chiefComplaint:
    "About fifty minutes ago, at rehearsal, my right eye went dark — like someone lowered a blind. No pain, my friend. I can see your hand moving, but not your face. My daughter drove me straight here.",
  triageNote: 'Onset 09:10 by the patient\'s watch. Arrived 10:00.',
  history: [
    { id: 'onset-time', category: 'onset', q: 'Exactly when did it happen, and was it instant?', a: 'Ten past nine. Right in the middle of the big finale, instantly. One eye only.', relevance: 'key' },
    { id: 'amaurosis', category: 'ocular-history', q: 'Have you ever had brief episodes of vision going grey or black that came back?', a: 'Twice last month the right eye greyed out for a few minutes, then came back. I thought it was the stage lights.', relevance: 'key' },
    { id: 'gca', category: 'symptoms', q: 'Any new headache, scalp tenderness, jaw pain on chewing, weight loss or aching shoulders?', a: 'None of those. My jaw is fine — I sang this morning.', relevance: 'key' },
    { id: 'heart', category: 'medical', q: 'Any heart rhythm problems, stroke, carotid disease or blood thinners?', a: 'An irregular heartbeat — atrial something. They gave me a blood thinner, but I stopped it two months ago after a nosebleed.', relevance: 'key' },
    { id: 'neuro', category: 'symptoms', q: 'Any weakness, numbness, speech trouble or facial droop?', a: 'No, nothing like that. My voice is all there.', relevance: 'key' },
    { id: 'pain', category: 'symptoms', q: 'Is the eye painful or red?', a: 'No pain. It looks like a perfectly normal eye.', relevance: 'helpful' },
    { id: 'vascular', category: 'medical', q: 'Blood pressure, diabetes, cholesterol, smoking?', a: 'Blood pressure and cholesterol, yes. Never smoked — bad for the voice.', relevance: 'helpful' },
    { id: 'flashes', category: 'symptoms', q: 'Any flashes or floaters before it went dark?', a: 'No flashes. No floaters. Just — gone.', relevance: 'neutral' },
    { id: 'lights', category: 'social', q: 'Could the bright stage lights have dazzled you?', a: 'I thought so at first. But dazzle fades, and this has not.', relevance: 'red-herring' },
  ],
  findings: buildFindings(72, {
    va: {
      OD: { uncorrected: 1.9, bestCorrected: 1.9, pinhole: 1.9, nearUncorrected: 1.9 },
      OS: { uncorrected: 0.2, bestCorrected: 0.0, pinhole: 0.1, nearUncorrected: 0.7 },
    },
    refraction: {
      OD: { sphere: 0.75, cylinder: -0.5, axis: 90, add: 2.5 },
      OS: { sphere: 0.75, cylinder: -0.5, axis: 85, add: 2.5 },
    },
    pupils: { rapd: 'OD', rapdGrade: 3, reactivity: { OD: 'sluggish', OS: 'brisk' } },
    // No cilioretinal sparing: dense central / near-total loss with only a residual temporal island.
    fields: { OD: 'central-scotoma' },
    amsler: { OD: { result: 'central-scotoma', center: { x: 0, y: 0 }, radius: 10 } },
    colorVision: { OD: { type: 'acquired-red-green', severity: 'severe' } },
    posterior: {
      OD: {
        fundusTone: 'dark',
        vessels: { avRatio: 0.35, segmentation: true },
        lesions: [
          { type: 'retinal-whitening', zone: 'diffuse', density: 4 },
          { type: 'cherry-red-spot', zone: 'macula', density: 3 },
          { type: 'hollenhorst-plaque', zone: 'disc', density: 1 },
        ],
      },
      OS: { fundusTone: 'dark', vessels: { avRatio: 0.6 } },
    },
  }),
  essentialTests: ['visual-acuity', 'pupils', 'ophthalmoscopy'],
  helpfulTests: ['visual-fields', 'tonometry', 'amsler', 'slit-lamp'],
  diagnosis: 'crao',
  differentials: ['giant-cell-arteritis', 'crvo', 'retinal-detachment', 'optic-neuritis'],
  urgency: 'emergency',
  management:
    'Acute central retinal artery occlusion, right eye — an ocular stroke. Send him immediately to the nearest stroke-centre emergency department (call ahead, do not book a clinic appointment): he is within the window where thrombolysis may be considered, and he needs urgent brain imaging, carotid imaging, ECG/rhythm monitoring and a decision about anticoagulation. Request ESR, CRP and platelets the same day to exclude giant cell arteritis. Arrange follow-up for neovascularisation of the iris and angle over the coming weeks.',
  teachingPoints: [
    'Sudden painless monocular loss + dense RAPD + whitened retina + cherry-red spot = CRAO. It is a stroke: send to a stroke centre, not a routine eye clinic.',
    'The cherry-red spot is normal choroid showing through the thin fovea, ringed by oedematous, whitened inner retina. Without a cilioretinal artery the field is a dense central loss with only a small temporal island; a patent cilioretinal artery can spare the centre and keep good acuity.',
    'Earlier transient blackouts (amaurosis fugax) were warning emboli. The embolus type points to the source: a bright Hollenhorst plaque is cholesterol, usually from the carotid, while AF throws fibrin-platelet clots. Both can coexist, which is why he gets carotid imaging AND rhythm monitoring.',
    'Over 50 with an artery occlusion: always ask the giant cell arteritis questions and check ESR/CRP — arteritic disease can take the other eye within days.',
    'CRVO shows haemorrhages everywhere ("blood and thunder"); CRAO shows a pale, bloodless retina with box-carred arterioles.',
  ],
  redFlags: ['Onset within hours (treatment window)', 'Atrial fibrillation off anticoagulation', 'Prior amaurosis fugax', 'Any giant cell arteritis symptoms'],
  emergency: { timeLimitSec: 120 },
  sources: [
    'https://eyewiki.aao.org/Retinal_Artery_Occlusion',
    'https://www.ncbi.nlm.nih.gov/books/NBK470354/',
    'https://professional.heart.org/en/guidelines-statements/management-of-central-retinal-artery-occlusion-a-scientific-statement-from-thestr0000000000000366',
  ],
};

export default craoChoir;
