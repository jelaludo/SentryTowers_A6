// Metres, +Y up, +Z forward. Engine-driven joint adapter; no baked clips.
export const STANDARD={pallet_m:[1.2,.16,1],lock_pitch_m:[1.06,.86],upper_m:.30,lower_m:.34,wheel_radius_m:.205};
export const STATIONS=[{id:'FL',side:-1,end:1},{id:'FR',side:1,end:1},{id:'RL',side:-1,end:-1},{id:'RR',side:1,end:-1}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cache=new WeakMap();
function nodes(root){if(!cache.has(root)){const m={};root.traverse(o=>m[o.name]=o);cache.set(root,m);}return cache.get(root);}
export function applyStride(root,{height=.68,steer=0,travel=0,lock=1}={}){
 if(root.userData.static)return;
 const m=nodes(root),body=m.CHASSIS_HEAVE;if(!body)return;
 body.position.y=clamp(height,.60,.76);
 for(const {id,side,end} of STATIONS){
  // Analytic two-link suspension keeps all four wheel centres on the ground.
  const dx=side*.30,dy=STANDARD.wheel_radius_m-(body.position.y-.055),a=STANDARD.upper_m,b=STANDARD.lower_m;
  const d=Math.hypot(dx,dy),base=Math.atan2(dx,-dy),alpha=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));
  const hip=base+side*alpha;
  const ux=a*Math.sin(hip),uy=-a*Math.cos(hip),lower=Math.atan2(dx-ux,-(dy-uy));
  m['LEG_'+id+'_HIP_PITCH'].rotation.z=hip;
  m['LEG_'+id+'_KNEE_PITCH'].rotation.z=lower-hip;
  m['LEG_'+id+'_ANKLE_ROLL'].rotation.z=-lower;
  m['WHEEL_'+id+'_YAW'].rotation.y=clamp(steer,-.6,.6)*end;
  m['WHEEL_'+id+'_ROLL'].rotation.x=travel/STANDARD.wheel_radius_m;
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
 return {z,travel:z+1.7,height:.68,lock:1,phase:t<2?'A · pallet secured':t<8?'A → B · transporting':t<12?'B · delivery hold':t<18?'B → A · return':'A · arrival hold'};
}
