# 05 — Medical Diagnosis Games & Premium "Juice" Polish

Research brief for the optometry diagnosis game. Part A covers prior-art medical and diagnosis games and the evidence base. Part B covers what makes an HTML5 game feel premium, with numbers.

**Method and limits.** About 30 web searches plus about 35 direct fetches of primary pages. The shared web-search budget ran out partway through, so a few planned lookups were not run: GeriatriX, Human Dx, Figure 1 quiz features, and per-case NEJM statistics. Wherever a claim is a **design recommendation** rather than a sourced fact, it is tagged **[REC]**. Community or fan sources are tagged **[community]**.

---

## PART A: Medical diagnosis games: mechanics and UX patterns

### A1. Product-by-product teardown

| Product | Genre | Core diagnostic mechanic | Scoring / feedback | Steal for our game |
|---|---|---|---|---|
| **Prognosis: Your Diagnosis** (Medical Joyworks) | Mobile text-case quiz | Pick case → read presentation → choose investigations → choose management. Branching multiple choice at each step. | **1–3 stars** per case. A post-case screen shows correct vs incorrect choices, an explanation of the diagnosis and reasoning, and references. Per-specialty **% complete** progress, replay at will, favourites. Developer says cases come from "200+ physicians across 33 specialties" and new cases ship weekly. An early "Case Builder" let users author cases without code. A 2012 review said the cases felt simple, and an App Store user complained about how scores were awarded. | 3-star rating, replay loop, per-specialty completion %, weekly case drops, and a no-code case authoring format (our data-driven case JSON). |
| **Full Code** (Full Code Medical) | Mobile/web ED sim | Tabs: review of systems, exams, investigations, interventions, communications (consult specialists). AI patient conversation. Real imaging and ECGs. | Full scored **debrief** with a differential list that defines each dx. **Easy** mode highlights abnormal values and an "attending" gives hints on tap. CME needs ≥85% on Medium/Hard. Institutional dashboards show first-attempt vs best-attempt. Free tier gets 3 unlock credits, +3 for making an account. | Difficulty tiers that change scaffolding (abnormal highlighting and an attending hint button), first-vs-best attempt tracking, and a debrief that defines every differential. |
| **Body Interact** (Take The Wind / Wolters Kluwer) | 3D virtual patient | Free-text or voice history taking. Head-to-toe exam. Test ordering. **Physiology deteriorates in real time** if you are slow. "No predefined path." | Feedback is structured by stage of patient care. AI report covers "what went well / what didn't / why." LMS tracking. 1,500+ scenarios, patients aged 6 months to 99 years. | A stage-structured debrief (History → Exam → Tests → Dx → Management) and time-sensitive deterioration for urgent eye cases (e.g., acute angle closure, retinal detachment). |
| **EMERGE** (academic serious game, Göttingen) | Virtual emergency department | Menus for history items, physical exam, labs, imaging, and therapy. **Up to 10 patients at once**. The case closes on transfer. | Aggregate score = actions matching national guidelines, with sub-scores for history, physical exam, instrumental exam, labs, therapy, dx (yes/no), and transfer (yes/no). After each case the player sees a **senior physician's recommended solution**. Every action is logged. | Guideline-matched action scoring with sub-scores, an "expert path" replay at the end, and action logs for analytics. |
| **Project Hospital** (Oxymoron Games) | Hospital management sim | Visible symptoms plus a count of **hidden symptoms (eye icon)** that only exams reveal. Candidate diagnoses carry **live % probabilities**. Unavailable exams are greyed out. Ordered, in-progress (pulsing), and done exams each have their own icon state. Symptom treatment for comfort is separate from finding the dx. | Patient satisfaction feeds prestige and money. Some exams are noted as "strongest" (high yield). Players complained that doctors keep ordering tests after the dx is known. | **Hidden-symptom counter** and a **live differential with probabilities that update after each test**. Grey-out logic for tests you have not unlocked. Reward stopping once you are confident (no over-testing). |
| **Two Point Hospital** | Comedic management sim | The GP office plus diagnosis rooms each add **Diagnosis Certainty %**. The patient loops between GP and diagnostic rooms until certainty reaches the threshold. **Treatment success tracks certainty %**. | The player sets the threshold: lower means faster throughput but more failed cures [community]. | A **certainty meter** that gates "Commit diagnosis" and directly sets the outcome odds: a speed-vs-accuracy tradeoff (Greed/Sloth lever). |
| **Theme Hospital** (Bullfrog, 1997) | Comedic management sim | GP → diagnosis rooms → treatment. The player can set the required diagnosis % above 100% (extra tests) or **gamble on a cure** before diagnosis is complete, risking death. | Diagnosis and treatment cost the patient money. **Fictional comedic illnesses** (Bloaty Head, King Complex) were used because real diseases felt "too grim." The design aimed for "humour rather than gore." | A "**guess early**" gamble mechanic (bonus multiplier if right, penalty if wrong) and a humorous tone for patients. We must keep real pathology, but comedy can live in the characters. |
| **Trauma Center: Under the Knife** (Atlus, DS, 2005) | Touch surgery action | 10 tools on screen edges (scalpel, laser, forceps, syringe, sutures, gel, scanner for hidden problems). Real-time timer. | Per-action grades from "Bad" to "Cool", then a **C→S rank** per operation, then **Challenge-mode replays** for a higher rank. The "Healing Touch" power (draw a star) slows time, but **using it locks you out of S rank**. Visual-novel story scenes. Metacritic 81. Critics praised the touch controls and the silly-but-engaging story, and criticized difficulty spikes, repetitiveness, and heavy text. | **Tool palette for mini-games** (e.g., slit-lamp controls), per-action micro-grades that roll up into an S-rank, an **assist that costs you the top rank** (a Pride lever), and short story beats between cases. Keep text light. |
| **House M.D.** (Legacy Interactive, 2010 PC; DSiWare/iOS episodes) | Adventure / puzzle | Interview, exam, test mini-games. The iOS version turns diagnosis into a logic grid filled by clues from team members (with wait timers). | Panned: repetitive, "waiting for clues feels pointless," and it missed the show's whiteboard differential drama. A few mini-games were fun. | **Anti-patterns:** do not add artificial waiting, do not let mini-games become repetitive filler, and **do make the differential-diagnosis "whiteboard" the dramatic centrepiece**. |
| **NEJM Image Challenge** | Weekly image quiz | One image plus "most likely diagnosis?" with **5 options**. | After answering, you see **how other readers answered**. Archive of 945+ cases and 85M+ responses (Dec 2023). Average human accuracy is about 51% in one study. | A daily "**Fundus of the Day**" one-image challenge with a crowd-answer distribution reveal (Envy/Pride lever). |
| **Figure 1** | Clinician case-sharing network | Verified HCPs post real anonymised cases and peers comment. The site claims 40% of clinicians who couldn't resolve a case alone resolved it via peer collaboration. | Social, not scored. | Community "case of the week" and the "second opinion" fantasy. |

