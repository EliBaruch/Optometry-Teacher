/**
 * The clinical reasoning behind colleagues' slips. Pure data + helpers, no services.
 *
 * - DECISIVE: per diagnosis, the tests whose findings define it. Skipping one of these means the
 *   diagnosis cannot be made, so a skip only ever "misleads" through a curated CONTRASTS entry
 *   marked `skip: true` (a confusion that is genuinely made without that test).
 * - CONTRASTS: per diagnosis, its classic mimics and the finding that separates the two
 *   (taken from the case authors' teaching points). Every wrong call carries one of these.
 */
import {
  TEST_CATALOG, formatSnellen,
  type ClinicalCase, type Diagnosis, type DiagnosisId, type Eye, type TestId,
} from '@core';

export interface Contrast {
  mimic: DiagnosisId;
  /** The test whose findings separate the two. */
  test: TestId;
  /** One line: what separates the diagnosis from the mimic. `{iop}` is filled from the case. */
  finding: string;
  /** True when skipping `test` genuinely leads clinicians to call the mimic instead. */
  skip?: true;
}

/** Tests that define each diagnosis: without them it cannot reasonably be called. */
export const DECISIVE: Record<DiagnosisId, TestId[]> = {
  'acute-angle-closure': ['tonometry', 'slit-lamp'],
  'allergic-conjunctivitis': ['slit-lamp'],
  'anterior-uveitis': ['slit-lamp'],
  'bacterial-conjunctivitis': ['slit-lamp'],
  'cataract': ['slit-lamp'],
  'corneal-abrasion': ['fluorescein', 'slit-lamp'],
  'corneal-foreign-body': ['slit-lamp'],
  'dry-eye': ['slit-lamp', 'fluorescein'],
  'herpes-zoster-ophthalmicus': ['slit-lamp'],
  'hsv-keratitis': ['fluorescein', 'slit-lamp'],
  'keratoconus': ['keratometry', 'retinoscopy'],
  'microbial-keratitis': ['slit-lamp', 'fluorescein'],
  'poag': ['ophthalmoscopy', 'tonometry', 'visual-fields'],
  'pterygium': ['slit-lamp'],
  'subconjunctival-hemorrhage': ['slit-lamp'],
  'viral-conjunctivitis': ['slit-lamp'],
  'brvo': ['ophthalmoscopy'],
  'crao': ['ophthalmoscopy'],
  'crvo': ['ophthalmoscopy'],
  'central-serous': ['ophthalmoscopy'],
  'diabetic-macular-edema': ['ophthalmoscopy'],
  'dry-amd': ['ophthalmoscopy'],
  'healthy-eyes': ['ophthalmoscopy'],
  'hypertensive-retinopathy': ['ophthalmoscopy'],
  'npdr': ['ophthalmoscopy'],
  'pdr': ['ophthalmoscopy'],
  'pvd': ['ophthalmoscopy'],
  'retinal-detachment': ['ophthalmoscopy'],
  'retinal-tear': ['ophthalmoscopy'],
  'wet-amd': ['ophthalmoscopy'],
  'accommodative-esotropia': ['cover-test', 'retinoscopy', 'motility'],
  'amblyopia': ['visual-acuity', 'retinoscopy', 'cover-test'],
  'cn3-palsy': ['pupils', 'motility'],
  'cn4-palsy': ['cover-test', 'motility'],
  'cn6-palsy': ['motility', 'cover-test'],
  'congenital-color-deficiency': ['color-vision'],
  'convergence-insufficiency': ['convergence', 'cover-test'],
  'giant-cell-arteritis': ['ophthalmoscopy'],
  'homonymous-hemianopia': ['visual-fields'],
  'horner-syndrome': ['pupils'],
  'hyperopia': ['retinoscopy'],
  'myopia': ['retinoscopy'],
  'optic-neuritis': ['color-vision'],
  'papilledema': ['ophthalmoscopy'],
  'pituitary-adenoma': ['visual-fields'],
  'presbyopia': ['phoropter'],
};

