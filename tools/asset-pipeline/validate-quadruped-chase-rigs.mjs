import fs from 'node:fs/promises';import assert from 'node:assert/strict';import crypto from 'node:crypto';import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ChaseSimulation,STEP,track,OBSTACLES,TRACK_LENGTH} from '../../quadruped-playground/simulation.js';
const code=(await fs.readFile(new URL('../../quadruped-playground/actor.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(import.meta.resolve('three')));
const {ChaseActor}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const folder=new URL('../../quadruped-playground/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',folder)));
const results=[];
for(const lod of [1,0]){
 const entries=['reckon-k9','mechanical-cheetah'].map(f=>manifest.assets.find(e=>e.lod===lod&&e.family===f)),actors=[];
 for(const e of entries){const data=await fs.readFile(new URL('../../'+e.file,import.meta.url));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),e.sha256);assert.equal(data.length,e.bytes);actors.push(new ChaseActor(await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),''),e));}
 const clips={k9:entries[0].clips,cheetah:entries[1].clips},sim=new ChaseSimulation({seed:27,clips});
 let floor=Infinity,obstacleClearance=Infinity,checkedVertices=0,maxSegmentError=0,minSole=Infinity,poses=0,collisionPoints=0;
 const pairs=actors.map(a=>{a.holder.updateMatrixWorld(true);return ['FL','FR','HL','HR'].flatMap(id=>{const chain=['UPPER_'+id,'LOWER_'+id,...(a.nodes['ANKLE_'+id]?['ANKLE_'+id]:a.nodes['HOCK_'+id]?['HOCK_'+id]:[]),'PAW_'+id];return chain.slice(1).map((n,i)=>({a:a.nodes[chain[i]],b:a.nodes[n],length:a.nodes[n].getWorldPosition(new T.Vector3()).distanceTo(a.nodes[chain[i]].getWorldPosition(new T.Vector3()))}));});});
 for(let f=0;f<32/STEP;f++){
  sim.step(STEP);actors.forEach((a,i)=>a.pose(sim.actors[i],STEP));
  if(f%4)continue;
  for(let i=0;i<2;i++){
   const a=actors[i],state=sim.actors[i];poses++;
   for(const id of ['FL','FR','HL','HR'])minSole=Math.min(minSole,a.nodes['SOCKET_PAW_'+id].getWorldPosition(new T.Vector3()).y);
   for(const p of pairs[i])maxSegmentError=Math.max(maxSegmentError,Math.abs(p.a.getWorldPosition(new T.Vector3()).distanceTo(p.b.getWorldPosition(new T.Vector3()))-p.length));
   if(state.jump||f%24===0){
    const box=new T.Box3().setFromObject(a.holder,true);floor=Math.min(floor,box.min.y);
    if(state.jump){
     const hurdle=OBSTACLES.find(o=>Math.abs(((state.jump.obstacle-o.s)%TRACK_LENGTH+TRACK_LENGTH)%TRACK_LENGTH)<1e-5),centre=track(state.jump.obstacle),point=new T.Vector3();
     a.gltf.scene.traverse(o=>{if(!o.isMesh)return;for(let j=0;j<o.geometry.attributes.position.count;j++){
      o.getVertexPosition(j,point);point.applyMatrix4(o.matrixWorld);const dx=point.x-centre.x,dz=point.z-centre.z,forward=dx*centre.dx+dz*centre.dz,side=dx*centre.dz-dz*centre.dx;
      // Expanded slab covers the rail and sampling travel between adjacent poses.
      if(Math.abs(forward)<hurdle.depth/2+.13&&Math.abs(side)<hurdle.width/2){obstacleClearance=Math.min(obstacleClearance,point.y-hurdle.height);checkedVertices++;if(point.y<hurdle.height)collisionPoints++;}
     }});
    }
   }
  }
 }
 const r={lod,seconds:sim.time,sampled_rig_poses:poses,minimum_geometry_y_m:floor,minimum_paw_y_m:minSole,minimum_expanded_hurdle_clearance_m:obstacleClearance,vertices_in_hurdle_slab:checkedVertices,collision_points:collisionPoints,maximum_segment_error_m:maxSegmentError,jumps:sim.actors.map(a=>a.jumps),maximum_foot_anchor_error_m:Math.max(...actors.map(a=>a.maxCorrection)),released_unreachable_anchors:actors.map(a=>a.releasedAnchors)};results.push(r);console.log(r);
 assert(checkedVertices>100);assert(obstacleClearance>.015,'hurdle collision');assert(floor>-.008,'floor penetration');assert(maxSegmentError<.0015,'rigid segment length changed');assert(sim.actors.every(a=>a.jumps>=3));
 actors.forEach(a=>a.dispose());
}
const code_hashes={};for(const file of ['actor.js','simulation.js','manifest.json'])code_hashes[file]=crypto.createHash('sha256').update(await fs.readFile(new URL(file,folder))).digest('hex');
await fs.writeFile(new URL('rig-validation.json',folder),JSON.stringify({status:'passed',scope:'Actual plain GLBs in both articulated tiers; source SHA-256, source-clip blending and locomotion corrections, sampled full geometry and expanded hurdle slabs. Not a rigid-body or arbitrary-environment collision simulation.',code_hashes,asset_hashes:manifest.assets.map(({file,sha256})=>({file,sha256})),results},null,2)+'\n');
