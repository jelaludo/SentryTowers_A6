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

const PROJECT=fileURLToPath(new URL('../..',import.meta.url));
const DIRECTORY=path.join(PROJECT,'assets/sh-rocket');
const SOURCE=path.join(DIRECTORY,'sh_rocket.glb');
const SLAB_SOURCE=path.join(PROJECT,'assets/base-kit-game/foundation_slab.glb');
const FILE='sh02_landing_island_d0_lod2.glb';
const OUTPUT=path.join(DIRECTORY,FILE);
const REQUIRED=['ROOT','SH_ROCKET','REUSABLE_BOOSTER','CARGO_CAPSULE','CARGO_CAPTURE_SOCKET','TOP_DOOR_HINGE','MARKINGS',...Array.from({length:3},(_,index)=>`LANDING_LEG_${String(index+1).padStart(2,'0')}`).flatMap(name=>[name,`${name}_HIP`,`${name}_KNEE`,`${name}_ANKLE`]),'DISTANCE_GEOMETRY'];

globalThis.FileReader=class{
  result=null;onloadend=null;onerror=null;
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();},error=>this.onerror?.(error));}
  readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();},error=>this.onerror?.(error));}
};

await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const loader=new GLTFLoader();
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
async function load(file){const bytes=await fs.readFile(file);return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
async function sha(file){return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');}
function triangles(geometry){return(geometry.index?geometry.index.count:geometry.attributes.position.count)/3;}
function materialColor(material){const base=material?.color?.clone()||new T.Color(.32,.38,.40),emissive=material?.emissive;if(emissive&&(emissive.r+emissive.g+emissive.b)>.02)base.lerp(emissive,.3).multiplyScalar(1.2);return base;}
function geometryFor(mesh,anchor,matrix=new T.Matrix4()){
  mesh.updateWorldMatrix(true,false);anchor.updateWorldMatrix(true,false);const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(new T.Matrix4().copy(anchor.matrixWorld).invert().multiply(mesh.matrixWorld)).applyMatrix4(matrix);
  for(const name of Object.keys(geometry.attributes))if(!['position','normal'].includes(name))geometry.deleteAttribute(name);if(!geometry.attributes.normal)geometry.computeVertexNormals();
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],colors=new Float32Array(geometry.attributes.position.count*3),fill=(start,count,color)=>{for(let index=start;index<start+count;index++){colors[index*3]=color.r;colors[index*3+1]=color.g;colors[index*3+2]=color.b;}};fill(0,geometry.attributes.position.count,materialColor(materials[0]));for(const group of geometry.groups)fill(group.start,group.count,materialColor(materials[group.materialIndex]||materials[0]));geometry.clearGroups();geometry.setAttribute('color',new T.BufferAttribute(colors,3));return geometry;
}
function simplifyGeometry(geometry,target,error=.025){
  const source=geometry.index?geometry.toNonIndexed():geometry.clone(),input=new T.BufferGeometry();input.setAttribute('position',source.attributes.position.clone());input.setAttribute('color',source.attributes.color.clone());source.dispose();const welded=mergeVertices(input,1e-5);input.dispose();
  const position=welded.attributes.position,index=Uint32Array.from(welded.index.array),count=Math.max(3,Math.floor(target)*3),color=welded.attributes.color,colors=Float32Array.from({length:color.count*3},(_,i)=>color.getComponent(Math.floor(i/3),i%3));const [simplified]=MeshoptSimplifier.simplifyWithAttributes(index,position.array,3,colors,3,[.1,.1,.1],null,count,error,['Permissive']),remap=new Map(),positions=[],outColors=[],indices=new Uint32Array(simplified.length);let next=0;
  for(let i=0;i<simplified.length;i++){const old=simplified[i];if(!remap.has(old)){remap.set(old,next++);positions.push(position.getX(old),position.getY(old),position.getZ(old));outColors.push(colors[old*3],colors[old*3+1],colors[old*3+2]);}indices[i]=remap.get(old);}welded.dispose();const output=new T.BufferGeometry();output.setAttribute('position',new T.Float32BufferAttribute(positions,3));output.setAttribute('color',new T.Float32BufferAttribute(outColors,3));output.setIndex(new T.BufferAttribute(indices,1));output.computeVertexNormals();return output;
}
function packColors(geometry){const color=geometry.attributes.color,packed=new Uint8Array(color.count*3);for(let i=0;i<packed.length;i++)packed[i]=Math.max(0,Math.min(255,Math.round(color.array[i]*255)));geometry.setAttribute('color',new T.Uint8BufferAttribute(packed,3,true));}
function findAncestor(mesh,name){let node=mesh;while(node){if(node.name===name)return true;node=node.parent;}return false;}
function lookupTree(sourceScene){
  const root=new T.Object3D();root.name='ROOT';const sourceRoot=sourceScene.getObjectByName('SH_ROCKET'),created=new Map([['ROOT',root]]);
  for(const name of REQUIRED.filter(name=>!['ROOT','DISTANCE_GEOMETRY'].includes(name))){const source=sourceScene.getObjectByName(name);if(!source)throw new Error(`Missing source node ${name}`);const node=new T.Object3D();node.name=name;node.position.copy(source.position);node.quaternion.copy(source.quaternion);node.scale.copy(source.scale);node.userData={...source.userData,static_lookup_only:true};let parent=source.parent;while(parent&&parent!==sourceScene&&!created.has(parent.name))parent=parent.parent;(created.get(parent?.name)||root).add(node);created.set(name,node);}
  if(!created.has(sourceRoot.name))throw new Error('SH_ROCKET lookup hierarchy missing');return root;
}
function bounds(scene){scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(scene,true);return{min:box.min.toArray(),max:box.max.toArray(),dimensions_m:box.getSize(new T.Vector3()).toArray()};}
async function exportGLB(root,file){const exporter=new GLTFExporter(),array=await exporter.parseAsync(root,{binary:true,animations:[],onlyVisible:true,trs:true});await fs.writeFile(file,Buffer.from(array));}
async function exportMeshopt(file){const document=await io.read(file);await document.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),reorder({encoder:MeshoptEncoder,target:'size'}));document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const output=file.replace(/\.glb$/,'.meshopt.glb');await io.write(output,document);return{file:path.basename(output),bytes:(await fs.stat(output)).size,sha256:await sha(output)};}

