# 04 — Engagement Design on the 7 Deadly Sins, Fused With Learning Science

Research brief for the optometry diagnosis game (animated patients, complaint → tests-as-mini-games → diagnosis).
Scope: (a) sin- and motivation-based design frameworks, (b) "one more go" mechanics in reference games, (c) learning science that must be built in, (d) ethical guardrails, (e) a per-sin mechanic map for this game.

Convention: every claim about prior art or research carries a URL. Items marked **[Design]** are our own proposals, not claims about prior art.

---

## 0. TL;DR for the build team

1. **Sins = levers, the seven heavenly virtues = guardrails.** Pair each sin with its traditional contrary virtue (Pride/Humility, Greed/Charity, Envy/Kindness, Gluttony/Temperance, Lust/Chastity (read here as respect/dignity), Wrath/Patience, Sloth/Diligence). Every engagement module ships with its virtue guardrail, and reviewers check both. **[Design]**
2. **Reward the cognition, not the time.** Each sin mechanic has to pay out for a learning act: retrieving, discriminating, committing to a diagnosis with stated confidence, or recognising an illness-script cluster. Gamification has small positive effects on learning in meta-analysis (cognitive g = .49, motivational g = .36), and game fiction and social interaction moderate the behavioural outcomes ([Sailer & Homner 2020](https://link.springer.com/article/10.1007/s10648-019-09498-w)).
3. **Use the Octalysis split.** "White-hat" drives (meaning, accomplishment, creativity) carry long-term motivation. "Black-hat" drives (scarcity, unpredictability, loss) create urgency but leave people feeling worse ([Chou, Octalysis](https://yukaichou.com/gamification-examples/octalysis-complete-gamification-framework/); [white vs black hat](https://yukaichou.com/gamification-study/8-core-drives-gamification-white-hat-vs-black-hat/)). Use black-hat only in small, capped doses.
4. **No real money anywhere, published drop odds, and nothing fake about near-misses.** Loot-box spending correlates with problem gambling across meta-analyses ([Spicer et al. 2021](https://www.open-access.bcu.ac.uk/14466/1/Spicer_Loot_Boxes_Problem_Gambling_2021.pdf); [Garea et al. meta-analysis](https://figshare.utas.edu.au/articles/journal_contribution/Meta-analysis_of_the_relationship_between_problem_gambling_excessive_gaming_and_loot_box_spending/22996898/1/files/40746986.pdf)).
5. **Make engagement modular.** Each sin is a plug-in "engagement module" that subscribes to domain events (`CaseStarted`, `FindingDiscovered`, `DiagnosisCommitted{confidence}`, `CaseResolved{score}`, `ReviewDue`). It never touches clinical content or mini-game code directly, so any sin can be removed or swapped without breaking the core. **[Design]** (See §7.)

---

## 1. (a) Frameworks: sins, motivation, and the psychology behind them

### 1.1 Seven deadly sins as a design lens (prior art)
| Source | What it says | Usefulness |
|---|---|---|
| R. "Ray" Wang, *Best Practices: Applying the Seven Deadly Sins to Successful Gamification* (CustomerThink, Feb 2011), https://customerthink.com/?p=66385 | Lust = hook with intrigue/incentives; Gluttony = drive to accumulate/acquire/contribute; Greed = non-monetary rewards, immediate recognition, scarcity; Sloth = maximum convenience; Wrath = reward speed/immediate results; Envy = showcase others' success, transparent rewards; Pride = healthy competition, reward excellence. | The only explicit sin→gamification mapping found. It is marketing-oriented opinion, but it confirms the framing is established. |
| Bosman, *A Lust for Dying: depiction and function of the seven deadly sins in digital games* (Heidelberg J. Religions on the Internet, 2020), https://heiup.uni-heidelberg.de/journals/religions/article/view/24168 | Academic analysis of how games *depict* the sins (narrative and character traits), not how they drive motivation. | Narrative inspiration, for example sin-themed rival NPCs or boss cases. |
| itch.io devlog *Facing my demons: designing 7 Sins*, https://itch.io/blog/937184/facing-my-demons-designing-7-sins | Post-mortem of an indie game themed on the sins. | Low evidential value. |
| GameSkinny, *Gaming's Seven Deadly Sins*, https://www.gameskinny.com/culture/gamings-seven-deadly-sins/ ; Destructoid, https://destructoid.com/?p=11249 | Pop-culture pieces on the sins players commit. | Tone reference only. |

**Gap/opportunity:** no prior work combines the sins with learning science **and** an ethical counterweight. Pairing them with the virtues is our differentiator. **[Design]**

### 1.2 Octalysis (Yu-kai Chou): the most mechanic-level map of motivation
Eight core drives, from https://yukaichou.com/gamification-examples/octalysis-complete-gamification-framework/ :
- **White hat:** (1) Epic Meaning & Calling, (2) Development & Accomplishment (points, badges, levels, streaks), (3) Empowerment of Creativity & Feedback.
- **Neutral:** (4) Ownership & Possession (collections, avatars, currencies), (5) Social Influence & Relatedness (mentorship, competition, envy).
- **Black hat:** (6) Scarcity & Impatience (appointment timers, limited access), (7) Unpredictability & Curiosity (loot, lotteries), (8) Loss & Avoidance (streaks about to break).
- Left brain = extrinsic, right brain = intrinsic. Black hat suits one-time transactions and white hat suits long-term motivation ([Yale SOM summary](https://som.yale.edu/blog/the-motivating-power-of-games); [Chou white/black hat](https://yukaichou.com/gamification-examples/white-hat-vs-black-hat-gamification/)).
- **Sin ↔ drive crosswalk [Design]:** Pride→CD2, Greed→CD4 and CD7, Envy→CD5, Gluttony→CD4 (collection) and CD2, Lust→CD7 (curiosity) and CD3 (aesthetics), Wrath→CD2 (overcoming challenge) and CD8, Sloth→Sensation/low-friction (Chou's hidden 9th drive) and Fogg-style "ability".

### 1.3 Hooked model (Nir Eyal)
Trigger → Action → Variable Reward (tribe/hunt/self) → Investment, where Investment loads the next trigger and stores value ([Eyal sample chapter, Penguin](https://cdn.penguin.co.uk/dam-assets/books/9780241184837/9780241184837-sample.pdf); [Farnam Street summary](https://fs.blog/hooked/); [MindTools](https://www.mindtools.com/aapqtdb/the-hook-model-of-behavioral-design/); [Fortune](https://fortune.com/2017/01/11/nir-eyal-hook-model/)). **Our hook [Design]:**
- **Trigger:** external is one opt-in daily "patient waiting" notice; internal is curiosity about a recurring patient.
- **Action:** one tap to "Call next patient".
- **Variable reward:** the *tribe* reward is the rival or league result, the *hunt* reward is a case drop or Atlas card, and the *self* reward is the mastery crest.
- **Investment:** clinic upgrades plus FSRS memory state, which schedules the next review.

### 1.4 Behavioural and economic psychology (Madigan and others)
- **Jamie Madigan, *Getting Gamers: The Psychology of Video Games and Their Impact on the People Who Play Them* (Rowman & Littlefield, 2015)**: https://www.goodreads.com/book/show/40311258 ; review: https://www.museumofplay.org/app/uploads/2022/01/8-3-book-review-7.pdf . His essays: loss aversion and framing, https://www.gamedeveloper.com/game-platforms/analysis-zombies-barbarians-and-loss-aversion ; endowment effect, https://www.psychologyofgames.com/2010/02/the-endowment-effect-and-used-game-sales/ .
- **Loss aversion in play:** the CHI PLAY 2020 "Risking Treasure" study found loss aversion inside an adventure game and urges designers to account for it in risk/reward ([U. Saskatchewan](https://harvest.usask.ca/handle/10388/13478); [PDF](https://hci.usask.ca/wp-content/cache/mendeley-file-cache/6eb59aeb-38be-37ad-950c-7c625cb4cce2.pdf)). Book-length treatment: Engelstein, *Achievement Relocked: Loss Aversion and Game Design* (MIT Press), https://mitpressbookstore.mit.edu/book/9780262043533 .
- **Variable-ratio / compulsion loop:** John Hopson's 2001 Gamasutra "Behavioral Game Design" introduced reinforcement schedules to designers. His later retrospective rejects the "Skinner box" caricature ([Game Developer, 10 years later](https://gamedeveloper.com/design/10-years-of-behavioral-game-design-with-bungie-s-research-boss); [There is no Skinner box](https://gamedeveloper.com/design/there-is-no-skinner-box-says-bungie-user-research-lead)). In a custom game, players preferred variable reward schedules over fixed ones ([Kao, MIT/Princeton 2012](https://people.csail.mit.edu/dkao/pdf/kao2012rewardpreference.pdf)).
- **Neuroscience:** dopamine neurons encode reward-prediction error, and their response is largest when rewards are unpredictable and fades as rewards become predictable ([Schultz 2016](https://www.tandfonline.com/doi/full/10.31887/DCNS.2016.18.1/wschultz); [Hollerman & Schultz 1998](https://www.pdn.cam.ac.uk/system/files/documents/1998-hollerman-natneurosci.pdf); [Fiorillo et al., Nat Rev Neurosci](https://www.nature.com/articles/nrn1127)). **Implication [Design]:** surprise should come from *case content*, such as an atypical presentation or a masquerader. That kind of surprise teaches. A slot-machine RNG does not.
- **Near-miss:** in Candy Crush, near-misses were the most arousing and frustrating outcomes and produced the strongest urge to keep playing ([Larche, Musielak & Dixon, J Gambling Studies 2017, PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5445157/)). **Rule:** never manufacture near-misses. Show *real* near-misses, for example "you had 3/4 findings of the illness script".
- **Goal-gradient / endowed progress:** effort accelerates as people near a goal, and artificial head-start progress speeds completion ([Kivetz, Urminsky & Zheng 2006, JMR](https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf); [Chicago Booth summary](https://www.chicagobooth.edu/review/going-goal)).
- **Streaks:** in seven experiments (n > 4,000), a logged intact streak increased persistence, a highlighted broken streak decreased it, self-blame made the drop worse, and offering a repair softened it. About half of participants would watch an ad to keep a streak ([Silverman & Barasch, JCR, via INSEAD Knowledge](https://knowledge.insead.edu/marketing/consumer-streaks-are-motivating-key-keeping-them-alive)). Duolingo attributes the streak's pull to loss aversion and offers Streak Freezes, up to two equipped ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)). A Mobbin study of 859 streak designs reports these points ([Mobbin](https://mobbin.com/blog/streaks-are-about-losing-a-study-of-859-streak-designs)):
  - Nearly all streaks count *days*.
  - Allowing two freezes instead of one added about 200k daily returning users at Duolingo.
  - Requiring only one lesson a day put more than 40% more users on 7-day streaks.
  - In Lally's UCL habit study, one missed day did not materially affect habit formation.
  - Fear-framed streaks produce the "what-the-hell" abandonment effect.
  - See also [Smashing Magazine 2026 on streak UX](https://smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/) and the critique [uxdesign.cc on reframing Duolingo streaks](https://uxdesign.cc/3-reframing-streaks-on-duolingo-5-ideas-for-a-more-healthy-and-flexible-approach-to-language-8fd89545771e).
- **Social comparison / leaderboards:** low performers are often demotivated by leaderboards and high performers motivated (Preist et al.), with mixed results elsewhere. *Relative* (bounded) leaderboards are proposed as a mitigation ([Utrecht: leaderboards and progress indicators](https://ics-gmt.science.uu.nl/node/19); [GaLA 2020 leaderboard paper](https://trepo.tuni.fi/bitstream/10024/130150/1/GaLA_Conf_2020_paper_leaderboard.pdf); [HKU absolute vs relative leaderboards](https://hub.hku.hk/bitstream/10722/368255/1/content.pdf)).
- **Self-determination theory (SDT) and the PENS measure:** game enjoyment and well-being are predicted by satisfaction of the needs for autonomy, competence, and relatedness ([Ryan, Rigby & Przybylski 2006](https://link.springer.com/content/pdf/10.1007%2Fs11031-006-9051-8.pdf); [PENS](https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/)). A critique argues that HCI games research often applies SDT perfunctorily ([Tyack & Mekler 2024](https://arxiv.org/html/2405.12639v1)). **Rule [Design]:** every sin mechanic must also feed at least one SDT need.

---

## 2. (b) How reference games create the "one more go" feeling, and what we take from each

| Game | Core "one more" engine (cited) | Steal for our game **[Design]** |
|---|---|---|
| **Duolingo** | Streak with freeze/repair; weekly 30-person leagues across 10 tiers with promotion and demotion ([Duolingo leagues](https://blog.duolingo.com/duolingo-leagues-leaderboards/); [Deconstructor of Fun teardown](https://duolingo.deconstructoroffun.com/mechanics/leagues)); A/B-driven iteration ([Duolingo experiments](https://blog.duolingo.com/improving-duolingo-one-experiment-at-a-time)). Documented misuse: learners gaming XP instead of learning ([arXiv 2203.16175](https://arxiv.org/pdf/2203.16175.pdf)). | A forgiving weekly-goal streak with freezes and repair. An opt-in, bounded league. XP **only** from learning acts: correct retrieval, confidence calibration, spaced reviews. No XP for time or repetition of easy content, which closes the XP-farming exploit. |
| **Candy Crush** | Real near-misses ("one move short") and an always-present next level ([PMC5445157](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5445157/); [UW analysis](https://staff.washington.edu/shar04/ELID510/HAFTO/Week7-CandyCrush.html)). | A level-map journey through specialties. Show honest near-misses ("3 of 4 findings"). **Do not** take lives/energy timers. |
| **Hades** | Death is narrative progress. Every run pays out story and resources. "Take the pain out of dying." Reactive, weighted event selection so "the game is paying attention." God Mode adds 20% damage resistance, +2% per death, capped at 80% ([Game Developer on Hades narrative](https://gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death); [VICE](https://www.vice.com/en/article/how-hades-made-a-genre-known-for-being-impossibly-hard-accessible); [Inverse God Mode](https://inverse.com/gaming/hades-god-mode-interview); [GamesRadar Hades 2](https://gamesradar.com/games/hades/hades-2-director-challenges-roguelike-convention-if-you-dont-finish-the-run-it-doesnt-mean-that-you-failed)). | A wrong diagnosis unlocks *story*: the mentor's debrief, the patient's follow-up visit, an Atlas annotation. A recurring cast with reactive dialogue keyed to the player's history. An adaptive "Mentor Mode" assist that grows after each miss, in the style of God Mode. |
| **Balatro** | The core loop felt addictive even unfinished. Joker synergies produce explosive scores. Unpredictability came from roguelike draws inspired by Luck Be a Landlord and Isaac. Strong signposting of rules ([Rogueliker interview](https://rogueliker.com/balatro-interview/); [PC Gamer](https://www.pcgamer.com/i-dont-play-poker-at-all-says-solo-developer-who-made-the-poker-roguelike-i-cant-stop-playing/); [Game Developer: signposting](https://gamedeveloper.com/design/balatro-creator-unveils-a-few-slick-signposting-strategies); [Game Informer](https://www.gameinformer.com/interview/2024/03/21/balatro-was-almost-called-joker-poker-and-other-details-from-its-creator)). | A **finding-combo multiplier**: linking findings that form an illness script (↑IOP + C/D asymmetry + arcuate VF defect = "Glaucoma Triad ×3") plays a cascading score-tally animation. Synergy literally teaches pattern recognition. "Clinical pearl" cards act as jokers that modify scoring rules. |
| **Vampire Survivors** | Minimal input; power escalates while threat ramps (dominance → tension cycles). Even failed runs earn meta-currency. Designer drew on gambling-industry experience ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613); [Epic](https://store.epicgames.com/news/vampire-survivors-built-genre-autoshooter-bullet-heaven); [PC Gamer](https://pcgamer.com/vampire-survivors-saved-its-creator-from-working-on-mobile-gambling-games)). | A "Clinic Rush" mode: a high-volume rapid-recognition swarm (fundus photo or slit-lamp image → diagnosis in under 5 s) with escalating pace and power-ups that are *clinical tools*. Every run banks Atlas progress. |
| **Two Point Hospital** | Comic tone makes a hospital setting approachable. The management loop is room-building plus staff plus queue pressure. Players are left to work problems out ([PC Gamer](https://pcgamer.com/two-point-hospital-the-theme-hospital-spiritual-successor-teases-whacky-illnesses-and-how-to-treat-them); [MCV "When we made"](https://mcvuk.com/development-news/when-we-made-two-point-hospital/); [PCGamesN](https://www.pcgamesn.com/two-point-hospital/two-point-hospital-developer-interview)). Its illnesses are "not very scientific." | Humour lives in **characters and the clinic**, never in the pathology, which must stay accurate. A clinic meta-layer: buy and place equipment (OCT, topographer) to unlock test mini-games, plus a waiting-room queue for gentle pressure. |
| **Papers, Please** | Fast discrepancy-spotting against a rulebook that grows daily; immediate versus long-term tension; joy in the physical handling of documents ([Game Developer: designing Papers, Please](https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-); [Game Informer 10 years later](https://www.gameinformer.com/2024/01/02/papers-please-10-years-later); [Game Studies, Morrissette](https://gamestudies.org/1701/articles/morrissette)). | A **referral desk** mini-game: compare a referral letter, prior records, and the current exam to catch the discrepancy. The "rulebook" (clinical guidelines) expands as the curriculum unlocks. Tactile UI: drag lenses, flip occluders, stamp Rx. |
| **Ace Attorney** | Contradiction = pair a testimony *statement* with an *evidence* item. A bounded option space (e.g., 3 statements × 5 items = 15). Known pitfall: "only one evidence item accepted" ([Iwata Asks](https://www.nintendo.co.uk/Iwata-Asks/Iwata-Asks-Professor-Layton-vs-Phoenix-Wright-Ace-Attorney/Professor-Layton-vs-Phoenix-Wright-Ace-Attorney/2-Ace-Attorney-Born-from-a-Backlash/2-Ace-Attorney-Born-from-a-Backlash-850346.html); [GameSpot review](https://GameSpot.com/reviews/the-great-ace-attorney-chronicles-review-no-objections-here/1900-6417704/); [MDA analysis](https://medium.com/game-design-fundamentals/mda-and-fun-of-the-ace-attorney-series-original-trilogy-a18dd45dcd2)). | An **"Objection!" history-taking** mechanic: pair a patient statement ("it came on suddenly") with an exam finding (old pigment scar). Accept *every* clinically valid pairing, which fixes Ace Attorney's single-answer pitfall. Builds discriminating-feature reasoning. |
| **Wordle** | One puzzle a day (scarcity, "leaves people wanting more"); the same puzzle for everyone; a few minutes only ("doesn't want more of your time"); a spoiler-free emoji share grid; no ads or upsells ([Game Developer: Wardle](https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success); [NPR](https://www.npr.org/2022/01/12/1071840091); [Penn Today](https://penntoday.upenn.edu/news/wordle-case-pure-play-cait-lamberton); [Smithsonian](https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/)). | **"Daily Patient"**: one shared case per day. The share grid shows test icons in order (🟩 = useful test, 🟨 = low-yield, ⬛ = missed key test) plus the number of guesses. It is spoiler-free and capped at one scored attempt. |

---

## 3. (c) Learning science that must be fused in

| Principle | Evidence (URL) | Concrete implementation **[Design]** |
|---|---|---|
| **Retrieval practice / testing effect** | Reliable, century-old effect. Roediger & Karpicke 2006 is the modern anchor. Meta-analytic g ≈ 0.50 ([Rowland 2014](https://courseware.epfl.ch/assets/courseware/v1/fdde2f0aa590bf3b1324077a6bf1540c/asset-v1%3AEPFL%2BDEMO%2B2020%2Btype%40asset%2Bblock/Rowland2014-meta-analysis.pdf)) and g ≈ 0.70 ([Adesope et al. 2017](https://education.wsu.edu/documents/2018/01/rethinking-use-tests.pdf/)); [Karpicke 2025 review](https://learninglab.psych.purdue.edu/downloads/2025/2025_Karpicke_Retrieval_Based_Learning_Review.pdf) | Every case requires the player to *generate* a differential before seeing options (free-text or tag picker first, multiple choice only as fallback). Atlas cards are learned by recall, not reading. |
| **Spaced repetition** | Optimal spacing gap is non-monotonic, about 10–20% of the retention interval, with up to 150% recall gains ([Cepeda et al. 2008](https://home.cs.colorado.edu/~mozer/Research/Selected%20Publications/reprints/Cepedaetal2009.pdf); [Cepeda 2006 meta](https://digitalcommons.usf.edu/psy_facpub/1764); [CMU summary](https://www.cmu.edu/teaching/resources/instructionalstrategies/activelearningstrategies/spacedopractice/index.html)). Applied meta-analysis d = 0.54 ([PMC12189222](https://pmc.ncbi.nlm.nih.gov/articles/PMC12189222/)). **FSRS** is an open DSR (difficulty/stability/retrievability) scheduler with JS/TS implementation `ts-fsrs` and is in Anki since 23.10 ([GitHub](https://www.github.com/open-spaced-repetition/free-spaced-repetition-scheduler); [Anki docs](https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm.md)) | Each *illness script* and each *test-interpretation skill* is an FSRS item. The "Revenge Queue", the "Daily Patient", and idle-clinic "flagged cases" are all served by FSRS due dates, so the engagement layer *is* the spacing scheduler. |
| **Interleaving** | Interleaved ECG practice is reported at 46% vs 30% accuracy for blocked (Hatala 2003, via secondary source), with benefit possibly needing initial mastery ([Monteiro et al. 2017, PMC5542896](https://pmc.ncbi.nlm.nih.gov/articles/PMC5542896)); [Rohrer classroom math](https://www.scientificamerican.com/article/the-interleaving-effect-mixing-it-up-boosts-learning/) | Block within a new specialty chapter until first mastery, then mix: the waiting room serves *look-alike* presentations (red eye: conjunctivitis vs uveitis vs angle closure vs keratitis). |
| **Immediate, explanatory feedback + hypercorrection** | High-confidence errors are corrected more after feedback, though they can re-emerge later, so re-test them ([Butterfield & Metcalfe](https://link.springer.com/article/10.1007/s11409-006-6894-z); [Metcalfe et al. PMC3079415](https://pmc.ncbi.nlm.nih.gov/articles/PMC3079415); [persists a week but errors return](https://pubmed.ncbi.nlm.nih.gov/21989771/)) | Confidence is captured on every diagnosis. A high-confidence miss triggers a slow-motion "Hypercorrection Moment" with an explanation, and the item is force-scheduled for re-test within 1–3 days. |
| **Certainty-based marking** | UCL's CBM scheme: +1/+2/+3 for correct and 0/−2/−6 for wrong. Students rate it fair (78%) and useful (94%). It improves reliability, especially for weaker students ([UCL LAPT](https://www.ucl.ac.uk/lapt/lpcfhelp.htm); [PMC3650882](https://pmc.ncbi.nlm.nih.gov/articles/PMC3650882); [Moodle CBM](https://docs.moodle.org/35/en/Using_certainty-based_marking)) | The Pride wager (§5). Calibration is a scored, displayed skill. |
| **Pretesting / errorful generation** | Guessing before study improves later recall by about 10%, and learners underrate this method ([Kornell, Hays & Bjork 2009, via SciAm](https://www.scientificamerican.com/article/the-pluses-of-getting-it-wrong/); [Richland, Kornell & Kao](https://learninglab.uchicago.edu/Pre-Testing_files/RichlandKornellKao.pdf); [pretest vs posttest](https://pubmed.ncbi.nlm.nih.gov/33793291/)) | A new condition is introduced *by the patient walking in first*. The player guesses, then the mentor teaches. Framed as "Mystery Patient" (curiosity). |
| **Case-based learning / illness scripts** | Illness script = enabling conditions + fault + consequences. Case-based clinical reasoning courses increased script richness and diagnostic performance. Learners must build their own scripts ([Lubarsky et al., CMEJ 2015](https://journalhosting.ucalgary.ca/index.php/cmej/article/view/36631); [Keemink et al. 2018, PMC5834830](https://pmc.ncbi.nlm.nih.gov/articles/PMC5834830/); [Fam Med RCT](https://pubmed.ncbi.nlm.nih.gov/20373168/); [PMC4795084](https://pmc.ncbi.nlm.nih.gov/articles/PMC4795084)) | The Atlas card **schema is the illness script**: Enabling conditions (risk factors) / Fault (pathophysiology) / Consequences (symptoms, signs, test findings) / Management. Players fill in slots as they discover them in cases, so the collection is self-built scripts. |
| **Deliberate practice** | Targeted practice on weaknesses with accurate feedback predicts expertise in medicine ([Ericsson 2004, Acad Med](https://pubmed.ncbi.nlm.nih.gov/15383395/)) | A "Weak Spot Training" queue auto-selects mini-games where the player's FSRS stability or accuracy is lowest. Per-skill telemetry is shown honestly. |
| **Desirable difficulty** | Spacing, interleaving, variation, and testing hurt short-term performance but help long-term learning; learners misjudge this ([Bjork & Bjork](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-introducing-desirable-difficulties-into-practice-and-instruction-bjork-and-bjork.pdf); [APS Observer](https://www.psychologicalscience.org/observer/desirable-difficulties); [health-professions review PMC10368606](https://pmc.ncbi.nlm.nih.gov/articles/PMC10368606)) | Tell players explicitly that "harder now = remember later" via mentor lines. Adapt difficulty toward roughly 70–85% success (a working target to be tuned with telemetry, not a cited figure). |

**Tension to resolve:** Bjork lists *reduced* feedback as a desirable difficulty, while Ericsson stresses *accurate* feedback. Resolution **[Design]:** always give full feedback at case end, and fade in-case hints as mastery grows.

---

## 4. (d) Ethical guardrails

### 4.1 Named dark patterns to ban (Zagal, Björk & Lewis 2013)
From the paper's own text ([Chalmers record](https://research.chalmers.se/en/publication/177148); [PDF](https://gup.ub.gu.se/file/101018); [deceptive.design summary](https://deceptive.design/articles/dark-patterns-in-the-design-of-games)):
- **Temporal:** *Grinding*, *Playing by Appointment*.
- **Monetary:** *Pay to Skip*, *Pre-delivered Content*, *Monetized Rivalries*.
- **Social-capital:** *Social Pyramid Schemes*, *Impersonation*.

Critique of the concept: [DiGRA 2020](https://eprints.whiterose.ac.uk/156460/1/DiGRA_2020_paper_189.pdf).

**Our bans [Design]:**
- No grinding for gating.
- Appointment mechanics only as *optional* bonuses.
- No real money, so none of the three monetary patterns can exist.
- No invite-to-unlock.
- Never post on the user's behalf.

### 4.2 Gamified-education ethics
- Risks include paternalism, lack of voluntariness, and cognitive manipulation ([Klock, Santana & Hamari, umbrella review](https://arxiv.org/html/2309.14918v1)).
- Duration of gamification, novelty, and overjustification can backfire ([Prieto-Andreu 2024](https://dialnet.unirioja.es/descarga/articulo/9650652.pdf)).
- Exploitation is the core ethical test ([Kim & Werbach, PMC8583052](https://pmc.ncbi.nlm.nih.gov/articles/PMC8583052)).

### 4.3 Accessibility and respect for difficulty
- Celeste's granular Assist Mode is praised. The criticism concerns stigma such as a branded save file and "intended gameplay" wording ([VICE](https://www.vice.com/en/article/d3w887/celeste-difficulty-assist-mode); [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/celeste-assist-mode); [Tampere PlayLab](https://blogs.tuni.fi/playlab/features/too-steep-a-hill-to-die-on-celeste-assist-mode-and-accessibility/)).
- **Rule:** assists carry no stigma badge.

### 4.4 Non-negotiable product rules **[Design]**
1. **No real-money transactions or paid currency.** Drop tables are visible in-game, and cosmetics are never required for learning.
2. **No energy/lives timers** that block learning.
3. **Notifications:** at most one per day, opt-in, with quiet hours; never guilt copy ("Dr. Owl is sad").
4. **Built-in stopping cues:** a "Clinic closes" end-of-shift summary every ~15–20 min, and diminishing returns after the daily goal, explained as "spacing beats cramming."
5. **Streaks are forgiving:** weekly target, 2 freezes, repair by doing a review.
6. **Leaderboards are opt-in and relative.** The default comparison is with *your past self*.
7. **Patient dignity and representation:** diverse patients, no ridicule of conditions, no sexualisation.
8. **Medical accuracy over spectacle:** clinical content is reviewed, and game randomness never alters clinical truth.
9. **Ethics KPIs:** retention of learning (FSRS retrievability, calibration), not raw DAU or minutes played.

---

## 5. (e) The per-sin mechanic map (the deliverable)

Each row gives the mechanic, the target feeling, how it teaches, and its guardrail. All mechanics are **[Design]** proposals built on the cited principles above.

### PRIDE → guardrail virtue: HUMILITY
| # | Mechanic | Feeling targeted | Learning reinforcement | Guardrail |
|---|---|---|---|---|
| P1 | **Confidence Wager** before the diagnosis reveal: "Hunch / Fairly sure / Stake my licence" (CBM 1/2/3, penalties 0/−2/−6) | Swagger, self-belief, a tense reveal | Metacognitive calibration (CBM); high-confidence misses trigger hypercorrection | Calibration is the score, not bravado. Wrong + low confidence is never punished. |
| P2 | **Workup Grade S/A/B/C** per case: correct diagnosis, correct management, *minimal necessary tests*, red flags caught | "I nailed it." Mastery shown off. | Diagnostic stewardship and test-selection parsimony (deliberate practice on workup efficiency) | Grade criteria are always shown. S-rank is reachable without speed pressure. |
| P3 | **Clinic Titles** (Student → Intern → Resident → Attending → Master Clinician) gated by *retained* mastery (FSRS retrievability above threshold across specialties) | Status, identity, growing into a clinician | Rank reflects durable memory, not grinding | A title can "tarnish" but is never revoked. A tarnished title prompts a review. No public rank by default. |
| P4 | **Specialty Crests** (Anterior Segment, Glaucoma, Retina, Binocular Vision, Contact Lenses, Paeds, Neuro-ophthalmology) shown as a constellation | Pride of a complete set | Visualises curriculum coverage and gaps, which directs deliberate practice | Crests show coverage honestly, so gaps are visible, not hidden. |
| P5 | **Thank-you Wall**: animated patients you helped send cards or return seeing clearly | Earned, warm pride | Reinforces *outcome* and management (why the diagnosis matters) | Celebrates care, not ego. |
| P6 | **Teach the Intern**: explain why you chose the diagnosis, scored against the illness-script slots | Expert pride | Self-explanation and elaboration; strengthens the script | Optional; AI or rubric scoring is lenient and formative. |

### GREED → guardrail virtue: CHARITY (generosity, no exploitation)
| # | Mechanic | Feeling | Learning | Guardrail |
|---|---|---|---|---|
| G1 | **Finding Combos** (Balatro-style): linked findings that form an illness script cascade a multiplier (e.g., "Diabetic Retinopathy Quad": dot-blot haemorrhages + hard exudates + microaneurysms + HbA1c history) | Number-go-up rush | Pattern recognition of script clusters, earned only by *correct* linkage | Wrong links don't steal points; the combo explanation is always shown. |
| G2 | **Case Drop** after each case: a frame or clinic cosmetic with visible rarity odds; drop bias toward the case's topic (e.g., "Gonioscopy lens skin" after angle closure) | Variable-reward anticipation | Associative cue linking the reward to the topic; the drop includes a one-line pearl to recall later | No money, odds displayed, no duplicates frustration (pity timer), cosmetic only. |
| G3 | **Coins for cognition**: earned for correct retrieval, calibrated confidence, and due reviews done on time, *not* for time spent | Accumulation | Pays the behaviours the research supports | Daily cap with diminishing returns, explained as spacing. |
| G4 | **Clinic Investment**: spend coins on equipment (OCT, fundus camera, topographer, perimeter), each unlocking a new test mini-game and case pool | Ownership; Hooked "investment" | Sequencing of the curriculum; investment loads the next trigger | All learning content is also reachable via progress, so nothing is paywalled or grind-walled. |
| G5 | **Golden Patient** (rare, ~1 in 25 cases): a "zebra" case with double rewards | Jackpot surprise | Exposure to rare-but-important conditions | Rarity is fixed and disclosed. No "almost got it" fakery. |

### ENVY → guardrail virtue: KINDNESS
| # | Mechanic | Feeling | Learning | Guardrail |
|---|---|---|---|---|
| E1 | **Rival NPC "Dr. Vale"**: a cocky classmate who diagnoses the same case in parallel, sometimes wrongly. You see their differential afterwards. | Competitive itch, delicious one-upmanship | Contrast learning: see a plausible wrong differential and why it fails (discriminating features) | Envy is aimed at a fictional character, not real people. Dr. Vale also models learning from errors. |
| E2 | **Daily Patient + Share Grid** (Wordle-style): same case for all; spoiler-free emoji grid of tests used and attempts | Social curiosity, "how did *you* do?" | Daily spaced exposure; reflection on test choice | One scored attempt per day; no streak-shaming in shares. |
| E3 | **Bounded League** (opt-in): weekly cohort of about 20, but each player sees only ±3 neighbours; points come only from learning acts | Chase the person just ahead | Motivates spaced reviews, which carry the most points | Opt-in. No demotion below your starting tier. Low performers see a "personal best" view by default. |
| E4 | **"X% of clinicians missed this"** reveal after each case | "I'm in the sharp minority" or "Wow, that's a trap" | Highlights high-error items (salient trap features), which feeds the spaced queue | Aggregate and anonymous only. |
| E5 | **Ghost of Past You**: replay your previous attempt at a revisited case side by side | Envy of your *own* improvement | Makes growth visible and reinforces retrieval gains | Default comparison mode. |

### GLUTTONY → guardrail virtue: TEMPERANCE
| # | Mechanic | Feeling | Learning | Guardrail |
|---|---|---|---|---|
| GL1 | **Clinic Rush** (Vampire Survivors-like): a swarm of rapid-recognition patients (fundus, slit lamp, topography, VF printouts) with escalating speed and clinical power-ups | Binge rush, flow | High-volume *interleaved* retrieval of visual patterns | Rush capped at 3 runs a day for full rewards; each run ends with a summary of misses that are scheduled into FSRS. |
| GL2 | **The Atlas**: collect every condition card. Rarity tiers are *Common / Can't-Miss / Zebra*, not monetary rarity. Silhouettes for undiscovered cards. | Completionist hunger | Each card is a self-built illness script; completion = curriculum coverage | A card is only "owned" once its script slots are recalled, not just seen. |
| GL3 | **Mini-game buffet** inside cases: Snellen/LogMAR, retinoscopy reflex neutralising, JCC "1 or 2?", slit-lamp sweep, tonometry timing, perimetry clicker, Ishihara, cover test, keratometry mire alignment, pupils/RAPD swinging flashlight | Variety, snacking | Procedural and interpretive skill practice in clinical context | Each mini-game is skippable after mastery (see Sloth). |
| GL4 | **Case Bites**: 2–3 minute micro-cases for commutes | "Just one more" with low cost | Frequent short sessions favour spacing over massing | The shift ends naturally after the daily set. |
| GL5 | **Endless Zebra Hunt** (unlocks late): infinite rare cases | Bottomless plate | Long-tail exposure | Diminishing rewards after the daily goal, with a polite "close the clinic" prompt. |

### LUST (desire, beauty, curiosity) → guardrail virtue: CHASTITY, interpreted as respect and dignity
| # | Mechanic | Feeling | Learning | Guardrail |
|---|---|---|---|---|
| L1 | **Cinematic Eye Dives**: on diagnosis, the camera flies into the animated eye to show the pathology (e.g., the angle closing, the retina detaching) | Awe, aesthetic desire, "I want to see the next one" | Dual coding of mechanism (the "fault" in the illness script) | Visuals are medically accurate; skippable. |
| L2 | **Mystery Patient** (pretesting): a new condition is introduced by the patient arriving *before* any teaching; the player guesses | Curiosity gap, intrigue | Pretesting/errorful-generation benefit | Guessing wrong is framed as "the best way to learn"; no penalty. |
| L3 | **Recurring patients with arcs** (Hades-style): Mrs. Okafor's diabetes over 6 visits; a child's amblyopia treatment; a keratoconus progression | Longing to know what happens next; attachment | Natural history and longitudinal management | Respectful, diverse portrayal; no trauma-bait. |
| L4 | **Silhouette Atlas plus rare-sighting alerts** in-session | Desire for the unseen | Spaced exposure to under-practised areas | No time-limited, never-again content (FOMO). |
| L5 | **Clinic and avatar customization** (frames, décor, white-coat patches) | Ownership, self-expression | Indirect; it pays for the learning acts in G3 | Cosmetic only; no sexualised content. |

### WRATH (challenge, frustration-to-triumph, righteous fight) → guardrail virtue: PATIENCE
| # | Mechanic | Feeling | Learning | Guardrail |
|---|---|---|---|---|
| W1 | **Boss Cases: "Masqueraders" and "Can't-Miss"**: acute angle closure disguised as a red eye; GCA; retinal detachment; papilloedema; CRAO; 3rd nerve palsy with pupil involvement. A *vision-loss countdown* runs while the player chooses actions. | Adrenaline, the urge to fight for the patient | Red-flag recognition and urgent triage (high-stakes discrimination) | Timer pauses during reading and explanation; Mentor Mode is available; no progress loss. |
| W2 | **"Objection!" history contradiction** (Ace Attorney): pair a patient statement with an exam finding to expose the hidden truth | Righteous "gotcha" catharsis | Discriminating-feature reasoning; history-exam integration | All valid pairings accepted; a hint ladder after 2 misses. |
| W3 | **Revenge Queue**: missed cases come back as rematches on an FSRS schedule, introduced with "Remember me, Doctor?" | Redemption drive | Spaced retrieval of *errors*; re-tests high-confidence errors that tend to return | Rematches limited to 3 a day; framed as a comeback, not shame. |
| W4 | **Difficult-patient encounters**: an angry or anxious patient whose agitation must be calmed through correct communication choices to unlock the history | Tension → relief | Communication and history-taking skills | Respectful portrayal; no abuse simulation. |
| W5 | **Adaptive Mentor Mode** (Hades God Mode analogue): after each miss on a case type, the mentor's hint strength grows a little, up to a cap; toggle anytime | Frustration defused into progress | Keeps the player in the desirable-difficulty zone | No stigma badge (Celeste lesson). |

### SLOTH (ease, comfort, low friction) → guardrail virtue: DILIGENCE
| # | Mechanic | Feeling | Learning | Guardrail |
|---|---|---|---|---|
| S1 | **One-tap Call Next Patient**: under 2 s to playing; auto-resume mid-case | Effortless start | Lowers friction to *frequent short* sessions (spacing) | Easy start, never an easy answer: retrieval is still required. |
| S2 | **Smart Rounds** (FSRS autopilot): the game decides what to review and when; the player just shows up | Relief from planning | Optimal spacing and interleaving without effort | The scheduler is transparent ("why this case?"). |
| S3 | **Idle Clinic**: your trained technicians see routine patients while you're away and earn cosmetic coins; on return, "your tech flagged 3 cases for your review" | Cozy passive progress | The return hook *is* a spaced-review queue | Idle never grants mastery or rank, only cosmetics plus the review queue. |
| S4 | **Auto-complete mastered subskills**: once you've mastered VA testing, it auto-runs, keeping cognitive effort on the weak spot | Earned laziness as a reward | Fading of mastered components focuses deliberate practice | The auto-run item still enters spaced re-checks occasionally. |
| S5 | **Forgiving streak**: weekly goal, 2 freezes, repair by completing a review | Safety, no dread | Habit formation without the what-the-hell abandonment effect | No fear copy and no night-time pings. |

---

## 6. Core loop (how the sins interlock) **[Design]**
```
[Trigger] Daily Patient / Smart Rounds / flagged case (Sloth, Envy)
   → [Action] one tap: patient walks in, complaint + history (Lust: mystery)
   → Objection! history contradictions (Wrath)
   → Choose tests → mini-games (Gluttony buffet)
   → Findings link into combos (Greed)
   → Commit differential + Confidence Wager (Pride)
   → Reveal: eye-dive cinematic + grade + Dr. Vale comparison + "% missed" (Lust, Pride, Envy)
   → [Variable reward] case drop + Atlas script slots filled (Greed, Gluttony)
   → [Investment] clinic upgrade; FSRS schedules the review / Revenge Queue (Greed, Wrath)
   → Shift summary = stopping cue (Temperance)
```

## 7. Modularity contract for engagement modules **[Design]**
- **Event bus is the only coupling.** The core publishes `CaseStarted`, `TestPerformed{testId, yield}`, `FindingDiscovered{findingId}`, `ContradictionRaised{statementId, evidenceId, valid}`, `DiagnosisCommitted{dxId, confidence}`, `CaseResolved{correct, grade, testsUsed, redFlagsCaught}`, `ReviewDue{itemId}`, `SessionTick{minutes}`.
- **Each sin is a module** with the shape `{id, virtue, subscribe(events), state, ui slots, config}`. Modules never import each other or clinical content. They read case metadata through a read-only `ContentAPI`.
- **Guardrail config lives beside each module and is required.** Examples: `dailyCap`, `optIn`, `notificationsMax`, `oddsVisible`.
- **The learning engine (FSRS, illness-script model) sits *below* the engagement layer.** Removing every sin module must leave a fully working, if plain, case-based tutor. This is a test the review agents should run.

## 8. Open questions for other research tracks
- **Clinical content:** which can't-miss conditions and masqueraders need optometrist validation for the boss cases. See 02-clinical-cases.md.
- **Test mini-game fidelity:** see 03-test-mechanics.md. The JCC refraction and retinoscopy mini-games need SME review.
- **Target success rate:** 70–85% is a working assumption, to be tuned with telemetry.
