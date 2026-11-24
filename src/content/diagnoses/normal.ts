import type { Diagnosis } from '@core';

/** Codex — the healthy eye, the diagnosis you have to earn. */
const normal: Diagnosis[] = [
  {
    id: 'healthy-eyes',
    name: 'Healthy Eyes',
    aka: ['Normal ocular examination', 'No ocular pathology'],
    category: 'normal',
    summary:
      'A complete examination with every finding inside normal limits, and the symptom fully explained by something benign such as tired eyes after a long screen session, a transient floater already investigated, or simple worry. Recognising normal is a real skill, because it prevents needless referrals, drops and anxiety. You earn it by ruling out each red flag, not by assuming it.',
    keyFindings: [
      'VA 20/20 (6/6) or better in each eye with correction',
      'Pupils equal, round and reactive with no RAPD; full eye movements; orthophoric or small phoria',
      'IOP within 10–21 mmHg with symmetric values',
      'Healthy discs (vertical C/D around 0.3, ISNT rim pattern), flat macula, attached retina',
      'Full visual fields and normal colour vision',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Normal is a conclusion, not a default. Document the negatives that rule out the dangerous causes of the complaint.',
      'Large but symmetric cups in a large disc can be physiological. Look at rim width and disc size, and compare with OCT, before calling glaucoma.',
      'Explain what you checked and why it is reassuring, and agree when to return. Good reassurance is good care.',
      'Routine recall: adults usually every 1–2 years; yearly from 65, and for diabetics, contact lens wearers and children in myopia control.',
    ],
    rarity: 'common',
    reference: 'https://www.aao.org/eye-health/tips-prevention/eye-exams-101',
  },
];

export default normal;
