// Deterministic, fixed-step playground behavior. Metres and seconds; X/Z ground.
export const STEP=1/120, RADIUS=5.5, STRAIGHT=16;
export const TRACK_LENGTH=2*STRAIGHT+2*Math.PI*RADIUS;
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
 const v=meta.travel_m/(b-a+(a-r)/2+(e-b)/2);
 if(t<=r)return 0;
 if(t<a)return .5*v*(t-r)**2/(a-r);
 if(t<b)return .5*v*(a-r)+v*(t-a);
 if(t<e){const q=t-b;return .5*v*(a-r)+v*(b-a)+v*q-.5*v*q*q/(e-b);}
 return meta.travel_m;
}
export function jumpTravel(meta,t,distance=3){
 const a=Math.max(...Object.values(meta.release_s)),b=Math.min(...Object.values(meta.touchdown_s));
 // The extra range is applied only while ALL paws are airborne. Before/after
 // that window the source clip's planted contacts and 1.2 m pounce are retained.
 return sourceJumpTravel(meta,t)+(distance-(meta.travel_m||0))*clamp((t-a)/(b-a),0,1);
}
export class ChaseSimulation{
 constructor({seed=27,clips,obstacles=true}={}){this.clips=clips;this.obstacles=obstacles;this.reset(seed);}
 reset(seed=this.seed){
  this.seed=seed;this.random=seeded(seed);this.time=0;this.accumulator=0;this.burstCount=0;this.events=[];this.nextChange=2.1;this.goalSpeed=.9;this.ball={s:1.3,speed:.8,lane:0,...track(1.3),y:.14,state:'Cruise'};
  this.actors=['k9','cheetah'].map((id,i)=>({id,s:-1.1-i*2.1,lane:i?.5:-.5,laneVelocity:0,speed:.8,worldSpeed:.8,reactedSpeed:.8,phase:0,clip:i?'Feline_Walk_Cycle':'Walk_Cycle',clipTime:0,jump:null,lastObstacle:-Infinity,jumps:0,avoidance:0,yaw:track(-1.1-i*2.1).yaw,position:track(-1.1-i*2.1,i?.5:-.5),state:'Tracking ball'}));
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
  for(let i=0;i<2;i++){
   const a=this.actors[i],other=old[1-i],before={...a.position};
   a.reactedSpeed+=(this.ball.speed-a.reactedSpeed)*(1-Math.exp(-dt*3));
   if(a.jump){
    const j=a.jump;j.time=Math.min(j.meta.duration_s,j.time+dt*j.rate);a.s=j.start+jumpTravel(j.meta,j.time,j.distance);a.lane=j.lane;a.clip=j.meta.name;a.clipTime=j.time;
    a.state=j.time<Math.max(...Object.values(j.meta.release_s))?'Preparing jump':j.time<Math.min(...Object.values(j.meta.touchdown_s))?'Jumping obstacle': 'Landing / recover';
    if(j.time>=j.meta.duration_s){a.lastObstacle=j.obstacle;a.jump=null;a.speed=0;a.phase=0;a.jumps++;this.events.push({type:'land',actor:a.id,time:this.time,obstacle:j.obstacle});}
   }else{
    const gap=this.ball.s-a.s,lead=Math.sin(this.time*.15)>0?0:1;
    const desiredGap=i===lead?1.8:2.8;
    let wanted=clamp(a.reactedSpeed+(gap-desiredGap)*.9,0,(i===0?4.43:5.6)/Math.max(.6,1-a.position.curvature*a.lane));
    const along=other.s-a.s,close=Math.abs(along)<4.8;
    const separation=Math.abs(a.lane-other.lane);
    a.avoidance=close?clamp((4.8-Math.abs(along))/2.4,0,1):0;
    let laneTarget=this.ball.lane+(i===0?-.35:.35);
    if(close)laneTarget=(i===0?-1:1)*(.75+.30*a.avoidance);
    if(along>0&&along<3.8&&separation<1.05)wanted=Math.min(wanted,Math.max(0,other.speed+(along-3.8)*1.5));
    a.state=a.avoidance>.2?(along>0&&separation<.95?'Giving way':'Passing with space'):'Tracking ball';
    if(wanted>a.speed+.3&&a.avoidance<.2)a.state='Accelerating after ball';
    const obstacle=nextObstacle(a.s-.05),stage=obstacle.worldS-1.5;
    if(this.obstacles&&obstacle.worldS>a.lastObstacle+.1&&stage-a.s<4.2){
     laneTarget=i===0?-1.05:1.05;
     wanted=Math.min(wanted,Math.sqrt(Math.max(0,2*3.5*(stage-a.s))));
     a.state='Lining up hurdle';
     if(stage-a.s<.035&&a.speed<.48){
      a.s=stage;a.speed=0;const name=i===0?'Jump':'Pounce',meta=this.clips[a.id].find(c=>c.name===name);
      a.jump={start:stage,lane:a.lane,time:0,meta,rate:i===0?1.05:1.25,distance:3,obstacle:obstacle.worldS};a.clip=name;a.clipTime=0;
      this.events.push({type:'jump',actor:a.id,time:this.time,obstacle:obstacle.worldS});
     }
    }
    if(!a.jump){
     a.speed+=clamp(wanted-a.speed,-3.5*dt,(i===0?2.1:2.8)*dt);
     if(this.obstacles&&obstacle.worldS>a.lastObstacle+.1&&stage-a.s>=0)a.s=Math.min(stage,a.s+a.speed*dt);else a.s+=a.speed*dt;
     const accel=clamp((laneTarget-a.lane)*7-a.laneVelocity*5,-1.5,1.5);a.laneVelocity=clamp(a.laneVelocity+accel*dt,-.7,.7);a.lane=clamp(a.lane+a.laneVelocity*dt,-1.25,1.25);
    }
   }
   a.position=track(a.s,a.lane);const dx=a.position.x-before.x,dz=a.position.z-before.z;
   a.worldSpeed=Math.hypot(dx,dz)/dt;
   const yaw=a.jump?track(a.jump.start).yaw:a.worldSpeed>.05?Math.atan2(dx,dz):a.position.yaw;
   a.yaw+=clamp(Math.atan2(Math.sin(yaw-a.yaw),Math.cos(yaw-a.yaw)),-dt*2.3,dt*2.3);
   if(!a.jump){
    const previous=a.clip;
    if(a.worldSpeed<.10)a.clip=i===0?'Alert_Idle':'Watch_Idle';
    else if(i===0)a.clip=a.worldSpeed<1.1?'Walk_Cycle':a.worldSpeed<2.55?'Run_Cycle':a.worldSpeed<3.55?'Gallop_Cycle':'Sprint_Cycle';
    else a.clip=a.worldSpeed<1.25?'Feline_Walk_Cycle':'Gallop_Cycle';
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
