import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,prune,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const ROOT=fileURLToPath(new URL('../..',import.meta.url));
const OUT=path.join(ROOT,'assets/missile-factory');
const ARM=path.join(ROOT,'assets/assembly-line/robotic_arm_d0.glb');
const MISSILE=path.join(ROOT,'assets/missile-kit/needle.glb');
const C={floor:0x26373b,frame:0x344b50,steel:0x819397,ivory:0xd4d8c9,amber:0xe79936,cyan:0x24c2ce,dark:0x101f24,green:0x4b9d77,red:0x9f473a};
globalThis.FileReader=class{result=null;onloadend=null;onerror=null;readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();},e=>this.onerror?.(e));}readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();},e=>this.onerror?.(e));}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);await fs.mkdir(OUT,{recursive:true});
const loader=new GLTFLoader(),io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
async function load(file){const b=await fs.readFile(file);return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
async function sha(file){return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');}
function safe(s){return(s||'NODE').replaceAll('.','_').replace(/[^A-Za-z0-9_-]/g,'_').replace(/_+/g,'_');}
function mat(){return new T.MeshStandardMaterial({name:'FACTORY_VERTEX_PALETTE',color:0xffffff,vertexColors:true,metalness:.4,roughness:.55});}
function colorize(g,color){const c=new T.Color(color),a=new Uint8Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=Math.round(c.r*255);a[i+1]=Math.round(c.g*255);a[i+2]=Math.round(c.b*255);}g.setAttribute('color',new T.Uint8BufferAttribute(a,3,true));return g;}
function box(size,pos,color,rot=[0,0,0]){const g=new T.BoxGeometry(...size);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));return colorize(g,color);}
function cyl(r,h,n,pos,color,rot=[0,0,0]){const g=new T.CylinderGeometry(r,r,h,n);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));return colorize(g,color);}
function beam(a,b,width,color){const p=new T.Vector3(...a),q=new T.Vector3(...b),d=q.clone().sub(p),g=new T.BoxGeometry(width,d.length(),width);g.applyMatrix4(new T.Matrix4().compose(p.add(q).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()),new T.Vector3(1,1,1)));return colorize(g,color);}
function merge(parts){const g=mergeGeometries(parts,false);if(!g)throw Error('Geometry merge failed');parts.forEach(p=>p.dispose());return g;}
function addMesh(parent,name,parts,shared){const mesh=new T.Mesh(merge(parts),shared);mesh.name=name;parent.add(mesh);return mesh;}
function node(parent,name,pos=[0,0,0],extra={}){const o=new T.Group();o.name=name;o.position.fromArray(pos);o.userData=extra;parent.add(o);return o;}
const sockets=[
 {id:'PARTS_IN',kind:'material_input',position_m:[-9,0,-2],normal:[-1,0,0]},
 {id:'POWER',kind:'power',position_m:[0,.4,-3.8],normal:[0,0,-1]},
 {id:'CASE_OUT',kind:'cargo_output',position_m:[9,0,1.5],normal:[1,0,0]},
 {id:'SERVICE',kind:'human_access',position_m:[0,0,4],normal:[0,0,1]}
];
function chassis(root,lod,shared){const p=[box([19,.28,8],[0,.14,0],C.floor),box([14,.22,2.5],[-1.2,.95,-.8],C.frame),box([14,.06,1.8],[-1.2,1.08,-.8],C.dark)];
 for(const x of [-7,-3,1,5]){p.push(box([.16,1.1,2.8],[x,.55,-.8],C.steel),box([3.15,.08,.12],[x+1.65,1.13,.12],C.amber));}
 for(const x of [-7.5,-3.1,1.3,5.7]){p.push(box([2.2,.14,.64],[x,1.24,-.8],C.steel),box([.08,.6,.7],[x-1.02,1.55,-.8],C.frame),box([.08,.6,.7],[x+1.02,1.55,-.8],C.frame));}
 // Four broad stations read as feed, shell, avionics/fins, and final inspection.
 for(const x of [-6.7,-2.3,2.1,6.4])p.push(box([2.35,.035,.36],[x,.305,3.55],C.cyan));
 for(const x of [-4.5,4.5]){p.push(box([.28,3.7,.28],[x,1.85,-2.9],C.steel),box([.28,3.7,.28],[x,1.85,1.25],C.steel),box([9.3,.24,.28],[0,3.62,-2.9],C.frame),box([9.3,.24,.28],[0,3.62,1.25],C.frame));}
 for(const x of [-7,-5,-3,-1,1,3,5])p.push(cyl(.14,2.5,lod===0?16:8,[x,.92,-.8],C.steel,[0,0,Math.PI/2]));
 p.push(box([.9,1.8,.65],[-8,1.1,1.8],C.frame),box([.72,.52,.04],[-8,1.65,2.15],C.cyan),box([.72,.12,.06],[-8,1.12,2.16],C.amber));
 if(lod===0){for(const x of [-7.8,-5.8,-3.8,-1.8,.2,2.2,4.2,6.2])p.push(box([.045,.7,.06],[x,.72,-2.24],C.amber));}
 addMesh(root,'FACTORY_STRUCTURE',p,shared);
}
function proxyMissile(parent,name,pos,stage,shared,lod,scale=1){const g=node(parent,name,pos,{construction_stage:stage});g.scale.setScalar(scale);const n=lod===2?5:10,p=[];
 if(stage>=1)p.push(cyl(.19,1.25,n,[0,0,0],C.ivory,[Math.PI/2,0,0]));
 if(stage>=2){p.push(cyl(.23,.23,n,[0,0,-.52],C.frame,[Math.PI/2,0,0]));for(const s of [-1,1])p.push(box([.045,.3,.42],[s*.25,0,-.42],C.amber,[0,0,s*.23]));}
 if(stage>=3){p.push(cyl(.16,.36,n,[0,0,.73],C.cyan,[Math.PI/2,0,0]));for(const s of [-1,1])p.push(box([.045,.18,.33],[s*.19,0,.05],C.steel));}
 if(stage>=4)p.push(cyl(.10,.18,n,[0,0,-.75],C.dark,[Math.PI/2,0,0]));
 if(p.length)addMesh(g,name+'_GEOMETRY',p,shared);return g;
}
function caseGeometry(parent,name,pos,count,shared,lod){const g=node(parent,name,pos,{role:'open_missile_storage_case',capacity:4,filled_count:count});const p=[box([2.5,.16,2.45],[0,.17,0],C.frame),box([2.5,.48,.12],[0,.49,-1.17],C.steel),box([2.5,.48,.12],[0,.49,1.17],C.steel),box([.12,.48,2.3],[-1.18,.49,0],C.steel),box([.12,.48,2.3],[1.18,.49,0],C.steel)];for(const x of [-.65,0,.65])p.push(box([.08,.08,2.1],[x,.35,0],C.dark));if(lod===0){for(const x of [-1.02,1.02])for(const z of [-1.02,1.02])p.push(box([.16,.16,.16],[x,.78,z],C.amber));}addMesh(g,name+'_FRAME',p,shared);return g;}
function addArm(root,name,pos,shared,lod){const base=node(root,name,pos,{role:'articulated_robot_arm',engine_driven_pivots:true}),waist=node(base,name+'_WAIST',[0,.5,0]),shoulder=node(waist,name+'_SHOULDER',[0,.38,0]),elbow=node(shoulder,name+'_ELBOW',[0,1.2,0]),wrist=node(elbow,name+'_WRIST',[0,1.08,0]);
 addMesh(base,name+'_BASE',[cyl(.45,.34,10,[0,.17,0],C.frame)],shared);addMesh(waist,name+'_HOUSING',[box([.48,.53,.48],[0,.14,0],C.amber)],shared);addMesh(shoulder,name+'_UPPER',[box([.32,1.2,.36],[0,.6,0],C.ivory),cyl(.27,.55,10,[0,0,0],C.dark,[Math.PI/2,0,0])],shared);addMesh(elbow,name+'_FOREARM',[box([.26,1.08,.3],[0,.54,0],C.amber),cyl(.22,.46,10,[0,0,0],C.dark,[Math.PI/2,0,0])],shared);addMesh(wrist,name+'_TOOL',[box([.38,.14,.25],[0,.08,0],C.frame),box([.07,.35,.1],[-.15,-.12,0],C.steel),box([.07,.35,.1],[.15,-.12,0],C.steel)],shared);return{waist,shoulder,elbow,wrist};}
