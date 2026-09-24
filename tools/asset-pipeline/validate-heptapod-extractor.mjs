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

import {applyExtraction,legs} from '../../assets/heptapod-extractor/runtime.js';
const out=new URL('../../assets/heptapod-extractor/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),reports=[],models={},baselines={};
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
  for(const mode of ['mining','traffic','walk'])for(let t=0;t<=16;t+=.25){applyExtraction(root,t,e.lod,mode);root.updateMatrixWorld(true);if(e.lod===2)continue;for(const leg of legs){const foot=root.getObjectByName('LEG_'+leg.id+'_CONTACT').getWorldPosition(new T.Vector3());assert(foot.y>=-.003&&foot.y<=.651,'Foot remains above ground');assert(Math.abs(foot.x)>7.5,file+' '+mode+' '+t+' '+leg.id+' foot '+foot.toArray());}assert.equal(root.getObjectByName('LASER_BEAM').visible,mode==='mining'&&t>=2&&t<12);}
  applyExtraction(root,0,e.lod,'traffic');root.updateMatrixWorld(true);
  // Certify the entire straight traffic corridor, not just an empty centre point.
  root.traverse(o=>{if(!o.isMesh||['BEAM_CORE','ABLATION_PREVIEW','MINERAL_RECOVERY_PREVIEW'].includes(o.name))return;const p=o.geometry.attributes.position,ix=o.geometry.index,count=ix?ix.count:p.count;for(let i=0;i<count;i+=3){const tri=new T.Triangle();for(const [k,v] of [tri.a,tri.b,tri.c].entries()){v.fromBufferAttribute(p,ix?ix.getX(i+k):i+k);if(o.isSkinnedMesh)o.applyBoneTransform(ix?ix.getX(i+k):i+k,v);v.applyMatrix4(o.matrixWorld);}const corridor=new T.Box3(new T.Vector3(-4,.01,-30),new T.Vector3(4,6.5,30));assert(!corridor.intersectsTriangle(tri),'Traffic corridor intersects '+o.name);}});
  reports.push({file,decoded:compressed,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:0,gltf_warnings:0});console.log('PASS',file);
 }
}
const boxes=manifest.assets.map(e=>new T.Box3(new T.Vector3(...e.bounds.min),new T.Vector3(...e.bounds.max)));for(const b of boxes.slice(1)){assert(b.min.distanceTo(boxes[0].min)<.005);assert(b.max.distanceTo(boxes[0].max)<.005);}
const tankBytes=await fs.readFile(new URL('../../assets/hover-tank/mork_hover_tank_low_d0.glb',import.meta.url));const tank=(await loader.parseAsync(tankBytes.buffer.slice(tankBytes.byteOffset,tankBytes.byteOffset+tankBytes.byteLength),'')).scene;const tankBounds=new T.Box3().setFromObject(tank,true),tankSize=tankBounds.getSize(new T.Vector3());assert(tankBounds.min.x>-4&&tankBounds.max.x<4);assert(tankBounds.max.y<6.5);assert(Math.abs(tankSize.x-manifest.tank_clearance.reference_size_m[0])<.001);
await fs.writeFile(new URL('validation-report.json' ,out),JSON.stringify({status:'passed',reports},null,2)+'\n');
