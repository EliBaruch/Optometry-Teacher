# 00 — Research Report: An Optometry Teaching Game

**For:** the project owner, and the optometrist who will review the clinical content.
**Date:** 2026-11-24
**Sources:** five research briefs in this folder (about 170 searches and 100+ page fetches in total). Every claim below links to its source or names the brief it comes from:
- [01-prior-art-games](01-prior-art-games.md)
- [02-clinical-cases](02-clinical-cases.md)
- [03-test-mechanics](03-test-mechanics.md)
- [04-sins-engagement](04-sins-engagement.md)
- [05-medical-games-and-polish](05-medical-games-and-polish.md)

> **Bottom line:** people have built pieces of this game, but nobody has built the whole thing.
> - Daily-puzzle sites, quiz apps, single-test simulators and expensive VR hardware exist.
> - A narrative eye-exam game was prototyped in 2020 and never released.
> - No product combines these four things:
>   - an animated patient visit, where each test is a mini-game
>   - a real diagnosis and plan
>   - production quality that looks like a big-budget game
>   - a deliberately designed motivation system
>
> That gap is the opening for this game.

---

## 1. Is anyone building optometry games?

Yes, but the field is split into four groups and nobody connects them.

| Group | Who (link) | What they do | Where they fall short |
|---|---|---|---|
| **Daily puzzles (closest competitors)** | [OptoConnections](https://www.optoconnections.com/) (Eugene Huang OD, $11/mo) | 11 daily mini-games ("What's the Field?", "What's the Deviation?", "What's the C/D?", OCT) plus 70 timed NBEO Part III cases | Plain 2D look, no characters. The games are separate and not part of one patient visit. |
| | [playopto](https://www.playopto.com/) | 100+ short browser games and card decks | A trivia catalogue with no story or patient |
| **Social quiz app** | [eyeStudy](https://apps.apple.com/app/id6761190625) (iOS, 2026) | Clues revealed one at a time, **confidence betting**, Elo ranking with Bronze-to-Diamond tiers, live multiplayer | 100 static cases, no animation, about 1 rating |
| **The prototype closest to our idea** | Dr Tina Gao, Univ. of Auckland ([NZ Optics, 2020](https://nzoptics.co.nz/live-articles/optometry-learning-via-gaming/)) | "Choose your own adventure" full eye exam with test choice under time pressure; feedback comes through patient outcomes | **Never released.** Students asked for "many more features" and the work was waiting on funding. |
| **Single-test simulators** | [AAO Retinoscopy](https://aao.org/interactive-tool/retinoscopy-simulator) and [Strabismus](https://aao.org/interactive-tool/strabismus-simulator) sims; [EyeScholar](https://eyesoneyecare.com/resources/eyescholar-new-tool-learn-to-refract/); [Virtual Refractor](https://bhvi.org/news/simulated-learning-how-effective-is-it-in-refraction-training/); [Pupil Wizard](https://pmc.ncbi.nlm.nih.gov/articles/PMC12089475/) | Accurate optics, randomly generated patients who give unclear answers, animated pupils | Each covers one skill and works like software, not a game |
| **Hardware and VR** | [Eyesi](https://us.haag-streit.com/products/categories/simulators-training/training-simulators/eyesi-direct) (450+ schools, vendor figure), [UNSW Eye Sim](https://teaching.unsw.edu.au/node/5904), [Meta Quest Eye Assessment](https://www.meta.com/experiences/eye-assessment/9817233858385387/) | Lifelike ophthalmoscopy and slit lamp, with scoring of retina coverage, light exposure and findings | Institution-only, expensive, no story |
| **Question banks** | [KMK](https://boards.kmkoptometry.com/), [OptoPrep](https://optoprep.com/faq.jsp), [StatPearls](https://statpearls.com/boardreview/Optometry%20-%20Applied%20Basic%20Science), [EyeRounds Anki](https://eyerounds.org/anki_cards/anki_home.html) | Re-serving missed questions and spaced repetition | Joyless grinding, yet students already pay for it |
| **AI and virtual patients** | [Sydney Virtual Ophthalmology Clinic](https://pubmed.ncbi.nlm.nih.gov/23867718/) (RCT, n=188), [PolyU vEyeC](https://polyu.edu.hk/so/Study/Teaching-Facilities-and-Innovations/Teaching-Innovations), [Aston + SimConverse](https://publications.aston.ac.uk/id/eprint/48126) | AI patient rated about equal to a human actor (n=16) | No animated, emotional character; no game loop |
| **Toys and jam games** | Kids' "eye doctor" apps, AOA [Blink Land](https://www.aoa.org/about-the-aoa/press-room/press-releases/the-american-optometric-association-launches-first-ever-eye-friendly-mobile-board-game-blink-land) (~1,500 downloads), [itch.io prototypes](https://itch.io/games/tag-optical) | Show that "being the eye doctor" appeals widely | No clinical depth |

**Evidence that games teach** (small studies, but consistently positive):
- An optometry board game matched lectures ([PLOS ONE 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4883760/)).
- The Virtual Ophthalmology Clinic gave a 17.5% gain vs 10% for controls, and the advantage held at 12 months.
- A meta-analysis of game-based clinical reasoning teaching found SMD 1.11, or 0.75 after correcting for publication bias, with low certainty ([PMC12805841](https://pmc.ncbi.nlm.nih.gov/articles/PMC12805841/)).
- In the EMERGE study, game players saw **about 8× more cases** and did better on unseen ones ([PMC6133380](https://pmc.ncbi.nlm.nih.gov/articles/PMC6133380/)).
- **Takeaway:** the volume of cases seen, plus good feedback, matters more than leaderboards.

## 2. Who is talking about it

- **Tina Gao (Auckland):** wants a case library shared across schools. Funding has not come through.
- **LVPEI (India):** clinicians and game developers held focus groups, and game-based learning has been rolled out across 4 campuses since 2025 ([F1000](https://f1000research.com/articles/14-1390/v1), [LVPEI](https://www.lvpei.org/news/new-game-based-learning-approach-implemented-for-training-programs/)). They say the hardest parts are cost and validating the content.
- **College of Optometrists, UK (Jul 2025):** simulation is now core to training, but simulators "can lack realism" and take a lot of faculty time ([link](https://www.college-optometrists.org/qualifying/sector-partnership-optical-knowledge-education/topic-of-the-month/july-2025-simulated-clinical-learning)).
- **PLOS ONE authors:** "Very little has been published" on games in optometry. They also warn that competition can embarrass weaker students.
- **Univ. of Waterloo CORE:** markets its trivia game as "**Feed your addiction!**" ([link](https://core.uwaterloo.ca/news/feed-your-addiction-play-the-ultimate-eye-science-game-now-free-online/)), so the field is comfortable with that framing.
- **Escape rooms:** Univ. of Houston, Newcastle and others. Newcastle reported more than 80% attendance at an optional session, and students said it "didn't feel like work" ([Newcastle](https://microsites.ncl.ac.uk/casestudies/wp-json/wp/v2/posts/11)).
- **Gap:** our tools could not reach Reddit (r/optometry, r/optometryschool). That should be checked by hand.

## 3. The white space our game will own

1. **One continuous patient visit as a game.** The patient walks in, history, tests played as mini-games, findings, differential, diagnosis, plan, outcome. Nobody chains these today.
2. **Animated, voiced patients who return.** Patients react to good or bad care, come back worse after a missed retinal detachment, or send a thank-you card.
3. **Big-budget presentation with no special hardware.** A stylized 2.5D clinic in the browser, roughly Two Point Hospital charm plus Pupil Wizard's animation plus Eyesi-style scoring.
4. **A complete 7-sins motivation system**, with each sin paired with its opposing virtue as a guardrail. Competitors use one or two hooks each.
5. **Real-optics mini-games bundled together** with one consistent interface and scoring.
6. **Randomly generated and AI-voiced patients**, giving endless replay.
7. **Spaced repetition delivered as returning patients** (the "Remember me, Doctor?" rematch).
8. **"See through the patient's eyes" openings:** blur, distortion or a blind spot as the complaint intro.
9. **Difficulty tiers** for curious learners, technicians, students and residents.
10. **Modular browser build.** Cases, tests and sin modules are swappable plugins, which also delivers Gao's shared case library.

**Positioning:** *"The first beautifully animated eye clinic where every patient is a story, every test is a mini-game, and every diagnosis matters."*

---

## 4. Top design implications

### 4.1 Case flow (follows the NBEO Part III PEPS exam and the clinical reasoning cycle)

The NBEO Part III clinical exam has 10 patient stations, each running focused history → interpreting findings → SOAP note, plus 2 hands-on skills stations ([blueprint PDF](https://optometry.org/wp-content/uploads/2026/05/August_2026_May_2027_Part_III_PEPS_Blueprint-__Content_Outline.pdf)). This is our loop almost exactly.

| Step | What the player does | Pattern borrowed from |
|---|---|---|
| 1. Arrival | The patient walks in, an optional patient's-eye-view intro plays, the complaint appears in the patient's own words, and a **hidden-findings counter** shows "? 4 undiscovered" | Project Hospital, UNSW Eye Sim |
| 2. History | Pick questions from chips; each costs 1 time unit. **"Objection!"**: pair a patient statement with an exam finding, and accept every valid pairing. | Ace Attorney, with its single-answer flaw fixed |
| 3. Differential board | A live list of 3–6 diagnoses with **probability bars that update after every clue**. This "whiteboard" is the dramatic centrepiece. | Project Hospital, Two Point, the lesson from House M.D.'s failure |
| 4. Tests | A tool tray. Each test has a time and clinic-budget cost and launches a mini-game. Test order is scored: VA first, pupils before dilation, check the angle before dilating hyperopes, fluorescein for any painful red eye. | Trauma Center tool palette, EMERGE |
| 5. Commit | Hold-to-confirm. A **confidence wager** (CBM: +1/+2/+3 if right, 0/−2/−6 if wrong). Committing early pays a bonus; ordering tests after you are already certain earns an "over-tester" note. | UCL certainty-based marking, Theme Hospital |
| 6. Plan | Choose the urgency tier (**T0 emergency → T4 routine**) plus a category of management. **Score the decision, not drug doses**, because what optometrists may prescribe varies by state. | Brief 02, Part B |
| 7. Debrief | S/A/B/C rank, sub-scores weighted like the NBEO domains (assessment 29 / management 25 / skills 22 / patient education 13 / communication 11), replay of the expert's test order, "X% of players missed this", an eye-dive cinematic | EMERGE, NEJM Image Challenge, Full Code |
| 8. Reflect | **Required** 10-second reflection card: "What clue should have tipped you off?" Only 2 of 19 reviewed medical games covered reflection. | [PMC10896137](https://pmc.ncbi.nlm.nih.gov/articles/PMC10896137/) |

**Hard rules:**
- Cases last 3–6 minutes.
- Rare-but-critical cases show their **classic textbook form** first (the NBEO rule).
- **Missing a T0 emergency is the worst outcome in the game; catching one is the biggest win.**
- No artificial waiting and no filler mini-games (the House M.D. failures).

### 4.2 Mini-games ranked by teaching value × fun

Scores run 1–5 for each axis and are the lead researcher's judgement. Wave 1 ships with the 20 launch cases.

| Rank | Mini-game | Test | Teach | Fun | Score | Core mechanic and how it is scored | Wave |
|---|---|---|---|---|---|---|---|
| 1 | **Fundus Safari**, plus *Cup Guesser* and *Mirror World* | Ophthalmoscopy, disc grading, indirect scope | 5 | 5 | 25 | Pan a small scope view over a randomly generated fundus and tag lesions. Score on precision and recall, then the grade call (4-2-1 rule, KWB, Frisén). Cup-to-disc slider within ±0.05. The indirect-scope view is flipped both ways. | 1 |
| 2 | **Objection!** | History taking | 5 | 5 | 25 | Pair a statement with a finding; hint ladder after 2 misses | 1 |
| 3 | **Swing Shift**, plus *Light/Dark Switch* | Pupils, RAPD, unequal pupils | 5 | 4 | 20 | Swing the light to a 3-second rhythm ring; name the side and grade; balance with filters. Eye-drop "potions" walk through the Horner / Adie / third-nerve decision path. | 1 |
| 4 | **Light Sculptor** (Beam Builder, Cell Counter, Van Herick Ruler, Stain Detective) | Slit lamp | 5 | 4 | 20 | Pick a lighting preset that reveals the hidden finding; count cells on the SUN scale; measure with calipers; identify the stain pattern | 1 |
| 5 | **The Phoropter** | Subjective refraction | 5 | 4 | 20 | Dial-turning puzzle: fog, then minus steps, then cross-cylinder ("1 or 2?") and duochrome. Score on the error in diopters (≤0.25 D = gold). "Treat minus like money." | 1 |
| 6 | **Kiss the Arcs** | Goldmann tonometry | 4 | 5 | 20 | Turn the dial until the inner edges of the arcs touch at mid-pulse; dye amount and a squeezing patient are hazards. ≤1 mmHg = gold. | 1 |
| 7 | **Clinic Rush / Triage** | Red eye, sudden vision loss, double vision, swollen disc | 4 | 5 | 20 | Rapid recognition with escalating pace; capped at 3 full-reward runs a day. Uses the decision tables in brief 02, Part D. | 1 |
| 8 | **Pathway Sniper** | Confrontation fields and lesion location | 4 | 4 | 16 | Probe quadrants, then drag a lesion marker onto the visual pathway until the predicted fields match | 1 |
| 9 | **Catch the Flick** | Cover test and prism | 4 | 4 | 16 | Swipe the direction of the refixation movement, then neutralize with a prism bar (≤2Δ = gold) | 1 |
| 10 | **Chase the Glow** | Retinoscopy | 4 | 4 | 16 | Sweep the streak, neutralize; forgetting the working-distance lens costs points (the "WD ghost") | 2 |
| 11 | **Referral Desk** | Records and referral letters | 4 | 4 | 16 | Spot the discrepancy against a rulebook of guidelines that grows over time | 2 |
| 12 | **Puppet Master** | Eye movements (H pattern) | 3 | 4 | 12 | Find the weak "muscle string"; name the muscle and cranial nerve | 2 |
| 13 | **Warp Hunter** | Amsler grid | 3 | 3 | 9 | Lasso the distorted area while holding fixation. Also a 20-second daily check. | 1 (wet AMD) |
| 14 | **The Squeeze** / **Blur Line** | Near point of convergence and focusing amplitude | 3 | 3 | 9 | Move the target at a controlled speed and call the break point; compare with age norms | 1 (convergence insufficiency) |
| 15 | **Line Hunter** | Visual acuity and pinhole | 4 | 2 | 8 | Tap letters right or wrong, then record the notation. **Runs automatically once mastered**, because it opens every case. | 1 |
| 16 | **Dot Matrix** | Colour plates | 2 | 4 | 8 | Examiner mode plus a plate-maker puzzle. **Must show a disclaimer: for teaching, not a colour-vision test.** | 2 |
| 17 | **Align the Stars** | Keratometry | 2 | 3 | 6 | Superimpose the plus signs; jittery mires mean keratoconus | 2 |

Every test is a pure module: `TestModule { id, render, input, evaluate(patientTruth, answer) → {score, errors[], teachingNotes[]} }`. Each takes a `responseNoise` setting for difficulty, and all share four scoring axes: accuracy, efficiency, technique and safety (brief 03, §0).

### 4.3 Sin mechanics mapping (each sin is a lever, its virtue the guardrail)

| Sin → virtue | Lead mechanics | What it teaches | Guardrail (required config) |
|---|---|---|---|
| **Pride → Humility** | Confidence wager; S-rank per case for correct diagnosis, correct plan, *fewest necessary tests* and red flags caught; clinic titles earned by *retained* mastery; specialty crests; Thank-you Wall | Calibrating confidence; using only the tests you need | Being wrong with low confidence is never punished. Using an assist rules out S-rank but carries no badge (the Celeste lesson). No public ranking by default. |
| **Greed → Charity** | **Finding combos** (Balatro-style: high pressure + cup asymmetry + arcuate field defect = "Glaucoma Triad ×3"); coins earned only for learning acts; clinic upgrades that unlock tests; Golden Patient rare cases (~1 in 25) | Recognising patterns of findings | **No real money ever.** Drop odds shown. Daily cap. Nothing locked behind paying or grinding. |
| **Envy → Kindness** | Rival classmate **Dr. Vale**, who shows a plausible wrong differential; Daily Patient with a Wordle-style share grid; "X% missed this"; **Ghost of Past You** (default); opt-in league showing only ±3 neighbours | Learning by contrast with near-miss diagnoses | Envy aimed at a fictional rival or your past self. League is opt-in. Weaker players see personal bests by default. |
| **Gluttony → Temperance** | The Atlas (collect condition cards graded Common / Can't-Miss / Zebra); 2–3 minute Case Bites; Clinic Rush; the mini-game buffet | Coverage of the curriculum; high volume of practice | A card is owned only after its illness-script slots are recalled. End-of-shift stopping cue every 15–20 minutes. Rewards shrink after the daily goal is met. |
| **Lust (desire, beauty) → respect** | **Cinematic eye dives**; Mystery Patient (guess before being taught); recurring patients with story arcs (e.g. Mrs. Okafor's diabetes over 6 visits); cosmetics | Picturing the disease mechanism; guessing first; the course of disease over time | Accurate visuals, no sexualised content, dignified portrayal. No limited-time content that creates fear of missing out. |
| **Wrath → Patience** | **Boss cases** (angle closure, retinal detachment, CRAO, GCA, pupil-involving third-nerve palsy) with a vision-loss countdown; **Revenge Queue** where missed cases return on a spaced schedule; calming angry or anxious patients; adaptive Mentor Mode | Recognising red flags and triaging urgency; re-testing mistakes | Timer pauses while reading. At most 3 rematches a day. No progress lost. |
| **Sloth → Diligence** | One tap to call the next patient; **Smart Rounds** (the scheduler picks what to review); Idle Clinic, where technicians flag cases for your review; mastered sub-skills run automatically; forgiving weekly streak with 2 freezes and repair | Spacing without having to plan it | Easy to start, but the answer still has to be recalled. Idle time never grants mastery. No guilt-trip copy. At most 1 opt-in notification a day. |

**Ethics in one line:** the sins provide the pull, but every payout rewards a learning act, never time spent. All seven dark patterns named by [Zagal et al.](https://deceptive.design/articles/dark-patterns-in-the-design-of-games) are banned. Success is measured by retention and confidence calibration, not daily users or minutes played.

**Modularity test** (from the 04 brief, §7, which the review agents must run):
- Sin modules talk to the rest of the game only through game events (`CaseStarted`, `TestPerformed`, `FindingDiscovered`, `DiagnosisCommitted{confidence}`, `CaseResolved`, `ReviewDue`, `SessionTick`).
- They read clinical content only through a read-only `ContentAPI`.
- **Removing all seven sin modules must leave a working, if plain, case-based tutor.**

### 4.4 Learning science to build in

| Principle | How it appears in the game | Evidence |
|---|---|---|
| Retrieval practice | Player types or tags their differential *before* seeing options; Atlas cards are learned by recall | g ≈ 0.50–0.70 ([Rowland 2014](https://courseware.epfl.ch/assets/courseware/v1/fdde2f0aa590bf3b1324077a6bf1540c/asset-v1%3AEPFL%2BDEMO%2B2020%2Btype%40asset%2Bblock/Rowland2014-meta-analysis.pdf), [Adesope 2017](https://education.wsu.edu/documents/2018/01/rethinking-use-tests.pdf/)) |
| Spaced repetition | **FSRS** (`ts-fsrs` library) schedules returning patients, the Revenge Queue and the Daily Patient. **The engagement layer is the scheduler.** | d ≈ 0.54 ([PMC12189222](https://pmc.ncbi.nlm.nih.gov/articles/PMC12189222/)); [FSRS](https://www.github.com/open-spaced-repetition/free-spaced-repetition-scheduler) |
| Interleaving | Within a chapter, conditions come one type at a time until first mastery; then the waiting room mixes look-alikes (red eye: conjunctivitis / uveitis / angle closure / keratitis) | [Monteiro 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5542896) |
| Hypercorrection | A confident wrong answer triggers a slow-motion explanation and a forced re-test within 1–3 days | [Metcalfe](https://pmc.ncbi.nlm.nih.gov/articles/PMC3079415) |
| Pretesting | The Mystery Patient arrives *before* the condition is taught | [Richland, Kornell & Kao](https://learninglab.uchicago.edu/Pre-Testing_files/RichlandKornellKao.pdf) |
| Illness scripts | Atlas card layout: risk factors / cause / signs and test findings / management | [Lubarsky 2015](https://journalhosting.ucalgary.ca/index.php/cmej/article/view/36631) |
| Deliberate practice | Weak Spot Training queue built from per-skill accuracy | [Ericsson 2004](https://pubmed.ncbi.nlm.nih.gov/15383395/) |
| Desirable difficulty | Aim for roughly 70–85% success (a working assumption, to be tuned from play data); hints fade as mastery grows; full feedback at the end of every case | [Bjork & Bjork](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-introducing-desirable-difficulties-into-practice-and-instruction-bjork-and-bjork.pdf) |

### 4.5 Polish techniques that make it feel expensive (numbers from brief 05)

- **Screen shake:** uses a "trauma" value. Each event adds 0.2–0.5, it fades at 0.5 per second, and shake strength is trauma squared, driven by smooth noise at about 20 Hz. Maximum is **about 8 px and 1.5°** for our interface ([Eiserloh, GDC](https://gdcvault.com/play/1023146/Math-for-Game-Programmers-Juicing)). Camera only.
- **Hit stop:** freeze for **80 ms** on the decisive finding (e.g. spotting the retinal tear), then flash, particles and a sound sting. Anything over 20 frames reads as a bug.
- **UI motion:** 100 ms for micro-feedback, 250–300 ms for panels entering, 200 ms for exits, never more than 400 ms. Ease-out to enter, ease-in to exit. Reward "pop" is `cubic-bezier(0.34,1.56,0.64,1)` over 400–450 ms.
- **Debrief choreography (Balatro-style):**
  - the patient's thank-you line
  - sub-scores roll in one at a time (400 ms each, rising pitch)
  - an 80 ms hit stop as the multiplier lands
  - the rank letter scales from 2.0 to 1.0 with an overshoot ease
  - the XP bar fills
  - the "Next patient" button pulses
- **Perfect-diagnosis finale** (inspired by Peggle): slow-motion zoom into the eye, a choir sting and an iris-shaped particle bloom. A wrong answer gets a comic "womp" that never humiliates.
- **Characters:** patients and mentor have reaction states (neutral, worried, relieved, impressed, sceptical) built as Rive-style state machines. Add idle breathing (±1.5%) and blinks every 2–6 seconds.
- **Audio:** generated in the browser with ZzFX, no audio files. Separate volume controls for music, effects and voice. Each correct item in a combo raises the pitch a semitone, capped at +12.
- **Juice slider (Off / Calm / Full).** A large study found medium juice beats both none and extreme. Never add juice during precision moments such as aiming the slit-lamp beam.
- **Accessibility, required at launch:**
  - Never convey information by colour alone. This matters double in an optometry game, and the user interface must be safe for colourblind players.
  - At most 3 flashes per second.
  - The browser's reduced-motion setting switches the Juice slider to Calm and turns shake off.
  - Text contrast of at least 4.5:1 and body text of at least 16 px.
  - Remappable controls, a practice sandbox with no failure, and subtitles.
- **Onboarding:** case 1 is a scripted 90-second conjunctivitis visit with one tool. Each of cases 1–6 introduces one new tool. No walls of text.

---

## 5. Twenty recommended launch cases

The cases are chosen to roughly match the NBEO Part III category weights (anterior segment 17, posterior segment 16, glaucoma 14, systemic 11, refraction 11, neuro 9, contact lenses 8, binocular vision 8, pediatrics 6).
- They include **5 boss emergencies** and 6 routine cases.
- Each case cites its full record in [02-clinical-cases](02-clinical-cases.md) (C-numbers) with sources.
- Tiers run from **T0** (emergency now) through T1 (same day), T2 (days), T3 (weeks) to T4 (routine).

| # | Case (ref) | Patient and chief complaint | Key test findings (→ mini-game) | Diagnosis | Tier and disposition | Teaching trap / sin hook |
|---|---|---|---|---|---|---|
| 1 | **Allergic conjunctivitis** (C14), *tutorial* | Atopic young adult: "SO itchy, watery, puffy, every spring" | VA normal; both eyes; chemosis, papillae on the inner lid, stringy discharge, **no swollen lymph node in front of the ear** (→ Light Sculptor) | Seasonal allergic conjunctivitis | T4: antihistamine / mast-cell drops | Itch is the hallmark; teaches the tools |
| 2 | **School-age myopia** (C01) | 10-year-old: "Can't read the board" | Uncorrected VA 20/80 both eyes, improves to 20/20 with pinhole; **against** motion on retinoscopy; cycloplegic −1.75 DS (→ Line Hunter, Chase the Glow, Phoropter) | Low myopia | T4: glasses plus **myopia control** (LAMP atropine 0.05%, MiSight, more outdoor time) | Rule out pseudomyopia with cycloplegic drops |
| 3 | **Presbyopia** (C04) | 46-year-old accountant: "Arms aren't long enough" | Distance 20/20; near 20/50 → 20/20 with a +1.25 add; amplitude ~4 D vs the age formula (18.5 − 0.3 × 46 = 4.7) (→ Blur Line) | Presbyopia | T4: reading add | Sudden near blur in a *young* patient points to drugs or a third-nerve palsy |
| 4 | **Dry eye / MGD** (C11) | Woman over 50 on screens: "Burning, gritty… yet watery" | Symptom score 32 (≥13 is abnormal); tear break-up **4 s** (<10 s is abnormal); osmolarity 318 (≥308); lower-cornea staining; capped oil glands (→ Stain Detective) | Evaporative dry eye (TFOS DEWS II) | T4: stepwise care | Watery eyes can be dry eye; ask Sjögren questions (dry mouth, joint pain) |
| 5 | **Viral conjunctivitis, with the herpes trap** (C16) | "Pink, watery, spreading to the other eye; had a cold" | Follicles; **tender node in front of the ear**; **no dendrites** on fluorescein (→ Stain Detective) | Adenoviral keratoconjunctivitis | T4: hygiene, supportive care | Rule out herpes **before** any steroid; a dendrite means steroids are contraindicated |
| 6 | **Corneal abrasion** (C19) | Parent: "Toddler's fingernail; can't open my eye" | VA 20/40; bright green defect under cobalt blue; **flip the upper lid** to look for a foreign body; **Seidel test negative** (→ Stain Detective) | Traumatic abrasion | T1: antibiotic, **no patching**, never give numbing drops to take home | Metal-on-metal injury means scan for a foreign body inside the eye (**no MRI**) |
| 7 | **Contact lens ulcer** (C20) | Sleeps in contacts: "Red, painful, light kills it" | VA 20/200; **dense white infiltrate with staining defect**; cells in the front chamber ± pus layer (→ Light Sculptor) | Bacterial keratitis (Pseudomonas) | T1: culture; hourly fluoroquinolone; same-day cornea specialist | "1-2-3 rule" for culturing; tap-water exposure raises Acanthamoeba risk |
| 8 | **Anterior uveitis** (C22) | "Deep ache, light unbearable, even in my *other* eye" | VA 20/30; **ring of redness around the iris**; **cells 2+, flare 1+**; fine deposits on the back of the cornea; small pupil; low eye pressure (→ Cell Counter) | Non-granulomatous anterior uveitis (likely HLA-B27) | T1: steroid drops plus dilating drops | Morning back stiffness is the clue in the history |
| 9 | **Acute angle closure** (C23) **BOSS** | Hyperopic woman over 60: "Pounding eye at the cinema, vomiting, rainbow halos" | VA 20/200; **eye pressure 58**; hazy cornea; **pupil mid-dilated and fixed**; other eye's angle very narrow (Van Herick grade 1) (→ Kiss the Arcs, Van Herick Ruler) | Acute primary angle-closure crisis | **T0:** pressure-lowering drops plus acetazolamide, then laser iridotomy in **both** eyes | Often misdiagnosed as migraine or a stomach bug. If caused by topiramate: **no pilocarpine and no laser iridotomy.** |
| 10 | **Open-angle glaucoma** (C24) | "No problems, just new readers" | Eye pressure 27/22; thin cornea **515 µm**; cup-to-disc **0.75 vs 0.5**; **notch in the lower rim**; disc haemorrhage; **upper arcuate field defect** (→ Cup Guesser, Kiss the Arcs, Pathway Sniper) | Open-angle glaucoma, right eye | T3: prostaglandin drops or laser trabeculoplasty | Silent disease; finding combo "Glaucoma Triad" |
| 11 | **Cataract** (C25) | "Starbursts at night… I can read without glasses again!" | VA 20/50; **glare test drops it to 20/100**; **myopic shift** of −1.50; yellow-brown lens; **no RAPD** (→ Light Sculptor retroillumination) | Nuclear ± posterior subcapsular cataract | T3: surgery when it affects daily life | "Second sight" myopic shift; cataract never causes an RAPD |
| 12 | **Diabetic retinopathy with macular swelling** (C26) | 12 years of type 2 diabetes, HbA1c 9.8%: "Blurry reading" | VA 20/50 with no pinhole gain; tiny bulges and blot haemorrhages in 4 quadrants, hard exudates, beaded veins; **fluid on OCT** (→ Fundus Safari) | Severe NPDR with centre-involving macular swelling (4-2-1 rule) | T2: retina referral for anti-VEGF injections; work with the primary-care doctor | Check the iris for new vessels |
| 13 | **Wet AMD** (C29) | Over 70: "Door frames look bent; grey smudge" | VA 20/200; **Amsler grid shows distortion and a blind spot**; blood under the retina; **fluid on OCT** (→ Warp Hunter, Fundus Safari) | Neovascular AMD | T1–T2: urgent anti-VEGF | Rule out central serous retinopathy and macular hole; dry-to-wet conversion makes a good returning-patient arc |
| 14 | **Retinal detachment** (C31) **BOSS** | Patient who had cataract surgery: "Flashes, floaters, now a shadow rising from below" | VA 20/25 (**macula still attached**); **lower field defect**; pigment specks in the vitreous (Shafer sign); **horseshoe tear** in the upper outer retina (→ Mirror World, Pathway Sniper) | Rhegmatogenous retinal detachment, macula still attached | **T0:** same-day retina surgeon | Pair with PVD (C30) as an interleaved look-alike: pigment or blood in the vitreous raises tear risk from about 15% to 50–70% |
| 15 | **CRAO, "eye stroke"** (C32) **BOSS** | Over 60 with atrial fibrillation, off blood thinner: "A blind came down an hour ago" | Can only count fingers; **dense RAPD**; **whitened retina with a cherry-red spot**; plaque in an artery (Hollenhorst) (→ Swing Shift, Fundus Safari) | Embolic CRAO | **T0:** stroke-centre ED now (AHA 2021); ESR/CRP if over 50 | Eye massage and similar measures are unproven; the stroke centre is the right answer |
| 16 | **GCA** (C36) **BOSS** | Over 70: "Lost vision this morning; jaw hurts when I chew; scalp tender" | Sees only hand movements; **RAPD**; **chalk-white swollen disc**; high ESR and CRP (→ Swing Shift, Fundus Safari) | Giant cell arteritis with arteritic optic nerve damage | **T0: steroids now, before the biopsy**, to protect the other eye | Ask the GCA questions of everyone over 50 with vision loss |
| 17 | **Pupil-involving third-nerve palsy** (C08) **BOSS** | "Eyelid dropped, double vision, worst headache of my life" | Drooping lid; eye **down and out**; **7 mm pupil, poorly reactive** (→ Swing Shift, Puppet Master) | Compressive third-nerve palsy, aneurysm until proven otherwise | **T0:** ED for CT angiography | Contrast with Horner's (small pupil) and myasthenia (pupil never affected) |
| 18 | **Optic neuritis** (C35) | Woman, 18–45: "Dim, washed-out colours, pain on eye movement" | VA 20/100; **RAPD**; **reds look faded**; colour plates 3/14; central blind spot; disc normal (→ Swing Shift, Dot Matrix) | Demyelinating optic neuritis | T1: MRI within 24–48 h; IV steroids speed recovery | MS risk at 15 years is 25% with a clean MRI vs 72% with any lesion. Contrast with NAION (painless, altitudinal field loss). |
| 19 | **Convergence insufficiency** (C06) | Teenager: "Words swim after 10 minutes" | **Exo 10Δ at near**, straight at distance; **convergence break 12 cm** (abnormal ≥6); poor fusional reserve; symptom score 28 (→ Catch the Flick, The Squeeze) | Convergence insufficiency | T4: 12 weeks of in-office vergence therapy (CITT trial) | Pencil push-ups alone are less effective |
| 20 | **Anisometropic amblyopia** (C05) | Parent: "Failed the school chart; never complained" | VA OD 20/20, OS 20/80, **no pinhole gain**; eyes straight; reduced 3D vision; cycloplegic OS +3.50 −1.00×090; **normal red reflex, no RAPD** (→ Line Hunter, Chase the Glow) | Left anisometropic amblyopia | T3: glasses first (77% of children improve), then patching 2 h a day | Amblyopia is a diagnosis of exclusion: rule out retinoblastoma, cataract and RAPD |

**Wave 2 candidates:** astigmatism (C03), PVD (C30), hypertensive emergency (C27), papilledema / IIH (C34), keratoconus (C21), colour vision deficiency (C37), sixth-nerve palsy (C09), fourth-nerve palsy (C10), accommodative esotropia (C07), blepharitis (C12), stye vs chalazion (C13), bacterial conjunctivitis (C15), subconjunctival haemorrhage (C17), pterygium (C18), dry AMD (C28), CRVO (C33), hyperopia (C02).

**Case data format:** one JSON file per case, matching the brief 02 schema: `id, category, tier, demographics, chiefComplaint, historyQA[{q,a,isKey}], findings{…}, differentials[{dx,discriminator}], diagnosis, management[], redFlags[], education[], sources[]`. Write all text in our own words with citations. **EyeWiki forbids copying its text or feeding it into AI programs.**

---

## 6. Clinical claims flagged as doubtful (for optometrist review)

**Must fix before shipping:**
1. **Goldmann dye direction is reversed** (brief 03, §6). The brief says too much fluorescein gives wide arcs and a *low* reading, and too little gives thin arcs and a *high* reading. Standard teaching is the opposite: **thick arcs over-estimate pressure and thin arcs under-estimate it.** Check against the brief's own cited source ([Moran CORE](https://morancore.utah.edu/wp-content/uploads/2025/11/Goldmann-Tonometry.pdf)) before building Kiss the Arcs.
2. **Virtual Refractor evidence is reported two different ways.** Brief 01 says users were "significantly more accurate and 13% faster on first real patients" (n=24). Brief 03 says users "felt more knowledgeable and confident". Read [the trial](https://www.tandfonline.com/doi/abs/10.1111/cxo.12800) before quoting either in marketing.

**Should check (set these as config values, not hard-coded):**

3. **Corneal light reflex conversion** (brief 03, §9): "1 mm ≈ 7° ≈ 15Δ" is the classic figure, but many modern sources use about 12° (about 22Δ) per mm.
4. **Convergence insufficiency symptom cutoff** (C06): ≥16 applies to children. The usual adult cutoff is ≥21, which matters if we add adult or post-concussion cases.
5. **DEWS III wording** (C11): "a disease, not a syndrome" is presented as new, but DEWS II (2017) already called dry eye a disease. Confirm the exact DEWS III definition change.
6. **CVOS vein-occlusion conversion** (C33): "15% *of those* converted within 4 months" is likely a misreading. CVOS reports about 15% *of all* non-ischemic eyes converting by 4 months, and 34% by 3 years.
7. **Myopia vision vs prescription** (C01): 20/80 uncorrected for −1.75 D is on the optimistic side (about 20/100–20/150 is more typical). The game's blur model (brief 03, §2) must keep prescription and vision consistent across all cases.
8. **Duochrome endpoint by age** (brief 03, §2): "young patients slightly in the green, older patients slightly in the red". Sources disagree on this, and it conflicts with the "maximum plus" principle. Needs an expert ruling. Also choose a duochrome vision cutoff: 20/30 or 20/40.
9. **Tier mismatch:** optic neuritis (C35) is tier T1 (≤24 h), but its plan says "24–48 h". Align the tier definitions with the plans before scoring urgency.
10. **Amsler geometry** (brief 03, §12): a 5 mm square subtends 1° at about 28–30 cm, not 33 cm (at 33 cm it is about 0.87°).
11. **Open questions already flagged by the briefs:**
    - about 15 items marked `[verify]` in brief 02 (e.g. hyperopia threshold for amblyopia, add-power table, AAO diabetic follow-up intervals, ADA screening, ONTT oral prednisone, management of topiramate-induced angle closure)
    - all `[GK]` items in brief 03, §17 (cover-test vertical directions, palsy signatures, gaze–muscle map, minus-lens amplitude formula, convergence target speed)
    - source conflicts: Van Herick grade 3 cutoff, convergence-insufficiency NPC cutoff of 6 vs 10 cm, pilocarpine 0.1% vs 0.125% for Adie's pupil
12. **Scope:** what optometrists may prescribe differs by US state and by country. Keep management as decision categories, with regional detail optional.

**Design caveats (not clinical):**
- The 70–85% target success rate is an assumption.
- The ECG interleaving figures (46% vs 30%) come from a secondary source.
- The Balatro timing numbers are a reconstruction by a third party.
- On-screen colour plates must carry a "not a diagnostic test" disclaimer.

---

## 7. Next steps

1. The optometrist reviews **§6 items 1–10** and the 20 launch cases in §5. This is the critical path.
2. Engineering scaffolds the three plugin types: the case JSON format, the `TestModule` interface and the sin `EngagementModule`, all connected by the event bus. Add a CI test that removes every sin module and confirms the game still runs.
3. Build the Wave 1 mini-games in §4.2 rank order, starting with Fundus Safari, Objection!, Swing Shift, Light Sculptor, the Phoropter and Kiss the Arcs.
4. Someone checks Reddit (r/optometry, r/optometryschool) by hand for sentiment and feature requests.