/** Is it safe to skip `test` and still reach the diagnosis? Unknown diagnoses: only non-essential tests. */
export function canSkipAndStillDiagnose(kase: ClinicalCase, test: TestId): boolean {
  const decisive = DECISIVE[kase.diagnosis];
  if (!decisive) return !kase.essentialTests.includes(test);
  return !decisive.includes(test);
}

const C = (mimic: DiagnosisId, test: TestId, finding: string, skip?: true): Contrast => ({ mimic, test, finding, ...(skip ? { skip } : {}) });

export const CONTRASTS: Record<DiagnosisId, Contrast[]> = {
  'acute-angle-closure': [
    C('anterior-uveitis', 'tonometry', 'The pressure separates them: {iop} here. Uveitis gives a small pupil and normal or low pressure; angle closure a mid-dilated, fixed pupil and very high pressure.', true),
  ],
  'anterior-uveitis': [
    C('acute-angle-closure', 'slit-lamp', 'Cells, flare and a small, sometimes irregular pupil are uveitis; angle closure gives a mid-dilated, fixed pupil, a shallow chamber and very high pressure.'),
    C('microbial-keratitis', 'slit-lamp', 'A clear cornea with no stromal infiltrate, plus cells and flare in the chamber, makes it uveitis rather than keratitis.'),
  ],
  'allergic-conjunctivitis': [
    C('viral-conjunctivitis', 'slit-lamp', 'Itch with papillae and chemosis and no preauricular node is allergy; follicles plus a tender node point to a virus.'),
    C('bacterial-conjunctivitis', 'slit-lamp', 'Itch, papillae and watery discharge in both eyes point to allergy; mucopurulent discharge with lids stuck shut is bacterial.'),
  ],
  'bacterial-conjunctivitis': [
    C('viral-conjunctivitis', 'slit-lamp', 'Mucopurulent discharge with lids stuck shut and no preauricular node is bacterial; watery discharge, follicles and a node are viral.'),
    C('allergic-conjunctivitis', 'slit-lamp', 'Itch is the hallmark of allergy; pus with lids stuck shut is infective, even with a little itch.'),
  ],
  'cataract': [
    C('dry-amd', 'slit-lamp', 'The lens opacity, a dull red reflex and straight lines on the Amsler grid point to cataract rather than macular disease.'),
    C('myopia', 'pinhole', 'Pinhole stalls at the best-corrected level and never reaches normal acuity, so the loss is not just refractive: the myopic shift comes from nuclear sclerosis.'),
  ],
  'corneal-abrasion': [
    C('corneal-foreign-body', 'slit-lamp', 'A clean epithelial defect with nothing embedded, and nothing under the everted upper lid, is an abrasion.'),
    C('microbial-keratitis', 'slit-lamp', 'A clean staining defect over a clear stroma is an abrasion; a white infiltrate under it means infection.'),
  ],
  'corneal-foreign-body': [
    C('corneal-abrasion', 'slit-lamp', 'Staining alone looks like an abrasion; the embedded fragment and its rust ring at the slit lamp make it a foreign body, and change the plan.'),
  ],
  'dry-eye': [
    C('allergic-conjunctivitis', 'fluorescein', 'Burning without itch, no papillae or follicles, and a tear break-up time under 10 seconds point to dry eye, not allergy.'),
    C('viral-conjunctivitis', 'slit-lamp', 'No follicles, no discharge and no preauricular node, but a fast tear break-up: a tear-film problem, not an infection.'),
  ],
  'herpes-zoster-ophthalmicus': [
    C('hsv-keratitis', 'fluorescein', 'Zoster pseudodendrites are raised, stain poorly and lack terminal bulbs; a dermatomal rash that respects the midline completes the picture.'),
    C('anterior-uveitis', 'slit-lamp', 'The dermatomal rash and Hutchinson sign say zoster; any uveitis here is part of the zoster, not a separate disease.'),
  ],
  'hsv-keratitis': [
    C('viral-conjunctivitis', 'fluorescein', 'A branching dendrite with terminal bulbs that stains with fluorescein is herpes simplex; adenovirus gives follicles and a node, not a dendrite.', true),
    C('corneal-abrasion', 'fluorescein', 'A branching dendrite with terminal bulbs, and reduced corneal sensation, is herpes simplex, not a scratch.'),
  ],
  'keratoconus': [
    C('astigmatism', 'keratometry', 'Irregular, distorted keratometry mires and a scissors reflex separate keratoconus from regular astigmatism; spectacles cannot fully correct it.'),
    C('myopia', 'retinoscopy', 'A scissors reflex and best-corrected acuity that stays reduced in spectacles point to an irregular cornea, not simple myopia.'),
  ],
  'microbial-keratitis': [
    C('corneal-abrasion', 'slit-lamp', 'A white stromal infiltrate under a staining defect in a contact lens wearer is microbial keratitis until proven otherwise; a plain abrasion has a clear stroma.'),
    C('hsv-keratitis', 'fluorescein', 'Herpes simplex gives a branching dendrite with terminal bulbs; a dense white stromal infiltrate in a lens wearer is bacterial until proven otherwise.'),
  ],
  'poag': [
    C('normal-tension-glaucoma', 'tonometry', 'The pressure separates them: {iop} here. Normal-tension glaucoma is glaucomatous damage with pressure always 21 mmHg or below.', true),
    C('ocular-hypertension', 'ophthalmoscopy', 'Ocular hypertension is raised pressure with a healthy nerve and field; rim thinning with a matching arcuate defect makes it glaucoma.'),
  ],
  'pterygium': [
    C('pinguecula', 'slit-lamp', 'A pterygium crosses the limbus onto the cornea; a pinguecula stays on the conjunctiva.'),
  ],
  'subconjunctival-hemorrhage': [
    C('bacterial-conjunctivitis', 'slit-lamp', 'Flat, sharply edged blood with no discharge, normal vision and no pain is a subconjunctival haemorrhage: no inflammation, no infection.'),
    C('episcleritis', 'slit-lamp', 'Blood under the conjunctiva is flat and sharply edged; episcleritis is a sector of engorged vessels that blanch with phenylephrine.'),
  ],
  'viral-conjunctivitis': [
    C('bacterial-conjunctivitis', 'slit-lamp', 'Follicles, watery discharge and a tender preauricular node after a cold are adenoviral; bacterial gives mucopurulent discharge and no node.'),
    C('allergic-conjunctivitis', 'slit-lamp', 'Itch and papillae point to allergy; follicles and a tender preauricular node point to a virus.'),
  ],
  'brvo': [
    C('crvo', 'ophthalmoscopy', 'The haemorrhages fan out in a wedge from an AV crossing and stop at the horizontal raphe; all four quadrants would be CRVO.'),
    C('hypertensive-retinopathy', 'ophthalmoscopy', 'Bilateral AV nicking says chronic hypertension, but a one-eyed sectoral bleed says vein occlusion.'),
  ],
  'crao': [
    C('crvo', 'ophthalmoscopy', 'CRAO is a pale, whitened retina with a cherry-red spot and box-carred arterioles; CRVO is haemorrhages everywhere ("blood and thunder").'),
    C('retinal-detachment', 'ophthalmoscopy', 'A detachment is a grey, elevated retina behind a curtain; here the retina is flat, white and bloodless with a cherry-red spot.'),
  ],
  'crvo': [
    C('brvo', 'ophthalmoscopy', 'Haemorrhages in all four quadrants with dilated, tortuous veins are CRVO; a sectoral wedge that respects the horizontal raphe is BRVO.'),
    C('hypertensive-retinopathy', 'ophthalmoscopy', 'CRVO is one eye with dilated, tortuous veins and haemorrhages everywhere; hypertensive retinopathy is bilateral.'),
  ],
  'central-serous': [
    C('hyperopia', 'amsler', 'A new small hyperopic shift with Amsler distortion is fluid under the macula, not a reason to just prescribe glasses: look for the serous dome.'),
    C('optic-neuritis', 'pupils', 'No pain on eye movement, no RAPD and colours mostly preserved separate central serous from optic neuritis.'),
  ],
  'diabetic-macular-edema': [
    C('npdr', 'ophthalmoscopy', 'Hard exudates in a ring around leaking microaneurysms near the fovea, with a pinhole that does not help, mean the macula is involved: macular oedema, not NPDR alone.'),
    C('wet-amd', 'ophthalmoscopy', 'Wet AMD brings sudden distortion and subretinal blood without a diabetic background; circinate exudates in a diabetic mean macular oedema.'),
  ],
  'dry-amd': [
    C('wet-amd', 'ophthalmoscopy', 'Drusen and atrophy with no fluid or blood is dry AMD; sudden distortion with subretinal blood signals conversion to wet.'),
    C('cataract', 'ophthalmoscopy', 'Cataract dims vision evenly; drusen and atrophy at the macula are what explain this central loss.'),
  ],
  'healthy-eyes': [
    C('pvd', 'ophthalmoscopy', 'Long-standing, unchanged floaters with a normal dilated exam are physiological; a PVD brings new floaters, often with flashes, and a Weiss ring.'),
    C('retinal-tear', 'ophthalmoscopy', 'A normal dilated peripheral exam with no pigment in the vitreous excludes a tear: restraint is a skill.'),
  ],
  'hypertensive-retinopathy': [
    C('papilledema', 'ophthalmoscopy', 'Bilateral disc swelling with flame haemorrhages, cotton-wool spots and a macular star: take the blood pressure before you assume raised intracranial pressure.'),
    C('npdr', 'ophthalmoscopy', 'Flame haemorrhages, cotton-wool spots and AV nicking are the hypertensive signature; diabetic retinopathy favours microaneurysms and dot-blot haemorrhages.'),
  ],
  'npdr': [
    C('pdr', 'ophthalmoscopy', 'No new vessels on the disc or elsewhere means non-proliferative: check the disc and the arcades before you call it.'),
    C('diabetic-macular-edema', 'ophthalmoscopy', 'Exudates away from the fovea are not macular oedema; centre-involving thickening is what changes the plan.'),
  ],
  'pdr': [
    C('npdr', 'ophthalmoscopy', 'New vessels at the disc with a vitreous haemorrhage make it proliferative, high-risk disease: treatment within days.'),
    C('pvd', 'ophthalmoscopy', 'A young type 1 diabetic with sudden ink-like floaters has a bleed from new vessels until proven otherwise; PVD is the older patient\'s story.'),
  ],
  'pvd': [
    C('retinal-tear', 'ophthalmoscopy', 'A Weiss ring with no break on a dilated peripheral exam and no pigment in the vitreous is a PVD; you can only call it after looking for a tear.'),
    C('retinal-detachment', 'ophthalmoscopy', 'No curtain, full fields and normal acuity separate a PVD from a detachment.'),
  ],
  'retinal-detachment': [
    C('pvd', 'ophthalmoscopy', 'A curtain-like field loss over elevated retina makes it a detachment; PVD alone has no field defect.'),
    C('retinal-tear', 'ophthalmoscopy', 'A tear with a rising shadow and a field defect has already become a detachment, and that sets the clock: macula-on goes to the surgeon today.'),
  ],
  'retinal-tear': [
    C('pvd', 'ophthalmoscopy', 'You cannot call "just a PVD" without a dilated peripheral exam: pigment in the vitreous (Shafer sign) means a retinal break until proven otherwise.', true),
    C('retinal-detachment', 'ophthalmoscopy', 'No curtain and full fields: this is a tear, not yet a detachment. That distinction sets the clock.'),
  ],
  'wet-amd': [
    C('dry-amd', 'ophthalmoscopy', 'New distortion with blood under the macula is wet AMD: dry AMD declines over years, wet changes over days.'),
    C('central-serous', 'ophthalmoscopy', 'Central serous strikes younger, stressed patients and makes a clear serous blister, not haemorrhage beside drusen.'),
  ],
  'accommodative-esotropia': [
    C('cn6-palsy', 'motility', 'Full abduction in both eyes makes the turn comitant; an abduction deficit with a bigger turn at distance would point to a sixth-nerve palsy.'),
  ],
  'amblyopia': [
    C('anisometropia', 'visual-acuity', 'Best-corrected acuity that stays reduced in one eye, even with the full prescription, is what makes this amblyopia rather than anisometropia alone.', true),
    C('accommodative-esotropia', 'cover-test', 'Orthophoria on the cover test separates refractive (anisometropic) amblyopia from strabismic amblyopia.'),
  ],
  'cn3-palsy': [
    C('horner-syndrome', 'pupils', 'Horner gives a SMALL pupil and mild ptosis; a third-nerve palsy gives a BIG, poorly reactive pupil, marked ptosis and an eye down and out.'),
    C('adie-pupil', 'motility', 'An Adie pupil has no motility deficit; ptosis with an eye down and out means the third nerve.'),
  ],
  'cn4-palsy': [
    C('cn3-palsy', 'cover-test', 'A hypertropia worse in opposite gaze and on tilting the head to the same side (Parks three-step) is a superior oblique palsy; CN III gives ptosis and an eye down and out.'),
    C('cn6-palsy', 'motility', 'A vertical deviation that changes with head tilt is CN IV; a sixth-nerve palsy gives a horizontal esotropia with an abduction deficit.'),
  ],
  'cn6-palsy': [
    C('cn3-palsy', 'motility', 'Normal pupils and lids, with full adduction, elevation and depression, keep this an isolated sixth-nerve palsy.'),
    C('cn4-palsy', 'cover-test', 'Horizontal diplopia worse at distance with an abduction deficit is CN VI; a fourth-nerve palsy gives vertical diplopia, worse looking down.'),
  ],
  'congenital-color-deficiency': [
    C('optic-neuritis', 'color-vision', 'Congenital colour deficiency is bilateral, symmetric and stable with normal acuity, pupils and fundus; acquired loss is asymmetric and changing, often with an RAPD.'),
  ],
  'convergence-insufficiency': [
    C('hyperopia', 'convergence', 'A receded near point of convergence with a larger exophoria at near is convergence insufficiency; latent hyperopia shows plus on retinoscopy and a near esophoria.'),
    C('intermittent-exotropia', 'cover-test', 'Intermittent exotropia breaks into a visible tropia, usually at distance first; convergence insufficiency stays a phoria held with effort at near.'),
  ],
  'giant-cell-arteritis': [
    C('crao', 'ophthalmoscopy', 'CRAO gives retinal whitening with a cherry-red spot; here the retina is normal and the disc is chalky-white and swollen (arteritic AION).'),
    C('optic-neuritis', 'ophthalmoscopy', 'Jaw claudication, scalp tenderness and a chalky-white swollen disc over 50 mean giant cell arteritis; optic neuritis is a younger patient with pain on eye movement.'),
  ],
  'homonymous-hemianopia': [
    C('pituitary-adenoma', 'visual-fields', 'The same side missing in both eyes is homonymous, so the lesion is behind the chiasm; a pituitary lesion gives a gradual bitemporal defect.'),
    C('crao', 'visual-fields', 'CRAO and retinal detachment take vision from one eye; covering each eye in turn shows both eyes share the missing half.'),
  ],
  'horner-syndrome': [
    C('adie-pupil', 'pupils', 'Anisocoria greater in the dark means the small pupil is abnormal (Horner); an Adie pupil is the large one and reacts poorly to light.'),
    C('cn3-palsy', 'pupils', 'CN III palsy gives a BIG pupil with marked ptosis and a motility deficit; Horner gives a small pupil and mild ptosis.'),
  ],
  'hyperopia': [
    C('presbyopia', 'retinoscopy', 'With-motion on retinoscopy, and more plus once accommodation is relaxed, reveal latent hyperopia; uncorrected hyperopia lowers the amplitude and mimics early presbyopia.'),
    C('convergence-insufficiency', 'cover-test', 'A small near esophoria fits accommodative effort; convergence insufficiency gives a near exophoria with a receded near point.'),
  ],
  'myopia': [
    C('astigmatism', 'retinoscopy', 'The reflex neutralises with minus sphere and little cylinder, and pinhole clears the blur: this is spherical myopia.'),
    C('keratoconus', 'keratometry', 'Regular, low corneal cylinder with clean mires argues against keratoconus; a scissors reflex or irregular mires would change that.'),
  ],
  'optic-neuritis': [
    C('central-serous', 'pupils', 'An RAPD and red desaturation point to the optic nerve; central serous gives Amsler distortion and a serous blister, with no RAPD.'),
    C('papilledema', 'pupils', 'Optic neuritis is one eye, painful to move, with an RAPD; papilloedema is bilateral disc swelling with normal acuity early and no RAPD.'),
  ],
  'papilledema': [
    C('optic-neuritis', 'ophthalmoscopy', 'Bilateral disc swelling with normal acuity early and no RAPD is papilloedema; optic neuritis is one eye, painful to move, with an RAPD.'),
    C('hypertensive-retinopathy', 'ophthalmoscopy', 'Always take the blood pressure with bilateral disc swelling: a normal reading rules out malignant hypertension as the cause.'),
  ],
  'pituitary-adenoma': [
    C('poag', 'visual-fields', 'Bitemporal loss respecting the VERTICAL midline points to the chiasm; glaucoma loss respects the horizontal midline and comes with cupping.'),
    C('homonymous-hemianopia', 'visual-fields', 'Bitemporal defects mean the chiasm; homonymous defects (the same side in both eyes) mean a lesion behind it.'),
  ],
  'presbyopia': [
    C('hyperopia', 'phoropter', 'Normal distance acuity with near blur that clears fully with a small reading add in the mid-forties is presbyopia; latent hyperopia shows more plus once accommodation is relaxed.'),
    C('cataract', 'slit-lamp', 'Clear lenses and a symmetric near blur that a reading add fully fixes is presbyopia, not cataract.'),
  ],
};

