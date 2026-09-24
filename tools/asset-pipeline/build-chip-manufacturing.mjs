import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {buildModel,definitions} from './chip-manufacturing-shape.mjs';
const out=new URL('../../assets/chip-manufacturing/',import.meta.url);
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(x=>{this.result=`data:${b.type};base64,${Buffer.from(x).toString('base64')}`;this.onloadend?.();});}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
function visibleBounds(root){const b=new T.Box3();root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh&&o.getWorldScale(new T.Vector3()).lengthSq()>1e-10)b.union(new T.Box3().setFromObject(o,true));});return b;}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),assets=[];
for(const [family,d] of Object.entries(definitions))for(const lod of [0,1,2]){
 const root=buildModel(family,lod);root.updateMatrixWorld(true);let triangles=0,draw_calls=0;const sockets=[],engine_nodes=[],lookup_nodes=[];
 root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls++;}else lookup_nodes.push(o.name);
  if(o.userData.role==='engine_pivot'||o.userData.role==='optional_viewer_effect')engine_nodes.push(o.name);
  if(o.userData.role==='socket')sockets.push({id:o.name.replace('SOCKET_',''),node:o.name,kind:o.userData.kind,interface:o.userData.interface,position_m:o.getWorldPosition(new T.Vector3()).toArray(),normal:new T.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())).toArray()});
 });
 const b=visibleBounds(root),file=`lod${lod}/${family}_d0_lod${lod}.glb`;await fs.mkdir(new URL(`lod${lod}/`,out),{recursive:true});
 const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));await fs.writeFile(new URL(file,out),bytes);
 const doc=await io.readBinary(bytes);await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
 const packed=await io.writeBinary(doc),meshopt_file=`derived/meshopt/lod${lod}/${family}_d0_lod${lod}.meshopt.glb`;await fs.mkdir(new URL(`derived/meshopt/lod${lod}/`,out),{recursive:true});await fs.writeFile(new URL(meshopt_file,out),packed);
 const e={id:`${family}_d0_lod${lod}`,family,label:d.label,file,lod,damage_level:0,static:lod===2,derived:false,bytes:bytes.length,sha256:sha(bytes),triangles,draw_calls,materials:lod===2?1:3,textures:0,meshopt_file,meshopt_bytes:packed.length,meshopt_sha256:sha(packed),meshopt_derived:true,plot_m:d.plot,bounds:{min:b.min.toArray(),max:b.max.toArray(),dimensions_m:b.getSize(new T.Vector3()).toArray()},swept_envelope_m:root.userData.swept_envelope_m||null,sockets,clips:[],engine_nodes,required_nodes:[d.root,...engine_nodes,...sockets.map(s=>s.node)],credit:'Models by jelaludo'};assets.push(e);console.log(e.id,triangles,'triangles',draw_calls,'draws',bytes.length,'bytes');
}
const manifest={schema:'jelaludo.asset-family/v2-candidate',family:'chip-manufacturing',label:'LIT-01 / Chip manufacturing unit',status:'contract_candidate_pending_game_review',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground at plot centre'},supported_damage_levels:[0],missing_damage_states_reason:'D1–D3 unauthored; damage is independent from detail.',budgets:{lod1:{triangles:8000,draw_calls:10,bytes:400000},lod2:{triangles:3000,draw_calls:1,bytes:250000}},lod_selection:{initial:2,approach_distance_m:150,hysteresis_m:20,provisional:true,detailed:'Manual recording and close inspection',distance:'Static rest pose; retain LOD1 during writing.'},runtime:{adapter:'runtime.js',baked_clips:[],demonstration:{name:'Wafer_Write_Cycle',duration_s:12,loop:true},scope:'Art-directed laser direct-write process, not a semiconductor process simulation. Four fixed folding mirrors and a translating XY wafer stage; engine pivots are unbaked.'},assets};
await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
