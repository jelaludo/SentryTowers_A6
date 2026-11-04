// Optional engine-driven fingers. The five original C08 body clips are unchanged.
import {JOINTS, POSES, controlsPose} from '../../hand-lab/runtime.js';
import {BIPED_REST} from '../../hand-lab/biped.js';
export {JOINTS, BIPED_REST};
export const HAND_SCALE=1.3;
export const HAND_MOUNT_OFFSET=[0,.045,0];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const mixPose=(a,b,t)=>Object.fromEntries(JOINTS.map(j=>[j.name,(a[j.name]||0)*(1-t)+(b[j.name]||0)*t]));
export function sampleHands(clip,time,mode='auto'){
 const p={L:{...BIPED_REST},R:{...BIPED_REST}};
 if(mode!=='auto')return {L:{...(mode==='rest'?BIPED_REST:POSES[mode]||BIPED_REST)},R:{...(mode==='rest'?BIPED_REST:POSES[mode]||BIPED_REST)}};
 if(clip==='Carry_Walk_Cycle')for(const side of ['L','R'])p[side]=controlsPose({curl:.42,opposition:.45,spread:.10});
 if(clip==='Work_Inspect')p.R=mixPose(BIPED_REST,POSES.open,smooth((time-.35)/1.45)*(1-smooth((time-3)/1.7)));
 return p;
}
export function applyHandPose(root,poses){
 if(root.getObjectByName('AUREL_R_AUREL_01_ROOT')?.userData.static)return;
 for(const side of ['L','R'])for(const j of JOINTS){
  const node=root.getObjectByName(`AUREL_${side}_${j.name}`);if(!node)continue;
  const v=Math.max(j.min,Math.min(j.max,poses[side]?.[j.name]??0));
  // Reflect X coordinates: rotations around Y/Z change sign, X does not.
  node.rotation[j.axis]=v*(side==='L'&&j.axis!=='x'?-1:1);
 }
 root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});
}
