const { chromium, devices } = require('playwright');
(async()=>{
 const mobile=process.argv[2]==='m';
 const b=await chromium.launch();
 const c=mobile?await b.newContext({...devices['iPhone 13']}):await b.newContext({viewport:{width:1440,height:900}});
 const p=await c.newPage(); const errs=[];
 p.on('console',m=>{if(['error','warning'].includes(m.type()))errs.push(m.text())});
 p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:5173/?sandbox=minigame/keratometry'+(process.argv[3]||''),{waitUntil:'networkidle'});
 await p.waitForTimeout(1200);
 await p.click('text=Skip').catch(()=>{});
 await p.waitForTimeout(800);
 await p.screenshot({path:`/tmp/shots/kf-${process.argv[2]}-1.png`});
 console.log(errs.join('\n')||'no errors');
 await b.close();})();
