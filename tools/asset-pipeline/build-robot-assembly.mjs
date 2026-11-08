import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {dedup,prune,weld,simplify} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {simplify as simplifySurface} from './stalheart-kidou-utils.mjs';
import {buildAssembly} from './robot-assembly-shape.mjs';
import {DIM,MOTIONS,PARTS} from '../../assets/robot-assembly/runtime.js';
const out=new URL('../../assets/robot-assembly/',import.meta.url),io=new NodeIO(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}};
await MeshoptSimplifier.ready;await fs.mkdir(out,{recursive:true});
// Root-level skins avoid ambiguous parent transforms in consuming engines.
// Bake only the rest/bind geometry; all engine-driven bones remain articulated.
function rootSkins(scene){
 scene.updateMatrixWorld(true);const meshes=[];scene.traverse(n=>{if(n.isSkinnedMesh)meshes.push(n);});
 for(const mesh of meshes){
  let parent=mesh.parent;while(parent&&!parent.name.startsWith('PART_'))parent=parent.parent;mesh.userData.module=parent.name.slice(5);
  mesh.skeleton.update();const g=mesh.geometry.clone(),p=g.attributes.position,n=g.attributes.normal,v=new T.Vector3(),nv=new T.Vector3(),m=new T.Matrix4(),nm=new T.Matrix3();
  for(let i=0;i<p.count;i++){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);p.setXYZ(i,v.x,v.y,v.z);m.multiplyMatrices(mesh.skeleton.bones[g.attributes.skinIndex.getX(i)].matrixWorld,mesh.skeleton.boneInverses[g.attributes.skinIndex.getX(i)]);m.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix).premultiply(mesh.matrixWorld);nm.getNormalMatrix(m);nv.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();n.setXYZ(i,nv.x,nv.y,nv.z);}
  const ix=g.index?.array||Uint32Array.from({length:p.count},(_,i)=>i),keep=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let i=0;i<ix.length;i+=3){a.fromBufferAttribute(p,ix[i]);b.fromBufferAttribute(p,ix[i+1]);c.fromBufferAttribute(p,ix[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-24)keep.push(ix[i],ix[i+1],ix[i+2]);}g.setIndex(keep);g.clearGroups();
  const marker=new T.Group();marker.name=mesh.name+'_FRAME';marker.position.copy(mesh.position);marker.quaternion.copy(mesh.quaternion);marker.scale.copy(mesh.scale);mesh.parent.add(marker);for(const child of [...mesh.children])marker.add(child);mesh.removeFromParent();scene.add(mesh);mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.setScalar(1);mesh.geometry=g;scene.updateMatrixWorld(true);mesh.bind(new T.Skeleton(mesh.skeleton.bones));
 }return scene;
}
function staticScene(scene){
 scene.updateMatrixWorld(true);const gs=[],replacements=[];
 scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone(),p=g.attributes.position,n=g.attributes.normal,v=new T.Vector3(),nv=new T.Vector3(),mat=new T.Matrix4(),nm=new T.Matrix3();if(o.isSkinnedMesh){o.skeleton.update();for(let i=0;i<p.count;i++){o.getVertexPosition(i,v);p.setXYZ(i,v.x,v.y,v.z);const index=g.attributes.skinIndex.getX(i);mat.multiplyMatrices(o.skeleton.bones[index].matrixWorld,o.skeleton.boneInverses[index]);mat.premultiply(o.bindMatrixInverse).multiply(o.bindMatrix);nm.getNormalMatrix(mat);nv.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();n.setXYZ(i,nv.x,nv.y,nv.z);}}g.applyMatrix4(o.matrixWorld);for(const key of Object.keys(g.attributes))if(!['position','normal','color'].includes(key))g.deleteAttribute(key);g.clearGroups();gs.push(g.index?g.toNonIndexed():g);replacements.push(o);});
 for(const o of replacements){const marker=new T.Group();marker.name=o.name;marker.position.copy(o.position);marker.quaternion.copy(o.quaternion);marker.scale.copy(o.scale);marker.userData={...o.userData,static_lookup_only:true};o.parent.add(marker);for(const child of [...o.children])marker.add(child);o.removeFromParent();}
 scene.getObjectByName('DISTANCE_SURFACE')?.removeFromParent();const mesh=new T.Mesh(mergeVertices(mergeGeometries(gs,false)),new T.MeshStandardMaterial({name:'ANATOMY_STATIC_PALETTE',vertexColors:true,metalness:.45,roughness:.45}));mesh.name='DISTANCE_SURFACE';scene.add(mesh);scene.traverse(o=>{o.userData.static_lookup_only=true;if(o.name==='AUREL_03_ROOT')o.userData.static=true;});return scene;
}
const assets=[];
async function save(scene,id,lod,{derived=false}={}){
 if(!scene.getObjectByName('DISTANCE_SURFACE')){const n=new T.Group();n.name='DISTANCE_SURFACE';scene.add(n);}
 if(lod===2){const m=scene.getObjectByName('DISTANCE_SURFACE'),tri=(m.geometry.index?.count||m.geometry.attributes.position.count)/3,target=id.startsWith('assembly')?2850:Math.max(160,Math.floor(tri*.13));m.geometry=await simplifySurface(m.geometry,target);}
 const bytes0=await new GLTFExporter().parseAsync(scene,{binary:true,trs:true}),doc=await io.readBinary(new Uint8Array(bytes0));
 await doc.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}));const bytes=await io.writeBinary(doc),dir=id.startsWith('assembly')?'':`parts/${id}/`,file=`${dir}aurel03_${id}_d0_lod${lod}.glb`;await fs.mkdir(new URL(dir||'./',out),{recursive:true});await fs.writeFile(new URL(file,out),bytes);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});const bounds=new T.Box3().setFromObject(gltf.scene,true),sockets=[],names=[];let triangles=0,draw_calls=0;
 gltf.scene.traverse(n=>{if(n.name)names.push(n.name);if(n.isMesh){triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;draw_calls+=Math.max(1,n.geometry.groups.length);}if(n.name.includes('SOCKET_'))sockets.push({node:n.name,parent:n.parent.name,position_m:n.getWorldPosition(new T.Vector3()).toArray(),quaternion:n.getWorldQuaternion(new T.Quaternion()).toArray()});});
 const e={module:id,file,lod,damage_level:0,static:lod===2,derived,bytes:bytes.length,sha256:sha(bytes),triangles,draw_calls,plot_m:[1.4,1],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),dimensions_m:bounds.getSize(new T.Vector3()).toArray()},sockets,required_nodes:names.sort(),clips:[],credit:'Models by jelaludo / Model Workshop'};assets.push(e);console.log(`${id} LOD${lod}: ${triangles} tris / ${draw_calls} draws / ${bytes.length} bytes`);return e;
}
for(const lod of [0,1,2]){
 const {scene}=buildAssembly(lod===0?0:1);rootSkins(scene);
 if(lod===2)staticScene(scene);
 await save(scene,'assembly',lod,{derived:lod===2});
 // Standalone modules keep the same ground datum as the complete assembly.
 // Their position is encoded in PART_*; mount via the documented attachment socket.
 if(lod<2){
  for(const id of PARTS){const cloned=clone(scene);cloned.updateMatrixWorld(true);const part=cloned.getObjectByName('PART_'+id),world=part.matrixWorld.clone();part.removeFromParent();world.decompose(part.position,part.quaternion,part.scale);
   // Remove mounted child modules (e.g. hand from arm, arms from rib cage).
   const children=[];part.traverse(n=>{if(n!==part&&n.userData.role==='assembly_module')children.push(n);});for(const n of children)n.removeFromParent();
   const standalone=new T.Scene();standalone.name='AUREL_03_'+id;standalone.add(part);for(const mesh of [...cloned.children])if(mesh.isMesh&&mesh.userData.module===id)standalone.add(mesh);await save(standalone,id.toLowerCase(),lod);
   if(lod===1){staticScene(standalone);await save(standalone,id.toLowerCase(),2,{derived:true});}
  }
 }
}
for(const lod of [0,1,2]){
 const {scene}=buildAssembly(lod===0?0:1,'sensor');rootSkins(scene);if(lod===2)staticScene(scene);await save(scene,'assembly_sensor',lod,{derived:lod===2});
 if(lod<2){scene.updateMatrixWorld(true);const head=scene.getObjectByName('PART_HEAD'),world=head.matrixWorld.clone();head.removeFromParent();world.decompose(head.position,head.quaternion,head.scale);const only=new T.Scene();only.name='AUREL_03_SENSOR_HEAD';only.add(head);for(const mesh of [...scene.children])if(mesh.isMesh&&mesh.userData.module==='HEAD')only.add(mesh);await save(only,'head_sensor',lod);if(lod===1){staticScene(only);await save(only,'head_sensor',2,{derived:true});}}
}
const manifest={schema:'jelaludo.asset-family/v2-candidate',family:'robot-assembly',designation:'AUREL-03',label:'Robotic anatomy / Modular adult frame',version:1,plain_glb_source_of_truth:true,coordinate_system:{units:'metres',up:'+Y',forward:'+Z',origin:'Shared ground datum below assembly centre; standalone modules keep assembly-space placement'},dimensions:DIM,proportions:{intent:'Lean adult design study, not a population-average anatomical specification',head_units:1.80/.230,rib_pairs:12,body:'Tapered thoracic basket, lumbar interval, open pelvis and separate limb shafts'},damage_states:{d0:'intact',d1_d3:'not authored'},budgets:{unit_game_triangles:25000,distance_triangles:3000,distance_draw_calls:1,distance_bytes:250000},lod_selection:{initial:2,articulated:1,close_inspection:0,game_distance_m:30,hysteresis_m:8,provisional:true,static_policy:'Use LOD1 for motion or assembly; LOD2 freezes the same rest pose and retains lookup markers only'},components:{hands:'Original AUREL-01 full master / economical biped game, uniformly scaled 0.82; mirrored on right',feet:'Original AUREL-02 full master / economical biped game, original scale; mirrored on right',heads:['head','head_sensor']},runtime:{file:'runtime.js',motions:MOTIONS,baked_clips:[],scope:'Engine-driven modular separation, upper-body articulation and original hand/foot axes; no force/contact simulation'},sources:{body:'tools/asset-pipeline/robot-assembly-shape.mjs',builder:'tools/asset-pipeline/build-robot-assembly.mjs',anatomy_reference:'https://openstax.org/books/anatomy-and-physiology/pages/7-4-the-thoracic-cage',reference_use:'Facts about thoracic arrangement only; no images, text passages or mesh data incorporated',originals_preserved:true},assets};
manifest.sources.source_sha256={};for(const file of ['tools/asset-pipeline/robot-assembly-shape.mjs','tools/asset-pipeline/build-robot-assembly.mjs','assets/robot-assembly/runtime.js','tools/asset-pipeline/hand-lab-shape.mjs','tools/asset-pipeline/foot-lab-shape.mjs','assets/hand-lab/runtime.js','assets/hand-lab/biped.js','assets/foot-lab/runtime.js'])manifest.sources.source_sha256[file]=sha(await fs.readFile(new URL('../../'+file,import.meta.url)));
await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
for(const id of [...PARTS.map(x=>x.toLowerCase()),'head_sensor'])await fs.writeFile(new URL(`parts/${id}/manifest.json`,out),JSON.stringify({...manifest,assets:assets.filter(e=>e.module===id).map(e=>({...e,file:e.file.split('/').at(-1)})),runtime:{...manifest.runtime,file:'../../runtime.js'},module:id},null,2)+'\n');
