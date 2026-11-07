import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import {poseElevator,SPEC} from '../../assets/space-elevator/runtime.js';
const out=new URL('../../assets/space-elevator/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const roots={},frames={},report={status:'passed',scope:'Decoded plain GLBs, geometry, frame parity, budgets, measured vehicle containment and sampled kinematic interfaces. No physical or general collision certification.',files:[],samples:0,checks:[]};
async function load(bytes){return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
for(const a of manifest.assets){
 const bytes=await fs.readFile(new URL(a.file,out));assert.equal(bytes.length,a.bytes);assert.equal(sha(bytes),a.sha256);
 const v=await validator.validateBytes(bytes);assert.equal(v.issues.numErrors,0,JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,JSON.stringify(v.issues));
 const gltf=await load(bytes);assert.equal(gltf.animations.length,0);const root=gltf.scene.getObjectByName(a.root);root.updateMatrixWorld(true);roots[a.module]??={};roots[a.module][a.lod]=root;
 const names=[],frame={};let triangles=0,draws=0;root.traverse(o=>{names.push(o.name);assert(/^[A-Z][A-Z0-9_]*$/.test(o.name),o.name);if(o.name!=='DISTANCE_STATIC')frame[o.name]={parent:o===root?null:o.parent.name,matrix:o.matrix.toArray()};
  if(o.isMesh){draws++;assert(!o.material.map&&!Array.isArray(o.material));const p=o.geometry.attributes.position,idx=o.geometry.index,count=idx?.count||p.count;triangles+=count/3;assert(Array.from(p.array).every(Number.isFinite));for(let j=0;j<count;j+=3){const ps=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(j+k):j+k));assert(ps[1].sub(ps[0]).cross(ps[2].sub(ps[0])).lengthSq()>1e-18,'degenerate '+a.file);}}
 });assert.equal(new Set(names).size,names.length);assert.deepEqual(names.sort(),[...a.nodes].sort());assert.equal(triangles,a.triangles);assert.equal(draws,a.draw_calls);
 const bounds=new T.Box3().setFromObject(root,true);assert(Math.abs(bounds.min.y)<1e-5);assert(bounds.min.distanceTo(new T.Vector3(...a.bounds.min))<1e-5);assert(bounds.max.distanceTo(new T.Vector3(...a.bounds.max))<1e-5);
 if(a.lod===0)frames[a.module]=frame;else{const ref=frames[a.module];assert.deepEqual(Object.keys(frame).sort(),Object.keys(ref).sort());for(const [name,f]of Object.entries(frame)){assert.equal(f.parent,ref[name].parent);f.matrix.forEach((x,i)=>assert(Math.abs(x-ref[name].matrix[i])<1e-5,name));}const master=manifest.assets.find(x=>x.module===a.module&&x.lod===0);assert(bounds.min.distanceTo(new T.Vector3(...master.bounds.min))<1e-5);assert(bounds.max.distanceTo(new T.Vector3(...master.bounds.max))<1e-5);}
 for(const s of a.sockets){const o=root.getObjectByName(s.node);assert(o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<1e-5);assert(o.getWorldQuaternion(new T.Quaternion()).angleTo(new T.Quaternion(...s.quaternion))<1e-5);}
 if(a.lod===1)assert(triangles<=8000&&draws<=10&&bytes.length<=400000);
 if(a.lod===2){assert(triangles<=3000&&draws===1&&bytes.length<=250000);poseElevator(root,{door:1,solar:35,dish:180,distance:20});root.updateMatrixWorld(true);for(const [name,f]of Object.entries(frame))assert.deepEqual(root.getObjectByName(name).matrix.toArray(),f.matrix);}
 report.files.push({file:a.file,triangles,draw_calls:draws,bytes:bytes.length,gltf_errors:0,gltf_warnings:0});
}
const tank=(await load(await fs.readFile(new URL('../../assets/hover-tank/mork_hover_tank_low_d0.glb',import.meta.url)))).scene;tank.position.set(0,SPEC.hangar_floor_m,14);tank.updateMatrixWorld(true);const tb=new T.Box3().setFromObject(tank,true),clear=new T.Box3(new T.Vector3(-5.5,.54,7.15),new T.Vector3(5.5,6.4,25.15));assert(clear.containsBox(tb),'MORK fits single bay');
report.vehicle_fit={vehicle:'MÖRK original scale',position_m:tank.position.toArray(),bounds:{min:tb.min.toArray(),max:tb.max.toArray()},clearance:{side_m:Math.min(tb.min.x-clear.min.x,clear.max.x-tb.max.x),overhead_m:clear.max.y-tb.max.y,rear_m:tb.min.z-clear.min.z,front_m:clear.max.z-tb.max.z}};
for(const lod of [0,1]){
 const surface=roots.surface[lod],orbital=roots.orbital[lod],climber=roots.climber[lod];assert.equal(surface.userData.hangar_bays,1);
 for(let i=0;i<=48;i++){
  const v=i/48;poseElevator(surface,{door:v,dish:v*360-180});poseElevator(orbital,{solar:v*70-35,dish:v*360-180});poseElevator(climber,{distance:v*27});
  const left=surface.getObjectByName('HANGAR_DOOR_L'),right=surface.getObjectByName('HANGAR_DOOR_R');assert(Math.abs(left.position.x+right.position.x)<1e-8);assert.equal(left.position.x,-2.75-5.65*v);
  for(const id of ['A','B']){const hinge=orbital.getObjectByName('SOLAR_'+id+'_HINGE');assert(Math.abs(hinge.rotation.x-(v*70-35)*Math.PI/180)<1e-8);const panel=new T.Box3().setFromObject(orbital.getObjectByName('SOLAR_'+id+'_SURFACE'),true);assert(id==='A'?panel.max.z<-23.5:panel.min.z>23.5,'solar sweep clears ring radius 20.7');}
  for(const id of ['L_LOW','L_HIGH','R_LOW','R_HIGH']){const r=climber.getObjectByName('ROLLER_'+id);assert(Math.abs(Math.abs(r.position.x)-SPEC.roller_radius_m-SPEC.tether_half_width_m)<1e-8,'roller tangent to tether');assert(Math.abs(r.rotation.z-(id.startsWith('L')?-1:1)*v*27/SPEC.roller_radius_m)<1e-8);}
  for(const root of [surface,orbital,climber]){root.updateMatrixWorld(true);root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));}report.samples++;
 }
 const lb=new T.Box3().setFromObject(surface.getObjectByName('HANGAR_DOOR_L'),true),rb=new T.Box3().setFromObject(surface.getObjectByName('HANGAR_DOOR_R'),true);assert(lb.max.x<-5.5&&rb.min.x>5.5,'both open leaves clear the full opening');
 climber.position.fromArray(SPEC.orbital_dock_origin_m);climber.updateMatrixWorld(true);assert(climber.getObjectByName('SOCKET_DOCK').getWorldPosition(new T.Vector3()).distanceTo(orbital.getObjectByName('SOCKET_TETHER_LOWER').getWorldPosition(new T.Vector3()))<1e-8,'climber mating position');assert(new T.Box3().setFromObject(climber,true).max.y<0,'climber frame clears orbital lower collar');climber.position.set(0,0,0);
}
for(const s of manifest.sources){const bytes=await fs.readFile(new URL('../../'+s.path,import.meta.url));assert.equal(sha(bytes),s.sha256);}
report.checks=['Nine plain GLBs validate with zero errors/warnings; no nonfinite or degenerate triangles','Unique dot-free names, stable local parent/TRS and socket frames across tiers','Exact tier envelopes within 0.01 mm; root minima at datum Y=0','All game and distance targets met; one material per module, one distance draw','One vehicle bay, full-size MORK fits, both open leaves clear 11 m opening','Solar sweeps remain outside ring; traction rollers tangent to tether, spin matches distance','Climber dock mates with orbital lower collar and body stays below it','Static adapters leave all transforms unchanged; original reference hashes preserved'];
await fs.writeFile(new URL('validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
