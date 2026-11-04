import * as T from 'three';
// Complete scene wrappers retain the authored AUREL mount frames.
// No Skeleton.pose() and no legacy procedural pose controller on these rigs.
export class PosePlayer {
 constructor(root,clips){this.root=root;this.mixer=new T.AnimationMixer(root);this.actions=new Map();this.add(clips);root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false}})}
 add(clips){for(const c of clips){if(this.actions.has(c.name))continue;const a=this.mixer.clipAction(c);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();a.enabled=false;this.actions.set(c.name,a)}}
 pose(samples){for(const a of this.actions.values())a.enabled=false;
  for(const s of samples){const a=this.actions.get(s.name);if(!a)throw Error('Missing motion '+s.name);a.enabled=true;a.paused=true;a.time=Math.max(0,Math.min(s.time,a.getClip().duration-.000001));a.setEffectiveWeight(s.weight??1)}
  this.mixer.update(0);this.root.updateMatrixWorld(true);
 }
 duration(name){return this.actions.get(name).getClip().duration}
}
export function clipName(b){return b.clip.startsWith('recorded-')?b.clip:b.clip+'-nisoku03'}
export function clipTime(player,b,local){const d=player.duration(clipName(b));return ['recorded','jump','balance'].includes(b.kind)?Math.min(local,d-.000001):local%d}
export function disposeModel(root){root.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())})}
