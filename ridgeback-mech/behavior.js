import * as T from 'three';
import {applyMech,poseLeg,solveHydraulics,LEGS,STANCE_DUTY,walkSpeed} from '../assets/ridgeback-mech/runtime.js';
const clamp=T.MathUtils.clamp;
// Viewer-only attention and locomotion controller. GLB clips remain reusable in-place sources.
export class LureBehavior {
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.elapsed=0;this.phase=0;this.rate=0;this.aggro=0;this.position=new T.Vector3();this.yaw=0;this.state='Scanning';this.timer=1.5;this.lure=new T.Vector3(2,.65,8);this.destination=this.lure.clone();this.lureTimer=5;this.anchors=new Map();this.previous=new Map();this.offsets=new Map();}
 update(dt,damage,intensity=1){
  this.elapsed+=dt;this.timer-=dt;this.lureTimer-=dt;
  if(this.lureTimer<=0){const a=this.random()*Math.PI*2,r=6+this.random()*4;this.destination.set(clamp(this.position.x+Math.sin(a)*r,-14,14),.65,clamp(this.position.z+Math.cos(a)*r,-14,14));this.lureTimer=9+this.random()*8;}
  const delta=this.destination.clone().sub(this.lure);delta.y=0;const remaining=delta.length();if(remaining>0)this.lure.addScaledVector(delta.normalize(),Math.min(remaining,dt*.85));
  this.lure.y=.65+.10*Math.sin(this.elapsed*3);
  const to=this.lure.clone().sub(this.position);to.y=0;const distance=to.length();
  if(this.state==='Scanning'&&this.timer<=0&&distance<15){this.state='Detected';this.timer=.6+this.random()*.9;}
  else if(this.state==='Detected'&&this.timer<=0){this.state='Pursuing';this.timer=5+this.random()*5;this.drive=.75+this.random()*.25;}
  else if(this.state==='Pursuing'&&(this.timer<=0||distance<4.5)){this.state='Settling';this.timer=3+this.random()*4;}
  else if(this.state==='Settling'&&this.timer<=0&&this.rate<.01){this.state='Scanning';this.timer=1+this.random()*3;}
  const wanted=this.state==='Pursuing'?intensity*this.drive:0;
  this.aggro+=(wanted-this.aggro)*(1-Math.exp(-dt*(wanted>this.aggro?.8:1.5)));
  let desired=this.state==='Pursuing'?.8+this.aggro*2.2:0;
  // Finish a recovery step before stopping: never freeze a claw in the air.
  const u=((this.phase/4)%1+1)%1,allDown=u<.22||(u>=.5&&u<.72);
  if(!desired&&!allDown)desired=.65;
  this.rate+=clamp(desired-this.rate,-dt*1.8,dt*.7);
  if(!desired&&allDown&&this.rate<.03)this.rate=0;
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