// ───────────────────────── Urgency

const TIMING = /\b(today|stroke|same[- ]day|within (\d|a day|hours|days|weeks|24)|immediately|minutes|days, not months)\b/i;

/** Why the patient's urgency was what it was: a timing teaching point from the case, else a plain statement. */
export function urgencyLesson(kase: ClinicalCase, dxName: string, needed: string): string {
  const tp = kase.teachingPoints.find((t) => TIMING.test(t) && t.length <= 260);
  return tp ?? `Urgency is part of the diagnosis: ${dxName} needs ${needed}.`;
}

// ───────────────────────── Case findings in words

const EYE_WORD: Record<Eye, string> = { OD: 'right', OS: 'left' };

/** "56 mmHg in the right eye" / "24 and 22 mmHg" — or null when the case has no pressures. */
export function iopPhrase(kase: ClinicalCase): string | null {
  const iop = kase.findings?.iop;
  if (!iop || typeof iop.OD !== 'number' || typeof iop.OS !== 'number') return null;
  if (Math.abs(iop.OD - iop.OS) >= 5) {
    const eye: Eye = iop.OD > iop.OS ? 'OD' : 'OS';
    return `${iop[eye]} mmHg in the ${EYE_WORD[eye]} eye`;
  }
  return iop.OD === iop.OS ? `${iop.OD} mmHg in both eyes` : `${iop.OD} and ${iop.OS} mmHg`;
}

