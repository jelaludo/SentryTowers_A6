import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,prune,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const ROOT=fileURLToPath(new URL('../..',import.meta.url));
const OUT=path.join(ROOT,'assets/arrival-foundry');
const ARM_SOURCE=path.join(ROOT,'assets/assembly-line/robotic_arm_d0.glb');
const BARREL_SOURCE=path.join(ROOT,'assets/warehouse-props/fuel_barrel_d0.glb');
const ROCKET_SOURCE=path.join(ROOT,'assets/sh-rocket/sh_rocket.glb');
const COLORS={graphite:0x17262d,dark:0x08151b,teal:0x167487,white:0xcbd8d5,cyan:0x21d8ff,amber:0xff9d2e,steel:0x71878b,feed:0x59e5d0};
const REQUIRED=['ARRIVAL_FOUNDRY_ROOT','SALVAGE_ARM_ROOT','SALVAGE_ARM_WAIST','SALVAGE_ARM_SHOULDER','SALVAGE_ARM_ELBOW','SALVAGE_ARM_WRIST','SEPARATOR_DRUM','INDUCTION_CHAMBER','SALVAGE_PANEL_00','CUTTER_SPARKS','BARREL_FILL_INDICATOR','SOCKET_CUTTER_TIP','SOCKET_SCRAP_INPUT','SOCKET_REGOLITH_INPUT','SOCKET_POWER','SOCKET_BARREL_FILL','SOCKET_STALHEART_FEED'];
const SOCKETS=[
  {id:'CUTTER_TIP',node:'SOCKET_CUTTER_TIP',kind:'vfx_origin',position_m:[-2.12,2.05,0],normal:[-1,0,0],available:true},
  {id:'SCRAP_INPUT',node:'SOCKET_SCRAP_INPUT',kind:'material_input',position_m:[2.35,1.65,0],normal:[-1,0,0],available:true},
  {id:'REGOLITH_INPUT',node:'SOCKET_REGOLITH_INPUT',kind:'material_input',position_m:[3.65,2.85,-1.15],normal:[0,1,0],available:true},
  {id:'POWER',node:'SOCKET_POWER',kind:'power',position_m:[4.2,.45,-2.05],normal:[0,0,-1],available:true},
  {id:'BARREL_FILL',node:'SOCKET_BARREL_FILL',kind:'material_output',position_m:[6.35,1.28,0],normal:[1,0,0],available:true},
  {id:'STALHEART_FEED',node:'SOCKET_STALHEART_FEED',kind:'cargo_output',position_m:[6.65,0,0],normal:[1,0,0],available:true}
];

