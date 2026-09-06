import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplify,resample,textureCompress,meshopt} from '@gltf-transform/functions';
import {MeshoptSimplifier,MeshoptEncoder} from 'meshoptimizer';
import sharp from 'sharp';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node optimize.mjs INPUT.glb OUTPUT_DIRECTORY');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
await Promise.all([MeshoptSimplifier.ready,MeshoptEncoder.ready]);await fs.mkdir(output,{recursive:true});
const source=await io.read(input);
function stats(doc){
 const root=doc.getRoot();let triangles=0,vertices=0;
 for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){vertices+=p.getAttribute('POSITION').getCount();triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;}
 return {triangles,vertices,materials:root.listMaterials().length,textures:root.listTextures().length,uniqueJoints:new Set(root.listSkins().flatMap(s=>s.listJoints())).size,skinBindings:root.listSkins().length,animations:root.listAnimations().map(a=>a.getName())};
}
const report={source:{bytes:(await fs.stat(input)).size,...stats(source)},variants:[]};
for(const profile of [{id:'balanced',resolution:512,ratio:.10,error:.003},{id:'compact',resolution:256,ratio:.035,error:.01}]){
 const doc=await io.read(input);
 await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:profile.ratio,error:profile.error}),resample(),prune({keepLeaves:true}));
 await doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',resize:[profile.resolution,profile.resolution],quality:88,slots:/^(?!normalTexture$)/}),textureCompress({encoder:sharp,targetFormat:'webp',resize:[profile.resolution,profile.resolution],lossless:true,slots:/normalTexture/}),dedup(),prune({keepLeaves:true}));
 await doc.transform(meshopt({encoder:MeshoptEncoder,level:'high'}));
 const file=`astronaut-${profile.id}.glb`;await io.write(path.join(output,file),doc);
 const result={...profile,file,bytes:(await fs.stat(path.join(output,file))).size,...stats(doc)};report.variants.push(result);console.log(JSON.stringify(result));
}
await fs.writeFile(path.join(output,'astronaut-report.json'),JSON.stringify(report,null,2)+'\n');
