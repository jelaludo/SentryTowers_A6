// Validate the scratch output from blender-workshop/scripts/check_workflow.py.
// Writes only a derived Meshopt copy and report beside that scratch GLB.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {meshopt, getBounds} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';
import {AnimationMixer, Vector3, Box3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

assert(process.argv[2], 'Usage: node validate-blender-workflow.mjs /tmp/check/workflow-probe.glb');
const file = path.resolve(process.argv[2]), out = path.dirname(file);
const bytes = await fs.readFile(file);
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
async function validate(data) {
  const result = await validator.validateBytes(new Uint8Array(data));
  assert.equal(result.issues.numErrors, 0, JSON.stringify(result.issues));
  assert.equal(result.issues.numWarnings, 0, JSON.stringify(result.issues));
}
function inspect(doc) {
  const root = doc.getRoot(), nodes = root.listNodes();
  const primitives = nodes.flatMap(n => n.getMesh()?.listPrimitives() || []);
  return {
    nodes: nodes.map(n => n.getName()).sort(),
    triangles: primitives.reduce((sum, p) => sum + p.getIndices().getCount() / 3, 0),
    draw_calls: primitives.length,
    bounds: getBounds(root.listScenes()[0]),
    clips: root.listAnimations().map(a => ({name: a.getName(), duration_seconds:
      Math.max(...a.listSamplers().map(s => Math.max(...s.getInput().getArray())))})),
    joints: root.listSkins().map(s => s.listJoints().map(j => j.getName())),
    textures: root.listTextures().length,
    socket: nodes.find(n => n.getName() === 'SOCKET_TOOL').getWorldTranslation(),
    animated_nodes: [...new Set(root.listAnimations().flatMap(a =>
      a.listChannels().map(c => c.getTargetNode().getName())))].sort(),
  };
}
async function sampleRuntime(data) {
  const copy = await io.readBinary(new Uint8Array(data));
  // Geometry-only runtime check: Node has no DOM image decoder. Texture roles and
  // visual material checks are separate Blender/MCP checks, not claimed here.
  for (const m of copy.getRoot().listMaterials()) {
    m.setBaseColorTexture(null).setNormalTexture(null).setOcclusionTexture(null)
      .setMetallicRoughnessTexture(null).setEmissiveTexture(null);
  }
  for (const texture of copy.getRoot().listTextures()) texture.dispose();
  for (const ext of copy.getRoot().listExtensionsUsed()) {
    if (ext.extensionName === 'EXT_meshopt_compression') ext.dispose();
  }
  const payload = await io.writeBinary(copy);
  const gltf = await new GLTFLoader().parseAsync(payload.buffer.slice(
    payload.byteOffset, payload.byteOffset + payload.byteLength), '');
  const mixer = new AnimationMixer(gltf.scene);
  assert.equal(gltf.animations[0].duration, 2);
  mixer.clipAction(gltf.animations[0]).play();
  const samples = [];
  for (const time of [0, 1, 1.999]) {
    mixer.setTime(time);
    gltf.scene.updateMatrixWorld(true);
    const points = [];
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      object.skeleton?.update();
      for (let i = 0; i < object.geometry.attributes.position.count; i++) {
        points.push(object.getVertexPosition(i, new Vector3()).applyMatrix4(object.matrixWorld));
      }
    });
    samples.push(points);
  }
  return samples;
}
await validate(bytes);
const doc = await io.readBinary(new Uint8Array(bytes)), plain = inspect(doc);
assert.equal(plain.triangles, 24);
assert.equal(plain.draw_calls, 1);
assert.deepEqual(plain.clips, [{name: 'Probe_Cycle', duration_seconds: 2}]);
assert.equal(plain.textures, 2);
assert(Math.abs(plain.socket[1] - 2) < 1e-6 && Math.abs(plain.socket[2] - .35) < 1e-6);
assert.deepEqual(plain.joints, [['BASE_JOINT', 'TIP_JOINT']]);
assert(!plain.animated_nodes.includes('ENGINE_YAW'));
await doc.transform(meshopt({encoder: MeshoptEncoder, level: 'medium'}));
const packed = await io.writeBinary(doc), decoded = await io.readBinary(packed);
const derived = inspect(decoded);
for (const key of ['nodes', 'triangles', 'draw_calls', 'clips', 'joints', 'textures', 'animated_nodes']) {
  assert.deepEqual(derived[key], plain[key], key);
}
// Quantization can move a skin's raw vertices and compensate in inverse binds.
// Compare actual deformed world vertices, not unskinned accessor bounds.
const [originalSamples, derivedSamples] = await Promise.all([sampleRuntime(bytes), sampleRuntime(packed)]);
let maxVertexError = 0;
originalSamples.forEach((points, index) => {
  const other = derivedSamples[index];
  assert.equal(points.length, other.length);
  for (const [a, b] of [[points, other], [other, points]]) for (const point of a) {
    maxVertexError = Math.max(maxVertexError, Math.min(...b.map(p => p.distanceTo(point))));
  }
});
assert(maxVertexError < .001, maxVertexError);
const restBounds = new Box3().setFromPoints(originalSamples[0]);
plain.bounds = {min: restBounds.min.toArray(), max: restBounds.max.toArray()};
plain.socket.forEach((v, i) => assert(Math.abs(v - derived.socket[i]) < 1e-6));
// Validate the actual decoded payload, rather than the compressed JSON alone.
for (const ext of decoded.getRoot().listExtensionsUsed()) {
  if (ext.extensionName === 'EXT_meshopt_compression') ext.dispose();
}
await validate(await io.writeBinary(decoded));
const report = {plain, plain_bytes: bytes.length, derived_meshopt_bytes: packed.length,
  plain_errors: 0, plain_warnings: 0, decoded_errors: 0, decoded_warnings: 0,
  runtime_sample_times_seconds: [0, 1, 1.999], max_compressed_vertex_error_m: maxVertexError,
  scope: 'Scratch probe only; glTF Transform Meshopt, not consuming-game gltfpack release validation',
  passed: true};
await fs.writeFile(path.join(out, 'workflow-probe.derived-meshopt.glb'), packed, {flag: 'wx'});
await fs.writeFile(path.join(out, 'decode-report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