globalThis.FileReader=class{result=null;onloadend=null;onerror=null;readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();},error=>this.onerror?.(error));}readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();},error=>this.onerror?.(error));}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
await fs.mkdir(OUT,{recursive:true});
const loader=new GLTFLoader(),io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
async function load(file){const bytes=await fs.readFile(file);return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
async function sha(file){return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');}
function safe(name){return(name||'NODE').normalize('NFKD').replaceAll('.','_').replace(/[^A-Za-z0-9_-]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')||'NODE';}
function matrix(position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){return new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale));}
function colored(geometry,color,transform=new T.Matrix4()){
  geometry.applyMatrix4(transform);for(const name of Object.keys(geometry.attributes))if(!['position','normal'].includes(name))geometry.deleteAttribute(name);geometry.clearGroups();const c=new T.Color(color),array=new Uint8Array(geometry.attributes.position.count*3);for(let i=0;i<array.length;i+=3){array[i]=Math.round(c.r*255);array[i+1]=Math.round(c.g*255);array[i+2]=Math.round(c.b*255);}geometry.setAttribute('color',new T.Uint8BufferAttribute(array,3,true));return geometry;
}
function box(size,position,color,rotation=[0,0,0]){return colored(new T.BoxGeometry(...size),color,matrix(position,rotation));}
function cyl(radius,height,segments,position,color,rotation=[0,0,0]){return colored(new T.CylinderGeometry(radius,radius,height,segments,1,false),color,matrix(position,rotation));}
function ring(radius,tube,segments,position,color,rotation=[0,0,0]){return colored(new T.TorusGeometry(radius,tube,6,segments),color,matrix(position,rotation));}
function beam(a,b,width,color){const p0=new T.Vector3(...a),p1=new T.Vector3(...b),direction=p1.clone().sub(p0),length=direction.length(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize()),m=new T.Matrix4().compose(p0.add(p1).multiplyScalar(.5),q,new T.Vector3(1,1,1));return colored(new T.BoxGeometry(width,length,width),color,m);}
function merge(parts){const result=mergeGeometries(parts,false);for(const part of parts)part.dispose();if(!result)throw Error('Unable to merge compatible geometries');return result;}
function material(name,color,emissive=0){const settings={name,color,vertexColors:true,metalness:.35,roughness:.55};if(emissive){settings.emissive=emissive;settings.emissiveIntensity=2.2;}return new T.MeshStandardMaterial(settings);}
function addNode(root,name,position,normal=[0,0,1],data={}){const node=new T.Object3D();node.name=name;node.position.fromArray(position);node.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...normal).normalize());node.userData=data;root.add(node);return node;}
function foundryFixed(lod,includeBarrelProxy){
  const s=lod===0?24:12,parts=[
    box([4.2,.32,4.1],[4.05,.16,0],COLORS.graphite),box([3.25,1.55,3.15],[4.05,1.02,0],COLORS.graphite),
    box([3.38,.42,3.28],[4.05,1.92,0],COLORS.white),box([.25,1.15,3.35],[2.38,1.18,0],COLORS.teal),
    box([1.65,.25,1.8],[2.18,1.68,0],COLORS.steel,[0,0,-.25]),box([1.35,.18,1.45],[2.0,2.02,0],COLORS.white,[0,0,-.25]),
    cyl(.48,1.15,s,[3.65,2.43,-1.15],COLORS.graphite),ring(.5,.08,s,[3.65,2.96,-1.15],COLORS.amber,[Math.PI/2,0,0]),
    box([.42,1.9,.42],[2.35,.95,-1.7],COLORS.steel),box([.42,1.9,.42],[5.75,.95,-1.7],COLORS.steel),
    box([.42,1.9,.42],[2.35,.95,1.7],COLORS.steel),box([.42,1.9,.42],[5.75,.95,1.7],COLORS.steel),
    cyl(.18,1.25,s,[5.85,1.25,0],COLORS.teal,[0,0,Math.PI/2]),cyl(.12,.8,s,[6.18,1.25,0],COLORS.white,[0,0,Math.PI/2]),
    box([1.05,.48,.12],[4.05,1.25,1.64],COLORS.dark),box([.7,.08,.14],[4.05,1.27,1.72],COLORS.cyan),
    ring(.73,.09,s,[6.65,1.48,0],COLORS.cyan,[Math.PI/2,0,0]),box([.08,.48,.72],[5.94,.78,0],COLORS.cyan)
  ];
  for(const x of [2.65,5.45])for(const z of [-1.35,1.35])parts.push(cyl(.34,.18,s,[x,.09,z],COLORS.dark));
  if(includeBarrelProxy){parts.push(cyl(.68,1.5,s,[6.65,.75,0],COLORS.graphite),ring(.69,.08,s,[6.65,.28,0],COLORS.white,[Math.PI/2,0,0]),ring(.69,.08,s,[6.65,1.22,0],COLORS.white,[Math.PI/2,0,0]),box([.08,.82,.75],[6.0,.77,0],COLORS.teal));}
  return merge(parts);
}
function addDynamic(root,lod,shared){
  const seg=lod===0?24:12;
  const chamber=new T.Mesh(cyl(.92,1.75,seg,[0,0,0],COLORS.teal),shared);chamber.name='INDUCTION_CHAMBER';chamber.position.set(4.05,1.2,0);chamber.userData={role:'shielded_induction_chamber'};root.add(chamber);
  const drum=new T.Mesh(cyl(.68,1.9,seg,[0,0,0],COLORS.steel,[Math.PI/2,0,0]),shared);drum.name='SEPARATOR_DRUM';drum.position.set(4.05,1.22,0);drum.userData={role:'separator_crusher',engine_driven_pivot:true};root.add(drum);
  const panel=new T.Mesh(box([.18,1.05,1.2],[0,0,0],COLORS.white,[0,.14,0]),shared);panel.name='SALVAGE_PANEL_00';panel.position.set(-1.45,2.05,0);panel.userData={role:'rocket_salvage_section',salvage_stage:1};root.add(panel);
  const glowMaterial=new T.MeshStandardMaterial({name:'AFR_EMISSIVE_CYAN',color:COLORS.cyan,emissive:COLORS.cyan,emissiveIntensity:3,roughness:.3,metalness:.1,vertexColors:true});
  const glow=new T.Mesh(ring(.48,.075,seg,[0,0,0],COLORS.cyan),glowMaterial);glow.name='PROCESS_GLOW';glow.position.set(4.05,1.25,1.72);root.add(glow);
  const sparkParts=[];for(let i=0;i<(lod===0?18:9);i++){const a=(i/(lod===0?18:9))*Math.PI*2,length=.32+(i%4)*.13;sparkParts.push(beam([0,0,0],[Math.cos(a)*length,(i%3-.7)*.2,Math.sin(a)*length],.032,COLORS.cyan));}const sparks=new T.Mesh(merge(sparkParts),glowMaterial);sparks.name='CUTTER_SPARKS';sparks.position.set(-1.78,2.08,0);sparks.scale.setScalar(0);sparks.userData={role:'runtime_vfx_preview',engine_event:'CUTTER_ARC'};root.add(sparks);
  const fill=new T.Mesh(box([.06,1.0,.52],[0,.5,0],COLORS.feed),glowMaterial);fill.name='BARREL_FILL_INDICATOR';fill.position.set(5.95,.23,0);fill.scale.y=.01;fill.userData={role:'feedstock_fill_readout'};root.add(fill);
  return{chamber,drum,panel,glow,sparks,fill};
}
function addSockets(root,wrist){root.updateMatrixWorld(true);for(const socket of SOCKETS){if(socket.node==='SOCKET_CUTTER_TIP'){const node=new T.Object3D(),worldRotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...socket.normal)),parentRotation=wrist.getWorldQuaternion(new T.Quaternion());node.name=socket.node;node.position.copy(wrist.worldToLocal(new T.Vector3(...socket.position_m)));node.quaternion.copy(parentRotation.invert().multiply(worldRotation));node.userData={socket_kind:socket.kind};wrist.add(node);}else addNode(root,socket.node,socket.position_m,socket.normal,{socket_kind:socket.kind});}}
function renameDetailedArm(armObject){
  const map={ARM_00:'SALVAGE_ARM_ROOT',ARM_00_WAIST:'SALVAGE_ARM_WAIST',ARM_00_SHOULDER:'SALVAGE_ARM_SHOULDER',ARM_00_ELBOW:'SALVAGE_ARM_ELBOW',ARM_00_WRIST:'SALVAGE_ARM_WRIST',ARM_00_FINGER_1:'SALVAGE_ARM_FINGER_P1','ARM_00_FINGER_-1':'SALVAGE_ARM_FINGER_N1'};
  let index=0;armObject.traverse(object=>{if(map[object.name])object.name=map[object.name];else object.name=`REUSED_ARM_${safe(object.name)}_${String(index++).padStart(2,'0')}`;});armObject.name='SALVAGE_ARM_ROOT';armObject.rotation.y=Math.PI;armObject.userData={role:'reused_articulated_service_arm',source_asset:'assets/assembly-line/robotic_arm_d0.glb'};return armObject;
}
function proxyArm(root,shared){
  const bones=[],make=(name,parent,position)=>{const bone=new T.Bone();bone.name=name;bone.position.fromArray(position);parent.add(bone);bones.push(bone);return bone;},rig=new T.Bone();rig.name='SALVAGE_ARM_ROOT';rig.rotation.y=Math.PI;root.add(rig);bones.push(rig);
  const waist=make('SALVAGE_ARM_WAIST',rig,[0,.52,0]),shoulder=make('SALVAGE_ARM_SHOULDER',waist,[0,.48,0]),elbow=make('SALVAGE_ARM_ELBOW',shoulder,[.625,1.473,0]),wrist=make('SALVAGE_ARM_WRIST',elbow,[1.495,.127,0]);root.updateMatrixWorld(true);
  const localParts=[{bone:rig,geometry:cyl(.62,.34,12,[0,.17,0],COLORS.graphite)},{bone:waist,geometry:cyl(.42,.38,12,[0,.18,0],COLORS.amber)},{bone:shoulder,geometry:beam([0,0,0],[.625,1.473,0],.38,COLORS.white)},{bone:elbow,geometry:beam([0,0,0],[1.495,.127,0],.34,COLORS.white)},{bone:wrist,geometry:cyl(.22,.72,10,[0,-.32,0],COLORS.teal)}],parts=[];
  for(const item of localParts){item.geometry.applyMatrix4(item.bone.matrixWorld);const count=item.geometry.attributes.position.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4),boneIndex=bones.indexOf(item.bone);for(let i=0;i<count;i++){indices[i*4]=boneIndex;weights[i*4]=1;}item.geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));item.geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));parts.push(item.geometry);}
  const mesh=new T.SkinnedMesh(merge(parts),shared);mesh.name=root.name;mesh.userData={...root.userData};for(const child of [...root.children])mesh.add(child);mesh.bind(new T.Skeleton(bones));return{root:mesh,armRoot:rig,waist,shoulder,elbow,wrist,mesh};
}
function quaternionTrack(object,name,times,axis,angles){const base=object.quaternion.clone(),values=[];for(const angle of angles)values.push(...base.clone().multiply(new T.Quaternion().setFromAxisAngle(axis,angle)).toArray());return new T.QuaternionKeyframeTrack(`${name}.quaternion`,times,values);}
function clips(root,dynamic){
  const waist=root.getObjectByName('SALVAGE_ARM_WAIST'),shoulder=root.getObjectByName('SALVAGE_ARM_SHOULDER'),elbow=root.getObjectByName('SALVAGE_ARM_ELBOW'),wrist=root.getObjectByName('SALVAGE_ARM_WRIST'),times=[0,2,5,8,10,13,16],tracks=[
    quaternionTrack(waist,waist.name,times,new T.Vector3(0,1,0),[0,0,0,Math.PI,Math.PI,Math.PI,0]),
    quaternionTrack(shoulder,shoulder.name,times,new T.Vector3(0,0,1),[0,-.08,.06,-.12,-.08,0,0]),
    quaternionTrack(elbow,elbow.name,times,new T.Vector3(0,0,1),[0,.12,-.08,.15,.08,0,0]),
    quaternionTrack(wrist,wrist.name,times,new T.Vector3(1,0,0),[0,.16,-.08,.1,0,0,0]),
    new T.VectorKeyframeTrack('SALVAGE_PANEL_00.position',[0,5,6.5,8.5,10,16],[-1.45,2.05,0,-1.45,2.05,0,-.3,2.45,0,2.1,2.05,0,2.38,1.66,0,2.38,1.66,0]),
    new T.VectorKeyframeTrack('SALVAGE_PANEL_00.scale',[0,9.8,10,16],[1,1,1,1,1,1,.001,.001,.001,.001,.001,.001],T.InterpolateDiscrete),
    new T.VectorKeyframeTrack('CUTTER_SPARKS.scale',[0,1.9,2,5,5.1,16],[.001,.001,.001,.001,.001,.001,1,1,1,1,1,1,.001,.001,.001,.001,.001,.001],T.InterpolateDiscrete),
    new T.VectorKeyframeTrack('PROCESS_GLOW.scale',[0,9,10.5,12,13.5,16],[.82,.82,.82,.82,.82,.82,1.08,1.08,1.08,.9,.9,.9,1.12,1.12,1.12,.82,.82,.82]),
    new T.VectorKeyframeTrack('BARREL_FILL_INDICATOR.scale',[0,11,15,16],[1,.01,1,1,.01,1,1,1,1,1,1,1]),
    quaternionTrack(dynamic.drum,'SEPARATOR_DRUM',[0,9,9.5,10,10.5,11,11.5,12,12.5,13,16],new T.Vector3(0,0,1),[0,0,Math.PI*.5,Math.PI,Math.PI*1.5,Math.PI*2,Math.PI*2.5,Math.PI*3,Math.PI*3.5,Math.PI*4,Math.PI*4])
  ];
  const recycle=new T.AnimationClip('Recycle_Panel_To_Barrel',16,tracks),processTimes=[0,.5,1,1.5,2,2.5,3,3.5,4],processAngles=processTimes.map((_,index)=>index*Math.PI*.5),process=new T.AnimationClip('Foundry_Process_Cycle',4,[quaternionTrack(dynamic.drum,'SEPARATOR_DRUM',processTimes,new T.Vector3(0,0,1),processAngles),new T.VectorKeyframeTrack('PROCESS_GLOW.scale',[0,1,2,3,4],[.85,.85,.85,1.1,1.1,1.1,.9,.9,.9,1.08,1.08,1.08,.85,.85,.85])]);return[recycle,process];
}
function uniqueNames(root){const used=new Set();root.traverse(object=>{const base=safe(object.name||object.type);let name=base,index=2;while(used.has(name))name=`${base}_${String(index++).padStart(2,'0')}`;object.name=name;used.add(name);});}
function measure(root){let triangles=0,draw_calls=0;const materials=new Set(),textures=new Set();root.traverse(object=>{if(!object.visible||!(object.isMesh||object.isLine||object.isPoints))return;draw_calls+=object.geometry?.groups?.length||1;for(const mat of [].concat(object.material||[])){materials.add(mat);for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'])if(mat?.[key])textures.add(mat[key]);}if(object.isMesh)triangles+=(object.geometry.index?object.geometry.index.count:object.geometry.attributes.position.count)/3;});return{triangles:Math.round(triangles),draw_calls,materials:materials.size,textures:textures.size};}
function bounds(root){root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root,true);return{min:box.min.toArray(),max:box.max.toArray(),dimensions_m:box.getSize(new T.Vector3()).toArray()};}
async function exportGLB(root,animations,file){const data=await new GLTFExporter().parseAsync(root,{binary:true,animations,onlyVisible:true,trs:true});await fs.writeFile(file,Buffer.from(data));}
async function meshopt(file){const document=await io.read(file);await document.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),reorder({encoder:MeshoptEncoder,target:'size'}));document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const output=file.replace(/\.glb$/,'.meshopt.glb');await io.write(output,document);return{file:path.basename(output),bytes:(await fs.stat(output)).size,sha256:await sha(output)};}
async function build(lod){
  let root=new T.Group();root.name='ARRIVAL_FOUNDRY_ROOT';root.userData={asset_id:`afr_01_seed_foundry_d0_lod${lod}`,family:'arrival_foundry',designation:'AFR-01',lod,damage_level:0,state:'intact',source_of_truth:'plain_glb',static:lod===2,plot_m:[16,12]};const shared=material('AFR_VERTEX_PALETTE',0xffffff);
  let wrist,dynamic,animations=[];
  if(lod===0){const arm=await load(ARM_SOURCE),armObject=renameDetailedArm(arm.scene.getObjectByName('ARM_00'));armObject.removeFromParent();root.add(armObject);wrist=root.getObjectByName('SALVAGE_ARM_WRIST');const barrel=await load(BARREL_SOURCE),barrelRoot=barrel.scene.getObjectByName('ROOT')||barrel.scene.children[0];barrelRoot.removeFromParent();barrelRoot.traverse(object=>{if(object.isMesh&&/Fuel_placard|Hazard_stencil/.test(object.name))object.visible=false;if(object.isMesh&&object.material){object.material=object.material.clone();if(/Barrel_body/.test(object.name))object.material.color.setHex(COLORS.teal);else if(/hazard|band|ring|cap/i.test(object.name))object.material.color.setHex(COLORS.cyan);else object.material.color.setHex(COLORS.graphite);}});let i=0;barrelRoot.traverse(object=>object.name=`FEEDSTOCK_BARREL_${safe(object.name)}_${String(i++).padStart(2,'0')}`);barrelRoot.name='FEEDSTOCK_BARREL_00';barrelRoot.position.set(6.65,0,0);barrelRoot.userData={role:'reused_barrel_geometry',contents:'ferroceramic_feedstock',source_asset:'assets/warehouse-props/fuel_barrel_d0.glb',semantic_relabel:true};root.add(barrelRoot);const fixed=new T.Mesh(foundryFixed(lod,false),shared);fixed.name='FOUNDRY_CHASSIS';root.add(fixed);dynamic=addDynamic(root,lod,shared);addSockets(root,wrist);animations=clips(root,dynamic);}
  else if(lod===1){const fixed=new T.Mesh(foundryFixed(lod,true),shared);fixed.name='FOUNDRY_CHASSIS';root.add(fixed);const arm=proxyArm(root,shared);root=arm.root;wrist=arm.wrist;dynamic=addDynamic(root,lod,shared);addSockets(root,wrist);animations=clips(root,dynamic);}
  else{const armParts=[cyl(.62,.34,8,[0,.17,0],COLORS.graphite),beam([0,.55,0],[-.62,2.0,0],.42,COLORS.white),beam([-.62,2.0,0],[-2.05,2.08,0],.38,COLORS.white),cyl(.22,.62,8,[-2.05,1.78,0],COLORS.teal)],fixed=foundryFixed(lod,true),panel=box([.18,1.05,1.2],[-1.45,2.05,0],COLORS.white,[0,.14,0]),all=merge([fixed,panel,...armParts]);const mesh=new T.Mesh(all,shared);mesh.name='ARRIVAL_FOUNDRY_DISTANCE_GEOMETRY';root.add(mesh);const placeholders=new Map();for(const name of REQUIRED){const node=new T.Object3D();node.name=name;node.userData={static_lookup_only:true};root.add(node);placeholders.set(name,node);}root.remove(placeholders.get('ARRIVAL_FOUNDRY_ROOT'));for(const socket of SOCKETS){const node=placeholders.get(socket.node);node.position.fromArray(socket.position_m);node.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...socket.normal));node.userData={socket_kind:socket.kind,static_lookup_only:true};}}
  uniqueNames(root);root.updateMatrixWorld(true);const file=path.join(OUT,`afr_01_seed_foundry_d0_lod${lod}.glb`);await exportGLB(root,animations,file);const compressed=await meshopt(file),bytes=(await fs.stat(file)).size,metrics=measure(root),siteBounds=bounds(root);return{id:`afr_01_seed_foundry_d0_lod${lod}`,family:'arrival_foundry',designation:'AFR-01',name:'AFR-01 Seed Foundry',file:path.basename(file),meshopt_file:compressed.file,lod,quality:lod===0?'detailed_master':lod===1?'game':'distance',damage_level:0,state:'intact',role:lod===0?'close_shots_animation_recording':lod===1?'approach_game_camera':'map_loading_far_view',static:lod===2,derived:lod>0,derived_from:lod>0?'afr_01_seed_foundry_d0_lod0.glb':null,sha256:await sha(file),meshopt_sha256:compressed.sha256,bytes,meshopt_bytes:compressed.bytes,...metrics,bounds:siteBounds,plot_m:[16,12],sockets:SOCKETS,clips:animations.map(clip=>({name:clip.name,duration_s:clip.duration,loop:clip.name==='Foundry_Process_Cycle'})),required_nodes:REQUIRED,review_status:'contract_candidate_pending_game_camera_reference_phone',credit:'Models by jelaludo'};}

