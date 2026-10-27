// Check stable exported rig/finish/actions against the preserved previous face.
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const project=new URL('../../',import.meta.url),folder=new URL('assets/k0-tech-01/',project),baseline='b918febcfb7783550c5a2717319b7835e6b776ca',io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',folder))),oldManifest=JSON.parse(execFileSync('git',['show',baseline+':assets/k0-tech-01/manifest.json'],{cwd:project}));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),parse=b=>new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const track=c=>({node:c.getTargetNode().getName(),path:c.getTargetPath(),interpolation:c.getSampler().getInterpolation(),times:Array.from(c.getSampler().getInput().getArray()),values:Array.from(c.getSampler().getOutput().getArray())});
const nodes=d=>d.getRoot().listNodes().map(n=>({name:n.getName(),p:n.getTranslation(),q:n.getRotation(),s:n.getScale()})).sort((a,b)=>a.name.localeCompare(b.name));
const checks=[];
for(const e of manifest.assets){
 const before=execFileSync('git',['show',baseline+':assets/k0-tech-01/'+e.file],{cwd:project,maxBuffer:16*1024*1024}),after=await fs.readFile(new URL(e.file,folder));
 const old=await io.readBinary(before),next=await io.readBinary(after);assert.deepEqual(nodes(next),nodes(old));
 const previous=oldManifest.assets.find(a=>a.lod===e.lod);assert.deepEqual(e.clips,previous.clips);assert.deepEqual(e.sockets,previous.sockets);
 const materials=d=>d.getRoot().listMaterials().map(m=>({name:m.getName(),color:m.getBaseColorFactor(),metal:m.getMetallicFactor(),rough:m.getRoughnessFactor(),emissive:m.getEmissiveFactor()}));assert.deepEqual(materials(next),materials(old));
 let unchanged=0,settle=0;
 for(const a of next.getRoot().listAnimations()){
  const b=old.getRoot().listAnimations().find(b=>b.getName()===a.getName());assert(b);assert.equal(a.listChannels().length,b.listChannels().length);
  for(const c of a.listChannels()){
   const previous=b.listChannels().find(x=>x.getTargetNode().getName()===c.getTargetNode().getName()&&x.getTargetPath()===c.getTargetPath());assert(previous);
   if(a.getName()==='Roll_Over'&&c.getTargetNode().getName()==='LUMBAR'&&c.getTargetPath()==='translation')continue;
   assert.deepEqual(track(c),track(previous),'unrequested motion change');unchanged++;
  }
 }
 if(!e.static){
  const a=await parse(before),b=await parse(after),sampler=g=>{const m=new T.AnimationMixer(g.scene),action=m.clipAction(g.animations.find(c=>c.name==='Roll_Over'));action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();return t=>{action.paused=false;action.time=Math.min(t,5.6-1e-7);m.update(0);g.scene.updateMatrixWorld(true);};};
  const sa=sampler(a),sb=sampler(b),wp=(g,n)=>g.scene.getObjectByName(n).getWorldPosition(new T.Vector3());
  const bones=next.getRoot().listSkins()[0].listJoints().map(n=>n.getName()).filter(n=>n!=='MOTION');
  for(let f=0;f<=672;f++){
   sa(f/120);sb(f/120);const delta=wp(b,'LUMBAR').sub(wp(a,'LUMBAR'));assert(Math.abs(delta.x)+Math.abs(delta.z)<1e-5);settle=Math.max(settle,Math.abs(delta.y));
   for(const n of bones)assert(wp(b,n).sub(wp(a,n)).distanceTo(delta)<.0001,'roll articulation changed');
  }
  assert(settle<.02,'roll correction exceeds local ground settling');
 }
 checks.push({file:e.file,before_sha256:sha(before),after_sha256:sha(after),unchanged_rest_nodes:nodes(next).length,unchanged_animation_channels:unchanged,clip_metadata_sockets_and_palette_unchanged:true,maximum_roll_ground_settle_adjustment_m:settle});
}
await fs.writeFile(new URL('face-rig-validation.json',folder),JSON.stringify({status:'passed',baseline_commit:baseline,scope:'All rest transforms, sockets, clip metadata and material palette unchanged. Animation keys match except the automatic Roll_Over LUMBAR height correction for the new contact surface; sampled roll articulation and horizontal position remain unchanged.',checks},null,2)+'\n');console.log(checks);
