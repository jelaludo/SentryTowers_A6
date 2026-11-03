import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.ROKU_VIEWER_BASE||'http://127.0.0.1:8791/',shots=process.env.ROKU_SHOT_DIR||path.join(os.tmpdir(),'rokuroku66-review');await fs.mkdir(shots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1512,height:1000},deviceScaleFactor:1}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try {
await page.goto(base+'rokuroku66/');await page.waitForFunction(()=>window.rokuroku?.entry);
async function framing(){return page.evaluate(async()=>{const T=await import('three'),v=new T.Vector3(),k=window.rokuroku;let max=0;k.root.updateMatrixWorld(true);k.camera.updateMatrixWorld(true);const check=o=>{if(o.isMesh&&o.visible)for(let j=0;j<o.geometry.attributes.position.count;j++){o.getVertexPosition(j,v);v.applyMatrix4(o.matrixWorld).project(k.camera);max=Math.max(max,Math.abs(v.x),Math.abs(v.y));}};k.root.traverse(check);if(k.pole.visible)k.pole.traverse(check);return max;});}
async function visible(label){const m=await framing();assert(m<.98,`${label}: NDC ${m}`);}
await page.addStyleTag({content:'#stage.capture .identity,#stage.capture .views,#stage.capture .stage-note,#stage.capture .scale-note{visibility:hidden}'});
async function capture(name){await page.evaluate(()=>document.getElementById('stage').classList.add('capture'));await page.locator('#stage').screenshot({path:path.join(shots,name+'.png')});await page.evaluate(()=>document.getElementById('stage').classList.remove('capture'));}
await visible('initial');await page.screenshot({path:path.join(shots,'desktop.png')});
for(const mode of ['walk','scout','mixed','extended','arc','spiral','wrap','manual']){
 await page.locator(`[data-mode="${mode}"]`).click();await visible(mode);assert.equal(await page.evaluate(()=>Object.keys(window.rokuroku.state.poses).length),6);await capture(mode);
}
for(const [mode,duration] of [['walk',4.8],['scout',5.6]]){
 await page.locator(`[data-mode="${mode}"]`).click();assert(await page.locator('#amount').isDisabled());assert(!(await page.locator('#travel').isDisabled()));
 assert.equal(await page.locator('.contacts .sensor').count(),mode==='scout'?2:0);
 await page.locator('#play').click();await page.locator('#play').click();
 for(let i=0;i<6;i++){await page.evaluate(({t})=>window.rokuroku.scrub(t,false),{t:duration*i/6});await visible(mode+' phase '+i);await capture(mode+'-'+i);}
}
await page.locator('[data-mode="walk"]').click();await page.evaluate(()=>window.rokuroku.scrub(4.79));await page.locator('#play').click();await page.waitForFunction(()=>window.rokuroku.travelTime>4.9);await page.locator('#play').click();assert(await page.evaluate(()=>{const k=window.rokuroku;return k.time<1&&Math.abs(k.grid.position.z+(k.travelTime*k.state.speed_m_s)%1)<1e-8;}));await page.locator('#travel').uncheck();assert.equal(await page.evaluate(()=>window.rokuroku.grid.position.z),0);await page.locator('#travel').check();
await page.locator('[data-mode="wrap"]').click();
for(const limb of ['01','02','03','04','05','06']){await page.locator('#limb').selectOption(limb);await visible('wrap '+limb);assert.deepEqual(await page.evaluate(()=>window.rokuroku.state.active),[limb]);assert(await page.evaluate(()=>window.rokuroku.state.max_pitch>.1&&window.rokuroku.state.max_yaw>.1));}
await page.locator('#limb').selectOption('01');await capture('pole-wrap');
await page.locator('[data-mode="manual"]').click();await page.locator('#limb').selectOption('03');const before=await page.evaluate(()=>window.rokuroku.state.poses);
await page.locator('#yaw').fill('-0.24');await page.locator('#pitch').fill('0.18');const after=await page.evaluate(()=>window.rokuroku.state.poses);
for(const id of ['01','02','04','05','06'])assert.deepEqual(after[id],before[id]);assert.equal(after['03'][10][0],-.24);assert.equal(after['03'][10][1],.18);await visible('manual');
await page.locator('#limb').selectOption('01');await page.locator('[data-mode="arc"]').click();
for(const view of ['top','front','side','joint','scales','hero']){await page.locator(`[data-view="${view}"]`).click();if(!['joint','scales'].includes(view))await visible(view);await capture(view==='joint'?'gimbal':view);}
await page.locator('#armor').uncheck();assert(await page.evaluate(()=>{let seen=0,hidden=0;window.rokuroku.root.traverse(o=>{if(o.isMesh){seen++;if(o.material.name==='IVORY_SCALES'&&!o.visible)hidden++;}});return seen>1&&hidden>0;}));await page.locator('#armor').check();
await page.locator('#wire').check();assert(await page.evaluate(()=>{let ok=true;window.rokuroku.root.traverse(o=>{if(o.isMesh&&!o.material.wireframe)ok=false;});return ok;}));await page.locator('#wire').uncheck();await page.locator('#skeleton').check();await capture('rig');await page.locator('#skeleton').uncheck();
for(const lod of ['1','2','0'])for(const encoding of ['meshopt','plain']){
 await page.locator('#lod').selectOption(lod);await page.locator('#encoding').selectOption(encoding);await page.waitForFunction(({lod,encoding})=>window.rokuroku.entry.lod===+lod&&window.rokuroku.encoding===encoding,{lod,encoding});
 assert.equal(await page.locator('#time').isDisabled(),lod==='2');assert.equal(await page.locator('[data-mode="wrap"]').isDisabled(),lod==='2');assert.equal(await page.locator('#armor').isDisabled(),lod==='2');assert.equal(await page.locator('#download').getAttribute('href'),`../assets/rokuroku66/${encoding==='meshopt'?'derived/meshopt/':''}lod${lod}/rokuroku66_d0_lod${lod}${encoding==='meshopt'?'.meshopt':''}.glb`);await visible('LOD '+lod+' '+encoding);if(lod!=='2'){for(const gait of ['walk','scout']){await page.locator(`[data-mode="${gait}"]`).click();await page.evaluate(()=>window.rokuroku.scrub(.7));assert(await page.evaluate(()=>window.rokuroku.state.contacts>=3));await visible(gait+' '+lod+' '+encoding);}await page.locator('[data-mode="arc"]').click();}if(lod==='2'&&encoding==='plain')await capture('distance');
}
await page.locator('[data-mode="spiral"]').click();await page.locator('#amount').fill('0.5');assert.equal(await page.evaluate(()=>window.rokuroku.state.strength),.5);await visible('half spiral');await page.locator('#amount').fill('1');
await page.locator('#time').fill('0');await visible('uncoiled scrub');await page.locator('#time').fill('6');await visible('coiled scrub');
await page.locator('#play').click();await page.waitForFunction(()=>window.rokuroku.time>6.1);await visible('playing');await page.locator('#play').click();const t=await page.evaluate(()=>window.rokuroku.time);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.rokuroku.time),t);
await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>Math.abs(window.rokuroku.camera.aspect-document.getElementById('stage').clientWidth/document.getElementById('stage').clientHeight)<1e-5);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
for(const mode of ['walk','scout','mixed','extended','arc','spiral','wrap','manual']){await page.locator(`[data-mode="${mode}"]`).click();await page.locator('[data-view="hero"]').click();await visible('mobile '+mode);}
await page.locator('[data-mode="scout"]').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(shots,'mobile.png'),fullPage:true});
assert.deepEqual(errors,[]);const hashes=await page.evaluate(()=>fetch('../assets/rokuroku66/manifest.json').then(r=>r.json()).then(m=>m.assets.map(e=>({file:e.file,sha256:e.sha256,meshopt_sha256:e.meshopt_sha256}))));
await fs.writeFile(new URL('../../assets/rokuroku66/viewer-validation.json',import.meta.url),JSON.stringify({status:'passed',browser:'Chromium / SwiftShader WebGL, functional checks only; no performance claim',checks:['eight modes including six-limb walk and four-limb sensor walk','two raised front sensors and contact indicators','both walks on plain and decoded articulated tiers','continuous ground travel across loop boundary / in-place toggle','six-phase gait captures','independent limb selection / six pole positions','manual yaw and pitch / other limbs unchanged','six cameras / gimbal and scale close-ups','armor visibility / wireframe / joint rig','six tier and encoding combinations / download paths','static tier lockout','coil amount / scrub / play and pause','desktop and 390px mobile framing / no horizontal overflow','zero page errors'],asset_hashes:hashes},null,2)+'\n');
console.log('PASS RokuRoku-66 viewer / desktop + mobile');
} finally {await browser.close();}
