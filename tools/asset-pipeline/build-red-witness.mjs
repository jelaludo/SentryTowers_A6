// Import Red Witness without changing the external authoring project.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {copyToDocument,compactPrimitive,transformPrimitive,joinPrimitives,prune,dedup,unpartition,getBounds} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import * as T from 'three';
const source=process.env.RED_WITNESS_SOURCE||'/Users/jela/Dev/3d_assets/red_witness_helmet';
const root=new URL('../../',import.meta.url),io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const credit='Red Witness models and adaptations by Jelaludo. Reuse requires attribution to Jelaludo — https://jelaludo.github.io/SentryTowers_A6/';
await MeshoptSimplifier.ready;
const sourceFiles=new Map(),images=new Map();
async function readSource(file){const bytes=await fs.readFile(path.join(source,file));sourceFiles.set(file,{file,bytes:bytes.length,sha256:sha(bytes)});return bytes;}
async function loadSource(file){const j=JSON.parse(await readSource(file));for(const r of [...j.buffers,...(j.images||[])])if(r.uri&&!r.uri.startsWith('data:'))await readSource(path.posix.join(path.posix.dirname(file),r.uri));return io.read(path.join(source,file));}
function cleanTriangles(doc){for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
 const a=p.getAttribute('POSITION'),ix=p.getIndices(),keep=[],v=[[],[],[]];
 for(let i=0;i<ix.getCount();i+=3){const ids=[0,1,2].map(j=>ix.getScalar(i+j));ids.forEach((k,j)=>a.getElement(k,v[j]));const ab=new T.Vector3(...v[1]).sub(new T.Vector3(...v[0])),ac=new T.Vector3(...v[2]).sub(new T.Vector3(...v[0]));if(ab.cross(ac).lengthSq()>1e-24)keep.push(...ids);}
 ix.setArray(new Uint32Array(keep));compactPrimitive(p);
 // Repair zero-length source decimation tangents; preserve the authored basis
 // everywhere else. The fallback is perpendicular to the existing normal.
 const tangent=p.getAttribute('TANGENT'),normal=p.getAttribute('NORMAL'),t=[],nv=[];
 if(tangent)for(let i=0;i<tangent.getCount();i++){tangent.getElement(i,t);if(Math.hypot(...t.slice(0,3))<.5){normal.getElement(i,nv);const n=new T.Vector3(...nv),v=new T.Vector3(Math.abs(n.x)<.8?1:0,Math.abs(n.x)<.8?0:1,0).cross(n).normalize();tangent.setElement(i,[v.x,v.y,v.z,t[3]<0?-1:1]);}}
}}
async function textureTier(doc,size){for(const tex of doc.getRoot().listTextures()){
 const raw=tex.getImage(),key=sha(raw)+':'+size;let b=images.get(key);
 if(!b){b=await sharp(raw).resize(size,size,{fit:'inside',withoutEnlargement:true}).jpeg({quality:size===4096?94:90,chromaSubsampling:'4:4:4'}).toBuffer();images.set(key,b);}
 tex.setImage(b).setMimeType('image/jpeg').setURI('');
}}
function socket(doc,parent,name,position){const n=doc.createNode(name).setTranslation(position).setExtras({role:'attachment_socket'});parent.addChild(n);return n;}
function normalize(doc,kind,lod){
 const scene=doc.getRoot().listScenes()[0];scene.setName('');
 const top=doc.createNode(kind==='figure'?'RED_WITNESS_ROOT':'RED_WITNESS_HELMET_ROOT').setExtras({family:kind==='figure'?'red-witness':'red-witness-helmet',lod,damage_level:0,static:lod===2,credit});
 for(const n of scene.listChildren())top.addChild(n);scene.addChild(top);
 for(const n of doc.getRoot().listNodes())if(n!==top){n.setName(kind==='figure'?n.getName().replace(/_LOD\d$/,'').replaceAll('.','_').toUpperCase():'PART_SHELL');n.setExtras({...n.getExtras(),module:'SHELL'});if(n.getMesh())n.getMesh().setName(n.getName()+'_SURFACE');}
 if(kind==='figure'){
  // Imported extremities have geometry in world coordinates and zero-origin nodes.
  // Rebase their geometry to the actual ankle/wrist, preserving the rest surface.
  for(const side of ['L','R'])for(const [part,position] of [['HAND',[side==='L'?.295:-.295,.93,.02]],['FOOT',[side==='L'?.115:-.115,.168,-.03]]]){
   const n=doc.getRoot().listNodes().find(n=>n.getName()===part+'_'+side),world=new T.Matrix4().fromArray(n.getWorldMatrix()),desired=new T.Matrix4().makeTranslation(...position),delta=desired.clone().invert().multiply(world);
   for(const p of n.getMesh().listPrimitives())transformPrimitive(p,delta.toArray());
   const parent=new T.Matrix4().fromArray(n.getParentNode().getWorldMatrix());n.setMatrix(parent.invert().multiply(desired).toArray());
  }
  const find=name=>doc.getRoot().listNodes().find(n=>n.getName()===name);
  socket(doc,find('HEAD'),'SOCKET_HELMET',[0,0,0]);
  for(const s of ['L','R']){socket(doc,find('HAND_'+s),'SOCKET_HAND_'+s,[0,0,0]);socket(doc,find('FOOT_'+s),'SOCKET_FOOT_'+s,[0,-.168,0]);}
 }else{socket(doc,top,'SOCKET_NECK',[0,0,0]);socket(doc,top,'SOCKET_HEAD',[0,.17,0]);socket(doc,top,'SOCKET_OPTICS',[0,.19,.145]);}
 const distance=doc.createNode('DISTANCE_SURFACE').setExtras({static_lookup_only:lod!==2});top.addChild(distance);
 return top;
}
async function distanceMesh(doc,top,target){
 const primitives=[],palette=doc.createMaterial('RED_WITNESS_DISTANCE_PALETTE').setBaseColorFactor([1,1,1,1]).setMetallicFactor(.3).setRoughnessFactor(.65),decoded=new Map();
 for(const n of doc.getRoot().listNodes())if(n.getMesh()){
  for(const p of n.getMesh().listPrimitives()){
   const mat=p.getMaterial(),tex=mat.getBaseColorTexture(),uv=p.getAttribute('TEXCOORD_0'),a=p.getAttribute('POSITION'),colors=new Float32Array(a.getCount()*3),sample=[];
   if(!decoded.has(tex))decoded.set(tex,await sharp(tex.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true}));
   const {data,info}=decoded.get(tex),factor=mat.getBaseColorFactor(),emissive=mat.getEmissiveTexture();
   if(emissive&&!decoded.has(emissive))decoded.set(emissive,await sharp(emissive.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true}));
   for(let i=0;i<a.getCount();i++){uv.getElement(i,sample);const x=Math.min(info.width-1,Math.max(0,Math.floor(sample[0]*info.width))),y=Math.min(info.height-1,Math.max(0,Math.floor(sample[1]*info.height))),k=(y*info.width+x)*info.channels;for(let c=0;c<3;c++){const s=data[k+c]/255;colors[i*3+c]=(s<=.04045?s/12.92:((s+.055)/1.055)**2.4)*factor[c];}if(emissive){const e=decoded.get(emissive),x=Math.min(e.info.width-1,Math.max(0,Math.floor(sample[0]*e.info.width))),y=Math.min(e.info.height-1,Math.max(0,Math.floor(sample[1]*e.info.height))),k=(y*e.info.width+x)*e.info.channels;for(let c=0;c<3;c++){const s=e.data[k+c]/255;colors[i*3+c]=Math.min(1,colors[i*3+c]+2*s*s);}}}
   p.setAttribute('COLOR_0',doc.createAccessor().setType('VEC3').setArray(colors).setBuffer(a.getBuffer()));
   transformPrimitive(p,n.getWorldMatrix());for(const s of p.listSemantics())if(!['POSITION','NORMAL','COLOR_0'].includes(s))p.setAttribute(s,null);p.setMaterial(palette);primitives.push(p);
  }n.setMesh(null);
 }
 const p=joinPrimitives(primitives),positions=p.getAttribute('POSITION').getArray(),ix=Uint32Array.from(p.getIndices().getArray());
 // Weld coincident UV/normal seams before topology reduction. Avoid spatial-grid
 // reduction: it can leave thin shell/rib surfaces visibly torn at this budget.
 const remap=MeshoptSimplifier.generatePositionRemap(positions,3),welded=Uint32Array.from(ix,i=>remap[i]);
 let [indices,error]=MeshoptSimplifier.simplify(welded,positions,3,target*3,.2);
 let method='Source helmet LOD3 with texture-to-vertex color sampling';
 if(top.getName()==='RED_WITNESS_ROOT'){
  // The source contains many independent thin muscle/bone surfaces. Blender's
  // collapse reducer retains those components better than global grid reduction.
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'red-witness-distance-')),input=path.join(tmp,'input.json'),output=path.join(tmp,'output.json'),rows=(array,size)=>Array.from({length:array.length/size},(_,i)=>Array.from(array.slice(i*size,(i+1)*size)));
  await fs.writeFile(input,JSON.stringify({positions:rows(positions,3),colors:rows(p.getAttribute('COLOR_0').getArray(),3),triangles:rows(ix,3)}));
  execFileSync(process.env.BLENDER||(process.platform==='darwin'?'/Applications/Blender.app/Contents/MacOS/Blender':'blender'),['-b','--factory-startup','-t','2','--python-exit-code','1','--python',new URL('../blender/reduce_red_witness_distance.py',import.meta.url).pathname,'--',input,output,String(target)],{stdio:'pipe'});
  const reduced=JSON.parse(await fs.readFile(output)),buffer=p.getAttribute('POSITION').getBuffer();
  const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(reduced.positions.flat(),3));geometry.setIndex(reduced.triangles.flat());geometry.computeVertexNormals();
  reduced.normals=rows(geometry.attributes.normal.array,3);for(const n of reduced.normals)if(Math.hypot(...n)<.5)n.splice(0,3,0,1,0);geometry.dispose();
  for(const [semantic,key]of [['POSITION','positions'],['NORMAL','normals'],['COLOR_0','colors']])p.setAttribute(semantic,doc.createAccessor().setType('VEC3').setArray(new Float32Array(reduced[key].flat())).setBuffer(buffer));
  indices=new Uint32Array(reduced.triangles.flat());method='Derived 16 mm voxel-union silhouette, Blender collapse reduction and nearest-surface color transfer';error=null;await fs.rm(tmp,{recursive:true});
 }
 p.getIndices().setArray(indices);compactPrimitive(p);
 doc.getRoot().listNodes().find(n=>n.getName()==='DISTANCE_SURFACE').setMesh(doc.createMesh('RED_WITNESS_STATIC_MESH').addPrimitive(p));
 for(const n of doc.getRoot().listNodes())n.setExtras({...n.getExtras(),static_lookup_only:true});
 top.setExtras({...top.getExtras(),static:true});return {method,relative_error:error,derived:true};
}
const manifests=[];
for(const kind of ['figure','helmet']){
 const folder=kind==='figure'?'assets/red-witness/':'assets/helmet-lab/red-witness/',out=new URL(folder,root);await fs.mkdir(out,{recursive:true});
 const assets=[];
 for(const lod of [0,1,2]){
  const sourceLod=lod===0?0:kind==='figure'||lod===2?3:2;
  const file=kind==='figure'?`export/figure/RedWitnessFigure_LOD${sourceLod}.gltf`:`export/gltf/RedWitnessHelmet_LOD${sourceLod}.gltf`,doc=await loadSource(file);
  if(kind==='figure'&&lod>0){const helmet=await loadSource('export/gltf/RedWitnessHelmet_LOD1.gltf'),mesh=helmet.getRoot().listMeshes()[0],map=copyToDocument(doc,helmet,[mesh]);doc.getRoot().listNodes().find(n=>n.getName().startsWith('head_')).setMesh(map.get(mesh));}
  const top=normalize(doc,kind,lod);cleanTriangles(doc);let reduction;
  if(lod===2)reduction=await distanceMesh(doc,top,kind==='figure'?2850:2999);
  else await textureTier(doc,lod===0?4096:2048);
  await doc.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),unpartition());cleanTriangles(doc);
  doc.getRoot().getAsset().copyright=credit;
  const bytes=await io.writeBinary(doc),name=`red_witness${kind==='helmet'?'_helmet':''}_d0_lod${lod}.glb`;
  await fs.writeFile(new URL(name,out),bytes);
  let triangles=0,draw_calls=0;for(const n of doc.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()||[]){triangles+=p.getIndices().getCount()/3;draw_calls++;}
  const bounds=getBounds(doc.getRoot().listScenes()[0]),sockets=doc.getRoot().listNodes().filter(n=>n.getName().startsWith('SOCKET_')).map(n=>({node:n.getName(),parent:n.getParentNode().getName(),position_m:n.getWorldTranslation()}));
  assets.push({file:name,lod,damage_level:0,derived:true,static:lod===2,bytes:bytes.length,sha256:sha(bytes),triangles,draw_calls,materials:doc.getRoot().listMaterials().length,plot_m:kind==='figure'?[1.2,1]:[.4,.4],bounds:{...bounds,dimensions_m:bounds.max.map((v,i)=>v-bounds.min[i])},required_nodes:doc.getRoot().listNodes().map(n=>n.getName()).sort(),sockets,clips:[],credit,source_geometry:kind==='figure'&&lod>0?'Original body LOD3 + helmet LOD1':file,texture_resolution:lod===2?null:lod===0?4096:2048,reduction});
  console.log(kind,lod,triangles,draw_calls,bytes.length);
 }
 const manifest={schema:'jelaludo.asset-family/v2-candidate',family:kind==='figure'?'red-witness':'red-witness-helmet',label:kind==='figure'?'Red Witness / Humanoid':'Red Witness / Optical helmet',revision:1,plain_glb_source_of_truth:true,coordinate_system:{units:'metres',up:'+Y',forward:'+Z',origin:kind==='figure'?'Original ground datum at stance centre':'Original neck-ring ground datum'},credit,damage_states:{d0:'Intact authored finish',d1_d3:'Not authored'},assets,lod_selection:{default:1,lod0:'Detailed recording master; 4K authored PBR texture maps re-encoded as JPEG',lod1:'Game geometry with 2K PBR textures; articulated rigid joints on figure',lod2:'Static merged silhouette; one material and texture-sampled vertex colors',game_enter_m:12,distance_return_m:16,provisional:true,static_policy:'Use game before any motion; distance nodes retain rest-frame lookup only'},source:{project:source,originals:'External source project preserved unchanged; hashes in provenance.json',hand:'AUREL-01 biped LOD2, 1.2x, by Jelaludo',foot:'AUREL-02 biped LOD2, 1.2x, by Jelaludo',builder:'tools/asset-pipeline/build-red-witness.mjs'},runtime:{file:'runtime.js',clips:[],engine_driven:kind==='figure'?'Rigid named joints. No skinning, muscle stretch, finger articulation or walk clip. Hand/foot pivots rebased without moving their rest geometry.':'Fixed shell. No separate authored inspection modules.'},fit_reference:kind==='helmet'?{robot_file:'assets/robot-assembly/parts/head_sensor/aurel03_head_sensor_d0_lod1.glb',scope:'Proportion overlay only; replacement-head fit is in robot-assembly/helmet-fit'}:undefined,handoff:{folder,viewer:kind==='figure'?'red-witness/':'helmet-lab/?helmet=red-witness',pending:['Visual acceptance','Arbitrary motion and collision','Damage states','Consuming-game texture/release decode and LOD thresholds','Device profiling']}};
 await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');manifests.push(out);
}
for(const file of ['README.md','blend/RedWitness_source.blend','blend/RedWitness_game.blend','blend/RedWitness_figure.blend','scripts/build_figure.py','scripts/rw/body.py'])await readSource(file);
const provenance={source_project:source,imported_at:'2026-11-11',originals_modified:false,credit,files:[...sourceFiles.values()],adaptations:['Dot-free stable node names and shared rest sockets','Hand and foot origins rebased to the actual wrist/ankle without changing rest geometry','Game figure combines original body LOD3 and original helmet LOD1','Master/game embedded JPEG PBR maps derived from original PNGs','Distance tier derived by simplification and texture-to-vertex color sampling']};
for(const out of manifests)await fs.writeFile(new URL('provenance.json',out),JSON.stringify(provenance,null,2)+'\n');
