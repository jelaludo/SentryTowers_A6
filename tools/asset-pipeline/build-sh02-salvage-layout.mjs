import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,prune,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';

const ROOT=fileURLToPath(new URL('../..',import.meta.url));
const OUT=path.join(ROOT,'assets/sh02-salvage');
const SOURCE=path.join(ROOT,'assets/sh-rocket/sh_rocket.glb');
const COLORS={graphite:0x17262d,dark:0x08151b,teal:0x167487,white:0xcbd8d5,cyan:0x21d8ff,amber:0xffaa38,steel:0x71878b};
const SECTIONS=[
  {id:'LANDING',node:'SH02_SALVAGE_SECTION_00_LANDING',geometry:'SH02_SALVAGE_GEOMETRY_00_LANDING',label:'Lower landing and engine unit plus lower tank section'},
  {id:'TANK',node:'SH02_SALVAGE_SECTION_01_TANK',geometry:'SH02_SALVAGE_GEOMETRY_01_TANK',label:'Upper propellant tank section'},
  {id:'CAPSULE',node:'SH02_SALVAGE_SECTION_02_CAPSULE',geometry:'SH02_SALVAGE_GEOMETRY_02_CAPSULE',label:'Top cargo capsule'},
  {id:'ISAO_MODULE',node:'SH02_SALVAGE_SECTION_03_ISAO_MODULE',geometry:'SH02_SALVAGE_GEOMETRY_03_ISAO_MODULE',label:'Removable ISAO emergence module'}
];
const SOCKETS=[
  {id:'SALVAGE_TARGET_00',node:'SOCKET_SALVAGE_TARGET_00',section:'LANDING',position_m:[-5.68,5.7,0],normal:[1,0,0]},
  {id:'SALVAGE_TARGET_01',node:'SOCKET_SALVAGE_TARGET_01',section:'TANK',position_m:[.9,2.1,-4.45],normal:[1,0,0]},
  {id:'SALVAGE_TARGET_02',node:'SOCKET_SALVAGE_TARGET_02',section:'CAPSULE',position_m:[.8,2.15,4.5],normal:[1,0,0]},
  {id:'SALVAGE_TARGET_03',node:'SOCKET_SALVAGE_TARGET_03',section:'ISAO_MODULE',position_m:[1.15,.8,2.72],normal:[0,0,-1]},
  {id:'ISAO_RELEASE',node:'SOCKET_ISAO_RELEASE',section:'ISAO_MODULE',position_m:[1.15,1.05,4.6],normal:[0,0,1]}
];
const REQUIRED=['SH02_SALVAGE_LAYOUT_ROOT',...SECTIONS.flatMap(section=>[section.node,section.geometry]),'SH02_SALVAGE_DISTANCE_GEOMETRY',...SOCKETS.map(socket=>socket.node)];