const [rocket,slab]=await Promise.all([load(SOURCE),load(SLAB_SOURCE)]),rocketRoot=rocket.scene.getObjectByName('SH_ROCKET'),meshes=[];rocket.scene.traverse(object=>{if(object.isMesh&&!findAncestor(object,'MARKINGS'))meshes.push(object);});
const groups={booster:[],cargo:[],leg1:[],leg2:[],leg3:[]};for(const mesh of meshes){if(findAncestor(mesh,'CARGO_CAPSULE'))groups.cargo.push(mesh);else if(findAncestor(mesh,'LANDING_LEG_01'))groups.leg1.push(mesh);else if(findAncestor(mesh,'LANDING_LEG_02'))groups.leg2.push(mesh);else if(findAncestor(mesh,'LANDING_LEG_03'))groups.leg3.push(mesh);else groups.booster.push(mesh);}
const targets={booster:850,cargo:500,leg1:260,leg2:260,leg3:260},parts=[];for(const [name,members] of Object.entries(groups)){const originals=members.map(mesh=>geometryFor(mesh,rocketRoot)),merged=mergeGeometries(originals,false);for(const geometry of originals)geometry.dispose();parts.push(simplifyGeometry(merged,targets[name]));merged.dispose();}
const slabRoot=slab.scene.getObjectByName('ROOT')||slab.scene.children[0],scale=new T.Matrix4().makeScale(.4,1,.4);slab.scene.traverse(object=>{if(object.isMesh){const original=geometryFor(object,slabRoot,scale),indexed=mergeVertices(original,1e-5);original.dispose();parts.push(indexed);}});
const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();packColors(geometry);const material=new T.MeshStandardMaterial({name:'SH02_DISTANCE_VERTEX_PALETTE',vertexColors:true,metalness:.28,roughness:.62}),root=lookupTree(rocket.scene),mesh=new T.Mesh(geometry,material);mesh.name='DISTANCE_GEOMETRY';root.add(mesh);root.userData={asset_id:'sh02_landing_island_d0_lod2',family:'sh02_landing_island',lod:2,damage_level:0,state:'intact_deployed',derived:true,source_of_truth:'plain_glb',static:true,plot_m:[16,16]};root.updateMatrixWorld(true);
await exportGLB(root,OUTPUT);const meshopt=await exportMeshopt(OUTPUT),metrics={triangles:Math.round(triangles(geometry)),draw_calls:1,materials:1,textures:0},outputBounds=bounds(root),sourceRocketBounds=bounds(rocket.scene),bytes=(await fs.stat(OUTPUT)).size;
const cargo=rocket.scene.getObjectByName('CARGO_CAPTURE_SOCKET');cargo.getWorldPosition(new T.Vector3());const entry={id:'sh02_landing_island_d0_lod2',family:'sh02_landing_island',name:'SH02 landing island',description:'Static intact SH02 on the documented 16 × 16 m landing-site slab for map, orbit and loading views.',file:FILE,meshopt_file:meshopt.file,lod:2,quality:'distance',damage_level:0,state:'intact_deployed',role:'map_orbit_loading_and_far_view',derived:true,derived_from:['sh_rocket.glb','../base-kit-game/foundation_slab.glb'],source_sha256:await sha(SOURCE),slab_source_sha256:await sha(SLAB_SOURCE),sha256:await sha(OUTPUT),bytes,meshopt_bytes:meshopt.bytes,meshopt_sha256:meshopt.sha256,...metrics,plot_m:[16,16],sockets:[{id:'CARGO_CAPTURE_SOCKET',kind:'cargo_capture',position_m:cargo.getWorldPosition(new T.Vector3()).toArray(),normal:[0,1,0],available:true}],colliders:[{id:'landing_island',center_m:[0,-.6,0],size_m:[16,1.2,16],condition:'always'},{id:'rocket_body',center_m:[0,10.7,0],size_m:[6.5,21.4,6.5],condition:'D0'}],clips:[],animations:[],required_nodes:REQUIRED,engine_nodes:REQUIRED.filter(name=>name!=='DISTANCE_GEOMETRY'),bounds:outputBounds,source_rocket_bounds:sourceRocketBounds,review_status:'contract_candidate_pending_map_camera_reference_phone',credit:'Models by jelaludo'};
const manifest={schema:'jelaludo.asset-family/v2-candidate',version:2,family:'sh02_landing_island',label:'SH02 landing island',status:'contract_candidate_pending_map_camera_reference_phone',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'landing-island top centre at Y=0'},budgets:{lod2:{triangles_max:3000,draw_calls_max:1,plain_bytes_max:250000}},supported_damage_levels:[0],missing_damage_states_reason:'The current SH02 approach asset authors only intact D0. Older HUGIN flight wreck art is a separate legacy family and is not relabeled as SH02 damage.',lod_selection:{initial:'lod2',approach_distance_m:150,hysteresis_m:20,approach_asset:'sh_rocket.glb',review:'Tune with the game map camera and reference phone before release.'},derivation:{method:'Per-assembly topology-preserving Meshoptimizer simplification of the deployed SH02 rest pose, merged with the documented 16 × 16 m scalable-island slab; markings omitted below readable size.',animation_note:'Static composite. Swap to sh_rocket.glb before landing gear, shock absorption, cargo door or marking changes must read.'},assets:[entry]};
await fs.writeFile(path.join(DIRECTORY,'manifest-lods.json'),JSON.stringify(manifest,null,2)+'\n');console.log(entry.id,entry.triangles,'triangles',entry.draw_calls,'draw',entry.bytes,'plain bytes',entry.meshopt_bytes,'Meshopt bytes');
