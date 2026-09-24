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
import {opticalPath} from './chip-manufacturing-shape.mjs';
import {applyWrite,writeState} from '../../assets/chip-manufacturing/runtime.js';
const out=new URL('../../assets/chip-manufacturing/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),reports=[],models={},baselines={};
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
  for(let t=0;t<=12;t+=.125){applyWrite(root,t,e.lod);if(e.lod===2)continue;root.updateMatrixWorld(true);const w=root.getObjectByName('WAFER_CHUCK').getWorldPosition(new T.Vector3()),f=root.getObjectByName('SOCKET_BEAM_FOCUS').getWorldPosition(new T.Vector3());assert(Math.hypot(w.x-f.x,w.z-f.z)<1.08,'Decoded beam stays over wafer');assert.equal(root.getObjectByName('LASER_PATH').visible,writeState(t).writing);}
  if(e.lod<2){applyWrite(root,3,e.lod,false);assert.equal(root.getObjectByName('LASER_PATH').visible,false);}applyWrite(root,0,e.lod);
  reports.push({file,decoded:compressed,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:0,gltf_warnings:0});console.log('PASS',file);
 }
}
for(const e of manifest.assets){const root=models[e.id];for(let t=0;t<=12;t+=.125){applyWrite(root,t,e.lod);if(e.lod===2)continue;const wafer=root.getObjectByName('WAFER_CHUCK').getWorldPosition(new T.Vector3());const focus=root.getObjectByName('SOCKET_BEAM_FOCUS').getWorldPosition(new T.Vector3());assert(Math.hypot(wafer.x-focus.x,wafer.z-focus.z)<1.08,'Beam remains on wafer');assert(Math.abs(focus.y-wafer.y-.015)<.001,'Focus on wafer surface');}applyWrite(root,0,e.lod);}
for(let i=1;i<=4;i++){const incoming=new T.Vector3(...opticalPath[i]).sub(new T.Vector3(...opticalPath[i-1])).normalize();const outgoing=new T.Vector3(...opticalPath[i+1]).sub(new T.Vector3(...opticalPath[i])).normalize();for(const root of Object.values(models)){const mirror=root.getObjectByName(`MIRROR_${i}_PIVOT`);const n=new T.Vector3(0,0,1).applyQuaternion(mirror.getWorldQuaternion(new T.Quaternion()));assert(incoming.clone().reflect(n).distanceTo(outgoing)<.001,'Specular mirror alignment');}}
const boxes=manifest.assets.map(e=>new T.Box3(new T.Vector3(...e.bounds.min),new T.Vector3(...e.bounds.max)));for(const b of boxes.slice(1)){assert(b.min.distanceTo(boxes[0].min)<.005);assert(b.max.distanceTo(boxes[0].max)<.005);}
for(let t=0;t<12;t+=.001){const a=writeState(t),b=writeState(t+.001);assert(Math.hypot(a.x-b.x,a.z-b.z)<.005,'Continuous scan including row changes and cycle wrap');}
await fs.writeFile(new URL('validation-report.json' ,out),JSON.stringify({status:'passed',reports},null,2)+'\n');