/** The worse eye's best-corrected acuity, e.g. { eye: 'right', snellen: '20/400' }. */
export function worseAcuity(kase: ClinicalCase): { eye: string; snellen: string; logmar: number } | null {
  const va = kase.findings?.va;
  if (!va?.OD || !va?.OS || typeof va.OD.bestCorrected !== 'number' || typeof va.OS.bestCorrected !== 'number') return null;
  const eye: Eye = va.OD.bestCorrected >= va.OS.bestCorrected ? 'OD' : 'OS';
  const logmar = va[eye].bestCorrected;
  const sn = formatSnellen(logmar);
  return { eye: EYE_WORD[eye], snellen: sn === 'CF' ? 'count fingers' : sn, logmar };
}

function fill(text: string, kase: ClinicalCase): string {
  return text.replace('{iop}', iopPhrase(kase) ?? 'a measured pressure');
}

/** Contrasts for this case whose mimic is one of its listed differentials. */
export function contrastsFor(kase: ClinicalCase): Contrast[] {
  const listed = new Set(kase.differentials);
  return (CONTRASTS[kase.diagnosis] ?? [])
    .filter((c) => c.mimic !== kase.diagnosis && listed.has(c.mimic))
    .map((c) => ({ ...c, finding: fill(c.finding, kase) }));
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);

