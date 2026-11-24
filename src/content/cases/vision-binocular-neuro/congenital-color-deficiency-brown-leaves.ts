import { buildFindings, type ClinicalCase } from '@core';

/** Congenital deutan colour vision deficiency in a schoolboy. */
const colourDeficiencyBrownLeaves: ClinicalCase = {
  id: 'congenital-color-deficiency-brown-leaves',
  difficulty: 2,
  tags: ['paediatric', 'colour-vision', 'genetics', 'screening'],
  patient: {
    name: 'Kwame Asante',
    age: 8,
    sex: 'M',
    occupation: 'Year 3 pupil, future airline pilot (he insists)',
    personality: 'Bright, bouncy, deeply offended that his art teacher marked his trees "wrong".',
    avatar: {
      skin: 5,
      hair: 'short',
      hairColor: '#120b08',
      irisColor: '#2a160b',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'none',
      outfit: '#2563eb',
    },
  },
  chiefComplaint:
    "Mum: \"His teacher says he colours tree leaves brown and mixes up the red and green pens on the whiteboard.\" Kwame: \"The leaves ARE kind of brown. And the red pen and the green pen are basically the same pen.\"",
  triageNote: 'School concern about colour naming. Distance VA screening passed both eyes.',
  history: [
    { id: 'family', category: 'family', q: 'Is anyone in the family colour-blind, especially on mum\'s side?', a: 'Mum: "My father! He was colour-blind — my mother had to choose all his ties. And my brother too."', relevance: 'key' },
    { id: 'both-eyes', category: 'symptoms', q: 'Is it the same with each eye on its own?', a: 'Kwame: "I tried it with one eye shut. And then the other one. Exactly the same. Exactly the same brown."', relevance: 'key' },
    { id: 'change', category: 'onset', q: 'Has his colour naming always been like this, or is it new or getting worse?', a: 'Mum: "Thinking about it, always. At nursery he called the red bus green. We thought it was a joke."', relevance: 'key' },
    { id: 'vision-drop', category: 'symptoms', q: 'Any blurry vision, pain, or trouble seeing the board?', a: 'Kwame: "No, I can see everything. I can see the board from the back. I just can\'t see the green bits on it."', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Does he take any regular medicines?', a: 'Mum: "No, nothing. He\'s never been in hospital."', relevance: 'helpful' },
    { id: 'reading', category: 'social', q: 'How is his reading and schoolwork otherwise?', a: 'Mum: "Top of the class in maths, reads all evening. Only art and some colour-coded worksheets cause trouble."', relevance: 'neutral' },
    { id: 'carrots', category: 'social', q: 'Does he eat enough green vegetables?', a: 'Kwame: "How would I KNOW which ones are green?"', relevance: 'red-herring' },
  ],
  findings: buildFindings(8, {
    colorVision: {
      OD: { type: 'deutan', severity: 'moderate', redDesaturation: false },
      OS: { type: 'deutan', severity: 'moderate', redDesaturation: false },
    },
  }),
  essentialTests: ['color-vision'],
  helpfulTests: ['visual-acuity', 'pupils', 'ophthalmoscopy'],
  diagnosis: 'congenital-color-deficiency',
  differentials: ['optic-neuritis', 'amblyopia', 'myopia', 'healthy-eyes'],
  urgency: 'routine',
  management:
    'Explain the diagnosis to Kwame and his mother and write to the school so colour-coded materials are labelled and he is not marked down for colour choices. Classify the type and severity with a D-15 or anomaloscope if available. Discuss career implications honestly (aviation, electrical, some transport and military roles have colour standards) while noting that many people with mild deficiencies pass occupational tests. Tinted lenses can change contrast but do not restore normal colour vision.',
  teachingPoints: [
    'Congenital red-green deficiency is X-linked recessive: about 8% of males of Northern European ancestry, under 1% of females, typically inherited through the maternal grandfather.',
    'Congenital = bilateral, symmetric, stable, with normal acuity, pupils and fundus. Acquired = asymmetric, changing, often with reduced acuity or an RAPD.',
    'Ishihara plates screen red-green (protan/deutan) defects only; they do not test tritan (blue-yellow) defects.',
    'Optic neuropathies typically cause acquired red-green loss; many macular and retinal diseases cause blue-yellow loss.',
    'Passing a distance acuity screen says nothing about colour vision: test it specifically in every child.',
  ],
  redFlags: [
    'New, asymmetric or progressive colour loss, or colour loss with reduced acuity or an RAPD, needs a neuro-ophthalmic or retinal work-up.',
    'Drugs such as ethambutol and hydroxychloroquine can cause acquired colour deficiency.',
  ],
  sources: [
    'https://medlineplus.gov/genetics/condition/color-vision-deficiency',
    'https://pubmed.ncbi.nlm.nih.gov/19927164/',
  ],
};

export default colourDeficiencyBrownLeaves;
