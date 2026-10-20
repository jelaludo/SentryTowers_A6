import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dequantize} from '@gltf-transform/functions';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';
import {applyXB12,WHEELS} from '../../assets/xb12/runtime.js';
const out=new URL('../../assets/xb12/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const report={assets:[],pose_samples:0,damper_length_m:[Infinity,-Infinity],minimum_rod_overlap_m:Infinity,errors:[],scope:'glTF, decoded Meshopt, geometry, hashes, node/socket parity and sampled rig kinematics; not full continuous collision or physics certification'};
let names0,sockets0;
for(const entry of manifest.assets)for(const compressed of [false,true]){
 const file=compressed?entry.meshopt_file:entry.file,bytes=await fs.readFile(new URL(file,out));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),compressed?entry.meshopt_sha256:entry.sha256);
 let decoded=bytes;if(compressed){const doc=await io.readBinary(bytes);for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();await doc.transform(dequantize());decoded=await io.writeBinary(doc);}
 const v=await validator.validateBytes(decoded);assert.equal(v.issues.numErrors,0,JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,JSON.stringify(v.issues));
 const {scene:root}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');root.userData.static=entry.static;root.updateMatrixWorld(true);
 const names=[],sockets={};let triangles=0,draws=0;
 root.traverse(o=>{if(o.name)names.push(o.name);if(o.name.startsWith('SOCKET_'))sockets[o.name]=o.getWorldPosition(new T.Vector3());if(o.isMesh){draws++;const g=o.geometry,p=g.attributes.position,idx=g.index,n=idx?.count||p.count;triangles+=n/3;for(let i=0;i<n;i+=3){const vs=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+k):i+k));assert(vs[1].sub(vs[0]).cross(vs[2].sub(vs[0])).lengthSq()>1e-18,`degenerate ${file}`);}}});
 assert.equal(new Set(names).size,names.length);assert(names.every(n=>!n.includes('.')));for(const name of entry.required_nodes)assert(names.includes(name));assert.equal(triangles,entry.triangles);assert.equal(draws,entry.draw_calls);
 const common=names.filter(n=>!['AuxScene','XB12_STATIC'].includes(n)).sort();if(names0)assert.deepEqual(common,names0);else names0=common;
 if(sockets0)for(const key of Object.keys(sockets))assert(sockets[key].distanceTo(sockets0[key])<.002);else sockets0=sockets;
 if(!entry.static){for(const travel of [-.12,-.06,0,.07,.14])for(const steerDeg of [-30,0,30]){
  applyXB12(root,{compression:Object.fromEntries(WHEELS.map(id=>[id,travel])),steerDeg,spinRad:1.3,sensorYaw:.4});report.pose_samples++;
  for(const id of WHEELS){
   const top=root.getObjectByName('SOCKET_DAMPER_UPPER_'+id).getWorldPosition(new T.Vector3()),bottom=root.getObjectByName('SOCKET_DAMPER_LOWER_'+id).getWorldPosition(new T.Vector3()),rod=root.getObjectByName('DAMPER_ROD_'+id).getWorldPosition(new T.Vector3()),aim=root.getObjectByName('DAMPER_AIM_'+id),hub=root.getObjectByName('UPRIGHT_'+id).getWorldPosition(new T.Vector3());
   assert(bottom.distanceTo(rod)<.002,`rod attachment ${file}`);assert(top.distanceTo(aim.getWorldPosition(new T.Vector3()))<.002);assert(Math.abs(hub.y-(.5+travel))<.002);const len=top.distanceTo(bottom);report.damper_length_m[0]=Math.min(report.damper_length_m[0],len);report.damper_length_m[1]=Math.max(report.damper_length_m[1],len);report.minimum_rod_overlap_m=Math.min(report.minimum_rod_overlap_m,.88-len);assert(len>.44&&len<.84,'damper overlap/stroke');
  }
  root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
 }}else{const before=root.getObjectByName('XB12_STATIC').matrixWorld.clone();applyXB12(root,{compression:{FL:.14},steerDeg:30});assert.deepEqual(root.getObjectByName('XB12_STATIC').matrixWorld,before);assert.equal(draws,1);}
 report.assets.push({file,triangles,draws,bytes:bytes.length,gltf_errors:v.issues.numErrors,gltf_warnings:v.issues.numWarnings});
}
assert(manifest.assets.find(e=>e.lod===1).triangles<=25000);assert(manifest.assets.find(e=>e.lod===2).triangles<=3000);
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
