/** Teaching text: per-sign pearls, per-presentation explanations. Player-facing. */

export const PEARL: Record<string, string> = {
  'lids/anterior-blepharitis': 'Collarettes (sleeves of debris) at the lash base — scrub, warm compresses, treat Demodex if persistent.',
  'lids/meibomian-dysfunction': 'Plugged, capped meibomian orifices and a foamy, unstable tear film — the commonest cause of evaporative dry eye.',
  'lids/chalazion': 'A painless, firm lid lump from a blocked meibomian gland — warm compresses; incise if it persists.',
  'lids/hordeolum': 'A painful, acute lid abscess at a lash follicle or gland — warm compresses; antibiotics only for spreading cellulitis.',
  'lids/ptosis': 'Measure MRD1 and levator function; new ptosis with a small pupil points to Horner syndrome.',
  'lids/vesicles': 'Dermatomal vesicles that stop at the midline: herpes zoster. Nasociliary involvement (Hutchinson sign) threatens the eye.',
  'conj/injection/diffuse-injection': 'Diffuse redness with a mobile, superficial vessel bed — conjunctival rather than deep inflammation.',
  'conj/injection/ciliary-flush': 'A violaceous ring at the limbus that does not blanch with phenylephrine: deep (corneal, uveal or glaucomatous) inflammation.',
  'conj/injection/sectoral-injection': 'A wedge of redness: think episcleritis (blanches with phenylephrine) or scleritis (deep, painful, does not blanch).',
  'conj/discharge/discharge-mucopurulent': 'Thick, sticky yellow-green discharge — bacterial conjunctivitis; lids glued shut on waking.',
  'conj/discharge/discharge-watery': 'Watery discharge — viral or allergic. Look for follicles and a tender pre-auricular node.',
  'conj/papillae': 'Papillae have a central vascular tuft — allergic or bacterial conjunctivitis, contact-lens wear.',
  'conj/follicles': 'Follicles are pale, avascular lymphoid bumps with vessels at the margin — viral, chlamydial or drug-induced.',
  'conj/subconjunctival-hemorrhage': 'A flat, sharply bordered blood patch — benign; check blood pressure and clotting if recurrent.',
  'conj/pinguecula': 'A yellow-white nasal or temporal conjunctival deposit that spares the cornea.',
  'conj/pterygium': 'A fibrovascular wing crossing the limbus onto the cornea — measure how far toward the pupil it reaches.',
  'cornea/epithelium/punctate-keratitis': 'Fine pin-point epithelial erosions: dry eye, toxicity, viral. Fluorescein shows the pattern.',
  'cornea/epithelium/abrasion': 'A sharp-edged defect that stains with fluorescein; always evert the upper lid for a foreign body.',
  'cornea/epithelium/dendrite': 'A branching ulcer with terminal bulbs — herpes simplex. Check corneal sensation.',
  'cornea/deposits/keratic-precipitates': 'KPs are white cell clusters on the endothelium (Arlt triangle: apex up) — granulomatous ones look greasy, "mutton fat".',
  'cornea/deposits/foreign-body': 'Look for a rust ring around metal; remove, then stain for the residual defect.',
  'cornea/stroma/ulcer': 'A white stromal infiltrate with an overlying epithelial defect that stains: microbial keratitis until proven otherwise.',
  'cornea/stroma/edema': 'A steamy, hazy cornea: raised pressure (angle closure), endothelial failure or inflammation.',
  'cornea/stroma/cone-thinning': 'Apical thinning and steepening with a Fleischer ring and Vogt striae — keratoconus; refer for topography.',
  'chamber/van-herick': 'Compare the dark gap to corneal thickness (CT): ≥ 1 CT open; ¼ CT narrow; < ¼ CT closure possible — confirm with gonioscopy.',
  'chamber/cells': 'Count white cells in a 1 × 1 mm beam: 0.5+ = 1–5, 1+ = 6–15, 2+ = 16–25, 3+ = 26–50, 4+ = > 50 (SUN).',
  'chamber/flare': 'Flare is protein scatter (Tyndall effect) — a fogged beam in the dark AC. It marks a broken blood–aqueous barrier.',
  'chamber/hypopyon': 'A layered white-cell level — severe anterior uveitis or infective keratitis. Sterile in uveitis, infected in ulcers.',
  'chamber/hyphema': 'Blood layering in the AC after trauma — protect the eye, check the IOP and rule out an open globe.',
  'iris/posterior-synechiae': 'Iris stuck to the lens: an irregular pupil, from past inflammation. Dilate to break fresh ones.',
  'iris/neovascularization': 'Fine new vessels on the iris (rubeosis) after retinal ischaemia — look at the angle: neovascular glaucoma looms.',
  'lens/nuclear-sclerosis': 'Central yellow-brown haze with a myopic shift; in the section the nucleus stands out as a bright band.',
  'lens/cortical-cataract': 'White spokes from the periphery that cast dark wedges in retro-illumination.',
  'lens/posterior-subcapsular': 'A granular plaque at the back of the lens — glare in bright light; steroids and diabetes are classic causes.',
};
export const pearl = (sign: string): string | undefined => PEARL[sign];

