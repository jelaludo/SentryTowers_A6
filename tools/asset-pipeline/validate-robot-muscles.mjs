import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import {createRig,assemblySpread} from '../../assets/robot-assembly/runtime.js';
import {createMuscleRig} from '../../assets/robot-assembly/muscles/runtime.js';
import {MUSCLES} from '../../assets/robot-assembly/muscles/specs.js';
const base=new URL('../../assets/robot-assembly/',import.meta.url),out=new URL('muscles/',base),m=JSON.parse(await fs.readFile(new URL('manifest.json',out))),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),near=(a,b,e=2e-5)=>assert(Math.abs(a-b)<e,`${a} != ${b}`),loader=new GLTFLoader();
const load=async path=>{const b=await fs.readFile(path);return (await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
const originalBytes=execFileSync('git',['show',m.parent.commit+':assets/robot-assembly/manifest.json'],{maxBuffer:8e6}),original=JSON.parse(originalBytes);
assert.equal(m.parent.files['manifest.json'],sha(originalBytes));for(const e of original.assets)assert.equal(m.parent.files[e.file],e.sha256);assert.equal(m.parent.files['runtime.js'],original.sources.source_sha256['assets/robot-assembly/runtime.js']);
for(const [file,hash]of Object.entries(m.parent.files))assert.equal(sha(await fs.readFile(new URL(file,base))),hash,'original changed: '+file);
for(const [file,hash]of Object.entries(original.sources.source_sha256))assert.equal(sha(await fs.readFile(new URL('../../'+file,import.meta.url))),hash,'original authoring source changed: '+file);
for(const [file,hash]of Object.entries(m.source_sha256))assert.equal(sha(await fs.readFile(new URL('../../'+file,import.meta.url))),hash,'layer source hash: '+file);
const report={status:'passed',scope:'Original asset byte preservation; plain layer validation; source-frame matching, endpoint attachment, deformation, explosion and independent toggling. No pressure, force or arbitrary collision proof.',preserved_commit:m.parent.commit,preserved_files:Object.keys(m.parent.files).length,muscle_groups:MUSCLES.length,files:[],motion_samples:0,attachment_checks:0},layers=[];
function transforms(scene){const data={};scene.updateMatrixWorld(true);scene.traverse(n=>{if(n.name)data[n.name]={position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray(),world:n.matrixWorld.toArray()};});return data;}
for(const e of m.assets){
 const bytes=await fs.readFile(new URL(e.file,out));assert.equal(sha(bytes),e.sha256);assert.equal(bytes.length,e.bytes);const v=await validator.validateBytes(bytes);assert.equal(v.issues.numErrors,0,JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,JSON.stringify(v.issues));
 const scene=await load(new URL(e.file,out));layers[e.lod]=scene;scene.updateMatrixWorld(true);scene.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});const names=[],geometry=[];let tris=0,degens=0;
 scene.traverse(n=>{if(n.name){names.push(n.name);assert(!n.name.includes('.'));}if(n.isMesh)geometry.push(n);});assert.equal(new Set(names).size,names.length);
 for(const mesh of geometry){const g=mesh.geometry,p=g.attributes.position,ix=g.index?.array,count=ix?.length||p.count,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();tris+=count/3;for(const attribute of Object.values(g.attributes))for(const value of attribute.array)assert(Number.isFinite(value));for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,ix?ix[i]:i);b.fromBufferAttribute(p,ix?ix[i+1]:i+1);c.fromBufferAttribute(p,ix?ix[i+2]:i+2);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-24)degens++;}
  if(e.lod===2)assert(!mesh.isSkinnedMesh);else{assert(mesh.isSkinnedMesh);assert.equal(mesh.parent,scene);const w=g.attributes.skinWeight,idx=g.attributes.skinIndex;for(let i=0;i<w.count;i++){near(w.getX(i),1);near(w.getY(i)+w.getZ(i)+w.getW(i),0);assert(idx.getX(i)<mesh.skeleton.bones.length);}}
 }
 assert.equal(degens,0);assert.equal(tris,e.triangles);assert.equal(geometry.length,e.draw_calls);const bounds=new T.Box3().setFromObject(scene,true);bounds.min.toArray().forEach((x,i)=>near(x,e.bounds.min[i]));bounds.max.toArray().forEach((x,i)=>near(x,e.bounds.max[i]));
 report.files.push({file:e.file,sha256:e.sha256,triangles:tris,draw_calls:geometry.length,bytes:bytes.length,gltf_errors:v.issues.numErrors,gltf_warnings:v.issues.numWarnings,degenerate_triangles:degens});
}
const reference=transforms(layers[1]);for(const layer of [layers[0],layers[2]]){const other=transforms(layer);assert.deepEqual(Object.keys(reference).sort(),Object.keys(other).sort());for(const[name,frame]of Object.entries(reference))for(const key of ['position','quaternion','scale','world'])frame[key].forEach((x,i)=>near(x,other[name][key][i]));}
for(const key of ['min','max'])m.assets[1].bounds[key].forEach((x,i)=>near(x,m.assets[2].bounds[key][i]));
const host=await load(new URL('aurel03_assembly_d0_lod1.glb',base)),rig=createRig(host),layer=layers[1],muscleRig=createMuscleRig(layer,host),world=n=>n.getWorldPosition(new T.Vector3());
let neutralBiceps,flexedBiceps,minLength=Infinity,maxThickness=0;
for(let i=0;i<=240;i++){
 const time=i/20;rig.pose({time,articulation:1,openHands:i/240});const before=transforms(host);muscleRig.update();assert.deepEqual(transforms(host),before,'layer changed original frames');
 for(const s of MUSCLES){for(const[end,anchor]of [['ORIGIN',s.origin],['INSERTION',s.insertion]]){const target=new T.Vector3(...anchor.p).applyMatrix4(host.getObjectByName(anchor.node).matrixWorld),socket=world(layer.getObjectByName('SOCKET_'+s.id+'_'+end));near(target.distanceTo(socket),0);report.attachment_checks++;}
  const body=layer.getObjectByName('MUSCLE_'+s.id),tendon=layer.getObjectByName('TENDON_'+s.id);assert(body.matrixWorld.elements.every(Number.isFinite));assert(body.scale.y>.01);assert(body.scale.x>=.82-1e-5&&body.scale.x<=1.28+1e-5);near(tendon.scale.x,1);near(tendon.scale.z,1);minLength=Math.min(minLength,body.scale.y);maxThickness=Math.max(maxThickness,body.scale.x);
 }
 if(i===0)neutralBiceps=layer.getObjectByName('MUSCLE_BICEPS_L').scale.y;if(i===120)flexedBiceps=layer.getObjectByName('MUSCLE_BICEPS_L').scale.y;report.motion_samples++;
}
assert(flexedBiceps<neutralBiceps,'biceps should shorten through flexion');
rig.pose();muscleRig.update();const neutralOwners=Object.fromEntries([...new Set(MUSCLES.map(s=>s.module))].map(id=>[id,world(host.getObjectByName('PART_'+id))])),neutral=transforms(layer);
for(let i=0;i<=200;i++){
 const spread=assemblySpread(i/10);rig.pose({spread});muscleRig.update({spread});
 for(const s of MUSCLES){const bone=layer.getObjectByName('MUSCLE_'+s.id),old=neutral[bone.name];near(bone.scale.y,old.scale[1]);bone.quaternion.toArray().forEach((x,j)=>near(x,old.quaternion[j]));const expected=new T.Vector3(...old.position).add(world(host.getObjectByName('PART_'+s.module)).sub(neutralOwners[s.module]));near(world(bone).distanceTo(expected),0);}
 report.motion_samples++;
}
// A shared parent placement is applied once to both scenes, with no drift/double scale.
rig.pose({time:6,articulation:1});const parent=new T.Group();parent.position.set(2,1,-3);parent.rotation.y=.63;parent.scale.setScalar(1.2);parent.add(host,layer);parent.updateMatrixWorld(true);muscleRig.update();for(const s of MUSCLES){const p=new T.Vector3(...s.origin.p).applyMatrix4(host.getObjectByName(s.origin.node).matrixWorld);near(p.distanceTo(world(layer.getObjectByName('SOCKET_'+s.id+'_ORIGIN'))),0);}
const fixed=transforms(layers[2]),frozen=createMuscleRig(layers[2],host);assert(frozen.static);frozen.update({spread:1});assert.deepEqual(fixed,transforms(layers[2]));
assert(m.assets[1].triangles<=25000);assert(m.assets[2].triangles<=1500);assert.equal(m.assets[2].draw_calls,1);assert(m.assets[2].bytes<250000);
report.min_muscle_length_m=minLength;report.max_thickness_factor=maxThickness;report.biceps={neutral_m:neutralBiceps,flexed_m:flexedBiceps};report.combined_costs=m.assets.map(e=>({lod:e.lod,...e.combined_with_original}));
report.checks=['All 42 original GLBs, original manifest/runtime and original procedural sources unchanged','Three self-contained plain GLBs with no validator errors/warnings','Same unique names, root placement and driver/socket frames across layer tiers','Original skeleton receives no TRS edits from muscle updates','All tendon endpoints remain on authored attachment points during inspection','Muscle thickness responds to endpoint distance while tendon radius remains constant','Exploded modules preserve muscle lengths and orientation','Shared translated/rotated/scaled instance wrapper does not double-transform the layer','Distance layer preserves game bounds and does not animate','Combined geometry costs reported separately; production composite remains over budget'];
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,files:report.files.length,muscles:report.muscle_groups,samples:report.motion_samples,attachments:report.attachment_checks}));
