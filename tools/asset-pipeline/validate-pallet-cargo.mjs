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
import {applyStride,transportPose,STATIONS,STANDARD} from '../../assets/pallet-cargo/runtime.js';
const out=new URL('../../assets/pallet-cargo/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const references=new Map(),models=new Map(),report={status:'passed',scope:'Plain and decoded Meshopt glTF, geometry, stable hierarchy/sockets, fork passages, mating interface and sampled kinematic rig. No load/force, self-collision, terrain or phone performance certification.',files:[],pose_samples:0,transport_samples:0,max_wheel_height_error_m:0,max_lock_alignment_error_m:0,checks:[]};
for(const e of manifest.assets)for(const packed of [false,true]){
 const file=packed?e.meshopt_file:e.file,bytes=await fs.readFile(new URL(file,out));assert.equal(bytes.length,packed?e.meshopt_bytes:e.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),packed?e.meshopt_sha256:e.sha256);
 let decoded=bytes;if(packed){const doc=await io.readBinary(bytes);for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();await doc.transform(dequantize());decoded=await io.writeBinary(doc);}
 const valid=await validator.validateBytes(decoded);assert.equal(valid.issues.numErrors,0,file+JSON.stringify(valid.issues));assert.equal(valid.issues.numWarnings,0,file+JSON.stringify(valid.issues));
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');assert.equal(gltf.animations.length,0);const root=gltf.scene.children[0];assert.equal(root.userData.static,e.static);root.updateMatrixWorld(true);
 const names=[],frames={},sockets={};let triangles=0,draws=0,materials=new Set();
 root.traverse(o=>{names.push(o.name);assert(/^[A-Z][A-Z0-9_]*$/.test(o.name),'invalid node '+o.name);if(!o.name.endsWith('_STATIC_SURFACE'))frames[o.name]={parent:o===root?null:o.parent.name,matrix:o.matrix.toArray()};if(o.name.startsWith('SOCKET_'))sockets[o.name]=o.getWorldPosition(new T.Vector3());if(o.isMesh){assert(!Array.isArray(o.material));materials.add(o.material);assert(!o.material.map);draws++;const g=o.geometry,p=g.attributes.position,idx=g.index,count=idx?.count||p.count;triangles+=count/3;for(const v of p.array)assert(Number.isFinite(v));for(let i=0;i<count;i+=3){const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+k):i+k));assert(v[1].sub(v[0]).cross(v[2].sub(v[0])).lengthSq()>1e-18,'degenerate '+file+' '+o.name);}}});
 assert.equal(new Set(names).size,names.length);assert.deepEqual(names.slice().sort(),e.required_nodes.slice().sort());assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);assert.equal(materials.size,1);
 const b=new T.Box3().setFromObject(root);assert(b.min.y>-.0001,'floor penetration '+file);assert(b.min.distanceTo(new T.Vector3(...e.bounds.min))<.0001);assert(b.max.distanceTo(new T.Vector3(...e.bounds.max))<.0001);
 if(references.has(e.module)){const ref=references.get(e.module);assert.deepEqual(Object.keys(frames).sort(),Object.keys(ref.frames).sort());for(const [key,frame] of Object.entries(frames)){assert.equal(frame.parent,ref.frames[key].parent);frame.matrix.forEach((v,i)=>assert(Math.abs(v-ref.frames[key].matrix[i])<1e-5,'frame mismatch '+key));}assert(b.min.distanceTo(ref.bounds.min)<.001,'tier min bounds '+file);assert(b.max.distanceTo(ref.bounds.max)<.001,'tier max bounds '+file);}else references.set(e.module,{frames,bounds:b.clone()});
 for(const s of e.sockets){assert(sockets[s.node].distanceTo(new T.Vector3(...s.position_m))<1e-5);assert.equal(root.getObjectByName(s.node).userData.axis,s.axis);}
 if(e.lod===1)assert(triangles<=(e.module==='stride'?25000:1500));if(e.lod===2){assert(triangles<=3000);assert.equal(draws,1);assert(e.bytes<=250000);}
 if(e.module==='pallet'){
  assert(b.getSize(new T.Vector3()).distanceTo(new T.Vector3(1.2,.16,1))<1e-5);
  for(const x of [-.265,.265])assert.equal(new T.Raycaster(new T.Vector3(x,.0725,2),new T.Vector3(0,0,-1)).intersectObject(root,true).length,0,'blocked front fork');
  for(const z of [-.215,.215])assert.equal(new T.Raycaster(new T.Vector3(2,.0725,z),new T.Vector3(-1,0,0)).intersectObject(root,true).length,0,'blocked side fork');
 }
 if(e.module==='crate')assert(b.getSize(new T.Vector3()).distanceTo(new T.Vector3(.56,.36,.46))<1e-5,'cargo envelope');
 if(e.module==='stride'){
  if(e.static){const before=[];root.traverse(o=>before.push(o.matrixWorld.toArray()));applyStride(root,{height:.6,steer:.4,travel:9,lock:0});const after=[];root.traverse(o=>after.push(o.matrixWorld.toArray()));assert.deepEqual(before,after);}
  else for(let i=0;i<=8;i++)for(const steer of [-.6,0,.6])for(const travel of [-1,0,1]){
   const height=.6+.02*i;applyStride(root,{height,steer,travel,lock:i/8});report.pose_samples++;
   const pallet=models.get('pallet_1_false').clone(true),mount=root.getObjectByName('SOCKET_PALLET');pallet.position.copy(mount.getWorldPosition(new T.Vector3()));pallet.updateMatrixWorld(true);
   for(const {id,side} of STATIONS){
    const wheel=root.getObjectByName('SOCKET_WHEEL_'+id).getWorldPosition(new T.Vector3()),error=Math.abs(wheel.y-STANDARD.wheel_radius_m);report.max_wheel_height_error_m=Math.max(error,report.max_wheel_height_error_m);assert(error<1e-6,'grounded wheel centre');
    const top=root.getObjectByName('SOCKET_PALLET_LOCK_'+id).getWorldPosition(new T.Vector3()),bottom=pallet.getObjectByName('SOCKET_BOTTOM_LOCK_'+id).getWorldPosition(new T.Vector3()),delta=top.distanceTo(bottom);report.max_lock_alignment_error_m=Math.max(delta,report.max_lock_alignment_error_m);assert(delta<1e-6,'lock mating');
    const hip=root.getObjectByName('LEG_'+id+'_HIP_PITCH').getWorldPosition(new T.Vector3()),knee=root.getObjectByName('LEG_'+id+'_KNEE_PITCH').getWorldPosition(new T.Vector3()),ankle=root.getObjectByName('LEG_'+id+'_ANKLE_ROLL').getWorldPosition(new T.Vector3());assert(Math.abs(hip.distanceTo(knee)-STANDARD.upper_m)<1e-6);assert(Math.abs(knee.distanceTo(ankle)-STANDARD.lower_m)<1e-6);assert(Math.abs(root.getObjectByName('WHEEL_'+id+'_ROLL').rotation.x-travel/.205)<1e-6);
   }
   root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
  }
  applyStride(root,{});
 }
 models.set(e.module+'_'+e.lod+'_'+packed,root);report.files.push({file,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:valid.issues.numErrors,gltf_warnings:valid.issues.numWarnings});
}
for(let i=0;i<=1200;i++){const p=transportPose(i/60);assert(p.z>=-1.7&&p.z<=1.7);assert(p.lock===1);assert(Math.abs(p.travel-(p.z+1.7))<1e-9);report.transport_samples++;}
assert.deepEqual(transportPose(0),transportPose(20));for(const t of [2,8,12,18,20])assert(Math.abs(transportPose(t-.00001).z-transportPose(t+.00001).z)<1e-5);
report.checks=['18 plain/decoded files, hashes, zero glTF errors/warnings','nondegenerate finite geometry, measured triangles/draws/bytes','unique engine names and identical cross-tier parent/rest frames','common origin, bounds and connection metadata','four-way pallet fork passages','pallet and cargo dimensions','all four mating locks through lift range','ground-height wheel centres and rigid link lengths','static tiers ignore articulation','continuous closed 20-second transport study'];
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,files:report.files.length,pose_samples:report.pose_samples,transport_samples:report.transport_samples,max_wheel_height_error_m:report.max_wheel_height_error_m,max_lock_alignment_error_m:report.max_lock_alignment_error_m},null,2));
