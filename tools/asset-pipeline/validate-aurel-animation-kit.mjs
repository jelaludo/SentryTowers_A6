import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import {createRig} from '../../assets/robot-assembly/runtime.js';
import {createMuscleRig} from '../../assets/robot-assembly/muscles/runtime.js';
import {MUSCLES} from '../../assets/robot-assembly/muscles/specs.js';
import {createCharacter} from '../../assets/robot-assembly/animation-kit/character.js';

const base = new URL('../../assets/robot-assembly/', import.meta.url), out = new URL('animation-kit/', base);
const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', out)));
const rigMap = JSON.parse(await fs.readFile(new URL('rig-map.json', out)));
const loader = new GLTFLoader(), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const load = async url => { const b = await fs.readFile(url); return (await loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')).scene; };
const report = {status: 'passed', files: [], surface_samples: 0, attachment_checks: 0, external_pose_preserved: true};
const close = (a, b) => assert(a.distanceTo(b) < 3e-5, `Surface/attachment drift ${a.distanceTo(b)}`);
for (const [name, hash] of Object.entries(manifest.source_sha256)) {
  const current = await fs.readFile(new URL(name, base));
  assert.equal(sha(current), hash);
  assert.equal(sha(execFileSync('git', ['show', `${manifest.source_commit}:assets/robot-assembly/${name}`], {maxBuffer: 32e6})), hash);
}
for (const entry of manifest.assets) {
  const bytes = await fs.readFile(new URL(entry.file, out));
  assert.equal(sha(bytes), entry.sha256); assert.equal(bytes.length, entry.bytes);
  const validation = await validator.validateBytes(bytes);
  assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues));
  assert.equal(validation.issues.numWarnings, 0, JSON.stringify(validation.issues));
  const combined = await load(new URL(entry.file, out)), character = createCharacter(combined);
  const host = await load(new URL(entry.sources[0], base)), layer = await load(new URL(entry.sources[1], base));
  const sourceRig = createRig(host), sourceMuscles = createMuscleRig(layer, host);
  let tris = 0, draws = 0; const names = [];
  combined.traverse(n => {
    if (n.name) { names.push(n.name); assert(!n.name.includes('.')); }
    if (n.isMesh) { assert.equal(n.parent, combined); assert(n.isSkinnedMesh); tris += (n.geometry.index?.count || n.geometry.attributes.position.count) / 3; draws++; }
  });
  assert.equal(names.length, new Set(names).size); assert.equal(tris, entry.triangles); assert.equal(draws, entry.draw_calls);
  assert.deepEqual(names.sort(), entry.required_nodes); for (const name of Object.values(rigMap.semantic_targets)) assert(combined.getObjectByName(name));
  for (const time of [0, 1.5, 3, 6, 9, 11.9]) {
    const options = {articulation: 1, time}; sourceRig.pose(options); sourceMuscles.update(); character.studyPose(options);
    for (const source of [host, layer]) source.traverse(mesh => {
      if (!mesh.isMesh) return; const other = combined.getObjectByName(mesh.name); assert(other?.isMesh);
      for (let i = 0; i < mesh.geometry.attributes.position.count; i += 43) {
        close(mesh.getVertexPosition(i, new T.Vector3()).applyMatrix4(mesh.matrixWorld), other.getVertexPosition(i, new T.Vector3()).applyMatrix4(other.matrixWorld));
        report.surface_samples++;
      }
    });
  }
  // Simulate external retargeting: the adapter must never restore our host pose.
  character.nodes.ARM_L_ELBOW.rotation.x = -.82;
  character.nodes.PELVIS_FRAME.position.y += .04;
  character.root.position.set(2, .1, -1); character.root.rotation.y = .4;
  const before = character.nodes.ARM_L_ELBOW.quaternion.toArray(); character.updateAfterAnimation();
  assert.deepEqual(character.nodes.ARM_L_ELBOW.quaternion.toArray(), before);
  for (const spec of MUSCLES) for (const [end, anchor] of [['ORIGIN', spec.origin], ['INSERTION', spec.insertion]]) {
    close(new T.Vector3(...anchor.p).applyMatrix4(character.host.getObjectByName(anchor.node).matrixWorld), character.layer.getObjectByName(`SOCKET_${spec.id}_${end}`).getWorldPosition(new T.Vector3())); report.attachment_checks++;
  }
  for (const mode of ['skeleton', 'muscles', 'both']) {
    character.setLayers(mode);
    combined.traverse(n => { if (n.isMesh) assert.equal(n.visible, mode === 'both' || mode === n.userData.aurel_layer); });
  }
  report.files.push({file: entry.file, triangles: tris, draw_calls: draws, bytes: bytes.length, gltf_errors: 0, gltf_warnings: 0});
}
report.checks = ['Source GLBs match pinned source commit', 'Four combined GLBs validate with no errors/warnings', 'Scene-root skins and unique native names retained', 'Posed surfaces match the separate source models', 'External body pose retained with muscle attachments following root motion', 'Layer visibility is reversible'];
await fs.writeFile(new URL('validation-report.json', out), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({status: report.status, files: report.files.length, surface_samples: report.surface_samples, attachment_checks: report.attachment_checks}));
