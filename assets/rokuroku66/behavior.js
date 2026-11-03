// Seeded, fixed-step behavior in metres, +Y up, +Z forward. No renderer dependency.
export const BEHAVIOR_STEP=1/60,CONTACT_HEIGHT=.10;
export const behaviors={roam:{name:'Seeded_Roaming',duration_s:90,loop:false,continuous:true},hesitate:{name:'Hesitate_And_Test',duration_s:12,loop:false},sense:{name:'Tentacle_Survey',duration_s:14,loop:false},rush:{name:'Rush_And_Settle',duration_s:18,loop:false}};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));},lerp=(a,b,t)=>a+(b-a)*t;
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x)),TAU=2*Math.PI;
const homes={'03':[3.15,1.80],'04':[3.05,-1.80],'05':[-3.05,-1.80],'06':[-3.15,1.80]};
const rotate=(x,z,a)=>[Math.cos(a)*x+Math.sin(a)*z,-Math.sin(a)*x+Math.cos(a)*z];
export function seeded(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const labels={amble:'Curious wandering',hesitate:'Hesitating / testing a step',sense:'Feeling the space ahead',gather:'Gathering for a rush',rush:'Rushing to a new place',brake:'Slowing on arrival',settle:'Settling / listening',rest:'Quiet sensing'};
class Simulation{
 constructor(seed,profile){this.random=seeded(seed);this.seed=seed;this.profile=profile;this.t=0;this.x=0;this.z=0;this.yaw=0;this.speed=0;this.accel=0;this.moveAngle=0;this.gaitPhase=0;this.bodyHeight=1.12;this.sense=0;this.energy=0;this.look=0;this.lookTarget=0;this.hesitation=0;this.stepWait=0;this.steps=0;this.events=[];this.feet=Object.entries(homes).map(([id,[x,z]])=>({id,p:[x,CONTACT_HEIGHT,z],from:[x,CONTACT_HEIGHT,z],to:[x,CONTACT_HEIGHT,z],swing:0,duration:0,stance:true,step:0}));this.enter(profile==='sense'?'sense':profile==='rush'?'gather':'amble');}
 destination(distance){
  let heading=this.yaw+(this.random()-.5)*1.8;
  for(let i=0;i<16;i++){const x=this.x+Math.sin(heading)*distance,z=this.z+Math.cos(heading)*distance;if(Math.hypot(x,z)<15){this.goal=[x,z];this.moveAngle=Math.atan2(x-this.x,z-this.z);return;}heading=Math.atan2(-this.x,-this.z)+(this.random()-.5)*1.0;}
  this.goal=[0,0];this.moveAngle=Math.atan2(-this.x,-this.z);
 }
 enter(state){
  this.state=state;this.start=this.t;this.events.push({state,time:this.t,position:[this.x,this.z]});this.tested=false;
  const r=this.random;
  this.duration={amble:4+r()*3,hesitate:1.8+r()*1.8,sense:3+r()*2.5,gather:.8,rush:10,brake:1.5,settle:1.6+r()*1.4,rest:100000}[state];
  if(state==='amble'){this.cruise=.35+r()*.25;this.destination(4+r()*3);}
  if(state==='gather'){this.burst=1.9+r()*.65;this.destination(9+r()*5);}
  if(state==='sense')this.lookTarget=(r()-.5)*1.2;
 }
 transition(){
  const age=this.t-this.start;
  if(this.profile==='hesitate'){
   if(this.state==='amble'&&age>1.1)this.enter('hesitate');else if(this.state==='hesitate'&&age>4)this.enter('sense');else if(this.state==='sense'&&this.t>9)this.enter('rest');return;
  }
  if(this.profile==='sense'){if(this.t>11&&this.state!=='rest')this.enter('rest');return;}
  if(this.state==='rush'&&Math.hypot(this.goal[0]-this.x,this.goal[1]-this.z)<1.8){this.enter('brake');return;}
  if(age<this.duration)return;
  const next={amble:'hesitate',hesitate:'sense',sense:'gather',gather:'rush',rush:'brake',brake:'settle',settle:this.profile==='rush'?'rest':'amble'}[this.state];if(next)this.enter(next);
 }
 preferred(id,lead=0){const h=homes[id],p=rotate(h[0],h[1],this.yaw);return [this.x+p[0]+Math.sin(this.moveAngle)*lead,CONTACT_HEIGHT,this.z+p[1]+Math.cos(this.moveAngle)*lead];}
 lift(f,to,duration,height){f.from=[...f.p];f.to=to;f.swing=0;f.duration=duration;f.height=height;f.stance=false;f.step=++this.steps;}
 step(){
  const dt=BEHAVIOR_STEP;this.t+=dt;this.transition();const age=this.t-this.start;
  const moving=this.state==='amble'||this.state==='rush';let wanted=moving?(this.state==='rush'?this.burst:this.cruise):0;
  const distance=Math.hypot(this.goal?.[0]-this.x||0,this.goal?.[1]-this.z||0);
  if(moving){wanted=Math.min(wanted,Math.sqrt(Math.max(0,distance-.3)*2*1.2));const desired=Math.atan2(this.goal[0]-this.x,this.goal[1]-this.z);const turn=angle(desired-this.yaw);const turnRate=.10+this.energy*.12;this.yaw+=clamp(turn,-turnRate*dt,turnRate*dt);}
  const desiredAccel=clamp((wanted-this.speed)*3,-1.7,this.state==='rush'?2.4:.85);this.accel+=clamp(desiredAccel-this.accel,-5*dt,5*dt);this.speed=Math.max(0,this.speed+this.accel*dt);
  this.x+=Math.sin(this.moveAngle)*this.speed*dt;this.z+=Math.cos(this.moveAngle)*this.speed*dt;
  this.gaitPhase+=dt*(.25+this.speed*.8);this.stepWait=Math.max(0,this.stepWait-dt);
  for(const f of this.feet)if(!f.stance){f.swing+=dt;const u=clamp(f.swing/f.duration),s=ease(u);f.p=f.from.map((x,k)=>lerp(x,f.to[k],s));f.p[1]+=(Math.sin(Math.PI*u)**3)*f.height;if(u>=1){f.stance=true;f.p=[...f.to];}}
  const airborne=this.feet.filter(f=>!f.stance),fast=this.state==='rush'||this.speed>1.0;
  if(this.stepWait===0&&airborne.length===0){
   const duration=fast?.23+this.random()*.025:.29+this.random()*.04,lead=(this.speed+Math.max(0,this.accel)*(fast?.3:0))*.35;
   const scores=this.feet.map(f=>{const home=this.preferred(f.id,lead);return {f,home,error:Math.hypot(home[0]-f.p[0],home[2]-f.p[2])};}).sort((a,b)=>b.error-a.error);
   if(scores[0].error>(this.speed>.1?.24:.25)){
    const first=scores[0];this.lift(first.f,first.home,duration,fast?.37:.30);if(fast){const opposite={'03':'05','05':'03','04':'06','06':'04'}[first.f.id],second=scores.find(x=>x.f.id===opposite);this.lift(second.f,second.home,duration,.37);}this.stepWait=duration+.025;
   }else if(this.state==='hesitate'&&age>.65&&!this.tested){const f=this.feet[this.random()<.5?0:3];this.lift(f,[...f.p],.95,.24);this.tested=true;this.stepWait=1.05;}
  }
  const sensorGoal=['sense','rest'].includes(this.state)?1:this.state==='hesitate'?.65:this.state==='rush'?.12:.35;
  this.look+=(this.lookTarget-this.look)*(1-Math.exp(-dt*1.8));this.hesitation+=((this.state==='hesitate'?1:0)-this.hesitation)*(1-Math.exp(-dt*3));
  this.sense+=(sensorGoal-this.sense)*(1-Math.exp(-dt*2));this.energy+=(clamp(this.speed/2.2)-this.energy)*(1-Math.exp(-dt*3));
  const heightGoal=this.state==='gather'?.91:this.state==='sense'?1.53:this.state==='brake'?1.32:this.state==='rush'?1.00:this.state==='hesitate'?1.19:1.12;
  this.bodyHeight+=(heightGoal-this.bodyHeight)*(1-Math.exp(-dt*(this.state==='gather'?4:2.3)));
 }
 frame(){
  const breathe=.045*Math.sin(this.t*1.8)+.018*Math.sin(this.t*3.1+.4),bounce=.065*this.energy*Math.sin(this.gaitPhase*TAU*2);
  const sway=[0,0];for(const f of this.feet)if(!f.stance){const p=rotate(f.p[0]-this.x,f.p[2]-this.z,-this.yaw),w=Math.sin(Math.PI*clamp(f.swing/f.duration));sway[0]-=Math.sign(p[0])*.16*w*(1-this.energy);sway[1]-=Math.sign(p[1])*.12*w*(1-this.energy);}
  return {time:this.t,seed:this.seed,behavior:this.state,phase:labels[this.state],position:[this.x,0,this.z],heading:this.yaw,goal:this.goal?[...this.goal]:[0,0],speed_m_s:this.speed,acceleration_m_s2:this.accel,gait_phase:this.gaitPhase,sense:this.sense,energy:this.energy,look:this.look||0,bodyPosition:[sway[0]+.025*Math.sin(this.t*1.2),this.bodyHeight+breathe+bounce,sway[1]+.07*this.hesitation*Math.sin(this.t*4)],bodyRotation:[-.035*this.accel,-Math.PI/6,.025*Math.sin(this.gaitPhase*TAU)*(1+.5*this.energy)],sensors:['01','02'],feet:this.feet.map(f=>({id:f.id,target:[...f.p],stance:f.stance,step:f.step,lift:f.stance?0:Math.sin(Math.PI*clamp(f.swing/f.duration))**3})),contacts:this.feet.filter(f=>f.stance).length,steps:this.steps};
 }
}
export function createBehavior(seed=6601,profile='roam'){
 if(!behaviors[profile])throw Error('Unknown behavior '+profile);
 let sim,a,b,index;
 function reset(){sim=new Simulation(seed>>>0,profile);a=b=sim.frame();index=0;}
 reset();
 return {seed:seed>>>0,profile,get events(){return sim.events.map(e=>({...e}));},sample(time){
  const t=Math.max(0,behaviors[profile].continuous?time:Math.min(time,behaviors[profile].duration_s)),next=Math.ceil(t/BEHAVIOR_STEP-1e-9);
  if(next<index)reset();while(index<next){a=b;sim.step();b=sim.frame();index++;}
  const u=clamp((t-a.time)/BEHAVIOR_STEP),r={...b,time:t};
  for(const k of ['speed_m_s','acceleration_m_s2','gait_phase','sense','energy'])r[k]=lerp(a[k],b[k],u);
  r.heading=a.heading+angle(b.heading-a.heading)*u;
  for(const k of ['position','bodyPosition','bodyRotation'])r[k]=a[k].map((x,i)=>lerp(x,b[k][i],u));
  r.feet=b.feet.map((f,i)=>({...f,target:a.feet[i].target.map((x,k)=>lerp(x,f.target[k],u)),stance:a.feet[i].stance&&f.stance}));r.contacts=r.feet.filter(f=>f.stance).length;
  return r;
 }};
}
