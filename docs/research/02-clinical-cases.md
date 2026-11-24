# 02 — Clinical Content for Case-Based Play

> Research deliverable for the optometry teaching game. Scope: board-exam blueprints (NBEO Part I/II/III, UK OSCE), plus **37 high-yield patient presentations**, from routine refraction to sight- or life-threatening emergencies. Each one is structured so the game's case engine can use it directly.
>
> **Accuracy notes for the clinical reviewer (please read first)**
> - Everything here is **teaching content, not clinical guidance**. Drug names and regimens show typical first-line choices. Exact doses, and the therapeutic scope allowed to optometrists, vary by US state and by country. In the game, management screens should test *decision category* (e.g. "same-day referral to retina", "start topical steroid + cycloplegic") rather than milligram-level dosing, unless a reviewer signs off on the dose.
> - Where sources disagreed, the disagreement is stated in the text, e.g. referral windows for wet AMD and follow-up intervals for PVD.
> - Statements marked **[verify]** are standard teaching that I could not confirm against a primary online source in this research pass. A clinician should check them before they ship.
> - **Copyright:** AAO EyeWiki pages carry a notice forbidding reproduction or ingestion into AI programs without permission. Everything below is paraphrased clinical knowledge with citations. **Do not paste EyeWiki or StatPearls text into game assets.** Write original case text and cite the sources.

---

## Part A — What the boards test, and how it maps to gameplay

### A1. NBEO Part III PEPS: the clinical encounter exam (closest analogue to our game loop)
Primary source: NBEO *Part III PEPS Blueprint & Content Outline, Aug 2026–May 2027* — https://optometry.org/wp-content/uploads/2026/05/August_2026_May_2027_Part_III_PEPS_Blueprint-__Content_Outline.pdf

- **Format:** 12 stations, each with a standardized patient. 10 are **patient-encounter stations**: focused case history, then interpretation and synthesis of clinical data, then a management plan written as an **electronic SOAP note**. One of the 10 is unscored, for data collection only. The other 2 stations are **skills stations**: biomicroscopy, applanation tonometry, 4-mirror gonioscopy, dilated biomicroscopy (fundus) and binocular indirect ophthalmoscopy (BIO).
- **Competency domain weights:** Clinical Assessment & Interpretation **29**, Management & Documentation **25**, Skills **22**, Patient Education **13**, Communication **11**.
- **Clinical presentation weights:** Anterior Segment **17**, Posterior Segment **16**, Glaucoma **14**, Systemic Disease **11**, Refraction **11**, Neuro-Ophthalmic **9**, Contact Lenses **8**, Binocular Vision **8**, Pediatrics **6**.
- The blueprint weights categories by both **frequency and criticality**, and gives priority to "life- or vision-threatening" conditions.

**Game mapping:** a PEPS station is our core loop: *History, then Tests (mini-games), then Assessment, then Plan, then Patient education*. Scoring weights can mirror the domains, e.g. 29% diagnosis accuracy, 25% plan/urgency, 22% test execution skill, 13% education dialogue, 11% bedside manner. The case deck can be weighted by the nine presentation categories.

### A2. NBEO Part II PAM (with embedded TMOD): the case-based written exam
Primary source: NBEO *Part II PAM Content Outline (May 2026)* — https://optometry.org/wp-content/uploads/2026/05/Part-II-PAM-Content-Outline_20260508.pdf ; exam page https://optometry.org/exams/part-ii-pam-tmod/

- **350 items**, delivered as patient cases. Each case has demographics, chief and secondary complaints, personal and family ocular and medical history, and findings, usually with ≥1 image (photos, VFs, FA, OCT, B-scan, radiology). Each case is followed by **3–6 items**, each with 3–10 options. Some items are multiple-response ("Select 3").
- **About 120 items are TMOD** (Treatment & Management of Ocular Disease): diagnosis to be treated, choice of treatment, dose/form/schedule, contraindications, follow-up and prognosis, **emergencies and urgencies**.
- Case philosophy: cases are "typical presentation of relatively high-frequency conditions" OR "low frequency but high criticality", and the latter are "portrayed in a pathognomonic manner". **This is a good design rule for our cases.**
- Conventions worth copying: "BVA" means best-corrected VA, and when BVA is reduced, pinhole is implied. Near VA is at 16 in (40 cm). Every diabetic patient has an HbA1c listed.
- **Item ranges by content area:**
  - *Refractive / Sensory / Oculomotor (30–40%)*: Ametropia 11–22; Ophthalmic optics/spectacles 6–17; Contact lenses 17–28; Low vision 6–17; Accommodative/vergence/oculomotor 20–25; Amblyopia/strabismus 6–17; Perceptual/color vision 6–17; Development 0–6.
  - *Health / Disease / Trauma (60–70%)*: Lids/lacrimal/adnexa/orbit 11–22; **Conjunctiva/cornea/refractive surgery 33–44**; Lens/cataract/IOL 17–28; Episclera/sclera/anterior uvea 11–22; **Retina/choroid/vitreous 33–44**; **Optic nerve/neuro pathways 28–38**; Glaucoma 16–27; Emergencies/trauma 11–22; Systemic health 11–22.
- Item types: basic-science correlation, diagnosis, data supporting the diagnosis or next test, treatment/management, related-to-management (education, follow-up, prognosis), legal/ethics, public health.

**Game mapping:** after the encounter, a "Board Round" can ask 3–6 PAM-style follow-up questions per case, including "Select N" multiple-response, image interpretation, and "what's the next test?".

