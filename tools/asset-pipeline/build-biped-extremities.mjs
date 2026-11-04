// Additional variants. Never overwrites the original detailed/game/distance GLBs.
import fs from 'node:fs/promises';import crypto from 'node:crypto';import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {buildHand} from './hand-lab-shape.mjs';import {buildFoot} from './foot-lab-shape.mjs';
import {BIPED_REST as HAND_REST} from '../../assets/hand-lab/biped.js';import {BIPED_REST as FOOT_REST} from '../../assets/foot-lab/biped.js';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const [lab,build,rest]of [['hand',buildHand,HAND_REST],['foot',buildFoot,FOOT_REST]]){
 const base=new URL(`../../assets/${lab}-lab/`,import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base))),original=manifest.assets.filter(e=>!e.variant||e.variant==='original'),assets=[];
 for(const lod of [1,2]){
  const source=original.find(e=>e.lod===lod),root=build(lod,{economy:true,staticPose:lod===2?rest:null});root.updateMatrixWorld(true);
  const sockets=[];let triangles=0,draws=0;
  root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draws+=Array.isArray(o.material)?o.material.length:1;}if(o.userData.role==='socket')sockets.push({id:o.name.replace('SOCKET_',''),node:o.name,kind:o.userData.kind,position_m:o.getWorldPosition(new T.Vector3()).toArray(),normal:new T.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())).toArray()});});
  const box=new T.Box3().setFromObject(root,true),stem=`${manifest.family}_biped_d0_lod${lod}`,file=`biped/lod${lod}/${stem}.glb`,meshopt_file=`derived/meshopt/biped/lod${lod}/${stem}.meshopt.glb`;
  await fs.mkdir(new URL(`biped/lod${lod}/`,base),{recursive:true});await fs.mkdir(new URL(`derived/meshopt/biped/lod${lod}/`,base),{recursive:true});
  const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));await fs.writeFile(new URL(file,base),bytes);
  const doc=await io.readBinary(bytes);await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const packed=await io.writeBinary(doc);await fs.writeFile(new URL(meshopt_file,base),packed);
  assets.push({...source,id:stem,variant:'biped',label:lod===1?'Biped / economical articulated':'Biped / inward-curled static',file,bytes:bytes.length,sha256:sha(bytes),triangles,draw_calls:draws,materials:draws,meshopt_file,meshopt_bytes:packed.length,meshopt_sha256:sha(packed),merged_palette:true,material_visibility:false,static_pose:lod===2?rest:null,bounds:{min:box.min.toArray(),max:box.max.toArray(),dimensions_m:box.getSize(new T.Vector3()).toArray()},sockets,derived:false,credit:'Original economical variant by jelaludo / Model Workshop; Isao / Mechanism Atelier. No third-party geometry incorporated.'});
  console.log({family:manifest.family,lod,triangles,draws,bytes:bytes.length,packed:packed.length,reduction_percent:Math.round((1-triangles/original.find(e=>e.lod===1).triangles)*1000)/10});
 }
 manifest.variants={...manifest.variants,original:{label:'Original study',lods:[0,1,2]},biped:{label:'Biped / economy',lods:[1,2],master_variant:'original',master_lod:0,pose_module:'biped.js',rest_pose:rest,rest_label:'Natural inward curl',budgets:{lod1:{triangles:3500,draw_calls:1,bytes:250000},lod2:{triangles:3000,draw_calls:1,bytes:250000}},construction:'Three-section twelve-sided segment shells, low-sided joint barrels, simplified pads and cuff ribs; hidden longitudinal links, microdetails and separate bearing assemblies omitted. One vertex-color palette.',static_contract:'LOD2 geometry is frozen in rest_pose. Local hierarchy and interface coordinates are retained; world socket positions match articulated LOD1 at rest_pose, not its neutral bind pose. Static lookup nodes do not animate.',integration:'Same right-side attachment frames, bone lengths, joint names and runtime as original. Apply rest_pose before an LOD1/LOD2 swap; retain LOD1 for visible motion. Material-based visibility is unavailable on the merged palette; joint rig, wireframe and shell-bone inspection remain available on LOD1.'}};
 manifest.assets=[...manifest.assets.filter(e=>e.variant!=='biped'),...assets];await fs.writeFile(new URL('manifest.json',base),JSON.stringify(manifest,null,2)+'\n');
}
