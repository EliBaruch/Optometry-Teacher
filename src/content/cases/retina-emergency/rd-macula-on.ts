import { buildFindings, type ClinicalCase } from '@core';

/** Macula-on superior rhegmatogenous RD in a high myope: the clock is the macula. */
const rdMaculaOn: ClinicalCase = {
  id: 'rd-macula-on',
  difficulty: 3,
  tags: ['flashes-floaters', 'curtain', 'myopia', 'sudden-vision-loss', 'emergency'],
  patient: {
    name: 'Aiko Tanaka',
    age: 58,
    sex: 'F',
    occupation: 'Literary translator',
    personality: 'Precise with words, apologetic about being "probably silly", has been squinting at proofs since Tuesday.',
    avatar: {
      skin: 1, hair: 'bob', hairColor: '#2b2626', irisColor: '#2a1a12',
      glasses: 'round', facialHair: 'none', headwear: 'none', accessory: 'none', outfit: '#1f6f6a',
    },
  },
  chiefComplaint:
    "Three days of little lightning flashes in my left eye and a swarm of black pepper floating about. This morning a grey shadow started rising from the bottom, like water filling a glass. I can still read — I came straight from my desk.",
  triageNote: 'Walked in without appointment. Says the shadow is "higher than at breakfast".',
  history: [
    { id: 'curtain', category: 'symptoms', q: 'Is there a curtain or shadow? Where, and is it moving?', a: 'From the bottom up, in the left eye. It was at the edge at 7 a.m.; now it is nearly a third of the way up.', relevance: 'key' },
    { id: 'central', category: 'symptoms', q: 'Is your central vision — reading, faces — still clear?', a: 'Yes. If I look straight at the page, the words are crisp. That is the only reason I am calm.', relevance: 'key' },
    { id: 'flashes', category: 'onset', q: 'When did the flashes and floaters start?', a: 'Three days ago. A sudden cloud of tiny dots, and flashes at the side in the dark.', relevance: 'key' },
    { id: 'myopia', category: 'ocular-history', q: 'Are you short-sighted? Any eye surgery or retinal problems?', a: 'Very short-sighted since school — minus seven. No surgery. My right eye had "thin patches" they watched once.', relevance: 'key' },
    { id: 'trauma', category: 'onset', q: 'Any blow to the eye or head?', a: 'Nothing. I sit, I type, I drink tea.', relevance: 'helpful' },
    { id: 'pain', category: 'symptoms', q: 'Any pain or redness?', a: 'No pain whatsoever.', relevance: 'helpful' },
    { id: 'family', category: 'family', q: 'Anyone in the family with a retinal detachment?', a: 'My brother had one — also very myopic.', relevance: 'helpful' },
    { id: 'migraine', category: 'medical', q: 'Do you get migraines with zig-zag lights?', a: 'Never. These flashes are tiny sparks, not zig-zags, and only in the left eye.', relevance: 'neutral' },
    { id: 'screen', category: 'social', q: 'Could long hours at the computer cause this?', a: 'Twelve hours a day for thirty years, and this is new this week.', relevance: 'red-herring' },
  ],
  findings: buildFindings(58, {
    va: {
      OD: { uncorrected: 1.7, bestCorrected: 0.0, pinhole: 0.4, nearUncorrected: 1.2 },
      OS: { uncorrected: 1.7, bestCorrected: 0.1, pinhole: 0.5, nearUncorrected: 1.2 },
    },
    refraction: {
      OD: { sphere: -7.0, cylinder: -0.75, axis: 10, add: 2.5 },
      OS: { sphere: -7.25, cylinder: -0.5, axis: 170, add: 2.5 },
    },
    keratometry: {
      OD: { k1: 44.0, k2: 44.75, axisK1: 10, mires: 'regular' },
      OS: { k1: 44.0, k2: 44.5, axisK1: 170, mires: 'regular' },
    },
    // Two detached quadrants: a mild RAPD on the detached side (it scales with the area of retina off).
    pupils: { rapd: 'OS', rapdGrade: 1 },
    iop: { OD: 15, OS: 11 },
    fields: { OS: 'curtain-inferior' },
    posterior: {
      OD: {
        fundusTone: 'tigroid',
        lesions: [{ type: 'lattice', zone: 'periphery', density: 2 }],
      },
      OS: {
        fundusTone: 'tigroid',
        vitreous: 'pigment-shafer',
        lesions: [
          { type: 'retinal-tear', zone: 'superotemporal', density: 2 },
          { type: 'lattice', zone: 'periphery', density: 1 },
        ],
        detachment: { zones: ['superotemporal', 'superonasal'], maculaOff: false },
      },
    },
  }),
  essentialTests: ['ophthalmoscopy', 'visual-acuity'],
  helpfulTests: ['visual-fields', 'slit-lamp', 'tonometry', 'pupils'],
  diagnosis: 'retinal-detachment',
  differentials: ['pvd', 'retinal-tear', 'crao', 'central-serous'],
  urgency: 'emergency',
  management:
    'Macula-on rhegmatogenous retinal detachment, left eye: superior bullous detachment from a superotemporal horseshoe tear, threatening the fovea. Phone the on-call vitreoretinal surgeon now for same-day assessment and repair (pneumatic retinopexy, buckle or vitrectomy). Until seen: no driving, minimal activity, and head positioning only as the surgeon advises to keep fluid away from the fovea. The right eye has lattice — book a full dilated review of it too.',
  teachingPoints: [
    'A rising shadow from below means a SUPERIOR detachment — the field is inverted — and superior detachments reach the macula fastest under gravity.',
    'Macula-on is the most urgent detachment: central vision is still saveable, so it goes to the surgeon today.',
    'Pigment in the anterior vitreous (Shafer sign, "tobacco dust") means a retinal break until proven otherwise.',
    'The detached eye often has a slightly lower IOP, and two quadrants off can give a mild RAPD: the RAPD grows with the amount of retina detached.',
    'High myopia, lattice and a sibling with a detachment stack the odds; PVD alone has no field defect.',
  ],
  redFlags: ['Progressing curtain', 'Shafer sign', 'Superior bullous detachment near the fovea', 'High myopia with lattice'],
  emergency: { timeLimitSec: 120 },
  sources: [
    'https://eyewiki.aao.org/Retinal_Detachment',
    'https://wikem.org/wiki/Retinal_Detachment',
    'https://www.msdmanuals.com/professional/eye-disorders/retinal-disorders/retinal-detachment',
  ],
};

export default rdMaculaOn;