/**
 * The lesson that separates `kase.diagnosis` from `mimic`. Curated first; then a teaching point
 * from the case that names the mimic; then the diagnosis' key findings; then the first teaching point.
 */
export function separatingLesson(
  kase: ClinicalCase,
  mimic: DiagnosisId,
  ctx: { diagnosisName(id: string): string; diagnosis?(id: string): Diagnosis | undefined },
): { finding: string; test?: TestId } {
  const curated = contrastsFor(kase).find((c) => c.mimic === mimic);
  if (curated) return { finding: curated.finding, test: curated.test };
  const m = ctx.diagnosis?.(mimic);
  const names = [ctx.diagnosisName(mimic), ...(m?.aka ?? [])].map((n) => n.toLowerCase());
  const tp = kase.teachingPoints.find((t) => {
    const lt = t.toLowerCase();
    return names.some((n) => n.length >= 3 && lt.includes(n)) || words(ctx.diagnosisName(mimic)).some((w) => w.length >= 6 && lt.includes(w));
  });
  if (tp) return { finding: tp };
  const kf = ctx.diagnosis?.(kase.diagnosis)?.keyFindings?.[0];
  if (kf) return { finding: `${ctx.diagnosisName(kase.diagnosis)} is marked by ${lowerFirst(kf)}.` };
  return { finding: kase.teachingPoints[0] ?? 'Let the findings, not the first impression, make the diagnosis.' };
}

