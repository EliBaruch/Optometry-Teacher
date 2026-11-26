const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('http://localhost:5174/?lang=he&sandbox=minigame/motility', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  try { await p.click('text=דילוג', { timeout: 2000 }); } catch {}
  for (const k of '123456789') { await p.keyboard.press(k); await p.waitForTimeout(900); }
  await p.screenshot({ path: '/tmp/shots/he-review-he-mg-c-mo-swept.png' });
  await p.waitForTimeout(500);
  const cells = await p.$$('[aria-label*="מבט"][aria-label*="דירוג"]');
  console.log('cells', cells.length);
  for (const c of cells) { await c.click(); await p.click('button[aria-label="דירוג 0"]').catch(() => {}); }
  await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/shots/he-review-he-mg-c-mo-graded.png' });
  try { await p.click('text=רשמו ממצאים', { timeout: 3000 }); } catch { console.log('norec'); }
  await p.waitForTimeout(2000);
  await p.screenshot({ path: '/tmp/shots/he-review-he-mg-c-mo-rec.png' });
  await b.close();
})();
