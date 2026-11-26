const { chromium, devices } = require('playwright');
(async () => {
  const [url, out, mobile, wait, sel, scale] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = mobile === 'm' ? await b.newContext({ ...devices['iPhone 13'] }) : await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: +(scale||2) });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/' + url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(+(wait || 3000));
  const el = await p.$(sel);
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: out });
  await b.close();
})();
