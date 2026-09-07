import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
const dir=new URL('../../assets/warehouse-props/',import.meta.url);
const {assets}=JSON.parse(fs.readFileSync(new URL('manifest.json',dir))); assert.equal(assets.length,24); let bytes=0;
for(const e of assets){
 const data=fs.readFileSync(new URL(e.file,dir)); const report=await validator.validateBytes(data,{maxIssues:20}); assert.equal(report.issues.numErrors,0,e.id);
 const g=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),''); const root=g.scene; root.updateMatrixWorld(true); assert(root.getObjectByName('ROOT'));
 for(const s of e.sockets){const n=root.getObjectByName('SOCKET_'+s.id);assert(n,e.id+' socket');assert(n.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...s.position_m))<1e-4);assert(new T.Vector3(0,0,1).applyQuaternion(n.getWorldQuaternion(new T.Quaternion())).distanceTo(new T.Vector3(...s.normal))<1e-4);}
 const bounds=new T.Box3().setFromObject(root,true);assert(bounds.min.x>=-e.plot_m[0]/2-.05&&bounds.max.x<=e.plot_m[0]/2+.05,e.id+' x overflow');assert(bounds.min.z>=-e.plot_m[1]/2-.05&&bounds.max.z<=e.plot_m[1]/2+.05,e.id+' z overflow');
 const names=[];root.traverse(o=>names.push(o.name.toLowerCase()));
 if(e.damage_level===3){assert(names.some(n=>n.includes('bent')||n.includes('crushed')||n.includes('collapsed')||n.includes('fallen')||n.includes('detached')),e.id+' generic D3');}
 if(e.family==='warehouse_scene'){assert.equal(e.placements.length,6);assert.equal(new Set(e.placements.map(p=>p.family)).size,5);assert(!names.some(n=>n.includes('skylight')||n.includes('shelf_cargo_crate')),'no floating proxy cargo or overhead skylight');for(const p of e.placements){let instance;root.traverse(o=>{if(o.userData.placement_id===p.id)instance=o;});assert(instance,'reused '+p.family);const box=new T.Box3().setFromObject(instance,true);assert(Math.abs(box.min.y-p.support_height_m)<.001,p.id+' must rest on its support');}if(e.damage_level===0)assert(names.some(n=>n.includes('full_depth_shelf_deck')),'proper shelf support');}
 bytes+=data.length;console.log('PASS',e.id,e.triangles,'triangles',report.issues.numWarnings,'warnings');
}
for(const family of new Set(assets.map(e=>e.family))){const states=assets.filter(e=>e.family===family).sort((a,b)=>a.damage_level-b.damage_level);assert.deepEqual(states.map(e=>e.damage_level),[0,1,2,3]);assert(states.every(e=>e.plot_m.join()==states[0].plot_m.join()));}
console.log(`PASS: 24 warehouse GLBs; sockets, plots, D3 identifiable wreckage and warehouse elements; ${(bytes/1048576).toFixed(2)} MiB.`);
