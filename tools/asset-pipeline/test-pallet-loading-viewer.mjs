import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1}),errors=[];page.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const out=new URL('../../pallet-loading/',import.meta.url);await fs.mkdir(new URL('previews/',out),{recursive:true});
await page.goto(process.env.LOADING_VIEWER_URL||'http://127.0.0.1:8788/pallet-loading/');await page.waitForFunction(()=>window.loadingStation?.ready);
async function seek(t){await page.evaluate(t=>window.loadingStation.seek(t),t);}
async function camera(value){await page.locator('#camera').selectOption(value);}
async function visible(keys){const result=await page.evaluate(keys=>window.loadingStation.screens.filter(s=>keys.includes(s.key)).map(s=>({key:s.key,visible:s.corners.every(v=>Math.abs(v[0])<.99&&Math.abs(v[1])<.99&&v[2]>-1&&v[2]<1)})),keys);assert(result.every(s=>s.visible),'framing '+JSON.stringify(result)+' t='+await page.evaluate(()=>window.loadingStation.time));}
const sampled=[],metrics=[];
for(const lod of ['1','0']){
 await page.locator('#quality').selectOption(lod);await page.waitForFunction(lod=>window.loadingStation.ready&&window.loadingStation.lod===Number(lod),lod);
 await camera('director');
 for(const t of [0,1.5,3,3.4,3.9,4.4,5.35,6.4,7.6,8.35,9.4,10,10.7,11.9,12.65,13.7,14.9,15.65,16.7,17.4,19.4,21.4,22]){
  await seek(t);const s=await page.evaluate(()=>window.loadingStation.state);assert.equal(s.time,t);assert.equal(s.loaded,t<5.35?0:t<8.35?1:t<12.65?2:t<15.65?3:4);await visible(t<17.4?['stride','cup']:['stride','crate0','crate1','crate2','crate3']);sampled.push({lod:Number(lod),time:t,loaded:s.loaded,held:s.held});
 }
 // Measure only the model pass, removing the separate shadow-render workload.
 metrics.push(await page.evaluate(()=>{const k=window.loadingStation;k.renderer.shadowMap.enabled=false;k.renderer.render(k.scene,k.camera);const r={lod:k.lod,triangles:k.renderer.info.render.triangles,draw_calls:k.renderer.info.render.calls};k.renderer.shadowMap.enabled=true;return r;}));
 assert.equal(metrics.at(-1).draw_calls,44);assert.equal(metrics.at(-1).triangles,Number(lod)===1?19180:47052);
}
await camera('overview');for(const t of [0,7,17,22]){await seek(t);await visible(['stride','cup','crate0','crate1','crate2','crate3']);}
await camera('loading');await seek(14.9);await visible(['stride','cup','crate0','crate1','crate2','crate3']);
await camera('follow');for(const t of [0,9.8,19,22]){await seek(t);await visible(['stride']);}
await camera('top');await seek(0);await visible(['stride','cup','crate0','crate1','crate2','crate3']);
await camera('director');await seek(7.7);await page.locator('#wire').check();assert(await page.evaluate(()=>{let ok=true;window.loadingStation.actors.group.traverse(o=>{if(o.isMesh&&!o.material.wireframe)ok=false;});return ok;}));await page.locator('#wire').uncheck();
for(const [i,t]of [[0,0],[3,9.4],[6,17.4]]){await page.locator('#chapters button').nth(i).click();assert.equal(await page.evaluate(()=>window.loadingStation.time),t);assert.equal(await page.evaluate(()=>window.loadingStation.playing),false);}
await page.locator('#time').evaluate(el=>{el.value=5;el.dispatchEvent(new Event('input'));});assert.equal(await page.evaluate(()=>window.loadingStation.time),5);
await page.locator('#speed').selectOption('2');await seek(21.9);await page.locator('#play').click();await page.waitForFunction(()=>window.loadingStation.time===22&&!window.loadingStation.playing);assert.equal(await page.locator('#play').textContent(),'Play again');
await page.locator('#replay').click();await page.waitForFunction(()=>window.loadingStation.time>0&&window.loadingStation.time<2&&window.loadingStation.playing);await seek(0);await page.locator('#speed').selectOption('1');
assert.equal(await page.locator('#play').textContent(),'Play');await seek(14.85);assert((await page.locator('#clock').textContent()).startsWith('14.8'));await seek(0);
const stage=await page.locator('#stage').boundingBox();await page.mouse.move(stage.x+stage.width*.6,stage.y+stage.height*.5);await page.mouse.down();await page.mouse.move(stage.x+stage.width*.65,stage.y+stage.height*.52,{steps:6});await page.mouse.up();assert.equal(await page.locator('#camera').inputValue(),'orbit');await camera('director');
await page.locator('#fullscreen').click();await page.waitForFunction(()=>document.fullscreenElement);assert(await page.evaluate(()=>Math.abs(document.getElementById('stage').clientHeight-innerHeight)<2));await page.evaluate(()=>document.exitFullscreen());
for(const [label,t]of [['arrive',0],['pick',3.85],['transfer',7.65],['index',10],['four-loaded',16.7],['depart',19.3]]){await seek(t);await page.locator('#stage').screenshot({path:new URL('previews/'+label+'.png',out).pathname});}
await seek(14.85);await page.screenshot({path:new URL('previews/desktop.png',out).pathname,fullPage:true});
const hide=await page.addStyleTag({content:'.scene-top,.scene-bottom{visibility:hidden}'});await seek(14.85);await page.locator('#stage').screenshot({path:new URL('preview.png',out).pathname});await hide.evaluate(el=>el.remove());
await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.getElementById('stage').clientWidth<400);
for(const t of [0,3.85,7.65,10,14.85,19.3,22]){await seek(t);await visible(t<17.4?['stride','cup']:['stride','crate0','crate1','crate2','crate3']);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');}
await seek(14.85);await page.screenshot({path:new URL('previews/mobile.png',out).pathname,fullPage:true});
for(const file of ['README.md','manifest.json','validation.json','station_d0_lod0.glb','station_d0_lod1.glb','station_d0_lod2.glb'])assert((await page.request.get(new URL(file,page.url()).href)).ok(),file);
assert.equal(await page.locator('.workshop-header').count(),1);assert.deepEqual(errors,[]);
const report={status:'passed',browser:'Chromium headless WebGL; functional/visual checks, not an FPS benchmark',pose_samples:sampled,measured_model_pass:metrics,checks:['Both animated detail tiers; 46 milestone poses and exact package counts','All camera modes, director framing and mobile 390px layout','Replay, one-shot end, forward/back scrubbing, chapters, speed, orbit, wireframe, fullscreen','Three station GLB downloads and scene documentation','Shared Workshop navigation and no browser errors'],errors};await fs.writeFile(new URL('viewer-validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',poses:sampled.length,metrics,errors},null,2));await browser.close();
