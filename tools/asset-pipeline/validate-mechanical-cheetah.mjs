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
const out=new URL('../../assets/mechanical-cheetah/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const report={assets:[],clip_samples:0,sample_hz:120,minimum_geometry_y_m:Infinity,maximum_loop_error_m:0,maximum_loop_rotation_error_rad:0,maximum_stance_slip_m:0,maximum_segment_length_error_m:0,maximum_pounce_travel_error_m:0,clip_envelopes:{},gallop_landmarks:{},minimum_support_contacts:{},scope:'Plain and decoded Meshopt exports. Full skinned geometry at 120 Hz, intermediate-time rigid joint lengths, loop position/rotation, stance-foot travel, flight landmarks and static tier budgets. Authored flat-floor kinematics; no terrain physics or measured FPS.'};
const wp=(root,n)=>root.getObjectByName(n).getWorldPosition(new T.Vector3());
const wq=(root,n)=>root.getObjectByName(n).getWorldQuaternion(new T.Quaternion());
let baselineNames,baselineSockets;const endpoints={};
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
 assert.equal(triangles,e.triangles);assert.equal(meshes.length,e.draw_calls);assert.equal(gltf.animations.length,e.static?0:6);
 const sockets=e.sockets.map(s=>{const p=wp(root,s.node);assert(p.distanceTo(new T.Vector3(...s.position_m))<.0001);return p;});if(baselineSockets)sockets.forEach((p,i)=>assert(p.distanceTo(baselineSockets[i])<.0001,'socket mismatch'));else baselineSockets=sockets;
 if(e.static){assert(triangles<=3000&&meshes.length===1&&e.bytes<=250000,'distance budget');assert(meshes.every(o=>!o.isSkinnedMesh),'distance must be static');}
 else{
  if(e.lod===1)assert(triangles<=25000);assert(meshes.every(o=>o.isSkinnedMesh));
  const mixer=new T.AnimationMixer(root),jointNames=names.filter(n=>root.getObjectByName(n)?.isBone);
  const segments=[];
  for(const id of ['FL','FR','HL','HR'])for(const [a,b] of [['UPPER_','LOWER_'],['LOWER_','ANKLE_'],['ANKLE_','PAW_']])segments.push([a+id,b+id,wp(root,a+id).distanceTo(wp(root,b+id))]);
  for(const [a,b] of [['LUMBAR','SPINE_REAR'],['SPINE_REAR','PELVIS'],['LUMBAR','SPINE_FRONT'],['SPINE_FRONT','CHEST']])segments.push([a,b,wp(root,a).distanceTo(wp(root,b))]);
  for(const clip of gltf.animations){
   const meta=e.clips.find(c=>c.name===clip.name);assert(meta);assert(Math.abs(clip.duration-meta.duration_s)<1e-5);
   assert(clip.tracks.every(t=>!t.name.startsWith('SENSOR_YAW.')&&!t.name.startsWith('SOCKET_')&&!t.name.startsWith('ROOT.')),'engine pivots/sockets baked');
   const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
   function sample(t){mixer.stopAllAction();action.reset().play();action.time=Math.min(t,clip.duration-1e-7);mixer.update(0);root.updateMatrixWorld(true);meshes.forEach(o=>o.skeleton.update());}
   const frames=Math.round(clip.duration*120),envelope=new T.Box3();let minimum=Infinity,first,last,firstQ,lastQ,supportMin=4;
   for(let i=0;i<=frames;i++){
    sample(i/120);report.clip_samples++;const box=new T.Box3().setFromObject(root,true);envelope.union(box);minimum=Math.min(minimum,box.min.y);assert(Number.isFinite(box.max.y));
    for(const [a,b,l] of segments)report.maximum_segment_length_error_m=Math.max(report.maximum_segment_length_error_m,Math.abs(wp(root,a).distanceTo(wp(root,b))-l));
    const phase=i/frames;if(meta.duty_factor){let supported=0;for(const [id,touch] of Object.entries(meta.touchdown_phase)){const expected=((phase-touch+1)%1)<meta.duty_factor,p=wp(root,'SOCKET_PAW_'+id);if(expected){assert(Math.abs(p.y-.003)<.002,'stance sole height '+file+' '+clip.name+' '+id);supported++;}}supportMin=Math.min(supportMin,supported);}
    if(i===0){first=jointNames.map(n=>wp(root,n));firstQ=jointNames.map(n=>wq(root,n));}if(i===frames){last=jointNames.map(n=>wp(root,n));lastQ=jointNames.map(n=>wq(root,n));}
   }
   // Spot samples between authoring keys exercise runtime interpolation, not only exact keys.
   for(let i=0;i<frames;i+=7){sample((i+.37)/120);for(const [a,b,l] of segments)report.maximum_segment_length_error_m=Math.max(report.maximum_segment_length_error_m,Math.abs(wp(root,a).distanceTo(wp(root,b))-l));}
   if(meta.loop)for(let i=0;i<first.length;i++){report.maximum_loop_error_m=Math.max(report.maximum_loop_error_m,first[i].distanceTo(last[i]));report.maximum_loop_rotation_error_rad=Math.max(report.maximum_loop_rotation_error_rad,firstQ[i].angleTo(lastQ[i]));}
   if(meta.speed_mps){for(const [id,touch] of Object.entries(meta.touchdown_phase)){let anchor;for(let i=1;i<50;i++){const phase=touch+meta.duty_factor*i/50,t=phase*clip.duration;sample((phase%1)*clip.duration);const p=wp(root,'SOCKET_PAW_'+id).add(new T.Vector3(0,0,meta.speed_mps*t));if(!anchor)anchor=p;report.maximum_stance_slip_m=Math.max(report.maximum_stance_slip_m,p.distanceTo(anchor));}}}
   if(clip.name==='Pounce'){sample(clip.duration);const error=Math.abs(wp(root,'MOTION').z-1.2);report.maximum_pounce_travel_error_m=Math.max(report.maximum_pounce_travel_error_m,error);assert(error<.002,'root travel '+error);sample(1.275);for(const id of ['FL','FR','HL','HR'])assert(wp(root,'SOCKET_PAW_'+id).y>.4);}
   if(clip.name==='Gallop_Cycle'){
    const phases={};for(const [name,u] of Object.entries(meta.phase_landmarks)){sample(u*clip.duration);const feet=Object.fromEntries(['FL','FR','HL','HR'].map(id=>[id,wp(root,'SOCKET_PAW_'+id)]));const airborne=Object.values(feet).filter(p=>p.y>.10).length;phases[name]={phase:u,airborne_paws:airborne,paw_positions_m:Object.fromEntries(Object.entries(feet).map(([id,p])=>[id,p.toArray()])),pelvis_chest_chord_m:wp(root,'PELVIS').distanceTo(wp(root,'CHEST')),fore_aft_paw_span_m:Math.max(...Object.values(feet).map(p=>p.z))-Math.min(...Object.values(feet).map(p=>p.z))};if(['gathered','extended'].includes(name))assert.equal(airborne,4);}
    assert(phases.gathered.pelvis_chest_chord_m<phases.extended.pelvis_chest_chord_m-.08,'spine does not flex');assert(phases.extended.fore_aft_paw_span_m>1.7,'extended flight too short');assert(phases.gathered.paw_positions_m.HL[2]>phases.gathered.paw_positions_m.FL[2]+.1,'hindfeet do not gather under forefeet');
    if(!compressed&&e.lod===0)report.gallop_landmarks=phases;
   }
   if(!compressed&&e.lod===0){report.clip_envelopes[clip.name]={min:envelope.min.toArray(),max:envelope.max.toArray(),dimensions_m:envelope.getSize(new T.Vector3()).toArray()};if(meta.duty_factor)report.minimum_support_contacts[clip.name]=supportMin;}
   report.minimum_geometry_y_m=Math.min(report.minimum_geometry_y_m,minimum);
   const key=e.lod+'_'+clip.name,endpoint=last.flatMap(p=>p.toArray());if(!compressed)endpoints[key]=endpoint;else assert(endpoint.every((x,i)=>Math.abs(x-endpoints[key][i])<.002),'Meshopt motion drift');
   console.log(file,clip.name,'floor',minimum.toFixed(5));mixer.stopAllAction();
  }
 }
 report.assets.push({file,triangles,draw_calls:meshes.length,bytes:bytes.length,gltf_errors:validation.issues.numErrors,gltf_warnings:validation.issues.numWarnings});
}
assert(report.minimum_geometry_y_m>=-.003,'floor penetration '+report.minimum_geometry_y_m);
assert(report.maximum_loop_error_m<.002,'loop seam');assert(report.maximum_loop_rotation_error_rad<.002,'rotation seam');
assert(report.maximum_stance_slip_m<.002,'foot slip '+report.maximum_stance_slip_m);assert(report.maximum_segment_length_error_m<.001,'rigid segment stretch '+report.maximum_segment_length_error_m);
assert(report.minimum_support_contacts.Feline_Walk_Cycle>=2);assert(report.minimum_support_contacts.Stalk_Cycle>=3);
report.status='passed';
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');
console.log('PASS',report.clip_samples,'samples; floor',report.minimum_geometry_y_m,'slip',report.maximum_stance_slip_m,'rigid error',report.maximum_segment_length_error_m);