async function detailedReuse(root,shared){const arm=await load(ARM),missile=await load(MISSILE);const sourceArm=arm.scene.getObjectByName('ARM_00');if(!sourceArm)throw Error('Reusable arm ARM_00 missing');let index=0;for(const [x,z] of [[-3.6,-2.15],[3.3,-2.15]]){const clone=sourceArm.clone(true);clone.traverse(o=>{o.name=`FACTORY_ARM_${index}_${safe(o.name)}_${String(index++).padStart(2,'0')}`;});clone.position.set(x,0,z);clone.rotation.y=Math.PI;clone.userData={role:'reused_detailed_robot_arm',source_asset:'assets/assembly-line/robotic_arm_d0.glb'};root.add(clone);}
 const motion=missile.scene.getObjectByName('MISSILE_MOTION');if(!motion)throw Error('Reusable missile MISSILE_MOTION missing');const template=motion.clone(true);template.traverse(o=>{if(o.name==='EXHAUST_FX')o.visible=false;});const positions=[[-6.7,1.48,-.8],[-2.3,1.48,-.8],[2.1,1.48,-.8],[6.4,1.48,-.8]];positions.forEach((p,i)=>{const m=template.clone(true);m.traverse(o=>{if(i<3&&/Dark_nose_cap|Cyan_identification_band/.test(o.name))o.visible=false;if(i<2&&/Swept_tail_fin|Exhaust_nozzle/.test(o.name))o.visible=false;if(i<1&&/Casing_collar/.test(o.name))o.visible=false;});let j=0;m.traverse(o=>o.name=`STAGE_${i+1}_MISSILE_${safe(o.name)}_${String(j++).padStart(2,'0')}`);m.position.fromArray(p);m.userData={construction_stage:i+1,source_asset:'assets/missile-kit/needle.glb',role:'reused_missile_geometry'};root.add(m);});
 return template;
}
function addStorage(root,shared,lod,template){const all=[];for(let c=0;c<3;c++){const x=3.4+c*2.5,z=2.25;const holder=caseGeometry(root,`STORAGE_CASE_${String(c+1).padStart(2,'0')}`,[x,0,z],c===0?4:c===1?2:0,shared,lod);for(let i=0;i<4;i++){const slot=i+1,n=`CASE_${String(c+1).padStart(2,'0')}_MISSILE_${String(slot).padStart(2,'0')}`;let m;if(lod===0){m=template.clone(true);let j=0;m.traverse(o=>o.name=`${n}_${safe(o.name)}_${String(j++).padStart(2,'0')}`);holder.add(m);m.position.set((i%2?1:-1)*.52,.61,i<2?-.48:.48);}else m=proxyMissile(holder,n,[(i%2?1:-1)*.52,.65,i<2?-.48:.48],4,shared,lod,.7);m.userData={...m.userData,inventory_slot:c*4+i+1};if(c===1&&i>=2||c===2)m.scale.setScalar(.0001);all.push(m);}}return all;}
function socketNodes(root){for(const s of sockets){const o=node(root,'SOCKET_'+s.id,s.position_m,{kind:s.kind});o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...s.normal));}}
function unique(root){const used=new Set();root.traverse(o=>{let n=safe(o.name||o.type),i=2;while(used.has(n))n=`${safe(o.name||o.type)}_${i++}`;o.name=n;used.add(n);});}
function metrics(root){let triangles=0,draw_calls=0;const materials=new Set();root.traverse(o=>{if(!o.isMesh||!o.visible)return;let p=o.parent;while(p){if(!p.visible)return;p=p.parent;}triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls+=o.geometry.groups.length||1;for(const m of [].concat(o.material))materials.add(m);});return{triangles:Math.round(triangles),draw_calls,materials:materials.size,textures:0};}
function animation(arms){const t=[0,2,4,6,8],tracks=[];for(const [i,a] of arms.entries()){for(const [part,angles] of [[a.waist,[0,.25,.12,-.15,0]],[a.shoulder,[-.6,-.85,-.5,-.72,-.6]],[a.elbow,[1.15,1.55,1.25,1.5,1.15]],[a.wrist,[.15,.3,.05,.25,.15]]]){const values=[];for(const v of angles)values.push(...new T.Quaternion().setFromAxisAngle(new T.Vector3(i?0:0,0,1),v).toArray());tracks.push(new T.QuaternionKeyframeTrack(`${part.name}.quaternion`,t,values));}}return[new T.AnimationClip('Missile_Assembly_Cycle',8,tracks)];}
async function exportOne(lod){const root=node(new T.Scene(),'MISSILE_FACTORY_ROOT',[0,0,0],{family:'missile_factory',lod,damage_level:0,plot_m:[20,10]});const shared=mat();chassis(root,lod,shared);let template,arms=[],clips=[];
 if(lod===0)template=await detailedReuse(root,shared);
 else{for(const [i,x] of [-6.7,-2.3,2.1,6.4].entries())proxyMissile(root,`STAGE_${i+1}_MISSILE`,[x,1.48,-.8],i+1,shared,lod);if(lod===1){arms=[addArm(root,'ASSEMBLY_ARM_01',[-3.6,0,-2.15],shared,lod),addArm(root,'ASSEMBLY_ARM_02',[3.3,0,-2.15],shared,lod)];clips=animation(arms);}else{const p=[];for(const x of [-3.6,3.3])p.push(cyl(.45,.35,8,[x,.18,-2.15],C.frame),beam([x,.5,-2.15],[x-.5,2,-2.15],.32,C.ivory),beam([x-.5,2,-2.15],[x-.1,2.6,-1.5],.25,C.amber));addMesh(root,'DISTANCE_ARM_SILHOUETTES',p,shared);for(const name of ['ASSEMBLY_ARM_01','ASSEMBLY_ARM_02'])for(const suffix of ['','_WAIST','_SHOULDER','_ELBOW','_WRIST'])node(root,name+suffix,[0,0,0],{static_lookup_only:true});}}
 addStorage(root,shared,lod,template);socketNodes(root);unique(root);
 // Export one merged, static render mesh at LOD2 while retaining lookup nodes.
 if(lod===2){root.updateMatrixWorld(true);const parts=[];root.traverse(o=>{if(o.isMesh&&o.visible){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);parts.push(g);}});const preserve=[];root.traverse(o=>{if(o!==root&&!o.isMesh&&(o.name.startsWith('SOCKET_')||o.name.startsWith('ASSEMBLY_ARM_')||o.name.startsWith('STAGE_')||o.name.startsWith('STORAGE_CASE_')))preserve.push({name:o.name,position:o.getWorldPosition(new T.Vector3()).toArray(),quaternion:o.getWorldQuaternion(new T.Quaternion()).toArray(),userData:o.userData});});for(const child of [...root.children])root.remove(child);addMesh(root,'MISSILE_FACTORY_DISTANCE_GEOMETRY',parts,shared);for(const o of preserve){const n=node(root,o.name,o.position,{...o.userData,static_lookup_only:true});n.quaternion.fromArray(o.quaternion);}}
 const scene=root.parent;scene.updateMatrixWorld(true);const filename=`missile_factory_d0_lod${lod}.glb`,file=path.join(OUT,filename);const data=await new GLTFExporter().parseAsync(scene,{binary:true,animations:clips,onlyVisible:true,trs:true});await fs.writeFile(file,Buffer.from(data));const doc=await io.read(file);await doc.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),reorder({encoder:MeshoptEncoder,target:'size'}));doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const compressed=file.replace('.glb','.meshopt.glb');await io.write(compressed,doc);const box3=new T.Box3().setFromObject(root,true);return{id:`missile_factory_d0_lod${lod}`,family:'missile_factory',name:'A6 / Missile Factory',file:filename,meshopt_file:path.basename(compressed),lod,quality:['detailed_master','game','distance'][lod],damage_level:0,state:'intact',static:lod===2,derived:lod>0,derived_from:lod>0?'missile_factory_d0_lod0.glb':null,bytes:(await fs.stat(file)).size,sha256:await sha(file),meshopt_bytes:(await fs.stat(compressed)).size,meshopt_sha256:await sha(compressed),...metrics(root),plot_m:[20,10],bounds:{min:box3.min.toArray(),max:box3.max.toArray()},sockets,clips:clips.map(c=>({name:c.name,duration_s:c.duration,loop:true})),credit:'Models by jelaludo'};}
const assets=[];for(const lod of [0,1,2]){const e=await exportOne(lod);assets.push(e);console.log(e.file,e.triangles,e.draw_calls,e.bytes);}
const manifest={schema:'jelaludo.asset-family/v2-candidate',family:'missile_factory',label:'A6 / Missile Factory',status:'contract_candidate_pending_game_camera_reference_phone',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground at plot centre'},budgets:{lod1:{triangles_max:8000,draw_calls_max:10,plain_bytes_max:400000},lod2:{triangles_max:3000,draw_calls_max:1,plain_bytes_max:250000}},lod_selection:{initial:'lod2',approach_distance_m:150,hysteresis_m:20},construction_stages:['empty shell','motor and fins','guidance section','finished missile'],storage:{case_capacity:4,case_count:3,authored_inventory:6,inventory_node_prefix:'CASE_',viewer_inventory_range:[0,12]},sources:{robotic_arm:{file:'../assembly-line/robotic_arm_d0.glb',sha256:await sha(ARM),role:'exact detailed geometry; reduced articulated game proxy'},missile:{file:'../missile-kit/needle.glb',sha256:await sha(MISSILE),role:'exact detailed geometry; reduced stage and storage proxies'}},assets};await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
