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
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const ROOT=fileURLToPath(new URL('../..',import.meta.url));
const OUT=path.join(ROOT,'assets/fabrication-lab');
await fs.mkdir(OUT,{recursive:true});
const CLIP='MORK_Fabrication_Sequence',DURATION=16;
const ENGINE_NODES=['GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z','J1_BASE_YAW','J2_SHOULDER','J3_ELBOW','J4_FOREARM_ROLL','J5_WRIST_PITCH','J6_TOOL_ROLL','EXTRUSION_TIP','HOVER_RIG','HULL_SUSPENSION','TURRET_YAW','GUN_PITCH','GUN_RECOIL','PLASMA_YAW_L','PLASMA_YAW_R','FABRICATION_FRONT'];
const STAL_MANIFEST=JSON.parse(await fs.readFile(path.join(ROOT,'assets/terraformer/manifest.json'),'utf8'));
const STAL_LOD_MANIFEST=JSON.parse(await fs.readFile(path.join(ROOT,'assets/terraformer/manifest-lods.json'),'utf8'));
const MORK_DISTANCE_MANIFEST=JSON.parse(await fs.readFile(path.join(ROOT,'assets/hover-tank/manifest-distance.json'),'utf8'));

// Three's exporter uses FileReader in browsers. This small Node adapter handles GLBs.
globalThis.FileReader=class{
  result=null;onloadend=null;onerror=null;
  readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();},e=>this.onerror?.(e));}
  readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();},e=>this.onerror?.(e));}
};

