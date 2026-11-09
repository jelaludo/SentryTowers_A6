import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import {createRig,MODULES,SPEC} from '../../assets/helmet-lab/breach-warden/runtime.js';
const out=new URL('../../assets/helmet-lab/breach-warden/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out))),loader=new GLTFLoader(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
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
const robot=await load(await fs.readFile(new URL('../../'+manifest.fit_reference.robot_file,import.meta.url)));robot.position.fromArray(SPEC.robot_head_offset_m);const robotTriangles=trianglesOf(robot);report.robot_fit=[];
const attachment=robot.getObjectByName('SOCKET_HEAD_ATTACH'),headDatum=scenes[0].getObjectByName('SOCKET_HEAD_DATUM');near(attachment.getWorldPosition(new T.Vector3()).distanceTo(headDatum.getWorldPosition(new T.Vector3())),0);near(new T.Vector3(0,0,1).transformDirection(attachment.matrixWorld).dot(new T.Vector3(0,0,1).transformDirection(headDatum.matrixWorld)),-1);
for(const scene of scenes){const hits=[],bvh=tree(trianglesOf(scene));for(const t of robotTriangles)collisions(bvh,t,hits);assert.equal(hits.length,0,JSON.stringify(hits.slice(0,10)));report.robot_fit.push({lod:createRig(scene).root.userData.lod,reference_triangles:robotTriangles.length,surface_intersections:hits.length,reference_scale:1});}
for(const scene of scenes){const rig=createRig(scene);for(const spread of[0,.5,1,0]){rig.pose({spread});for(const[id,{offset}]of Object.entries(MODULES)){rig.nodes[id].position.toArray().forEach((v,i)=>near(v,rig.static?0:offset[i]*spread));report.module_pose_checks++;}}}
report.temple_bar=[];report.grille=[];
for(const scene of scenes.slice(0,2)){
 scene.traverse(n=>{if(n.isMesh)n.material.side=T.DoubleSide;});
 const ray=new T.Raycaster(new T.Vector3(.167,.280,.012),new T.Vector3(-1,0,0)),hit=ray.intersectObject(scene.getObjectByName('SURFACE_SHELL'))[0];assert(hit&&hit.distance>=SPEC.temple_bar_clearance_design_m);report.temple_bar.push({lod:createRig(scene).root.userData.lod,center_clearance_m:hit.distance});
 for(const x of[-.018,0,.018])for(const y of[.125,.135,.145]){ray.set(new T.Vector3(x,y,.3),new T.Vector3(0,0,-1));const hit=ray.intersectObject(scene.getObjectByName('SURFACE_RESPIRATOR'))[0];assert(hit&&hit.point.z<.201,`Blocked grille ${x},${y},z=${hit?.point.z}`);report.grille.push({lod:createRig(scene).root.userData.lod,x,y,first_hit_z:hit.point.z});}
}
assert(manifest.assets[1].triangles<15000);assert(manifest.assets[1].bytes<500000);assert(manifest.assets[2].triangles<=3000);assert.equal(manifest.assets[2].draw_calls,1);assert(manifest.assets[2].bytes<250000);
report.checks=['Three plain self-contained GLBs with zero validator errors/warnings','Finite nondegenerate triangles and measured costs','Unique dot-free names, same rest frames, sockets and bounds in all tiers','Eleven independent inspectable modules; static distance cannot explode','No triangle intersects the authored head or nose ellipsoid','No surface intersections with the original AUREL sensor head at the specified rest placement','Temple bar centre has at least 12 mm shell clearance','All three grille slots reach the recessed filter','Original AUREL head source hash preserved'];
await fs.writeFile(new URL('validation-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,files:report.files.length,pose_checks:report.module_pose_checks,temple_bar:report.temple_bar}));
