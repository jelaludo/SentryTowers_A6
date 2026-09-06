import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
const dir=new URL('../../assets/assembly-line/',import.meta.url);
const {assets}=JSON.parse(fs.readFileSync(new URL('manifest.json',dir)));
assert.equal(assets.length,24);let total=0;
for(const entry of assets){
 const data=fs.readFileSync(new URL(entry.file,dir));const result=await validator.validateBytes(data,{maxIssues:20});assert.equal(result.issues.numErrors,0,entry.id+JSON.stringify(result.issues.messages));
 const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');const root=gltf.scene;root.updateMatrixWorld(true);assert(root.getObjectByName('ROOT'));
 const nodes=[];root.traverse(o=>nodes.push(o));
 for(const s of entry.sockets){const o=root.getObjectByName('SOCKET_'+s.id);assert(o,entry.id+' socket '+s.id);assert(o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<1e-4);assert(new T.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...s.normal))<1e-4);}
 assert.equal(gltf.animations.length,entry.animations.length);const mixer=gltf.animations.length?new T.AnimationMixer(root):null;
 if(mixer){assert(Math.abs(gltf.animations[0].duration-8)<.05);mixer.clipAction(gltf.animations[0]).play();}
 if(entry.family==='robotic_assembly_line'){
  const arms=nodes.filter(o=>o.userData.component==='robot_arm');assert.equal(arms.length,8);
  const left=arms.filter(o=>o.position.x<0),right=arms.filter(o=>o.position.x>0);assert.equal(left.length,4);assert.equal(right.length,4);assert.equal(new Set(arms.map(o=>o.userData.task)).size,4);
  assert.equal(nodes.filter(o=>o.userData.component==='conveyor').length,6);
  assert.equal(nodes.filter(o=>o.userData.component==='gantry').length,3);
 }
 if(entry.family==='control_platform'&&entry.damage_level===0){
  assert.equal(nodes.filter(o=>o.name.startsWith('Monitor_screen')).length+nodes.filter(o=>o.name.startsWith('Monitor screen')).length,3);
  for(const z of [2,3,4,5]){const ray=new T.Raycaster(new T.Vector3(0,3,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(root,true)[0];assert(hit,`ramp gap at ${z}`);assert(Math.abs(hit.point.y-(5.5-z)*.2)<.04,`ramp slope at ${z}: ${hit.point.y}`);}
 }
 if(mixer){
  const joints=nodes.filter(o=>/^ARM_\d+_ELBOW$/.test(o.name));mixer.setTime(0);root.updateMatrixWorld(true);const initial=joints.map(o=>o.quaternion.clone());const movement=joints.map(()=>0);for(const t of [1,2.37,4,6]){mixer.setTime(t);root.updateMatrixWorld(true);joints.forEach((o,i)=>movement[i]=Math.max(movement[i],o.quaternion.angleTo(initial[i])));}joints.forEach((o,i)=>assert(movement[i]>.05,entry.id+' immobile '+o.name));
 }
 for(const t of [0,1.3,3.7,6.2,7.99]){
  mixer?.setTime(t);root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root,true);assert(bounds.min.x>=-entry.plot_m[0]/2-.05&&bounds.max.x<=entry.plot_m[0]/2+.05,`${entry.id} X plot overflow ${bounds.min.x} ${bounds.max.x}`);assert(bounds.min.z>=-entry.plot_m[1]/2-.05&&bounds.max.z<=entry.plot_m[1]/2+.05,`${entry.id} Z plot overflow ${bounds.min.z} ${bounds.max.z}`);
 }
 total+=data.length;console.log('PASS',entry.id,entry.triangles,'triangles',result.issues.numWarnings,'warnings');
}
console.log(`PASS: 24 GLBs; eight opposed robots and four tools; six conveyor segments; joint animation; ramp slope; animated plot bounds; ${(total/1048576).toFixed(2)} MiB.`);
