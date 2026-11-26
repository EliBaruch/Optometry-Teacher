const { chromium, devices } = require('playwright');
(async () => {
  const [url, out, mobile, clickSel] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = mobile === 'm' ? await b.newContext({ ...devices['iPhone 13'] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/' + url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  if (clickSel) { try { await p.click(clickSel, { timeout: 3000 }); await p.waitForTimeout(800); } catch (e) { console.log('click fail', e.message.split('\n')[0]); } }
  // find scrollable element
  const h = await p.evaluate(() => { let best = document.scrollingElement; document.querySelectorAll('*').forEach(e => { if (e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY !== 'visible' && e.clientHeight > 300 && e.scrollHeight > (best?.scrollHeight||0)) best = e; }); return best ? best.scrollHeight : 900; });
  console.log('height', h);
  await p.setViewportSize({ width: mobile === 'm' ? 390 : 1440, height: Math.min(h + 50, 6000) });
  await p.waitForTimeout(800);
  await p.screenshot({ path: out });
  await b.close();
})();
