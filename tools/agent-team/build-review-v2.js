export const meta = {
  name: 'lumen-build-review-v2',
  description: 'Builder agents implement Lumen modules; critical reviewer agents inspect (code + screenshots) and send work back until it meets the $1M bar',
  phases: [
    { title: 'Build', detail: 'one builder per module (Sonnet; high effort only for heavy modules)' },
    { title: 'Checks', detail: 'Haiku gate: typecheck, boundaries, tests, language grep' },
    { title: 'Review', detail: 'strict critic per module, screenshots + checks' },
    { title: 'Revise', detail: 'builder fixes everything the critic flagged' },
  ],
}

const ROOT = '/home/user/Optometry-Teacher'
const MAX_FIX_ROUNDS = (args && args.maxFixRounds) || 2
const UNITS = args.units

const PREAMBLE = `You are a senior engineer + game artist on "Lumen — The Eye Clinic", a browser game (Vite + TypeScript + Preact, procedural art, no image assets) that teaches optometry. The owner wants it to look and feel like a $1M production. Repository: ${ROOT}.

READ FIRST: ${ROOT}/docs/ARCHITECTURE.md, ${ROOT}/docs/GAME_DESIGN.md, and the contracts in ${ROOT}/src/core/*.ts (especially the files relevant to you). If research notes exist in ${ROOT}/docs/research/ and docs/SINS.md, skim the parts relevant to your module.

PLAYER-FACING RULE (critical): players must NEVER see the words sin/sins/deadly/vice, sin names (pride, greed, envy, gluttony, lust, wrath, sloth) or religious framing anywhere in UI text, titles, achievements, tooltips, CSS class names visible as text, or console output. The seven sins are only an internal psychology lens (docs/ENGAGEMENT_DESIGN.md). Use the neutral clinic-themed names from docs/GAME_DESIGN.md.

HARD RULES (a reviewer will reject violations):
- Only create/modify files inside the paths you OWN (listed below). Other engineers are editing other folders concurrently. Never edit src/core, src/app (except your own sandbox page file if listed), package.json, or anything else not yours. If you truly need a core contract change, do NOT make it — put it in coreRequests in your final output and work around it.
- NEVER run git commands that change state (no git add/commit/stash/checkout/reset/clean). Read-only git (status/diff/log) is fine.
- Respect module boundaries (docs/ARCHITECTURE.md). Import only from allowed layers via aliases (@core, @ui-kit, @render). Only third-party package allowed: preact. Run: node scripts/check-boundaries.mjs (violations elsewhere that are not yours can be ignored).
- Typecheck only your module: npm run check:mod -- <your paths>. It must report zero errors in your paths.
- Write focused unit tests (vitest, *.test.ts next to the code) for any non-trivial logic; run them with: npx vitest run <your dir>.
- A Vite dev server is ALREADY running at http://localhost:5173 with hot reload. Do NOT start another server and do NOT kill it. Screenshot your work with: node scripts/shot.cjs "<query>" /tmp/shots/<name>.png [--mobile] [--click "<css selector>"] [--wait 1500] then LOOK at the PNG with the Read tool. Iterate on visuals until they are genuinely beautiful. Check mobile (375px) too. The script prints console errors — fix any from your module.
- Quality bar: luxurious "stained glass at midnight" art direction from GAME_DESIGN.md, smooth eased animation, juicy feedback, sound hooks via the AudioPort/FxPort (ctx.audio / services.audio, ctx.fx / services.fx), keyboard + touch support, prefers reduced motion honoured, no console errors, clean up all listeners/RAF/timers on unmount. Clinically accurate — an optometrist will review it.
- Use design tokens / components from @ui-kit when they exist (read src/ui-kit/ to see what is available). Keep files reasonably small and cohesive.

TOKEN BUDGET: be economical — read only the files you need, take at most ~6 screenshots per pass (desktop + one mobile is usually enough), do not paste large files into your reasoning, and stop iterating once the bar is met.

Your final answer is consumed by an orchestrator (not a human): return it via the structured output.`

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What you built, key design decisions' },
    filesTouched: { type: 'array', items: { type: 'string' } },
    api: { type: 'string', description: 'Public API / exports other modules can use, with signatures' },
    sandboxUrls: { type: 'array', items: { type: 'string' }, description: 'Query strings to view the work, e.g. ?sandbox=minigame/tonometry' },
    coreRequests: { type: 'array', items: { type: 'string' } },
    knownIssues: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'filesTouched', 'api', 'sandboxUrls', 'coreRequests', 'knownIssues'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'revise'] },
    scores: {
      type: 'object',
      properties: {
        visualPolish: { type: 'number' },
        functionality: { type: 'number' },
        clinicalAccuracy: { type: 'number' },
        modularity: { type: 'number' },
        codeQuality: { type: 'number' },
        accessibilityResponsive: { type: 'number' },
      },
      required: ['visualPolish', 'functionality', 'clinicalAccuracy', 'modularity', 'codeQuality', 'accessibilityResponsive'],
    },
    mustFix: { type: 'array', items: { type: 'string' }, description: 'Concrete, actionable defects with file paths. Empty if pass.' },
    niceToHave: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['verdict', 'scores', 'mustFix', 'niceToHave', 'summary'],
}

