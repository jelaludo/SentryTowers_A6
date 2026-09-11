import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import validator from 'gltf-validator';
const dir=new URL('../../assets/hover-tank/containers/',import.meta.url),manifest={assets:['manifest.json','manifest-low.json'].flatMap(file=>JSON.parse(fs.readFileSync(new URL(file,dir))).assets)};
for(const e of manifest.assets){
 const bytes=fs.readFileSync(new URL(e.file,dir)),v=await validator.validateBytes(bytes,{maxIssues:30});assert.equal(v.issues.numErrors,0,JSON.stringify(v.issues));
 const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');g.scene.updateMatrixWorld(true);
 const meshes=[];g.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});if(e.detail==='low'){assert(meshes.every(o=>o.geometry.attributes.color&&o.material.vertexColors),'game palette missing');assert.equal(new Set(meshes.map(o=>o.material)).size,1,'game material budget');assert(e.triangles<=(e.id.endsWith('empty')?1400:e.id.endsWith('loaded')?8500:18000),'game triangle budget');}
 const containers=[],tanks=[];g.scene.traverse(o=>{if(o.userData.role==='tank_container')containers.push(o);if(o.userData.role==='mork_tank')tanks.push(o);});
 for(const container of containers){const x=container.position.x;const shells=[];container.traverse(o=>{if(o.name.startsWith('SHELL_'))shells.push(o);});const hits=new T.Raycaster(new T.Vector3(x+.831,3,1.573),new T.Vector3(0,-1,0)).intersectObjects(shells,true);assert.equal(hits.filter(h=>Math.abs(h.point.y-.26)<1e-5).length,1,'duplicate exposed floor at Y=.26');}
 const diorama=e.id.endsWith('diorama');assert.equal(containers.length,diorama?3:1);assert.equal(tanks.length,e.id.endsWith('empty')?0:diorama?2:1);
 function fit(tank){const box=new T.Box3().setFromObject(tank,true),x=tank.position.x;assert(box.min.x>=x-3.3&&box.max.x<=x+3.3,'side clearance');assert(box.min.z>=-7.1&&box.max.z<=7.1,'cannon/rear clearance');assert(box.min.y>=.25&&box.max.y<3.55,'floor/roof clearance');}
 if(e.id.endsWith('loaded'))fit(tanks[0]);
 const mixer=new T.AnimationMixer(g.scene);
 if(diorama){
  assert.deepEqual(containers.map(o=>o.userData.number).sort(),['01','02','03']);fit(tanks.find(o=>o.name.startsWith('VEHICLE_02')));
  const clip=g.animations.find(c=>c.name==='Tank_Roll_Out');assert(clip);const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.update(0);g.scene.updateMatrixWorld(true);const deploying=tanks.find(o=>o.name.startsWith('VEHICLE_03'));fit(deploying);
  const fixed=tanks.find(o=>o.name.startsWith('VEHICLE_02')).matrixWorld.clone();
  for(let i=0;i<=32;i++){action.time=clip.duration*i/32;mixer.update(0);g.scene.updateMatrixWorld(true);const b=new T.Box3().setFromObject(deploying,true);assert(b.min.x>=7.7&&b.max.x<=14.3,'straight rollout');assert(b.min.y>=-.01,'ground penetration');assert(tanks.find(o=>o.name.startsWith('VEHICLE_02')).matrixWorld.equals(fixed),'parked tank moved');}
  assert(new T.Box3().setFromObject(deploying,true).min.z>10.4,'tank does not exit ramp fully');
 }else{
  assert.deepEqual(g.animations.map(c=>c.name).sort(),['Doors_Close','Doors_Open']);
  const clip=g.animations.find(c=>c.name==='Doors_Open'),a=mixer.clipAction(clip);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=clip.duration;mixer.update(0);g.scene.updateMatrixWorld(true);
  for(const x of [-2.95,0,2.95])for(const y of [.6,1.5,3.25]){const ray=new T.Raycaster(new T.Vector3(x,y,8),new T.Vector3(0,0,-1),0,.9);const doors=[];g.scene.traverse(o=>{if(o.userData.component==='door')doors.push(o);});assert.equal(ray.intersectObjects(doors,true).length,0,'door obstructs entrance');}
 }
 console.log('PASS',e.id,e.triangles,'triangles;',v.issues.numWarnings,'warnings; fit, scene inventory, motion and clearance');
}
