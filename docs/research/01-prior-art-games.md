# 01 — Prior Art: Games, Simulators & Gamified Tools for Optometry / Ophthalmology

Research date: 2026-11-24. Method: ~45 web searches plus direct page fetches of key competitors. Every item has a URL. Where a claim comes from vendor marketing or an app store listing, it is marked **(vendor)**. Reddit could not be crawled by our tooling (blocked), so forum sentiment comes from other places: itch.io comments, trade press, focus groups and faculty quotes.

Legend for **Visual quality**: 1 = text/static images, 2 = basic 2D UI, 3 = polished 2D/3D, 4 = high-fidelity 3D/VR, 5 = AAA/cinematic. Nobody in this space scores 5.

---

## TL;DR

1. The field is **fragmented into four islands**, and nobody joins them:
   - (a) hardware VR simulators: Eyesi, about $$$$, institution-only
   - (b) single-skill web simulators: AAO retinoscopy and strabismus sims, EyeScholar, Virtual Refractor
   - (c) quiz and question banks: KMK, OptoPrep, StatPearls, eyeStudy, Optometry+
   - (d) short daily-puzzle sites: OptoConnections and playopto, the closest direct competitors
2. The **closest conceptual match** to our game is Dr Tina Gao's (Univ. of Auckland) narrative "choose-your-own-adventure" eye-exam video game from 2020. It was a prototype pending funding, and we found no public release.
3. **No one has shipped** an animated, character-driven clinic game that does all of the following:
   - patients walk in with complaints
   - the player picks tests, each test played as a mini-game
   - the player reaches a diagnosis and a management plan
   - the game has AAA-tier presentation and a deliberate, deep engagement and progression system
4. The academic evidence is **small-n but consistently positive**:
   - Optometry board game equals lectures (PLOS ONE 2016).
   - Virtual Refractor improved accuracy and speed.
   - Virtual Ophthalmology Clinic RCT, n=188: +7.5% gain, retained at 12 months.
   - Gamified eye-trauma RCT was positive.
5. The **demand signal is real**:
   - Gao reports students asked for "many more features".
   - LVPEI rolled out game-based learning across 4 campuses (2025).
   - 93% of Deakin pre-clinical students said virtual simulation motivated them.
   - OptoConnections has paying subscribers (founder-reported).

---

## A. Direct competitors: game-like learning products for optometry students

### A1. OptoConnections (soon "OptoArc"). Daily games plus NBEO Part III simulator
- URL: https://www.optoconnections.com/ ; case study: https://www.pretectal.com/our-work/optoconnections
- Built by: Eugene Huang, OD (PreTectal LLC).
- What it does: 11 daily micro-games that reset at midnight ET. The games are:
  - Connections (group 16 eye terms into 4 hidden categories, NYT-style)
  - What's the Dx? (clue-reveal case)
  - Daily Question (NBEO Part I)
  - Daily Optics (recall an equation)
  - What's the Tx?, What's the Structure?, What's the Drug?
  - What's the OCT? (read a macular B-scan)
  - What's the C/D? (grade the optic nerve, then check it against OCT)
  - What's the Field? (order the right visual field, read the printout, localize the lesion)
  - What's the Deviation? (cover-test a patient, name the deviation, measure it with prisms)
- It also has an NBEO Part III simulator: 70 timed cases (interview, findings and ancillary tests, diagnosis and plan, rubric score), plus 5 skills-station sims and 2,000+ Part I questions.
- Pricing: free = any 4 daily games, 3 cases and 54 questions. Plus = $11/mo (yearly). Sprints = $149 for 3 months.
- Visual quality: 2. Clinical images in a web UI, with no characters or animation described.
- Good:
  - The daily ritual ("dle" model) builds habit.
  - "What's the Field?" and "What's the Deviation?" are real procedural mini-games.
  - The Part III simulator already chains history, tests, diagnosis and plan.
- Bad / gaps:
  - Utilitarian look and no narrative world.
  - The games are separate and do not run inside one patient journey.
  - No characters, progression meta, collection, or social rivalry beyond scores.
  - No disclosed traction ("No subscriber count … claimed").
- **Threat level: highest.** This is the most similar content scope. We beat it on presentation, narrative, a unified patient-visit loop, and the engagement system.

### A2. playopto. "100+ optometry games"
- URL: https://www.playopto.com/
- What it does: bite-sized browser games covering clinical cases, theory and skills. It includes card-game decks ("Play Your Cards Right"), image-based visual games added regularly, and a nickname-based entry screen.
- Pricing: subscription "Passport", claimed at about $0.25 per game per month. Prices rise 1 Jan 2027 (a lock-in-the-price push).
- Engagement: score tracking and a leaderboard. No streaks are mentioned.
- Visual quality: 2. Playful copy with emojis, and the site recommends a laptop for the best visuals.
- Gaps: a catalogue of disconnected minigames with no story or patient arc, and the creator is not named. Its sample titles (e.g. "Fruit Facts Face-off!", "Vroom or Doom?") suggest a general-knowledge trivia skin.

