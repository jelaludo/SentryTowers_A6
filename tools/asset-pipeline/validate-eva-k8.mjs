// Validate runtime output, including decoded optional Meshopt derivatives.
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
const out=new URL('../../assets/eva-k8/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const report={assets:[],clip_samples:0,sample_hz:120,minimum_geometry_y_m:Infinity,maximum_loop_error_m:0,maximum_loop_rotation_error_rad:0,maximum_stance_slip_m:0,maximum_segment_length_error_m:0,maximum_decoded_pose_error_m:0,clip_envelopes:{},minimum_support_contacts:{},hand_orientation:{minimum_thumb_forward_m:Infinity,minimum_relaxed_inward_curl_m:Infinity,halt_palm_forward_dot:1},scope:'Plain and decoded Meshopt. Full skinned geometry at 120 Hz, loop position/rotation, heel/flat/toe support and world-space anchors, intermediate-key rigid lengths, LOD name/socket parity and budgets. Authored flat-floor kinematics; not physics, general self-collision or FPS acceptance.'};
const wp=(root,n)=>root.getObjectByName(n).getWorldPosition(new T.Vector3());
const wq=(root,n)=>root.getObjectByName(n).getWorldQuaternion(new T.Quaternion());
let baselineNames,baselineSockets;const decodedPoses={};
for(const e of manifest.assets)for(const compressed of [false,true]){
 const file=compressed?e.meshopt_file:e.file,bytes=await fs.readFile(new URL(file,out));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),compressed?e.meshopt_sha256:e.sha256);
 const doc=await io.readBinary(bytes),names=doc.getRoot().listNodes().map(n=>n.getName()).sort();
 assert(names.every(n=>n&&!n.includes('.')),'blank or dot node name');assert.equal(new Set(names).size,names.length,'duplicate nodes');assert.deepEqual(names,e.required_nodes);
 if(baselineNames)assert.deepEqual(names,baselineNames,'LOD names changed');else baselineNames=names;
 let decoded=bytes;
 if(compressed){for(const x of doc.getRoot().listExtensionsUsed())if(x.extensionName==='EXT_meshopt_compression')x.dispose();await doc.transform(dequantize());decoded=await io.writeBinary(doc);}
 const validation=await validator.validateBytes(decoded);assert.equal(validation.issues.numErrors,0,file+JSON.stringify(validation.issues));assert.equal(validation.issues.numWarnings,0,file+JSON.stringify(validation.issues));
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const root=gltf.scene;root.updateMatrixWorld(true);
 const meshes=[];let triangles=0;root.traverse(o=>{if(o.isMesh){meshes.push(o);const g=o.geometry,p=g.attributes.position,index=g.index,n=index?.count||p.count;triangles+=n/3;for(let i=0;i<n;i+=3){const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k));assert(v.every(a=>a.toArray().every(Number.isFinite)));assert(v[1].sub(v[0]).cross(v[2].sub(v[0])).lengthSq()>1e-18,'degenerate triangle '+file+' index '+i);}}});
 assert.equal(triangles,e.triangles);assert.equal(meshes.length,e.draw_calls);assert.equal(gltf.animations.length,e.static?0:7);
 assert(Math.abs(wp(root,'PELVIS').y-1.00)<.0001,'human hip height');
 const leg=wp(root,'HIP_L').distanceTo(wp(root,'KNEE_L'))+wp(root,'KNEE_L').distanceTo(wp(root,'ANKLE_L'));assert(leg>.85&&leg<.92,'human leg proportions');
 assert(Math.abs(wp(root,'ANKLE_L').x-wp(root,'ANKLE_R').x-.30)<.001,'parallel human stance');
 assert(Math.abs(wp(root,'SOCKET_TOE_L').distanceTo(wp(root,'SOCKET_HEEL_L'))-.35)<.001,'boot support length');
 const box=new T.Box3().setFromObject(root,true);{let helmetHalf=0,chestHalf=0;for(const o of meshes){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),x=Math.abs(p.getX(i));if(y>1.70&&y<1.95)helmetHalf=Math.max(helmetHalf,x);if(y>1.30&&y<1.50&&x<.31)chestHalf=Math.max(chestHalf,x);}}assert(helmetHalf<chestHalf,'helmet narrower than chest '+helmetHalf+' '+chestHalf);report.silhouette_helmet={helmet_half_width_m:helmetHalf,chest_half_width_m:chestHalf};}assert(box.max.y>1.90&&box.max.y<2.02,'helmet top near 1.95 m');const shoulders=wp(root,'UPPER_ARM_L').x-wp(root,'UPPER_ARM_R').x;assert(Math.abs(shoulders-.81)<.001,'1.35x shoulder joints');assert(box.max.x-box.min.x>1.0,'pauldron width');report.silhouette={shoulder_joint_span_m:shoulders,width_m:box.max.x-box.min.x,height_m:box.max.y};
 // Neutral anatomy: thumbs lead forward, fingers curve into the palm.
 for(const [id,sign] of [['L',1],['R',-1]]){
  const thumb=wp(root,'THUMB_'+id+'_01').sub(wp(root,'HAND_'+id));assert(thumb.z>.04,'thumb must occupy the forward edge '+file+' '+id);
  for(let digit=1;digit<=4;digit++){const curl=wp(root,`FINGER_${id}${digit}_03`).sub(wp(root,`FINGER_${id}${digit}_01`));assert(-sign*curl.x>.035,'finger curled away from inward-facing palm '+file+' '+id);}
 }
 const sockets=e.sockets.map(s=>{const p=wp(root,s.node);assert(p.distanceTo(new T.Vector3(...s.position_m))<.0001);return p;});if(baselineSockets)sockets.forEach((p,i)=>assert(p.distanceTo(baselineSockets[i])<.0001,'socket mismatch'));else baselineSockets=sockets;
 if(e.static){assert(triangles<=3000&&meshes.length===1&&e.bytes<=250000,'distance budget');assert(meshes.every(o=>!o.isSkinnedMesh),'distance must be static');}
 else{
  if(e.lod===1)assert(triangles<=25000);assert(meshes.every(o=>o.isSkinnedMesh));
  const mixer=new T.AnimationMixer(root),jointNames=names.filter(n=>root.getObjectByName(n)?.isBone);
  const segments=[];
  for(const id of ['L','R'])for(const [a,b] of [['HIP_','KNEE_'],['KNEE_','ANKLE_'],['UPPER_ARM_','FOREARM_'],['FOREARM_','HAND_']])segments.push([a+id,b+id,wp(root,a+id).distanceTo(wp(root,b+id))]);
  for(const id of ['L','R'])for(let i=1;i<=4;i++)for(const [a,b] of [['01','02'],['02','03']]){const n=`FINGER_${id}${i}_${a}`,m=`FINGER_${id}${i}_${b}`;segments.push([n,m,wp(root,n).distanceTo(wp(root,m))]);}
  for(const clip of gltf.animations){
   const meta=e.clips.find(c=>c.name===clip.name);assert(meta);assert(Math.abs(clip.duration-meta.duration_s)<1e-5);assert(clip.tracks.every(t=>!t.name.startsWith('SOCKET_')&&!t.name.startsWith('ROOT.')),'sockets baked');
   const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
   function sample(t){mixer.stopAllAction();action.reset().play();action.time=Math.min(t,clip.duration-1e-7);mixer.update(0);root.updateMatrixWorld(true);meshes.forEach(o=>o.skeleton.update());}
   const frames=Math.round(clip.duration*120),envelope=new T.Box3();let minimum=Infinity,first,last,firstQ,lastQ,supportMin=2;const checked=[];
   for(let i=0;i<=frames;i++){
    sample(i/120);report.clip_samples++;const box=new T.Box3().setFromObject(root,true);envelope.union(box);minimum=Math.min(minimum,box.min.y);assert(Number.isFinite(box.max.y));
    for(const [a,b,l] of segments)report.maximum_segment_length_error_m=Math.max(report.maximum_segment_length_error_m,Math.abs(wp(root,a).distanceTo(wp(root,b))-l));
    for(const [id,sign] of [['L',1],['R',-1]]){
     const inverse=wq(root,'HAND_'+id).invert();const thumb=wp(root,'THUMB_'+id+'_01').sub(wp(root,'HAND_'+id)).applyQuaternion(inverse);report.hand_orientation.minimum_thumb_forward_m=Math.min(report.hand_orientation.minimum_thumb_forward_m,thumb.z);
     if(clip.name!=='Signal_Halt')for(let digit=1;digit<=4;digit++){const curl=wp(root,`FINGER_${id}${digit}_03`).sub(wp(root,`FINGER_${id}${digit}_01`)).applyQuaternion(inverse);report.hand_orientation.minimum_relaxed_inward_curl_m=Math.min(report.hand_orientation.minimum_relaxed_inward_curl_m,-sign*curl.x);}
    }
    const phase=i/frames;let support=0;
    for(const id of ['L','R']){
     const q=(phase-(meta.touchdown_phase?.[id]||0)+1)%1,expected=!meta.duty_factor||q<meta.duty_factor;
     const lowest=Math.min(...['HEEL','SOLE','TOE'].map(s=>wp(root,'SOCKET_'+s+'_'+id).y));
     if(expected){assert(Math.abs(lowest-.006)<.002,'contact clearance '+clip.name+' '+i+' '+id+' '+lowest);support++}
    }supportMin=Math.min(supportMin,support);
    if(i===0){first=jointNames.map(n=>wp(root,n));firstQ=jointNames.map(n=>wq(root,n));}if(i===frames){last=jointNames.map(n=>wp(root,n));lastQ=jointNames.map(n=>wq(root,n));}
    if(i%17===0)checked.push(...jointNames.flatMap(n=>wp(root,n).toArray()));
   }
   for(let i=0;i<frames;i+=7){sample((i+.37)/120);for(const [a,b,l] of segments)report.maximum_segment_length_error_m=Math.max(report.maximum_segment_length_error_m,Math.abs(wp(root,a).distanceTo(wp(root,b))-l));}
   // Every loop and all one-shots return to their own initial pose.
   for(let i=0;i<first.length;i++){report.maximum_loop_error_m=Math.max(report.maximum_loop_error_m,first[i].distanceTo(last[i]));report.maximum_loop_rotation_error_rad=Math.max(report.maximum_loop_rotation_error_rad,firstQ[i].angleTo(lastQ[i]));}
   // During each contact phase, the relevant heel/sole/toe anchor must remain
   // fixed in world space after applying the declared locomotion velocity.
   for(const id of ['L','R'])for(const [socket,start,end] of meta.speed_mps?[['HEEL',.002,.075],['SOLE',.085,meta.duty_factor-.115],['TOE',meta.duty_factor-.105,meta.duty_factor-.002]]:[['SOLE',0,1]]){
    let anchor;for(let i=0;i<40;i++){
     const phase=(meta.touchdown_phase?.[id]||0)+start+(end-start)*i/39,t=phase*clip.duration;sample((phase%1)*clip.duration);
     const p=wp(root,'SOCKET_'+socket+'_'+id).add(new T.Vector3(0,0,(meta.speed_mps||0)*t));if(!anchor)anchor=p;report.maximum_stance_slip_m=Math.max(report.maximum_stance_slip_m,p.distanceTo(anchor));
    }
   }
   if(clip.name==='Kneel_Inspect'){sample(2.4);assert(wp(root,'PELVIS').y<.75,'inspection crouch needs hip drop');}
   if(clip.name==='Hero_Stance'){sample(0);const pelvis=wp(root,'PELVIS');assert(pelvis.x>.02,'hero stance shifts the hips over the support leg');const flex=id=>{const a=wp(root,'KNEE_'+id).sub(wp(root,'HIP_'+id)),b=wp(root,'ANKLE_'+id).sub(wp(root,'KNEE_'+id));return a.angleTo(b)*180/Math.PI};assert(flex('R')-flex('L')>12,'free knee visibly more bent than the support knee');const heelR=wp(root,'SOCKET_HEEL_R').y,toeR=wp(root,'SOCKET_TOE_R').y;assert(heelR>.035&&Math.abs(toeR-.006)<.002,'right heel raised on the toe pivot');const chestUp=new T.Vector3(0,1,0).applyQuaternion(wq(root,'CHEST'));assert(chestUp.z>.07,'torso leans about five degrees forward');const elbow=id=>{const u=new T.Vector3(0,-1,0).applyQuaternion(wq(root,'UPPER_ARM_'+id)),f=new T.Vector3(0,-1,0).applyQuaternion(wq(root,'FOREARM_'+id));return u.angleTo(f)*180/Math.PI};for(const id of ['L','R'])assert(elbow(id)>9&&elbow(id)<17,'elbows bent 10-15 degrees '+id+' '+elbow(id));const headF=new T.Vector3(0,0,1).applyQuaternion(wq(root,'HEAD'));assert(Math.abs(Math.atan2(headF.x,headF.z))>.06,'helmet turned');const mirror=Math.abs(wp(root,'HAND_L').z-wp(root,'HAND_R').z)+Math.abs(wp(root,'ANKLE_L').z-wp(root,'ANKLE_R').z);assert(mirror>.08,'hero stance must not be left/right symmetric');report.hero_stance={pelvis_offset_x_m:pelvis.x,knee_flexion_deg:{L:flex('L'),R:flex('R')},elbow_deg:{L:elbow('L'),R:elbow('R')},right_heel_rise_m:heelR,torso_lean_deg:Math.asin(chestUp.z)*180/Math.PI};}
   if(clip.name==='Signal_Halt'){sample(2.4);assert(wp(root,'SOCKET_HAND_R').y>1.35,'halt signal glove must be raised');const palm=new T.Vector3(1,0,0).applyQuaternion(wq(root,'HAND_R'));report.hand_orientation.halt_palm_forward_dot=Math.min(report.hand_orientation.halt_palm_forward_dot,palm.z);assert(palm.z>.95,'halt gesture must present the palm forward');}
   if(clip.name==='Survey_Scan'){let yaw=0;for(let i=0;i<=60;i++){sample(i/10);const f=new T.Vector3(0,0,1).applyQuaternion(wq(root,'HEAD'));yaw=Math.max(yaw,Math.abs(Math.atan2(f.x,f.z)));}assert(yaw>.4&&yaw<.75,'survey sweeps the helmet within ±36°');}
   if(meta.speed_mps){assert.equal(supportMin,1,'gait requires both single and double support');sample(.07*clip.duration);for(const id of ['L','R'])assert(Math.min(...['HEEL','SOLE','TOE'].map(s=>wp(root,'SOCKET_'+s+'_'+id).y))<.008,'double support');}
   if(!compressed&&e.lod===0){report.clip_envelopes[clip.name]={min:envelope.min.toArray(),max:envelope.max.toArray(),dimensions_m:envelope.getSize(new T.Vector3()).toArray()};report.minimum_support_contacts[clip.name]=supportMin;}
   const k=e.lod+'_'+clip.name;if(!compressed)decodedPoses[k]=checked;else for(let i=0;i<checked.length;i++)report.maximum_decoded_pose_error_m=Math.max(report.maximum_decoded_pose_error_m,Math.abs(checked[i]-decodedPoses[k][i]));
   report.minimum_geometry_y_m=Math.min(report.minimum_geometry_y_m,minimum);console.log(file,clip.name,'floor',minimum.toFixed(5));mixer.stopAllAction();
  }
 }
 report.assets.push({file,triangles,draw_calls:meshes.length,bytes:bytes.length,gltf_errors:validation.issues.numErrors,gltf_warnings:validation.issues.numWarnings});
}
assert(report.minimum_geometry_y_m>=-.001,'floor penetration '+report.minimum_geometry_y_m);assert(report.maximum_loop_error_m<.002,'loop/return seam '+report.maximum_loop_error_m);assert(report.maximum_loop_rotation_error_rad<.002,'rotation seam');assert(report.maximum_stance_slip_m<.002,'support slip '+report.maximum_stance_slip_m);assert(report.maximum_segment_length_error_m<.001,'rigid segment stretch '+report.maximum_segment_length_error_m);assert(report.maximum_decoded_pose_error_m<.002,'Meshopt motion drift');assert(report.hand_orientation.minimum_thumb_forward_m>.04,'thumb direction through motion');assert(report.hand_orientation.minimum_relaxed_inward_curl_m>.035,'relaxed finger opposition through motion');report.status='passed';report.scope+=' Hero_Stance asymmetry, 1.35x shoulder span, helmet narrower than chest and 35 cm boot support are checked.';
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log('PASS',report.clip_samples,'samples; floor',report.minimum_geometry_y_m,'slip',report.maximum_stance_slip_m,'rigid error',report.maximum_segment_length_error_m);
