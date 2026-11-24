import { buildFindings, type ClinicalCase } from '@core';

/** Bilateral papilloedema from idiopathic intracranial hypertension. */
const papilledemaIih: ClinicalCase = {
  id: 'papilledema-iih-dispatcher',
  difficulty: 3,
  tags: ['headache', 'neuro', 'disc-swelling', 'young-adult', 'urgent'],
  patient: {
    name: 'Brianna Thomas',
    age: 27,
    sex: 'F',
    occupation: 'Ambulance control dispatcher (night shifts)',
    personality: 'Brisk, funny, used to staying calm while other people panic; now a bit scared herself.',
    avatar: {
      skin: 4,
      hair: 'afro',
      hairColor: '#1a110c',
      irisColor: '#2a170d',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'earrings',
      outfit: '#0f766e',
    },
  },
  chiefComplaint:
    "I've had a headache every single day for six weeks. It's worst when I wake up or lie down. I hear my own heartbeat whooshing in my ears at night, and when I stand up quickly my vision greys out for a few seconds. I came in for new glasses, because surely it's my eyes?",
  triageNote: 'BP 124/78. Requesting a sight test for headaches. Reports recent weight gain.',
  history: [
    { id: 'headache', category: 'symptoms', q: 'Tell me about the headache: when is it worst, and has it changed?', a: 'Every day for about six weeks. Worse first thing, worse lying flat, worse when I cough or strain. Painkillers take the edge off for an hour.', relevance: 'key' },
    { id: 'tvo', category: 'symptoms', q: 'Do you get brief greying or blacking out of vision, especially when you stand or bend?', a: 'Yes, both eyes go grey for two or three seconds when I stand up from my desk. Then it comes back.', relevance: 'key' },
    { id: 'tinnitus', category: 'symptoms', q: 'Any whooshing noise in your ears in time with your heartbeat?', a: 'Yes, at night it sounds like my pulse is in my pillow.', relevance: 'key' },
    { id: 'meds', category: 'medications', q: 'What medications are you taking, including acne or vitamin supplements?', a: 'Minocycline for my skin, started four months ago. And the contraceptive pill.', relevance: 'key' },
    { id: 'weight', category: 'medical', q: 'Has your weight changed recently?', a: 'Up about fifteen kilos since I moved to nights last year. Vending-machine dinners at 3 a.m.', relevance: 'key' },
    { id: 'diplopia', category: 'symptoms', q: 'Any double vision?', a: 'No double vision.', relevance: 'helpful' },
    { id: 'neuro', category: 'symptoms', q: 'Any weakness, numbness, seizures, fever or neck stiffness?', a: 'None of that. No fever.', relevance: 'helpful' },
    { id: 'screens', category: 'social', q: 'How many hours a day do you look at screens at work?', a: 'Twelve-hour shifts staring at five monitors. Is that it? Is it the screens?', relevance: 'red-herring' },
  ],
  findings: buildFindings(27, {
    va: {
      OD: { uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0 },
      OS: { uncorrected: 0, bestCorrected: -0.1, pinhole: 0, nearUncorrected: 0 },
    },
    posterior: {
      OD: {
        disc: { cdr: 0.1, color: 'hyperemic', margins: 'elevated', rimThinning: 'none', edema: true, svp: false },
        vessels: { venousDilation: true, tortuosity: 'increased' },
        lesions: [{ type: 'flame-hemorrhage', zone: 'disc', density: 2 }],
      },
      OS: {
        disc: { cdr: 0.1, color: 'hyperemic', margins: 'elevated', rimThinning: 'none', edema: true, svp: false },
        vessels: { venousDilation: true, tortuosity: 'increased' },
        lesions: [{ type: 'flame-hemorrhage', zone: 'disc', density: 1 }],
      },
    },
    fields: { OD: 'enlarged-blind-spot', OS: 'enlarged-blind-spot' },
  }),
  essentialTests: ['ophthalmoscopy', 'visual-fields'],
  helpfulTests: ['visual-acuity', 'pupils', 'motility', 'color-vision'],
  diagnosis: 'papilledema',
  differentials: ['optic-neuritis', 'hypertensive-retinopathy', 'crvo', 'pituitary-adenoma'],
  urgency: 'urgent',
  management:
    'Same-day referral to the emergency department or on-call neurology/ophthalmology for urgent MRI brain with MR venography (to exclude a mass and venous sinus thrombosis), then lumbar puncture with opening pressure. If idiopathic intracranial hypertension is confirmed: stop minocycline, weight-management support, and acetazolamide; monitor with serial visual fields, OCT and disc photos. Declining vision needs surgical options.',
  teachingPoints: [
    'Bilateral disc swelling is raised intracranial pressure until proven otherwise; "papilloedema" means swelling caused by raised ICP.',
    'Acuity is usually normal early: the enlarged blind spot and transient visual obscurations are the warning signs, so never be reassured by 20/20.',
    'Elevated, hyperaemic discs with obscured vessels at the margin, peripapillary haemorrhages and absent venous pulsations separate true swelling from pseudopapilloedema (disc drusen).',
    'Tetracyclines (minocycline, doxycycline), vitamin A derivatives and recent weight gain are classic IIH triggers in young women.',
    'No RAPD because both nerves are affected similarly; a normal BP rules out malignant hypertension as the cause.',
  ],
  redFlags: [
    'Falling acuity or rapidly worsening fields (fulminant IIH), sixth-nerve palsy, or an atypical patient (male, thin, older) needing a hunt for a secondary cause.',
  ],
  sources: [
    'https://eyewiki.aao.org/Papilledema',
    'https://eyewiki.aao.org/Pseudotumor_Cerebri_(Idiopathic_Intracranial_Hypertension)',
  ],
};

export default papilledemaIih;
