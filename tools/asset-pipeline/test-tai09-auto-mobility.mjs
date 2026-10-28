import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {TAIController,TARGETS,PRESETS,AUTO_MOBILITY,STAND_HEIGHT,createRig,rotateVector} from '../../assets/tai09/runtime.js';
const dt=1/120,advance=(c,n,input={})=>{for(let i=0;i<Math.round(n/dt);i++)c.step(dt,input);};
const reports=[],floorPoses=[];
for(const [preset,tuning] of Object.entries(PRESETS)){
 const c=new TAIController(tuning);c.setMode('gecko');let crossing=null,folded=null;
 for(let i=0;i<480;i++){
  const before=c.mode,oldSpeed=c.speed;c.step(dt,{back:true});
  if(before==='gecko'&&c.mode==='roll'){crossing={speed:c.speed,time:c.time,oldSpeed};assert(oldSpeed<5&&c.speed>=5&&c.speed<5.05);assert.equal(c.deploy,1,'transition begins without snapping the limbs');}
  if(c.mode==='gecko')assert(c.speed<5);
  if(crossing&&c.deploy===0&&!folded){folded={speed:c.speed,time:c.time};assert(c.speed>crossing.speed,'fold preserves momentum and acceleration');}
  if(preset==='torque'&&crossing&&c.deploy>0&&c.deploy<1&&i%2===0)floorPoses.push({center:[...c.center],orientation:[...c.orientation],eyeOrientation:[...c.eyeOrientation],deploy:c.deploy,height:c.height,phase:c.phase,speed:c.speed});
 }
 assert(crossing&&folded&&folded.time-crossing.time<.87);assert.equal(c.mode,'roll');assert.equal(c.deploy,0);
 const q=[...c.shellRotation];advance(c,.1);assert(Math.abs(q.reduce((s,v,i)=>s+v*c.shellRotation[i],0))<.999,'closed shell really rotates');
 reports.push({preset,ground_transition:crossing,fully_folded:folded});
}
const below=new TAIController();below.setMode('gecko');below.deploy=1;below.velocity=[4.9,0,0];below.step(dt);assert.equal(below.mode,'gecko');
for(const surface of ['wall','ceiling']){const c=new TAIController();c.mode='gecko';c.deploy=1;c.surface=surface;c.center=surface==='wall'?[0,10,c.wall+STAND_HEIGHT]:[0,c.roof-STAND_HEIGHT,-30];advance(c,3,{right:true});assert.equal(c.surface,surface);assert.equal(c.mode,'gecko');assert.equal(c.deploy,1);}
const flights=[];
for(const id of ['sky_06','sky_11','sky_16','wall_18','ceiling_24']){
 const c=new TAIController();c.setMode('gecko');advance(c,1.2);const t=TARGETS.find(t=>t.id===id);assert(c.attach(t.point,t.normal,t.kind));let firstFold=null,fullyStowed=false,releaseAge=null,priorAge=0,precontact=null;
 for(let i=0;i<2000&&!c.lastLanding;i++){
  const hadHook=!!c.grapple;precontact={deploy:c.deploy,orientation:[...c.orientation]};c.step(dt);
  if(c.air){assert(c.airTime>=priorAge,'continuous airtime across release');priorAge=c.airTime;if(c.airTime<=2)assert(c.deploy>.999,'no early retraction');}
  if(hadHook&&!c.grapple&&c.air)releaseAge=c.airTime;
  if(c.air&&c.deploy<.999&&!firstFold){firstFold={airtime:c.airTime,contact_time:c.flight.contactTime};assert(c.airTime>2&&c.flight.contactTime>2);}
  if(c.air&&c.deploy<.001)fullyStowed=true;
 }
 assert(c.lastLanding);assert(c.lastLanding.deploy>.999&&precontact.deploy>.999,'feet are out BEFORE contact');
 const normal=t.kind==='wall'?[0,0,1]:t.kind==='ceiling'?[0,-1,0]:[0,1,0];assert(rotateVector([0,1,0],precontact.orientation).reduce((s,v,i)=>s+v*normal[i],0)>.999);
 if(t.kind==='sky'){assert(firstFold&&fullyStowed&&releaseAge!==null);assert(firstFold.airtime<2.02);}else assert.equal(firstFold,null,'near fixture arrival keeps feet deployed');
 assert.equal(c.airTime,0);flights.push({id,first_fold:firstFold,fully_stowed:fullyStowed,release_airtime:releaseAge,landing:c.lastLanding.surface});
}
// >2 s airborne is insufficient by itself: a 30 m drop is already preparing to land.
const shortDrop=new TAIController();shortDrop.mode='gecko';shortDrop.deploy=1;shortDrop.center=[0,30,50];shortDrop.beginFlight();let exceededTwo=false;for(let i=0;i<1000&&!shortDrop.lastLanding;i++){shortDrop.step(dt);exceededTwo||=shortDrop.airTime>2;assert(shortDrop.deploy>.999);}assert(exceededTwo&&shortDrop.lastLanding);
// A release while the feet are folding must immediately obey the new ground ETA.
const redirected=new TAIController();redirected.mode='gecko';redirected.deploy=1;redirected.center=[0,100,50];redirected.beginFlight();advance(redirected,2.25);assert(redirected.deploy<.7);redirected.center[1]=7;redirected.velocity=[0,-4,0];redirected.beginFlight();assert(redirected.airTime>2);let readyBeforeImpact=0;for(let i=0;i<500&&!redirected.lastLanding;i++){readyBeforeImpact=redirected.deploy;redirected.step(dt);}assert(redirected.lastLanding&&readyBeforeImpact>.999,'shortened landing plan interrupts stow');
// Verify real loaded vertices throughout the moving ground fold, at both animated tiers.
const out=new URL('../../assets/tai09/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));let minClearance=Infinity,geometrySamples=0;
for(const e of manifest.assets.filter(e=>!e.static)){
 const bytes=await fs.readFile(new URL(e.file,out)),g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const carrier=new T.Group();carrier.add(g.scene);g.scene.position.y=-.8;const rig=createRig(g.scene,T);
 for(const pose of floorPoses){carrier.position.fromArray(pose.center);carrier.quaternion.fromArray(pose.orientation);rig.pose({deploy:pose.deploy,height:pose.height,phase:pose.phase,stride:1,direction:[0,1],eyeQuaternion:pose.eyeOrientation});carrier.updateMatrixWorld(true);g.scene.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();for(const i of new Set(m.geometry.index.array))minClearance=Math.min(minClearance,m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld).y);});geometrySamples++;}
}
assert(minClearance>-.001,'no ground clipping during automatic folding');
const result={status:'passed',policy:AUTO_MOBILITY,ground_profiles:reports,flights,checks:['below-threshold gecko stance','5 m/s automatic floor fold without lost speed','shell rolling after folding','wall and ceiling adhesion retained','continuous airtime across sky-ring release','retract after 2 seconds with sufficient landing time','imminent landings keep feet deployed','changed landing plan interrupts retraction','feet deployed and aligned before impact','actual detailed/game geometry through moving folds'],moving_fold_geometry_samples:geometrySamples,minimum_moving_fold_clearance_m:minClearance};await fs.writeFile(new URL('auto-mobility-validation.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,profiles:reports.length,flights:flights.length,geometrySamples,minClearance}));
