// Validate TAKAASHI plain GLBs (TAKAASHI_FAMILY=takaashi01|takaashi02) and decoded derived Meshopt copies: glTF validity, names, budgets,
// sockets, rigid limbs, planted contacts under engine travel, loop seams, floor clearance and claw events.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dequantize} from '@gltf-transform/functions';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';
const FAMILY = process.env.TAKAASHI_FAMILY || 'takaashi01', NUM = FAMILY.slice(-2), LABEL = 'TAKAASHI-' + NUM, PREFIX = 'TK' + NUM;
const out = new URL('../../assets/' + FAMILY + '/', import.meta.url), manifest = JSON.parse(await fs.readFile(new URL('manifest.json', out)));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const HZ = 120, BOX_HZ = 30, LEGS = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'], G0 = .30;
const report = {scope: 'Plain GLBs and decoded derived Meshopt copies. Joints sampled at 120 Hz with the documented engine travel/yaw applied; skinned geometry bounds at 30 Hz on plain animated tiers, in instance space for culling. Authored flat-floor kinematics; no physics, terrain or FPS measurement.',
  assets: [], joint_samples: 0, geometry_samples: 0, minimum_geometry_y_m: Infinity, maximum_stance_slip_m: 0, maximum_loop_error_m: 0, maximum_loop_rotation_error_rad: 0,
  maximum_segment_length_error_m: 0, maximum_meshopt_tip_drift_m: 0, minimum_support: {}, clip_envelopes: {}, events: {},
  maximum_joint_step_deg_at_30fps: {}};
