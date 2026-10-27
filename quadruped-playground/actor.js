import * as T from 'three';
const ids=['FL','FR','HL','HR'];
const position=n=>n.getWorldPosition(new T.Vector3());
const quaternion=n=>n.getWorldQuaternion(new T.Quaternion());
function setWorldQuaternion(node,q){node.quaternion.copy(quaternion(node.parent).invert().multiply(q));node.updateWorldMatrix(false,true);}

// Rigid two-bone correction with an optional preserved distal segment. It only
// rotates joints; source armor scale and segment lengths remain unchanged.
function anchorLeg(nodes,id,target,footQ){
 const upper=nodes['UPPER_'+id],lower=nodes['LOWER_'+id],foot=nodes['PAW_'+id];
 const end=nodes['ANKLE_'+id]||nodes['HOCK_'+id]||foot;
 const a=position(upper),b=position(lower),c=position(end),f=position(foot),sq=quaternion(foot);
 const soleOffset=position(nodes['SOCKET_PAW_'+id]).sub(f).applyQuaternion(footQ.clone().multiply(sq.invert()));
 const footTarget=target.clone().sub(soleOffset),distal=c.clone().sub(f),goal=footTarget.clone().add(distal);
 const l1=a.distanceTo(b),l2=b.distanceTo(c),direction=goal.clone().sub(a),raw=direction.length();
 if(raw>l1+l2+.002||raw<Math.abs(l1-l2)+.001)return {reachable:false,error:Math.max(raw-l1-l2,Math.abs(l1-l2)-raw)};
 const distance=T.MathUtils.clamp(raw,Math.abs(l1-l2)+1e-5,l1+l2-1e-5);direction.normalize();
 const pole=b.clone().sub(a);pole.addScaledVector(direction,-pole.dot(direction));if(pole.lengthSq()<1e-8)pole.set(0,0,1).addScaledVector(direction,-direction.z);pole.normalize();
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const knee=a.clone().addScaledVector(direction,along).addScaledVector(pole,height),endQ=quaternion(end);
 setWorldQuaternion(upper,new T.Quaternion().setFromUnitVectors(b.sub(a).normalize(),knee.clone().sub(a).normalize()).multiply(quaternion(upper)));
 const lowerPos=position(lower),current=position(end).sub(lowerPos),desired=goal.sub(lowerPos);
 setWorldQuaternion(lower,new T.Quaternion().setFromUnitVectors(current.normalize(),desired.normalize()).multiply(quaternion(lower)));
 if(end!==foot)setWorldQuaternion(end,endQ);
 setWorldQuaternion(foot,footQ);
 return {reachable:true,error:position(nodes['SOCKET_PAW_'+id]).distanceTo(target)};
}

export class ChaseActor{
 constructor(gltf,metadata){
  this.gltf=gltf;this.metadata=metadata;this.holder=new T.Group();this.holder.name=metadata.family==='reckon-k9'?'RECKON_K9_ACTOR':'C07_CHEETAH_ACTOR';this.holder.add(gltf.scene);
  this.nodes={};gltf.scene.traverse(o=>{if(o.name)this.nodes[o.name]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
  this.mixer=new T.AnimationMixer(gltf.scene);this.actions=new Map(gltf.animations.map(c=>[c.name,this.mixer.clipAction(c)]));
  this.motionRest=this.nodes.MOTION.position.clone();this.anchors=new Map();this.current=null;this.elapsed=0;this.maxCorrection=0;this.releasedAnchors=0;
  this.holder.updateMatrixWorld(true);this.restFootQuats=Object.fromEntries(ids.map(id=>[id,quaternion(this.nodes['PAW_'+id])]));
 }
 reset(){this.mixer.stopAllAction();this.current=null;this.previous=null;this.elapsed=0;this.anchors.clear();this.maxCorrection=0;this.releasedAnchors=0;}
 pose(state,dt=0){
  this.elapsed+=dt;
  if(this.current!==state.clip){this.previous=this.current?{name:this.current,time:this.lastTime}:null;this.current=state.clip;this.change=this.elapsed;this.anchors.clear();}
  this.lastTime=state.clipTime;const blend=T.MathUtils.smoothstep(this.elapsed-this.change,0,.18);
  for(const [name,action] of this.actions){
   const weight=name===this.current?(this.previous?blend:1):name===this.previous?.name?1-blend:0;
   action.enabled=weight>0;action.paused=false;action.setEffectiveWeight(weight);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
   if(weight){action.play();action.time=Math.min(name===this.current?state.clipTime:this.previous.time,action.getClip().duration-1e-7);}
  }
  this.mixer.update(0);
  // Scene placement owns the combined jump trajectory. Neutralize the source
  // MOTION displacement after evaluation to avoid applying C-07's travel twice.
  this.nodes.MOTION.position.copy(this.motionRest);
  this.holder.position.set(state.position.x,0,state.position.z);this.holder.rotation.set(0,state.yaw,0);this.holder.updateMatrixWorld(true);
  const meta=this.metadata.clips.find(c=>c.name===state.clip),locomotion=!!meta?.speed_mps&&!state.jump;
  for(const id of ids){
   const foot=this.nodes['PAW_'+id],sole=this.nodes['SOCKET_PAW_'+id],p=position(sole);
   const flat=quaternion(this.holder).multiply(this.restFootQuats[id]);
   if(locomotion&&p.y<.013){
    if(!this.anchors.has(id))this.anchors.set(id,{point:p.clone().setY(.003),rotation:flat});
    const anchor=this.anchors.get(id),result=anchorLeg(this.nodes,id,anchor.point,anchor.rotation);
    if(!result.reachable){this.anchors.delete(id);this.releasedAnchors++;}else this.maxCorrection=Math.max(this.maxCorrection,result.error);
   }else{this.anchors.delete(id);if(p.y<.003)anchorLeg(this.nodes,id,p.clone().setY(.003),flat);}
  }
  // Interpolating joint rotations during a clip change can lower a sole even
  // when both source poses clear the floor. Correct residual unreachable cases
  // with a small common lift instead of stretching a limb through the ground.
  const minimum=Math.min(...ids.map(id=>position(this.nodes['SOCKET_PAW_'+id]).y));
  if(minimum<.002){this.holder.position.y+=.002-minimum;this.holder.updateMatrixWorld(true);}
  this.holder.updateMatrixWorld(true);gltfSkeletons(this.gltf.scene);
 }
 dispose(){this.mixer.stopAllAction();this.gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
}
function gltfSkeletons(root){root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});}
