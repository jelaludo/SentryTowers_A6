import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,prune,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const out=new URL('../../assets/yushi045/',import.meta.url);
const P={shell:0xc9d4c7,armor:0x243d40,metal:0x667f7d,dark:0x071f22,cyan:0x6cddd2,olive:0x71863c,amber:0xe0b963};
const centerY=1.82,rx=1.42,ry=1.08;
const names=['ROOT','YUSHI_BODY','YUSHI_GLASS','DISPENSE_VALVE','VALVE_HANDLE','SOCKET_DISPENSE','SOCKET_FILL','SOCKET_SERVICE','SOCKET_ISAO_APPROACH','LEVEL_READOUT'];
const sockets=[
 {id:'DISPENSE',node:'SOCKET_DISPENSE',position_m:[0,.57,.93],normal:[0,0,1],kind:'binder_outlet'},
 {id:'FILL',node:'SOCKET_FILL',position_m:[-1.41,1.9,0],normal:[-1,0,0],kind:'binder_inlet'},
 {id:'SERVICE',node:'SOCKET_SERVICE',position_m:[0,3.08,0],normal:[0,1,0],kind:'service_cap'},
 {id:'ISAO_APPROACH',node:'SOCKET_ISAO_APPROACH',position_m:[0,.95,2.4],normal:[0,0,-1],kind:'external_docking_approach'}
];
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(x=>{this.result=`data:${blob.type};base64,${Buffer.from(x).toString('base64')}`;this.onloadend?.();});}};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
function prep(g,color,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1],role=[0,0,0]){
 const a=g.index?g.toNonIndexed():g.clone();g.dispose();for(const k of Object.keys(a.attributes))if(!['position','normal'].includes(k))a.deleteAttribute(k);
 a.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(...scale)));
 const n=a.attributes.position.count,c=new T.Color(color);a.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:n},()=>c.toArray()).flat(),3));a.setAttribute('yushi',new T.Float32BufferAttribute(Array.from({length:n},()=>role).flat(),3));a.clearGroups();return a;
}
const box=(size,pos,color,rot=[0,0,0])=>prep(new T.BoxGeometry(...size),color,pos,rot);
const cyl=(r,h,n,pos,color,rot=[0,0,0])=>prep(new T.CylinderGeometry(r,r,h,n),color,pos,rot);
const torus=(r,t,n,pos,color,rot=[Math.PI/2,0,0],radial=4)=>prep(new T.TorusGeometry(r,t,radial,n),color,pos,rot);
function strut(a,b,width,depth,color){const v=new T.Vector3(...b).sub(new T.Vector3(...a)),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());const g=prep(new T.BoxGeometry(width,v.length(),depth),color);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5),q,new T.Vector3(1,1,1)));return g;}
function merge(parts){const merged=mergeGeometries(parts,false),g=mergeVertices(merged,1e-6);parts.forEach(p=>p.dispose());merged.dispose();const c=g.attributes.color;g.setAttribute('color',new T.Uint8BufferAttribute(Array.from(c.array,v=>Math.round(v*255)),3,true));return g;}
function surface(theta,phi,offset=0){return new T.Vector3((rx+offset)*Math.sin(theta)*Math.sin(phi),centerY+(ry+offset)*Math.cos(theta),(rx+offset)*Math.sin(theta)*Math.cos(phi));}
function patch(t0,t1,p0,p1,nt,np,color,role=0,offset=0,segment=0){
 const positions=[],colors=[],controls=[],c=new T.Color(color);
 function vertex(t,p){const v=surface(t,p,offset);positions.push(...v.toArray());colors.push(...c.toArray());controls.push(role,role===1?(segment+(p-p0)/(p1-p0))/8:(v.y-(centerY-ry))/(2*ry),(p-p0)/(p1-p0));}
 for(let j=0;j<nt;j++)for(let i=0;i<np;i++){
  const a=t0+(t1-t0)*j/nt,b=t0+(t1-t0)*(j+1)/nt,c=p0+(p1-p0)*i/np,d=p0+(p1-p0)*(i+1)/np;
  // Outward-facing triangles; omit degenerate pole triangles.
  if(a>1e-6){vertex(a,c);vertex(b,c);vertex(a,d);}
  if(b<Math.PI-1e-6){vertex(a,d);vertex(b,c);vertex(b,d);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('yushi',new T.Float32BufferAttribute(controls,3));
 const normals=[];for(let i=0;i<positions.length;i+=3)normals.push(...new T.Vector3(positions[i]/((rx+offset)**2),(positions[i+1]-centerY)/((ry+offset)**2),positions[i+2]/((rx+offset)**2)).normalize().toArray());g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));return g;
}
function build(lod){
 const master=lod===0,far=lod===2,n=master?64:far?8:24,lat=master?24:far?4:10;
 const body=[],glass=[],handle=[],root=new T.Group();root.name='ROOT';root.userData={family:'yushi045_container',designation:'Yūshi045',lod,damage_level:0,fill_default:.5,units:'meters',up:'+Y',forward:'+Z',origin:'ground plot centre'};
 // A narrow physical opening on +Z. The slit uses the same boundaries in every tier.
 for(const [a,b] of [[0,Math.PI*.2],[Math.PI*.2,Math.PI*.5],[Math.PI*.5,Math.PI*.8],[Math.PI*.8,Math.PI]]){
  const rows=Math.max(1,Math.round((b-a)/Math.PI*lat)),color=a>=Math.PI*.5?P.armor:P.shell;
  if(a>=Math.PI*.2&&b<=Math.PI*.8)body.push(patch(a,b,.13,Math.PI*2-.13,rows,n,color));
  else body.push(patch(a,b,0,Math.PI*2,rows,n,color));
 }
 // Opaque recessed sight well; its two halves bake a readable 50% fallback into plain GLB.
 body.push(patch(Math.PI*.2,Math.PI*.5,-.13,.13,master?8:2,1,P.dark,2,-.024),patch(Math.PI*.5,Math.PI*.8,-.13,.13,master?8:2,1,P.olive,2,-.024));
 for(const p of [-.15,.15])body.push(patch(Math.PI*.195,Math.PI*.805,p-.017,p+.017,master?24:far?3:8,1,P.metal,0,.012));
 for(const t of [Math.PI*.195,Math.PI*.805])body.push(patch(t-.017,t+.017,-.17,.17,1,master?8:2,P.metal,0,.012));
 if(!far)glass.push(patch(Math.PI*.2,Math.PI*.8,-.125,.125,master?20:6,1,0xa9d9cc,0,.005));
 body.push(torus(rx,.075,far?8:master?96:24,[0,centerY,0],P.armor));
 for(let i=0;i<3;i++){
  const a=Math.PI+i*Math.PI*2/3,point=(r,y)=>[Math.sin(a)*r,y,Math.cos(a)*r];
  body.push(strut(point(1.26,1.73),point(1.64,.19),.23,.30,P.armor),box([.58,.16,.64],point(1.67,.08),P.armor,[0,a,0]));
  if(!far)body.push(box([.29,.28,.38],point(1.32,1.63),P.metal,[0,a,0]));
  if(master){body.push(strut(point(1.35,1.40),point(1.68,.30),.095,.34,P.metal));for(const k of [-1,1])body.push(cyl(.045,.035,12,[Math.sin(a)*1.67+k*.16,.178,Math.cos(a)*1.67],P.metal));}
 }
 const capN=master?40:far?4:12;
 body.push(cyl(.26,.15,capN,[0,2.97,0],P.armor),cyl(.29,.065,capN,[0,3.06,0],P.metal));
 body.push(box([.28,.065,.07],[0,3.12,0],P.armor));
 // Gravity-fed bottom outlet, protected service stem, and a short ISA0-facing coupling.
 body.push(cyl(.105,.33,capN,[0,.64,0],P.metal),box([.30,.25,.31],[0,.52,0],P.armor),cyl(.09,.79,capN,[0,.57,.49],P.metal,[Math.PI/2,0,0]),cyl(.145,.10,capN,[0,.57,.89],P.armor,[Math.PI/2,0,0]));
 body.push(cyl(.15,.19,capN,[-1.36,1.9,0],P.armor,[0,0,Math.PI/2]));
 // Eight shoulder patches read from above; no per-segment draw calls.
 for(let i=0;i<8;i++){
  const a=-1.65+i*.4125,b=a+.33;
  body.push(patch(.74,1.01,a-.025,b+.025,1,master?10:1,P.armor,0,.024));
  body.push(patch(.785,.965,a,b,1,master?10:1,i<4?P.cyan:P.dark,1,.036,i));
 }
 // Three small molded ribs mark the container family without requiring textures or fonts.
 if(!far)for(let i=0;i<3;i++)body.push(box([.04,.14,.022],[.48+i*.08,2.23,1.295],P.armor));
 if(master){
  for(let i=0;i<16;i++){const a=i*Math.PI/8;body.push(cyl(.034,.035,10,[Math.sin(a)*1.423,1.91,Math.cos(a)*1.423],P.metal));}
  for(const p of [-.26,.26])for(let j=0;j<5;j++)body.push(patch(1.15+j*.16,1.165+j*.16,p-.04,p+.04,1,2,P.metal,0,.018));
  body.push(torus(.15,.022,32,[0,.57,.95],P.metal,[0,0,0],8),torus(.27,.02,48,[0,3.00,0],P.cyan,[Math.PI/2,0,0],6));
 }
 handle.push(box([.34,.055,.065],[0,0,0],P.amber),cyl(.052,.05,master?24:6,[0,0,0],P.metal,[Math.PI/2,0,0]));
 const opaque=new T.MeshStandardMaterial({name:far?'M_YUSHI_DISTANCE':'M_YUSHI_OPAQUE',vertexColors:true,roughness:.4,metalness:.35});
 const valve=new T.Group();valve.name='DISPENSE_VALVE';valve.position.set(0,.74,.42);valve.userData={engine_driven:!far,static_lookup_only:far,axis:'+Z',closed_radians:0,open_radians:Math.PI/2};root.add(valve);
 if(far){for(const g of handle){g.translate(0,.74,.42);body.push(g);}const lookup=new T.Object3D();lookup.name='VALVE_HANDLE';lookup.userData={static_lookup_only:true};valve.add(lookup);}else{const mesh=new T.Mesh(merge(handle),opaque);mesh.name='VALVE_HANDLE';valve.add(mesh);}
 const mesh=new T.Mesh(merge(body),opaque);mesh.name='YUSHI_BODY';root.add(mesh);
 if(!far){const mat=new T.MeshStandardMaterial({name:'M_YUSHI_SIGHT_GLASS',vertexColors:true,transparent:true,opacity:.18,roughness:.2,metalness:.1,depthWrite:false});const cover=new T.Mesh(merge(glass),mat);cover.name='YUSHI_GLASS';cover.renderOrder=1;root.add(cover);}else{const lookup=new T.Object3D();lookup.name='YUSHI_GLASS';lookup.userData={static_lookup_only:true,glass_omitted:true};root.add(lookup);}
 for(const socket of sockets){const node=new T.Object3D();node.name=socket.node;node.position.fromArray(socket.position_m);node.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...socket.normal));node.userData={socket_kind:socket.kind};root.add(node);}
 const level=new T.Object3D();level.name='LEVEL_READOUT';level.position.set(0,2.7,1);level.userData={role:'capacity_label_anchor'};root.add(level);root.updateMatrixWorld(true);return root;
}
function measure(root){let triangles=0,draw_calls=0;root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls++;}});const b=new T.Box3().setFromObject(root);return{triangles,draw_calls,bounds:{min:b.min.toArray(),max:b.max.toArray(),dimensions_m:b.getSize(new T.Vector3()).toArray()}};}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),assets=[];
for(const lod of [0,1,2]){
 await fs.mkdir(new URL(`lod${lod}/`,out),{recursive:true});const root=build(lod),file=`lod${lod}/yushi045_container_d0_lod${lod}.glb`,bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));await fs.writeFile(new URL(file,out),bytes);
 const document=await io.readBinary(bytes);await document.transform(dedup(),prune({keepLeaves:true,keepAttributes:true}),reorder({encoder:MeshoptEncoder,target:'size'}));document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});const packed=await io.writeBinary(document),meshopt_file=file.replace('.glb','.meshopt.glb');await fs.writeFile(new URL(meshopt_file,out),packed);
 const entry={id:`yushi045_container_d0_lod${lod}`,family:'yushi045_container',designation:'Yūshi045',file,meshopt_file,lod,damage_level:0,state:'intact',static:lod===2,derived:false,bytes:bytes.length,meshopt_bytes:packed.length,sha256:sha(bytes),meshopt_sha256:sha(packed),...measure(root),plot_m:[4,4],sockets,clips:[],required_nodes:names,engine_nodes:names,fill_default:.5,fill_attribute:'_YUSHI',opaque_draw_calls:lod===2?1:2,optional_glass_draw_calls:lod===2?0:1,review_status:'contract_candidate_pending_game_camera_reference_phone',credit:'Model by jelaludo'};assets.push(entry);console.log(entry.id,entry.triangles,'triangles',entry.draw_calls,'draws',entry.bytes,'bytes');
}
const manifest={schema:'jelaludo.asset-family/v2-candidate',version:1,family:'yushi045_container',label:'Yūshi045 / Bio-Pearl',japanese:'有機性資源コンテナ 第045型',status:'contract_candidate_pending_game_camera_reference_phone',plain_glb_source_of_truth:true,coordinate_system:{units:'meters',up:'+Y',forward:'+Z',origin:'ground plot centre'},supported_damage_levels:[0],missing_damage_states_reason:'First intact prototype; damage variants require a separate design request.',budgets:{lod1:{triangles_max:1500,draw_calls_max:3,plain_bytes_max:150000},lod2:{triangles_max:450,draw_calls_max:1,plain_bytes_max:50000}},lod_selection:{initial:'lod2',approach_distance_m:150,hysteresis_m:20,detailed:'manual close-up selection',review:'Provisional contract thresholds; tune with the actual game camera.'},capacity:{default_fraction:.5,range:[0,1],units:'normalized usable storage; absolute capacity is game-defined',vessel_center_m:[0,centerY,0],vessel_radii_m:[rx,ry,rx],height_mapping:'fraction = 3*t*t - 2*t*t*t, inverse solved by runtime adapter',independent_of_lod_and_damage:true,shader_attribute:'_YUSHI / role, level coordinate, local window x',plain_fallback:'50% colored gauge and opaque sight well; runtime.js required for live capacity'},operation_states:['empty','filling','ready','dispensing'],runtime:{adapter:'runtime.js',textures:0,fluid_simulation:false,glass:'Optional small alpha-blended sight cover, no transmission/refraction; omitted in LOD2 and instanced yard.',distance:'Static geometry with shader-driven capacity. Valve remains a lookup only; never infer fill from a static pose.',instancing:'Body and fixed-pose valve can be instanced by material. Shared-fill instancing supported by the supplied adapter; distinct per-instance fill needs a game shader attribute.'},lore:{name:'Yūshi045, organic-resource container version 045, named by jelaludo.',purpose:'Stores organic binder concentrate for ISAO to combine with local regolith and mineral aggregate when building on remote planets.',contents:'Dense olive-green industrial slurry; subtle movement only while pumping.'},compression:{source_of_truth:'plain_glb',meshopt:'Optional derived previews; consuming game compresses with gltfpack.'},assets};await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
