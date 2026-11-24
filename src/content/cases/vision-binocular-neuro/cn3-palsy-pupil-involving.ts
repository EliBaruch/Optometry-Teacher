import { buildFindings, type ClinicalCase } from '@core';

/** Pupil-involving left third-nerve palsy: posterior communicating artery aneurysm until proven otherwise. */
const cn3PalsyPupilInvolving: ClinicalCase = {
  id: 'cn3-palsy-pupil-involving',
  difficulty: 3,
  tags: ['diplopia', 'neuro', 'emergency', 'ptosis', 'anisocoria', 'headache'],
  patient: {
    name: 'Marisol Vega',
    age: 52,
    sex: 'F',
    occupation: 'Secondary-school head teacher',
    personality: 'Composed, organised, apologises for "making a fuss" while clearly in pain.',
    avatar: {
      skin: 2,
      hair: 'long',
      hairColor: '#2b1b14',
      irisColor: '#5b3a1a',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'earrings',
      outfit: '#7c2d12',
    },
  },
  chiefComplaint:
    "My left eyelid dropped this morning, it just won't open. When I lift it with my finger, everything is double and slanted. And since last night I've had the worst headache of my life, right behind that eye. I took paracetamol and came in because the lid frightened me.",
  triageNote: 'Patient holding left upper lid open. Appears in pain. BP 152/88. Alert and orientated.',
  history: [
    { id: 'onset', category: 'onset', q: 'Exactly when did the lid droop and the double vision start?', a: 'I woke at six with it. The headache started late last night, suddenly, while I was marking. Like being hit.', relevance: 'key' },
    { id: 'headache', category: 'symptoms', q: 'Describe the headache: how severe, and how quickly did it peak?', a: 'Ten out of ten. It went from nothing to unbearable in a minute or so. I have never had anything like it.', relevance: 'key' },
    { id: 'meningism', category: 'symptoms', q: 'Any neck stiffness, nausea, vomiting, drowsiness or confusion?', a: 'Nauseous, and my neck feels stiff. I was sick once this morning.', relevance: 'key' },
    { id: 'vascular', category: 'medical', q: 'Do you have diabetes or high blood pressure?', a: 'No diabetes. My GP has been "watching" my blood pressure. I smoked until five years ago.', relevance: 'key' },
    { id: 'fatigue', category: 'symptoms', q: 'Does the droop vary through the day or get worse when you are tired?', a: "It hasn't varied at all. It's been fully down since I woke.", relevance: 'helpful' },
    { id: 'drops', category: 'medications', q: 'Have you used any eye drops, patches or touched any plants or medicines that could dilate the pupil?', a: 'Nothing. I take an HRT patch and a vitamin. That is all.', relevance: 'helpful' },
    { id: 'gca', category: 'symptoms', q: 'Any jaw pain on chewing, scalp tenderness or shoulder stiffness?', a: 'No. Just this awful pain behind the eye.', relevance: 'helpful' },
    { id: 'family', category: 'family', q: 'Any family history of aneurysm or brain haemorrhage?', a: 'My aunt died suddenly in her fifties. They said it was "a bleed in the head".', relevance: 'helpful' },
    { id: 'stress', category: 'social', q: 'Have you been under a lot of stress at work?', a: 'It is exam season. I am always stressed in exam season. This is different.', relevance: 'red-herring' },
  ],
  findings: buildFindings(52, {
    va: {
      OD: { uncorrected: 0, bestCorrected: 0, pinhole: 0, nearUncorrected: 0.5 },
      OS: { uncorrected: 0.1, bestCorrected: 0, pinhole: 0.1, nearUncorrected: 0.7 },
    },
    pupils: {
      sizeLightMm: { OD: 3, OS: 7 },
      sizeDarkMm: { OD: 5.5, OS: 7.5 },
      reactivity: { OD: 'brisk', OS: 'fixed' },
      rapd: 'none',
      nearResponse: 'normal',
      shape: { OD: 'round', OS: 'mid-dilated' },
    },
    motility: {
      distance: { horizontal: -30, vertical: 8, type: 'tropia', deviatingEye: 'OS' },
      near: { horizontal: -35, vertical: 8, type: 'tropia', deviatingEye: 'OS' },
      versions: {
        right: { OD: 0, OS: -4 },
        upRight: { OD: 0, OS: -4 },
        up: { OD: 0, OS: -4 },
        upLeft: { OD: 0, OS: -4 },
        downLeft: { OD: 0, OS: -3 },
        down: { OD: 0, OS: -2 },
        downRight: { OD: 0, OS: -2 },
      },
      npcCm: 30,
      diplopia: 'oblique',
      headPosture: 'none',
    },
    anterior: { OS: { lids: ['ptosis'] } },
    accommodation: { amplitudeD: { OD: 2.5, OS: 0.5 } },
    external: { ptosis: ['OS'] },
  }),
  essentialTests: ['pupils', 'motility'],
  helpfulTests: ['cover-test', 'visual-acuity', 'slit-lamp'],
  diagnosis: 'cn3-palsy',
  differentials: ['horner-syndrome', 'adie-pupil', 'cn6-palsy', 'cn4-palsy'],
  urgency: 'emergency',
  management:
    'Emergency: send her to the emergency department immediately (ambulance, not driving) for CT/CT angiography or MR angiography to exclude a posterior communicating artery aneurysm and subarachnoid haemorrhage, with lumbar puncture if imaging is negative but suspicion remains. Phone ahead to the on-call neurosurgical/neurology team. Do not dilate or delay for further tests.',
  teachingPoints: [
    'Ptosis + eye "down and out" + a dilated, poorly reactive pupil = pupil-involving CN III palsy: compressive aneurysm until proven otherwise.',
    'Pupillomotor fibres run on the outside of the nerve, so compression hits the pupil early; microvascular ischaemia hits the core and usually spares it.',
    'Anisocoria greater in bright light means the big pupil is the abnormal one (parasympathetic failure). Intorsion on attempted down-gaze (watch a conjunctival vessel) confirms CN IV is still working.',
    'Horner gives a SMALL pupil with mild ptosis; myasthenia never involves the pupil; an Adie pupil has no motility deficit.',
    'Sudden "worst headache of my life" with neck stiffness and vomiting suggests a bleed: this is a minutes-to-hours problem.',
  ],
  redFlags: [
    'Any pupil-involving or partial CN III palsy.',
    'Thunderclap headache, neck stiffness, vomiting, drowsiness.',
  ],
  emergency: { timeLimitSec: 120 },
  sources: [
    'https://www.merckmanuals.com/professional/neurologic-disorders/neuro-ophthalmologic-and-cranial-nerve-disorders/third-cranial-nerve-oculomotor-disorders',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC5965153',
  ],
};

export default cn3PalsyPupilInvolving;
