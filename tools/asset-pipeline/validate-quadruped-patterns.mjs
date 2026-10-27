// Independent runtime checks for the observed topology and revised jump events.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'meshoptimizer';
const project=new URL('../../',import.meta.url),baseline=JSON.parse(await fs.readFile(new URL('source/motion-patterns/baseline-2026-10-27-contact-study.json',project)));
const ids=['FL','FR','HL','HR'],results=[];
for(const family of ['reckon-k9','mechanical-cheetah']){
 const out=new URL(`assets/${family}/`,project),m=JSON.parse(await fs.readFile(new URL('manifest.json',out))),base=baseline.families[family];
 for(const e of m.assets){
  const old=base.assets.find(a=>a.lod===e.lod);assert.deepEqual(e.required_nodes,old.required_nodes);assert.deepEqual(e.sockets,old.sockets);assert.equal(e.triangles,old.triangles);assert.equal(e.draw_calls,old.draw_calls);
  for(const c of old.clips){
   const next=e.clips.find(n=>n.name===c.name);assert(next,'existing clip removed');
   const faster=family==='reckon-k9'?['Run_Cycle','Canter_Cycle','Gallop_Cycle','Sprint_Cycle'].includes(c.name):c.name==='Gallop_Cycle';
   if(faster){assert.equal(next.retimed_from_duration_s,c.duration_s);assert(next.duration_s<c.duration_s);assert(next.speed_mps>c.speed_mps);assert(Math.abs(next.speed_mps*next.duration_s-c.speed_mps*c.duration_s)<1e-9,'retiming changed stride distance');}
   else assert.equal(next.duration_s,c.duration_s,'unrequested duration change');
  }
  if(e.static)continue;
  for(const compressed of [false,true]){
   const file=compressed?e.meshopt_file:e.file,bytes=await fs.readFile(new URL(file,out));const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const root=gltf.scene,mixer=new T.AnimationMixer(root);
   let action;const position=n=>root.getObjectByName(n).getWorldPosition(new T.Vector3());
   function use(name){mixer.stopAllAction();const clip=gltf.animations.find(c=>c.name===name);assert(clip,name);action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.reset().play();return e.clips.find(c=>c.name===name);}
   function sample(t){action.enabled=true;action.paused=false;action.time=Math.min(t,action.getClip().duration-1e-7);mixer.update(0);root.updateMatrixWorld(true);return Object.fromEntries(ids.map(id=>[id,position('SOCKET_PAW_'+id)]));}
   const jump=use(family==='reckon-k9'?'Jump':'Pounce');
   const pushTime=(Math.max(jump.release_s.FL,jump.release_s.FR)+Math.min(jump.release_s.HL,jump.release_s.HR))/2;
   const push=sample(pushTime);for(const id of ['FL','FR'])assert(push[id].y>.04,'forepaws must release first');for(const id of ['HL','HR'])assert(Math.abs(push[id].y-.003)<.001,'hind push anchors');
   const landTime=(Math.max(jump.touchdown_s.FL,jump.touchdown_s.FR)+Math.min(jump.touchdown_s.HL,jump.touchdown_s.HR))/2;
   const landing=sample(landTime);for(const id of ['FL','FR'])assert(Math.abs(landing[id].y-.003)<.001,'fore touchdown');for(const id of ['HL','HR'])assert(landing[id].y>.025,'hindquarters must arrive later');
   const apex=sample(jump.phase_landmarks_s.apex);assert(ids.every(id=>apex[id].y>.25),'apex tuck');
   let maxAnchorDrift=0;
   for(const id of ids)for(const [a,b] of [[0,jump.release_s[id]-.012],[jump.touchdown_s[id]+.012,jump.duration_s]]){
    let first;for(let i=0;i<=50;i++){const p=sample(a+(b-a)*i/50)[id];if(!first)first=p;maxAnchorDrift=Math.max(maxAnchorDrift,p.distanceTo(first));}
   }
   assert(maxAnchorDrift<.002,'jump foot slide '+maxAnchorDrift);
   const chestNode='CHEST',hipNode=family==='reckon-k9'?'BODY':'PELVIS',min={chest:{y:Infinity,t:0},hip:{y:Infinity,t:0}};
   for(let i=0;i<=120;i++){const t=jump.touchdown_s.FL+(jump.phase_landmarks_s.absorb+.1-jump.touchdown_s.FL)*i/120;sample(t);for(const [part,node] of [['chest',chestNode],['hip',hipNode]]){const y=position(node).y;if(y<min[part].y)min[part]={y,t};}}
   assert(min.chest.t+.015<min.hip.t,'landing compression must reach hips after chest');
   const r={family,file,jump:jump.name,push_phase_s:pushTime,push_sole_heights_m:Object.fromEntries(ids.map(id=>[id,push[id].y])),landing_phase_s:landTime,landing_sole_heights_m:Object.fromEntries(ids.map(id=>[id,landing[id].y])),apex_sole_heights_m:Object.fromEntries(ids.map(id=>[id,apex[id].y])),maximum_world_anchor_drift_m:maxAnchorDrift,compression_minima:min,retimed_clips:e.clips.filter(c=>c.retimed_from_duration_s).map(c=>({name:c.name,previous_duration_s:c.retimed_from_duration_s,duration_s:c.duration_s,speed_mps:c.speed_mps})),gaits:[]};
   if(family==='reckon-k9'){
    const checks={Run_Cycle:[[.15,['FL','HR']],[.65,['FR','HL']]],Pace_Cycle:[[.15,['FL','HL']],[.65,['FR','HR']]],Canter_Cycle:[[.15,['HL']],[.45,['FL','HR']],[.75,['FR']],[.95,[]]],Gallop_Cycle:[[.45,[]]],Sprint_Cycle:[[.43,[]],[.93,[]]]};
    for(const [name,cases] of Object.entries(checks)){const meta=use(name);for(const [u,expected] of cases){const paws=sample(u*meta.duration_s),actual=ids.filter(id=>paws[id].y<.008);assert.deepEqual(actual.sort(),expected.sort(),name+' contact topology at '+u);r.gaits.push({clip:name,phase:u,grounded:actual});}}
    const walk=use('Walk_Cycle');assert.deepEqual(walk.touchdown_phase,{FL:0,HR:.25,FR:.5,HL:.75});
    for(const [id,u] of Object.entries(walk.touchdown_phase)){const before=sample(((u-.04+1)%1)*walk.duration_s)[id].y,after=sample(((u+.04)%1)*walk.duration_s)[id].y;assert(before>after+.005,'walk touchdown order '+id);}
   }
   results.push(r);console.log('PASS',family,file,'jump anchors',maxAnchorDrift,'compression',min);
  }
 }
}
await fs.writeFile(new URL('source/motion-patterns/runtime-validation.json',project),JSON.stringify({status:'passed',baseline_commit:baseline.commit,scope:'Stable nodes/sockets/geometry budgets; requested gait retiming preserves stride distance and other clip durations; independent contact topology checks, jump release/landing order, apex and world-space paw anchors on both animated tiers and encodings.',results},null,2)+'\n');
