// STRIDE-02: engine-driven pallet, original STRIDE-01 rigid leg surfaces.
// Metres, +Y up, +Z forward. fold 0=deployed, 1=stowed.
export const STATIONS=[{id:'FL',side:-1,end:1},{id:'FR',side:1,end:1},{id:'RL',side:-1,end:-1},{id:'RR',side:1,end:-1}];
export const SPEC={footprint_m:[1.2,1],packed_height_m:.44,deployed_deck_m:.83,upper_m:.30,lower_m:.34,wheel_radius_m:.205,duration_s:12};
const clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const stage=(x,a,b)=>ease((x-a)/(b-a)),lerp=(a,b,u)=>a+(b-a)*u;
const cache=new WeakMap();function nodes(root){if(!cache.has(root)){const n={};root.traverse(o=>n[o.name]=o);cache.set(root,n);}return cache.get(root);}
export function foldPose(fold){
 const f=clamp(fold),support=stage(f,0,.13),roll=stage(f,.15,.31),flat=stage(f,.32,.46),curl=stage(f,.47,.63),slide=stage(f,.65,.81),settle=stage(f,.83,1);
 return{fold:f,support,roll,flat,curl,slide,settle,deck:lerp(.83,.44,settle)+.035*Math.sin(Math.PI*roll),phase:f===0?'Drive ready · original STRIDE legs':f<.15?'Plant parking supports':f<.32?'Lift the four leg assemblies':f<.47?'Turn the wheels flat':f<.65?'Fold links into horizontal cassettes':f<.83?'Draw the cassettes under the pallet':f<1?'Settle onto the pallet base':'Stowed · everything within the pallet'};
}
export function applyStride02(root,{fold=0,steer=0,travel=0}={}){
 if(root.userData.static)return foldPose(root.userData.configuration==='stowed'?1:0);
 const n=nodes(root),p=foldPose(fold);n.PALLET_LIFT.position.y=p.deck;
 // Each support is three constant-length telescoping sections. No scaled rods.
 const extension=(p.deck-SPEC.packed_height_m)*p.support;
 for(const {id,side,end}of STATIONS){
  const suffix='LEG_'+id+'_';
  n['PARK_'+id+'_SLIDE_1'].position.y=-extension/3;n['PARK_'+id+'_SLIDE_2'].position.y=-extension/3;n['PARK_'+id+'_SLIDE_3'].position.y=-extension/3;
  n[suffix+'CARRIAGE'].position.x=side*lerp(.53,.13,p.slide);
  n[suffix+'SPLAY_YAW'].position.y=-.14-.035*Math.sin(Math.PI*p.roll);
  n[suffix+'SPLAY_YAW'].rotation.y=-side*end*Math.PI/4*(1-p.curl);
  n[suffix+'PACK_ROLL'].rotation.x=end*Math.PI/2*p.roll;
  const dx=side*.43,dy=.305-(SPEC.deployed_deck_m-.14),a=SPEC.upper_m,b=SPEC.lower_m,d=Math.hypot(dx,dy),alpha=Math.acos((a*a+d*d-b*b)/(2*a*d));
  const openHip=Math.atan2(dx,-dy)+side*alpha,ux=a*Math.sin(openHip),uy=-a*Math.cos(openHip),openLower=Math.atan2(dx-ux,-(dy-uy));
  // Horizontal folded IK: hip (±.13, ±.38), ankle (±.44, ±.25).
  const fx=.31,fz=.13,fd=Math.hypot(fx,fz),fa=Math.acos((a*a+fd*fd-b*b)/(2*a*fd));
  const closedHip=side*(Math.atan2(fx,fz)-fa),cx=a*Math.sin(closedHip),cz=-a*Math.cos(closedHip),closedLower=Math.atan2(side*fx-cx,-(-fz-cz));
  const hip=lerp(openHip,closedHip,p.curl),lower=lerp(openLower,closedLower,p.curl);
  n[suffix+'HIP_PITCH'].rotation.z=hip;n[suffix+'KNEE_PITCH'].rotation.z=lower-hip;n[suffix+'SUSPENSION_EXTEND'].position.y=-b;
  // The ankle gimbal cancels the cassette orientation to keep the wheel plane controlled.
  const q=n[suffix+'SPLAY_YAW'].quaternion.clone().multiply(n[suffix+'PACK_ROLL'].quaternion).multiply(n[suffix+'HIP_PITCH'].quaternion).multiply(n[suffix+'KNEE_PITCH'].quaternion);
  n[suffix+'ANKLE_ROLL'].quaternion.copy(q.invert());
  const hinge=n['WHEEL_'+id+'_PACK_HINGE'];hinge.position.set(side*lerp(-.13,.13,p.flat),lerp(.13,-.04,p.flat),0);hinge.rotation.z=-side*Math.PI/2*p.flat;
  n['WHEEL_'+id+'_YAW'].rotation.y=steer*(1-p.roll);
  n['WHEEL_'+id+'_ROLL'].rotation.x=travel/SPEC.wheel_radius_m;
  // Two nested rigid guides make the packing translation legible.
  n['WHEEL_'+id+'_GUIDE_SLIDE'].position.x=side*.26*p.flat;
  n['WHEEL_'+id+'_PACK_ROD'].position.copy(hinge.position);
 }
 root.updateMatrixWorld(true);return p;
}
export function studyPose(time,mode='cycle'){
 const t=Math.max(0,Math.min(mode==='cycle'?28:12,time));
 const fold=mode==='retract'?ease(t/12):mode==='deploy'?1-ease(t/12):t<2?0:t<14?ease((t-2)/12):t<16?1:1-ease((t-16)/12);
 return{fold,time:t,duration:mode==='cycle'?28:12,phase:foldPose(fold).phase};
}
