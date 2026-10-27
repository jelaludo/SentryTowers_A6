// Deterministic, fixed-step playground behavior. Metres and seconds; X/Z ground.
export const STEP=1/120, RADIUS=5.5, STRAIGHT=16;
export const TRACK_LENGTH=2*STRAIGHT+2*Math.PI*RADIUS;
// Ground speed limits are in world metres/second, independent of lane radius.
// K0's smaller stride is retimed by distance; the source animation stays intact.
export const ACTORS=[
 {id:'k9',family:'reckon-k9',node:'RECKON_K9_ACTOR',start:-1.1,lane:-1.3,maxSpeed:4.43,acceleration:2.1,braking:3.5,reaction:3,turnRate:2.3,pursuit:.9,gap:2.3,laneSpring:7,laneDamping:5,lateralAcceleration:1.5,lateralSpeed:.7,jumpDistance:3,jumpRate:1.05,jumpLift:0,blend:.18},
 {id:'cheetah',family:'mechanical-cheetah',node:'C07_CHEETAH_ACTOR',start:-3.2,lane:1.3,maxSpeed:5.6,acceleration:2.8,braking:3.5,reaction:3,turnRate:2.3,pursuit:.9,gap:2.3,laneSpring:7,laneDamping:5,lateralAcceleration:1.5,lateralSpeed:.7,jumpDistance:3,jumpRate:1.25,jumpLift:0,blend:.18},
 {id:'k0',family:'k0-tech-01',node:'K0_TECH_01_ACTOR',start:-5.6,lane:0,maxSpeed:6.8,acceleration:6.4,braking:7,reaction:10,turnRate:4.6,pursuit:1.6,gap:.9,laneSpring:18,laneDamping:8,lateralAcceleration:3.8,lateralSpeed:1.3,jumpDistance:3.2,jumpRate:1.8,jumpLift:.16,blend:.10}
];
export const OBSTACLES=[
 {id:'H01',s:5,height:.14,width:4.8,depth:.10},
 {id:'H02',s:13,height:.18,width:4.8,depth:.10},
 {id:'H03',s:STRAIGHT+Math.PI*RADIUS+8,height:.20,width:4.8,depth:.10}
];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const mod=(a,b)=>(a%b+b)%b;
export function seeded(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function track(s,lane=0){
 let u=mod(s,TRACK_LENGTH),x,z,dx,dz,curvature=0;
 if(u<STRAIGHT){x=-RADIUS;z=-STRAIGHT/2+u;dx=0;dz=1;}
 else if((u-=STRAIGHT)<Math.PI*RADIUS){const a=Math.PI-u/RADIUS;x=RADIUS*Math.cos(a);z=STRAIGHT/2+RADIUS*Math.sin(a);dx=Math.sin(a);dz=-Math.cos(a);curvature=1/RADIUS;}
 else if((u-=Math.PI*RADIUS)<STRAIGHT){x=RADIUS;z=STRAIGHT/2-u;dx=0;dz=-1;}
 else{u-=STRAIGHT;const a=-u/RADIUS;x=RADIUS*Math.cos(a);z=-STRAIGHT/2+RADIUS*Math.sin(a);dx=Math.sin(a);dz=-Math.cos(a);curvature=1/RADIUS;}
 return {x:x+dz*lane,z:z-dx*lane,dx,dz,yaw:Math.atan2(dx,dz),curvature};
}
export function nextObstacle(s){
 return OBSTACLES.map(o=>({...o,worldS:o.s+Math.ceil((s-o.s+.001)/TRACK_LENGTH)*TRACK_LENGTH})).sort((a,b)=>a.worldS-b.worldS)[0];
}
export function sourceJumpTravel(meta,t){
 if(!meta.travel_m)return 0;
 const a=Math.max(...Object.values(meta.release_s)),b=Math.min(...Object.values(meta.touchdown_s)),r=a-.17,e=b+.20;
 const base=meta.root_motion_profile?.base_travel_m??meta.travel_m,v=base/(b-a+(a-r)/2+(e-b)/2);
 let distance=0;
 if(t>=e)distance=base;
 else if(t>=b){const q=t-b;distance=.5*v*(a-r)+v*(b-a)+v*q-.5*v*q*q/(e-b);}
 else if(t>=a)distance=.5*v*(a-r)+v*(t-a);
 else if(t>r)distance=.5*v*(t-r)**2/(a-r);
 return distance+(meta.root_motion_profile?.airborne_extra_m||0)*clamp((t-a)/(b-a),0,1);
}
export function jumpTravel(meta,t,distance=3){
 const a=Math.max(...Object.values(meta.release_s)),b=Math.min(...Object.values(meta.touchdown_s));
 // The extra range is applied only while ALL paws are airborne. Before/after
 // that window the source clip's planted contacts and 1.2 m pounce are retained.
 return sourceJumpTravel(meta,t)+(distance-(meta.travel_m||0))*clamp((t-a)/(b-a),0,1);
}
export function jumpLift(meta,t,height=0){
 const a=Math.max(...Object.values(meta.release_s)),b=Math.min(...Object.values(meta.touchdown_s));
 return height*Math.sin(Math.PI*clamp((t-a)/(b-a),0,1))**2;
}
export class ChaseSimulation{
 constructor({seed=27,clips,obstacles=true,actorIds=ACTORS.map(a=>a.id)}={}){this.profiles=ACTORS.filter(a=>actorIds.includes(a.id));this.clips=clips;this.obstacles=obstacles;this.reset(seed);}
 reset(seed=this.seed){
  this.seed=seed;this.random=seeded(seed);this.time=0;this.accumulator=0;this.burstCount=0;this.events=[];this.nextChange=2.1;this.goalSpeed=.9;this.ball={s:1.3,speed:.8,lane:0,...track(1.3),y:.14,state:'Cruise'};
  this.actors=this.profiles.map(p=>({id:p.id,s:p.start,lane:p.lane,laneVelocity:0,speed:.8,worldSpeed:.8,reactedSpeed:.8,phase:0,clip:p.id==='k9'?'Walk_Cycle':'Feline_Walk_Cycle',clipTime:0,jump:null,lift:0,blend:p.blend,lastObstacle:-Infinity,jumps:0,avoidance:0,yaw:track(p.start).yaw,position:track(p.start,p.lane),state:'Tracking ball'}));
 }
 burst(){this.goalSpeed=3.4+this.random()*.5;this.nextChange=this.time+1.3+this.random()*1.4;this.burstCount++;this.events.push({type:'burst',time:this.time,speed:this.goalSpeed});}
 update(dt){this.accumulator+=Math.max(0,dt);let steps=0;while(this.accumulator>=STEP&&steps<240){this.step(STEP);this.accumulator-=STEP;steps++;}return steps;}
 step(dt){
  this.time+=dt;
  if(this.time>=this.nextChange){
   if(this.goalSpeed<2)this.burst();else{this.goalSpeed=.55+this.random()*1.1;this.nextChange=this.time+2+this.random()*3;}
  }
  const maxGap=Math.max(...this.actors.map(a=>this.ball.s-a.s));
  const ballTarget=maxGap>9?.35:this.goalSpeed;
  this.ball.speed+=clamp(ballTarget-this.ball.speed,-2.8*dt,3.2*dt);this.ball.s+=this.ball.speed*dt;
  this.ball.lane=.28*Math.sin(this.time*.73)+.12*Math.sin(this.time*1.71);
  Object.assign(this.ball,track(this.ball.s,this.ball.lane));this.ball.state=maxGap>9?'Waiting for friends':this.goalSpeed>2?'Speed burst':'Cruise';
  const near=OBSTACLES.reduce((d,o)=>Math.min(d,Math.abs(mod(this.ball.s-o.s+TRACK_LENGTH/2,TRACK_LENGTH)-TRACK_LENGTH/2)),Infinity);
  this.ball.y=.14+.035*Math.abs(Math.sin(this.time*7))+(this.obstacles&&near<.8?.34*Math.sin(Math.PI*(1-near/.8)/2)**2:0);
  const old=this.actors.map(a=>({...a,position:{...a.position}}));
  for(let i=0;i<this.actors.length;i++){
   const a=this.actors[i],p=this.profiles[i],before={...a.position},pathScale=Math.max(.6,1-a.position.curvature*a.lane);
   a.reactedSpeed+=(this.ball.speed-a.reactedSpeed)*(1-Math.exp(-dt*p.reaction));a.lift=0;
   if(a.jump){
    const j=a.jump;j.time=Math.min(j.meta.duration_s,j.time+dt*j.rate);a.s=j.start+jumpTravel(j.meta,j.time,j.distance);a.lift=jumpLift(j.meta,j.time,p.jumpLift);a.lane=j.lane;a.clip=j.meta.name;a.clipTime=j.time;
    a.state=j.time<Math.max(...Object.values(j.meta.release_s))?'Preparing jump':j.time<Math.min(...Object.values(j.meta.touchdown_s))?'Jumping obstacle': 'Landing / recover';
    if(j.time>=j.meta.duration_s){a.lastObstacle=j.obstacle;a.jump=null;a.speed=0;a.phase=0;a.jumps++;this.events.push({type:'land',actor:a.id,time:this.time,obstacle:j.obstacle});}
   }else{
    const gap=this.ball.s-a.s,desiredGap=p.gap+(a.id==='k0'?0:(a.id==='k9'?-1:1)*.5*Math.sin(this.time*.15));
    let wanted=clamp(a.reactedSpeed+(gap-desiredGap)*p.pursuit,0,p.maxSpeed/pathScale);
    a.avoidance=0;let yielding=false;
    for(const other of old){
     if(other.id===a.id)continue;
     const along=other.s-a.s,separation=Math.abs(a.lane-other.lane);
     a.avoidance=Math.max(a.avoidance,clamp((5.2-Math.abs(along))/2.4,0,1));
     if(along>0&&along<3.8&&separation<1.05){wanted=Math.min(wanted,Math.max(0,other.speed+(along-3.8)*1.5));yielding=true;}
    }
    // Stable passing sides avoid crossing another rig's long tail on the bends.
    // The small cat has the centre lane and reacts more sharply to lure weaving.
    let laneTarget=p.lane+this.ball.lane*(a.id==='k0'?.35:.12)*(1-.6*a.avoidance);
    a.state=yielding?'Giving way':a.avoidance>.2?'Passing with space':'Tracking ball';
    if(wanted>a.speed+.3&&a.avoidance<.2)a.state='Accelerating after ball';
    const obstacle=nextObstacle(a.s-.05),stage=obstacle.worldS-p.jumpDistance/2;
    if(this.obstacles&&obstacle.worldS>a.lastObstacle+.1&&stage-a.s<Math.max(4.2,a.speed*a.speed/(2*p.braking)+.5)){
     laneTarget=p.lane;
     wanted=Math.min(wanted,Math.sqrt(Math.max(0,2*p.braking*(stage-a.s))));
     a.state='Lining up hurdle';
     if(stage-a.s<.035&&a.speed<.48){
      a.s=stage;a.speed=0;const name=a.id==='k9'?'Jump':'Pounce',meta=this.clips[a.id].find(c=>c.name===name);
      a.jump={start:stage,lane:a.lane,time:0,meta,rate:p.jumpRate,distance:p.jumpDistance,obstacle:obstacle.worldS};a.clip=name;a.clipTime=0;
      this.events.push({type:'jump',actor:a.id,time:this.time,obstacle:obstacle.worldS});
     }
    }
    if(!a.jump){
     a.speed+=clamp(wanted-a.speed,-p.braking*dt/pathScale,p.acceleration*dt/pathScale);
     if(this.obstacles&&obstacle.worldS>a.lastObstacle+.1&&stage-a.s>=0)a.s=Math.min(stage,a.s+a.speed*dt);else a.s+=a.speed*dt;
     const accel=clamp((laneTarget-a.lane)*p.laneSpring-a.laneVelocity*p.laneDamping,-p.lateralAcceleration,p.lateralAcceleration);a.laneVelocity=clamp(a.laneVelocity+accel*dt,-p.lateralSpeed,p.lateralSpeed);a.lane=clamp(a.lane+a.laneVelocity*dt,-1.45,1.45);
    }
   }
   a.position=track(a.s,a.lane);const dx=a.position.x-before.x,dz=a.position.z-before.z;
   a.worldSpeed=Math.hypot(dx,dz)/dt;
   const yaw=a.jump?track(a.jump.start).yaw:a.worldSpeed>.05?Math.atan2(dx,dz):a.position.yaw;
   a.yaw+=clamp(Math.atan2(Math.sin(yaw-a.yaw),Math.cos(yaw-a.yaw)),-dt*p.turnRate,dt*p.turnRate);
   if(!a.jump){
    const previous=a.clip;
    if(a.worldSpeed<.10)a.clip=a.id==='k9'?'Alert_Idle':'Watch_Idle';
    else if(a.id==='k9')a.clip=a.worldSpeed<1.1?'Walk_Cycle':a.worldSpeed<2.55?'Run_Cycle':a.worldSpeed<3.55?'Gallop_Cycle':'Sprint_Cycle';
    else a.clip=a.worldSpeed<(a.id==='k0'?.6:1.25)?'Feline_Walk_Cycle':'Gallop_Cycle';
    const meta=this.clips[a.id].find(c=>c.name===a.clip);
    if(meta.speed_mps)a.phase+=Math.hypot(dx,dz)/(meta.speed_mps*meta.duration_s);else a.phase+=dt/meta.duration_s;
    a.clipTime=mod(a.phase,1)*meta.duration_s;
    if(previous!==a.clip)a.changedAt=this.time;
   }
  }
  // Bounded diagnostic log; simulations can run indefinitely.
  if(this.events.length>400)this.events.splice(0,this.events.length-400);
 }
}
