// AUREL-03: engine-driven assembly. Radians, metres, +Y up / +Z forward.
import {JOINTS as HAND_AXES, POSES as HAND_POSES} from '../hand-lab/runtime.js';
import {BIPED_REST} from '../hand-lab/biped.js';
import {JOINTS as FOOT_AXES, POSES as FOOT_POSES} from '../foot-lab/runtime.js';
export const DIM=Object.freeze({height:1.80,headHeight:.230,hipY:.945,hipX:.090,thigh:.420,shin:.385,ankleY:.140,shoulderY:1.475,shoulderX:.190,upperArm:.300,forearm:.255,handScale:.82,footScale:1,chestWidth:.306});
export const PARTS=['PELVIS','RIBCAGE','ARM_L','ARM_R','LEG_L','LEG_R','HAND_L','HAND_R','FOOT_L','FOOT_R','HEAD'];
export const MOTIONS={assembly:{name:'Anatomy_Assembly_Cycle',duration_s:20,loop:true},inspection:{name:'Anatomy_Articulation_Cycle',duration_s:12,loop:true}};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const ease=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
export function assemblySpread(t){return t<2?1:t<14?1-ease((t-2)/12):t<17?0:ease((t-17)/3);}
export const EXPLODE={PELVIS:[0,0,0],RIBCAGE:[0,.15,0],HEAD:[0,.34,0],ARM_L:[.28,.10,0],ARM_R:[-.28,.10,0],HAND_L:[.28,-.11,0],HAND_R:[-.28,-.11,0],LEG_L:[.10,-.15,0],LEG_R:[-.10,-.15,0],FOOT_L:[.10,-.30,.12],FOOT_R:[-.10,-.30,.12]};
export function createRig(scene){
 const nodes={};scene.traverse(n=>{if(n.name)nodes[n.name]=n;});
 const frame=nodes.AUREL_03_ROOT,staticTier=!!frame?.userData.static;
 const rest=new Map();scene.traverse(n=>{rest.set(n,{p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone()});});
 const rotate=(name,axis,v)=>{if(nodes[name])nodes[name].rotation[axis]=v;};
 const rig={nodes,static:staticTier,pose({spread=0,articulation=0,time=0,openHands=0}={}){
  if(staticTier)return {static:true};
  for(const[n,r]of rest){n.position.copy(r.p);n.quaternion.copy(r.q);n.scale.copy(r.s);}
  for(const id of PARTS){const n=nodes['PART_'+id];if(n){const d=EXPLODE[id];n.position.x+=d[0]*spread;n.position.y+=d[1]*spread;n.position.z+=d[2]*spread;}}
  const a=articulation*Math.sin(Math.PI*((time%12)/12))**2;
  rotate('RIBCAGE_SPINE','y',.12*a);rotate('HEAD_YAW','y',-.25*a);rotate('HEAD_PITCH','x',.10*a);
  rotate('LEG_R_HIP','x',-.45*a);rotate('LEG_R_KNEE','x',.90*a);rotate('LEG_R_ANKLE','x',-.45*a);
  for(const side of ['L','R']){
   const s=side==='L'?1:-1;rotate('ARM_'+side+'_SHOULDER','z',s*.075);rotate('ARM_'+side+'_SHOULDER','x',-.55*a);rotate('ARM_'+side+'_ELBOW','x',-.09-1.05*a);
   for(const j of HAND_AXES){const v=(BIPED_REST[j.name]||0)*(1-openHands)+(HAND_POSES.open[j.name]||0)*openHands;rotate('HAND_'+side+'_'+j.name,j.axis,v*(side==='R'&&j.axis!=='x'?-1:1));}
   for(const j of FOOT_AXES)rotate('FOOT_'+side+'_'+j.name,j.axis,(FOOT_POSES.plant[j.name]||0)*(side==='R'&&j.axis!=='x'?-1:1));
  }
  scene.updateMatrixWorld(true);scene.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});return {static:false};
 }};return rig;
}
