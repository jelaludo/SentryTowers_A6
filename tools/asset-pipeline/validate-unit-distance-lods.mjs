import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import validator from 'gltf-validator';

const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const root=new URL('../../',import.meta.url);
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');

function stats(document){
  let triangles=0,draws=0,degenerate=0;
  for(const node of document.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()||[]){
    const position=primitive.getAttribute('POSITION'),indices=primitive.getIndices(),count=indices?.getCount()||position.getCount();triangles+=count/3;draws++;
    for(let i=0;i<count;i+=3){
      const a=position.getElement(indices?indices.getScalar(i):i,[]),b=position.getElement(indices?indices.getScalar(i+1):i+1,[]),c=position.getElement(indices?indices.getScalar(i+2):i+2,[]);
      const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      if(cross[0]**2+cross[1]**2+cross[2]**2<=1e-18)degenerate++;
    }
  }
  return{triangles,draws,degenerate};
}

async function validateOne({manifestPath,sourcePath,id,maxTriangles,maxBytes,rootName,family}){
  const manifest=JSON.parse(fs.readFileSync(new URL(manifestPath,root))),entry=manifest.assets.find(asset=>asset.id===id);assert(entry,id);
  const path=new URL(manifestPath.replace(/[^/]+$/,entry.file),root),bytes=fs.readFileSync(path),report=await validator.validateBytes(bytes,{maxIssues:100});
  assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));
  assert.equal(bytes.length,entry.bytes,`${id} bytes`);assert.equal(sha(bytes),entry.sha256,`${id} sha`);
  const document=await io.read(path.pathname),assetRoot=document.getRoot(),scene=assetRoot.getDefaultScene()||assetRoot.listScenes()[0],metrics=stats(document),nodes=assetRoot.listNodes(),names=nodes.map(node=>node.getName()).filter(Boolean);
  assert.equal(metrics.triangles,entry.triangles);assert.equal(metrics.draws,entry.draw_calls);assert.equal(metrics.degenerate,0);
  assert(metrics.triangles<=maxTriangles,`${id} triangle budget`);assert.equal(metrics.draws,1);assert(bytes.length<=maxBytes,`${id} byte budget`);
  assert.equal(assetRoot.listAnimations().length,0);assert.equal(assetRoot.listTextures().length,0);assert.equal(assetRoot.listMaterials().length,1);assert.equal(assetRoot.listSkins().length,0);
  assert.equal(new Set(names).size,names.length,`${id} unique names`);assert(names.every(name=>!name.includes('.')),`${id} dot-free names`);
  const rootNode=nodes.find(node=>node.getName()===rootName);assert(rootNode);assert.equal(rootNode.getExtras().asset_id,id);assert(nodes.some(node=>node.getName()==='DISTANCE_GEOMETRY'));
  assert.deepEqual(nodes.filter(node=>!node.getMesh()).map(node=>node.getName()).sort(),[...entry.engine_nodes].sort(),`${id} engine-node parity`);
  for(const name of entry.engine_nodes)assert(nodes.some(node=>node.getName()===name),`${id} missing ${name}`);
  assert.equal(entry.lod,2);assert.equal(entry.damage_level,0);assert.equal(entry.static,true);assert.equal(entry.functional,false);assert.equal(entry.game_ready,false);assert.deepEqual(entry.clips,[]);
  const bounds=getBounds(scene),size=bounds.max.map((value,index)=>value-bounds.min[index]);assert(bounds.min[1]>=-1e-4,`${id} below ground`);
  entry.bounds_min_m.forEach((value,index)=>assert(Math.abs(value-bounds.min[index])<1e-5,`${id} min ${index}`));entry.bounds_max_m.forEach((value,index)=>assert(Math.abs(value-bounds.max[index])<1e-5,`${id} max ${index}`));entry.dimensions_m.forEach((value,index)=>assert(Math.abs(value-size[index])<1e-5,`${id} size ${index}`));
  for(const socket of entry.sockets){const socketNode=nodes.find(node=>node.getName()===socket.id)||nodes.find(node=>node.getName()===`SOCKET_${socket.id}`);assert(socketNode,`${id} socket ${socket.id}`);socket.position_m.forEach((value,index)=>assert(Math.abs(value-socketNode.getWorldTranslation()[index])<1e-5,`${id} ${socket.id} axis ${index}`));}
  const sourceURL=new URL(sourcePath,root),sourceBytes=fs.readFileSync(sourceURL);assert.equal(sha(sourceBytes),entry.source_sha256,`${id} source sha`);const source=await io.read(sourceURL.pathname),sourceScene=source.getRoot().getDefaultScene()||source.getRoot().listScenes()[0],sourceSize=getBounds(sourceScene).max.map((value,index)=>value-getBounds(sourceScene).min[index]);
  size.forEach((value,index)=>assert(value>=sourceSize[index]*.92&&value<=sourceSize[index]*1.03,`${id} silhouette dimension ${index}`));
  if(family==='isao'){
    assert(!nodes.some(node=>node.getMesh()&&node.getName().startsWith('FACE_')),'distance ISAO must omit pixel emotion meshes');
    assert(nodes.some(node=>node.getName()==='DISTANCE_GEOMETRY'));
  }else{
    const primitive=nodes.find(node=>node.getName()==='DISTANCE_GEOMETRY').getMesh().listPrimitives()[0],position=primitive.getAttribute('POSITION'),indices=primitive.getIndices();let barrelSides=0;
    for(let i=0;i<indices.getCount();i+=3){const points=[0,1,2].map(offset=>position.getElement(indices.getScalar(i+offset),[])),zs=points.map(point=>point[2]);if(points.every(point=>Math.abs(point[0])<.35&&point[1]>2.2&&point[1]<2.8)&&Math.max(...zs)-Math.min(...zs)>6)barrelSides++;}
    assert(barrelSides>=6,'MÖRK long cannon bridge collapsed or detached');
  }
  console.log(`PASS ${id}: ${metrics.triangles} triangles, ${metrics.draws} draw, ${bytes.length} bytes, ${report.issues.numWarnings} warnings`);
}

await validateOne({manifestPath:'assets/hover-tank/manifest-distance.json',sourcePath:'assets/hover-tank/mork_hover_tank_low_d0.glb',id:'mork_hover_tank_d0_lod2',maxTriangles:3000,maxBytes:250000,rootName:'ROOT',family:'mork'});
await validateOne({manifestPath:'assets/isao-birudoron/manifest.json',sourcePath:'assets/isao-birudoron/isao_birudoron_lod1.glb',id:'isao_birudoron_lod2',maxTriangles:2000,maxBytes:250000,rootName:'ISAO_ROOT',family:'isao'});
