import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const dir=new URL('../../assets/base-kit-game/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir)));
const original=JSON.parse(fs.readFileSync(new URL('../../assets/base-kit/manifest.json',import.meta.url)));
const budgets={foundation_flat_d0:150,wall_standard_d0:400,wall_standard_d1:750,wall_standard_d2:900,wall_standard_d3:550,wall_corner_d0:550,gate_vehicle_d0:1300};
for(const e of manifest.assets){
 const old=original.assets.find(a=>a.id===e.id);for(const key of ['sockets','colliders','clearance','plot_m','animations'])assert.deepEqual(e[key],old[key],`${e.id} ${key} changed`);
 const b=fs.readFileSync(new URL(e.file,dir));const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 assert.equal(meshes.length,e.id==='gate_vehicle_d0'?5:1);assert.equal(e.materials,1);
 const triangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);assert.equal(triangles,e.triangles);assert(triangles<=budgets[e.id]);
 for(const mesh of meshes){assert(mesh.geometry.attributes.color,'palette missing');assert(mesh.material.vertexColors);assert(!Array.isArray(mesh.material));assert(!mesh.material.transparent);}
 const box=new T.Box3().setFromObject(gltf.scene,true);assert(Number.isFinite(box.min.x));
 if(e.id==='foundation_flat_d0'){assert(Math.abs(box.min.x+2)<1e-5);assert(Math.abs(box.max.x-2)<1e-5);assert(Math.abs(box.min.y+.38)<1e-5);assert(box.max.y<.01);}
 console.log('PASS',e.id,triangles,'triangles;',meshes.length,'draws');
}
const ids=['foundation_flat_d0','wall_standard_d0','wall_corner_d0'];
const triangles=ids.reduce((n,id,i)=>n+manifest.assets.find(e=>e.id===id).triangles*[600,300,100][i],0);
assert.equal(triangles,238400);console.log('PASS: 1,000-module mix =',triangles,'triangles, 3 instanced color-pass draws (excluding shadows/environment)');
