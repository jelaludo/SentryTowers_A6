import fs from 'node:fs/promises';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {state,pose,UNITS,SCALE,DURATION} from '../../ridgeback-drop/timeline.js';import {LEGS} from '../../assets/ridgeback-mech/runtime.js';
const report={samples:0,max_ground_error_m:0,min_piston_overlap_m:10,errors:[],scope:'Plain source rigs; deterministic cinematic trajectory, scaled ground contacts and hydraulic endpoints. Original decoded exports unchanged.'};
for(const lod of [0,1]){const b=await fs.readFile(new URL(`../../assets/ridgeback-mech/mx06_d0_lod${lod}.glb`,import.meta.url));const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const root=new T.Group();root.add(gltf.scene);root.scale.setScalar(SCALE);
for(let i=0;i<3;i++){assert.equal(state(UNITS[i].release+5,i).height,15);assert.equal(state(UNITS[i].release+5.65,i).height,0);
 for(let n=0;n<=780;n++){const t=n/60,s=pose(root,t,i);root.position.set(s.x,s.height,s.z);root.rotation.set(s.pitch,s.yaw,s.roll);root.updateMatrixWorld(true);report.samples++;assert(s.height>=0&&Number.isFinite(s.height));
 for(const l of LEGS){const wp=name=>root.getObjectByName(name).getWorldPosition(new T.Vector3());const a=wp('SOCKET_HYDRAULIC_UPPER_'+l.id),b=wp('SOCKET_HYDRAULIC_LOWER_'+l.id),len=a.distanceTo(b)/SCALE;assert(len>.54&&len<1.04);report.min_piston_overlap_m=Math.min(report.min_piston_overlap_m,1.08-len);assert(b.distanceTo(wp('PISTON_SLIDE_'+l.id))<.002);
 if(s.hit>=0){for(let k=1;k<=3;k++){const err=Math.abs(wp(`SOCKET_CLAW_${l.id}_${k}`).y);report.max_ground_error_m=Math.max(report.max_ground_error_m,err);assert(err<.002,'claw contact drift');}}}
 }
 const s=state(DURATION,i);assert.equal(s.jet,0);assert.equal(s.heat,0);assert.equal(s.compression,0);
 for(const t of [UNITS[i].release,UNITS[i].release+5,UNITS[i].release+5.65])assert(Math.abs(state(t-.00001,i).height-state(t+.00001,i).height)<.002);
}}
await fs.writeFile(new URL('../../ridgeback-drop/validation-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
