import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {applyPose,gaits,limbs,COUNT,lengths} from '../../assets/rokuroku66/runtime.js';
const base=new URL('../../assets/rokuroku66/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base)));
await MeshoptDecoder.ready;
function hull(points){
 const ps=points.toSorted((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),lo=[],hi=[];
 for(const p of ps){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
 for(const p of ps.toReversed()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}return lo.slice(0,-1).concat(hi.slice(0,-1));
}
const reports=[];
for(const e of manifest.assets.filter(e=>e.lod<2))for(const compressed of [false,true]){
 const file=compressed?e.meshopt_file:e.file,b=await fs.readFile(new URL(file,base)),root=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
 for(const mode of ['walk','scout']){
  const g=gaits[mode],v=new T.Vector3(),prev=new Map();let minFloor=Infinity,maxTargetError=0,maxStanceDrift=0,minSupport=Infinity,minSensors=Infinity,maxAngle=0,maxLinkError=0,minContacts=6,maxContacts=0,minSwingPeak=Infinity;
  const peaks=Object.fromEntries(limbs.filter(l=>!g.sensors.includes(l.id)).map(l=>[l.id,0]));
  for(let i=0;i<=96;i++){
   const t=g.duration_s*i/96,s=applyPose(root,t,mode);minContacts=Math.min(minContacts,s.contacts);maxContacts=Math.max(maxContacts,s.contacts);assert.deepEqual(s.sensors,g.sensors);assert.equal(s.feet.length,mode==='walk'?6:4);
   for(const l of limbs){for(const a of s.poses[l.id])for(const x of a){maxAngle=Math.max(maxAngle,Math.abs(x));assert(Math.abs(x)<=.72,'Unclamped joint limit');}
    for(let j=1;j<=COUNT;j++){const start=root.getObjectByName(`LIMB_${l.id}_V${String(j).padStart(2,'0')}_PITCH`).getWorldPosition(new T.Vector3()),end=root.getObjectByName(j===COUNT?'SOCKET_LIMB_'+l.id+'_TIP':`LIMB_${l.id}_V${String(j+1).padStart(2,'0')}_YAW`).getWorldPosition(new T.Vector3());maxLinkError=Math.max(maxLinkError,Math.abs(start.distanceTo(end)-lengths[j-1]));}
   }
   for(const f of s.feet){const p=root.getObjectByName('SOCKET_LIMB_'+f.id+'_TIP').getWorldPosition(new T.Vector3());maxTargetError=Math.max(maxTargetError,p.distanceTo(new T.Vector3(...f.target)));if(!f.stance)peaks[f.id]=Math.max(peaks[f.id],p.y);p.z+=t*g.speed_m_s;const last=prev.get(f.id);if(f.stance&&last?.stance&&f.phase>=last.phase)maxStanceDrift=Math.max(maxStanceDrift,p.distanceTo(last.p));prev.set(f.id,{p,stance:f.stance,phase:f.phase});}
   const h=hull(s.feet.filter(f=>f.stance).map(f=>[f.target[0],f.target[2]])),body=s.bodyPosition;
   for(let j=0;j<h.length;j++){const a=h[j],b=h[(j+1)%h.length];minSupport=Math.min(minSupport,((b[0]-a[0])*(body[2]-a[1])-(b[1]-a[1])*(body[0]-a[0]))/Math.hypot(b[0]-a[0],b[1]-a[1]));}
   for(const id of s.sensors){const tip=root.getObjectByName('SOCKET_LIMB_'+id+'_TIP').getWorldPosition(v);minSensors=Math.min(minSensors,tip.y);assert(tip.z>3,'Sensors stay in front');assert(id==='01'?tip.x<0:tip.x>0,'Sensor pair remains separated');}
   for(const o of meshes)for(let j=0;j<o.geometry.attributes.position.count;j++){o.getVertexPosition(j,v);v.applyMatrix4(o.matrixWorld);minFloor=Math.min(minFloor,v.y);assert(Math.abs(v.x)<6&&Math.abs(v.z)<6&&v.y<8,'Reserved envelope');}
  }
  minSwingPeak=Math.min(...Object.values(peaks));assert(minFloor>=-.0015,`${mode} floor ${minFloor}`);assert(maxTargetError<.0001,`${mode} target error ${maxTargetError}`);assert(maxStanceDrift<.0001,`${mode} planted drift ${maxStanceDrift}`);assert(maxLinkError<.0001);assert(minSupport>.01,`${mode} projected body outside support polygon: ${minSupport}`);assert(minContacts===(mode==='walk'?4:3));assert(minSwingPeak>.48);if(mode==='scout')assert(minSensors>.6);
  applyPose(root,0,mode);const first=new Map(e.required_nodes.map(name=>[name,root.getObjectByName(name).matrixWorld.clone()]));applyPose(root,g.duration_s,mode);for(const [name,m]of first){const n=root.getObjectByName(name).matrixWorld;assert(n.elements.every((v,i)=>Math.abs(v-m.elements[i])<1e-6),'Loop closure '+name);}
  // Leaving locomotion must restore the original body orientation and position.
  applyPose(root,0,'extended');assert(root.getObjectByName('BODY_HEAVE').quaternion.angleTo(new T.Quaternion())<1e-8);
  const r={file,mode,decoded:compressed,pose_samples:97,min_contacts:minContacts,max_contacts:maxContacts,min_mesh_floor_clearance_m:minFloor,max_target_error_m:maxTargetError,max_world_stance_drift_m:maxStanceDrift,min_projected_body_support_margin_m:minSupport,min_sensor_tip_height_m:mode==='scout'?minSensors:null,min_swing_peak_height_m:minSwingPeak,max_joint_angle_rad:maxAngle,max_rigid_link_error_m:maxLinkError};reports.push(r);console.log(r);
 }
}
const runtime=await fs.readFile(new URL('runtime.js',base));await fs.writeFile(new URL('walk-validation.json',base),JSON.stringify({status:'passed',runtime_sha256:crypto.createHash('sha256').update(runtime).digest('hex'),pose_samples:reports.reduce((n,r)=>n+r.pose_samples,0),scope:'Two planar kinematic gaits on plain and decoded articulated tiers. Planted socket positions include continuous +Z body travel. Support margin checks the projected body origin, not a mass-distribution/force simulation. Full mesh floor clearance, motor limits, rigid links, loop closure and two forward sensors are sampled.',reports},null,2)+'\n');
