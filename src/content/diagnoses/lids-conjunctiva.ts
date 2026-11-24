import type { Diagnosis } from '@core';

/** Codex — lids, ocular surface, conjunctiva and episclera. */
const lidsConjunctiva: Diagnosis[] = [
  {
    id: 'dry-eye',
    name: 'Dry Eye Disease',
    aka: ['Keratoconjunctivitis sicca', 'Ocular surface disease', 'DED'],
    category: 'anterior',
    summary:
      'An unstable, hyperosmolar tear film inflames the ocular surface and causes burning, grittiness, tired eyes and vision that fluctuates with blinking. Paradoxical watering is common. Evaporative dry eye from meibomian gland dysfunction is far more common than aqueous deficiency. Screens, contact lenses, ageing, menopause, medications and autoimmune disease all contribute.',
    keyFindings: [
      'Symptom score positive (OSDI ≥13 or DEQ-5 ≥6)',
      'Tear break-up time <10 seconds',
      'Fluorescein or lissamine green staining of the cornea, conjunctiva or lid margin',
      'Tear osmolarity ≥308 mOsm/L or an inter-eye difference >8 mOsm/L',
      'Schirmer I (no anaesthetic) ≤5 mm in 5 minutes points to aqueous deficiency',
      'Meibomian glands capped or expressing thick, toothpaste-like secretions',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'TFOS DEWS II: diagnose with a positive symptom score plus at least one sign of lost homeostasis (break-up time, osmolarity or staining).',
      'Severe aqueous deficiency with dry mouth or joint pain: screen for Sjögren syndrome.',
      'Treat in steps: education and lid care, preservative-free tears, then anti-inflammatories (cyclosporine, lifitegrast), punctal plugs and in-office gland treatments.',
      'Watery eyes can be dry eyes. Reflex tearing from an irritated surface is classic.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Dry_Eye_Disease',
  },
  {
    id: 'blepharitis',
    name: 'Blepharitis',
    aka: ['Lid margin disease', 'Meibomian gland dysfunction (posterior blepharitis)', 'Demodex blepharitis'],
    category: 'anterior',
    summary:
      'Chronic inflammation of the eyelid margins, with crusting, itch, burning and red lids that are usually worst in the morning. Anterior blepharitis involves the lash base (staphylococcal, seborrhoeic or Demodex mites). Posterior blepharitis is meibomian gland dysfunction, often linked with rosacea. It cannot be cured, but daily lid care keeps it under control.',
    keyFindings: [
      'Bilateral red, thickened lid margins with telangiectasia',
      'Cylindrical "collarettes" (sleeves) at the lash base — pathognomonic for Demodex',
      'Scurf or crusting on lashes; lash loss or misdirection in chronic cases',
      'Capped meibomian orifices with turbid, thick expressed secretions',
      'Rapid tear break-up and inferior punctate staining',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Collarettes mean Demodex. Lotilaner 0.25% drops are approved specifically for Demodex blepharitis.',
      'Unilateral, treatment-resistant "blepharitis" with lash loss can be sebaceous gland carcinoma. Biopsy.',
      'Look for facial rosacea. Oral doxycycline or topical azithromycin help meibomian disease.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Blepharitis',
  },
  {
    id: 'chalazion',
    name: 'Chalazion',
    aka: ['Meibomian cyst', 'Tarsal cyst'],
    category: 'anterior',
    summary:
      'A blocked meibomian gland leaks its oily contents into the tarsus and forms a firm, painless lump. The inflammation is sterile, not infectious. It often follows a hordeolum and is common in patients with blepharitis or rosacea. Most shrink with warm compresses over weeks; persistent ones can be injected with steroid or drained.',
    keyFindings: [
      'Firm, non-tender, rubbery nodule within the tarsal plate',
      'Develops over weeks; minimal redness',
      'Everting the lid may show a yellow or red granulomatous area on the conjunctival side',
      'Large upper-lid lesions can press on the cornea and induce astigmatism',
      'Coexisting meibomian gland dysfunction or rosacea',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Pain and acute redness point to a hordeolum. A firm, quiet lump is a chalazion.',
      'A recurrent chalazion in the same spot, especially in an older adult, must be biopsied to exclude sebaceous carcinoma.',
      'Oral antibiotics have no role unless there is secondary cellulitis.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Chalazion',
  },
  {
    id: 'hordeolum',
    name: 'Hordeolum',
    aka: ['Stye'],
    category: 'anterior',
    summary:
      'An acute, painful bacterial infection of an eyelid gland, nearly always Staphylococcus aureus. An external hordeolum involves a lash follicle gland (Zeis or Moll) and an internal one involves a meibomian gland. Most point and drain within one to two weeks with warm compresses and lid hygiene. The danger is spread into the lid and orbit.',
    keyFindings: [
      'Tender, red, warm localised lid swelling, often with a pus point',
      'External: at the lash line; internal: points toward the conjunctival side',
      'Normal visual acuity and eye movements',
      'No proptosis, fever or diffuse lid swelling (if present, think cellulitis)',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Warm compresses for 10–15 minutes several times a day. Do not squeeze it.',
      'Diffuse lid swelling with fever is preseptal cellulitis and needs oral antibiotics.',
      'Proptosis, pain on eye movement, restricted motility, reduced VA or an RAPD means orbital cellulitis: send to the emergency department.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Stye',
  },
  {
    id: 'bacterial-conjunctivitis',
    name: 'Bacterial Conjunctivitis',
    aka: ['Bacterial pink eye'],
    category: 'anterior',
    summary:
      'Bacterial infection of the conjunctiva gives a red eye with thick yellow-green discharge, and the lids are often glued shut on waking. Staphylococcus is the usual cause in adults; Haemophilus, Streptococcus pneumoniae and Moraxella are common in children. Most cases settle on their own and topical antibiotics speed recovery. A rapid, copious, hyperacute discharge is a different and dangerous disease.',
    keyFindings: [
      'Mucopurulent discharge with matted lashes in the morning',
      'Diffuse conjunctival injection with a papillary reaction',
      'Usually no preauricular lymph node',
      'Normal or near-normal VA; clear cornea',
      'Often starts in one eye and spreads to the other within days',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Hyperacute, copious pus with chemosis and a tender node suggests Neisseria gonorrhoeae, which can perforate the cornea within days. It needs same-day systemic ceftriaxone.',
      'A child with conjunctivitis and ear infection (conjunctivitis–otitis syndrome) usually has H. influenzae: treat systemically.',
      'Contact lens wearer with a red eye: stain the cornea. If there is an infiltrate, this is keratitis, not conjunctivitis.',
      'Chronic follicular conjunctivitis lasting more than 3–4 weeks in a young adult: consider Chlamydia.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Bacterial_Conjunctivitis',
  },
  {
    id: 'viral-conjunctivitis',
    name: 'Viral Conjunctivitis',
    aka: ['Adenoviral conjunctivitis', 'Epidemic keratoconjunctivitis (EKC)', 'Viral pink eye'],
    category: 'anterior',
    summary:
      'The most common cause of infectious conjunctivitis, usually adenovirus and often after a cold. It starts in one eye and the second eye follows a few days later. It is highly contagious for about 10–14 days, spreading through hands, towels and clinic instruments. It usually clears on its own within 1–3 weeks, but the keratitis form (EKC) can leave subepithelial infiltrates that blur vision for months.',
    keyFindings: [
      'Watery discharge with a follicular conjunctival reaction',
      'Tender preauricular lymph node',
      'Recent upper respiratory infection or sick contact',
      'Subepithelial corneal infiltrates appearing 1–2 weeks after onset (EKC)',
      'Pseudomembranes or petechial haemorrhages in severe cases',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Antibiotics do not help. Use cold compresses and artificial tears, insist on strict hand hygiene, and disinfect the tonometer tip and chair afterwards.',
      'Unilateral follicular conjunctivitis with lid vesicles is herpes simplex, not adenovirus. Check for dendrites.',
      'Fever + sore throat + follicular conjunctivitis = pharyngoconjunctival fever (adenovirus types 3 and 7).',
      'Steroids are reserved for membranes or vision-reducing infiltrates, and they can prolong viral shedding.',
    ],
    rarity: 'common',
    reference: 'https://www.ncbi.nlm.nih.gov/books/NBK470271/',
  },
  {
    id: 'allergic-conjunctivitis',
    name: 'Allergic Conjunctivitis',
    aka: ['Seasonal allergic conjunctivitis', 'Hay fever eyes'],
    category: 'anterior',
    summary:
      'An IgE, mast-cell reaction to airborne allergens such as pollen, dust mite or pet dander makes both eyes itch, water and swell. It usually comes with hay fever and a personal or family history of atopy. Seasonal forms flare in spring and summer and perennial forms persist all year. Itch is the defining symptom.',
    keyFindings: [
      'Bilateral itching as the dominant symptom',
      'Chemosis and lid swelling out of proportion to redness',
      'Fine papillae on the tarsal conjunctiva; stringy white mucus',
      'History of atopy, hay fever, asthma or eczema',
      'No preauricular node; cornea clear in simple forms',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'No itch, probably not allergy. Itch is the most reliable discriminator from viral and bacterial conjunctivitis.',
      'First-line treatment is a dual-acting antihistamine/mast-cell stabiliser (e.g. olopatadine, ketotifen), plus cold compresses and allergen avoidance.',
      'Giant cobblestone papillae in a young boy suggest vernal keratoconjunctivitis. Look for a shield ulcer.',
      'If a short course of steroid is needed, check IOP.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Allergic_Conjunctivitis',
  },
  {
    id: 'subconjunctival-hemorrhage',
    name: 'Subconjunctival Haemorrhage',
    aka: ['Subconjunctival hemorrhage', 'Burst blood vessel'],
    category: 'anterior',
    summary:
      'A small conjunctival vessel bleeds beneath the clear conjunctiva and leaves a flat, bright-red patch. It is alarming to look at but painless and harmless. Coughing, straining, vomiting, rubbing, contact lenses, hypertension and anticoagulants are common triggers. It fades over about 2–3 weeks, changing colour like a bruise.',
    keyFindings: [
      'Sharply demarcated, flat red patch with normal surrounding conjunctiva',
      'Painless; no discharge',
      'Normal visual acuity, pupils and IOP',
      'Posterior border visible (blood does not track back from an orbital source)',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Check blood pressure. Ask about anticoagulants and check the INR if on warfarin.',
      'After trauma, 360° bullous haemorrhage, a peaked pupil, a shallow or deep AC or low IOP suggests an occult open globe. Do not press on the eye.',
      'Recurrent or multiple bleeds or easy bruising elsewhere: screen for a bleeding disorder.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Subconjunctival_Hemorrhage',
  },
  {
    id: 'pinguecula',
    name: 'Pinguecula',
    category: 'anterior',
    summary:
      'A yellowish, slightly raised deposit of degenerated collagen in the bulbar conjunctiva beside the cornea, usually on the nasal side. It is a marker of lifetime UV, wind and dust exposure and is very common in outdoor workers and older adults. Usually harmless, it can become inflamed (pingueculitis) or cause dry spots on the nearby cornea.',
    keyFindings: [
      'Yellow-white elevated nodule at the 3 or 9 o\'clock limbus (nasal more often)',
      'Does not cross onto the cornea',
      'Localised injection and irritation when inflamed (pingueculitis)',
      'Poor tear wetting over the lesion; possible adjacent dellen',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Pinguecula stays on the conjunctiva; once tissue grows across the limbus onto the cornea it is a pterygium.',
      'Gelatinous or leukoplakic lesions, feeder vessels or atypical location suggest ocular surface squamous neoplasia. Photograph and refer.',
      'Sunglasses, a hat and lubricants are the mainstay. Use a short course of anti-inflammatory for flares.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Pinguecula',
  },
  {
    id: 'pterygium',
    name: 'Pterygium',
    aka: ['Surfer\'s eye'],
    category: 'anterior',
    summary:
      'A wing-shaped wedge of fibrovascular conjunctiva grows across the limbus onto the cornea, nearly always from the nasal side. It is strongly linked to UV exposure in sunny climates. As it advances it flattens the cornea horizontally and induces astigmatism. If it reaches the visual axis it blocks vision, so it is removed before that happens.',
    keyFindings: [
      'Triangular fibrovascular tissue crossing the limbus onto the cornea (head, neck, body)',
      'Stocker line: iron deposition just ahead of the head',
      'Induced with-the-rule astigmatism on keratometry or topography',
      'Measure the head\'s distance from the visual axis each visit',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Refer for excision if it is approaching the visual axis, causing significant astigmatism or restricting movement. Conjunctival autograft keeps recurrence to about 5–10%.',
      'A probe passes under a pseudopterygium (after an ulcer, burn or trauma) but not under a true pterygium.',
      'Atypical location, a gelatinous look or feeder vessels: consider ocular surface squamous neoplasia.',
    ],
    rarity: 'common',
    reference: 'https://eyewiki.aao.org/Pterygium',
  },
  {
    id: 'episcleritis',
    name: 'Episcleritis',
    category: 'anterior',
    summary:
      'A benign, often recurrent inflammation of the episclera, the thin vascular layer between conjunctiva and sclera, that gives a patch of redness (sectoral) or a whole red eye (diffuse) with mild discomfort. It mainly affects young to middle-aged adults, more often women. It is usually idiopathic but can accompany rheumatoid arthritis, IBD, rosacea or gout. It settles on its own within weeks and does not threaten vision.',
    keyFindings: [
      'Sectoral (or diffuse) salmon-pink redness with mild ache or tenderness',
      'Engorged vessels blanch with 2.5% phenylephrine',
      'Vessels move with a cotton-tip applicator over the sclera',
      'No discharge; normal VA; no AC reaction',
      'Nodular form: a mobile nodule over a normal sclera',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Scleritis is the look-alike to fear: severe, boring pain that wakes the patient, a violaceous hue, vessels that do not blanch with phenylephrine, and tenderness. It needs urgent workup.',
      'Treat with cool compresses and artificial tears. Use short-course topical or oral anti-inflammatories if bothersome.',
      'Frequent recurrences: screen for systemic inflammatory disease.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Episcleritis',
  },
];

export default lidsConjunctiva;