export function lowerFirst(s: string): string {
  if (!s) return s;
  // Keep acronyms and proper nouns ("IOP", "Amsler", "RAPD") as they are.
  if (/^[A-Z]{2,}/.test(s) || /^(Amsler|Ishihara|Goldmann|Parks|Hutchinson|Shafer|Weiss)\b/.test(s)) return s;
  return s[0]!.toLowerCase() + s.slice(1);
}

/** Test names mid-sentence, keeping proper nouns capitalised ("Amsler grid", "slit lamp"). */
export function testNameInline(t: TestId): string {
  const name = TEST_CATALOG[t]?.name ?? t;
  return name
    .split(' ')
    .map((w) => (/^(Amsler|Goldmann|Ishihara)$/.test(w) ? w : w.toLowerCase()))
    .join(' ');
}

/** What a test's findings are called ("talked past the pupil findings"). */
const FINDINGS_NOUN: Partial<Record<TestId, string>> = {
  'pupils': 'pupil', 'ophthalmoscopy': 'fundus', 'tonometry': 'pressure', 'slit-lamp': 'slit-lamp', 'visual-fields': 'field',
  'visual-acuity': 'acuity', 'color-vision': 'colour vision', 'phoropter': 'refraction', 'cover-test': 'cover test', 'convergence': 'near point',
};
export const findingsNoun = (t: TestId) => FINDINGS_NOUN[t] ?? testNameInline(t);