export type Kind =
  | 'normal' | 'uveitis' | 'angle-closure' | 'narrow-angle' | 'cataract' | 'bacterial' | 'viral' | 'allergic' | 'blepharitis'
  | 'lid-lump' | 'keratitis' | 'dendrite' | 'trauma' | 'degeneration' | 'sch' | 'keratoconus' | 'hyphema';

export const KIND_INFO: Record<Kind, { label: string; why: string }> = {
  normal: { label: 'A healthy anterior segment', why: 'Quiet white lids and conjunctiva, a clear cornea, a deep quiet chamber (Van Herick 4) and a clear lens.' },
  uveitis: { label: 'Anterior uveitis', why: 'Cells and flare in the chamber with a ciliary flush, often KPs or synechiae: intraocular inflammation. Treat with steroid and a cycloplegic; look for the cause.' },
  'angle-closure': { label: 'Acute angle closure', why: 'Van Herick grade 1, a steamy cornea, ciliary flush and a mid-dilated pupil: the angle has shut. An emergency — lower the pressure now.' },
  'narrow-angle': { label: 'Narrow, occludable angle', why: 'Van Herick grade 2 or less warns the angle could close. Confirm with gonioscopy and consider laser iridotomy; avoid dilation until assessed.' },
  cataract: { label: 'Cataract', why: 'Opacities in the lens seen in the optic section or against the red reflex. Grade the type (nuclear, cortical, posterior subcapsular) and weigh the visual need.' },
  bacterial: { label: 'Bacterial conjunctivitis', why: 'Mucopurulent discharge, diffuse injection and papillae. Usually self-limiting; treat topically if severe or in contact-lens wearers.' },
  viral: { label: 'Viral (adenoviral) conjunctivitis', why: 'Watery discharge, follicles and a tender pre-auricular node, often with fine punctate keratitis. Highly contagious — hygiene advice.' },
  allergic: { label: 'Allergic conjunctivitis', why: 'Itch, papillae and chemosis with stringy mucus — no pus. Cold compresses and antihistamine/mast-cell drops.' },
  blepharitis: { label: 'Blepharitis / meibomian gland dysfunction', why: 'Collarettes or capped glands on a red lid margin with an unstable tear film. Lid hygiene is the foundation of treatment.' },
  'lid-lump': { label: 'Chalazion / hordeolum', why: 'A focal lid lump: painless firm chalazion or acutely painful hordeolum. Warm compresses first.' },
  keratitis: { label: 'Microbial keratitis (corneal ulcer)', why: 'A white stromal infiltrate with an epithelial defect, ciliary flush and sometimes a hypopyon. Sight-threatening — scrape, culture and treat intensively the same day.' },
  dendrite: { label: 'Herpes simplex keratitis (dendrite)', why: 'A branching epithelial ulcer with terminal bulbs and reduced corneal sensation. Topical or oral antivirals; avoid steroid alone.' },
  trauma: { label: 'Corneal abrasion or foreign body', why: 'A focal epithelial defect or an embedded speck with a rust ring. Remove, stain, treat; always evert the upper lid.' },
  degeneration: { label: 'Pterygium / pinguecula', why: 'Fibrovascular tissue on the nasal conjunctiva: a pterygium crosses the limbus, a pinguecula does not. UV protection; monitor the advance.' },
  sch: { label: 'Subconjunctival haemorrhage', why: 'A flat sharply bordered blood patch under an otherwise quiet eye. Benign; look for a Valsalva or bleeding cause.' },
  keratoconus: { label: 'Keratoconus', why: 'Conical thinning with a Fleischer ring and Vogt striae. Refer for corneal topography and consider cross-linking.' },
  hyphema: { label: 'Traumatic hyphaema', why: 'Layered blood in the chamber after a blow. Protect the eye, sit the patient up, check the IOP and angle.' },
};
