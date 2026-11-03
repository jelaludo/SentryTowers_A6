// Original kinematic study. Metres, +Y up, +Z forward. No baked engine pivots.
export const UPPER=1.15, BASE_LOWER=1.85, MAX_LOWER=2.43;
export const legs=Array.from({length:6},(_,i)=>({id:String(i+1).padStart(2,'0'),angle:i*Math.PI/3,tripod:i%2}));
export const motions={
  idle:{name:'Observation_Idle',duration_s:6,loop:true},
  walk:{name:'Tripod_Walk_Cycle',duration_s:3,loop:true,speed_m_s:.30},
  extend:{name:'Reach_Cycle',duration_s:8,loop:true},
  anchor:{name:'Anchor_Deploy',duration_s:8,loop:false}
};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const refs=new WeakMap();
function nodes(root){if(!refs.has(root)){const map={};root.traverse(o=>map[o.name]=o);refs.set(root,map);}return refs.get(root);}
export function applyPose(root,time=0,mode='idle',extension=0){
  const n=nodes(root),body=n.BODY_HEAVE;
  if(!body||root.getObjectByName('DISTANCE_GEOMETRY'))return {phase:'Static observation pose',contacts:6,extension:0};
  const spec=motions[mode]||motions.idle,t=spec.loop?((time%spec.duration_s)+spec.duration_s)%spec.duration_s:clamp(time,0,spec.duration_s);
  let reach=clamp(extension),height=1.42,anchor=0;
  if(mode==='idle')height+=.018*Math.sin(t*Math.PI/3);
  if(mode==='walk')height+=.018*Math.cos(t*Math.PI*4/3);
  if(mode==='extend')reach=Math.max(reach,(1-Math.cos(t*Math.PI/4))*.5);
  if(mode==='anchor'){reach=Math.max(reach,smooth(t/2)*.65);anchor=smooth((t-2)/2);height-=.36*smooth((t-4)/2);}
  height+=reach*.12;body.position.y=height;
  let contacts=0;const feet=[];
  for(const leg of legs){
    const pre='LEG_'+leg.id,radial=3.26+reach*.61;
    let fx=Math.sin(leg.angle)*radial,fz=Math.cos(leg.angle)*radial,lift=0,stance=true;
    if(mode==='walk'){
      const p=(t/3+leg.tripod*.5)%1,duty=.65,stride=.30*3*duty;
      if(p<duty)fz+=stride*(.5-p/duty);
      else{stance=false;const u=(p-duty)/(1-duty);fz+=stride*(-.5+smooth(u));lift=.34*Math.sin(Math.PI*u)**2;}
    }
    // A yawing hip and analytic two-link solve, with a rigid sliding inner shaft.
    const mx=Math.sin(leg.angle)*.62,mz=Math.cos(leg.angle)*.62;
    const dx=fx-mx,dz=fz-mz,r=Math.hypot(dx,dz)-.36,dy=.16+lift-height;
    const lower=BASE_LOWER+(MAX_LOWER-BASE_LOWER)*reach;
    const d=Math.hypot(r,dy),q=Math.atan2(dy,r)+Math.acos(clamp((UPPER*UPPER+d*d-lower*lower)/(2*UPPER*d),-1,1));
    const beta=Math.atan2(dy-UPPER*Math.sin(q),r-UPPER*Math.cos(q));
    n[pre+'_YAW'].rotation.set(0,Math.atan2(-dz,dx),0);
    n[pre+'_HIP'].rotation.set(0,0,q);
    n[pre+'_KNEE'].rotation.set(0,0,beta-q);
    n[pre+'_SLIDE'].position.x=lower-.35;
    n[pre+'_ANKLE'].rotation.set(0,0,-beta);
    for(let j=0;j<3;j++)n[pre+'_CLAW_'+(j+1)].rotation.set(0,(j-1)*.7,.55*(1-anchor)+.22*clamp(lift/.34));
    if(stance)contacts++;
    feet.push({id:leg.id,lift,stroke_m:lower-BASE_LOWER,stance,target:[fx,lift,fz]});
  }
  root.updateMatrixWorld(true);
  return {phase:mode==='anchor'?(t<2?'Widen support':t<4?'Deploy ground claws':t<6?'Lower and brace':'Anchored / six-point hold'):mode==='extend'?'Carbon sleeve / hydraulic extension':mode==='walk'?'Alternating tripod / 0.30 m/s':'Observation / pressure regulation',contacts,extension:reach,anchor,feet};
}
