import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {buildTAI} from './tai09-shape.mjs';
const out=new URL('../../assets/tai09/',import.meta.url);await fs.mkdir(new URL('derived/meshopt/',out),{recursive:true});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder}),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),assets=[];
for(const lod of [0,1,2]){
 const root=buildTAI(lod);root.updateMatrixWorld(true);let triangles=0,draw_calls=0;const required_nodes=[],sockets=[];
 root.traverse(o=>{if(!o.isMesh||o.name==='TAI09_ROOT')required_nodes.push(o.name);if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls+=o.geometry.groups.length||1;}if(o.userData.socket)sockets.push({node:o.name,parent:o.parent.name,position_m:o.getWorldPosition(new T.Vector3()).toArray()});});
 const box=new T.Box3().setFromObject(root,true),file=`tai09_d0_lod${lod}.glb`,bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));await fs.writeFile(new URL(file,out),bytes);
 const doc=await io.readBinary(bytes);await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const packed=Buffer.from(await io.writeBinary(doc)),meshopt_file=`derived/meshopt/tai09_d0_lod${lod}.meshopt.glb`;await fs.writeFile(new URL(meshopt_file,out),packed);
 assets.push({file,lod,damage_level:0,static:lod===2,derived:false,bytes:bytes.length,triangles,draw_calls,materials:lod===2?1:4,sha256:sha(bytes),meshopt_file,meshopt_bytes:packed.length,meshopt_sha256:sha(packed),meshopt_derived:true,plot_m:[3,3],bounds:{min:box.min.toArray(),max:box.max.toArray(),dimensions_m:box.getSize(new T.Vector3()).toArray()},required_nodes,sockets,clips:[],credit:'Models by jelaludo'});console.log(file,triangles,draw_calls,bytes.length);
}
const references=JSON.parse(await fs.readFile(new URL('../../source/tai09/references.json',import.meta.url)));
await fs.writeFile(new URL('manifest.json',out),JSON.stringify({family:'tai09',label:'09-TAI / Gyro',status:'Playable kinematic prototype; consuming-game integration pending',plain_glb_source_of_truth:true,units:'metres',axes:'+Y up, +Z forward',root:'Ground centre of closed sphere',nominal_diameter_m:1.6,supported_damage_levels:[0],damage_policy:'D0 only. Damage states have not been authored.',budgets:{lod1:{triangles:25000},lod2:{triangles:3000,draw_calls:1,bytes:250000}},lod_selection:{lod0:'Close shots, animation review and recordings',lod1:'All interactive movement; preserve the rigid skeleton and sockets',lod2:'Closed static map/loading sphere; lookup transforms only. Switch to LOD1 before an ability or rolling is shown.',automatic_distance_m:null},mechanics:{shell:'20 hexagons + 12 pentagonal closure faces; forward hex face is launcher port',panel_count:32,limbs:6,adhesive_toes_per_limb:3,grapple_jaws:3,engine_driven:true,clips:[],runtime:'runtime.js',preview_sequences:[{name:'Deploy',duration_s:1.1},{name:'Hook_Fire',duration_s:.45},{name:'Jump',launch_speed_m_s:5.8,gravity_m_s2:9.81}],collision:'Viewer confines movement to its planar wall/ceiling fixture. General rigid-body, surface adhesion, self-collision and tether forces are pending.',scale_note:'1.6 m nominal diameter assumed for this first interpretation'},references,assets},null,2)+'\n');
