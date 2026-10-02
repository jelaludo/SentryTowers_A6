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
import {attachScoreDisplay,normalizeScore} from '../../assets/planet-scoreboards/runtime.js';

const dir=new URL('../../assets/planet-scoreboards/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',dir)));assert.equal(manifest.assets.length,9);assert.equal(normalizeScore(100000000),99999999);assert.equal(normalizeScore(-1),0);await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for(const variant of ['beacon','flipdot','splitflap']){
 const entries=manifest.assets.filter(e=>e.variant===variant);assert.deepEqual(entries.map(e=>e.lod),[0,1,2]);let stable=null;
 for(const e of entries){const data=await fs.readFile(new URL(e.file,dir));assert.equal(data.length,e.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),e.sha256);const report=await validator.validateBytes(data,{maxIssues:100});assert.equal(report.issues.numErrors,0,e.file+' glTF');const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.length),'');const root=gltf.scene.getObjectByName('SCOREBOARD_ROOT');assert(root);const names=[];root.traverse(o=>names.push(o.name));assert.equal(new Set(names).size,names.length,e.file+' duplicate names');assert(names.every(n=>!n.includes('.')),e.file+' dotted names');for(const name of ['SCORE_DISPLAY_ORIGIN','SCORE_STATIC_DIGITS','SOCKET_POWER','SOCKET_SERVICE'])assert(root.getObjectByName(name),e.file+' '+name);const controls=names.filter(n=>['SCORE_DISPLAY_ORIGIN','SCORE_STATIC_DIGITS','SOCKET_POWER','SOCKET_SERVICE'].includes(n)).sort();if(stable)assert.deepEqual(controls,stable);stable=controls;
 for(const socket of e.sockets){const object=root.getObjectByName('SOCKET_'+socket.id);assert(object.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...socket.position_m))<.001,e.file+' socket position');assert(new T.Vector3(0,0,1).applyQuaternion(object.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...socket.normal))<.001,e.file+' socket normal');}
 let triangles=0,draws=0;const materials=new Set();root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draws+=o.geometry.groups.length||1;for(const m of [].concat(o.material))materials.add(m);}});assert.equal(Math.round(triangles),e.triangles);assert.equal(draws,e.draw_calls);assert.equal(materials.size,1);assert.equal(gltf.animations.length,0);const b=new T.Box3().setFromObject(root,true);assert(b.min.x>=-4.01&&b.max.x<=4.01,e.file+' plot x');assert(b.min.z>=-2.51&&b.max.z<=2.51,e.file+' plot z');assert(b.min.y>=-.01,e.file+' ground datum');const compressed=await fs.readFile(new URL(e.meshopt_file,dir));assert.equal(compressed.length,e.meshopt_bytes);assert.equal(crypto.createHash('sha256').update(compressed).digest('hex'),e.meshopt_sha256);await io.read(fileURLToPath(new URL(e.meshopt_file,dir)));
 if(e.lod<2){assert(e.triangles<=8000&&e.draw_calls<=10&&e.bytes<=400000,e.file+' game budget');const runtime=attachScoreDisplay(T,root,e,0);assert.equal(runtime.score,0);assert.equal(runtime.setScore(1000000),1000000);assert.equal(runtime.setScore(99999999),99999999);assert.equal(runtime.setScore(100000000),99999999);assert.equal(runtime.display.count>0,true);assert.equal(root.getObjectByName('SCORE_STATIC_DIGITS').visible,false);runtime.dispose();assert.equal(root.getObjectByName('SCORE_STATIC_DIGITS').visible,true);}else{assert(e.triangles<=3000&&e.draw_calls===1&&e.bytes<=250000,e.file+' distance budget');assert.throws(()=>attachScoreDisplay(T,root,e,0));}
 console.log('PASS',e.file,e.triangles,'triangles',e.draw_calls,'draws',e.bytes,'bytes; decoded Meshopt');}
}
console.log('PASS planet scoreboards: nine exports, eight-digit 0–99,999,999 runtime, sockets, names, budgets and compressed files.');
