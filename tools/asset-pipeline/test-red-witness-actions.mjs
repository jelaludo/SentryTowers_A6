import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'/Users/jela/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const engine=process.env.BROWSER_ENGINE||'chromium';
const browser=engine==='webkit'?await engines.webkit.launch({executablePath:process.env.WEBKIT_PATH||'/Users/jela/Library/Caches/ms-playwright/webkit-2370/pw_run.sh'}):await engines.chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/Users/jela/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
const root=new URL('../../',import.meta.url),out=new URL('assets/red-witness-action-showcase/',root),errors=[],checks=[];
const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true}),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await fs.mkdir(new URL('previews/',out),{recursive:true});
const ready=()=>page.waitForFunction(()=>window.redWitness?.ready,null,{timeout:60000});
const shot=async name=>{if(engine==='chromium'){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:new URL('previews/'+name+'.png',out).pathname});}};
try{
 await page.goto('http://localhost:8788/red-witness/');await ready();await page.evaluate(()=>window.redWitness.setManual());
 assert.equal(await page.locator('#mode').inputValue(),'actions');assert(await page.locator('#lod').isDisabled());assert(await page.locator('#head').isDisabled());assert(await page.locator('#inspection-controls').isHidden());
 const metadata=JSON.parse(await fs.readFile(new URL('integration-manifest.json',out)));
 const metrics=await page.evaluate(()=>{const a=window.redWitness,states=a.scene.children.map(n=>[n,n.visible]),shadow=a.renderer.shadowMap.enabled;for(const[n]of states)if(n!==a.model&&!n.isLight)n.visible=false;a.renderer.shadowMap.enabled=false;a.renderer.render(a.scene,a.camera);const r={triangles:a.renderer.info.render.triangles,draw_calls:a.renderer.info.render.calls,textures:0};a.model.traverse(n=>{if(n.isMesh&&n.material.map){if(!n.material.map.image.width)throw Error('Texture decode failed');r.textures++;}});a.renderer.shadowMap.enabled=shadow;for(const[n,v]of states)n.visible=v;return r;});
 assert.deepEqual(metrics,{triangles:21032,draw_calls:17,textures:17});checks.push({name:'Decoded animated model costs and textures',...metrics});
 const clipResults=[];
 for(const clip of metadata.assets[0].clips){
  await page.selectOption('#movement',clip.name);
  const result=await page.evaluate(async clip=>{
   const T=await import('three'),a=window.redWitness,s=a.showcase,vertices=new T.Vector3(),projected=new T.Vector3();s.setPaused(true);
   let minFloor=Infinity,maxHead=-Infinity,maxScreenX=0,maxScreenY=0;const poses=[];
   for(const fraction of [0,.125,.25,.375,.5,.625,.75,.875,1]){
    s.seek(clip.duration*fraction);a.render();const head=s.root.getObjectByName('HEAD');head.getWorldPosition(vertices);maxHead=Math.max(maxHead,vertices.y);
    const pose=[];s.root.traverse(n=>{if(n.isBone)pose.push(...n.matrixWorld.elements);if(n.isSkinnedMesh){const count=n.geometry.attributes.position.count;for(let i=0;i<count;i+=7){n.getVertexPosition(i,vertices).applyMatrix4(n.matrixWorld);if(!vertices.toArray().every(Number.isFinite))throw Error('Non-finite surface');minFloor=Math.min(minFloor,vertices.y);projected.copy(vertices).project(a.camera);maxScreenX=Math.max(maxScreenX,Math.abs(projected.x));maxScreenY=Math.max(maxScreenY,Math.abs(projected.y));}}});poses.push(pose);
   }
   const movement=poses.slice(1).some(p=>p.some((v,i)=>Math.abs(v-poses[0][i])>1e-4));
   return{name:clip.name,minFloor,maxHead,maxScreenX,maxScreenY,movement};
  },clip);
  assert(result.minFloor>=-.012,JSON.stringify(result));assert(result.maxScreenX<1&&result.maxScreenY<1,JSON.stringify(result));if(clip.name!=='T_Pose')assert(result.movement,clip.name);if(clip.name==='Jump')assert(result.maxHead>2.4);
  await page.locator('#timeline').fill(String(Math.round(clip.duration*500)/1000));await shot(clip.name);clipResults.push(result);
  // One-shots stop at the end; looped clips wrap and remain playable.
  await page.click('#restart');await page.evaluate(duration=>{for(let t=0;t<duration+.3;t+=.05)window.redWitness.advance(.05);},clip.duration);
  const action=await page.evaluate(()=>{const s=window.redWitness.showcase,a=s.mixer.clipAction(s.clips.get(s.current));return{time:a.time,paused:a.paused};});
  if(!clip.loop){assert(action.paused);assert(Math.abs(action.time-clip.duration)<1e-5);}else assert(action.time<.4);
  // Scrubbing a finished one-shot back to its middle must change its pose.
  const before=await page.evaluate(()=>window.redWitness.showcase.root.getObjectByName('HEAD').matrixWorld.toArray());await page.locator('#timeline').fill(String(Math.round(clip.duration*500)/1000));await page.evaluate(()=>window.redWitness.render());
  const after=await page.evaluate(()=>window.redWitness.showcase.root.getObjectByName('HEAD').matrixWorld.toArray());if(!clip.loop)assert(before.some((v,i)=>Math.abs(v-after[i])>1e-4),clip.name+' seek after finish');
 }
 checks.push({name:'All clips: motion, floor, camera framing, loop and one-shot completion, reverse scrub',clips:clipResults});
 await page.selectOption('#movement','Walk');await page.click('#pause');const paused=await page.evaluate(()=>{const s=window.redWitness.showcase,a=s.mixer.clipAction(s.clips.get(s.current)),before=a.time;window.redWitness.advance(.05);return before===a.time;});assert(paused);
 await page.click('#pause');await page.selectOption('#speed','0.5');const step=await page.evaluate(()=>{const s=window.redWitness.showcase,a=s.mixer.clipAction(s.clips.get(s.current)),before=a.time;window.redWitness.advance(.05);return a.time-before;});assert(Math.abs(step-.025)<1e-7);await page.selectOption('#speed','1');
 await page.check('#travel');const travel=await page.evaluate(async()=>{const T=await import('three'),a=window.redWitness,before=a.camera.position.clone();for(let i=0;i<12;i++)a.advance(.05);const s=a.showcase,m=s.root.getObjectByName('MOTION').getWorldPosition(new T.Vector3());return{distance:a.camera.position.distanceTo(before),centered:s.centered,world:m.toArray(),root:s.root.position.toArray()};});assert(travel.distance>.4);assert(!travel.centered);assert.equal(travel.root[2],0);await shot('travel');await page.uncheck('#travel');
 await page.click('#sequence');const visited=await page.evaluate(()=>{const a=window.redWitness,names=new Set();for(let t=0;t<38;t+=.05){a.advance(.05);names.add(a.showcase.current);}return[...names];});assert.equal(visited.length,10);checks.push({name:'Playback controls, speed, camera travel and play-all',visited,travel});
 for(const id of ['wire','clay','ruler']){await page.locator('#'+id).click();await page.locator('#'+id).click();}
 // Same animated object survives switching to all three independent inspection tiers.
 for(const lod of ['0','1','2']){
  await page.selectOption('#mode','inspect');await ready();await page.selectOption('#lod',lod);await ready();assert.equal(await page.evaluate(()=>window.redWitness.showcase.root.visible),false);assert.equal(await page.locator('#head').isDisabled(),lod==='2');
  if(lod==='1'){await page.locator('#head').fill('25');assert(await page.evaluate(()=>Math.abs(window.redWitness.rig.nodes.HEAD.quaternion.y)>.1));await page.click('#reset');}
  await page.selectOption('#mode','actions');await ready();assert(await page.locator('#lod').isDisabled());assert.equal(await page.evaluate(()=>window.redWitness.model===window.redWitness.showcase.root),true);
 }
 await page.check('#compare');await page.waitForFunction(()=>window.redWitness.comparison?.visible);await shot('comparison');await page.uncheck('#compare');
 for(const view of ['front','side','rear','head','hero'])await page.click('[data-view="'+view+'"]');
 for(const [id,expected]of [['download',metadata.assets[0].sha256],['download-actions',metadata.source_archive.sha256]]){const pending=page.waitForEvent('download');await page.click('#'+id);const d=await pending;assert.equal(sha(await fs.readFile(await d.path())),expected);}
 const capture=page.waitForEvent('download');await page.click('#photo');assert((await capture).suggestedFilename().endsWith('.png'));
 checks.push({name:'Original inspection tiers, head/reset, materials, comparison, cameras, exact GLB/ZIP downloads and PNG capture'});
 await page.setViewportSize({width:390,height:844});await page.selectOption('#movement','Jump');await page.locator('#timeline').fill('0.8');await page.evaluate(()=>window.redWitness.render());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('mobile');
 await page.setViewportSize({width:844,height:390});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('landscape');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://localhost:8788/red-witness/');await ready();assert(await page.evaluate(()=>window.redWitness.showcase.paused));await page.click('#pause');assert.equal(await page.evaluate(()=>window.redWitness.showcase.paused),false);
 checks.push({name:'390px mobile / 844px landscape layout and reduced-motion initial pause'});
 assert.deepEqual(errors,[]);
 await fs.writeFile(new URL('browser-'+engine+'.json',out),JSON.stringify({status:'passed',engine,checks,errors},null,2)+'\n');console.log(JSON.stringify({status:'passed',engine,checks:checks.length,errors}));
}finally{await browser.close();}
