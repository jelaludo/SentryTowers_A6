import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import {createRig,MODULES,SPEC} from '../../assets/helmet-lab/hex-witness/runtime.js';
import {faceMap,OPTICS} from './hex-witness-shape.mjs';
const out=new URL('../../assets/helmet-lab/hex-witness/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),loader=new GLTFLoader(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`),load=async b=>(await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
const report={status:'passed',scope:'Decoded plain exports; geometry, rest frames, inspection separation, authored head/nose clearance and open grille. Reference envelopes are visual fit checks, not certification or donning simulation.',files:[],module_pose_checks:0},scenes=[];
for(const[file,hash]of Object.entries(manifest.source_sha256))assert.equal(sha(await fs.readFile(new URL('../../'+file,import.meta.url))),hash,'Source changed: '+file);
assert.equal(sha(await fs.readFile(new URL('../../'+manifest.fit_reference.robot_file,import.meta.url))),manifest.fit_reference.sha256);
const origin=new T.Vector3(),triangle=new T.Triangle(),closest=new T.Vector3();
function fit(scene,center,radii){
 let minimum=Infinity,worstMesh='';const c=new T.Vector3(...center),r=new T.Vector3(...radii);scene.updateMatrixWorld(true);
 scene.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,count=ix?.count||p.count;
  for(let i=0;i<count;i+=3){for(const[v,j]of[[triangle.a,0],[triangle.b,1],[triangle.c,2]])v.fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld).sub(c).divide(r);triangle.closestPointToPoint(origin,closest);const d=closest.length();if(d<minimum){minimum=d;worstMesh=mesh.name;}}
 });return {minimum_normalized_radius:minimum,nearest_mesh:worstMesh,intersects:minimum<1};
}
const frames=scene=>{const r={};scene.updateMatrixWorld(true);scene.traverse(n=>{if(n.name)r[n.name]=n.matrixWorld.toArray();});return r;};
function trianglesOf(scene){const result=[];scene.updateMatrixWorld(true);scene.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});scene.traverse(n=>{if(!n.isMesh)return;const p=n.geometry.attributes.position,ix=n.geometry.index,count=ix?.count||p.count;for(let i=0;i<count;i+=3){const v=[0,1,2].map(j=>n.getVertexPosition(ix?ix.getX(i+j):i+j,new T.Vector3()).applyMatrix4(n.matrixWorld));result.push({v,box:new T.Box3().setFromPoints(v),name:n.name});}});return result;}
function tree(items){const box=new T.Box3();for(const t of items)box.union(t.box);if(items.length<=24)return{box,items};const size=box.getSize(new T.Vector3()),axis=size.x>size.y?(size.x>size.z?'x':'z'):(size.y>size.z?'y':'z');items.sort((a,b)=>a.box.min[axis]+a.box.max[axis]-b.box.min[axis]-b.box.max[axis]);const mid=items.length>>1;return{box,left:tree(items.slice(0,mid)),right:tree(items.slice(mid))};}
// Triangle SAT, including in-plane axes for coplanar pairs. AABB tree avoids
// comparing every head triangle with every master triangle.
function intersects(a,b){
 const edges=v=>[v[1].clone().sub(v[0]),v[2].clone().sub(v[1]),v[0].clone().sub(v[2])],ea=edges(a.v),eb=edges(b.v),na=ea[0].clone().cross(ea[1]),nb=eb[0].clone().cross(eb[1]),axes=[na,nb,...ea.map(e=>na.clone().cross(e)),...eb.map(e=>nb.clone().cross(e))];for(const x of ea)for(const y of eb)axes.push(x.clone().cross(y));
 for(const axis of axes){if(axis.lengthSq()<1e-24)continue;axis.normalize();const x=a.v.map(v=>v.dot(axis)),y=b.v.map(v=>v.dot(axis));if(Math.max(...x)<Math.min(...y)-1e-9||Math.max(...y)<Math.min(...x)-1e-9)return false;}return true;
}
function collisions(root,t,result){if(!root.box.intersectsBox(t.box))return;if(root.items){for(const a of root.items)if(a.box.intersectsBox(t.box)&&intersects(a,t))result.push([a.name,t.name]);}else{collisions(root.left,t,result);collisions(root.right,t,result);}}
for(const e of manifest.assets){
 const bytes=await fs.readFile(new URL(e.file,out));assert.equal(sha(bytes),e.sha256);assert.equal(bytes.length,e.bytes);const validation=await validator.validateBytes(bytes);assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues));assert.equal(validation.issues.numWarnings,0,JSON.stringify(validation.issues));
 const scene=await load(bytes);scenes[e.lod]=scene;scene.updateMatrixWorld(true);let triangles=0,draws=0,degenerate=0;const names=[];
 scene.traverse(n=>{if(n.name){names.push(n.name);assert(!n.name.includes('.'));}if(!n.isMesh)return;draws++;const g=n.geometry,p=g.attributes.position,ix=g.index,count=ix?.count||p.count;triangles+=count/3;for(const a of Object.values(g.attributes))for(const v of a.array)assert(Number.isFinite(v));for(let i=0;i<count;i+=3){for(const[v,j]of[[triangle.a,0],[triangle.b,1],[triangle.c,2]])v.fromBufferAttribute(p,ix?ix.getX(i+j):i+j);if(triangle.getArea()<5e-13)degenerate++;}});
 assert.equal(degenerate,0);assert.equal(new Set(names).size,names.length);assert.deepEqual(names.sort(),e.required_nodes);assert.equal(triangles,e.triangles);assert.equal(draws,e.draw_calls);const b=new T.Box3().setFromObject(scene,true);for(const k of['min','max'])b[k].toArray().forEach((v,i)=>{near(v,e.bounds[k][i]);near(v,manifest.assets[0].bounds[k][i]);});
 for(const s of e.sockets){const n=scene.getObjectByName(s.node);n.getWorldPosition(new T.Vector3()).toArray().forEach((v,i)=>near(v,s.position_m[i]));n.getWorldQuaternion(new T.Quaternion()).toArray().forEach((v,i)=>near(v,s.quaternion_xyzw[i]));}
 const human=fit(scene,SPEC.head_envelope.center,SPEC.head_envelope.radii),nose=fit(scene,[0,.204,.115],[.014,.023,.019]);assert(!human.intersects,JSON.stringify({file:e.file,human}));assert(!nose.intersects,JSON.stringify({file:e.file,nose}));
 report.files.push({file:e.file,sha256:e.sha256,bytes:bytes.length,triangles,draw_calls:draws,gltf_errors:validation.issues.numErrors,gltf_warnings:validation.issues.numWarnings,degenerate_triangles:degenerate,human_fit:human,nose_fit:nose});
}
const reference=frames(scenes[0]);for(const scene of scenes.slice(1)){const f=frames(scene);assert.deepEqual(Object.keys(f).sort(),Object.keys(reference).sort());for(const n of Object.keys(f))f[n].forEach((v,i)=>near(v,reference[n][i]));}
report.preserved_breach_warden={commit:manifest.preserved_breach_warden.commit,files:0};
const preserved=execFileSync('git',['ls-tree','-r','--name-only',manifest.preserved_breach_warden.commit,'assets/helmet-lab/breach-warden','tools/asset-pipeline/breach-warden-shape.mjs','assets/robot-assembly','docs/ASSET-COLLABORATION.md'],{maxBuffer:1e7}).toString().trim().split('\n');
for(const file of preserved){const bytes=await fs.readFile(new URL('../../'+file,import.meta.url)),old=execFileSync('git',['show',manifest.preserved_breach_warden.commit+':'+file],{maxBuffer:8e7});assert.equal(sha(bytes),sha(old),'Original changed: '+file);report.preserved_breach_warden.files++;}
const robot=await load(await fs.readFile(new URL('../../'+manifest.fit_reference.robot_file,import.meta.url)));robot.position.fromArray(SPEC.robot_head_offset_m);const robotTriangles=trianglesOf(robot);report.robot_fit=[];
const attachment=robot.getObjectByName('SOCKET_HEAD_ATTACH'),headDatum=scenes[0].getObjectByName('SOCKET_HEAD_DATUM');near(attachment.getWorldPosition(new T.Vector3()).distanceTo(headDatum.getWorldPosition(new T.Vector3())),0);near(new T.Vector3(0,0,1).transformDirection(attachment.matrixWorld).dot(new T.Vector3(0,0,1).transformDirection(headDatum.matrixWorld)),-1);
for(const scene of scenes){const hits=[],bvh=tree(trianglesOf(scene));for(const t of robotTriangles)collisions(bvh,t,hits);assert.equal(hits.length,0,JSON.stringify(hits.slice(0,10)));report.robot_fit.push({lod:createRig(scene).root.userData.lod,reference_triangles:robotTriangles.length,surface_intersections:hits.length,reference_scale:1});}
for(const scene of scenes){const rig=createRig(scene);for(const spread of[0,.5,1,0]){rig.pose({spread});for(const[id,{offset}]of Object.entries(MODULES)){rig.nodes[id].position.toArray().forEach((v,i)=>near(v,rig.static?0:offset[i]*spread));report.module_pose_checks++;}}}
report.optical_mounts=[];report.grille=[];
const normal=(map,x,y)=>map(x+1e-5,y).sub(map(x-1e-5,y)).cross(map(x,y+1e-5).sub(map(x,y-1e-5))).normalize();
for(const scene of scenes.slice(0,2)){
 scene.updateMatrixWorld(true);
 for(const spec of OPTICS){
  const p=faceMap(spec.x,spec.y),n=normal(faceMap,spec.x,spec.y),socket=scene.getObjectByName('SOCKET_OPTIC_'+spec.id),socketNormal=new T.Vector3(0,0,1).transformDirection(socket.matrixWorld);
  near(socketNormal.dot(n),1);const ray=new T.Raycaster(p.clone().addScaledVector(n,.10),n.clone().negate()),hits=ray.intersectObject(scene,true);
  assert(hits.length&&['OPTICAL_CORES','OPTICAL_GLASS'].includes(hits[0].object.name),'Occluded optic '+spec.id);
  const glassHits=ray.intersectObject(scene.getObjectByName('OPTICAL_GLASS'));assert(glassHits.length&&glassHits[0].face.normal.dot(n)>.90,'Inward optical surface '+spec.id);
  for(const [u,v]of[[.55,0],[-.55,0],[0,.55],[0,-.55]]){const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),n),start=p.clone().add(new T.Vector3(u*spec.glass,v*spec.glass,.10).applyQuaternion(q)),probe=new T.Raycaster(start,n.clone().negate()),h=probe.intersectObject(scene,true)[0];assert(h?.object.name==='OPTICAL_GLASS','Housing covers lens '+spec.id);}
  report.optical_mounts.push({lod:createRig(scene).root.userData.lod,optic:spec.id,first_hit:hits[0].object.name,outward_normal_dot:glassHits[0].face.normal.dot(n)});
 }
 const chin=(x,y)=>faceMap(x,y).addScaledVector(normal(faceMap,x,y),.014);
 scene.traverse(n=>{if(n.isMesh)n.material.side=T.DoubleSide;});
 for(let i=0;i<6;i++)for(const y of[.088,.100,.112]){
  const x=-.019+(i+.5)*.006333,p=chin(x,y),n=normal(chin,x,y),ray=new T.Raycaster(p.clone().addScaledVector(n,.04),n.clone().negate()),hit=ray.intersectObject(scene.getObjectByName('SURFACE_RESPIRATOR'))[0];assert(hit&&hit.distance>.044&&hit.distance<.050,'Blocked chin opening');report.grille.push({lod:createRig(scene).root.userData.lod,slot:i,y,filter_recess_m:hit.distance-.04});
 }
}
assert(manifest.assets[1].triangles<=25000);assert(manifest.assets[1].draw_calls<=10);assert(manifest.assets[2].triangles<=3000);assert.equal(manifest.assets[2].draw_calls,1);assert(manifest.assets[2].bytes<250000);
report.checks=['Three plain self-contained GLBs with zero validator errors/warnings','Finite nondegenerate triangles and measured costs','Unique dot-free names, same rest frames, sockets and bounds in all tiers','Eight independent inspectable modules; static distance cannot explode','No triangle intersects the authored head or nose ellipsoid','No surface intersections with the unchanged AUREL sensor head at the specified rest placement','Five outward-facing optical sockets and visible optical surfaces in both inspectable tiers','All six chin openings reach the recessed filter','Breach Warden, robot assembly originals and the received collaboration contract remain byte-identical'];
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,files:report.files.length,pose_checks:report.module_pose_checks,optical_mounts:report.optical_mounts.length,grille_samples:report.grille.length,original_files:report.preserved_breach_warden.files}));
