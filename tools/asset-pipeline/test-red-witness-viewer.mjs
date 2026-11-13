import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'/Users/jela/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const engine=process.env.BROWSER_ENGINE||'chromium';
const browser=engine==='webkit'?await engines.webkit.launch({executablePath:process.env.WEBKIT_PATH||'/Users/jela/Library/Caches/ms-playwright/webkit-2370/pw_run.sh'}):await engines.chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/Users/jela/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
const root=new URL('../../',import.meta.url),out=new URL('assets/red-witness/',root),errors=[],checks=[],sha=b=>crypto.createHash('sha256').update(b).digest('hex'),page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await fs.mkdir(new URL('previews/',out),{recursive:true});
const ready=key=>page.waitForFunction(k=>window[k]?.ready,key,{timeout:60000}),shot=async name=>{if(engine==='webkit')return;await page.waitForTimeout(200);await page.screenshot({path:new URL('previews/'+name+'.png',out).pathname});};
const measure=key=>page.evaluate(k=>{const a=window[k],states=a.scene.children.map(n=>[n,n.visible]);for(const[n]of states)if(n!==a.model&&!n.isLight)n.visible=false;a.renderer.render(a.scene,a.camera);const r={triangles:a.renderer.info.render.triangles,draw_calls:a.renderer.info.render.calls};for(const[n,v]of states)n.visible=v;return r;},key);
for(const [family,url,key]of [['figure','red-witness/?mode=inspect','redWitness'],['helmet','helmet-lab/?helmet=red-witness','helmetLab']]){
 const folder=family==='figure'?'assets/red-witness/':'assets/helmet-lab/red-witness/',manifest=JSON.parse(await fs.readFile(new URL(folder+'manifest.json',root)));
 await page.goto('http://localhost:8788/'+url);await ready(key);
 for(const lod of [0,1,2]){
  await page.selectOption('#lod',String(lod));await ready(key);const e=manifest.assets.find(a=>a.lod===lod),r=await measure(key);assert.equal(r.triangles,e.triangles);assert.equal(r.draw_calls,e.draw_calls);
  const textures=await page.evaluate(k=>{let count=0;window[k].model.traverse(n=>{if(n.isMesh&&n.material.map){assertImage(n.material.map);count++;}});function assertImage(tex){if(!(tex.image.width>0&&tex.image.height>0))throw Error('Texture failed to decode');}return count;},key);assert.equal(textures,lod===2?0:family==='figure'?17:1);
  const pending=page.waitForEvent('download');await page.click('#download');const download=await pending;assert.equal(sha(await fs.readFile(await download.path())),e.sha256);await page.evaluate(()=>window.scrollTo(0,0));
  await shot(family+'-'+['master','game','distance'][lod]);checks.push({family,lod,...r,texture_surfaces:textures,download_sha256:e.sha256});
  if(family==='figure')assert.equal(await page.locator('#head').isDisabled(),lod===2);else assert(await page.locator('#exploded').isDisabled());
 }
 if(family==='figure'){
  await page.selectOption('#lod','1');await ready(key);await page.locator('#head').fill('25');await page.locator('#arms').fill('20');const q=await page.evaluate(()=>window.redWitness.rig.nodes.HEAD.quaternion.toArray());assert(Math.abs(q[1])>.1);await page.click('#reset');assert.deepEqual(await page.evaluate(()=>window.redWitness.rig.nodes.HEAD.quaternion.toArray()),[0,0,0,1]);
  await page.check('#compare');await page.waitForFunction(()=>window.redWitness.comparison?.visible);await page.evaluate(()=>window.scrollTo(0,0));await shot('true-scale-comparison');await page.uncheck('#compare');
  for(const id of ['wire','clay','ruler']){await page.locator('#'+id).click();await page.locator('#'+id).click();}
  for(const view of ['front','side','rear','head','hero'])await page.click('[data-view="'+view+'"]');
  const capture=page.waitForEvent('download');await page.click('#photo');assert((await capture).suggestedFilename().endsWith('.png'));
 }else{await page.selectOption('#lod','1');await ready(key);for(const id of ['clay','wire','cutaway']){await page.check('#'+id);await page.uncheck('#'+id);}await page.selectOption('#fit','robot');await page.waitForFunction(()=>window.helmetLab.robot?.visible);await page.selectOption('#fit','none');}
}
const fitManifest=JSON.parse(await fs.readFile(new URL('assets/robot-assembly/helmet-fit/manifest.json',root)));
for(const head of ['sensor','frame']){
 await page.goto('http://localhost:8788/robot-assembly/?helmet=red-witness&head='+head);await ready('anatomyLab');assert.equal(await page.locator('#helmet').inputValue(),'red-witness');
 for(const lod of [0,1,2]){await page.selectOption('#lod',String(lod));await ready('anatomyLab');const e=fitManifest.variants.find(a=>a.helmet==='red-witness'&&a.head===head&&a.lod===lod),r=await page.evaluate(()=>{const a=window.anatomyLab,states=a.scene.children.map(n=>[n,n.visible]);for(const[n]of states)if(![a.model,a.muscleModel].includes(n)&&!n.isLight)n.visible=false;a.renderer.render(a.scene,a.camera);const r={triangles:a.renderer.info.render.triangles,draw_calls:a.renderer.info.render.calls};for(const[n,v]of states)n.visible=v;return r;});assert.equal(r.triangles,e.triangles);assert.equal(r.draw_calls,e.draw_calls);checks.push({family:'AUREL fit',head,lod,...r});if(lod===1&&head==='sensor'){await page.click('[data-view="head"]');await shot('aurel-head-fit');}}
}
await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:8788/red-witness/?mode=inspect');await ready('redWitness');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('mobile');await page.selectOption('#lod','2');await ready('redWitness');assert(await page.locator('#head').isDisabled());
// Gallery cards use the actual game/master rendering, at the card's aspect ratio.
await page.setViewportSize({width:1140,height:650});
if(engine==='chromium')for(const [url,key,file]of [['red-witness/?mode=inspect','redWitness','assets/red-witness/preview.png'],['helmet-lab/?helmet=red-witness','helmetLab','assets/helmet-lab/red-witness/preview.png']]){
 await page.goto('http://localhost:8788/'+url);await ready(key);await page.addStyleTag({content:'#stage{height:506px!important;min-height:0!important}.title,.stage-label,.cameras,.footnote{display:none!important}'});await page.evaluate(k=>window[k].setView('hero'),key);await page.waitForTimeout(200);await page.locator('#stage canvas').screenshot({path:new URL(file,root).pathname});
}
assert.deepEqual(errors,[]);await fs.writeFile(new URL(engine==='webkit'?'webkit-report.json':'browser-report.json',out),JSON.stringify({status:'passed',engine,checks,mobile_width:390,controls:'Detail, head/arm pose and reset, wire, clay, scale, comparison, five cameras, PNG capture, fit overlays',errors},null,2)+'\n');await browser.close();console.log(JSON.stringify({status:'passed',checks:checks.length,errors}));
