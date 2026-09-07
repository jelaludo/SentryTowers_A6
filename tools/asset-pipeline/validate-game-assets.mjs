import fs from 'node:fs';import assert from 'node:assert/strict';
import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import validator from 'gltf-validator';
const dir=new URL('../../assets/game-ready/',import.meta.url);const {assets}=JSON.parse(fs.readFileSync(new URL('manifest.json',dir)));assert.equal(assets.length,8);
const loader=new GLTFLoader();async function read(url){const data=fs.readFileSync(url);return loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')}
for(const e of assets){
 const data=fs.readFileSync(new URL(e.file,dir));const report=await validator.validateBytes(data,{maxIssues:30});assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));
 const game=await read(new URL(e.file,dir));const original=await read(new URL(e.source_file,dir));
 let triangles=0,draws=0;game.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;draws++;}});
 assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);assert(triangles>=39000&&triangles<=41000,e.id+' budget');assert(draws<e.source_draw_calls,e.id+' batching');
 assert.equal(game.animations.length,original.animations.length);assert(game.scene.getObjectByName('ROOT'));
 const semantic=e.source_family==='hugin_launchpad'?['REUSABLE_BOOSTER','CATCHER_LIFT','CATCHER_SHOULDER','CATCHER_ELBOW','CATCHER_WRIST','CARGO_CAPSULE','CAPTURE_JAW_L','CAPTURE_JAW_R','LANDING_LEG_01','LANDING_LEG_02','LANDING_LEG_03']:['GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z','J1_BASE_YAW','J2_SHOULDER','J3_ELBOW','J4_FOREARM_ROLL','J5_WRIST_PITCH','J6_TOOL_ROLL','EXTRUSION_TIP'];
 for(const n of semantic)if(original.scene.getObjectByName(n))assert(game.scene.getObjectByName(n),n+' lost');
 const a=new T.AnimationMixer(original.scene),b=new T.AnimationMixer(game.scene);const animated=[];
 if(original.animations.length){assert.equal(game.animations[0].duration,original.animations[0].duration);assert.equal(game.animations[0].name,original.animations[0].name);a.clipAction(original.animations[0]).play();b.clipAction(game.animations[0]).play();for(const track of original.animations[0].tracks)animated.push(track.name.split('.')[0]);}
 for(const t of [0,.37,2,4,7,10,15.5,19.99]){
  a.setTime(t);b.setTime(t);original.scene.updateMatrixWorld(true);game.scene.updateMatrixWorld(true);
  for(const name of new Set([...semantic,...animated])){
   const x=original.scene.getObjectByName(name);if(!x)continue;const y=game.scene.getObjectByName(name);assert(y,name+' missing');const max=Math.max(...x.matrixWorld.elements.map((v,i)=>Math.abs(v-y.matrixWorld.elements[i])));assert(max<.0001,e.id+' changed transform '+name+' @ '+t+': '+max);
  }
 }
 a.setTime(0);b.setTime(0);original.scene.updateMatrixWorld(true);game.scene.updateMatrixWorld(true);
 const origBox=new T.Box3().setFromObject(original.scene,true),gameBox=new T.Box3().setFromObject(game.scene,true);assert(origBox.min.distanceTo(gameBox.min)<.25&&origBox.max.distanceTo(gameBox.max)<.25,e.id+' silhouette bounds');
 console.log('PASS',e.id,triangles,'triangles,',draws,'batches,',report.issues.numWarnings,'warnings; original motion preserved');
}
console.log('PASS: all eight game variants, triangle budgets, reduced batches, semantic pivots, sampled animation equivalence and silhouette bounds.');