function ownership(u) {
  return `YOU OWN (may write only here): ${u.owns.join(', ')}`
}

function buildPrompt(u) {
  return `${PREAMBLE}\n\n=== YOUR MODULE: ${u.key} ===\n${ownership(u)}\n\n${u.brief}`
}

function reviewPrompt(u, report, round) {
  return `You are a merciless, senior reviewer (a mix of AAA game art director, staff engineer, and practising optometrist) on "Lumen", a browser game teaching optometry that must look and feel like a $1M production. Repository: ${ROOT}. Read docs/ARCHITECTURE.md and docs/GAME_DESIGN.md first.

You are reviewing module "${u.key}" (review round ${round}). The builder owns: ${u.owns.join(', ')}.
The module's brief was:
---
${u.brief}
---
The builder reports:
${JSON.stringify(report, null, 2)}

DO NOT EDIT ANY FILES. Investigate and judge:
1. Read every file in the owned paths.
2. Run: npm run check:mod -- ${u.owns.filter(p => p.startsWith('src/') && !p.includes('sandbox')).join(' ')} ; node scripts/check-boundaries.mjs ; npx vitest run ${u.owns.filter(p => p.startsWith('src/') && !p.includes('sandbox')).join(' ')} (if tests exist).
3. A dev server runs at http://localhost:5173 (do not start/kill servers). Screenshot with node scripts/shot.cjs "<query>" /tmp/shots/review-${u.key}-<n>.png [--mobile] [--click "<css>"] [--wait 1500] and LOOK at each PNG with the Read tool. Exercise the real interactions (click through with --click, or write a small throwaway Playwright script in /tmp using require('playwright') to drive it step by step). Check desktop 1440x900 AND mobile.
4. Score 1-10 each: visualPolish (would this impress in a $1M game? depth, light, typography, motion, juice — be harsh; programmer-art or flat default-looking UI is <= 5), functionality (does it fully work end-to-end, calls done() exactly once, no console errors, cleanup), clinicalAccuracy (real values/grading/behaviour; 10 if not applicable), modularity (only owned paths touched, contracts honoured, no cross-plugin imports, swappable), codeQuality (readable, typed, tested, no dead code, no leaks), accessibilityResponsive (keyboard, touch, 375px mobile, reduced motion, contrast).
5. Also grep the owned paths for player-visible sin language (sin, sins, deadly, pride, greed, envy, gluttony, lust, wrath, sloth) — any player-visible occurrence is a must-fix (internal 'drive' metadata fields are fine).
6. verdict = "pass" only if EVERY score >= 8 and there are no must-fix defects. Otherwise "revise", with mustFix items that are specific and actionable (what is wrong, where, what "good" looks like). Do not pass work out of politeness — the owner explicitly wants sub-par work sent back.`
}

function fixPrompt(u, report, review, round) {
  return `${buildPrompt(u)}\n\n=== REVISION ROUND ${round} ===\nYou (or a previous engineer) already built this module; the code is on disk. A strict reviewer rejected it. Previous build report:\n${JSON.stringify(report, null, 2)}\n\nReviewer verdict:\n${JSON.stringify(review, null, 2)}\n\nFix EVERY mustFix item, and as many niceToHave items as are worthwhile. Raise the visual polish further where the reviewer scored it below 9. Re-verify with checks and screenshots before finishing.`
}

// Model routing — no agent inherits the orchestrator's model.
const HEAVY = (u) => u.tier === 'heavy'
const M = {
  build: (u) => ({ model: 'sonnet', effort: HEAVY(u) ? 'high' : 'medium' }),
  revise: (u) => ({ model: 'sonnet', effort: HEAVY(u) ? 'high' : 'medium' }),
  review: (u) => ({ model: 'sonnet', effort: 'medium' }),
  checks: () => ({ model: 'haiku', effort: 'low' }),
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    failures: { type: 'array', items: { type: 'string' }, description: 'Exact error lines (file:line message), max 30' },
  },
  required: ['ok', 'failures'],
}

function srcPaths(u) { return u.owns.filter(p => p.startsWith('src/') && !p.includes('sandbox')).join(' ') }

