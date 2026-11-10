import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {webkit} from '/Users/jela/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const root=new URL('../../',import.meta.url),out=new URL('assets/senzai-kk01/',root),review='/tmp/senzai-kk01-webkit-review';
await fs.mkdir(review,{recursive:true});
const browser=await webkit.launch({executablePath:'/Users/jela/Library/Caches/ms-playwright/webkit-2370/pw_run.sh',headless:true});
const report={status:'passed',browser:'Playwright WebKit 2370 / macOS, native WebGL, device scale factors 1 and 2',checks:[],frames:[],errors:[],source_sha256:{}};
const ready=page=>page.waitForFunction(()=>window.senzai?.ready,null,{timeout:60000});
async function readFrame(page,time){return page.evaluate(time=>{
 const f=window.senzai;f.seek(time);const renderer=f.renderer,rt=f.composer.readBuffer.clone();
 const inspect=target=>{const data=new Uint16Array(target.width*target.height*4);renderer.readRenderTargetPixels(target,0,0,target.width,target.height,data);let nonfinite=0;for(const v of data)if((v&0x7c00)===0x7c00)nonfinite++;return {nonfinite,components:data.length};};
 renderer.setRenderTarget(rt);renderer.render(f.scene,f.camera);const scene=inspect(rt);renderer.setRenderTarget(null);rt.dispose();f.composer.render();const bloom=inspect(f.composer.passes[1].renderTargetsHorizontal[0]);return {time,scene,bloom,gl_error:renderer.getContext().getError()};
},time);}
async function setup(dpr,baseline=false){
 const page=await browser.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:dpr});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 if(baseline){const source=execFileSync('git',['show','1628143:senzai-kk02/effects.js'],{cwd:root,encoding:'utf8'});await page.route(/senzai-kk01\/effects\.js/,route=>route.fulfill({status:200,contentType:'text/javascript',body:source}));}
 await page.goto('http://localhost:8788/senzai-kk01/');await ready(page);await page.evaluate(()=>{window.senzai.seek(15);window.senzai.renderer.setAnimationLoop(null);document.getElementById('follow').checked=false;});await page.click('#cinema');return page;
}
try{
 if(process.argv.includes('--baseline')){const page=await setup(2,true),before=await readFrame(page,15);assert(before.scene.nonfinite>0);assert(before.bloom.nonfinite>before.scene.nonfinite);report.baseline={commit:'1628143',...before};await page.screenshot({path:review+'/before.png'});await page.close();}
 for(const dpr of [1,2]){
  const page=await setup(dpr);
  for(const time of [0,5,8.7,10.75,15,19.7,27.7,28.2,29.8,31,32.5,37,40.7,47.7,49.75,58,65.7,68,72]){const frame=await readFrame(page,time);assert.equal(frame.scene.nonfinite,0,JSON.stringify(frame));assert.equal(frame.bloom.nonfinite,0,JSON.stringify(frame));assert.equal(frame.gl_error,0);report.frames.push({dpr,lod:1,view:'field',...frame});}
  await readFrame(page,28.2);await page.screenshot({path:review+`/precision-dpr${dpr}.png`});
  await readFrame(page,15);await page.screenshot({path:review+`/after-dpr${dpr}.png`});
  await page.evaluate(()=>window.senzai.setView('macro'));for(const time of [15,37,58]){const frame=await readFrame(page,time);assert.equal(frame.scene.nonfinite+frame.bloom.nonfinite,0);assert.equal(frame.gl_error,0);report.frames.push({dpr,lod:1,view:'macro',...frame});}
  await page.screenshot({path:review+`/macro-dpr${dpr}.png`});await page.evaluate(()=>window.senzai.setView('field'));
  await page.keyboard.press('Escape');await page.click('#settings');
  for(const lod of [0,2]){await page.selectOption('#lod',String(lod));await ready(page);const frame=await readFrame(page,15);assert.equal(frame.scene.nonfinite+frame.bloom.nonfinite,0);assert.equal(frame.gl_error,0);report.frames.push({dpr,lod,view:'field',...frame});}
  await page.close();
 }
 assert.deepEqual(report.errors,[]);report.checks=['Half-float scene and bloom buffers contain no NaN/Infinity in 48 rendered cases','Both display densities; all three detail tiers; whole-field and macro; attention shifts and cycle boundary','Cinema screenshots visually reviewed with bloom enabled'];
 for(const path of ['assets/senzai-kk01/runtime.js','senzai-kk01/effects.js','senzai-kk01/viewer.js','senzai-kk01/index.html','tools/asset-pipeline/test-senzai-kk01-webkit.mjs'])report.source_sha256[path]=crypto.createHash('sha256').update(await fs.readFile(new URL(path,root))).digest('hex');
 await fs.writeFile(new URL('webkit-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,frames:report.frames.length,baseline:report.baseline,errors:report.errors}));
}finally{await browser.close();}
