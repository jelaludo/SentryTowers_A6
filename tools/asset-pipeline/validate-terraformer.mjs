import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
const dir=new URL('../../assets/terraformer/',import.meta.url);
const {assets}=JSON.parse(fs.readFileSync(new URL('manifest.json',dir)));
assert.deepEqual(assets.map(e=>e.damage_level),[0,1,2,3]);
const joints=['J1_BASE_YAW','J2_SHOULDER','J3_ELBOW','J4_FOREARM_ROLL','J5_WRIST_PITCH','J6_TOOL_ROLL'];
for(const e of assets){
  const data=fs.readFileSync(new URL(e.file,dir));
  const report=await validator.validateBytes(data,{maxIssues:20});
  assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));
  const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const root=gltf.scene;root.updateMatrixWorld(true);assert(root.getObjectByName('ROOT'));
  const box=new T.Box3().setFromObject(root,true);
  assert(box.min.x>=-24&&box.max.x<=24,e.id+' width');
  assert(box.min.z>=-28&&box.max.z<=28,e.id+' track footprint');
  if(e.damage_level<3){
    assert(box.max.y>35&&box.max.y<37,e.id+' imposing height');
    joints.forEach(n=>assert(root.getObjectByName(n),n));
    for(let i=1;i<joints.length;i++)assert.equal(root.getObjectByName(joints[i]).parent.name,joints[i-1]);
  }
  if(e.damage_level<2){
    assert.equal(gltf.animations.length,1);const clip=gltf.animations[0];assert.equal(clip.name,'Terraforming_Cycle');assert.equal(clip.duration,16);
    for(const n of [...joints,'GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z'])assert(clip.tracks.some(t=>t.name.startsWith(n+'.')),n+' animation');
    const mixer=new T.AnimationMixer(root);mixer.clipAction(clip).play();
    let lowest=Infinity,highest=-Infinity;
    for(let t=0;t<=16;t+=.25){mixer.setTime(t);root.updateMatrixWorld(true);const p=root.getObjectByName('EXTRUSION_TIP').getWorldPosition(new T.Vector3());assert(Number.isFinite(p.y));lowest=Math.min(lowest,p.y);highest=Math.max(highest,p.y);assert(p.y>=0,e.id+' nozzle below ground');}
    mixer.setTime(0);root.updateMatrixWorld(true);const start=root.getObjectByName('EXTRUSION_TIP').getWorldPosition(new T.Vector3());mixer.setTime(15.9999);root.updateMatrixWorld(true);assert(start.distanceTo(root.getObjectByName('EXTRUSION_TIP').getWorldPosition(new T.Vector3()))<.01,'loop continuity');
    console.log('  Nozzle height',lowest.toFixed(2),'–',highest.toFixed(2),'m');
  }else assert.equal(gltf.animations.length,0,'disabled machinery');
  const names=[];root.traverse(o=>names.push(o.name));
  if(e.damage_level===2)assert(names.some(n=>n.includes('Tornreservoirshell')||n.includes('Torn_reservoir_shell')||n.includes('Torn reservoir shell')),'ruptured D2 tank');
  if(e.damage_level===3){assert(root.getObjectByName('COLLAPSED_BRIDGE'));assert(box.max.y<12,'collapsed D3 silhouette');}
  console.log('PASS',e.id,e.triangles,'triangles',report.issues.numWarnings,'warnings');
}
console.log('PASS: four destruction states; valid GLBs; six-joint hierarchy; rail/carriage/lift animation; ground clearance and loop continuity.');
