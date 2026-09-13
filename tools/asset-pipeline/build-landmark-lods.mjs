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
const GAME_TARGET=7200,DISTANCE_TARGET=2200;
const CONFIGS=[
  {
    key:'hugin',family:'hugin_launchpad',folder:'launchpad',label:'HUGIN launch and recovery complex',clip:'Cargo_Recovery_Cycle',duration:20,
    anchors:['CATCHER_LIFT','CATCHER_SHOULDER','CATCHER_ELBOW','CATCHER_WRIST','CAPTURE_JAW_L','CAPTURE_JAW_R'],
    required:['ROOT','CATCHER_LIFT','CATCHER_SHOULDER','CATCHER_ELBOW','CATCHER_WRIST','CAPTURE_JAW_L','CAPTURE_JAW_R','CARGO_CAPSULE','CARGO_CAPTURE_SOCKET','REUSABLE_BOOSTER','LANDING_LEG_01','LANDING_LEG_02','LANDING_LEG_03','FLAT_LANDING_FOOT_01','FLAT_LANDING_FOOT_02','FLAT_LANDING_FOOT_03','SOCKET_FUEL'],
    plot:[40,40],swap:150,hysteresis:20
  },
  {
    key:'stalheart',family:'terraformer_3000',folder:'terraformer',label:'Terraformer 3000 / Stålheart',clip:'Terraforming_Cycle',duration:16,
    anchors:['GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z','J1_BASE_YAW','J2_SHOULDER','J3_ELBOW','J4_FOREARM_ROLL','J5_WRIST_PITCH','J6_TOOL_ROLL'],
    required:['ROOT','GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z','J1_BASE_YAW','J2_SHOULDER','J3_ELBOW','J4_FOREARM_ROLL','J5_WRIST_PITCH','J6_TOOL_ROLL','EXTRUSION_TIP','SOCKET_MATERIAL_INPUT'],
    plot:[48,56],swap:150,hysteresis:20
  }
];

globalThis.FileReader=class{
  result=null;onloadend=null;onerror=null;
  readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();},e=>this.onerror?.(e));}
  readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();},e=>this.onerror?.(e));}
};

