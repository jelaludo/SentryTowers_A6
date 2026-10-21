import fs from 'node:fs/promises';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'meshoptimizer';
import {applyMech,applyAirdrop,solveHydraulics,dropState,LEGS} from '../../assets/ridgeback-mech/runtime.js';
await MeshoptDecoder.ready;const out=new URL('../../assets/ridgeback-mech/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
const report={drop_pose_samples:0,decoded_clip_samples:0,clearance_samples:0,min_piston_overlap_m:10,max_clip_foot_error_m:0,errors:[],scope:'Sampled level-ground deployment, conservative gun/pod AABB clearance and forward missile rays; not terrain physics or full articulated collision'};
const wp=(root,n)=>root.getObjectByName(n).getWorldPosition(new T.Vector3());
for(const e of manifest.assets.filter(e=>e.lod<2&&e.damage_level<3))for(const compressed of [false,true]){
 const b=await fs.readFile(new URL(compressed?e.meshopt_file:e.file,out));const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const root=gltf.scene;
 const clip=gltf.animations.find(c=>c.name==='Airdrop_Land');assert(clip);assert.equal(clip.duration,7);assert(clip.tracks.every(t=>!/^(MINIGUN|LASER|MISSILE|SENSOR)/.test(t.name)),'weapon aim baked');
 for(let i=0;i<=420;i++){
  const t=i/60,state=applyAirdrop(root,t);report.drop_pose_samples++;
  assert(state.height>=0);for(const leg of LEGS){const foot=wp(root,'SOCKET_FOOT_'+leg.id);const expected=new T.Vector3(leg.fx-leg.side*state.tuck,state.height+state.tuck,leg.fz);assert(foot.distanceTo(expected)<.002,'drop IK error '+foot.distanceTo(expected));for(let k=1;k<=3;k++)assert(wp(root,`SOCKET_CLAW_${leg.id}_${k}`).y>=-.002,'ground penetration');
   const a=wp(root,'SOCKET_HYDRAULIC_UPPER_'+leg.id),b=wp(root,'SOCKET_HYDRAULIC_LOWER_'+leg.id),len=a.distanceTo(b);assert(len>.54&&len<1.04,'drop piston bottomed '+len);report.min_piston_overlap_m=Math.min(report.min_piston_overlap_m,1.08-len);assert(b.distanceTo(wp(root,'PISTON_SLIDE_'+leg.id))<.002);
  }
 }
 const mixer=new T.AnimationMixer(root),action=mixer.clipAction(clip).setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
 for(let i=0;i<=140;i++){
  const t=Math.min(7,(i+.22)/20);applyAirdrop(root,t);const expected=LEGS.map(l=>wp(root,'SOCKET_FOOT_'+l.id));action.paused=false;mixer.setTime(t);root.updateMatrixWorld(true);report.decoded_clip_samples++;
  for(const [j,l] of LEGS.entries()){const err=expected[j].distanceTo(wp(root,'SOCKET_FOOT_'+l.id));report.max_clip_foot_error_m=Math.max(report.max_clip_foot_error_m,err);assert(err<.005,'drop baked drift '+err);}solveHydraulics(root);
 }
 mixer.stopAllAction();applyAirdrop(root,7);const end=LEGS.map(l=>wp(root,'SOCKET_FOOT_'+l.id));applyMech(root,0,{mode:'park'});for(const [i,l] of LEGS.entries())assert(end[i].distanceTo(wp(root,'SOCKET_FOOT_'+l.id))<1e-6,'drop/park transition');
 // Healthy authored geometry: conservative AABBs must be disjoint through supported aiming commands.
 if(e.damage_level===0&&!compressed){for(let y=-36;y<=36;y+=3)for(let p=-6;p<=31;p+=3){
  applyMech(root,0,{mode:'park',aimYaw:y*Math.PI/180,aimPitch:p*Math.PI/180});const guns=['MINIGUN_RECEIVER','MINIGUN_BARRELS','LASER_CANNON'].map(n=>new T.Box3().setFromObject(root.getObjectByName(n)));
  for(const side of ['L','R']){const box=new T.Box3().setFromObject(root.getObjectByName('MISSILE_POD_'+side));for(const g of guns)assert(!box.intersectsBox(g),'gun/pod overlap '+JSON.stringify({y,p,side,lod:e.lod}));
   for(let k=1;k<=6;k++){const socket=root.getObjectByName(`SOCKET_MISSILE_${side}_${k}`),origin=wp(root,socket.name),dir=new T.Vector3(0,0,1).transformDirection(socket.matrixWorld),ray=new T.Ray(origin,dir);for(const g of guns)assert(!ray.intersectsBox(g),'missile path crosses gun');}
  }report.clearance_samples++;
 }}
}
assert.equal(dropState(.6).height,6);assert.equal(dropState(2.6).height,0);assert(Math.abs(dropState(2.82).compression-.64)<1e-6);assert.equal(dropState(7).compression,0);assert.equal(dropState(7).jet,0);
for(const t of [.6,1.6,2.6,2.82,3.37]){const a=dropState(t-1e-5),b=dropState(t+1e-5);assert(Math.abs((a.height-a.compression)-(b.height-b.compression))<.001,'trajectory discontinuity');}
await fs.writeFile(new URL('airdrop-validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(report);