globalThis.FileReader=class{result=null;onloadend=null;onerror=null;readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();},error=>this.onerror?.(error));}readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();},error=>this.onerror?.(error));}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
await fs.mkdir(OUT,{recursive:true});
const loader=new GLTFLoader();
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
async function load(file){const bytes=await fs.readFile(file);return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
async function sha(file){return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');}
function triangles(geometry){return(geometry.index?geometry.index.count:geometry.attributes.position.count)/3;}
function transform(position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){return new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale));}
function materialColor(material){const base=material?.color?.clone()||new T.Color(COLORS.steel),emissive=material?.emissive;if(emissive&&(emissive.r+emissive.g+emissive.b)>.02)base.lerp(emissive,.3).multiplyScalar(1.18);return base;}
function geometryFor(mesh,anchor,matrix=new T.Matrix4()){
  mesh.updateWorldMatrix(true,false);anchor.updateWorldMatrix(true,false);const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(new T.Matrix4().copy(anchor.matrixWorld).invert().multiply(mesh.matrixWorld)).applyMatrix4(matrix);
  for(const name of Object.keys(geometry.attributes))if(!['position','normal'].includes(name))geometry.deleteAttribute(name);if(!geometry.attributes.normal)geometry.computeVertexNormals();
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],colors=new Float32Array(geometry.attributes.position.count*3),fill=(start,count,color)=>{for(let index=start;index<start+count;index++){colors[index*3]=color.r;colors[index*3+1]=color.g;colors[index*3+2]=color.b;}};fill(0,geometry.attributes.position.count,materialColor(materials[0]));for(const group of geometry.groups)fill(group.start,group.count,materialColor(materials[group.materialIndex]||materials[0]));geometry.clearGroups();geometry.setAttribute('color',new T.BufferAttribute(colors,3));return geometry;
}
function colored(geometry,color,matrix=new T.Matrix4()){
  const output=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();output.applyMatrix4(matrix);for(const name of Object.keys(output.attributes))if(!['position','normal'].includes(name))output.deleteAttribute(name);const c=new T.Color(color),colors=new Float32Array(output.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}output.clearGroups();output.setAttribute('color',new T.BufferAttribute(colors,3));return output;
}
function box(size,position,color,rotation=[0,0,0]){return colored(new T.BoxGeometry(...size),color,transform(position,rotation));}
function cyl(radius,height,segments,position,color,rotation=[0,0,0]){return colored(new T.CylinderGeometry(radius,radius,height,segments,1,false),color,transform(position,rotation));}
function ring(radius,tube,segments,position,color,rotation=[0,0,0]){return colored(new T.TorusGeometry(radius,tube,6,segments),color,transform(position,rotation));}
function merge(parts){const output=mergeGeometries(parts,false);for(const part of parts)part.dispose();if(!output)throw Error('Unable to merge section geometry');return output;}
function simplifyGeometry(geometry,target,error=.035){
  if(triangles(geometry)<=target)return geometry.clone();const source=geometry.index?geometry.toNonIndexed():geometry.clone(),input=new T.BufferGeometry();input.setAttribute('position',source.attributes.position.clone());input.setAttribute('color',source.attributes.color.clone());source.dispose();const welded=mergeVertices(input,1e-5);input.dispose();
  const position=welded.attributes.position,index=Uint32Array.from(welded.index.array),count=Math.max(3,Math.floor(target)*3),color=welded.attributes.color,colors=Float32Array.from({length:color.count*3},(_,i)=>color.getComponent(Math.floor(i/3),i%3));const [simplified]=MeshoptSimplifier.simplifyWithAttributes(index,position.array,3,colors,3,[.1,.1,.1],null,count,error,['Permissive']),remap=new Map(),positions=[],outColors=[],indices=new Uint32Array(simplified.length);let next=0;
  for(let i=0;i<simplified.length;i++){const old=simplified[i];if(!remap.has(old)){remap.set(old,next++);positions.push(position.getX(old),position.getY(old),position.getZ(old));outColors.push(colors[old*3],colors[old*3+1],colors[old*3+2]);}indices[i]=remap.get(old);}welded.dispose();const output=new T.BufferGeometry();output.setAttribute('position',new T.Float32BufferAttribute(positions,3));output.setAttribute('color',new T.Float32BufferAttribute(outColors,3));output.setIndex(new T.BufferAttribute(indices,1));output.computeVertexNormals();return output;
}
function packColors(geometry){const color=geometry.attributes.color,packed=new Uint8Array(color.count*3);for(let i=0;i<packed.length;i++)packed[i]=Math.max(0,Math.min(255,Math.round(color.array[i]*255)));geometry.setAttribute('color',new T.Uint8BufferAttribute(packed,3,true));}
function ancestorStarts(object,prefix){let node=object;while(node){if(node.name.startsWith(prefix))return true;node=node.parent;}return false;}
function boosterSection(segments){return merge([
  cyl(2,8.25,segments,[0,6.3,0],COLORS.white),cyl(2.04,.28,segments,[0,2.25,0],COLORS.graphite),ring(2.03,.10,segments,[0,3.3,0],COLORS.steel,[Math.PI/2,0,0]),ring(2.03,.10,segments,[0,7.0,0],COLORS.steel,[Math.PI/2,0,0]),ring(2.03,.13,segments,[0,10.38,0],COLORS.teal,[Math.PI/2,0,0]),cyl(1.82,.15,segments,[0,10.42,0],COLORS.dark)
]);}
function tankSection(segments){return merge([
  cyl(2,4.3,segments,[0,0,0],COLORS.white),ring(2.03,.12,segments,[0,-2.02,0],COLORS.teal,[Math.PI/2,0,0]),ring(2.03,.1,segments,[0,2.02,0],COLORS.steel,[Math.PI/2,0,0]),cyl(1.82,.14,segments,[0,-2.14,0],COLORS.dark),cyl(1.82,.14,segments,[0,2.14,0],COLORS.dark)
]);}
function isaoModule(segments){const parts=[
  box([2.35,1.55,1.7],[0,.78,0],COLORS.graphite),box([2.05,1.28,1.82],[0,.82,0],COLORS.white),box([1.72,1.02,.12],[0,.83,.93],COLORS.dark),box([1.35,.72,.05],[0,.85,1.01],COLORS.cyan),
  box([1.85,.14,1.25],[0,.25,1.48],COLORS.white,[-.7,0,0]),box([1.4,.06,.9],[0,.25,1.53],COLORS.teal,[-.7,0,0]),ring(.18,.055,segments,[-.82,.78,.9],COLORS.amber,[Math.PI/2,0,0]),ring(.18,.055,segments,[.82,.78,.9],COLORS.amber,[Math.PI/2,0,0]),
  box([.14,1.15,1.9],[-1.12,.76,0],COLORS.teal),box([.14,1.15,1.9],[1.12,.76,0],COLORS.teal),box([1.5,.12,.26],[0,1.62,0],COLORS.amber)
];return merge(parts);}
function addSocket(root,socket){const node=new T.Object3D();node.name=socket.node;node.position.fromArray(socket.position_m);node.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...socket.normal).normalize());node.userData={socket_kind:socket.id==='ISAO_RELEASE'?'character_release':'salvage_target',salvage_section:socket.section};root.add(node);}
function makeSection(root,definition,geometry,position,rotation,shared){const node=new T.Object3D();node.name=definition.node;node.position.fromArray(position);node.rotation.fromArray([...rotation,'XYZ']);node.userData={salvage_section:definition.id,salvage_stage:1,damage_level:0,description:definition.label,static_piece:true};const mesh=new T.Mesh(geometry,shared);mesh.name=definition.geometry;node.add(mesh);root.add(node);return node;}
function sourceSections(source,lod){
  const sourceRoot=source.scene.getObjectByName('SH_ROCKET'),landingMeshes=[],capsuleMeshes=[];source.scene.traverse(object=>{if(!object.isMesh||ancestorStarts(object,'MARKINGS'))return;if(ancestorStarts(object,'LANDING_LEG_')||/^Engine_bell/i.test(object.name))landingMeshes.push(object);if(ancestorStarts(object,'CARGO_CAPSULE'))capsuleMeshes.push(object);});
  const landingExact=landingMeshes.map(mesh=>geometryFor(mesh,sourceRoot)),capsuleMatrix=new T.Matrix4().makeTranslation(0,-18.69,0),capsuleExact=capsuleMeshes.map(mesh=>geometryFor(mesh,sourceRoot,capsuleMatrix));let landing=merge([boosterSection(lod===0?40:20),...landingExact]),capsule=merge(capsuleExact),tank=tankSection(lod===0?40:20),module=isaoModule(lod===0?24:12);
  if(lod===1){const originals=[landing,tank,capsule,module],targets=[2000,500,1900,650];[landing,tank,capsule,module]=originals.map((geometry,index)=>simplifyGeometry(geometry,targets[index]));for(const geometry of originals)geometry.dispose();}
  return[landing,tank,capsule,module];
}
function bounds(root){root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root,true);return{min:box.min.toArray(),max:box.max.toArray(),dimensions_m:box.getSize(new T.Vector3()).toArray()};}
function measure(root){let triangleCount=0,drawCalls=0;const materials=new Set(),textures=new Set();root.traverse(object=>{if(!(object.isMesh||object.isLine||object.isPoints))return;drawCalls+=object.geometry.groups.length||1;for(const material of [].concat(object.material||[])){materials.add(material);for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'])if(material?.[key])textures.add(material[key]);}if(object.isMesh)triangleCount+=(object.geometry.index?object.geometry.index.count:object.geometry.attributes.position.count)/3;});return{triangles:Math.round(triangleCount),draw_calls:drawCalls,materials:materials.size,textures:textures.size};}
async function exportGLB(root,file){const data=await new GLTFExporter().parseAsync(root,{binary:true,animations:[],onlyVisible:true,trs:true});await fs.writeFile(file,Buffer.from(data));}
async function meshopt(file){const document=await io.read(file);await document.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),reorder({encoder:MeshoptEncoder,target:'size'}));document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const output=file.replace(/\.glb$/,'.meshopt.glb');await io.write(output,document);return{file:path.basename(output),bytes:(await fs.stat(output)).size,sha256:await sha(output)};}

const source=await load(SOURCE),assets=[];
for(const lod of [0,1,2]){
  const root=new T.Group();root.name='SH02_SALVAGE_LAYOUT_ROOT';root.userData={asset_id:`sh02_salvage_layout_stage1_lod${lod}`,family:'sh02_salvage_layout',lod,damage_level:0,salvage_stage:1,state:'sectioned_staging',static:true,plot_m:[24,18],source_of_truth:'plain_glb'};const shared=new T.MeshStandardMaterial({name:'SH02_SALVAGE_VERTEX_PALETTE',color:0xffffff,vertexColors:true,metalness:.3,roughness:.6}),geometries=sourceSections(source,lod===2?1:lod),transforms=[{p:[-7.75,0,0],r:[0,0,0]},{p:[-1.35,2.15,-4.45],r:[0,0,Math.PI/2]},{p:[-1.9,2.1,4.5],r:[0,0,-Math.PI/2]},{p:[1.15,.2062,3.35],r:[0,.12,0]}];
  transforms[0].p[1]=.2062;
  if(lod<2){for(let index=0;index<SECTIONS.length;index++){packColors(geometries[index]);makeSection(root,SECTIONS[index],geometries[index],transforms[index].p,transforms[index].r,shared);}const distance=new T.Object3D();distance.name='SH02_SALVAGE_DISTANCE_GEOMETRY';distance.userData={static_lookup_only:true};root.add(distance);}
  else{const parts=[];for(let index=0;index<geometries.length;index++){const original=geometries[index],part=original.index?original.toNonIndexed():original.clone();original.dispose();part.applyMatrix4(transform(transforms[index].p,transforms[index].r));parts.push(part);const section=new T.Object3D();section.name=SECTIONS[index].node;section.position.fromArray(transforms[index].p);section.rotation.fromArray([...transforms[index].r,'XYZ']);section.userData={salvage_section:SECTIONS[index].id,salvage_stage:1,damage_level:0,static_lookup_only:true};const geometryLookup=new T.Object3D();geometryLookup.name=SECTIONS[index].geometry;geometryLookup.userData={static_lookup_only:true};section.add(geometryLookup);root.add(section);}const merged=merge(parts),reduced=simplifyGeometry(merged,2400,.05);merged.dispose();packColors(reduced);const mesh=new T.Mesh(reduced,shared);mesh.name='SH02_SALVAGE_DISTANCE_GEOMETRY';root.add(mesh);}
  for(const socket of SOCKETS)addSocket(root,socket);root.updateMatrixWorld(true);const file=path.join(OUT,`sh02_salvage_layout_stage1_lod${lod}.glb`);await exportGLB(root,file);const compressed=await meshopt(file),entry={id:`sh02_salvage_layout_stage1_lod${lod}`,family:'sh02_salvage_layout',name:'SH02 four-piece salvage layout',file:path.basename(file),meshopt_file:compressed.file,lod,quality:lod===0?'detailed_master':lod===1?'game':'distance',damage_level:0,salvage_stage:1,state:'sectioned_staging',role:lod===0?'close_review_and_recording':lod===1?'arrival_recycling_game_camera':'map_loading_far_view',static:true,derived:lod>0,derived_from:lod>0?'sh02_salvage_layout_stage1_lod0.glb':'../sh-rocket/sh_rocket.glb',source_sha256:await sha(SOURCE),sha256:await sha(file),meshopt_sha256:compressed.sha256,bytes:(await fs.stat(file)).size,meshopt_bytes:compressed.bytes,...measure(root),bounds:bounds(root),plot_m:[24,18],sections:SECTIONS,sockets:SOCKETS.map(socket=>({...socket,kind:socket.id==='ISAO_RELEASE'?'character_release':'salvage_target',available:true})),clips:[],animations:[],required_nodes:REQUIRED,engine_nodes:REQUIRED,review_status:'contract_candidate_pending_game_camera_reference_phone',credit:'Models by jelaludo'};assets.push(entry);console.log(entry.id,entry.triangles,'triangles',entry.draw_calls,'draws',entry.bytes,'bytes');
}
const manifest={schema:'jelaludo.asset-family/v2-candidate',version:2,family:'sh02_salvage_layout',label:'SH02 four-piece salvage layout',status:'contract_candidate_pending_game_camera_reference_phone',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'arrival-recycling site ground; composed around AFR-01 service arm'},budgets:{lod1:{triangles_max:8000,draw_calls_max:10,plain_bytes_max:400000},lod2:{triangles_max:3000,draw_calls_max:1,plain_bytes_max:250000}},state_model:{damage_level:0,salvage_stage:1,separate_from_damage_and_lod:true,description:'Post-landing staging after SH02 separates into four reusable construction-feed assemblies.'},source:{file:'../sh-rocket/sh_rocket.glb',sha256:await sha(SOURCE),preserved:true},lod_selection:{initial:'lod2',approach_distance_m:150,hysteresis_m:20,review:'Tune with the AFR-01 sequence game camera and reference phone.'},assets};await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('SH02_SALVAGE_LAYOUT_COMPLETE');
