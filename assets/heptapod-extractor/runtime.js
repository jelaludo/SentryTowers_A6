export const DURATION=16,UPPER=4,LOWER=9.6;
export const legs=Array.from({length:6},(_,i)=>({id:String(i+1).padStart(2,'0'),side:i<3?-1:1,z:(i%3-1)*3.2,footZ:(i%3-1)*5.2}));
export function poseLeg(root,leg,travel=0,lift=0){const dx=leg.side*5,dz=leg.footZ+travel-leg.z,dy=.25+lift-8.8,r=Math.hypot(dx,dz),distance=Math.hypot(r,dy);const a=Math.atan2(dy,r)+Math.acos(Math.max(-1,Math.min(1,(UPPER*UPPER+distance*distance-LOWER*LOWER)/(2*UPPER*distance))));const bend=-Math.acos(Math.max(-1,Math.min(1,(distance*distance-UPPER*UPPER-LOWER*LOWER)/(2*UPPER*LOWER))));root.getObjectByName('LEG_'+leg.id+'_MOUNT').rotation.set(0,Math.atan2(-dz,dx),0);root.getObjectByName('LEG_'+leg.id+'_HIP').rotation.set(0,0,a);root.getObjectByName('LEG_'+leg.id+'_KNEE').rotation.set(0,0,bend);root.getObjectByName('LEG_'+leg.id+'_ANKLE').rotation.set(0,0,-a-bend);}
export function applyExtraction(root,time,lod,mode='mining'){
 const t=((time%DURATION)+DURATION)%DURATION,active=mode==='mining'&&t>=2&&t<12;
 if(lod===2)return {phase:'Static distance / parked',active:false};
 for(const [i,leg] of legs.entries()){const p=t/8*Math.PI*2+(i%2)*Math.PI;poseLeg(root,leg,mode==='walk'?.6*Math.cos(p):0,mode==='walk'?.65*Math.max(0,Math.sin(p)):0);}
 root.getObjectByName('LASER_YAW').rotation.y=0;root.getObjectByName('LASER_PITCH').rotation.x=0;
 root.getObjectByName('LASER_BEAM').visible=active;root.getObjectByName('GROUND_EFFECT').visible=active;root.getObjectByName('RESOURCE_STREAM').visible=active;
 root.getObjectByName('RESOURCE_STREAM').position.y=active?(t*1.8)%1.5:0;
 root.getObjectByName('GROUND_EFFECT').rotation.y=t*.7;
 return {active,phase:mode==='traffic'?'Traffic clearance / laser inhibited':mode==='walk'?'Alternating tripod gait / in-place preview':active?'Burn and recover mineral feedstock':t<2?'Survey and charge':'Cool and settle'};
}
