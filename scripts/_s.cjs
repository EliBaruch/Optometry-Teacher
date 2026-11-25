const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
for(const h of [667,812,1000]){const p=await b.newPage({viewport:{width:375,height:h}});p.on('console',m=>m.type()==='error'&&console.log('ERR',m.text()));await p.goto('http://localhost:5173/?sandbox=minigame/pupils');await p.waitForTimeout(1500);const sk=p.getByText('Skip');if(await sk.count())await sk.first().click();await p.waitForTimeout(800);
console.log(h,await p.evaluate(()=>[document.querySelector('.pu-root').className,...[...document.querySelectorAll('.pu-actions-row button,.pu-panel--gauge')].map(e=>{const r=e.getBoundingClientRect();return Math.round(r.top)+'-'+Math.round(r.bottom)+' w'+Math.round(r.width)})]));
await p.screenshot({path:'/tmp/shots/pu'+h+'.png'});await p.close()}
await b.close()})()
