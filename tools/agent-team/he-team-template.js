export const meta = {
  name: 'lumen-hebrew-edition',
  description: 'Native-Hebrew writer agents rewrite every module for the Hebrew edition; a native-Hebrew editor critic reviews (screenshots + text) and sends work back',
  phases: [
    { title: 'Write', detail: 'Sonnet writers (high effort for clinical content)' },
    { title: 'Checks', detail: 'Haiku mechanical gate' },
    { title: 'Edit', detail: 'Sonnet native-Hebrew editor critic' },
    { title: 'Rewrite', detail: 'writer applies the editor notes' },
  ],
}

const ROOT = '/home/user/Optometry-Teacher'
const MAX_FIX_ROUNDS = (args && typeof args.maxFixRounds === 'number') ? args.maxFixRounds : 2
const LIBRARY = __LIBRARY__
const UNITS = (args && args.only) ? LIBRARY.filter(u => args.only.includes(u.key)) : LIBRARY

const PREAMBLE = `You are a native Hebrew writer (born and raised in Israel) with an optometry background, working on the HEBREW EDITION of "Lumen", a browser game (Vite + TypeScript + Preact) that teaches optometry. Repository: ${ROOT}.

READ FIRST, fully: ${ROOT}/docs/LOCALIZATION.md (the binding guide: native voice, NOT translation; Israeli clinical terminology; plural imperative to the player; patient gender agreement; RTL rules; no sin language). Then skim docs/ARCHITECTURE.md and src/core/i18n.ts (defineStrings, pickStrings, CaseText, DiagnosisText, miniGameText, modeText, testText) and src/ui-kit/context.tsx (useLocale, useStrings).

THE CORE RULE: never translate sentence-by-sentence. For each piece of text, understand its purpose (the feeling, the joke, the clinical lesson, the nudge) and write it fresh in Hebrew as a gifted Israeli writer would. Adapt names, places and cultural references to Israel where natural, keeping every clinical fact identical.

HARD RULES:
- Only edit files inside the paths you OWN (listed below). Other writers work in parallel on other folders. Never edit src/core, src/app or package.json.
- NEVER run git commands that change state.
- The ENGLISH edition must remain exactly as it is: when you move English literals into a strings table, copy them verbatim. Existing tests must keep passing.
- Respect module boundaries (node scripts/check-boundaries.mjs). Typecheck your paths: npm run check:mod -- <your src paths>. Run your tests: npx vitest run <your src paths>.
- A Vite dev server already runs at http://localhost:5173 (do not start/kill one). View the Hebrew edition by adding lang=he to the query, e.g. node scripts/shot.cjs "?lang=he&sandbox=scene/hub" /tmp/shots/he-<name>.png [--mobile] and LOOK at the PNG with the Read tool. Check desktop and 375px. Fix RTL problems you see in your module (logical CSS properties; clinical spatial views stay dir="ltr"; directional icons flip; mixed Hebrew/Latin runs read correctly).
- TOKEN BUDGET: be economical — read only what you need, at most ~6 screenshots per pass.

Your final answer is consumed by an orchestrator: return it via the structured output.`

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesTouched: { type: 'array', items: { type: 'string' } },
    api: { type: 'string', description: 'How the module now picks its strings' },
    sandboxUrls: { type: 'array', items: { type: 'string' } },
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
        hebrewNativeness: { type: 'number', description: 'Reads as if originally written in Hebrew by a native speaker' },
        clinicalTerminology: { type: 'number' },
        completeness: { type: 'number', description: 'No player-visible English left in the Hebrew edition (except accepted clinical abbreviations/units)' },
        rtlLayout: { type: 'number' },
        englishUnchanged: { type: 'number' },
        codeQuality: { type: 'number' },
      },
      required: ['hebrewNativeness', 'clinicalTerminology', 'completeness', 'rtlLayout', 'englishUnchanged', 'codeQuality'],
    },
    mustFix: { type: 'array', items: { type: 'string' }, description: 'Concrete defects with file paths; for language issues quote the bad Hebrew and give the better Hebrew.' },
    niceToHave: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['verdict', 'scores', 'mustFix', 'niceToHave', 'summary'],
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, failures: { type: 'array', items: { type: 'string' } } },
  required: ['ok', 'failures'],
}