/** How a clinician says they skipped a test. */
const SKIP_PHRASE: Partial<Record<TestId, string>> = {
  'tonometry': 'the pressure check',
  'visual-acuity': 'the acuity check',
  'pinhole': 'the pinhole test',
  'amsler': 'the Amsler grid',
  'pupils': 'the pupil exam',
  'visual-fields': 'the visual fields',
  'ophthalmoscopy': 'the dilated fundus exam',
  'slit-lamp': 'the slit-lamp exam',
  'fluorescein': 'the fluorescein stain',
};
export const skipPhrase = (t: TestId) => SKIP_PHRASE[t] ?? `the ${testNameInline(t)}`;

/** Diagnosis-specific reasons a non-decisive test still mattered. */
const SKIP_LESSON_DX: Record<string, string> = {
  'corneal-foreign-body:ophthalmoscopy': 'Grinding is a high-velocity injury: always dilate to look for an intraocular foreign body, because a self-sealed entry wound can hide one.',
  'cn6-palsy:ophthalmoscopy': 'Always look at the discs in a sixth-nerve palsy: papilloedema makes it a false-localising sign of raised intracranial pressure.',
  'papilledema:visual-fields': 'Acuity stays normal early in papilloedema; the fields show the enlarged blind spot and any constriction that threatens sight.',
  'acute-angle-closure:pupils': 'A mid-dilated, fixed pupil is one of the signs that separates angle closure from uveitis, which gives a small pupil.',
  'anterior-uveitis:pupils': 'A small, irregular pupil from posterior synechiae supports uveitis; checking it also tells you whether to dilate to break them.',
  'cataract:visual-acuity': 'Acuity is what decides whether a cataract is visually significant and ready for surgery: the lens alone cannot tell you.',
  'dry-amd:amsler': 'The Amsler grid is the home early-warning test: new distortion is the signal that dry AMD has turned wet.',
  'wet-amd:amsler': 'The Amsler grid shows the distortion from the fluid and the scotoma under the blood, and becomes the patient\'s home monitor during treatment.',
  'central-serous:amsler': 'Amsler distortion is the clue that a small new hyperopic shift is fluid under the macula, not just a change in glasses.',
  'keratoconus:slit-lamp': 'Vogt striae, a Fleischer ring and corneal thinning at the slit lamp confirm keratoconus and show how far it has gone.',
  'viral-conjunctivitis:fluorescein': 'Always stain a red eye: a branching dendrite under cobalt blue means herpes simplex, not adenovirus, and changes the treatment.',
  'presbyopia:visual-acuity': 'Record near acuity before and after the add: it proves the blur is purely optical and that the add fixes it.',
};

