// Serve the repository, then set PLAYWRIGHT_MODULE and optionally CHROMIUM_EXECUTABLE.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1480,height:1000},deviceScaleFactor:1}),errors=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.CHEETAH_VIEWER_URL||'http://127.0.0.1:8788/mechanical-cheetah/');await page.waitForFunction(()=>window.mechanicalCheetah?.gltf);await page.locator('#play').click();
const results=[];
async function frameVisible(){return page.evaluate(async()=>{const T=await import('three'),k=window.mechanicalCheetah,b=new T.Box3().setFromObject(k.gltf.scene,true);const p=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])p.push(new T.Vector3(x,y,z).project(k.camera));return p.every(v=>Math.abs(v.x)<1&&Math.abs(v.y)<1);});}
for(const [clip,t] of [['Watch_Idle',1],['Feline_Walk_Cycle',.4],['Stalk_Cycle',.7],['Gallop_Cycle',.296],['Sit_Down',2.4],['Pounce',1.275]]){
 await page.locator(`[data-clip="${clip}"]`).click();await page.locator('#time').evaluate((el,t)=>{el.value=t;el.dispatchEvent(new Event('input'));},t);
 await page.waitForTimeout(100);const state=await page.evaluate(()=>{const k=window.mechanicalCheetah;return {time:k.time,clips:k.gltf.animations.length,draws:k.renderer.info.render.calls,status:document.getElementById('status').textContent};});assert(Math.abs(state.time-t)<.01);assert(state.draws>6);assert(await frameVisible(),clip+' out of frame');results.push({clip,...state});console.log('CLIP',clip);await page.screenshot({path:`/tmp/cheetah-browser-${clip}.png`});
}
await page.locator('[data-clip="Gallop_Cycle"]').click();
for(const [phase,t] of [['fore_support',.104],['gathered',.296],['hind_support',.488],['extended',.696]]){
 await page.locator(`[data-phase="${phase}"]`).click();assert(Math.abs(await page.evaluate(()=>window.mechanicalCheetah.time)-t)<.0001);assert(await frameVisible(),phase+' side view out of frame');
 if(['gathered','extended'].includes(phase))assert.equal(await page.locator('[data-paw].contact').count(),0,'flight has grounded paw');
 await page.screenshot({path:`/tmp/cheetah-browser-${phase}.png`});console.log('PHASE',phase);
}
await page.locator('#skeleton').check();assert(await page.evaluate(()=>window.mechanicalCheetah.scene.children.some(c=>c.type==='SkeletonHelper'&&c.visible)));
await page.locator('#wireframe').check();assert(await page.evaluate(()=>{let yes=false;window.mechanicalCheetah.gltf.scene.traverse(o=>{if(o.isMesh&&o.material.wireframe)yes=true;});return yes;}));await page.locator('#wireframe').uncheck();
await page.locator('#contacts').uncheck();assert(await page.evaluate(()=>Object.values(window.mechanicalCheetah.markers).every(m=>!m.visible)));await page.locator('#contacts').check();
for(const lod of ['1','2','0'])for(const encoding of ['meshopt','plain']){
 await page.locator('#lod').selectOption(lod);await page.waitForFunction(l=>window.mechanicalCheetah.entry?.lod===Number(l),lod);await page.locator('#encoding').selectOption(encoding);await page.waitForFunction(e=>document.getElementById('download').href.includes(e==='meshopt'?'.meshopt.glb':`lod${document.getElementById('lod').value}.glb`),encoding);
 assert.equal(await page.evaluate(()=>window.mechanicalCheetah.gltf.animations.length),lod==='2'?0:6);
 if(lod==='2'){assert(await page.locator('#time').isDisabled());assert(await page.locator('[data-clip="Gallop_Cycle"]').isDisabled());}
 console.log('LOAD',lod,encoding);
}
await page.locator('[data-clip="Feline_Walk_Cycle"]').click();await page.waitForFunction(()=>window.mechanicalCheetah.holder.position.z>.15,null,{timeout:60000});await page.locator('#travel').uncheck();assert.equal(await page.evaluate(()=>window.mechanicalCheetah.holder.position.z),0);
await page.locator('[data-clip="Watch_Idle"]').click();await page.locator('#skeleton').uncheck();await page.locator('[data-view="hero"]').click();await page.locator('#play').click();await page.screenshot({path:'/tmp/cheetah-browser-desktop.png'});
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');assert(await frameVisible(),'mobile model out of frame');await page.screenshot({path:'/tmp/cheetah-browser-mobile.png',fullPage:true});
await page.locator('[data-clip="Gallop_Cycle"]').click();await page.locator('[data-phase="extended"]').click();assert(await frameVisible(),'mobile extended flight out of frame');assert.deepEqual(errors,[]);
const report={status:'passed',asset_hashes:(await page.evaluate(()=>fetch('../assets/mechanical-cheetah/manifest.json').then(r=>r.json()))).assets.map(e=>({file:e.file,sha256:e.sha256,meshopt_sha256:e.meshopt_sha256})),browser:'Chromium headless, real WebGL; not a performance benchmark',clip_controls:results,lod_encoding_combinations:6,checks:['six clips and scrubbed times','four gallop phases, zero sole contacts in both flights','hero, side and mobile camera bounds','skeleton, wireframe and paw marker toggles','all plain and Meshopt tiers load','static tier disables animation','ground travel on/off','desktop and 390px mobile layout','no page errors']};
await fs.writeFile(new URL('../../assets/mechanical-cheetah/viewer-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();
