import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium} from '/Users/jela/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const root=new URL('../../',import.meta.url),folder=new URL('assets/senzai-kk01/',root);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',folder))),packageReport=JSON.parse(await fs.readFile(new URL('package-report.json',folder)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),review='/tmp/senzai-kk01-review';await fs.mkdir(review,{recursive:true});
const browser=await chromium.launch({executablePath:'/Users/jela/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const report={status:'passed',browser:'Chromium / SwiftShader; functional checks, not device profiling',exports:[],checks:[],source_sha256:{}};
const ready=p=>p.waitForFunction(()=>window.senzai?.ready,null,{timeout:120000});
const snap=name=>page.screenshot({path:`${review}/${name}.png`});
let server;
try{
 await page.goto('http://localhost:8788/latent-field/');await ready(page);assert(page.url().endsWith('/senzai-kk01/'));assert((await page.title()).includes('Senzai-KK01'));
 await page.evaluate(()=>window.senzai.seek(9));await snap('desktop');
 assert(await page.locator('.right-panel').isVisible());assert(await page.locator('.lore-card').isVisible());
 assert((await page.locator('.download-card').textContent()).includes('Jelaludo'));
 await page.click('#settings');
 for(const lod of [1,0,2]){
  await page.selectOption('#lod',String(lod));await ready(page);await page.evaluate(()=>window.senzai.seek(9));
  const cost=await page.evaluate(()=>{
   const f=window.senzai,hidden=[];f.scene.traverse(n=>{if(n.name.startsWith('FX_')){hidden.push([n,n.visible]);n.visible=false;}});
   f.renderer.info.reset();f.renderer.render(f.scene,f.camera);const model={...f.renderer.info.render};hidden.forEach(([n,v])=>n.visible=v);
   f.renderer.info.autoReset=false;f.renderer.info.reset();f.composer.render();const full={...f.renderer.info.render};f.renderer.info.autoReset=true;
   return {model,full,static:f.rig.static};
  });
  const asset=manifest.assets.find(a=>a.lod===lod);assert.equal(cost.model.calls,asset.draw_calls);assert.equal(cost.model.triangles,asset.triangles);assert.equal(cost.static,lod===2);
  const event=page.waitForEvent('download');await page.click('#download');const download=await event,bytes=await fs.readFile(await download.path());assert.equal(sha(bytes),asset.sha256);
  assert(JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))).asset.copyright.includes('Jelaludo'));
  report.exports.push({lod,...cost,download_sha256:sha(bytes)});
 }
 await page.click('[data-behavior="focus_lock"]');await ready(page);assert.equal(await page.locator('#lod').inputValue(),'1');
 await page.waitForFunction(()=>window.senzai.time>=8.8&&window.senzai.time<12,null,{timeout:20000});
 assert.equal(await page.evaluate(()=>window.senzai.behavior),'focus_lock');assert((await page.evaluate(()=>window.senzai.state.states.filter(s=>s.commit>.3).length))>=18);await snap('focus-lock');
 await page.click('[data-behavior="examining"]');await page.waitForFunction(()=>window.senzai.time>=28.1&&window.senzai.time<31,null,{timeout:20000});
 const cluster=await page.evaluate(()=>{const f=window.senzai,ids=f.state.states.map((s,i)=>s.precision>.999?i:-1).filter(i=>i>=0),tips=ids.map(i=>f.rig.frame.localToWorld(f.rig.tips[i].position.clone()));return {count:ids.length,diameter:Math.max(...tips.flatMap(a=>tips.map(b=>a.distanceTo(b)))),visible:tips.every(t=>{const p=t.clone().project(f.camera);return Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&p.z<1;})};});
 assert.equal(cluster.count,15);assert(cluster.diameter<2.2);assert(cluster.visible,'Examination tips clipped by viewport');report.precision_focus=cluster;await snap('examining');
 await page.click('[data-behavior="following"]');const before=await page.evaluate(()=>window.senzai.rig.frame.position.toArray());await page.waitForTimeout(700);const after=await page.evaluate(()=>window.senzai.rig.frame.position.toArray());assert.notDeepEqual(after,before);
 await page.click('[data-behavior="dormant"]');await page.waitForFunction(()=>window.senzai.state.active===0,null,{timeout:20000});assert(await page.evaluate(()=>window.senzai.playing));await snap('dormant');
 await page.click('[data-behavior="foraging"]');assert.equal(await page.evaluate(()=>window.senzai.behavior),'foraging');assert((await page.evaluate(()=>window.senzai.time))<2);
 await page.click('[data-behavior="cycle"]');assert.equal(await page.evaluate(()=>window.senzai.behavior),'cycle');
 await page.click('#play');const paused=await page.evaluate(()=>window.senzai.time);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.senzai.time),paused);
 await page.locator('#time').fill('29.8');assert.equal(await page.evaluate(()=>window.senzai.time),29.8);
 await page.click('[data-view="macro"]');await snap('macro');await page.click('[data-view="field"]');
 await page.uncheck('#space');await page.uncheck('#bloom');await page.uncheck('#follow');await page.locator('#fog').fill('0');await page.check('#space');await page.check('#bloom');await page.check('#follow');await page.locator('#fog').fill('1');
 await page.click('#settings');await page.click('#cinema');assert(!(await page.locator('.right-panel').isVisible()));await page.keyboard.press('Escape');assert(await page.locator('.right-panel').isVisible());
 await page.click('#restart');assert.equal(await page.evaluate(()=>window.senzai.time),0);
 await page.click('#next-focus');assert(await page.evaluate(()=>window.senzai.playing));await page.evaluate(()=>window.senzai.seek(28.2));
 const pngEvent=page.waitForEvent('download');await page.click('#capture');const png=await pngEvent,pngBytes=await fs.readFile(await png.path());assert.equal(pngBytes.subarray(1,4).toString(),'PNG');await fs.writeFile(new URL('preview.png',folder),pngBytes);
 const zipEvent=page.waitForEvent('download');await page.click('#package-download');const zip=await zipEvent;assert.equal(sha(await fs.readFile(await zip.path())),packageReport.sha256);
 await page.locator('.lore-card summary').click();await snap('lore');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{window.scrollTo(0,0);window.senzai.setView('field');});await snap('mobile-field');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('.right-panel').scrollIntoViewIfNeeded();await snap('mobile-panel');await page.click('[data-behavior="examining"]');assert.equal(await page.evaluate(()=>window.senzai.behavior),'examining');
 const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto('http://localhost:8788/senzai-kk01/');await ready(reduced);assert.equal(await reduced.evaluate(()=>window.senzai.playing),false);await reduced.click('[data-behavior="focus_lock"]');assert(await reduced.evaluate(()=>window.senzai.playing));await reduced.close();
 report.checks.push('Legacy LATENT URL opens KK01; right-panel behavior and lore cards; attribution visible','Three credited GLB downloads, measured model/full-scene costs, static tier behavior switches to game','All six behavior cues; actual broad recruitment, 15-tip convergence, body travel and dormant sway','Pause/scrub/restart/next focus, cameras, settings, cinema, PNG, lore expansion and ZIP download','390px layout and reachable behavior panel; reduced motion starts paused and explicit cue plays');

 // Exercise the actual extracted download with all non-local requests blocked.
 const extracted=await fs.mkdtemp(path.join(os.tmpdir(),'senzai-kk01-package-'));
 execFileSync('unzip',['-q',new URL(packageReport.file,folder).pathname,'-d',extracted]);
 for(const [name,meta]of Object.entries(packageReport.files))assert.equal(sha(await fs.readFile(path.join(extracted,name))),meta.sha256,name);
 server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname),file=path.resolve(extracted,'.'+name+(name.endsWith('/')?'index.html':''));if(!file.startsWith(extracted+path.sep))throw Error('Invalid path');const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('Not found');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const local=`http://127.0.0.1:${server.address().port}`,offline=await browser.newPage({viewport:{width:1500,height:1100}}),external=[];
 offline.on('pageerror',e=>errors.push(e.message));
 await offline.route('**/*',route=>{if(route.request().url().startsWith(local+'/'))return route.continue();external.push(route.request().url());return route.abort();});
 await offline.goto(local+'/senzai-kk01/');await ready(offline);await offline.click('[data-behavior="examining"]');await offline.waitForFunction(()=>window.senzai.state.precision===1,null,{timeout:20000});
 await offline.screenshot({path:review+'/offline-package.png'});assert.deepEqual(external,[]);await offline.close();
 report.package={file:packageReport.file,sha256:packageReport.sha256,verified_files:Object.keys(packageReport.files).length,external_requests:external,extracted_offline_viewer:'passed'};
 report.checks.push('Downloaded ZIP hash, all extracted hashes, vendored Three.js license and offline rendered examination with zero external requests');
 assert.deepEqual(errors,[]);report.errors=errors;
 for(const file of ['senzai-kk01/index.html','senzai-kk01/viewer.js','senzai-kk01/effects.js','senzai-kk01/space.js','senzai-kk01/style.css','assets/senzai-kk01/runtime.js','assets/senzai-kk01/behaviors.js','tools/asset-pipeline/test-senzai-kk01.mjs'])report.source_sha256[file]=sha(await fs.readFile(new URL(file,root)));
 await fs.writeFile(new URL('browser-report.json',folder),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
