import {buildDome} from './yushi037-shape.mjs';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,prune,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const out=new URL('../../assets/yushi037/',import.meta.url);
const P={shell:0xc9d4c7,armor:0x243d40,metal:0x667f7d,dark:0x071f22,cyan:0x6cddd2,olive:0x71863c,amber:0xe0b963};
const centerY=.4,rx=1.65,ry=1.35;
const names=['ROOT','YUSHI_BODY','YUSHI_GLASS','DISPENSE_VALVE','VALVE_HANDLE','SOCKET_DISPENSE','SOCKET_FILL','SOCKET_SERVICE','SOCKET_ISAO_APPROACH','LEVEL_READOUT'];
const sockets=[
 {id:'DISPENSE',node:'SOCKET_DISPENSE',position_m:[0,.48,2.0725],normal:[0,0,1],kind:'binder_outlet'},
 {id:'FILL',node:'SOCKET_FILL',position_m:[-1.805,.57,0],normal:[-1,0,0],kind:'binder_inlet'},
 {id:'SERVICE',node:'SOCKET_SERVICE',position_m:[0,1.8725,0],normal:[0,1,0],kind:'service_cap'},
 {id:'ISAO_APPROACH',node:'SOCKET_ISAO_APPROACH',position_m:[0,.65,2.6],normal:[0,0,-1],kind:'external_docking_approach'}
];
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(x=>{this.result=`data:${blob.type};base64,${Buffer.from(x).toString('base64')}`;this.onloadend?.();});}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
function prep(g,color,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1],role=[0,0,0]){
 const a=g.index?g.toNonIndexed():g.clone();g.dispose();for(const k of Object.keys(a.attributes))if(!['position','normal'].includes(k))a.deleteAttribute(k);
 a.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(...scale)));
 const n=a.attributes.position.count,c=new T.Color(color);a.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:n},()=>c.toArray()).flat(),3));a.setAttribute('yushi',new T.Float32BufferAttribute(Array.from({length:n},()=>role).flat(),3));a.clearGroups();return a;
}
const box=(size,pos,color,rot=[0,0,0])=>prep(new T.BoxGeometry(...size),color,pos,rot);
const cyl=(r,h,n,pos,color,rot=[0,0,0])=>prep(new T.CylinderGeometry(r,r,h,n),color,pos,rot);
const torus=(r,t,n,pos,color,rot=[Math.PI/2,0,0],radial=4)=>prep(new T.TorusGeometry(r,t,radial,n),color,pos,rot);
function strut(a,b,width,depth,color){const v=new T.Vector3(...b).sub(new T.Vector3(...a)),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());const g=prep(new T.BoxGeometry(width,v.length(),depth),color);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5),q,new T.Vector3(1,1,1)));return g;}
function merge(parts){const merged=mergeGeometries(parts,false),g=mergeVertices(merged,1e-6);parts.forEach(p=>p.dispose());merged.dispose();const c=g.attributes.color;g.setAttribute('color',new T.Uint8BufferAttribute(Array.from(c.array,v=>Math.round(v*255)),3,true));return g;}
function surface(theta,phi,offset=0){return new T.Vector3((rx+offset)*Math.sin(theta)*Math.sin(phi),centerY+(ry+offset)*Math.cos(theta),(rx+offset)*Math.sin(theta)*Math.cos(phi));}
function patch(t0,t1,p0,p1,nt,np,color,role=0,offset=0,segment=0){
 const positions=[],colors=[],controls=[],c=new T.Color(color);
 function vertex(t,p){const v=surface(t,p,offset);positions.push(...v.toArray());colors.push(...c.toArray());controls.push(role,role===1?(segment+(p-p0)/(p1-p0))/8:Math.cos(t),(p-p0)/(p1-p0));}
 for(let j=0;j<nt;j++)for(let i=0;i<np;i++){
  const a=t0+(t1-t0)*j/nt,b=t0+(t1-t0)*(j+1)/nt,c=p0+(p1-p0)*i/np,d=p0+(p1-p0)*(i+1)/np;
  // Outward-facing triangles; omit degenerate pole triangles.
  if(a>1e-6){vertex(a,c);vertex(b,c);vertex(a,d);}
  if(b<Math.PI-1e-6){vertex(a,d);vertex(b,c);vertex(b,d);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('yushi',new T.Float32BufferAttribute(controls,3));
 const normals=[];for(let i=0;i<positions.length;i+=3)normals.push(...new T.Vector3(positions[i]/((rx+offset)**2),(positions[i+1]-centerY)/((ry+offset)**2),positions[i+2]/((rx+offset)**2)).normalize().toArray());g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));return g;
}
function build(lod){return buildDome({T,lod,P,patch,box,cyl,torus,merge,sockets});}

