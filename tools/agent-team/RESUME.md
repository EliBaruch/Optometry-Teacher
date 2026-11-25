# Agent team — build status & how to resume

The game is built by teams of builder agents, each checked by a strict critic agent
(visual polish, functionality, clinical accuracy, modularity, code quality, accessibility;
every score must be >= 8 or the work is sent back, up to 3 review rounds).

* `build-review.js` — the builder → critic → revise loop (Workflow script template)
* `units-*.json` — the brief for every unit (module) and the folders it owns
* `gen.py` — embeds unit briefs into a runnable script: `python3 gen.py wave2.js units-*.json`
* run a subset with Workflow args `{"only": ["unit-key", ...]}`

## Status at pause (2026-11-24, usage-limit pause)

| unit | status |
|---|---|
| learning-modes | ✅ passed review |
| content-diagnoses (57) | ✅ passed |
| content-cases-a/b/c (46 cases) | ✅ passed |
| audio | revised; round-2 review done — needs final round |
| ui-kit | built + reviewed once; revision interrupted |
| render-fx-avatar | built + reviewed once; revision interrupted |
| render-eye-fundus | build interrupted (partial code on disk) |
| sys-ranks, sys-economy, sys-streaks, sys-rivals, sys-collection, sys-emergencies, sys-comfort | build interrupted (partial) |
| scene-results, scene-meta | build interrupted (partial) |
| mg-visual-acuity, mg-phoropter, mg-color-vision, mg-amsler | build interrupted (partial) |
| mg-keratometry, mg-visual-fields | not started |
| scene-title, scene-hub, scene-exam, mg-retinoscopy, mg-pupils, mg-cover-test, mg-motility, mg-slit-lamp, mg-tonometry, mg-ophthalmoscopy | not started (need render-eye-fundus) |

Workflow run ids (same session resume via `resumeFromRunId`, cached agents replay instantly):
wf_fa54d3a9-c32 (ui-kit, audio · wave1.js) · wf_e24dfd0e-8db (render-fx-avatar, render-eye-fundus · wave1.js) ·
wf_a09adb36-637 (sys-ranks, sys-economy, sys-streaks · wave2.js) · wf_d78e444f-f28 (sys-rivals, sys-collection) ·
wf_9ef352fc-414 (sys-emergencies, sys-comfort) · wf_8a034212-fc7 (scene-results, scene-meta) ·
wf_f5a7b76d-d74 (mg-visual-acuity, mg-phoropter, mg-keratometry) · wf_7ae52ba3-802 (mg-color-vision, mg-amsler, mg-visual-fields)

Before resuming: start the dev server (`npx vite --port 5173 --strictPort --host 127.0.0.1`) — builders and
critics screenshot through it with `scripts/shot.cjs`.

## Update 2026-11-25 08:30 UTC (after second usage-limit stop at 06:50 UTC)
Built (reviews pending, cut off by the limit): all 7 systems, scene-results, scene-meta, mg-visual-acuity,
mg-phoropter, mg-color-vision, mg-amsler; partial: mg-keratometry, mg-visual-fields.
Now running: render revise (wf_e24dfd0e-8db), ui-kit revise (wf_fa54d3a9-c32),
[scene-exam, scene-hub] (wf_ea539bf2-c0d), [scene-title, mg-slit-lamp] (wf_84fa85db-8b9).
Still to resume later: wf_a09adb36-637, wf_d78e444f-f28, wf_9ef352fc-414 (system reviews),
wf_8a034212-fc7 (results/meta reviews), wf_f5a7b76d-d74, wf_7ae52ba3-802 (mini-game reviews/builds);
then new: mg-retinoscopy, mg-pupils, mg-cover-test, mg-motility, mg-tonometry, mg-ophthalmoscopy.

## Update 2026-11-25 ~08:45 UTC — model routing (owner request: stop inheriting Opus)
New script `lumen-v2.js` (template `build-review-v2.js`). Per role:
builder/reviser = Sonnet (effort high only for heavy units: scene-exam, render-eye-fundus, mg-slit-lamp,
mg-ophthalmoscopy, mg-retinoscopy, mg-phoropter; medium otherwise) · critic = Sonnet medium ·
new mechanical gate before every review = Haiku low (typecheck/boundaries/tests/language grep; failures skip
the expensive review and go straight to revise). Units carry `start`: review | continue | build.
Running: wf_53290a05-580 [scene-exam, scene-hub] · wf_21465cf8-bb9 [scene-title, mg-slit-lamp] ·
wf_88e15d8e-075 [render-eye-fundus, render-fx-avatar] · wf_33ec223f-117 [ui-kit, mg-visual-acuity]
Queued: systems ×7, scene-results, scene-meta, mg-phoropter/color-vision/amsler (review), mg-keratometry,
mg-visual-fields (continue), mg-retinoscopy/pupils/cover-test/motility/tonometry/ophthalmoscopy (build).
