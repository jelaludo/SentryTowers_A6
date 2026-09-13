import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import validator from 'gltf-validator';

const dir=new URL('../../assets/isao-birudoron/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
const entry=manifest.assets[0];
const bytes=fs.readFileSync(new URL(entry.file,dir));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');

assert.equal(sha(bytes),entry.source_sha256,'preserved GLB hash');
const concept=manifest.reference_images[0];
assert.equal(sha(fs.readFileSync(new URL(concept.file,dir))),concept.sha256,'concept sheet hash');

const report=await validator.validateBytes(bytes,{maxIssues:100});
assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));
assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));

const jsonLength=bytes.readUInt32LE(12);
const json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8').trim());
assert.equal(json.animations?.length||0,0);
assert.equal(json.materials?.length||0,entry.materials);
assert.equal(json.nodes?.length||0,entry.nodes);
assert.equal(json.images?.length||0,1);
assert.equal(json.bufferViews[json.images[0].bufferView].byteLength,entry.embedded_texture_bytes);

const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(new URL(entry.file,dir).pathname);
const root=doc.getRoot(),scene=root.getDefaultScene()||root.listScenes()[0];
let triangles=0,drawCalls=0,degenerate=0,unnamedMeshNodes=0;
const nodes=root.listNodes(),named=nodes.map(n=>n.getName()).filter(Boolean);
for(const node of nodes){
  const mesh=node.getMesh();if(!mesh)continue;if(!node.getName())unnamedMeshNodes++;
  for(const primitive of mesh.listPrimitives()){
    const pos=primitive.getAttribute('POSITION'),idx=primitive.getIndices(),count=idx?.getCount()||pos.getCount();triangles+=count/3;drawCalls++;
    for(let i=0;i<count;i+=3){
      const ai=idx?idx.getScalar(i):i,bi=idx?idx.getScalar(i+1):i+1,ci=idx?idx.getScalar(i+2):i+2;
      const a=pos.getElement(ai,[]),b=pos.getElement(bi,[]),c=pos.getElement(ci,[]);
      const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
      const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      if(cross[0]**2+cross[1]**2+cross[2]**2<=1e-18)degenerate++;
    }
  }
}
assert.equal(triangles,entry.triangles);
assert.equal(drawCalls,entry.draw_calls);
assert.equal(unnamedMeshNodes,entry.unnamed_mesh_nodes);
assert.equal(degenerate,0);
assert.equal(root.listAnimations().length,0);
assert.equal(new Set(named).size,named.length,'named nodes must be unique');
assert(named.every(name=>!name.includes('.')),'named nodes must be dot-free');

for(const name of [entry.root,...entry.functional_pivots,'Isao_CRT','AuxScene','Fab_Root','Airframe_Platform'])assert(nodes.some(n=>n.getName()===name),`missing ${name}`);
const box=getBounds(scene),size=box.max.map((v,i)=>v-box.min[i]);
entry.bounds_min_m.forEach((v,i)=>assert(Math.abs(box.min[i]-v)<1e-6,`minimum bound axis ${i}`));
entry.bounds_max_m.forEach((v,i)=>assert(Math.abs(box.max[i]-v)<1e-6,`maximum bound axis ${i}`));
entry.dimensions_m.forEach((v,i)=>assert(Math.abs(size[i]-v)<1e-6,`size axis ${i}`));

assert.equal(entry.game_ready,false);
assert.equal(entry.production_lod,false);
assert.equal(manifest.status,'initial_concept');
assert.match(entry.visual_forward,/-Z/);
assert(manifest.future_tiers.every(t=>t.status.includes('not_delivered')));
assert(fs.readFileSync(new URL('../../isao-birudoron/viewer.js',import.meta.url),'utf8').includes('Full articulated limb acting'));

console.log(`PASS ${entry.id}: preserved SHA, ${triangles} triangles, ${drawCalls} draws, ${bytes.length} bytes, ${report.issues.numWarnings} warnings`);