### A3. eyeStudy (iOS, Mac, Vision Pro). Multiplayer optometry case-quiz
- URL: https://apps.apple.com/app/id6761190625 ; tracker: https://appgoblin.info/apps/6761190625
- Dev: Hoang Harry Tran. Free and ad-supported. Released about March 2026, with 1 rating.
- Mechanics:
  - Clues reveal one at a time, and an earlier correct diagnosis earns more points.
  - **Confidence betting** (risk/reward), plus streak and speed bonuses.
  - Elo-ranked matches with Bronze-to-Diamond tiers and real-time multiplayer rooms.
  - 100 cases across 10 categories (cornea, retina, glaucoma, neuro, etc.).
- Visual quality: 2.
- Good: the strongest *competitive and social* mechanics in the space. Elo plus confidence wagers map directly to Pride, Greed and Envy.
- Gaps: no animation, no procedural tests, a small case bank, and almost no traction.

### A4. Optometry+ / "Master Optometry: Eye Care Quiz"
- URL: https://apps.apple.com/us/app/optometry/id6740626410
- What it does: multiple-choice and image questions with difficulty tiers and explanations, aimed at NBEO prep. Free with IAP. Visual quality 1–2. A pure quiz, with no simulation.

### A5. Univ. of Auckland: Dr Tina Gao's narrative optometry video game (prototype)
- URLs: https://nzoptics.co.nz/live-articles/optometry-learning-via-gaming/ ; https://www.eyeonoptics.co.nz/live-articles/optometry-learning-via-gaming ; image: https://sovs-newsletter.blogs.auckland.ac.nz/?p=966
- Date: 6 Sep 2020.
- Mechanics:
  - The player goes through a full eye exam as a "choose your own adventure".
  - The player picks tests, forms a differential, and manages the case.
  - The design "forc[es] students to balance the thoroughness of their clinical testing with time-keeping requirements".
  - Feedback comes through patient outcomes.
- Origin: a School of Pharmacy prototype. Gao: "it's the first video game specific for optometry teaching."
- Status: tested with staff and students, who asked for "many more features". Australian schools were interested. A shared case library was planned "pending further funding". **We found no public release.**
- Visual quality: unknown (not shown).
- Relevance: **This is our exact core loop** (patient arrives, test selection under time pressure, diagnosis, outcome). It validates demand and shows the idea is unclaimed commercially.

### A6. Univ. of Melbourne: "Trident!" (classroom game)
- URL: https://melbourne-cshe.unimelb.edu.au/events/past-events/teaching-and-learning-conference-and-summit/2021/presentations/engaging-students/trident
- A competitive case-study revision tutorial for 2nd-year OD students, run since 2017. Its theme is a "race" between infection onset and immune defences, with academics moderating. Analog with no software. It shows that the race and competition framing works.

### A7. Optometry Knowledge Challenge (board game, RCT)
- URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC4883760/ (PLOS ONE 2016)
- 42 students in GPA-matched groups: 12 h of game vs 12 h of interactive lecture, with **equal effectiveness**.
- Cards hold 4 questions each (Basic Sci, Vision Sci, Optics, Disease), with a faculty moderator.
- The paper notes PubMed had **only one prior citation** on games in optometry (a computer sim for test selection and lens prescribing). It also cites prior findings that games can cause stress or embarrassment for low performers. This is a design warning for our Pride and Envy levers.

### A8. CORE Knowledge (Univ. of Waterloo CORE). Eye-science trivia
- URLs: https://core.uwaterloo.ca/news/feed-your-addiction-play-the-ultimate-eye-science-game-now-free-online/ ; https://uwaterloo.ca/optometry-vision-science-newsletter/news/core-debuts-core-knowledge-game-arvo-2018 ; AAO edition: https://core.uwaterloo.ca/?p=8663
- Two-minute rapid-fire MCQ rounds with public top scores. More than 14,000 questions were answered at ARVO 2018, and about 15,000 across 1,100 games at AAO 2022.
- The headline literally says "**Feed your addiction!**", so the field already markets addiction explicitly.
- Visual quality: 2. Gaps: trivia only, plus conference-booth gimmick energy.

### A9. "The Disease Game" (legacy computer simulation)
- URL: https://core.ac.uk/works/61674184
- A computer simulation for practising test selection, diagnosis and management, with digitized images and videos and the ability to add patients. Undated and legacy, likely the single early PubMed citation mentioned in A7. It proves the test-selection-as-gameplay idea is decades old but never got modern production value.