### A3. NBEO Part I ABS
Applied basic science: anatomy, physiology, pathology, pharmacology, optics, applied to clinical problems (https://www.optometry.org/exams). **Game use:** short "why does this happen?" pop-quizzes after a case. Examples: why a cherry-red spot appears in CRAO; why nuclear sclerosis gives a myopic shift; why the pupil fibres sit superficially on CN III.

### A4. UK College of Optometrists OSCE (international analogue)
16 short stations, with presentations including **red eye, blurred vision and diplopia**. Candidates may need to explain their reasoning or suggest further tests. https://www.college-optometrists.org/COO/media/Media/Documents/Scheme%20for%20Registration/OSCE/OSCE-Candidate-Guidance.pdf

### A5. Prior art seen in passing (game/case-based teaching in optometry)
- University of Auckland: a narrative video game where students take a patient through a full eye exam and make decisions along the way. https://www.eyeonoptics.co.nz/live-articles/optometry-learning-via-gaming
- University of Melbourne "Trident!": a gamified revision tutorial for OD students. https://melbourne-cshe.unimelb.edu.au/events/past-events/teaching-and-learning-conference-and-summit/2021/presentations/engaging-students/trident
- Randomized trial of gamified eye-trauma teaching (effective as a complementary tool). https://pubmed.ncbi.nlm.nih.gov/39420268/
- An educational game was as effective as interactive didactic teaching for optometry basic and applied science. https://pmc.ncbi.nlm.nih.gov/articles/PMC4883760
- Escape room built around a contact lens wearer with a painful red eye. Learners had to notice that VA had not been checked and that the cornea had not been viewed under cobalt blue. (Cited in the search results set above; underlying article not retrieved [verify].)

---

## Part B — Case engine conventions (proposed)

**Urgency tiers** (use consistently; these drive the "triage" scoring):
| Tier | Label | Meaning in game |
|---|---|---|
| T0 | **EMERGENCY – now** | Send to ED / stroke centre / on-call specialist immediately (minutes to hours) |
| T1 | **Same day / ≤24 h** | Same-day specialist or in-office urgent treatment and 24 h recheck |
| T2 | **Urgent: days to ~1 week** | Specialist within days |
| T3 | **Soon: weeks** | Routine referral or follow-up within weeks |
| T4 | **Routine** | Prescribe, educate, recall in months to a year |

**Reference normals the game will need** (adults unless stated):
- VA notation: Snellen 20/20 = 6/6 = logMAR 0.0. Pinhole improvement suggests refractive error; no improvement suggests media, retinal or neural cause.
- IOP (Goldmann): about 10–21 mmHg. Asymmetry above ~3–5 mmHg is suspicious [verify exact cutoff]. Thin CCT (<555 µm) raised the 5-year POAG risk about 3× in OHTS compared with >588 µm (https://reviewofoptometry.com/article/monitor-or-medicate).
- Typical vertical CDR is about 0.3 but depends on disc size. Rim follows the **ISNT** pattern (Inferior ≥ Superior ≥ Nasal ≥ Temporal). A disc hemorrhage is a risk sign.
- Van Herick: grade 4 means peripheral AC depth ≥ corneal thickness. Grade 1 means < ¼ CT and the angle may be occludable; confirm with gonioscopy.
- NPC break: abnormal if ≥6 cm in pre-presbyopes per CITT, or about 10 cm in presbyopes (EyeWiki). https://eyewiki.aao.org/Convergence_Insufficiency
- Expected accommodation amplitude (Hofstetter, average): **18.5 − 0.3 × age** D. Minimum: 15 − 0.25 × age. Maximum: 25 − 0.4 × age. https://www.wikipedia.org/wiki/Presbyopic (secondary; formula is classic Hofstetter 1950)
- Pupils: RAPD on swinging-flashlight test means asymmetric afferent (optic nerve / extensive retina) disease. Cataract does **not** cause an RAPD.
- Anterior chamber cells (SUN, 1×1 mm beam): 0 = <1; 0.5+ = 1–5; 1+ = 6–15; 2+ = 16–25; 3+ = 26–50; 4+ = >50. https://eyewiki.aao.org/Acute_Anterior_Uveitis
- Myopia ≤ −0.50 D; high myopia ≤ −6.00 D (IMI 2019). https://myopiainstitute.org/imi-whitepaper/defining-and-classifying-myopia

**Per-case data schema** (keeps cases modular and swappable; each case is a JSON file):
`id, title, category(NBEO), tier, demographics, chiefComplaint(patient voice), historyQA[{q, a, isKey}], findings{va, refraction, pupils, eom, coverTest, iop, slitLamp, fundus, fields, colorVision, oct, extra}, differentials[{dx, discriminator}], diagnosis, management[], redFlags[], education[], sources[]`

---

## Part C — The cases

Format for each case: **CC** = chief complaint in the patient's words · **Demo** = typical demographics · **Hx** = key history Q→A · **Tests/Findings** · **DDx** (with the discriminating feature) · **Dx** · **Plan/Tier** · **Red flags** · **Src**.

---

### REFRACTIVE & PRESBYOPIA

#### C01 — Myopia (school-age, progressing)
- **CC:** "I can't read the board from the back of the class anymore. I have to squint." (10-year-old; parent says he sits close to the TV.)
- **Demo:** Onset usually 6–12 y. Risk rises with myopic parents, East Asian ethnicity, heavy near work and little time outdoors.
- **Hx:** Near vision fine? → "Yes." Headaches? → "After school sometimes." Parents myopic? → "Both wear glasses." Time outdoors? → "Not much; lots of tablet time." Any variability or blur after reading? Ask to screen for pseudomyopia.
- **Tests/Findings:** Unaided VA 20/80 OU at distance, 20/20 at near. Pinhole improves to 20/20. Retinoscopy shows **against** motion with the working lens removed. **Cycloplegic** refraction −1.75 DS OU, which confirms true rather than accommodative myopia. Health normal. Axial length (if biometry is available) above age norms.
- **DDx:** *Pseudomyopia / accommodative spasm*: VA fluctuates; cycloplegic Rx much less minus than manifest. *Keratoconus*: irregular astigmatism, scissors reflex, teen. *Hyperglycaemic refractive shift*: adult, diabetic, fluctuating. *Drug-induced myopia (e.g. topiramate)*: acute, bilateral, with shallow AC (see C23).
- **Dx:** Low myopia (IMI: SE ≤ −0.50 D and > −6.00 D).
- **Plan / Tier T4:** Full correction. Discuss **myopia control**: LAMP showed low-dose atropine 0.05% outperformed 0.01% and 0.025%; MiSight 1-day contact lens is FDA-approved for ages 8–12 at initiation; DIMS/HAL defocus spectacles; orthokeratology. Recommend outdoor time. Recheck in 6 months, with axial length if available.
- **Red flags:** Progression to high myopia carries lifelong risk of RD, myopic maculopathy, glaucoma and cataract. A sudden myopic shift in an adult suggests diabetes, nuclear cataract, or a drug cause (topiramate: also check for angle closure, C23).
- **Src:** IMI definitions https://myopiainstitute.org/imi-whitepaper/defining-and-classifying-myopia ; LAMP 5-year https://pubmed.ncbi.nlm.nih.gov/38494130/ ; network meta-analysis and MiSight data https://www.nature.com/articles/s41433-024-02987-5.pdf

#### C02 — Hyperopia (latent; asthenopia)
- **CC:** "My eyes get tired and I get a headache across my forehead after reading. Distance is fine."
- **Demo:** Child or young adult (accommodation hides it). In adults ~35–40, near symptoms come earlier than expected.
- **Hx:** Worse at end of day? → "Yes." Words blur after 20 min? → "Yes." Any eye turning in (child)? → "No." Previous glasses? → "Told I was 'a little farsighted', never wore them."
- **Tests/Findings:** Distance VA 20/20 OU unaided, which is misleading. Near VA 20/25, slow. Retinoscopy shows **with** motion. Manifest +0.75 DS. **Cycloplegic** +2.25 DS OU, which reveals latent hyperopia. Accommodative amplitude may look low for age. Cover test: small esophoria at near. Health normal. Shallow-ish AC in high hyperopes.
- **DDx:** *Convergence insufficiency*: exo at near, receded NPC (C06). *Accommodative insufficiency*: amplitude well below Hofstetter minimum, fails minus lenses. *Early presbyopia* (if ≥40). *Uncorrected astigmatism*.
- **Dx:** Hyperopia, partly latent, causing accommodative asthenopia.
- **Plan / Tier T4:** Prescribe plus for near or full-time. In children, prescribe based on cycloplegic findings and binocular status. Partial prescription is common in adults to aid acceptance.
- **Red flags:** Child with hyperopia **≥ about +2.00 D** has higher esotropia risk (EyeWiki), so watch for an eye turn. High bilateral hyperopia risks isoametropic amblyopia [verify threshold, commonly ≥ +5.00 D]. High hyperopes have short eyes and crowded angles, so assess angle before dilating (C23).
- **Src:** https://eyewiki.aao.org/Accommodative_Esotropia ; AAO disease review https://www.aao.org/disease-review/strabismus-accommodative-esotropia

#### C03 — Astigmatism
- **CC:** "Letters look smeared or doubled, like a shadow, both far and near. Night driving is worse."
- **Demo:** Any age. Often congenital with-the-rule.
- **Hx:** Ghosting in one direction? → "Vertical lines look sharper." Eye rubbing or allergies? Ask, to rule out keratoconus. Changed fast? → "Same for years."
- **Tests/Findings:** VA 20/40 OU, pinhole to 20/20. Keratometry 43.00 @ 180 / 44.75 @ 090, with regular, orthogonal mires. Refraction −0.50 −1.75 × 180 OU gives 20/20. Topography shows a symmetric bow-tie.
- **DDx:** *Keratoconus*: irregular or oblique astigmatism, inferior steepening, scissors reflex, progression (C21). *Pterygium-induced* WTR astigmatism (C18). *Chalazion pressing on the cornea* (C13). *Lenticular astigmatism*: K's don't match the refraction.
- **Dx:** Regular, with-the-rule compound myopic astigmatism.
- **Plan / Tier T4:** Spectacles or toric contact lenses. Adapt gradually to large cylinder changes.
- **Red flags:** Rapidly rising, oblique or irregular astigmatism in a teen suggests keratoconus; get topography and tomography.
- **Src:** https://eyewiki.aao.org/Keratoconus (differential context)

#### C04 — Presbyopia
- **CC:** "My arms aren't long enough anymore. I hold my phone far away and need bright light to read the menu."
- **Demo:** Age ~40–45+. Hyperopes notice it earlier, myopes later.
- **Hx:** Distance OK? → "Fine." Gradual? → "Over a year." Medications? → (antihistamines and anticholinergics worsen it). Diabetes? → "No." Occupation and working distances? → "Accountant, two monitors."
- **Tests/Findings:** Distance VA 20/20 OU. Near VA 20/50 at 40 cm unaided, 20/20 with +1.25 add. Measured amplitude ~4 D at age 46; Hofstetter average 18.5 − 0.3 × 46 = 4.7 D. NRA/PRA balanced at the add. Health normal.
- **DDx:** *Uncorrected hyperopia*: cycloplegic plus. *Early cataract*: lens changes, glare. *Accommodative insufficiency in a young patient*: age doesn't fit. *Drug-induced cycloplegia*. *Adie tonic pupil / CN III*: anisocoria, unilateral.
- **Dx:** Presbyopia.
- **Plan / Tier T4:** Near add. Rule-of-thumb starting adds, individualized: about +1.00 to +1.25 in the mid-40s, +1.50 to +1.75 around 50, +2.00 to +2.50 by 55–60+ [verify table; individual variation is large, https://spiedigitallibrary.org/conference-proceedings-of-spie/11207/112070Y/]. Options: single-vision readers, PALs, occupational lenses, multifocal or monovision CLs, presbyopia-correcting miotic drops (e.g. pilocarpine 1.25%, with retinal-detachment counselling).
- **Red flags:** Sudden near blur in a young person points to drugs, a CN III palsy, a tonic pupil, or diabetes. New anisocoria needs a neuro workup.
- **Src:** https://www.ncbi.nlm.nih.gov/books/NBK560568/ ; https://eyewiki.aao.org/Presbyopia

#### C05 — Anisometropic amblyopia (child failing a school screening)
- **CC (parent):** "The school nurse said his left eye failed the eye chart. He never complained."
- **Demo:** Age 3–8. Often found only on screening because no eye turn is visible.
- **Hx:** Eye turn ever? → "No." Prematurity or family history of lazy eye? → "His uncle." Squints or covers an eye? → "No." Developmental issues? → "No."
- **Tests/Findings:** VA OD 20/20, OS 20/80. **No improvement with pinhole**, and crowding makes it worse. Cover test orthophoric (no strabismus). Randot stereo reduced (e.g. 200″). **Cycloplegic** OD +0.50 DS, OS +3.50 −1.00 × 090: hyperopic anisometropia ≥ +1.50 D. Red reflex symmetric. Pupils normal, **no RAPD**. Fundus normal: disc and macula healthy.
- **DDx:** *Strabismic amblyopia*: tropia on cover test. *Organic cause* (optic nerve hypoplasia, macular scar, **retinoblastoma**, cataract): abnormal red reflex or fundus, RAPD. *Uncorrected refractive error only*: VA reaches 20/20 with lenses. Amblyopia is a **diagnosis of exclusion**.
- **Dx:** Left anisometropic amblyopia.
- **Plan / Tier T3:** Full-time spectacles first. In PEDIG ATS5, 77% of children aged 3 to <7 improved ≥2 lines in 15 weeks with glasses alone, and about 27% resolved. If improvement plateaus, add **patching of the sound eye**: 2 h/day is as effective as 6 h for moderate amblyopia (20/40–20/100), and 6 h/day for severe. **Atropine 1%** penalization is equally effective for moderate amblyopia. Monitor for recurrence (~25% after stopping).
- **Red flags:** Leukocoria or abnormal red reflex, RAPD, or optic disc anomaly mean it is not simple amblyopia; get an urgent workup.
- **Src:** https://pmc.ncbi.nlm.nih.gov/articles/PMC4549157 ; https://www.aafp.org/pubs/afp/issues/2013/0301/p348.html ; https://www.aao.org/disease-review/pedig-studies-quality-healthcare-amblyopia-treatme

---

### BINOCULAR VISION & STRABISMUS

#### C06 — Convergence insufficiency
- **CC:** "After about 10 minutes of reading the words start to float and swim, I lose my place, and I get headaches. Sometimes I see double up close."
- **Demo:** Children 9–17 (CITT population), college students, post-concussion.
- **Hx:** Worse with reading or screens? → "Yes, homework." Distance double? → "Never." Head injury? → "No." (Ask; post-concussion CI is common.) Avoids reading? → "Yes, hates it."
- **Tests/Findings:** VA 20/20 OU, refraction plano. Cover test: ortho at distance, **10Δ exophoria at near**, at least 4Δ more exo at near than at distance. **NPC break 12 cm**, recovery 16 cm (abnormal ≥6 cm). Base-out (positive fusional) vergence at near 10/14/6, which **fails Sheard** (PFV < 2 × phoria) and is ≤15Δ. **CISS score 28** (≥16 is symptomatic on the 15-item version). Accommodative amplitude normal. Health normal.
- **DDx:** *Accommodative insufficiency*: low amplitude, fails −2.00 on monocular facility, NPC may be normal. *Convergence excess*: eso at near, high AC/A. *Uncorrected hyperopia*. *Basic exophoria*: exo equal at distance and near. *Neurologic CI*: Parkinson's, post-TBI, with other signs.
- **Dx:** Convergence insufficiency.
- **Plan / Tier T4:** **Office-based vergence/accommodative therapy with home reinforcement (OBVAT)**: 12 weeks of weekly 60-min sessions plus 15 min/day at home, 5 days a week. In CITT this was significantly better than home pencil push-ups, home computer therapy, and placebo (mean CISS 15.1 vs 21.3–24.7). Pencil push-ups alone are less effective.
- **Red flags:** New CI in an adult with other neurologic signs, or acute diplopia, needs a neuro evaluation.
- **Src:** CITT design https://pmc.ncbi.nlm.nih.gov/articles/PMC2782898 ; eligibility table https://pmc.ncbi.nlm.nih.gov/articles/PMC2821445 ; RCT results https://pubmed.ncbi.nlm.nih.gov/18852411/ ; https://eyewiki.aao.org/Convergence_Insufficiency

#### C07 — Refractive accommodative esotropia
- **CC (parent):** "Her eye turns in, mostly when she looks at books or toys up close. It started around her 2nd birthday."
- **Demo:** Onset classically ~2–3 y (range ~6 mo–7 y) [verify range]. Moderate hyperopia. Family history of strabismus.
- **Hx:** Constant or intermittent? → "Comes and goes; worse when tired or looking close." Same eye? → "Usually the right; sometimes the left," i.e. alternating, lower amblyopia risk. Illness or trauma? → "No."
- **Tests/Findings:** **Cycloplegic +4.00 DS OU**; AAO cites a mean of +4.75 D with a range of +1.5 to +7.0. Without glasses, cover test **ET 25Δ near, 20Δ distance**. **With full cycloplegic Rx: orthophoric or a small esophoria at both distances.** Full abduction both eyes, so the deviation is comitant. Red reflex and fundus normal. Check VA for amblyopia.
- **DDx:** *Infantile esotropia*: onset < 6 months, large angle, little hyperopia, cross-fixation. *CN VI palsy*: **abduction deficit**, incomitant (C09). *High AC/A accommodative ET*: near − distance ≥10Δ even with full distance Rx, needs bifocal. *Pseudoesotropia*: epicanthus, symmetric Hirschberg. *Sensory ET*: poor vision in one eye (retinoblastoma, cataract).
- **Dx:** Refractive accommodative esotropia (normal AC/A).
- **Plan / Tier T3:** **Full cycloplegic hyperopic correction, worn full-time.** Treat any amblyopia. If near ET persists (high AC/A), add a bifocal of about +2.50 to +3.00. Surgery only for any non-accommodative component.
- **Red flags:** Leukocoria, abduction deficit, papilledema, or sudden onset in an older child need urgent workup.
- **Src:** https://eyewiki.aao.org/Accommodative_Esotropia ; https://www.aao.org/disease-review/strabismus-accommodative-esotropia ; https://webeye.ophth.uiowa.edu/eyeforum/cases/129-Accommodative-Esotropia.htm

#### C08 — Third nerve (oculomotor) palsy, pupil-involving: possible aneurysm
- **CC:** "My left eyelid suddenly drooped this morning, and when I lift it I see double. I had the worst headache of my life behind that eye."
- **Demo:** Any adult. Posterior communicating artery (PComm) aneurysm typically in women aged 40–60 [verify demographic].
- **Hx:** Sudden? → "Yes, today." Headache? → "Severe, behind the eye." Diabetes or HTN? → "No." Neck stiffness, nausea? → "Some nausea."
- **Tests/Findings:** **Ptosis** OS. Eye **"down and out"** in primary gaze. Adduction, elevation and depression limited; abduction intact (CN VI). **Pupil OS 7 mm, poorly reactive** (anisocoria greater in bright light). Diplopia is oblique. VA normal. Fundus normal.
- **DDx:** *Microvascular (ischemic) CN III*: diabetic or HTN patient over 50, **pupil usually spared**, painful but not "thunderclap"; still not ruled out without imaging. *Myasthenia gravis*: never affects the pupil; variable and fatigable. *Horner syndrome*: ptosis with a **small** pupil. *Pharmacologic mydriasis*: no motility deficit. *GCA*. *Cavernous sinus lesion*: multiple cranial nerves.
- **Dx:** Acute pupil-involving left CN III palsy; **compressive aneurysm until proven otherwise**. Pupil fibres run superficially on the nerve, so compression affects them first.
- **Plan / Tier T0:** **EMERGENCY**: ED now for CT/CTA or MRA (and LP if subarachnoid haemorrhage is suspected and imaging is negative).
- **Red flags:** Any pupil-involving or partial CN III palsy; "worst headache"; altered consciousness (herniation).
- **Src:** https://www.merckmanuals.com/professional/neurologic-disorders/neuro-ophthalmologic-and-cranial-nerve-disorders/third-cranial-nerve-oculomotor-disorders ; https://pmc.ncbi.nlm.nih.gov/articles/PMC5965153

#### C09 — Sixth nerve (abducens) palsy
- **CC:** "Since yesterday I see two of everything side by side, worse when I look far away and to my left. Closing one eye fixes it."
- **Demo:** Over 50 with vascular risk factors (microvascular). In children, think raised intracranial pressure, tumor, or post-viral.
- **Hx:** Diabetes or HTN? → "Both, 15 years." Headache, transient vision loss, pulsatile tinnitus? (raised ICP) → "No." Jaw pain, scalp tenderness? (GCA) → "No." Other neuro symptoms? → "No."
- **Tests/Findings:** **Left abduction deficit.** Incomitant **esotropia greater at distance and in left gaze**. Face turn to the left. Pupils, lids and other EOMs normal. **Check discs for papilledema** (bilateral CN VI is a false-localizing sign of high ICP). BP elevated.
- **DDx:** *Thyroid eye disease*: restrictive medial rectus, proptosis, lid retraction. *Myasthenia*: variable, ptosis. *Duane syndrome*: congenital, globe retraction on adduction. *Medial wall fracture*: trauma. *Divergence insufficiency*. *Raised ICP*: papilledema. *GCA*.
- **Dx:** Isolated left CN VI palsy, presumed microvascular.
- **Plan / Tier T1–T2:** Same-week neuro workup. Practice is moving toward early MRI even in vasculopathic patients [verify]; **always MRI in children** and when there is any other neuro sign. Check ESR/CRP if over 50. Control BP and glucose. Fresnel prism or occlusion for diplopia. Microvascular palsies usually resolve **within ~6 months**; no improvement, or progression, means imaging.
- **Red flags:** Papilledema, multiple cranial nerves, young patient, pain or headache pattern, no recovery.
- **Src:** https://eyewiki.aao.org/Abducens_Nerve_Palsy ; https://img.medscape.com/pi/iphone/medscapeapp/html/A1198383-business.html ; https://www.ncbi.nlm.nih.gov/books/NBK430711/

#### C10 — Fourth nerve (trochlear) palsy
- **CC:** "Things look double one on top of the other, and slightly tilted. It's worst when reading or walking downstairs. I tilt my head to stop it."
- **Demo:** Acquired: closed-head trauma, the most common acquired cause. Microvascular in older adults. *Congenital decompensated*: adults whose old photos show a head tilt.
- **Hx:** Head injury? → "Motorbike accident 3 weeks ago." Old photos with head tilt? → "No." Vertical fusional amplitudes are large in congenital cases.
- **Tests/Findings:** **Parks–Bielschowsky 3-step test:** (1) **Right hypertropia** in primary gaze. (2) Worse in **left gaze**. (3) Worse on **right head tilt**. Result: right CN IV (superior oblique) palsy. Compensatory **head tilt to the left** (away from the lesion). Double Maddox rod shows excyclotorsion; **>10° suggests bilateral** palsy.
- **DDx:** *Skew deviation*: brainstem or cerebellar lesion; may improve when supine (upright–supine test); ocular tilt reaction. *Myasthenia*. *Thyroid eye disease* (inferior rectus restriction). *Brown syndrome*. *Orbital floor fracture*. The 3-step test can mislead in skew, restriction and prior surgery.
- **Dx:** Right traumatic CN IV palsy.
- **Plan / Tier T2:** Neuroimaging if there is no clear benign cause or other neuro signs. Vertical prism, observation (traumatic palsies often recover partially), strabismus surgery if stable but symptomatic.
- **Red flags:** Skew features (other brainstem signs), multiple cranial nerves, progressive.
- **Src:** https://eyewiki.aao.org/Cranial_Nerve_4_Palsy ; https://eyewiki.aao.org/Three_Step_Test_for_Cyclovertical_Muscle_Palsy

---

### OCULAR SURFACE, LIDS & CONJUNCTIVA

#### C11 — Dry eye disease (evaporative > aqueous-deficient)
- **CC:** "My eyes burn and feel gritty, worse at the end of the workday on the computer. My vision blurs then clears when I blink. Weirdly, they also water a lot."
- **Demo:** Women over 50 (post-menopausal), heavy screen users, contact lens wearers, people with autoimmune disease.
- **Hx:** Dry mouth or joint pain? (Sjögren) → "No." Meds? → antihistamine, SSRI. Prior refractive surgery? → "No." CLs? → "Stopped, too uncomfortable." Rosacea? → "Cheeks flush."
- **Tests/Findings:** **OSDI 32** (≥13 = symptomatic) or DEQ-5 ≥6. **Fluorescein TBUT 4 s** (<10 s abnormal). **Osmolarity 318 mOsm/L** (≥308 in either eye, or inter-eye difference >8, is abnormal). **Ocular surface staining**: >5 corneal spots, >9 conjunctival spots (lissamine), or lid-margin staining ≥2 mm long and ≥25% wide. Schirmer is low in aqueous-deficient disease. MGD: capped orifices, turbid "toothpaste" expression. Blink is incomplete. VA fluctuates.
- **DDx:** *Allergic conjunctivitis*: itch dominant, papillae, chemosis. *Blepharitis / Demodex*: collarettes. *Exposure keratopathy*: lagophthalmos, Bell's palsy. *Conjunctivochalasis*. *Preservative toxicity*. *Sjögren syndrome*: systemic signs, autoantibodies.
- **Dx (TFOS DEWS II):** Dry eye disease (symptoms plus ≥1 homeostasis marker), predominantly evaporative from MGD.
- **Plan / Tier T4:** Step-wise: education, environment, preservative-free tears, lid hygiene and warm compresses, then prescription anti-inflammatories (cyclosporine, lifitegrast), punctal plugs, in-office MGD treatments, and so on. Treat the MGD and Demodex component. Review causative meds. Note TFOS DEWS III (2025) updated the definition: dry eye is always symptomatic and is a disease, not a syndrome.
- **Red flags:** Dry mouth with arthralgia (Sjögren: refer for systemic workup; lymphoma risk); a corneal epithelial defect with low sensation (neurotrophic); corneal melt in rheumatoid disease.
- **Src:** https://aao.org/eyenet/article/the-tfos-dry-eye-workshop-ii ; https://pubmed.ncbi.nlm.nih.gov/28736335/ ; DEWS III methodology https://pubmed.ncbi.nlm.nih.gov/40451408/

#### C12 — Blepharitis / Demodex / meibomian gland dysfunction
- **CC:** "My eyelids are red and crusty every morning, they itch and burn, and I'm losing eyelashes."
- **Demo:** Older adults; rosacea; chronic and recurrent.
- **Hx:** Morning worst? → "Yes, crusty." Facial rosacea? → "Red cheeks, nose." Styes before? → "A few." Treatments tried? → "Baby shampoo, helps a bit."
- **Tests/Findings:** **Cylindrical dandruff / collarettes** at lash bases, which are pathognomonic for *Demodex*. Lid-margin telangiectasia, madarosis, **capped meibomian orifices with turbid secretions**, foamy tear film. Rapid TBUT. Inferior punctate staining. VA normal.
- **DDx:** Dry eye (often coexists). Allergic or contact dermatitis. Staphylococcal blepharitis (hard scales, ulcerative margin). **Sebaceous gland carcinoma** masquerading as unilateral chronic blepharitis.
- **Dx:** Mixed anterior (Demodex) blepharitis and posterior blepharitis (MGD).
- **Plan / Tier T4:** Daily lid hygiene and warm compresses. **Lotilaner 0.25%**, the only FDA-approved treatment for Demodex blepharitis. For MGD/rosacea: topical azithromycin or oral doxycycline (per AAO PPP: antibiotics, anti-inflammatories and lid hygiene).
- **Red flags:** **Unilateral**, chronic, treatment-resistant blepharitis with lash loss or distorted lid architecture means biopsy to exclude sebaceous carcinoma [verify; standard teaching].
- **Src:** https://pmc.ncbi.nlm.nih.gov/articles/PMC11368203 ; https://www.dovepress.com/effects-of-lotilaner-ophthalmic-solution-025-on-demodex-blepharitis-pa-peer-reviewed-fulltext-article-OPTH ; https://bestpractice.bmj.com/topics/en-us/574/references

#### C13 — Hordeolum vs chalazion (with the cellulitis trap)
- **CC (hordeolum):** "There's a painful red bump on the edge of my eyelid that came up two days ago." **CC (chalazion):** "I've had a painless pea-sized lump in my upper lid for a month."
- **Demo:** Any age. Blepharitis and rosacea predispose.
- **Hx:** Tender? Fever? Vision change? Pain on moving the eye? Recurrent in the same spot?
- **Tests/Findings:** *Hordeolum*: tender, erythematous, focal swelling at the lid margin (lash follicle = external, meibomian = internal), sometimes pointing with pus. *Chalazion*: firm, non-tender, rubbery nodule set back from the margin; the tarsal conjunctiva may be granulomatous; a large one may induce astigmatism. Check VA, pupils, EOMs, proptosis, temperature.
- **DDx:** **Preseptal cellulitis**: diffuse lid oedema and erythema, but **no pain on eye movement, no proptosis, normal VA and pupils**. **Orbital cellulitis**: pain on eye movement, proptosis, restricted EOM, reduced VA or RAPD, fever. **Sebaceous gland carcinoma / BCC**: recurrent lesion in the same location, lash loss, ulceration. Dacryocystitis: medial canthus.
- **Dx:** Hordeolum or chalazion.
- **Plan / Tier T4:** Warm compresses and lid hygiene first line (evidence is limited but this is the standard). Chalazion persisting despite care: intralesional steroid or incision and curettage. **Preseptal cellulitis**: oral systemic antibiotics, 24–48 h recheck (T1). **Orbital cellulitis**: T0, ED for CT and IV antibiotics.
- **Red flags:** Pain on eye movement or proptosis (orbital), recurrence in the same spot (biopsy), child with fever.
- **Src:** https://www.ncbi.nlm.nih.gov/books/NBK459349/ ; https://www.merckmanuals.com/professional/eye-disorders/eyelid-and-lacrimal-disorders/chalazion-and-hordeolum-stye ; https://www.ccjm.org/content/83/5/332.full.pdf

#### C14 — Allergic conjunctivitis (seasonal)
- **CC:** "My eyes are SO itchy, watery and puffy. Every spring. I'm sneezing too."
- **Demo:** Atopic children and young adults; seasonal (pollen) or perennial (dust mite, pets).
- **Hx:** Itch the main symptom? → "Can't stop rubbing." (Itch is the hallmark.) Both eyes? → "Yes." Hay fever, asthma, eczema? → "Hay fever." Discharge? → "Clear, stringy." Contacts? → "No."
- **Tests/Findings:** Bilateral. **Chemosis**, mild injection, **papillae** on the tarsal conjunctiva, watery or stringy mucoid discharge, lid oedema, **no preauricular node**. Cornea clear. VA normal.
- **DDx:** *Viral*: preauricular node, follicles, recent URI, starts unilateral. *Bacterial*: mucopurulent, lids stuck shut. *Dry eye*. *Giant papillary conjunctivitis* (CL wearer, large superior tarsal papillae). *Vernal keratoconjunctivitis*: young boys, cobblestone giant papillae, Horner–Trantas dots, **shield ulcer**. *Atopic keratoconjunctivitis*: adults with eczema.
- **Dx:** Seasonal allergic conjunctivitis.
- **Plan / Tier T4:** Allergen avoidance, cold compresses, refrigerated artificial tears, **dual-acting antihistamine / mast-cell stabilizer** drops (e.g. olopatadine, ketotifen). Short pulse of a soft steroid (e.g. loteprednol) for severe flares, with IOP monitoring.
- **Red flags:** Shield ulcer or corneal involvement (VKC); chronic steroid use (raised IOP, cataract); eye rubbing plus atopy (keratoconus risk, C21).
- **Src:** https://pubmed.ncbi.nlm.nih.gov/30020258/ ; StatPearls conjunctivitis https://www.ncbi.nlm.nih.gov/books/NBK470271/ ; AAO Conjunctivitis PPP 2023 https://aao.org/education/preferred-practice-pattern/conjunctivitis-ppp-2023

#### C15 — Bacterial conjunctivitis (and the hyperacute trap)
- **CC:** "My eye was glued shut this morning with yellow-green gunk. It's red but doesn't really hurt."
- **Demo:** Children; adults; contacts.
- **Hx:** Onset? → "Yesterday." Contacts? → "No." (If yes, think keratitis.) Sexual history (hyperacute, chlamydia)? Newborn? Vision change? → "No."
- **Tests/Findings:** **Mucopurulent discharge**, diffuse conjunctival injection, papillae, lids crusted. **Cornea clear (no infiltrate)**, VA normal, no preauricular node (in typical bacterial disease).
- **DDx:** *Viral* (watery, follicles, node). *Allergic* (itch). **Gonococcal** (hyperacute, copious pus, chemosis, node; can perforate the cornea). *Chlamydial / adult inclusion* (chronic follicular, sexually active). *Keratitis* (pain, photophobia, infiltrate). *Dacryocystitis*.
- **Dx:** Acute bacterial conjunctivitis.
- **Plan / Tier T4:** Mild cases are often self-limited (AAO PPP); avoid indiscriminate antibiotics and steroids. A broad-spectrum topical antibiotic (e.g. polymyxin B/trimethoprim, fluoroquinolone) speeds resolution. Hand hygiene.
- **Red flags:** **Hyperacute purulent discharge**: culture and Gram stain, systemic ceftriaxone, same day (T1). **Neonate** (ophthalmia neonatorum). **Contact lens wearer**: examine the cornea carefully. Chronic or unresponsive cases: chlamydia.
- **Src:** https://www.ncbi.nlm.nih.gov/books/NBK546683/ ; https://eyewiki.aao.org/Bacterial_Conjunctivitis ; https://pubmed.ncbi.nlm.nih.gov/38349304

#### C16 — Viral (adenoviral) conjunctivitis / epidemic keratoconjunctivitis
- **CC:** "My right eye went pink and watery 3 days ago and now the left one is starting. Feels sandy. I had a cold last week. My kids' class has it too."
- **Demo:** Any age. Outbreaks in schools, clinics and offices. About 80% of acute conjunctivitis is viral, mostly adenovirus.
- **Hx:** Recent URI or sick contacts? → "Yes." Itch? → "Mild." Discharge? → "Watery." Vesicles on lid or prior cold sores? (HSV) → "No."
- **Tests/Findings:** **Follicles** on the inferior palpebral conjunctiva, watery discharge, **tender preauricular lymph node**, sometimes petechial subconjunctival haemorrhages or pseudomembranes. Second eye often milder. At 1–2 weeks: **subepithelial infiltrates** causing blur and photophobia. Fluorescein: **no dendrites**.
- **DDx:** **HSV conjunctivitis / keratitis**: usually unilateral, lid vesicles, **dendrite with terminal bulbs**. Allergic, bacterial, chlamydial (chronic follicular).
- **Dx:** Adenoviral keratoconjunctivitis.
- **Plan / Tier T4:** Self-limited, no proven antiviral. Cold compresses, artificial tears, strict hygiene. Contagious from about 1–2 days before symptoms to ~2 weeks after onset: off work or school per local policy, disinfect instruments. Topical steroid cautiously for symptomatic subepithelial infiltrates or pseudomembranes, **only after HSV is excluded**. Some clinicians use off-label povidone-iodine regimens [verify evidence].
- **Red flags:** Dendrite on fluorescein means HSV, and steroids are contraindicated in epithelial HSV. Marked VA loss. Neonate.
- **Src:** https://eyewiki.aao.org/Epidemic_Keratoconjunctivitis ; https://www.health.nsw.gov.au/Infectious/factsheets/Pages/epidemic-keratoconjunctivitis.aspx ; HSV distinction https://eyewiki.aao.org/Herpes_Simplex_Virus_Keratitis ; https://www.msdmanuals.com/professional/eye-disorders/corneal-disorders/herpes-simplex-keratitis

#### C17 — Subconjunctival haemorrhage
- **CC:** "I woke up and the white of my eye is bright red! It doesn't hurt or affect my vision."
- **Demo:** Older adults; anticoagulants or antiplatelets; hypertension; Valsalva (cough, vomiting, straining, lifting); contact lens handling.
- **Hx:** Trauma? → "No." Blood thinners? → "Apixaban." Coughing or straining? → "Bad cough." BP known? Recurrent? Easy bruising or bleeding gums?
- **Tests/Findings:** Flat, **sharply demarcated** bright-red patch under the conjunctiva. VA normal. Cornea clear. No discharge. No AC reaction. **Measure BP.**
- **DDx:** Conjunctivitis (diffuse injection, discharge). Ciliary flush (uveitis, keratitis). Kaposi sarcoma or tumour (persistent, elevated). **Occult globe rupture** (trauma, 360° bullous haemorrhage).
- **Dx:** Spontaneous subconjunctival haemorrhage.
- **Plan / Tier T4:** Reassure. Resolves in about 2–3 weeks; the colour may change like a bruise. Artificial tears for irritation. Check BP and refer if elevated. Review anticoagulation (check INR if on warfarin).
- **Red flags:** **Trauma with 360° bullous haemorrhage**, low IOP, peaked pupil or reduced VA mean a possible open globe: T0, shield the eye, no pressure, ED. **Recurrent** haemorrhage means workup for HTN, bleeding disorder or drug effect. Petechiae or fever (blood dyscrasia).
- **Src:** https://www.ncbi.nlm.nih.gov/books/NBK551666/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC3702240 ; https://www.merckmanuals.com/professional/eye-disorders/conjunctival-and-scleral-disorders/subconjunctival-hemorrhages

#### C18 — Pinguecula / pterygium (and the OSSN mimic)
- **CC:** "There's a fleshy pink growth on the white of my eye growing toward my pupil. It gets red and irritated in the sun."
- **Demo:** Outdoor workers, surfers, people at low latitudes. UV exposure is the leading risk factor.
- **Hx:** Sun exposure? → "Fisherman, 25 years." Growing? → "Slowly." Vision? → "Slightly blurrier." Prior surgery? (recurrence)
- **Tests/Findings:** *Pinguecula*: yellow-white, slightly elevated nodule at the nasal or temporal limbus that **does not cross onto the cornea**. *Pterygium*: **wing-shaped fibrovascular tissue crossing the limbus onto the cornea**, sometimes with an iron line (Stocker line) at the head. Topography or K's show **induced with-the-rule astigmatism**. "Pingueculitis" or inflamed pterygium: sectoral injection.
- **DDx:** **Ocular surface squamous neoplasia (OSSN)**: gelatinous or leukoplakic, feeder vessels, atypical location. Pseudopterygium (after a corneal ulcer or chemical burn; a probe passes under it). Episcleritis (sectoral, blanches with phenylephrine [verify]).
- **Dx:** Nasal pterygium, OD.
- **Plan / Tier T4:** UV protection (sunglasses, hat), lubricants, short-course topical anti-inflammatory for flares. **Surgical excision with conjunctival autograft** (lowest recurrence, ~5–10%; bare-sclera excision recurs far more) if it threatens the visual axis, causes significant astigmatism, restricts motility, or for cosmesis.
- **Red flags:** Suspicious features of OSSN or a rapidly growing lesion need biopsy (T3).
- **Src:** https://www.ncbi.nlm.nih.gov/books/NBK558907/ ; https://www.ncbi.nlm.nih.gov/books/NBK558965/ ; https://eyewiki.aao.org/Pterygium ; https://www.msdmanuals.com/professional/eye-disorders/conjunctival-and-scleral-disorders/pinguecula-and-pterygium

---

### CORNEA & CONTACT LENS

#### C19 — Corneal abrasion (with foreign-body and open-globe traps)
- **CC:** "My toddler poked me in the eye with her fingernail. It feels like something's stuck in there, it won't stop tearing, and I can't open it in the light."
- **Demo:** Any age. Fingernails, makeup brushes, branches, contact lenses.
- **Hx:** Mechanism? (fingernail vs **hammering metal on metal**, a high-velocity foreign body) → "Fingernail." Contacts? → "No." (CL wearers need anti-pseudomonal cover.) Vegetable matter? (fungal) Chemical? (irrigate first). Tetanus status.
- **Tests/Findings:** VA 20/40 (central defect). **Fluorescein: well-demarcated epithelial defect, bright green under cobalt blue**, no infiltrate. **Evert the upper lid**: multiple vertical linear abrasions mean a retained foreign body under the lid. **Seidel test negative.** AC quiet or trace cells. Pupil round.
- **DDx:** Retained FB. Recurrent corneal erosion (on waking, prior injury, basement membrane dystrophy). **Microbial keratitis** (white infiltrate, C20). HSV dendrite. UV keratitis (welding, tanning; bilateral punctate). **Open globe** (Seidel positive, peaked pupil, shallow AC, low IOP).
- **Dx:** Traumatic corneal abrasion.
- **Plan / Tier T1:** Topical antibiotic prophylaxis. Non-CL wearer: e.g. erythromycin ointment or polymyxin-trimethoprim. **CL wearer: anti-pseudomonal fluoroquinolone (e.g. ciprofloxacin, moxifloxacin), no CL wear.** **No patching** (it doesn't reduce pain, may delay healing, and raises infection risk in CL wearers). Oral analgesia, optional cycloplegic. **Never dispense topical anaesthetics.** Recheck in 24–48 h, especially CL-related or large defects.
- **Red flags:** High-velocity injury (dilated fundus exam, CT for intraocular FB; **no MRI** if metal). Seidel positive (shield, ED, T0). Infiltrate. Chemical injury (irrigate to neutral pH first, T0).
- **Src:** https://www.aafp.org/pubs/afp/issues/2013/0115/p114.html ; https://www.ncbi.nlm.nih.gov/books/NBK532960/ ; https://www.msdmanuals.com/professional/injuries-poisoning/eye-trauma/corneal-abrasions-and-foreign-bodies

#### C20 — Contact-lens-related microbial keratitis (corneal ulcer)
- **CC:** "My eye is really red and painful, light kills it, it's blurry, and there's goopy discharge. I sleep in my contacts sometimes."
- **Demo:** Young adult soft CL wearer with poor habits: overnight wear, swimming or showering in lenses, tap-water rinsing, topping off solution.
- **Hx:** Overnight wear? → "Most nights." Water exposure? → "Rinse case with tap water." (Acanthamoeba risk.) Onset? → "Started yesterday, much worse today." Pain severity? (Pain out of proportion suggests Acanthamoeba.) Vegetable trauma? (fungal)
- **Tests/Findings:** VA 20/200. **Dense white stromal infiltrate with overlying epithelial defect that stains**, often paracentral. Diffuse injection and lid oedema. **AC cells, possibly hypopyon.** Mucopurulent discharge. *Pseudomonas*: rapid, suppurative, possibly ring-like. *Fungal*: feathery margins, satellite lesions. *Acanthamoeba*: ring infiltrate, radial perineuritis, pain severe.
- **DDx:** **Sterile CL peripheral ulcer / infiltrative keratitis**: small (<1–2 mm), peripheral, round, minimal staining and pain, little AC reaction. **HSV keratitis.** CLARE (acute red eye on waking, sterile infiltrates, no defect).
- **Dx:** Bacterial keratitis, presumed *Pseudomonas aeruginosa* (contact-lens associated).
- **Plan / Tier T1:** Stop CL wear; **culture** the cornea (and lens and case) if large, central, deep, with significant AC reaction, or atypical. A commonly taught culture heuristic is the **"1-2-3 rule"**: ≥1+ AC cells, ≥2 mm infiltrate, ≤3 mm from centre [verify; Wills Eye teaching]. Intensive broad-spectrum topical therapy: fluoroquinolone hourly, or fortified vancomycin + tobramycin for severe or central cases. **Same-day cornea specialist** for central, large or non-responding ulcers. No initial steroids; adjunctive steroid later per specialist (SCUT: no overall benefit for *Pseudomonas*).
- **Red flags:** Hypopyon, thinning or perforation, ring infiltrate (Acanthamoeba), fungal features, a single eye.
- **Src:** https://eyewiki.aao.org/Pseudomonas_Keratitis ; https://eyewiki.aao.org/Bacterial_Keratitis ; https://pmc.ncbi.nlm.nih.gov/articles/PMC4681797/ ; https://www.doi.org/10.2147/OPTO.S72079

#### C21 — Keratoconus
- **CC:** "My glasses change every year and they still never get me sharp. I see ghost images and halos at night."
- **Demo:** Onset in the teens to 20s. Eye rubbing, atopy, Down syndrome, connective tissue disorders, family history.
- **Hx:** Eye rubbing? → "Constantly, allergies." Frequent Rx changes? → "Yes." Better with hard contacts? → "Never tried."
- **Tests/Findings:** **Best spectacle VA 20/40, better (20/20) with RGP over-refraction** or pinhole. High, **oblique, irregular** astigmatism. **Scissors reflex** on retinoscopy. Distorted keratometry mires. Steep K (e.g. >47 D). **Inferior steepening** on topography. **Thinning** on pachymetry or tomography. Slit lamp: **Vogt striae** (vertical stress lines that vanish with globe pressure), **Fleischer ring** (iron ring at the cone base, best under cobalt blue), apical scarring. Externally: **Munson sign** (lower lid bulges in downgaze), **Rizzuti sign** (conical light reflex on the nasal limbus).
- **DDx:** Regular astigmatism (symmetric bow-tie). Pellucid marginal degeneration (inferior band thinning, "kissing doves"). Post-LASIK ectasia. CL warpage (resolves off lenses).
- **Dx:** Keratoconus, progressive.
- **Plan / Tier T3:** Stop eye rubbing, treat allergy. **Refer for corneal cross-linking** if progressive. Visual rehab with specialty lenses (RGP, hybrid, scleral). Keratoplasty for advanced disease or scarring.
- **Red flags:** **Acute hydrops** (sudden pain, white oedematous cornea, VA drop): same-day (T1). Rapid progression in a teen means expedited CXL referral.
- **Src:** https://eyewiki.aao.org/Keratoconus ; https://www.aao.org/eyenet/article/diagnosis-and-management-of-keratoconus ; https://webeye.ophth.uiowa.edu/eyeforum/atlas/pages/keratoconus/index.htm

---

### UVEA & ANGLE

#### C22 — Acute anterior uveitis (iritis)
- **CC:** "My eye aches deep inside, it's red around the coloured part, and light is unbearable, even when you shine it in my *other* eye. Vision's a bit foggy."
- **Demo:** Age 20–50. HLA-B27 associations (ankylosing spondylitis, reactive arthritis, IBD, psoriasis). Often recurrent.
- **Hx:** Low-back stiffness in the morning? → "Yes, for years." Prior episodes? → "Once, the other eye." Discharge? → "None." Rashes, GI symptoms, urethritis? Recent eye surgery? (endophthalmitis) Cold sores? (HSV uveitis).
- **Tests/Findings:** VA 20/30. **Ciliary (circumlimbal) flush.** **AC cells 2+, flare 1+** (SUN grading). Fine **keratic precipitates** inferiorly (non-granulomatous). **Miotic pupil**, possibly irregular from **posterior synechiae**. IOP often **low** (ciliary body shutdown) but can be high (HSV/VZV, Posner–Schlossman). **Consensual photophobia** (pain when light hits the fellow eye). Cornea clear, no staining. Check vitreous and fundus for posterior involvement.
- **DDx:** **Keratitis** (staining, infiltrate). **Acute angle closure** (very high IOP, mid-dilated pupil, corneal oedema, C23). Scleritis (deep boring pain, violaceous, tender globe). Conjunctivitis (discharge, normal pupil, no cells). Endophthalmitis (after surgery or injection, hypopyon, vitritis).
- **Dx:** Acute non-granulomatous anterior uveitis, likely HLA-B27-associated.
- **Plan / Tier T1:** **Topical steroid** (e.g. prednisolone acetate 1% frequently, then slow taper) plus **cycloplegic** (cyclopentolate or homatropine) for pain and to prevent synechiae. Monitor IOP. A first unilateral non-granulomatous episode often needs no lab workup; **recurrent, bilateral or granulomatous** disease needs workup (HLA-B27 for recurrent AAU per EyeWiki; also syphilis, sarcoid, TB as indicated) and rheumatology co-management. Recheck in 1 week, then taper.
- **Red flags:** Hypopyon, vitritis or retinitis, post-operative timing (endophthalmitis, T0), IOP spike, granulomatous KPs (sarcoid, TB, syphilis).
- **Src:** https://eyewiki.aao.org/Acute_Anterior_Uveitis ; https://www.ncbi.nlm.nih.gov/books/NBK540993/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC6095364

#### C23 — Acute primary angle-closure crisis ("acute angle-closure glaucoma")
- **CC:** "Last night at the movie theatre my eye started pounding. Now I have a terrible headache, I threw up twice, and I saw rainbow halos around the lights."
- **Demo:** Over 60, **female**, **hyperopic** (short axial length), **East Asian or Inuit** ancestry, family history. Triggers: dim light, **pupil dilation** (mydriatics), anticholinergics, sympathomimetics, stress.
- **Hx:** Prior episodes of blur with halos in the evening that resolved? → "A few times this year." Recent meds? → cold medicine or antihistamine. Dilated recently? **Topiramate or sulfa drugs?** Those cause *bilateral* secondary angle closure via ciliochoroidal effusion, with a myopic shift; the management differs.
- **Tests/Findings:** VA 20/200, **IOP 58 mmHg** (attacks typically 40–80), conjunctival injection, **corneal microcystic oedema** (hazy), **mid-dilated, poorly reactive pupil**, **shallow AC**, **closed angle on gonioscopy** (if the view allows). **Fellow eye: van Herick grade 1, narrow occludable angle.** WikEM diagnostic heuristic: ≥2 symptoms (pain, nausea/vomiting, prior intermittent blur with halos) plus ≥3 signs (IOP >21, injection, corneal epithelial oedema, mid-dilated non-reactive pupil, shallow AC).
- **DDx:** Anterior uveitis (cells, small pupil, IOP usually low). Neovascular glaucoma (iris NV, diabetes or CRVO history). Plateau iris. Lens-induced (phacomorphic). **Topiramate-induced** (bilateral, myopic, recent drug start). Migraine, GI or neuro causes (a common ED misdiagnosis because of nausea and headache).
- **Dx:** Acute primary angle-closure crisis, OD.
- **Plan / Tier T0:** **EMERGENCY: same-hour ophthalmology or ED.** Lower IOP with topical beta-blocker, alpha-agonist and CAI, plus oral or IV acetazolamide, plus a hyperosmotic agent if needed. **Pilocarpine 1–2% once IOP starts to fall** (iris ischemia at very high IOP blunts response; avoid >4%, which pushes the iris forward). Corneal indentation. **Definitive: laser peripheral iridotomy**, and **prophylactic LPI in the fellow eye**; lens extraction in selected cases. For topiramate-induced closure: stop the drug and use cycloplegia. **Pilocarpine and LPI are not indicated** there [verify against current consensus].
- **Red flags:** It is itself the red flag. Never dilate a patient with occludable angles without a plan. Fellow-eye risk is high.
- **Src:** https://wikem.org/wiki/Acute_angle-closure_glaucoma ; https://www.msdmanuals.com/professional/eye-disorders/glaucoma/angle-closure-glaucoma ; https://eyewiki.aao.org/Primary_vs._Secondary_Angle_Closure_Glaucoma ; https://www.aao.org/topic-detail/primary-angleclosure-glaucoma-pacg--europe ; https://pmc.ncbi.nlm.nih.gov/articles/PMC8982587

#### C24 — Primary open-angle glaucoma (the silent thief)
- **CC:** "No problems. I just need new reading glasses." (Asymptomatic.)
- **Demo:** Over 40, rising steeply with age. **Black and Hispanic** ancestry at higher risk. **Family history** (first-degree relative). Myopia, thin cornea, diabetes and steroid use are additional risks.
- **Hx:** Family glaucoma? → "My brother uses eye drops." Steroid use (inhalers, creams, oral)? → "No." Migraine, low BP, sleep apnoea? (normal-tension glaucoma risk) Prior eye trauma? (angle recession)
- **Tests/Findings:** VA 20/20 OU. **IOP 27 / 22 mmHg.** **CCT 515 µm** (thin; OHTS: <555 µm about 3× risk compared with >588 µm). **Gonioscopy: open angles** to the ciliary body band 360°, no PAS. Optic disc: **vertical CDR 0.75 OD / 0.5 OS** (asymmetry), **inferior rim notching (ISNT violated)**, **disc haemorrhage** inferotemporal OD, beta-zone peripapillary atrophy. **OCT RNFL inferior thinning OD.** **24-2 VF: superior arcuate defect / nasal step OD** that respects the **horizontal** midline. Pupils: possible subtle RAPD OD if asymmetric.
- **DDx:** **Ocular hypertension** (IOP up, normal nerve and field). **Physiologic cupping** (large disc, symmetric, rim intact). **Normal-tension glaucoma**. **Secondary open-angle**: *pigment dispersion* (Krukenberg spindle, iris transillumination defects, dense TM pigment, young myopic male), *pseudoexfoliation* (flaky material on the lens capsule and pupil margin), *steroid response*, *angle recession*. **Compressive optic neuropathy** (pallor greater than cupping, field respecting the **vertical** midline, reduced VA or colour, younger patient): image. **Angle closure** (gonioscopy).
- **Dx:** Primary open-angle glaucoma, OD moderate, OS suspect.
- **Plan / Tier T3:** Set target IOP (often ≥20–30% reduction). **First line: prostaglandin analogue** eye drops **or selective laser trabeculoplasty**; both are grade A in the AOA evidence-based POAG guideline (2024). Educate on adherence and drop technique. Repeat fields and OCT to monitor progression. Co-manage or refer per state scope and severity.
- **Red flags:** Pallor out of proportion to cupping, vertical-meridian field defect, unilateral disease in a young patient, reduced VA or colour: neuro-imaging. Very high IOP (>~40), check for angle closure or secondary causes.
- **Src:** AOA EBO POAG guideline 2024 https://www.aoa.org/documents/EBO/GLAUCOMA/FINAL_EBO_Glaucoma_Guildline_digital_10_28_24.pdf ; https://optometrytimes.com/view/aoa-evidence-based-clinical-practice-guideline-aims-to-improve-treatment-for-patients-with-poag ; https://reviewofoptometry.com/article/monitor-or-medicate ; AAO POAG PPP https://pubmed.ncbi.nlm.nih.gov/26581556/

---

### LENS

#### C25 — Age-related cataract (nuclear sclerosis ± posterior subcapsular)
- **CC:** "Headlights at night have starbursts and blind me. Colours look dull, and funny thing: I can read without my glasses again!"
- **Demo:** Over 60. Smoking, UV, diabetes. **Steroid use, diabetes and radiation favour posterior subcapsular cataract (PSC)**, which appears at younger ages.
- **Hx:** Night driving trouble? → "Avoiding it." Steroids? → "Prednisone for COPD flares." (PSC) Diabetes? Prior eye surgery?
- **Tests/Findings:** VA 20/50 OD, 20/40 OS. **Glare testing drops VA to 20/100.** **Myopic shift** (−1.50 D since last year), the "second sight" of nuclear sclerosis from increased lens refractive index. Slit lamp: **NS 2–3+ yellow-brown nucleus**. **PSC** shows as a central posterior plaque, dark and vacuolated on **retroillumination**; it causes marked glare and worse near vision. Red reflex dimmed. **No RAPD.** Fundus view is hazy but the macula looks healthy (confirm with OCT).
- **DDx:** **AMD** (drusen, Amsler distortion, OCT). **Diabetic macular oedema**. Corneal disease (Fuchs: morning blur, guttae). Posterior capsule opacification (after surgery). Refractive change from **hyperglycaemia**.
- **Dx:** Visually significant age-related cataract (nuclear ± PSC), OU.
- **Plan / Tier T3:** Update the prescription first if it helps. **Refer for cataract surgery when vision impairs function** (driving, reading, glare); this is patient-driven, not a fixed VA cutoff. Anti-glare counselling. Explain surgery and IOL options.
- **Red flags:** **Paediatric cataract** (amblyopia risk, urgent). **Intumescent or mature lens with angle closure (phacomorphic)** or **phacolytic glaucoma**: very high IOP, T0/T1. Sudden cataract after trauma.
- **Src:** https://www.ncbi.nlm.nih.gov/books/NBK539699/ ; https://eyewiki.aao.org/Cataract ; https://www.ncbi.nlm.nih.gov/books/NBK559253/

---

### RETINA & VITREOUS

#### C26 — Diabetic retinopathy with centre-involving diabetic macular oedema
- **CC:** "My vision's been a bit blurry for a couple of months, especially reading. I figured I needed new glasses." (Often asymptomatic until late.)
- **Demo:** Type 2 diabetes for 10+ years, or type 1 after puberty with duration ≥5 years. Poor glycaemic control, HTN, hyperlipidaemia, nephropathy, pregnancy.
- **Hx:** Duration? → "12 years." **HbA1c?** → "9.8%" (NBEO always lists it). Insulin? Last eye exam? → "Never." Kidney disease? Pregnant?
- **Tests/Findings:** VA 20/50 OD, 20/25 OS, no pinhole improvement OD. Fundus: **microaneurysms, dot-blot haemorrhages**, **hard exudates** (circinate ring near the fovea), cotton-wool spots, **venous beading**, **IRMA**. **OCT: centre-involving intraretinal fluid and cysts** OD. **Severity:** *Severe NPDR* by the **4-2-1 rule**: haemorrhages and MAs in **4** quadrants, **or** venous beading in **≥2**, **or** IRMA in **≥1**. Two or more of these means very severe NPDR. *PDR*: **NVD or NVE**, preretinal or vitreous haemorrhage. Check the **iris and angle for neovascularization**.
- **DDx:** **Hypertensive retinopathy** (AV nicking, flame haemorrhages, disc oedema; C27). **CRVO or BRVO** (unilateral, venous distribution; C33). Radiation retinopathy. Ocular ischaemic syndrome (mid-peripheral haemorrhages, carotid disease, low ophthalmic artery pressure).
- **Dx:** Severe NPDR with centre-involving DME, OD; moderate NPDR, OS.
- **Plan / Tier T2:** **Refer to retina.** Centre-involving DME: re-examine or treat in about **1 month** (ICO/ADA). **Intravitreal anti-VEGF** is standard for CI-DME. PDR: PRP and/or anti-VEGF. **Co-manage with the PCP or endocrinologist**: A1c, BP, lipids. Approximate AAO PPP follow-up: mild NPDR without oedema ~12 months; moderate ~6–12 months; severe ~3–4 months; PDR ~2–4 months or treatment [verify exact intervals in PPP]. ADA screening: type 2 at diagnosis, type 1 within 5 years of onset, and during pregnancy [verify current ADA Standards §12].
- **Red flags:** **High-risk PDR**, vitreous haemorrhage, **iris neovascularization or neovascular glaucoma**, tractional RD (T1). Early worsening after a rapid A1c drop or in pregnancy.
- **Src:** https://eyewiki.aao.org/Diabetic_Retinopathy ; AAO DR PPP https://aao.org/Assets/dba38b76-3095-4360-8cb6-00adab3aad68/635919125497230000/diabetic-retinopathy-ppp-pdf ; https://eyewiki.aao.org/Diabetic_Retinopathy_Screening ; https://www.ccjm.org/content/91/8/503 ; https://reviewofoptometry.com/article/dr-see-something-say-something

#### C27 — Hypertensive retinopathy / hypertensive emergency
- **CC:** "I've had a pounding headache for two days and my vision is blurry in both eyes."
- **Demo:** Uncontrolled or untreated hypertension; stopped meds; cocaine or amphetamine use; pre-eclampsia; renal disease.
- **Hx:** BP meds? → "Ran out a month ago." Chest pain, shortness of breath, confusion, weakness? Pregnancy?
- **Tests/Findings:** **In-office BP 214/132.** Fundus OU: **arteriolar narrowing**, **AV nicking**, copper or silver wiring, **flame haemorrhages**, **cotton-wool spots**, hard exudates in a **macular star**, **bilateral optic disc oedema**. Keith–Wagener–Barker: grade 1 = mild narrowing; grade 2 = focal narrowing + AV nicking; grade 3 = + haemorrhages, CWS, exudates; **grade 4 = grade 3 + disc oedema** (malignant hypertension).
- **DDx:** **Papilledema from raised ICP** (normal BP, C34). **Diabetic retinopathy** (MAs and dot-blots, diabetic history). **CRVO** (unilateral, dilated tortuous veins). Bilateral optic neuritis or NAION. Radiation retinopathy. CWS alone: HIV, anaemia, lupus, emboli.
- **Dx:** Grade 4 hypertensive retinopathy with hypertensive emergency (malignant hypertension).
- **Plan / Tier T0:** **Emergency department now.** BP ≥180/120 **with** symptoms or target-organ damage (retinopathy with disc oedema, neuro or cardiac symptoms) is a hypertensive emergency. Asymptomatic severe BP with mild retinopathy: PCP within 24–48 h, or the ED if the PCP isn't available. Mild chronic changes: PCP communication.
- **Red flags:** Disc oedema, neuro symptoms, chest pain, pregnancy (pre-eclampsia).
- **Src:** https://eyewiki.aao.org/Hypertensive_Retinopathy ; https://www.optometrytimes.com/view/when-send-your-hypertensive-patient-er ; https://www.merckmanuals.com/professional/cardiovascular-disorders/hypertension/hypertensive-emergencies ; https://pmc.ncbi.nlm.nih.gov/articles/PMC5710026/table/T1

#### C28 — Dry (non-neovascular) age-related macular degeneration
- **CC:** "I need much more light to read, and faces are a bit harder to recognise. It's been slow."
- **Demo:** Over 65, white, smoker, family history, light iris.
- **Hx:** Smoking? → "30 pack-years, quit 5 years ago." Family history? → "Mother went blind from AMD." Supplements? → "None." Distortion? → "Not really."
- **Tests/Findings:** VA 20/40 OU. **Numerous intermediate (63–125 µm) and large (>125 µm) drusen** with **pigmentary changes** (= intermediate AMD); possible **geographic atrophy** (sharply demarcated RPE loss). Amsler: no new distortion. OCT: drusen (RPE elevations), **no fluid**. Slow dark adaptation.
- **DDx:** Pattern dystrophy, Stargardt (young), drug toxicity (hydroxychloroquine bull's-eye), cataract, **neovascular AMD** (fluid or haemorrhage; C29).
- **Dx:** Intermediate dry AMD OU.
- **Plan / Tier T4:** **AREDS2 supplement**: vitamin C 500 mg, vitamin E 400 IU, zinc 80 mg, copper 2 mg, lutein 10 mg, zeaxanthin 2 mg, no beta-carotene. About 25% lower risk of progressing to advanced AMD in intermediate or unilateral-advanced AMD. Smoking abstinence, diet, **home Amsler or monitoring** (one eye at a time), UV protection, low-vision referral. Recall every 6–12 months. Geographic atrophy: complement-inhibitor injections exist (retina referral).
- **Red flags:** **New metamorphopsia, central scotoma or sudden drop**: possible conversion to wet AMD (T1–T2).
- **Src:** NEI AREDS/AREDS2 https://www.nei.nih.gov/research/clinical-trials/age-related-eye-disease-study-areds/areds-background-and-results ; https://nei.nih.gov/areds2/patientFAQ ; https://eyewiki.aao.org/Age-Related_Macular_Degeneration

#### C29 — Neovascular (wet) age-related macular degeneration
- **CC:** "Three days ago door frames started looking bent in my left eye, and there's a grey smudge right where I look."
- **Demo:** Over 70 with known drusen or dry AMD.
- **Hx:** Sudden? → "Yes." Known AMD? → "Doctor mentioned spots." Taking AREDS? → "Yes."
- **Tests/Findings:** VA 20/200 OS. **Amsler: metamorphopsia plus central scotoma.** Fundus: **subretinal haemorrhage**, grey-green CNV lesion, exudate, serous elevation. **OCT: subretinal and/or intraretinal fluid, PED.** Fellow eye: drusen.
- **DDx:** **Central serous chorioretinopathy** (younger, male, stress or steroids, serous detachment without haemorrhage). Polypoidal choroidal vasculopathy. Myopic CNV. **Macular hole** (Watzke–Allen sign). Epiretinal membrane. DME or BRVO.
- **Dx:** Neovascular AMD, OS.
- **Plan / Tier T1–T2:** **Urgent retina referral for intravitreal anti-VEGF.** Sources vary: same week or within 1 week (RANZCO pathway) up to within 24 h (RACGP). Faster outcomes give better vision. Continue AREDS2. Monitor the fellow eye.
- **Red flags:** Large submacular haemorrhage (T1), sudden severe loss.
- **Src:** https://www.mdfoundation.com.au/news/seeing-the-unseen/ ; https://www1.racgp.org.au/ajgp/2026/july/age-related-macular-degeneration ; https://eyewiki.aao.org/Age-Related_Macular_Degeneration

#### C30 — Posterior vitreous detachment (the "is it just a floater?" case)
- **CC:** "Yesterday a big cobweb floater appeared in my right eye and it swings when I move my eye. I see little flashes at the edge, especially in the dark."
- **Demo:** Age 50–70 (earlier in myopes, after cataract surgery, after trauma). Most eyes have a PVD by their 80s.
- **Hx:** Sudden? → "Yesterday." Number of floaters? A "shower" or "soot" suggests haemorrhage. **Curtain or shadow?** → "No." Myopia, prior RD in the other eye, recent cataract surgery, trauma?
- **Tests/Findings:** VA 20/20. **Weiss ring** (ring-shaped opacity floating in front of the disc) on slit lamp or fundus exam. **Anterior vitreous: no pigment (negative Shafer sign)** and no haemorrhage. **Dilated exam with scleral depression: no retinal break.** IOP normal.
- **DDx:** **Retinal tear or detachment** (pigment or haemorrhage, curtain; C31). Vitreous haemorrhage (diabetes, tear). Migraine aura (bilateral, zig-zag, 20 min, headache). Vitritis (cells, uveitis).
- **Dx:** Acute symptomatic PVD without retinal break.
- **Plan / Tier T1 for the exam, then T3 follow-up:** A **same-day or prompt dilated exam with scleral depression** is mandatory. Re-examine in about **2–6 weeks** (EyeWiki); some recommend 4–6 weeks for all, with extended follow-up around 3 months for higher-risk eyes. Give **strict RD warnings**: new shower of floaters, more flashes, curtain or shadow means return the same day.
- **Red flags:** **Shafer sign (pigment "tobacco dust")** or **vitreous haemorrhage**: tear risk rises from ~15% (symptomatic PVD) to **~50–70%**. Myopia, lattice, fellow-eye RD.
- **Src:** https://eyewiki.aao.org/Posterior_Vitreous_Detachment ; https://www.aao.org/eyenet/article/late-complications-posterior-vitreous-detachment ; https://pubmed.ncbi.nlm.nih.gov/10088811

#### C31 — Rhegmatogenous retinal detachment
- **CC:** "I had flashes and lots of floaters for two days, and now there's a dark shadow coming up from the bottom of my vision in my left eye."
- **Demo:** Myopes, pseudophakes (after cataract surgery), trauma, lattice degeneration, fellow-eye RD. Age 50–70.
- **Hx:** Progression of the shadow? → "Getting bigger since this morning." Central vision still OK? (macula on or off) → "Reading is still clear." Prior cataract surgery? → "Yes, 1 year ago."
- **Tests/Findings:** VA 20/25 OS (**macula-on**). **Inferior visual-field defect**, which corresponds to a **superior** detachment (fields are inverted). **Shafer sign** (pigment cells in the anterior vitreous). Fundus: **elevated, corrugated, mobile grey retina** with a **horseshoe tear** superotemporally. IOP often lower than the fellow eye. RAPD if extensive.
- **DDx:** **Retinoschisis** (smooth, dome-shaped, immobile, often inferotemporal and bilateral, absolute scotoma, no pigment). **Exudative RD** (shifting fluid, no break: tumour, inflammation). **Tractional RD** (diabetic, concave, no break). Choroidal detachment. Vitreous haemorrhage.
- **Dx:** Macula-on rhegmatogenous RD, OS.
- **Plan / Tier T0:** **Same-day retina surgeon (emergency).** Macula-on detachments are the most urgent because surgery aims to save central vision; a superior detachment threatens the macula fastest. Options: pneumatic retinopexy, scleral buckle, vitrectomy. Macula-off: still urgent (days).
- **Red flags:** Shadow progressing toward fixation; superior bullous detachment.
- **Src:** https://eyewiki.aao.org/Retinal_Detachment ; https://www.mcw.edu/departments/ophthalmology-eye-institute/education/ophthalmic-case-studies/ophthalmic-case-study-7 ; https://wikem.org/wiki/Retinal_Detachment ; https://www.msdmanuals.com/professional/eye-disorders/retinal-disorders/retinal-detachment

#### C32 — Central retinal artery occlusion ("eye stroke")
- **CC:** "About an hour ago the vision in my right eye just went, like a blind came down. It doesn't hurt."
- **Demo:** Over 60 with atherosclerotic risk: HTN, carotid disease, **atrial fibrillation**, valve disease, smoking, diabetes. **Over 50: always consider GCA.** Under 50: hypercoagulable state or vasculitis.
- **Hx:** Exact onset time? → "8:15 am." **Prior transient blackouts (amaurosis fugax)?** → "Twice last month, for a few minutes." **GCA questions**: headache, jaw claudication, scalp tenderness, PMR, weight loss. → "No." Heart rhythm problems? → "Irregular heartbeat, stopped my blood thinner."
- **Tests/Findings:** VA **count fingers** OD (may be **20/20 if a cilioretinal artery spares the fovea**). **Dense RAPD OD.** Fundus: **retinal whitening** (inner retinal oedema), **cherry-red spot** at the fovea (choroid visible through the thin fovea; may take hours to appear), **attenuated arterioles with "boxcarring"**, possibly a **Hollenhorst plaque** (refractile cholesterol embolus) at a bifurcation. Early fundus can look normal.
- **DDx:** **Arteritic (GCA) CRAO or AAION** (C36). CRVO (haemorrhages). Ophthalmic artery occlusion (NLP, no cherry-red spot). Vitreous haemorrhage. Retinal detachment. Functional loss.
- **Dx:** Acute non-arteritic CRAO, OD (embolic).
- **Plan / Tier T0:** **EMERGENCY: immediate transfer to the nearest stroke-centre ED** (AHA 2021 scientific statement). It is a stroke equivalent, with high early stroke risk. Same-day **ESR, CRP and platelets if over 50** to rule out GCA; start steroids if GCA is suspected. Stroke workup: brain MRI, carotid imaging, ECG or rhythm monitoring, echocardiogram. Thrombolysis within a narrow window (~4.5 h) is investigational. Ocular massage, paracentesis and carbogen are **unproven**. Follow later for neovascularization.
- **Red flags:** It is the red flag. Retinal damage begins within ~1.5 h (about 105 min in primate models).
- **Src:** https://eyewiki.aao.org/Retinal_Artery_Occlusion ; https://www.ncbi.nlm.nih.gov/books/NBK470354/ ; AHA statement https://professional.heart.org/en/guidelines-statements/management-of-central-retinal-artery-occlusion-a-scientific-statement-from-thestr0000000000000366 ; https://newsroom.heart.org/news/stroke-affecting-the-eye-requires-immediate-treatment-can-signal-future-vascular-events

#### C33 — Central retinal vein occlusion
- **CC:** "I woke up and my right eye was blurry, like looking through smoke. No pain."
- **Demo:** Over 60. **Hypertension**, **glaucoma or ocular hypertension**, diabetes, hyperlipidaemia. Young patients: hypercoagulability, oral contraceptives, hyperviscosity.
- **Hx:** HTN? → "Yes." Glaucoma? → "Told my pressure was high." Clotting history, oral contraceptives (young)?
- **Tests/Findings:** VA **20/80** (non-ischemic) or **≤20/200 with RAPD** (ischemic). Fundus: **"blood and thunder"**, with **intraretinal haemorrhages in all 4 quadrants** (flame, dot, blot), **dilated tortuous veins**, **disc oedema**, cotton-wool spots, **macular oedema** on OCT. IOP: check both eyes. **Undilated gonioscopy and iris exam for neovascularization.**
- **DDx:** **BRVO** (sectoral, at an AV crossing). **Diabetic retinopathy** (bilateral). **Hypertensive retinopathy** (bilateral). **Ocular ischaemic syndrome** (mid-peripheral haemorrhages, narrowed veins, carotid). Papilledema (bilateral, veins less tortuous). Radiation retinopathy.
- **Dx:** CRVO, OD (classify perfusion; CVOS ischemic = >10 disc areas of non-perfusion on FA).
- **Plan / Tier T2:** **Retina referral within days** for anti-VEGF for macular oedema. Monitor for **iris or angle neovascularization** (monthly for ~6 months in ischemic CRVO); PRP if NV develops. Manage IOP and systemic risk with the PCP (BP, lipids, glucose; thrombophilia workup if young).
- **Red flags:** **Iris neovascularization or neovascular glaucoma ("90-day glaucoma")**: T1. About 34% of non-ischemic CRVOs became ischemic within 3 years (CVOS), and 15% of those converted within the first 4 months.
- **Src:** https://eyewiki.aao.org/Central_Retinal_Vein_Occlusion ; https://aao.org/eyenet/article/diagnosis-of-central-retinal-vein-occlusion ; https://www.ncbi.nlm.nih.gov/sites/books/NBK525985/

---

### NEURO-OPHTHALMIC

#### C34 — Papilledema from idiopathic intracranial hypertension
- **CC:** "Every day I have headaches, worse when I lie down or in the morning. I hear a whooshing heartbeat in my ears, and when I stand up my vision greys out for a few seconds."
- **Demo:** **Women of child-bearing age with obesity or recent weight gain.** Drugs: **tetracyclines (minocycline, doxycycline), vitamin A or retinoids (isotretinoin)**, growth hormone, lithium, steroid withdrawal.
- **Hx:** Weight gain? → "40 lb this year." **Transient visual obscurations** (seconds-long greying, often on posture change)? → "Yes." **Pulsatile tinnitus**? → "Yes." Double vision? (CN VI) Acne meds? → "Minocycline."
- **Tests/Findings:** VA 20/20 OU (preserved early). **Bilateral optic disc oedema**: blurred margins, **obscured vessels** at the disc margin, peripapillary haemorrhages, absent spontaneous venous pulsations, Paton lines; Frisén grade 3. **Enlarged blind spots** on VF, early inferonasal loss. Possible CN VI palsy. **Measure BP** to exclude malignant HTN. No RAPD (bilateral).
- **DDx:** **Pseudopapilledema / optic disc drusen**: no vessel obscuration, **autofluorescent and hyperreflective on B-scan or OCT**, lumpy disc. **Malignant hypertension** (BP, C27). **Space-occupying lesion or cerebral venous sinus thrombosis**: imaging. Bilateral optic neuritis (reduced VA, pain). NAION (unilateral, altitudinal). Diabetic papillopathy.
- **Dx:** Papilledema, most likely IIH (pseudotumor cerebri). Note that "papilledema" specifically means disc swelling **from raised intracranial pressure**.
- **Plan / Tier T0–T1:** **Same-day ED or neurology for urgent MRI brain with contrast plus MR venography** to exclude mass and venous sinus thrombosis, **then lumbar puncture** (opening pressure **>25 cm H₂O** in adults, normal CSF composition; modified Dandy criteria). Treatment: **weight loss plus acetazolamide** (IIHTT), stop causative drugs. Serial VFs, OCT and disc photos. Fulminant vision loss: surgical options (optic nerve sheath fenestration, shunt, venous stenting).
- **Red flags:** **Any bilateral disc swelling is raised ICP until proven otherwise.** Declining VA or VF (fulminant IIH). Headache with neuro deficits. Atypical patient (male, thin, older) means look harder for a secondary cause.
- **Src:** https://eyewiki.aao.org/Papilledema ; https://eyewiki.aao.org/Pseudotumor_Cerebri_(Idiopathic_Intracranial_Hypertension) ; https://pmc.ncbi.nlm.nih.gov/articles/PMC4251443 ; https://webeye.ophth.uiowa.edu/eyeforum/tutorials/IIH-med-student/index.htm

#### C35 — Optic neuritis (demyelinating)
- **CC:** "Over three days the vision in my left eye went dim and washed-out, colours look faded, and it hurts behind the eye when I look around."
- **Demo:** **Women aged 18–45.** Often the first presentation of multiple sclerosis.
- **Hx:** Pain on eye movement? → "Yes." (92% in ONTT.) Prior numbness, tingling, weakness, imbalance? → "Leg numbness last year for a week." **Uhthoff phenomenon** (worse with heat or exercise)? Recent infection or vaccination?
- **Tests/Findings:** VA 20/100 OS. **RAPD OS.** **Red desaturation** (a red cap looks "washed out"). **Ishihara reduced** (e.g. 3/14). **VF: central or cecocentral scotoma.** Disc **normal** in about two-thirds (retrobulbar) or **mildly swollen** in ~35% (papillitis), rarely haemorrhagic. Fellow eye normal.
- **DDx:** **NAION**: older (over 50), vasculopathic, **painless**, sudden on waking, **altitudinal** defect, sectoral disc oedema, "disc at risk" (small cup) in the fellow eye. **NMOSD** (AQP4: severe, bilateral or sequential, poor recovery). **MOGAD** (marked disc swelling, recurrent, steroid-responsive). **Compressive lesion** (progressive, painless). **LHON** (young male, painless, sequential, peripapillary telangiectasia). **GCA** (older). Infectious or infiltrative causes (syphilis, sarcoid).
- **Dx:** Typical acute demyelinating optic neuritis, OS.
- **Plan / Tier T1:** **Prompt (24–48 h) neuro-ophthalmology or neurology referral and MRI of brain and orbits with gadolinium.** ONTT: **IV methylprednisolone** (then oral taper) **speeds** recovery without changing final VA. Oral prednisone alone at standard dose is avoided because it was linked to more recurrences in ONTT [verify via primary ONTT report]. **MS risk at 15 years: 50% overall; 25% with no MRI lesions; 72% with ≥1 lesion.** Most recover substantial vision over weeks to months.
- **Red flags (atypical, so look for NMOSD, MOG or another cause):** no pain, bilateral simultaneous, very severe (NLP), no recovery by ~3 weeks, marked disc oedema with haemorrhages or exudates, age over 50.
- **Src:** https://eyewiki.aao.org/Demyelinating_Optic_Neuritis ; https://eyewiki.aao.org/Diagnostic_Approach_to_Atypical_Optic_Neuritis ; ONTT 15-year https://pmc.ncbi.nlm.nih.gov/articles/PMC2440583 ; https://www.aao.org/eyenet/article/ontt-long-term-optic-neuritis-study-finished ; https://pressbooks.pub/casebasedneuroophthalmology/chapter/typical-optic-neuritis-and-multiple-sclerosis

#### C36 — Giant cell arteritis with arteritic anterior ischemic optic neuropathy (AAION)
- **CC:** "I lost the vision in my right eye this morning. For weeks I've had headaches on the side of my head, my jaw hurts after chewing, and it hurts to brush my hair."
- **Demo:** **Always over 50**, typically over 70. Women more than men. Northern European ancestry. Associated with **polymyalgia rheumatica**.
- **Hx:** **Jaw claudication** (the most specific symptom)? → "Yes." New temporal headache? → "Yes." **Scalp tenderness**? → "Yes." Shoulder or hip girdle stiffness, fever, weight loss, fatigue? → "Lost 10 lb." **Prior transient vision loss or double vision?** → "Blurred for minutes last week." (Warning episodes.)
- **Tests/Findings:** VA **hand motion** OD. **RAPD OD.** **Pallid ("chalk-white") disc oedema**; may also show cilioretinal artery occlusion or CRAO. Tender, nodular, **pulseless temporal artery**. Labs: **ESR and CRP raised** (together ~97% specific for arteritis in AAION per one series), **thrombocytosis**. **Temporal artery biopsy** is the reference standard (≥2 cm segment; skip lesions; a negative biopsy doesn't exclude it) or **temporal artery ultrasound "halo sign."** 2022 ACR/EULAR classification: age ≥50 required, score ≥6 (e.g. biopsy or halo +5; ESR ≥50 or CRP ≥10 mg/L +3; sudden visual loss +3; jaw claudication, new temporal headache, scalp tenderness, shoulder/neck stiffness +2 each).
- **DDx:** **NAION**: 50s–70s, painless, **hyperaemic** sectoral oedema, crowded "disc at risk," no systemic symptoms, normal ESR/CRP. **Embolic CRAO**. Optic neuritis (young, pain on eye movement). Compressive optic neuropathy.
- **Dx:** Giant cell arteritis with arteritic AION, OD.
- **Plan / Tier T0:** **EMERGENCY: start high-dose corticosteroids immediately on clinical suspicion. Do not wait for the biopsy.** Steroids protect the **fellow eye**, which is at high risk of rapid involvement. Same-day ED or ophthalmology and rheumatology. Biopsy within ~1–2 weeks of starting steroids (positive results reported up to ~4 weeks). Long-term rheumatology (steroid-sparing agents such as tocilizumab).
- **Red flags:** Any patient over 50 with transient vision loss, diplopia, or a pale swollen disc: **ask the GCA questions every time.**
- **Src:** https://eyewiki.aao.org/Giant_Cell_Arteritis ; https://eyewiki.aao.org/Arteritic_Anterior_Ischemic_Optic_Neuropathy_(AAION) ; https://webeye.ophth.uiowa.edu/eyeforum/cases/276-AAION-NAION.htm ; ACR/EULAR 2022 https://www.ndorms.ox.ac.uk/publications/1300099/modal ; https://pmc.ncbi.nlm.nih.gov/articles/PMC5765614

#### C37 — Congenital red-green colour vision deficiency (and the acquired trap)
- **CC (parent):** "His teacher says he colours tree leaves brown and mixes up red and green markers." Or, as an adult: "I need a colour vision test for my electrician or pilot application."
- **Demo:** **Males ~8%, females ~0.5%** (Northern European ancestry; lower in other populations). **X-linked recessive**, usually inherited via the maternal grandfather.
- **Hx:** Family history? → "My dad's dad was colour-blind." Any vision drop? → "No." Same in both eyes? → "Yes." Meds (hydroxychloroquine, ethambutol)?
- **Tests/Findings:** VA 20/20 OU. **Ishihara: fails red-green plates**; it does **not** test tritan defects. **Farnsworth D-15**: protan or deutan axis. **Anomaloscope** is the gold standard for classification (protanomaly / protanopia / deuteranomaly / deuteranopia). **Bilateral, symmetric, stable.** Pupils, fields and fundus normal.
- **DDx (acquired colour vision deficiency, which changes everything):** **Unilateral or asymmetric**, changing over time, with reduced VA or RAPD. **Optic neuropathy** (optic neuritis, compressive) usually gives red-green loss. **Retinal or macular disease, glaucoma, cataract** often give blue-yellow (tritan) loss. **Drugs**: ethambutol, hydroxychloroquine. Cone dystrophy (photophobia, low VA).
- **Dx:** Congenital deutan (red-green) CVD.
- **Plan / Tier T4:** Counsel the family and teacher. Occupational implications (aviation, electrical, transport, military). Tinted or notch-filter lenses can enhance contrast for some but don't "cure" it and may not pass occupational tests [verify per test].
- **Red flags:** Acquired, asymmetric, or progressive CVD, or CVD with RAPD or VA loss: neuro-ophthalmic or retinal workup.
- **Src:** https://pubmed.ncbi.nlm.nih.gov/19927164/ ; https://medlineplus.gov/genetics/condition/color-vision-deficiency ; https://pubmed.ncbi.nlm.nih.gov/22472762/ ; https://pubmed.ncbi.nlm.nih.gov/40769301/

---

## Part D — Cross-case triage logic (for "Triage Rush" / decision-tree mini-games)

**Red eye, discriminating questions and tests:**
| Feature | Conjunctivitis (C14–16) | Keratitis/ulcer (C20) | Anterior uveitis (C22) | Acute angle closure (C23) | Subconj. haem. (C17) |
|---|---|---|---|---|---|
| Pain | gritty / itch | moderate–severe | aching, photophobic | severe + headache, N/V | none |
| VA | normal | ↓ | mildly ↓ | ↓↓ (oedema) | normal |
| Injection | diffuse, fornix | diffuse + ciliary | ciliary flush | diffuse + ciliary | flat, sharp red patch |
| Discharge | watery / mucopurulent | purulent | none | none (tearing) | none |
| Cornea | clear (± SEIs) | **infiltrate + staining** | KPs, clear | **hazy/oedematous** | clear |
| Pupil | normal | normal / small | **small**, synechiae | **mid-dilated, fixed** | normal |
| IOP | normal | normal | low / normal (may ↑) | **very high (40–80)** | normal |
| Tier | T4 (T1 if hyperacute) | T1 | T1 | **T0** | T4 (T0 if trauma) |

**Sudden painless vision loss (one eye):** RAPD dense + whitened retina + cherry-red spot = **CRAO** (T0, stroke centre; ESR/CRP if over 50). Four-quadrant haemorrhages = **CRVO** (T2). Pale swollen disc + over 50 + jaw claudication = **GCA** (T0, steroids now). Hyperaemic sectoral disc oedema + altitudinal VF + vasculopath = NAION (T2; ESR/CRP to rule out GCA). Curtain + Shafer sign = **RD** (T0). New distortion + subretinal blood = **wet AMD** (T1–T2). Vitreous haze, no fundus view = vitreous haemorrhage (B-scan to rule out RD; T1).

**Diplopia:** Monocular (persists covering the other eye) means optical: cataract, astigmatism, keratoconus, dry eye. Binocular: horizontal, worse at distance and in one gaze = **CN VI**. Vertical-torsional with head tilt = **CN IV**. Ptosis + "down and out" + **dilated pupil** = **CN III, aneurysm (T0)**. Variable with ptosis, normal pupil = **myasthenia**. Proptosis + lid retraction = **thyroid eye disease**. Always ask the GCA questions if over 50.

**Disc swelling:** Bilateral + normal VA + headache = **papilledema** (T0/T1 imaging). Bilateral + BP ≥180/120 = **malignant HTN** (T0). Unilateral + pain on eye movement + young = optic neuritis. Unilateral + pale + over 50 = **AAION/GCA** (T0). Unilateral + hyperaemic + painless + crowded fellow disc = NAION. "Swollen" but drusen-autofluorescent with no vessel obscuration = pseudopapilledema (T4).

---

## Part E — Notes for game designers (clinical-integrity requirements)

1. **"Pathognomonic portrayal" rule** (from the NBEO PAM outline): rare but critical cases (CRAO, GCA, CN III aneurysm, AACG) should show their classic signs clearly so the player learns the pattern. Atypical variants come later in the difficulty curve.
2. **Never reward a missed T0.** Missing an emergency should be the most heavily penalized outcome. That fits the "Wrath" or "Pride" lever: the patient comes back worse, or a "mortality and morbidity" debrief scene plays. A correct T0 call should be the most dramatic win.
3. **Test-order realism:** VA always first (medico-legal baseline). Pupils before dilation. Gonioscopy or van Herick before dilating hyperopes. Fluorescein for any red, painful eye. Scleral depression for any new flashes or floaters. Ask the GCA questions for anyone over 50 with visual loss or diplopia. The game can score whether the player **ordered the right tests in the right order**, not just the final diagnosis.
4. **Mini-game hooks per test** (each is a pluggable module): Snellen/logMAR VA; retinoscopy (with/against/scissors reflex); phoropter refraction (JCC cylinder refinement); cover test (direction of refixation movement); NPC push-up; swinging-flashlight RAPD; Ishihara plates; Amsler grid; slit-lamp scan (spot cells and flare, KPs, dendrites, infiltrates, Vogt striae); fluorescein and cobalt blue; Seidel; lid eversion; Goldmann tonometry (mire alignment); van Herick and gonioscopy (identify angle structures); BIO and scleral depression (find the horseshoe tear); disc grading (CDR, ISNT, haemorrhage); OCT interpretation (fluid vs drusen; RNFL thinning); visual-field pattern recognition (arcuate vs altitudinal vs hemianopic vs enlarged blind spot); three-step test (Parks).
5. **Region and scope toggles:** drug choices and what an optometrist may treat vary by jurisdiction. Store management steps as categories with optional region-specific detail.
6. **Every case JSON must carry its source URLs** (Part C "Src" lines) so the in-game "Learn more" panel can cite them, and so reviewers can audit them.

---

## Part F — Consolidated source list
**Exam blueprints:** NBEO Part III PEPS blueprint 2026–27 https://optometry.org/wp-content/uploads/2026/05/August_2026_May_2027_Part_III_PEPS_Blueprint-__Content_Outline.pdf · NBEO Part II PAM content outline 2026 https://optometry.org/wp-content/uploads/2026/05/Part-II-PAM-Content-Outline_20260508.pdf · NBEO exams https://www.optometry.org/exams · College of Optometrists OSCE guidance https://www.college-optometrists.org/COO/media/Media/Documents/Scheme%20for%20Registration/OSCE/OSCE-Candidate-Guidance.pdf

**Guidelines and trials:** AOA EBO POAG 2024 https://www.aoa.org/documents/EBO/GLAUCOMA/FINAL_EBO_Glaucoma_Guildline_digital_10_28_24.pdf · AAO POAG PPP https://pubmed.ncbi.nlm.nih.gov/26581556/ · AAO DR PPP https://aao.org/Assets/dba38b76-3095-4360-8cb6-00adab3aad68/635919125497230000/diabetic-retinopathy-ppp-pdf · AAO Conjunctivitis PPP 2023 https://aao.org/education/preferred-practice-pattern/conjunctivitis-ppp-2023 · TFOS DEWS II https://aao.org/eyenet/article/the-tfos-dry-eye-workshop-ii · DEWS III https://pubmed.ncbi.nlm.nih.gov/40451408/ · IMI myopia definitions https://myopiainstitute.org/imi-whitepaper/defining-and-classifying-myopia · LAMP https://pubmed.ncbi.nlm.nih.gov/38494130/ · CITT https://pubmed.ncbi.nlm.nih.gov/18852411/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC2782898 , https://pmc.ncbi.nlm.nih.gov/articles/PMC2821445 · PEDIG amblyopia https://pmc.ncbi.nlm.nih.gov/articles/PMC4549157 · AREDS/AREDS2 https://www.nei.nih.gov/research/clinical-trials/age-related-eye-disease-study-areds/areds-background-and-results · ONTT 15-yr https://pmc.ncbi.nlm.nih.gov/articles/PMC2440583 · AHA CRAO statement https://professional.heart.org/en/guidelines-statements/management-of-central-retinal-artery-occlusion-a-scientific-statement-from-thestr0000000000000366 · ACR/EULAR GCA 2022 https://www.ndorms.ox.ac.uk/publications/1300099/modal · CVOS summary https://aao.org/eyenet/article/diagnosis-of-central-retinal-vein-occlusion

**EyeWiki (AAO):** Convergence Insufficiency · Accommodative Esotropia · Abducens Nerve Palsy · Cranial Nerve 4 Palsy · Three Step Test · Acute Anterior Uveitis · Primary vs Secondary Angle Closure · Pseudomonas Keratitis · Bacterial Keratitis · Bacterial Conjunctivitis · Epidemic Keratoconjunctivitis · HSV Keratitis · Keratoconus · Pterygium · Cataract · Diabetic Retinopathy · DR Screening · Hypertensive Retinopathy · AMD · PVD · Retinal Detachment · Retinal Artery Occlusion · CRVO · Papilledema · Pseudotumor Cerebri · Demyelinating Optic Neuritis · Atypical Optic Neuritis · GCA · AAION · Presbyopia. All at https://eyewiki.aao.org/<Title>; exact URLs are in each case's Src line.

**StatPearls / NCBI:** CRAO NBK470354 · Angle closure NBK430857 · Conjunctivitis NBK546683 / NBK470271 · Hordeolum NBK459349 · Corneal abrasion NBK532960 · Uveitis NBK540993 · Subconj. haemorrhage NBK551666 · Pterygium NBK558907 · Pinguecula NBK558965 · Cataract NBK539699 / NBK559253 · Presbyopia NBK560568 · Abducens NBK430711 · CRVO NBK525985.

**Practice journals (optometry):** Review of Optometry: glaucoma suspects https://reviewofoptometry.com/article/monitor-or-medicate ; DR https://reviewofoptometry.com/article/dr-see-something-say-something ; CRAO quiz https://www.reviewofoptometry.com/article/with-a-cherry-on-top · Optometry Times: hypertensive ER referral https://www.optometrytimes.com/view/when-send-your-hypertensive-patient-er ; AOA POAG guideline summary https://optometrytimes.com/view/aoa-evidence-based-clinical-practice-guideline-aims-to-improve-treatment-for-patients-with-poag

**Other clinical references:** MSD/Merck Manuals (angle closure, CN III, abrasion, chalazion, pinguecula/pterygium, hypertensive emergency, HSV keratitis) · AAFP corneal abrasion https://www.aafp.org/pubs/afp/issues/2013/0115/p114.html · WikEM AACG/RD · Univ. Iowa EyeRounds · Moran CORE · MCW case 7 · NEI AREDS2 FAQ · MedlinePlus CVD genetics.
