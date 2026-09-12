import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';

const directory=new URL('../../assets/fabrication-lab/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',directory)));
assert.equal(manifest.assets.length,3);assert.equal(manifest.units,'meters');assert.equal(manifest.up,'+Y');assert.equal(manifest.forward,'+Z');assert.equal(manifest.plain_glb_source_of_truth,true);
await MeshoptDecoder.ready;const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),required=['STALHEART_ROOT','MORK_ROOT','GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z','J1_BASE_YAW','J2_SHOULDER','J3_ELBOW','J4_FOREARM_ROLL','J5_WRIST_PITCH','J6_TOOL_ROLL','EXTRUSION_TIP','MORK_STAGE_01_CHASSIS_HULL','MORK_STAGE_02_TURRET_WEAPONS','MORK_BUILD_LATTICE','FABRICATION_FRONT','SOCKET_FABRICATION_ORIGIN'];
let referenceBox,pivotBaseline;
for(const entry of manifest.assets){
  let plainBox;
  for(const compressed of [false,true]){
    const file=compressed?entry.meshopt_file:entry.file,bytes=fs.readFileSync(new URL(file,directory));assert.equal(bytes.length,compressed?entry.meshopt_bytes:entry.bytes);
    if(compressed){const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert(json.extensionsRequired.includes('EXT_meshopt_compression'));}else{const report=await validator.validateBytes(bytes,{maxIssues:50});assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));}
    const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);const names=[];let triangles=0,draws=0;
    gltf.scene.traverse(object=>{if(object.name)names.push(object.name);if(object.isMesh){const geometry=object.geometry,position=geometry.attributes.position,index=geometry.index,count=index?index.count:position.count;triangles+=count/3;draws++;for(let i=0;i<count;i+=3){const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2,a=new T.Vector3().fromBufferAttribute(position,ia),b=new T.Vector3().fromBufferAttribute(position,ib),c=new T.Vector3().fromBufferAttribute(position,ic);assert(a.toArray().every(Number.isFinite)&&b.toArray().every(Number.isFinite)&&c.toArray().every(Number.isFinite),'positions must be finite');assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-20,`${file}: degenerate triangle`);}}});
    assert.equal(Math.round(triangles),entry.triangles);assert.equal(draws,entry.draw_calls);assert.equal(new Set(names).size,names.length,'node names must be unique');assert(names.every(name=>!name.includes('.')),'engine-facing node names must be dot-free');for(const name of [...required,...entry.engine_nodes])assert(gltf.scene.getObjectByName(name),`${file}: ${name}`);
    const box=new T.Box3().setFromObject(gltf.scene,true);if(!compressed)plainBox=box;else{assert(box.min.distanceTo(plainBox.min)<.03);assert(box.max.distanceTo(plainBox.max)<.03);}
    if(!compressed){if(!referenceBox)referenceBox=box;else{assert(Math.abs(box.min.x-referenceBox.min.x)<.4&&Math.abs(box.max.x-referenceBox.max.x)<.4);assert(Math.abs(box.max.y-referenceBox.max.y)<.4);assert(Math.abs(box.min.z-referenceBox.min.z)<.4&&Math.abs(box.max.z-referenceBox.max.z)<.4);}}
    if(entry.lod<2){const pivots=Object.fromEntries(entry.engine_nodes.map(name=>{const node=gltf.scene.getObjectByName(name);return[name,[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()]];}));if(!compressed){if(!pivotBaseline)pivotBaseline=pivots;else for(const name of entry.engine_nodes)assert(pivots[name].every((value,index)=>Math.abs(value-pivotBaseline[name][index])<1e-5),`${name}: LOD0/LOD1 pivot mismatch`);}assert.equal(gltf.animations.length,1);const clip=gltf.animations[0];assert.equal(clip.name,'MORK_Fabrication_Sequence');assert(Math.abs(clip.duration-16)<.001);for(const suffix of ['MORK_STAGE_01_CHASSIS_HULL.scale','MORK_STAGE_02_TURRET_WEAPONS.scale','FABRICATION_FRONT.position'])assert(clip.tracks.some(track=>track.name.endsWith(suffix)),suffix);
      const mixer=new T.AnimationMixer(gltf.scene),action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(0);const chassis=gltf.scene.getObjectByName('MORK_STAGE_01_CHASSIS_HULL'),weapons=gltf.scene.getObjectByName('MORK_STAGE_02_TURRET_WEAPONS'),front=gltf.scene.getObjectByName('FABRICATION_FRONT');assert(chassis.scale.y<.01&&weapons.scale.y<.01);mixer.setTime(8);assert(chassis.scale.y>.99&&weapons.scale.y<.01);assert(front.position.y>1.5&&front.position.y<1.8);mixer.setTime(15.999);assert(chassis.scale.y>.99&&weapons.scale.y>.99&&front.position.y>3);
    }else{assert.equal(gltf.animations.length,0);assert.equal(draws,1);assert(triangles<=3000);assert(entry.bytes<=250000);assert.equal(entry.static_progress,.5);}
  }
  if(entry.lod===1){assert(entry.triangles<=8000);assert(entry.draw_calls<=10);assert(entry.meshopt_bytes<=400000);}
  console.log('PASS',entry.id,entry.triangles,'triangles',entry.draw_calls,'draws',entry.bytes,'plain bytes',entry.meshopt_bytes,'Meshopt bytes');
}
console.log('PASS fabrication hierarchy, one-shot progression, plain GLBs and decoded Meshopt exports.');
