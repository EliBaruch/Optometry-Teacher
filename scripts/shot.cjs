#!/usr/bin/env node
/**
 * Screenshot helper for builders & reviewers (uses the pre-installed Playwright).
 *   node scripts/shot.cjs "<query-or-path>" out.png [--w 1440] [--h 900] [--wait 1200]
 *        [--click "<css>"]... [--mobile] [--base http://localhost:5173/]
 * Prints console errors from the page so broken modules are visible.
 */
const { chromium, devices } = require('playwright');
const args = process.argv.slice(2);
const target = args[0] || '';
const out = args[1] || 'shot.png';
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const clicks = []; args.forEach((a, i) => { if (a === '--click') clicks.push(args[i + 1]); });
const base = opt('base', process.env.SHOT_BASE || 'http://localhost:5173/');
(async () => {
  const browser = await chromium.launch();
  const ctx = args.includes('--mobile')
    ? await browser.newContext({ ...devices['iPhone 13'] })
    : await browser.newContext({ viewport: { width: +opt('w', 1440), height: +opt('h', 900) }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  const url = target.startsWith('http') ? target : base + target.replace(/^\//, '');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(+opt('wait', 1200));
  for (const c of clicks) {
    try { await page.click(c, { timeout: 3000 }); await page.waitForTimeout(600); }
    catch (e) { errors.push(`[click failed] ${c}: ${e.message.split('\n')[0]}`); }
  }
  await page.screenshot({ path: out });
  console.log(`saved ${out} (${url})`);
  if (errors.length) console.log('Console problems:\n' + errors.slice(0, 30).join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