Sources: Prognosis [App Store](https://apps.apple.com/us/app/id392489854), [ACA library review](https://acalibrary.libguides.com/mobile/prognosisyourdiagnosis), [iMedicalApps 2012](https://www.imedicalapps.com/2012/09/prognosis-diagnosis-medicine-android-app/); Full Code [App Store](https://apps.apple.com/app/id1207424206), [FAQ](https://fullcodemedical.com/faq/); Body Interact [site](https://bodyinteract.com/virtual-patient-simulator/), [Wolters Kluwer](https://www.wolterskluwer.com/en/expert-insights/virtual-patient-simulators-improve-clinical-decision-making-learning-and-engagement), [App Store](https://apps.apple.com/us/app/body-interact/id920383226); EMERGE [Middeke et al. 2018, PMC6133380](https://pmc.ncbi.nlm.nih.gov/articles/PMC6133380/); Project Hospital [Patient card guide](https://www.gamepressure.com/project-hospital/patients-card/z1b924), [GameDeveloper dev article](https://gamedeveloper.com/design/making-i-project-hospital-i-a-realistic-approach-to-medical-simulation), [Steam discussion](https://steamcommunity.com/app/868360/discussions/0/1752358461524827743); Two Point [Steam thread](https://steamcommunity.com/app/535930/discussions/0/1737715419902371784), [gamepressure illnesses](https://www.gamepressure.com/two-point-hospital/illnesses/zab413); Theme Hospital [Wikipedia](https://en.wikipedia.org/wiki/Theme_Hospital), [UHS hints](https://www.uhs-hints.com/uhsweb/hints/hospital/128); Trauma Center [Wikipedia](https://en.wikipedia.org/wiki/Trauma_Center:_Under_the_Knife), [Hardcore Gaming 101](https://www.hardcoregaming101.net/trauma-center-under-the-knife/); House [Pocket Gamer](https://www.pocketgamer.com/house-md/review/), [Hooked Gamers](https://hookedgamers.com/pc/house_md/review/article-589.html), [Gaming Nexus](https://www.gamingnexus.com/Article/House2c-MD/Item2775.aspx); NEJM [App Store](https://apps.apple.com/us/app/nejm-image-challenge/id403219522), [PMC10949144](https://pmc.ncbi.nlm.nih.gov/articles/PMC10949144), [arXiv 2401.08396](https://arxiv.org/html/2401.08396v2); Figure 1 [figure1.com](https://www.figure1.com/).

### A2. What the med-ed literature says works

- **Meta-analysis (gamified learning for clinical reasoning, 2010–2023)**: 26 studies included and 10 meta-analysed (931 learners). Pooled **SMD 1.11 (95% CI 0.69–1.52)**, falling to **0.75** after trim-and-fill. I² = 85%, GRADE certainty low. The most common elements were scenario-based decision making (69%), scoring/progress tracking (65%), and feedback/reflection (62%). Leaderboards appeared in only 27% and rewards/levels in 8%. The authors suggest that **learner choice, adaptive challenge, and informative feedback align better with motivation than competition-based design**. [PMC12805841](https://pmc.ncbi.nlm.nih.gov/articles/PMC12805841/)
- **Scoping review (19 games)**: 10 simulations, 6 escape rooms, 2 puzzle games, 1 board game, framed against Levett-Jones' **8-step clinical reasoning cycle**. **Only 2 of 19 games covered all 8 steps.** Goal-setting (step 5) and **reflection (step 8) were the least represented**. Recommendations: use an explicit reasoning model with reflective steps, self-debrief followed by instructor debrief, and treat games as a supplement. [PMC10896137](https://pmc.ncbi.nlm.nih.gov/articles/PMC10896137/)
- **EMERGE vs PBL**: 40+ cases vs 5 in the same 10×90 min. Key-feature exam score 62.5% vs 54.2% (p=0.015). Correct dx on unseen cases was NSTEMI 97.3% vs 70.4% and GI bleed 58.6% vs 33.3%. Groups were not randomised. **The takeaway is volume: games let learners see about 8× more cases.** [PMC6133380](https://pmc.ncbi.nlm.nih.gov/articles/PMC6133380/)
- **RCT meta-analysis of serious games in healthcare education** found only a small benefit, SMD 0.27 for confidence in skills. [PubMed 33196609](https://pubmed.ncbi.nlm.nih.gov/33196609/)

**[REC] Implications**: (1) Make the reasoning cycle explicit in the UI (Observe → Gather → Process → Identify problem → **Set goal** → Act → Evaluate → **Reflect**). (2) Add a mandatory 10-second "reflection card" after each case, because it is the step most games skip. (3) Optimise for **case volume**: 3–6 minutes per case. (4) Prefer mastery and choice over leaderboards. Use social comparison lightly and make it opt-in.

### A3. Distilled pattern library for our case flow [REC, synthesised from A1/A2]

1. **Arrival / chief complaint**: the animated patient walks in, with a speech bubble quoting the complaint in the patient's own words. Show 3 visible cues (age, occupation, demeanour) and a **hidden-findings counter** ("? 4 findings undiscovered", from Project Hospital).
2. **History taking**: a chip-style question picker grouped by category (onset, duration, laterality, pain, vision change, systemic/meds, family hx). Each question costs **1 time unit**. Patient replies animate in. Pertinent positives auto-pin to a "clue board."
3. **Live differential board** (the House "whiteboard" done right): 3–6 candidate diagnoses with **probability bars that animate after every clue/test** (Project Hospital % plus Two Point certainty). The player can drag to reorder or pin a hunch.
4. **Test ordering**: a tool tray (VA chart, pinhole, pupils, EOMs, cover test, retinoscopy, slit lamp, tonometry, DFE, OCT, visual fields, Amsler). Each test has a **time cost and a chair-time / "clinic cost" budget** (Theme Hospital cost plus EMERGE guideline scoring). Low-yield tests are allowed, but they dent the efficiency score. Each test launches a **mini-game** (Trauma Center tool palette).
5. **Commit diagnosis**: enabled at any time. Committing below the certainty threshold gives a **gamble multiplier** (Theme Hospital "guess at cure"). Committing after 100% certainty with excess tests gets an "over-tester" note (Project Hospital complaint).
6. **Management plan**: 2–4 choices (refer urgently, prescribe, educate, follow up in X).
7. **Debrief screen**: (a) S/A/B/C rank with stars, (b) sub-scores (History, Exam, Test efficiency, Dx, Management, Time) per EMERGE/Body Interact, (c) **expert path replay** showing the senior clinician's optimal test order (EMERGE), (d) definition card for each differential (Full Code), (e) "% of players who got this" (NEJM), (f) a 1-tap reflection prompt ("What clue should have tipped you off?") for step 8, (g) replay and next-case buttons.
8. **Assist modes**: an Easy mode highlights abnormal findings, and an "Ask the attending" hint costs rank (S-rank lockout, as with Trauma Center's Healing Touch).

---

## PART B: "AAA juice" for a browser/HTML5 game

### B1. Definitions and frameworks

- **Game feel** (Swink, 2008): "real-time control of virtual objects in a simulated space, with interactions emphasized by polish." [Wikipedia](https://en.wikipedia.org/wiki/Game_feel), [Elsevier](https://shop.elsevier.com/books/game-feel/swink/9780123743282)
- **Juice**: "maximum output for minimum input" (Jonasson & Purho, "Juice it or lose it", 2012) and "non-essential visual, audio & haptic effects that enhance the player's experience." [bradwoods garden](https://garden.bradwoods.io/notes/design/juice), [dev.to](https://dev.to/bradwoods/juice-1bbl)
- **Pichlmair & Johansen taxonomy** (survey of 200+ sources) [arXiv 2011.09201](https://ar5iv.arxiv.org/html/2011.09201):
  - *Physicality / tuning*: speed, acceleration, friction, gravity, hitboxes.
  - *Amplification / juicing*: screen shake, knock-back/recoil, one-shot particles, colour flash, impact markers, **hit stop**, audio, haptics, cooldown visualisation. *Time manipulation*: freeze frames, slow-mo, instant replay. *Persistence*: trails, decals/debris, follow-through, **fluid interfaces, idle animations**. *Scene framing*: dynamic camera, points of interest.
  - *Support / streamlining*: coyote time, input buffering (Braid buffers 0.23 s; Mario 1–2 frames), assisted aiming, quasimodes.
  - Cites Kao's large study: **medium and high juiciness beat both none and extreme juiciness.** More is not always better.
- **Empirical caution**: Juul & Begy (2016, n=46) found no significant difference between juicy and non-juicy match-3. Other work suggests that "overloading" amplified feedback can interfere with felt competence. Juicy text plus particles improved player experience without hurting performance. [Hicks et al. DiGRA 2018](https://dl.digra.org/index.php/dl/article/view/936), [arXiv 2512.13695](https://arxiv.org/html/2512.13695), [UWaterloo juicy haptics](https://uwaterloo.ca/haptic-experience-lab/references/juicy-haptic-design-vibrotactile-embellishments-can-improve)
  - **[REC]** Ship a "Juice" slider (Off / Calm / Full), default Full but not Extreme. Never juice during **precision moments** (e.g., aiming the slit-lamp beam). Peggle followed the same rule: chaos only after the shot. [Wikipedia: Peggle](https://en.wikipedia.org/wiki/Peggle)
- **"The Art of Screenshake"** (Nijman/Vlambeer, 2013): 30 small tweaks turn a dull shooter great. They include animation, lower enemy HP, higher rate of fire, muzzle flash, hit reaction, knockback, camera lerp, screen shake (opposite to the fire direction), **hit pause**, recoil, bigger explosions, persistent smoke/debris ("permanence"), a 33% chance of harmless death explosions, slow-mo, and a meaningful game-over screen. [GameDeveloper](https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games), [Bayreuth GxD PDF](https://medienwissenschaft.uni-bayreuth.de/wp-content/uploads/GxD-10-Game-Feel.pdf)

### B2. Technique cookbook with numbers

#### Screen shake (Eiserloh "trauma" model, GDC 2016)
- State `trauma ∈ [0,1]`. Each event **adds** trauma (e.g., +0.4) and clamps to 1. Trauma **decays linearly** at 0.5/s, so full shake lasts about 2 s.
- Apply `shake = trauma²` (exponent 2; linear "doesn't feel punchy").
- Offsets use **Perlin/smooth noise, not random**. Sample independent noise for x, y, and roll (seeds 0/100/200) at **noise speed about 20** × time.
- Max **translation 20 px** and max **roll 10°** at trauma 1 (Bevy reference values). **[REC]** For a UI-heavy clinic game, use about 8 px and 1.5° max. Camera shake only.
- Sources: [GDC Vault talk](https://gdcvault.com/play/1023146/Math-for-Game-Programmers-Juicing), [Bevy 2D screen shake source](https://docs.rs/bevy/0.17.3/src/2d_screen_shake/2d_screen_shake.rs.html)
- Score-scaled shake (Balatro-style reconstruction): small **0.2 s ±2 px**, medium **0.3 s ±3–4 px** (above 1,000 pts), large **0.5 s ±6–8 px + ±1° rotation** (above 10,000 pts). [blakecrosley Balatro guide](https://blakecrosley.com/guides/design/balatro) (author's reconstruction, not shipped code)

#### Hit stop / freeze frame
- **50–100 ms** works best (Japanese dev testing); **60–120 ms** is "plenty", and longer feels laggy. Light hit is 2–3 frames, heavy or parry is about 12 frames at 60 fps (200 ms). **More than 20 frames reads as a bug.** Scale the duration with impact. Freezing only the involved actors can beat a global time-scale of 0. [Godot hit-stop tutorial](https://dev.to/saltmire/godot-4-screen-shake-and-hit-stop-in-one-script-11eh), [eastondev](https://eastondev.com/blog/ja/posts/dev/20260521-game-feedback-feel/), [Godot forum checklist](https://forum.godotengine.org/t/game-feel-checklist-for-godot-4-hit-stop-trauma-shake-coyote-time-and-more/145340), [Sakurai on hitstop](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
- **[REC]** Freeze for 80 ms when the player lands the decisive finding (e.g., spots the retinal tear), then flash, particles, and a sting.

#### UI motion durations (NN/g + Material 3)
- NN/g: most animations should take **100–500 ms**. Toggles and checkboxes about **100 ms**. Modals and large changes **200–300 ms**. Practical ceiling **≤400 ms**, and at **500 ms** they "feel like a drag." **Enter longer than exit** (e.g., 300 ms in / 200–250 ms out). Use **ease-out to enter**, **ease-in to exit**, and **never linear** for movement. [NN/g](https://nngroup.com/articles/animation-duration)
- Material 3 duration tokens: short 50/100/150/200, medium 250/300/350/400, long 450/500/550/600, extra-long 700/800/900/1000 ms. [MDC Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)
- Material 3 easings:
  - standard `cubic-bezier(0.2,0,0,1)`
  - standard-decelerate `(0,0,0,1)`
  - standard-accelerate `(0.3,0,1,1)`
  - **emphasized-decelerate `(0.05,0.7,0.1,1)`** for entering
  - emphasized-accelerate `(0.3,0,0.8,0.15)` for exiting
  - emphasized (path) `M0,0 C0.05,0 0.133,0.06 0.167,0.4 C0.208,0.82 0.25,1 1,1`
  - Guidance pairs standard with about 300 ms and emphasized with about 500–650 ms. [MDC Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)
- Penner/easings.net formulas [easings.net source](https://raw.githubusercontent.com/ai/easings.net/master/src/easings/easingsFunctions.ts):
  - easeOutCubic `1-(1-x)^3`
  - easeOutExpo `1-2^(-10x)`
  - **easeOutBack** `1 + 2.70158(x-1)^3 + 1.70158(x-1)^2` (overshoot about 10%)
  - **easeOutElastic** `2^(-10x)·sin((10x-0.75)·2π/3)+1`
  - easeOutBounce piecewise with n1=7.5625, d1=2.75
- Overshoot "pop" bezier commonly used for rewards: **`cubic-bezier(0.34,1.56,0.64,1)`**. [Balatro guide](https://blakecrosley.com/guides/design/balatro)

#### Number roll-ups and reward sequencing (Balatro-style, reconstructed)
- Slot-reel digits: **0.4 s** with the overshoot bezier above, staggered **50 ms per digit** left to right.
- **Sequence components, then the total.** Chips roll first, then the multiplier kicks in. Joker triggers fire left to right with a pulse, about 300 ms for the whole chain, and the running total updates after each one.
- Rising pitch per scored item (C-D-E-F-G for 5 cards). A separate "ka-ching" layer plays for multipliers, and crossing a threshold triggers a bass drop plus a screen flash.
- Hover lifts: `translateY(-12px) scale(1.05)` over 0.15 s ease-out. Selected: `translateY(-24px) scale(1.08)` with a gold glow. A ±3° random rotation keeps it organic. Foil shimmer is a 135° gradient, 200% size, on a 3 s loop.
- Source: [blakecrosley Balatro guide](https://blakecrosley.com/guides/design/balatro), [80.lv Unity recreation](https://80.lv/articles/balatro-s-card-movements-shaders-recreated-in-unity). Core insight: "feedback is the product, not the polish."
- **[REC] Debrief choreography**: the patient's thank-you line (0–600 ms) → sub-scores tick in one at a time (each 400 ms roll, 120 ms gap, rising pitch) → multiplier slam with an 80 ms hit stop and medium shake → rank letter scales from 2.0 to 1.0 with easeOutBack over 450 ms, plus a particle burst and a sting → XP bar fills at 600 ms emphasized-decelerate → "Next patient" CTA pulses (1.0→1.04 scale, 1.2 s loop) after 1.5 s idle.

#### The celebratory finale (Peggle Extreme Fever)
- On the last peg: the camera follows the ball in **slow motion**, the payoff is "Ode to Joy" with a rainbow trail, fireworks, and giant "EXTREME FEVER" text. A **miss produces a groaning choir** (comic near-miss feedback). It started as a placeholder joke and was kept because "it just feels good." Chaos was confined to the end of a level so it would not distract from aiming. [Gamezebo](https://www.gamezebo.com/news/peggle-how-a-spark-started-a-fever/), [Wikipedia](https://en.wikipedia.org/wiki/Peggle)
- **[REC]** Use a "**Perfect Diagnosis**" finale for S-rank: slow-mo zoom into the eye, a choir sting, an iris-shaped particle bloom, and a colour sweep. On a wrong dx, show a comedic (never humiliating) "womp" from the patient.

#### Squash and stretch, anticipation, follow-through (Disney principles in UI)
- **Squash and stretch** preserves volume (stretch narrows, squash widens). A button press is a squash. **Anticipation** is a small counter-motion before the main motion and signals what comes next. **Staging** directs the eye to the one thing that matters. IBM cautions to "embrace acceleration and reaction but avoid overt stretchiness" in professional UI. [IxDF](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design), [IBM Design](https://www.ibm.com/design/language/animation/classic-principles), [Smashing](https://www.smashingmagazine.com/2012/10/motion-and-animation-a-new-mobile-ux-design-material)
- **[REC] numbers**:
  - Press: scale 0.94 over 80 ms ease-out. Release: 1.0 via easeOutBack over 220 ms.
  - Character landing squash: scaleY 0.85 / scaleX 1.12 for 90 ms, then stretch 1.06/0.96 for 90 ms, then settle in 150 ms.
  - Anticipation before a patient walks in: a 120 ms lean-back of about 4°.
  - Idle breathing: scaleY ±1.5% on a 2.4–3.2 s sine (randomise the phase per character).
  - Blinks every 2–6 s at random, lasting 120–150 ms.

#### Particles, trails, persistence
- Dust on landing, sparkles on collision, trails that **vanish instantly on hit**, layered sine waves for ambient sway, and pulsing alpha/scale circles for light glow. "Animate everything that matters." Too much juice can "waste your time and annoy your users." [GameDeveloper: Squeezing more juice](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
- **[REC]** Use pooled particles with ≤200 active on mobile. Bursts of 12–30 particles living 400–900 ms, with ease-out velocity and gravity of about 600 px/s². Persistent "permanence": collected-clue stickers stay on the clue board.

#### Procedural audio (Web Audio)
- Synthesis building blocks (MDN):
  - `OscillatorNode` (sine/square/triangle/sawtooth/custom `PeriodicWave`).
  - Envelopes via `GainNode.gain` ramps (example attack 0.2 s, release 0.5 s).
  - White noise buffer `Math.random()*2-1` shaped through a `BiquadFilterNode` bandpass at about 1 kHz.
  - AM via an LFO into gain (880 Hz carrier, 30 Hz square LFO).
  - **Lookahead scheduler**: `setTimeout` every **25 ms**, scheduling **0.1 s** ahead on `audioCtx.currentTime`, with rAF for visual sync.
  - Call `audioCtx.resume()` on the first user gesture (autoplay policy).
  - [MDN Advanced techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)
- **ZzFX** (Frank Force): about 20 parameters, under 1 KB compressed, no asset files, MIT licensed, with a visual designer. Example: `zzfx(...[,,925,.04,.3,.6,1,.3,,6.27,-184,.09,.17])`. Precache sounds. Its music sibling is **ZzFXM**. [GitHub](https://github.com/KilledByAPixel/ZzFX), [npm](https://npmjs.com/package/zzfx), [ZzFXM](https://keithclark.co.uk/articles/zzfxm/). **jsfxr** is an sfxr port with presets and WAV export. [GitHub](https://www.Github.com/chr15m/jsfxr)
- Make gameplay SFX "full and prominent" (bass and mids, compressed, louder than ambience), and layer a quiet ambience bed (clinic hum, distant phone) under the music. [GameDeveloper](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
- **[REC] Sound palette**:
  - UI tick: sine 1.2–1.6 kHz, 30 ms, ±3% random pitch to avoid machine-gun repetition.
  - Correct clue: two-note rising major third, 90 ms each.
  - Wrong: low triangle at 180→140 Hz over 200 ms.
  - Rank slam: noise burst plus a 60 Hz sine thump at 120 ms.
  - Combo streak: each successive correct answer pitches up a semitone (Balatro/Peggle escalation), capped at +12.
  - Use separate buses for Music, SFX, and Voice/UI with independent sliders (required for accessibility, below).

#### Micro-interactions and redundant feedback
- Every action gets **multi-channel feedback** (visual + audio + optional haptic). Hover, press, confirm, transition, and loading states. Hold-to-confirm for big actions (e.g., "Commit diagnosis"). Delayed-hover reveals teach shortcuts. Idle animations and instructional empty states. **Juice the frequent moment-to-moment actions first.** [bradwoods garden](https://garden.bradwoods.io/notes/design/juice)
- FLIP transitions for shared elements (e.g., a test card flying from the tray into the clue board) reduce cognitive load. [bradwoods garden](https://garden.bradwoods.io/notes/design/juice)
- Duolingo-style mascots: Rive state machines with per-pose states plus separate mouth/viseme states. Characters react (squint or head-shake when confused, eyebrow raise or nod when impressed). Motion is used on streaks, lesson completions, leaderboard changes, and toasts. [Duolingo blog](https://blog.duolingo.com/world-character-visemes), [Rive blog](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)
- **[REC]** Give patients and the mentor a reaction state machine (neutral, worried, relieved, impressed, sceptical) driven by the player's actions. This is the emotional core.

#### Onboarding
- Hodent (GDC 2016, *The Gamer's Brain*): the game is a learning experience. Learn by doing in a meaningful context. Players forget front-loaded tutorials but retain practiced actions. Early friction kills free-to-play retention. [Goodreads/Hodent blog post](https://www.goodreads.com/author_blog_posts/21085992-the-gamer-s-brain-part-2-ux-of-onboarding-and-player-engagement-gdc16), [IxDF on memory](https://ixdf.org/literature/article/long-term-memory-what-players-recall-vs-what-they-do-automatically), [Pocketgamer.biz](https://www.pocketgamer.biz/celia-hodent-on-the-importance-of-cognitive-science-and-a-ux-framework-to-improve-your-game)
- **[REC]** Case 1 is a 90-second scripted "conjunctivitis" patient with one tool unlocked. Introduce one new tool per case for cases 1–6. Use no text walls; contextual coach-marks only. Teach during low-load moments (the patient walking in) as with loading-screen tips. [bradwoods garden](https://garden.bradwoods.io/notes/design/juice)

#### Accessibility (Game Accessibility Guidelines + WCAG)
- **Basic tier (must ship)**:
  - Adjustable game speed.
  - Haptics toggle.
  - Large, well-spaced touch targets.
  - All UI usable with the same input as gameplay.
  - Remappable controls.
  - No flicker or repetitive patterns.
  - Self-paced text.
  - Interactive tutorials.
  - Simple language.
  - Start without deep menus.
  - Readable default font size.
  - High text contrast.
  - **No information by colour alone.**
  - **No information by sound alone.**
  - **Separate volume for SFX, speech, and music.**
  - Subtitles.
  - Saved settings.
  - Wide choice of difficulty.
  - The most-complained-about issues are **remapping, text size, colourblindness, and subtitle presentation**. [GAG Basic](https://gameaccessibilityguidelines.com/basic/)
- **Intermediate (should ship)**:
  - Avoid click-drag and simultaneous inputs, or provide alternatives.
  - Avoid button-mashing and QTEs.
  - **Practice without failure (sandbox)**.
  - Reminders of objectives and controls.
  - Contextual help.
  - Option to hide background movement.
  - Adjustable contrast.
  - Resizable UI.
  - Autosave.
  - Assist modes.
  - Change difficulty mid-game.
  - [GAG Intermediate](https://gameaccessibilityguidelines.com/intermediate/)
- **Photosensitivity (WCAG 2.3.1, Level A)**: **no more than 3 flashes in any 1 s**, unless the combined flash area is ≤25% of a 10° field (about **341×256 px** at 1024×768). A general flash is a ≥10% luminance swing where the darker state is below 0.80. A red flash is any saturated-red pair. [W3C Understanding 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html). **[REC]** Cap screen flashes at 1 per 500 ms, at ≤40% opacity, and never full-screen red.
- **`prefers-reduced-motion: reduce`**: swap scale and translate motion for opacity dissolves. This maps to OS settings on Windows, macOS, iOS, Android, GNOME, and KDE. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion). **[REC]** When it is set, default the Juice slider to Calm, set shake to 0, keep hit-stop (it is not motion), and replace particle bursts with a glow fade.
- **Optometry-specific [REC]**: diagnostic images (fundus, slit-lamp) must not depend on red/green discrimination for the *UI*. Real pathology colours stay authentic, so always pair them with shape or labels. Offer a colour-vision-deficiency-safe UI palette. Ironically, this is part of the subject matter, so we can teach it.

### B3. Visual identity for "premium casual" [REC unless cited]

- **Palette strategy**: give each scoring dimension its own colour, like Balatro (chips blue `#009dff`, mult red `#fe5f55`, money gold `#f0c040`, hands green `#50c878`, planets purple `#9b59b6`) on a deep base (`#1a1a2e`) with a vignette and a subtle CRT/glow. [Balatro guide](https://blakecrosley.com/guides/design/balatro)
- **Proposed palette for us**:
  - Base: midnight `#0F1226`.
  - Surfaces: `#1B2040` / `#252B55`.
  - Primary: iris teal `#2EC4B6`.
  - Reward: gold `#FFC857`.
  - Danger: coral `#FF5A5F`.
  - Info: periwinkle `#7B8CFF`.
  - Text: `#F4F1EA`.
  - **One accent colour per sin** for the meta-layer:
    - Pride: royal purple
    - Greed: gold
    - Envy: green
    - Gluttony: orange
    - Lust: magenta
    - Wrath: crimson
    - Sloth: slate blue
  - All text must meet 4.5:1 contrast (WCAG 1.4.3 — https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html; not fetched this session).
- **Typography**: a rounded geometric display face for headings and rank letters (e.g., "Baloo 2", "Fredoka", or "Lilita One" on Google Fonts), a highly legible humanist sans for body text and findings ("Inter" / "Nunito"), and tabular numerals for scores. Body text should be at least 16 px (GAG "readable default font size"). For **Snellen-chart mini-games, render real optotypes** (Sloan letters) as SVG rather than a font substitute.
- **Depth and materials**: soft 2.5D. Use layered parallax backgrounds (clinic window, street), drop shadows offset 0/8/24 at 25% alpha, a 1 px inner highlight on cards, and glassmorphism only on overlays. Give rewards a 135° foil-shimmer sweep.
- **Camera framing**: one "hero" focal point per screen (staging). Dim the background to 60% when the mini-game opens, with a 250 ms emphasized-decelerate zoom.

### B4. Sin-lever mapping onto proven medical-game patterns [REC]

| Sin | Pattern from the research | Implementation |
|---|---|---|
| **Pride** | Trauma Center S-rank, assist locks out S | S/A/B/C ranks, "flawless" badge, **no-hint S-rank**, a gallery of perfect cases |
| **Greed** | Theme Hospital cost and "guess at cure", Two Point certainty threshold | Clinic coins and a **gamble multiplier for early commits**, plus an efficiency bonus for fewer tests |
| **Envy** | NEJM "how others answered" | Post-case percentile and answer distribution, opt-in friend or cohort board (lit: leaderboards add little, so keep it light) |
| **Gluttony** | EMERGE: 8× case volume drives learning | Bite-size 3–6 min cases, "one more patient" auto-queue, daily "Fundus of the Day" |
| **Lust** (desire/beauty) | Balatro foil cards, Peggle Fever spectacle | Collectible holographic "rare condition" cards and a lush Perfect-Diagnosis finale |
| **Wrath** | Body Interact deterioration, ED time pressure | Urgent cases (angle closure, RD, GCA) with a ticking deterioration meter, and boss "difficult patient" encounters |
| **Sloth** | Full Code Easy mode and attending hints | Comfort mode, auto-fill history, "skip to debrief" on replays. Rest is rewarded, not punished (no streak-loss shaming) |

**Ethics guardrail [REC]**: the literature favours choice, adaptive challenge, and informative feedback over coercive competition. Use the sins as *flavour and motivation*. Avoid manipulative dark patterns (loss-aversion streak punishment, pay-to-progress), since the audience is learners under study pressure.

---

## Quick numeric cheat sheet

| Thing | Value |
|---|---|
| Micro-feedback (toggle/tick) | 100 ms ease-out (NN/g) |
| Modal / panel enter / exit | 250–300 ms emphasized-decelerate `(0.05,0.7,0.1,1)` / 200 ms emphasized-accelerate `(0.3,0,0.8,0.15)` |
| Max UI transition | ≤400 ms (500 ms feels slow) |
| Reward pop | 400–450 ms `cubic-bezier(0.34,1.56,0.64,1)` / easeOutBack |
| Digit roll stagger | 50 ms per digit |
| Hit stop | 50–120 ms (light 2–3 frames, heavy about 12 frames) |
| Shake | trauma += 0.2–0.5, decay 0.5/s, shake = trauma², Perlin at 20 Hz, max 8–20 px / 1.5–10° |
| Score-scaled shake | 0.2 s ±2 px → 0.3 s ±4 px → 0.5 s ±8 px ±1° |
| Particle burst | 12–30 particles, 400–900 ms life [REC] |
| Audio scheduler | 25 ms tick, 0.1 s lookahead |
| Flash safety | ≤3 flashes/s, or area ≤25% of a 10° field (341×256 px) |
| Text contrast | ≥4.5:1 |
| Case length target | 3–6 min [REC from EMERGE volume finding] |
