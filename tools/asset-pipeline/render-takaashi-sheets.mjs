// Derived review images for a TAKAASHI family (TAKAASHI_FAMILY) from the live viewer (runtime materials and lighting):
// assets/<family>/preview.png and motion-sheet.png. Serve the repository on 127.0.0.1:8788 first.
import fs from 'node:fs/promises'; import sharp from 'sharp';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FAMILY = process.env.TAKAASHI_FAMILY || 'takaashi01', NUM = FAMILY.slice(-2), LABEL = 'TAKAASHI-' + NUM, PREFIX = 'TK' + NUM;
const out = new URL('../../assets/' + FAMILY + '/', import.meta.url), URL0 = process.env.TAKAASHI_VIEWER_URL || 'http://127.0.0.1:8788/' + FAMILY + '/';
const browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 1600, height: 1000}, deviceScaleFactor: 1}); page.setDefaultTimeout(120000);
await page.goto(URL0); await page.waitForFunction(() => window.takaashi?.gltf);
await page.addStyleTag({content: '.workshop-header,aside,.identity,.views,.stage-meta,.view-badge{display:none!important}main{grid-template-columns:1fr!important;height:100vh!important;min-height:0!important}#stage{height:100vh!important}'});
await page.evaluate(() => { const c = document.getElementById('contacts'); c.checked = false; c.dispatchEvent(new Event('change')); });
const frames = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
async function capture(clip, t, view) {
  await page.evaluate(([c, t, v]) => { const k = window.takaashi; k.selectClip(c); k.scrub(t); k.setView(v); }, [clip, t, view]); await frames(); await page.waitForTimeout(150); await frames();
  return page.locator('#stage canvas').screenshot();
}
await page.setViewportSize({width: 1600, height: 1000}); await page.waitForTimeout(300);
const hero = await capture('Watch_Idle', 1.5, 'card');   // script-only close three-quarter camera
await sharp(hero).resize(1280, 800).png({compressionLevel: 9}).toFile(new URL('preview.png', out).pathname);
await page.setViewportSize({width: 1200, height: 750}); await page.waitForTimeout(300);
const poses = [['Watch_Idle', 1.5, 'hero', 'WATCH · eight tips planted'], ['Scuttle_Left_Cycle', .45, 'front', 'SCUTTLE ← · L1 R2 L3 R4 swing'], ['Scuttle_Left_Cycle', 1.2, 'front', 'SCUTTLE ← · R1 L2 R3 L4 swing'],
  ['Forward_Walk_Cycle', .6, 'side', 'FORWARD · wave gait, six in stance'], ['Turn_Left_Cycle', .5, 'top', 'TURN ↺ · yawing on planted tips'], ['Feed_Cycle', .7, 'claw', 'FEED · claw opens over the floor'],
  ['Feed_Cycle', .82, 'claw', 'FEED · pinch 3 cm above the floor'], ['Feed_Cycle', 2.1, 'front', 'FEED · food passed to the mouth'], ['Claw_Snap', .95, 'hero', 'SNAP · both claws open 0.95 rad'],
  ['Claw_Snap', 1.32, 'hero', 'SNAP · each shuts in 70 ms'], ['Threat_Display', 1.6, 'front', 'THREAT · body up 16 cm on six legs'], ['Threat_Display', 1.6, 'hero', 'THREAT · first pair raised, claws spread']];
const W = 600, Hh = 375, CAP = 34, HEAD = 74, COLS = 3, ROWS = 4, tiles = [];
for (const [clip, t, view, label] of poses) {
  const img = await sharp(await capture(clip, t, view)).resize(W, Hh).png().toBuffer();
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cap = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + CAP + '"><rect width="100%" height="100%" fill="#1f2427"/><text x="12" y="22" font-family="IBM Plex Mono, Menlo, monospace" font-size="13" fill="#dfe6e8">' + esc(label) + '</text><text x="' + (W - 12) + '" y="22" text-anchor="end" font-family="IBM Plex Mono, Menlo, monospace" font-size="12" fill="#79b8ff">' + clip + ' @ ' + t.toFixed(2) + ' s</text></svg>');
  tiles.push({img, cap}); console.log('POSE', clip, t, view);
}
const head = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + (COLS * W + (COLS + 1) * 10) + '" height="' + HEAD + '"><text x="10" y="40" font-family="Barlow Condensed, Helvetica, sans-serif" font-size="32" font-weight="600" fill="#e6ecee">' + LABEL + (NUM === '02' ? ' / BRAIDED SPIDER CRAB' : ' / MECHANICAL SPIDER CRAB') + ' — MOTION STUDY</text><text x="10" y="62" font-family="IBM Plex Mono, Menlo, monospace" font-size="12" fill="#a3abae">Derived from the plain LOD0 GLB in the Workshop viewer. Gaits shown with engine travel applied. Model and animation by Jelaludo.</text></svg>');
const width = COLS * W + (COLS + 1) * 10, height = HEAD + ROWS * (Hh + CAP + 10) + 10, comp = [{input: head, left: 0, top: 0}];
tiles.forEach((t, i) => { const x = 10 + (i % COLS) * (W + 10), y = HEAD + Math.floor(i / COLS) * (Hh + CAP + 10); comp.push({input: t.img, left: x, top: y}, {input: t.cap, left: x, top: y + Hh}); });
await sharp({create: {width, height, channels: 3, background: '#17191b'}}).composite(comp).png({compressionLevel: 9}).toFile(new URL('motion-sheet.png', out).pathname);
await browser.close(); console.log('SHEETS', width, height);
