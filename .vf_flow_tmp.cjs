const { chromium, devices } = require('playwright');
(async () => {
  for (const mobile of [false, true]) {
    const b = await chromium.launch();
    const ctx = mobile ? await b.newContext({ ...devices['iPhone 13'] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); const errs = []; const tag = mobile ? 'm' : 'd';
    p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:5173/?sandbox=minigame/visual-fields', { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await p.getByText('Skip', { exact: true }).first().click();
    await p.waitForTimeout(500);
    const sweepBtn = () => p.getByRole('button', { name: /Auto 24-2/ });
    if (mobile) await p.getByRole('tab', { name: /Plot/ }).click();
    await sweepBtn().click();
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `/tmp/shots/review-mg-visual-fields-${tag}-sweep.png` });
    await p.waitForTimeout(14000);
    await p.screenshot({ path: `/tmp/shots/review-mg-visual-fields-${tag}-sweep2.png` });
    await p.getByRole('tab', { name: /OS/ }).click();
    await p.waitForTimeout(500);
    if (mobile) await p.getByRole('tab', { name: /Plot/ }).click().catch(() => {});
    await sweepBtn().click();
    await p.waitForTimeout(20000);
    const interp = p.getByTestId('vf-interpret');
    console.log(tag, 'interp disabled?', await interp.isDisabled());
    await interp.click(); await p.waitForTimeout(1200);
    await p.screenshot({ path: `/tmp/shots/review-mg-visual-fields-${tag}-interp.png` });
    const fams = await p.$$('[data-testid^="vf-family-"]'); console.log(tag, 'families', fams.length);
    await fams[0].click(); await p.waitForTimeout(300);
    const sides = await p.$$('[data-testid^="vf-side-"]'); if (sides.length) await sides[0].click();
    await p.screenshot({ path: `/tmp/shots/review-mg-visual-fields-${tag}-pick.png` });
    console.log(tag, 'errs', errs.slice(0, 5));
    await b.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
