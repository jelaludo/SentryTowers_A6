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
import {applyPose,motions,legs,UPPER,BASE_LOWER,MAX_LOWER} from '../../assets/nih-dairia-mech/runtime.js';
const base=new URL('../../assets/nih-dairia-mech/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base))),reports=[];
await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let baseline,baselineBounds,poseSamples=0,minClearance=Infinity,maxContactError=0,maxRigidError=0,maxStanceDrift=0;const sweptBounds=new T.Box3();
for(const e of manifest.assets)for(const compressed of [false,true]){
 const file=compressed?e.meshopt_file:e.file,bytes=await fs.readFile(new URL(file,base));assert.equal(bytes.length,compressed?e.meshopt_bytes:e.bytes);assert.equal(sha(bytes),compressed?e.meshopt_sha256:e.sha256);
 let check=bytes;
 if(compressed){const doc=await io.readBinary(bytes);doc.getRoot().listExtensionsUsed().filter(x=>x.extensionName===EXTMeshoptCompression.EXTENSION_NAME).forEach(x=>x.dispose());await doc.transform(dequantize());check=await io.writeBinary(doc);}
 const result=await validator.validateBytes(check);assert.equal(result.issues.numErrors,0,JSON.stringify(result.issues));assert.equal(result.issues.numWarnings,0,JSON.stringify(result.issues));
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const root=gltf.scene;root.updateMatrixWorld(true);assert.equal(gltf.animations.length,0);
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.equal(json.images?.length||0,0);assert(json.buffers.every(b=>!b.uri));
 const names=[],meshes=[],hierarchy={};let triangles=0,draws=0;
 root.traverse(o=>{
  if(o!==root){assert(o.name);names.push(o.name);}if(!o.isMesh)return;meshes.push(o);draws++;
  const g=o.geometry,p=g.attributes.position,ix=g.index,count=ix?ix.count:p.count;triangles+=count/3;
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(let j=0;j<count;j+=3){a.fromBufferAttribute(p,ix?ix.getX(j):j);b.fromBufferAttribute(p,ix?ix.getX(j+1):j+1);c.fromBufferAttribute(p,ix?ix.getX(j+2):j+2);assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-16,file+' degenerate triangle');}
 });
 assert.equal(new Set(names).size,names.length);assert(names.every(n=>!n.includes('.')));assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);
 for(const name of e.required_nodes){const o=root.getObjectByName(name);assert(o,name);hierarchy[name]={parent:o.parent.name,position:o.getWorldPosition(new T.Vector3()).toArray(),quaternion:o.getWorldQuaternion(new T.Quaternion()).toArray()};}
 if(!baseline)baseline=hierarchy;else for(const name of e.required_nodes){assert(baseline[name],name);assert.equal(hierarchy[name].parent,baseline[name].parent);assert(new T.Vector3(...hierarchy[name].position).distanceTo(new T.Vector3(...baseline[name].position))<.0001,name+' position');assert(new T.Quaternion(...hierarchy[name].quaternion).angleTo(new T.Quaternion(...baseline[name].quaternion))<.0001,name+' rotation');}
 for(const s of e.sockets)assert(root.getObjectByName(s.node).getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<.0001);
 const bounds=new T.Box3().setFromObject(root,true);assert(Math.abs(bounds.min.y)<.012);if(!baselineBounds)baselineBounds=bounds;else{assert(bounds.min.distanceTo(baselineBounds.min)<.01);assert(bounds.max.distanceTo(baselineBounds.max)<.01);}
 if(e.lod){const budget=manifest.budgets['lod'+e.lod];assert(triangles<=budget.triangles);if(budget.draw_calls)assert(draws<=budget.draw_calls);if(budget.bytes)assert(e.bytes<=budget.bytes);}
 if(e.lod<2){
  for(const mode of Object.keys(motions))for(const extension of [0,1])for(let k=0;k<=32;k++){
   const t=motions[mode].duration_s*k/32,state=applyPose(root,t,mode,extension);poseSamples++;
   for(const f of state.feet){const pre='LEG_'+f.id,foot=root.getObjectByName(pre+'_CONTACT').getWorldPosition(new T.Vector3()),error=foot.distanceTo(new T.Vector3(...f.target));maxContactError=Math.max(maxContactError,error);assert(error<.0002,`${file} ${mode} ${t} ${pre} target error ${error}`);
    const hp=root.getObjectByName(pre+'_HIP').getWorldPosition(new T.Vector3()),kn=root.getObjectByName(pre+'_KNEE').getWorldPosition(new T.Vector3()),an=root.getObjectByName(pre+'_ANKLE').getWorldPosition(new T.Vector3());maxRigidError=Math.max(maxRigidError,Math.abs(hp.distanceTo(kn)-UPPER));assert(Math.abs(hp.distanceTo(kn)-UPPER)<.0001);assert(kn.distanceTo(an)>=BASE_LOWER-.0001&&kn.distanceTo(an)<=MAX_LOWER+.0001);
   }
   // Full deformed geometry, not only contact sockets, against the plane.
   const v=new T.Vector3();for(const o of meshes){for(let j=0;j<o.geometry.attributes.position.count;j++){o.getVertexPosition(j,v);v.applyMatrix4(o.matrixWorld);sweptBounds.expandByPoint(v);minClearance=Math.min(minClearance,v.y);assert(v.y>=-.0015,`${file} ${mode} ${t}: below ground ${v.y}`);assert(Math.abs(v.x)<4.5&&Math.abs(v.z)<4.5&&v.y<2.6,'Reserved envelope');}}
  }
  // Translate the in-place gait at its declared speed: stance contacts stay fixed.
  for(const leg of legs){let previous=null;for(let k=0;k<300;k++){const t=k*.01,s=applyPose(root,t,'walk',0),f=s.feet.find(x=>x.id===leg.id);const p=root.getObjectByName('LEG_'+leg.id+'_CONTACT').getWorldPosition(new T.Vector3());p.z+=t*.3;if(f.stance&&previous&&previous.stance){const drift=p.distanceTo(previous.p);maxStanceDrift=Math.max(maxStanceDrift,drift);assert(drift<.0001);}previous={p,stance:f.stance};}}
  // A one-shot must hold its terminal brace pose.
  applyPose(root,8,'anchor');const q=root.getObjectByName('LEG_01_CONTACT').getWorldPosition(new T.Vector3());applyPose(root,40,'anchor');assert(q.distanceTo(root.getObjectByName('LEG_01_CONTACT').getWorldPosition(new T.Vector3()))<1e-8);
 }
 reports.push({file,decoded:compressed,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:0,gltf_warnings:0});console.log('PASS',file);
}
await fs.writeFile(new URL('validation-report.json',base),JSON.stringify({status:'passed',reports,pose_samples:poseSamples,sampled_swept_bounds_m:{min:sweptBounds.min.toArray(),max:sweptBounds.max.toArray()},min_mesh_clearance_m:minClearance,max_contact_target_error_m:maxContactError,max_upper_rigid_error_m:maxRigidError,max_stance_step_drift_m:maxStanceDrift,scope:'All vertices sampled in four behaviors and zero/full hydraulic extension, plain and decoded. Flat support plane; no self-collision or force-based terrain certification.'},null,2)+'\n');
console.log({poseSamples,minClearance,maxContactError,maxRigidError,maxStanceDrift});
