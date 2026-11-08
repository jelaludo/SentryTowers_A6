import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import {poseShuttle,applyDocking,dockingState,PHASES,SPEC} from '../../assets/shuttle-01/runtime.js';
const out=new URL('../../assets/shuttle-01/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const load=async bytes=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const roots=[],frames=[],report={status:'passed',scope:'Decoded plain GLBs, names, socket frames, conservative station separation, door aperture rays and sampled kinematic docking. No force, pressure or general collision simulation.',files:[],cycle_samples:0,aperture_checks:[],checks:[]};
const near=(a,b,e=1e-5)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
for(const a of manifest.assets){
 const bytes=await fs.readFile(new URL(a.file,out));assert.equal(bytes.length,a.bytes);assert.equal(sha(bytes),a.sha256);
 const v=await validator.validateBytes(bytes);assert.equal(v.issues.numErrors,0,JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,JSON.stringify(v.issues));
 const g=await load(bytes),root=g.scene.getObjectByName(a.root);roots[a.lod]=root;root.updateMatrixWorld(true);assert.equal(g.animations.length,0);
 const names=[],frame={};let triangles=0,draws=0;
 root.traverse(o=>{names.push(o.name);assert(/^[A-Z][A-Z0-9_]*$/.test(o.name),o.name);if(o.name!=='SHUTTLE_DISTANCE_SURFACE')frame[o.name]={parent:o===root?null:o.parent.name,matrix:o.matrix.toArray()};
  if(o.isMesh){draws++;assert(!o.material.map&&!Array.isArray(o.material));const p=o.geometry.attributes.position,idx=o.geometry.index,count=idx?.count||p.count;triangles+=count/3;assert(Array.from(p.array).every(Number.isFinite));assert(Array.from(o.geometry.attributes.normal.array).every(Number.isFinite));for(let j=0;j<count;j+=3){const ps=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(j+k):j+k));assert(ps[1].sub(ps[0]).cross(ps[2].sub(ps[0])).lengthSq()>1e-18,'degenerate '+a.file+' '+o.name+' '+j);}}
 });frames[a.lod]=frame;assert.equal(new Set(names).size,names.length);assert.deepEqual(names.sort(),[...a.nodes].sort());assert.equal(triangles,a.triangles);assert.equal(draws,a.draw_calls);
 const bounds=new T.Box3().setFromObject(root,true);near(bounds.min.y,0);assert(bounds.min.distanceTo(new T.Vector3(...a.bounds.min))<1e-5);assert(bounds.max.distanceTo(new T.Vector3(...a.bounds.max))<1e-5);
 if(a.lod){assert.deepEqual(Object.keys(frame).sort(),Object.keys(frames[0]).sort());for(const [name,f]of Object.entries(frame)){assert.equal(f.parent,frames[0][name].parent);f.matrix.forEach((x,i)=>near(x,frames[0][name].matrix[i]));}const m=manifest.assets[0];assert(bounds.min.distanceTo(new T.Vector3(...m.bounds.min))<.001);assert(bounds.max.distanceTo(new T.Vector3(...m.bounds.max))<.001);}
 for(const s of a.sockets){const o=root.getObjectByName(s.node);assert(o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<1e-5);assert(o.getWorldQuaternion(new T.Quaternion()).angleTo(new T.Quaternion(...s.quaternion))<1e-5);}
 if(a.lod===1)assert(triangles<=25000);
 if(a.lod===2){assert(triangles<=3000&&draws===1&&bytes.length<=250000);poseShuttle(root,{extension:1,hatch:1,lock:1,gimbal:6});for(const [name,f]of Object.entries(frame))assert.deepEqual(root.getObjectByName(name).matrix.toArray(),f.matrix);}
 report.files.push({file:a.file,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:0,gltf_warnings:0});
}
const station=(await load(await fs.readFile(new URL('../../assets/space-elevator/orbital_d0_lod0.glb',import.meta.url)))) .scene;station.updateMatrixWorld(true);
const stationSocket=station.getObjectByName(SPEC.station_socket),target=stationSocket.getWorldPosition(new T.Vector3()),normal=new T.Vector3(0,0,1).applyQuaternion(stationSocket.getWorldQuaternion(new T.Quaternion())),stationMaxX=new T.Box3().setFromObject(station,true).max.x;
let minSeparation=Infinity,maxSocketError=0;
for(const lod of [0,1]){
 const root=roots[lod],socket=root.getObjectByName('SOCKET_BELLY_DOCK');
 for(const hatch of [0,1]){
  poseShuttle(root,{hatch,extension:0});const ray=new T.Raycaster(new T.Vector3(.4,-4,SPEC.belly_z_m),new T.Vector3(0,1,0)),hit=ray.intersectObject(root,true)[0];assert(hit,'airlock ray hit');assert(hatch?hit.object.name==='HULL':hit.object.name.startsWith('BELLY_HATCH_'),hit.object.name);near(hit.point.y,hatch?2.82:1.75,.001);report.aperture_checks.push({lod,hatch,first_surface:hit.object.name,first_hit_y_m:hit.point.y});
  if(hatch){near(root.getObjectByName('DOCK_EXTEND').position.y,-1.2);const l=new T.Box3().setFromObject(root.getObjectByName('BELLY_HATCH_L'),true),r=new T.Box3().setFromObject(root.getObjectByName('BELLY_HATCH_R'),true);assert(l.max.x<-1.25&&r.min.x>1.25,'full aperture clear');}
 }
 // Sample the full 2.5 m aperture, not only its centre.
 poseShuttle(root,{hatch:1});for(let i=0;i<16;i++){const angle=i/16*Math.PI*2,ray=new T.Raycaster(new T.Vector3(1.15*Math.cos(angle),-4,SPEC.belly_z_m+1.15*Math.sin(angle)),new T.Vector3(0,1,0)),hit=ray.intersectObject(root,true)[0];near(hit.point.y,2.82,.001);}
 for(const gimbal of [-10,0,10]){const p=poseShuttle(root,{gimbal});near(p.gimbal,Math.max(-6,Math.min(6,gimbal)));for(const id of ['L','R'])near(root.getObjectByName('ENGINE_'+id).rotation.x,p.gimbal*Math.PI/180);}
 for(let i=0;i<=720;i++){
  const t=i/10,s=applyDocking(root,t);root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
  const gap=socket.getWorldPosition(new T.Vector3()).distanceTo(target);
  if(t>=30&&t<=47){maxSocketError=Math.max(maxSocketError,gap);assert(gap<1e-5);near(new T.Vector3(0,0,1).applyQuaternion(socket.getWorldQuaternion(new T.Quaternion())).dot(normal),-1);}
  if(s.hatch>0){assert.equal(s.lock,1);assert.equal(s.extension,1);assert(gap<1e-5);}
  if(t>47)assert.equal(s.hatch,0);
  for(const name of ['HULL','CANOPY','ENGINE_L','ENGINE_R','BELLY_HATCH_L','BELLY_HATCH_R']){const b=new T.Box3().setFromObject(root.getObjectByName(name),true),separation=b.min.x-stationMaxX;assert(separation>0,'non-coupling geometry crosses station envelope '+name+' '+t);minSeparation=Math.min(minSeparation,separation);}
  report.cycle_samples++;
 }
}
for(const p of PHASES.slice(1)){const a=dockingState(p.start-1e-6),b=dockingState(p.start+1e-6);assert(new T.Vector3(...a.position).distanceTo(new T.Vector3(...b.position))<1e-4);for(const k of ['roll','extension','lock','hatch'])near(a[k],b[k]);}
for(const s of manifest.sources){const b=await fs.readFile(new URL('../../'+s.file,import.meta.url));assert.equal(b.length,s.bytes);assert.equal(sha(b),s.sha256);}
report.docking={max_socket_error_m:maxSocketError,min_non_coupling_separation_m:minSeparation,station_max_x_m:stationMaxX};
report.checks=['All three plain GLBs validate with zero errors and warnings; finite, nondegenerate geometry','Unique dot-free names, same hierarchy/TRS and sockets across tiers; envelope difference below 1 mm','Game triangle target and all distance targets met; 11 articulated draws reported','Outer doors close the aperture and clear it when open; collar extension interlock holds','Two animated tiers sampled through all 72 seconds: opposing mating normals, latch-before-open and close-before-release','Non-coupling meshes remain outside station bounding plane through entire cycle; contact geometry is excluded','Distance adapter preserves every local transform; original station exports remain byte-identical'];
await fs.writeFile(new URL('validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