function checksPrompt(u) {
  return `Mechanical verification only — do not edit files, do not judge design. Repository: ${ROOT}. Run these commands and report every failure that concerns the paths ${u.owns.join(', ')}:
1. cd ${ROOT} && npm run check:mod -- ${srcPaths(u)}
2. node scripts/check-boundaries.mjs   (only violations in the paths above count)
3. npx vitest run ${srcPaths(u)}   ("No test files found" is a failure only if the module has non-trivial logic files)
4. grep -rniE "\\b(sins?|deadly|pride|greed|envy|gluttony|lust|wrath|sloth)\\b" ${srcPaths(u)} — a hit is a failure ONLY if it is player-visible text (UI strings, titles, toasts, achievements); ignore 'drive:' metadata fields, comments, and identifiers.
ok = true when there are no failures.`
}

async function runUnit(u) {
  let report
  if (u.start === 'review') {
    report = { summary: 'Built in an earlier session; the code on disk is the deliverable. Review it as-is.', filesTouched: u.owns, api: 'see code', sandboxUrls: u.sandboxUrls || [], coreRequests: [], knownIssues: [] }
  } else {
    report = await agent(buildPrompt(u) + (u.start === 'continue' ? '\n\nNOTE: a previous engineer started this module and was interrupted; partial code is on disk in your folders. Read it, keep what is good, and finish the job.' : ''), { label: `build:${u.key}`, phase: 'Build', schema: BUILD_SCHEMA, ...M.build(u) })
    if (!report) return { key: u.key, status: 'build-failed' }
  }
  let review = null
  // Optional: carry a previous critic's verdict straight into a revision (saves a fresh review).
  const prior = args && args.priorReview && args.priorReview[u.key]
  if (prior) {
    const fixed = await agent(fixPrompt(u, report, prior, 0), { label: `revise:${u.key}#0`, phase: 'Revise', schema: BUILD_SCHEMA, ...M.revise(u) })
    if (fixed) report = fixed
  }
  for (let round = 1; round <= MAX_FIX_ROUNDS + 1; round++) {
    const chk = await agent(checksPrompt(u), { label: `checks:${u.key}#${round}`, phase: 'Checks', schema: CHECK_SCHEMA, ...M.checks() })
    // Drop gate false positives (e.g. Math.sin identifiers the reporter itself marked as ignorable).
    if (chk) chk.failures = (chk.failures || []).filter(f => !/not a failure|ignored|Math\.sin|identifier/i.test(f))
    if (chk && chk.failures.length) {
      log(`${u.key} round ${round}: mechanical checks failed (${chk.failures.length}) — straight to revise`)
      if (round > MAX_FIX_ROUNDS) { review = { verdict: 'revise', scores: null, mustFix: chk.failures, niceToHave: [], summary: 'mechanical checks failing' }; break }
      const mech = { verdict: 'revise', scores: null, mustFix: chk.failures, niceToHave: [], summary: 'Mechanical checks failed: fix these first (type errors / boundary violations / failing tests / player-visible forbidden words).' }
      const fixed = await agent(fixPrompt(u, report, mech, round), { label: `revise:${u.key}#${round}`, phase: 'Revise', schema: BUILD_SCHEMA, ...M.revise(u) })
      if (fixed) report = fixed
      continue
    }
    review = await agent(reviewPrompt(u, report, round), { label: `review:${u.key}#${round}`, phase: 'Review', schema: REVIEW_SCHEMA, ...M.review(u) })
    if (!review) break
    const sc = review.scores
    const minScore = Math.min(sc.visualPolish, sc.functionality, sc.clinicalAccuracy, sc.modularity, sc.codeQuality, sc.accessibilityResponsive)
    log(`${u.key} round ${round}: ${review.verdict} (min score ${minScore}, ${review.mustFix.length} must-fix)`)
    if (review.verdict === 'pass' && minScore >= 8) return { key: u.key, status: 'passed', rounds: round, report, review }
    if (round > MAX_FIX_ROUNDS) break
    const fixed = await agent(fixPrompt(u, report, review, round), { label: `revise:${u.key}#${round}`, phase: 'Revise', schema: BUILD_SCHEMA, ...M.revise(u) })
    if (fixed) report = fixed
  }
  return { key: u.key, status: 'needs-attention', report, review }
}

const results = await pipeline(UNITS, (u) => runUnit(u))
return results.filter(Boolean).map(r => ({
  key: r.key,
  status: r.status,
  rounds: r.rounds,
  scores: r.review && r.review.scores,
  openMustFix: r.status === 'passed' ? [] : (r.review && r.review.mustFix) || [],
  api: r.report && r.report.api,
  sandboxUrls: r.report && r.report.sandboxUrls,
  coreRequests: r.report && r.report.coreRequests,
  knownIssues: r.report && r.report.knownIssues,
}))