const isContent = (u) => u.kind === 'content'
const M = {
  write: (u) => ({ model: 'sonnet', effort: isContent(u) || u.tier === 'heavy' ? 'high' : 'medium' }),
  edit: () => ({ model: 'sonnet', effort: 'high' }),
  checks: () => ({ model: 'haiku', effort: 'low' }),
}
const srcPaths = (u) => u.owns.filter(p => p.startsWith('src/')).join(' ')

function writePrompt(u) {
  return `${PREAMBLE}\n\n=== YOUR ASSIGNMENT: ${u.key} ===\nYOU OWN (may write only here): ${u.owns.join(', ')}\n\n${u.brief}`
}

function checksPrompt(u) {
  return `Mechanical verification only — do not edit files, do not judge language. Repository: ${ROOT}. Run and report every failure that concerns ${u.owns.join(', ')}:
1. cd ${ROOT} && npm run check:mod -- ${srcPaths(u)}
2. node scripts/check-boundaries.mjs   (only violations in the paths above count)
3. npx vitest run ${srcPaths(u)} ${isContent(u) ? 'tests/content-he.test.ts tests/content.test.ts' : ''}
${isContent(u) ? '' : `4. grep -rLE "defineStrings|pickStrings|useStrings|miniGameText|modeText|testText" ${srcPaths(u)} --include=*.tsx | head — list .tsx files that render text but never use the localisation helpers ONLY if they contain JSX text literals with English words (open them to check); files with no player-visible text are fine.`}
ok = true when there are no failures.`
}

function editPrompt(u, report, round) {
  return `You are the senior editor of the Hebrew edition of "Lumen" (an optometry teaching game): a native Hebrew speaker, editor of Israeli medical textbooks, and a practising Israeli optometrist. You are merciless about translationese ("עברית מתורגמת"), wrong gender agreement, unnatural word order, calques, stiff register, wrong clinical terms, and broken RTL. Repository: ${ROOT}. Read docs/LOCALIZATION.md first — it is the standard you enforce.

Reviewing "${u.key}" (round ${round}). Owned paths: ${u.owns.join(', ')}.
The assignment was:
---
${u.brief}
---
The writer reports:
${JSON.stringify(report, null, 2)}

DO NOT EDIT FILES. Do this:
1. Read the Hebrew text in the owned paths (strings tables / overlays) side by side with the English. For each, ask: would an Israeli write it this way from scratch? Is the clinical term what Israeli optometrists say? Gender/number agreement right (player = plural imperative; patients by their sex)? Any leftover English visible to a Hebrew player (other than accepted abbreviations like OD/OS, IOP, mmHg, 20/40)?
2. ${isContent(u) ? 'Check clinical faithfulness: every fact, number and nuance of the English case/diagnosis is preserved; cultural adaptations are natural and consistent with age/sex/avatar.' : 'Screenshot the module in the Hebrew edition (node scripts/shot.cjs "?lang=he&<sandbox query>" /tmp/shots/he-review-' + u.key + '-<n>.png [--mobile]) at desktop and 375px and LOOK at each PNG: RTL flow, alignment, punctuation at the right end, clinical spatial views NOT mirrored (OD on the viewer\'s left, charts/fundus/rulers unflipped), directional icons flipped, no clipped Hebrew, fonts render (Frank Ruhl Libre / Heebo).'}
3. Verify the English edition is unchanged: git diff -- ${srcPaths(u)} and confirm moved English strings are verbatim (and spot-check an English screenshot without lang=he).
4. Run: npm run check:mod -- ${srcPaths(u)} ; npx vitest run ${srcPaths(u)}${isContent(u) ? ' tests/content-he.test.ts' : ''}.
5. Score 1-10: hebrewNativeness, clinicalTerminology, completeness, rtlLayout (10 for pure-data content), englishUnchanged, codeQuality. verdict "pass" only if every score >= 8 and there are no must-fix items. For each language must-fix, quote the current Hebrew and give your better Hebrew. Do not pass out of politeness.`
}

