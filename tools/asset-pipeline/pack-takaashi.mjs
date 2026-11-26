// Finalise TAKAASHI exports (TAKAASHI_FAMILY=takaashi01|takaashi02, default takaashi01): strip socket/engine keys, resample, then record hashes, bounds,
// sockets and clip metadata; write optional derived Meshopt copies. Plain GLBs stay authoritative.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS, EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup, reorder, resample} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const FAMILY = process.env.TAKAASHI_FAMILY || 'takaashi01', NUM = FAMILY.slice(-2), LABEL = 'TAKAASHI-' + NUM, PREFIX = 'TK' + NUM;
const root = new URL('../../', import.meta.url), out = new URL('assets/' + FAMILY + '/', root);
const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', out)));
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder});
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const r3 = a => a.map(x => Math.round(x * 1e4) / 1e4);
for (const e of manifest.assets) {
  e.review_status = 'contract_candidate: repository validation and measured budgets pass; game-camera, LOD threshold and reference-phone acceptance pending';
  const path = new URL(e.file, out), doc = await io.read(path.pathname);
  for (const scene of doc.getRoot().listScenes()) scene.setName('TAKAASHI' + NUM + '_SPIDER_CRAB');
  doc.getRoot().getAsset().copyright = LABEL + ' model and animation by Jelaludo. Reuse requires attribution: Models by jelaludo - https://jelaludo.github.io/SentryTowers_A6/';
  // Sockets, the unanimated MOTION root and the engine-aimed sensor yaw carry no baked keys.
  for (const a of doc.getRoot().listAnimations()) for (const c of a.listChannels()) {
    const n = c.getTargetNode().getName(); if (n.startsWith('SOCKET_') || n === 'SENSOR_YAW' || n === 'MOTION') c.dispose();
  }
  for (const a of doc.getRoot().listAnimations()) for (const s of a.listSamplers()) if (!a.listChannels().some(c => c.getSampler() === s)) s.dispose();
  await doc.transform(resample({tolerance: 1e-5}), dedup());
  await io.write(path.pathname, doc);
  const bytes = await fs.readFile(path); e.bytes = bytes.length; e.sha256 = sha(bytes);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(gltf.scene, true), size = box.getSize(new T.Vector3());
  e.bounds = {min: r3(box.min.toArray()), max: r3(box.max.toArray()), dimensions_m: r3(size.toArray())};
  e.plot_m = [Math.ceil(size.x * 20) / 20, Math.ceil(size.z * 20) / 20];
  e.required_nodes = doc.getRoot().listNodes().map(n => n.getName()).filter(Boolean).sort();
  e.sockets = []; gltf.scene.traverse(o => { if (o.name.startsWith('SOCKET_')) e.sockets.push({node: o.name, parent: o.parent.name, position_m: r3(o.getWorldPosition(new T.Vector3()).toArray())}); });
  const names = gltf.animations.map(c => c.name);
  if (e.lod < 2 && names.length !== manifest.assets[0].clips.length) throw new Error('Incorrect clips ' + names);
  if (e.lod < 2) for (const c of e.clips) { const a = gltf.animations.find(x => x.name === c.name); if (!a || Math.abs(a.duration - c.duration_s) > 1e-5) throw new Error('clip duration ' + c.name); }
  await doc.transform(reorder({encoder: MeshoptEncoder, target: 'size'}));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method: EXTMeshoptCompression.EncoderMethod.FILTER});
  const packed = await io.writeBinary(doc); await fs.mkdir(new URL('derived/meshopt/', out), {recursive: true});
  e.meshopt_file = 'derived/meshopt/' + e.file.replace('.glb', '.meshopt.glb'); e.meshopt_derived = true; e.meshopt_bytes = packed.length; e.meshopt_sha256 = sha(packed);
  await fs.writeFile(new URL(e.meshopt_file, out), packed);
  console.log(e.file, e.triangles, 'tris', e.draw_calls, 'draws', e.bytes, 'bytes; meshopt', e.meshopt_bytes, names.length, 'clips', e.bounds.dimensions_m);
}
manifest.budgets = {category: 'Unit (contract: <= 25k triangles with articulated pivots, one tier). Local note: a static distance tier is supplied for map/loading views.', game_triangles: 25000, distance_triangles: 3000, distance_draw_calls: 1, distance_bytes: 250000};
manifest.animation.placement_node = 'instance wrapper around the complete glTF scene'; manifest.animation.skeleton_root = 'ROOT';
manifest.integration = {
  placement: 'Place the whole glTF scene in an instance group; clone with SkeletonUtils.clone. ROOT, ' + PREFIX + '_RIG and MOTION are unanimated lookups.' + (NUM === '02' ? ' TAKAASHI-01 and -02 share joint names, rest pose, sockets and clips, so one controller drives either.' : ''),
  locomotion: 'Gait clips have no baked root motion. Each frame translate the instance by clips.velocity_mps (glTF axes, metres per second) and rotate it about +Y by clips.yaw_rate_rad_s, both multiplied by playback rate. Tips then stay planted.',
  contacts: 'SOCKET_TIP_L1..R4 mark dactyl points 2 mm above the authored floor. Stance follows touchdown_phase/duty_factor for gaits and swing_windows_s elsewhere. The game supplies terrain adaptation.',
  chelae: 'SOCKET_GRIP_CL/CR sit between the fingers for held props; parent props there. DACTYL_CL/CR rotate about the palm hinge; Claw_Snap events_s give the closing instants.',
  sensor: 'SENSOR_YAW is excluded from clips and may be aimed by the engine; SOCKET_SENSOR follows it.',
  mouth: 'SOCKET_MOUTH marks the maxilliped opening used by Feed_Cycle.',
  bounds: 'Use validation-report.json clip envelopes for animation-aware culling; Threat_Display rises and lifts the first walking pair.',
  units: 'Authored kinematic gait on a flat floor; not a physics or ground-reaction simulation.'
};
const refPath = '/Users/jela/Downloads/Mechanical Spider Crab in Studio Light.png';
manifest.provenance = {
  geometry: 'Original procedural model by Jelaludo; no reference geometry, textures or pixels copied or embedded.',
  concept_reference: {file: 'Mechanical Spider Crab in Studio Light.png', sha256: sha(await fs.readFile(refPath)), pixels: [1672, 941], usage: NUM === '02'
    ? 'User-supplied concept art informing the silhouette, spined lattice carapace and serrated chelae of the shared TAKAASHI body plan. Not redistributed.'
    : 'User-supplied concept art informing silhouette, openwork riveted frames, twisted cable cores, spined lattice carapace, blue optics and serrated chelae. Not redistributed.'},
  ...(NUM === '02' ? {variant_brief: 'User notes for this variant: dark open carbon exo-frames outside taut braided actuators (no ballooning muscles), braided sleeves ending in steel ferrules, no floating hoops, minimal #28a8ff optics, rest-mesh jaws 10-24 degrees open, exact 30 fps frame counts, clay and collision checks before the final export. Written as original code in this repository; no geometry or code taken from other projects.'} : {}),
  motion: 'Original procedural authoring (tools/blender/takaashi_motion.py). Gait topology follows published decapod observations: alternating tetrapod lateral walking with leading legs flexing and trailing legs extending, wave-gait forward walking and chela-to-mouth feeding. No captured or third-party keys.'
};
const src = await fs.readFile(new URL('source/blender/a6-' + FAMILY + '.blend', root));
manifest.source = {file: '../../source/blender/a6-' + FAMILY + '.blend', bytes: src.length, sha256: sha(src), role: 'Editable LOD0 authoring master with all nine NLA clips; plain GLBs are the runtime source of truth'};
await fs.writeFile(new URL('manifest.json', out), JSON.stringify(manifest, null, 2) + '\n');
