# 03: Clinical Tests as Interactive Mini-Games

Research brief for the optometry teaching game. For each exam procedure this file covers: how it is done, what the clinician sees or hears (as a render spec), normal ranges and grading scales, a scoring model, and a proposed mini-game mechanic with its 7-sins hook.

**Confidence legend**
- Facts with a URL come from that source.
- `[GK]` means general clinical teaching knowledge that I could not tie to a fetched source in this pass. An optometrist SME (e.g. the user's wife) should verify these before release.
- Where sources disagree, both values are given. The game should expose the canonical value as a config constant so it can be swapped.

---

## 0. Cross-cutting design notes for engineers

1. **Each test is a pure module.** Interface: `TestModule { id, render(canvas, state), input(event), evaluate(patientTruth, playerAnswer) -> {score, errors[], teachingNotes[]} }`. The patient case supplies a `patientTruth` object (Rx, IOP, disc C/D, RAPD log units, deviation in PD, and so on). The test module only reads the fields it needs. That makes modules swappable.
2. **Numeric ground truth plus a noise model.** Real patients give noisy answers (e.g. "1 and 2 look the same" near the endpoint). Each module should take a `responseNoise` parameter so difficulty can scale (Sloth/Pride tuning).
3. **Scoring axes common to all tests:** accuracy (distance from truth in clinical units), efficiency (number of steps or clicks, time), technique (did the player follow the correct order, e.g. fog before minus, remove the working-distance lens), and safety (e.g. over-minusing, or missing a red flag such as RAPD or papilledema).
4. **Canonical units:** diopters in 0.25 D steps; axis 1-180 deg; prism diopters (PD); mmHg; logMAR to 0.02; C/D ratio to 0.05; cell grade on the SUN scale.

### Prior art: interactive exam simulators (proof the mechanics are renderable)
| Tool | What it simulates | URL |
|---|---|---|
| AAO Retinoscopy Simulator (free, web) | Streak retinoscopy with randomized refractive-error patients, plus a test mode | https://aao.org/interactive-tool/retinoscopy-simulator |
| EyeScholar (Todd Zarwell OD) | Retinoscopy reflex that responds to trial lenses or a phoropter; refraction simulator | https://eyesoneyecare.com/resources/eyescholar-new-tool-learn-to-refract/ |
| BHVI Virtual Refractor | Online subjective refraction on virtual patients. In an RCT, users felt more knowledgeable and confident (p<0.05) | https://bhvi.org/news/the-virtual-refractor/ ; https://www.optometry.org.au/workplace/virtual-refractor-simulates-real-life-responses/ ; https://www.tandfonline.com/doi/abs/10.1111/cxo.12800 |
| Interactive Refraction Simulator (Troppmann, 2009 CNIE award) | Browser phoropter | https://flic.kr/photos/randytroppmann/720084380 |
| Digital Phoropter (iOS) | Chat-style patient questioning during refraction | https://apps.apple.com/app/id1555952495 |
| EOM Sim (Western University, iOS) | Toggle cranial nerves on and off; pupils; 3D EOMs | https://apps.apple.com/ec/app/eom-sim/id1445473696 |
| UA Phoenix EyeSim (VR) | Pupils, motility, cranial nerve dysfunction | https://phoenixmed.arizona.edu/ophthalmology/virtual-reality-trainer |
| UC Davis Eye Simulator v2 (legacy, Shockwave) | Eye-movement and pupil simulators with patient cases | https://med.ucf.edu/media/2011/08/Ophthal-VA-Course-Reading-and-On-Line-Assignment.pdf |
| VR-SFT (arXiv 2022) | Swinging flashlight test in VR | https://arxiv.org/pdf/2210.06474 |
| Eyesi Direct (VR ophthalmoscopy) | Direct ophthalmoscopy training | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12743621/ |
| Univ. of Valencia game-based simulator (INTED2023) | Color-vision and other tests on simulated patients leading to a diagnosis | https://library.iated.org/view/ANTELA2023DEV |
| Gamified VR eye-trauma RCT (BMC Ophthalmol 2024) | Gamified teaching found effective as a complementary tool | https://pubmed.ncbi.nlm.nih.gov/39420268/ |

**Gap we can fill:** no product found combines all of these tests into one narrative, case-driven game. Each tool above covers one or two tests.

---

## 1. Visual Acuity (Snellen, LogMAR/ETDRS, pinhole)

**Procedure.** Test each eye monocularly, right eye (OD) first, then left (OS). Use a Snellen chart at 20 ft (6 m), with chart luminance 80-160 cd/m². Near acuity is tested at 14-16 in. Abbreviations: SC = without correction, CC = with correction, PH = pinhole. https://eyewiki.aao.org/Visual_Acuity_Testing_in_Adults

**Optotype geometry (render spec).**
- A Snellen optotype sits on a 5x5 grid. The whole letter subtends 5 arcmin and each stroke subtends 1 arcmin at the designated distance.
- Snellen lines have an unequal letter count: 1 letter at 20/200, up to 8 letters at 20/20. https://eyewiki.aao.org/Visual_Acuity_Testing_in_Adults
- ETDRS/LogMAR uses 5 Sloan letters per line. Each line is 0.1 log units, so size steps by 10^0.1 ≈ 1.26x per line. Each letter is worth 0.02 logMAR, and spacing is proportional to letter size. https://handwiki.org/wiki/LogMAR_chart ; https://good-lite.com/pages/what-is-etdrs
- The 10 Sloan letters are C D H K N O R S V Z `[GK]`.
- Rendering in pixels: letter height in px = `2 * D * tan(5 arcmin * 10^logMAR / 2) * pxPerMeter` for virtual distance D. Use it to scale letters in a simulated lane.

**Notation and conversions.**
| Snellen ft | Snellen m | logMAR | Decimal `[GK]` |
|---|---|---|---|
| 20/10 | 6/3 | -0.3 | 2.0 |
| 20/20 | 6/6 | 0.0 | 1.0 |
| 20/40 | 6/12 | 0.3 | 0.5 |
| 20/100 | 6/30 | 0.7 | 0.2 |
| 20/200 | 6/60 | 1.0 | 0.1 |

- logMAR = log10(denominator/20). Source for the table: https://eyewiki.aao.org/Visual_Acuity_Testing_in_Adults
- Letter-by-letter scoring: logMAR = (best full line value) − 0.02 × (extra letters read). For an ETDRS chart at 4 m, logMAR = 1.1 − 0.02 × total letters correct. https://handwiki.org/wiki/LogMAR_chart
- The ETDRS letter score ≈ 85 − 50 × logMAR, so 85 letters = 20/20 `[GK]`.

**Snellen scoring rules.**
- Fewer than half the line missed: record the line minus the misses, e.g. 20/20−2.
- More than half missed: record the last full line plus the letters correct on the next line, e.g. 20/25+2.

**Low-vision ladder:** CF at x ft → HM → LP (with or without projection) → NLP. https://eyewiki.aao.org/Visual_Acuity_Testing_in_Adults

**Pinhole.** Improvement with the pinhole suggests a refractive cause. No improvement is recorded as "NI" and points to a pathological cause (macula, media, nerve). https://eyewiki.aao.org/Visual_Acuity_Testing_in_Adults

**Thresholds.**
- Normal best-corrected VA is 20/20 (MAR 1 arcmin).
- US legal blindness: 20/200 or worse in the better eye, or a field of 20° or less.
- Most US states require 20/40 to drive. https://eyewiki.aao.org/Visual_Acuity_Testing_in_Adults

**What the clinician hears.** The patient reads letters aloud. Near threshold they hesitate, guess, and confuse similar letters (e.g. the 5/6 serif confusion seen in Ishihara digits is a similar mechanism). Render patient speech as a bubble showing letters, some wrong, with confidence tremor.

**Mini-game: "Line Hunter."** The patient reads aloud. The player taps each letter as correct or wrong in real time. At the end the player records the notation (Snellen, logMAR, or ETDRS letter count).
- Bonus round: decide whether to use the pinhole. Is the blur refractive or pathological?
- Scoring: exact notation +100; off by one letter +50; a wrong pinhole decision costs points.
- Sins: Pride (perfect-notation streak badge); Sloth (one-tap auto-advance after mastery).

---

## 2. Subjective Refraction (phoropter)

**Canonical sequence.** University of Iowa plus-cylinder protocol: https://webeye.ophth.uiowa.edu/eyeforum/video/Refraction/subj-refract/index.htm

1. **Starting point.** Begin from retinoscopy, autorefraction, or the old Rx. Set the PD, level the phoropter, occlude OS, and test OD first.
2. **MPMVA (maximum plus to maximum visual acuity).**
   - Fog with +0.75 DS. If the patient has not lost 1-2 lines, add another +0.75.
   - Add −0.25 D steps. Each step should gain about one line.
   - Stop when letters only get "smaller and darker", then back off +0.25.
   - Rule: "treat minus like money," meaning give it only for improved vision.
3. **JCC (Jackson cross cylinder).**
   - Skip JCC if there is no cylinder.
   - Cylinder below 1.00 D: refine power, then axis, then recheck power.
   - Cylinder of 1.00 D or more: refine axis first.
4. **JCC axis refinement.**
   - Set the JCC wheel on the cylinder axis, so the dots straddle it at ±45°.
   - Flip: "Which is better, one or two?" Accept "no difference."
   - Rotate the axis toward the white dot (plus-cylinder phoropter): 15° steps if cyl ≤ 2.00 D, 5° steps if > 2.00 D.
   - After each reversal, shrink the step: 10° → 5° → 3° → 1°. Stop when both views are nearly equal.
5. **JCC power refinement.**
   - Put the dots on the axis and perpendicular to it.
   - Red dot preferred: −0.50 cyl and +0.25 sphere (this keeps the spherical equivalent).
   - White dot preferred: +0.50 cyl and −0.25 sphere.
   - After a reversal, switch to 0.25 D cyl steps with no sphere change.
   - Aim for the least cylinder that gives the clearest vision.
6. **Cylinder search** (no cylinder found but VA is reduced). Probe 90/180, then 45/135. If one is preferred, add +0.50 cyl there and −0.25 sphere.
7. **Second MPMVA** if the cylinder changed by ≥ 0.50 D or the axis by ≥ 10°.
8. **Duochrome.**
   - Ask which side looks *blacker*.
   - Green blacker: +0.25. Red blacker: −0.25. Equal: endpoint.
   - Don't chase a patient who always says red. Iowa link above.
   - Mnemonic "RAM-GAP": Red, Add Minus; Green, Add Plus.
   - The red and green foci sit about 0.25 D either side of yellow, about 0.50 D apart.
   - Not reliable when VA is worse than 20/40 (EyeWiki) or 20/30 (Wikipedia).
   - If balancing needs more than ±0.50 D, the test is unreliable.
   - Leave young patients slightly in the green and older patients slightly in the red.
   - Sources: https://eyewiki.aao.org/Duochrome_Test ; https://www.wikipedia.com/wiki/Duochrome_test ; https://www.slideshare.net/slideshow/duochromepptx/259493776
   - The test tends to over-minus myopes slightly. https://pmc.ncbi.nlm.nih.gov/articles/PMC4361575
9. **Binocular balance.**
   - Fog both eyes +0.75, with VA about 2 lines below best.
   - Method A: Risley prisms, 3Δ BU OD / 3Δ BD OS. Ask "top or bottom clearer?" and fog the clearer eye +0.25.
   - Method B: alternate occlusion. Add +0.25 to the clearer eye.
   - End when the eyes are equal (or the dominant eye is slightly clearer).
   - Then unfog in −0.25 OU steps to best VA, and finish with a binocular duochrome.
   - Source: Iowa link above.
10. **JCC lens types:** ±0.25 (+0.25/−0.50) and ±0.50 (+0.50/−1.00). The handle sits at 45° between the axes. https://eyewiki.aao.org/Cross-Cylinder_Technique_for_Subjective_Refraction ; https://en.wikipedia.org/wiki/Jackson_cross_cylinder

**Simulation model (for devs).** A patient has a true Rx (S, C, A). The residual error after the trial lens is a power-vector difference `[GK]`:
- M = S + C/2
- J0 = −(C/2)·cos 2A
- J45 = −(C/2)·sin 2A
- Blur metric = sqrt(M_resid² + J0_resid² + J45_resid²), adjusted for accommodation. A young patient can absorb residual plus-side error (over-minus), which is why fogging matters.
- Displayed VA ≈ logMAR 0 + k·blur, with k ≈ 1 line per 0.25 D at low blur `[GK]`. This matches the Iowa "one line per −0.25 click" heuristic.
- JCC answer: compare the blur metric for flip 1 vs flip 2, add noise, and return "same" when the difference is below a threshold.
- Duochrome answer: the sign of M_resid relative to accommodation.

**Mini-game: "The Phoropter" (dial-turning puzzle).**
- Render a skeuomorphic phoropter: sphere wheel (clicks at 0.25 D), cylinder knob, axis ring, JCC flip turret, duochrome toggle, Risley prisms.
- The patient answers "1 or 2?" in a speech bubble.
- Score:
  - Final Rx error in power-vector diopters (≤ 0.25 D = gold).
  - Number of flips (efficiency).
  - Protocol violations: no fog first; over-minus (lose points as "minus money"); forgot the second MPMVA after a ≥ 0.50 change; chased a red-preferring patient.
- Sins: Greed ("minus is money," with a coin-spend metaphor for each minus click; hoarding coins means giving the least minus); Wrath (impatient patients whose answers get noisier as you dawdle).

---

## 3. Retinoscopy

**What is seen.**
- The streak reflex moves **with** the sweep (hyperopia, or myopia less than the working-distance power) or **against** it (myopia greater than the working-distance power).
- At neutrality there is no motion. The pupil fills with a bright, broad, fast reflex.
- SPAM: Same (with) → add Plus; Against → add Minus.
- Sources: https://eyewiki.aao.org/Retinoscopy ; https://aao.org/young-ophthalmologists/yo-info/article/retinoscopy-101 ; https://morancore.utah.edu/?p=126056

**Reflex near and far from neutrality.** Near neutrality the reflex becomes brighter, faster, and wider. Far from neutrality it is dim, slow, and narrow. https://eyewiki.aao.org/Retinoscopy

Suggested render law `[GK]`, with e = |dioptric distance from neutral|:
- speed ∝ 1/e
- width ∝ 1/e
- brightness ∝ 1/(1+e)
- Clamp at neutrality so the pupil is fully filled.
- Direction = sign(e).

**Astigmatism cues.** These help find the principal meridian:
- Break: the reflex is not aligned with the streak.
- Skew: an oblique reflex motion.
- Thickness: the streak is narrowest on the correct axis.
- Intensity: the reflex is brightest on axis.
- Sweep at 90/180/45/135.
- Plus-cylinder method: neutralize the least plus meridian first, then the second meridian. The axis lies 90° from the meridian showing the most defined with-motion.
- Source: https://eyewiki.aao.org/Retinoscopy

**Working distance.**
- 67 cm → +1.50 D WD lens; 50 cm → +2.00 D.
- Net Rx = gross − 1/WD(m).
- The commonest error is forgetting to remove the working-distance lens.
- Endpoint debate: use the last neutral before against-motion appears, to avoid over-minusing.
- Sources: https://eyesoneyecare.com/resources/retinoscopy-from-a-to-z-with-downloadable-cheat-sheet ; https://eyewiki.aao.org/Retinoscopy

**Mini-game: "Chase the Glow" (timing plus dial).**
- Drag the mouse or touch to sweep the streak, and rotate the sleeve to change the streak axis.
- Add lenses from a rack (dial in 0.25 or 0.50 D steps).
- Win at neutrality in both meridians, then write the net Rx.
- Trap: the game penalizes forgetting the working-distance lens (a "WD ghost" haunts the score).
- Score: power-vector error, lens swaps, time.
- Sins: Gluttony (combo meter for successive neutralizations within 30 s, "feeding frenzy"); Envy (ghost replay of the top player's sweep path).

---

## 4. Keratometry

**Procedure.**
- Focus until the central mire is not doubled.
- Rotate the instrument until the plus signs align. Under oblique astigmatism the plus signs are not aligned, so the whole instrument is rotated.
- Turn the horizontal and vertical drums to superimpose the plus (and minus) signs and read K1 and K2 with their meridians.
- Sources: https://www.slideshare.net/LittyKs/litty-keratometrypptx ; https://en.wikipedia.org/wiki/Keratometer

**Instrument types.** Bausch & Lomb is one-position with a fixed object size. Javal-Schiøtz is two-position with a fixed image size. https://en.wikipedia.org/wiki/Keratometer

**Values.**
- Central K is typically 40-47 D (mean 43 D). https://pmc.ncbi.nlm.nih.gov/articles/PMC3936693
- The keratometric index of 1.3375 converts radius to power: P = 337.5 / r(mm). https://link.springer.com/chapter/10.1007/978-3-031-50666-6_14
- Corneal astigmatism = |K1 − K2|. With-the-rule astigmatism means the steep meridian is near 90° `[GK]`.

**Clues in the mires.** Oval mires suggest large astigmatism. Irregular or jumping mires suggest keratoconus. https://www.slideshare.net/LittyKs/litty-keratometrypptx

**Render spec.**
- Three circular mires (B&L style) with plus signs at 0/180 and minus signs at 90.
- Doubling offset is proportional to (dial power − true K) in each meridian.
- For keratoconus, add a sinusoidal jitter and an irregular ellipse.

**Mini-game: "Align the Stars" (precision dial).** Two dials (horizontal and vertical) and a rotation ring. The player superimposes the plus signs until they fuse into one.
- Score: |ΔK| ≤ 0.12 D and axis within 5°.
- Follow-up question: "Keratoconus?" when the mires jitter.
- Sin: Pride (perfect alignment triggers a "starburst" animation).

---

## 5. Slit Lamp Biomicroscopy

**Illumination techniques (render presets).** Sources: https://library.scconline.org/v024n03/18 ; https://faculty.ksu.edu.sa/sites/default/files/opto_314_lecture_3_4.pdf ; https://www.healthpartners.com/institute/wp-content/uploads/2018/05/3-SA-45-SLE-Handouts-new.pdf

| Technique | Setup | What you see / use |
|---|---|---|
| Diffuse | Wide beam with diffuser, low magnification | Overview of lids, conjunctiva, cornea |
| Direct focal: parallelepiped | 2-4 mm wide beam at about 45° `[GK width]` | 3D block of cornea; scars, foreign bodies |
| Optic section | Very thin beam (~0.1-0.2 mm) | Cross-section showing corneal layers and depth of a lesion; AC depth |
| Specular reflection | Angle of incidence equals angle of reflection | Endothelial mosaic, tear film |
| Retroillumination | Light bounced off iris or fundus | Silhouettes of opacities. Direct retro: scars, pigment, vessels. Indirect retro: edema, precipitates |
| Sclerotic scatter | Beam on the limbus | The whole cornea glows where edema or scars scatter light (e.g. central corneal clouding) |
| Conical beam | Tiny round beam into the dark AC | Cells and flare (Tyndall effect) `[GK]` |

**Van Herick angle estimate.**
- Narrow slit at the far-peripheral temporal cornea, perpendicular to the cornea, viewed from about 60°.
- Compare peripheral AC depth with corneal thickness. https://en.wikipedia.org/wiki/Van_Herick_technique

| Grade | AC depth vs corneal thickness (Iowa / original 1969) |
|---|---|
| 4 | ≥ 1 |
| 3 | 1/4 to 1/2 |
| 2 | 1/4 |
| 1 | < 1/4 ("slit", dangerously narrow) |

- Source: https://webeye.ophth.uiowa.edu/gonioscopy/cases/van-herick/van-herick-angle-depth-estimation.htm
- Some tables put grade 3 at > 1/2 and give angles of roughly 10° (grade I), 20° (II), 25-35° (III), and 35-45° (IV).
- Van Herick does not replace gonioscopy. https://www.aao.org/disease-review/gonioscopic-grading-systems

**SUN anterior chamber cells and flare.** Count cells in a 1 × 1 mm beam at high magnification, 45°, room dark. Count white cells only, not RBCs or pigment.
- Cells: 0 = < 1; 0.5+ = 1-5; 1+ = 6-15; 2+ = 16-25; 3+ = 26-50; 4+ = > 50.
- Flare: 0 none; 1+ faint; 2+ moderate (iris and lens details clear); 3+ marked (iris and lens details hazy); 4+ intense (fibrin or plastic aqueous).
- Origin: Jabs et al., Am J Ophthalmol 2005. https://cdn.clinicaltrials.gov/large-docs/22/NCT05335122/SAP_001.pdf ; https://cdn.clinicaltrials.gov/large-docs/95/NCT03633695/Prot_SAP_000.pdf ; https://pmc.ncbi.nlm.nih.gov/articles/PMC7497279

**Fluorescein staining patterns** (cobalt blue light, yellow filter `[GK]`).

| Pattern | Look | Points to |
|---|---|---|
| Dendrite | Branching lesion with terminal bulbs | HSV keratitis |
| Inferior / interpalpebral punctate | Fine dots in the exposure zone or inferior third | Dry eye; exposure. The inferior zone is the most commonly worst-stained in dry eye |
| Superior punctate at limbus | Fine dots up top | Superior limbic keratoconjunctivitis |
| Vertical linear scratches | Lines on the superior cornea `[GK]` | Foreign body under the upper lid |
| Pseudodendrite | No terminal bulbs, raised plaque `[GK]` | HZO / acanthamoeba / healing epithelium |

- Sources: https://www.aao.org/image/patterns-of-staining-2 ; https://www.tau.ac.il/medicine/tau-only/webpath/eyehtml/eye015.htm ; https://pmc.ncbi.nlm.nih.gov/articles/PMC5819095
- **Grading scales:**
  - Oxford scale: panels A-E, with dot count rising about 0.5 log units per panel. https://pubmed.ncbi.nlm.nih.gov/14508260/
  - NEI scale: 5 corneal zones × 0-3 = 0-15; modified versions use 0-20. https://cdn.clinicaltrials.gov/large-docs/95/NCT05370495/Prot_000.pdf

**Mini-game set: "Light Sculptor."**
1. **Beam Builder.** Sliders for beam width, height, angle, filter, and magnification. Each case hides a finding that is visible only with the right preset (e.g. KPs on retroillumination, cells only with a conical beam). Score: the number of adjustments before reveal.
2. **Cell Counter.** Particles drift in a convection current (rising near the warm iris, falling near the cold cornea `[GK]`). The player counts them under time pressure and picks a SUN grade. Exact grade = full points; ±1 grade = half.
3. **Van Herick Ruler.** Drag calipers over the shadow gap vs the corneal thickness and choose a grade. Bonus for referring grade 1-2 for gonioscopy.
4. **Stain Detective.** Spot-the-pattern under cobalt blue, then grade on Oxford or NEI.

Sins: Lust (the slit-lamp view is the most beautiful render in the game: glowing beams, a jewel-like iris); Gluttony (collect all 7 illumination techniques for an album).

---

## 6. Tonometry (Goldmann applanation)

**Principle.** Measures the force needed to flatten a 3.06 mm diameter area of cornea. At that diameter, corneal rigidity and tear meniscus attraction cancel out. https://Www.Wikipedia.org/wiki/Goldmann_Applanation_Tonometer

**Procedure.**
- Instil fluorescein. Use the cobalt blue filter with a wide, bright beam and the illumination arm at 40-60°. Set magnification low to avoid distortion.
- Preset the dial between 1 and 2. The dial reads in grams: 1 = 10 mmHg.
- Advance until bright green mires appear, then turn the dial until the inner edges of the mires just touch.
- If astigmatism is > 3 D, rotate the prism to the minus-cylinder axis (the red mark on the prism).
- Sources of false readings:
  - False high: pressing on the globe, breath-holding, or squeezing.
  - False low: repeated applanations.
- Source: Moran CORE protocol https://morancore.utah.edu/wp-content/uploads/2025/11/Goldmann-Tonometry.pdf
- Too much fluorescein gives wide mires and a falsely HIGH reading. Too little gives thin mires and a falsely LOW reading. Add dye if mire width is less than about 1/10 of the diameter. (Corrected 2026-11-25: an earlier version of this note had the direction reversed; see 00-RESEARCH-REPORT.md §7.)
- Repeat until two readings fall within 2 mmHg. https://cdn.clinicaltrials.gov/large-docs/37/NCT00666237/Prot_SAP_ICF_000.pdf

**What is seen (render spec).**
- Two green semicircles split by the prism: upper half-arc and lower half-arc.
- Force too low: arcs are separated and the inner edges don't meet (overlap is too little).
- Force too high: arcs overlap past inner-edge contact.
- The arcs pulse with the ocular pulse. Read at mid-excursion. `[GK for over/under-shoot and pulse]`
- Render law: horizontal offset between arcs = k·(dialForce − trueIOP), plus a sinusoidal pulse amplitude of about 1-3 mmHg at ~1.2 Hz `[GK]`.
- Mire thickness comes from a fluorescein "amount" variable.

**Normal values.**
- Normal IOP ≈ 10-21 mmHg (mean ≈ 15.5 ± 2 SD). https://pmc.ncbi.nlm.nih.gov/articles/PMC2909890 (and the review cited therein)
- Population means: 15.31 ± 2.57 mmHg (CCT 554 µm); 15.63 ± 2.87 (CCT 550 µm). https://openjournals.uwaterloo.ca/index.php/cjo/article/download/537/387
- CCT effect: about +0.32 mmHg per +10 µm CCT. https://pmc.ncbi.nlm.nih.gov/articles/PMC2909890

**Mini-game: "Kiss the Arcs" (timing and precision).**
- Joystick in to find the mires, then turn the dial so the inner edges kiss at mid-pulse.
- Wrong fluorescein amount and a squeezing patient act as hazards.
- Score: |reading − truth| ≤ 1 mmHg = gold; within 2 = silver.
- Contact time on the cornea is penalized; a corneal abrasion is a fail.
- Sin: Wrath (a squeezing patient, with a calm-them-down micro-interaction).

---

## 7. Ophthalmoscopy and Fundus Appearance

**Direct vs indirect.**
- Direct: upright image, about 15x, narrow field, no stereo.
- BIO with 20D lens: inverted and reversed image, about 3x (60/20), field about 45°, stereo, better through cloudy media.
- Sources: https://eyewiki.aao.org/Binocular_Indirect_Ophthalmoscopy ; https://eyesoneyecare.com/resources/lens-choices-in-clinical-funduscopy/ ; https://reviewofoptometry.com/article/condensing-lenses-sharpen-your-skills-in-choosing-and-using
- Game implication: the BIO mode should flip the image both ways, so the player must mentally invert it. That makes a great skill mechanic.

**Optic disc.**
- ISNT rule: normal rim thickness runs Inferior ≥ Superior ≥ Nasal ≥ Temporal. Violation (especially inferior or superior thinning) raises glaucoma suspicion. The rule holds in only about 37% of photos in one study, so treat it as a soft cue. https://pmc.ncbi.nlm.nih.gov/articles/PMC3588134 ; https://eyewiki.aao.org/Examination_of_the_Optic_Nerve_at_the_Slit-Lamp_Biomicroscope_with_a_Handheld_Lens
- C/D ≥ 0.7 occurs in only about 5% of non-glaucoma eyes. C/D asymmetry ≥ 0.2 between the eyes is suspicious. Disc size matters: small discs have small cups. Same sources.
- Typical normal C/D is about 0.3 `[GK, not confirmed in sources]`.
- Render spec: disc = ellipse about 1.5-1.8 mm `[GK]`. Cup = inner pale ellipse. Rim = orange-pink annulus with per-sector thickness (I, S, N, T). Vessels exit nasal to the cup center.

**Papilledema (Frisén scale).** https://eyewiki.aao.org/Papilledema ; https://webeye.ophth.uiowa.edu/eyeforum/cases/papilledema-grading.htm

| Grade | Features |
|---|---|
| 0 | Normal |
| 1 | C-shaped grayish halo, blurred nasal margin, temporal gap |
| 2 | Circumferential halo; all borders obscured; nasal elevation |
| 3 | Moderate: whole border elevated; segment of a major vessel obscured *leaving the disc* `[GK]` |
| 4 | Marked: whole nerve head elevated; a major vessel obscured *on* the disc; cup obliterated |
| 5 | Severe: dome-shaped; total obscuration of all major vessels on the disc |

**Hypertensive retinopathy (Keith-Wagener-Barker, 1939).**
- I: mild generalized arteriolar narrowing.
- II: focal narrowing plus AV nicking (the arteriole compresses the vein at a crossing).
- III: II plus flame hemorrhages, cotton-wool spots (nerve fiber layer ischemia), and hard exudates.
- IV: III plus disc edema (± macular star).
- Copper and silver wiring are sclerotic signs that tables place inconsistently.
- Sources: https://eyewiki.aao.org/Hypertensive_retinopathy ; https://en.wikipedia.org/wiki/Hypertensive_retinopathy ; https://pmc.ncbi.nlm.nih.gov/articles/PMC1772998
- A simplified Wong-Mitchell scheme (2004) also exists.

**Diabetic retinopathy.**
- Moderate NPDR: microaneurysms, dot-blot hemorrhages, venous beading and/or cotton-wool spots.
- Severe NPDR ("4-2-1" rule): hemorrhages or MAs in 4 quadrants, OR venous beading in ≥ 2 quadrants, OR IRMA in ≥ 1 quadrant.
- Very severe NPDR: two or more of the severe criteria.
- PDR: neovascularization and/or vitreous or preretinal hemorrhage.
- Sources: https://webeye.ophth.uiowa.edu/eyeforum/tutorials/diabetic-retinopathy-med-students/Classification.htm ; https://eyewiki.aao.org/Diabetic_Retinopathy

**Lesion morphology render guide** `[GK where noted]`.

| Lesion | Shape | Colour | Layer | Edge | Size |
|---|---|---|---|---|---|
| Microaneurysm | Dot | Red | | Sharp | < 125 µm |
| Dot-blot hemorrhage | Dot or blot | Dark red | Deep (INL/OPL) | Round | |
| Flame hemorrhage | Feathered streak | Red | NFL | Follows NFL radial pattern | |
| Cotton-wool spot | Fluffy patch | White | NFL | Fuzzy edge | < 1/4 disc diameter |
| Hard exudate | Waxy, often circinate ring or macular star | Yellow | | Sharp | |
| Drusen | Round | Yellow | Sub-RPE | | See below |

- Drusen sizes: small/hard < 63 µm; intermediate 63-124 µm; large ≥ 125 µm (about the width of a retinal vein at the disc margin). Soft indistinct drusen are ≥ 125 µm. https://eye.hms.harvard.edu/eyeinsights/2015-january/age-related-macular-degeneration-amd ; https://webeye.ophth.uiowa.edu/eyeforum/atlas/pages/AMD.htm ; https://ncbi.nlm.nih.gov/books/NBK536460
- **Cherry-red spot (CRAO):** whitened, ischemic posterior pole with a dark-red fovea. The fovea stays red because it is fed by the choroid. Arterioles are attenuated and show "boxcarring". The spot appears hours after onset and was present in about 56% of one series. https://eyewiki.aao.org/Cherry-red_spot ; https://bmcophthalmol.biomedcentral.com/articles/10.1186/s12886-023-03176-w

**Mini-games.**
1. **"Fundus Safari" (spot and tag).** The player pans a small direct-ophthalmoscope circle over a large procedural fundus (pupil-size vignette) and tags lesions. Scoring:
   - Precision: correct tag type within a radius.
   - Recall: lesions found / lesions present.
   - Grading call: KWB, NPDR, or Frisén stage.
2. **"Cup Guesser."** Estimate C/D with a slider (± 0.05 = gold), then flag ISNT violation and asymmetry.
3. **"Mirror World" (BIO).** The view is inverted and reversed. The player must drop a pin on the lesion's real location on a retinal map.

Sins: Lust (gorgeous shader fundus; rare "legendary" fundi to collect); Envy (leaderboards for fastest full-fundus sweep); Gluttony (endless case feed).

---

## 8. Pupil Exam

**Swinging flashlight (RAPD).**
- Semi-dark room, distance fixation, bright torch.
- Hold the light on each eye for at least 3 s, then swing quickly along an equal path (not across the nose, which triggers the near response).
- Normal: both pupils constrict when either eye is lit.
- RAPD: when the light reaches the affected eye, both pupils dilate.
- Source: Broadway, Community Eye Health https://pmc.ncbi.nlm.nih.gov/articles/PMC3588138/

**RAPD grading (Broadway Table 1).**
| Grade | What you see |
|---|---|
| Trace / subtle | Brief bilateral dilation in the swing interval; slight initial constriction then dilation |
| 1-2+ | Lit pupil dilates after a short delay |
| 3-4+ | Lit pupil dilates immediately |
| Amaurotic | NLP eye; rapid dilation |

**Pitfalls (Broadway).**
- Hippus (< 1 mm) can mask a subtle RAPD.
- Cataract, corneal scar, refractive error, and amblyopia give no RAPD.
- Maculopathy rarely gives more than 1-2+.
- Symmetric glaucoma gives no RAPD.
- Lesions behind the chiasm are not detected.

**Neutral-density quantification.**
- Filters in 0.3 log steps (0.3-1.8) are placed over the good eye until balanced. RAPDs below 0.3 log units are unmeasurable.
- https://store.good-lite.com/blogs/news/neutral-density-bar-clinical-guide ; https://www.cceb.upenn.edu/cpob/assets/user-content/documents/PortablePupillographyoftheSwinging.pdf
- Simulated RAPDs ≥ 0.6 log units can be distinguished from normal.

**Anisocoria algorithm.** https://novel.utah.edu/collection-materials/jonathan-trobe/fingertips/Pupil_Disorders/Anisocoria_Overview.html ; https://novel.utah.edu/collection-materials/jonathan-trobe/fingertips/Pupil_Disorders/Horner_Syndrome.html

*Anisocoria greater in the dark:*
- **Physiologic:** up to 20% of people, typically ≤ 1 mm, intermittent, no dilation lag. https://www.msdmanuals.com/professional/eye-disorders/symptoms-of-ophthalmologic-disorders/anisocoria
- **Horner syndrome:**
  - Miosis plus mild ptosis plus "upside-down ptosis" (lower lid elevation). Can occur without ptosis.
  - Dilation lag: the small pupil dilates slowly, so anisocoria is bigger at about 5 s than at about 15 s in the dark. The transcript cites about 10 s. `[GK for 5/15 s]`
  - Apraclonidine 0.5%: reversal of anisocoria at 30 min. May be negative if onset was < 24-48 h.
  - Cocaine 4-10%: post-drop anisocoria > 0.8 mm suggests Horner.
  - Acute painful Horner means urgent imaging for carotid dissection.

*Anisocoria greater in the light (big pupil reacts poorly):*
- **Adie tonic pupil:** slow or segmental constriction, light-near dissociation, slow redilation. Constricts to dilute pilocarpine (0.1-0.125%); a normal pupil does not. https://collections.lib.utah.edu/ark:/87278/s6cc5cm7 ; https://reviewofoptometry.com/article/pupil-testing-implications-for-diagnosis
- **CN III palsy:** ptosis plus "down and out" eye plus dilated pupil. Emergency imaging for aneurysm.
- **Pharmacologic blockade:** no constriction to 1% pilocarpine.

*Other:* Argyll Robertson pupils are small with light-near dissociation. Dorsal midbrain lesions cause upgaze palsy with light-near dissociation.

**Render spec.**
- Pupil diameter animation: `d(t) = d_dark − (d_dark − d_light)·(1 − e^(−t/τ))`.
- Constriction latency ≈ 200-250 ms, τ ≈ 0.3 s; redilation is slower `[GK]`.
- RAPD: reduce the effective light input of the affected eye by X log units and drive both pupils from the consensual input (equal efferent).
- Adie: τ_constrict ≈ several seconds, with sectoral iris movement.
- Horner: a lower sympathetic tone parameter, giving slower dilation.

**Mini-game: "Swing Shift" (rhythm game).**
- The player swings the light with a 3-s hold metronome (rhythm-game timing ring) and watches the pupils.
- Calls: RAPD side and grade, then pick a neutral-density filter to balance.
- Side quest **"Light/Dark Switch"**: toggle room lights, measure both pupils with a pupil gauge (half-mm circles), then branch through the algorithm to Horner, Adie, CN III, pharmacologic, or physiologic. Optional "drop" items (apraclonidine, pilocarpine) work like potions.
- Sins: Pride (rhythm-perfect streak); Wrath (a CN III palsy case is a "boss fight" with a ticking emergency clock).

---

## 9. Cover Tests (cover-uncover, alternate, prism)

**Cover-uncover** (distinguishes tropia from phoria). https://eyewiki.aao.org/Cover_Tests ; https://en.wikipedia.org/wiki/Cover_test ; https://open.umich.edu/sites/default/files/downloads/2015-03-ocular_motility-iiacobucci-chap._1_0.pdf
- Cover the fixing eye and watch the *other* eye.
- If it moves to take up fixation, it is a tropia. The direction of the refixation movement is opposite to the deviation:
  - Moves outward → esotropia
  - Moves inward → exotropia
  - Moves down → hypertropia of that eye
  - Moves up → hypotropia `[GK for vertical]`
- If the uncovered eye doesn't move, watch the covered eye as the occluder comes off. If it moves back to straight, it is a phoria. Direction of the re-straightening movement:
  - Moves outward on uncover → esophoria
  - Moves inward on uncover → exophoria
- Alternating tropia: either eye holds fixation.

**Alternate cover.**
- Switch the occluder eye to eye and hold each position for a few seconds.
- Measures total deviation (tropia + phoria). It does not separate tropia from phoria.
- Recovery speed indicates control.

**Prism alternate cover.**
- Add prism until no movement is seen, then increase until the movement reverses. Record the last prism before reversal.
- Base direction follows the direction of the eye's movement: base-out for an outward refixation movement (eso), base-in for an inward one (exo), base-down over a hypertropic eye `[GK for vertical]`.
- Sources: https://cdn.clinicaltrials.gov/large-docs/57/NCT03312257/Prot_SAP_000.pdf ; https://eyewiki.aao.org/Cover_Tests
- Fixation targets: distance 6 m and near 33 cm (accommodative target).

**Normal phorias (Morgan expecteds).** Distance 1Δ exo ± 2; near 3Δ exo ± 5. Newer data differ. https://pmc.ncbi.nlm.nih.gov/articles/PMC4874477 ; https://koreascience.or.kr/article/JAKO200618254315384.page

**Render spec.**
- Each eye has a gaze angle (deg; 1Δ ≈ 0.57°).
- On occlusion, the covered eye drifts to its phoria position over about 300-500 ms `[GK]`. A tropic eye rests at its deviation when not fixing.
- Refixation saccade about 50 ms.
- Draw the corneal light reflex (Hirschberg) at the same time: about 1 mm decentration ≈ 7° ≈ 15Δ `[GK]`.

**Mini-game: "Catch the Flick" (reaction plus spot-the-movement).**
- An occluder paddle under player control and a slowed-down replay toggle (for accessibility).
- After each cover, the player swipes the direction of the movement they saw and labels it (eso/exo/hyper, tropia/phoria).
- Then a prism-bar slider neutralizes the deviation. Score: PD error ≤ 2Δ = gold.
- Difficulty: smaller deviations, faster refixations, intermittent control.
- Sins: Envy (a "frame-perfect" replay that compares your call speed to a rival's); Sloth (low-effort "flick" swipe input).

---

## 10. Extraocular Motility (H-pattern)

**Procedure.**
- Head still; the patient follows a target through the H (6 cardinal positions; 9 diagnostic positions = cardinal + primary + up + down).
- Check for smooth, accurate, full, equal versions. If unequal, test ductions.
- Sources: https://morancore.utah.edu/wp-content/uploads/2025/11/EOMs.pdf ; https://morancore.utah.edu/?p=24637

**Muscle actions** (https://eyewiki.aao.org/Extraocular_Muscles).

| Muscle | Nerve | Primary | Secondary | Tertiary |
|---|---|---|---|---|
| LR | CN VI | Abduction | | |
| MR | CN III | Adduction | | |
| SR | CN III | Elevation | Intorsion | Adduction |
| IR | CN III | Depression | Extorsion | Adduction |
| SO | CN IV | Intorsion | Depression | Abduction |
| IO | CN III | Extorsion | Elevation | Abduction |

**Cardinal positions and yoke pairs** (Hering's law; e.g. RSR + LIO in up-right gaze, RLR + LMR in right gaze). https://ncbi.nlm.nih.gov/books/NBK217/pdf/Bookshelf_NBK217.pdf `[GK for full map]`

| Gaze | Right eye muscle | Left eye muscle |
|---|---|---|
| Right | RLR | LMR |
| Left | RMR | LLR |
| Up-right | RSR | LIO |
| Up-left | RIO | LSR |
| Down-right | RIR | LSO |
| Down-left | RSO | LIR |

**Palsy signatures** `[GK unless noted]`.
- **CN VI:** abduction deficit; esotropia worse in gaze toward the palsied side.
- **CN IV:** hypertropia of the affected eye, worse on contralateral gaze and ipsilateral head tilt (Parks 3-step test, see the Iowa cover-test page https://webeye.ophth.uiowa.edu/eyeforum/video/basic-cover-test.htm). Patients often tilt the head away.
- **CN III:** "down and out" eye, ptosis, ± dilated pupil. https://www.brainscape.com/flashcards/8320199/packs/13662953 (flashcard source; prefer an SME check)

**Mini-game: "Puppet Master / Find the Broken String."**
- The player drags a glowing target through the H.
- Both eyes are rendered as 3D spheres with muscle "strings". One string is weak, which causes under-action plus secondary over-action of the yoke.
- The player taps the gaze position with maximal diplopia (or uses red-glass diplopia images) and names the muscle and cranial nerve.
- Score: correct muscle +100, correct nerve +50, fewer target sweeps = efficiency bonus.
- Sin: Gluttony (an "all 12 muscles" collection deck).

---

## 11. Ishihara Color Plates

**Construction.**
- A circle filled with dots of random sizes and tones. The figure differs from the background only in chromaticity, and dot outlines break up any shape cues (camouflage).
- Colours are chosen along dichromat confusion lines. Foreground dots come from one end of a confusion line and background from the other, so a dichromat sees one family of colours.
- Sources: https://openaccess.city.ac.uk/id/eprint/1301/1/Ishihara_ASEM_2012%20%282%29.pdf ; https://www.ncbi.nlm.nih.gov/books/NBK217823/ ; https://archive.bridgesmathart.org/2023/bridges2023-173.pdf
- Ishihara predated CIE colour spaces and tuned the plates empirically.

**Plate types (Hardy-Rand-Rittler 1945).**
- Vanishing: normals see it, CVD do not.
- Transformation: different digit seen by normal vs CVD.
- Hidden-digit: only CVD see it.
- Qualitative diagnostic (classification): protan vs deutan.
- Tracing paths: for non-readers.
- Editions: 38 plates (full) and 10, 14, or 24 plates (abbreviated). Plate 1 is a demo plate ("12") seen by everyone and not scored.
- Example: one plate shows "74" to normals and "21" to red-green CVD (green dots on a sandy-brown background).
- Pass criteria: U.S. Navy requires ≥ 10/14; research suggests < 12 correct = CVD (97% sensitivity, 100% specificity). About 3 s per plate.
- Red-green only, not tritan.
- Sources: https://en.wikipedia.org/wiki/Ishihara_test ; https://openaccess.city.ac.uk/id/eprint/1301/1/Ishihara_ASEM_2012%20%282%29.pdf

**Procedural generation recipe** (for devs; algorithm design is ours, built on the cited principles).
1. Circle-pack N ≈ 400-800 dots of radius 2-10 units with Poisson-disk sampling, using random radii.
2. Rasterize the glyph mask.
3. Choose two colour sets on the same confusion line: convert to LMS and vary only along the L (protan) or M (deutan) axis, keeping S and luminance about equal. Add random luminance jitter of ±10-15% to both sets so brightness doesn't give the figure away.
4. Validate by running Brettel-Viénot-Mollon (1997) or Viénot (1999) dichromat simulation. The figure must vanish under the target simulation and be visible to normal trichromats.
   - Sources: https://vision.psychol.campsych.vs.mythic-beasts.com/jdmollon/papers/Dichromat_simulation.pdf ; https://nbviewer.jupyter.org/github/DaltonLens/daltonlens.org/blob/master/_notebooks/2021-10-21-Understanding-Color-Blindness-Simulations.ipynb ; https://mk.bcgsc.ca/colorblind/math.mhtml
5. **Caveat:** screens are not calibrated, so the in-game plates are *teaching simulations*, not a diagnostic test. Show a disclaimer.

**Mini-game: "Dot Matrix" (two modes).**
1. **Examiner mode.** A virtual patient (with a hidden CVD type) reads plates aloud. The player records the answers and classifies normal, protan, or deutan from the pattern (e.g. the transformation-plate answers).
2. **Plate-maker mode** (puzzle). The player picks two colours so that a "dichromat goggles" toggle makes the digit vanish while it stays visible normally. This teaches confusion lines viscerally.

Sins: Envy (see the world "through their eyes": the simulation toggle); Pride (craft a plate that fools the AI dichromat).

---

## 12. Amsler Grid

**Spec.**
- 10 × 10 cm grid, 20 × 20 squares of 5 mm each, with a central fixation dot.
- At 33 cm each square = 1°, covering the central 20° (±10°).
- Test monocularly with the reading correction on.
- The patient reports wavy lines (metamorphopsia), missing or blurred areas (scotoma), and whether the corners and border are visible.
- New distortion means urgent review (e.g. conversion to wet AMD).
- Sources: https://EN.wikipedia.com/wiki/Amsler_grid ; https://www.ncbi.nlm.nih.gov/books/NBK538141/ ; https://my.clevelandclinic.org/health/diagnostics/amsler-grid-eye-test

**Render spec.**
- Metamorphopsia: displace grid vertices by a Gaussian bump (pull toward or away from a lesion center).
- Scotoma: overlay a blurred grey blob with alpha falloff.
- Micropsia/macropsia: local scaling `[GK]`.

**Mini-game: "Warp Hunter."**
- First person: the player sees the patient's distorted grid and must trace the distorted region with a lasso while holding fixation (the cursor drifting off the center dot is penalized, which is a "fixation discipline" mechanic).
- Scoring: IoU of the traced region vs the true region, plus classification (metamorphopsia vs scotoma, macular vs peripapillary).
- Sin: Sloth (a 20-second daily check, a "daily quest" home-monitoring metaphor that builds habit).

---

## 13. Confrontation Visual Fields and Defect Patterns

**Technique.**
- Monocular testing. Count fingers in each quadrant and compare. A red target is more sensitive.
- Combine techniques: finger counting, wiggle, comparison of two targets across the vertical midline.
- Sources: https://www.aao.org/education/image/recording-confrontation-visual-fields ; https://aupo.org/system/files/resources/2019-04/Confrontation%20Visual%20Fields%20--%20A%20Guide%20for%20Ophthalmologists%20in%20Training.pdf
- **Sensitivity** vs automated perimetry:
  - 75-100% for altitudinal, central/centrocecal, and homonymous hemianopia.
  - Only 20-50% for arcuate and bitemporal defects.
  - So a normal confrontation result never rules these out. https://pubmed.ncbi.nlm.nih.gov/1800764/

**Defect localization.**

| Defect | Field appearance | Lesion |
|---|---|---|
| Arcuate / nasal step | Arc from the blind spot, respects the horizontal meridian | Optic nerve / NFL (glaucoma) |
| Central / cecocentral scotoma | Center ± blind spot | Optic neuropathy / macula |
| Bitemporal hemianopia | Temporal halves of both eyes | Chiasm (pituitary adenoma, meningioma, craniopharyngioma, aneurysm) |
| Homonymous hemianopia | Same side in both eyes; respects the vertical meridian | Retrochiasmal. More congruous = more posterior (occipital), often with macular sparing `[GK]` |
| Superior "pie in the sky" quadrantanopia | Superior quadrant | Temporal (Meyer loop) `[GK]` |
| Inferior quadrantanopia | Inferior quadrant | Parietal `[GK]` |

- Sources: https://novel.utah.edu/collection-materials/jonathan-trobe/fingertips/Visual_Fields/Localizing_The_Lesion.html ; https://www.msdmanuals.com/professional/multimedia/table/types-of-visual-field-defects

**Render spec.** Each defect is a boolean mask in polar field coordinates, rendered per eye.
- The visual-pathway diagram (eyes → nerves → chiasm → tracts → LGN → radiations → V1) is an SVG with clickable lesion sites.
- A lesion at a node maps to masks via the crossing rule: nasal retinal fibers (temporal field) cross at the chiasm.

**Mini-game: "Pathway Sniper."**
- Phase 1: confrontation. The player flashes 1, 2, or 5 fingers in quadrants; the patient's answers reveal a field map.
- Phase 2: the player drags a "lesion marker" onto the visual-pathway diagram, and the predicted fields animate live. Win when they match.
- Score: fewest probes + correct lesion.
- Sins: Wrath (a pituitary "boss" that grows each turn you delay referral); Pride (a "neuro-ophthalmologist" title unlock).

---

## 14. Near Point of Convergence (NPC)

**Procedure.**
- An accommodative target (or penlight with red/green glasses) moves toward the nose along a RAF rule until the patient reports diplopia or the examiner sees one eye drift out (the break). Then pull back until single vision returns (recovery).
- Repeat to reveal fatigue.

**Norms.**
- Break ≤ 5-6 cm and recovery ≤ 7 cm are normal. https://researchdiscovery.drexel.edu/esploro/outputs/journalArticle/Nearpoint-of-convergence-test-procedure-target/991021900187404721 ; https://ncbi.nlm.nih.gov/books/NBK554390
- Break > 10 cm is commonly called receded.
- Convergence insufficiency (CI) criteria vary: break cutoffs 6-10 cm, recovery 7.5-17.5 cm. https://pmc.ncbi.nlm.nih.gov/articles/PMC9537264 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC7789288
- Full CI picture: receded NPC + exophoria greater at near than at distance + reduced positive fusional vergence (StatPearls NBK554390).

**Render spec.**
- Side view: a target slides along a ruler. Front view: two eyes converge (the angle follows from target distance and a PD of about 62 mm).
- At break, one eye snaps outward (abducts).
- The patient bubble says "two!" (subjective) or stays silent (objective). Some patients never report, so the player must watch the eyes.

**Mini-game: "The Squeeze."**
- Slide the target at a controlled speed. Too fast gives an inaccurate reading (speed limit about 2-5 cm/s `[GK]`).
- Hit "Break!" the moment one eye drifts, then pull back and hit "Recover!"
- Score: |measured − truth| ≤ 1 cm, plus a correct normal/CI call.
- Sin: Sloth (patience is rewarded; rushing is punished).

---

## 15. Amplitude of Accommodation

**Push-up method.**
- Monocular, with the distance correction on. A small near target moves toward the eye until the first sustained blur.
- AA (D) = 1 / blur distance (m) `[GK formula]`.
- Example protocol: start at 40 cm and approach at about 2 cm/s.
- Push-up overestimates AA vs objective measures, especially in young children.
- Sources: https://orca.cardiff.ac.uk/119024/1/ovp6-5_article_amiebenomo_web.pdf ; https://pmc.ncbi.nlm.nih.gov/articles/PMC4300538 ; https://umsl.edu/~garziar/accom_testing.htm
- **Minus-lens-to-blur variant:** add minus lenses at 40 cm until sustained blur. AA = total minus + 2.50 D `[GK]`.

**Hofstetter norms (D).**
- Minimum = 15 − 0.25·age
- Average = 18.5 − 0.30·age
- Maximum = 25 − 0.40·age
- Source: https://wikipedia.com/wiki/Accommodative_amplitude
- These may overestimate in children aged 6-11. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10289054/
- Accommodative insufficiency: AA below Hofstetter's minimum, usually by ≥ 2 D `[GK]`.
- Presbyopia: AA too low for comfortable near work (most people need to keep about half the AA in reserve `[GK]`). This drives the near add.

**Mini-game: "Blur Line" (paired with NPC as the "Near Work Gym").**
- The target text blurs procedurally once the distance falls below 1/AA. Blur radius is proportional to dioptric deficit.
- The player stops at the first sustained blur.
- Then compute AA and compare with Hofstetter for the patient's age shown on the chart.
- Follow-up: prescribe a near add.
- Sin: Greed (an age-to-AA "stock chart" mini-graph where the player predicts the value before measuring and earns bonus coins).

---

## 16. Summary Table: Mechanic × Metric × Sin

| Test | Core mechanic | Primary score metric | Gold threshold | Lead sin |
|---|---|---|---|---|
| VA | Tap-to-score letters | Notation exact | Exact logMAR to 0.02 | Pride |
| Subjective refraction | Dial phoropter, "1 or 2" | Power-vector error | ≤ 0.25 D | Greed (minus = money) |
| Retinoscopy | Sweep + neutralize | Power-vector error | ≤ 0.50 D | Gluttony (combo) |
| Keratometry | Align plus signs | ΔK, axis | ≤ 0.12 D, ≤ 5° | Pride |
| Slit lamp | Beam builder, cell count, VH ruler, stain ID | Correct grade | Exact SUN / VH / Oxford | Lust (beauty) |
| Tonometry | Dial to mire kiss at mid-pulse | mmHg error | ≤ 1 mmHg | Wrath (squeezer) |
| Fundus | Pan-and-tag, C/D slider, inverted BIO | Precision/recall + grade | F1 ≥ 0.9, C/D ± 0.05 | Lust / Envy |
| Pupils | Rhythm swing, light/dark branch | RAPD side + grade; aniso dx | Correct + ND within 0.3 log | Pride / Wrath |
| Cover test | Spot-the-flick + prism bar | Type + PD | ≤ 2Δ | Envy |
| EOM | Drag the H, find the weak string | Muscle + nerve | Both correct | Gluttony |
| Ishihara | Examiner + plate-maker | Classification | Correct type | Envy / Pride |
| Amsler | Lasso distortion with fixation discipline | IoU | ≥ 0.8 | Sloth (daily) |
| Confrontation fields | Probe + lesion placement | Probes + lesion site | Correct node | Wrath (boss) |
| NPC | Slide + react | cm error | ≤ 1 cm | Sloth (patience) |
| Amplitude | Blur-stop + Hofstetter calc | D error | ≤ 0.5 D | Greed |

---

## 17. Open items for SME (optometrist) review
- Confirm all `[GK]` items: Snellen decimal values, Goldmann over/undershoot appearance and pulse amplitude, Frisén grade 3 wording, cover-test vertical directions and prism bases, Hirschberg conversion, the full gaze-muscle map, palsy signatures, minus-lens AA formula, and NPC target speed.
- Choose canonical sources where they conflict:
  - Van Herick grade 3 cutoff (1/4-1/2 vs > 1/2)
  - Duochrome VA cutoff (20/30 vs 20/40)
  - ETDRS chart distance (4 m)
  - NPC CI cutoff (6 vs 10 cm)
  - Pilocarpine concentration for Adie (0.1% vs 0.125%)
- Decide region-specific notation defaults (feet vs metres; plus- vs minus-cylinder phoropter).