const loader=new GLTFLoader();
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const transformIO=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
async function load(file){const b=await fs.readFile(path.join(ROOT,file));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
function safe(name){return name.replaceAll('.','_').replace(/[^A-Za-z0-9_ -]/g,'_').replaceAll(' ','_');}
function uniqueNames(root){const used=new Set();root.traverse(o=>{let base=safe(o.name||o.type),name=base,n=2;while(used.has(name))name=`${base}_${String(n++).padStart(3,'0')}`;o.name=name;used.add(name);});}
function triangleCount(geometry){return (geometry.index?geometry.index.count:geometry.attributes.position.count)/3;}
function cleanDegenerateMeshes(root){
  root.traverse(mesh=>{if(!mesh.isMesh)return;const source=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),position=source.attributes.position,keep=[];
    for(let i=0;i<position.count;i+=3){const a=new T.Vector3().fromBufferAttribute(position,i),b=new T.Vector3().fromBufferAttribute(position,i+1),c=new T.Vector3().fromBufferAttribute(position,i+2);if(a.toArray().every(Number.isFinite)&&b.toArray().every(Number.isFinite)&&c.toArray().every(Number.isFinite)&&b.sub(a).cross(c.sub(a)).lengthSq()>1e-20)keep.push(i,i+1,i+2);}
    if(keep.length===position.count){source.dispose();return;}const cleaned=new T.BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes)){const array=new Float32Array(keep.length*attribute.itemSize);for(let i=0;i<keep.length;i++)for(let component=0;component<attribute.itemSize;component++)array[i*attribute.itemSize+component]=attribute.getComponent(keep[i],component);cleaned.setAttribute(name,new T.BufferAttribute(array,attribute.itemSize,attribute.normalized));}mesh.geometry=cleaned;source.dispose();
  });
}
function wireframeGeometry(tank){
  tank.updateMatrixWorld(true);const inverse=new T.Matrix4().copy(tank.matrixWorld).invert(),parts=[],meshes=[];
  tank.traverse(object=>{if(!object.isMesh)return;meshes.push(object);const geometry=new T.WireframeGeometry(object.geometry);geometry.applyMatrix4(new T.Matrix4().copy(inverse).multiply(object.matrixWorld));parts.push(geometry);});
  const merged=mergeGeometries(parts,false);for(const geometry of parts)geometry.dispose();for(const mesh of meshes)mesh.removeFromParent();return merged;
}
function addFabricationNodes(tank,{animated}){
  const geometry=wireframeGeometry(tank),material=new T.LineBasicMaterial({name:'MORK fabrication wireframe / cyan',color:0x54e7ff});material.userData={emissive_intent:'#54e7ff',render_as:'unlit line'};
  const wireframe=new T.Group();wireframe.name='MORK_BUILD_WIREFRAME';wireframe.userData={component:'complete MORK fabrication wireframe',visual_state:'wireframe_only',construction_range:[0,1]};
  const linework=new T.Group();linework.name='MORK_WIREFRAME_GEOMETRY';wireframe.add(linework);const bands=[];
  if(animated){
    const position=geometry.attributes.position,ys=[];for(let index=0;index<position.count;index++)ys.push(position.getY(index));const minY=Math.min(...ys),maxY=Math.max(...ys),bandCount=12,vertices=Array.from({length:bandCount},()=>[]);
    for(let index=0;index<position.count;index+=2){const band=Math.min(bandCount-1,Math.max(0,Math.floor((((position.getY(index)+position.getY(index+1))*.5)-minY)/(maxY-minY)*bandCount)));for(const vertex of [index,index+1])vertices[band].push(position.getX(vertex),position.getY(vertex),position.getZ(vertex));}
    for(let index=0;index<bandCount;index++){const bandGeometry=new T.BufferGeometry();bandGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices[index],3));const lines=new T.LineSegments(bandGeometry,material);lines.name=`MORK_WIREFRAME_BAND_${String(index).padStart(2,'0')}`;lines.userData={print_band:index,print_range:[index/bandCount,(index+1)/bandCount]};linework.add(lines);bands.push(lines);}geometry.dispose();
  }else{const lines=new T.LineSegments(geometry,material);lines.name='MORK_WIREFRAME_LINEWORK';linework.add(lines);bands.push(lines);}
  wireframe.userData.band_nodes=bands.map(node=>node.name);tank.add(wireframe);
  const oldLattice=new T.Object3D();oldLattice.name='MORK_BUILD_LATTICE';oldLattice.userData={deprecated_alias_for:'MORK_BUILD_WIREFRAME',contains_geometry:false};wireframe.add(oldLattice);
  for(const name of ['MORK_STAGE_01_CHASSIS_HULL','MORK_STAGE_02_TURRET_WEAPONS']){const alias=new T.Object3D();alias.name=name;alias.userData={deprecated_lookup_only:true,contains_geometry:false,replaced_by:'MORK_BUILD_WIREFRAME'};tank.add(alias);}
  const origin=new T.Object3D();origin.name='SOCKET_FABRICATION_ORIGIN';origin.userData.kind='fabrication';tank.add(origin);
  const front=new T.Group();front.name='FABRICATION_FRONT';front.position.y=animated?.25:3.05;front.userData=animated?{driver:'clip time maps to local Y 0.25-3.05 m'}:{static_lookup:true,visual_state:'complete_endpoint'};if(animated){const frame=new T.BufferGeometry().setFromPoints([new T.Vector3(-3.15,0,-4.8),new T.Vector3(3.15,0,-4.8),new T.Vector3(3.15,0,-4.8),new T.Vector3(3.15,0,1.95),new T.Vector3(3.15,0,1.95),new T.Vector3(-3.15,0,1.95),new T.Vector3(-3.15,0,1.95),new T.Vector3(-3.15,0,-4.8)]);const indicator=new T.LineSegments(frame,material);indicator.name='FABRICATION_FRONT_INDICATOR';indicator.userData.component='moving fabrication boundary';front.add(indicator);}tank.add(front);
  return {wireframe,front,bands};
}
function makeClip(source,{bands,front},scene){
  const tracks=source.tracks.filter(track=>scene.getObjectByName(T.PropertyBinding.parseTrackName(track.name).nodeName)).map(track=>track.clone());
  for(let index=0;index<bands.length;index++){const reveal=(index+1)/bands.length*DURATION,track=new T.VectorKeyframeTrack(`${bands[index].name}.position`,[0,Math.max(0,reveal-.001),reveal],[0,-100,0,0,-100,0,0,0,0]);track.setInterpolation(T.InterpolateDiscrete);tracks.push(track);}
  tracks.push(new T.VectorKeyframeTrack(`${front.name}.position`,[0,16],[0,.25,0,0,3.05,0]));
  return new T.AnimationClip(CLIP,DURATION,tracks);
}
function count(scene){let triangles=0,draws=0;const materials=new Set();scene.traverse(o=>{if(o.isMesh){triangles+=triangleCount(o.geometry);draws++;}else if(o.isLine||o.isPoints)draws++;if(o.material)for(const material of [].concat(o.material))materials.add(material);});return{triangles:Math.round(triangles),draws,materials:materials.size};}
async function exportGLB(scene,animations,file){const exporter=new GLTFExporter(),array=await exporter.parseAsync(scene,{binary:true,animations,onlyVisible:true,trs:true});await fs.writeFile(file,Buffer.from(array));}
async function exportMeshopt(file){const document=await transformIO.read(file);await document.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const output=file.replace(/\.glb$/,'.meshopt.glb');await transformIO.write(output,document);return{file:path.basename(output),bytes:(await fs.stat(output)).size};}
async function sha256(file){return crypto.createHash('sha256').update(await fs.readFile(path.join(ROOT,file))).digest('hex');}
async function build(lod){
  const stalEntry=lod===0?STAL_MANIFEST.assets.find(asset=>asset.damage_level===0):STAL_LOD_MANIFEST.assets.find(asset=>asset.damage_level===0&&asset.lod===lod);
  const stalSource=`assets/terraformer/${stalEntry.file}`,tankSource=lod===0?'assets/hover-tank/mork_hover_tank_d0.glb':lod===1?'assets/hover-tank/mork_hover_tank_low_d0.glb':`assets/hover-tank/${MORK_DISTANCE_MANIFEST.assets[0].file}`;
  const [sg,tg]=await Promise.all([load(stalSource),load(tankSource)]),scene=new T.Scene();scene.name='Stalheart_MORK_Fabrication';scene.userData={asset_id:`stalheart_mork_fabrication_lod${lod}`,family:'stalheart_mork_fabrication',damage_level:0,lod,credit:'Models by jelaludo'};const sceneRoot=new T.Group();sceneRoot.name='FABRICATION_SCENE_ROOT';sceneRoot.userData={...scene.userData};scene.add(sceneRoot);
  const stal=sg.scene;stal.name='STALHEART_ROOT';stal.userData={...stal.userData,visual_state:'complete_intact_machine',canonical_family:'terraformer_3000',canonical_asset_id:stalEntry.id,canonical_lod:lod};
  const tank=tg.scene;tank.name='MORK_ROOT';tank.userData={...tank.userData,visual_state:'fabricating_wireframe_only',canonical_family:'mork_hover_tank',canonical_lod:lod};cleanDegenerateMeshes(tank);tank.position.x=-1;sceneRoot.add(stal,tank);scene.updateMatrixWorld(true);const canonicalStalMetrics=count(stal);
  // Operational tank geometry and clips are deliberately excluded: this scene ends at a complete wireframe.
  const fab=addFabricationNodes(tank,{animated:lod<2});
  uniqueNames(scene);for(const name of [...ENGINE_NODES,'STALHEART_ROOT','MORK_ROOT','MORK_STAGE_01_CHASSIS_HULL','MORK_STAGE_02_TURRET_WEAPONS','MORK_BUILD_WIREFRAME','MORK_BUILD_LATTICE','MORK_WIREFRAME_GEOMETRY','FABRICATION_FRONT','SOCKET_FABRICATION_ORIGIN']){const hit=scene.getObjectByName(name)||scene.getObjectByName(safe(name));if(hit)hit.name=name;}
  const sourceClip=sg.animations.find(animation=>animation.name==='Terraforming_Cycle')||sg.animations[0],animations=lod<2?[makeClip(sourceClip,{bands:fab.bands.map(node=>scene.getObjectByName(node.name)),front:scene.getObjectByName('FABRICATION_FRONT')},scene)]:[];
  cleanDegenerateMeshes(scene);scene.updateMatrixWorld(true);const preliminary=count(scene),bounds=new T.Box3().setFromObject(scene,true),dimensions=bounds.getSize(new T.Vector3()).toArray(),file=path.join(OUT,`stalheart_mork_fabrication_lod${lod}.glb`);await exportGLB(scene,animations,file);const bytes=(await fs.stat(file)).size,compressed=await exportMeshopt(file),relativeFile=`assets/fabrication-lab/${path.basename(file)}`,relativeMeshopt=`assets/fabrication-lab/${compressed.file}`;
  return{id:`stalheart_mork_fabrication_lod${lod}`,name:'Stålheart / MÖRK wireframe fabrication',family:'stalheart_mork_fabrication',file:path.basename(file),meshopt_file:compressed.file,lod,detail:['detailed','game','distance'][lod],damage_level:0,state:lod<2?'Wireframe fabrication':'Complete wireframe static proxy',terraformer_state:'complete_intact_machine',tank_visual_state:'wireframe_only',reduction_method:'canonical Stålheart tier plus MÖRK-derived line wireframe',plot_m:[48,56],root:'FABRICATION_SCENE_ROOT',triangles:preliminary.triangles,draw_calls:preliminary.draws,materials:preliminary.materials,textures:0,bytes,sha256:await sha256(relativeFile),meshopt_bytes:compressed.bytes,meshopt_sha256:await sha256(relativeMeshopt),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),dimensions_m:dimensions},credit:'Models by jelaludo',source_assets:[stalSource,tankSource],derived:true,review_status:'contract_candidate_pending_game_camera_reference_phone',canonical_terraformer:{family_manifest:'assets/terraformer/manifest-lods.json',asset_id:stalEntry.id,lod,damage_level:0,file:stalSource,sha256:await sha256(stalSource),triangles:canonicalStalMetrics.triangles,draw_calls:canonicalStalMetrics.draws},engine_nodes:ENGINE_NODES,required_nodes:['FABRICATION_SCENE_ROOT','STALHEART_ROOT','MORK_ROOT','MORK_BUILD_WIREFRAME','MORK_WIREFRAME_GEOMETRY','SOCKET_FABRICATION_ORIGIN',...(lod<2?['FABRICATION_FRONT']:[])],animations:lod<2?[CLIP]:[],clips:lod<2?[{name:CLIP,duration_s:DURATION,loop:false}]:[],construction_stages:[{node:'MORK_BUILD_WIREFRAME',range:[0,1],result:'complete recognizable MÖRK wireframe'}],wireframe_node:'MORK_BUILD_WIREFRAME',lattice_node:'MORK_BUILD_LATTICE',fabrication_front_node:lod<2?'FABRICATION_FRONT':null,static_progress:lod===2?1:null,compatibility_aliases:{MORK_BUILD_LATTICE:'MORK_BUILD_WIREFRAME',MORK_STAGE_01_CHASSIS_HULL:'deprecated empty lookup',MORK_STAGE_02_TURRET_WEAPONS:'deprecated empty lookup'},sockets:[{id:'MATERIAL_INPUT',kind:'material',position_m:[16,1,-24],normal:[0,0,-1],available:true,width_m:null},{id:'FABRICATION_ORIGIN',kind:'fabrication',position_m:[-1,0,0],normal:[0,1,0],available:true,width_m:6}],colliders:[{id:'reserved_machine_envelope',center_m:[0,18,0],size_m:[44,36,22],condition:'coarse_only'},{id:'tank_build_bay',center_m:[-1,1.6,2],size_m:[6.2,3.2,13.5],condition:'fabrication_sequence'}],description:'The canonical complete intact Stålheart builds a recognizable MÖRK as cyan linework. The one-shot ends at the complete wireframe and never reveals solid tank armor.'};
}

const assets=[];for(const lod of [0,1,2])assets.push(await build(lod));
const manifest={version:2,units:'meters',up:'+Y',forward:'+Z',plain_glb_source_of_truth:true,family:'stalheart_mork_fabrication',terraformer_family_source:'assets/terraformer/manifest-lods.json',lod_policy:{initial_load:'lod2',game_near_m:150,hysteresis_m:20,detailed:'manual cinematic selection',note:'Tune distances for the game camera and reference hardware.'},compression:{extension:'EXT_meshopt_compression',required:true,method:'filter',position_quantization:false,uncompressed_fallback:'file'},lore:{material:'AFR-9 energized construction linework',explanation:'Stålheart prints the structural definition of a MÖRK as cyan linework. This authored one-shot intentionally stops at the complete wireframe; armor skinning is outside the current animation.'},assets};
await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('FABRICATION_COMPLETE',assets.map(e=>({lod:e.lod,triangles:e.triangles,draws:e.draw_calls,bytes:e.bytes})));
