import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';
import {attachRivalryDisplay,normalizeRowScore,normalizeLabel} from '../../assets/planet-scoreboards/runtime.js';
const dir=new URL('../../assets/planet-scoreboards/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',dir)));
const old=JSON.parse(execFileSync('git',['show','885741e445600585ea8f0b4d05e4787f84de1e55:assets/planet-scoreboards/manifest.json'],{cwd:fileURLToPath(new URL('../..',import.meta.url))}));
assert.equal(manifest.assets.length,18);
for(const previous of old.assets){const current=manifest.assets.find(e=>e.id===previous.id);assert.deepEqual(current,previous,previous.id+' manifest changed');const data=await fs.readFile(new URL(previous.file,dir));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),previous.sha256,previous.file+' original changed');}
assert.equal(normalizeRowScore(-20),0);assert.equal(normalizeRowScore(1000000),999999);assert.equal(normalizeLabel('étoile',18),'ETOILE');
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const controls=['LABEL_ORIGIN','ROW_KILLS_LABEL_ORIGIN','ROW_GATHERED_LABEL_ORIGIN','ROW_USED_LABEL_ORIGIN','ROW_KILLS_DISPLAY_ORIGIN','ROW_GATHERED_DISPLAY_ORIGIN','ROW_USED_DISPLAY_ORIGIN','SOCKET_POWER','SOCKET_SERVICE','SOCKET_FX'];
for(const variant of ['beacon_rivalry','flipdot_rivalry','splitflap_rivalry']){
 const entries=manifest.assets.filter(e=>e.variant===variant);assert.deepEqual(entries.map(e=>e.lod),[0,1,2]);let reference;
 for(const e of entries){const data=await fs.readFile(new URL(e.file,dir));assert.equal(data.length,e.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),e.sha256);const report=await validator.validateBytes(data,{maxIssues:100});assert.equal(report.issues.numErrors,0,e.file+' glTF errors');assert.equal(report.issues.numWarnings,0,e.file+' glTF warnings');const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.length),'');const root=gltf.scene.getObjectByName('SCOREBOARD_ROOT');assert(root);const names=[];root.traverse(o=>names.push(o.name));assert.equal(new Set(names).size,names.length,e.file+' names');assert(names.every(n=>n&&!n.includes('.')),e.file+' engine names');for(const name of controls)assert(root.getObjectByName(name),e.file+' '+name);const positions=controls.map(name=>root.getObjectByName(name).getWorldPosition(new T.Vector3()).toArray());if(reference)for(let i=0;i<positions.length;i++)assert(new T.Vector3(...positions[i]).distanceTo(new T.Vector3(...reference[i]))<.001,e.file+' anchors');reference=positions;
 for(const socket of e.sockets){const object=root.getObjectByName('SOCKET_'+socket.id);assert(object.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...socket.position_m))<.001,e.file+' socket');assert(new T.Vector3(0,0,1).applyQuaternion(object.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...socket.normal))<.001,e.file+' normal');}
 let triangles=0,draws=0;const materials=new Set();root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draws+=o.geometry.groups.length||1;for(const m of [].concat(o.material))materials.add(m);}});assert.equal(Math.round(triangles),e.triangles);assert.equal(draws,e.draw_calls);assert.equal(materials.size,1);assert.equal(gltf.animations.length,0);const b=new T.Box3().setFromObject(root,true),size=b.getSize(new T.Vector3());assert(b.min.y>=-.001&&b.min.x>=-4&&b.max.x<=4&&b.min.z>=-2.5&&b.max.z<=2.5,e.file+' plot');for(let i=0;i<3;i++)assert(Math.abs(size.toArray()[i]-e.bounds.dimensions_m[i])<.001,e.file+' bounds');
 const packed=await fs.readFile(new URL(e.meshopt_file,dir));assert.equal(packed.length,e.meshopt_bytes);assert.equal(crypto.createHash('sha256').update(packed).digest('hex'),e.meshopt_sha256);const decoded=await io.read(fileURLToPath(new URL(e.meshopt_file,dir)));assert(decoded.getRoot().listMeshes().length>0,e.file+' decoded');
 if(e.lod<2){assert(e.triangles<=8000&&e.draw_calls<=10&&e.bytes<=400000,e.file+' budget');const live=attachRivalryDisplay(T,gltf.scene,e,{kills:0,gathered:900,used:0},{label:'ISAO'});assert.equal(live.digitMesh.count>0,true);const blankCount=live.digitMesh.count;if(variant==='beacon_rivalry')assert.equal(blankCount,35,'blank leading slots must contain no segments');assert.equal(live.setLabel('very long player name 999'),'VERY LONG PLAYER N');assert.equal(live.setRowLabels(['KILLS','GATHERED','USED']).length,3);live.setColor(0xd0aa55);assert.equal(live.setScores({kills:1},{duration:2}).kills,1);assert.equal(live.update(.25).transitioning,true);assert.equal(live.update(2).transitioning,false);assert.equal(live.scores.kills,1);assert.equal(live.setScores({kills:9999999},{duration:0}).kills,999999);assert.equal(live.celebrate(2),2);if(variant==='beacon_rivalry')assert.equal(live.digitMesh.count,126,'celebration lights all 18 digits');assert.equal(live.update(.2).celebrating,true);assert.equal(live.update(2).celebrating,false);live.dispose();assert.equal(root.getObjectByName('RIVALRY_LIVE_DIGITS'),undefined);if(variant==='flipdot_rivalry'){const zeros=attachRivalryDisplay(T,gltf.scene,e,[0,0,0],{blankLeading:false});assert(zeros.digitMesh.count>blankCount);zeros.dispose();}}
 else{assert(e.triangles<=3000&&e.draw_calls===1&&e.bytes<=250000,e.file+' distance budget');assert.equal(root.getObjectByName('RIVALRY_DISTANCE_GEOMETRY')!==undefined,true);assert.throws(()=>attachRivalryDisplay(T,gltf.scene,e));}
 console.log('PASS',e.file,e.triangles,'triangles',e.draw_calls,'draws',e.bytes,'bytes; decoded Meshopt');
 }
}
console.log('PASS rivalry scoreboards: 9 new exports, three score rows, transitions, labels, colors, celebration, sockets and original preservation.');
