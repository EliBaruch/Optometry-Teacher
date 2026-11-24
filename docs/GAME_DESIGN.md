# Lumen — The Eye Clinic
### Game design brief (the shared source of truth for every builder & reviewer)

> **PLAYER-FACING RULE:** the game never mentions sins, vices, or anything religious. The seven
> deadly sins are an *internal* psychology lens we design with (see `docs/ENGAGEMENT_DESIGN.md`).
> Players only ever see clinic-themed names: Career, Boutique, Rivals, Gallery, Lounge, Code Red…

## 1. Pitch
You are the newest optometrist at **Lumen**, a breathtaking after-hours eye clinic built inside an old
glass observatory. Patients drift in from the rain with blurry vision, red eyes, halos, curtains,
double vision. You take their history, run real clinical tests — each a tactile, gorgeous mini-game —
and make the call: *what is it, and how urgently must they be seen?*

Around the clinical core sit seven engagement systems that make it hard to put down: a career ladder
with ranks and mastery stars, a coin economy with surprise supply crates, rival colleagues on a weekly
board, combo streaks and "one more patient", a collectible gallery of stunning irises and frames,
adrenaline-soaked emergencies against the clock, and effortless comfort rewards (daily gifts, the
clinic earning while you're away). Every hook is **bent toward learning** — chasing it makes you a better clinician.

Tone: witty, warm, luxurious, cinematic. Never preachy, never gory.

## 2. Audience & learning goals
Optometry students (years 1–4), residents, ophthalmic technicians, opticians, and curious players.
They should leave able to: take a focused history; pick the right tests (and skip useless ones);
recognise findings (VA, refraction, pupils, cover test, slit lamp, IOP, fundus, fields, colour);
build differentials; and triage urgency correctly (routine / soon / urgent / emergency).
Learning science baked in: retrieval practice (diagnose before being told), immediate elaborated
feedback, spaced repetition (missed diagnoses return — "Confessional"), interleaving across categories,
desirable difficulty that ramps with rank.

## 3. Art direction — "Observatory at midnight"
* Background: deep ink `#0b0716` → aubergine `#1a0f2e`, subtle animated nebula/bokeh, film grain.
* Surfaces: glass panels (`backdrop-filter: blur`), 1px luminous borders, soft inner glows.
* Accent: candle gold `#ffd27a`; text ivory `#f6efe4`; muted `#a99bbd`.
* System accents (jewel tones): Career `#a78bfa` (violet) · Economy `#f5b942` (gold) · Rivals `#4ade80` (green)
  · Streaks `#fb923c` (amber) · Gallery `#f472b6` (rose) · Code Red `#ef4444` (crimson) · Lounge `#38bdf8` (ice blue).
* Clinical states: normal `#5eead4`, abnormal `#fbbf24`, critical `#f43f5e`.
* Type: **Fraunces** (display, elegant serif — titles, diagnosis names), **Inter** (UI),
  **Space Grotesk** (numbers, scores, data readouts).
* Motion: everything eases (`cubic-bezier(.2,.8,.2,1)` out, springy overshoot for rewards). 150–250ms UI,
  400–900ms reveals. Juice: screen shake on wrong/critical, hit-stop on correct diagnosis, particle bursts,
  count-up numbers, staggered list entrances, parallax. Respect `reducedMotion`.
* Motifs: glass, brass instruments, star charts, lens flares, candlelight, rain on windows. Lenses and irises as jewels.
* Procedural everything (no external image assets): SVG patient portraits, canvas eyes with layered
  iris fibres, fundus paintings, Ishihara plates, charts. It must look *illustrated*, not programmer-art.
* Audio: procedural WebAudio — glassy chimes, soft clinic ambience, a warm generative pad per scene,
  satisfying clicks for lenses & dials.

## 4. Core loop
`Hub → pick a mode → Patient walks in → History (ask questions) → Tests (mini-games, each writes to the chart)
→ Diagnose (pick diagnosis + urgency) → Results (score, teaching, rewards rain) → next patient / run summary`

### Exam room (scene `exam`, params `{ caseId, modeId }`)
* Left: animated patient portrait (breathing, blinking, expression reacts to findings/answers), name, age,
  occupation, chief complaint in a speech bubble (typewriter reveal). Triage note card if present.
* Centre: **instrument tray** — one tool per registered mini-game (icon, name, minutes cost). Clicking
  opens the mini-game in a large modal stage. Also "Let the tech do it" (auto-run: instant
  report, half skill credit) when the mode allows.
* History panel: question chips grouped by category; clicking reveals the answer in the patient's voice.
* Right: **the chart** — every RevealedFinding, flagged normal/abnormal/critical with colour + icon.
* Top: clinic clock (minutes used), case timer for emergencies (Code Red overlay), HUD slots.
* "Diagnose" button → diagnosis board: case `diagnosis` + `differentials` shuffled as luxurious cards,
  plus urgency selector (routine/soon/urgent/emergency). Confirm with a dramatic stamp.

### Results (scene `results`)
Grade stamp (S/A/B/C/D/F) slams in; score parts count up one by one; correct diagnosis card with
summary, key findings, pearls; what you missed (essential tests skipped, key questions unasked);
teaching points; red flags. Rewards granted by engagement systems (`reward:granted`) cascade in as chips.
Buttons: Next patient / Codex entry / Back to hub.

## 5. Scenes (ids are contracts)
| id | purpose |
|---|---|
| `title` | Cinematic title: a huge living eye that follows the cursor, jewel-like iris, drifting light motes, rain on glass. "Open the clinic". |
| `hub` | The Lumen lobby: mode cards, wing tiles (HubEntries: Career, Boutique, Rivals, Gallery, Lounge…), HUD slots, player rank. |
| `exam` | The exam room (above). |
| `results` | Case results (above). params `{ caseId, modeId }` — reads `services.session.state`. |
| `run-summary` | End of a run: totals, best case, streak, rewards. |
| `arcade` | Mini-game practice: every registered mini-game with `practice()`, high scores per game. |
| `codex` | Encyclopedia of diagnoses; locked until encountered; mastery % from LearningPort. |
| `profile` | Player profile: stats, rank, `profile` HUD slot sections. |
| `settings` | Volume, reduced motion, metric VA, high contrast, reset save, export/import. |
Engagement systems register their own scenes (e.g. `career`, `boutique`, `rivals`, `gallery`, `lounge`).

## 6. Modes (`src/modes/<id>`)
| id | player-facing | rules |
|---|---|---|
| `shift` | Clinic Shift | 5 patients, mixed difficulty ramping with experience. The main mode. |
| `rush` | Rush Hour | Endless patients, 3 lives, score multiplier grows with combo. "One more patient." |
| `code-red` | Code Red | Emergencies only (angle closure, RD, CRAO, GCA, CN3, ulcer…), strict timers, heartbeat audio. |
| `daily` | Daily Rounds | 3 seeded patients per day, same for everyone; compare with rivals. |
| `review` | Second Opinion | Spaced-repetition review of diagnoses you missed or that are due. |

## 7. Engagement systems (`src/systems/<id>`)
| id | player-facing | what it does |
|---|---|---|
| `ranks` | Career | XP & rank titles (Student → Intern → Resident → Associate → Senior → Clinic Director → Living Legend), mastery stars per diagnosis, achievements/trophy wall, S-grade stamps. Scene `career`. |
| `economy` | Boutique & coins | Coins (✦ "lumens") per case, surprise supply crates with rarity tiers, Boutique scene to buy cosmetics & hint tokens. Scene `boutique`. |
| `rivals` | Rivals | AI colleagues with personalities on a weekly board; "Dr. Vex solved this in 48s"; overtake alerts. Scene `rivals`. |
| `streaks` | Streaks | In-run combo multiplier with fire, daily streak flame, near-miss nudges, "next patient" momentum. |
| `collection` | Gallery | Every patient leaves a procedurally generated, holographic iris card (rarities); eyewear frames; clinic themes. Scene `gallery`. |
| `emergencies` | Code Red | Emergency overlay: countdown, heartbeat, red vignette, "sight saved" finale; weekly Grand Rounds boss case. |
| `comfort` | Lounge | Daily gift, clinic earnings while away, comeback bonus, one-tap resume. Scene `lounge`. |
Each system: persisted slice `sys:<id>`, listens to bus events, grants `reward:granted`, contributes HUD
widgets, a hub tile and usually a scene. Internal rationale: `docs/ENGAGEMENT_DESIGN.md`.

## 8. Canonical diagnosis ids (content contract)
Cases may only use these ids for `diagnosis` and `differentials`; `src/content/diagnoses` defines each.

* refractive: `myopia`, `hyperopia`, `astigmatism`, `presbyopia`, `anisometropia`, `amblyopia`
* binocular: `convergence-insufficiency`, `accommodative-esotropia`, `intermittent-exotropia`, `cn6-palsy`, `cn4-palsy`, `cn3-palsy`
* lids/conjunctiva: `dry-eye`, `blepharitis`, `chalazion`, `hordeolum`, `bacterial-conjunctivitis`, `viral-conjunctivitis`, `allergic-conjunctivitis`, `subconjunctival-hemorrhage`, `pinguecula`, `pterygium`, `episcleritis`
* cornea: `corneal-abrasion`, `corneal-foreign-body`, `hsv-keratitis`, `microbial-keratitis`, `keratoconus`, `herpes-zoster-ophthalmicus`
* uvea/glaucoma: `anterior-uveitis`, `acute-angle-closure`, `poag`, `ocular-hypertension`, `normal-tension-glaucoma`
* lens: `cataract`
* retina: `npdr`, `pdr`, `diabetic-macular-edema`, `hypertensive-retinopathy`, `dry-amd`, `wet-amd`, `retinal-detachment`, `pvd`, `retinal-tear`, `crao`, `crvo`, `brvo`, `central-serous`
* neuro: `papilledema`, `optic-neuritis`, `giant-cell-arteritis`, `horner-syndrome`, `adie-pupil`, `pituitary-adenoma`, `homonymous-hemianopia`, `congenital-color-deficiency`
* normal: `healthy-eyes`

## 9. Quality bar ("does this look like a $1M game?")
* First impression in 3 seconds: depth, light, motion, typography. No default browser styling anywhere.
* Every interaction has feedback: hover, press, success, failure, sound.
* Mini-games feel like *instruments*: tactile dials, real optical behaviour, satisfying clicks.
* Clinically correct. An optometrist must nod, not wince. Use real values and real grading scales.
* Mobile-friendly (≥ 375px wide, touch), keyboard accessible, `reducedMotion` respected.
* No console errors. 60fps. Clean up every listener/RAF/timer.
