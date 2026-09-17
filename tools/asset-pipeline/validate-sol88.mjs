import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';

const directory=new URL('../../assets/sol88/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',directory)));
await MeshoptDecoder.ready;const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
function sha(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function inspect(gltf){gltf.scene.updateMatrixWorld(true);const names=[],materials=new Set(),textures=new Set(),skins=[];let triangles=0,drawCalls=0;gltf.scene.traverse(object=>{if(object.name)names.push(object.name);if(!(object.isMesh||object.isLine||object.isPoints))return;drawCalls+=object.geometry.groups.length||1;for(const material of [].concat(object.material||[])){materials.add(material);for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'])if(material?.[key])textures.add(material[key]);}if(object.isMesh){triangles+=(object.geometry.index?object.geometry.index.count:object.geometry.attributes.position.count)/3;if(object.isSkinnedMesh)skins.push(object);}});return{names,materialNames:[...materials].map(item=>item.name).sort(),textures:textures.size,skins,triangles:Math.round(triangles),drawCalls,bounds:new T.Box3().setFromObject(gltf.scene,true)};}
function close(a,b,t=.025){return a.length===b.length&&a.every((value,index)=>Math.abs(value-b[index])<=t);}
function sample(gltf,clipName,time,names){const mixer=new T.AnimationMixer(gltf.scene),clip=gltf.animations.find(item=>item.name===clipName);assert(clip,clipName);const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(time);gltf.scene.updateMatrixWorld(true);const values={};for(const name of names){const node=gltf.scene.getObjectByName(name);values[name]={position:node.getWorldPosition(new T.Vector3()).toArray(),quaternion:node.quaternion.toArray(),scale:node.scale.toArray()};}mixer.stopAllAction();return values;}

assert.equal(manifest.schema,'jelaludo.asset-family/v2-candidate');assert.equal(manifest.family,'sol88_platform');assert.equal(manifest.assets.length,3);assert.equal(manifest.plain_glb_source_of_truth,true);assert.deepEqual(manifest.supported_damage_levels,[0]);assert.equal(manifest.gameplay.beam_vfx_external,true);assert.equal(manifest.gameplay.optical_output_mw,120);assert.equal(manifest.gameplay.burn_budget_s,10);let required=null;
for(const entry of manifest.assets){assert.equal(entry.damage_level,0);assert.equal(entry.state,'intact');assert.equal(entry.origin,'centre of beam exit aperture');assert.equal(entry.fire_direction,'-Y');assert.equal(entry.review_status,'contract_candidate_pending_laser_lab_ground_camera_close_orbit_reference_phone');if(required)assert.deepEqual(entry.required_nodes,required);else required=entry.required_nodes;let plain;
  for(const compressed of [false,true]){const file=compressed?entry.meshopt_file:entry.file,bytes=fs.readFileSync(new URL(file,directory));assert.equal(bytes.length,compressed?entry.meshopt_bytes:entry.bytes);assert.equal(sha(bytes),compressed?entry.meshopt_sha256:entry.sha256);if(compressed){const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert(json.extensionsRequired?.includes('EXT_meshopt_compression'));}else{const report=await validator.validateBytes(bytes,{maxIssues:100});assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.equal(json.images?.length||0,0,`${file}: no embedded or external images`);assert.equal(json.buffers?.length,1,`${file}: self-contained binary buffer`);assert.equal(json.buffers[0].uri,undefined,`${file}: no external buffer URI`);}const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),result=inspect(gltf);assert.equal(result.triangles,entry.triangles);assert.equal(result.drawCalls,entry.draw_calls);assert.equal(result.textures,0);assert.equal(new Set(result.names).size,result.names.length,`${file}: unique node names`);assert(result.names.every(name=>name&&!name.includes('.')),`${file}: named dot-free nodes`);for(const name of entry.required_nodes)assert(gltf.scene.getObjectByName(name),`${file}: ${name}`);if(!compressed)plain={gltf,result};else{if(entry.lod<2)for(const clip of gltf.animations){for(const time of [0,clip.duration*.37,clip.duration]){const names=['CAGE_OUTER','CAGE_MIDDLE','CAGE_INNER','IRIS_BLADE_01','LENS_CARRIAGE'];const a=sample(plain.gltf,clip.name,time,names),b=sample(gltf,clip.name,time,names);for(const name of names){assert(close(a[name].position,b[name].position,.04),file+' decoded animated position');assert(new T.Quaternion(...a[name].quaternion).normalize().angleTo(new T.Quaternion(...b[name].quaternion).normalize())<.004,file+' decoded animated rotation '+clip.name+' '+time+' '+name);}}}if(entry.lod===1)validateClearance(gltf,file);assert(result.bounds.min.distanceTo(plain.result.bounds.min)<.04,`${file}: decoded min bounds`);assert(result.bounds.max.distanceTo(plain.result.bounds.max)<.04,`${file}: decoded max bounds`);}}
  const {gltf,result}=plain;if(entry.lod===1)validateClearance(gltf,entry.file);const size=result.bounds.getSize(new T.Vector3()),aperture=gltf.scene.getObjectByName('APERTURE'),position=aperture.getWorldPosition(new T.Vector3()).toArray(),direction=new T.Vector3(0,-1,0).applyQuaternion(aperture.getWorldQuaternion(new T.Quaternion())).toArray();assert(close(position,[0,0,0]),`${entry.id}: aperture at origin`);assert(close(direction,[0,-1,0]),`${entry.id}: aperture fires -Y`);assert(size.x>15&&size.x<41&&size.y>25&&size.y<41&&size.z>35&&size.z<41,`${entry.id}: expected deployed silhouette ${size.toArray()}`);for(const socket of entry.sockets){const node=gltf.scene.getObjectByName(socket.node),actual=node.getWorldPosition(new T.Vector3()).toArray();assert(close(actual,socket.position_m),`${entry.id}: ${socket.node} position ${actual}`);}
  if(entry.lod<2){assert.deepEqual(result.materialNames,entry.materials.slice().sort());assert.equal(result.drawCalls,7);assert(result.skins.length>=1);assert.deepEqual(gltf.animations.map(clip=>clip.name).sort(),manifest.assets[0].clips.map(clip=>clip.name).sort());for(const expected of entry.clips){const clip=gltf.animations.find(item=>item.name===expected.name);assert(Math.abs(clip.duration-expected.duration_s)<.001,`${entry.id}: ${expected.name} duration`);assert(!clip.tracks.some(track=>/^OPTICS_(YAW|PITCH)\./.test(track.name)),`${entry.id}: optics tracking must remain engine driven`);}const start=sample(gltf,'Convergence',0,['CAGE_OUTER','CAGE_MIDDLE','CAGE_INNER','IRIS_BLADE_01']),aligned=sample(gltf,'Convergence',4,['CAGE_OUTER','CAGE_MIDDLE','CAGE_INNER','IRIS_BLADE_01']);for(const name of ['CAGE_OUTER','CAGE_MIDDLE','CAGE_INNER'])assert(!close(start[name].quaternion,aligned[name].quaternion,.01),'cage convergence moves');
  assert(new T.Vector3(...aligned.IRIS_BLADE_01.position).length()>2.6,'iris retracts into collar');
  for(const name of ['Idle_Cycle','Firing_Cycle']){const clip=gltf.animations.find(c=>c.name===name);for(const track of clip.tracks){const n=track.getValueSize(),a=Array.from(track.values.slice(0,n)),b=Array.from(track.values.slice(-n));assert(close(a,b,.001)||close(a,b.map(v=>-v),.001),name+' loop seam');}}
  }
  else{assert.equal(gltf.animations.length,0);assert.equal(result.skins.length,0);assert.equal(result.drawCalls,1);assert.equal(result.materialNames.length,1);assert.equal(result.materialNames[0],'M_SOL88_DISTANCE_VERTEX_PALETTE');}
  if(entry.lod===1){assert(entry.triangles<=manifest.budgets.lod1.triangles_max);assert(entry.draw_calls<=manifest.budgets.lod1.draw_calls_max);assert(entry.bytes<=manifest.budgets.lod1.plain_bytes_max);}if(entry.lod===2){assert(entry.triangles<=manifest.budgets.lod2.triangles_max);assert.equal(entry.draw_calls,manifest.budgets.lod2.draw_calls_max);assert(entry.bytes<=manifest.budgets.lod2.plain_bytes_max);}console.log('PASS',entry.id,entry.triangles,'triangles',entry.draw_calls,'draws',entry.bytes,'plain bytes',entry.meshopt_bytes,'Meshopt bytes');}
console.log('PASS SOL-88 plain and decoded Meshopt tiers, names, materials, animation pivots, aperture contract, budgets and self-containment.');

function validateClearance(gltf,file){
  const root=gltf.scene,clip=gltf.animations.find(c=>c.name==='Firing_Cycle'),mixer=new T.AnimationMixer(root),action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const skins=[];root.traverse(n=>{if(n.isSkinnedMesh)skins.push(n);});
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),hit=new T.Vector3(),ray=new T.Ray();
  let minRadial=Infinity,maxRadial=0,rayCount=0;
  // Validate actual skinned triangles, including decoded compressed geometry, at 41 phases.
  for(let frame=0;frame<=40;frame++){
    mixer.setTime(frame/4);root.updateMatrixWorld(true);for(const mesh of skins)mesh.skeleton.update();
    const cageTriangles=[];
    for(const mesh of skins){
      const geometry=mesh.geometry,index=geometry.index,skin=geometry.attributes.skinIndex,position=geometry.attributes.position,vertices=[];
      for(let i=0;i<position.count;i++)vertices.push(mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld));
      for(let i=0;i<position.count;i++){
        const bone=mesh.skeleton.bones[skin.getX(i)];
        if(!bone?.name.startsWith('CAGE_'))continue;
        const radius=vertices[i].distanceTo(new T.Vector3(0,5,0)),shell=['CAGE_OUTER','CAGE_MIDDLE','CAGE_INNER'].indexOf(bone.name),nominal=manifest.motion.cage_radii_m[shell];
        assert(Math.abs(radius-nominal)<=1.05,file+' shell radial envelope '+radius);minRadial=Math.min(minRadial,radius);maxRadial=Math.max(maxRadial,radius);
      }
      for(let i=0;i<(index?index.count:position.count);i+=3){
        const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),bone=mesh.skeleton.bones[skin.getX(ids[0])];
        if(bone?.name.startsWith('CAGE_'))cageTriangles.push(ids.map(id=>vertices[id]));
      }
    }
    for(const yaw of [-35,0,35])for(const pitch of [-22,0,22]){
      const q=new T.Quaternion().setFromEuler(new T.Euler(T.MathUtils.degToRad(pitch),T.MathUtils.degToRad(yaw),0,'YXZ')),direction=new T.Vector3(0,-1,0).applyQuaternion(q);
      for(let k=0;k<9;k++){
        const offset=k===0?new T.Vector3():new T.Vector3(Math.cos(k*Math.PI/4)*.75,0,Math.sin(k*Math.PI/4)*.75).applyQuaternion(q);
        ray.set(offset,direction);rayCount++;
        for(const points of cageTriangles){a.copy(points[0]);b.copy(points[1]);c.copy(points[2]);assert(!ray.intersectTriangle(a,b,c,false,hit),file+' beam blocked at t='+frame/4+' pitch='+pitch+' yaw='+yaw);}
      }
    }
  }
  mixer.stopAllAction();root.updateMatrixWorld(true);
  console.log('CLEARANCE',file,rayCount,'rays; cage radii',minRadial.toFixed(3),maxRadial.toFixed(3));
}
