// Metres, +Y up, +Z forward. Engine-driven joint adapter; no baked clips.
export const STANDARD={pallet_m:[1.2,.16,1],lock_pitch_m:[1.06,.86],upper_m:.30,lower_m:.34,wheel_radius_m:.205};
export const STATIONS=[{id:'FL',side:-1,end:1},{id:'FR',side:1,end:1},{id:'RL',side:-1,end:-1},{id:'RR',side:1,end:-1}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cache=new WeakMap();
function nodes(root){if(!cache.has(root)){const m={};root.traverse(o=>m[o.name]=o);cache.set(root,m);}return cache.get(root);}
export const STRIDE={splay_deg:45,radial_reach_m:.43,kingpin_height_m:.10,stroke_m:[-.035,.035]};
export const CUP={upper_m:.64,fore_m:.60,shoulder_y:.60,lip_offset_m:.22,crate_height_m:.36,duration_s:24};
export function applyStride(root,{height=.68,steer=null,headings={},travel=0,wheelTravel={},suspension={},lock=1}={}){
 if(root.userData.static)return;
 const m=nodes(root),body=m.CHASSIS_HEAVE;if(!body)return;
 body.position.y=clamp(height,.60,.76);
 for(const {id,side,end} of STATIONS){
  // Analytic two-link suspension keeps all four wheel centres on the ground.
  const splay=-side*end*Math.PI/4;
  m['LEG_'+id+'_SPLAY_YAW'].rotation.y=splay;
  const stroke=clamp(suspension[id]??0,...STRIDE.stroke_m);
  const dx=side*STRIDE.radial_reach_m,dy=STANDARD.wheel_radius_m+STRIDE.kingpin_height_m-(body.position.y-.055),a=STANDARD.upper_m,b=STANDARD.lower_m+stroke;
  const d=Math.hypot(dx,dy),base=Math.atan2(dx,-dy),alpha=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));
  const hip=base+side*alpha;
  const ux=a*Math.sin(hip),uy=-a*Math.cos(hip),lower=Math.atan2(dx-ux,-(dy-uy));
  m['LEG_'+id+'_HIP_PITCH'].rotation.z=hip;
  m['LEG_'+id+'_KNEE_PITCH'].rotation.z=lower-hip;
  m['LEG_'+id+'_SUSPENSION_EXTEND'].position.y=-b;
  m['LEG_'+id+'_ANKLE_ROLL'].rotation.z=-lower;
  const heading=headings[id]??steer??side*end*Math.PI/4;
  m['WHEEL_'+id+'_YAW'].rotation.y=heading-splay;
  m['WHEEL_'+id+'_ROLL'].rotation.x=(wheelTravel[id]??travel)/STANDARD.wheel_radius_m;
  m['LOCK_'+id+'_YAW'].rotation.y=clamp(lock,0,1)*Math.PI/2;
 }
 root.updateMatrixWorld(true);
}
// A closed 20-second A-to-B-and-return demonstration. Smooth motion is
// kinematic, not route planning or a load-rated physical simulation.
export function transportPose(time){
 const t=((time%20)+20)%20;
 const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
 const z=t<2?-1.7:t<8?-1.7+3.4*smooth((t-2)/6):t<12?1.7:t<18?1.7-3.4*smooth((t-12)/6):-1.7;
 return {x:0,z,travel:z+1.7,steer:0,height:.68,lock:1,phase:t<2?'A · pallet secured':t<8?'A → B · transporting':t<12?'B · delivery hold':t<18?'B → A · return':'A · arrival hold'};
}
export function strideStudy(time,mode='transport'){
 const p=transportPose(time);
 if(mode==='crab')return {...p,x:p.z,z:0,steer:Math.PI/2,phase:'Crab travel · body heading held'};
 if(mode==='diagonal')return {...p,x:p.z/Math.SQRT2,z:p.z/Math.SQRT2,steer:Math.PI/4,phase:'Diagonal travel · 45° heading'};
 if(mode==='rotate'){
  const yaw=time/20*Math.PI*2,headings={},wheelTravel={};
  for(const {id,side,end} of STATIONS){const x=side*(.59+.43/Math.SQRT2),z=end*(.4+.43/Math.SQRT2);headings[id]=Math.atan2(z,-x);wheelTravel[id]=Math.hypot(x,z)*yaw;}
  return {x:0,z:0,yaw,headings,wheelTravel,height:.68,phase:'Turn on the spot · four tangent wheel headings'};
 }
 if(mode==='suspension'){const suspension={};STATIONS.forEach(({id},i)=>suspension[id]=.03*Math.sin(time*Math.PI/3+i*Math.PI/2));return {x:0,z:0,height:.68+.025*Math.sin(time*Math.PI/3),suspension,phase:'Independent sleeve compression · 70 mm total stroke'};}
 return p;
}
export function applyCup(root,{target=[.65,.82,.8],vacuum=0,travel=0}={}){
 if(root.userData.static)return;
 const n=nodes(root),yawNode=n.CUP_BASE_YAW;if(!yawNode)return;
 const seal=clamp(vacuum,0,1),scale=1-.18*seal,offset=.10+.12*scale;
 const r=Math.hypot(target[0],target[2]),dy=target[1]+offset-CUP.shoulder_y,d=Math.hypot(r,dy),a=CUP.upper_m,b=CUP.fore_m;
 if(d>a+b-1e-5||d<Math.abs(a-b)+1e-5)throw new RangeError('CUP target outside articulated reach');
 const yaw=Math.atan2(target[0],target[2]),alpha=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1)),shoulder=Math.atan2(r,dy)-alpha;
 const fore=Math.atan2(r-a*Math.sin(shoulder),dy-a*Math.cos(shoulder));
 yawNode.rotation.y=yaw;n.CUP_SHOULDER_PITCH.rotation.x=shoulder;n.CUP_ELBOW_PITCH.rotation.x=fore-shoulder;
 // Cancel both boom pitch and base yaw: the spreader and cargo stay level and square.
 const sx=Math.sin(-fore/2),cx=Math.cos(-fore/2),sy=Math.sin(-yaw/2),cy=Math.cos(-yaw/2);
 n.CUP_WRIST_LEVEL.quaternion.set(sx*cy,cx*sy,sx*sy,cx*cy);
 n.SOCKET_CARGO_GRIP.position.y=-offset;
 for(const {id} of STATIONS){n['CUP_PAD_'+id+'_COMPRESS'].scale.y=scale;n['CUP_WHEEL_'+id+'_ROLL'].rotation.x=travel/.18;}
 root.updateMatrixWorld(true);
 return {target:[...target],vacuum:seal,offset,reach_m:d};
}
export function cupTransferPose(time){
 const t=((time%24)+24)%24,reverse=t>=12,u=t%12,from=reverse?-1:1,to=-from;
 const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);},mix=(a,b,t)=>a+(b-a)*smooth(t);
 const angle=Math.atan2(.65,.8),radius=Math.hypot(.65,.8);
 let heading=from*angle,y=.82,vacuum=0,attached=false,placed=false,phase='Approach';
 if(u<1)phase='Hover above source';
 else if(u<2){y=mix(.82,.52,u-1);phase='Lower four suction cups';}
 else if(u<3){y=.52;vacuum=smooth(u-2);phase='Seal and establish suction';}
 else if(u<4.5){y=mix(.52,.94,(u-3)/1.5);vacuum=1;attached=true;phase='Lift secured crate';}
 else if(u<7.5){y=.94;heading=mix(from*angle,to*angle,(u-4.5)/3);vacuum=1;attached=true;phase='Transfer · level load';}
 else if(u<9){y=mix(.94,.52,(u-7.5)/1.5);heading=to*angle;vacuum=1;attached=true;phase='Lower onto destination pallet';}
 else if(u<10){y=.52;heading=to*angle;vacuum=1-smooth(u-9);placed=true;phase='Supported · release suction';}
 else{heading=to*angle;y=mix(.52,.82,u-10);placed=true;phase='Retract clear of crate';}
 const target=[Math.sin(heading)*radius,y,Math.cos(heading)*radius];
 const crate=attached?[target[0],y-.36,target[2]]:[(placed?to:from)*.65,.16,.8];
 return {target,crate,vacuum,attached,phase:(reverse?'B → A · ':'A → B · ')+phase};
}
