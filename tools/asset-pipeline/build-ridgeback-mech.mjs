import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {buildMech,makeStatic,walkClip,airdropClip} from './ridgeback-mech-shape.mjs';
const out=new URL('../../assets/ridgeback-mech/',import.meta.url);await fs.mkdir(out,{recursive:true});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const assets=[];
for(const damage of [0,1,2,3])for(const lod of [0,1,2]){
 const root=buildMech(lod,damage);const clip=lod<2?walkClip(root,damage):null;const landing=lod<2?airdropClip(root,damage):null;const animations=[clip,landing].filter(Boolean);if(lod===2)makeStatic(root);root.updateMatrixWorld(true);
 let triangles=0,draw_calls=0;const required_nodes=[],sockets=[];
 root.traverse(o=>{required_nodes.push(o.name);if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls++;}if(o.name.startsWith('SOCKET_'))sockets.push({node:o.name,parent:o.parent.name,position_m:o.getWorldPosition(new T.Vector3()).toArray()});});
 const b=new T.Box3().setFromObject(root),file=`mx06_d${damage}_lod${lod}.glb`,bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true,animations}));await fs.writeFile(new URL(file,out),bytes);
 const doc=await io.readBinary(bytes);await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
 const packed=Buffer.from(await io.writeBinary(doc));await fs.mkdir(new URL('derived/meshopt/',out),{recursive:true});const meshopt_file=`derived/meshopt/mx06_d${damage}_lod${lod}.meshopt.glb`;await fs.writeFile(new URL(meshopt_file,out),packed);
 const entry={file,lod,damage_level:damage,static:lod===2,derived:false,bytes:bytes.length,triangles,draw_calls,materials:1,sha256:sha(bytes),meshopt_file,meshopt_bytes:packed.length,meshopt_sha256:sha(packed),meshopt_derived:true,plot_m:[8,8],bounds:{min:b.min.toArray(),max:b.max.toArray(),dimensions_m:b.getSize(new T.Vector3()).toArray()},sockets,required_nodes,clips:animations.map(c=>({name:c.name,duration_s:c.duration,loop:c.name!=='Airdrop_Land',root_motion:c.name==='Airdrop_Land',root_motion_node:c.name==='Airdrop_Land'?'DROP_ROOT':null})),credit:'Models by jelaludo'};assets.push(entry);console.log(file,triangles,draw_calls,bytes.length);
}

await fs.writeFile(new URL('manifest.json',out),JSON.stringify({
 schema:'jelaludo.asset-family/v2-candidate',family:'ridgeback-mech',label:'MX-06 Ridgeback / Six-legged threat-removal mech',status:'animated prototype; game review pending',plain_glb_source_of_truth:true,
 coordinate_system:{units:'metres',up:'+Y',forward:'+Z',origin:'ground at plot centre'},leg_count:6,spikes_per_foot:3,plot_m:[8,8],
 damage_states:{D0:'Intact',D1:'Battered: dented armor, scuffed surfaces; full gait',D2:'Component damage: buckled FL shin, breached hull, reduced stride/lift; half aiming sector',D3:'Disabled wreck: lowered body, spread legs, stripped armor, sagged laser; no movement or firing'},
 lod_selection:{initial:2,approach_distance_m:140,hysteresis_m:20,provisional:true,lod0:'Detailed close-shot and recording master',lod1:'Animated mobile gameplay unit; retain while moving',lod2:'Static parked map/loading representation; one material/draw; swap to LOD1 before walking'},
 budgets:{lod1:{triangles:25000},lod2:{triangles:3000,draw_calls:1,bytes:250000}},
 animation:{runtime:'runtime.js',gait:'Alternating tripod; FL/MR/RL and FR/ML/RR; 72% anchored stance, overlapping tripods; weighted body heave/pitch/roll',duration_s:4,root_motion:false,stance_travel_m:{D0:.8,D1:.8,D2:.36,D3:0},ground_speed_mps:{D0:.2777777778,D1:.2777777778,D2:.125,D3:0},walk_clip:'Walk_Cycle',damaged_clip:'Damaged_Walk_Cycle',engine_driven_excluded:['MINIGUN_YAW','MINIGUN_PITCH','MINIGUN_SPIN','LASER_YAW','LASER_PITCH','MISSILE_ELEVATION','SENSOR_YAW'],integration:'Use baked gait OR procedural applyMech, never both on leg pivots. Advance root +Z at stride / (0.72 * 4) metres/sec for non-sliding stance on level ground. After mixer update call solveHydraulics for exact piston endpoints. Clip playback rate scales root speed equally.'},
 deployment:{clip:'Airdrop_Land',duration_s:7,loop:false,release_s:0.6,braking_start_s:1.6,touchdown_s:2.6,release_height_m:6,touchdown_speed_mps:2,maximum_compression_m:0.64,jet_socket:'SOCKET_BRAKE_JET',jet_axis:[0,-1,0],motion_node:'DROP_ROOT',supported_damage:[0,1,2],fx:'dropState(time) returns deterministic jet intensity and impact time; gunship and particles are viewer-only'},
 weapons:{missile_local_outward_yaw_deg:30,missile_parent_elevation_deg:33.23,nominal_muzzle_outward_bearing_deg:34.6,nominal_muzzle_elevation_deg:28.3,minigun:1,laser_cannon:1,missile_banks:2,tubes_per_bank:6,aim_yaw_limit_deg:36,aim_pitch_deg:[-6.875,31.513],firing_simulated:false},
 colliders:{prototype_only:true,hull:{type:'box',parent:'MECH_BODY',center_m:[0,.1,0],size_m:[2.35,.9,4.5]},feet:'SOCKET_FOOT_{FL,ML,RL,FR,MR,RR}; three SOCKET_CLAW contacts per foot',note:'Broad hull proxy only. Game supplies articulated limb and terrain collision.'},
 assets
},null,2)+'\n');
