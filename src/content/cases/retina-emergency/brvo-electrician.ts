import { buildFindings, type ClinicalCase } from '@core';

/** Superotemporal BRVO at an AV crossing with macular oedema, in poorly controlled hypertension. */
const brvoElectrician: ClinicalCase = {
  id: 'brvo-electrician',
  difficulty: 4,
  tags: ['blurred-vision', 'painless', 'vascular', 'hypertension', 'field-defect'],
  patient: {
    name: 'Minh Tran',
    age: 66,
    sex: 'M',
    occupation: 'Electrician (semi-retired, refuses to fully retire)',
    personality: 'Methodical, fixes everything himself, treats his blood pressure cuff like a faulty meter.',
    avatar: {
      skin: 2, hair: 'short', hairColor: '#4a4644', irisColor: '#24160e',
      glasses: 'none', facialHair: 'moustache', headwear: 'hard-hat', accessory: 'none', outfit: '#d9822b',
    },
  },
  chiefComplaint:
    "Ten days ago the bottom half of my right eye went murky. Looking down at a fuse board, the lower wires are smudged and the labels look wobbly. The top half is fine. I thought my safety glasses were scratched — bought new ones. Same.",
  history: [
    { id: 'onset', category: 'onset', q: 'Did it come on suddenly? One eye or both?', a: 'Sudden, one morning — right eye only. It has not got worse, not got better.', relevance: 'key' },
    { id: 'pattern', category: 'symptoms', q: 'Which part of your vision is affected?', a: 'The lower part, and a little towards my nose side. Top is clear as day.', relevance: 'key' },
    { id: 'bp', category: 'medical', q: 'Do you have high blood pressure? Is it controlled?', a: "The doctor gave me tablets. I take them when my reading at the pharmacy machine is high. Last time 168 over 98.", relevance: 'key' },
    { id: 'diabetes', category: 'medical', q: 'Do you have diabetes?', a: 'No. Checked last year. Fine.', relevance: 'helpful' },
    { id: 'pain', category: 'symptoms', q: 'Any pain, redness, flashes or floaters?', a: 'No pain, no flashes. Nothing floating.', relevance: 'helpful' },
    { id: 'glaucoma', category: 'ocular-history', q: 'Any history of glaucoma or high eye pressure?', a: 'Never been told.', relevance: 'helpful' },
    { id: 'smoking', category: 'social', q: 'Do you smoke?', a: 'Ten a day. I know, I know.', relevance: 'neutral' },
    { id: 'shock', category: 'social', q: 'Any recent electric shock or welding flash?', a: 'No shocks — I respect the current. No welding either, that is a different trade.', relevance: 'red-herring' },
  ],
  findings: buildFindings(66, {
    va: {
      OD: { uncorrected: 0.4, bestCorrected: 0.3, pinhole: 0.3, nearUncorrected: 0.8 },
      OS: { uncorrected: 0.1, bestCorrected: 0.0, pinhole: 0.0, nearUncorrected: 0.7 },
    },
    refraction: {
      OD: { sphere: 0.5, cylinder: -0.5, axis: 90, add: 2.5 },
      OS: { sphere: 0.5, cylinder: -0.25, axis: 90, add: 2.5 },
    },
    fields: { OD: 'inferior-arcuate' },
    amsler: { OD: { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 3 } },
    posterior: {
      OD: {
        vessels: { avRatio: 0.5, avNicking: true, copperWiring: false, tortuosity: 'normal', venousDilation: false },
        lesions: [
          { type: 'flame-hemorrhage', zone: 'superotemporal', density: 4 },
          { type: 'dot-blot-hemorrhage', zone: 'superotemporal', density: 3 },
          { type: 'cotton-wool-spot', zone: 'superotemporal', density: 2 },
          { type: 'macular-edema', zone: 'macula', density: 2 },
        ],
      },
      OS: {
        vessels: { avRatio: 0.5, avNicking: true },
      },
    },
  }),
  essentialTests: ['ophthalmoscopy'],
  helpfulTests: ['visual-acuity', 'visual-fields', 'amsler', 'tonometry', 'pinhole'],
  diagnosis: 'brvo',
  differentials: ['crvo', 'hypertensive-retinopathy', 'npdr', 'diabetic-macular-edema'],
  urgency: 'soon',
  management:
    'Superotemporal branch retinal vein occlusion, right eye, with macular oedema (20/40): wedge of flame and dot-blot haemorrhages and cotton-wool spots downstream of an AV crossing, respecting the horizontal midline. Refer to retina within 1–2 weeks for OCT and anti-VEGF for the oedema; same-day blood pressure check and a letter to his GP — blood pressure control is the most important systemic step. Follow for neovascularisation (sector laser if it develops).',
  teachingPoints: [
    'BRVO happens at an arteriovenous crossing, where a stiff artery compresses the vein in a shared sheath — hypertension is the biggest risk factor.',
    'The haemorrhages fan out in a wedge from the crossing and stop at the horizontal raphe; four quadrants would be CRVO.',
    'Superotemporal is the commonest site; it causes a lower (inferonasal) field defect because the field is inverted and reversed.',
    'Bilateral AV nicking says chronic hypertension; the unilateral sectoral bleed says vein occlusion.',
    'Microaneurysms in both eyes and a diabetic history would point to diabetic retinopathy instead.',
  ],
  redFlags: ['Macular oedema with reduced acuity', 'Neovascularisation', 'Uncontrolled blood pressure'],
  sources: [
    'https://eyewiki.aao.org/Branch_Retinal_Vein_Occlusion',
    'https://eyewiki.aao.org/Hypertensive_Retinopathy',
  ],
};

export default brvoElectrician;