function measure(root){let triangles=0,draw_calls=0;root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls++;}});const b=new T.Box3().setFromObject(root);return{triangles,draw_calls,bounds:{min:b.min.toArray(),max:b.max.toArray(),dimensions_m:b.getSize(new T.Vector3()).toArray()}};}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),assets=[];
for(const lod of [0,1,2]){
 await fs.mkdir(new URL(`lod${lod}/`,out),{recursive:true});const root=build(lod),file=`lod${lod}/yushi037_container_d0_lod${lod}.glb`,bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));await fs.writeFile(new URL(file,out),bytes);
 const document=await io.readBinary(bytes);await document.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),reorder({encoder:MeshoptEncoder,target:'size'}));document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const packed=await io.writeBinary(document),meshopt_file=file.replace('.glb','.meshopt.glb');await fs.writeFile(new URL(meshopt_file,out),packed);
 const entry={id:`yushi037_container_d0_lod${lod}`,family:'yushi037_container',designation:'Yūshi037',file,meshopt_file,lod,damage_level:0,state:'intact',static:lod===2,derived:false,bytes:bytes.length,meshopt_bytes:packed.length,sha256:sha(bytes),meshopt_sha256:sha(packed),...measure(root),plot_m:[4.4,4.4],sockets,clips:[],required_nodes:names,engine_nodes:names,fill_default:.5,fill_attribute:'_YUSHI',opaque_draw_calls:lod===2?1:2,optional_glass_draw_calls:lod===2?0:1,review_status:'contract_candidate_pending_game_camera_reference_phone',credit:'Model by jelaludo'};assets.push(entry);console.log(entry.id,entry.triangles,'triangles',entry.draw_calls,'draws',entry.bytes,'bytes');
}
const manifest={schema:'jelaludo.asset-family/v2-candidate',version:1,family:'yushi037_container',label:'Yūshi037 / Bio-Dome',japanese:'有機性資源コンテナ 第037型',status:'contract_candidate_pending_game_camera_reference_phone',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground plot centre'},supported_damage_levels:[0],missing_damage_states_reason:'First intact prototype; damage variants require a separate design request.',budgets:{lod1:{triangles_max:1500,draw_calls_max:3,plain_bytes_max:150000},lod2:{triangles_max:450,draw_calls_max:1,plain_bytes_max:50000}},lod_selection:{initial:'lod2',approach_distance_m:150,hysteresis_m:20,detailed:'manual close-up selection',review:'Provisional contract thresholds; tune with the actual game camera.'},capacity:{default_fraction:.5,range:[0,1],units:'normalized usable storage; absolute capacity is game-defined',vessel_shape:'upper_half_ellipsoid',vessel_base_m:[0,centerY,0],vessel_radii_m:[rx,ry,rx],height_mapping:'fraction = 1.5*t - 0.5*t*t*t, inverse solved by runtime adapter',independent_of_lod_and_damage:true,shader_attribute:'_YUSHI / role, level coordinate, local window x',plain_fallback:'50% colored gauge and opaque sight well; runtime.js required for live capacity'},operation_states:['empty','filling','ready','dispensing'],runtime:{adapter:'runtime.js',textures:0,fluid_simulation:false,glass:'Optional small alpha-blended sight cover, no transmission/refraction; omitted in LOD2 and instanced yard.',distance:'Static geometry with shader-driven capacity. Valve remains a lookup only; never infer fill from a static pose.',instancing:'Body and fixed-pose valve can be instanced by material. Shared-fill instancing supported by the supplied adapter; distinct per-instance fill needs a game shader attribute.'},lore:{name:'Yūshi037, organic-resource container version 037, named by jelaludo.',purpose:'Stores organic binder concentrate for ISAO to combine with local regolith and mineral aggregate when building on remote planets.',contents:'Dense olive-green industrial slurry; subtle movement only while pumping.'},compression:{source_of_truth:'plain_glb',meshopt:'Optional derived previews; consuming game compresses with gltfpack.'},assets};await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
