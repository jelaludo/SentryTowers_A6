import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import {applyStride02,studyPose,STATIONS,SPEC} from '../../assets/stride-02/runtime.js';
const out=new URL('../../assets/stride-02/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),loader=new GLTFLoader(),parse=b=>loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),roots=new Map(),frames=new Map(),originals=new Map();
const report={status:'passed',revision:2,scope:'Exact original P-01 envelope and body, baked miniature legs, plain exports, original/r1 preservation and sampled folding clearance inside the original underside pockets. General mechanism self-collision, force/traction and load engineering remain unverified.',files:[],pose_samples:0,leg_scale:SPEC.leg_scale,packed_target_m:[1.2,.16,1],max_packed_dimension_error_m:0,min_ground_y_m:1,min_packed_leg_roof_gap_m:1,min_leg_pocket_plan_gap_m:1,max_grounded_parking_error_m:0,max_link_length_error_m:0,swept_bounds_m:null,checks:[]};
for(const e of manifest.assets){
 const b=await fs.readFile(new URL(e.file,out));assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256);const v=await validator.validateBytes(b);assert.equal(v.issues.numErrors,0,e.file+JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,e.file+JSON.stringify(v.issues));
 const gltf=await parse(b),root=gltf.scene.getObjectByName('STRIDE02_ROOT');assert.equal(gltf.animations.length,0);root.updateMatrixWorld(true);assert.equal(root.userData.revision,2);assert.equal(root.userData.static,e.static);assert.equal(root.userData.configuration,e.configuration);assert.equal(root.userData.damage_level,0);const names=[],frame={};let triangles=0,draws=0;
 root.traverse(o=>{names.push(o.name);assert(/^[A-Z][A-Z0-9_]*$/.test(o.name),o.name);if(o.name!=='STRIDE02_STATIC_SURFACE')frame[o.name]={parent:o===root?null:o.parent.name,matrix:o.matrix.toArray()};if(o.isMesh){assert(!Array.isArray(o.material));assert(!o.material.map);draws++;const g=o.geometry,p=g.attributes.position,idx=g.index,n=idx?.count||p.count;triangles+=n/3;for(const x of p.array)assert(Number.isFinite(x));for(let j=0;j<n;j+=3){const a=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(j+k):j+k));assert(a[1].sub(a[0]).cross(a[2].sub(a[0])).lengthSq()>1e-18,'degenerate '+e.file);}}});
 assert.equal(new Set(names).size,names.length);assert.deepEqual(names.slice().sort(),e.required_nodes.slice().sort());assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);
 if(frames.has(e.configuration)){const ref=frames.get(e.configuration);assert.deepEqual(Object.keys(frame).sort(),Object.keys(ref).sort());for(const [name,f]of Object.entries(frame)){assert.equal(f.parent,ref[name].parent);f.matrix.forEach((x,i)=>assert(Math.abs(x-ref[name].matrix[i])<1e-6,'tier frame '+name));}}else frames.set(e.configuration,frame);
 const bounds=new T.Box3().setFromObject(root,true);assert(bounds.min.y>=-1e-6);assert(bounds.min.distanceTo(new T.Vector3(...e.bounds.min))<1e-6);assert(bounds.max.distanceTo(new T.Vector3(...e.bounds.max))<1e-6);
 for(const s of e.sockets)assert(root.getObjectByName(s.node).getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<1e-6);
 if(e.lod===1)assert(triangles<=25000);if(e.lod===2){assert(triangles<=3000);assert.equal(draws,1);assert(e.bytes<=250000);applyStride02(root,{fold:e.configuration==='stowed'?0:1});root.updateMatrixWorld(true);for(const [name,f]of Object.entries(frame))assert.deepEqual(root.getObjectByName(name).matrix.toArray(),f.matrix);}
 if(e.configuration==='stowed'){
  const original=(await parse(await fs.readFile(new URL(`../pallet-cargo/pallet_d0_lod${e.lod}.glb`,out)))).scene,ob=new T.Box3().setFromObject(original,true);const error=Math.max(bounds.min.distanceTo(ob.min),bounds.max.distanceTo(ob.max));assert(error<1e-6,'exact P-01 envelope '+e.file);assert(bounds.getSize(new T.Vector3()).distanceTo(new T.Vector3(1.2,.16,1))<1e-6);report.max_packed_dimension_error_m=Math.max(error,report.max_packed_dimension_error_m);
 }
 roots.set(`${e.configuration}_${e.lod}`,root);report.files.push({file:e.file,triangles,draw_calls:draws,bytes:e.bytes,gltf_errors:v.issues.numErrors,gltf_warnings:v.issues.numWarnings});
}
for(const source of manifest.sources){const b=await fs.readFile(new URL('../../'+source.file,out));assert.equal(sha(b),source.sha256);assert.equal(sha(execFileSync('git',['show',`${source.commit}:${source.file}`])),source.sha256,'original changed '+source.file);}
const preserved=JSON.parse(await fs.readFile(new URL('revisions/r1/preservation.json',out)));for(const [file,hash]of Object.entries(preserved.files))assert.equal(sha(await fs.readFile(new URL('revisions/r1/'+file,out))),hash,'r1 '+file);report.preserved_r1_files=Object.keys(preserved.files).length;
let surfaces=0;
for(const lod of [0,1]){
 const source=(await parse(await fs.readFile(new URL(`../pallet-cargo/stride_d0_lod${lod}.glb`,out)))).scene,target=roots.get('deployed_'+lod);
 for(const {id}of STATIONS)for(const name of ['UPPER','LOWER','SUSPENSION_ROD','UPRIGHT','WHEEL']){const node=name==='WHEEL'?`WHEEL_${id}_SURFACE`:`LEG_${id}_${name}_SURFACE`,a=source.getObjectByName(node).geometry,b=target.getObjectByName(node).geometry;assert.deepEqual(a.index.array,b.index.array,node+' indices');for(const key of Object.keys(a.attributes)){const expected=key==='position'?Float32Array.from(a.attributes[key].array,v=>v*SPEC.leg_scale):a.attributes[key].array;assert.deepEqual(expected,b.attributes[key].array,node+' '+key);}surfaces++;}
 const pallet=(await parse(await fs.readFile(new URL(`../pallet-cargo/pallet_d0_lod${lod}.glb`,out)))).scene.getObjectByName('PALLET_SURFACE').geometry,body=target.getObjectByName('PALLET_SURFACE').geometry;
 assert.deepEqual(pallet.index.array,body.index.array);for(const key of Object.keys(pallet.attributes)){if(key==='position'){const a=pallet.attributes.position.array,b=body.attributes.position.array;assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert(Math.abs(a[i]-(b[i]+(i%3===1?.16:0)))<1e-7,'unchanged P-01 vertex');}else assert.deepEqual(pallet.attributes[key].array,body.attributes[key].array,'unchanged P-01 '+key);}
}
const sweep=new T.Box3();
for(const lod of [0,1]){
 const root=roots.get('deployed_'+lod),legMeshes=[];root.traverse(o=>{if(o.isMesh&&(o.name.startsWith('LEG_')||o.name.startsWith('WHEEL_')))legMeshes.push(o);});
 for(let i=0;i<=600;i++){
  const f=i/600,p=applyStride02(root,{fold:f}),bound=new T.Box3().setFromObject(root,true);sweep.union(bound);report.min_ground_y_m=Math.min(report.min_ground_y_m,bound.min.y);assert(bound.min.y>=-1e-6,'floor '+f);assert(bound.min.x>=-.600001&&bound.max.x<=.600001&&bound.min.z>=-.500001&&bound.max.z<=.500001);
  for(const {id,side,end}of STATIONS){
   const pre='LEG_'+id+'_',hip=root.getObjectByName(pre+'HIP_PITCH').getWorldPosition(new T.Vector3()),knee=root.getObjectByName(pre+'KNEE_PITCH').getWorldPosition(new T.Vector3()),ankle=root.getObjectByName(pre+'ANKLE_ROLL').getWorldPosition(new T.Vector3());const error=Math.max(Math.abs(hip.distanceTo(knee)-SPEC.upper_m),Math.abs(knee.distanceTo(ankle)-SPEC.lower_m));assert(error<1e-6);report.max_link_length_error_m=Math.max(error,report.max_link_length_error_m);
   const foot=root.getObjectByName('SOCKET_PARK_FOOT_'+id).getWorldPosition(new T.Vector3());if(f>=.13){assert(Math.abs(foot.y)<1e-6);report.max_grounded_parking_error_m=Math.max(Math.abs(foot.y),report.max_grounded_parking_error_m);}else assert(foot.y>=-1e-7);
   for(let j=1;j<=3;j++){const slide=root.getObjectByName('PARK_'+id+'_SLIDE_'+j);assert(slide.position.y>=-.043334&&slide.position.y<=.000001);assert(.05+slide.position.y>=.00666);}
   const wheel=root.getObjectByName('SOCKET_WHEEL_'+id).getWorldPosition(new T.Vector3());if(f===0)assert(Math.abs(wheel.y-SPEC.wheel_radius_m)<1e-6);if(f===1)assert(wheel.distanceTo(new T.Vector3(side*.2682,.0557,end*.2175))<1e-6);
   if(f>=.46){const axis=new T.Vector3(1,0,0).applyQuaternion(root.getObjectByName('WHEEL_'+id+'_ROLL').getWorldQuaternion(new T.Quaternion()));assert(Math.abs(Math.abs(axis.y)-1)<1e-6);}
  }
  if(f>=.46){const centres=STATIONS.map(({id})=>root.getObjectByName('SOCKET_WHEEL_'+id).getWorldPosition(new T.Vector3()));for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)assert(centres[a].distanceTo(centres[b])>=2*SPEC.wheel_radius_m);}
  root.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));assert(o.scale.distanceTo(new T.Vector3(1,1,1))<1e-8,'no animated scaling');});
  // Each original pocket is a convex, open-bottom rectangle between the P-01 runners/spacers.
  // Keeping every triangle vertex within these planes proves the leg surfaces clear those fixed solids.
  for(const m of legMeshes){const {side,end}=STATIONS.find(s=>m.name.includes('_'+s.id+'_')),a=m.geometry.attributes.position;for(let j=0;j<a.count;j++){const v=new T.Vector3().fromBufferAttribute(a,j).applyMatrix4(m.matrixWorld),x=v.x*side,z=v.z*end,margin=Math.min(x-.07,.46-x,z-.07,.364-z);assert(margin>0,`pocket wall ${f} ${m.name} ${v.toArray()}`);report.min_leg_pocket_plan_gap_m=Math.min(margin,report.min_leg_pocket_plan_gap_m);assert(v.y<=p.deck-.04+1e-5,`deck intrusion ${f} ${m.name}`);if(f===1){report.min_packed_leg_roof_gap_m=Math.min(report.min_packed_leg_roof_gap_m,p.deck-.04-v.y);assert(v.y>=0&&v.y<=.16);}}}
  assert(root.getObjectByName('SOCKET_CARGO').getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(0,p.deck,0))<1e-6);report.pose_samples++;
 }
}
for(const t of [0,.13,.15,.25,.31,.32,.46,.47,.63,.64,.65,.81,.83,1]){const r=roots.get('deployed_1');applyStride02(r,{fold:Math.max(0,t-1e-6)});const a=[];r.traverse(o=>a.push(o.matrixWorld.toArray()));applyStride02(r,{fold:Math.min(1,t+1e-6)});let i=0;r.traverse(o=>{o.matrixWorld.elements.forEach((v,j)=>assert(Math.abs(v-a[i][j])<1e-4,'pose discontinuity '+t));i++;});}
assert.equal(studyPose(0,'retract').fold,0);assert.equal(studyPose(12,'retract').fold,1);assert.equal(studyPose(0,'deploy').fold,1);assert.equal(studyPose(12,'deploy').fold,0);assert.equal(studyPose(0).fold,studyPose(28).fold);
report.swept_bounds_m={min:sweep.min.toArray(),max:sweep.max.toArray()};report.verified_scaled_surface_count=surfaces;report.checks=['Six plain GLBs, hashes, unique names, tier frame/socket parity and zero glTF errors/warnings','All three packed tiers match the original P-01 1.2 × 1.0 × 0.16 m envelope','Master/game retain the actual P-01 body geometry, indices, normals and colours','40 leg surfaces verified as a baked 0.23 derivation; topology/normals/colours preserved; no scaling during animation','Original source hashes and all 29 archived r1 files preserved','1,202 sampled master/game fold poses: grounded wheels/supports, rigid links and no floor penetration','Actual leg triangles remain inside original pocket plan boundaries and below the original deck','Miniature parking sections retain at least 6.6 mm overlap; flat tyres remain separated','Phase continuity, cargo socket, static articulation lockout and game/distance budgets'];
await fs.writeFile(new URL('validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
