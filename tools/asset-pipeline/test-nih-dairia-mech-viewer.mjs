import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NIH_VIEWER_BASE||'http://127.0.0.1:8791/',shots=process.env.NIH_SHOT_DIR||path.join(os.tmpdir(),'nih-dairia-review');await fs.mkdir(shots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1512,height:1000},deviceScaleFactor:1}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(base+'nih-dairia-mech/');await page.waitForFunction(()=>window.nihDairia?.entry);
async function visible(){return page.evaluate(async()=>{const T=await import('three'),v=new T.Vector3(),k=window.nihDairia;let max=0;k.root.updateMatrixWorld(true);k.camera.updateMatrixWorld(true);k.root.traverse(o=>{if(o.isMesh)for(let j=0;j<o.geometry.attributes.position.count;j++){o.getVertexPosition(j,v);v.applyMatrix4(o.matrixWorld).project(k.camera);max=Math.max(max,Math.abs(v.x),Math.abs(v.y));}});return max<.98;});}
async function capture(name){await page.addStyleTag({content:'#stage.capture .identity,#stage.capture .views,#stage.capture .stage-note,#stage.capture .scale-note{visibility:hidden}'});await page.evaluate(()=>document.getElementById('stage').classList.add('capture'));await page.locator('#stage').screenshot({path:path.join(shots,name+'.png')});await page.evaluate(()=>document.getElementById('stage').classList.remove('capture'));}
assert(await visible(),'initial framing');await page.screenshot({path:path.join(shots,'desktop.png')});
for(const [mode,t] of [['idle',1],['walk',.6],['extend',4],['anchor',8]]){
 await page.locator(`[data-mode="${mode}"]`).click();await page.evaluate(t=>window.nihDairia.scrub(t),t);assert(await visible(),mode+' framing');assert.equal(await page.evaluate(()=>window.nihDairia.state.feet.length),6);if(mode==='walk')assert.equal(await page.evaluate(()=>window.nihDairia.state.contacts),3);if(mode==='anchor')assert.equal(await page.evaluate(()=>window.nihDairia.state.anchor),1);await capture(mode);
}
await page.locator('[data-mode="idle"]').click();
for(const v of ['top','front','side','joint','claw','hero']){await page.locator(`[data-view="${v}"]`).click();if(!['joint','claw'].includes(v))assert(await visible(),v+' framing');await capture(v);}
for(const lod of ['1','2','0'])for(const encoding of ['meshopt','plain']){
 await page.locator('#lod').selectOption(lod);await page.locator('#encoding').selectOption(encoding);await page.waitForFunction(({lod,encoding})=>window.nihDairia.entry.lod===+lod&&window.nihDairia.encoding===encoding,{lod,encoding});assert.equal(await page.locator('#time').isDisabled(),lod==='2');assert.equal(await page.locator('#extension').isDisabled(),lod==='2');assert.equal(await page.locator('[data-mode="anchor"]').isDisabled(),lod==='2');assert.equal(await page.locator('#download').getAttribute('href'),`../assets/nih-dairia-mech/${encoding==='meshopt'?'derived/meshopt/':''}lod${lod}/nih_dairia_mech_d0_lod${lod}${encoding==='meshopt'?'.meshopt':''}.glb`);if(lod==='2'&&encoding==='plain')await capture('distance');
}
await page.locator('#wire').check();assert(await page.evaluate(()=>{let ok=true;window.nihDairia.root.traverse(o=>{if(o.isMesh&&!o.material.wireframe)ok=false;});return ok;}));await page.locator('#wire').uncheck();await page.locator('#skeleton').check();await page.locator('#markers').check();await capture('rig');await page.locator('#skeleton').uncheck();await page.locator('#markers').uncheck();
await page.locator('#extension').fill('1');assert.equal(await page.locator('#stroke').textContent(),'580 mm');assert(await visible(),'extended framing');await page.locator('#extension').fill('0');
await page.locator('[data-mode="walk"]').click();await page.locator('#play').click();await page.waitForFunction(()=>window.nihDairia.time>.1);await page.locator('#play').click();const t=await page.evaluate(()=>window.nihDairia.time);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.nihDairia.time),t);
await page.locator('[data-mode="anchor"]').click();await page.evaluate(()=>window.nihDairia.scrub(7.99));await page.locator('#play').click();await page.waitForFunction(()=>window.nihDairia.time===8);assert.equal(await page.locator('#play').textContent(),'Play');
await page.setViewportSize({width:390,height:844});await page.locator('[data-view="hero"]').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await visible(),'mobile anchor');await page.screenshot({path:path.join(shots,'mobile.png'),fullPage:true});
await page.locator('[data-mode="walk"]').click();await page.evaluate(()=>window.nihDairia.scrub(.6));assert(await visible(),'mobile walk');
await page.locator('[data-mode="idle"]').click();assert.deepEqual(errors,[]);
const hashes=await page.evaluate(()=>fetch('../assets/nih-dairia-mech/manifest.json').then(r=>r.json()).then(m=>m.assets.map(e=>({file:e.file,sha256:e.sha256,meshopt_sha256:e.meshopt_sha256}))));
await fs.writeFile(new URL('../../assets/nih-dairia-mech/viewer-validation.json',import.meta.url),JSON.stringify({status:'passed',browser:'Chromium / SwiftShader WebGL, functional inspection only; no performance claim',checks:['four behaviors / six-leg contacts','six camera presets','six tier/encoding combinations','static-tier motion lockout','selected download','wireframe / rig / contacts','full hydraulic extension','play / pause','one-shot terminal hold','desktop and 390px mobile framing','zero page errors'],asset_hashes:hashes},null,2)+'\n');
await browser.close();console.log('PASS Nih-Dairia viewer / desktop + mobile');
