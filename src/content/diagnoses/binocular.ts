import type { Diagnosis } from '@core';

/** Codex — binocular vision, strabismus and ocular motor cranial nerve palsies. */
const binocular: Diagnosis[] = [
  {
    id: 'convergence-insufficiency',
    name: 'Convergence Insufficiency',
    aka: ['CI'],
    category: 'binocular',
    summary:
      'The eyes struggle to turn in and hold together for near work. This is the most common binocular vision disorder of school-age children and young adults, and it often follows concussion. Words seem to move or double, the reader loses their place, gets headaches or gets sleepy after short spells of reading. It is very treatable: office-based vergence therapy is the best-proven option.',
    keyFindings: [
      'Exophoria greater at near than at distance (by ≥4Δ)',
      'Receded near point of convergence (break ≥6 cm)',
      'Reduced positive fusional vergence at near (fails Sheard\'s criterion or base-out break ≤15Δ)',
      'Low calculated AC/A ratio',
      'Symptom survey (CISS) score ≥16',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'CITT: 12 weeks of office-based vergence/accommodative therapy with home reinforcement beat pencil push-ups, computer therapy and placebo.',
      'Base-in reading prisms did no better than placebo in children.',
      'Always check accommodation as well. Accommodative insufficiency often coexists and mimics CI symptoms.',
      'New CI after a head injury is common. Ask about concussion.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Convergence_Insufficiency',
  },
  {
    id: 'accommodative-esotropia',
    name: 'Refractive Accommodative Esotropia',
    aka: ['Accommodative ET', 'Accommodative squint'],
    category: 'binocular',
    summary:
      'A child with uncorrected hyperopia accommodates hard to see clearly, and the linked convergence drives one eye inward. It usually appears between ages 2 and 3 and is often intermittent at first, worse when tired or looking at something close. Full cycloplegic glasses straighten the eyes, and amblyopia must be looked for and treated.',
    keyFindings: [
      'Esotropia appearing around age 2–3, often intermittent at first',
      'Moderate hyperopia on cycloplegic refraction (typically +3.00 to +5.00 D)',
      'Deviation eliminated or greatly reduced with full hyperopic correction',
      'Normal AC/A in the refractive form; esotropia ≥10Δ greater at near suggests high AC/A',
      'Amblyopia of the deviating eye is common',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Prescribe the full cycloplegic hyperopic correction, worn full-time.',
      'If eyes are straight at distance but still turn in at near through the glasses, consider a high AC/A and add an executive bifocal (about +2.50 to +3.00 D).',
      'Red flag: sudden esotropia with headache, abduction limitation or papilloedema is not accommodative. Look for a sixth nerve palsy and image.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Accommodative_Esotropia',
  },
  {
    id: 'intermittent-exotropia',
    name: 'Intermittent Exotropia',
    aka: ['IXT', 'Intermittent divergent squint'],
    category: 'binocular',
    summary:
      'An outward eye turn that comes and goes. It is the most common form of exotropia in children and usually appears before age 5. It shows when the child is tired, unwell, daydreaming or looking into the distance, and parents often notice the child closing one eye in bright sunlight. When the eyes are aligned the child has excellent binocular vision, so the question is how well the deviation is controlled.',
    keyFindings: [
      'Exotropia that alternates with exophoria; often larger at distance',
      'Classic history: one eye "drifts out" when tired; closes one eye in bright light',
      'Control score (e.g. Newcastle or office control score) documents severity over time',
      'Good near stereoacuity when the deviation is controlled',
      'Amblyopia uncommon',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Do a prolonged occlusion (patch) test: a distance-greater "divergence excess" pattern may disappear after occlusion (pseudo-divergence excess).',
      'Many children stay stable with observation. Overminus lenses and part-time patching can improve control. Surgery is for poor or worsening control.',
      'Measure at distance and also at true far distance (outdoors or down a corridor): the deviation is often bigger.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Intermittent_Exotropia',
  },
  {
    id: 'cn6-palsy',
    name: 'Abducens (Sixth Nerve) Palsy',
    aka: ['CN VI palsy', 'Lateral rectus palsy'],
    category: 'binocular',
    summary:
      'Weakness of the lateral rectus limits abduction, giving horizontal double vision that is worse at distance and on looking toward the affected side. In adults over 50 with diabetes or hypertension it is most often microvascular and recovers within months. The sixth nerve has a long course and is easily stretched, so a palsy can also be a false-localising sign of raised intracranial pressure, or a sign of tumour, trauma or inflammation.',
    keyFindings: [
      'Limited abduction of the affected eye',
      'Incomitant esotropia: larger at distance and in gaze toward the affected side',
      'Uncrossed horizontal diplopia',
      'Compensatory face turn toward the affected side',
      'Check discs for papilloedema and other cranial nerves (V, VII, VIII)',
    ],
    typicalUrgency: 'soon',
    pearls: [
      'Image any child, anyone under ~50, anyone without vascular risk factors, and anyone with another neurological sign, papilloedema or progression.',
      'Over 50 with headache, jaw claudication or scalp tenderness: check ESR/CRP for giant cell arteritis.',
      'Microvascular palsies should improve within about 3 months and resolve by 6. If not, image.',
      'Gradenigo syndrome: sixth nerve palsy with ear discharge and facial pain from petrous apex infection.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Abducens_Nerve_Palsy',
  },
  {
    id: 'cn4-palsy',
    name: 'Trochlear (Fourth Nerve) Palsy',
    aka: ['CN IV palsy', 'Superior oblique palsy'],
    category: 'binocular',
    summary:
      'Superior oblique weakness causes vertical and torsional double vision, worst when reading or going downstairs. The patient often tilts their head away from the affected side to fuse. It is the most common isolated cranial nerve cause of vertical diplopia. Trauma (the nerve is long and thin) and decompensation of a congenital palsy are the leading causes, followed by microvascular disease.',
    keyFindings: [
      'Hypertropia of the affected eye',
      'Parks–Bielschowsky three-step: hyper worse in contralateral gaze and on ipsilateral head tilt',
      'Excyclotorsion on double Maddox rod; >10° suggests bilateral palsy',
      'Compensatory head tilt away from the affected side',
      'Diplopia worse in downgaze (reading, stairs)',
    ],
    typicalUrgency: 'soon',
    pearls: [
      'Old photographs showing a long-standing head tilt, plus large vertical fusional amplitudes, point to a decompensated congenital palsy rather than a new lesion.',
      'Bilateral palsies (often after significant head trauma) give alternating hypertropia, a V-pattern esotropia and large excyclotorsion.',
      'If the three-step pattern does not fit, think skew deviation, myasthenia gravis or thyroid eye disease.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Cranial_Nerve_4_Palsy',
  },
  {
    id: 'cn3-palsy',
    name: 'Oculomotor (Third Nerve) Palsy',
    aka: ['CN III palsy'],
    category: 'binocular',
    summary:
      'The third nerve supplies four of the six extraocular muscles, the levator and the pupil sphincter, so a palsy gives ptosis, an eye that rests "down and out", and sometimes a dilated pupil. A new palsy involving the pupil is treated as an expanding posterior communicating artery aneurysm until proven otherwise. A rupture can kill, so the patient goes for emergency vascular imaging.',
    keyFindings: [
      'Ptosis with the eye resting down and out',
      'Limited adduction, elevation and depression; abduction (CN VI) and intorsion (CN IV) preserved',
      'Pupil-involving: dilated, poorly reactive pupil with anisocoria greater in bright light',
      'Often painful headache or periorbital pain (pain does not separate aneurysm from microvascular)',
      'Signs of aberrant regeneration (lid elevation on adduction or downgaze) imply compression',
    ],
    typicalUrgency: 'emergency',
    pearls: [
      'Pupillomotor fibres run on the outside of the nerve, so compression hits the pupil early and microvascular ischaemia (which damages the core) usually spares it.',
      'The "rule of the pupil" applies only to a complete motor palsy with a completely normal pupil. Partial palsies need imaging too.',
      'Same-day CTA or MRA. Over 50, also screen for giant cell arteritis.',
      'Aberrant regeneration never follows a microvascular palsy. If you see it, look for a mass or aneurysm.',
    ],
    rarity: 'rare',
    reference: 'https://eyewiki.aao.org/Oculomotor_nerve_palsy',
  },
];

export default binocular;