function rewritePrompt(u, report, review, round) {
  return `${writePrompt(u)}\n\n=== EDITOR NOTES, ROUND ${round} ===\nYou (or a previous writer) already did this work; it is on disk. The senior Hebrew editor sent it back.\nPrevious report:\n${JSON.stringify(report, null, 2)}\n\nEditor's verdict:\n${JSON.stringify(review, null, 2)}\n\nFix EVERY must-fix item (use the editor's Hebrew where it is better, or improve on it), apply worthwhile nice-to-haves, and re-verify.`
}

async function runUnit(u) {
  const reviewOnly = args && args.reviewOnly && args.reviewOnly.includes(u.key)
  let report = reviewOnly
    ? { summary: 'Written in an earlier round; the code on disk is the deliverable. Review it as-is.', filesTouched: u.owns, api: 'see code', sandboxUrls: [], coreRequests: [], knownIssues: [] }
    : await agent(writePrompt(u), { label: `write:${u.key}`, phase: 'Write', schema: BUILD_SCHEMA, ...M.write(u) })
  if (!report) return { key: u.key, status: 'write-failed' }
  let review = null
  // Optional: hand a previous editor's verdict straight to the writer (saves a fresh review).
  const prior = args && args.priorReview && args.priorReview[u.key]
  if (prior) {
    const fixed = await agent(rewritePrompt(u, report, prior, 0), { label: `rewrite:${u.key}#0`, phase: 'Rewrite', schema: BUILD_SCHEMA, ...M.write(u) })
    if (fixed) report = fixed
  }
  for (let round = 1; round <= MAX_FIX_ROUNDS + 1; round++) {
    const chk = await agent(checksPrompt(u), { label: `checks:${u.key}#${round}`, phase: 'Checks', schema: CHECK_SCHEMA, ...M.checks() })
    if (chk) chk.failures = (chk.failures || []).filter(f => !/not a failure|ignored|no player-visible|not opened|unconfirmed|\.test\.tsx?|test file|no failures|all passed|passed with no|\bpassed\b.*\bpassed\b/i.test(f))
    if (chk && chk.ok) chk.failures = []
    if (chk && chk.failures.length) {
      log(`${u.key} round ${round}: mechanical checks failed (${chk.failures.length})`)
      if (round > MAX_FIX_ROUNDS) { review = { verdict: 'revise', scores: null, mustFix: chk.failures, niceToHave: [], summary: 'mechanical checks failing' }; break }
      const mech = { verdict: 'revise', scores: null, mustFix: chk.failures, niceToHave: [], summary: 'Mechanical checks failed: fix these first.' }
      const fixed = await agent(rewritePrompt(u, report, mech, round), { label: `rewrite:${u.key}#${round}`, phase: 'Rewrite', schema: BUILD_SCHEMA, ...M.write(u) })
      if (fixed) report = fixed
      continue
    }
    review = await agent(editPrompt(u, report, round), { label: `edit:${u.key}#${round}`, phase: 'Edit', schema: REVIEW_SCHEMA, ...M.edit() })
    if (!review) break
    const s = review.scores
    const min = Math.min(s.hebrewNativeness, s.clinicalTerminology, s.completeness, s.rtlLayout, s.englishUnchanged, s.codeQuality)
    log(`${u.key} round ${round}: ${review.verdict} (min ${min}, ${review.mustFix.length} must-fix)`)
    if (review.verdict === 'pass' && min >= 8) return { key: u.key, status: 'passed', rounds: round, review }
    if (round > MAX_FIX_ROUNDS) break
    const fixed = await agent(rewritePrompt(u, report, review, round), { label: `rewrite:${u.key}#${round}`, phase: 'Rewrite', schema: BUILD_SCHEMA, ...M.write(u) })
    if (fixed) report = fixed
  }
  return { key: u.key, status: 'needs-attention', review }
}

const results = await pipeline(UNITS, (u) => runUnit(u))
return results.filter(Boolean).map(r => ({ key: r.key, status: r.status, rounds: r.rounds, scores: r.review && r.review.scores, openMustFix: r.status === 'passed' ? [] : (r.review && r.review.mustFix) || [], summary: r.review && r.review.summary }))
