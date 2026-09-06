import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
const directory=new URL('../../assets/research-outpost/',import.meta.url);
const {assets}=JSON.parse(fs.readFileSync(new URL('manifest.json',directory)));
assert.equal(assets.length,48);
const families=new Map(),loader=new GLTFLoader();let bytes=0,triangles=0;
for(const entry of assets){
 const buf=fs.readFileSync(new URL(entry.file,directory));
 const result=await validator.validateBytes(buf,{maxIssues:20});
 assert.equal(result.issues.numErrors,0,`${entry.id}: ${JSON.stringify(result.issues.messages)}`);
 const gltf=await loader.parseAsync(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');
 gltf.scene.updateMatrixWorld(true);
 const nodes=[];gltf.scene.traverse(o=>nodes.push(o));
 assert(nodes.some(o=>o.userData.asset_id===entry.id),'Missing asset identity');
 for(const s of entry.sockets){
  const node=nodes.find(o=>o.name.split('.')[0]==='SOCKET_'+s.id);
  assert(node,`${entry.id}: missing ${s.id}`);
  assert(node.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<1e-4,`${entry.id}: socket position`);
  assert(new T.Vector3(0,0,1).applyQuaternion(node.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...s.normal))<1e-4,`${entry.id}: socket normal`);
 }
 const bounds=new T.Box3();gltf.scene.traverse(o=>{if(o.isMesh)bounds.union(new T.Box3().setFromObject(o));});
 assert(bounds.min.x>=-entry.plot_m[0]/2-.05 && bounds.max.x<=entry.plot_m[0]/2+.05,`${entry.id}: X plot overflow ${bounds.min.x} ${bounds.max.x}`);
 assert(bounds.min.z>=-entry.plot_m[1]/2-.05 && bounds.max.z<=entry.plot_m[1]/2+.05,`${entry.id}: Z plot overflow ${bounds.min.z} ${bounds.max.z}`);
 assert.equal(buf.length,entry.bytes);assert(entry.triangles>0);
 if(entry.damage_level>=2)assert(entry.sockets.every(s=>!s.available),'Damaged service availability');
 if(!families.has(entry.family))families.set(entry.family,[]);families.get(entry.family).push(entry);
 bytes+=buf.length;triangles+=entry.triangles;
 console.log('PASS',entry.id,entry.triangles,'triangles',result.issues.numWarnings,'warnings');
}
for(const [family,states] of families){assert.deepEqual(states.map(s=>s.damage_level),[0,1,2,3]);assert.notEqual(states[3].triangles,states[0].triangles,`${family}: destruction geometry must differ`);for(const s of states)assert.deepEqual(s.plot_m,states[0].plot_m);}
console.log(`PASS: ${families.size} families / ${assets.length} GLBs; format, plot bounds, socket transforms, destruction metadata; ${(bytes/1048576).toFixed(2)} MB; ${triangles} triangles.`);
