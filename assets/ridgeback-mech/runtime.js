// Metres; +Y up, +Z forward. Visual IK, not a terrain/contact physics solver.
export const DURATION=4,UPPER=1.15,LOWER=1.65;
export const LEGS=[
 {id:'FL',side:-1,z:1.48,fx:-2.48,fz:2.24,phase:0},
 {id:'ML',side:-1,z:0,fx:-2.95,fz:0,phase:.5},
 {id:'RL',side:-1,z:-1.48,fx:-2.48,fz:-2.24,phase:0},
 {id:'FR',side:1,z:1.48,fx:2.48,fz:2.24,phase:.5},
 {id:'MR',side:1,z:0,fx:2.95,fz:0,phase:0},
 {id:'RR',side:1,z:-1.48,fx:2.48,fz:-2.24,phase:.5}
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const policy=d=>({stride:d===3?0:d===2?.36:.8,lift:d===3?0:d===2?.15:.32,bodyY:d===3?1.16:1.9,enabled:d<3,rate:d===2?.45:d===3?0:1});
export function poseLeg(root,leg,target){
 const body=root.getObjectByName('MECH_BODY'),hipY=body.position.y;
 const dx=target[0]-leg.side*.98,dz=target[2]-leg.z,dy=target[1]-hipY;
 const radial=Math.hypot(dx,dz),distance=Math.hypot(radial,dy);
 const a=Math.atan2(dy,radial)+Math.acos(clamp((UPPER*UPPER+distance*distance-LOWER*LOWER)/(2*UPPER*distance),-1,1));
 const b=-Math.acos(clamp((distance*distance-UPPER*UPPER-LOWER*LOWER)/(2*UPPER*LOWER),-1,1));
 root.getObjectByName('HIP_YAW_'+leg.id).rotation.set(0,Math.atan2(-dz,dx),0);
 root.getObjectByName('HIP_PITCH_'+leg.id).rotation.set(0,0,a);
 root.getObjectByName('KNEE_'+leg.id).rotation.set(0,0,b);
 const ankle=root.getObjectByName('ANKLE_'+leg.id);
 // Cancel hip heading as well as pitch: all three claw tips stay planted in stance.
 ankle.quaternion.setFromAxisAngle(ankle.up.clone().set(0,0,1),-a-b);
 ankle.quaternion.multiply(ankle.quaternion.clone().setFromAxisAngle(ankle.up,-Math.atan2(-dz,dx)));
 return {distance,reachable:distance<UPPER+LOWER&&distance>Math.abs(UPPER-LOWER)};
}
export function solveHydraulics(root){
 root.updateMatrixWorld(true);
 for(const {id} of LEGS){
  const aim=root.getObjectByName('HYDRAULIC_AIM_'+id),rod=root.getObjectByName('PISTON_SLIDE_'+id);
  const upper=root.getObjectByName('SOCKET_HYDRAULIC_UPPER_'+id),lower=root.getObjectByName('SOCKET_HYDRAULIC_LOWER_'+id);
  const a=aim.parent.worldToLocal(upper.getWorldPosition(upper.position.clone()));
  const b=aim.parent.worldToLocal(lower.getWorldPosition(lower.position.clone()));
  const delta=b.sub(a),length=delta.length();aim.position.copy(a);aim.quaternion.setFromUnitVectors(aim.up,delta.normalize());rod.position.y=length;aim.userData.length_m=length;
 }
 root.updateMatrixWorld(true);
}
export function applyMech(root,time=0,{mode='walk',damage,aimYaw=0,aimPitch=0,barrelAngle=0}={}){
 const asset=root.getObjectByName('MX06_ROOT')||root,d=damage??asset.userData.damage_level??0,p=policy(d);
 if(asset.userData.static)return {contacts:6,phase:'Static distance pose',targets:{}};
 const body=root.getObjectByName('MECH_BODY');body.position.y=p.bodyY;
 const targets={};let contacts=0;
 for(const leg of LEGS){
  let travel=0,lift=0;
  if(p.enabled&&mode==='walk'){
   const u=((time/DURATION+leg.phase)%1+1)%1;
   if(u<.6)travel=p.stride*(.5-u/.6);
   else {const q=(u-.6)/.4;travel=p.stride*(-.5+q);lift=p.lift*Math.sin(Math.PI*q);}
  }
  if(lift<1e-6)contacts++;
  // Disabled stance spreads the feet; pivot names and lengths remain unchanged.
  const target=[leg.fx+(d===3?leg.side*.12:0),.18+lift,leg.fz+travel];
  targets[leg.id]={position:target,...poseLeg(root,leg,target),contact:lift<1e-6};
 }
 solveHydraulics(root);
 const yaw=clamp(aimYaw,-Math.PI/5,Math.PI/5)*(d===3?0:d===2?.5:1),pitch=clamp(aimPitch,-.12,.55)*(d===3?0:1);
 for(const gun of ['MINIGUN','LASER']){root.getObjectByName(gun+'_YAW').rotation.y=yaw;root.getObjectByName(gun+'_PITCH').rotation.x=d===3?.23:-pitch;}
 root.getObjectByName('MINIGUN_SPIN').rotation.z=d===3?0:barrelAngle;
 root.getObjectByName('MISSILE_ELEVATION').rotation.x=d===3?.18:-.18-pitch*.4;
 root.getObjectByName('SENSOR_YAW').rotation.y=d===3?.28:yaw*.7;
 root.updateMatrixWorld(true);
 return {contacts,targets,phase:d===3?'D3 / Disabled wreck':d===2?'D2 / Reduced-stride tripod walk':mode==='walk'?'Alternating tripod walk':'Parked / Six feet planted'};
}
