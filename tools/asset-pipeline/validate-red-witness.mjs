import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import {getBounds} from '@gltf-transform/functions';import validator from 'gltf-validator';
import {loadGeometryGLB} from './load-geometry-glb.mjs';import {createRig,JOINTS} from '../../assets/red-witness/runtime.js';
const root=new URL('../../',import.meta.url),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const folder of ['assets/red-witness/','assets/helmet-lab/red-witness/']){
 const out=new URL(folder,root),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),report={status:'passed',scope:'Plain GLB decode, measured geometry, names, socket frames, rigid posing and original-source hashes. No compressed derivative shipped.',assets:[],pose_samples:0};let names,frames;
 for(const e of manifest.assets){
  const b=await fs.readFile(new URL(e.file,out));assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256);const result=await validator.validateBytes(new Uint8Array(b),{uri:e.file});assert.equal(result.issues.numErrors,0,JSON.stringify(result.issues));assert.equal(result.issues.numWarnings,0,JSON.stringify(result.issues));
  const doc=await io.readBinary(new Uint8Array(b)),nodes=doc.getRoot().listNodes(),current=nodes.map(n=>n.getName()).sort();assert.equal(new Set(current).size,current.length);assert(current.every(n=>n&&!n.includes('.')));assert.deepEqual(current,e.required_nodes);if(names)assert.deepEqual(current,names);names=current;
  const sockets=Object.fromEntries(nodes.filter(n=>n.getName().startsWith('SOCKET_')).map(n=>[n.getName(),n.getWorldMatrix()]));if(frames)for(const[k,m]of Object.entries(frames))m.forEach((v,i)=>assert(Math.abs(sockets[k][i]-v)<1e-6));frames=sockets;
  let triangles=0,draws=0,minimumArea=Infinity;for(const n of nodes)for(const p of n.getMesh()?.listPrimitives()||[]){draws++;const ix=p.getIndices(),pos=p.getAttribute('POSITION');triangles+=ix.getCount()/3;for(const a of p.listAttributes())assert([...a.getArray()].every(Number.isFinite));const v=[[],[],[]];for(let i=0;i<ix.getCount();i+=3){for(let j=0;j<3;j++)pos.getElement(ix.getScalar(i+j),v[j]);const ab=v[1].map((x,k)=>x-v[0][k]),ac=v[2].map((x,k)=>x-v[0][k]),cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],area=Math.hypot(...cross)/2;assert(area>5e-13);minimumArea=Math.min(minimumArea,area);}}
  assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);const bounds=getBounds(doc.getRoot().listScenes()[0]);for(const k of ['min','max'])bounds[k].forEach((v,i)=>assert(Math.abs(v-e.bounds[k][i])<1e-7));
  assert(doc.getRoot().getAsset().copyright.includes('attribution to Jelaludo'));assert.equal(doc.getRoot().listAnimations().length,0);assert.equal(doc.getRoot().listTextures().length,e.lod===2?0:folder.includes('helmet-lab')?4:7);
  if(e.lod===1)assert(triangles<=25000);if(e.lod===2){assert(triangles<=3000);assert.equal(draws,1);assert(e.bytes<=250000);}
  if(folder==='assets/red-witness/'){
   const scene=await loadGeometryGLB(b),rig=createRig(scene);assert.equal(rig.static,e.lod===2);assert(JOINTS.every(n=>rig.nodes[n]));
   for(const s of ['L','R']){const h=rig.nodes['HAND_'+s],f=rig.nodes['FOOT_'+s];scene.updateMatrixWorld(true);assert(Math.abs(h.matrixWorld.elements[13]-.93)<1e-6);assert(Math.abs(f.matrixWorld.elements[13]-.168)<1e-6);}
   const initial=rig.nodes.HEAD.quaternion.clone();for(const yaw of [-.5,0,.5])for(const arm of [0,.2,.4]){rig.pose({headYaw:yaw,armLift:arm});assert([...rig.nodes.HEAD.matrixWorld.elements].every(Number.isFinite));if(e.lod===2)assert(rig.nodes.HEAD.quaternion.equals(initial));report.pose_samples++;}rig.pose();assert(rig.nodes.HEAD.quaternion.equals(initial));
  }
  report.assets.push({file:e.file,triangles,draw_calls:draws,bytes:b.length,nodes:current.length,minimum_triangle_area_m2:minimumArea,gltf_errors:result.issues.numErrors,gltf_warnings:result.issues.numWarnings});
 }
 const provenance=JSON.parse(await fs.readFile(new URL('provenance.json',out)));let preserved=0;for(const e of provenance.files){const p=provenance.source_project+'/'+e.file;try{const b=await fs.readFile(p);assert.equal(sha(b),e.sha256);preserved++;}catch(error){if(error.code!=='ENOENT')throw error;}}report.external_source_files_verified=preserved;
 await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(folder,JSON.stringify(report));
}
