import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id), stage = $('stage'), BASE = '../assets/takaashi01/', VERSION = 'takaashi-20261126';
const LEGS = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'], CHELAE = ['CL', 'CR'];
const scene = new T.Scene(); scene.background = new T.Color('#e6e5e1');
const renderer = new T.WebGLRenderer({antialias: true}); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
stage.prepend(renderer.domElement);
const camera = new T.PerspectiveCamera(35, 1, .02, 120);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.minDistance = .35; controls.maxDistance = 14; controls.maxPolarAngle = Math.PI * .495;
const env = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(env, .04).texture; scene.environmentIntensity = .6; env.dispose(); pmrem.dispose();
scene.add(new T.HemisphereLight(0xffffff, 0x8d8a82, 1.0));
// Bright studio after the concept image: soft key, cool fill and a rim to separate the openwork.
const key = new T.DirectionalLight(0xfff3e4, 2.8); key.position.set(2.6, 5.2, 3.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 14}); key.shadow.normalBias = .002; key.shadow.radius = 4; scene.add(key, key.target);
const fill = new T.DirectionalLight(0xe2ecff, .9); fill.position.set(-3.5, 2.4, 1.5); scene.add(fill);
const rim = new T.DirectionalLight(0xffffff, 1.3); rim.position.set(.5, 3, -4.5); scene.add(rim);
const floor = new T.Mesh(new T.PlaneGeometry(200, 200), new T.MeshStandardMaterial({color: 0xdcdbd6, roughness: .42, metalness: 0}));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.002; floor.receiveShadow = true; scene.add(floor);
const grid = new T.GridHelper(40, 160, 0x9a978f, 0xbebcb6); grid.material.transparent = true; grid.material.opacity = .5; grid.position.y = -.001; scene.add(grid);
const holder = new T.Group(); holder.name = 'TAKAASHI_INSTANCE'; scene.add(holder);
const markers = {};
for (const id of LEGS) {
  const m = new T.Mesh(new T.RingGeometry(.03, .038, 32), new T.MeshBasicMaterial({color: 0x2f6fb8, side: T.DoubleSide, transparent: true, opacity: .85, depthWrite: false}));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); markers[id] = m;
}
const manifest = await fetch(BASE + 'manifest.json?v=' + VERSION).then(r => r.json());
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const CLIPS = {
  Watch_Idle: ['Watch', 'Idle', 'Planted watch. Eyestalks scan, mouthparts work and each claw flexes; L2 and R3 reset their footing.'],
  Scuttle_Left_Cycle: ['Scuttle ←', 'Gait', 'Alternating tetrapod: L1 R2 L3 R4 swing together, then R1 L2 R3 L4. Leading legs flex to pull, trailing legs extend to push. 0.30 m/s toward the crab’s left.'],
  Scuttle_Right_Cycle: ['Scuttle →', 'Gait', 'The same tetrapod rhythm toward the crab’s right. 0.30 m/s. Watch the right legs pull and the left legs push.'],
  Forward_Walk_Cycle: ['Forward', 'Gait', 'A slow wave gait: one leg per side swings, rear to front, while six support the body. 0.16 m/s.'],
  Turn_Left_Cycle: ['Turn ↺', 'Gait', 'Turning in place on the tetrapod rhythm at 12.6°/s; stance tips stay planted as the body yaws.'],
  Turn_Right_Cycle: ['Turn ↻', 'Gait', 'Turning in place to the right at 12.6°/s.'],
  Feed_Cycle: ['Feed', 'Claws', 'Body lowered. Each claw in turn opens, pinches just above the floor and passes food across the mouth while the maxillipeds work quickly.'],
  Claw_Snap: ['Snap', 'Claws', 'Both claws rise and open wide, tremble, then each shuts in 70 ms: left at 1.05 s, right at 1.20 s.'],
  Threat_Display: ['Threat', 'Display', 'Rises 16 cm on six legs, lifts the first walking pair and pulses the open claws, then settles.'],
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let gltf, mixer, action, helper, entry, clipName = 'Watch_Idle', activeView = 'hero', time = 0, elapsed = 0, playing = !reduced, loadToken = 0, clawTips = {};
const previousFocus = new T.Vector3();
for (const [name, [label, kind]] of Object.entries(CLIPS)) {
  const b = document.createElement('button'); b.innerHTML = '<span>' + kind.toUpperCase() + '</span>' + label; b.dataset.clip = name; b.onclick = () => selectClip(name); $('clips').append(b);
}
const meta = () => entry?.clips.find(c => c.name === clipName);
function selectClip(name) {
  clipName = name; time = 0; elapsed = 0; holder.position.set(0, 0, 0); holder.rotation.set(0, 0, 0); mixer?.stopAllAction();
  const clip = gltf?.animations.find(c => c.name === name); action = clip ? mixer.clipAction(clip) : null;
  if (action) { action.reset().setLoop(T.LoopOnce, 1); action.clampWhenFinished = true; action.play(); mixer.update(0); }
  $('clip-note').textContent = entry?.static ? 'Static standing silhouette for distance and loading views. Choose the game or master tier to inspect motion.' : CLIPS[name][2];
  $('time').max = clip?.duration || 1; for (const id of ['time', 'play', 'replay']) $(id).disabled = !clip;
  $('play').textContent = playing && clip ? 'Pause' : 'Play';
  document.querySelectorAll('[data-clip]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.clip === name)); b.disabled = !!entry?.static; });
  updatePose(); setView(activeView);
}
function disposeAsset(a) { a.scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); for (const m of [].concat(o.material)) m.dispose(); } }); }
function findClawTips() {
  // Farthest skinned vertex from each finger's joint: the pollex tip on the palm, the dactyl tip.
  clawTips = {}; if (entry.static) return; gltf.scene.updateMatrixWorld(true); const v = new T.Vector3();
  for (const id of CHELAE) for (const part of ['PROPODUS_', 'DACTYL_']) {
    const bone = gltf.scene.getObjectByName(part + id), head = bone.getWorldPosition(new T.Vector3()); let best = null;
    gltf.scene.traverse(o => { if (!o.isSkinnedMesh) return; const bi = o.skeleton.bones.indexOf(bone), si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
      for (let i = 0; i < si.count; i++) if (si.getX(i) === bi && sw.getX(i) > .5) { o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld); const d = v.distanceTo(head); if (!best || d > best.d) best = {mesh: o, index: i, d}; } });
    (clawTips[id] ||= {})[part] = best;
  }
}
function clawGap(id) {
  const t = clawTips[id]; if (!t) return null; const a = new T.Vector3(), b = new T.Vector3();
  t.PROPODUS_.mesh.getVertexPosition(t.PROPODUS_.index, a).applyMatrix4(t.PROPODUS_.mesh.matrixWorld); t.DACTYL_.mesh.getVertexPosition(t.DACTYL_.index, b).applyMatrix4(t.DACTYL_.mesh.matrixWorld);
  return a.distanceTo(b);
}
async function load() {
  const token = ++loadToken, sel = manifest.assets.find(e => e.lod === Number($('lod').value)), enc = $('encoding').value, file = enc === 'meshopt' ? sel.meshopt_file : sel.file;
  $('status').textContent = 'Loading ' + $('lod').selectedOptions[0].textContent + '…';
  try {
    const next = await loader.loadAsync(BASE + file + '?v=' + (enc === 'meshopt' ? sel.meshopt_sha256 : sel.sha256).slice(0, 12)); if (token !== loadToken) { disposeAsset(next); return; }
    if (gltf) { mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene); holder.remove(gltf.scene); disposeAsset(gltf); }
    if (helper) { scene.remove(helper); helper.dispose(); }
    gltf = next; entry = sel; holder.add(gltf.scene);
    gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    mixer = new T.AnimationMixer(gltf.scene); helper = new T.SkeletonHelper(gltf.scene); helper.material.depthTest = false; helper.renderOrder = 10; scene.add(helper); helper.visible = $('skeleton').checked && !entry.static;
    holder.position.set(0, 0, 0); holder.rotation.set(0, 0, 0); findClawTips();
    $('download').href = BASE + file;
    $('stats').innerHTML = '<dt>Triangles</dt><dd>' + entry.triangles.toLocaleString() + '</dd><dt>Mesh draws</dt><dd>' + entry.draw_calls + '</dd><dt>File size</dt><dd>' + ((enc === 'meshopt' ? entry.meshopt_bytes : entry.bytes) / 1048576).toFixed(2) + ' MiB</dd><dt>Animation clips</dt><dd>' + gltf.animations.length + '</dd><dt>Joints</dt><dd>' + manifest.animation.skeleton_joints + '</dd><dt>Bounds</dt><dd>' + entry.bounds.dimensions_m.map(x => x.toFixed(2)).join(' × ') + ' m</dd>';
    selectClip(clipName); wireframe();
  } catch (e) { $('status').textContent = 'Asset loading failed: ' + e.message; console.error(e); }
}
function wireframe() { gltf?.scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) m.wireframe = $('wireframe').checked; }); }
function applyTravel() {
  const m = meta(); holder.position.set(0, 0, 0); holder.rotation.set(0, 0, 0);
  if (!$('travel').checked || !m || entry.static) return;
  if (m.velocity_mps) holder.position.set(m.velocity_mps[0] * elapsed, 0, m.velocity_mps[2] * elapsed);
  if (m.yaw_rate_rad_s) holder.rotation.y = m.yaw_rate_rad_s * elapsed;
}
function updatePose() {
  if (!gltf) return;
  if (action) { action.time = Math.min(time, action.getClip().duration - 1e-7); action.enabled = true; action.paused = false; mixer.update(0); }
  applyTravel(); holder.updateMatrixWorld(true);
  let planted = 0; const p = new T.Vector3();
  for (const id of LEGS) {
    gltf.scene.getObjectByName('SOCKET_TIP_' + id).getWorldPosition(p); const contact = p.y < .006; planted += contact;
    const mk = markers[id]; mk.visible = $('contacts').checked; mk.position.set(p.x, .001, p.z); mk.material.opacity = contact ? .85 : .25; mk.material.color.setHex(contact ? 0x2f6fb8 : 0x8d949a);
    const badge = document.querySelector('[data-leg="' + id + '"]'); badge.classList.toggle('contact', contact); badge.title = contact ? 'Tip planted' : 'Swing · ' + (p.y * 100).toFixed(1) + ' cm';
  }
  const body = gltf.scene.getObjectByName('BODY').getWorldPosition(new T.Vector3()).y, gl = clawGap('CL'), gr = clawGap('CR');
  $('motion-readout').textContent = planted + ' of 8 tips planted · Body ' + (body * 100).toFixed(1) + ' cm' + (gl === null ? '' : ' · Claw tip gap L ' + (gl * 100).toFixed(1) + ' / R ' + (gr * 100).toFixed(1) + ' cm');
  $('time').value = time; $('readout').value = time.toFixed(2) + ' / ' + (action?.getClip().duration || 0).toFixed(2) + ' s';
  $('status').textContent = entry.static ? 'STATIC DISTANCE / STANDING' : CLIPS[clipName][0].toUpperCase() + ' / ' + (playing ? 'PLAYING' : 'PAUSED') + ' · ' + (entry.lod === 0 ? 'DETAILED MASTER' : 'GAME TIER');
}
function scrub(t) { time = t; elapsed = t; playing = false; $('play').textContent = 'Play'; updatePose(); }
const views = {hero: {p: [3.3, 1.85, 3.9], t: [0, .48, .15]}, front: {p: [0, .86, 5.9], t: [0, .5, 0]}, side: {p: [5.9, 1.0, .1], t: [0, .5, 0]}, top: {p: [0, 6.4, .9], t: [0, 0, .05]}, claw: {p: [1.05, .95, 2.75], t: [0, .42, .95]}, leg: {p: [2.35, 1.35, 1.75], t: [.72, .8, .55]}, card: {p: [2.55, 1.35, 3.05], t: [0, .46, .22]}};
const focus = () => $('follow').checked ? new T.Vector3(holder.position.x, 0, holder.position.z) : new T.Vector3();
function setView(name) {
  activeView = name; const v = views[name], f = focus(); camera.position.fromArray(v.p).add(f); controls.target.fromArray(v.t).add(f); previousFocus.copy(f); controls.update();
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
}
$('lod').onchange = load; $('encoding').onchange = load; $('wireframe').onchange = wireframe;
$('skeleton').onchange = () => helper.visible = $('skeleton').checked && !entry.static;
$('play').onclick = () => { if (!action) return; if (!playing && time >= action.getClip().duration) { time = 0; elapsed = 0; } playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; };
$('replay').onclick = () => { playing = true; selectClip(clipName); };
$('travel').onchange = () => { elapsed = time; updatePose(); setView(activeView); }; $('contacts').onchange = updatePose; $('follow').onchange = () => setView(activeView);
$('time').oninput = () => scrub(Number($('time').value));
for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => setView(b.dataset.view);
$('fullscreen').onclick = async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.requestFullscreen(); };
$('capture').onclick = () => { renderer.render(scene, camera); renderer.domElement.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'takaashi01-' + clipName + '-' + time.toFixed(2) + 's.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }); };
document.addEventListener('keydown', e => { if (e.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(e.target.tagName)) { e.preventDefault(); $('play').click(); } });
new ResizeObserver(() => { camera.aspect = stage.clientWidth / stage.clientHeight; camera.fov = 2 * Math.atan(Math.tan(35 * Math.PI / 360) / Math.min(1, camera.aspect / 1.25)) * 180 / Math.PI; camera.updateProjectionMatrix(); renderer.setSize(stage.clientWidth, stage.clientHeight); }).observe(stage);
await load(); setView('hero'); let last = performance.now();
renderer.setAnimationLoop(now => {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (playing && action) { const s = Number($('speed').value), d = action.getClip().duration; time += dt * s; elapsed += dt * s;
    if (time >= d) { if (meta().loop || $('loop').checked) time %= d; else { time = d; playing = false; $('play').textContent = 'Play'; } } }
  updatePose();
  const f = focus(), delta = f.clone().sub(previousFocus); camera.position.add(delta); controls.target.add(delta); previousFocus.copy(f);
  grid.position.x = Math.round(f.x / .25) * .25; grid.position.z = Math.round(f.z / .25) * .25; floor.position.x = f.x; floor.position.z = f.z;
  key.position.set(f.x + 2.6, 5.2, f.z + 3.4); key.target.position.copy(f); key.target.updateMatrixWorld();
  controls.update(); renderer.render(scene, camera);
});
window.takaashi = {get gltf() { return gltf; }, get entry() { return entry; }, get time() { return time; }, get playing() { return playing; }, selectClip, load, updatePose, scrub, setView, clawGap, renderer, scene, camera, holder, markers, manifest};
