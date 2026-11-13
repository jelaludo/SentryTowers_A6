import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Uses the host site's existing Three.js/import map. This module creates no
// renderer, camera, animation loop, controller, or procedural pose driver.
export async function loadRedWitnessShowcase(baseURL,{centered=true,loader=new GLTFLoader()}={}){
 const base=new URL(baseURL,globalThis.location?.href);if(!base.pathname.endsWith('/'))base.pathname+='/';
 const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('Showcase manifest unavailable');const manifest=await response.json();
 const gltf=await loader.loadAsync(new URL(manifest.asset,base).href),root=gltf.scene,motion=root.getObjectByName('MOTION'),mixer=new T.AnimationMixer(root),clips=new Map(gltf.animations.map(c=>[c.name,c]));
 root.name='RedWitnessShowcase';root.traverse(n=>{if(n.isSkinnedMesh){n.frustumCulled=false;n.castShadow=n.receiveShadow=true}});
 let current=null,currentName=null,paused=false,sequence=null,index=0,age=0,disposed=false;
 const callbacks=new Set();
 function start(name,{loop,fade=0}={}){
  const clip=clips.get(name),entry=manifest.clips.find(c=>c.name===name);if(!clip)throw Error('Unknown showcase animation: '+name);
  const next=mixer.clipAction(clip);if(current===next){current.stop();current=null}
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).setLoop((loop??entry.loop)?T.LoopRepeat:T.LoopOnce,(loop??entry.loop)?Infinity:1);next.clampWhenFinished=true;
  if(current&&fade>0){current.fadeOut(fade);next.fadeIn(fade)}else current?.stop();next.play();current=next;currentName=name;age=0;mixer.update(0);center();for(const callback of callbacks)callback(name);return entry;
 }
 function center(){if(centered){root.position.x=-motion.position.x;root.position.z=-motion.position.z}else{root.position.x=root.position.z=0}root.updateMatrixWorld(true)}
 function play(name,options={}){sequence=null;return start(name,options)}
 function playSequence(names=manifest.clips.map(c=>c.name)){
  if(!names.length||names.some(name=>!clips.has(name)))throw Error('Sequence contains no clips or an unknown clip');sequence=[...names];index=0;return start(sequence[index],{loop:false});
 }
 function update(dt){if(paused||disposed)return;dt=Math.min(.1,Math.max(0,dt));age+=dt;
  if(sequence&&age>clips.get(currentName).duration+.35){index=(index+1)%sequence.length;start(sequence[index],{loop:false})}mixer.update(dt);center();
 }
 const api={root,mixer,manifest,clips,play,playSequence,update,get current(){return currentName},get paused(){return paused},get centered(){return centered},get sequence(){return sequence?[...sequence]:null},
  setPaused(value){paused=!!value},setCentered(value){centered=!!value;center()},
  onChange(callback){callbacks.add(callback);return()=>callbacks.delete(callback)},
  seek(time){if(!current)return;const clip=clips.get(currentName);current.time=T.MathUtils.clamp(time,0,clip.duration);age=current.time;mixer.update(0);center()},
  dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(root);const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])materials.add(m)});for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();root.removeFromParent();callbacks.clear()}
 };
 start('T_Pose');return api;
}
