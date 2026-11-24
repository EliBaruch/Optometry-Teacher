import { buildFindings, type ClinicalCase } from '@core';

/** Right traumatic fourth-nerve palsy: the three-step test case. */
const cn4PalsyHeadTilt: ClinicalCase = {
  id: 'cn4-palsy-head-tilt',
  difficulty: 4,
  tags: ['diplopia', 'neuro', 'trauma', 'strabismus', 'three-step-test'],
  patient: {
    name: 'Sofia Lindqvist',
    age: 38,
    sex: 'F',
    occupation: 'Mountain-bike instructor',
    personality: 'Upbeat, outdoorsy, mildly annoyed that her body has betrayed her.',
    avatar: {
      skin: 0,
      hair: 'bob',
      hairColor: '#e3c27a',
      irisColor: '#4f86b3',
      glasses: 'none',
      facialHair: 'none',
      headwear: 'none',
      accessory: 'bandage',
      outfit: '#16a34a',
    },
  },
  chiefComplaint:
    "Things are doubled one on top of the other, and the top one is a bit tilted, like a wonky picture frame. Reading and walking downstairs are the worst. I've caught myself tilting my head to the left to make it go away. My friends say I look like a curious dog.",
  triageNote: 'Bike crash 3 weeks ago with brief loss of consciousness; CT head in ED reported normal.',
  history: [
    { id: 'trauma', category: 'onset', q: 'When did this start, and was there any injury?', a: "Right after my crash three weeks ago. Front wheel hit a root, I went over the bars and hit my head. Out for maybe a few seconds. Helmet's cracked.", relevance: 'key' },
    { id: 'vertical', category: 'symptoms', q: 'Are the images side by side or one above the other?', a: 'One above the other, with a little tilt. Not side by side.', relevance: 'key' },
    { id: 'gaze', category: 'symptoms', q: 'Where is it worst: looking down, up, left or right?', a: 'Down and to the left. So reading, stairs, and checking my phone on my lap. Looking up and right it almost disappears.', relevance: 'key' },
    { id: 'tilt', category: 'symptoms', q: 'Does tilting your head help or make it worse?', a: 'Tilting to the left fixes it. Tilting to the right makes the two images split right apart.', relevance: 'key' },
    { id: 'old-photos', category: 'ocular-history', q: 'Did you ever have a head tilt in old photos, before the accident?', a: 'Never. My mum checked the whole album out of curiosity. Straight as an arrow.', relevance: 'helpful' },
    { id: 'monocular', category: 'symptoms', q: 'Does covering one eye get rid of it?', a: 'Yes, either eye.', relevance: 'helpful' },
    { id: 'other-neuro', category: 'symptoms', q: 'Any droopy eyelid, numbness, weakness, imbalance or trouble swallowing?', a: 'Headaches for the first week, which settled. Nothing else.', relevance: 'helpful' },
    { id: 'thyroid', category: 'medical', q: 'Any thyroid problems?', a: 'Not that I know of.', relevance: 'neutral' },
    { id: 'helmet', category: 'social', q: 'What brand of helmet was it?', a: 'A very expensive one, which is now in the bin. Does it matter?', relevance: 'red-herring' },
  ],
  findings: buildFindings(38, {
    motility: {
      distance: { horizontal: 0, vertical: 6, type: 'tropia', deviatingEye: 'OD' },
      near: { horizontal: 0, vertical: 10, type: 'tropia', deviatingEye: 'OD' },
      versions: {
        downLeft: { OD: -2, OS: 0 },
        upLeft: { OD: 2, OS: 0 },
        left: { OD: 1, OS: 0 },
      },
      npcCm: 6,
      diplopia: 'vertical',
      headPosture: 'tilt-left',
    },
  }),
  essentialTests: ['cover-test', 'motility'],
  helpfulTests: ['pupils', 'visual-acuity', 'ophthalmoscopy'],
  diagnosis: 'cn4-palsy',
  differentials: ['cn3-palsy', 'cn6-palsy', 'intermittent-exotropia', 'convergence-insufficiency'],
  urgency: 'soon',
  management:
    'Refer within days to neuro-ophthalmology or orthoptics for confirmation (double Maddox rod for torsion) and review of her head injury imaging; MRI if the picture is atypical or other neurological signs appear. Manage diplopia with Fresnel vertical prism or occlusion and advise against riding until single. Traumatic palsies often improve over 6–12 months; strabismus surgery is considered once stable.',
  teachingPoints: [
    'Parks–Bielschowsky three-step: right hypertropia, worse in left gaze, worse on right head tilt = right superior oblique (CN IV) palsy.',
    'Patients tilt the head away from the palsied side (here to the left) to reduce the vertical deviation and torsion.',
    'Superior oblique depresses the eye in adduction, so symptoms are worst reading and on stairs (down and to the opposite side).',
    'Closed-head trauma is the commonest acquired cause; the long intracranial course of CN IV makes it vulnerable.',
    'Excyclotorsion over 10° on double Maddox rod suggests bilateral palsy; old photos with a tilt suggest a decompensated congenital palsy.',
  ],
  redFlags: [
    'Features of skew deviation (other brainstem signs, ocular tilt reaction), multiple cranial nerves, or progression need urgent imaging.',
  ],
  sources: [
    'https://eyewiki.aao.org/Cranial_Nerve_4_Palsy',
    'https://eyewiki.aao.org/Three_Step_Test_for_Cyclovertical_Muscle_Palsy',
  ],
};

export default cn4PalsyHeadTilt;
