import { buildFindings, type ClinicalCase } from '@core';

/** Grade 4 hypertensive retinopathy with bilateral disc oedema: a hypertensive emergency. */
const hypertensiveMalignant: ClinicalCase = {
  id: 'hypertensive-malignant',
  difficulty: 4,
  tags: ['headache', 'bilateral', 'disc-swelling', 'systemic', 'blood-pressure', 'emergency'],
  patient: {
    name: 'Marcus Okafor',
    age: 41,
    sex: 'M',
    occupation: 'Live sound engineer',
    personality: 'Runs on energy drinks and tour schedules; jokes through pain because the show must go on.',
    avatar: {
      skin: 5, hair: 'short', hairColor: '#141010', irisColor: '#2a160c',
      glasses: 'none', facialHair: 'stubble', headwear: 'none', accessory: 'earrings', outfit: '#1d1d24',
    },
  },
  chiefComplaint:
    "Two days of a headache like a kick drum at the back of my skull, and now both eyes are blurry — like someone smeared Vaseline on the mixing desk. I mix for a living. I need my eyes.",
  triageNote: 'Tech took a courtesy BP because he looked unwell: 218/134 mmHg (repeat 214/132). Pulse 96.',
  history: [
    { id: 'bp-meds', category: 'medications', q: 'Have you ever been told you have high blood pressure? Do you take tablets for it?', a: "Yeah, two years ago. I ran out of the pills about a month ago on tour. Felt fine, so… I didn't chase it.", relevance: 'key' },
    { id: 'headache', category: 'symptoms', q: 'Tell me about the headache — where, how bad, anything make it worse?', a: 'Back of the head, pounding, worst when I wake up. Paracetamol barely touches it.', relevance: 'key' },
    { id: 'systemic', category: 'symptoms', q: 'Any chest pain, breathlessness, confusion, weakness or numbness?', a: "A bit short of breath on the stairs, and I felt foggy at load-out yesterday. No chest pain. Nothing numb.", relevance: 'key' },
    { id: 'laterality', category: 'onset', q: 'Is the blur in one eye or both? Sudden or gradual?', a: 'Both, over the last two days. Getting worse, not better.', relevance: 'key' },
    { id: 'stimulants', category: 'social', q: 'Any energy drinks, decongestants, cocaine or other stimulants?', a: "Four or five energy drinks a day on tour. No drugs — I swear on my best microphone.", relevance: 'helpful' },
    { id: 'diabetes', category: 'medical', q: 'Do you have diabetes or kidney problems?', a: "Not that anyone's told me. They mentioned my kidney blood test was \"a bit off\" last time.", relevance: 'helpful' },
    { id: 'pain-eom', category: 'symptoms', q: 'Does it hurt to move your eyes?', a: 'No, the eyes themselves feel fine. It is all head.', relevance: 'helpful' },
    { id: 'noise', category: 'social', q: 'Could loud music be causing the headaches?', a: "I wear earplugs every show. My ears are better behaved than my blood pressure, apparently.", relevance: 'red-herring' },
  ],
  findings: buildFindings(41, {
    va: {
      OD: { uncorrected: 0.3, bestCorrected: 0.3, pinhole: 0.3, nearUncorrected: 0.4 },
      OS: { uncorrected: 0.2, bestCorrected: 0.2, pinhole: 0.2, nearUncorrected: 0.3 },
    },
    refraction: {
      OD: { sphere: 0, cylinder: -0.25, axis: 180, add: 1.0 },
      OS: { sphere: 0, cylinder: 0, axis: 180, add: 1.0 },
    },
    fields: { OD: 'enlarged-blind-spot', OS: 'enlarged-blind-spot' },
    amsler: {
      OD: { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 2 },
      OS: { result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 1 },
    },
    posterior: {
      OD: {
        fundusTone: 'dark',
        disc: { cdr: 0.2, color: 'hyperemic', margins: 'elevated', edema: true, svp: false },
        vessels: { avRatio: 0.4, avNicking: true, copperWiring: true, tortuosity: 'normal', venousDilation: false },
        lesions: [
          { type: 'flame-hemorrhage', zone: 'disc', density: 3 },
          { type: 'flame-hemorrhage', zone: 'superotemporal', density: 2 },
          { type: 'cotton-wool-spot', zone: 'superotemporal', density: 3 },
          { type: 'cotton-wool-spot', zone: 'inferotemporal', density: 2 },
          { type: 'hard-exudate', zone: 'macula', density: 3 },
        ],
      },
      OS: {
        fundusTone: 'dark',
        disc: { cdr: 0.2, color: 'hyperemic', margins: 'elevated', edema: true, svp: false },
        vessels: { avRatio: 0.4, avNicking: true, copperWiring: true, tortuosity: 'normal', venousDilation: false },
        lesions: [
          { type: 'flame-hemorrhage', zone: 'disc', density: 2 },
          { type: 'flame-hemorrhage', zone: 'inferotemporal', density: 2 },
          { type: 'cotton-wool-spot', zone: 'superonasal', density: 2 },
          { type: 'cotton-wool-spot', zone: 'inferotemporal', density: 2 },
          { type: 'hard-exudate', zone: 'macula', density: 2 },
        ],
      },
    },
  }),
  essentialTests: ['ophthalmoscopy', 'visual-acuity'],
  helpfulTests: ['pupils', 'visual-fields', 'amsler', 'color-vision'],
  diagnosis: 'hypertensive-retinopathy',
  differentials: ['papilledema', 'npdr', 'crvo', 'optic-neuritis'],
  urgency: 'emergency',
  management:
    'Hypertensive emergency: blood pressure above 180/120 with end-organ damage (bilateral disc oedema, flame haemorrhages, cotton-wool spots, macular star — Keith-Wagener-Barker grade 4). Send him to the emergency department now by ambulance or accompanied transfer, phone ahead and send a written summary with the readings. Blood pressure must be lowered in a controlled way under monitoring — never try to crash it in the practice. Retinal review after systemic stabilisation; the retinopathy usually resolves over months.',
  teachingPoints: [
    'Bilateral disc swelling: always take the blood pressure before you assume raised intracranial pressure.',
    'Flame haemorrhages and cotton-wool spots sit in the nerve fibre layer; with AV nicking, copper wiring and a macular star this is the hypertensive signature.',
    'Severe BP (180/120 or higher) with flame haemorrhages, cotton-wool spots or disc oedema is a hypertensive emergency: same-day ED. Disc swelling is not required. Chronic AV nicking or copper wiring alone with controlled BP is a letter to the GP.',
    'Diabetic retinopathy favours microaneurysms and dot-blot haemorrhages; CRVO is usually one eye with dilated, tortuous veins.',
    'Optic neuritis is usually one eye, painful on eye movement, with an RAPD and red desaturation — this patient has none of that.',
  ],
  redFlags: ['BP ≥180/120 with symptoms', 'Bilateral optic disc oedema', 'Breathlessness or confusion (cardiac / brain end-organ damage)', 'Abnormal kidney function'],
  emergency: { timeLimitSec: 150 },
  sources: [
    'https://eyewiki.aao.org/Hypertensive_Retinopathy',
    'https://www.optometrytimes.com/view/when-send-your-hypertensive-patient-er',
    'https://www.merckmanuals.com/professional/cardiovascular-disorders/hypertension/hypertensive-emergencies',
  ],
};

export default hypertensiveMalignant;
