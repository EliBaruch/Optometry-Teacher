import type { Diagnosis } from '@core';

/** Codex — anterior uvea and the glaucomas. */
const uveaGlaucoma: Diagnosis[] = [
  {
    id: 'anterior-uveitis',
    name: 'Acute Anterior Uveitis',
    aka: ['Iritis', 'Iridocyclitis'],
    category: 'anterior',
    summary:
      'Inflammation of the iris and ciliary body gives a painful red eye, photophobia and mild blur, usually in one eye at a time, in young to middle-aged adults. Up to half of acute anterior uveitis is HLA-B27 associated (ankylosing spondylitis, reactive arthritis, IBD, psoriasis). It needs prompt topical steroid and a cycloplegic to control the pain and prevent the iris sticking to the lens.',
    keyFindings: [
      'Circumcorneal (ciliary) flush with deep aching pain',
      'Anterior chamber cells and flare (SUN grade, e.g. 2+ = 16–25 cells per 1×1 mm beam)',
      'Fine keratic precipitates (non-granulomatous) or "mutton-fat" KPs (granulomatous)',
      'Small, sluggish pupil; posterior synechiae',
      'Consensual photophobia: light in the fellow eye hurts the inflamed one',
      'IOP often low (ciliary body shutdown), though some forms run high',
    ],
    typicalUrgency: 'urgent',
    pearls: [
      'Treatment: topical prednisolone acetate 1% frequently, tapered slowly, plus a cycloplegic. Recheck IOP because steroid responders exist.',
      'A first, unilateral, non-granulomatous episode with an unremarkable history rarely needs a full workup. Recurrent, bilateral or granulomatous disease does (sarcoid, syphilis, TB).',
      'Always dilate. Look for vitritis or retinitis that would make this panuveitis or an infection.',
      'Back stiffness in the morning that eases with exercise? Ask, and think HLA-B27.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Acute_Anterior_Uveitis',
  },
  {
    id: 'acute-angle-closure',
    name: 'Acute Angle-Closure Crisis',
    aka: ['Acute angle-closure glaucoma', 'Acute primary angle closure', 'AACG'],
    category: 'glaucoma',
    summary:
      'The peripheral iris suddenly blocks the drainage angle and the eye pressure shoots up to 40–80 mmHg within hours. The result is a severe, painful red eye with halos, blurred vision, headache, nausea and vomiting. It typically strikes older, hyperopic adults, more often women and people of East Asian descent, and it is often triggered by dim light or dilating drugs. Without rapid pressure lowering the optic nerve can be permanently damaged within hours.',
    keyFindings: [
      'IOP markedly raised (often 40–80 mmHg); eye rock-hard',
      'Mid-dilated, fixed or sluggish oval pupil',
      'Hazy, oedematous cornea; halos around lights',
      'Shallow anterior chamber; Van Herick grade 1 or less; closed angle on gonioscopy',
      'Conjunctival injection with severe pain, headache, nausea/vomiting',
      'Fellow eye has a narrow, occludable angle',
    ],
    typicalUrgency: 'emergency',
    pearls: [
      'Emergency: lower IOP now with topical beta-blocker, alpha-agonist and carbonic anhydrase inhibitor, plus oral or IV acetazolamide. Add pilocarpine once the pressure starts to fall.',
      'Definitive treatment is laser peripheral iridotomy, and the fellow eye gets one as well.',
      'Bilateral angle closure with myopic shift after starting topiramate is ciliochoroidal effusion. Stop the drug and avoid pilocarpine, which makes it worse.',
      'Vomiting with headache sends patients to the wrong department. Always check the eyes in an older adult with headache and a red eye.',
    ],
    rarity: 'uncommon',
    reference: 'https://www.ncbi.nlm.nih.gov/books/NBK430857/',
  },
  {
    id: 'poag',
    name: 'Primary Open-Angle Glaucoma',
    aka: ['POAG', 'Chronic glaucoma', '"The silent thief of sight"'],
    category: 'glaucoma',
    summary:
      'A chronic, progressive optic neuropathy in which retinal ganglion cells are lost and the disc cups, with a matching pattern of field loss, while the drainage angle remains open. It is painless and symptomless until late, when peripheral vision has already gone. Risk rises with age, IOP, African or Hispanic ancestry, family history, thin corneas and myopia. Lowering IOP is the only proven treatment.',
    keyFindings: [
      'Enlarged or asymmetric vertical cup-to-disc ratio (asymmetry ≥0.2 is suspicious)',
      'Neuroretinal rim thinning that breaks the ISNT rule; notching; disc haemorrhage',
      'RNFL thinning on OCT, typically inferotemporal and superotemporal first',
      'Arcuate scotoma or nasal step that respects the horizontal meridian',
      'Open angle on gonioscopy; IOP often >21 mmHg (but not always)',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Set a target IOP (often a 20–30% reduction). First-line treatment is a prostaglandin analogue or selective laser trabeculoplasty.',
      'A disc haemorrhage is a sign of progression risk. Photograph it and tighten follow-up.',
      'Thin central corneas make Goldmann read low and are an independent risk factor (OHTS).',
      'Structure and function must agree. If the field defect does not match the disc, think neurological.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Primary_Open-Angle_Glaucoma',
  },
  {
    id: 'ocular-hypertension',
    name: 'Ocular Hypertension',
    aka: ['OHT', 'Glaucoma suspect (IOP)'],
    category: 'glaucoma',
    summary:
      'Eye pressure is consistently above normal (>21 mmHg) but the optic nerve, nerve fibre layer and visual field are healthy and the angle is open. It is common, and only a minority ever progress to glaucoma. Risk is estimated from age, IOP, corneal thickness and disc appearance. Treatment is offered to higher-risk patients; the rest are monitored.',
    keyFindings: [
      'IOP >21 mmHg on repeated Goldmann measurements',
      'Healthy optic disc and normal RNFL on OCT',
      'Normal standard automated perimetry',
      'Open angles on gonioscopy',
      'Central corneal thickness measured (thin cornea raises risk)',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'OHTS: treatment roughly halved the 5-year conversion to glaucoma (about 9.5% untreated vs 4.4% treated).',
      'A thick cornea can make IOP read falsely high. Always measure pachymetry before labelling someone.',
      'Exclude secondary causes: pigment dispersion, pseudoexfoliation, steroid use.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Ocular_Hypertension',
  },
  {
    id: 'normal-tension-glaucoma',
    name: 'Normal-Tension Glaucoma',
    aka: ['NTG', 'Low-tension glaucoma', 'Normal-pressure glaucoma'],
    category: 'glaucoma',
    summary:
      'Glaucomatous optic neuropathy and field loss with IOP that has never been measured above 21 mmHg. It is especially common in Japanese and other East Asian populations. Vascular factors (migraine, Raynaud phenomenon, nocturnal hypotension, sleep apnoea) are thought to contribute. Lowering IOP by a further 30% still slows progression, which proves that pressure matters even here.',
    keyFindings: [
      'Glaucomatous cupping and RNFL loss with IOP consistently ≤21 mmHg',
      'Disc haemorrhages are frequent',
      'Dense, paracentral field defects close to fixation',
      'Open angles; no secondary cause',
      'Often history of migraine, Raynaud or low blood pressure',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Collaborative NTG Study: a 30% IOP reduction cut progression from about 35% to 12%.',
      'Before labelling NTG, rule out mimics: pallor out of proportion to cupping, young age, a field defect that respects the vertical meridian, or a drop in VA or colour vision calls for neuroimaging.',
      'Check for nocturnal hypotension, especially in patients on night-time blood pressure tablets.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Normal_Tension_Glaucoma',
  },
];

export default uveaGlaucoma;
