import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
const bytes=fs.readFileSync(new URL('../../assets/sh-rocket/sh_rocket.glb',import.meta.url));
const result=await validator.validateBytes(bytes,{maxIssues:30});
assert.equal(result.issues.numErrors,0,JSON.stringify(result.issues));
const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
assert(!JSON.stringify(doc).includes('HUGIN'));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
assert.deepEqual(gltf.animations.map(c=>c.name).sort(),['Landing_Shock','Legs_Deploy','Legs_Retract','Top_Door_Close','Top_Door_Open']);
assert(gltf.scene.getObjectByName('MARKINGS'));
const feet=[];gltf.scene.traverse(o=>{if(o.name.endsWith('_ANKLE'))feet.push(o);});assert.equal(feet.length,3);
const mixer=new T.AnimationMixer(gltf.scene),v=new T.Vector3();
const samples={};
for(const clip of gltf.animations){
  const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
  const poses=[];
  for(let i=0;i<=60;i++){
    mixer.stopAllAction();action.reset().play();action.time=clip.duration*i/60;mixer.update(0);gltf.scene.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(gltf.scene,true);assert(Number.isFinite(bounds.max.y));
    if(clip.name==='Landing_Shock')for(const foot of feet){foot.getWorldPosition(v);assert(Math.abs(v.y-.36)<.006,`foot slides vertically: ${v.y}`);}
    poses.push(feet.map(f=>f.getWorldPosition(new T.Vector3()).toArray()));
  }
  samples[clip.name]=poses;console.log('PASS',clip.name,clip.duration+'s');
}
for(let i=0;i<=60;i++)for(let j=0;j<3;j++)for(let axis=0;axis<3;axis++)assert(Math.abs(samples.Legs_Deploy[i][j][axis]-samples.Legs_Retract[60-i][j][axis])<.01,'deploy/retract mismatch');
const landing=samples.Landing_Shock;
for(const frame of landing)for(let j=0;j<3;j++)for(const axis of [0,2])assert(Math.abs(frame[j][axis]-landing[0][j][axis])<.006,'foot slides horizontally');
for(const clip of gltf.animations.filter(c=>c.name.startsWith('Top')))assert(clip.tracks.every(t=>t.name.startsWith('TOP_DOOR_HINGE.')),'door clip moves legs');
console.log('PASS: planted tripod feet, reversible deployment, independent door clips, optional markings, no HUGIN branding;',result.issues.numWarnings,'validator warnings');
