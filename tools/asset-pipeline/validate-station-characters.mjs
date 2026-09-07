import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
const dir=new URL('../../assets/characters-station/',import.meta.url),{assets}=JSON.parse(fs.readFileSync(new URL('manifest.json',dir)));assert.equal(assets.length,3);
let shared;
for(const e of assets){
 const data=fs.readFileSync(new URL(e.file,dir)),report=await validator.validateBytes(data,{maxIssues:20});assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));
 const g=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');const meshes=[];g.scene.traverse(o=>{if(o.isMesh){assert(o.isSkinnedMesh);meshes.push(o);}});assert(meshes.length>0);const bones=meshes[0].skeleton.bones.map(b=>b.name);if(shared)assert.deepEqual(bones,shared);shared=bones;assert.equal(bones.length,e.joints);assert(e.triangles<5000);assert.deepEqual(g.animations.map(c=>c.name),['Idle','Walk','Run','Kneel','Scared','Point','Lie']);
 for(const mesh of meshes){const weights=mesh.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);}
 const mixer=new T.AnimationMixer(g.scene);
 for(const clip of g.animations){
  mixer.stopAllAction();const action=mixer.clipAction(clip).reset().play();let low=Infinity,high=-Infinity,extent=0;
  for(let frame=0;frame<=24;frame++){action.time=clip.duration*frame/24;mixer.update(0);g.scene.updateMatrixWorld(true);const box=new T.Box3();for(const mesh of meshes){mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++)box.expandByPoint(mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld));}low=Math.min(low,box.min.y);high=Math.max(high,box.max.y);extent=Math.max(extent,box.max.z-box.min.z);}
  console.log(e.id,clip.name,'floor',low.toFixed(3),'height',high.toFixed(3),'length',extent.toFixed(3));
  assert(low>-.002,`${e.id} ${clip.name} penetrates ground: ${low}`);if(['Kneel','Scared'].includes(clip.name))assert(high<1.8);if(clip.name==='Lie'){assert(high<.9);assert(extent>1.8);}assert(Math.abs(clip.duration-e.animations.find(a=>a.name===clip.name).duration_s)<1e-5);
  for(const track of clip.tracks){const size=track.getValueSize();for(let i=0;i<size;i++)assert(Math.abs(track.values[i]-track.values[track.values.length-size+i])<1e-4,clip.name+' loop seam');}
  if(['Walk','Run'].includes(clip.name)){const foot=meshes[0].skeleton.bones.find(b=>b.name==='foot_L');const sample=t=>{action.time=t*clip.duration;mixer.update(0);g.scene.updateMatrixWorld(true);return foot.getWorldPosition(new T.Vector3());};const front=sample(0),back=sample(.5),swing=sample(.75);assert(front.z>back.z+.3,'stance foot must move backward as body travels +Z');assert(swing.y>Math.min(front.y,back.y)+.05,'swing foot must lift');}
 }
 console.log('PASS',e.id,e.triangles,'triangles',report.issues.numWarnings,'validator warnings');
}
