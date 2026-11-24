import type { Diagnosis } from '@core';

/** Codex — the crystalline lens. */
const lens: Diagnosis[] = [
  {
    id: 'cataract',
    name: 'Age-Related Cataract',
    aka: ['Cataract', 'Nuclear sclerosis', 'Posterior subcapsular cataract', 'Cortical cataract'],
    category: 'lens',
    summary:
      'The crystalline lens gradually clouds, so vision dims, colours fade, glare from headlights becomes troublesome, and glasses need changing more often. It is the leading cause of reversible blindness worldwide and almost universal with age. Diabetes, smoking, UV and steroids speed it up. Surgery is offered when the cataract gets in the way of daily life, not at a fixed acuity cut-off.',
    keyFindings: [
      'Gradual, painless blur with glare and reduced contrast; BCVA falls, pinhole helps only partly',
      'Nuclear sclerosis: yellow-brown nucleus and a myopic shift ("second sight" for reading)',
      'Cortical: spoke-like opacities pointing inward from the periphery, seen in retroillumination',
      'Posterior subcapsular: central plaque at the back of the lens with early glare and near blur (steroids, diabetes, younger patients)',
      'Dull or "oil-droplet" red reflex on retinoscopy; normal pupils (no RAPD)',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Cataract never causes an RAPD. If you find one, look for optic nerve or retinal disease.',
      'Reduced vision with a mild cataract: OCT the macula and examine the disc before blaming the lens.',
      'A posterior subcapsular cataract in a young person: ask about steroids (including inhalers) and diabetes.',
      'In infants, a cataract is an emergency for vision, because it causes dense amblyopia within weeks. Check the red reflex at every baby exam.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Cataract',
  },
];

export default lens;
