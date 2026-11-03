// A continuous, deterministic field encounter. World motion is separate from the rig.
import {seeded} from './behavior.js';
import {applyBehaviorPose, applyPose, forward, limbs, spiralAngles, extendedAngles, wrapAngles, polePosition} from './runtime.js';
export const STORY={name:'09TAI_Field_Encounter',duration_s:200,loop:false,step_s:1/60,rush_multiplier:2,pole:[8,0,10],lure_file:'../tai09/torque/09_tai_01_d0_lod1.glb',lure_radius_m:.8336};
export const chapters=[
 [0,'sleep','Sleeping spiral','Six curled limbs. A small visitor approaches.'],
 [7,'wake','Something nearby','Uncoil, stretch and lift into a standing posture.'],
 [21,'walk','First steps','Follow the rolling visitor at a tentative walking pace.'],
 [33,'hesitate','Where did it go?','Pause, test the ground and listen.'],
 [38,'sense','A signal ahead','Raise the body; both feelers search toward 09-tai.'],
 [44,'gather','Found you','Lower the body as the lure begins to escape.'],
 [46,'chase','The first pursuit','A double-speed rush, steered toward the moving lure.'],
 [60,'brake','Almost close enough','Brake, rebound and let the visitor draw ahead.'],
 [65,'stalk','Keep it in sight','Resume a deliberate walk with searching feelers.'],
 [78,'extend','A long stretch','Spread all six limbs before drawing them inward.'],
 [85,'spiral','A curious curl','Coil into a spiral, then reopen and rise.'],
 [99,'approach','Another discovery','A pole catches RokuRoku’s attention.'],
 [118,'inspect','Feel the surface','Settle beside the fixed pole and reach toward it.'],
 [124,'wrap','Around the pole','One limb winds upward around the pole.'],
 [134,'hold','A moment of stillness','Hold the coil while 09-tai waits nearby.'],
 [141,'unfurl','Let go','Unwind the same limb without moving the pole.'],
 [150,'depart','Back to the visitor','Replant, lift the feelers and walk away.'],
 [158,'sense_again','There it is again','Stop and track the lure as it picks up speed.'],
 [164,'gather_again','One more try','Gather low for another burst.'],
 [166,'chase_again','The second pursuit','Chase the live lure at twice the normal rush speed.'],
 [182,'slow','The visitor wins this round','Ease down into a walk, then a quiet stop.'],
 [190,'rest','Still curious','Keep breathing and watching. The encounter settles.']
].map(([start,id,title,description],i,a)=>({start,end:a[i+1]?.[0]??STORY.duration_s,id,title,description}));
export const chapterAt=t=>chapters.find(c=>t<c.end)||chapters.at(-1);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,u)=>a+(b-a)*u;
const ease=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const rotate=(x,z,a)=>[Math.cos(a)*x+Math.sin(a)*z,-Math.sin(a)*x+Math.cos(a)*z];
const CONTACT_HEIGHT=.13;
const homes={'03':[3.15,1.80],'04':[3.05,-1.80],'05':[-3.05,-1.80],'06':[-3.15,1.80]};
const localPole=polePosition('01'),park=[STORY.pole[0]-localPole[0],STORY.pole[2]-localPole[2]];
const isChase=id=>id==='chase'||id==='chase_again';
function qmul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
function quatTurn(q,dx,dz){const d=Math.hypot(dx,dz);if(!d)return q;const a=d/STORY.lure_radius_m/2,s=Math.sin(a);const n=qmul([dz/d*s,0,-dx/d*s,Math.cos(a)],q),l=Math.hypot(...n);return n.map(x=>x/l);}
class StorySimulation {
 constructor(seed){
  this.seed=seed;this.random=seeded(seed);this.t=0;this.x=0;this.z=0;this.yaw=0;this.moveAngle=0;this.speed=0;this.accel=0;this.gaitPhase=0;this.height=1.12;this.sense=.2;this.energy=0;this.look=0;this.steps=0;this.wait=0;this.chapter='sleep';this.events=[];this.detected=false;
  this.burst=2*(1.9+this.random()*.65);this.lureAngle=0;this.lureSpeed=0;this.lure=[0,STORY.lure_radius_m,7];this.lureRotation=[0,0,0,1];this.lureDistance=0;
  this.feet=Object.entries(homes).map(([id,[x,z]])=>({id,p:[x,CONTACT_HEIGHT,z],from:[x,CONTACT_HEIGHT,z],to:[x,CONTACT_HEIGHT,z],stance:true,step:0,swing:0,duration:0}));
 }
 preferred(id,lead){const p=rotate(...homes[id],this.yaw);return [this.x+p[0]+Math.sin(this.moveAngle)*lead,CONTACT_HEIGHT,this.z+p[1]+Math.cos(this.moveAngle)*lead];}
 lift(f,to,duration,height){f.from=[...f.p];f.to=to;f.swing=0;f.duration=duration;f.height=height;f.stance=false;f.step=++this.steps;}
 step(){
  const dt=STORY.step_s;this.t+=dt;const c=chapterAt(this.t),id=c.id,age=this.t-c.start,chase=isChase(id),sense=id.startsWith('sense');
  if(id!==this.chapter){this.chapter=id;this.events.push({id,time:this.t,position:[this.x,this.z]});this.tested=false;if(id==='inspect')this.parkStart=[this.x,this.z];}
  // The visitor follows an oval but changes pace in response to the pursuer's distance.
  const gap=Math.hypot(this.x-this.lure[0],this.z-this.lure[2]);
  let lureWanted=id==='sleep'?0:id==='wake'?.16:sense?.3:id.startsWith('gather')?3.6:chase?(age<5?5.7:3.1+1.05*Math.sin(age*.8)):id==='walk'?.65:id==='stalk'?.65:id==='slow'?.45:id==='rest'?0:.18;
  if(chase){if(gap<7)lureWanted+=.8;if(gap>17)lureWanted*=.6;}
  this.lureSpeed+=(lureWanted-this.lureSpeed)*(1-Math.exp(-dt*1.6));
  const radius=Math.hypot(12*Math.cos(this.lureAngle),10*Math.sin(this.lureAngle));this.lureAngle+=this.lureSpeed*dt/radius;
  const next=[12*Math.sin(this.lureAngle),STORY.lure_radius_m,-3+10*Math.cos(this.lureAngle)],dx=next[0]-this.lure[0],dz=next[2]-this.lure[2];this.lureRotation=quatTurn(this.lureRotation,dx,dz);this.lureDistance+=Math.hypot(dx,dz);this.lure=next;
  const toLure=Math.atan2(this.lure[0]-this.x,this.lure[2]-this.z);
  this.look+=(clamp(angle(toLure-this.yaw),-1.5,1.5)-this.look)*(1-Math.exp(-dt*2));
  if(sense&&age>2&&gap<28)this.detected=true;
  const goal=id==='approach'?(this.t<108?[park[0],park[1]-6]:park):id==='inspect'?park:id==='depart'?[park[0],park[1]-7]:[this.lure[0],this.lure[2]];
  let wanted=id==='walk'?.46:id==='stalk'?.65:id==='approach'?(this.t<108?.75:1.0):id==='depart'&&age>2?1.4:id==='slow'?.42*(1-ease(age/8)):chase&&this.detected?this.burst:0;
  const distance=Math.hypot(goal[0]-this.x,goal[1]-this.z),standOff=id==='approach'||id==='depart'?.08:6.5;
  wanted=Math.min(wanted,Math.sqrt(Math.max(0,distance-standOff)*2*2.7));
  if(id==='depart'&&age<2)this.moveAngle=Math.PI;
  const oldYaw=this.yaw;
  if(wanted>.01){const desired=Math.atan2(goal[0]-this.x,goal[1]-this.z);if(id==='approach')wanted*=Math.max(.12,Math.cos(angle(desired-this.moveAngle)));this.moveAngle+=clamp(angle(desired-this.moveAngle),-.85*dt,.85*dt);if(this.t<99||this.t>=166)this.yaw+=clamp(angle(desired-this.yaw),-(.14+.10*this.energy)*dt,(.14+.10*this.energy)*dt);}
  if(this.t>=99&&this.t<166)this.yaw+=clamp(angle(Math.PI/6-this.yaw),-.32*dt,.32*dt);
  const desiredAccel=clamp((wanted-this.speed)*3,-3.0,chase?3.4:.85);this.accel+=clamp(desiredAccel-this.accel,-7*dt,7*dt);this.speed=Math.max(0,this.speed+this.accel*dt);
  this.x+=Math.sin(this.moveAngle)*this.speed*dt;this.z+=Math.cos(this.moveAngle)*this.speed*dt;
  if(id==='inspect'){const p=ease(age/5.5);this.x=mix(this.parkStart[0],park[0],p);this.z=mix(this.parkStart[1],park[1],p);this.speed=0;this.accel=0;}
  if(['wrap','hold','unfurl'].includes(id)){this.x=park[0];this.z=park[1];this.speed=0;this.accel=0;}
  this.gaitPhase+=dt*(.25+this.speed*.8);this.wait=Math.max(0,this.wait-dt);
  for(const f of this.feet)if(!f.stance){f.swing+=dt;const u=clamp(f.swing/f.duration),s=ease(u);f.p=f.from.map((v,k)=>mix(v,f.to[k],s));f.p[1]+=Math.sin(Math.PI*u)**3*f.height;if(u>=1){f.stance=true;f.p=[...f.to];}}
  const turning=Math.abs(this.yaw-oldYaw)/dt,fast=chase||this.speed>1||turning>.12,tempo=Math.max(1,this.speed/2.25,turning/.15),airborne=this.feet.some(f=>!f.stance);
  if(!airborne&&this.wait===0){
   const duration=(fast?.23+this.random()*.025:.29+this.random()*.04)/tempo,lead=(this.speed+Math.max(0,this.accel)*.18)*.35/tempo;
   const scores=this.feet.map(f=>{const home=this.preferred(f.id,lead);return {f,home,error:Math.hypot(home[0]-f.p[0],home[2]-f.p[2])};}).sort((a,b)=>b.error-a.error);
   if(scores[0].error>.25){const first=scores[0];this.lift(first.f,first.home,duration,fast?.32:.30);if(fast){const other={'03':'05','05':'03','04':'06','06':'04'}[first.f.id],second=scores.find(x=>x.f.id===other);this.lift(second.f,second.home,duration,.32);}this.wait=duration+.018/tempo;}
   else if(id==='hesitate'&&age>.8&&!this.tested){const f=this.feet[0];this.lift(f,[...f.p],1.1,.24);this.tested=true;this.wait=1.15;}
  }
  this.sense+=((sense?1:id==='hesitate'?.65:chase?.12:.35)-this.sense)*(1-Math.exp(-dt*2));this.energy+=(clamp(this.speed/2.2)-this.energy)*(1-Math.exp(-dt*3));
  const target=id.startsWith('gather')?.91:sense?1.53:id==='brake'?1.32:chase?1.00:1.12;this.height+=(target-this.height)*(1-Math.exp(-dt*2.3));
 }
 frame(){
  const c=chapterAt(this.t),breathe=.035*Math.sin(this.t*1.8)+.015*Math.sin(this.t*3.1+.4),bounce=.055*this.energy*Math.sin(this.gaitPhase*Math.PI*4);
  return {curve_max_bend:3.85,time:this.t,seed:this.seed,behavior:c.id,phase:c.title,chapter:c,position:[this.x,0,this.z],heading:this.yaw,goal:[this.lure[0],this.lure[2]],speed_m_s:this.speed,acceleration_m_s2:this.accel,gait_phase:this.gaitPhase,sense:this.sense,energy:this.energy,look:this.look,bodyPosition:[.025*Math.sin(this.t*1.2),this.height+breathe+bounce,0],bodyRotation:[-.025*this.accel,-Math.PI/6,.023*Math.sin(this.gaitPhase*Math.PI*2)],sensors:['01','02'],feet:this.feet.map(f=>({id:f.id,target:[...f.p],stance:f.stance,step:f.step,lift:f.stance?0:Math.sin(Math.PI*clamp(f.swing/f.duration))**3})),contacts:this.feet.filter(f=>f.stance).length,steps:this.steps,lure:{position:[...this.lure],rotation:[...this.lureRotation],speed_m_s:this.lureSpeed,distance_m:this.lureDistance},detected:this.detected,rush_speed_m_s:this.burst};
 }
}
export function createStory(seed=6601){
 let sim,a,b,index;
 function reset(){sim=new StorySimulation(seed>>>0);a=b=sim.frame();index=0;}reset();
 return {seed:seed>>>0,get events(){return sim.events.map(x=>({...x}));},sample(time){
  const t=clamp(time,0,STORY.duration_s),next=Math.ceil(t/STORY.step_s-1e-9);if(next<index)reset();while(index<next){a=b;sim.step();b=sim.frame();index++;}
  const u=clamp((t-a.time)/STORY.step_s),f={...b,time:t,chapter:chapterAt(t)};
  for(const k of ['speed_m_s','acceleration_m_s2','gait_phase','sense','energy','look'])f[k]=mix(a[k],b[k],u);
  f.heading=a.heading+angle(b.heading-a.heading)*u;for(const k of ['position','bodyPosition','bodyRotation'])f[k]=a[k].map((x,i)=>mix(x,b[k][i],u));
  f.feet=b.feet.map((foot,i)=>({...foot,target:a.feet[i].target.map((x,k)=>mix(x,foot.target[k],u)),stance:a.feet[i].stance&&foot.stance}));f.contacts=f.feet.filter(x=>x.stance).length;
  const dot=a.lure.rotation.reduce((s,x,i)=>s+x*b.lure.rotation[i],0);const q=a.lure.rotation.map((x,i)=>mix(x,b.lure.rotation[i]*(dot<0?-1:1),u)),n=Math.hypot(...q);
  f.lure={...b.lure,position:a.lure.position.map((x,i)=>mix(x,b.lure.position[i],u)),rotation:q.map(x=>x/n),speed_m_s:mix(a.lure.speed_m_s,b.lure.speed_m_s,u)};return f;
 }};
}
const spiral=spiralAngles(),wrap=wrapAngles(),extended=Object.fromEntries(limbs.map(l=>[l.id,extendedAngles(l.id)]));
function blend(a,b,u){return a.map((v,i)=>v.map((x,k)=>mix(x,b[i][k],u)));}
// Morph the poses, rather than switching clips. Contact locking is suspended only
// during the deliberate whole-body coil/reach transitions, then resumes on replants.
export function applyStoryPose(root,frame){
 const base=applyBehaviorPose(root,frame);if(!base.poses)return base;
 const t=frame.time,poses=Object.fromEntries(Object.entries(base.poses).map(([k,v])=>[k,v.map(x=>[...x])])),body=[...frame.bodyPosition],rotation=[...frame.bodyRotation];let weight=0,target=null,targetHeight=1.12,targetYaw=-Math.PI/6;
 const safeReach=ease((t-99)/8)*(1-ease((t-164)/6));if(safeReach>0)for(const id of ['01','02']){const raised=extended[id].map(([y,p])=>[id==='01'?0:y,p]);raised[0][1]+=.18;if(id==='01')raised[0][0]=-.24;poses[id]=blend(poses[id],raised,safeReach);}
 if(t<21){weight=1-ease((t-15)/6);const amount=1-ease((t-7)/8);target=Object.fromEntries(limbs.map(l=>[l.id,spiral.map(([y,p])=>[y*amount,p])]));targetHeight=.235+.008*Math.sin(t*1.4);}
 else if(t>=78&&t<85){weight=ease((t-78)/2.5)*(1-ease((t-82.5)/2.5));target=extended;targetHeight=1.08;}
 else if(t>=85&&t<99){weight=ease((t-85)/5)*(1-ease((t-94)/5));target=Object.fromEntries(limbs.map(l=>[l.id,spiral]));targetHeight=.235;}
 else if(t>=118&&t<152){weight=ease((t-118)/6)*(1-ease((t-150)/2));const amount=ease((t-124)/10)*(1-ease((t-141)/9));target={...extended,'01':wrap.map(([y,p])=>[y*amount,p*amount])};targetHeight=1.08;targetYaw=-frame.heading;}
 if(target&&weight>0){for(const l of limbs)poses[l.id]=blend(poses[l.id],target[l.id],weight);body[0]*=1-weight;body[1]=mix(body[1],targetHeight,weight);body[2]*=1-weight;rotation[0]*=1-weight;rotation[1]+=angle(targetYaw-rotation[1])*weight;rotation[2]*=1-weight;
  // Keep the underside clear while a curled shape unfolds through the standing one.
  const cx=Math.cos(rotation[0]),sx=Math.sin(rotation[0]),cy=Math.cos(rotation[1]),sy=Math.sin(rotation[1]),cz=Math.cos(rotation[2]),sz=Math.sin(rotation[2]);let requiredHeight=0;
  for(const l of limbs)for(const [i,p] of forward(poses[l.id]).points.entries()){const mount=rotate(p[0],p[2],l.angle-Math.PI/2),x=mount[0]+Math.sin(l.angle)*.7,z=mount[1]+Math.cos(l.angle)*.7,y=p[1],rx=cz*x-sz*y,ry=sz*x+cz*y,rz=-sy*rx+cy*z;requiredHeight=Math.max(requiredHeight,.175-.085*i/22-(cx*ry-sx*rz));}
  body[1]=Math.max(body[1],requiredHeight);
 }
 const state=applyPose(root,t,'story',{pose:{...base,poses,bodyPosition:body,bodyRotation:rotation,phase:frame.chapter.title+' · '+frame.speed_m_s.toFixed(2)+' m/s'}});
 return {...state,story:frame,morph_weight:weight,contact_lock:weight===0,pole:STORY.pole};
}

// Keep 09-tai's core level while the shell rolls through its accumulated world arc.
export function applyStoryLure(carrier,rig,frame,T){
 carrier.position.fromArray(frame.lure.position);carrier.updateMatrixWorld(true);rig.shell.quaternion.fromArray(frame.lure.rotation);
 const yaw=Math.atan2(frame.position[0]-frame.lure.position[0],frame.position[2]-frame.lure.position[2]);
 rig.pose({time:frame.time,eyeQuaternion:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw).toArray()});
}