/** Why skipping a (non-decisive) test still mattered, built from the case's own findings. */
export function skipLesson(kase: ClinicalCase, test: TestId): string {
  const specific = SKIP_LESSON_DX[`${kase.diagnosis}:${test}`];
  if (specific) return specific;
  switch (test) {
    case 'visual-acuity': {
      const va = worseAcuity(kase);
      return va && va.logmar > 0.05
        ? `Acuity is the vital sign of the eye: the ${va.eye} eye saw ${va.snellen} best-corrected, the baseline for every follow-up and part of the urgency.`
        : 'Acuity is the vital sign of the eye: record it first, every visit, as the baseline for every follow-up.';
    }
    case 'pinhole':
      return 'Pinhole separates refractive blur from disease: if it does not bring acuity back to normal, look at the media, the macula or the nerve.';
    case 'tonometry': {
      const iop = iopPhrase(kase);
      return iop ? `Measure the pressure in every eye you examine: it was ${iop} here, and only measuring tells you.` : 'Measure the pressure in every eye you examine: a silent rise is only found by measuring.';
    }
    case 'amsler':
      return 'The Amsler grid maps distortion and scotomas at the macula, and is the patient\'s home early-warning test.';
    case 'pupils': {
      const p = kase.findings?.pupils;
      if (p && p.rapd && p.rapd !== 'none') return `There was an RAPD in the ${EYE_WORD[p.rapd]} eye: objective proof of optic nerve or extensive retinal disease, found only with the swinging flashlight.`;
      return 'Check the pupils in every patient: an RAPD or an abnormal pupil changes both the diagnosis and the urgency.';
    }
    case 'visual-fields':
      return 'Fields map what the disease has taken: they localise the lesion and are the measure every follow-up is compared with.';
    case 'slit-lamp':
      return 'Every red, painful or blurred eye needs the slit lamp: the lids, cornea, chamber and lens are only really seen there.';
    case 'fluorescein':
      return 'Fluorescein under cobalt blue shows epithelial defects and dendrites that white light hides.';
    case 'ophthalmoscopy':
      return 'Look at the back of the eye: the disc and the macula explain what the front of the eye cannot.';
    default:
      return `The ${testNameInline(test)} was part of the essential work-up for this patient.`;
  }
}
