import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '/Users/jela/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const root=new URL('../../',import.meta.url),folder=new URL('assets/senzai-kk02/',root);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',folder)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const review='/tmp/senzai-kk02-review';await fs.mkdir(review,{recursive:true});
const browser=await chromium.launch({executablePath:'/Users/jela/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const report={status:'passed',browser:'Chromium / SwiftShader, 1500×1100 and 390×844; functional review, not device performance',exports:[],checks:[],source_sha256:{}};
const ready=()=>page.waitForFunction(()=>window.senzai?.ready,null,{timeout:120000});
const snap=name=>page.screenshot({path:`${review}/${name}.png`});
try{
 await page.goto('http://localhost:8788/senzai-kk02/');await ready();await page.evaluate(()=>window.senzai.seek(15));
 await page.click('#settings');
 for(const lod of [1,0,2]){
  await page.selectOption('#lod',String(lod));await ready();await page.evaluate(()=>window.senzai.seek(15));
  const measured=await page.evaluate(()=>{
   const f=window.senzai,hidden=[];f.scene.traverse(n=>{if(n.name.startsWith('FX_')){hidden.push([n,n.visible]);n.visible=false;}});
   f.renderer.info.reset();f.renderer.render(f.scene,f.camera);const model={...f.renderer.info.render};hidden.forEach(([n,v])=>n.visible=v);
   f.renderer.info.autoReset=false;f.renderer.info.reset();f.composer.render();const complete={...f.renderer.info.render};f.renderer.info.autoReset=true;
   return {model,complete,static:f.rig.static,disabled:document.querySelector('#play').disabled};
  });
  const entry=manifest.assets.find(a=>a.lod===lod);assert.equal(measured.model.triangles,entry.triangles);assert.equal(measured.model.calls,entry.draw_calls);assert.equal(measured.static,lod===2);assert.equal(measured.disabled,lod===2);
  const downloadEvent=page.waitForEvent('download');await page.click('#download');const download=await downloadEvent;
  const downloadHash=sha(await fs.readFile(await download.path()));assert.equal(downloadHash,entry.sha256);
  report.exports.push({lod,download_sha256:downloadHash,model_render:measured.model,viewer_with_effects_and_postprocessing:measured.complete});
  await page.click('#settings');await snap(`lod${lod}`);await page.click('#settings');
 }
 await page.selectOption('#lod','1');await ready();await page.click('#settings');
 const sample=()=>page.evaluate(()=>{const f=window.senzai;return {time:f.time,frame:f.rig.frame.matrixWorld.elements,eyes:f.rig.tips.map(i=>i.position.toArray()),levels:f.state.states.map(s=>s.level),space:Array.from(f.space.group.children[0].geometry.attributes.position.array)};});
 await page.evaluate(()=>window.senzai.seek(10));const at7=await sample();await page.waitForTimeout(450);assert.deepEqual(await sample(),at7);
 await page.click('#play');await page.waitForTimeout(1100);await page.click('#play');const moving=await sample();assert(moving.time>at7.time);assert.notDeepEqual(moving.frame,at7.frame);assert.notDeepEqual(moving.eyes,at7.eyes);assert.notDeepEqual(moving.levels,at7.levels);assert.notDeepEqual(moving.space,at7.space);await page.click('#next-focus');assert(await page.evaluate(()=>window.senzai.playing));await page.evaluate(()=>window.senzai.setPlaying(false));
 for(const time of [0,5,8.7,10.75,15,19.7,27.7,29.8,37,40.7,47.7,49.75,58,65.7]){await page.locator('#time').fill(String(time));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.senzai.time),time);await snap(`time-${time}`);}
 await page.click('#dormant');assert.equal(await page.evaluate(()=>window.senzai.state.active),0);await snap('dormant');await page.click('#dormant');assert((await page.evaluate(()=>window.senzai.state.active))>=24);
 await page.evaluate(()=>window.senzai.seek(15));await page.click('[data-view=macro]');await page.waitForTimeout(250);await snap('macro');await page.click('[data-view=field]');
 await page.click('#settings');await page.uncheck('#space');await page.uncheck('#follow');await page.uncheck('#bloom');await page.locator('#fog').fill('0');await snap('no-atmosphere');await page.check('#space');await page.check('#follow');await page.check('#bloom');await page.locator('#fog').fill('1');await page.selectOption('#speed','.5');await page.selectOption('#speed','1');await page.click('#settings');
 await page.click('#restart');assert.equal(await page.evaluate(()=>window.senzai.time),0);await page.evaluate(()=>window.senzai.seek(15));
 await page.click('#cinema');assert(await page.locator('#stage').evaluate(e=>e.classList.contains('cinema')));await snap('cinema');await page.keyboard.press('Escape');assert(await page.locator('#play').isVisible());
 const pngEvent=page.waitForEvent('download');await page.click('#capture');const png=await pngEvent;const data=await fs.readFile(await png.path());assert.equal(data.subarray(1,4).toString(),'PNG');await fs.writeFile(new URL('preview.png',folder),data);
 report.checks.push('All 3 LODs render with measured model cost and byte-identical source downloads','Pause, play, scrub, restart, next focus; swift field movement, curved tip movement, light changes and projected 4D space motion','Dormant extinguishes all attention; awake restores the active foraging field','Whole-field and tracking macro cameras, space/follow toggles, fog/bloom, speed, cinema/Escape and PNG capture');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.senzai.setView('field'));await page.waitForTimeout(300);
 const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.toolbar button')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right};})}));assert.equal(mobile.overflow,false);assert(mobile.buttons.every(b=>b.left>=0&&b.right<=390));await snap('mobile');await page.click('#settings');assert(await page.locator('#download').isVisible());await snap('mobile-settings');
 report.checks.push('390px layout: no horizontal overflow, toolbar fits and settings/download remain accessible');
 assert.deepEqual(errors,[]);report.errors=errors;
 for(const p of ['senzai-kk02/viewer.js','senzai-kk02/effects.js','senzai-kk02/space.js','senzai-kk02/index.html','senzai-kk02/style.css','assets/senzai-kk02/runtime.js','tools/asset-pipeline/test-senzai-kk02.mjs'])report.source_sha256[p]=sha(await fs.readFile(new URL(p,root)));
 await fs.writeFile(new URL('browser-report.json',folder),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
