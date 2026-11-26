// Browser check for the TAKAASHI viewers (TAKAASHI_FAMILY=takaashi01|takaashi02). Serve the repository on 127.0.0.1:8788, then run with
// PLAYWRIGHT_MODULE set to an installed Playwright (and optionally CHROMIUM_EXECUTABLE, TAKAASHI_SHOTS).
import assert from 'node:assert/strict'; import fs from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FAMILY = process.env.TAKAASHI_FAMILY || 'takaashi01', NUM = FAMILY.slice(-2), LABEL = 'TAKAASHI-' + NUM, PREFIX = 'TK' + NUM;
const URL0 = process.env.TAKAASHI_VIEWER_URL || 'http://127.0.0.1:8788/' + FAMILY + '/', SHOTS = process.env.TAKAASHI_SHOTS || '/tmp';
const browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'], ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {})});
const context = await browser.newContext({viewport: {width: 1480, height: 980}, deviceScaleFactor: 1, acceptDownloads: true});
const page = await context.newPage(), errors = []; page.setDefaultTimeout(90000);
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL0); await page.waitForFunction(() => window.takaashi?.gltf && window.takaashi.entry);
const manifest = await page.evaluate(() => window.takaashi.manifest);
const k = (fn, ...a) => page.evaluate(fn, ...a);
const frames = (n = 2) => k(n => new Promise(r => { let i = 0; const f = () => ++i >= n ? r() : requestAnimationFrame(f); requestAnimationFrame(f); }), n);
let lastFrame;
async function inFrame() { await frames(2); lastFrame = await k(async () => { const T = await import('three'), t = window.takaashi; const b = new T.Box3().setFromObject(t.gltf.scene, true), p = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) p.push(new T.Vector3(x, y, z).project(t.camera));
  return {ok: p.every(v => Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02), corners: p.map(v => [+v.x.toFixed(3), +v.y.toFixed(3)]), cam: t.camera.position.toArray(), holder: t.holder.position.toArray(), view: document.querySelector('[data-view][aria-pressed=true]')?.dataset.view}; });
  return lastFrame.ok; }
const planted = () => page.locator('[data-leg].contact').count();
const gaps = () => k(() => ['CL', 'CR'].map(id => window.takaashi.clawGap(id)));
const results = [];
// Every clip: select through the UI, scrub, check time, draws, framing and readouts.
for (const [clip, t, view] of [['Watch_Idle', 1.5, 'hero'], ['Scuttle_Left_Cycle', .45, 'front'], ['Scuttle_Right_Cycle', .45, 'front'], ['Forward_Walk_Cycle', .6, 'side'], ['Turn_Left_Cycle', .5, 'hero'], ['Turn_Right_Cycle', .5, 'hero'], ['Feed_Cycle', .82, 'front'], ['Claw_Snap', .95, 'hero'], ['Threat_Display', 1.6, 'front']]) {
  await page.locator('[data-clip="' + clip + '"]').click(); await page.locator('[data-view="' + view + '"]').click();
  await page.locator('#time').evaluate((el, t) => { el.value = t; el.dispatchEvent(new Event('input')); }, t); await page.waitForTimeout(120);
  const s = await k(() => ({time: window.takaashi.time, draws: window.takaashi.renderer.info.render.calls, status: document.getElementById('status').textContent, readout: document.getElementById('motion-readout').textContent}));
  assert(Math.abs(s.time - t) < .01, clip + ' scrub'); assert(s.draws >= 6, clip + ' draws'); assert(await inFrame(), clip + ' out of frame ' + JSON.stringify(lastFrame)); assert(s.status.includes('PAUSED'));
  s.planted = await planted(); results.push({clip, t, view, ...s}); await page.screenshot({path: SHOTS + '/' + FAMILY + '-' + clip + '.png'});
}
assert.equal(results.find(r => r.clip === 'Watch_Idle').planted, 8, 'idle stands on eight');
assert.equal(results.find(r => r.clip === 'Scuttle_Left_Cycle').planted, 4, 'tetrapod swing leaves four planted');
assert.equal(results.find(r => r.clip === 'Threat_Display').planted, 6, 'threat stands on six');
assert.equal(await page.locator('[data-leg="L1"].contact').count(), 0); assert.equal(await page.locator('[data-leg="R1"].contact').count(), 0);
// Claw events, measured from the actual skinned finger tips.
await k(() => { window.takaashi.selectClip('Claw_Snap'); window.takaashi.scrub(.95); }); const open = await gaps();
await k(() => window.takaashi.scrub(1.32)); const shut = await gaps();
await k(() => { window.takaashi.selectClip('Feed_Cycle'); window.takaashi.scrub(.82); }); const pinch = await gaps();
assert(open.every(g => g > .25), 'snap opens ' + open); assert(shut.every(g => g < .06), 'snap shuts ' + shut); assert(pinch[0] < .06, 'feed pinch ' + pinch);
// Engine-style travel: translation for scuttle/forward, yaw for turns, none with travel off.
await page.locator('#travel').check();
const travel = {};
for (const [clip, t] of [['Scuttle_Left_Cycle', .5], ['Scuttle_Right_Cycle', .5], ['Forward_Walk_Cycle', 1], ['Turn_Left_Cycle', 1], ['Turn_Right_Cycle', 1]]) {
  travel[clip] = await k(([c, t]) => { const tk = window.takaashi; tk.selectClip(c); tk.scrub(t); return {x: tk.holder.position.x, z: tk.holder.position.z, yaw: tk.holder.rotation.y}; }, [clip, t]); }
