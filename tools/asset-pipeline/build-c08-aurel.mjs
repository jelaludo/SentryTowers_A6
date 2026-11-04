// C08 test fit: preserve the original robot, replace hand surfaces, retain its clips.
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {copyToDocument,compactPrimitive,transformPrimitive,joinPrimitives,dedup,prune,reorder,weld,simplify,unpartition} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import {JOINTS,BIPED_REST,HAND_SCALE,HAND_MOUNT_OFFSET,HAND_ASSIGNMENT} from '../../assets/c08-worker/aurel/runtime.js';
const base=new URL('../../assets/c08-worker/',import.meta.url),out=new URL('aurel/',base),handBase=new URL('../../assets/hand-lab/',import.meta.url);
const original=JSON.parse(await fs.readFile(new URL('manifest.json',base))),handManifest=JSON.parse(await fs.readFile(new URL('manifest.json',handBase)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'c08-aurel-'));
execFileSync(process.env.BLENDER||'blender',['-b','-t','2','--python-exit-code','1','--python',new URL('../blender/export_c08_body.py',import.meta.url).pathname,'--',path.join(tmp,'body.glb')],{stdio:'inherit'});
const find=(doc,name)=>doc.getRoot().listNodes().find(n=>n.getName()===name);
const mirror=new T.Matrix4().makeScale(-1,1,1);
function reflectHand(doc){
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  transformPrimitive(p,mirror.toArray());
  // transformPrimitive also reverses triangle winding for a negative determinant.
 }
 for(const n of doc.getRoot().listNodes())n.setMatrix(new T.Matrix4().multiplyMatrices(mirror,new T.Matrix4().fromArray(n.getMatrix())).multiply(mirror).toArray());
 for(const skin of doc.getRoot().listSkins()){
  const a=skin.getInverseBindMatrices(),v=[];for(let i=0;i<a.getCount();i++)a.setElement(i,new T.Matrix4().multiplyMatrices(mirror,new T.Matrix4().fromArray(a.getElement(i,v))).multiply(mirror).toArray());
 }
}
function stripOriginalHands(doc){
 const skin=doc.getRoot().listSkins()[0],handJoints=new Set(skin.listJoints().map((n,i)=>/^(HAND_|FINGER_|THUMB_)/.test(n.getName())?i:-1));
 let removed=0;
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  const j=p.getAttribute('JOINTS_0'),w=p.getAttribute('WEIGHTS_0'),a=p.getIndices(),keep=[],iv=[],wv=[];
  for(let i=0;i<a.getCount();i+=3){const ix=[a.getScalar(i),a.getScalar(i+1),a.getScalar(i+2)];
   const flags=ix.map(k=>{j.getElement(k,iv);w.getElement(k,wv);return iv.some((b,c)=>wv[c]>.001&&handJoints.has(b))});
   if(flags.some(Boolean)){if(!flags.every(Boolean))throw new Error('Mixed hand/body triangle');removed++;}else keep.push(...ix);
  }p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep)).setBuffer(a.getBuffer()));compactPrimitive(p);
 }
 return removed;
}
const manifest={...original,family:'c08-aurel',label:'C-08 / AUREL economical hand test',variant:'aurel',assets:[],source:{original_robot:'../manifest.json',hand:'../../hand-lab/manifest.json',builder:'tools/asset-pipeline/build-c08-aurel.mjs'},hand_integration:{manufacturer:'Isao / Mechanism Atelier AUREL-01 retrofit',hand_variant:'biped',hand_triangles_each:2708,wrist_assignment:HAND_ASSIGNMENT,scale:HAND_SCALE,mount_offset_m:HAND_MOUNT_OFFSET,mount_rotation:'180 degrees about local Z; fingers down, palms forward; hand pair swapped to the user-corrected wrist assignment',namespaces:['AUREL_L_','AUREL_R_'],handedness:'L uses the source surface; R uses reflected geometry, winding, local transforms, inverse binds and Y/Z motor signs; all positive scales',legacy:'Original HAND, FINGER, THUMB and SOCKET nodes and five body clips retained. Old hand geometry removed. Original grasp/tool socket coordinates unchanged; new palm/tip sockets are the geometric grasp references.',runtime:'runtime.js: sampleHands/applyHandPose after the body mixer; 23 independent axes per hand, no baked hand channels',rest_pose:BIPED_REST},credit:'Original C08 and AUREL geometry by jelaludo; no third-party hand meshes.'};
for(const source of original.assets){
 const lod=source.lod,doc=await io.read(new URL(source.file,base).pathname);let removed=0;
 if(lod<2)removed=stripOriginalHands(doc);else{
  const body=await io.read(path.join(tmp,'body.glb')),mesh=body.getRoot().listMeshes()[0],map=copyToDocument(doc,body,[mesh]);find(doc,'C08_SKIN').setMesh(map.get(mesh));
 }
 for(const side of ['L','R']){
  const hsource=handManifest.assets.find(e=>e.variant==='biped'&&e.lod===(lod===2?2:1)),hdoc=await io.read(new URL(hsource.file,handBase).pathname);
  if(lod<2)for(const j of JOINTS){const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(...(j.axis==='x'?[1,0,0]:j.axis==='y'?[0,1,0]:[0,0,1])),BIPED_REST[j.name]||0);find(hdoc,j.name).setRotation(q.toArray());}
  if(lod===2)await hdoc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.15,error:.04}));
  if(HAND_ASSIGNMENT[side]==='reflected')reflectHand(hdoc);
  const hroot=find(hdoc,'AUREL_01_ROOT');for(const n of hdoc.getRoot().listNodes())n.setName('AUREL_'+side+'_'+n.getName());
  hroot.setExtras({...hroot.getExtras(),handedness:side==='L'?'left':'right',host:'c08',source_assignment:HAND_ASSIGNMENT[side]});
  const copied=copyToDocument(doc,hdoc,hdoc.getRoot().listNodes());const root=copied.get(hroot);
  const mount=doc.createNode('AUREL_'+side+'_MOUNT').setTranslation(HAND_MOUNT_OFFSET).setRotation([0,0,1,0]).setScale([HAND_SCALE,HAND_SCALE,HAND_SCALE]).setExtras({role:'hand_adapter',handedness:side});
  find(doc,'HAND_'+side).addChild(mount);mount.addChild(root);
  // glTF skinned mesh nodes stay at the scene root. Only the bones follow the wrist.
  const surface=doc.createNode(`AUREL_${side}_GEOMETRY`);doc.getRoot().listScenes()[0].addChild(surface);
  if(lod<2){surface.setMesh(root.getMesh()).setSkin(root.getSkin());root.setMesh(null).setSkin(null);}
 }
 if(lod===2){
  const prims=[],palette=find(doc,'C08_SKIN').getMesh().listPrimitives()[0].getMaterial();
  for(const n of doc.getRoot().listNodes())if(n.getMesh()){
   for(const p of n.getMesh().listPrimitives()){
    transformPrimitive(p,n.getWorldMatrix());p.setMaterial(palette);for(const s of p.listSemantics())if(!['POSITION','NORMAL','COLOR_0'].includes(s))p.setAttribute(s,null);
    const c=p.getAttribute('COLOR_0'),colors=new Float32Array(c.getCount()*3),v=[];for(let i=0;i<c.getCount();i++){c.getElement(i,v);colors.set(v.slice(0,3),i*3)}
    p.setAttribute('COLOR_0',doc.createAccessor().setType('VEC3').setArray(colors).setBuffer(c.getBuffer()));prims.push(p);
   }
   n.setMesh(null);
  }
  find(doc,'C08_SKIN').setMesh(doc.createMesh('C08_AUREL_DISTANCE').addPrimitive(joinPrimitives(prims)));
  for(const side of ['L','R'])find(doc,`AUREL_${side}_AUREL_DISTANCE_GEOMETRY`)?.dispose();
 }
 await doc.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),unpartition());
 const bytes=await io.writeBinary(doc),file=`c08_aurel_d0_lod${lod}.glb`;await fs.writeFile(new URL(file,out),bytes);
 const loaded=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');loaded.scene.updateMatrixWorld(true);loaded.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});
 const box=new T.Box3().setFromObject(loaded.scene,true);let triangles=0,draws=0;loaded.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draws++}});
 const sockets=[];loaded.scene.traverse(o=>{if(o.name.startsWith('SOCKET_')||o.name.includes('_SOCKET_'))sockets.push({node:o.name,parent:o.parent.name,position_m:o.getWorldPosition(new T.Vector3()).toArray()});});
 const e={...source,file,variant:'aurel',bytes:bytes.length,sha256:sha(bytes),triangles,draw_calls:draws,removed_original_hand_triangles:lod<2?removed:null,bounds:{min:box.min.toArray(),max:box.max.toArray(),dimensions_m:box.getSize(new T.Vector3()).toArray()},required_nodes:doc.getRoot().listNodes().map(n=>n.getName()).sort(),sockets,credit:manifest.credit};
 await doc.transform(reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const packed=await io.writeBinary(doc);
 await fs.mkdir(new URL('derived/meshopt/',out),{recursive:true});e.meshopt_file='derived/meshopt/'+file.replace('.glb','.meshopt.glb');e.meshopt_bytes=packed.length;e.meshopt_sha256=sha(packed);e.meshopt_derived=true;await fs.writeFile(new URL(e.meshopt_file,out),packed);manifest.assets.push(e);console.log({file,triangles,draws,bytes:bytes.length,packed:packed.length,removed});
}
manifest.animation={...manifest.animation,skeleton_joints:137,additional_hand_axes:46,engine_driven_excluded:['SENSOR_YAW',...['L','R'].flatMap(s=>JOINTS.map(j=>`AUREL_${s}_${j.name}`))]};
manifest.lod_selection={...manifest.lod_selection,lod0:'Detailed original chassis with economical AUREL hands for close-up retrofit review',lod1:'Economical articulated hand test; retain during motion',lod2:'Static chassis with simplified curled hand silhouettes and matching lookup frames'};
manifest.integration={...manifest.integration,hands:'Embedded AUREL_L_ and AUREL_R_ motor/socket namespaces. Five original body clips remain unchanged. Optional runtime.js drives fingers after the body mixer. Legacy SOCKET_HAND/TOOL offsets are preserved for compatibility; use AUREL_L/R_SOCKET_PALM and digit contacts for new grasps.',static:'LOD2 is frozen with naturally curled, simplified hand surfaces. All 180 lookup names and poses match the game rest hierarchy. Keep LOD1 for motion.',scope:'First C08 test fit only; rollout to the remaining bipeds is pending.'};
manifest.source.inputs=[...original.assets.map(e=>({file:'../'+e.file,sha256:e.sha256})),...handManifest.assets.filter(e=>e.variant==='biped').map(e=>({file:'../../hand-lab/'+e.file,sha256:e.sha256}))];
manifest.source.static_hand_simplification={derived:true,method:'Meshoptimizer topology simplification on the curled hand surface',ratio:.15,error_relative:.04};
await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');await fs.rm(tmp,{recursive:true});