### A10. Hobby and jam prototypes (itch.io, GitHub)
- **Optometry (Prototype)**, J. Rosen. An RPG whose overworld changes with the glasses worn. https://jdrosen.itch.io/optometry
- **PROTOTYPE 3 – Optometry**, A. Kum. https://adriankum.itch.io/optometry
- **Optometrist Visit**, a Global Game Jam 2025 3D first-person tower-defense joke game. https://jamac.itch.io/optometrist-visit
- **A Visit to the Optometrist**, C. Noller (narrative). https://caleb-noller.itch.io/a-visit-to-the-optometrist ; https://rawg.io/games/a-visit-to-the-optometrist
- **視能訓練キット / MINNOW TRAINER**, tagged optometry (orthoptic training kit). https://soapod.itch.io/minnowtrainer
- **Blue**, a visual novel *with an eye-exam mini-game*. https://cromdog.itch.io/blue
- itch tag page: https://itch.io/games/tag-optical
- **hesto2/optometry-game** (GitHub, about 2014, JS, 0 stars, the author's first project). https://awesome.ecosyste.ms/projects/github.com%2Fhesto2%2Foptometry-game
- WinnerGames "Eyes On Me" devlog: an "eye simulator" where each joystick controls one eyeball, which they struggled to make fun. https://winnergames.itch.io/eyesonme/devlog/42797/devlog-still-very-indecisive
- Takeaway: indie devs find the optometrist visit *charming as a setting*, but every attempt is a jam toy with zero educational rigor.

---

## B. Single-skill clinical simulators (web, app, desktop)

| Name | URL | What / mechanics | Visual | Good | Gaps |
|---|---|---|---|---|---|
| **AAO Retinoscopy Simulator** | https://aao.org/interactive-tool/retinoscopy-simulator | Adjust sphere, cyl and axis to neutralize the streak reflex. Test mode randomizes refractive errors. Free web tool (2020). | 2 | Authoritative, free, real optics | Sterile, no patient, no scoring meta |
| **AAO Strabismus Simulator** and **Complex Strabismus Simulator** | https://aao.org/interactive-tool/strabismus-simulator ; https://www.aao.org/interactive-tool/complex-strabismus-simulator | Cover / alternate cover / prism cover tests on a virtual face. Complex version adds A/V patterns, CN palsies, Brown syndrome | 2–3 | A perfect mini-game template | Isolated tool, no narrative |
| **EyeScholar** (Todd Zarwell OD, EyeDock founder) | https://eyesoneyecare.com/resources/eyescholar-new-tool-learn-to-refract/ ; https://todd-zarwell.squarespace.com/apps | Refraction and retinoscopy tutorials plus simulators. Neutralize with trial lenses or a phoropter, then compensate for working distance. **Procedurally generated patients** (myopic, hyperopic, astigmatic, presbyopic, low VA) who give **ambiguous answers** ("This one is worse"). Plus or minus cyl. Paid. | 2–3 | Best refraction pedagogy, infinite patients, realistic unreliable responders | Looks like software, not a game. No motivation layer. |
| **Virtual Refractor** (Brien Holden Vision Institute / UNSW) | https://www.optometry.org.au/workplace/virtual-refractor-simulates-real-life-responses/ ; https://bhvi.org/news/simulated-learning-how-effective-is-it-in-refraction-training/ ; study: https://www.tandfonline.com/doi/abs/10.1111/cxo.12800 | Refractor head on virtual patients with profiles. **RCT (n=24): significantly more accurate (p<0.05) and 13% faster** on first real patients. Free to AU schools, later free. | 2 | Strongest evidence for a refraction sim | Dated, institution-oriented |
| **Interactive Refraction Simulator** (Randy Troppmann) | https://flic.kr/photos/randytroppmann/720084380 | Browser phoropter with 10 patients for optician students before lab | 2 (Flash-era) | Early proof of concept | Abandoned-era tech |
| Korean virtual refraction study (2008) | https://koreascience.kr/article/JAKO200817760586109.page?lang=en | Virtual vs practical refraction scores correlated R=0.71 (n=24) | — | Validates virtual refraction as a proxy | — |
| **Digital Phoropter** (iPad / Mac / Vision Pro) | https://apps.apple.com/app/id1555952495 | Phoropter-use trainer, free with a paid Full Access tier | 3 | Modern Apple-platform polish | Instrument drill only |
| **Pupil Wizard** (Jørstad & Lee, Hyper Games, Roche Norway grant) | https://pmc.ncbi.nlm.nih.gov/articles/PMC12089475/ ; https://apps.apple.com/mx/app/pupil-wizard/id6742019257 | Dynamic animated pupils (light, near, drugs) plus a quiz mode identifying random abnormalities. Free on iOS and Android. | 3 | **Animated pathophysiology** as content, built by a real game studio | Narrow scope (pupils only) |
| **mEyeSim / EyeSim** (A Nu Reality / EON, Anuradha Khanna MD) | https://apps.apple.com/app/id6738835751 ; https://apps.apple.com/us/app/id1203454236 | 3D anatomy, a virtual patient for pupils, EOMs and CN palsies, and a visual-pathway lesion sim. Mixed reality on iPad. $19.99 per 3 months. | 3–4 | Virtual patient exam, 3D | Lesson-ware, not a game |
| **OcuLearning** | https://apps.apple.com/us/app/oculearning-ophthalmology/id6766313098 | Ophthalmology and neuro-ophthalmology question bank around scenarios, interactive eye models, **new fundoscopy simulation**, Spanish version | 2–3 | Adding sims to a question bank | Few ratings |
| **Eye Assessment** (MedVR Education, Meta Quest) | https://www.meta.com/experiences/eye-assessment/9817233858385387/ ; https://vrdb.app/game/9817233858385387 | Step-by-step pupil light reflex, VA and EOM assessment in VR (released Jul 2025) | 3–4 | Consumer VR | Thin content, 1–2 reviews |
| **UNSW Eye Sim** and **UNSW cover-test sim** (Quest 3) | https://teaching.unsw.edu.au/node/5904 ; https://teaching.unsw.edu.au/node/5953 | Unity VR showing what myopia, hyperopia, astigmatism, CVD, glaucoma and RD look like. The cover-test proof of concept was "very well received" | 3–4 | Empathy view (see through the patient's eyes) | Internal, proof-of-concept stage |
| **UCL / Moorfields VR / AR vision-loss simulator** | https://theophthalmologist.com/subspecialties/personalizing-reality | Simulates others' vision, in a trial vs textbook with City Univ. optometry | 4 | Empathy plus evidence | Not a game |
| **Univ. of Alberta VR vision-loss game** | https://www.ualberta.ca/medicine/news/2019/october/vr-game-gives-users-eyes-on-experience-with-vision-loss.html | VR game that gives "eyes-on" experience of vision loss | 3–4 | Gamified empathy | Patient-perspective only |
| **Birmingham City Univ. VR Ophthalmology** (Wilson et al.) | https://www.bcu.ac.uk/research/computing/digital-media-technology/research-projects/virtual-reality-opthalmology-training ; https://link.springer.com/content/pdf/10.1007%2F978-3-319-70111-0_15.pdf ; https://www.open-access.bcu.ac.uk/15273/1/A%20Structured%20Approach%20to%20the%20Development%20and%20Evaluation%20of%20a%20Virtual%20Reality%20Eye%20Examination%20Simulation.pdf | Cardboard-VR **mini levels**, each teaching one exam step. Randomly shown fundus images (normal, CWS, disc swelling, haemorrhage) to identify. n=15: enjoyable (15/15), would use again (13/15). More than 1,000 downloads. | 3 | **"Mini levels" as the structure**, cheap hardware | 2017-era, tiny content |
| Virtual-pathway tools | Genially lesson https://view.genially.com/69106c2acc850187bd3595d3/interactive-content-visual-pathway-lesions-interactive-lesson ; TU Wien thesis https://www.cg.tuwien.ac.at/research/publications/2023/antes-2023-vhv/antes-2023-vhv-.pdf ; UNMC https://www.unmc.edu/elearning/egallery/neuro-ophthalmology-anatomy-part-i-the-visual-pathway-and-pupillary-control/ ; Utah "Localize the Lesion" https://novel.utah.edu/test-your-knowledge/?p=92 | Click a lesion to see the field defect, or infer the lesion from the field | 2 | A ready-made mini-game concept | Bland |
| Contact-lens fitting | PolyU platform https://www.polyu.edu.hk/so/Study/Teaching-Facilities-and-Innovations/Teaching-Innovations/Interactive-Web-based-Learning-Platform-for-Contact-Lens-Education ; Berkeley OPTICAL fluorescein sim https://people.eecs.berkeley.edu/~ddgarcia/optical/suite.html ; BMC 2025 virtual CL sim https://pmc.ncbi.nlm.nih.gov/articles/PMC11892242 ; SimuLENS https://linkedin.com/company/simulens | 126 fitting videos and 372 photos (PolyU). Fluorescein pattern simulation. Virtual sim improved the student experience. | 2–3 | Fluorescein-pattern matching is an ideal mini-game | No game wrapper |

## C. High-fidelity hardware simulators (institutional, expensive)

- **Eyesi Direct / Indirect / Slit Lamp** (VRmagic, now Haag-Streit)
  - Links:
    - https://us.haag-streit.com/products/categories/simulators-training/training-simulators/eyesi-direct
    - https://us.haag-streit.com/products/categories/simulators-training/training-simulators/eyesi-slit-lamp
    - SLT module: https://theophthalmologist.com/issues/2026/articles/april/haag-streit-simulation-releases-eyesi-slit-lamp-slt-module?d=report
  - The simulators score % of retina examined, light exposure, pathology found and diagnosis accuracy. Minimum scores gate progression.
  - The vendor says **more than 450 schools** use them (vendor).
  - Evidence:
    - Randomized study with 168 medical undergraduates: https://pmc.ncbi.nlm.nih.gov/articles/PMC9927962
    - 2025 study, n=122: 98% confident and 100% recommend it. https://pmc.ncbi.nlm.nih.gov/articles/PMC12743621/
    - Delphi study defining 32 essential modules: https://link.springer.com/10.1007/s40123-025-01175-2
  - Univ. of Houston simulation lab: 200+ pathology cases from real retinal photos, with quizzes gating each case. https://uh.edu/news-events/stories/2014/October/101714OptSimLab
  - **Lesson for us:** their *scoring rubric* (coverage %, light toxicity, findings completeness) is the right model for our ophthalmoscopy mini-game score. Their *visual realism* is the benchmark we must evoke in 2D/3D at zero hardware cost.
- **OptoSim** (UK, hardware plus software). Named only in the College of Optometrists' July 2025 overview of simulated learning, which also notes simulators "can lack realism" and take faculty time to administer. https://www.college-optometrists.org/qualifying/sector-partnership-optical-knowledge-education/topic-of-the-month/july-2025-simulated-clinical-learning
- AOP feature on simulators in UK optometry training: https://www.aop.org.uk/ot/100-percent-optical/2024/03/15/utilising-simulator-technology-for-optometry-training
- 2024 XR-in-optometry-education review: https://informahealthcare.com/doi/full/10.1080/08164622.2024.2366366

## D. Virtual patients, AI patients and OSCE trainers

- **Virtual Ophthalmology Clinic** (Univ. of Sydney, Succar & Grigg)
  - Web virtual patients (AMD, glaucoma, DR, foreign body, blepharitis…) with an emphasis on history-taking and clinical reasoning.
  - **RCT, n=188:** 17.5% vs 10% gain (P<0.001), and about 8% higher at 12-month follow-up.
  - https://pubmed.ncbi.nlm.nih.gov/23867718/ ; https://www.nature.com/articles/eye2013143
- **PolyU Virtual Eye Clinic (vEyeC)**
  - Chatbot simulated patients answer typed questions with text, images or video.
  - Students submit a diagnosis and plan, then see and comment on peers' answers (a social forum).
  - https://polyu.edu.hk/so/Study/Teaching-Facilities-and-Innovations/Teaching-Innovations ; https://www.polyu.edu.hk/edc/celebrate-teaching-excellence/good-practice-showcase/the-good-practices-shared-by-the-48-polyu-teachers/dr-jessica-neuville/
- **Aston Univ. 2025: SimConverse AI patient plus Eyesi slit lamp**
  - n=16 final-years. The SimConverse AI patient was rated about equal to a human actor, and ChatGPT was rated lower.
  - https://publications.aston.ac.uk/id/eprint/48126 ; SimConverse board-exam prep: https://www.healthysimulation.com/simconverse-ai-communication-training-optometry-board-exams/
- **Virtual patients vs standardized patients** (ophthalmology residents RCT, Pakistan): safe for learning clinical reasoning. https://pmc.ncbi.nlm.nih.gov/articles/PMC11034047
- Simulated eye clinic and virtual eye case for medical students: https://www.pubmed.gov/35514871/
- Cardiff simulated-patient resource for low-vision teaching (2025): https://www.dovepress.com/the-development-and-implementation-of-a-simulated-patient-resource-for-peer-reviewed-fulltext-article-OPTO
- General medical analogues:
  - IU ChatGPT-4o synthetic OSCE patients: https://journals.indianapolis.iu.edu/index.php/IMPRS/article/view/29650
  - MedSimAI / LLM virtual-patient agents: https://arxiv.org/html/2508.13943v1
  - Body Interact: https://web.bodyinteract.com/WebGL
- **Gap:** no AI-patient tool wraps the interview in an animated, emotive character inside a game loop.

## E. Question banks, flashcards and board prep (the "grind" incumbents)

- **KMK.** Claims 20+ years and use by "98% of optometry students" (vendor), with a 5,000+ question Part II bank. https://boards.kmkoptometry.com/ ; app: https://apps.apple.com/us/app/id1645627925
- **OptoPrep.** 2,400+ Part I questions, missed questions recycled, PowerPix image review, simulated exams, pass guarantee (vendor). https://optoprep.com/pricing.jsp ; https://optoprep.com/faq.jsp ; apps: https://apps.apple.com/us/app/optoprep-nbeo-part-ii/id1454988797
- **StatPearls NBEO banks.** About 3,000 Part I and about 1,100 Part II questions, linked to PubMed. https://statpearls.com/boardreview/Optometry%20-%20Applied%20Basic%20Science
- Optometry Boards Prep app: https://apps.apple.com/app/id1594439700
- Crack OAT: https://apps.apple.com/us/app/id1323462344
- OAT Cram Cards: https://apps.apple.com/app/id962939170
- Brainscape Optoprep decks: https://www.brainscape.com/subjects/optoprep
- Ophthalmology:
  - EyeRounds Anki (Iowa): https://eyerounds.org/anki_cards/anki_home.html
  - AAO Ophthalmic Knowledge Flashcards (1,800+, Anki format): https://AAO.ORG/flashcards
  - OphthoCards (streaks and daily goals): https://apps.apple.com/us/app/ophthocards/id6743734600
  - EyeGuru: https://www.healio.com/news/ophthalmology/20180302/top-five-principles-for-successful-learning-in-both-residency-as-well-as-practice
- Image quizzes:
  - MCW retina quiz: https://www.mcw.edu/departments/ophthalmology-eye-institute/education/mcw-eye-review/retina-quiz
  - neuroophthalmology.ca quiz: https://www.neuroophthalmology.ca/quiz
  - iEye Retina: https://www.148apps.com/app/435981288/
- Technician vocabulary games (COA / COT word-search and match, free, unofficial): https://open-exam-prep.com/games/coa-ophthalmic?game=match ; https://open-exam-prep.com/games/cot-ophthalmic
- Michigan Kellogg "The EyesHaveIt" reference and quiz app: https://kellogg.umich.edu/theeyeshaveit/app.html
- **Takeaway:** students *already* spend money and hours on low-joy grinding. The spaced repetition and recycled-misses mechanics are table stakes; we should absorb them and make them feel like play.

## F. Adjacent general-medicine game benchmarks (mechanics to steal)

- **Full Code Medical Simulation.** 200–260+ cases, 23 avatars, hundreds of possible actions per case, full score and debrief, CME credit at 85% or above, €49.99/yr Pro. https://apps.apple.com/bb/app/full-code-medical-simulation/id1207424206 ; https://fullcodemedical.com/?p=188
- **Prognosis: Your Diagnosis** (Medical Joyworks). Weekly new cases, 33 specialties, choose-the-next-step scoring with explanations. https://apps.apple.com/us/app/id392489854
- Clinical Sense: https://apps.apple.com/us/app/id856082326
- **DiagnosUs.** A medical-image labeling game (including fundus photos) with cash prizes funded by AI partners. That is Greed-as-a-mechanic in practice. https://apps.apple.com/us/app/diagnosus/id1369759559
- **MedSteps.** "Duolingo for medicine": XP, streaks, achievements, leaderboards, AI questions. https://apps.apple.com/app/id6758428604
- Osmosis: https://apps.apple.com/us/app/id646540641 ; 2013 gamification history: https://www.imedicalapps.com/2013/09/osmosis-app/
- Lecturio: https://apps.apple.com/us/app/-/id1067957933
- Picmonic: https://apps.apple.com/xk/app/picmonic-medical-school-study/id1468103617
- Atrium Medical Learning Game: https://play.google.com/store/apps/details?id=ai.atriumlab.atom
- **Daily "dles":**
  - Doctordle: https://www.producthunt.com/products/doctordle
  - dr dle: https://www.producthunt.com/p/dr-dle
  - Medicle: https://awesome.ecosyste.ms/projects/github.com%2Fllleeeaaannn%2Fmedicle
  - Overview: https://www.iatrox.com/blog/wordle-for-doctors-medical-guessing-games
  - **None of them is eye-specific** apart from OptoConnections' "What's the Dx?".
- **Two Point Hospital** (commercial). Its diagnosis is a multi-room funnel with certainty %, and comedic illnesses. It is a genre reference for charm, readability and the "diagnosis certainty bar". https://www.gamepressure.com/two-point-hospital/illnesses/zab413

## G. Kids', consumer and patient-facing eye games (not educational for clinicians)

- Kids' eye-doctor role-play games:
  - Hospital Games: Eye Doctor: https://apps.apple.com/us/app/id1260501790
  - Eye Eye Doc: https://apps.apple.com/us/app/eye-eye-doc/id1630715284
  - Eye Doctor – Kids games: https://apps.apple.com/us/app/eye-doctor-kids-games/id725520278
  - I am Eye Doctor: https://apps.apple.com/us/app/-/id1044147911
  - Eye Hospital!: https://apps.apple.com/mu/app/eye-hospital/id1562484650
  - Baby Hazel Eye Care: https://apps.apple.com/us/app/id1046834345
  - Eye Care Surgeon (Microsoft Store): https://microsoft.com/en-gb/p/eye-care-surgeon-doctor-games-for-kids/9nblggh4rt4l
  - They are cartoon "check eyesight, pick glasses, remove goo" toys with medically meaningless mechanics. They **prove the visual fantasy (being the eye doctor) appeals to mass audiences**.
- **Blink Land** (AOA + Playcrafting, Jun 2023). An eye-avatar board game with true/false eye-health trivia and 20-20-20 tips. About 8 months of development and about 1,500 downloads at report time. https://associationsnow.com/2023/08/american-optometric-association-creates-mobile-game-to-promote-eye-health/ ; https://www.aoa.org/about-the-aoa/press-room/press-releases/the-american-optometric-association-launches-first-ever-eye-friendly-mobile-board-game-blink-land ; https://apps.apple.com/app/blink-land/id6447594705
  - A professional body invested in a game but got low traction. The lesson: the game itself must be good, not merely well-intentioned.
- Therapy and screening games:
  - Luminopia (FDA De Novo 2021, VR amblyopia therapy): https://mobihealthnews.com/node/150931
  - Ubisoft / Amblyotech Dig Rush (binocular amblyopia game, mixed PEDIG results): https://www.gamedeveloper.com/mobile/two-ubisoft-games-could-soon-be-fda-approved-to-treat-amblyopia ; https://aao.org/eyenet/article/binocular-amblyopia-therapies
  - EyeSpy 20/20 (gamified vision screening): https://www.fastcompany.com/3019023/eyespy-gamifies-the-vision-test
  - RightEye: https://fortune.com/2016/01/05/righteye-vision-video-game/
  - Retinal-disease-monitoring video game patent: https://patents.google.com/patent/US9039182B2/enExample
  - These are a useful source of **"the eye as a game input"** mechanics (dichoptic presentation, contrast thresholds) for mini-games.
- **Odin's Eye** (FAU Erlangen, 2020). A fundus-image *labeling* game on ODIR data: normal vs pathology, and a "Difficult Mode" that groups 3 matching images while a descending curtain darkens the images to add pressure. Android and WebGL builds. https://zenodo.org/record/4603765 ; https://www.egms.de/static/en/meetings/gmds2020/20gmds184.shtml
  - Its **time-pressure curtain** is a neat Wrath / urgency device.

## H. Academic literature on gamification in eye-care education

- PLOS ONE 2016 optometry board game RCT, equal to lectures: https://pmc.ncbi.nlm.nih.gov/articles/PMC4883760/
- Gamified VR eye-trauma teaching RCT (10 residents, 60 medical students), effective as a complement: https://pubmed.ncbi.nlm.nih.gov/39420268/
- Systematic review of AR, VR and game tech in ophthalmology training (Information 2022). It notes a lack of educational reviews. https://www.mdpi.com/2078-2489/13/5/222/htm
- Health-professions gamification systematic review (2020). Gamification improves outcomes, especially via attributes that change learning behaviours. https://link.springer.com/doi/10.1007/s10459-020-10000-3
- SOLO-taxonomy review of gamified medical education 2012–2022: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10765768/
- Game-based learning in medical education: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10020233/
- LVPEI F1000Research 2026, "Game-based Learning in Eye Health Education – The Developmental Challenges of E-learning Games". Three focus groups (ophthalmologists, optometrists, nurses, educators, game developers) produced a framework stressing motivation, engagement and retention. https://f1000research.com/articles/14-1390/v1 ; deployment across 4 campuses from March 2025: https://www.lvpei.org/news/new-game-based-learning-approach-implemented-for-training-programs/ ; https://www.lvpei.org/news/the-learning-game/
- Escape rooms:
  - Univ. of Houston optometry library escape room (95 first-years): https://weblogs.lib.uh.edu/hsl/?p=29
  - Alicante occupational-optometry escape room: https://library.iated.org/view/PERALES2020DES
  - Newcastle revision escape room (more than 80% attendance at an optional session; "didn't feel like work"): https://microsites.ncl.ac.uk/casestudies/wp-json/wp/v2/posts/11
  - Dharni ophthalmology escape room: https://eyenews.uk.com/features/ophthalmology/post/the-escape-room-and-gamification-of-ophthalmology-teaching
- Kahoot in ophthalmic optics (Spain 2019): https://library.iated.org/view/ESPINOSA2019MOB
- Deakin pre-clinical virtual simulation: 93% said it motivated them to become an optometrist, and 77% said it pushed them to learn beyond the course. https://link.springer.com/article/10.1186/s12909-022-03912-8
- Students building optometric tools (2025): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11976186/
- Model-eye vs simulation in optometric education (Huddersfield): https://pure.hud.ac.uk/en/publications/simulation-techniques-in-optometric-education-is-a-model-eye-for-/
- Aston "New developments in optometric training in the UK" (2025): https://publications.aston.ac.uk/id/eprint/47151

## I. People talking about wanting or proposing such games

- **Tina Gao (Auckland):** students and staff "asked for many more features", and she wants a shared case library across schools that funding has not yet covered. Source: A5.
- **LVPEI focus groups:** clinicians and game developers explicitly call for e-learning games for eye-health cadres, and report the hard parts are development cost, iteration and content validation. Source: H.
- **PLOS ONE authors:** "Very little has been published on the use of games as a teaching tool in optometry". They call for more high-quality research. Source: A7.
- **College of Optometrists (UK, Jul 2025):** simulated learning is now core to UK training reforms. Simulators "can lack realism" and are faculty-heavy, which is an opening for a self-running, fun tool. Source: C.
- **CORE (Waterloo):** markets trivia as "Feed your addiction!", which shows the field is open to addiction framing. Source: A8.
- **itch.io commenters** recall eye-doctor minigames and an "optometrist simulator using a slider instead of rotating a device". https://itch.io/post/5499472 ; https://itch.io/post/9197076
- **Indie devs** keep picking the optometrist visit as a jam theme (A10), which shows cultural recognisability.
- **Reddit (r/optometry, r/optometryschool):** our tooling is blocked from reddit.com, so this is unverified here. A follow-up should be done manually.
- **OptoConnections founder:** reports students pay for the product and fit it into daily study routines. Source: A1.

---

## White space: what nobody has done yet that our game can own

1. **The unified patient-visit loop as a game.**
   - Today the pieces are split up:
     - history-taking exists as chatbots (PolyU, Aston)
     - tests exist as isolated simulators (AAO retinoscopy and strabismus, EyeScholar, OptoConnections' field and deviation games)
     - diagnosis exists as quizzes (eyeStudy, What's the Dx?)
   - **Nobody chains them** so that each chosen test *is* a mini-game whose output feeds the diagnosis. The flow should be: an animated patient walks in, voices a complaint, the player picks tests, each test is played, findings come out, then a differential, then a diagnosis and plan, then the outcome.
   - Gao's 2020 prototype is the only attempt, and it is unreleased.
2. **Characters with emotion.**
   - Every clinical product uses static photos or faceless UIs.
   - No one has *animated, voiced, recurring patients* who react to good or bad care: relief, frustration, coming back worse when you miss an RD, sending a thank-you letter.
   - This is the emotional hook kids' games prove exists but that no clinical tool uses.
3. **AAA presentation at zero hardware cost.**
   - Fidelity is locked behind Eyesi (institution hardware) or VR headsets.
   - Browser tools sit at visual quality 2.
   - A polished, stylized 2.5D clinic is unclaimed: think Two Point Hospital charm meets Pupil Wizard's animated pathophysiology meets Eyesi's scoring rubrics.
4. **A deliberate motivational architecture (the 7 sins).**
   - Competitors use one or two shallow levers each:
     - eyeStudy: Elo and confidence bets
     - OptoConnections: a daily ritual
     - MedSteps and OphthoCards: streaks
     - DiagnosUs: cash prizes
   - **No one designs a full, coherent system.** Candidate mapping for the sins:
     - **Pride:** ranks, titles, "flawless exam" badges, a clinic reputation stars
     - **Greed:** coins, rare-case loot, collection of "case cards" or a pathology bestiary
     - **Envy:** rival clinicians, friend leaderboards, ghost replays of top players' exams
     - **Gluttony:** "just one more patient" runs, daily case buffet, binge-able short cases
     - **Lust:** gorgeous visuals, cosmetics for the clinic and instruments, desirable unlocks
     - **Wrath:** emergency patients, time-pressure triage, boss cases (acute angle-closure, RD, GCA)
     - **Sloth:** idle clinic upgrades, auto-filed paperwork, a gentle low-effort daily "Dx in 60 seconds"
   - Guardrail from the literature: the PLOS ONE paper warns that competition can embarrass low performers. Provide private modes and "personal best" framing.
5. **Mini-games for core procedures, in one place, with real optics.**
   - Ready-to-adopt mechanics proven individually but never bundled:
     - streak retinoscopy neutralization (AAO, EyeScholar)
     - phoropter or JCC refinement with unreliable patient answers (EyeScholar)
     - cover test plus prism measurement (AAO, OptoConnections)
     - visual-field lesion localization (Utah, Genially, OptoConnections)
     - pupil swinging-flashlight (Pupil Wizard)
     - fluorescein CL-fit pattern matching (Berkeley)
     - C/D grading against OCT (OptoConnections)
     - fundus "find the lesion" with a light-exposure and coverage score (Eyesi rubric)
     - Ishihara and colour vision, and slit-lamp sweep
   - Nobody wraps them in one consistent UX, scoring scheme and progression.
6. **Procedurally generated and AI-voiced patients inside a game.**
   - EyeScholar proves infinite random refractive patients work, and Aston proves AI patients are as good as an actor.
   - Nobody combines generated pathology, generated history and an animated persona to give infinite replayability.
7. **Spaced repetition hidden inside play.**
   - Question banks (OptoPrep's recycled misses, Anki) own retention science but are joyless.
   - Approach: re-serve missed conditions as *returning patients* or *new patients with the same disease*, so spaced repetition becomes narrative.
8. **"See through the patient's eyes" empathy moments.**
   - UNSW Eye Sim, UCL/Moorfields and Alberta show vision-loss simulation is compelling, but only in VR or in research.
   - A browser game can render the patient's-eye view (blur, metamorphopsia, scotoma, CVD) as the complaint intro to each case. Nobody does this in a diagnostic game.
9. **Audience breadth.**
   - Products target one segment: NBEO students (KMK, OptoPrep, OptoConnections), residents (Anki, AAO), technicians (OpenExamPrep vocabulary), or kids (toy games).
   - A difficulty-tiered single game can serve curious learners, techs, students and residents (Easy to Expert), much as Prognosis spans specialties.
10. **Modern, open, modular web tech.**
    - Most tools are dated (Flash-era refractor), native-only (iOS), or hardware-bound.
    - A modular, browser-first build where cases, mini-games and the motivation systems are swappable plugins has no competitor and invites faculty case contributions, which is Gao's unfunded "shared case library" vision.

**Positioning statement:** *"The first beautifully animated eye clinic where every patient is a story, every test is a mini-game, and every diagnosis matters. It is OptoConnections' rigor and EyeScholar's optics, given the charm of Two Point Hospital and an engagement engine designed on purpose."*
