import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {buildXB12,makeStatic} from './xb12-shape.mjs';
import {applyXB12} from '../../assets/xb12/runtime.js';
const out=new URL('../../assets/xb12/',import.meta.url);await fs.mkdir(out,{recursive:true});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const assets=[];
for(const lod of [0,1,2]){
 const root=buildXB12(lod);root.userData.static=false;applyXB12(root);if(lod===2)makeStatic(root);root.updateMatrixWorld(true);
 let triangles=0,draw_calls=0;const required_nodes=[],sockets=[];
 root.traverse(o=>{required_nodes.push(o.name);if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls++;}if(o.name.startsWith('SOCKET_'))sockets.push({node:o.name,parent:o.parent.name,position_m:o.getWorldPosition(new T.Vector3()).toArray()});});
 const b=new T.Box3().setFromObject(root),file=`xb12_d0_lod${lod}.glb`,bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));await fs.writeFile(new URL(file,out),bytes);
 const doc=await io.readBinary(bytes);await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
 const packed=Buffer.from(await io.writeBinary(doc));await fs.mkdir(new URL('derived/meshopt/',out),{recursive:true});const meshopt_file=`derived/meshopt/xb12_d0_lod${lod}.meshopt.glb`;await fs.writeFile(new URL(meshopt_file,out),packed);
 const entry={file,lod,damage_level:0,static:lod===2,derived:false,bytes:bytes.length,triangles,draw_calls,materials:1,sha256:sha(bytes),meshopt_file,meshopt_bytes:packed.length,meshopt_sha256:sha(packed),meshopt_derived:true,plot_m:[4,4],bounds:{min:b.min.toArray(),max:b.max.toArray(),dimensions_m:b.getSize(new T.Vector3()).toArray()},sockets,required_nodes,clips:[],credit:'Models by jelaludo'};assets.push(entry);console.log(file,triangles,draw_calls,bytes.length);
}
await fs.writeFile(new URL('manifest.json',out),JSON.stringify({family:'xb12',status:'D0 animated design prototype; game integration pending',units:'metres',axes:'+Y up, +Z forward',root:'ground centre',damage_states:[0],lod_selection:{lod0:'recordings and close inspection',lod1:'moving gameplay unit',lod2:'static map/loading only; switch to LOD1 before visible animation',automatic_distance_m:null},animation:{engine_driven:true,compression_m:[-.12,.14],positive_compression:'hub rises relative to chassis',front_steer_deg:[-30,30],preview_cycle_seconds:4},assets},null,2)+'\n');
