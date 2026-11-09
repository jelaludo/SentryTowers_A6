import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || '/Users/jela/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base = new URL('../../assets/robot-assembly/animation-kit/', import.meta.url);
const record = JSON.parse(await fs.readFile(new URL('download.json', base)));
const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', base)));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const archive = new URL(record.file, base), archiveBytes = await fs.readFile(archive);
assert.equal(sha(archiveBytes), record.sha256); assert.equal(archiveBytes.length, record.bytes);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'aurel-download-'));
execFileSync('python3', ['-c', `import zipfile,sys,json,hashlib,pathlib
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 assert all(n.startswith('aurel03-animation-kit/') and '..' not in pathlib.PurePosixPath(n).parts for n in z.namelist())
 z.extractall(sys.argv[2])
root=pathlib.Path(sys.argv[2])/'aurel03-animation-kit'
for name,digest in json.loads((root/'SHA256SUMS.json').read_text()).items():
 assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest,name
`, archive.pathname, temp]);
const folder = path.join(temp, 'aurel03-animation-kit');
const server = http.createServer(async (req, res) => {
  try {
    const file = path.resolve(folder, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(folder + path.sep) && file !== folder) { res.writeHead(403); res.end(); return; }
    const selected = file === folder ? path.join(folder, 'index.html') : file;
    res.setHeader('Content-Type', ({'.js':'text/javascript', '.html':'text/html', '.json':'application/json', '.glb':'model/gltf-binary', '.md':'text/plain'})[path.extname(selected)] || 'application/octet-stream');
    res.end(await fs.readFile(selected));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/Users/jela/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
const errors = [], checks = [];
try {
  const page = await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  page.on('pageerror', e=>errors.push(e.message)); page.on('console', m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const ready = () => page.waitForFunction(()=>window.kitPreview?.ready);
  await ready();
  for (const head of ['frame','sensor']) for (const lod of [1,0]) {
    await page.selectOption('#head',head); await ready(); await page.selectOption('#lod',String(lod)); await ready();
    const counts = await page.evaluate(()=>{const a=window.kitPreview,grid=a.scene.children.find(n=>n.type==='GridHelper');grid.visible=false;a.renderer.render(a.scene,a.camera);const result={triangles:a.renderer.info.render.triangles,draw_calls:a.renderer.info.render.calls};grid.visible=true;return result;});
    const entry=manifest.assets.find(e=>e.head===head&&e.lod===lod);
    assert.equal(counts.triangles,entry.triangles);assert.equal(counts.draw_calls,entry.draw_calls);checks.push({head,lod,...counts});
  }
  await page.selectOption('#lod','1');await ready();
  for(const mode of ['skeleton','muscles','both']){await page.selectOption('#layer',mode);assert(await page.evaluate(mode=>{let good=true;window.kitPreview.model.traverse(n=>{if(n.isMesh)good&&=n.visible===(mode==='both'||n.userData.aurel_layer===mode);});return good;},mode));}
  const before=await page.evaluate(()=>window.kitPreview.character.nodes.ARM_L_ELBOW.rotation.x);
  await page.click('#play');await page.waitForTimeout(600);await page.click('#play');
  assert.notEqual(await page.evaluate(()=>window.kitPreview.character.nodes.ARM_L_ELBOW.rotation.x),before);
  await fs.mkdir(new URL('previews/',base),{recursive:true});await page.screenshot({path:new URL('previews/extracted-preview.png',base).pathname});
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth,{},{timeout:5000});
  const main=process.env.ANATOMY_LAB_BASE||'http://localhost:8788';await page.goto(main+'/robot-assembly/?helmet=none&head=frame');await page.waitForFunction(()=>window.anatomyLab?.ready);
  const downloadPromise=page.waitForEvent('download');await page.click('#download-kit');const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),record.file);assert.equal(sha(await fs.readFile(await download.path())),record.sha256);
  for(const head of ['frame','sensor'])for(const lod of [0,1,2]){
    await page.selectOption('#head',head);await page.waitForFunction(()=>window.anatomyLab.ready);await page.selectOption('#lod',String(lod));await page.waitForFunction(()=>window.anatomyLab.ready);
    const expected=`aurel03_${head}_lod${lod===0?0:1}.glb`;assert((await page.locator('#download-character').getAttribute('href')).endsWith(expected));
  }
  const glbPromise=page.waitForEvent('download');await page.click('#download-character');const glb=await glbPromise;
  assert.equal(sha(await fs.readFile(await glb.path())),manifest.assets.find(e=>e.head==='sensor'&&e.lod===1).sha256);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:new URL('previews/mobile-download.png',base).pathname});
  await page.setViewportSize({width:1440,height:1000});await page.goto(main+'/robot-assembly/?helmet=none&head=frame');await page.waitForFunction(()=>window.anatomyLab?.ready);await page.screenshot({path:new URL('previews/viewer-download.png',base).pathname});
  assert.deepEqual(errors,[]);
  const source_sha256={};for(const name of ['robot-assembly/index.html','robot-assembly/style.css','robot-assembly/viewer.js','assets/robot-assembly/animation-kit/character.js','assets/robot-assembly/animation-kit/example.html'])source_sha256[name]=sha(await fs.readFile(new URL('../../'+name,import.meta.url)));
  const report={status:'passed',browser:'Chromium / SwiftShader',archive_sha256:record.sha256,archive_files:record.files,checks,console_errors:errors,source_sha256,checks_description:['Fresh ZIP extraction and every payload checksum','All four combined rigs load from extracted files only','Layer controls and muscle joint study','Actual ZIP and combined GLB downloads match hashes','Six head/tier download links; distance maps to articulated game','390px layout without horizontal overflow']};
  await fs.writeFile(new URL('browser-validation.json',base),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',files:checks.length,archive_bytes:record.bytes,errors}));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));await fs.rm(temp,{recursive:true,force:true});}
