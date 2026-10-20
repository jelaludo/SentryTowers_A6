import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {equipmentFit} from '../../assets/xb12/equipment.js';
const manifest=JSON.parse(await fs.readFile(new URL('../../assets/sentries/manifest.json',import.meta.url)));
const report={variants:[],errors:[],scope:'All 33 game-tier attachments: actual loaded geometry satisfies rover-sized width/height/length limits and base seating at 60% and 100%. Barrels may overhang the pad. Rotation, elevation and firing collision clearance are not certified.'};
for(const e of manifest.assets.filter(e=>e.lod===1)){
 const bytes=await fs.readFile(new URL('../../assets/sentries/'+e.file,import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 for(const size of [.6,1]){
  const fit=equipmentFit(e.bounds,size);scene.scale.setScalar(fit.scale);scene.position.y=fit.yOffset;scene.updateMatrixWorld(true);
  let radial=0,minY=Infinity,maxY=-Infinity,maxX=0,minZ=Infinity,maxZ=-Infinity;
  scene.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);radial=Math.max(radial,Math.hypot(v.x,v.z));maxX=Math.max(maxX,Math.abs(v.x));minZ=Math.min(minZ,v.z);maxZ=Math.max(maxZ,v.z);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}});
  assert(maxX<=.55001,e.id+' width');assert(maxZ<=1.75001&&maxZ-minZ<=2.50001,e.id+' reach');assert(minY>=-1e-5&&Math.abs(minY)<1e-4,e.id+' mount seating');assert(maxY<=1.25001,e.id+' height');assert(fit.scale<=.70);
  if(size===1)report.variants.push({id:e.id,scale:fit.scale,radial_m:radial,height_m:maxY});
 }
}
assert.equal(report.variants.length,33);await fs.writeFile(new URL('../../assets/xb12/equipment-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('33 sentries satisfy rover-sized width, height, reach and seating checks at both size limits.');
