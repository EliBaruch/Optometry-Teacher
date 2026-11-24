import type { Diagnosis } from '@core';

/** Codex — cornea: trauma, infection and ectasia. */
const cornea: Diagnosis[] = [
  {
    id: 'corneal-abrasion',
    name: 'Corneal Abrasion',
    aka: ['Scratched cornea', 'Corneal epithelial defect'],
    category: 'cornea',
    summary:
      'A scrape removes part of the corneal epithelium, from a fingernail, a branch, a mascara wand or an over-worn contact lens. The pain is sharp, with photophobia, tearing and a constant foreign-body feeling. Most heal within 24–72 hours with lubrication and antibiotic cover. The real skill is not missing what can hide behind it: a retained foreign body, a penetrating injury or early infection.',
    keyFindings: [
      'Epithelial defect that stains bright green with fluorescein under cobalt-blue light',
      'Clear underlying stroma (no infiltrate)',
      'Seidel test negative',
      'Pain relieved instantly by a drop of topical anaesthetic',
      'Vertical linear abrasions suggest a foreign body under the upper lid',
    ],
    typicalUrgency: 'urgent',
    pearls: [
      'Always evert the upper lid. Vertical streaks across the cornea mean something is trapped under it.',
      'Contact lens wearer: use an anti-pseudomonal antibiotic (e.g. a fluoroquinolone), stop lens wear, and do not patch.',
      'Never send the patient home with topical anaesthetic drops. Repeated use causes toxic keratopathy and corneal melt.',
      'Sudden pain on waking weeks later suggests recurrent corneal erosion.',
    ],
    rarity: 'common',
    reference: 'https://www.ncbi.nlm.nih.gov/books/NBK532960/',
  },
  {
    id: 'corneal-foreign-body',
    name: 'Corneal Foreign Body',
    aka: ['Metallic foreign body', 'Rust ring'],
    category: 'cornea',
    summary:
      'A particle, often hot metal from grinding or hammering, embeds in the corneal surface and causes pain, tearing and photophobia. Iron particles leave a rust ring within hours. Removal at the slit lamp is routine, but the history matters most: a high-velocity mechanism can drive a fragment right through the eye with surprisingly little pain.',
    keyFindings: [
      'Visible embedded particle on slit-lamp exam, often with a surrounding rust ring',
      'Surrounding epithelial staining; mild stromal haze',
      'Seidel test negative (no aqueous leak)',
      'Mild AC reaction possible if present for over 24 h',
      'Evert the lids to look for additional particles',
    ],
    typicalUrgency: 'urgent',
    pearls: [
      'Hammering metal on metal or high-speed grinding without goggles counts as an intraocular foreign body until proven otherwise. Dilate, Seidel test, and get a CT if in doubt. Never MRI a possible metal fragment.',
      'Remove with a 25–27G needle or spud at the slit lamp. Treat any residual rust ring with an Alger brush. Then use antibiotic cover and review in 24 h.',
      'A central rust ring can leave a scar on the visual axis. Weigh complete removal against depth.',
      'Teach eye protection; it prevents almost all of these injuries.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Removal_of_Corneal_Foreign_Bodies',
  },
  {
    id: 'hsv-keratitis',
    name: 'Herpes Simplex Keratitis',
    aka: ['HSV keratitis', 'Dendritic ulcer', 'Herpetic eye disease'],
    category: 'cornea',
    summary:
      'Herpes simplex virus lies dormant in the trigeminal ganglion and reactivates to infect the cornea, typically in one eye and often triggered by stress, fever, UV light or immunosuppression. It is the leading infectious cause of corneal blindness in developed countries because it recurs and scars. Epithelial disease is treated with antivirals. Steroids alone make it dramatically worse.',
    keyFindings: [
      'Branching dendritic ulcer with terminal end bulbs',
      'Ulcer bed stains with fluorescein; swollen edges stain with rose bengal or lissamine green',
      'Reduced corneal sensation in the affected eye',
      'Unilateral red, watery, photophobic eye; often prior episodes',
      'Recurrent disease: stromal haze, scarring or disciform oedema',
    ],
    typicalUrgency: 'urgent',
    pearls: [
      'Never treat a dendrite with topical steroid alone. It can turn into a large geographic ulcer.',
      'Treatment: topical ganciclovir gel or trifluridine, or oral acyclovir/valacyclovir.',
      'HEDS: long-term oral acyclovir 400 mg twice daily roughly halves recurrences in patients who have had repeated episodes.',
      'HZO pseudodendrites have no terminal bulbs and stain poorly, unlike true HSV dendrites.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Herpes_Simplex_Virus_Keratitis',
  },
  {
    id: 'microbial-keratitis',
    name: 'Microbial Keratitis',
    aka: ['Corneal ulcer', 'Bacterial keratitis', 'Infectious keratitis'],
    category: 'cornea',
    summary:
      'An infection of the corneal stroma, most often bacterial, that can melt through the cornea in days. Contact lens wear is the biggest risk factor, especially sleeping, showering or swimming in lenses, and Pseudomonas is the organism to fear. Pain, redness, discharge and a white spot on the cornea need same-day intensive antibiotics.',
    keyFindings: [
      'Focal white stromal infiltrate with an overlying epithelial defect',
      'Marked conjunctival injection, pain and photophobia',
      'Anterior chamber cells; hypopyon in severe cases',
      'Mucopurulent discharge; lid oedema',
      'Reduced VA if the ulcer is central',
    ],
    typicalUrgency: 'urgent',
    pearls: [
      '"1-2-3 rule" for culturing: ≥1+ AC cells, ≥2 mm infiltrate, or ≤3 mm from the corneal centre. Scrape before starting antibiotics.',
      'Start hourly broad-spectrum fluoroquinolone (or fortified antibiotics) and stop contact lens wear. No patching and no steroids at the start.',
      'Pain out of proportion, a ring infiltrate and radial perineuritis after water exposure suggest Acanthamoeba. Feathery edges and satellite lesions after plant trauma suggest fungus.',
      'Small, peripheral, multiple infiltrates with little pain and intact epithelium are more likely sterile, but when in doubt, treat as infection.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Bacterial_Keratitis',
  },
  {
    id: 'keratoconus',
    name: 'Keratoconus',
    aka: ['KC', 'Corneal ectasia'],
    category: 'cornea',
    summary:
      'A progressive, non-inflammatory thinning of the cornea that bulges it into a cone, causing rising irregular astigmatism and blur that glasses cannot fully fix. It begins around puberty, affects both eyes asymmetrically and usually progresses into the 30s. Eye rubbing, atopy, Down syndrome and connective tissue disorders are associations. Corneal cross-linking can stop it, so early detection preserves sight.',
    keyFindings: [
      'Rising or oblique irregular astigmatism; spectacle BCVA worse than expected',
      'Scissoring reflex on retinoscopy; distorted keratometry mires',
      'Inferior steepening and focal thinning on topography/tomography (K often >47 D)',
      'Vogt striae (vertical stromal lines that vanish with gentle pressure) and a Fleischer iron ring',
      'Munson sign (lower lid bulges on downgaze) in advanced cones',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Refer for cross-linking as soon as progression is documented. It halts progression but does not reverse it.',
      'Rigid gas-permeable, hybrid or scleral lenses give the best vision. Spectacles often fail.',
      'Sudden painful clouding with a big drop in VA is acute hydrops (a break in Descemet membrane). It is alarming but usually resolves over months.',
      'Screen every refractive-surgery candidate with tomography. LASIK in undiagnosed keratoconus can cause ectasia.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Keratoconus',
  },
  {
    id: 'herpes-zoster-ophthalmicus',
    name: 'Herpes Zoster Ophthalmicus',
    aka: ['HZO', 'Ophthalmic shingles'],
    category: 'cornea',
    summary:
      'Varicella-zoster virus reactivates in the ophthalmic division of the trigeminal nerve and produces a painful, blistering rash on one side of the forehead and scalp that stops sharply at the midline. Up to half of patients develop eye involvement: keratitis, uveitis with raised pressure, scleritis or nerve palsies. It mainly affects people over 50 and the immunocompromised.',
    keyFindings: [
      'Unilateral vesicular rash in the V1 dermatome respecting the midline',
      'Hutchinson sign: lesions on the tip or side of the nose (nasociliary branch)',
      'Pseudodendrites without terminal bulbs; stromal keratitis',
      'Anterior uveitis, often with elevated IOP; sectoral iris atrophy',
      'Reduced corneal sensation (risk of neurotrophic keratopathy)',
    ],
    typicalUrgency: 'urgent',
    pearls: [
      'Start oral antivirals (valacyclovir, famciclovir or acyclovir) within 72 hours of rash onset to cut eye complications.',
      'A positive Hutchinson sign strongly predicts ocular involvement. Examine these patients closely and follow them up.',
      'Uveitis with high IOP in zoster is a trabeculitis. Treat the inflammation with steroids and the pressure with aqueous suppressants.',
      'Recommend the recombinant zoster vaccine to eligible adults.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Herpes_Zoster_Ophthalmicus',
  },
];

export default cornea;
