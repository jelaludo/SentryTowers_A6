import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Uses Sentry-A6's existing Three.js/import map. Keep authored mount frames;
// do not call Skeleton.pose() or the old procedural rig.pose() on this instance.
export async function loadNisokuMoveset(baseURL,{variants=false,loader=new GLTFLoader()}={}){
 const base=new URL(baseURL,globalThis.location?.href||'file:///');
 if(!base.pathname.endsWith('/'))base.pathname+='/';
 const manifest=await fetch(new URL('manifest.json',base)).then(r=>{if(!r.ok)throw Error('Nisoku manifest unavailable');return r.json()});
 const [rig,moves]=await Promise.all([loader.loadAsync(new URL(manifest.files.rig,base).href),loader.loadAsync(new URL(variants?manifest.files.variants:manifest.files.moveset,base).href)]);
 const root=rig.scene,mixer=new THREE.AnimationMixer(root),clips=new Map(moves.animations.map(c=>[c.name,c]));
 // Only animation data is needed from the moveset GLB; its optional duplicate
 // mesh makes the same file usable directly in editors and other engines.
 const geometries=new Set(),materials=new Set();moves.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m)});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
 root.traverse(o=>{if(o.isSkinnedMesh)o.frustumCulled=false});
 let current=null;
 function play(id,{seed,fade=.14,loop}={}){
  const motion=manifest.motions.find(m=>m.id===id),take=manifest.takes.find(t=>t.id===id)||manifest.takes.find(t=>t.motion===id&&(seed!==undefined?t.seed===seed:t.id===motion?.default_take));
  if(!take)throw Error('Unknown Nisoku motion/take: '+id);
  const clip=clips.get(take.clip);if(!clip)throw Error('Take not in loaded pack; load with variants:true for alternate seeds: '+take.id);
  const next=mixer.clipAction(clip);if(next===current)return take;
  const repeat=loop??take.loop;next.reset().setLoop(repeat?THREE.LoopRepeat:THREE.LoopOnce,repeat?Infinity:1);next.clampWhenFinished=!repeat;
  if(current&&fade>0){current.fadeOut(fade);next.fadeIn(fade)}else current?.stop();next.play();current=next;return take;
 }
 function dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m)});for(const g of geometries)g.dispose();for(const m of materials)m.dispose()}
 return {root,mixer,manifest,clips,play,update:dt=>mixer.update(dt),stop(){mixer.stopAllAction();current=null},dispose};
}
