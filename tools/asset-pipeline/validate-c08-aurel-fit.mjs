import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {createRig} from '../../assets/hand-lab/runtime.js';
import {JOINTS,BIPED_REST,HAND_SCALE,HAND_MOUNT_OFFSET,applyHandPose,sampleHands} from '../../assets/c08-worker/aurel/runtime.js';
const out=new URL('../../assets/c08-worker/aurel/',import.meta.url),original=JSON.parse(await fs.readFile(new URL('../manifest.json',out))),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),report={status:'pending',original_files_verified:0,body_pose_samples:0,hand_pose_samples:0,maximum_body_position_error_m:0,maximum_body_rotation_error_rad:0,maximum_hand_surface_error_m:0,maximum_mount_error_m:0,source_hashes:{}};
for(const input of manifest.source.inputs)assert.equal(hash(await fs.readFile(new URL(input.file,out))),input.sha256,'source changed '+input.file);
report.assembly_inputs_verified=manifest.source.inputs.length;
await MeshoptDecoder.ready;
async function load(url){const b=await fs.readFile(url);return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')}
const wp=(r,n)=>r.getObjectByName(n).getWorldPosition(new T.Vector3()),wq=(r,n)=>r.getObjectByName(n).getWorldQuaternion(new T.Quaternion()).normalize();
const hand=await load(new URL('../../hand-lab/biped/lod1/aurel01_biped_d0_lod1.glb',out));createRig(hand.scene).pose(BIPED_REST);let reference;hand.scene.traverse(o=>{if(o.isSkinnedMesh)reference=o});
let required;
for(const e of manifest.assets){
 const originalEntry=original.assets.find(x=>x.lod===e.lod);
 for(const k of ['file','meshopt_file']){const b=await fs.readFile(new URL('../'+originalEntry[k],out));assert.equal(hash(b),originalEntry[k==='file'?'sha256':'meshopt_sha256']);report.original_files_verified++;}
 const a=await load(new URL('../'+originalEntry.file,out)),b=await load(new URL(e.file,out));a.scene.updateMatrixWorld(true);b.scene.updateMatrixWorld(true);
 if(required)assert.deepEqual(e.required_nodes,required);else required=e.required_nodes;
 b.scene.traverse(o=>{assert(o.scale.x>0&&o.scale.y>0&&o.scale.z>0,'negative transform '+o.name)});
 for(const n of originalEntry.required_nodes){assert(b.scene.getObjectByName(n));assert(wp(a.scene,n).distanceTo(wp(b.scene,n))<1e-6,'original frame '+n);}
 if(e.static){assert(e.triangles<=3000&&e.draw_calls===1&&e.bytes<=250000);continue;}
 assert.equal(b.animations.length,a.animations.length);
 for(let i=0;i<a.animations.length;i++){const old=a.animations[i].toJSON(),next=b.animations[i].toJSON();delete old.uuid;delete next.uuid;assert.deepEqual(next,old,'body clip changed');}
 for(const side of ['L','R']){
  const root=b.scene.getObjectByName(`AUREL_${side}_AUREL_01_ROOT`),mesh=b.scene.getObjectByName(`AUREL_${side}_GEOMETRY`);assert(mesh.isSkinnedMesh);assert.equal(mesh.geometry.index.count/3,2708);mesh.skeleton.update();
  assert.equal(mesh.geometry.attributes.position.count,reference.geometry.attributes.position.count);
  const inverse=root.matrixWorld.clone().invert();
  for(let i=0;i<reference.geometry.attributes.position.count;i++){
   const expected=reference.getVertexPosition(i,new T.Vector3());if(side==='L')expected.x*=-1;
   const actual=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(inverse);
   report.maximum_hand_surface_error_m=Math.max(report.maximum_hand_surface_error_m,actual.distanceTo(expected));
  }
  const p=wp(b.scene,`AUREL_${side}_SOCKET_WRIST_ATTACH`),expected=new T.Vector3(...HAND_MOUNT_OFFSET).applyMatrix4(b.scene.getObjectByName('HAND_'+side).matrixWorld);report.maximum_mount_error_m=Math.max(report.maximum_mount_error_m,p.distanceTo(expected));
 }
 const ma=new T.AnimationMixer(a.scene),mb=new T.AnimationMixer(b.scene);
 for(const clip of a.animations){
  ma.stopAllAction();mb.stopAllAction();const ac=ma.clipAction(clip).setLoop(T.LoopOnce,1).play(),bc=mb.clipAction(b.animations.find(c=>c.name===clip.name)).setLoop(T.LoopOnce,1).play();ac.clampWhenFinished=bc.clampWhenFinished=true;
  for(let i=0;i<=60;i++){
   const t=clip.duration*i/60;ac.time=bc.time=Math.min(t,clip.duration-1e-7);ma.update(0);mb.update(0);applyHandPose(b.scene,sampleHands(clip.name,t));a.scene.updateMatrixWorld(true);b.scene.updateMatrixWorld(true);report.body_pose_samples++;
   for(const n of originalEntry.required_nodes){report.maximum_body_position_error_m=Math.max(report.maximum_body_position_error_m,wp(a.scene,n).distanceTo(wp(b.scene,n)));report.maximum_body_rotation_error_rad=Math.max(report.maximum_body_rotation_error_rad,wq(a.scene,n).angleTo(wq(b.scene,n)));}
  }
 }
 mb.stopAllAction();
 for(const mode of ['rest','open','fist','pinch','point']){applyHandPose(b.scene,sampleHands('Standby_Idle',0,mode));report.hand_pose_samples++;}
 for(const side of ['L','R'])for(const j of JOINTS)for(const v of [j.min,j.max]){
  const poses={L:{...BIPED_REST},R:{...BIPED_REST}};applyHandPose(b.scene,poses);
  const opposite=side==='L'?'R':'L',prior=wp(b.scene,`AUREL_${opposite}_SOCKET_INDEX_TIP`);poses[side][j.name]=v;applyHandPose(b.scene,poses);
  assert(prior.distanceTo(wp(b.scene,`AUREL_${opposite}_SOCKET_INDEX_TIP`))<1e-10,'shared skeleton state');
  const node=b.scene.getObjectByName(`AUREL_${side}_${j.name}`),expected=v*(side==='L'&&j.axis!=='x'?-1:1);assert(Math.abs(node.rotation[j.axis]-expected)<1e-7,'motor sign '+node.name);report.hand_pose_samples++;
 }
}
assert(report.maximum_body_position_error_m<1e-7);assert(report.maximum_body_rotation_error_rad<1e-7);assert(report.maximum_hand_surface_error_m<1e-6);assert(report.maximum_mount_error_m<1e-7);
const animated=await load(new URL(manifest.assets[1].file,out)),staticModel=await load(new URL(manifest.assets[2].file,out));animated.scene.updateMatrixWorld(true);staticModel.scene.updateMatrixWorld(true);
for(const n of required){assert(wp(animated.scene,n).distanceTo(wp(staticModel.scene,n))<1e-6,'static frame '+n);assert(wq(animated.scene,n).angleTo(wq(staticModel.scene,n))<1e-6,'static orientation '+n);}
for(const file of ['tools/asset-pipeline/build-c08-aurel.mjs','tools/blender/export_c08_body.py','assets/c08-worker/aurel/runtime.js','tools/asset-pipeline/validate-c08-aurel-fit.mjs'])report.source_hashes[file]=hash(await fs.readFile(new URL('../../../'+file,out)));
report.status='passed';report.scope='Original GLB fingerprints and byte-identical body animation data; unchanged body frames through all clips; exact economical hand surfaces including left reflection; positive transforms, independent motors, mount frames, static node parity and budgets. Not arbitrary whole-body collision or force validation.';
await fs.writeFile(new URL('fit-validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(report);
