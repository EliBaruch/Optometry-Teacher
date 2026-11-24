import { buildFindings, type ClinicalCase } from '@core';

/** High-risk PDR with a fresh vitreous bleed, unmasked by rapid A1c improvement. */
const pdrEarlyWorsening: ClinicalCase = {
  id: 'pdr-early-worsening',
  difficulty: 4,
  tags: ['diabetes', 'floaters', 'vitreous-haemorrhage', 'young-adult', 'urgent'],
  patient: {
    name: 'Priya Raghunathan',
    age: 29,
    sex: 'F',
    occupation: 'Pastry chef',
    personality: 'Talks with her hands, apologises for being "a terrible diabetic", is secretly doing brilliantly.',
    avatar: {
      skin: 3, hair: 'ponytail', hairColor: '#1a1210', irisColor: '#3a2416',
      glasses: 'none', facialHair: 'none', headwear: 'none', accessory: 'earrings', outfit: '#6b2d5c',
    },
  },
  chiefComplaint:
    "Last night it was like someone dropped ink into my left eye — little red-black swirls, then a haze. It's thinned out a bit, but I'm piping lettering for a wedding cake on Saturday and I can't see the tip of the bag.",
  history: [
    { id: 'onset', category: 'onset', q: 'When exactly did it start, and was it sudden?', a: 'About nine last night, all at once. I was just sitting on the sofa. No bump, no fall.', relevance: 'key' },
    { id: 'dm', category: 'medical', q: 'Do you have diabetes? Which type, and for how long?', a: "Type 1 since I was eleven, so eighteen years. Honestly, my twenties were a mess — A1c around 11 most of that time.", relevance: 'key' },
    { id: 'a1c-change', category: 'medications', q: 'Any recent change in your diabetes treatment?', a: "Yes! I got a pump and a sensor four months ago. My A1c went from 11.2 to 7.4 — my endocrinologist literally high-fived me.", relevance: 'key' },
    { id: 'last-exam', category: 'ocular-history', q: 'When was your last dilated eye exam?', a: "Three… maybe four years ago? They said there were some \"spots\" and to come back in six months. I didn't.", relevance: 'key' },
    { id: 'curtain', category: 'symptoms', q: 'Any flashes of light or a curtain or shadow coming across?', a: 'No flashes. No curtain — just the murky swirls that drift when I move my eye.', relevance: 'helpful' },
    { id: 'pain', category: 'symptoms', q: 'Is the eye painful or red?', a: "No pain at all. It looks totally normal, which feels rude given what I'm seeing.", relevance: 'helpful' },
    { id: 'pregnancy', category: 'medical', q: 'Could you be pregnant, or are you planning a pregnancy?', a: "Not pregnant. Planning, maybe, next year — that's partly why I got serious about my sugars.", relevance: 'helpful' },
    { id: 'kidneys-bp', category: 'medical', q: 'Any kidney problems or high blood pressure?', a: 'A bit of protein in my urine, so they started me on ramipril. Pressure is fine on it.', relevance: 'neutral' },
    { id: 'sugar-work', category: 'social', q: 'Does working with sugar all day make it harder?', a: "I taste with a teaspoon and spit, like a wine sommelier. My bolus calculator and I have an understanding.", relevance: 'red-herring' },
  ],
  findings: buildFindings(29, {
    va: {
      OD: { uncorrected: 0.0, bestCorrected: 0.0, pinhole: 0.0, nearUncorrected: 0.0 },
      // The haemorrhage veils near as much as distance: near is no better than BCVA.
      OS: { uncorrected: 0.4, bestCorrected: 0.4, pinhole: 0.4, nearUncorrected: 0.4 },
    },
    redReflex: { OS: 'dull' },
    retinoscopyReflex: { OS: 'dull' },
    posterior: {
      OD: {
        vessels: { avRatio: 0.6, venousDilation: true },
        lesions: [
          { type: 'neovascularization', zone: 'superotemporal', density: 2 },
          { type: 'dot-blot-hemorrhage', zone: 'superotemporal', density: 3 },
          { type: 'dot-blot-hemorrhage', zone: 'inferotemporal', density: 3 },
          { type: 'dot-blot-hemorrhage', zone: 'superonasal', density: 2 },
          { type: 'dot-blot-hemorrhage', zone: 'inferonasal', density: 2 },
          { type: 'microaneurysm', zone: 'diffuse', density: 3 },
          { type: 'venous-beading', zone: 'inferotemporal', density: 2 },
          { type: 'cotton-wool-spot', zone: 'superotemporal', density: 2 },
        ],
      },
      OS: {
        vitreous: 'hemorrhage',
        vessels: { avRatio: 0.6, venousDilation: true },
        lesions: [
          { type: 'neovascularization', zone: 'disc', density: 3 },
          { type: 'venous-beading', zone: 'superotemporal', density: 2 },
          { type: 'venous-beading', zone: 'inferotemporal', density: 2 },
          { type: 'dot-blot-hemorrhage', zone: 'diffuse', density: 4 },
          { type: 'microaneurysm', zone: 'diffuse', density: 3 },
          { type: 'cotton-wool-spot', zone: 'superotemporal', density: 2 },
          { type: 'cotton-wool-spot', zone: 'inferonasal', density: 1 },
        ],
      },
    },
  }),
  essentialTests: ['visual-acuity', 'ophthalmoscopy'],
  helpfulTests: ['slit-lamp', 'tonometry', 'pinhole', 'pupils', 'amsler'],
  diagnosis: 'pdr',
  differentials: ['npdr', 'pvd', 'retinal-tear', 'crvo'],
  urgency: 'urgent',
  management:
    'High-risk proliferative diabetic retinopathy: new vessels on the left disc with a fresh vitreous haemorrhage, and new vessels elsewhere on the right. Same-day/next-day retina referral for anti-VEGF and/or panretinal photocoagulation; if the bleed hides the retina, B-scan ultrasound to exclude a tractional or rhegmatogenous detachment. Check iris and IOP for neovascularisation, advise sleeping head-up and avoiding heavy straining, and keep her endocrinologist in the loop — her excellent new control is the right path, not the culprit to abandon.',
  teachingPoints: [
    'New vessels at the disc + vitreous haemorrhage = high-risk PDR (Diabetic Retinopathy Study). Treat within days, not months.',
    'Early worsening: a rapid fall in A1c (new pump, insulin intensification, some GLP-1 agonists) can transiently worsen retinopathy. Examine before and soon after big glycaemic changes — never tell a patient to loosen control.',
    'A young type 1 diabetic with sudden "ink" floaters has a bleed from new vessels until proven otherwise — PVD and tears are the older patient\'s story.',
    'A dull red reflex with no pain and no injection points to the vitreous, not the cornea or lens.',
    'Always look at the iris and measure IOP: rubeosis and neovascular glaucoma are the next step on this road.',
  ],
  redFlags: ['Neovascularisation at the disc', 'Vitreous haemorrhage', 'Planned pregnancy (retinopathy can accelerate)', 'Rapid A1c reduction'],
  sources: [
    'https://eyewiki.aao.org/Diabetic_Retinopathy',
    'https://aao.org/Assets/dba38b76-3095-4360-8cb6-00adab3aad68/635919125497230000/diabetic-retinopathy-ppp-pdf',
    'https://reviewofoptometry.com/article/dr-see-something-say-something',
  ],
};

export default pdrEarlyWorsening;
