import { buildFindings, type ClinicalCase } from '@core';

/** Giant cell arteritis with arteritic anterior ischaemic optic neuropathy (right eye). */
const gcaPianist: ClinicalCase = {
  id: 'giant-cell-arteritis-pianist',
  difficulty: 4,
  tags: ['sudden-vision-loss', 'neuro', 'emergency', 'elderly', 'headache', 'systemic'],
  patient: {
    name: 'Margaret "Peggy" O\'Brien',
    age: 91,
    sex: 'F',
    occupation: 'Retired piano teacher, still teaches two pupils on Saturdays',
    personality: 'Razor-sharp, impeccably polite, refuses to be "a bother" even when she should be.',
    avatar: {
      skin: 0,
      hair: 'bun',
      hairColor: '#ece8e1',
      irisColor: '#8fb3cf',
      glasses: 'round',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'hearing-aid',
      outfit: '#7e5aa2',
    },
  },
  chiefComplaint:
    "I woke this morning and my right eye had simply gone dark. I can barely count your fingers with it. I've not been myself for weeks, dear: headaches on the side of my head, my jaw aches when I chew my toast, and brushing my hair hurts. I didn't want to make a fuss.",
  triageNote: 'Sudden loss of vision OD on waking. Tender over right temple. Daughter driving her.',
  history: [
    { id: 'jaw', category: 'symptoms', q: 'Does your jaw ache or tire when you chew, and ease when you stop?', a: 'Yes, after a few mouthfuls of toast or meat it aches, and I have to rest. It goes when I stop. I have been eating soup.', relevance: 'key' },
    { id: 'scalp', category: 'symptoms', q: 'Is your scalp tender, for example when brushing your hair or on your pillow?', a: 'Terribly, over the right temple. Even my spectacle arm hurts there.', relevance: 'key' },
    { id: 'headache', category: 'onset', q: 'Is the headache new for you?', a: 'Quite new. Six weeks or so. I have never been a headache sort of person.', relevance: 'key' },
    { id: 'transient', category: 'symptoms', q: 'Before today, did you have any brief loss or blurring of vision, or double vision?', a: 'Last Tuesday the right eye went grey for a few minutes while I was playing, then came back. I thought I was tired.', relevance: 'key' },
    { id: 'systemic', category: 'medical', q: 'Any weight loss, fevers, night sweats, or stiffness in the shoulders and hips?', a: 'I\'ve lost half a stone without trying, and my shoulders are so stiff in the mornings I need help with my cardigan.', relevance: 'key' },
    { id: 'pain', category: 'symptoms', q: 'Is the eye itself painful or red, and does moving it hurt?', a: 'No, the eye itself doesn\'t hurt. It\'s just dark.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'What medicines do you take?', a: 'Amlodipine, a water tablet, and calcium. Nothing new.', relevance: 'neutral' },
    { id: 'piano', category: 'social', q: 'Could long hours reading sheet music have strained the eye?', a: 'My dear, I have read sheet music for eighty-five years. If it were going to strain something, it would have done so by now.', relevance: 'red-herring' },
  ],
  findings: buildFindings(91, {
    va: {
      OD: { uncorrected: 1.9, bestCorrected: 1.9, pinhole: 1.9, nearUncorrected: 1.9 },
      OS: { uncorrected: 0.3, bestCorrected: 0.2, pinhole: 0.2, nearUncorrected: 0.7 },
    },
    refraction: {
      OD: { sphere: 1.25, cylinder: -0.75, axis: 90, add: 2.5 },
      OS: { sphere: 1.25, cylinder: -0.5, axis: 85, add: 2.5 },
    },
    pupils: {
      sizeLightMm: { OD: 2.5, OS: 2.5 },
      sizeDarkMm: { OD: 4, OS: 4 },
      rapd: 'OD',
      rapdGrade: 3,
    },
    anterior: {
      OD: { lens: ['nuclear-sclerosis'], lensGrade: 2 },
      OS: { lens: ['nuclear-sclerosis'], lensGrade: 2 },
    },
    posterior: {
      OD: {
        disc: { cdr: 0.2, color: 'pale', margins: 'elevated', rimThinning: 'none', edema: true, svp: false },
        lesions: [{ type: 'flame-hemorrhage', zone: 'disc', density: 1 }],
      },
      OS: { disc: { cdr: 0.3, color: 'pink', margins: 'sharp' } },
    },
    colorVision: { OD: { type: 'acquired-red-green', severity: 'severe', redDesaturation: true } },
    fields: { OD: 'inferior-altitudinal' },
    iop: { OD: 14, OS: 15 },
    external: { templeTenderness: true },
  }),
  essentialTests: ['visual-acuity', 'pupils', 'ophthalmoscopy'],
  helpfulTests: ['visual-fields', 'color-vision', 'slit-lamp', 'pinhole'],
  diagnosis: 'giant-cell-arteritis',
  differentials: ['crao', 'optic-neuritis', 'crvo', 'cataract'],
  urgency: 'emergency',
  management:
    'Emergency: high-dose corticosteroids must start today on clinical suspicion (often IV methylprednisolone when vision is affected) — do not wait for blood results or biopsy. Send her immediately to the emergency department/on-call ophthalmology with urgent ESR, CRP and platelets; temporal artery biopsy or ultrasound follows within about 1–2 weeks. The aim is to protect the LEFT eye, which is at high risk of being involved within days.',
  teachingPoints: [
    'Jaw claudication is the most specific symptom of giant cell arteritis; scalp tenderness, new headache, PMR stiffness and weight loss complete the picture.',
    'Arteritic AION gives a chalky-white (pallid) swollen disc with very poor acuity and a dense RAPD; non-arteritic AION gives hyperaemic swelling, milder loss and a crowded fellow disc.',
    'Pinhole does not help: this is optic nerve infarction, not refractive or lens blur, even though she also has some cataract.',
    'Transient vision loss in the preceding days is a warning sign that was missed — ask every patient over 50 with visual loss or diplopia the GCA questions.',
    'CRAO causes retinal whitening with a cherry-red spot; here the retina is normal and the disc is the problem (though GCA can also cause CRAO).',
  ],
  redFlags: [
    'Age over 50 with transient or sudden visual loss, diplopia, or a pale swollen disc.',
    'Untreated, the fellow eye can be lost within days.',
  ],
  emergency: { timeLimitSec: 120 },
  sources: [
    'https://eyewiki.aao.org/Giant_Cell_Arteritis',
    'https://eyewiki.aao.org/Arteritic_Anterior_Ischemic_Optic_Neuropathy_(AAION)',
  ],
};

export default gcaPianist;
