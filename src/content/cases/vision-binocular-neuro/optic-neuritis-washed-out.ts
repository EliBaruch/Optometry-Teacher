import { buildFindings, type ClinicalCase } from '@core';

/** Typical demyelinating (retrobulbar) optic neuritis in a young woman. */
const opticNeuritisWashedOut: ClinicalCase = {
  id: 'optic-neuritis-washed-out',
  difficulty: 3,
  tags: ['vision-loss', 'neuro', 'painful-eye-movement', 'rapd', 'young-adult'],
  patient: {
    name: 'Chloe Martin',
    age: 29,
    sex: 'F',
    occupation: 'Sports physiotherapist and marathon runner',
    personality: 'Analytical and calm; describes her symptoms like clinical notes, but her voice wobbles.',
    avatar: {
      skin: 0,
      hair: 'bun',
      hairColor: '#b5532a',
      irisColor: '#5b7f4a',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'none',
      outfit: '#0e7490',
    },
  },
  chiefComplaint:
    "Over three days the vision in my left eye has gone dim and washed-out, like someone turned the saturation down. Reds look faded and brownish. And it aches behind the eye whenever I look around — I noticed it every time I checked my mirrors.",
  history: [
    { id: 'pain-movement', category: 'symptoms', q: 'Does it hurt when you move your eyes?', a: 'Yes, a deep ache behind the left eye, worst looking up and to the sides. Sitting still and looking ahead it settles.', relevance: 'key' },
    { id: 'onset', category: 'onset', q: 'How quickly did the vision change, and is it one eye or both?', a: 'Left eye only. It started three days ago and got worse each day. Today it feels about the same as yesterday.', relevance: 'key' },
    { id: 'colour', category: 'symptoms', q: 'Do colours look different between the two eyes?', a: 'Massively. My red running top looks bright red with the right eye and dull rust with the left.', relevance: 'key' },
    { id: 'neuro-history', category: 'medical', q: 'Have you ever had numbness, tingling, weakness, balance problems or electric shocks down your spine?', a: 'Last spring my right leg went numb from the knee down for about ten days. My GP thought it was a trapped nerve from running.', relevance: 'key' },
    { id: 'uhthoff', category: 'symptoms', q: 'Does the vision get worse with heat, a hot shower or exercise?', a: 'Yes! On my run this morning it went much dimmer, then recovered when I cooled down.', relevance: 'helpful' },
    { id: 'distortion', category: 'symptoms', q: 'Are straight lines wavy or distorted, or is there a missing patch?', a: 'Not wavy. There\'s a grey smudge right in the middle of what I look at.', relevance: 'helpful' },
    { id: 'infection', category: 'medical', q: 'Any recent illness, infection, rash or vaccination?', a: 'A cold about three weeks ago. Nothing since.', relevance: 'neutral' },
    { id: 'gca', category: 'symptoms', q: 'Any jaw pain when chewing or scalp tenderness?', a: 'No. Should I have?', relevance: 'neutral' },
    { id: 'gels', category: 'social', q: 'Could the energy gels you take on long runs be responsible?', a: 'I have eaten about four thousand of them in my life. I think my eyes would have complained earlier.', relevance: 'red-herring' },
  ],
  findings: buildFindings(29, {
    va: {
      OD: { uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0 },
      OS: { uncorrected: 0.7, bestCorrected: 0.7, pinhole: 0.7, nearUncorrected: 0.7 },
    },
    pupils: { rapd: 'OS', rapdGrade: 2 },
    motility: { painOnMovement: true },
    colorVision: {
      OS: { type: 'acquired-red-green', severity: 'moderate', redDesaturation: true },
    },
    fields: { OS: 'central-scotoma' },
    amsler: { OS: { result: 'central-scotoma', center: { x: 0, y: 0 }, radius: 3 } },
  }),
  essentialTests: ['visual-acuity', 'pupils', 'color-vision'],
  helpfulTests: ['visual-fields', 'ophthalmoscopy', 'pinhole', 'motility', 'amsler'],
  diagnosis: 'optic-neuritis',
  differentials: ['central-serous', 'papilledema', 'pituitary-adenoma', 'giant-cell-arteritis'],
  urgency: 'urgent',
  management:
    'Refer urgently (same day to 48 hours) to neuro-ophthalmology or neurology for MRI of brain and orbits with gadolinium. IV methylprednisolone may be offered to speed recovery but does not change final acuity; oral prednisolone alone at standard dose is avoided. MRI lesions predict multiple sclerosis risk and guide disease-modifying therapy. Most patients recover much of their vision over weeks to months.',
  teachingPoints: [
    'Classic triad: subacute unilateral vision loss over days, pain on eye movement, and a relative afferent pupillary defect.',
    'Colour and contrast suffer out of proportion to acuity: red desaturation is a sensitive bedside sign of optic nerve disease.',
    'In about two thirds the disc looks normal (retrobulbar): "the patient sees nothing and the doctor sees nothing".',
    'Pinhole does not help, and there is no metamorphopsia on Amsler, steering away from refractive and macular causes like central serous chorioretinopathy.',
    'Uhthoff phenomenon and a previous sensory episode raise suspicion of multiple sclerosis.',
  ],
  redFlags: [
    'Atypical features need a wider work-up (NMOSD, MOGAD, infection, compression): no pain, both eyes, no light perception, marked disc swelling with haemorrhages, age over 50, or no recovery after about 3 weeks.',
  ],
  sources: [
    'https://eyewiki.aao.org/Demyelinating_Optic_Neuritis',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC2440583',
  ],
};

export default opticNeuritisWashedOut;
