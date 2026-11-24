import type { Diagnosis } from '@core';

/** Codex — optic nerve, pupils, visual pathway and colour vision. */
const neuro: Diagnosis[] = [
  {
    id: 'papilledema',
    name: 'Papilloedema',
    aka: ['Papilledema', 'Optic disc swelling from raised intracranial pressure', 'IIH (idiopathic intracranial hypertension)'],
    category: 'neuro',
    summary:
      'Both optic discs swell because the pressure inside the skull is raised. The cause may be a tumour, a venous sinus clot, meningitis or, most often in young overweight women, idiopathic intracranial hypertension. Central vision is usually normal early on, which makes it easy to miss. Untreated, chronic swelling slowly strangles the optic nerves and can cause permanent field loss and blindness.',
    keyFindings: [
      'Bilateral optic disc swelling with blurred margins and obscured vessels at the disc edge (Frisén grading)',
      'Peripapillary haemorrhages, cotton-wool spots; absent spontaneous venous pulsations',
      'Enlarged blind spot on perimetry; VA and colour often normal early',
      'Headache worse lying down or on waking; transient visual obscurations; pulsatile tinnitus',
      'Possible sixth nerve palsy (false-localising sign)',
    ],
    typicalUrgency: 'urgent',
    pearls: [
      'Same-day referral for MRI brain with MR venography first, then lumbar puncture. In IIH the adult opening pressure is >25 cm H₂O with normal CSF.',
      'Check the blood pressure: malignant hypertension also swells both discs.',
      'Buried optic disc drusen mimic papilloedema (pseudopapilloedema). Use B-scan, autofluorescence or EDI-OCT to tell them apart.',
      'Spontaneous venous pulsations suggest normal pressure at that moment, but roughly 10–20% of healthy people lack them, so their absence proves little.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Papilledema',
  },
  {
    id: 'optic-neuritis',
    name: 'Optic Neuritis',
    aka: ['Demyelinating optic neuritis', 'Retrobulbar neuritis'],
    category: 'neuro',
    summary:
      'Inflammatory demyelination of the optic nerve causes vision loss in one eye over hours to days, typically in a woman aged 20–45, with pain on moving the eye. It is often the first event of multiple sclerosis. Most patients recover much of their vision within weeks to months, but an MRI is needed to stratify MS risk. Atypical features point to other causes that need different treatment.',
    keyFindings: [
      'Subacute monocular vision loss with pain on eye movement (about 90%)',
      'RAPD in the affected eye',
      'Reduced colour vision and red desaturation; reduced contrast',
      'Central or centrocaecal scotoma',
      'Disc normal in about two-thirds (retrobulbar) and mildly swollen in one-third',
    ],
    typicalUrgency: 'urgent',
    pearls: [
      'MRI brain and orbits with gadolinium. ONTT: 15-year MS risk was about 25% with no brain lesions and about 72% with one or more.',
      'IV methylprednisolone speeds recovery but does not change final vision. Oral prednisone alone at standard dose increased recurrences in ONTT, so avoid it.',
      'Atypical features (no pain, both eyes, severe disc swelling with haemorrhages, no recovery by 3–4 weeks, age >50): consider NMOSD (AQP4), MOG antibody disease, ischaemic or compressive causes.',
      'Uhthoff phenomenon: vision dims with heat or exercise.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Demyelinating_Optic_Neuritis',
  },
  {
    id: 'giant-cell-arteritis',
    name: 'Giant Cell Arteritis',
    aka: ['GCA', 'Temporal arteritis', 'Arteritic anterior ischaemic optic neuropathy (AAION)'],
    category: 'systemic',
    summary:
      'A granulomatous inflammation of medium and large arteries in people over 50 that can suddenly block the blood supply to the optic nerve and cause catastrophic, often irreversible vision loss. Untreated, the second eye can follow within days. Headache, scalp tenderness, jaw pain on chewing and feeling generally unwell are the clues. High-dose steroids are started the moment GCA is suspected.',
    keyFindings: [
      'Age >50 with new headache, scalp tenderness, jaw claudication or polymyalgia symptoms',
      'Sudden vision loss with chalky-white (pallid) swollen disc (AAION); RAPD',
      'Transient vision loss or diplopia may come first',
      'Raised ESR and CRP; raised platelets',
      'Tender, thickened, pulseless temporal artery',
    ],
    typicalUrgency: 'emergency',
    pearls: [
      'Start high-dose corticosteroids immediately on suspicion. Do not wait for the biopsy, which stays informative for 1–2 weeks after starting.',
      'Jaw claudication and diplopia are the most predictive symptoms. Check ESR and CRP together.',
      'Any CRAO, AION or new cranial nerve palsy in someone over 50 means asking the GCA questions.',
      'Temporal artery biopsy or ultrasound (halo sign) confirms the diagnosis. Tocilizumab helps patients come off steroids.',
    ],
    rarity: 'rare',
    reference: 'https://eyewiki.aao.org/Giant_Cell_Arteritis',
  },
  {
    id: 'horner-syndrome',
    name: 'Horner Syndrome',
    aka: ['Oculosympathetic paresis'],
    category: 'neuro',
    summary:
      'A break anywhere along the three-neuron sympathetic chain, from hypothalamus to chest to neck to eye, produces a small pupil, a slight droop of the upper lid and reduced sweating on that side. Causes range from benign to life-threatening, including stroke, lung apex tumour, carotid dissection and neuroblastoma in children. A new, painful Horner syndrome is a carotid dissection until proven otherwise.',
    keyFindings: [
      'Miosis with anisocoria greater in dim light',
      'Dilation lag of the small pupil in the dark',
      'Mild ptosis (1–2 mm) with lower-lid elevation ("upside-down ptosis")',
      'Ipsilateral facial anhidrosis (with first- and second-order lesions)',
      'Apraclonidine reverses the anisocoria; cocaine fails to dilate the affected pupil',
    ],
    typicalUrgency: 'urgent',
    pearls: [
      'Acute painful Horner (neck, face or head pain) needs same-day imaging for carotid dissection (CTA or MRA of head and neck).',
      'Apraclonidine 0.5% dilates the Horner pupil through denervation supersensitivity. It can be falsely negative in the first days after onset.',
      'A congenital Horner leaves the affected iris lighter (heterochromia). In a child with a new Horner, exclude neuroblastoma.',
      'Pancoast tumour: Horner plus shoulder or arm pain in a smoker.',
    ],
    rarity: 'uncommon',
    reference: 'https://eyewiki.aao.org/Horner_Syndrome',
  },
  {
    id: 'adie-pupil',
    name: 'Adie Tonic Pupil',
    aka: ['Tonic pupil', 'Holmes-Adie syndrome'],
    category: 'neuro',
    summary:
      'Damage to the ciliary ganglion, often after a viral illness, leaves one pupil large and barely reactive to light. It constricts slowly and holds that constriction when the patient focuses up close. It typically affects women aged 20–40 and is benign, though near blur and light sensitivity can be bothersome. Combined with reduced tendon reflexes it is called Holmes-Adie syndrome.',
    keyFindings: [
      'Unilateral dilated pupil with poor or absent light reaction; anisocoria greater in bright light',
      'Light-near dissociation: slow, sustained (tonic) near constriction and slow redilation',
      'Sectoral iris sphincter palsy with vermiform movements on slit lamp',
      'Constricts with dilute pilocarpine (about 0.1%); the normal pupil barely responds',
      'No ptosis and full eye movements',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Full eye movements and no ptosis separate it from a third nerve palsy. Check both carefully.',
      'If even 1% pilocarpine fails to constrict a large pupil, think pharmacological mydriasis (scopolamine patches, plants, nebulisers).',
      'About 80% start in one eye. The second becomes involved at about 4% per year, and over time the tonic pupil shrinks ("little old Adie").',
    ],
    rarity: 'rare',
    reference: 'https://eyewiki.aao.org/Adie_Pupil',
  },
  {
    id: 'pituitary-adenoma',
    name: 'Pituitary Adenoma (Chiasmal Compression)',
    aka: ['Chiasmal syndrome', 'Bitemporal hemianopia', 'Pituitary macroadenoma'],
    category: 'neuro',
    summary:
      'A benign tumour of the pituitary gland grows upward and presses on the optic chiasm from below, first damaging the crossing nasal fibres and causing bitemporal field loss that patients often do not notice. It is the most common cause of chiasmal compression in adults. Hormonal symptoms (missed periods, milky nipple discharge, enlarging hands and jaw, Cushingoid features) may be the clue. Vision often recovers after decompression.',
    keyFindings: [
      'Bitemporal hemianopia respecting the vertical meridian, typically starting superotemporally',
      'VA may be normal; colour desaturation across the vertical midline',
      'Band ("bow-tie") optic atrophy and nasal/temporal RNFL loss on OCT in longstanding cases',
      'Headache; endocrine symptoms (galactorrhoea, amenorrhoea, acromegaly)',
      'MRI pituitary confirms a sellar mass with suprasellar extension',
    ],
    typicalUrgency: 'soon',
    pearls: [
      'Compression from below hits the inferior nasal crossing fibres first, so the field loss starts superotemporally. A craniopharyngioma pushing from above starts inferotemporally.',
      'Pituitary apoplexy (sudden severe headache, double vision, vision loss, drowsiness) is a neurosurgical emergency.',
      'Prolactinomas usually shrink with dopamine agonists (cabergoline). Most other adenomas are removed transsphenoidally.',
      'A visual field test that respects the vertical meridian means neurology, not glaucoma.',
    ],
    rarity: 'rare',
    reference: 'https://eyewiki.aao.org/Pituitary_Adenoma',
  },
  {
    id: 'homonymous-hemianopia',
    name: 'Homonymous Hemianopia',
    aka: ['Homonymous hemianopsia', 'Hemifield loss'],
    category: 'neuro',
    summary:
      'A lesion behind the chiasm (optic tract, radiations or occipital cortex) wipes out the same half of the visual field in both eyes. Stroke is the most common cause in adults, followed by tumour and trauma. Patients often report bumping into things on one side or that reading is hard, and may blame one eye. A new homonymous defect is a stroke until proven otherwise.',
    keyFindings: [
      'Loss of the same side of the field in both eyes, respecting the vertical meridian',
      'Visual acuity usually normal',
      'Occipital lesions: highly congruous defects, often with macular sparing',
      'Optic tract lesions: incongruous defects with an RAPD in the eye with the temporal loss (contralateral eye)',
      'Temporal lobe: superior quadrantanopia ("pie in the sky"); parietal: inferior',
    ],
    typicalUrgency: 'emergency',
    pearls: [
      'Sudden onset: send to the emergency department as a stroke, even if vision seems "fine" centrally.',
      'The more congruous the defect, the further back the lesion. Macular sparing points to the occipital lobe.',
      'Driving is usually not permitted with a complete hemianopia. Discuss licensing and advise on scanning strategies and reading aids.',
      'A right hemianopia makes left-to-right reading especially hard because the next word cannot be seen.',
    ],
    rarity: 'rare',
    reference: 'https://www.ncbi.nlm.nih.gov/books/NBK558929/',
  },
  {
    id: 'congenital-color-deficiency',
    name: 'Congenital Colour Vision Deficiency',
    aka: ['Congenital color vision deficiency', 'Colour blindness', 'Red-green colour deficiency', 'Daltonism'],
    category: 'neuro',
    summary:
      'An inherited absence or shift of one cone pigment makes certain colours hard to tell apart, most often reds and greens. It is X-linked, so about 8% of men of Northern European ancestry are affected and only about 0.5% of women. It is present from birth, stable, symmetric and leaves acuity normal. It matters for school, safety and careers such as aviation, electrical work and transport.',
    keyFindings: [
      'Fails red-green plates (e.g. Ishihara) in both eyes equally',
      'Normal visual acuity, fields, pupils and fundus',
      'Deutan defects most common (deuteranomaly ~5% of men), then protan',
      'HRR plates or the D-15 grade severity and type; the anomaloscope is the gold standard',
      'Lifelong, non-progressive; often a male family history',
    ],
    typicalUrgency: 'routine',
    pearls: [
      'Acquired colour loss is different: often one eye, asymmetric or progressive. That means optic nerve or macular disease, or drugs (e.g. ethambutol, hydroxychloroquine).',
      'Köllner\'s rule: outer retinal and media disease tends to cause blue-yellow defects and optic nerve disease red-green, with exceptions.',
      'Ishihara screens red-green only. Tritan defects need HRR or arrangement tests.',
      'Tinted or notch-filter lenses can enhance contrast for some people but do not restore normal colour vision or help pass occupational tests.',
    ],
    rarity: 'common',
    reference: 'https://medlineplus.gov/genetics/condition/color-vision-deficiency/',
  },
];

export default neuro;
