import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';
import {evaluatePowerGrid,solarCapacity} from '../../solar-power/power-grid.js';

const directory=new URL('../../assets/solar-power/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest-lods.json',directory)));
const {assets}=manifest;
assert.equal(manifest.schema,'jelaludo.asset-family/v2-candidate');
assert.equal(manifest.status,'contract_candidate_pending_game_camera_reference_phone');
assert.equal(assets.length,48);
await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),engineBaselines=new Map();

function local(node){return{parent:node.parent?.name||null,transform:[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()]};}
function near(a,b){return a.parent===b.parent&&a.transform.every((value,index)=>Math.abs(value-b.transform[index])<1e-5);}

let total=0;
for(const entry of assets){
  const original=assets.find(asset=>asset.family===entry.family&&asset.damage_level===entry.damage_level&&asset.lod===0);
  for(const key of ['sockets','colliders','plot_m','output_capacity','functional'])assert.deepEqual(entry[key],original[key]);
  const familyNameSets=assets.filter(asset=>asset.family===entry.family).map(asset=>asset.engine_nodes.join('|'));
  assert.equal(new Set(familyNameSets).size,1,`${entry.family}: engine-name parity`);
  if(entry.lod){assert(entry.triangles<original.triangles*.2,`${entry.id}: triangle reduction`);assert(entry.draw_calls<=(entry.lod===2?1:7));}
  let plainBox;
  for(const compressed of [false,true]){
    const bytes=fs.readFileSync(new URL(compressed?entry.meshopt_file:entry.file,directory));
    assert.equal(bytes.length,compressed?entry.meshopt_bytes:entry.bytes);
    if(!compressed){const result=await validator.validateBytes(bytes,{maxIssues:20});assert.equal(result.issues.numErrors,0,JSON.stringify(result.issues));}
    else{const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert(json.extensionsRequired.includes('EXT_meshopt_compression'));}
    const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    gltf.scene.updateMatrixWorld(true);
    let triangles=0,draws=0,pivots=0;const names=[];
    gltf.scene.traverse(object=>{
      if(object.name){names.push(object.name);if(object.name.startsWith('TRACKER_TILT'))pivots++;}
      if(!object.isMesh)return;
      triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;
      draws+=Array.isArray(object.material)?object.material.length:1;
      const position=object.geometry.attributes.position;
      for(let index=0;index<position.count;index++)assert(Number.isFinite(position.getX(index)+position.getY(index)+position.getZ(index)));
    });
    assert.equal(triangles,entry.triangles);assert.equal(draws,entry.draw_calls);
    assert.equal(new Set(names).size,names.length,`${entry.id}: unique names`);assert(names.every(name=>!name.includes('.')),`${entry.id}: dot-free names`);
    const signature=Object.fromEntries(entry.engine_nodes.map(name=>{const node=gltf.scene.getObjectByName(name);assert(node,`${entry.id}: ${name}`);return[name,local(node)];}));
    const baselineKey=`${entry.family}:d${entry.damage_level}`;
    if(entry.lod===0&&!compressed)engineBaselines.set(baselineKey,signature);
    else for(const name of entry.engine_nodes)assert(near(signature[name],engineBaselines.get(baselineKey)[name]),`${entry.id}: ${name} hierarchy/rest transform`);
    if(entry.family!=='solar_power_station')assert.equal(pivots,entry.family==='solar_panel_rack'?1:6);
    for(const socket of entry.sockets){const node=gltf.scene.getObjectByName(`SOCKET_${socket.id}`);assert(node);assert(node.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...socket.position_m))<.001);}
    const box=new T.Box3().setFromObject(gltf.scene,true);
    if(!compressed)plainBox=box;else{assert(box.min.distanceTo(plainBox.min)<.02);assert(box.max.distanceTo(plainBox.max)<.02);}
    assert.equal(gltf.animations.length,0);total++;
  }
}

for(const lod of [0,1,2])for(let arrayDamage=0;arrayDamage<4;arrayDamage++)for(let stationDamage=0;stationDamage<4;stationDamage++){
  const get=(family,damage)=>assets.find(entry=>entry.family===family&&entry.damage_level===damage&&entry.lod===lod);
  const capacity=solarCapacity(get('solar_array',arrayDamage),get('solar_power_station',stationDamage));
  const network=evaluatePowerGrid([{id:'solar',position:[0,0,0],radius:28,capacity,enabled:capacity>0}],[{id:'tower',sourceId:'solar',position:[1,0,0],demand:20}]);
  assert.equal(network[0].powered,arrayDamage<3&&stationDamage<3);
}
console.log(`PASS ${total} plain/compressed GLBs: real Meshopt decode, geometry budgets, bounds, sockets, canonical cross-LOD/damage lookup nodes, metadata and 48 damage/power combinations.`);
