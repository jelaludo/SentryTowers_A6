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
import {createRig,UPPER,LOWER,ROLL_RADIUS,STAND_HEIGHT,smooth} from '../../assets/tai09/runtime.js';
const dir=new URL('../../assets/tai09/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',dir))),reports=[];
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let baseline;let minClearance=Infinity,maxRigidError=0,maxFootError=0,maxStanceDrift=0,maxClosedRadius=0,minDeployClearance=Infinity,samples=0;
for(const e of manifest.assets)for(const packed of [false,true]){
 const file=packed?e.meshopt_file:e.file,b=await fs.readFile(new URL(file,dir));assert.equal(b.length,packed?e.meshopt_bytes:e.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),packed?e.meshopt_sha256:e.sha256);
 let vb=b;if(packed){const d=await io.readBinary(b);d.getRoot().listExtensionsUsed().filter(x=>x.extensionName===EXTMeshoptCompression.EXTENSION_NAME).forEach(x=>x.dispose());await d.transform(dequantize());vb=await io.writeBinary(d);}const result=await validator.validateBytes(vb);assert.equal(result.issues.numErrors,0,JSON.stringify(result.issues));assert.equal(result.issues.numWarnings,0,JSON.stringify(result.issues));
 const g=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');assert.equal(g.animations.length,0);const root=g.scene,rig=createRig(root,T),names=[],meshes=[];let tris=0,draws=0;
 root.traverse(o=>{if(o!==root){assert(o.name);names.push(o.name);}if(o.isMesh){meshes.push(o);tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draws+=o.geometry.groups.length||1;}});assert.equal(new Set(names).size,names.length);assert(names.every(n=>!n.includes('.')));assert.equal(tris,e.triangles);assert.equal(draws,e.draw_calls);
 const json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert(!json.images?.length);assert(json.buffers.every(x=>!x.uri));root.updateMatrixWorld(true);
 const positions={};for(const name of e.required_nodes){const o=root.getObjectByName(name);assert(o,name);positions[name]={p:o.position.toArray(),q:o.quaternion.toArray(),parent:o.parent.name};if(baseline){assert.equal(positions[name].parent,baseline[name].parent);assert(new T.Vector3(...positions[name].p).distanceTo(new T.Vector3(...baseline[name].p))<1e-5,name);assert(new T.Quaternion(...positions[name].q).angleTo(new T.Quaternion(...baseline[name].q))<1e-5,name);}}if(!baseline)baseline=positions;
 for(const s of e.sockets)assert(root.getObjectByName(s.node).getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<1e-5);
 for(const m of meshes){const a=m.geometry.attributes.position,ix=m.geometry.index,count=ix?.count||a.count;const p=new T.Vector3(),q=new T.Vector3(),r=new T.Vector3();for(let i=0;i<count;i+=3){p.fromBufferAttribute(a,ix?ix.getX(i):i);q.fromBufferAttribute(a,ix?ix.getX(i+1):i+1);r.fromBufferAttribute(a,ix?ix.getX(i+2):i+2);assert(p.toArray().every(Number.isFinite));assert(q.sub(p).cross(r.sub(p)).lengthSq()>1e-18,file+' degenerate');}}
 const bounds=new T.Box3().setFromObject(root,true);assert(bounds.min.distanceTo(new T.Vector3(...e.bounds.min))<.002);assert(bounds.max.distanceTo(new T.Vector3(...e.bounds.max))<.002);
 if(e.static){assert(rig.isStatic);assert.equal(meshes.length,1);assert(!meshes[0].isSkinnedMesh);assert(tris<3000&&e.bytes<250000);}
 else{
  if(e.lod===1)assert(tris<=25000);assert(meshes.every(m=>m.isSkinnedMesh));
  for(let j=0;j<=20;j++){const d=j/20,h=ROLL_RADIUS+(STAND_HEIGHT-ROLL_RADIUS)*smooth(d);rig.pose({deploy:d,height:h});root.updateMatrixWorld(true);for(const m of meshes){m.skeleton.update();for(const i of new Set(m.geometry.index.array)){const p=m.getVertexPosition(i,new T.Vector3());minDeployClearance=Math.min(minDeployClearance,p.y+h-.8);if(j===0)maxClosedRadius=Math.max(maxClosedRadius,p.clone().sub(new T.Vector3(0,.8,0)).length());}}samples++;}
  rig.pose({deploy:1,height:STAND_HEIGHT,phase:.02,stride:1,direction:[.6,.8]});root.updateMatrixWorld(true);const anchors=rig.legs.map(l=>l.foot.getWorldPosition(new T.Vector3()));
  rig.pose({deploy:1,height:STAND_HEIGHT,phase:.12,stride:1,direction:[.6,.8]});root.updateMatrixWorld(true);rig.legs.forEach((l,i)=>{const p=l.foot.getWorldPosition(new T.Vector3()).add(new T.Vector3(.6,0,.8).multiplyScalar(.1*.34/.65));maxStanceDrift=Math.max(maxStanceDrift,p.distanceTo(anchors[i]));});
  for(const direction of [[0,1],[.6,.8]])for(let phase=0;phase<1;phase+=1/60){rig.pose({deploy:1,direction,height:STAND_HEIGHT,phase,stride:1});root.updateMatrixWorld(true);for(const leg of rig.legs){const a=leg.hip.getWorldPosition(new T.Vector3()),b=leg.knee.getWorldPosition(new T.Vector3()),c=leg.ankle.getWorldPosition(new T.Vector3());maxRigidError=Math.max(maxRigidError,Math.abs(a.distanceTo(b)-UPPER),Math.abs(b.distanceTo(c)-LOWER));const p=(phase+(Number(leg.id)%2===0?.5:0))%1;if(p<=.65)maxFootError=Math.max(maxFootError,Math.abs(leg.foot.getWorldPosition(new T.Vector3()).y-(.8-STAND_HEIGHT)));}
   // Sample the entire rigid skin at representative gait poses.
   if(Math.round(phase*60)%5===0){for(const m of meshes){m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++){const p=m.getVertexPosition(i,new T.Vector3());minClearance=Math.min(minClearance,p.y+STAND_HEIGHT-.8);}}samples++;}
  }
 }
 reports.push({file,decoded:packed,triangles:tris,draw_calls:draws,bytes:b.length,gltf_errors:0,gltf_warnings:0});console.log('PASS',file);
}
assert(maxRigidError<.0001);assert(maxFootError<.005,'contact height error '+maxFootError);assert(maxStanceDrift<.001);assert(maxClosedRadius<.96);assert(minDeployClearance>-.002);
await fs.writeFile(new URL('validation-report.json',dir),JSON.stringify({status:'passed',reports,pose_samples:samples,min_sampled_mesh_floor_clearance_m:minClearance,min_deploy_floor_clearance_m:minDeployClearance,max_closed_radius_m:maxClosedRadius,max_rigid_segment_error_m:maxRigidError,max_foot_contact_height_error_m:maxFootError,max_straight_stance_drift_m:maxStanceDrift,dynamics_report:'dynamics-validation.json',limitations:['No general self-collision certification','Assisted winch and planar adhesion; no general rigid-body or rope simulation','No FPS measurement']},null,2)+'\n');console.log({minClearance,maxRigidError,maxFootError,maxStanceDrift,maxClosedRadius,minDeployClearance,samples});
