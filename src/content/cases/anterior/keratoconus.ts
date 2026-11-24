import { buildFindings, type ClinicalCase } from '@core';

/** Progressive keratoconus in an atopic eye-rubber — refer for cross-linking before it advances. */
const keratoconusCase: ClinicalCase = {
  id: 'ant-keratoconus-esports',
  difficulty: 3,
  tags: ['corneal', 'irregular-astigmatism', 'young-adult', 'progressive', 'atopy'],
  patient: {
    name: 'Yusuf Demir',
    age: 19,
    sex: 'M',
    occupation: 'Computer science student and esports player',
    personality: 'Polite, precise, and quietly furious that his aim has gone off.',
    avatar: {
      skin: 2, hair: 'swept', hairColor: '#1e1712', irisColor: '#4b3621',
      glasses: 'square', outfit: '#14b8a6',
    },
  },
  chiefComplaint:
    "My glasses never feel right — three prescriptions in two years and the scoreboard still has ghost copies of every number. At night every streetlight is a comet.",
  history: [
    { id: 'rx-change', category: 'ocular-history', q: 'How often has your prescription changed?', a: 'Every six to eight months. Last time the optician said the cylinder had “jumped again”.', relevance: 'key' },
    { id: 'rubbing', category: 'social', q: 'Do you rub your eyes?', a: 'All the time. With my knuckles. It feels amazing.', relevance: 'key' },
    { id: 'atopy', category: 'medical', q: 'Any allergies, eczema or asthma?', a: 'Eczema on my hands and hay fever every spring.', relevance: 'key' },
    { id: 'monocular', category: 'symptoms', q: 'Is the ghosting in one eye, or both?', a: 'Worse in the left. If I close the right, everything is smeared and doubled.', relevance: 'key' },
    { id: 'hydrops', category: 'symptoms', q: 'Any sudden pain with the eye turning white and foggy?', a: 'No, nothing sudden — just slowly worse.', relevance: 'helpful' },
    { id: 'fhx', category: 'family', q: 'Anyone in the family with cornea problems?', a: 'My cousin in Izmir had a cornea transplant, I think.', relevance: 'helpful' },
    { id: 'meds', category: 'medications', q: 'Any medicines?', a: 'Antihistamine tablets in spring.', relevance: 'neutral' },
    { id: 'headache', category: 'symptoms', q: 'Do you get headaches with screens?', a: 'Sometimes, after eight hours of ranked.', relevance: 'red-herring' },
  ],
  findings: buildFindings(19, {
    va: {
      OD: { uncorrected: 1.0, bestCorrected: 0.1, pinhole: 0.1 },
      OS: { uncorrected: 1.4, bestCorrected: 0.3, pinhole: 0.2 },
    },
    refraction: {
      OD: { sphere: -1.5, cylinder: -2.0, axis: 30 },
      OS: { sphere: -3.5, cylinder: -4.5, axis: 40 },
    },
    retinoscopyReflex: { OD: 'irregular', OS: 'scissors' },
    keratometry: {
      OD: { k1: 45.5, k2: 47.25, axisK1: 30, mires: 'irregular' },
      OS: { k1: 47.0, k2: 51.5, axisK1: 40, mires: 'distorted' },
    },
    anterior: {
      OD: { conjunctiva: ['papillae'] },
      OS: { conjunctiva: ['papillae'], cornea: ['cone-thinning', 'vogt-striae', 'fleischer-ring'] },
    },
  }),
  essentialTests: ['keratometry', 'retinoscopy', 'slit-lamp'],
  helpfulTests: ['phoropter', 'pinhole', 'visual-acuity'],
  diagnosis: 'keratoconus',
  differentials: ['astigmatism', 'myopia', 'amblyopia', 'dry-eye'],
  urgency: 'soon',
  management:
    'Stop the eye rubbing and treat the allergy (antihistamine/mast-cell stabiliser drops). Refer promptly to a cornea service for tomography and corneal cross-linking — documented progression at 19 should not wait months. Meanwhile, rigid gas-permeable or scleral lenses will give far better vision than glasses; warn him that sudden pain with a white, foggy cornea (acute hydrops) needs same-day care.',
  teachingPoints: [
    'Scissors reflex on retinoscopy, irregular or distorted keratometry mires and oblique astigmatism that keeps changing are the refraction-room clues.',
    'Spectacles cannot correct irregular astigmatism: best-corrected acuity stays reduced, while a pinhole or a rigid lens does better.',
    'Vogt striae are fine vertical stress lines that vanish with gentle pressure on the globe; the Fleischer iron ring is best seen under cobalt blue.',
    'Eye rubbing and atopy drive progression — the most useful thing he can do today is stop rubbing.',
    'Stable keratoconus is a routine referral, but documented progression in a young patient is seen within weeks: cross-linking halts it but does not reverse it, so every month of delay is lost cornea.',
  ],
  redFlags: [
    'Sudden pain and a white, oedematous cornea (acute hydrops) — same day.',
    'Rapid progression in a teenager or young adult — expedite cross-linking.',
  ],
  sources: [
    'https://eyewiki.aao.org/Keratoconus',
    'https://www.aao.org/eyenet/article/diagnosis-and-management-of-keratoconus',
  ],
};

export default keratoconusCase;
