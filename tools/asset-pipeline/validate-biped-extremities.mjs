import fs from 'node:fs/promises';import assert from 'node:assert/strict';import crypto from 'node:crypto';import * as T from 'three';
import validator from 'gltf-validator';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'meshoptimizer';
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';import {dequantize} from '@gltf-transform/functions';
import * as hand from '../../assets/hand-lab/runtime.js';import * as foot from '../../assets/foot-lab/runtime.js';
import {BIPED_REST as HAND_REST} from '../../assets/hand-lab/biped.js';import {BIPED_REST as FOOT_REST} from '../../assets/foot-lab/biped.js';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
function load(bytes){return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'').then(g=>g.scene);}
const v=new T.Vector3(),q=new T.Quaternion();
function vertices(root){const out=[];root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh)for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,v);out.push(v.clone().applyMatrix4(o.matrixWorld));}});return out;}
function compareNodes(a,b,names){a.updateMatrixWorld(true);b.updateMatrixWorld(true);for(const name of names){const x=a.getObjectByName(name),y=b.getObjectByName(name);assert(x&&y,name);assert.equal(x.parent.name,y.parent.name,name+' parent');assert(x.position.distanceTo(y.position)<1e-6,name+' local position');assert(x.getWorldPosition(new T.Vector3()).distanceTo(y.getWorldPosition(new T.Vector3()))<1e-6,name+' world position');assert(x.getWorldQuaternion(new T.Quaternion()).angleTo(y.getWorldQuaternion(new T.Quaternion()))<1e-6,name+' world rotation');}}
for(const [lab,runtime,rest]of [['hand',hand,HAND_REST],['foot',foot,FOOT_REST]]){
 const base=new URL(`../../assets/${lab}-lab/`,import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base))),original=manifest.assets.filter(e=>!e.variant),entries=manifest.assets.filter(e=>e.variant==='biped'),reports=[],contacts={};
 const originalGame=await load(await fs.readFile(new URL(original.find(e=>e.lod===1).file,base))),originalRig=runtime.createRig(originalGame);
 for(const e of original)for(const packed of [false,true]){const bytes=await fs.readFile(new URL(packed?e.meshopt_file:e.file,base));assert.equal(sha(bytes),packed?e.meshopt_sha256:e.sha256,'Preserved original '+e.id);}
 let poseCount=0,minFloor=Infinity,minPipe=Infinity,maxStaticError=0;const swept=new T.Box3();let posedGameVertices;
 for(const e of entries)for(const packed of [false,true]){
  const file=packed?e.meshopt_file:e.file,bytes=await fs.readFile(new URL(file,base));assert.equal(bytes.length,packed?e.meshopt_bytes:e.bytes);assert.equal(sha(bytes),packed?e.meshopt_sha256:e.sha256);
  let decoded=bytes;if(packed){const doc=await io.readBinary(bytes);doc.getRoot().listExtensionsUsed().filter(x=>x.extensionName===EXTMeshoptCompression.EXTENSION_NAME).forEach(x=>x.dispose());await doc.transform(dequantize());decoded=await io.writeBinary(doc);}
  const result=await validator.validateBytes(decoded);assert.equal(result.issues.numErrors,0,file+' '+JSON.stringify(result.issues.messages.slice(0,6)));assert.equal(result.issues.numWarnings,0,file+' '+JSON.stringify(result.issues.messages.slice(0,6)));
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert(!json.images?.length&&!json.animations?.length);assert(json.buffers.every(b=>!b.uri));
  const root=await load(bytes),rig=runtime.createRig(root),meshes=[],names=[];let triangles=0;
  root.traverse(o=>{if(o!==root)names.push(o.name);if(o.isMesh){meshes.push(o);const g=o.geometry,ix=g.index,p=g.attributes.position,count=ix?.count||p.count;triangles+=count/3;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,ix?ix.getX(i):i);b.fromBufferAttribute(p,ix?ix.getX(i+1):i+1);c.fromBufferAttribute(p,ix?ix.getX(i+2):i+2);assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-22,file+' degenerate triangle');}if(g.attributes.skinWeight){const w=g.attributes.skinWeight;for(let i=0;i<w.count;i++)assert(w.getX(i)===1&&w.getY(i)===0&&w.getZ(i)===0&&w.getW(i)===0,'Rigid single-bone weighting');}}});
  assert(names.every(n=>n&&!n.includes('.')));assert.equal(new Set(names).size,names.length);assert.equal(meshes.length,1);assert.equal(triangles,e.triangles);assert.equal(e.draw_calls,1);assert.equal(e.engine_nodes.length,runtime.JOINTS.length);assert.equal(e.required_nodes.length,lab==='hand'?59:53);
  const budget=manifest.variants.biped.budgets['lod'+e.lod];assert(triangles<=budget.triangles&&bytes.length<=budget.bytes);assert(triangles<original.find(e=>e.lod===1).triangles*.2,'More than 80% fewer triangles');
  // Neutral game hierarchy matches original bind frames; frozen hierarchy matches the rest pose.
  if(e.static)originalRig.pose(rest);else{const neutral={};for(const j of runtime.JOINTS){const node=originalRig.nodes[j.name];neutral[j.name]=0;}if(lab==='hand')neutral.THUMB_CMC_ABDUCTION=.9;else{neutral.HALLUX_OPPOSITION=-.55;for(const d of foot.TOES)neutral[d.id+'_SPLAY']=d.spread*.25;}originalRig.pose(neutral);}
  compareNodes(root,originalGame,e.required_nodes);
  for(const s of e.sockets){assert(rig.nodes[s.node].getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<1e-6);assert(new T.Vector3(0,0,1).applyQuaternion(rig.nodes[s.node].getWorldQuaternion(q)).distanceTo(new T.Vector3(...s.normal))<1e-6);}
  if(!e.static){
   const samples=[{name:'biped_rest',pose:rest},...Object.entries(runtime.POSES).map(([name,pose])=>({name,pose:lab==='foot'&&name==='rail'?{...pose,fixture:'pipe'}:pose}))];
   for(const [name,m]of Object.entries(runtime.MOTIONS))for(let i=0;i<=120;i++)samples.push({name,pose:runtime.sampleMotion(i*m.duration_s/120,name)});
   for(const j of runtime.JOINTS)for(const value of [j.min,j.max])samples.push({name:j.name,pose:{...(lab==='foot'?foot.POSES.plant:hand.POSES.open),...(lab==='foot'?{lift:.11}:{}),[j.name]:value}});
   for(const {name,pose}of samples){rig.pose(pose);originalRig.pose(pose);compareNodes(root,originalGame,e.required_nodes);poseCount++;for(const p of vertices(root)){assert([p.x,p.y,p.z].every(Number.isFinite));minFloor=Math.min(minFloor,p.y);swept.expandByPoint(p);assert(p.y>-.0002,name+' floor '+p.y);assert(Math.abs(p.x)<.2&&Math.abs(p.z)<.2&&p.y<(lab==='foot'?.42:.4),'Reserved envelope');if(pose.fixture==='pipe'){const gap=Math.hypot(p.y-(foot.PIPE.center[1]-.22*(1-(pose.fixtureRise??1))),p.z-foot.PIPE.center[2])-foot.PIPE.radius;minPipe=Math.min(minPipe,gap);assert(gap>-.0002,name+' pipe penetration '+gap);}}}
   rig.pose(rest);posedGameVertices=vertices(root);
   // Finger pads curl toward the palm. Toe pads curl down while staying off the floor.
   originalRig.pose(lab==='hand'?hand.POSES.open:foot.POSES.plant);
   for(const id of (lab==='hand'?hand.DIGITS:foot.TOES).map(d=>d.id)){const a=rig.nodes['SOCKET_'+id+'_TIP'].getWorldPosition(new T.Vector3()),b=originalRig.nodes['SOCKET_'+id+'_TIP'].getWorldPosition(new T.Vector3());assert(lab==='hand'?a.z-b.z>.025:b.y-a.y>.006,'Inward curl '+id);}
   for(const j of runtime.JOINTS){rig.pose({...rest,[j.name]:j.min});assert(Math.abs(rig.nodes[j.name].rotation[j.axis]-j.min)<1e-7);rig.pose({...rest,[j.name]:j.max});assert(Math.abs(rig.nodes[j.name].rotation[j.axis]-j.max)<1e-7);}
   const first=runtime.JOINTS.find(j=>j.name.includes(lab==='hand'?'INDEX_PIP':'TOE_02_PIP')),other=runtime.JOINTS.find(j=>j.name.includes(lab==='hand'?'MIDDLE_PIP':'TOE_03_PIP'));rig.pose(rest);const before=rig.nodes[other.name].quaternion.clone();rig.pose({...rest,[first.name]:1});assert(before.angleTo(rig.nodes[other.name].quaternion)<1e-7);
   for(const [name,m]of Object.entries(runtime.MOTIONS)){rig.pose(runtime.sampleMotion(0,name));const before=rig.nodes[e.engine_nodes[0]].quaternion.clone();rig.pose(runtime.sampleMotion(m.duration_s,name));assert(before.angleTo(rig.nodes[e.engine_nodes[0]].quaternion)<1e-7);}
  }else{
   assert(rig.static);const before=vertices(root);rig.pose(lab==='hand'?hand.POSES.fist:foot.POSES.curl,{explode:1});const after=vertices(root);assert.equal(before.length,after.length);before.forEach((p,i)=>assert(p.distanceTo(after[i])<1e-10));
   // Every static vertex coincides with the articulated economy model in its rest pose.
   for(const p of before){let nearest=Infinity;for(const a of posedGameVertices)nearest=Math.min(nearest,p.distanceToSquared(a));maxStaticError=Math.max(maxStaticError,Math.sqrt(nearest));assert(nearest<4e-12,'Static geometry / articulated pose mismatch');}
  }
  reports.push({file,decoded:packed,triangles,draw_calls:1,bytes:bytes.length,gltf_errors:0,gltf_warnings:0});console.log('PASS',lab,file);
 }
 const hashes={};for(const name of ['runtime.js','biped.js','manifest.json'])hashes[name]=sha(await fs.readFile(new URL(name,base)));
 await fs.writeFile(new URL('biped/validation-report.json',base),JSON.stringify({status:'passed',source_sha256:hashes,reports,pose_samples:poseCount,min_sampled_floor_clearance_m:minFloor,min_sampled_pipe_clearance_m:lab==='foot'?minPipe:null,max_static_to_articulated_rest_vertex_error_m:maxStaticError,swept_bounds_m:{min:swept.min.toArray(),max:swept.max.toArray()},original_file_hashes_verified:true,required_names_preserved:true,scope:'Plain and decoded economy exports; every joint and socket compared with original across all sampled motions and axis limits; static geometry matches economical game at BIPED_REST; inward curl, ground/pipe clearance, independent joints and static lockout. Finite kinematics, not arbitrary-pose collision or force certification. No FPS claim.'},null,2)+'\n');
 console.log({lab,poseCount,minFloor,minPipe:lab==='foot'?minPipe:null,maxStaticError});
}
