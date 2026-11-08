import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import validator from 'gltf-validator';
import {createRig,PARTS,assemblySpread,DIM} from '../../assets/robot-assembly/runtime.js';
const base=new URL('../../assets/robot-assembly/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base))),loader=new GLTFLoader(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={status:'passed',scope:'Plain exports, measured geometry and interfaces, modular placement, finite kinematic samples and original-source preservation. No packed release, force simulation or arbitrary collision proof.',files:[],checks:[],animation_samples:0},scenes=new Map(),epsilon=2e-5;
const near=(a,b,e=epsilon)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
for(const[file,hash]of Object.entries(manifest.sources.source_sha256))assert.equal(sha(await fs.readFile(new URL('../../'+file,import.meta.url))),hash,'source changed: '+file);
for(const id of new Set(manifest.assets.filter(e=>!e.module.startsWith('assembly')).map(e=>e.module))){const dir=new URL(`parts/${id}/`,base),m=JSON.parse(await fs.readFile(new URL('manifest.json',dir)));for(const e of m.assets)assert.equal(sha(await fs.readFile(new URL(e.file,dir))),e.sha256,'component-relative path: '+id);}
function frames(scene){const out=new Map();scene.updateMatrixWorld(true);scene.traverse(n=>{if(n.name)out.set(n.name,{position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray(),world:n.matrixWorld.toArray(),parent:n.parent?.name});});return out;}
for(const e of manifest.assets){
 const b=await fs.readFile(new URL(e.file,base));assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256);const v=await validator.validateBytes(b);assert.equal(v.issues.numErrors,0,JSON.stringify({file:e.file,...v.issues}));assert.equal(v.issues.numWarnings,0,JSON.stringify({file:e.file,...v.issues}));
 const {scene,animations}=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');scene.updateMatrixWorld(true);scene.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});assert.equal(animations.length,0);const names=[],meshes=[];let tris=0,degens=0;
 scene.traverse(n=>{if(n.name){assert(!n.name.includes('.'),n.name);names.push(n.name);}if(n.isMesh)meshes.push(n);});assert.equal(new Set(names).size,names.length,'duplicate names: '+e.file);
 for(const m of meshes){const g=m.geometry,p=g.attributes.position,ix=g.index?.array,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),count=ix?.length||p.count;tris+=count/3;
  for(const attr of Object.values(g.attributes))for(const value of attr.array)assert(Number.isFinite(value),'nonfinite attribute');
  for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,ix?ix[i]:i);b.fromBufferAttribute(p,ix?ix[i+1]:i+1);c.fromBufferAttribute(p,ix?ix[i+2]:i+2);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-24)degens++;}
  if(e.lod===2)assert(!m.isSkinnedMesh);else if(m.isSkinnedMesh){const w=g.attributes.skinWeight,si=g.attributes.skinIndex;for(let i=0;i<w.count;i++){near(w.getX(i),1);near(w.getY(i)+w.getZ(i)+w.getW(i),0);assert(si.getX(i)<m.skeleton.bones.length);}}
 }
 assert.equal(degens,0,`${e.file}: ${degens} degenerate faces`);assert.equal(tris,e.triangles);assert.equal(meshes.length,e.draw_calls);
 const bounds=new T.Box3().setFromObject(scene,true);bounds.min.toArray().forEach((x,i)=>near(x,e.bounds.min[i]));bounds.max.toArray().forEach((x,i)=>near(x,e.bounds.max[i]));
 scenes.set(e.module+e.lod,scene);report.files.push({file:e.file,sha256:sha(b),triangles:tris,draw_calls:meshes.length,bytes:b.length,errors:v.issues.numErrors,warnings:v.issues.numWarnings,degenerate_triangles:degens});
}
for(const id of new Set(manifest.assets.map(e=>e.module))){const a=frames(scenes.get(id+'0')),b=frames(scenes.get(id+'1')),c=frames(scenes.get(id+'2'));assert.deepEqual([...a.keys()].sort(),[...b.keys()].sort(),id+' LOD0/1 names');assert.deepEqual([...b.keys()].sort(),[...c.keys()].sort(),id+' LOD1/2 names');
 for(const [name,frame]of b){if(name==='DISTANCE_SURFACE')continue;for(const other of [a.get(name),c.get(name)]){frame.position.forEach((x,i)=>near(x,other.position[i]));frame.quaternion.forEach((x,i)=>near(x,other.quaternion[i]));frame.scale.forEach((x,i)=>near(x,other.scale[i]));frame.world.forEach((x,i)=>near(x,other.world[i]));}}
 const game=manifest.assets.find(e=>e.module===id&&e.lod===1),far=manifest.assets.find(e=>e.module===id&&e.lod===2);for(const key of ['min','max'])game.bounds[key].forEach((x,i)=>near(x,far.bounds[key][i]));
}
const game=scenes.get('assembly1'),master=scenes.get('assembly0'),neutral=frames(game);
// Standalone parts have the exact same geometry placement and internal rig frames.
for(const id of PARTS){const part=scenes.get(id.toLowerCase()+'1'),pf=frames(part);for(const [name,frame]of pf)if(neutral.has(name)&&!name.startsWith('AUREL_03_')&&name!=='DISTANCE_SURFACE')frame.world.forEach((x,i)=>near(x,neutral.get(name).world[i]));}
const rig=createRig(game),staticRig=createRig(scenes.get('assembly2'));assert(staticRig.static);const before=frames(scenes.get('assembly2'));staticRig.pose({spread:1,articulation:1,time:6});assert.deepEqual(before,frames(scenes.get('assembly2')));
// Rebuild from the individual GLBs, then compare posed surfaces with the full asset.
const rebuilt=new T.Scene(),rebuildRoot=new T.Group();rebuildRoot.name='AUREL_03_ROOT';rebuilt.add(rebuildRoot);
for(const id of PARTS){const source=clone(scenes.get(id.toLowerCase()+'1')),part=source.getObjectByName('PART_'+id);source.updateMatrixWorld(true);rebuildRoot.add(part);for(const m of [...source.children])if(m.isSkinnedMesh)rebuilt.add(m);}
rebuilt.updateMatrixWorld(true);
for(const [part,host]of [['RIBCAGE','PELVIS_FRAME'],['ARM_L','RIBCAGE_SPINE'],['ARM_R','RIBCAGE_SPINE'],['LEG_L','PELVIS_FRAME'],['LEG_R','PELVIS_FRAME'],['HAND_L','ARM_L_WRIST'],['HAND_R','ARM_R_WRIST'],['FOOT_L','LEG_L_ANKLE'],['FOOT_R','LEG_R_ANKLE'],['HEAD','RIBCAGE_SPINE']]){rebuilt.getObjectByName(host).attach(rebuilt.getObjectByName('PART_'+part));rebuilt.updateMatrixWorld(true);}
const rebuiltRig=createRig(rebuilt);let rebuiltVertices=0;
for(const time of [0,3,6,9]){rig.pose({time,articulation:1,openHands:time/12});rebuiltRig.pose({time,articulation:1,openHands:time/12});game.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const peer=rebuilt.getObjectByName(mesh.name),a=new T.Vector3(),b=new T.Vector3();assert(peer?.isSkinnedMesh);assert.equal(mesh.geometry.attributes.position.count,peer.geometry.attributes.position.count);for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,a).applyMatrix4(mesh.matrixWorld);peer.getVertexPosition(i,b).applyMatrix4(peer.matrixWorld);near(a.distanceTo(b),0,1e-4);rebuiltVertices++;}});}
report.reassembled_vertex_comparisons=rebuiltVertices;
for(let i=0;i<=240;i++){
 const t=i/20;rig.pose({articulation:1,time:t,openHands:i/240});game.traverse(n=>{assert(n.matrixWorld.elements.every(Number.isFinite));});
 for(const side of ['L','R']){const shoulder=rig.nodes['ARM_'+side+'_SHOULDER'],elbow=rig.nodes['ARM_'+side+'_ELBOW'],wrist=rig.nodes['ARM_'+side+'_WRIST'],hip=rig.nodes['LEG_'+side+'_HIP'],knee=rig.nodes['LEG_'+side+'_KNEE'],ankle=rig.nodes['LEG_'+side+'_ANKLE'];const pos=n=>n.getWorldPosition(new T.Vector3());near(pos(shoulder).distanceTo(pos(elbow)),DIM.upperArm);near(pos(elbow).distanceTo(pos(wrist)),DIM.forearm);near(pos(hip).distanceTo(pos(knee)),DIM.thigh);near(pos(knee).distanceTo(pos(ankle)),DIM.shin);
  const hand=rig.nodes['HAND_'+side+'_SOCKET_WRIST_ATTACH'];near(pos(wrist).distanceTo(pos(hand)),0);const foot=rig.nodes['FOOT_'+side+'_SOCKET_ANKLE_ATTACH'];near(pos(ankle).distanceTo(pos(foot)),0);
  const normal=n=>new T.Vector3(0,0,1).applyQuaternion(n.getWorldQuaternion(new T.Quaternion()));
  for(const [host,child]of [['SOCKET_WRIST_'+side,'HAND_'+side+'_SOCKET_WRIST_ATTACH'],['SOCKET_ANKLE_'+side,'FOOT_'+side+'_SOCKET_ANKLE_ATTACH'],['SOCKET_HIP_'+side,'SOCKET_LEG_'+side+'_ATTACH'],['SOCKET_SHOULDER_'+side,'SOCKET_ARM_'+side+'_ATTACH'],['SOCKET_HEAD','SOCKET_HEAD_ATTACH'],['SOCKET_LUMBAR','SOCKET_RIBCAGE_ATTACH']]){near(normal(rig.nodes[host]).dot(normal(rig.nodes[child])),-1);near(pos(rig.nodes[host]).distanceTo(pos(rig.nodes[child])),0);}
 }
 report.animation_samples++;
}
for(let i=0;i<=400;i++){rig.pose({spread:assemblySpread(i/20)});game.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite)));report.animation_samples++;}
rig.pose();const gameEntry=manifest.assets.find(e=>e.module==='assembly'&&e.lod===1),farEntry=manifest.assets.find(e=>e.module==='assembly'&&e.lod===2);assert(gameEntry.triangles<=25000);assert(farEntry.triangles<=3000);assert.equal(farEntry.draw_calls,1);assert(farEntry.bytes<250000);
near(gameEntry.bounds.max[1],DIM.height,.003);assert(gameEntry.bounds.min[1]>=0);near(rig.nodes.SOCKET_SHOULDER_L.getWorldPosition(new T.Vector3()).y,DIM.shoulderY);near(rig.nodes.SOCKET_HIP_L.getWorldPosition(new T.Vector3()).y,DIM.hipY);
report.checks=['42 self-contained plain GLBs validate with zero errors/warnings','Unique dot-free names, matching bind/lookup frames and socket transforms across tiers','Standalone modules reassemble into matching posed surfaces','Rigid one-bone skin weights and constant segment lengths through motion','All structural connections coincide with opposed socket normals through sampled articulation','Distance surfaces preserve game bounds and reject runtime animation','Game and distance triangle targets, one-draw/static byte targets','Nominal 1.80 m crown, adult design landmarks and nonnegative resting sole','Source and plain GLB fingerprints match manifests'];
await fs.writeFile(new URL('validation-report.json',base),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,files:report.files.length,samples:report.animation_samples}));
