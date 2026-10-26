import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder,resample} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const out=new URL('../../assets/mechanical-cheetah/',import.meta.url);const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out)));
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const e of manifest.assets){const path=new URL(e.file,out);const doc=await io.read(path.pathname);for(const scene of doc.getRoot().listScenes())scene.setName('C07_MECHANICAL_CHEETAH');
 // Keep sockets and the independent engine sensor free of redundant baked keys.
 for(const a of doc.getRoot().listAnimations())for(const c of a.listChannels())if(c.getTargetNode().getName().startsWith('SOCKET_')||c.getTargetNode().getName()==='SENSOR_YAW')c.dispose();
 for(const a of doc.getRoot().listAnimations())for(const s of a.listSamplers())if(!a.listChannels().some(c=>c.getSampler()===s))s.dispose();
 await doc.transform(resample({tolerance:1e-5}),dedup());await io.write(path.pathname,doc);const bytes=await fs.readFile(path);e.bytes=bytes.length;e.sha256=sha(bytes);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(gltf.scene,true);e.bounds={min:box.min.toArray(),max:box.max.toArray(),dimensions_m:box.getSize(new T.Vector3()).toArray()};e.required_nodes=doc.getRoot().listNodes().map(n=>n.getName()).filter(Boolean).sort();e.sockets=[];gltf.scene.traverse(o=>{if(o.name.startsWith('SOCKET_'))e.sockets.push({node:o.name,parent:o.parent.name,position_m:o.getWorldPosition(new T.Vector3()).toArray()});});
 const names=gltf.animations.map(c=>c.name);if(e.lod<2&&names.length!==6)throw new Error('Incorrect clips '+names);
 await doc.transform(reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const packed=await io.writeBinary(doc);await fs.mkdir(new URL('derived/meshopt/',out),{recursive:true});e.meshopt_file='derived/meshopt/'+e.file.replace('.glb','.meshopt.glb');e.meshopt_derived=true;e.meshopt_bytes=packed.length;e.meshopt_sha256=sha(packed);await fs.writeFile(new URL(e.meshopt_file,out),packed);console.log(e.file,e.triangles,e.draw_calls,e.bytes,'packed',e.meshopt_bytes,names);
}
manifest.animation.placement_node='instance wrapper around the glTF scene';manifest.animation.skeleton_root='ROOT';
manifest.budgets={game_triangles:25000,distance_triangles:3000,distance_draw_calls:1,distance_bytes:250000};
manifest.integration={placement:'Place the entire glTF scene in an instance group. ROOT is an unanimated skeleton lookup. Clone with SkeletonUtils.clone.',gait:'Translate the instance group along +Z at clips.speed_mps multiplied by playback rate. Keep LOD1 during animated gameplay.',pounce:'MOTION contains 1.2 m of forward travel. Do not apply additional game locomotion during Pounce.',sensor:'SENSOR_YAW is excluded from clips and may be aimed by the engine.',collision:'SOCKET_PAW_FL/FR/HL/HR mark paw soles 3 mm above the authored floor. Game supplies collision and terrain adaptation.',bounds:'Use validation-report.json clip envelopes for animation-aware culling. The 0.65 by 3.0 m plot reserves the standing silhouette; pounce travels beyond it.',units:'Authored kinematic mechanical gait, not a physical cheetah speed or ground-reaction-force simulation.'};
manifest.provenance={geometry:'Original procedural model; no reference geometry or textures copied.',walk_reference:{file:'Cat walk.glb',sha256:'51b589493729ee93bb23457dfc7739caff9d8684fc5e5528532f41e19aa9f6c8',duration_s:0.7666666507720947,keys:24,usage:'Observed contact order, shoulder glide and head stability; not redistributed or retargeted.'},motion_sources:['https://www.nature.com/articles/s41598-021-88879-0','https://journals.biologists.com/jeb/article/215/14/2425/10852/High-speed-galloping-in-the-cheetah-Acinonyx']};
const source=await fs.readFile(new URL('../../source/blender/a6-mechanical-cheetah.blend',out));manifest.source={file:'../../source/blender/a6-mechanical-cheetah.blend',bytes:source.length,sha256:sha(source),role:'Editable LOD0 authoring master; plain GLBs are runtime source of truth'};
await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
