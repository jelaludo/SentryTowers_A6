import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import validator from 'gltf-validator';import {createRig,fieldState,strandState,curve,curveFrame,FOCI,dot,sub,norm,ATTENTION_EVENTS,attentionDirection,PRECISION_FOCUS} from '../../assets/senzai-kk01/runtime.js';
const root=new URL('../../',import.meta.url),out=new URL('assets/senzai-kk01/',root),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),report={status:'passed',exports:[],preserved_v1:0,motion:{samples:0,min_active:48,max_active:0,peak_shift_speed_m_s:0,max_curve_deviation_m:0,minimum_ground_clearance_m:100},scope:'Plain GLB structure, geometry, curves and source preservation; engine-driven pose/loop validation. No compressed release or FPS claim.'};
for(const [p,h]of Object.entries({...manifest.source_sha256,...manifest.based_on.preserved_v1}))assert.equal(sha(await fs.readFile(new URL(p,root))),h,p);report.preserved_v1=Object.keys(manifest.based_on.preserved_v1).length;
let namesRef;for(const entry of manifest.assets){const bytes=await fs.readFile(new URL(entry.file,out));assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256);const jsonLength=bytes.readUInt32LE(12),glbJson=JSON.parse(bytes.subarray(20,20+jsonLength));assert(glbJson.asset.copyright.includes('Jelaludo'));const sourceBytes=await fs.readFile(new URL(entry.source_file,root));assert.equal(sha(sourceBytes),entry.source_sha256);assert(bytes.subarray(20+jsonLength).equals(sourceBytes.subarray(20+sourceBytes.readUInt32LE(12))),'Binary geometry changed');const v=await validator.validateBytes(bytes,{maxIssues:1000});assert.equal(v.issues.numErrors,0,JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,JSON.stringify(v.issues));const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene,rig=createRig(scene),names=[];let tris=0,draws=0,degenerate=0;scene.traverse(n=>{if(n.name)names.push(n.name);if(!n.isMesh)return;draws++;const g=n.geometry,p=g.attributes.position,ix=g.index,count=ix?.count||p.count;tris+=count/3;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let j=0;j<count;j+=3){a.fromBufferAttribute(p,ix?ix.getX(j):j);b.fromBufferAttribute(p,ix?ix.getX(j+1):j+1);c.fromBufferAttribute(p,ix?ix.getX(j+2):j+2);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-20)degenerate++;}for(const v of p.array)assert(Number.isFinite(v));});assert.equal(degenerate,0);assert.equal(tris,entry.triangles);assert.equal(draws,entry.draw_calls);assert.equal(new Set(names).size,names.length);assert(names.every(n=>!n.includes('.')));if(namesRef)assert.deepEqual(names.sort(),namesRef);else namesRef=names.sort();
 if(entry.lod<2){const mesh=scene.getObjectByName('LIVING_ATTENTION');for(const name of ['_fiberid','_along','_offset','_localnormal','_glow'])assert(mesh.geometry.attributes[name]);for(const t of [0,5,10.75,15,27.5,28.1,29.8,31,32.5,35,49.75,58,68,71.999,72]){const state=rig.pose(t);assert.deepEqual(rig.frame.position.toArray(),state.center);const box=new T.Box3().setFromObject(scene,true);assert(box.min.y>0&&box.max.y<64);for(const a of ['x','z'])assert(box.min[a]>-50&&box.max[a]<50);for(let i=0;i<48;i++){const tip=curve(i,1,state);assert(rig.tips[i].position.distanceTo(new T.Vector3(...tip))<1e-7);}}
  rig.pose(0);const before=Float32Array.from(mesh.geometry.attributes.position.array),color=Float32Array.from(mesh.geometry.attributes.color.array);rig.pose(72);assert.deepEqual(mesh.geometry.attributes.position.array,before);assert.deepEqual(mesh.geometry.attributes.color.array,color);rig.pose(15,{awake:0});assert.equal(rig.pose(15,{awake:0}).active,0);
 }else{assert.equal(draws,1);assert(tris<=3000);assert(entry.bytes<=250000);rig.pose(0);const before=rig.frame.position.clone();rig.pose(35);assert(rig.frame.position.equals(before));}
 report.exports.push({lod:entry.lod,triangles:tris,draw_calls:draws,bytes:entry.bytes,unique_nodes:names.length,degenerate_triangles:0,validator:{errors:v.issues.numErrors,warnings:v.issues.numWarnings,info:v.issues.numInfos}});
}
for(let step=0;step<720;step++){const state=fieldState(step/10),states=Array.from({length:48},(_,i)=>strandState(i,state)),active=states.filter(s=>s.level>.03).length;report.motion.samples++;report.motion.min_active=Math.min(report.motion.min_active,active);report.motion.max_active=Math.max(report.motion.max_active,active);report.motion.peak_shift_speed_m_s=Math.max(report.motion.peak_shift_speed_m_s,Math.hypot(...state.velocity));for(let i=0;i<48;i++){const start=new T.Vector3(...curve(i,0,state)),end=new T.Vector3(...curve(i,1,state)),mid=new T.Vector3(...curve(i,.5,state)),line=new T.Line3(start,end),closest=line.closestPointToPoint(mid,true,new T.Vector3());report.motion.max_curve_deviation_m=Math.max(report.motion.max_curve_deviation_m,mid.distanceTo(closest));for(const u of [0,.25,.5,.75,1]){const p=curve(i,u,state).map((v,k)=>v+state.center[k]);report.motion.minimum_ground_clearance_m=Math.min(report.motion.minimum_ground_clearance_m,p[1]);assert(p[0]>-50&&p[0]<50&&p[1]>0&&p[1]<64&&p[2]>-50&&p[2]<50);}}}
assert(report.motion.max_curve_deviation_m>.5);assert(report.motion.peak_shift_speed_m_s>20);assert(report.motion.min_active>=24);assert(report.motion.max_active>=38);for(const [t,index]of [[15,0],[35,1],[55,2]]){const s=fieldState(t);assert.equal(s.index,index);assert(dot(s.facing,norm(sub(FOCI[index],s.center)))>.99999);}
for(const t of [0,10,11.5,29,30.6,49,50.5,67,69,72]){const before=fieldState(t-.00001),after=fieldState(t+.00001);assert(Math.hypot(...sub(before.center,after.center))<.001);assert(Math.hypot(...sub(before.facing,after.facing))<.001);}
// Behavioral checks: movement of actual endpoints, target-facing tangents, fixed
// roots, coordinated acquisition, living dormancy and continuity when scrubbing.
const motion=report.motion;
const spans=Array.from({length:48},()=>({min:Infinity,max:-Infinity}));
let alignedSum=0,alignedCount=0;
for(let step=0;step<1440;step++){
 const state=fieldState(step/20);state.states=Array.from({length:48},(_,i)=>strandState(i,state));
 for(let i=0;i<48;i++){
  const root=curve(i,0,state);assert(Math.hypot(...sub(root,attentionDirection(i).map(v=>v*8.2)))<1e-8);
  const tip=curve(i,1,state),radius=Math.hypot(...tip);spans[i].min=Math.min(spans[i].min,radius);spans[i].max=Math.max(spans[i].max,radius);
  if(state.states[i].commit>.8&&state.age>.9&&state.age<1.6){alignedSum+=dot(curveFrame(i,1,state).t,norm(sub(sub(state.focus,state.center),tip)));alignedCount++;}
 }
}
motion.minimum_tip_radius_swing_m=Math.min(...spans.map(s=>s.max-s.min));
motion.maximum_tip_radius_swing_m=Math.max(...spans.map(s=>s.max-s.min));
motion.mean_locked_tip_target_alignment=alignedSum/alignedCount;
assert(motion.minimum_tip_radius_swing_m>7);assert(motion.mean_locked_tip_target_alignment>.93);
motion.acquisitions=ATTENTION_EVENTS.map(({at,to})=>{
 const before=fieldState(at),locked=fieldState(at+.7);
 const count=s=>Array.from({length:48},(_,i)=>strandState(i,s)).filter(f=>f.commit>.3).length;
 assert.equal(count(before),0);if(at===PRECISION_FOCUS.at_s)assert.equal(count(locked),15);else assert(count(locked)>=18);assert.equal(locked.index,to);
 return {at_s:at,focus:to,recruited_after_700ms:count(locked)};
});
let dormantMotion=0;for(let i=0;i<48;i++)dormantMotion+=Math.hypot(...sub(curve(i,1,fieldState(3,0)),curve(i,1,fieldState(5,0))));
motion.mean_dormant_tip_travel_over_2s_m=dormantMotion/48;assert(motion.mean_dormant_tip_travel_over_2s_m>.5);
for(const t of [0,72,...ATTENTION_EVENTS.flatMap(e=>[e.at,e.at+.48,e.at+4.75,...(e.at===27?[27.8,31.1,33.5,33.7]:[])])]){
 const before=fieldState(t-.00001),after=fieldState(t+.00001);
 for(let i=0;i<48;i++)for(const u of [.25,.5,1])assert(Math.hypot(...sub(curve(i,u,before),curve(i,u,after)))<.01,`Discontinuous strand ${i} at ${t}`);
}
// Inspect the actual endpoints in world space throughout the moving-body hold.
motion.precision_focus={samples:0,members:15,max_tip_diameter_m:0,max_distance_to_spot_m:0,max_scanning_travel_m:0,min_tip_alignment:1};
const precisionReport=motion.precision_focus,firstTips=new Map();let memberIds;
for(let step=0;step<=60;step++){
 const state=fieldState(28.1+step*.05);state.states=Array.from({length:48},(_,i)=>strandState(i,state));
 const ids=state.states.map((s,i)=>s.precision>.999?i:-1).filter(i=>i>=0);assert.equal(ids.length,15);
 if(memberIds)assert.deepEqual(ids,memberIds);else memberIds=ids;
 const positions=ids.map(i=>curve(i,1,state).map((v,k)=>v+state.center[k]));
 for(let j=0;j<ids.length;j++){
  const p=positions[j],id=ids[j];if(!firstTips.has(id))firstTips.set(id,p);
  precisionReport.max_distance_to_spot_m=Math.max(precisionReport.max_distance_to_spot_m,Math.hypot(...sub(p,FOCI[1])));
  precisionReport.max_scanning_travel_m=Math.max(precisionReport.max_scanning_travel_m,Math.hypot(...sub(p,firstTips.get(id))));
  precisionReport.min_tip_alignment=Math.min(precisionReport.min_tip_alignment,dot(curveFrame(id,1,state).t,norm(sub(FOCI[1],p))));
  for(const other of positions)precisionReport.max_tip_diameter_m=Math.max(precisionReport.max_tip_diameter_m,Math.hypot(...sub(p,other)));
 }
 precisionReport.samples++;
}
assert(precisionReport.max_tip_diameter_m<2.2);assert(precisionReport.max_distance_to_spot_m<1.9);
assert(precisionReport.max_scanning_travel_m>.05&&precisionReport.max_scanning_travel_m<.5);
assert(precisionReport.min_tip_alignment>.99);
assert(Array.from({length:48},(_,i)=>strandState(i,fieldState(29.8,0))).every(s=>s.precision===0));
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
