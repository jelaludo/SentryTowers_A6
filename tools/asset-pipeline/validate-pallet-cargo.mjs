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
import {applyStride,transportPose,STATIONS,STANDARD,STRIDE,applyCup,cupTransferPose,CUP} from '../../assets/pallet-cargo/runtime.js';
const out=new URL('../../assets/pallet-cargo/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const references=new Map(),models=new Map(),report={status:'passed',scope:'Plain and decoded Meshopt, geometry, stable hierarchy/sockets, 45 degree stance, continuous steering, independent sliding suspension and CUP seal/cargo contact. Cargo AABB clearance is checked; general arm/body self-collision, forces, vacuum/load performance and phone certification are not.',files:[],pose_samples:0,cup_pose_samples:0,transport_samples:0,max_wheel_height_error_m:0,max_lock_alignment_error_m:0,max_cup_contact_error_m:0,min_rod_overlap_m:1,checks:[]};
for(const e of manifest.assets)for(const packed of [false,true]){
 const file=packed?e.meshopt_file:e.file,bytes=await fs.readFile(new URL(file,out));assert.equal(bytes.length,packed?e.meshopt_bytes:e.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),packed?e.meshopt_sha256:e.sha256);
 let decoded=bytes;if(packed){const doc=await io.readBinary(bytes);for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();await doc.transform(dequantize());decoded=await io.writeBinary(doc);}
 const valid=await validator.validateBytes(decoded);assert.equal(valid.issues.numErrors,0,file+JSON.stringify(valid.issues));assert.equal(valid.issues.numWarnings,0,file+JSON.stringify(valid.issues));
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');assert.equal(gltf.animations.length,0);const root=gltf.scene.children[0];assert.equal(root.userData.static,e.static);root.updateMatrixWorld(true);
 const names=[],frames={},sockets={};let triangles=0,draws=0,materials=new Set();
 root.traverse(o=>{names.push(o.name);assert(/^[A-Z][A-Z0-9_]*$/.test(o.name),'invalid node '+o.name);if(!o.name.endsWith('_STATIC_SURFACE'))frames[o.name]={parent:o===root?null:o.parent.name,matrix:o.matrix.toArray()};if(o.name.startsWith('SOCKET_'))sockets[o.name]=o.getWorldPosition(new T.Vector3());if(o.isMesh){assert(!Array.isArray(o.material));materials.add(o.material);assert(!o.material.map);draws++;const g=o.geometry,p=g.attributes.position,idx=g.index,count=idx?.count||p.count;triangles+=count/3;for(const v of p.array)assert(Number.isFinite(v));for(let i=0;i<count;i+=3){const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+k):i+k));assert(v[1].sub(v[0]).cross(v[2].sub(v[0])).lengthSq()>1e-18,'degenerate '+file+' '+o.name);}}});
 assert.equal(new Set(names).size,names.length);assert.deepEqual(names.slice().sort(),e.required_nodes.slice().sort());assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);assert.equal(materials.size,1);
 const b=new T.Box3().setFromObject(root,true);assert(b.min.y>-.0001,'floor penetration '+file);assert(b.min.distanceTo(new T.Vector3(...e.bounds.min))<.0001);assert(b.max.distanceTo(new T.Vector3(...e.bounds.max))<.0001);
 if(references.has(e.module)){const ref=references.get(e.module);assert.deepEqual(Object.keys(frames).sort(),Object.keys(ref.frames).sort());for(const [key,frame] of Object.entries(frames)){assert.equal(frame.parent,ref.frames[key].parent);frame.matrix.forEach((v,i)=>assert(Math.abs(v-ref.frames[key].matrix[i])<1e-5,'frame mismatch '+key));}assert(b.min.distanceTo(ref.bounds.min)<.001,'tier min bounds '+file);assert(b.max.distanceTo(ref.bounds.max)<.001,'tier max bounds '+file);}else references.set(e.module,{frames,bounds:b.clone()});
 for(const s of e.sockets){assert(sockets[s.node].distanceTo(new T.Vector3(...s.position_m))<1e-5);assert.equal(root.getObjectByName(s.node).userData.axis,s.axis);}
 if(e.lod===1)assert(triangles<=(['stride','cup'].includes(e.module)?25000:1500));if(e.lod===2){assert(triangles<=3000);assert.equal(draws,1);assert(e.bytes<=250000);}
 if(e.module==='pallet'){
  assert(b.getSize(new T.Vector3()).distanceTo(new T.Vector3(1.2,.16,1))<1e-5);
  for(const x of [-.265,.265])assert.equal(new T.Raycaster(new T.Vector3(x,.0725,2),new T.Vector3(0,0,-1)).intersectObject(root,true).length,0,'blocked front fork');
  for(const z of [-.215,.215])assert.equal(new T.Raycaster(new T.Vector3(2,.0725,z),new T.Vector3(-1,0,0)).intersectObject(root,true).length,0,'blocked side fork');
 }
 if(e.module==='crate')assert(b.getSize(new T.Vector3()).distanceTo(new T.Vector3(.56,.36,.46))<1e-5,'cargo envelope');
 if(e.module==='stride'){
  if(e.static){const before=[];root.traverse(o=>before.push(o.matrixWorld.toArray()));applyStride(root,{height:.6,steer:.4,travel:9,lock:0});const after=[];root.traverse(o=>after.push(o.matrixWorld.toArray()));assert.deepEqual(before,after);}
  else for(let i=0;i<=8;i++)for(const steer of [-Math.PI*2,-Math.PI,-.6,0,.6,Math.PI,Math.PI*2])for(const stroke of [-.035,0,.035]){
   const height=.6+.02*i,travel=i/8,suspension=Object.fromEntries(STATIONS.map(({id},j)=>[id,j%2?stroke:-stroke])),headings=Object.fromEntries(STATIONS.map(({id},j)=>[id,steer+j*.41]));applyStride(root,{height,headings,suspension,travel,lock:i/8});report.pose_samples++;
   const pallet=models.get('pallet_1_false').clone(true),mount=root.getObjectByName('SOCKET_PALLET');pallet.position.copy(mount.getWorldPosition(new T.Vector3()));pallet.updateMatrixWorld(true);
   for(const {id,side,end} of STATIONS){
    const wheel=root.getObjectByName('SOCKET_WHEEL_'+id).getWorldPosition(new T.Vector3()),error=Math.abs(wheel.y-STANDARD.wheel_radius_m);report.max_wheel_height_error_m=Math.max(error,report.max_wheel_height_error_m);assert(error<1e-6,'grounded wheel centre');
    const top=root.getObjectByName('SOCKET_PALLET_LOCK_'+id).getWorldPosition(new T.Vector3()),bottom=pallet.getObjectByName('SOCKET_BOTTOM_LOCK_'+id).getWorldPosition(new T.Vector3()),delta=top.distanceTo(bottom);report.max_lock_alignment_error_m=Math.max(delta,report.max_lock_alignment_error_m);assert(delta<1e-6,'lock mating');
    assert(Math.abs(wheel.x-side*(.59+.43/Math.SQRT2))<1e-6);assert(Math.abs(wheel.z-end*(.4+.43/Math.SQRT2))<1e-6);
    const hip=root.getObjectByName('LEG_'+id+'_HIP_PITCH').getWorldPosition(new T.Vector3()),knee=root.getObjectByName('LEG_'+id+'_KNEE_PITCH').getWorldPosition(new T.Vector3()),ankle=root.getObjectByName('LEG_'+id+'_ANKLE_ROLL').getWorldPosition(new T.Vector3());assert(Math.abs(hip.distanceTo(knee)-STANDARD.upper_m)<1e-6);assert(Math.abs(knee.distanceTo(ankle)-(STANDARD.lower_m+suspension[id]))<1e-6);assert(Math.abs(root.getObjectByName('WHEEL_'+id+'_ROLL').rotation.x-travel/.205)<1e-6);
    const yaw=root.getObjectByName('WHEEL_'+id+'_YAW'),direction=new T.Vector3(0,0,1).applyQuaternion(yaw.getWorldQuaternion(new T.Quaternion()));assert(direction.distanceTo(new T.Vector3(Math.sin(headings[id]),0,Math.cos(headings[id])))<1e-6,'independent full swivel');
    const slide=root.getObjectByName('LEG_'+id+'_SUSPENSION_EXTEND'),overlap=.45-(STANDARD.lower_m+suspension[id]);assert(slide.scale.equals(new T.Vector3(1,1,1)));assert(overlap>=.075-1e-6);report.min_rod_overlap_m=Math.min(overlap,report.min_rod_overlap_m);
   }
   root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
  }
  applyStride(root,{});
  for(const {id,side,end} of STATIONS){assert(Math.abs(root.getObjectByName('LEG_'+id+'_SPLAY_YAW').rotation.y+side*end*Math.PI/4)<1e-6);const d=new T.Vector3(0,0,1).applyQuaternion(root.getObjectByName('WHEEL_'+id+'_YAW').getWorldQuaternion(new T.Quaternion()));assert(Math.abs(Math.abs(d.x)-Math.SQRT1_2)<1e-6&&Math.abs(Math.abs(d.z)-Math.SQRT1_2)<1e-6,'45 degree ready wheels');}
 }
 if(e.module==='cup'){
  if(e.static){const before=[];root.traverse(o=>before.push(o.matrixWorld.toArray()));applyCup(root,{target:[-.6,.6,.7],vacuum:1});const after=[];root.traverse(o=>after.push(o.matrixWorld.toArray()));assert.deepEqual(before,after);}
  else for(let i=0;i<=1440;i++){
   const pose=cupTransferPose(i/60);applyCup(root,pose);report.cup_pose_samples++;
   const grip=root.getObjectByName('SOCKET_CARGO_GRIP').getWorldPosition(new T.Vector3()),error=grip.distanceTo(new T.Vector3(...pose.target));assert(error<1e-6);report.max_cup_contact_error_m=Math.max(error,report.max_cup_contact_error_m);
   const q=root.getObjectByName('CUP_WRIST_LEVEL').getWorldQuaternion(new T.Quaternion());assert(q.angleTo(new T.Quaternion())<1e-6,'level square spreader');
   const shoulder=root.getObjectByName('CUP_SHOULDER_PITCH').getWorldPosition(new T.Vector3()),elbow=root.getObjectByName('CUP_ELBOW_PITCH').getWorldPosition(new T.Vector3()),wrist=root.getObjectByName('CUP_WRIST_LEVEL').getWorldPosition(new T.Vector3());assert(Math.abs(shoulder.distanceTo(elbow)-CUP.upper_m)<1e-6);assert(Math.abs(elbow.distanceTo(wrist)-CUP.fore_m)<1e-6);
   for(const {id,side,end} of STATIONS){const pad=root.getObjectByName('SOCKET_CUP_PAD_'+id).getWorldPosition(new T.Vector3());assert(pad.distanceTo(grip.clone().add(new T.Vector3(side*.16,0,end*.12)))<1e-6,'four coplanar seal contacts');}
   if(pose.attached){assert.equal(pose.vacuum,1);assert(Math.abs(pose.crate[1]+.36-grip.y)<1e-6);}
   assert(pose.crate[1]>=.16-1e-6);
   for(const side of [-1,1])for(const x of [-.30,.30])for(const z of [-.25,.25]){if(x===-side*.30&&z===-.25)continue;const [cx,cy,cz]=pose.crate;const clear=Math.abs(cx-(side*.95+x))>=.56-1e-6||Math.abs(cz-(1.05+z))>=.46-1e-6||cy>=.52-1e-6;assert(clear,'transported crate intersects stored cargo');}
   root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
  }
  applyCup(root);
 }
 models.set(e.module+'_'+e.lod+'_'+packed,root);report.files.push({file,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:valid.issues.numErrors,gltf_warnings:valid.issues.numWarnings});
}
for(let i=0;i<=1200;i++){const p=transportPose(i/60);assert(p.z>=-1.7&&p.z<=1.7);assert(p.lock===1);assert(Math.abs(p.travel-(p.z+1.7))<1e-9);report.transport_samples++;}
assert.deepEqual(transportPose(0),transportPose(20));for(const t of [2,8,12,18,20])assert(Math.abs(transportPose(t-.00001).z-transportPose(t+.00001).z)<1e-5);
assert.deepEqual(cupTransferPose(0),cupTransferPose(24));for(const t of [1,2,3,4.5,7.5,9,10,11,12,13,14,15,16.5,19.5,21,22,23,24]){const a=cupTransferPose(t-1e-5),b=cupTransferPose(t+1e-5);assert(new T.Vector3(...a.target).distanceTo(new T.Vector3(...b.target))<1e-4);assert(new T.Vector3(...a.crate).distanceTo(new T.Vector3(...b.crate))<1e-4);}
const preserved=JSON.parse(await fs.readFile(new URL('revisions/r1/preservation.json',out)));for(const [file,hash] of Object.entries(preserved.files))assert.equal(crypto.createHash('sha256').update(await fs.readFile(new URL('revisions/r1/'+file,out))).digest('hex'),hash,'r1 original '+file);for(const e of manifest.assets.filter(e=>['pallet','crate'].includes(e.module)))assert.equal(e.sha256,preserved.files[e.file],'unchanged module');
report.checks=['24 plain/decoded files, hashes, zero glTF errors/warnings','finite nondegenerate geometry and measured metrics','unique names, matching tier hierarchy/rest frames/bounds/metadata','unchanged pallet and crate files; archived r1 checksums','four-way fork passages and carrier lock alignment','45 degree splayed stance and ready wheel headings','independent full-circle steering with fixed wheel centres','70 mm suspension stroke and 75 mm minimum rigid-rod overlap','CUP fixed link lengths and level square spreader','four coplanar seals at crate top, grip/release and cargo AABB clearance','static tiers ignore articulation','continuous 20-second STRIDE and 24-second CUP transport cycles'];
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,files:report.files.length,pose_samples:report.pose_samples,cup_pose_samples:report.cup_pose_samples,min_rod_overlap_m:report.min_rod_overlap_m,max_cup_contact_error_m:report.max_cup_contact_error_m},null,2));
