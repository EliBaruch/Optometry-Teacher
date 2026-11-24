import { buildFindings, type ClinicalCase } from '@core';

/** Acute left homonymous hemianopia from a right occipital stroke, within the treatment window. */
const homonymousStroke: ClinicalCase = {
  id: 'homonymous-hemianopia-acute-stroke',
  difficulty: 4,
  tags: ['sudden-vision-loss', 'neuro', 'emergency', 'stroke', 'visual-field', 'elderly'],
  patient: {
    name: 'Ahmed Farouk',
    age: 71,
    sex: 'M',
    occupation: 'Retired taxi driver, crossword champion of his street',
    personality: 'Courteous and stubborn; insists it is his left eye and that new glasses will fix it.',
    avatar: {
      skin: 3,
      hair: 'short',
      hairColor: '#d9d4cc',
      irisColor: '#3a2414',
      glasses: 'aviator',
      facialHair: 'moustache',
      headwear: 'none',
      accessory: 'none',
      outfit: '#64748b',
    },
  },
  chiefComplaint:
    "At ten o'clock this morning, halfway through the crossword, the left half of the page simply vanished. My left eye has gone wrong. I keep walking into the left side of the door frame. My wife made me come straight here.",
  triageNote: 'Walk-in, accompanied by wife. Onset approximately 2 hours ago. BP 172/96, pulse irregular.',
  history: [
    { id: 'time', category: 'onset', q: 'Exactly what time did this start, and when were you last completely normal?', a: 'Ten o\'clock, I looked at the clock because I was timing the crossword. Before that, perfect.', relevance: 'key' },
    { id: 'each-eye', category: 'symptoms', q: 'If you cover your left eye, is the right eye completely normal?', a: '...Ah. No. When I cover the left eye, the left side is still missing. How strange.', relevance: 'key' },
    { id: 'af', category: 'medical', q: 'Do you have an irregular heartbeat, high blood pressure, or take a blood thinner?', a: 'Atrial fibrillation, yes. I stopped the apixaban a month ago because of nosebleeds. I was going to tell the doctor.', relevance: 'key' },
    { id: 'fast', category: 'symptoms', q: 'Any weakness, numbness, face drooping, slurred speech or trouble finding words?', a: 'Wife: "His speech is fine. He lifted both arms for me in the car — I checked, I watch the adverts."', relevance: 'key' },
    { id: 'pain', category: 'symptoms', q: 'Any eye pain, headache, flashes, floaters or a curtain?', a: 'No pain. No flashing. Just a dark half, like someone drew a curtain down the middle of the world.', relevance: 'helpful' },
    { id: 'gca', category: 'symptoms', q: 'Any jaw pain on chewing, scalp tenderness or recent weight loss?', a: 'No, none.', relevance: 'helpful' },
    { id: 'previous', category: 'ocular-history', q: 'Any previous eye problems?', a: 'Reading glasses only. Cataracts "starting", the optician said two years ago.', relevance: 'neutral' },
    { id: 'tea', category: 'social', q: 'How much tea do you drink?', a: 'Eight cups. Sweet. My wife has asked me this many times. Is she paying you?', relevance: 'red-herring' },
  ],
  findings: buildFindings(71, {
    va: {
      OD: { uncorrected: 0.2, bestCorrected: 0.1, pinhole: 0.1, nearUncorrected: 0.7 },
      OS: { uncorrected: 0.2, bestCorrected: 0.1, pinhole: 0.1, nearUncorrected: 0.7 },
    },
    refraction: {
      OD: { sphere: 0.75, cylinder: -0.5, axis: 95, add: 2.5 },
      OS: { sphere: 1.0, cylinder: -0.5, axis: 85, add: 2.5 },
    },
    posterior: {
      OD: { vessels: { avRatio: 0.5 } },
      OS: { vessels: { avRatio: 0.5 } },
    },
    fields: { OD: 'left-hemianopia', OS: 'left-hemianopia' },
  }),
  essentialTests: ['visual-fields'],
  helpfulTests: ['visual-acuity', 'pupils', 'ophthalmoscopy'],
  diagnosis: 'homonymous-hemianopia',
  differentials: ['pituitary-adenoma', 'crao', 'retinal-detachment', 'cataract'],
  urgency: 'emergency',
  management:
    'Emergency: this is an acute stroke. Call an ambulance for immediate transfer to a stroke centre, stating the time of onset (10:00); he may still be within the window for thrombolysis or thrombectomy, so do not dilate or delay. Nothing by mouth until his swallow is assessed. Long-term: anticoagulation review for atrial fibrillation, driving cessation, and field-loss rehabilitation.',
  teachingPoints: [
    'A homonymous hemianopia affects the same side of the visual field in BOTH eyes: the lesion is behind the chiasm (optic tract, radiations or occipital cortex).',
    'Patients often blame the eye on the side of the defect; covering each eye in turn reveals both eyes share the missing half.',
    'Pupils are normal and there is no RAPD with an occipital lesion; acuity is typically preserved because the macula is often spared. An optic-tract lesion instead gives a small contralateral RAPD and, later, band atrophy of the opposite disc.',
    'Sudden onset, vascular risk factors and stopped anticoagulation make this a stroke: the time of onset is the single most important fact you collect.',
    'CRAO and retinal detachment cause monocular loss; a pituitary lesion causes a bitemporal, gradual defect.',
  ],
  redFlags: [
    'Sudden visual field loss in both eyes on the same side = stroke until proven otherwise.',
    'Stopped anticoagulation with atrial fibrillation.',
  ],
  emergency: { timeLimitSec: 150 },
  sources: [
    'https://www.ncbi.nlm.nih.gov/books/NBK558929/',
    'https://www.ncbi.nlm.nih.gov/books/NBK535369/',
  ],
};

export default homonymousStroke;