const loader=new GLTFLoader();
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const transformIO=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
async function load(file){const b=await fs.readFile(file);return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
function safe(name){return (name||'NODE').normalize('NFKD').replaceAll('.','_').replace(/[^A-Za-z0-9_ -]/g,'').trim().replaceAll(' ','_')||'NODE';}
function triangleCount(g){return (g.index?g.index.count:g.attributes.position.count)/3;}
function descendants(root){const out=[];root.traverse(o=>out.push(o));return out;}
function materialColor(material){
  const base=material?.color?.clone()||new T.Color(.34,.42,.43),emissive=material?.emissive;
  if(emissive&&(emissive.r+emissive.g+emissive.b)>.02)base.lerp(emissive,.35).multiplyScalar(1.35);
  return base;
}
function geometryFor(mesh,anchor){
  mesh.updateWorldMatrix(true,false);anchor.updateWorldMatrix(true,false);
  const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  g.applyMatrix4(new T.Matrix4().copy(anchor.matrixWorld).invert().multiply(mesh.matrixWorld));
  for(const name of Object.keys(g.attributes))if(!['position','normal'].includes(name))g.deleteAttribute(name);
  if(!g.attributes.normal)g.computeVertexNormals();
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],colors=new Float32Array(g.attributes.position.count*3);
  const fill=(start,count,color)=>{for(let i=start;i<start+count;i++){colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;}};
  fill(0,g.attributes.position.count,materialColor(materials[0]));
  for(const group of g.groups)fill(group.start,group.count,materialColor(materials[group.materialIndex]||materials[0]));
  g.clearGroups();g.setAttribute('color',new T.BufferAttribute(colors,3));return g;
}
function combine(meshes,anchor,name,material){
  if(!meshes.length)return null;
  const geometries=meshes.map(mesh=>geometryFor(mesh,anchor)),geometry=mergeGeometries(geometries,false);
  for(const geometry of geometries)geometry.dispose();for(const mesh of meshes)mesh.removeFromParent();
  const output=new T.Mesh(geometry,material);output.name=name;anchor.add(output);return output;
}
function nearestAnchor(mesh,root,anchors){let p=mesh.parent;while(p&&p!==root){if(anchors.has(p.name))return p;p=p.parent;}return root;}
function simplifyGeometry(geometry,ratio){
  const source=geometry.index?geometry.toNonIndexed():geometry.clone(),input=new T.BufferGeometry();
  input.setAttribute('position',source.attributes.position.clone());input.setAttribute('color',source.attributes.color.clone());source.dispose();
  const welded=mergeVertices(input,1e-5);input.dispose();const position=welded.attributes.position,index=Uint32Array.from(welded.index.array),target=Math.max(3,Math.floor(index.length*ratio/3)*3),color=welded.attributes.color;
  const colors=Float32Array.from({length:color.count*3},(_,i)=>color.getComponent(Math.floor(i/3),i%3));
  const [simplified]=MeshoptSimplifier.simplifyWithAttributes(index,position.array,3,colors,3,[.12,.12,.12],null,target,.035,['Permissive']);
  const remap=new Map(),positions=[],outColors=[],indices=new Uint32Array(simplified.length);let next=0;
  for(let i=0;i<simplified.length;i++){const old=simplified[i];if(!remap.has(old)){remap.set(old,next++);positions.push(position.getX(old),position.getY(old),position.getZ(old));outColors.push(colors[old*3],colors[old*3+1],colors[old*3+2]);}indices[i]=remap.get(old);}
  welded.dispose();const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(positions,3));out.setAttribute('color',new T.Float32BufferAttribute(outColors,3));out.setIndex(new T.BufferAttribute(indices,1));out.computeVertexNormals();return out;
}
function reduce(root,target){
  const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});const total=meshes.reduce((n,m)=>n+triangleCount(m.geometry),0),ratio=Math.min(1,target/total);
  for(const mesh of meshes){const reduced=simplifyGeometry(mesh.geometry,ratio);mesh.geometry.dispose();mesh.geometry=reduced;}
}
function cleanDegenerates(root){
  root.traverse(mesh=>{if(!mesh.isMesh)return;const source=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),position=source.attributes.position,keep=[];
    for(let i=0;i<position.count;i+=3){const a=new T.Vector3().fromBufferAttribute(position,i),b=new T.Vector3().fromBufferAttribute(position,i+1),c=new T.Vector3().fromBufferAttribute(position,i+2);if(a.toArray().every(Number.isFinite)&&b.toArray().every(Number.isFinite)&&c.toArray().every(Number.isFinite)&&b.sub(a).cross(c.sub(a)).lengthSq()>1e-20)keep.push(i,i+1,i+2);}
    if(keep.length===position.count){source.dispose();return;}const cleaned=new T.BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes)){const array=new Float32Array(keep.length*attribute.itemSize);for(let i=0;i<keep.length;i++)for(let component=0;component<attribute.itemSize;component++)array[i*attribute.itemSize+component]=attribute.getComponent(keep[i],component);cleaned.setAttribute(name,new T.BufferAttribute(array,attribute.itemSize,attribute.normalized));}mesh.geometry.dispose();mesh.geometry=cleaned;source.dispose();
  });
}
function normalizeColors(root){
  root.traverse(mesh=>{const color=mesh.geometry?.attributes?.color;if(!color||color.array instanceof Uint8Array)return;const packed=new Uint8Array(color.count*3);for(let i=0;i<color.count*3;i++)packed[i]=Math.max(0,Math.min(255,Math.round(color.array[i]*255)));mesh.geometry.setAttribute('color',new T.Uint8BufferAttribute(packed,3,true));});
}
function uniqueNames(root,protectedNames){
  const used=new Set();root.traverse(o=>{const protectedName=protectedNames.has(o.name),base=protectedName?o.name:safe(o.name),stem=base||o.type;let name=stem,n=2;while(used.has(name))name=`${stem}_${String(n++).padStart(3,'0')}`;o.name=name;used.add(name);});
}
function templateFor(scene,required){
  const root=scene.getObjectByName('ROOT')||scene.children[0],records=new Map();
  for(const name of required){const object=scene.getObjectByName(name);if(!object)continue;let parent=object.parent;while(parent&&parent!==root&&!required.includes(parent.name))parent=parent.parent;records.set(name,{parent:parent?.name||'ROOT',position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),userData:{...object.userData}});}
  return records;
}
function ensureRequired(scene,assetRoot,config){
  for(const name of config.required){
    if(name==='ROOT')continue;let object=scene.getObjectByName(name);
    if(object?.isMesh){const marker=new T.Object3D();marker.name=name;marker.position.copy(object.position);marker.quaternion.copy(object.quaternion);marker.scale.copy(object.scale);marker.userData={...object.userData,lookup_marker:true};object.name=`${name}_VISUAL`;object.parent.add(marker);for(const child of [...object.children])marker.attach(child);object=marker;}
    if(!object){const record=config.template.get(name);if(!record)throw new Error(`${config.family}: D0 template is missing required node ${name}`);const marker=new T.Object3D();marker.name=name;marker.position.fromArray(record.position);marker.quaternion.fromArray(record.quaternion);marker.scale.fromArray(record.scale);marker.userData={...record.userData,lookup_marker:true,absent_in_damage_geometry:true};(scene.getObjectByName(record.parent)||assetRoot).add(marker);}
  }
}
function pruneEmpty(root,required){
  let changed=true;while(changed){changed=false;for(const object of descendants(root).reverse()){if(object!==root&&!object.isMesh&&!required.has(object.name)&&!object.children.length){object.removeFromParent();changed=true;}}}
}
function filteredClip(gltf,config,scene){
  const source=gltf.animations.find(clip=>clip.name===config.clip)||gltf.animations[0];if(!source)return null;
  const targets=new Set(config.anchors),tracks=source.tracks.filter(track=>targets.has(T.PropertyBinding.parseTrackName(track.name).nodeName)).map(track=>track.clone());
  return new T.AnimationClip(config.clip,config.duration,tracks);
}
function measure(scene){let triangles=0,drawCalls=0;scene.traverse(o=>{if(o.isMesh){triangles+=triangleCount(o.geometry);drawCalls++;}});return{triangles:Math.round(triangles),draw_calls:drawCalls};}
function bounds(scene){scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(scene),size=box.getSize(new T.Vector3());return{min:box.min.toArray(),max:box.max.toArray(),dimensions_m:size.toArray()};}
async function exportGLB(scene,animations,file){const exporter=new GLTFExporter(),array=await exporter.parseAsync(scene,{binary:true,animations,onlyVisible:true,trs:true});await fs.writeFile(file,Buffer.from(array));}
async function exportMeshopt(file){const document=await transformIO.read(file);await document.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),reorder({encoder:MeshoptEncoder,target:'size'}));document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const output=file.replace(/\.glb$/,'.meshopt.glb');await transformIO.write(output,document);return{file:path.basename(output),bytes:(await fs.stat(output)).size,sha256:await hash(output)};}
async function hash(file){return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');}

async function buildOne(config,sourceEntry,lod){
  const source=path.join(ROOT,'assets',config.folder,sourceEntry.file),gltf=await load(source),scene=gltf.scene,assetRoot=scene.getObjectByName('ROOT')||scene.children[0],sourceBounds=bounds(scene),material=new T.MeshStandardMaterial({name:`${config.family.toUpperCase()}_VERTEX_PALETTE`,vertexColors:true,metalness:.3,roughness:.58});
  ensureRequired(scene,assetRoot,config);
  const clip=sourceEntry.animations?.length?filteredClip(gltf,config,scene):null;
  if(config.key==='stalheart')for(const object of descendants(scene))if(/^Flexible carriage material feed/.test(object.name))object.removeFromParent();
  const meshes=descendants(scene).filter(o=>o.isMesh),anchors=new Set(sourceEntry.animations?.length&&lod===1?config.anchors:[]);
  if(lod===2||!anchors.size)combine(meshes,assetRoot,`${config.family.toUpperCase()}_LOD${lod}_STATIC_GEOMETRY`,material);
  else{
    const groups=new Map();for(const mesh of meshes){const anchor=nearestAnchor(mesh,assetRoot,anchors);if(!groups.has(anchor))groups.set(anchor,[]);groups.get(anchor).push(mesh);}
    for(const [anchor,members] of groups)combine(members,anchor,`${config.family.toUpperCase()}_LOD1_${anchor===assetRoot?'STATIC':anchor.name}_GEOMETRY`,material);
  }
  reduce(scene,lod===1?GAME_TARGET:DISTANCE_TARGET);cleanDegenerates(scene);normalizeColors(scene);
  const required=new Set(config.required);required.add(assetRoot.name);for(const anchor of config.anchors)required.add(anchor);pruneEmpty(scene,required);uniqueNames(scene,required);
  assetRoot.name='ROOT';assetRoot.userData={...assetRoot.userData,asset_id:`${config.family}_d${sourceEntry.damage_level}_lod${lod}`,family:config.family,lod,damage_level:sourceEntry.damage_level,derived:true,source_of_truth:'plain_glb'};
  const animations=lod===1&&clip?[clip]:[];scene.updateMatrixWorld(true);const metrics=measure(scene),outputBounds=bounds(scene),fileName=`${config.family}_d${sourceEntry.damage_level}_lod${lod}.glb`,file=path.join(ROOT,'assets',config.folder,fileName);
  await exportGLB(scene,animations,file);const compressed=await exportMeshopt(file),bytes=(await fs.stat(file)).size;
  return{
    id:`${config.family}_d${sourceEntry.damage_level}_lod${lod}`,family:config.family,file:fileName,meshopt_file:compressed.file,lod,quality:lod===1?'game':'distance',damage_level:sourceEntry.damage_level,role:lod===1?'approach_and_game_camera':'map_loading_and_far_view',derived:true,derived_from:sourceEntry.file,source_sha256:await hash(source),sha256:await hash(file),bytes,meshopt_bytes:compressed.bytes,meshopt_sha256:compressed.sha256,...metrics,materials:1,textures:0,plot_m:sourceEntry.plot_m||config.plot,sockets:sourceEntry.sockets||[],colliders:sourceEntry.colliders||[],clips:animations.map(a=>({name:a.name,duration_s:a.duration,loop:true})),animations:animations.map(a=>a.name),required_nodes:config.required,bounds:outputBounds,source_bounds:sourceBounds,review_status:'contract_candidate_pending_game_camera_reference_phone',credit:'Models by jelaludo'
  };
}

for(const config of CONFIGS){
  const sourceManifest=JSON.parse(await fs.readFile(path.join(ROOT,'assets',config.folder,'manifest.json'))),assets=[];
  const templateSource=path.join(ROOT,'assets',config.folder,sourceManifest.assets.find(entry=>entry.damage_level===0).file),templateGLTF=await load(templateSource);config.template=templateFor(templateGLTF.scene,config.required);
  for(const entry of sourceManifest.assets)for(const lod of [1,2]){const result=await buildOne(config,entry,lod);assets.push(result);console.log(result.id,result.triangles,'triangles',result.draw_calls,'draws',result.bytes,'bytes');}
  const manifest={schema:'jelaludo.asset-family/v2-candidate',version:2,family:config.family,label:config.label,status:'contract_candidate_pending_game_camera_reference_phone',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground at plot centre'},budgets:{lod1:{triangles_max:8000,draw_calls_max:10,plain_bytes_max:400000},lod2:{triangles_max:3000,draw_calls_max:1,plain_bytes_max:250000}},lod_selection:{initial:'lod2',approach_distance_m:config.swap,hysteresis_m:config.hysteresis,review:'Tune with the game camera and reference phone before release.'},derivation:{method:'topology-preserving Meshoptimizer simplification from preserved detailed plain GLBs; geometry is consolidated by animated control for LOD1 and to one static mesh for LOD2',flexible_feed_note:config.key==='stalheart'?'The forty individually keyed hose segments are omitted from LOD1; primary machine motion remains on nine named controls.':''},assets};
  await fs.writeFile(path.join(ROOT,'assets',config.folder,'manifest-lods.json'),JSON.stringify(manifest,null,2)+'\n');
}
console.log('LANDMARK_LODS_COMPLETE');
