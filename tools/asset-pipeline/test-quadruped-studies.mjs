// Actual WebGL UI coverage for the shared contact and seven-pose controls.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})}),results=[];
for(const [family,global,clip] of [['reckon-k9','reckonK9','Jump'],['mechanical-cheetah','mechanicalCheetah','Pounce']]){
 const page=await browser.newPage({viewport:{width:1480,height:1000},deviceScaleFactor:1}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:8788/${family}/`);await page.waitForFunction(g=>window[g]?.gltf,global);
 await page.locator(`[data-clip="${clip}"]`).click();assert.equal(await page.locator('[data-motion-pose]').count(),7);
 const meta=await page.evaluate(({global,clip})=>window[global].entry.clips.find(c=>c.name===clip),{global,clip}),poses=[];
 for(const [name,t] of Object.entries(meta.phase_landmarks_s)){
  await page.locator(`[data-motion-pose="${name}"]`).click();
  const state=await page.evaluate(({global})=>{const k=window[global];return {t:k.time,readout:document.querySelector('.motion-contact-readout').textContent,playhead:Number(document.querySelector('.contact-playhead').getAttribute('x1'))};},{global});assert(Math.abs(state.t-t)<.001);assert(Math.abs(state.playhead-(32+240*t/meta.duration_s))<.01);poses.push({name,...state});
  if(['push_off','apex','fore_contact','absorb'].includes(name))await page.screenshot({path:`/tmp/${family}-${name}-study.png`});
 }
 if(family==='reckon-k9'){
  for(const [name,order] of [['Run_Cycle','FL + HR → FR + HL'],['Pace_Cycle','FL + HL → FR + HR'],['Canter_Cycle','HL → HR + FL → FR']]){await page.locator(`[data-clip="${name}"]`).click();assert.equal(await page.locator('.motion-contact-order').textContent(),order);}
  await page.locator('[data-clip="Sprint_Cycle"]').click();await page.locator('#time').evaluate(el=>{el.value=.301;el.dispatchEvent(new Event('input'));});assert((await page.locator('.motion-contact-readout').textContent()).startsWith('Flight'));await page.screenshot({path:'/tmp/k9-contact-study.png'});
 }
 await page.locator(`[data-clip="${clip}"]`).click();await page.locator('[data-motion-pose="fore_contact"]').click();
 const chart=page.locator('.motion-contact-chart');await chart.click({position:{x:100,y:40}});assert(await page.evaluate(g=>window[g].time>0,global));
 await page.setViewportSize({width:390,height:844});await page.locator('[data-motion-pose="apex"]').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`/tmp/${family}-study-mobile.png`,fullPage:true});
 await page.locator('#lod').selectOption('2');await page.waitForFunction(g=>window[g].entry?.lod===2,global);assert(await page.locator('#motion-study').isHidden());
 assert.deepEqual(errors,[]);results.push({family,clip,poses,checks:['seven pose buttons and exact times','scrubbable contact tracks','live sole-height readout','gait order labels','mobile layout','static tier hides motion controls','no browser errors']});await page.close();
}
await browser.close();await fs.writeFile(new URL('../../source/motion-patterns/viewer-validation.json',import.meta.url),JSON.stringify({status:'passed',browser:'Chromium headless, real WebGL; no performance claim',results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
