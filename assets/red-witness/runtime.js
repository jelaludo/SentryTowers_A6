// Engine-driven rigid joint study. No baked clips, muscle deformation or locomotion.
export const JOINTS=['PELVIS','SPINE','CHEST','NECK','HEAD','UPPER_ARM_L','UPPER_ARM_R','FOREARM_L','FOREARM_R','HAND_L','HAND_R','THIGH_L','THIGH_R','SHIN_L','SHIN_R','FOOT_L','FOOT_R'];
export function createRig(scene){
 const root=scene.getObjectByName('RED_WITNESS_ROOT'),isStatic=!!root?.userData.static;
 const nodes=Object.fromEntries(JOINTS.map(name=>[name,scene.getObjectByName(name)]));
 const rest=new Map(Object.values(nodes).filter(Boolean).map(n=>[n,n.quaternion.clone()]));
 return {static:isStatic,nodes,pose({headYaw=0,armLift=0}={}){
  for(const[n,q]of rest)n.quaternion.copy(q);
  if(!isStatic){nodes.HEAD.rotateY(headYaw);nodes.UPPER_ARM_L.rotateZ(armLift);nodes.UPPER_ARM_R.rotateZ(-armLift);}
  scene.updateMatrixWorld(true);
 }};
}
