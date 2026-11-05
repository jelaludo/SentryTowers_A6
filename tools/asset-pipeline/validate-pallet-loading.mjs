import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import {state,LOADS,LAYOUT,DURATION} from '../../pallet-loading/timeline.js';
import {applyStride,applyCup,STATIONS,STANDARD,CUP} from '../../assets/pallet-cargo/runtime.js';
const out=new URL('../../pallet-loading/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const loader=new GLTFLoader(),parse=b=>loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const report={status:'passed',scope:'Plain station exports, exact unchanged source dependencies, deterministic 22-second choreography, sampled rig/contact/cargo and fixture-envelope checks. General arm self-collision, traction, force and suction engineering remain unverified. No new compressed files or FPS claims.',files:[],pose_samples:0,max_contact_error_m:0,max_wheel_height_error_m:0,min_empty_pallet_dock_clearance_m:1,min_carried_crate_body_clearance_m:1,min_package_separation_m:1,checks:[]};
let reference;
for(const entry of manifest.assets){
 const b=await fs.readFile(new URL(entry.file,out));assert.equal(b.length,entry.bytes);assert.equal(sha(b),entry.sha256);
 const v=await validator.validateBytes(b);assert.equal(v.issues.numErrors,0,JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,JSON.stringify(v.issues));
 const {scene,animations}=await parse(b);assert.equal(animations.length,0);const root=scene.getObjectByName('LOADING_STATION_ROOT');assert(root.userData.static);assert.equal(root.userData.lod,entry.lod);assert.equal(root.userData.damage_level,0);assert.deepEqual(root.userData.plot_m,[11,13]);root.updateMatrixWorld(true);
 let tris=0,draws=0;const frames={},names=[];
 root.traverse(o=>{names.push(o.name);assert(/^[A-Z][A-Z0-9_]*$/.test(o.name));frames[o.name]={parent:o===root?null:o.parent.name,matrix:o.matrix.toArray()};if(o.isMesh){draws++;assert(!Array.isArray(o.material));assert(!o.material.map);const g=o.geometry,p=g.attributes.position,i=g.index,n=i?.count||p.count;tris+=n/3;for(const v of p.array)assert(Number.isFinite(v));for(let j=0;j<n;j+=3){const a=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,i?i.getX(j+k):j+k));assert(a[1].sub(a[0]).cross(a[2].sub(a[0])).lengthSq()>1e-18,'degenerate '+entry.file);}}});
 assert.equal(new Set(names).size,names.length);if(reference)assert.deepEqual(frames,reference);else reference=frames;
 assert.equal(tris,entry.triangles);assert.equal(draws,1);assert.equal(draws,entry.draw_calls);
 for(const [name,pos]of Object.entries(entry.sockets))assert(root.getObjectByName(name).getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...pos))<1e-7);
 const box=new T.Box3().setFromObject(root,true);assert(box.min.distanceTo(new T.Vector3(...entry.bounds_m[0]))<1e-5);assert(box.max.distanceTo(new T.Vector3(...entry.bounds_m[1]))<1e-5);
 if(entry.lod===1){assert(tris<=8000);assert(b.length<=400000);}if(entry.lod===2){assert(tris<=3000);assert(b.length<=250000);}
 report.files.push({file:entry.file,triangles:tris,draw_calls:draws,bytes:b.length,gltf_errors:v.issues.numErrors,gltf_warnings:v.issues.numWarnings});
}
const models=new Map();
for(const e of [...manifest.dependencies,manifest.runtime_dependency]){
 const b=await fs.readFile(new URL(e.file,out));assert.equal(sha(b),e.sha256);
 const repoPath=e.file.replace('../',''),old=execFileSync('git',['show',`${e.source_commit}:${repoPath}`]);assert.equal(sha(b),sha(old),'source changed '+e.file);
 if(e.lod<2&&['stride','cup','pallet'].includes(e.module)){const gltf=await parse(b);models.set(`${e.module}_${e.lod}`,gltf.scene.getObjectByName(e.module.toUpperCase()+'_ROOT'));}
}
const dist=(a,b)=>new T.Vector3(...a).distanceTo(new T.Vector3(...b));
const packageBox=c=>new T.Box3(new T.Vector3(c.position[0]-.28,c.position[1],c.position[2]-.23),new T.Vector3(c.position[0]+.28,c.position[1]+.36,c.position[2]+.23));
function separation(a,b){return Math.max(a.min.x-b.max.x,b.min.x-a.max.x,a.min.y-b.max.y,b.min.y-a.max.y,a.min.z-b.max.z,b.min.z-a.max.z);}
for(const lod of [0,1]){
 const stride=models.get('stride_'+lod),cup=models.get('cup_'+lod),pallet=models.get('pallet_'+lod);cup.position.fromArray(LAYOUT.cup);
 for(let i=0;i<=DURATION*120;i++){
  const s=state(i/120);assert.deepEqual(s,state(s.time),'deterministic');assert.equal(s.crates.length,4);assert.equal(s.loaded,s.crates.filter(c=>c.custody==='stride').length);assert(s.crates.filter(c=>c.custody==='cup').length<=1);
  stride.position.fromArray(s.stride.position);applyStride(stride,s.stride);cup.position.fromArray(LAYOUT.cup);applyCup(cup,s.cup);pallet.position.set(s.stride.position[0],s.pallet_y,s.stride.position[2]);pallet.updateMatrixWorld(true);
  const grip=cup.getObjectByName('SOCKET_CARGO_GRIP').getWorldPosition(new T.Vector3()),error=grip.distanceTo(new T.Vector3(...s.target));assert(error<1e-6,'reach '+s.time);report.max_contact_error_m=Math.max(error,report.max_contact_error_m);
  for(const {id,side,end}of STATIONS){
   const wheel=stride.getObjectByName('SOCKET_WHEEL_'+id).getWorldPosition(new T.Vector3()),e=Math.abs(wheel.y-STANDARD.wheel_radius_m);assert(e<1e-6);report.max_wheel_height_error_m=Math.max(e,report.max_wheel_height_error_m);
   assert(Math.abs(wheel.x-(s.stride.position[0]+side*(.59+.43/Math.SQRT2)))<1e-6);assert(Math.abs(wheel.z-(s.stride.position[2]+end*(.4+.43/Math.SQRT2)))<1e-6);
   const pad=cup.getObjectByName('SOCKET_CUP_PAD_'+id).getWorldPosition(new T.Vector3());assert(pad.distanceTo(grip.clone().add(new T.Vector3(side*.16,0,end*.12)))<1e-6);
   const head=stride.getObjectByName('SOCKET_PALLET_LOCK_'+id).getWorldPosition(new T.Vector3()),lock=pallet.getObjectByName('SOCKET_BOTTOM_LOCK_'+id).getWorldPosition(new T.Vector3());assert(head.distanceTo(lock)<1e-6);
   assert(Math.abs(stride.getObjectByName('WHEEL_'+id+'_ROLL').rotation.x-s.stride.travel/.205)<1e-6);
   const direction=new T.Vector3(0,0,1).applyQuaternion(stride.getObjectByName('WHEEL_'+id+'_YAW').getWorldQuaternion(new T.Quaternion()));assert(direction.distanceTo(new T.Vector3(Math.sin(s.stride.steer),0,Math.cos(s.stride.steer)))<1e-6);
   const hip=stride.getObjectByName('LEG_'+id+'_HIP_PITCH').getWorldPosition(new T.Vector3()),knee=stride.getObjectByName('LEG_'+id+'_KNEE_PITCH').getWorldPosition(new T.Vector3()),ankle=stride.getObjectByName('LEG_'+id+'_ANKLE_ROLL').getWorldPosition(new T.Vector3());assert(Math.abs(hip.distanceTo(knee)-.30)<1e-6);assert(Math.abs(knee.distanceTo(ankle)-.34)<1e-6);
  }
  const shoulder=cup.getObjectByName('CUP_SHOULDER_PITCH').getWorldPosition(new T.Vector3()),elbow=cup.getObjectByName('CUP_ELBOW_PITCH').getWorldPosition(new T.Vector3()),wrist=cup.getObjectByName('CUP_WRIST_LEVEL').getWorldPosition(new T.Vector3());assert(Math.abs(shoulder.distanceTo(elbow)-CUP.upper_m)<1e-6);assert(Math.abs(elbow.distanceTo(wrist)-CUP.fore_m)<1e-6);
  assert(cup.getObjectByName('CUP_WRIST_LEVEL').getWorldQuaternion(new T.Quaternion()).angleTo(new T.Quaternion())<1e-6);
  const boxes=s.crates.map(packageBox);for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){const d=separation(boxes[a],boxes[b]);assert(d>=-1e-7,`cargo overlap ${s.time}: ${a}/${b}`);report.min_package_separation_m=Math.min(d,report.min_package_separation_m);}
  for(const c of s.crates){
   if(c.custody==='cup'){assert.equal(s.cup.vacuum,1);assert(dist([c.position[0],c.position[1]+.36,c.position[2]],s.target)<1e-6);}
   if(c.custody==='stride'){assert(Math.abs(c.position[1]-s.deck)<1e-9);assert(dist(c.position,[s.stride.position[0]+c.slot[0],s.deck,s.stride.position[2]+c.slot[1]])<1e-9);}
   if(c.custody==='feed')assert.equal(c.position[1],1.55);
   // Solid pallet/platform and body proxies; excludes articulated arm itself.
   const b=packageBox(c),dock=new T.Box3(new T.Vector3(-2.5,1.06,-.6),new T.Vector3(-.65,1.10,.6));assert(separation(b,dock)>0,'crate/dock '+s.time);
   const base=new T.Box3().setFromObject(cup.getObjectByName('CUP_CHASSIS_SURFACE'),true);assert(separation(b,base)>0,'crate/CUP base '+s.time);
   for(const name of ['CUP_TURNTABLE_SURFACE',...STATIONS.map(({id})=>'CUP_WHEEL_'+id+'_SURFACE')])assert(separation(b,new T.Box3().setFromObject(cup.getObjectByName(name),true))>0,'crate/'+name+' '+s.time);
   if(c.custody==='cup'&&b.min.x<base.max.x&&b.max.x>base.min.x&&b.min.z<base.max.z&&b.max.z>base.min.z){const d=b.min.y-base.max.y;assert(d>.1);report.min_carried_crate_body_clearance_m=Math.min(d,report.min_carried_crate_body_clearance_m);}
  }
  const clear=LAYOUT.platform_bottom-s.deck;assert(clear>=.09-1e-6);report.min_empty_pallet_dock_clearance_m=Math.min(clear,report.min_empty_pallet_dock_clearance_m);
  // Never load while STRIDE is moving or steering.
  for(const load of LOADS)if(s.time>=load.start&&s.time<=load.start+2.4){const a=state(s.time-.00001),b=state(s.time+.00001);assert(dist(a.stride.position,b.stride.position)<1e-8);assert(Math.abs(s.stride.steer)<1e-8);}
  assert(s.stride.position[2]>=LAYOUT.entry_z-1e-9&&s.stride.position[2]<=LAYOUT.exit_z+1e-9);
  report.pose_samples++;
 }
}
const boundaries=[0,3,3.4,9.1,9.4,10.4,10.7,16.7,17,17.4,21.4,22,...LOADS.flatMap(l=>[0,.35,.5,.85,1.45,1.95,2.12,2.4,3].map(u=>l.start+u))];
for(const t of boundaries){const a=state(t-1e-6),b=state(t+1e-6);assert(dist(a.target,b.target)<1e-4,'tool discontinuity '+t);a.crates.forEach((c,i)=>assert(dist(c.position,b.crates[i].position)<1e-4,'cargo discontinuity '+t));assert(dist(a.stride.position,b.stride.position)<1e-4);}
assert.equal(state(0).loaded,0);assert.equal(state(17.4).loaded,4);assert.equal(state(22).loaded,4);assert(state(22).complete);assert.equal(state(22).stride.position[2],4.6);assert.equal(state(10).loaded,2);
report.checks=['Three self-contained station GLBs with zero validator errors/warnings','Measured triangles/draws/bytes, nondegenerate finite geometry, identical named frames/sockets across tiers','12 existing PCS GLBs and runtime match the pinned upstream commit byte for byte','5,282 master/game poses sampled at 120 Hz; exact four-package custody and deck support','CUP reach, rigid links, level tool and four coplanar seals','STRIDE grounded wheels, rigid links, steering, rolling and pallet-lock mating','Stationary carrier during each seal/lift/place; sideways index with two supported crates','Cargo pair AABBs, dock slab and conservative CUP base proxy clearance','Continuity at all choreography boundaries and history-free backwards scrubbing','One-shot ends loaded at 22 seconds; no loop teleport'];
await fs.writeFile(new URL('validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
