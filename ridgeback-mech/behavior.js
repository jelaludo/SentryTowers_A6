import * as T from 'three';
import {applyMech,poseLeg,solveHydraulics,LEGS,STANCE_DUTY,walkSpeed} from '../assets/ridgeback-mech/runtime.js?v=heavy-gait-1';
const clamp=T.MathUtils.clamp;
// Viewer-only attention and locomotion controller. GLB clips remain reusable in-place sources.
export class LureBehavior {
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.elapsed=0;this.lureSpeed=.65;this.burstRemaining=0;this.burstTimer=3+this.random()*4;this.burstSpeed=0;this.burstCount=0;this.reaction=0;this.phase=0;this.rate=0;this.aggro=0;this.position=new T.Vector3();this.yaw=0;this.state='Tracking lure';this.timer=0;this.lure=new T.Vector3(2,.65,8);this.destination=new T.Vector3(6,.65,10);this.lureTimer=0;this.anchors=new Map();this.previous=new Map();this.offsets=new Map();}
 update(dt,damage,intensity=1){
  this.elapsed+=dt;this.timer-=dt;this.lureTimer-=dt;
  this.burstTimer-=dt;this.burstRemaining=Math.max(0,this.burstRemaining-dt);
  if(this.burstTimer<=0){
   this.burstRemaining=1.2+this.random()*1.6;this.burstSpeed=1.8+this.random()*1.2;
   this.burstTimer=this.burstRemaining+4+this.random()*7;this.burstCount++;
   const bearing=Math.atan2(this.lure.x-this.position.x,this.lure.z-this.position.z)+(this.random()-.5)*.7;
   this.destination.copy(this.lure).add(new T.Vector3(Math.sin(bearing)*5,0,Math.cos(bearing)*5));this.lureTimer=this.burstRemaining;
  }
  const targetSpeed=this.burstRemaining>0?this.burstSpeed:.65;
  this.lureSpeed+=(targetSpeed-this.lureSpeed)*(1-Math.exp(-dt*(this.burstRemaining>0?5:2)));
  if(this.lureTimer<=0||this.lure.distanceTo(this.destination)<.3){const a=this.yaw+(this.random()-.5)*1.8,r=7+this.random()*3;this.destination.set(this.position.x+Math.sin(a)*r,.65,this.position.z+Math.cos(a)*r);this.lureTimer=3+this.random()*3;}
  const delta=this.destination.clone().sub(this.lure);delta.y=0;const remaining=delta.length();if(remaining>0)this.lure.addScaledVector(delta.normalize(),Math.min(remaining,dt*this.lureSpeed));
  this.lure.y=.65+.10*Math.sin(this.elapsed*3);
  const to=this.lure.clone().sub(this.position);to.y=0;const distance=to.length();
  // Pursuit never ends or resets: random attention changes modulate its pace.
  if(this.timer<=0){this.drive=.25+this.random()*.75;this.timer=4+this.random()*6;}
  // Perception lags the target: react to its speed and the opening gap, then ease back.
  const urgency=clamp((this.lureSpeed-.65)/1.6,0,1)*.65+clamp((distance-9)/9,0,.35);
  this.reaction+=(urgency-this.reaction)*(1-Math.exp(-dt*1.6));
  const wanted=intensity*clamp((this.drive??.65)*.65+this.reaction,.15,1.4);
  this.aggro+=(wanted-this.aggro)*(1-Math.exp(-dt*(wanted>this.aggro?.8:1.5)));
  this.state=this.aggro>.65?'Aggressive pursuit':'Tracking lure';
  const desired=.7+this.aggro*2.2;
  this.rate+=clamp(desired-this.rate,-dt*1.8,dt*.7);
  if(this.rate>0){const bearing=Math.atan2(to.x,to.z),error=Math.atan2(Math.sin(bearing-this.yaw),Math.cos(bearing-this.yaw));this.yaw+=clamp(error,-dt*.10*this.rate,dt*.10*this.rate);}
  this.phase+=dt*this.rate;
  this.speed=walkSpeed(damage)*this.rate;
  this.position.add(new T.Vector3(Math.sin(this.yaw),0,Math.cos(this.yaw)).multiplyScalar(this.speed*dt));
 }
 pose(root,damage){
  root.position.copy(this.position);root.rotation.set(0,this.yaw,0);
  const state=applyMech(root,this.phase,{damage,aimYaw:clamp(Math.atan2(this.lure.x-this.position.x,this.lure.z-this.position.z)-this.yaw,-.6,.6)});
  root.updateMatrixWorld(true);
  for(const leg of LEGS){
   const target=new T.Vector3(...state.targets[leg.id].position),world=root.localToWorld(target.clone()),u=((this.phase/4+leg.phase)%1+1)%1,contact=u<STANCE_DUTY;
   if(contact){if(!this.previous.get(leg.id)||!this.anchors.has(leg.id))this.anchors.set(leg.id,world.clone());world.copy(this.anchors.get(leg.id));}
   else {if(this.previous.get(leg.id))this.offsets.set(leg.id,this.anchors.get(leg.id).clone().sub(world));const q=(u-STANCE_DUTY)/(1-STANCE_DUTY),off=this.offsets.get(leg.id);if(off)world.addScaledVector(off,(1-q)**2);}
   poseLeg(root,leg,root.worldToLocal(world).toArray());
   // Keep the tripod claw orientation fixed on the ground during hull steering.
   root.getObjectByName('ANKLE_'+leg.id).quaternion.multiply(root.quaternion.clone().invert());this.previous.set(leg.id,contact);
  }
  solveHydraulics(root);return state;
 }
}
