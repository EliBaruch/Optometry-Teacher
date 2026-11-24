import { buildFindings, type ClinicalCase } from '@core';

/** Symptomatic horseshoe tear after blunt trauma in a myope; Shafer sign positive, no detachment. */
const retinalTearBoxer: ClinicalCase = {
  id: 'retinal-tear-boxer',
  difficulty: 3,
  tags: ['flashes-floaters', 'trauma', 'myopia', 'blunt-trauma', 'sport'],
  patient: {
    name: 'Connor Byrne',
    age: 34,
    sex: 'M',
    occupation: 'IT support analyst and amateur boxer',
    personality: 'Cheerful, slightly sheepish, insists "you should see the other fella".',
    avatar: {
      skin: 0, hair: 'curly', hairColor: '#b4502a', irisColor: '#5d8a6a',
      glasses: 'none', facialHair: 'stubble', headwear: 'none', accessory: 'bandage', outfit: '#2b3a55',
    },
  },
  chiefComplaint:
    "Took a right hook on Saturday — fair play to him. Since Monday I've got a load of black pepper floating in my right eye and little lightning sparks at the side when I glance about. The ring doctor said I'm fine, but my eye doesn't agree.",
  history: [
    { id: 'trauma', category: 'onset', q: 'Tell me about the injury — what hit the eye, and when?', a: 'Gloved punch to the right side of my face, Saturday night. Bit of a black eye, went down Tuesday.', relevance: 'key' },
    { id: 'floaters', category: 'symptoms', q: 'Describe the floaters: one, a few, or a shower?', a: 'A shower. Dozens of little dots, like someone ground pepper into the eye. Started Monday.', relevance: 'key' },
    { id: 'flashes', category: 'symptoms', q: 'Where are the flashes, and are they getting more frequent?', a: "Out at the left-hand edge of that eye, mostly in the dark. Every few minutes when I'm moving.", relevance: 'key' },
    { id: 'curtain', category: 'symptoms', q: 'Any shadow, curtain or missing patch of vision?', a: 'No — nothing missing. I can see everything, just with pepper on it.', relevance: 'key' },
    { id: 'myopia', category: 'ocular-history', q: 'Are you short-sighted? Contact lenses?', a: "Minus five and a half. Daily disposables, though not in the ring — I'm brave, not daft.", relevance: 'helpful' },
    { id: 'pain', category: 'symptoms', q: 'Any pain, redness or double vision now?', a: 'Bit tender around the eye socket. No double vision. Eye itself feels normal.', relevance: 'helpful' },
    { id: 'family', category: 'family', q: 'Anyone in your family had a detached retina?', a: 'Not that I know of.', relevance: 'neutral' },
    { id: 'lenses', category: 'social', q: 'Could your contact lenses be causing the specks?', a: "I've been wearing my glasses all week after the fight, so no lenses since Saturday.", relevance: 'red-herring' },
  ],
  findings: buildFindings(34, {
    va: {
      OD: { uncorrected: 1.5, bestCorrected: 0.0, pinhole: 0.3, nearUncorrected: 1.0 },
      OS: { uncorrected: 1.5, bestCorrected: -0.1, pinhole: 0.3, nearUncorrected: 0.9 },
    },
    refraction: {
      OD: { sphere: -5.5, cylinder: -0.5, axis: 175 },
      OS: { sphere: -5.25, cylinder: -0.75, axis: 5 },
    },
    keratometry: {
      OD: { k1: 43.75, k2: 44.25, axisK1: 175, mires: 'regular' },
      OS: { k1: 43.75, k2: 44.5, axisK1: 5, mires: 'regular' },
    },
    posterior: {
      OD: {
        fundusTone: 'tigroid',
        vitreous: 'pigment-shafer',
        lesions: [{ type: 'retinal-tear', zone: 'superotemporal', density: 2 }],
      },
      OS: { fundusTone: 'tigroid' },
    },
  }),
  essentialTests: ['ophthalmoscopy'],
  helpfulTests: ['slit-lamp', 'visual-acuity', 'visual-fields', 'tonometry', 'pupils'],
  diagnosis: 'retinal-tear',
  differentials: ['pvd', 'retinal-detachment', 'myopia', 'healthy-eyes'],
  urgency: 'urgent',
  management:
    'Symptomatic horseshoe retinal tear, right eye, superotemporal periphery, with pigment in the anterior vitreous and no detachment. Same-day/within-24-hour retina referral for laser retinopexy or cryotherapy to seal the tear before fluid gets under it. No sparring until cleared, and strict detachment warnings: a curtain means the emergency department tonight. After a punch to the eye, book IOP and gonioscopy at follow-up to look for angle recession.',
  teachingPoints: [
    '"Tobacco dust" (Shafer sign) in the anterior vitreous strongly suggests a retinal break — keep looking until you find it, with scleral depression.',
    'A symptomatic horseshoe tear goes to the retina service within 24 hours; sealing it now prevents most detachments.',
    'A flap tear is still attached to vitreous that keeps pulling on it — that traction is why it can progress.',
    'Blunt trauma tears the retina at the vitreous base: hunt for a retinal dialysis (classically inferotemporal or superonasal) as well as horseshoe tears, and check for commotio, hyphema and, at follow-up, angle recession (IOP and gonioscopy).',
    'No curtain and full fields: this is a tear, not yet a detachment. That distinction sets the clock.',
  ],
  redFlags: ['Shafer sign', 'Shower of floaters', 'Blunt trauma', 'High myopia'],
  sources: [
    'https://eyewiki.aao.org/Posterior_Vitreous_Detachment',
    'https://eyewiki.aao.org/Retinal_Detachment',
  ],
};

export default retinalTearBoxer;
