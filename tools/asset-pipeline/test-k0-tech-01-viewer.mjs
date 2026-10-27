// Serve the repository, then set PLAYWRIGHT_MODULE and optionally CHROMIUM_EXECUTABLE.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1480,height:1000},deviceScaleFactor:1}),errors=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.K0_VIEWER_URL||'http://127.0.0.1:8788/k0-tech-01/');await page.waitForFunction(()=>window.k0Tech01?.gltf);await page.locator('#play').click();
const results=[];
async function frameVisible(){return page.evaluate(async()=>{const T=await import('three'),k=window.k0Tech01,b=new T.Box3().setFromObject(k.gltf.scene,true);const p=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])p.push(new T.Vector3(x,y,z).project(k.camera));return p.every(v=>Math.abs(v.x)<1&&Math.abs(v.y)<1);});}
for(const [clip,t] of [['Watch_Idle',1],['Feline_Walk_Cycle',.4],['Stalk_Cycle',.7],['Gallop_Cycle',.148],['Sit_Down',2.4],['Pounce',1.0775],['Roll_Over',2.6],['Give_Paw',2.1]]){
 await page.locator(`[data-clip="${clip}"]`).click();await page.locator('#time').evaluate((el,t)=>{el.value=t;el.dispatchEvent(new Event('input'));},t);
 await page.waitForTimeout(100);const state=await page.evaluate(()=>{const k=window.k0Tech01;return {time:k.time,clips:k.gltf.animations.length,draws:k.renderer.info.render.calls,status:document.getElementById('status').textContent};});assert(Math.abs(state.time-t)<.01);assert(state.draws>6);assert(await frameVisible(),clip+' out of frame');results.push({clip,...state});console.log('CLIP',clip);await page.screenshot({path:`/tmp/k0-browser-${clip}.png`});
}
await page.locator('[data-clip="Gallop_Cycle"]').click();
for(const [phase,t] of [['fore_support',.052],['gathered',.148],['hind_support',.244],['extended',.348]]){
 await page.locator(`[data-phase="${phase}"]`).click();assert(Math.abs(await page.evaluate(()=>window.k0Tech01.time)-t)<.0001);assert(await frameVisible(),phase+' side view out of frame');
 if(['gathered','extended'].includes(phase))assert.equal(await page.locator('[data-paw].contact').count(),0,'flight has grounded paw');
 await page.screenshot({path:`/tmp/k0-browser-${phase}.png`});console.log('PHASE',phase);
}
await page.locator('#skeleton').check();assert(await page.evaluate(()=>window.k0Tech01.scene.children.some(c=>c.type==='SkeletonHelper'&&c.visible)));
await page.locator('#wireframe').check();assert(await page.evaluate(()=>{let yes=false;window.k0Tech01.gltf.scene.traverse(o=>{if(o.isMesh&&o.material.wireframe)yes=true;});return yes;}));await page.locator('#wireframe').uncheck();
await page.locator('#contacts').uncheck();assert(await page.evaluate(()=>Object.values(window.k0Tech01.markers).every(m=>!m.visible)));await page.locator('#contacts').check();
for(const lod of ['1','2','0'])for(const encoding of ['meshopt','plain']){
 await page.locator('#lod').selectOption(lod);await page.waitForFunction(l=>window.k0Tech01.entry?.lod===Number(l),lod);await page.locator('#encoding').selectOption(encoding);await page.waitForFunction(e=>document.getElementById('download').href.includes(e==='meshopt'?'.meshopt.glb':`lod${document.getElementById('lod').value}.glb`),encoding);
 assert.equal(await page.evaluate(()=>window.k0Tech01.gltf.animations.length),lod==='2'?0:8);
 if(lod==='2'){assert(await page.locator('#time').isDisabled());assert(await page.locator('[data-clip="Gallop_Cycle"]').isDisabled());}
 console.log('LOAD',lod,encoding);
}
await page.locator('#travel').check();await page.locator('[data-clip="Gallop_Cycle"]').click();await page.locator('#time').evaluate(el=>{el.value=.1;el.dispatchEvent(new Event('input'));});
const speedCheck=await page.evaluate(()=>{const k=window.k0Tech01;return {duration:k.gltf.animations.find(c=>c.name==='Gallop_Cycle').duration,distance:k.holder.position.z};});assert(Math.abs(speedCheck.duration-.4)<1e-6);assert(Math.abs(speedCheck.distance-2.6888888889*.1)<1e-6,'faster gallop travel');
await page.locator('[data-clip="Feline_Walk_Cycle"]').click();await page.waitForFunction(()=>window.k0Tech01.holder.position.z>.15,null,{timeout:60000});await page.locator('#travel').uncheck();assert.equal(await page.evaluate(()=>window.k0Tech01.holder.position.z),0);
await page.locator('[data-clip="Watch_Idle"]').click();await page.locator('#skeleton').uncheck();await page.locator('[data-view="hero"]').click();await page.locator('#play').click();await page.screenshot({path:'/tmp/k0-browser-desktop.png'});
await page.locator('#comparison').check();await page.waitForFunction(()=>window.k0Tech01.comparison?.visible);await page.waitForTimeout(250);
const size=await page.evaluate(async()=>{const k=window.k0Tech01,T=await import('three'),cat=new T.Box3().setFromObject(k.gltf.scene,true).getSize(new T.Vector3()),c07=new T.Box3().setFromObject(k.comparison,true).getSize(new T.Vector3());return {cat:cat.toArray(),cheetah:c07.toArray(),height_ratio:cat.y/c07.y};});
assert(size.height_ratio>.43&&size.height_ratio<.56,'approximately half Cheetah height');
await page.locator('canvas').screenshot({path:new URL('../../assets/k0-tech-01/size-comparison.png',import.meta.url).pathname});
await page.screenshot({path:'/tmp/k0-browser-comparison.png'});await page.locator('#comparison').uncheck();await page.waitForTimeout(150);
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');assert(await frameVisible(),'mobile model out of frame');await page.screenshot({path:'/tmp/k0-browser-mobile.png',fullPage:true});
await page.locator('[data-clip="Gallop_Cycle"]').click();await page.locator('[data-phase="extended"]').click();assert(await frameVisible(),'mobile extended flight out of frame');assert.deepEqual(errors,[]);
const report={status:'passed',size_comparison:size,asset_hashes:(await page.evaluate(()=>fetch('../assets/k0-tech-01/manifest.json').then(r=>r.json()))).assets.map(e=>({file:e.file,sha256:e.sha256,meshopt_sha256:e.meshopt_sha256})),browser:'Chromium headless, real WebGL; not a performance benchmark',retimed_gallop_travel:{...speedCheck,speed_mps:2.6888888889},clip_controls:results,lod_encoding_combinations:6,checks:['actual-scale C-07 comparison and half-height measurement','eight clips and scrubbed times','four gallop phases, zero sole contacts in both flights','hero, side and mobile camera bounds','skeleton, wireframe and paw marker toggles','all plain and Meshopt tiers load','static tier disables animation','ground travel on/off','desktop and 390px mobile layout','no page errors']};
await fs.writeFile(new URL('../../assets/k0-tech-01/viewer-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();