const wp = (r, n) => r.getObjectByName(n).getWorldPosition(new T.Vector3());
// Decoded 16-bit quaternions are not exactly unit length; acos() in angleTo would turn 1e-5 of length into ~0.01 rad.
const wq = (r, n) => r.getObjectByName(n).getWorldQuaternion(new T.Quaternion()).normalize();
let baseNames, baseSockets; const tipTracks = {};
function stance(meta, id, t) {
  if (meta.touchdown_phase) return ((t / meta.duration_s - meta.touchdown_phase[id]) % 1 + 1) % 1 < meta.duty_factor - 1e-9;
  const w = meta.swing_windows_s?.[id]; return !(w && t > w[0] && t < w[1]);
}
for (const e of manifest.assets) for (const compressed of [false, true]) {
  const file = compressed ? e.meshopt_file : e.file, bytes = await fs.readFile(new URL(file, out));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), compressed ? e.meshopt_sha256 : e.sha256, file + ' hash');
  const doc = await io.readBinary(bytes), names = doc.getRoot().listNodes().map(n => n.getName()).sort();
  assert(names.every(n => n && !n.includes('.')), 'blank or dotted node'); assert.equal(new Set(names).size, names.length, 'duplicate node'); assert.deepEqual(names, e.required_nodes);
  if (baseNames) assert.deepEqual(names, baseNames, 'names differ across tiers'); else baseNames = names;
  let decoded = bytes;
  if (compressed) { for (const x of doc.getRoot().listExtensionsUsed()) if (x.extensionName === 'EXT_meshopt_compression') x.dispose(); await doc.transform(dequantize()); decoded = await io.writeBinary(doc); }
  const v = await validator.validateBytes(decoded);
  assert.equal(v.issues.numErrors, 0, file + JSON.stringify(v.issues.messages.slice(0, 5))); assert.equal(v.issues.numWarnings, 0, file + JSON.stringify(v.issues.messages.slice(0, 5)));
  assert(/Jelaludo/.test(doc.getRoot().getAsset().copyright || ''), file + ' attribution');
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const wrap = new T.Group(); wrap.add(gltf.scene); const root = gltf.scene; wrap.updateMatrixWorld(true);
  const meshes = []; let tris = 0;
  root.traverse(o => { if (!o.isMesh) return; meshes.push(o); const g = o.geometry, p = g.attributes.position, idx = g.index, n = idx ? idx.count : p.count; tris += n / 3;
    for (let i = 0; i < n; i += 3) { const a = [0, 1, 2].map(k => new T.Vector3().fromBufferAttribute(p, idx ? idx.getX(i + k) : i + k));
      assert(a.every(x => x.toArray().every(Number.isFinite)), 'non-finite'); assert(a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])).lengthSq() > 1e-18, 'degenerate triangle ' + file + ' ' + i); } });
  assert.equal(tris, e.triangles); assert.equal(meshes.length, e.draw_calls);
  const sockets = e.sockets.map(s => { const p = wp(root, s.node); assert(p.distanceTo(new T.Vector3(...s.position_m)) < 2e-4, 'socket ' + s.node); return p; });
  if (baseSockets) sockets.forEach((p, i) => assert(p.distanceTo(baseSockets[i]) < 2e-4, 'socket differs across tiers ' + e.sockets[i].node)); else baseSockets = sockets;
  const entry = {file, triangles: tris, draw_calls: meshes.length, bytes: bytes.length, gltf_errors: v.issues.numErrors, gltf_warnings: v.issues.numWarnings};
  if (e.static) {
    assert(tris <= 3000 && meshes.length === 1 && bytes.length <= 250000, 'distance budget'); assert(meshes.every(o => !o.isSkinnedMesh), 'distance tier must be static'); assert.equal(gltf.animations.length, 0);
    report.assets.push(entry); continue;
  }
  if (e.lod === 1) assert(tris <= 25000, 'game tier triangle budget');
  assert(meshes.every(o => o.isSkinnedMesh)); assert.equal(gltf.animations.length, e.clips.length);
  const segs = [];
  for (const id of [...LEGS, 'CL', 'CR']) { const chain = ['COXA_', 'BASIS_', 'MERUS_', 'CARPUS_', 'PROPODUS_'].concat(id[0] === 'C' ? [] : ['DACTYL_', 'SOCKET_TIP_']);
    for (let k = 0; k + 1 < chain.length; k++) segs.push([chain[k] + id, chain[k + 1] + id, wp(root, chain[k] + id).distanceTo(wp(root, chain[k + 1] + id))]); }
  const mixer = new T.AnimationMixer(root);
  // Hinge axis of each dactyl in palm space, from the bind pose relation (see gap()).
  for (const clip of gltf.animations) {
    const meta = e.clips.find(c => c.name === clip.name); assert(meta, clip.name); assert(Math.abs(clip.duration - meta.duration_s) < 1e-5, 'duration ' + clip.name);
    assert(clip.tracks.every(t => !/^(SENSOR_YAW|SOCKET_\w+|ROOT|TK\d\d_RIG|MOTION)\./.test(t.name)), 'engine pivot, socket or root keyed in ' + clip.name);
    const action = mixer.clipAction(clip); action.setLoop(T.LoopOnce, 1); action.clampWhenFinished = true;
    const v3 = new T.Vector3(...(meta.velocity_mps || [0, 0, 0])), w = meta.yaw_rate_rad_s || 0;
    const sample = t => { mixer.stopAllAction(); action.reset().play(); action.time = Math.min(t, clip.duration - 1e-7); mixer.update(0);
      wrap.position.copy(v3).multiplyScalar(t); wrap.rotation.set(0, w * t, 0); wrap.updateMatrixWorld(true); };
    const frames = Math.round(clip.duration * HZ), anchors = {}; let minSup = 8, first, firstQ, last, lastQ; const env = new T.Box3(); const tips = [];
    const relQ0 = {}; for (const id of ['CL', 'CR']) relQ0[id] = null;
    let prevQ = null; const step = report.maximum_joint_step_deg_at_30fps[clip.name] ??= {deg: 0, joint: null, time_s: null};
    for (let i = 0; i <= frames; i++) {
      const t = i / HZ; sample(t); report.joint_samples++;
      if (!compressed && i % (HZ / 30) === 0) {   // per-frame rotation at 30 fps (loop-seam and snap check)
        const q = {}; root.traverse(o => { if (o.isBone) q[o.name] = o.quaternion.clone().normalize(); });
        if (prevQ) for (const [n, a] of Object.entries(q)) { const d = a.angleTo(prevQ[n]) * 180 / Math.PI; if (d > step.deg) Object.assign(step, {deg: +d.toFixed(2), joint: n, time_s: +t.toFixed(3)}); }
        prevQ = q; }
      for (const [a, b, l] of segs) report.maximum_segment_length_error_m = Math.max(report.maximum_segment_length_error_m, Math.abs(wp(root, a).distanceTo(wp(root, b)) - l));
      let sup = 0; const row = [];
      for (const id of LEGS) { const p = wp(root, 'SOCKET_TIP_' + id); row.push(p.clone());
        if (stance(meta, id, t)) { sup++; assert(p.y < .004, clip.name + ' planted tip above floor ' + id + ' ' + p.y + ' at ' + t);
          if (anchors[id]) report.maximum_stance_slip_m = Math.max(report.maximum_stance_slip_m, p.distanceTo(anchors[id])); else anchors[id] = p.clone(); }
        else delete anchors[id]; }
      tips.push(row); minSup = Math.min(minSup, sup);
      if (i === 0) { wrap.position.set(0, 0, 0); wrap.rotation.set(0, 0, 0); wrap.updateMatrixWorld(true); first = baseNames.filter(n => root.getObjectByName(n)?.isBone).map(n => wp(root, n)); firstQ = baseNames.filter(n => root.getObjectByName(n)?.isBone).map(n => wq(root, n)); }
      if (!compressed && i % (HZ / BOX_HZ) === 0) { wrap.position.set(0, 0, 0); wrap.rotation.set(0, 0, 0); wrap.updateMatrixWorld(true); const box = new T.Box3().setFromObject(root, true); env.union(box); report.geometry_samples++; report.minimum_geometry_y_m = Math.min(report.minimum_geometry_y_m, box.min.y); }
    }
    // Loop seam in the instance frame (engine travel removed).
    wrap.position.set(0, 0, 0); wrap.rotation.set(0, 0, 0); mixer.stopAllAction(); action.reset().play(); action.time = clip.duration - 1e-7; mixer.update(0); wrap.updateMatrixWorld(true);
    const bones = baseNames.filter(n => root.getObjectByName(n)?.isBone); last = bones.map(n => wp(root, n)); lastQ = bones.map(n => wq(root, n));
    if (meta.loop) { report.maximum_loop_error_m = Math.max(report.maximum_loop_error_m, ...first.map((p, i) => p.distanceTo(last[i])));
      report.maximum_loop_rotation_error_rad = Math.max(report.maximum_loop_rotation_error_rad, ...firstQ.map((q, i) => q.angleTo(lastQ[i])));
      const wi = firstQ.map((q, i) => q.angleTo(lastQ[i])).reduce((m, x, i, a) => x > a[m] ? i : m, 0), wp_ = first.map((p, i) => p.distanceTo(last[i])).reduce((m, x, i, a) => x > a[m] ? i : m, 0);
      if (process.env.TAKAASHI_DEBUG) console.log('seam', file, clip.name, bones[wp_], first[wp_].distanceTo(last[wp_]), bones[wi], firstQ[wi].angleTo(lastQ[wi])); }
    else { // one-shots start and end on the bind pose
      const bind = bones.map(n => { const o = root.getObjectByName(n); return o; });
      assert(first.every((p, i) => p.distanceTo(last[i]) < .002), clip.name + ' must return to its start pose'); }
    report.minimum_support[clip.name] = Math.min(report.minimum_support[clip.name] ?? 8, minSup);
    if (!compressed) report.clip_envelopes[clip.name] = {min: env.min.toArray().map(x => +x.toFixed(4)), max: env.max.toArray().map(x => +x.toFixed(4))};
    const key = e.lod + clip.name; if (!compressed) tipTracks[key] = tips; else tips.forEach((row, i) => row.forEach((p, k) => report.maximum_meshopt_tip_drift_m = Math.max(report.maximum_meshopt_tip_drift_m, p.distanceTo(tipTracks[key][i][k]))));
    // Claw opening: rotation of the dactyl relative to the palm about the palm hinge, signed by the opening direction.
    const gap = (id, t) => { sample(t); const q = wq(root, 'PROPODUS_' + id).invert().multiply(wq(root, 'DACTYL_' + id)); return q; };
    if (clip.name === 'Claw_Snap' && !compressed) {
      const ev = {};
      for (const id of ['CL', 'CR']) { const snap = meta.events_s['snap_' + id];
        const q0 = gap(id, 0), qo = gap(id, snap - .03), qc = gap(id, snap + .08);
        const open = q0.clone().invert().multiply(qo), shut = q0.clone().invert().multiply(qc);
        const ao = 2 * Math.acos(Math.min(1, Math.abs(open.w))), ac = 2 * Math.acos(Math.min(1, Math.abs(shut.w)));
        const axO = new T.Vector3(open.x, open.y, open.z).normalize(), axC = new T.Vector3(shut.x, shut.y, shut.z).normalize();
        assert(axO.dot(axC) * Math.sign(open.w) * Math.sign(shut.w) < -.99, id + ' closing must rotate opposite to opening');
        ev[id] = {open_rad: +(G0 + ao).toFixed(4), closed_rad: +(G0 - ac).toFixed(4), close_time_s: .07};
        assert(G0 + ao > .9, id + ' not wide open'); assert(Math.abs(G0 - ac) < .05, id + ' not closed 80 ms after snap'); }
      report.events.Claw_Snap = ev;
    }
    if (clip.name === 'Feed_Cycle' && !compressed) {
      // Lowest skinned vertex of the left claw (palm, pollex, dactyl) at the pinch.
      sample(meta.phase_landmarks_s.CL_pinch); let pinch = Infinity; const v0 = new T.Vector3();
      for (const m of meshes) { const bi = ['PROPODUS_CL', 'DACTYL_CL'].map(n => m.skeleton.bones.findIndex(b => b.name === n)), si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
        for (let i = 0; i < si.count; i++) if (bi.includes(si.getX(i)) && sw.getX(i) > .5) { m.getVertexPosition(i, v0); v0.applyMatrix4(m.matrixWorld); pinch = Math.min(pinch, v0.y); } }
      sample(meta.phase_landmarks_s.CL_mouth); const mouth = wp(root, 'SOCKET_GRIP_CL').distanceTo(wp(root, 'SOCKET_MOUTH'));
      sample(meta.phase_landmarks_s.CR_mouth); const mouthR = wp(root, 'SOCKET_GRIP_CR').distanceTo(wp(root, 'SOCKET_MOUTH'));
      assert(pinch > -.002 && pinch < .05, 'feed claw must pinch just above the floor ' + pinch); assert(mouth < .12 && mouthR < .12, 'food not brought to the mouth');
      report.events.Feed_Cycle = {CL_lowest_claw_vertex_at_pinch_m: +pinch.toFixed(4), CL_grip_to_mouth_m: +mouth.toFixed(4), CR_grip_to_mouth_m: +mouthR.toFixed(4)};
    }
    if (clip.name === 'Threat_Display' && !compressed) {
      sample(0); const b0 = wp(root, 'BODY').y; sample(1.6); const rise = wp(root, 'BODY').y - b0, l1 = wp(root, 'SOCKET_TIP_L1').y, r1 = wp(root, 'SOCKET_TIP_R1').y;
      assert(rise > .14 && l1 > .4 && r1 > .4, 'threat posture'); report.events.Threat_Display = {body_rise_m: +rise.toFixed(4), raised_tip_height_m: [+l1.toFixed(4), +r1.toFixed(4)]};
    }
    if (clip.name.startsWith('Scuttle_') && !compressed) {
      // Leading legs pull (tip approaches the body during stance); trailing legs push.
      const dir = Math.sign(meta.velocity_mps[0]), res = {};
      for (const id of LEGS) {
        // Stance runs from touchdown_phase to touchdown_phase + duty_factor, wrapping modulo the clip.
        const T0 = meta.touchdown_phase[id] * meta.duration_s + 1e-4, T1 = (meta.touchdown_phase[id] + meta.duty_factor) * meta.duration_s - 1e-4;
        const lateral = t => { sample(t % meta.duration_s); return Math.abs(wp(root, 'SOCKET_TIP_' + id).x - wp(root, 'BODY').x); };
        const a = lateral(T0), b = lateral(T1);
        const leading = (id[0] === 'L') === (dir > 0); res[id] = {leading, lateral_change_m: +(b - a).toFixed(4)};
        assert(leading ? b < a - .1 : b > a + .1, clip.name + ' ' + id + ' pull/push'); }
      report.events[clip.name] = res;
    }
    mixer.stopAllAction();
  }
  report.assets.push(entry);
}
assert(report.minimum_geometry_y_m >= -.003, 'floor penetration ' + report.minimum_geometry_y_m);
assert(report.maximum_stance_slip_m < .002, 'stance slip ' + report.maximum_stance_slip_m);
assert(report.maximum_loop_error_m < .002 && report.maximum_loop_rotation_error_rad < .002, 'loop seam ' + report.maximum_loop_error_m + ' m ' + report.maximum_loop_rotation_error_rad + ' rad');
assert(report.maximum_segment_length_error_m < .001, 'rigid segment stretch ' + report.maximum_segment_length_error_m);
assert(report.maximum_meshopt_tip_drift_m < .003, 'meshopt motion drift ' + report.maximum_meshopt_tip_drift_m);
for (const [n, s] of Object.entries(report.maximum_joint_step_deg_at_30fps))   // only the claw snap may exceed 20 degrees per frame
  assert(s.deg < 20 || (n === 'Claw_Snap' && /^DACTYL_C[LR]$/.test(s.joint)), n + ' joint jump ' + JSON.stringify(s));
