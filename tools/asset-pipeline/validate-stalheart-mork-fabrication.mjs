import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import validator from 'gltf-validator';

const directory=new URL('../../assets/fabrication-lab/',import.meta.url),root=new URL('../../',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',directory)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(manifest.version,2);assert.equal(manifest.assets.length,3);assert.equal(manifest.units,'meters');assert.equal(manifest.up,'+Y');assert.equal(manifest.forward,'+Z');assert.equal(manifest.plain_glb_source_of_truth,true);assert.equal(manifest.terraformer_family_source,'assets/terraformer/manifest-lods.json');

await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const commonRequired=['STALHEART_ROOT','MORK_ROOT','GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z','J1_BASE_YAW','J2_SHOULDER','J3_ELBOW','J4_FOREARM_ROLL','J5_WRIST_PITCH','J6_TOOL_ROLL','EXTRUSION_TIP','MORK_BUILD_WIREFRAME','MORK_BUILD_LATTICE','MORK_WIREFRAME_GEOMETRY','MORK_STAGE_01_CHASSIS_HULL','MORK_STAGE_02_TURRET_WEAPONS','SOCKET_FABRICATION_ORIGIN'];

function measure(rootObject){let triangles=0,draws=0;const materials=new Set();rootObject.traverse(object=>{if(object.isMesh){const geometry=object.geometry;triangles+=(geometry.index?geometry.index.count:geometry.attributes.position.count)/3;draws++;}else if(object.isLine||object.isPoints)draws++;if(object.material)for(const material of [].concat(object.material))materials.add(material);});return{triangles:Math.round(triangles),draws,materials:materials.size};}
function assertNoSolidTank(tank,file){let meshes=0;tank.traverse(object=>{if(object.isMesh)meshes++;});assert.equal(meshes,0,`${file}: MÖRK must contain no opaque/solid mesh primitives`);const wireframe=tank.getObjectByName('MORK_BUILD_WIREFRAME');let lines=0;wireframe.traverse(object=>{if(object.isLine)lines++;});assert.equal(lines,wireframe.userData.band_nodes.length,`${file}: every declared print band must be one line primitive`);for(const name of ['MORK_STAGE_01_CHASSIS_HULL','MORK_STAGE_02_TURRET_WEAPONS']){const node=tank.getObjectByName(name);let geometryChildren=0;node.traverse(child=>{if(child.isMesh||child.isLine)geometryChildren++;});assert.equal(geometryChildren,0,`${file}: ${name} is compatibility lookup only`);}}

let pivotBaseline;
for(const entry of manifest.assets){
  assert.equal(entry.terraformer_state,'complete_intact_machine');assert.equal(entry.tank_visual_state,'wireframe_only');assert.equal(entry.static_progress,entry.lod===2?1:null);assert.equal(entry.canonical_terraformer.lod,entry.lod);assert.equal(entry.canonical_terraformer.damage_level,0);
  const canonicalBytes=fs.readFileSync(new URL(entry.canonical_terraformer.file,root));assert.equal(hash(canonicalBytes),entry.canonical_terraformer.sha256,`${entry.id}: canonical Stålheart hash`);
  let plainBox;
  for(const compressed of [false,true]){
    const file=compressed?entry.meshopt_file:entry.file,bytes=fs.readFileSync(new URL(file,directory));assert.equal(bytes.length,compressed?entry.meshopt_bytes:entry.bytes);assert.equal(hash(bytes),compressed?entry.meshopt_sha256:entry.sha256);
    if(compressed){const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert(json.extensionsRequired.includes('EXT_meshopt_compression'));}else{const report=await validator.validateBytes(bytes,{maxIssues:50});assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));}
    const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);const names=[];gltf.scene.traverse(object=>{if(object.name)names.push(object.name);});assert.equal(new Set(names).size,names.length,`${file}: names must be unique`);assert(names.every(name=>!name.includes('.')),`${file}: engine-facing names must be dot-free`);for(const name of [...commonRequired,...entry.engine_nodes])assert(gltf.scene.getObjectByName(name),`${file}: missing ${name}`);const front=gltf.scene.getObjectByName('FABRICATION_FRONT');if(entry.lod<2)assert(front.getObjectByName('FABRICATION_FRONT_INDICATOR'),`${file}: missing moving fabrication front`);else{let frontGeometry=0;front.traverse(object=>{if(object.isMesh||object.isLine)frontGeometry++;});assert.equal(frontGeometry,0,`${file}: static endpoint front must be lookup-only`);}
    const measured=measure(gltf.scene);assert.equal(measured.triangles,entry.triangles);assert.equal(measured.draws,entry.draw_calls);assert.equal(measured.materials,entry.materials);
    const stalheart=gltf.scene.getObjectByName('STALHEART_ROOT'),tank=gltf.scene.getObjectByName('MORK_ROOT'),wireframe=gltf.scene.getObjectByName('MORK_BUILD_WIREFRAME');assert.equal(stalheart.userData.visual_state,'complete_intact_machine');assert.equal(tank.userData.visual_state,'fabricating_wireframe_only');assertNoSolidTank(tank,file);
    const stalMetrics=measure(stalheart);assert.equal(stalMetrics.triangles,entry.canonical_terraformer.triangles,`${file}: canonical Stålheart triangle parity`);assert.equal(stalMetrics.draws,entry.canonical_terraformer.draw_calls,`${file}: canonical Stålheart draw parity`);
    const wireSize=new T.Box3().setFromObject(wireframe,true).getSize(new T.Vector3());assert(wireSize.x>5.5&&wireSize.y>2.7&&wireSize.z>13,`${file}: final MÖRK wireframe must retain recognizable full-tank bounds`);
    const box=new T.Box3().setFromObject(gltf.scene,true);if(!compressed)plainBox=box;else{assert(box.min.distanceTo(plainBox.min)<.03);assert(box.max.distanceTo(plainBox.max)<.03);}
    if(entry.lod<2){
      assert.equal(gltf.animations.length,1);const clip=gltf.animations[0],bandNames=wireframe.userData.band_nodes;assert.equal(clip.name,'MORK_Fabrication_Sequence');assert(Math.abs(clip.duration-16)<.001);assert.equal(bandNames.length,12);for(const name of bandNames){const track=clip.tracks.find(candidate=>candidate.name.endsWith(`${name}.position`));assert(track,`${file}: missing ${name} reveal`);assert.equal(track.getInterpolation(),T.InterpolateDiscrete,`${file}: print bands must switch without miniature linework`);}assert(clip.tracks.some(track=>track.name.endsWith('FABRICATION_FRONT.position')));assert(!clip.tracks.some(track=>/MORK_STAGE_0[12].*\.scale$/.test(track.name)),`${file}: deprecated solid stages must never animate`);
      const pivots=Object.fromEntries(entry.engine_nodes.map(name=>{const node=gltf.scene.getObjectByName(name);return[name,[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()]];}));if(!compressed){if(!pivotBaseline)pivotBaseline=pivots;else for(const name of entry.engine_nodes)assert(pivots[name].every((value,index)=>Math.abs(value-pivotBaseline[name][index])<1e-5),`${name}: LOD0/LOD1 pivot mismatch`);}
      const mixer=new T.AnimationMixer(gltf.scene),action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();const machineMeshes=[];stalheart.traverse(node=>{if(node.isMesh)machineMeshes.push(node);});for(const [time,expectedBands] of [[0,0],[8,6],[15.999,11]]){mixer.setTime(time);gltf.scene.updateMatrixWorld(true);const revealed=bandNames.map(name=>gltf.scene.getObjectByName(name)).filter(node=>node.position.y>-1).length;assert.equal(revealed,expectedBands,`${file}: revealed band count at ${time}s`);for(const mesh of machineMeshes){const scale=mesh.getWorldScale(new T.Vector3());assert(mesh.visible&&Math.min(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z))>.01,`${file}: complete Stålheart must remain visible at ${time}s`);}}mixer.setTime(16);assert.equal(bandNames.map(name=>gltf.scene.getObjectByName(name)).filter(node=>node.position.y>-1).length,12,`${file}: endpoint must reveal the complete wireframe`);
    }else{assert.equal(gltf.animations.length,0);assert.equal(wireframe.userData.band_nodes.length,1);assert(entry.triangles<=3000);assert(entry.draw_calls<=2);assert(entry.bytes<=250000);}
  }
  if(entry.lod===1){assert(entry.triangles<=8000);assert(entry.draw_calls<=25);assert(entry.bytes<=650000);}
  console.log('PASS',entry.id,entry.triangles,'solid triangles',entry.draw_calls,'draws',entry.bytes,'plain bytes',entry.meshopt_bytes,'Meshopt bytes');
}
console.log('PASS canonical Stålheart tiers, wireframe-only MÖRK progression, full-wireframe endpoint, plain GLBs and decoded Meshopt exports.');
