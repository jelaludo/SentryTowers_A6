import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';

const root=new URL('../../',import.meta.url),families=[
  {folder:'assets/launchpad/',manifest:'manifest-lods.json',clip:'Cargo_Recovery_Cycle',duration:20,channels:6},
  {folder:'assets/terraformer/',manifest:'manifest-lods.json',clip:'Terraforming_Cycle',duration:16,channels:9}
];
await MeshoptDecoder.ready;const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
function hash(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function values(object){return[...object.position.toArray(),...object.quaternion.toArray(),...object.scale.toArray()];}
function close(a,b,tolerance=.0001){return a.length===b.length&&a.every((value,index)=>Math.abs(value-b[index])<=tolerance);}
function sampleClip(gltf,clipName,targets,times){const clip=gltf.animations.find(animation=>animation.name===clipName),mixer=new T.AnimationMixer(gltf.scene),action=mixer.clipAction(clip).play(),samples=[];for(const time of times){mixer.setTime(time);samples.push(Object.fromEntries(targets.map(name=>[name,values(gltf.scene.getObjectByName(name))])));}action.stop();return samples;}
function inspect(gltf){
  gltf.scene.updateMatrixWorld(true);const names=[],materials=new Set();let triangles=0,drawCalls=0,textures=0;
  gltf.scene.traverse(object=>{if(object.name)names.push(object.name);if(!object.isMesh)return;const geometries=[object.geometry],meshMaterials=Array.isArray(object.material)?object.material:[object.material];for(const material of meshMaterials){materials.add(material);for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap'])if(material?.[key])textures++;}for(const geometry of geometries){const position=geometry.attributes.position,index=geometry.index,count=index?index.count:position.count;triangles+=count/3;drawCalls+=geometry.groups.length||1;for(let i=0;i<count;i+=3){const a=new T.Vector3().fromBufferAttribute(position,index?index.getX(i):i),b=new T.Vector3().fromBufferAttribute(position,index?index.getX(i+1):i+1),c=new T.Vector3().fromBufferAttribute(position,index?index.getX(i+2):i+2);assert(a.toArray().every(Number.isFinite)&&b.toArray().every(Number.isFinite)&&c.toArray().every(Number.isFinite),'finite positions');assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-20,'degenerate triangle');}}});
  return{names,materials:materials.size,textures,triangles:Math.round(triangles),drawCalls,bounds:new T.Box3().setFromObject(gltf.scene,true)};
}

for(const family of families){
  const directory=new URL(family.folder,root),manifest=JSON.parse(fs.readFileSync(new URL(family.manifest,directory)));assert.equal(manifest.version,2);assert.equal(manifest.plain_glb_source_of_truth,true);assert.equal(manifest.assets.length,8);assert.equal(manifest.status,'contract_candidate_pending_game_camera_reference_phone');
  const sourceManifest=JSON.parse(fs.readFileSync(new URL('manifest.json',directory))),sourceByDamage=new Map();
  for(const sourceEntry of sourceManifest.assets){const bytes=fs.readFileSync(new URL(sourceEntry.file,directory)),gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');sourceByDamage.set(sourceEntry.damage_level,gltf);}
  const d0Source=sourceByDamage.get(0).scene;let compressedCount=0;
  for(const entry of manifest.assets){
    assert.equal(entry.review_status,'contract_candidate_pending_game_camera_reference_phone');assert.equal(entry.derived,true);assert.equal(entry.materials,1);assert.equal(entry.textures,0);assert([1,2].includes(entry.lod));assert(entry.damage_level>=0&&entry.damage_level<=3);
    let plainInspection,plainGLTF;
    for(const compressed of [false,true]){
      const name=compressed?entry.meshopt_file:entry.file,bytes=fs.readFileSync(new URL(name,directory));assert.equal(bytes.length,compressed?entry.meshopt_bytes:entry.bytes);assert.equal(hash(bytes),compressed?entry.meshopt_sha256:entry.sha256);
      if(compressed){const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert(json.extensionsRequired?.includes('EXT_meshopt_compression'));compressedCount++;}else{const report=await validator.validateBytes(bytes,{maxIssues:100});assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));}
      const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const result=inspect(gltf);assert.equal(result.triangles,entry.triangles);assert.equal(result.drawCalls,entry.draw_calls);assert.equal(result.materials,1);assert.equal(result.textures,0);assert.equal(new Set(result.names).size,result.names.length,`${name}: unique names`);assert(result.names.every(nodeName=>!nodeName.includes('.')),`${name}: dot-free names`);for(const required of entry.required_nodes)assert(gltf.scene.getObjectByName(required),`${name}: ${required}`);
      if(!compressed){plainInspection=result;plainGLTF=gltf;}else{assert(result.bounds.min.distanceTo(plainInspection.bounds.min)<.03,`${name}: decoded minimum bounds`);assert(result.bounds.max.distanceTo(plainInspection.bounds.max)<.03,`${name}: decoded maximum bounds`);}
      if(entry.lod===1&&entry.animations.length){assert.equal(gltf.animations.length,1);const clip=gltf.animations[0];assert.equal(clip.name,family.clip);assert(Math.abs(clip.duration-family.duration)<.001);assert.equal(clip.tracks.length,family.channels);const targets=new Set(clip.tracks.map(track=>T.PropertyBinding.parseTrackName(track.name).nodeName));assert.equal(targets.size,family.channels);}
      else assert.equal(gltf.animations.length,0);
      for(const socket of entry.sockets){const node=gltf.scene.getObjectByName(`SOCKET_${socket.id}`);assert(node,`${name}: socket ${socket.id}`);assert(node.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...socket.position_m))<.001,`${name}: socket ${socket.id} position`);assert(new T.Vector3(0,0,1).applyQuaternion(node.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...socket.normal))<.001,`${name}: socket ${socket.id} normal`);}
    }
    const size=plainInspection.bounds.getSize(new T.Vector3()),sourceSize=new T.Vector3(...entry.source_bounds.dimensions_m);for(const axis of ['x','y','z'])assert(Math.abs(size[axis]-sourceSize[axis])<=Math.max(.3,sourceSize[axis]*.035),`${entry.id}: ${axis} silhouette changed`);
    const sourceGLTF=sourceByDamage.get(entry.damage_level),sourceScene=sourceGLTF.scene;for(const required of entry.required_nodes){const actual=plainGLTF.scene.getObjectByName(required),expected=sourceScene.getObjectByName(required)||d0Source.getObjectByName(required);assert(actual&&expected,`${entry.id}: transform ${required}`);assert(close(values(actual),values(expected)),`${entry.id}: ${required} transform parity`);}
    if(entry.lod===1&&entry.animations.length){const times=[0,family.duration*.23,family.duration*.51,family.duration*.79,family.duration],targets=[...new Set(plainGLTF.animations[0].tracks.map(track=>T.PropertyBinding.parseTrackName(track.name).nodeName))],actualSamples=sampleClip(plainGLTF,family.clip,targets,times),sourceSamples=sampleClip(sourceGLTF,family.clip,targets,times);for(let i=0;i<times.length;i++)for(const target of targets)assert(close(actualSamples[i][target],sourceSamples[i][target],.001),`${entry.id}: ${target} motion parity at ${times[i]} s`);}
    if(entry.lod===1){assert(entry.triangles<=manifest.budgets.lod1.triangles_max);assert(entry.draw_calls<=manifest.budgets.lod1.draw_calls_max);assert(entry.bytes<=manifest.budgets.lod1.plain_bytes_max);}else{assert(entry.triangles<=manifest.budgets.lod2.triangles_max);assert.equal(entry.draw_calls,1);assert(entry.bytes<=manifest.budgets.lod2.plain_bytes_max);}
    console.log('PASS',entry.id,entry.triangles,'triangles',entry.draw_calls,'draws',entry.bytes,'plain bytes',entry.meshopt_bytes,'Meshopt bytes');
  }
  assert.equal(compressedCount,8);console.log('PASS',manifest.family,'plain and decoded Meshopt tiers, names, clips, bounds and budgets.');
}