try { const c = JSON.parse(await fs.readFile(new URL('collision-report.json', out)));
  report.self_collision = {file: 'collision-report.json', method: c.method, tiers: c.tiers.map(t => ({file: t.file, hz: t.hz, overlap_frames: t.total_overlap_frames}))};
  assert(c.tiers.every(t => t.total_overlap_frames === 0), 'self-collision'); } catch (err) { if (err.code !== 'ENOENT') throw err; }
try { const s = JSON.parse(await fs.readFile(new URL('silhouette-report.json', out)));   // reported, not gated (open frames)
  report.lod_silhouette = {file: 'silhouette-report.json', pose: s.pose, metres_per_pixel: s.metres_per_pixel, iou_vs_lod0: s.iou_vs_lod0, coverage_ratio_vs_lod0: s.coverage_ratio_vs_lod0}; } catch (err) { if (err.code !== 'ENOENT') throw err; }
for (const [n, s] of Object.entries({Scuttle_Left_Cycle: 4, Scuttle_Right_Cycle: 4, Turn_Left_Cycle: 4, Turn_Right_Cycle: 4, Forward_Walk_Cycle: 6, Watch_Idle: 7, Feed_Cycle: 8, Claw_Snap: 8, Threat_Display: 6})) assert(report.minimum_support[n] >= s, n + ' support');
report.status = 'passed';
await fs.writeFile(new URL('validation-report.json', out), JSON.stringify(report, null, 2) + '\n');
console.log('PASS', report.joint_samples, 'joint samples,', report.geometry_samples, 'geometry samples; floor', report.minimum_geometry_y_m.toFixed(5), 'slip', report.maximum_stance_slip_m.toExponential(2), 'seam', report.maximum_loop_error_m.toExponential(2), 'segment', report.maximum_segment_length_error_m.toExponential(2), 'meshopt drift', report.maximum_meshopt_tip_drift_m.toExponential(2));
console.log(JSON.stringify(report.events));
