// Serve the repository, then supply PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE if needed.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1}),errors=[];
page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(process.env.PALLET_VIEWER_URL||'http://127.0.0.1:8788/pallet-cargo/');await page.waitForFunction(()=>window.palletCargoReady);
async function select(id,value){await page.locator('#'+id).selectOption(value);if(['module','lod','encoding'].includes(id))await page.waitForFunction(({id,value})=>window.palletCargoReady&&String(window.palletCargo[id==='module'?'mode':id])===value,{id,value});}
async function visible(){return page.evaluate(async()=>{const T=await import('three'),k=window.palletCargo,b=new T.Box3().setFromObject(k.holder);return [b.min.x,b.max.x].every(x=>[b.min.y,b.max.y].every(y=>[b.min.z,b.max.z].every(z=>{const v=new T.Vector3(x,y,z).project(k.camera);return Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z>-1&&v.z<1;})));});}
async function range(id,value){await page.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input'));},value);}
const combinations=[];
for(const mode of ['assembly','pallet','stride','stack','crate'])for(const lod of ['0','1','2'])for(const encoding of ['plain','meshopt']){
 await select('module',mode);await select('lod',lod);await select('encoding',encoding);assert(await visible(),`${mode}/${lod}/${encoding} out of frame`);
 const data=await page.evaluate(()=>{const k=window.palletCargo;return {mode:k.mode,lod:k.lod,encoding:k.encoding,models:k.active.length,triangles:k.active.reduce((s,e)=>s+e.entry.triangles,0),draws:k.active.reduce((s,e)=>s+e.entry.draw_calls,0),render_calls:k.renderer.info.render.calls};});assert(data.models===(mode==='assembly'?6:mode==='stack'?5:1));assert(data.render_calls>0);if(lod==='2'||!['assembly','stride'].includes(mode))assert(await page.locator('#height').isDisabled());combinations.push(data);
 for(const a of await page.locator('#downloads a').all()){const href=await a.getAttribute('href');const response=await page.request.get(new URL(href,page.url()).href);assert(response.ok(),'download '+href);}
 if(lod==='2'&&encoding==='meshopt')console.log('PASS',mode,'all tiers and encodings');
}
await select('module','assembly');await select('lod','1');await select('encoding','plain');
for(const h of [.6,.68,.76]){await range('height',h);assert(Math.abs(await page.evaluate(()=>window.palletCargo.robot.getObjectByName('CHASSIS_HEAVE').position.y)-h)<1e-6);assert(await visible());}
await range('steer',.6);assert(Math.abs(await page.evaluate(()=>window.palletCargo.robot.getObjectByName('WHEEL_FL_YAW').rotation.y)-.6)<1e-6);await page.locator('#locked').uncheck();assert.equal(await page.evaluate(()=>window.palletCargo.robot.getObjectByName('LOCK_FL_YAW').rotation.y),0);
await page.locator('#wire').check();assert(await page.evaluate(()=>window.palletCargo.active.every(e=>{let yes=true;e.root.traverse(o=>{if(o.isMesh&&!o.material.wireframe)yes=false});return yes;})));await page.locator('#wire').uncheck();
await page.locator('#sockets').check();await page.locator('#sockets').uncheck();await page.locator('#separate').check();const split=await page.evaluate(()=>window.palletCargo.pallet.position.y);await page.locator('#separate').uncheck();assert(Math.abs(split-await page.evaluate(()=>window.palletCargo.pallet.position.y)-.35)<1e-6);
await page.locator('#cargo').uncheck();await page.locator('#cargo').check();
await select('motion','transport');await page.locator('#play').click();
const positions=[];for(const time of [0,2,5,8,10,12,15,18,20]){await range('time',time);assert(await visible(),'transport framing '+time);positions.push({time,z:await page.evaluate(()=>window.palletCargo.holder.position.z)});}assert.equal(positions[0].z,-1.7);assert.equal(positions[3].z,1.7);assert.equal(positions.at(-1).z,-1.7);
await select('lod','2');assert(await page.locator('#play').isDisabled());assert(await page.locator('#time').isDisabled());await select('lod','0');await select('motion','inspect');await page.locator('#reset').click();
const out=new URL('../../assets/pallet-cargo/',import.meta.url);await fs.mkdir(new URL('previews/',out),{recursive:true});
for(const view of ['hero','front','top','underside']){await page.locator(`[data-view="${view}"]`).click();assert(await visible(),view+' framing');await page.locator('#stage').screenshot({path:new URL('previews/assembly-'+view+'.png',out).pathname});}
await page.locator('[data-view="hero"]').click();await page.screenshot({path:new URL('previews/desktop.png',out).pathname,fullPage:true});
// Clean, scene-only cover render retains the exact loaded master geometry.
const coverHeight=await page.locator('#stage').evaluate(el=>el.clientWidth/1.6);const coverStyle=await page.addStyleTag({content:`.viewbar,.stage-note,.stage-hint{visibility:hidden}.workspace{align-items:start}#stage{height:${coverHeight}px;min-height:${coverHeight}px}`});await page.waitForFunction(h=>Math.abs(document.getElementById('stage').clientHeight-h)<2,coverHeight);await page.evaluate(()=>window.palletCargo.fit());await page.locator('#stage').screenshot({path:new URL('preview.png',out).pathname});
await coverStyle.evaluate(el=>el.remove());
for(const mode of ['pallet','stride','stack','crate']){await select('module',mode);await page.locator('#stage').screenshot({path:new URL('previews/'+mode+'.png',out).pathname});}
await page.setViewportSize({width:390,height:844});await select('module','assembly');assert(await visible(),'portrait assembly');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');await page.screenshot({path:new URL('previews/mobile.png',out).pathname,fullPage:true});
await select('motion','transport');await page.locator('#play').click();for(const time of [0,8,20]){await range('time',time);assert(await visible(),'mobile transport '+time);}
assert.equal(await page.locator('.workshop-header').count(),1);assert.deepEqual(errors,[]);
const manifest=await page.evaluate(()=>window.palletCargo.manifest);const report={status:'passed',browser:'Chromium headless WebGL, visual/function checks; not a performance benchmark',combinations,transport_positions:positions,checks:['30 configuration/tier/encoding combinations','all selected GLB downloads','manual lift, steering and quarter-turn locks','separation, cargo, sockets and wireframe controls','A-to-B motion, scrubbing and static lockout','four cameras with model in frame','desktop and 390px mobile framing/layout','shared Workshop navigation','zero browser errors'],hashes:manifest.assets.map(e=>({file:e.file,sha256:e.sha256,meshopt_sha256:e.meshopt_sha256}))};await fs.writeFile(new URL('viewer-validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',combinations:combinations.length,errors,previews:'assets/pallet-cargo/previews/'},null,2));await browser.close();
