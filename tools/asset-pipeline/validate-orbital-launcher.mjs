import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dequantize} from '@gltf-transform/functions';
import validator from 'gltf-validator';
import {definitions} from './orbital-launcher-shape.mjs';
import {launchState,applyLaunch,railPose,extensionPose,DURATION,passagePulse} from '../../assets/orbital-launcher/runtime.js';
const out=new URL('../../assets/orbital-launcher/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),reports=[],models={},baselines={};
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
function visibleBounds(root){const b=new T.Box3();root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh&&o.getWorldScale(new T.Vector3()).lengthSq()>1e-10)b.union(new T.Box3().setFromObject(o,true));});return b;}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(manifest.plain_glb_source_of_truth,true);assert.deepEqual(manifest.supported_damage_levels,[0]);
for(const e of manifest.assets){
 let plainBounds;
 for(const compressed of [false,true]){
  const file=compressed?e.meshopt_file:e.file,bytes=await fs.readFile(new URL(file,out));
  assert.equal(bytes.length,compressed?e.meshopt_bytes:e.bytes);assert.equal(sha(bytes),compressed?e.meshopt_sha256:e.sha256);
  let validationBytes=bytes;
  if(compressed){const doc=await io.readBinary(bytes);doc.getRoot().listExtensionsUsed().filter(x=>x.extensionName===EXTMeshoptCompression.EXTENSION_NAME).forEach(x=>x.dispose());await doc.transform(dequantize());validationBytes=await io.writeBinary(doc);}
  const report=await validator.validateBytes(validationBytes);assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const root=gltf.scene;root.updateMatrixWorld(true);assert.equal(gltf.animations.length,0,'All engine-driven pivots remain unbaked');
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.equal(json.images?.length||0,0);assert(json.buffers.every(b=>!b.uri));
  let triangles=0,draws=0;const names=[],hierarchy={};
  root.traverse(o=>{
   if(o!==root){assert(o.name,'Every model node has a name');names.push(o.name);}
   if(!o.isMesh)return;draws++;const g=o.geometry,p=g.attributes.position,ix=g.index,count=ix?ix.count:p.count;triangles+=count/3;
   const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let j=0;j<count;j+=3){a.fromBufferAttribute(p,ix?ix.getX(j):j);b.fromBufferAttribute(p,ix?ix.getX(j+1):j+1);c.fromBufferAttribute(p,ix?ix.getX(j+2):j+2);assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-15,file+' degenerate triangle');}
  });
  assert.equal(new Set(names).size,names.length,'Unique nodes');assert(names.every(n=>!n.includes('.')),'Dot-free nodes');assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);
  for(const name of e.required_nodes){const o=root.getObjectByName(name);assert(o,name);hierarchy[name]={parent:o.parent.name,position:o.getWorldPosition(new T.Vector3()).toArray(),quaternion:o.quaternion.toArray()};}
  const base=baselines[e.family];if(!base)baselines[e.family]=hierarchy;else for(const name of e.required_nodes){assert(base[name],name);assert.equal(hierarchy[name].parent,base[name].parent);assert(new T.Vector3(...hierarchy[name].position).distanceTo(new T.Vector3(...base[name].position))<.003,name+' position parity');assert(new T.Quaternion(...hierarchy[name].quaternion).angleTo(new T.Quaternion(...base[name].quaternion))<.003,name+' rotation parity');}
  for(const s of e.sockets){const o=root.getObjectByName(s.node);assert(o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<.003);assert(new T.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...s.normal))<.003);}
  const bounds=visibleBounds(root);assert(Math.abs(bounds.min.y)<.003,file+' grounded');
  if(!compressed){plainBounds=bounds;models[e.id]=root;assert(bounds.min.distanceTo(new T.Vector3(...e.bounds.min))<.003);assert(bounds.max.distanceTo(new T.Vector3(...e.bounds.max))<.003);}
  else{assert(bounds.min.distanceTo(plainBounds.min)<.008);assert(bounds.max.distanceTo(plainBounds.max)<.008);}
  if(e.lod){const budget=manifest.budgets['lod'+e.lod];assert(triangles<=budget.triangles);if(budget.draw_calls)assert(draws<=budget.draw_calls);if(budget.bytes)assert(bytes.length<=(compressed?e.bytes:budget.bytes));}
  if(e.lod<2&&e.family==='launcher'){
   const gates=root.getObjectByName('PASSAGE_GATES');assert(gates?.isMesh);const uv=gates.geometry.attributes.uv;assert(uv,'Export retains passage texture coordinates');
   const stations=new Set(Array.from({length:uv.count},(_,i)=>Math.floor(uv.getX(i)*16)));assert.equal(stations.size,16);
   for(let i=0;i<16;i++){
    const t=8+4*Math.sqrt(i/15);applyLaunch(T,root,null,t,e.lod);
    const pixels=gates.material.emissiveMap.image.data;assert.equal(pixels[i*4],255,'Gate peaks as payload passes');
    for(let j=i+1;j<16;j++)assert.equal(pixels[j*4],0,'Later gate stays white');
    assert.equal(passagePulse(t+.5,i),0,'Gate fades after passage');
   }
   applyLaunch(T,root,null,0,e.lod);assert(gates.material.emissiveMap.image.data.every((v,i)=>i%4===3||v===0),'Reset clears pulses');
  }
  if(e.lod<2&&e.family==='satellite'){
   const g=root.getObjectByName('SATELLITE_BUS').geometry,p=g.attributes.position,ix=g.index;let endFaces=0;
   for(let j=0;j<(ix?.count||p.count);j+=3)if([0,1,2].every(k=>Math.abs(p.getZ(ix?ix.getX(j+k):j+k)-.975)<.001))endFaces++;
   assert.equal(endFaces,6,'Single hexagonal collar face, no overlapping inner-body cap');
  }
  reports.push({file,decoded:compressed,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:0,gltf_warnings:0});console.log('PASS',file,triangles,'triangles',draws,'draws');
 }
}
for(const family of Object.keys(definitions)){
 const bounds=[0,1,2].map(lod=>visibleBounds(models[family+'_d0_lod'+lod]));
 for(const b of bounds.slice(1)){assert(b.min.distanceTo(bounds[0].min)<.005,family+' bounds min parity');// Detailed recovery-cap bevel removes 22.4 mm at the highest corner; roots and sockets retain 3 mm parity.
 assert(b.max.distanceTo(bounds[0].max)<(family==='launcher'?.025:.005),family+' bounds max parity');}
}
for(const lod of [0,1,2]){
 const launcher=models['launcher_d0_lod'+lod],satellite=models['satellite_d0_lod'+lod],sled=launcher.getObjectByName('LAUNCH_SLED'),start=sled.position.clone();
 for(let t=0;t<=DURATION;t+=.1){
  const state=applyLaunch(T,launcher,satellite,t,lod);launcher.updateMatrixWorld(true);satellite.updateMatrixWorld(true);
  if(lod===2){assert(sled.position.equals(start));assert(Math.abs(satellite.getObjectByName('PETAL_1_HINGE').rotation.x-Math.PI/2)<1e-6);continue;}
  if(t<12){const dock=launcher.getObjectByName('SOCKET_PAYLOAD').getWorldPosition(new T.Vector3());assert(dock.distanceTo(satellite.position)<1e-6,'Payload stays attached through acceleration');assert.equal(state.deploy,0);}
  if(t<17)assert.equal(state.deploy,0,'Do not unfold inside rail');
  assert(sled.position.distanceTo(new T.Vector3(...state.sled.position))<1e-6);
  assert(state.charge>=0&&state.charge<=1);
  for(let i=1;i<=6;i++)assert(Math.abs(satellite.getObjectByName('PETAL_'+i+'_HINGE').rotation.x-(1-state.deploy)*Math.PI/2)<1e-6);
  const plume=satellite.getObjectByName('INSERTION_PLUME');assert.equal(plume.scale.x,state.burn?1:0);
 }
 applyLaunch(T,launcher,satellite,0,lod);assert(sled.position.distanceTo(start)<1e-6,'Reset returns sled to loading datum');
 const packed=new T.Box3().setFromObject(satellite,true);assert(packed.min.x> -1.19&&packed.max.x<1.19,'Packed payload clears closed clamps and rail channel');
}
for(const t of [4,8,12,14,16,18,26,29]){const a=launchState(t-1e-6),b=launchState(t+1e-6);assert(new T.Vector3(...a.sled.position).distanceTo(new T.Vector3(...b.sled.position))<.001,'Continuous sled motion at '+t);assert(new T.Vector3(...a.payload.position).distanceTo(new T.Vector3(...b.payload.position))<.001,'Continuous payload release');}
assert.equal(launchState(-1).time,0);assert.equal(launchState(100).time,30);assert.throws(()=>launchState(NaN));assert.deepEqual(railPose(1),extensionPose(0));
await fs.writeFile(new URL('validation.json',out),JSON.stringify({status:'passed',checks:['plain and decoded Meshopt glTF Validator','hashes, bytes, triangles and draws','bounds, ground, names and socket parity','no degenerate triangles','game and distance budgets','payload docking and clamp clearance','continuous launch/recovery/reset choreography','deployment only after rail exit','static LOD2 behavior','single payload collar face','decoded passage UVs, sequential pulses, decay and reset'],pending:['sustained browser playback and mobile','game Three.js r160 and release gltfpack','game-camera thresholds and phone measurements','physical launch/orbit simulation is out of scope'],reports},null,2)+'\n');
console.log('PASS orbital launcher exports, launch path, payload attachment, deployment and sled recovery.');
