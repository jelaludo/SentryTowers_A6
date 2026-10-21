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
import {LEGS,applyMech,solveHydraulics,policy} from '../../assets/ridgeback-mech/runtime.js';
const out=new URL('../../assets/ridgeback-mech/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const report={assets:[],pose_samples:0,clip_samples:0,minimum_planted_feet:6,piston_length_m:[Infinity,-Infinity],minimum_piston_overlap_m:Infinity,maximum_clip_endpoint_error_m:0,errors:[],scope:'Decoded plain/Meshopt geometry and gait checks on level ground; not continuous collision, terrain physics, firing or mobile performance certification'};
let baselineNames;const socketBaselines=new Map();
function near(a,b,tol,message){assert(a.distanceTo(b)<tol,message+': '+a.distanceTo(b));}
function wp(root,name){return root.getObjectByName(name).getWorldPosition(new T.Vector3());}
for(const e of manifest.assets)for(const compressed of [false,true]){
 const file=compressed?e.meshopt_file:e.file,bytes=await fs.readFile(new URL(file,out));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),compressed?e.meshopt_sha256:e.sha256);
 let decoded=bytes;if(compressed){const doc=await io.readBinary(bytes);for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();await doc.transform(dequantize());decoded=await io.writeBinary(doc);}
 const v=await validator.validateBytes(decoded);assert.equal(v.issues.numErrors,0,file+JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,file+JSON.stringify(v.issues));
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const root=gltf.scene;root.updateMatrixWorld(true);
 const names=[],sockets={};let triangles=0,draws=0;const materials=new Set();
 root.traverse(o=>{if(o.name)names.push(o.name);if(o.name.startsWith('SOCKET_'))sockets[o.name]=wp(root,o.name);if(o.isMesh){draws++;materials.add(o.material);const g=o.geometry,p=g.attributes.position,idx=g.index,n=idx?.count||p.count;triangles+=n/3;for(let i=0;i<n;i+=3){const a=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+k):i+k));assert(a.every(v=>v.toArray().every(Number.isFinite)));assert(a[1].sub(a[0]).cross(a[2].sub(a[0])).lengthSq()>1e-18,'degenerate '+file);}}});
 assert.equal(names.length,new Set(names).size);assert(names.every(n=>!n.includes('.')));assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);assert.equal(materials.size,1);
 const common=names.filter(n=>!['AuxScene','MX06_STATIC'].includes(n)).sort();if(baselineNames)assert.deepEqual(common,baselineNames);else baselineNames=common;
 assert.equal(names.filter(n=>n.startsWith('HIP_YAW_')).length,6);assert.equal(names.filter(n=>n.startsWith('SOCKET_CLAW_')).length,18);
 assert.equal(names.filter(n=>n.startsWith('SOCKET_MISSILE_')).length,12);
 for(const socket of e.sockets)near(sockets[socket.node],new T.Vector3(...socket.position_m),.002,'manifest socket');
 const baseline=socketBaselines.get(e.damage_level);if(baseline)for(const key in sockets)near(sockets[key],baseline[key],.002,'LOD socket '+key);else socketBaselines.set(e.damage_level,sockets);
 if(e.static){assert.equal(draws,1);assert(triangles<=3000);assert(e.bytes<=250000);assert.equal(gltf.animations.length,0);const before=wp(root,'MX06_STATIC');applyMech(root,1,{aimYaw:1,barrelAngle:100});near(before,wp(root,'MX06_STATIC'),1e-9,'distance unchanged');}
 else{
  if(e.lod===1)assert(triangles<=25000);
  for(let sample=0;sample<=80;sample++){
   const state=applyMech(root,sample/20,{damage:e.damage_level,aimYaw:.5,aimPitch:.4,barrelAngle:sample});report.pose_samples++;
   report.minimum_planted_feet=Math.min(report.minimum_planted_feet,state.contacts);assert(state.contacts>=3,'support tripod');
   for(const leg of LEGS){const target=state.targets[leg.id];assert(target.reachable,'unreachable foot '+file);near(wp(root,'SOCKET_FOOT_'+leg.id),new T.Vector3(...target.position).add(new T.Vector3(0,-.18,0)),.002,'IK contact '+file);
    const top=wp(root,'SOCKET_HYDRAULIC_UPPER_'+leg.id),bottom=wp(root,'SOCKET_HYDRAULIC_LOWER_'+leg.id);near(top,wp(root,'HYDRAULIC_AIM_'+leg.id),.002,'barrel attachment');near(bottom,wp(root,'PISTON_SLIDE_'+leg.id),.002,'rod attachment');const len=top.distanceTo(bottom);report.piston_length_m[0]=Math.min(report.piston_length_m[0],len);report.piston_length_m[1]=Math.max(report.piston_length_m[1],len);report.minimum_piston_overlap_m=Math.min(report.minimum_piston_overlap_m,1.08-len);assert(len>.54&&len<1.04,'piston stroke '+len);
    for(let spike=1;spike<=3;spike++)assert(Math.abs(wp(root,`SOCKET_CLAW_${leg.id}_${spike}`).y-(target.position[1]-.18))<.002,'claw not level');
   }
   root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
  }
  if(e.damage_level<3){
   assert.equal(gltf.animations.length,2);const clip=gltf.animations.find(c=>c.name.includes('Walk'));assert.equal(clip.duration,4);assert.equal(clip.name,e.damage_level===2?'Damaged_Walk_Cycle':'Walk_Cycle');
   assert(clip.tracks.every(t=>/^(HIP_|KNEE_|ANKLE_|HYDRAULIC_AIM_|PISTON_SLIDE_)/.test(t.name)),'aiming baked');
   // Every tip stays fixed in world space while the root advances during stance.
   const speed=policy(e.damage_level).stride/(.6*4);
   for(const leg of LEGS){const poses=[];for(const u of [.1,.2]){const t=((u-leg.phase+1)%1)*4;applyMech(root,t,{damage:e.damage_level});poses.push([1,2,3].map(i=>wp(root,`SOCKET_CLAW_${leg.id}_${i}`).add(new T.Vector3(0,0,speed*t))));}for(let i=0;i<3;i++)near(poses[0][i],poses[1][i],.002,'stance sliding '+leg.id);}
   // Actual decoded clip playback, including interpolated times between baked keys.
   const mixer=new T.AnimationMixer(root);mixer.clipAction(clip).play();
   for(let i=0;i<32;i++){const t=(i+.37)/8;applyMech(root,t,{damage:e.damage_level});const expected=LEGS.map(l=>wp(root,'SOCKET_FOOT_'+l.id));mixer.setTime(t);root.updateMatrixWorld(true);report.clip_samples++;
    for(const [j,l] of LEGS.entries()){const err=wp(root,'SOCKET_FOOT_'+l.id).distanceTo(expected[j]);report.maximum_clip_endpoint_error_m=Math.max(report.maximum_clip_endpoint_error_m,err);assert(err<.005,'baked clip drift '+err);}solveHydraulics(root);
   }
   mixer.stopAllAction();
   applyMech(root,0,{damage:e.damage_level});const start=LEGS.map(l=>wp(root,'SOCKET_FOOT_'+l.id));applyMech(root,4,{damage:e.damage_level});for(const [i,l] of LEGS.entries())near(start[i],wp(root,'SOCKET_FOOT_'+l.id),1e-7,'loop seam');
  }else{
   assert.equal(gltf.animations.length,0);applyMech(root,0,{aimYaw:1,aimPitch:1,barrelAngle:100});const before=[];root.traverse(o=>before.push(o.matrixWorld.toArray()));applyMech(root,3,{aimYaw:-1,aimPitch:-1,barrelAngle:-100});const after=[];root.traverse(o=>after.push(o.matrixWorld.toArray()));assert.deepEqual(before,after,'wreck moves');
  }
 }
 report.assets.push({file,triangles,draws,bytes:bytes.length,gltf_errors:v.issues.numErrors,gltf_warnings:v.issues.numWarnings,clips:gltf.animations.map(c=>({name:c.name,duration_s:c.duration}))});
}
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
