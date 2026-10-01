import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';
const dir=new URL('../../assets/missile-factory/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',dir)));
assert.equal(manifest.assets.length,3);assert.deepEqual(manifest.assets.map(a=>a.lod),[0,1,2]);await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for(const e of manifest.assets){const data=await fs.readFile(new URL(e.file,dir));assert.equal(data.length,e.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),e.sha256);const report=await validator.validateBytes(data,{maxIssues:100});assert.equal(report.issues.numErrors,0,e.file+' glTF errors');const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');const root=gltf.scene.getObjectByName('MISSILE_FACTORY_ROOT');assert(root);const names=[];root.traverse(o=>names.push(o.name));assert.equal(new Set(names).size,names.length,e.file+' duplicate names');assert(names.every(n=>!n.includes('.')),e.file+' dotted names');for(const s of e.sockets){const o=root.getObjectByName('SOCKET_'+s.id);assert(o,e.file+' '+s.id);assert(o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<.001,e.file+' socket position');assert(new T.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...s.normal))<.001,e.file+' socket normal');}for(let i=1;i<=4;i++)assert(names.some(n=>n.startsWith(`STAGE_${i}_MISSILE`)),e.file+' stage '+i);for(let i=1;i<=3;i++)assert(names.some(n=>n.startsWith(`STORAGE_CASE_${String(i).padStart(2,'0')}`)),e.file+' case '+i);
 const compressed=await fs.readFile(new URL(e.meshopt_file,dir));assert.equal(compressed.length,e.meshopt_bytes);assert.equal(crypto.createHash('sha256').update(compressed).digest('hex'),e.meshopt_sha256);await io.read(fileURLToPath(new URL(e.meshopt_file,dir)));
 let triangles=0,draws=0;root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draws+=o.geometry.groups.length||1;}});assert.equal(Math.round(triangles),e.triangles,e.file+' triangles');assert.equal(draws,e.draw_calls,e.file+' draws');const bounds=new T.Box3().setFromObject(root,true);assert(bounds.min.x>=-10.01&&bounds.max.x<=10.01,e.file+' plot x');assert(bounds.min.z>=-5.01&&bounds.max.z<=5.01,e.file+' plot z');if(e.lod===1){assert(gltf.animations.some(c=>c.name==='Missile_Assembly_Cycle'&&Math.abs(c.duration-8)<.001));assert(e.triangles<=8000&&e.bytes<=400000);}if(e.lod===2){assert.equal(gltf.animations.length,0);assert.equal(draws,1);assert(e.triangles<=3000&&e.bytes<=250000);}console.log('PASS',e.file,triangles,'triangles',draws,'draws',report.issues.numWarnings,'warnings; decoded Meshopt');}
for(const source of Object.values(manifest.sources)){const data=await fs.readFile(new URL(source.file,dir));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),source.sha256,'source changed');}
console.log('PASS missile factory: staged build, reused sources, storage, sockets, tiers, clips, plain and decoded compressed exports.');
