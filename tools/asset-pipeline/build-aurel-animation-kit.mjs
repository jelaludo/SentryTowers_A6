import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {dedup, prune} from '@gltf-transform/functions';

const base = new URL('../../assets/robot-assembly/', import.meta.url);
const out = new URL('animation-kit/', base), io = new NodeIO(), loader = new GLTFLoader();
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const parentCommit = 'dffaad650cd7fb4ea7ec5ba51caf2d500ff36caa';
const original = JSON.parse(await fs.readFile(new URL('manifest.json', base)));
const layerManifest = JSON.parse(await fs.readFile(new URL('muscles/manifest.json', base)));
const sourceFiles = {}, assets = [];
const read = async file => {
  const bytes = await fs.readFile(new URL(file, base));
  sourceFiles[file] = sha(bytes);
  return (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
};
globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then(x => { this.result = x; this.onloadend?.(); }); } };
await fs.mkdir(new URL('models/', out), {recursive: true});

const semanticTargets = {
  actor_placement: 'AUREL_CHARACTER', pelvis: 'PELVIS_FRAME', spine_chest: 'RIBCAGE_SPINE',
  head_yaw: 'HEAD_YAW', head_pitch: 'HEAD_PITCH',
  left_upper_arm: 'ARM_L_SHOULDER', left_forearm: 'ARM_L_ELBOW', left_wrist: 'ARM_L_WRIST',
  right_upper_arm: 'ARM_R_SHOULDER', right_forearm: 'ARM_R_ELBOW', right_wrist: 'ARM_R_WRIST',
  left_thigh: 'LEG_L_HIP', left_shin: 'LEG_L_KNEE', left_ankle: 'LEG_L_ANKLE',
  right_thigh: 'LEG_R_HIP', right_shin: 'LEG_R_KNEE', right_ankle: 'LEG_R_ANKLE'
};
for (const head of ['frame', 'sensor']) for (const lod of [1, 0]) {
  const entry = original.assets.find(e => e.module === (head === 'frame' ? 'assembly' : 'assembly_sensor') && e.lod === lod);
  const layerEntry = layerManifest.assets.find(e => e.lod === lod);
  const sourceHost = await read(entry.file), sourceLayer = await read('muscles/' + layerEntry.file);
  const scene = new T.Scene(), root = new T.Group(), host = new T.Group(), layer = new T.Group();
  root.name = 'AUREL_CHARACTER'; host.name = 'AUREL_HOST'; layer.name = 'AUREL_MUSCLES';
  root.userData = {family: 'aurel03-animation-kit', derived: true, lod, damage_level: 0, head, units: 'metres', up: '+Y', forward: '+Z', optional_muscles: true};
  root.add(host, layer); scene.add(root);
  // glTF skins stay at scene root. The shared placement node drives their bones.
  for (const [source, group, tag] of [[sourceHost, host, 'skeleton'], [sourceLayer, layer, 'muscles']]) {
    for (const child of [...source.children]) {
      if (child.isMesh) { child.userData.aurel_layer = tag; scene.add(child); }
      else group.add(child);
    }
  }
  const raw = await new GLTFExporter().parseAsync(scene, {binary: true, trs: true});
  const doc = await io.readBinary(new Uint8Array(raw)); await doc.transform(dedup(), prune({keepLeaves: true, keepAttributes: true}));
  const bytes = await io.writeBinary(doc), file = `models/aurel03_${head}_lod${lod}.glb`;
  await fs.writeFile(new URL(file, out), bytes);
  const decoded = (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
  decoded.updateMatrixWorld(true); decoded.traverse(n => { if (n.isSkinnedMesh) n.skeleton.update(); });
  let triangles = 0, draws = 0; const nodes = [], sockets = [];
  decoded.traverse(n => {
    if (n.name) nodes.push(n.name);
    if (n.isMesh) { triangles += (n.geometry.index?.count || n.geometry.attributes.position.count) / 3; draws++; }
    if (n.name.startsWith('SOCKET_')) sockets.push({node: n.name, parent: n.parent.name, position_m: n.getWorldPosition(new T.Vector3()).toArray()});
  });
  const box = new T.Box3().setFromObject(decoded, true);
  assets.push({file, head, lod, damage_level: 0, derived: true, static: false, bytes: bytes.length, sha256: sha(bytes), triangles, draw_calls: draws, plot_m: [1.4, 1], bounds: {min: box.min.toArray(), max: box.max.toArray(), dimensions_m: box.getSize(new T.Vector3()).toArray()}, required_nodes: nodes.sort(), sockets, clips: [], credit: 'Models by jelaludo / Model Workshop', sources: [entry.file, 'muscles/' + layerEntry.file]});
  if (head === 'frame' && lod === 1) {
    const frames = [];
    decoded.getObjectByName('AUREL_HOST').traverse(n => {
      if (!n.name || n.isMesh) return;
      frames.push({node: n.name, parent: n.parent?.name || null, is_bone: !!n.isBone, position_m: n.position.toArray(), quaternion_xyzw: n.quaternion.toArray(), scale: n.scale.toArray(), world_matrix_column_major: n.matrixWorld.toArray()});
    });
    await fs.writeFile(new URL('rig-map.json', out), JSON.stringify({schema: 'aurel03.retarget-target/v1', source_commit: parentCommit, note: 'Target-side semantic mapping, NOT an automatic SOMA retargeter. Use source rest frames and this authored rest pose; never copy raw SOMA rotations by matching names.', units: 'metres', up: '+Y', forward: '+Z', actor_left: '+X', neutral_height_m: 1.8, semantic_targets: semanticTargets, spine_note: 'One thoracic driver; consolidate source spine segments. No independent clavicle pivots.', root_motion_note: 'Choose one travel owner. AUREL_CHARACTER moves skeleton and muscles together. PELVIS_FRAME is relative to a PART_PELVIS mount at y=0.945 m; its local translation is an offset, not absolute hip height.', pose_note: 'Authored arms-down rest pose; retain mount transforms and mirrored hand/foot frames. Not a standard T-pose.', nodes: frames}, null, 2) + '\n');
  }
  console.log(JSON.stringify({file, triangles, draws, bytes: bytes.length}));
}
await fs.writeFile(new URL('manifest.json', out), JSON.stringify({schema: 'aurel03.animation-kit/v1', label: 'AUREL-03 animation handoff', source_commit: parentCommit, source_sha256: sourceFiles, plain_glb_source_of_truth: true, derived_package: true, runtime: 'character.js', rig_map: 'rig-map.json', inference_tested: false, retargeting: 'Required for Kimodo/MotionBricks source motion; this package provides the target character and muscle follow adapter, not pretrained-model compatibility.', assets}, null, 2) + '\n');
