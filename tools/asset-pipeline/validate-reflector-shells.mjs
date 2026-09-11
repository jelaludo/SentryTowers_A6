import fs from 'node:fs';import assert from 'node:assert/strict';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const dir=new URL('../../assets/antenna-array/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir)));
for(const e of manifest.assets){
 const b=fs.readFileSync(new URL(e.file,dir));const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const shells=[];
 g.scene.traverse(o=>{assert(!o.name.startsWith('Reflector_panel'),'old panel geometry remains');if(o.userData.component==='continuous_reflector')shells.push(o);});
 assert.equal(shells.length,e.kind==='array'?7:1);
 for(const shell of shells){
  assert(shell.isMesh);assert(!Array.isArray(shell.material),'single surface material');
  const geometry=shell.geometry,positions=geometry.attributes.position,indices=geometry.index;
  const ids=new Map(),vertexIds=[];for(let i=0;i<positions.count;i++){const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*1e5)).join(',');if(!ids.has(key))ids.set(key,ids.size);vertexIds.push(ids.get(key));}
  const edges=new Map(),adj=Array.from({length:ids.size},()=>new Set());
  for(let i=0;i<indices.count;i+=3){const t=[0,1,2].map(j=>vertexIds[indices.getX(i+j)]);assert.equal(new Set(t).size,3,'degenerate triangle');for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);adj[a].add(b);adj[b].add(a);}}
  for(const count of edges.values())assert.equal(count,2,'shell contains an open seam or duplicate sidewall');
  const seen=new Set(),stack=[0];while(stack.length){const v=stack.pop();if(seen.has(v))continue;seen.add(v);for(const next of adj[v])stack.push(next);}assert.equal(seen.size,ids.size,'disconnected dish panels');
  if(e.damage_level===0){const expected={low:576,medium:1536,high:5376}[e.detail];assert.equal(indices.count/3,expected);}
 }
 console.log('PASS',e.id,`${shells.length} connected, closed single-material shell(s)`);
}
