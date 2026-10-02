import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';

const dir=new URL('../../assets/missile-factory/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',dir)));
assert.deepEqual(manifest.assets.map(a=>a.lod),[0,1,2]);assert.equal(manifest.storage.crate_count,8);assert.deepEqual(manifest.storage.types,['DART','NEEDLE','TALON','CRUISE']);await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for(const e of manifest.assets){
 const bytes=await fs.readFile(new URL(e.file,dir));assert.equal(bytes.length,e.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),e.sha256);const report=await validator.validateBytes(bytes,{maxIssues:100});assert.equal(report.issues.numErrors,0,e.file+' glTF errors');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');const root=gltf.scene.getObjectByName('MISSILE_FACTORY_ROOT');assert(root);const names=[];root.traverse(o=>names.push(o.name));assert.equal(new Set(names).size,names.length,e.file+' duplicate names');assert(names.every(n=>!n.includes('.')),e.file+' dotted name');
 for(const name of ['TIP_GANTRY_ROOT','GANTRY_HEAD_1_SLIDE','GANTRY_HEAD_1_LIFT','GANTRY_HEAD_2_SLIDE','GANTRY_HEAD_2_LIFT','SHELL_A_EMPTY','SHELL_B_RECEIVING_TIP','FINISHED_ROUND'])assert(root.getObjectByName(name),e.file+' '+name);
 assert(!names.some(n=>n.startsWith('ASSEMBLY_ARM_')||n.startsWith('STAGE_')||n.includes('CONVEYOR')),e.file+' retained old line element');
 const crates=[];root.traverse(o=>{if(/^STORAGE_CRATE_\d\d_(DART|NEEDLE|TALON|CRUISE)$/.test(o.name))crates.push(o);});assert.equal(crates.length,8,e.file+' crate count');for(const type of manifest.storage.types){assert.equal(crates.filter(c=>c.userData.missile_family===type).length,2,e.file+' '+type);}
 for(const s of e.sockets){const o=root.getObjectByName('SOCKET_'+s.id);assert(o,e.file+' '+s.id);assert(o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<.001,e.file+' socket position');assert(new T.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...s.normal))<.001,e.file+' socket normal');}
 const compressed=await fs.readFile(new URL(e.meshopt_file,dir));assert.equal(compressed.length,e.meshopt_bytes);assert.equal(crypto.createHash('sha256').update(compressed).digest('hex'),e.meshopt_sha256);await io.read(fileURLToPath(new URL(e.meshopt_file,dir)));
 let triangles=0,draws=0;root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draws+=o.geometry.groups.length||1;}});assert.equal(Math.round(triangles),e.triangles,e.file+' triangles');assert.equal(draws,e.draw_calls,e.file+' draws');const bounds=new T.Box3().setFromObject(root,true);assert(bounds.min.x>=-10.01&&bounds.max.x<=10.01,e.file+' plot x');assert(bounds.min.z>=-5.01&&bounds.max.z<=5.01,e.file+' plot z');
 if(e.lod<2){assert.equal(gltf.animations.length,1);assert.equal(gltf.animations[0].name,'Tip_Installation_Cycle');assert(Math.abs(gltf.animations[0].duration-6)<.001);const tip=root.getObjectByName('EXPLOSIVE_TIP_1'),mixer=new T.AnimationMixer(root),action=mixer.clipAction(gltf.animations[0]);action.play();mixer.setTime(0);const start=tip.getWorldPosition(new T.Vector3());mixer.setTime(3.1);const lowered=tip.getWorldPosition(new T.Vector3());assert(start.y-lowered.y>.5,e.file+' gantry tip did not lower');assert(Math.abs(lowered.z-(-.35))<.2,e.file+' tip misses shell nose');}
 if(e.lod===1){assert(e.triangles<=8000&&e.draw_calls<=10&&e.bytes<=400000,'game target');}if(e.lod===2){assert.equal(gltf.animations.length,0);assert.equal(draws,1);assert(e.triangles<=3000&&e.bytes<=250000,'distance target');}
 console.log('PASS',e.file,e.triangles,'triangles',e.draw_calls,'draws',report.issues.numWarnings,'warnings; decoded Meshopt');
}
for(const source of Object.values(manifest.sources)){const data=await fs.readFile(new URL(source.file,dir));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),source.sha256,'source hash');}
console.log('PASS redesigned missile factory: compact gantry, animated tip placement, eight typed crates, sockets, budgets and compressed exports.');
