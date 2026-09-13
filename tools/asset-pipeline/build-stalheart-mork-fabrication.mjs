import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';

const ROOT=fileURLToPath(new URL('../..',import.meta.url));
const OUT=path.join(ROOT,'assets/fabrication-lab');
await fs.mkdir(OUT,{recursive:true});
const CLIP='MORK_Fabrication_Sequence',DURATION=16;
const GAME_ANCHORS=new Set(['GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z','J2_SHOULDER','J3_ELBOW']);
const ENGINE_NODES=['GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z','J1_BASE_YAW','J2_SHOULDER','J3_ELBOW','J4_FOREARM_ROLL','J5_WRIST_PITCH','J6_TOOL_ROLL','EXTRUSION_TIP','HOVER_RIG','HULL_SUSPENSION','TURRET_YAW','GUN_PITCH','GUN_RECOIL','PLASMA_YAW_L','PLASMA_YAW_R'];

// Three's exporter uses FileReader in browsers. This small Node adapter handles GLBs.
globalThis.FileReader=class{
  result=null;onloadend=null;onerror=null;
  readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();},e=>this.onerror?.(e));}
  readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();},e=>this.onerror?.(e));}
};

const loader=new GLTFLoader();
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const transformIO=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
async function load(file){const b=await fs.readFile(path.join(ROOT,file));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
function safe(name){return name.replaceAll('.','_').replace(/[^A-Za-z0-9_ -]/g,'_').replaceAll(' ','_');}
function uniqueNames(root){const used=new Set();root.traverse(o=>{let base=safe(o.name||o.type),name=base,n=2;while(used.has(name))name=`${base}_${String(n++).padStart(3,'0')}`;o.name=name;used.add(name);});}
function materialColor(mesh){const m=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;return m?.color||new T.Color(.35,.42,.42);}
function descendants(root){const objects=[];root.traverse(object=>objects.push(object));return objects;}
function triangleCount(geometry){return (geometry.index?geometry.index.count:geometry.attributes.position.count)/3;}
function geometryFor(mesh,anchor,colorOverride){
  mesh.updateWorldMatrix(true,false);anchor.updateWorldMatrix(true,false);
  const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(new T.Matrix4().copy(anchor.matrixWorld).invert().multiply(mesh.matrixWorld));
  for(const a of Object.keys(g.attributes))if(!['position','normal','color'].includes(a))g.deleteAttribute(a);
  if(!g.attributes.normal)g.computeVertexNormals();
  if(colorOverride||!g.attributes.color){const c=colorOverride||materialColor(mesh),count=g.attributes.position.count,colors=new Float32Array(count*3);for(let i=0;i<count;i++){colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}g.setAttribute('color',new T.BufferAttribute(colors,3));}
  return g;
}
function combine(meshes,anchor,name,palette,colorOverride){
  if(!meshes.length)return null;const gs=meshes.map(m=>geometryFor(m,anchor,colorOverride));
  const geometry=mergeGeometries(gs,false);for(const m of meshes)m.removeFromParent();for(const g of gs)g.dispose();
  const out=new T.Mesh(geometry,palette);out.name=name;anchor.add(out);return out;
}
function nearestAnchor(mesh,root){let p=mesh.parent;while(p&&p!==root){if(GAME_ANCHORS.has(p.name))return p;p=p.parent;}return root;}
function stageOf(mesh){let text='',p=mesh;while(p){text+=' '+p.name.toUpperCase();p=p.parent;}return /(TURRET|GUN_|CANNON|BARREL|MUZZLE|PLASMA|COMMANDER|WHIP|AMMO_PORT|MAGAZINE|RANGEFINDER)/.test(text)?2:1;}
function simplifyGeometry(geometry,ratio){
  // Weld split normals before simplification so connected armor and machine panels
  // remain closed surfaces. Sampling isolated triangles made the intact Terraformer
  // look like a second wireframe build target.
  const source=geometry.index?geometry.toNonIndexed():geometry.clone(),input=new T.BufferGeometry();
  input.setAttribute('position',source.attributes.position.clone());if(source.attributes.color)input.setAttribute('color',source.attributes.color.clone());source.dispose();
  const welded=mergeVertices(input,1e-5);input.dispose();const position=welded.attributes.position,index=Uint32Array.from(welded.index.array),target=Math.max(3,Math.floor(index.length*ratio/3)*3),colorAttribute=welded.attributes.color;
  const colors=colorAttribute?Float32Array.from({length:colorAttribute.count*3},(_,i)=>colorAttribute.getComponent(Math.floor(i/3),i%3)):null;
  const [simplified]=colors?MeshoptSimplifier.simplifyWithAttributes(index,position.array,3,colors,3,[.15,.15,.15],null,target,.05,['Permissive']):MeshoptSimplifier.simplify(index,position.array,3,target,.05,['Permissive']);
  const remap=new Map(),positions=[],outColors=[],indices=new Uint32Array(simplified.length);let next=0;
  for(let i=0;i<simplified.length;i++){const old=simplified[i];if(!remap.has(old)){remap.set(old,next++);positions.push(position.getX(old),position.getY(old),position.getZ(old));if(colors)outColors.push(colors[old*3],colors[old*3+1],colors[old*3+2]);}indices[i]=remap.get(old);}
  welded.dispose();const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(colors)out.setAttribute('color',new T.Float32BufferAttribute(outColors,3));out.setIndex(new T.BufferAttribute(indices,1));out.computeVertexNormals();return out;
}
function cleanDegenerateMeshes(root){
  root.traverse(mesh=>{if(!mesh.isMesh)return;const source=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),position=source.attributes.position,keep=[];
    for(let i=0;i<position.count;i+=3){const a=new T.Vector3().fromBufferAttribute(position,i),b=new T.Vector3().fromBufferAttribute(position,i+1),c=new T.Vector3().fromBufferAttribute(position,i+2);if(a.toArray().every(Number.isFinite)&&b.toArray().every(Number.isFinite)&&c.toArray().every(Number.isFinite)&&b.sub(a).cross(c.sub(a)).lengthSq()>1e-20)keep.push(i,i+1,i+2);}
    if(keep.length===position.count){source.dispose();return;}const cleaned=new T.BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes)){const array=new Float32Array(keep.length*attribute.itemSize);for(let i=0;i<keep.length;i++)for(let component=0;component<attribute.itemSize;component++)array[i*attribute.itemSize+component]=attribute.getComponent(keep[i],component);cleaned.setAttribute(name,new T.BufferAttribute(array,attribute.itemSize,attribute.normalized));}mesh.geometry=cleaned;source.dispose();
  });
}
function reduceMeshes(objects,target){const meshes=objects.filter(o=>o.isMesh),total=meshes.reduce((n,m)=>n+triangleCount(m.geometry),0),ratio=Math.min(1,target/total);for(const m of meshes){const g=simplifyGeometry(m.geometry,ratio);m.geometry.dispose();m.geometry=g;}}
function latticeGeometry(detailed){
  const sections=[[-4.1,1.35,1.05],[-2.4,2.30,1.48],[0,2.55,1.62],[2.5,2.40,1.50],[3.7,1.70,1.18]],segments=[];
  for(const [z,w,top] of sections){const ring=[[-w,.38,z],[w,.38,z],[w*.82,top,z],[-w*.82,top,z]];for(let i=0;i<4;i++)segments.push([ring[i],ring[(i+1)%4]]);}
  for(let i=0;i<sections.length-1;i++){const [za,wa,ha]=sections[i],[zb,wb,hb]=sections[i+1];for(const s of [-1,1])segments.push([[s*wa,.38,za],[s*wb,.38,zb]],[[s*wa*.82,ha,za],[s*wb*.82,hb,zb]]);segments.push([[0,ha,za],[0,hb,zb]]);}
  for(const x of [-2.7,2.7]){segments.push([[x,.42,-3.2],[x,.42,3]],[[x,1.05,-2.8],[x,1.05,2.7]]);for(const z of [-2.8,-.9,.9,2.7])segments.push([[x-.30,.42,z],[x+.30,1.05,z]]);}
  const turret=[[-.75,1.62,-1.25],[.75,1.62,-1.25],[.88,1.62,.95],[-.88,1.62,.95],[-.55,2.45,-1],[.55,2.45,-1],[.62,2.45,.75],[-.62,2.45,.75]];
  for(const offset of [0,4])for(let i=0;i<4;i++)segments.push([turret[offset+i],turret[offset+(i+1)%4]]);for(let i=0;i<4;i++)segments.push([turret[i],turret[i+4]]);
  segments.push([[0,2.18,-1],[0,2.18,7.4]],[[-.18,2.05,-1.2],[-.18,2.05,6.2]],[[.18,2.05,-1.2],[.18,2.05,6.2]]);
  const radius=detailed ? .035 : .055,radial=detailed?8:4,parts=[];
  for(const [a,b] of segments){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),g=new T.CylinderGeometry(radius,radius,d.length(),radial,1,false);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize()));g.translate(...av.clone().add(bv).multiplyScalar(.5));parts.push(g);}
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();return merged;
}
function addFabricationNodes(scene,tank,detailed,palette){
  const stage1=new T.Group(),stage2=new T.Group(),front=new T.Group();stage1.name='MORK_STAGE_01_CHASSIS_HULL';stage2.name='MORK_STAGE_02_TURRET_WEAPONS';front.name='FABRICATION_FRONT';
  stage1.userData.construction_range=[0,.46];stage2.userData.construction_range=[.5,1];front.position.y=.25;front.userData.driver='clip time maps to local Y 0.25-3.05 m';tank.add(stage1,stage2,front);
  const origin=new T.Object3D();origin.name='SOCKET_FABRICATION_ORIGIN';origin.userData.kind='fabrication';tank.add(origin);
  const meshes=[];tank.traverse(o=>{if(o.isMesh&&o!==stage1&&o!==stage2)meshes.push(o);});for(const m of meshes)(stageOf(m)===2?stage2:stage1).attach(m);
  const latticeMat=detailed?new T.MeshStandardMaterial({name:'AFR lattice / cyan',color:0x05baff,emissive:0x037ab0,emissiveIntensity:4,metalness:.15,roughness:.28}):palette;
  const latticeMeshGeometry=latticeGeometry(detailed);
  if(!detailed){
    const cyan=new T.Color(0x05baff),colors=new Float32Array(latticeMeshGeometry.attributes.position.count*3);
    for(let i=0;i<latticeMeshGeometry.attributes.position.count;i++){colors[i*3]=cyan.r;colors[i*3+1]=cyan.g;colors[i*3+2]=cyan.b;}
    latticeMeshGeometry.setAttribute('color',new T.BufferAttribute(colors,3));
  }
  const lattice=new T.Mesh(latticeMeshGeometry,latticeMat);lattice.name='MORK_BUILD_LATTICE';lattice.userData={component:'internal fabrication lattice',coplanar_overlay:false};tank.add(lattice);
  const frameParts=[];for(const [size,position] of [[[6.3,.055,.055],[0,0,1.9]],[[6.3,.055,.055],[0,0,-4.8]],[[.055,.055,6.75],[-3.15,0,-1.45]],[[.055,.055,6.75],[3.15,0,-1.45]]]){const geometry=new T.BoxGeometry(...size);geometry.translate(...position);frameParts.push(geometry);}
  const frameGeometry=mergeGeometries(frameParts,false);for(const geometry of frameParts)geometry.dispose();
  let frontMaterial=latticeMat;if(!detailed){const cyan=new T.Color(0x7ce7ff),colors=new Float32Array(frameGeometry.attributes.position.count*3);for(let i=0;i<frameGeometry.attributes.position.count;i++){colors[i*3]=cyan.r;colors[i*3+1]=cyan.g;colors[i*3+2]=cyan.b;}frameGeometry.setAttribute('color',new T.BufferAttribute(colors,3));}
  const indicator=new T.Mesh(frameGeometry,frontMaterial);indicator.name='FABRICATION_FRONT_INDICATOR';indicator.userData.component='moving fabrication boundary';front.add(indicator);
  return {stage1,stage2,front,lattice};
}
function makeClip(source,{stage1,stage2,front},scene){
  const tracks=source.tracks.filter(track=>scene.getObjectByName(T.PropertyBinding.parseTrackName(track.name).nodeName)).map(track=>track.clone());
  tracks.push(new T.VectorKeyframeTrack(`${stage1.name}.scale`,[0,.6,7,16],[.001,.001,.001,.001,.001,.001,1,1,1,1,1,1]));
  tracks.push(new T.VectorKeyframeTrack(`${stage2.name}.scale`,[0,8,16],[.001,.001,.001,.001,.001,.001,1,1,1]));
  tracks.push(new T.VectorKeyframeTrack(`${front.name}.position`,[0,16],[0,.25,0,0,3.05,0]));
  return new T.AnimationClip(CLIP,DURATION,tracks);
}
function palette(){return new T.MeshStandardMaterial({name:'Fabrication game / vertex palette',vertexColors:true,metalness:.35,roughness:.48});}
function prepareGame(stal,stalObjects,tank,tankObjects,shared){
  reduceMeshes(stalObjects,3600);reduceMeshes(tankObjects,1300);
  const groups=new Map();for(const m of stalObjects.filter(o=>o.isMesh)){const a=nearestAnchor(m,stal);if(!groups.has(a))groups.set(a,[]);groups.get(a).push(m);}for(const [a,meshes] of groups)combine(meshes,a,`STALHEART_GAME_${a.name}`,shared);
  const byStage=[[],[]];for(const m of tankObjects.filter(o=>o.isMesh))byStage[stageOf(m)-1].push(m);
  return byStage;
}
function count(scene){let triangles=0,draws=0;scene.traverse(o=>{if(o.isMesh){triangles+=triangleCount(o.geometry);draws++;}});return{triangles:Math.round(triangles),draws};}
async function exportGLB(scene,animations,file){const exporter=new GLTFExporter(),array=await exporter.parseAsync(scene,{binary:true,animations,onlyVisible:true,trs:true});await fs.writeFile(file,Buffer.from(array));}
async function exportMeshopt(file){const document=await transformIO.read(file);await document.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const output=file.replace(/\.glb$/,'.meshopt.glb');await transformIO.write(output,document);return{file:path.basename(output),bytes:(await fs.stat(output)).size};}
async function build(lod){
  const detailed=lod===0,stalSource=detailed?'assets/terraformer/terraformer_3000_d0.glb':'assets/game-ready/terraformer_3000_d0_game.glb',tankSource=detailed?'assets/hover-tank/mork_hover_tank_d0.glb':'assets/hover-tank/mork_hover_tank_low_d0.glb';
  const [sg,tg]=await Promise.all([load(stalSource),load(tankSource)]),scene=new T.Scene();scene.name='ROOT';scene.userData={asset_id:`stalheart_mork_fabrication_lod${lod}`,family:'stalheart_mork_fabrication',damage_level:0,lod,credit:'Models by jelaludo'};
  const stal=sg.scene;stal.name='STALHEART_ROOT';stal.userData.visual_state='complete_intact_machine';const tank=tg.scene;tank.name='MORK_ROOT';tank.userData.visual_state='fabricating_wireframe_to_solid';cleanDegenerateMeshes(tank);tank.position.x=-1;scene.add(stal,tank);scene.updateMatrixWorld(true);
  // Operational tank clips are deliberately excluded while it is under construction.
  let shared=null,stageMeshes=null;if(!detailed){shared=palette();stageMeshes=prepareGame(stal,descendants(stal),tank,descendants(tank),shared);}
  const fab=addFabricationNodes(scene,tank,detailed,shared);
  if(stageMeshes){combine(stageMeshes[0],fab.stage1,'MORK_GAME_CHASSIS_HULL',shared);combine(stageMeshes[1],fab.stage2,'MORK_GAME_TURRET_WEAPONS',shared);}
  uniqueNames(scene);for(const name of [...ENGINE_NODES,'STALHEART_ROOT','MORK_ROOT','MORK_STAGE_01_CHASSIS_HULL','MORK_STAGE_02_TURRET_WEAPONS','MORK_BUILD_LATTICE','FABRICATION_FRONT','SOCKET_FABRICATION_ORIGIN']){const hit=scene.getObjectByName(name)||scene.getObjectByName(safe(name));if(hit)hit.name=name;}
  const fabNodes={stage1:scene.getObjectByName('MORK_STAGE_01_CHASSIS_HULL'),stage2:scene.getObjectByName('MORK_STAGE_02_TURRET_WEAPONS'),front:scene.getObjectByName('FABRICATION_FRONT')},clip=makeClip(sg.animations[0],fabNodes,scene);
  let animations=lod<2?[clip]:[];
  if(lod===2){
    const mixer=new T.AnimationMixer(scene);mixer.clipAction(clip).play();mixer.setTime(8);scene.updateMatrixWorld(true);
    const allMeshes=[];scene.traverse(o=>{if(o.isMesh)allMeshes.push(o);});const meshes=allMeshes.filter(o=>o.getWorldScale(new T.Vector3()).length()>.01);
    const latticeMesh=scene.getObjectByName('MORK_BUILD_LATTICE'),latticeMarker=new T.Object3D();latticeMarker.name='MORK_BUILD_LATTICE';latticeMarker.userData={component:'lattice baked into static midpoint proxy',static:true};latticeMesh.parent.add(latticeMarker);
    const world=new T.Group();world.name='DISTANCE_GEOMETRY';scene.add(world);const gs=meshes.map(m=>geometryFor(m,world));let geometry=mergeGeometries(gs,false);for(const g of gs)g.dispose();for(const m of meshes)m.removeFromParent();
    for(const m of allMeshes)m.removeFromParent();geometry=simplifyGeometry(geometry,Math.min(1,2050/(geometry.index?geometry.index.count/3:geometry.attributes.position.count/3)));const proxy=new T.Mesh(geometry,shared);proxy.name='FABRICATION_DISTANCE_MESH';world.add(proxy);animations=[];
  }
  cleanDegenerateMeshes(scene);scene.updateMatrixWorld(true);const preliminary=count(scene),file=path.join(OUT,`stalheart_mork_fabrication_lod${lod}.glb`);await exportGLB(scene,animations,file);const bytes=(await fs.stat(file)).size,compressed=await exportMeshopt(file);
  return{id:`stalheart_mork_fabrication_lod${lod}`,name:'Stålheart / MÖRK fabrication',family:'stalheart_mork_fabrication',file:path.basename(file),meshopt_file:compressed.file,lod,detail:['detailed','game','distance'][lod],damage_level:0,state:lod<2?'Fabricating':'Half-built static proxy',terraformer_state:'complete_intact_machine',tank_visual_state:lod<2?'wireframe_to_solid':'half_built_static',reduction_method:lod===0?'authored_source':'meshoptimizer_topology_preserving',plot_m:[48,56],triangles:preliminary.triangles,draw_calls:preliminary.draws,bytes,meshopt_bytes:compressed.bytes,credit:'Models by jelaludo',source_assets:[stalSource,tankSource],derived:lod>0,engine_nodes:ENGINE_NODES,animations:lod<2?[CLIP]:[],clips:lod<2?[{name:CLIP,duration_s:DURATION,loop:false}]:[],construction_stages:[{node:'MORK_STAGE_01_CHASSIS_HULL',range:[0,.46]},{node:'MORK_STAGE_02_TURRET_WEAPONS',range:[.5,1]}],lattice_node:'MORK_BUILD_LATTICE',fabrication_front_node:'FABRICATION_FRONT',static_progress:lod===2?.5:null,sockets:[{id:'MATERIAL_INPUT',kind:'material',position_m:[16,1,-24],normal:[0,0,-1],available:true,width_m:null},{id:'FABRICATION_ORIGIN',kind:'fabrication',position_m:[-1,0,0],normal:[0,1,0],available:true,width_m:6}],colliders:[{id:'reserved_machine_envelope',center_m:[0,18,0],size_m:[44,36,22],condition:'coarse_only'},{id:'tank_build_bay',center_m:[-1,1.6,2],size_m:[6.2,3.2,13.5],condition:'fabrication_sequence'}],description:'The complete intact Stålheart fabricates a MÖRK tank. Only the tank transitions from energized wireframe lattice to solid armor: chassis first, then turret and weapons.'};
}

const assets=[];for(const lod of [0,1,2])assets.push(await build(lod));
const manifest={version:1,units:'meters',up:'+Y',forward:'+Z',plain_glb_source_of_truth:true,family:'stalheart_mork_fabrication',lod_policy:{initial_load:'lod2',game_near_m:150,hysteresis_m:20,detailed:'manual cinematic selection',note:'Tune distances for the game camera and reference hardware.'},compression:{extension:'EXT_meshopt_compression',required:true,method:'filter',position_quantization:false,uncompressed_fallback:'file'},lore:{material:'AFR-9 ferroceramic lattice alloy',explanation:'Stålheart lays a magnetically aligned AFR-9 load lattice, then floods it with a rapid-sinter metal ceramic skin. Cyan lines show energized structural paths; armor becomes opaque as the field cools and locks.'},assets};
await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('FABRICATION_COMPLETE',assets.map(e=>({lod:e.lod,triangles:e.triangles,draws:e.draw_calls,bytes:e.bytes})));
