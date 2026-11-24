import type { Diagnosis } from '@core';

/** Codex — refractive error and the amblyopia it can leave behind. */
const refractive: Diagnosis[] = [
  {
    id: 'myopia',
    name: 'Myopia',
    aka: ['Short-sightedness', 'Nearsightedness'],
    category: 'refractive',
    summary:
      'Parallel light focuses in front of the retina, usually because the eye has grown too long, so distance blurs while near stays sharp. It typically starts between ages 6 and 12 and progresses through the teens; parental myopia, heavy near work and little time outdoors all raise the risk. Every dioptre matters: high myopia (−6.00 D or more) multiplies the lifetime risk of retinal detachment, myopic maculopathy, glaucoma and cataract.',
    keyFindings: [
      'Reduced distance VA that improves fully with pinhole and with minus lenses',
      'Retinoscopy: "against" motion beyond the working-distance lens',
      'Myopia defined as a spherical equivalent of −0.50 D or more; high myopia −6.00 D or more (IMI)',
      'Duochrome: red letters sharper means the eye is still under-minused',
      'High myopes: tilted disc, peripapillary atrophy, lattice degeneration on dilated exam',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Prescribe the least minus that gives the best acuity: over-minusing just makes the eye accommodate.',
      'Myopia control for children is now standard care: low-dose atropine, defocus spectacles (DIMS/HAL), MiSight daily lenses or orthokeratology, plus about 2 hours a day outdoors.',
      'A child whose myopia appears to fluctuate or who reads better than the chart suggests may have pseudomyopia from accommodative spasm. Do a cycloplegic refraction.',
      'A sudden myopic shift in an adult points to nuclear cataract, uncontrolled diabetes or medication (e.g. topiramate). Do not just update the glasses.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Myopia',
  },
  {
    id: 'hyperopia',
    name: 'Hyperopia',
    aka: ['Long-sightedness', 'Farsightedness', 'Hypermetropia'],
    category: 'refractive',
    summary:
      'Light focuses behind the retina in a short eye, and young patients hide it by accommodating, so they often read 20/20 at distance yet suffer tired eyes, headaches and near blur. Children with significant uncorrected hyperopia risk accommodative esotropia and amblyopia. Short eyes also crowd the anterior chamber, so hyperopes carry a higher lifetime risk of angle closure.',
    keyFindings: [
      'Distance VA often normal in the young; near VA and comfort worse, especially at day\'s end',
      'Retinoscopy: "with" motion that needs plus to neutralise',
      'Cycloplegic refraction reveals more plus than the manifest (latent hyperopia)',
      'Accepts a +1.50 D lens at distance without blurring (latent hyperopia screen)',
      'Small, crowded discs and shallow anterior chamber (low Van Herick grade) in high hyperopes',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'A 20/20 chart line does not rule out hyperopia. Ask about asthenopia, and use cycloplegia in children.',
      'A child with esotropia or amblyopia gets the full cycloplegic plus. Symptomatic adults often do better with a partial prescription at first.',
      'Early "presbyopia" in someone in their 30s is often uncorrected hyperopia running out of accommodation.',
      'Check the angle (Van Herick, gonioscopy) before dilating a high hyperope.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Hyperopia',
  },
  {
    id: 'astigmatism',
    name: 'Astigmatism',
    aka: ['Cylinder', 'Toric refractive error'],
    category: 'refractive',
    summary:
      'The cornea or lens is curved more steeply in one meridian than the other, so there are two focal lines instead of a single focal point. Distance and near both blur, and patients report ghosting, shadowed letters and eyestrain. Most astigmatism is regular and corrected with cylinder lenses. Irregular astigmatism, as in keratoconus, needs a rigid or scleral lens.',
    keyFindings: [
      'Blur at all distances that improves with pinhole',
      'Keratometry or topography: two principal meridians differing by ≥0.75 D',
      'With-the-rule (minus-cyl axis near 180°) is typical in youth; against-the-rule (axis near 90°) increases with age',
      'Jackson cross-cylinder refines axis first, then power',
      'Retinoscopy: streak reflex neutralises at different powers in two meridians 90° apart',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Refine axis before power with the JCC. For every 0.50 D of cylinder you add, take 0.25 D off the sphere so the spherical equivalent stays put.',
      'Scissoring reflex, irregular mires or rising oblique cylinder in a young patient: get topography and think keratoconus.',
      'New astigmatism can be induced: a pterygium creates with-the-rule cyl and an upper-lid chalazion can press on the cornea.',
      'Uncorrected significant astigmatism in early childhood can cause meridional amblyopia.',
    ],
    rarity: 'common',
    reference: 'https://www.ncbi.nlm.nih.gov/books/NBK582142/',
  },
  {
    id: 'presbyopia',
    name: 'Presbyopia',
    aka: ['Age-related near blur', '"Short arms"'],
    category: 'refractive',
    summary:
      'The crystalline lens gradually stiffens and loses accommodation, so from the early-to-mid 40s near tasks blur and reading material drifts to arm\'s length. Everyone gets it. It is worse in dim light and at the end of the day. The fix is a reading addition (readers, progressives, bifocals, multifocal contacts or monovision); pilocarpine drops are an option for some.',
    keyFindings: [
      'Near VA reduced at 40 cm, improved with plus; distance VA unchanged',
      'Accommodative amplitude below age norm (Hofstetter average ≈ 18.5 − 0.3 × age)',
      'Typical age at onset 40–45 years',
      'Add guide: about +1.00 to +1.25 D in mid-40s, rising to +2.00 to +2.50 D by 60',
      'NRA/PRA balance used to fine-tune the final add',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Keep half the measured amplitude in reserve: work out the add so the patient uses no more than 50% of their accommodation at their working distance.',
      'Ask about working distances (laptop, sheet music, workbench) and prescribe for the task. Over-plussing shrinks the clear range.',
      'Near blur well before 40 calls for a look for latent hyperopia, anticholinergic medications or diabetes.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Presbyopia',
  },
  {
    id: 'anisometropia',
    name: 'Anisometropia',
    aka: ['Unequal refractive error'],
    category: 'refractive',
    summary:
      'The two eyes have significantly different refractive errors, usually defined as a difference of 1.00 D or more in spherical equivalent. In a child it can quietly cause amblyopia because the brain ignores the blurrier eye and nothing looks wrong from outside. In adults, correcting it can produce unequal image sizes (aniseikonia) and vertical prism when reading through the lower part of the lenses.',
    keyFindings: [
      'Interocular refractive difference ≥1.00 D (spherical equivalent)',
      'Amblyogenic risk: hyperopic difference ≥1.00–1.50 D, astigmatic ≥1.50 D, myopic ≥3.00 D',
      'Reduced BCVA in the more ametropic eye if amblyopia has set in',
      'Reduced stereoacuity despite straight eyes',
      'Asthenopia or size distortion when fully corrected in spectacles',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Eyes look straight, so these children are missed. Hyperopic anisometropia is the classic hidden cause of amblyopia found at school screenings.',
      'Contact lenses reduce aniseikonia and the vertical prism of unequal spectacle powers (Prentice\'s rule).',
      'Knapp\'s law: for purely axial anisometropia, spectacles at the anterior focal point minimise image-size difference. In practice, contacts usually win.',
    ],
    rarity: 'uncommon',
    reference: 'https://www.ncbi.nlm.nih.gov/books/NBK582146/',
  },
  {
    id: 'amblyopia',
    name: 'Amblyopia',
    aka: ['Lazy eye'],
    category: 'refractive',
    summary:
      'Visual acuity is reduced because the brain never received a clear, aligned image from that eye during the critical period. The eye itself is structurally normal. It affects roughly 1–5% of children, and the causes are strabismus, anisometropia, high bilateral ametropia or deprivation (congenital cataract, ptosis). Treatment works best when started early, but improvement is still possible in older children and teens.',
    keyFindings: [
      'Best-corrected VA reduced by ≥2 lines compared with the fellow eye, with no structural cause',
      'Crowding phenomenon: VA better with single optotypes than with a full line',
      'Associated strabismus, anisometropia or a deprivation cause',
      'Reduced stereoacuity; no RAPD (or only trace)',
      'Neutral-density filter drops amblyopic VA little, unlike organic disease',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Glasses first. In PEDIG, most children improved ≥2 lines with spectacles alone before any patching.',
      'For moderate amblyopia, 2 hours of patching a day works as well as 6, and weekend atropine 1% matches daily atropine.',
      'Amblyopia is a diagnosis of exclusion: dilate and check the fundus, media and pupils before blaming the brain.',
      'Deprivation amblyopia (e.g. congenital cataract) is the most severe kind and needs urgent action in infancy.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Amblyopia',
  },
];

export default refractive;
