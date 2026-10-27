import fs from 'node:fs/promises';import assert from 'node:assert/strict';import crypto from 'node:crypto';import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ChaseSimulation,ACTORS,STEP,track,OBSTACLES,TRACK_LENGTH,sourceJumpTravel} from '../../quadruped-playground/simulation.js';
const code=(await fs.readFile(new URL('../../quadruped-playground/actor.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(import.meta.resolve('three')));
const {ChaseActor}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const folder=new URL('../../quadruped-playground/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',folder)));
const results=[];
for(const lod of [1,0]){
 const entries=ACTORS.map(p=>manifest.assets.find(e=>e.lod===lod&&e.family===p.family)),actors=[];
 for(const e of entries){const data=await fs.readFile(new URL('../../'+e.file,import.meta.url));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),e.sha256);assert.equal(data.length,e.bytes);actors.push(new ChaseActor(await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),''),e));}
 // The chase cancels baked MOTION before owning world placement. Reconstruct
 // the actual source trajectory exactly, including each rig's airborne component.
 let sourceRootError=0;
 for(const a of actors){
  const meta=a.metadata.clips.find(c=>c.name==='Jump'||c.name==='Pounce'),action=a.actions.get(meta.name);action.reset().setLoop(T.LoopOnce,1).play();action.clampWhenFinished=true;
  for(let f=0;f<=Math.round(meta.duration_s*120);f++){const t=Math.min(f/120,meta.duration_s-1e-7);action.time=t;a.mixer.update(0);a.holder.updateMatrixWorld(true);sourceRootError=Math.max(sourceRootError,Math.abs(a.nodes.MOTION.getWorldPosition(new T.Vector3()).z-sourceJumpTravel(meta,t)));}
  a.reset();
 }
 assert(sourceRootError<.001,'scene/source root trajectory mismatch');
 const clips=Object.fromEntries(ACTORS.map((p,i)=>[p.id,entries[i].clips])),sim=new ChaseSimulation({seed:27,clips});
 let floor=Infinity,obstacleClearance=Infinity,checkedVertices=0,maxSegmentError=0,minSole=Infinity,poses=0,collisionPoints=0;
 const perActor=ACTORS.map(p=>({id:p.id,floor:Infinity,clearance:Infinity,slab_vertices:0}));
 const pairs=actors.map(a=>{a.holder.updateMatrixWorld(true);return ['FL','FR','HL','HR'].flatMap(id=>{const chain=['UPPER_'+id,'LOWER_'+id,...(a.nodes['ANKLE_'+id]?['ANKLE_'+id]:a.nodes['HOCK_'+id]?['HOCK_'+id]:[]),'PAW_'+id];return chain.slice(1).map((n,i)=>({a:a.nodes[chain[i]],b:a.nodes[n],length:a.nodes[n].getWorldPosition(new T.Vector3()).distanceTo(a.nodes[chain[i]].getWorldPosition(new T.Vector3()))}));});});
 for(let f=0;f<32/STEP;f++){
  sim.step(STEP);actors.forEach((a,i)=>a.pose(sim.actors[i],STEP));
  if(f%4)continue;
  for(let i=0;i<actors.length;i++){
   const a=actors[i],state=sim.actors[i];poses++;
   for(const id of ['FL','FR','HL','HR'])minSole=Math.min(minSole,a.nodes['SOCKET_PAW_'+id].getWorldPosition(new T.Vector3()).y);
   for(const p of pairs[i])maxSegmentError=Math.max(maxSegmentError,Math.abs(p.a.getWorldPosition(new T.Vector3()).distanceTo(p.b.getWorldPosition(new T.Vector3()))-p.length));
   if(state.jump||f%24===0){
    const box=new T.Box3().setFromObject(a.holder,true);floor=Math.min(floor,box.min.y);perActor[i].floor=Math.min(perActor[i].floor,box.min.y);
    if(state.jump){
     const hurdle=OBSTACLES.find(o=>Math.abs(((state.jump.obstacle-o.s)%TRACK_LENGTH+TRACK_LENGTH)%TRACK_LENGTH)<1e-5),centre=track(state.jump.obstacle),point=new T.Vector3();
     a.gltf.scene.traverse(o=>{if(!o.isMesh)return;for(let j=0;j<o.geometry.attributes.position.count;j++){
      o.getVertexPosition(j,point);point.applyMatrix4(o.matrixWorld);const dx=point.x-centre.x,dz=point.z-centre.z,forward=dx*centre.dx+dz*centre.dz,side=dx*centre.dz-dz*centre.dx;
      // Expanded slab includes 0.20 m for the faster K0 crossing between adjacent poses.
      if(Math.abs(forward)<hurdle.depth/2+.20&&Math.abs(side)<hurdle.width/2){obstacleClearance=Math.min(obstacleClearance,point.y-hurdle.height);checkedVertices++;perActor[i].slab_vertices++;perActor[i].clearance=Math.min(perActor[i].clearance,point.y-hurdle.height);if(point.y<hurdle.height)collisionPoints++;}
     }});
    }
   }
  }
 }
 const r={lod,per_actor:perActor,seconds:sim.time,sampled_rig_poses:poses,maximum_source_root_profile_error_m:sourceRootError,minimum_geometry_y_m:floor,minimum_paw_y_m:minSole,minimum_expanded_hurdle_clearance_m:obstacleClearance,vertices_in_hurdle_slab:checkedVertices,collision_points:collisionPoints,maximum_segment_error_m:maxSegmentError,jumps:sim.actors.map(a=>a.jumps),maximum_foot_anchor_error_m:Math.max(...actors.map(a=>a.maxCorrection)),released_unreachable_anchors:actors.map(a=>a.releasedAnchors)};results.push(r);console.log(r);
 assert(checkedVertices>100);assert(obstacleClearance>.015,'hurdle collision');assert(floor>-.008,'floor penetration');assert(maxSegmentError<.0015,'rigid segment length changed');assert(sim.actors.every(a=>a.jumps>=3));
 actors.forEach(a=>a.dispose());
}
const code_hashes={};for(const file of ['actor.js','simulation.js','manifest.json'])code_hashes[file]=crypto.createHash('sha256').update(await fs.readFile(new URL(file,folder))).digest('hex');
await fs.writeFile(new URL('rig-validation.json',folder),JSON.stringify({status:'passed',scope:'Actual plain GLBs in both articulated tiers; source SHA-256, source-clip blending and locomotion corrections, sampled full geometry and expanded hurdle slabs. Not a rigid-body or arbitrary-environment collision simulation.',code_hashes,asset_hashes:manifest.assets.map(({file,sha256})=>({file,sha256})),results},null,2)+'\n');
