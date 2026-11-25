const { chromium } = require('playwright');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(browser, id, caseId, vp, rm) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  await page.goto(`http://localhost:5173/?sandbox=minigame/${id}${caseId ? '&case=' + caseId : ''}`, { waitUntil: 'networkidle' });
  await sleep(800);
  const host = '[data-testid=minigame-host]';
  const skip = page.locator(`${host} .mot-card--tut button:has-text("Skip")`);
  if (await skip.count()) await skip.click();
  await sleep(300);
  const rec = page.locator(`${host} .mot-foot button.lm-btn--primary`);
  const early = await rec.isDisabled();
  if (id === 'motility') {
    await page.locator(`${host} .mot-stage`).focus();
    for (const k of '123456789') { await page.keyboard.press(k); await sleep(650); }
    if (await page.locator(`${host} .mot-tabs`).isVisible()) await page.locator(`${host} .mot-tabs button`).nth(1).click();
    const cells = page.locator(`${host} .mot-chart__grid button`);
    const n = await cells.count();
    for (let i = 0; i < n; i++) { await cells.nth(i).click(); await page.locator(`${host} .mot-g[data-g="0"]`).click(); }
  } else {
    const L = page.locator(`${host} .mot-root`);
    await L.focus().catch(() => {});
    const txt = () => page.locator(`${host} .mot-live`).first().textContent().catch(() => '');
    await page.keyboard.down('ArrowLeft');
    for (let i = 0; i < 120 && !/one eye out/.test(await page.locator(host).innerText().catch(() => '')) ; i++) await sleep(100);
    await page.keyboard.up('ArrowLeft'); await page.keyboard.press('b'); await sleep(300);
    await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 120 && /one eye out/.test(await page.locator(host).innerText()); i++) await sleep(100);
    await page.keyboard.up('ArrowRight'); await page.keyboard.press('b'); await sleep(500);
    for (let eye = 0; eye < 2; eye++) {
      await page.keyboard.down('ArrowLeft'); await sleep(1800); await page.keyboard.up('ArrowLeft');
      await page.keyboard.press('b'); await sleep(600);
    }
  }
  const lateDisabled = await rec.isDisabled();
  if (!lateDisabled) {
    await rec.click(); await sleep(500);
    const opt = page.locator(`${host} .mot-opt`).first();
    if (await opt.count()) { await opt.click(); await sleep(300); }
    await page.locator(`${host} .mot-overlay .lm-btn--primary`).click();
    await sleep(500);
  }
  const res = await page.locator('[data-testid=minigame-result]').count();
  await page.screenshot({ path: `/tmp/shots/e2e-${id}-${caseId ? 'case' : 'prac'}-${vp.width}${rm ? '-rm' : ''}.png` });
  console.log(id, caseId || 'practice', vp.width, rm ? 'RM' : '', { earlyDisabled: early, lateDisabled, done: res, errs: errs.slice(0, 3) });
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  const caseId = process.argv[2];
  for (const id of ['motility', 'convergence'])
    for (const vp of [{ width: 1440, height: 900 }, { width: 375, height: 740 }])
      for (const c of [caseId, '']) for (const rm of [false, true]) {
        if (rm && c) continue;
        await run(b, id, c, vp, rm).catch((e) => console.log(id, vp.width, 'FAIL', e.message.split('\n')[0]));
      }
  await b.close();
})();
