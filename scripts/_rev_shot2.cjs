const { chromium, devices } = require('playwright');
(async () => {
  const [url, out, mobile, wait, clip] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = mobile === 'm' ? await b.newContext({ ...devices['iPhone 13'] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/' + url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(+(wait || 3000));
  await p.screenshot({ path: out, fullPage: false });
  const txt = await p.evaluate(() => document.body.innerText);
  require('fs').writeFileSync(out + '.txt', txt);
  await b.close();
})();