const assets=[];for(const lod of [0,1,2]){const entry=await build(lod);assets.push(entry);console.log(entry.id,entry.triangles,'triangles',entry.draw_calls,'draws',entry.bytes,'bytes');}
const sources={articulated_service_arm:{file:'../assembly-line/robotic_arm_d0.glb',sha256:await sha(ARM_SOURCE),triangles:3280,role:'exact geometry reused in detailed master; articulated proxy derived for game and distance tiers'},cargo_barrel:{file:'../warehouse-props/fuel_barrel_d0.glb',sha256:await sha(BARREL_SOURCE),triangles:2412,role:'structural geometry reused in detailed master with the fuel placard omitted and an AFR collar/material treatment; reduced proxies derived for game and distance tiers'},sh02_context:{file:'../sh-rocket/sh_rocket.glb',sha256:await sha(ROCKET_SOURCE),role:'external viewer/game context; preserved and not embedded in AFR exports'}};
const manifest={schema:'jelaludo.asset-family/v2-candidate',version:2,family:'arrival_foundry',label:'AFR-01 Seed Foundry',status:'contract_candidate_pending_game_camera_reference_phone',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground at 16 × 12 m module centre'},budgets:{lod1:{triangles_max:8000,draw_calls_max:10,plain_bytes_max:400000},lod2:{triangles_max:3000,draw_calls_max:1,plain_bytes_max:250000}},lod_selection:{initial:'lod2',approach_distance_m:150,hysteresis_m:20,review:'Tune with the recycling-sequence game camera and reference phone.'},salvage_state:{separate_from_damage_and_lod:true,variable:'rocket_salvage_stage',first_authored_section:'SALVAGE_PANEL_00'},material_flow:['recovered rocket structure','local silicate/regolith','carried binder and alloying additives','ferroceramic feedstock'],events:[{name:'CUTTER_ARC_ON',time_s:2},{name:'CUTTER_ARC_OFF',time_s:5.1},{name:'SCRAP_ACCEPTED',time_s:10},{name:'BARREL_READY',time_s:15}],sources,assets};
await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('ARRIVAL_FOUNDRY_COMPLETE');
