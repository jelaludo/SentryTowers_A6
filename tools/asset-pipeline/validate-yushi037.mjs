import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';
import {fillHeight,createYushiController} from '../../assets/yushi037/runtime.js';

const directory=new URL('../../assets/yushi037/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',directory)));
await MeshoptDecoder.ready;const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.deepEqual(manifest.supported_damage_levels,[0]);assert.equal(manifest.plain_glb_source_of_truth,true);
let baseline=null,baselineBounds=null;
for(const entry of manifest.assets){
 let plainBounds;
 for(const compressed of [false,true]){
  const file=compressed?entry.meshopt_file:entry.file,bytes=fs.readFileSync(new URL(file,directory));assert.equal(bytes.length,compressed?entry.meshopt_bytes:entry.bytes);assert.equal(sha(bytes),compressed?entry.meshopt_sha256:entry.sha256);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));if(!compressed)assert.equal(json.buffers.length,1);assert(json.buffers.every(buffer=>buffer.uri===undefined));assert.equal(json.images?.length||0,0);
  if(!compressed){const report=await validator.validateBytes(bytes);assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));}
  else assert(json.extensionsRequired.includes('EXT_meshopt_compression'));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),root=gltf.scene;root.updateMatrixWorld(true);
  assert.equal(gltf.animations.length,0,'Capacity and valve remain engine-driven');
  let triangles=0,draws=0,transparent=0;const names=[],lookup={},roles=new Set();
  root.traverse(o=>{if(o.name)names.push(o.name);if(!o.isMesh)return;assert(!o.isSkinnedMesh);draws++;const g=o.geometry,n=g.index?.count||g.attributes.position.count;triangles+=n/3;assert(g.attributes._yushi,'Custom fill attribute survives export/decoding');
   for(let i=0;i<g.attributes._yushi.count;i++){const role=Math.round(g.attributes._yushi.getX(i));assert([0,1,2].includes(role));roles.add(role);}
   for(const m of [].concat(o.material)){if(m.transparent)transparent++;assert(!m.map);}
   const p=g.attributes.position,ix=g.index,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let i=0;i<n;i+=3){const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j);a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-15,file+' degenerate triangle');}
  });
  assert.equal(new Set(names).size,names.length);assert(names.every(n=>!n.includes('.')));for(const name of entry.required_nodes){const node=root.getObjectByName(name);assert(node,name);lookup[name]=node.getWorldPosition(new T.Vector3()).toArray();}
  assert.equal(triangles,entry.triangles);assert.equal(draws,entry.draw_calls);assert.equal(transparent,entry.lod===2?0:1);assert.deepEqual([...roles].sort(),[0,1,2]);
  for(const socket of entry.sockets){const node=root.getObjectByName(socket.node);assert(node.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...socket.position_m))<.003);assert(new T.Vector3(0,0,1).applyQuaternion(node.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...socket.normal))<.003);}
  if(!baseline)baseline=lookup;else for(const name of entry.required_nodes)assert(new T.Vector3(...lookup[name]).distanceTo(new T.Vector3(...baseline[name]))<.003,name+' parity');
  const bounds=new T.Box3().setFromObject(root);assert(Math.abs(bounds.min.y)<.002,'feet on ground');assert(bounds.max.y<1.95&&bounds.max.y>1.94);assert(bounds.min.x>=-2.2&&bounds.max.x<=2.2&&bounds.min.z>=-2.2&&bounds.max.z<=2.2);
  if(!compressed){plainBounds=bounds;if(!baselineBounds)baselineBounds=bounds.clone();assert(bounds.min.distanceTo(baselineBounds.min)<.0001);assert(bounds.max.distanceTo(baselineBounds.max)<.0001);assert.equal(root.getObjectByName('ROOT').userData.designation,'Yūshi037');}
  else{assert(bounds.min.distanceTo(plainBounds.min)<.006);assert(bounds.max.distanceTo(plainBounds.max)<.006);}
  const controller=createYushiController(T,root);
  for(const f of [0,.01,.1,.25,.5,.75,.9,.99,1]){controller.setFill(f);const t=controller.height;assert(Math.abs(1.5*t-.5*t*t*t-f)<1e-7);assert.equal(controller.fill,f);for(const state of manifest.operation_states){controller.setState(state);controller.update(4.5);const valve=root.getObjectByName('DISPENSE_VALVE');assert.equal(valve.rotation.z,entry.lod===2?0:state==='dispensing'?Math.PI/2:0);}}
  controller.setFill(-1);assert.equal(controller.fill,0);controller.setFill(2);assert.equal(controller.fill,1);assert.throws(()=>controller.setFill(NaN));controller.setGlass(false);assert(!root.getObjectByName('YUSHI_GLASS').isMesh||!root.getObjectByName('YUSHI_GLASS').visible);controller.dispose();
  console.log('PASS',file,triangles,'triangles',draws,'draws');
 }
 if(entry.lod>0){const budget=manifest.budgets['lod'+entry.lod];assert(entry.triangles<=budget.triangles_max);assert(entry.draw_calls<=budget.draw_calls_max);assert(entry.bytes<=budget.plain_bytes_max);}
}
assert.equal(fillHeight(0),0);assert.equal(fillHeight(1),1);
console.log('PASS Yūshi037 names, geometry, sockets, decoded compression, capacity-volume mapping, LOD-independent fill, valve controls and budgets.');
