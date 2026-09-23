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
import {definitions} from './settlement-industry-shape.mjs';
import {demoState,applyDemo,aimMirror} from '../../assets/settlement-industry/runtime.js';
const out=new URL('../../assets/settlement-industry/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),reports=[],models={},baselines={};
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
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
  if(e.family==='cassette')for(const side of [-1,1])for(const z of [-.721,.721]){
   const ray=new T.Raycaster(new T.Vector3(side*2,.553,z),new T.Vector3(-side,0,0)),hits=ray.intersectObject(root,true);
   assert(hits.length>=2,file+' corner strip and underlying wall are present');
   assert(hits[1].distance-hits[0].distance>.015,file+' corner strip must stand clear of side wall after decoding');
  }
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.equal(json.images?.length||0,0);assert(json.buffers.every(b=>!b.uri));
  let triangles=0,draws=0;const names=[],hierarchy={};
  root.traverse(o=>{
   if(o!==root){assert(o.name,'Every model node has a name');names.push(o.name);}
   if(!o.isMesh)return;draws++;const g=o.geometry,p=g.attributes.position,ix=g.index,count=ix?ix.count:p.count;triangles+=count/3;
   const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let j=0;j<count;j+=3){a.fromBufferAttribute(p,ix?ix.getX(j):j);b.fromBufferAttribute(p,ix?ix.getX(j+1):j+1);c.fromBufferAttribute(p,ix?ix.getX(j+2):j+2);assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-15,file+' degenerate triangle');}
  });
  assert.equal(new Set(names).size,names.length,'Unique nodes');assert(names.every(n=>!n.includes('.')),'Dot-free nodes');assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);
  for(const name of e.required_nodes){const o=root.getObjectByName(name);assert(o,name);hierarchy[name]={parent:o.parent.name,position:o.getWorldPosition(new T.Vector3()).toArray(),quaternion:o.getWorldQuaternion(new T.Quaternion()).toArray()};}
  const base=baselines[e.family];if(!base)baselines[e.family]=hierarchy;else for(const name of e.required_nodes){assert(base[name],name);assert.equal(hierarchy[name].parent,base[name].parent);assert(new T.Vector3(...hierarchy[name].position).distanceTo(new T.Vector3(...base[name].position))<.003,name+' position parity');assert(new T.Quaternion(...hierarchy[name].quaternion).angleTo(new T.Quaternion(...base[name].quaternion))<.003,name+' rotation parity');}
  for(const s of e.sockets){const o=root.getObjectByName(s.node);assert(o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<.003);assert(new T.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...s.normal))<.003);}
  const bounds=new T.Box3().setFromObject(root,true);assert(Math.abs(bounds.min.y)<.003,file+' grounded');
  if(!compressed){plainBounds=bounds;models[e.id]=root;assert(bounds.min.distanceTo(new T.Vector3(...e.bounds.min))<.003);assert(bounds.max.distanceTo(new T.Vector3(...e.bounds.max))<.003);}
  else{assert(bounds.min.distanceTo(plainBounds.min)<.008);assert(bounds.max.distanceTo(plainBounds.max)<.008);}
  if(e.lod){const budget=manifest.budgets[definitions[e.family].category]['lod'+e.lod];assert(triangles<=budget.triangles);if(budget.draw_calls)assert(draws<=budget.draw_calls);if(budget.bytes)assert(bytes.length<=(compressed?e.bytes:budget.bytes));}
  reports.push({file,decoded:compressed,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:0,gltf_warnings:0});console.log('PASS',file,triangles,'triangles',draws,'draws');
 }
}
for(const family of Object.keys(definitions)){
 const bounds=[0,1,2].map(lod=>new T.Box3().setFromObject(models[family+'_d0_lod'+lod],true));
 for(const b of bounds.slice(1)){assert(b.min.distanceTo(bounds[0].min)<.005,family+' bounds min parity');assert(b.max.distanceTo(bounds[0].max)<.005,family+' bounds max parity');}
}
for(const lod of [0,1,2]){
 const drill=models['drill_d0_lod'+lod],hauler=models['hauler_d0_lod'+lod],cassette=models['cassette_d0_lod'+lod],mirror=models['mirror_d0_lod'+lod];
 const site=new T.Group();site.add(drill,hauler,cassette);drill.position.set(-7,0,0);hauler.position.set(-4.4,0,4.8);cassette.position.set(-4.4,.12,0);
 const original=hauler.getObjectByName('CARGO_SLIDE').position.clone();
 for(let t=0;t<=32;t+=.25){
  const state=applyDemo(T,{drill,hauler,cassette},t,lod);site.updateMatrixWorld(true);
  if(lod===2){assert(hauler.getObjectByName('CARGO_SLIDE').position.equals(original));continue;}
  const cargo=hauler.getObjectByName('SOCKET_CARGO').getWorldPosition(new T.Vector3());assert(cargo.distanceTo(cassette.getWorldPosition(new T.Vector3()))<1e-6,'Cassette remains on forks');
  assert(state.lift>=0&&state.lift<=1.72);if(t<15)assert.equal(state.slide,-4.8,'Raise before sliding into bed');if(t<21)assert.equal(state.travel,0,'Secure cargo before travel');
  if(t>=19){const bed=hauler.getObjectByName('SOCKET_BED').getWorldPosition(new T.Vector3());assert(bed.distanceTo(cargo)<1e-6,'Cargo dock centres coincide');}
 }
 if(lod<2){
  const sunlight=new T.Vector3(-.35,1,-.3).normalize(),receiver=new T.Vector3(5,3.24,6.60);
  for(const [x,z] of [[3,-4],[7,-4],[11,-4],[3,0],[7,0],[11,0],[11,4]]){
   mirror.position.set(x,0,z);aimMirror(T,mirror,sunlight,receiver);mirror.updateMatrixWorld(true);
   const pivot=mirror.getObjectByName('MIRROR_YAW').getWorldPosition(new T.Vector3()),normal=new T.Vector3(0,0,1).applyQuaternion(mirror.getObjectByName('MIRROR_PITCH').getWorldQuaternion(new T.Quaternion())),reflected=sunlight.clone().negate().reflect(normal),target=receiver.clone().sub(pivot).normalize();assert(reflected.distanceTo(target)<1e-6,'Reflected light points toward receiver');
   assert(new T.Box3().setFromObject(mirror).min.y>=-.003,'Tracking mirror clears ground');
  }
 }
}
assert.equal(demoState(-5).time,0);assert.equal(demoState(99).time,32);assert.throws(()=>demoState(NaN));
await fs.writeFile(new URL('validation.json',out),JSON.stringify({status:'passed',checks:['plain and decoded Meshopt glTF Validator','measured hashes/bytes/triangles/draws','ground/bounds/node hierarchy/socket parity','no degenerate triangles or external resources','LOD budgets','32-second cargo continuity and docking','mirror reflection direction and ground clearance','static distance controls','cassette corner strips clear side walls in plain and decoded tiers'],runtime_review_pending:['Three.js r160 game integration','release gltfpack','reference-phone FPS','physics and terrain'],reports},null,2)+'\n');
console.log('PASS all exports, cargo sequence, optical alignment, stable identifiers and static-tier behavior.');