assert(Math.abs(travel.Scuttle_Left_Cycle.x - .15) < 1e-6 && Math.abs(travel.Scuttle_Right_Cycle.x + .15) < 1e-6, 'lateral travel');
assert(Math.abs(travel.Forward_Walk_Cycle.z - .16) < 1e-6, 'forward travel'); assert(Math.abs(travel.Turn_Left_Cycle.yaw - .22) < 1e-6 && Math.abs(travel.Turn_Right_Cycle.yaw + .22) < 1e-6, 'turn yaw');
await page.locator('#travel').uncheck(); assert.equal(await k(() => window.takaashi.holder.position.x + window.takaashi.holder.rotation.y), 0); await page.locator('#travel').check();
// Playback advances, pause stops.
await page.locator('[data-clip="Scuttle_Left_Cycle"]').click(); await page.locator('#play').click(); const t0 = await k(() => window.takaashi.time); await page.waitForTimeout(700);
assert(await k(() => window.takaashi.time) !== t0, 'playback advances'); assert(await k(() => window.takaashi.holder.position.x) > 0, 'travel while playing');
await page.locator('#play').click(); const t1 = await k(() => window.takaashi.time); await page.waitForTimeout(300); assert.equal(await k(() => window.takaashi.time), t1, 'pause holds');
// Toggles.
await page.locator('#skeleton').check(); assert(await k(() => window.takaashi.scene.children.some(c => c.type === 'SkeletonHelper' && c.visible))); await page.locator('#skeleton').uncheck();
await page.locator('#wireframe').check(); assert(await k(() => { let w = false; window.takaashi.gltf.scene.traverse(o => { if (o.isMesh && [].concat(o.material).some(m => m.wireframe)) w = true; }); return w; })); await page.locator('#wireframe').uncheck();
await page.locator('#contacts').uncheck(); assert(await k(() => Object.values(window.takaashi.markers).every(m => !m.visible))); await page.locator('#contacts').check();
for (const v of ['hero', 'front', 'side', 'top', 'claw', 'leg']) { await page.locator('[data-view="' + v + '"]').click(); assert.equal(await page.locator('[data-view="' + v + '"]').getAttribute('aria-pressed'), 'true'); }
// Tiers and encodings, with matching downloads.
const loads = [];
for (const lod of ['1', '2', '0']) for (const enc of ['meshopt', 'plain']) {
  await page.locator('#lod').selectOption(lod); await page.locator('#encoding').selectOption(enc);
  const e = manifest.assets.find(a => a.lod === Number(lod)), file = enc === 'meshopt' ? e.meshopt_file : e.file;
  await page.waitForFunction(([l, f]) => window.takaashi.entry?.lod === l && document.getElementById('download').href.endsWith(f) && window.takaashi.gltf.scene.parent, [Number(lod), file]);
  await page.waitForTimeout(150);
  const state = await k(() => ({clips: window.takaashi.gltf.animations.length, timeline: document.getElementById('time').disabled, clipDisabled: document.querySelector('[data-clip="Feed_Cycle"]').disabled}));
  assert.equal(state.clips, lod === '2' ? 0 : 9); assert.equal(state.timeline, lod === '2'); assert.equal(state.clipDisabled, lod === '2');
  const size = await k(async h => (await (await fetch(h)).arrayBuffer()).byteLength, await page.locator('#download').getAttribute('href'));
  assert.equal(size, enc === 'meshopt' ? e.meshopt_bytes : e.bytes, 'download bytes ' + file); loads.push({lod: Number(lod), encoding: enc, file, bytes: size, clips: state.clips});
}
// PNG capture.
await page.locator('[data-view="hero"]').click();
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#capture').click()]); const capture = dl.suggestedFilename(); assert(capture.endsWith('.png'));
await page.locator('[data-clip="Watch_Idle"]').click(); await page.screenshot({path: SHOTS + '/' + FAMILY + '-desktop.png'});
// Mobile layout.
await page.setViewportSize({width: 390, height: 844}); await page.waitForTimeout(250);
assert(await k(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow at 390 px'); await page.locator('[data-view="front"]').click(); assert(await inFrame(), 'mobile framing');
await page.screenshot({path: SHOTS + '/' + FAMILY + '-mobile.png', fullPage: true});
// Reduced motion starts paused.
const rm = await browser.newContext({viewport: {width: 1200, height: 800}, reducedMotion: 'reduce'}); const p2 = await rm.newPage(); p2.on('pageerror', e => errors.push('reduced: ' + e.message));
await p2.goto(URL0); await p2.waitForFunction(() => window.takaashi?.gltf); await p2.waitForTimeout(400); assert.equal(await p2.evaluate(() => window.takaashi.playing), false, 'reduced motion starts paused'); assert.equal(await p2.evaluate(() => window.takaashi.time), 0); await rm.close();
assert.deepEqual(errors, []);
const report = {status: 'passed', browser: 'Chromium headless (SwiftShader WebGL); functional check, not a performance benchmark', url: URL0,
  asset_hashes: manifest.assets.map(e => ({file: e.file, sha256: e.sha256, meshopt_sha256: e.meshopt_sha256})),
  clip_checks: results.map(({clip, t, view, draws, planted, readout}) => ({clip, t, view, draws, planted_tips: planted, readout})),
  claw_tip_gap_m: {snap_open: open, snap_shut: shut, feed_pinch: pinch}, engine_travel: travel, tier_encoding_loads: loads, capture_file: capture,
  checks: ['nine clips selected and scrubbed with framing', 'tetrapod 4-of-8 and threat 6-of-8 contact readouts', 'claw open/shut/pinch from skinned finger tips', 'engine travel and yaw on/off', 'play and pause', 'skeleton, wireframe, tip markers and six camera views', 'all plain and Meshopt tiers with matching download bytes', 'static tier disables motion controls', 'PNG capture', '390 px layout without overflow', 'reduced motion starts paused', 'no page or console errors']};
await fs.writeFile(new URL('../../assets/' + FAMILY + '/viewer-validation.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log('PASS viewer', JSON.stringify({open, shut, pinch, loads: loads.length, capture})); await browser.close();
