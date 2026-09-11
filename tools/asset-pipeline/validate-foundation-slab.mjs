import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import validator from 'gltf-validator';
const dir=new URL('../../assets/base-kit-game/',import.meta.url),bytes=fs.readFileSync(new URL('foundation_slab.glb',dir));
const result=await validator.validateBytes(bytes,{maxIssues:30});assert.equal(result.issues.numErrors,0,JSON.stringify(result.issues));assert.equal(result.issues.numWarnings,0);
const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.equal(doc.asset.version,'2.0');assert(!doc.images?.length&&!doc.textures?.length&&!doc.animations?.length);assert(doc.buffers.every(b=>!b.uri));assert(!doc.extensionsRequired?.length);assert(bytes.length<100000);
assert.deepEqual(doc.materials.map(m=>m.name).sort(),['Skirt / carbon','Slab / concrete']);assert.equal(doc.meshes.length,2);for(const m of doc.meshes)assert.equal(m.primitives.length,1);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const root=gltf.scene;root.updateMatrixWorld(true);assert(root.getObjectByName('ROOT'));assert(root.getObjectByName('SUPPORT').getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(0,-1.2,0))<1e-6);
assert(!doc.nodes.some(n=>n.name?.startsWith('SOCKET')));assert.equal(root.getObjectByName('ROOT').userData.credit,'Models by jelaludo');
const mesh=root.getObjectByName('SLAB'),positions=mesh.geometry.attributes.position;let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});assert.equal(triangles,28);
const meta=JSON.parse(fs.readFileSync(new URL('foundation-slab.json',dir)));
for(const p of meta.presets){
 root.scale.fromArray(p.scale);root.position.y=7.25;root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(root,true);assert(Math.abs(box.max.y-7.25)<1e-6,p.name+' top height');assert(Math.abs(box.min.y-6.05)<1e-6,p.name+' skirt depth');assert(Math.abs(box.max.x-box.min.x-p.size_m[0])<1e-5);assert(Math.abs(box.max.z-box.min.z-p.size_m[1])<1e-5);
 for(const x of [-.49,0,.49])for(const z of [-.49,0,.49]){const ray=new T.Raycaster(new T.Vector3(x*p.size_m[0],8,z*p.size_m[1]),new T.Vector3(0,-1,0));const hits=ray.intersectObject(root,true);assert(hits.length);assert(Math.abs(hits[0].point.y-7.25)<1e-6,'non-flat top');}
 console.log('PASS',p.name,p.size_m.join(' × '),'top stays at pad height 7.25 m');
}
const lockPath=new URL('foundation-slab.lock.json',dir);if(fs.existsSync(lockPath)){const lock=JSON.parse(fs.readFileSync(lockPath));assert.equal(lock.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));assert(/^[a-f0-9]{40}$/.test(lock.commit));console.log('PASS checksum lock');}
console.log('PASS',triangles,'triangles;',bytes.length,'bytes; two named materials; self-contained GLB');
