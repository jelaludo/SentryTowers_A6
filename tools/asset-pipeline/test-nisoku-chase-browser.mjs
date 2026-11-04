import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
await page.goto(process.env.VIEWER_URL||'http://127.0.0.1:8791/nisoku03-chase/');await page.waitForFunction(()=>window.nisokuChase?.ready,{timeout:60000});await page.evaluate(()=>nisokuChase.playing=false);await page.click('#library-mode');await page.waitForFunction(()=>nisokuChase.mode==='library',{timeout:60000});
const report=await page.evaluate(()=>{
 const api=nisokuChase,render=api.renderer.render,results=[];api.renderer.render=()=>{};
 function signature(){const v=[];api.human.root.traverse(o=>{if(o.isBone)v.push(...o.position.toArray(),...o.quaternion.toArray())});return v}
 const before=signature();let changed=0,poses=0;
 for(const option of [...document.querySelector('#motion').options]){
  const select=document.querySelector('#motion');select.value=option.value;select.dispatchEvent(new Event('change'));
  for(const take of [...document.querySelector('#take').options]){
   const t=document.querySelector('#take');t.value=take.value;t.dispatchEvent(new Event('change'));const d=Number(document.querySelector('#time').max);
   for(const fraction of [.05,.51,.96]){api.seek(d*fraction);const sig=signature();if(!sig.every(Number.isFinite))throw Error('Nonfinite '+take.value);if(sig.some((v,i)=>Math.abs(v-before[i])>.01))changed++;poses++}
   results.push({movement:option.value,take:take.value,duration_s:d});
  }
 }
 document.querySelector('#motion').value='game-idle';document.querySelector('#motion').dispatchEvent(new Event('change'));api.seek(0);const after=signature();let maxRestoreError=Math.max(...before.map((v,i)=>Math.abs(v-after[i])));
 api.renderer.render=render;api.draw();return {takes:results.length,poses,changed,maxRestoreError,results};
});
await page.selectOption('#motion','game-sprint-forward');await page.selectOption('#take','game-sprint-forward-seed822');report.reviewOnlyLabel=await page.locator('#take-note').textContent();if(!report.reviewOnlyLabel.includes('Review only'))throw Error('Review-only label absent');
await page.selectOption('#motion','recorded-hero-landing');report.landingWarning=await page.locator('#take-note').textContent();
await page.click('#story-mode');await page.evaluate(()=>nisokuChase.seek(7.83));await page.screenshot({path:'/tmp/nisoku-chase-desktop-final.png'});
await page.click('#overview');await page.screenshot({path:'/tmp/nisoku-chase-court.png'});
await page.click('#follow');await page.evaluate(()=>nisokuChase.seek(14.95));await page.screenshot({path:'/tmp/nisoku-chase-left-contact.png'});
await page.evaluate(()=>nisokuChase.seek(35.84));await page.screenshot({path:'/tmp/nisoku-chase-right-contact.png'});
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>nisokuChase.seek(3));await page.screenshot({path:'/tmp/nisoku-chase-mobile.png',fullPage:true});report.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(report.mobileOverflow)throw Error('Mobile overflow');
await page.locator('#time').fill('12.5');report.scrubPaused=await page.evaluate(()=>!nisokuChase.playing);await page.click('#restart');report.restartTime=await page.evaluate(()=>nisokuChase.time);report.errors=errors;if(errors.length)throw Error(errors.join('\n'));if(report.takes!==212||report.maxRestoreError>1e-6)throw Error('Library coverage/restore failed');
await fs.writeFile(new URL('../../assets/nisoku03-kimodo/browser-validation.json',import.meta.url),JSON.stringify({date:'2026-11-04',browser:'Playwright Chromium / SwiftShader; visual and functional testing only',...report},null,2)+'\n');console.log(JSON.stringify({...report,results:undefined},null,2));await browser.close();
