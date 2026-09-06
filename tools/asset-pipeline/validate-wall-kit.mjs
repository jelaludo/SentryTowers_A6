import fs from 'node:fs';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import validator from 'gltf-validator';
const directory=process.argv[2]||fileURLToPath(new URL('../../assets/base-kit/',import.meta.url));const entries=JSON.parse(fs.readFileSync(directory+'manifest.json')).assets;const loader=new GLTFLoader();assert.equal(entries.length,7);let triangles=0;
for(const entry of entries){const buf=fs.readFileSync(directory+entry.file);const result=await validator.validateBytes(buf,{maxIssues:20});assert.equal(result.issues.numErrors,0,JSON.stringify(result.issues.messages));const gltf=await loader.parseAsync(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');const root=gltf.scene;root.updateMatrixWorld(true);assert(root.getObjectByName('ROOT'));
 for(const s of entry.sockets){const node=root.getObjectByName('SOCKET_'+s.id);assert(node,'missing socket '+s.id);const p=node.getWorldPosition(new T.Vector3());assert(p.distanceTo(new T.Vector3(...s.position_m))<1e-5);const direction=new T.Vector3(0,0,1).applyQuaternion(node.getWorldQuaternion(new T.Quaternion()));assert(direction.distanceTo(new T.Vector3(...s.normal))<1e-5,`${entry.id} ${s.id}: ${direction.toArray()} vs ${s.normal}`);}
 if(entry.id.startsWith('wall_standard')){const open=/d[23]$/.test(entry.id);for(const x of [-.55,0,.55])for(const y of [.1,.5,1,1.5,2,2.35]){const ray=new T.Raycaster(new T.Vector3(x,y,-2.1),new T.Vector3(0,0,1),0,4.2);assert.equal(ray.intersectObject(root,true).length===0,open,`${entry.id} passage ray x=${x}, y=${y}`);}}
 if(entry.id==='gate_vehicle_d0'){assert.equal(gltf.animations.length,1);assert.equal(gltf.animations[0].tracks.length,4);const mixer=new T.AnimationMixer(root),clip=gltf.animations[0],action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(clip.duration);root.updateMatrixWorld(true);for(let i=0;i<4;i++){const node=root.getObjectByName('GATE_SLAT_0'+i);const box=new T.Box3().setFromObject(node);assert(box.min.y>3.8,`Gate slat ${i} failed to clear opening: ${box.min.y}`);}mixer.stopAllAction();}
 triangles+=entry.triangles;console.log('PASS',entry.id,result.issues.numWarnings+' validator warnings');}
console.log('PASS: seven GLBs, sockets and axes, real wall passage rays, all four gate slats,',triangles,'total triangles');

const socket=(asset,id,pos,rotation)=>{const item=entries.find(e=>e.id===asset).sockets.find(s=>s.id===id);const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),rotation);return {p:new T.Vector3(...item.position_m).applyQuaternion(q).add(new T.Vector3(...pos)),n:new T.Vector3(...item.normal).applyQuaternion(q)};};
const joins=[
 [['gate_vehicle_d0','WALL_W',[0,0,0],0],['wall_standard_d0','WALL_E',[-8,0,0],0]],
 [['gate_vehicle_d0','WALL_E',[0,0,0],0],['wall_standard_d0','WALL_W',[8,0,0],0]],
 [['wall_standard_d0','WALL_W',[-8,0,0],0],['wall_corner_d0','WALL_E',[-12,0,0],0]],
 [['wall_standard_d0','WALL_E',[8,0,0],0],['wall_corner_d0','WALL_N',[12,0,0],-Math.PI/2]],
 [['wall_corner_d0','WALL_N',[-12,0,0],0],['wall_standard_d0','WALL_E',[-12,0,4],Math.PI/2]],
 [['wall_corner_d0','WALL_E',[12,0,0],-Math.PI/2],['wall_standard_d0','WALL_E',[12,0,4],Math.PI/2]],
];
for(const [left,right] of joins){const a=socket(...left),b=socket(...right);assert(a.p.distanceTo(b.p)<1e-6);assert(a.n.dot(b.n)<-.99999);}
console.log('PASS: all six assembly joins coincide with opposing socket normals.');
