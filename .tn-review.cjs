const { chromium, devices } = require('playwright');
(async()=>{
 for (const mobile of [false,true]) {
  const b = await chromium.launch();
  const ctx = mobile ? await b.newContext({...devices['iPhone 13']}) : await b.newContext({viewport:{width:1440,height:900}});
  const p = await ctx.newPage(); const errs=[];
  p.on('console',m=>{if(['error','warning'].includes(m.type()))errs.push(m.text())}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:5173/?sandbox=minigame/tonometry',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
  const tag = mobile?'m':'d';
  for (let i=0;i<3;i++){ const n=p.locator('.tn-overlay button').last(); if(await n.count()) await n.click().catch(()=>{}); await p.waitForTimeout(300);}
  await p.screenshot({path:`/tmp/shots/review-mg-tonometry-${tag}-prep0.png`});
  await p.getByText('Instil one drop').click(); await p.waitForTimeout(1500);
  const dyeBtn = p.locator('.tn-prep button').filter({hasText:/strip|fluor|Hold/i}).first();
  console.log('dye btn', await dyeBtn.count());
  const bb = await dyeBtn.boundingBox();
  if(bb){ await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await p.mouse.down(); await p.waitForTimeout(1800); await p.mouse.up(); }
  await p.screenshot({path:`/tmp/shots/review-mg-tonometry-${tag}-prep1.png`});
  await p.getByText('Cobalt light on').click(); await p.waitForTimeout(1500);
  await p.screenshot({path:`/tmp/shots/review-mg-tonometry-${tag}-measure.png`});
  const scroll = await p.evaluate(()=>{const s=document.querySelector('.tn-stage');return s?[s.scrollHeight,s.clientHeight]:null});
  console.log(tag,'stage',scroll);
  // centre by key
  await p.locator('.tn-root').focus().catch(()=>{});
  console.log('errs',errs.slice(0,5));
  await b.close();
 }
})();
