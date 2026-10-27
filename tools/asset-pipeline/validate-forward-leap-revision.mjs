// Compare the forward-only revision against the preserved pre-revision assets.
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const baseline='284a65d5a41311a312b52f307c485fd8c1f8bd1d',project=new URL('../../',import.meta.url);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const parse=b=>new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
function geometry(g){const a=[];g.scene.traverse(o=>{if(o.isMesh)a.push({name:o.name,index:Array.from(o.geometry.index.array),attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,v])=>[k,Array.from(v.array)])),bind:o.bindMatrix?.toArray(),inverse:o.skeleton?.boneInverses.map(m=>m.toArray())});});return a;}
function animation(c){return c.tracks.map(t=>({name:t.name,times:Array.from(t.times),values:Array.from(t.values)}));}
function sampler(g,name){const mixer=new T.AnimationMixer(g.scene),action=mixer.clipAction(g.animations.find(c=>c.name===name));action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();return t=>{action.paused=false;action.time=Math.min(t,action.getClip().duration-1e-7);mixer.update(0);g.scene.updateMatrixWorld(true);};}
for(const [family,clip] of [['mechanical-cheetah','Pounce'],['reckon-k9','Jump']]){
 const folder=new URL(`assets/${family}/`,project),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',folder))),checks=[];
 for(const e of manifest.assets){
  const file=`assets/${family}/${e.file}`,before=execFileSync('git',['show',`${baseline}:${file}`],{cwd:project,maxBuffer:32*1024*1024}),after=await fs.readFile(new URL(file,project));
  const old=await parse(before),next=await parse(after);assert.deepEqual(geometry(next),geometry(old),'geometry or skin changed');
  const nodes=g=>{const a=[];g.scene.traverse(o=>{if(o.name)a.push({name:o.name,p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray()});});return a;};assert.deepEqual(nodes(next),nodes(old),'rest transforms changed');
  const unchanged=next.animations.filter(c=>c.name!==clip);for(const c of unchanged)assert.deepEqual(animation(c),animation(old.animations.find(a=>a.name===c.name)),c.name+' changed');
  let relativeError=0,travelError=0;
  if(!e.static){
   const meta=e.clips.find(c=>c.name===clip),a=max(meta.release_s),b=min(meta.touchdown_s),sampleOld=sampler(old,clip),sampleNew=sampler(next,clip),wp=(g,n)=>g.scene.getObjectByName(n).getWorldPosition(new T.Vector3());
   const names=nodes(next).map(n=>n.name).filter(n=>next.scene.getObjectByName(n).isBone);
   for(let f=0;f<=meta.duration_s*120;f++){
    const t=f/120;sampleOld(t);sampleNew(t);const oldRoot=wp(old,'MOTION'),newRoot=wp(next,'MOTION');
    travelError=Math.max(travelError,Math.abs(newRoot.z-oldRoot.z-meta.root_motion_profile.airborne_extra_m*Math.max(0,Math.min(1,(t-a)/(b-a)))));
    for(const n of names)relativeError=Math.max(relativeError,wp(old,n).sub(oldRoot).distanceTo(wp(next,n).sub(newRoot)));
   }
   assert(relativeError<.00015,'articulated pose changed');assert(travelError<.00002,'added flight travel incorrect');
  }else assert.equal(sha(before),sha(after),'static export changed');
  checks.push({file,before_sha256:sha(before),after_sha256:sha(after),geometry_skin_rest_unchanged:true,unchanged_clips:unchanged.map(c=>c.name),maximum_relative_pose_difference_m:relativeError,maximum_added_travel_error_m:travelError});
 }
 const report={status:'passed',baseline_commit:baseline,scope:'Plain exports: geometry, skin and rest transforms unchanged; all other clips unchanged; added forward travel only during all-air interval; articulated poses compared after removing MOTION.',checks};
 await fs.writeFile(new URL('forward-leap-validation.json',folder),JSON.stringify(report,null,2)+'\n');console.log(family,checks);
}
function max(o){return Math.max(...Object.values(o));}function min(o){return Math.min(...Object.values(o));}
