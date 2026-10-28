import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {TAIController,TARGETS,STAND_HEIGHT,ROLL_RADIUS,ARENA,PRESETS,createRig,rotateVector} from '../../assets/tai09/runtime.js';
const out=new URL('../../assets/tai09/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
const step=1/120,advance=(c,s,input={})=>{for(let t=0;t<s-1e-8;t+=step)c.step(step,input);};
const vLength=v=>Math.hypot(...v),distance=(a,b)=>vLength(a.map((v,i)=>v-b[i]));
const c=new TAIController(),speeds=[];
for(let i=0;i<3;i++){advance(c,1,{right:true});speeds.push(c.speed);}assert(speeds[2]>speeds[1]+1&&speeds[1]>speeds[0]+1,'run accumulates speed');
const coastStart=[...c.center],beforeCoast=c.speed;advance(c,.6);assert(distance(coastStart,c.center)>beforeCoast*.45);assert(c.speed>beforeCoast*.65);advance(c,.6,{brake:true});assert(c.speed<.1,'X arrests momentum');
const shots=[];let minimumArrivalAlignment=1,minimumPrecontactAlignment=1,maximumWinchSpeed=0;
for(const [preset,tuning] of Object.entries({...PRESETS,custom_soft:{drive:3,speed:64,winch:30,recoil:.6},custom_hard:{drive:16,speed:24,winch:130,recoil:1.25}}))for(const mode of ['roll','gecko'])for(const t of TARGETS){
 const c=new TAIController(tuning);c.setMode(mode);advance(c,1.2);assert(c.attach(t.point,t.normal,t.kind));let peak=0,pre,earlySpeed=0,laterSpeed=0,earlyForce=0,laterForce=0,bankAngle=0;
 for(let frame=0;frame<2400&&!c.lastLanding;frame++){
  pre={orientation:[...c.orientation],deploy:c.deploy,air:c.air};c.step(step);peak=Math.max(peak,c.center[1]);
  assert([...c.center,...c.velocity,...c.orientation].every(Number.isFinite));assert(c.center[1]>=.79,'no floor tunnelling');
  if(c.grapple?.stage==='pulling'){maximumWinchSpeed=Math.max(maximumWinchSpeed,c.speed);if(c.grapple.pullAge>.2&&!earlyForce){earlyForce=c.grapple.force;earlySpeed=c.speed;}if(c.grapple.pullAge>.5&&!laterForce){laterForce=c.grapple.force;laterSpeed=c.speed;}}
  if(c.air&&c.preparation<.4)bankAngle=Math.max(bankAngle,Math.acos(Math.min(1,rotateVector([0,1,0],c.orientation)[1])));
 }
 assert(c.lastLanding,mode+' '+t.id+' completes');const impact={...c.lastLanding};assert.equal(impact.surface,t.kind==='sky'?'floor':t.kind);assert(impact.alignment>.999&&impact.deploy>.999,'ready at contact');
 const normal=impact.surface==='wall'?[0,0,1]:impact.surface==='ceiling'?[0,-1,0]:[0,1,0];
 const priorUp=rotateVector([0,1,0],pre.orientation),priorAlignment=priorUp.reduce((s,v,i)=>s+v*normal[i],0);
 assert(priorAlignment>.995&&pre.deploy>.99,'aligned BEFORE collision, not snapped on impact');minimumPrecontactAlignment=Math.min(minimumPrecontactAlignment,priorAlignment);minimumArrivalAlignment=Math.min(minimumArrivalAlignment,impact.alignment);
 assert(laterForce>earlyForce+8&&laterSpeed>earlySpeed+2,mode+' '+t.id+' winch ramp '+JSON.stringify({earlyForce,laterForce,earlySpeed,laterSpeed}));
 const contactPoint=[...impact.point];let maxRecoil=0,maxTangentDrift=0;
 for(let i=0;i<210;i++){c.step(step);maxRecoil=Math.max(maxRecoil,c.recoil);const point=c.center.map((v,j)=>v-normal[j]*c.height);maxTangentDrift=Math.max(maxTangentDrift,distance(point,contactPoint));}
 assert(maxRecoil>=.069&&maxRecoil<=.341);assert(c.recoil<.001);assert(maxTangentDrift<.001,'contact held through recoil');
 if(t.kind==='sky')assert(bankAngle>.1,'visible midair righting');
 shots.push({preset,mode,target:t.id,arrival:impact.surface,impact_speed_m_s:impact.impact_speed,peak_height_m:peak,alignment_before_contact:priorAlignment,maximum_recoil_m:maxRecoil,contact_drift_m:maxTangentDrift,early_winch_acceleration:earlyForce,later_winch_acceleration:laterForce,early_speed_m_s:earlySpeed,later_speed_m_s:laterSpeed});
}
assert(maximumWinchSpeed<=64*.85+.001);
// Dropping from a wall or upside-down ceiling must change orientation during the fall.
for(const id of ['wall_18','ceiling_24']){const c=new TAIController(),t=TARGETS.find(t=>t.id===id);c.attach(t.point,t.normal,t.kind);while(!c.lastLanding)c.step(step);advance(c,1.4);const count=c.landingCount;assert(c.release());let changed=false;for(let i=0;i<1200&&c.landingCount===count;i++){c.step(step);if(c.preparation>.2&&c.preparation<.95)changed=true;}assert(c.landingCount>count&&c.lastLanding.surface==='floor');assert(c.lastLanding.alignment>.999);assert(changed,'drop includes timed righting');}
// Jump, slow manual release and near-target launch cannot leave a ball landing on its shell.
for(const releaseTime of [.35,1,2,3]){const c=new TAIController(),t=TARGETS.find(t=>t.id==='wall_18');c.attach(t.point,t.normal,t.kind);advance(c,releaseTime);const before=c.landingCount;c.release();for(let i=0;i<1600&&c.landingCount===before;i++)c.step(step);assert(c.lastLanding?.surface==='floor');assert(c.lastLanding.deploy===1&&c.lastLanding.alignment>.999);}
const jump=new TAIController();assert(jump.jump());advance(jump,2);assert(jump.lastLanding?.surface==='floor'&&jump.lastLanding.alignment>.999);
const climb=new TAIController();climb.setMode('gecko');advance(climb,25,{forward:true});assert.equal(climb.surface,'ceiling');advance(climb,30,{back:true});assert.equal(climb.surface,'floor');
// Actual loaded vertices and sockets through each contact-normal recoil, both animated LODs.
let geometrySamples=0,minMeshClearance=Infinity,maxSocketPlaneError=0;
for(const e of manifest.assets.filter(e=>!e.static)){
 const bytes=await fs.readFile(new URL(e.file,out)),g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const carrier=new T.Group();carrier.add(g.scene);g.scene.position.y=-.8;const rig=createRig(g.scene,T);
 for(const target of [...TARGETS.filter(t=>['wall_18','ceiling_24','sky_16'].includes(t.id)),{kind:'drop',point:[0,22,50]}]){
  const c=new TAIController();if(target.kind==='drop'){c.center=[...target.point];c.mode='gecko';c.deploy=1;c.beginFlight();}else c.attach(target.point,target.normal,target.kind);while(!c.lastLanding)c.step(step);
  const normal=new T.Vector3(...(c.surface==='wall'?[0,0,1]:c.surface==='ceiling'?[0,-1,0]:[0,1,0])),point=new T.Vector3(...c.lastLanding.point);
  for(let j=0;j<=24;j++){
   carrier.position.fromArray(c.center);carrier.quaternion.fromArray(c.orientation);rig.pose({deploy:1,height:c.height,stride:0,plant:true,eyeQuaternion:new T.Quaternion(...c.orientation).invert().multiply(new T.Quaternion(...c.eyeOrientation)).toArray()});carrier.updateMatrixWorld(true);
   for(const l of rig.legs){const foot=l.foot.getWorldPosition(new T.Vector3());maxSocketPlaneError=Math.max(maxSocketPlaneError,Math.abs(foot.sub(point).dot(normal)));}
   g.scene.traverse(m=>{if(!m.isMesh)return;m.skeleton.update();for(const i of new Set(m.geometry.index.array)){const p=m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld);minMeshClearance=Math.min(minMeshClearance,p.sub(point).dot(normal));}});
   geometrySamples++;advance(c,.07);
  }
 }
}
let minimumShellClearance=Infinity;
for(const e of manifest.assets.filter(e=>!e.static)){
 const bytes=await fs.readFile(new URL(e.file,out)),g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const rig=createRig(g.scene,T);
 rig.pose({explode:0});g.scene.updateMatrixWorld(true);let inner=0,outer=Infinity;
 g.scene.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++){const name=m.skeleton.bones[m.geometry.attributes.skinIndex.getX(i)].name,p=m.getVertexPosition(i,new T.Vector3()).sub(new T.Vector3(0,.8,0)),r=p.length();if(!name.startsWith('PANEL_')&&!['SHELL_ROLL','EYE_GIMBAL'].includes(name))inner=Math.max(inner,r);}});
 // Only the ceramic outer surface, not its inner supports or intentional seam channels.
 g.scene.traverse(m=>{if(!m.isSkinnedMesh||m.material.name!=='TAI_CERAMIC')return;for(let j=0;j<m.geometry.index.count;j++){const i=m.geometry.index.getX(j),name=m.skeleton.bones[m.geometry.attributes.skinIndex.getX(i)].name;if(name.startsWith('PANEL_'))outer=Math.min(outer,m.getVertexPosition(i,new T.Vector3()).sub(new T.Vector3(0,.8,0)).length());}});
 minimumShellClearance=Math.min(minimumShellClearance,outer-inner);assert(outer-inner>.015,'12% keeps closed internals behind ceramic '+(outer-inner));
}
const tracking=new TAIController();advance(tracking,1.5,{right:true});let eye=rotateVector([0,0,1],tracking.eyeOrientation);assert(eye[0]>.995);const qBefore=[...tracking.eyeOrientation];advance(tracking,.05,{back:true});assert(Math.abs(qBefore.reduce((sum,v,i)=>sum+v*tracking.eyeOrientation[i],0))>.99,'eye turns gradually');advance(tracking,3,{back:true});eye=rotateVector([0,0,1],tracking.eyeOrientation);const speed=vLength(tracking.velocity);assert(eye.reduce((s,v,i)=>s+v*tracking.velocity[i]/speed,0)>.99,'eye follows actual momentum');
const runway=new TAIController();advance(runway,4,{back:true});assert(runway.speed>40&&runway.collisions===0,'uninterrupted runway reaches high speed');while(runway.collisions===0&&runway.time<10)runway.step(step,{back:true});assert(runway.collisions>0&&runway.runup<.01&&runway.speed<10,'impact loses drive charge');
const recoilPeaks=[];for(const height of [3,22]){const drop=new TAIController();drop.center=[0,height,50];drop.mode='gecko';drop.deploy=1;drop.beginFlight();while(!drop.lastLanding)drop.step(step);let peak=0;for(let i=0;i<220;i++){drop.step(step);peak=Math.max(peak,drop.recoil);}recoilPeaks.push(peak);}assert(recoilPeaks[1]>.32&&recoilPeaks[1]>recoilPeaks[0]*2,'high drops visibly compress more');
assert(minMeshClearance>-.001);assert(maxSocketPlaneError<.001);
const report={status:'passed',designation:'09-TAI-01',fixed_step_s:step,arena_m:[180,24,218],momentum_speeds_at_1_2_3_seconds_m_s:speeds,shots,minimum_precontact_alignment:minimumPrecontactAlignment,maximum_winch_speed_m_s:maximumWinchSpeed,geometry_samples:geometrySamples,minimum_closed_ceramic_clearance_m:minimumShellClearance,low_high_drop_compression_m:recoilPeaks,minimum_mesh_contact_clearance_m:minMeshClearance,maximum_foot_plane_error_m:maxSocketPlaneError,checks:['90 ball/gecko target arrivals across three presets and two custom extremes','acceleration, coast and braking','rising winch force and velocity','rotation and deployment complete before impact','ground/wall/ceiling compression, rebound and anchored recovery','wall and ceiling drops','four manual-release timings','jump and ground-wall-ceiling traversal','detailed and game skin geometry during recoil'],limits:['Planar test fixture and assisted winch; no general rigid-body or flexible-rope solver','No FPS benchmark']};
await fs.writeFile(new URL('dynamics-validation.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({speeds,minimumPrecontactAlignment,maximumWinchSpeed,geometrySamples,minMeshClearance,maxSocketPlaneError,minimumShellClearance,recoilPeaks}));
