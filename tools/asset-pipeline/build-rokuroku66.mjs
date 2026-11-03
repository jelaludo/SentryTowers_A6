import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {buildModel} from './rokuroku66-shape.mjs';
import {motions,gaits} from '../../assets/rokuroku66/runtime.js';
const out=new URL('../../assets/rokuroku66/',import.meta.url);
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(x=>{this.result=`data:${b.type};base64,${Buffer.from(x).toString('base64')}`;this.onloadend?.();});}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
function visibleBounds(root){const b=new T.Box3();root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh&&o.getWorldScale(new T.Vector3()).lengthSq()>1e-10)b.union(new T.Box3().setFromObject(o,true));});return b;}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),assets=[];
const family='rokuroku66',d={label:'RokuRoku-66 / Serpentine limb study',root:'ROKUROKU_66_ROOT',plot:[12,12]};
for(const lod of [0,1,2]){
 const root=buildModel(lod);root.updateMatrixWorld(true);let triangles=0,draw_calls=0;const sockets=[],engine_nodes=[],lookup_nodes=[];
 root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls+=Array.isArray(o.material)?o.material.length:1;}else lookup_nodes.push(o.name);
  if(o.userData.role==='engine_pivot'||o.userData.role==='optional_viewer_effect')engine_nodes.push(o.name);
  if(o.userData.role==='socket')sockets.push({id:o.name.replace('SOCKET_',''),node:o.name,kind:o.userData.kind,interface:o.userData.interface,position_m:o.getWorldPosition(new T.Vector3()).toArray(),normal:new T.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())).toArray()});
 });
 const b=visibleBounds(root),file=`lod${lod}/${family}_d0_lod${lod}.glb`;await fs.mkdir(new URL(`lod${lod}/`,out),{recursive:true});
 const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));await fs.writeFile(new URL(file,out),bytes);
 const doc=await io.readBinary(bytes);await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
 const packed=await io.writeBinary(doc),meshopt_file=`derived/meshopt/lod${lod}/${family}_d0_lod${lod}.meshopt.glb`;await fs.mkdir(new URL(`derived/meshopt/lod${lod}/`,out),{recursive:true});await fs.writeFile(new URL(meshopt_file,out),packed);
 const e={id:`${family}_d0_lod${lod}`,family,label:d.label,file,lod,damage_level:0,static:lod===2,derived:false,bytes:bytes.length,sha256:sha(bytes),triangles,draw_calls,materials:new Set((()=>{const m=[];root.traverse(o=>{if(o.isMesh)m.push(...(Array.isArray(o.material)?o.material:[o.material]));});return m;})()).size,textures:0,meshopt_file,meshopt_bytes:packed.length,meshopt_sha256:sha(packed),meshopt_derived:true,plot_m:d.plot,bounds:{min:b.min.toArray(),max:b.max.toArray(),dimensions_m:b.getSize(new T.Vector3()).toArray()},swept_envelope_m:root.userData.swept_envelope_m||null,sockets,clips:[],engine_nodes,required_nodes:[d.root,...engine_nodes,...sockets.map(s=>s.node)],credit:'Mechanical model by jelaludo; derived from the Nih-Dairia mech design and user-supplied RokuRoku-66 concept'};assets.push(e);console.log(e.id,triangles,'triangles',draw_calls,'draws',bytes.length,'bytes');
}
const manifest={schema:'jelaludo.asset-family/v2-candidate',family:'rokuroku66',version:1.1,label:'RokuRoku-66 / Six independent serpentine limbs',status:'kinematic_contract_candidate',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground at plot centre'},supported_damage_levels:[0],missing_damage_states_reason:'D1–D3 not authored; damage is independent of LOD.',budgets:{lod1:{triangles:25000},lod2:{triangles:3000,draw_calls:1,bytes:250000}},lod_selection:{initial:2,approach_distance_m:150,hysteresis_m:20,provisional:true,detailed:'Close shots and recording',distance:'Static extended silhouette. Use LOD1 before articulating limbs.'},runtime:{adapter:'runtime.js',baked_clips:[],vertebrae_per_limb:22,axes_per_joint:2,joint_limits_rad:{yaw:.72,pitch:.72},controls_per_vertebra:['YAW','PITCH','SCALE','DORSAL_LIP','VENTRAL_LIP'],demonstrations:Object.values(motions).filter(m=>m.loop),locomotion:{gaits,forward_axis:'+Z',body_heading_rad:-Math.PI/6,contact_tip_height_m:.08,swing_lift_m:.43,world_motion:'Translate an outer parent by speed_m_s times continuous time; do not wrap travel at clip boundaries.',sensor_pair:['01','02'],scope:'Planar planted-tip kinematics; body-origin support polygon, not force or mass simulation.'},cables:'Two-bone blended slack loops near the joint centre; visual flexibility, not an inextensible cable simulation.',scope:'Joint-driven curvature and planar planted-tip locomotion. Pole is a separate viewer fixture. No force-based grasping, terrain adaptation or general collision response.'},lineage:{family:'nih-dairia-mech',commit:'0697a7f2e023043fcc6298f18029608d46b12824'},references:{images:[]},assets};
try{const b=await fs.readFile('/Users/jela/Downloads/rokuroku66.png');manifest.references.images.push({file:'rokuroku66.png',sha256:sha(b),redistributed:false});}catch{}
await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
