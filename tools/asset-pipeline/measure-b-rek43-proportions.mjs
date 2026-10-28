// Bind-pose dimensions, not an aesthetic or performance score.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const base=new URL('../../assets/',import.meta.url),models={};
for(const id of ['37','43']){
 const file=`b-rek${id}/b_rek${id}_d0_lod1.glb`,bytes=await fs.readFile(new URL(file,base)),g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');g.scene.updateMatrixWorld(true);
 const p=n=>g.scene.getObjectByName(n).getWorldPosition(new T.Vector3()),box=new T.Box3().setFromObject(g.scene,true);
 models['B-REK'+id]={file:'../'+file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),maximum_height_m:box.max.y,hip_center_height_m:p('PELVIS').y,hip_to_ankle_chain_m:p('HIP_L').distanceTo(p('KNEE_L'))+p('KNEE_L').distanceTo(p('ANKLE_L')),ankle_spacing_m:p('ANKLE_L').distanceTo(p('ANKLE_R')),support_length_m:p('SOCKET_HEEL_L').distanceTo(p('SOCKET_TOE_L')),hip_height_fraction:p('PELVIS').y/box.max.y};
}
const a=models['B-REK37'],b=models['B-REK43'];const result={scope:'Measured glTF bind-pose landmarks; height includes the antenna. Current game-tier files pinned by SHA-256. No performance or aesthetics claim.',models,comparison:{leg_chain_increase_percent:100*(b.hip_to_ankle_chain_m/a.hip_to_ankle_chain_m-1),hip_height_increase_percent:100*(b.hip_center_height_m/a.hip_center_height_m-1),support_length_reduction_percent:100*(1-b.support_length_m/a.support_length_m)}};
await fs.writeFile(new URL('b-rek43/proportions.json',base),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.comparison));
