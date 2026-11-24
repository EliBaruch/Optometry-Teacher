import { buildFindings, type ClinicalCase } from '@core';

/** Acute symptomatic PVD with a Weiss ring and no retinal break after a careful dilated exam. */
const pvdHeadteacher: ClinicalCase = {
  id: 'pvd-headteacher',
  difficulty: 2,
  tags: ['flashes-floaters', 'sudden-onset', 'dilated-exam'],
  patient: {
    name: 'Fatima Haddad',
    age: 61,
    sex: 'F',
    occupation: 'Primary school headteacher',
    personality: 'Commands a playground with one raised eyebrow; secretly terrified of anything touching her eyes.',
    avatar: {
      skin: 2, hair: 'long', hairColor: '#2a1d18', irisColor: '#4a3020',
      glasses: 'half-rim', facialHair: 'none', headwear: 'headscarf', accessory: 'none', outfit: '#2f5d50',
    },
  },
  chiefComplaint:
    "Yesterday a big floater appeared in my right eye — like a cobweb, or a little ring — and it swings about when I look around. At night I see a flick of light at the edge, like a camera flash in the corner of the hall. I have assembly on Monday and I need to know I'm not going blind.",
  history: [
    { id: 'onset', category: 'onset', q: 'When exactly did the floater appear? Sudden or gradual?', a: 'Yesterday afternoon, during marking. One moment nothing, the next a cobweb.', relevance: 'key' },
    { id: 'curtain', category: 'symptoms', q: 'Is there any curtain, shadow or missing part of your vision?', a: 'No curtain. Everything is there, just with the cobweb drifting over it.', relevance: 'key' },
    { id: 'shower', category: 'symptoms', q: 'One or a few floaters, or a shower of many tiny dots?', a: 'One big one and a couple of threads. Not a shower — I would have panicked.', relevance: 'key' },
    { id: 'flashes', category: 'symptoms', q: 'Tell me about the flashes — where, how often?', a: 'Out at the right edge, in the dark, when I turn my eyes quickly. A few times last night.', relevance: 'key' },
    { id: 'myopia', category: 'ocular-history', q: 'Are you short-sighted? Any eye surgery or injury?', a: 'Only reading glasses. No operations, no knocks.', relevance: 'helpful' },
    { id: 'fellow-eye', category: 'ocular-history', q: 'Any retinal detachment in either eye or in the family?', a: 'No, never. Nobody that I know of.', relevance: 'helpful' },
    { id: 'diabetes', category: 'medical', q: 'Do you have diabetes or high blood pressure?', a: 'Blood pressure, controlled with tablets. No diabetes.', relevance: 'neutral' },
    { id: 'migraine', category: 'medical', q: 'Do you get migraines with shimmering zig-zags?', a: 'Never had a migraine in my life — I give them, I don\'t get them.', relevance: 'neutral' },
    { id: 'tiredness', category: 'social', q: 'Could this just be tiredness from end-of-term reports?', a: 'I am exhausted, certainly, but I was exhausted last year and saw no cobwebs.', relevance: 'red-herring' },
  ],
  findings: buildFindings(61, {
    va: {
      OD: { uncorrected: 0.0, bestCorrected: 0.0, pinhole: 0.0, nearUncorrected: 0.7 },
      OS: { uncorrected: 0.0, bestCorrected: -0.1, pinhole: 0.0, nearUncorrected: 0.7 },
    },
    refraction: {
      OD: { sphere: 0.25, cylinder: 0, axis: 180, add: 2.5 },
      OS: { sphere: 0.25, cylinder: -0.25, axis: 80, add: 2.5 },
    },
    posterior: {
      OD: { vitreous: 'weiss-ring' },
    },
  }),
  essentialTests: ['ophthalmoscopy'],
  helpfulTests: ['visual-acuity', 'slit-lamp', 'visual-fields', 'pupils', 'tonometry'],
  diagnosis: 'pvd',
  differentials: ['retinal-tear', 'retinal-detachment', 'healthy-eyes'],
  urgency: 'urgent',
  management:
    'Acute symptomatic posterior vitreous detachment, right eye: Weiss ring, no pigment or blood in the vitreous, and no retinal break on dilated examination with scleral depression. New flashes and floaters always earn a same-day (or within 24 h) dilated exam — which is what she got. Reassure, give written warning signs (a shower of floaters, more flashes, a curtain or shadow = come back the same day), and recheck dilated in about 2–6 weeks.',
  teachingPoints: [
    'Every new onset of flashes and floaters needs a dilated peripheral retinal exam within 24 hours — you cannot diagnose "just a PVD" without looking for a tear.',
    'A Weiss ring floating in front of the disc is the hallmark of a complete PVD.',
    'Negative Shafer sign (no pigment) and no vitreous haemorrhage make a retinal break less likely, but not impossible — hence the safety-net advice and follow-up.',
    'No curtain, full fields and normal acuity separate PVD from a detachment.',
    'Calling it "healthy eyes" is a trap: the floater is real, and the patient needs warning signs and a recheck.',
  ],
  redFlags: ['Shower of new floaters', 'Pigment or blood in the vitreous', 'Curtain or shadow', 'Increasing flashes'],
  sources: [
    'https://eyewiki.aao.org/Posterior_Vitreous_Detachment',
    'https://www.aao.org/eyenet/article/late-complications-posterior-vitreous-detachment',
  ],
};

export default pvdHeadteacher;
