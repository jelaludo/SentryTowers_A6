// Derived presentation illustrations. Never modifies the source GLBs.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import * as T from 'three';
import fs from 'node:fs/promises';
const root=new URL('../../',import.meta.url),io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const models={sh02:'assets/sh-rocket/sh02_landing_island_d0_lod2.glb',stalheart:'assets/terraformer/terraformer_3000_d0_lod2.glb',mork:'assets/hover-tank/mork_hover_tank_d0_lod2.glb',korp:'assets/korp/korp_d0_lod2.glb',launcher:'assets/orbital-launcher/lod2/launcher_d0_lod2.glb',sol88:'assets/sol88/lod2/sol88_platform_distance.glb'};
const views={korp:[-1.4,.8,1],mork:[1.4,1.1,.65]};
for(const [name,file] of Object.entries(models)){
 const doc=await io.read(new URL(file,root).pathname),lines=[];
 const camera=new T.PerspectiveCamera();camera.position.set(...(views[name]||[1,.65,1.35]));camera.lookAt(0,0,0);camera.updateMatrixWorld();
 for(const node of doc.getRoot().listNodes()){
  if(!node.getMesh())continue;
  for(const primitive of node.getMesh().listPrimitives()){
   const pos=primitive.getAttribute('POSITION');if(!pos)continue;
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(pos.getArray()),3));
   const idx=primitive.getIndices();if(idx)g.setIndex(Array.from(idx.getArray()));
   const edges=new T.EdgesGeometry(g,name==='sh02'?3:28),a=edges.attributes.position;
   const matrix=new T.Matrix4().fromArray(node.getWorldMatrix());
   for(let i=0;i<a.count;i+=2){const pair=[];for(let j=0;j<2;j++){const v=new T.Vector3().fromBufferAttribute(a,i+j).applyMatrix4(matrix).applyMatrix4(camera.matrixWorldInverse);pair.push([v.x,-v.y]);}lines.push(pair);}
   edges.dispose();g.dispose();
  }
 }
 const pts=lines.flat(),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=Math.min(360/(maxX-minX),240/(maxY-minY));
 const point=p=>`${((p[0]-(minX+maxX)/2)*scale+200).toFixed(1)},${((p[1]-(minY+maxY)/2)*scale+135).toFixed(1)}`;
 const d=lines.map(l=>`M${point(l[0])}L${point(l[1])}`).join('');
 await fs.writeFile(new URL(`settlement-guide/wireframes/${name}.svg`,root),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 270"><title>${name.toUpperCase()} — wireframe derived from A6 model</title><path d="${d}" fill="none" stroke="#286b69" stroke-width=".65" stroke-linejoin="round" opacity=".85"/></svg>`);
 console.log(name,lines.length,'edges');
}
await fs.writeFile(new URL('settlement-guide/wireframes/sources.json',root),JSON.stringify({description:'Derived static SVG edge projections, not new 3D assets. Original GLBs preserved.',views,models},null,2)+'\n');
