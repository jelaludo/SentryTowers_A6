// NISOKU-03 / original Isao humanoid kinematics. Metres, +Y up, +Z forward.
import {JOINTS as HAND_JOINTS,POSES as HAND_POSES,controlsPose as handPose} from '../hand-lab/runtime.js';
import {BIPED_REST as HAND_REST} from '../hand-lab/biped.js';
import {JOINTS as FOOT_JOINTS,POSES as FOOT_POSES,blend as blendFoot} from '../foot-lab/runtime.js';
export {HAND_JOINTS,FOOT_JOINTS,HAND_REST};
export const DIM={pelvisY:.965,hipX:.108,thigh:.395,shin:.405,ankleY:.165,footScale:1.15,shoulderX:.225,shoulderY:1.49,upperArm:.29,forearm:.265};
export const MOTIONS={
 neutral:{name:'Neutral_Review_Idle',label:'Neutral / review',duration_s:5,loop:true},
 idle:{name:'Quiet_Standby_Idle',label:'Standby',duration_s:5,loop:true},
 walk:{name:'Balanced_Walk_Cycle',label:'Walk',duration_s:1.8,loop:true,speed_mps:.38,duty_factor:.65},
 greet:{name:'Open_Hand_Greeting',label:'Greet',duration_s:6,loop:true},
 inspect:{name:'Precision_Inspection',label:'Inspect',duration_s:8,loop:true},
 crouch:{name:'Service_Crouch_Cycle',label:'Crouch',duration_s:7,loop:true},
 agility:{name:'Prehensile_Toe_Agility',label:'Toe agility',duration_s:8,loop:true},
 rail:{name:'AUREL_Foot_Rail_Grasp',label:'Rail grasp',duration_s:14,loop:true}
};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x))},mix=(a,b,t)=>a+(b-a)*t;
const pulse=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
const blendHand=(a,b,t)=>Object.fromEntries(HAND_JOINTS.map(j=>[j.name,mix(a[j.name]||0,b[j.name]||0,t)]));
export const handMountRotation=side=>[Math.sin((side==='L'?-1:1)*Math.PI/4),0,Math.cos(Math.PI/4),0];
export function sampleMotion(time,mode='idle'){
 const m=MOTIONS[mode]||MOTIONS.idle,t=((time%m.duration_s)+m.duration_s)%m.duration_s,u=t/m.duration_s,w=u*Math.PI*2;
 const p={mode,time:t,phase:m.label,body:{x:0,dy:-.008,chest:0,headYaw:0,headPitch:0},arms:{L:[.035,0],R:[.035,0]},hands:{L:{...HAND_REST},R:{...HAND_REST}},handYaw:{L:-Math.PI/2,R:Math.PI/2},feet:{L:{x:DIM.hipX,y:DIM.ankleY,z:0,pitch:0,pose:{...FOOT_POSES.plant}},R:{x:-DIM.hipX,y:DIM.ankleY,z:0,pitch:0,pose:{...FOOT_POSES.plant}}}};
 if(mode==='neutral'){p.arms.L=p.arms.R=[0,-.035];p.armSpread=.18;for(const side of ['L','R']){p.feet[side].x=(side==='L'?1:-1)*.155;p.feet[side].pose.HALLUX_OPPOSITION=-.92;}p.phase='Neutral / arms clear';}
 if(mode==='idle'){p.body.dy+=.0015*Math.sin(w);p.body.chest=.008*Math.sin(w);p.body.headYaw=.09*Math.sin(w);}
 if(mode==='walk'){
  p.body.dy=-.05+.007*Math.cos(2*w);p.body.x=.018*Math.sin(w);p.body.chest=.025;
  for(const side of ['L','R']){
   const q=(u+(side==='L'?0:.5))%1,extent=m.speed_mps*m.duration_s*m.duty_factor,foot=p.feet[side];
   if(q<m.duty_factor)foot.z=extent/2-m.speed_mps*m.duration_s*q;
   else{const v=(q-m.duty_factor)/(1-m.duty_factor);foot.z=mix(-extent/2,extent/2,smooth(v))-m.speed_mps*m.duration_s*(1-m.duty_factor)*v*(1-v)*(1-2*v);foot.y+=.085*Math.sin(Math.PI*v)**2;const c=.22*Math.sin(Math.PI*v)**2;for(const j of FOOT_JOINTS)if(j.name.endsWith('_PIP')||j.name.endsWith('_DIP'))foot.pose[j.name]=c;}
   p.arms[side]=[.035+.21*Math.cos(q*Math.PI*2),-.06-.06*Math.max(0,-Math.cos(q*Math.PI*2))];
  }
 }
 if(mode==='greet'){
  const e=pulse(t,.4,1.7,4.4,5.8);p.arms.R=[-1.05*e,-1.0*e];p.hands.R=blendHand(HAND_REST,HAND_POSES.open,e);p.hands.R.WRIST_DEVIATION=.20*Math.sin(w*3)*e;p.handYaw.R=Math.PI/2*(1-e);p.body.headYaw=-.12*e;
 }
 if(mode==='inspect'){
  const e=pulse(t,.4,2.2,5.8,7.7);p.arms.R=[-.62*e,-1.05*e];p.hands.R=blendHand(HAND_REST,HAND_POSES.pinch,e);p.handYaw.R=Math.PI/2*(1-e);p.body.headPitch=.16*e;p.body.headYaw=-.12*e;
 }
 if(mode==='crouch'){
  const e=pulse(t,.4,2.5,4.5,6.8);p.body.dy-=.24*e;p.body.chest=.15*e;p.arms.L=p.arms.R=[-.42*e,-.30*e];p.phase=t<2.5?'Lower / balance':t<4.5?'Service height':'Rise / settle';
 }
 if(mode==='agility'){
  const e=Math.sin(Math.PI*u)**2;p.body.x=.055*e;p.feet.R.y+=.14*e;p.feet.R.z=.06*e;
  for(const [i,id]of ['TOE_02','TOE_03','TOE_04','TOE_05'].entries()){const c=(.5-.5*Math.cos(w*2-i*.8))*e;p.feet.R.pose[id+'_MTP']=.45*c;p.feet.R.pose[id+'_PIP']=.8*c;p.feet.R.pose[id+'_DIP']=.6*c;}
  p.feet.R.pose.HALLUX_OPPOSITION=-.55-1.8*e;p.feet.R.pose.HALLUX_MTP=.4*e;p.feet.R.pose.HALLUX_IP=.5*e;
 }
 if(mode==='rail'){
  p.fixture='pipe';p.body.x=.055*pulse(t,0,.7,13.2,14);const f=p.feet.R;
  const lift=t<3.3?.21*smooth((t-.6)/1.2):t<4.2?mix(.21,.132*DIM.footScale,smooth((t-3.3)/.9)):t<10?.132*DIM.footScale:t<10.8?mix(.132*DIM.footScale,.21,smooth((t-10)/.8)):.21*(1-smooth((t-12)/1.5));
  f.y+=lift;f.z=.18*pulse(t,1.8,3.3,10.8,12);const grip=pulse(t,4.2,5.8,8.5,10);const approach={...FOOT_POSES.plant,HALLUX_OPPOSITION:mix(FOOT_POSES.plant.HALLUX_OPPOSITION,FOOT_POSES.rail.HALLUX_OPPOSITION,pulse(t,1.5,3.2,11.2,12.6))};f.pose=blendFoot(approach,FOOT_POSES.rail,grip);
  p.phase=t<1.8?'Shift weight / lift':t<4.2?'Reach / set sole':t<5.8?'Wrap / oppose':t<8.5?'Hold the rail':t<10?'Release':t<12?'Lift / retreat':'Set down / settle';
 }
 return p;
}
const rigs=new WeakMap();
export function createRig(root){
 if(rigs.has(root))return rigs.get(root);const nodes={};root.traverse(o=>{if(o.name)nodes[o.name]=o});const frame=nodes.NISOKU_03_ROOT||root,staticTier=frame.userData.static;
 const vector=(x=0,y=0,z=0)=>root.position.clone().set(x,y,z),quat=()=>root.quaternion.clone().identity(),down=vector(0,-1,0);
 function solve(side,target){
  const hip=nodes['HIP_'+side],knee=nodes['KNEE_'+side],ankle=nodes['ANKLE_'+side];frame.updateMatrixWorld(true);
  const origin=hip.getWorldPosition(vector()),end=frame.localToWorld(vector(target.x,target.y,target.z)),delta=end.clone().sub(origin),distance=delta.length(),scale=frame.getWorldScale(vector()).x,a=DIM.thigh*scale,b=DIM.shin*scale,d=Math.min(distance,a+b-.000001),axis=delta.clone().normalize(),pole=vector(0,0,1).applyQuaternion(frame.getWorldQuaternion(quat()));pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const along=(a*a-b*b+d*d)/(2*d),bend=origin.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,a*a-along*along)));
  const upper=quat().setFromUnitVectors(down,bend.clone().sub(origin).normalize()),lower=quat().setFromUnitVectors(down,end.clone().sub(bend).normalize());
  hip.quaternion.copy(hip.parent.getWorldQuaternion(quat()).invert().multiply(upper));knee.quaternion.copy(upper.clone().invert().multiply(lower));
  const desired=frame.getWorldQuaternion(quat()).multiply(quat().setFromAxisAngle(vector(1,0,0),target.pitch||0));ankle.quaternion.copy(lower.clone().invert().multiply(desired));
  return Math.max(0,distance-a-b);
 }
 const rig={root,frame,nodes,static:staticTier,pose(p=sampleMotion(0)){
  if(staticTier)return {static:true};nodes.PELVIS.position.set(p.body.x,DIM.pelvisY+p.body.dy,0);nodes.PELVIS.quaternion.identity();nodes.WAIST.rotation.set(p.body.chest*.4,0,0);nodes.CHEST.rotation.set(p.body.chest*.6,0,0);nodes.HEAD.rotation.set(p.body.headPitch,p.body.headYaw,0);
  for(const side of ['L','R']){
   nodes['SHOULDER_'+side].rotation.set(p.arms[side][0],0,(side==='L'?1:-1)*(p.armSpread??.025));nodes['ELBOW_'+side].rotation.set(p.arms[side][1],0,0);nodes['WRIST_'+side].quaternion.identity();
   const yaw=p.handYaw[side];nodes['HAND_'+side+'_ROOT'].quaternion.set(Math.sin(yaw/2),0,Math.cos(yaw/2),0);
   for(const [kind,joints,angles]of [['HAND',HAND_JOINTS,p.hands[side]],['FOOT',FOOT_JOINTS,p.feet[side].pose]])for(const j of joints){const n=nodes[`${kind}_${side}_${j.name}`],value=clamp(angles[j.name]??0,j.min,j.max);n.rotation[j.axis]=value*(side==='R'&&j.axis!=='x'?-1:1);}
  }
  const reachError=Math.max(solve('L',p.feet.L),solve('R',p.feet.R));root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});return {static:false,reachError,phase:p.phase};
 }};rigs.set(root,rig);return rig;
}
export const PIPE_FIXTURE={center:[-DIM.hipX,.004+.110*DIM.footScale,.073*DIM.footScale+.18+.037*DIM.footScale],radius:.027*DIM.footScale,length:.29*DIM.footScale};
