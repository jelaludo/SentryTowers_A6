import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
const dir=new URL('../../assets/launchpad/',import.meta.url);
const {assets}=JSON.parse(fs.readFileSync(new URL('manifest.json',dir)));
assert.deepEqual(assets.map(e=>e.damage_level),[0,1,2,3]);
for(const e of assets){
 const data=fs.readFileSync(new URL(e.file,dir));const report=await validator.validateBytes(data,{maxIssues:30});assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));
 const g=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');const root=g.scene;root.updateMatrixWorld(true);
 assert(root.getObjectByName('ROOT'));const box=new T.Box3().setFromObject(root,true);assert(box.min.x>=-20&&box.max.x<=20,e.id+' plot width');assert(box.min.z>=-20&&box.max.z<=20,e.id+' plot depth');
 if(e.damage_level<3){
  const legs=[];root.traverse(o=>{if(/^LANDING_LEG_\d+$/.test(o.name))legs.push(o)});assert.equal(legs.length,3);
  for(let i=1;i<=3;i++){const foot=root.getObjectByName('FLAT_LANDING_FOOT_0'+i);assert(foot);const size=new T.Box3().setFromObject(foot).getSize(new T.Vector3());assert(size.y<.4&&size.x>1&&size.z>1,'broad flat foot');}
  assert(root.getObjectByName('CARGO_CAPSULE'));assert(root.getObjectByName('CATCHER_WRIST'));
 }
 if(e.damage_level<2){
  assert.equal(g.animations.length,1);const clip=g.animations[0];assert.equal(clip.name,'Cargo_Recovery_Cycle');assert.equal(clip.duration,20);
  for(const n of ['CATCHER_LIFT','CATCHER_SHOULDER','CATCHER_ELBOW','CATCHER_WRIST','CAPTURE_JAW_L','CAPTURE_JAW_R'])assert(clip.tracks.some(t=>t.name.startsWith(n+'.')),n+' missing motion');
  const mixer=new T.AnimationMixer(root);mixer.clipAction(clip).play();const cargo=root.getObjectByName('CARGO_CAPSULE');assert.equal(cargo.parent.name,'CATCHER_WRIST');
  const position=t=>{mixer.setTime(t);root.updateMatrixWorld(true);return cargo.getWorldPosition(new T.Vector3())};
  assert(position(0).distanceTo(new T.Vector3(-3,18.4,0))<.001,'cargo starts on rocket');
  assert(position(10).distanceTo(new T.Vector3(2,3.5,9))<.005,'cargo meets receiving pedestal');
  assert(position(4).y>20,'lift clear of booster');
  const initial=position(0);assert(position(19.9999).distanceTo(initial)<.005,'continuous loop');
  const booster=root.getObjectByName('REUSABLE_BOOSTER');const b=booster.position.clone();
  for(let t=0;t<=20;t+=.1){const p=position(t);assert(p.y>=3.49,'cargo penetrates receiving floor');assert(p.x>=-3.01&&p.x<=2.01);assert(p.z>=-.01&&p.z<=9.01);assert(booster.position.distanceTo(b)<1e-6,'booster stays landed');}
 }else assert.equal(g.animations.length,0);
 if(e.damage_level===3){assert(root.getObjectByName('FALLEN_BOOSTER'));assert(root.getObjectByName('FALLEN_RECOVERY_ARM'));assert(root.getObjectByName('FALLEN_CARGO'));assert(box.max.y<12,'collapsed height');}
 console.log('PASS',e.id,e.triangles,'triangles;',report.issues.numWarnings,'warnings');
}
console.log('PASS: D0–D3, three flat landing feet, cargo capture hierarchy, 20-second recovery loop, receiving alignment, stationary booster and authored wreckage.');
