import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import validator from 'gltf-validator';

const dir=new URL('../../assets/isao-birudoron/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const requiredNodes=['ISAO_ROOT','BODY_PITCH','LED_PANEL','ROTOR_FL_SPIN','ROTOR_FR_SPIN','ROTOR_RL_SPIN','ROTOR_RR_SPIN','LEG_FL_HIP','LEG_FL_KNEE','LEG_FL_CLAW','LEG_FR_HIP','LEG_FR_KNEE','LEG_FR_CLAW','LEG_RL_HIP','LEG_RL_KNEE','LEG_RL_CLAW','LEG_RR_HIP','LEG_RR_KNEE','LEG_RR_CLAW','TOOL_NOZZLE_YAW','TOOL_NOZZLE_PITCH','TOOL_NOZZLE_EXTEND','TOOL_HEAD','TOOL_TIP','CARGO_GRIP','TERRAFORMER_ASSEMBLY_ORIGIN'];
const requiredClips=['Rotor_Cycle','Hover_Idle','Emotion_Neutral','Emotion_Happy','Emotion_Curious','Emotion_Working','Emotion_Alarm','Tool_Fabricate'];

function geometryStats(root){
  let triangles=0,drawCalls=0,degenerate=0,unnamedMeshNodes=0;
  for(const node of root.listNodes()){
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
  return {triangles,drawCalls,degenerate,unnamedMeshNodes};
}

const concept=manifest.assets.find(entry=>entry.id==='isao_birudoron_initial_concept');
const conceptBytes=fs.readFileSync(new URL(concept.file,dir));
assert.equal(sha(conceptBytes),concept.source_sha256,'preserved concept GLB hash');
const sheet=manifest.reference_images[0];
assert.equal(sha(fs.readFileSync(new URL(sheet.file,dir))),sheet.sha256,'concept sheet hash');
const conceptReport=await validator.validateBytes(conceptBytes,{maxIssues:100});
assert.equal(conceptReport.issues.numErrors,0,JSON.stringify(conceptReport.issues));
assert.equal(conceptReport.issues.numWarnings,0,JSON.stringify(conceptReport.issues));
const conceptJSONLength=conceptBytes.readUInt32LE(12),conceptJSON=JSON.parse(conceptBytes.subarray(20,20+conceptJSONLength).toString('utf8').trim());
assert.equal(conceptJSON.bufferViews[conceptJSON.images[0].bufferView].byteLength,concept.embedded_texture_bytes);
const conceptDoc=await io.read(new URL(concept.file,dir).pathname),conceptRoot=conceptDoc.getRoot();
const conceptStats=geometryStats(conceptRoot),conceptScene=conceptRoot.getDefaultScene()||conceptRoot.listScenes()[0],conceptBounds=getBounds(conceptScene);
assert.equal(conceptStats.triangles,concept.triangles);assert.equal(conceptStats.drawCalls,concept.draw_calls);assert.equal(conceptStats.unnamedMeshNodes,concept.unnamed_mesh_nodes);assert.equal(conceptStats.degenerate,0);
concept.bounds_min_m.forEach((v,i)=>assert(Math.abs(conceptBounds.min[i]-v)<1e-6));concept.bounds_max_m.forEach((v,i)=>assert(Math.abs(conceptBounds.max[i]-v)<1e-6));

let baselineNodes=null;
for(const entry of manifest.assets.filter(item=>item.production_lod)){
  const bytes=fs.readFileSync(new URL(entry.file,dir));
  assert.equal(bytes.length,entry.bytes,`${entry.id} byte count`);assert.equal(sha(bytes),entry.sha256,`${entry.id} hash`);
  const report=await validator.validateBytes(bytes,{maxIssues:100});assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));
  const doc=await io.read(new URL(entry.file,dir).pathname),root=doc.getRoot(),scene=root.getDefaultScene()||root.listScenes()[0],nodes=root.listNodes(),names=nodes.map(node=>node.getName()).filter(Boolean),stats=geometryStats(root);
  assert.equal(stats.triangles,entry.triangles);assert.equal(stats.drawCalls,entry.draw_calls);assert.equal(stats.degenerate,0);assert.equal(stats.unnamedMeshNodes,0);
  assert.equal(nodes.length,entry.nodes,`${entry.id} node count`);assert.equal(root.listMaterials().length,entry.materials,`${entry.id} material count`);assert.equal(root.listTextures().length,entry.embedded_textures,`${entry.id} texture count`);
  assert.equal(new Set(names).size,names.length,`${entry.id} unique names`);assert(names.every(name=>!name.includes('.')),`${entry.id} dot-free names`);
  for(const name of requiredNodes)assert(nodes.some(node=>node.getName()===name),`${entry.id} missing ${name}`);
  const engine=[...entry.engine_nodes].sort();if(baselineNodes)assert.deepEqual(engine,baselineNodes,`${entry.id} engine hierarchy`);else baselineNodes=engine;
  const animations=root.listAnimations();assert.deepEqual(animations.map(animation=>animation.getName()).sort(),[...requiredClips].sort());
  for(const expected of entry.clips){const animation=animations.find(item=>item.getName()===expected.name);assert(Math.abs(animation.listSamplers()[0].getInput().getMax([])[0]-expected.duration_s)<.001,`${entry.id} ${expected.name} duration`);}
  for(const emotion of requiredClips.filter(name=>name.startsWith('Emotion_'))){const animation=animations.find(item=>item.getName()===emotion),targets=new Set(animation.listChannels().map(channel=>channel.getTargetNode().getName()));for(const face of ['FACE_NEUTRAL','FACE_HAPPY','FACE_CURIOUS','FACE_WORKING','FACE_ALARM'])assert(targets.has(face),`${emotion} missing ${face}`);if(emotion!=='Emotion_Neutral')assert([...targets].some(name=>name.startsWith('LEG_')),`${emotion} needs limb performance`);}
  assert(animations.find(item=>item.getName()==='Rotor_Cycle').listChannels().every(channel=>channel.getTargetNode().getName().endsWith('_SPIN')));
  assert(animations.find(item=>item.getName()==='Tool_Fabricate').listChannels().some(channel=>channel.getTargetNode().getName().startsWith('TOOL_NOZZLE')));
  assert.deepEqual(nodes.find(node=>node.getName()==='FACE_NEUTRAL').getScale(),[1,1,1]);
  assert(nodes.find(node=>node.getName()==='LED_PANEL').getWorldTranslation()[2]>.3,'LED panel must face +Z side');
  const bounds=getBounds(scene),size=bounds.max.map((value,i)=>value-bounds.min[i]);assert(bounds.min[1]>=-1e-5,`${entry.id} below ground`);
  entry.bounds_min_m.forEach((v,i)=>assert(Math.abs(bounds.min[i]-v)<1e-5,`${entry.id} min ${i}`));entry.bounds_max_m.forEach((v,i)=>assert(Math.abs(bounds.max[i]-v)<1e-5,`${entry.id} max ${i}`));entry.dimensions_m.forEach((v,i)=>assert(Math.abs(size[i]-v)<1e-5,`${entry.id} size ${i}`));
  for(const socket of entry.sockets){const node=nodes.find(item=>item.getName()===socket.id);const position=node.getWorldTranslation();socket.position_m.forEach((v,i)=>assert(Math.abs(position[i]-v)<1e-5,`${entry.id} ${socket.id} axis ${i}`));}
  assert(entry.triangles<=25000,`${entry.id} unit triangle budget`);if(entry.lod===1)assert(entry.draw_calls<=40,'game draw-call review ceiling');assert.equal(root.listTextures().length,0);
  console.log(`PASS ${entry.id}: ${entry.triangles} triangles, ${entry.draw_calls} draws, ${entry.bytes} bytes, ${entry.clips.length} clips`);
}

assert.equal(manifest.status,'production_alpha');assert(manifest.future_tiers.filter(tier=>['LOD0','LOD1'].includes(tier.tier)).every(tier=>tier.status==='production_alpha_delivered'));
const viewer=fs.readFileSync(new URL('../../isao-birudoron/viewer.js',import.meta.url),'utf8');assert(viewer.includes('faceTexture.flipY=true'));assert(viewer.includes('Tool_Fabricate'));
console.log(`PASS ${concept.id}: preserved SHA, ${concept.triangles} triangles, ${concept.draw_calls} draws, ${conceptReport.issues.numWarnings} warnings`);
