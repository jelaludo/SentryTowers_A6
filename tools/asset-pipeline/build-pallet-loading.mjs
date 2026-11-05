import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {DURATION,LAYOUT,LOADS,CHAPTERS} from '../../pallet-loading/timeline.js';
const out=fileURLToPath(new URL('../../pallet-loading/',import.meta.url));
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(x=>{this.result=`data:${b.type};base64,${Buffer.from(x).toString('base64')}`;this.onloadend?.();});}};
const sha=b=>createHash('sha256').update(b).digest('hex');
const sockets={SOCKET_CUP:LAYOUT.cup,SOCKET_FEED:LAYOUT.pick,SOCKET_DOCK_FIRST:[-.6,0,0],SOCKET_DOCK_SECOND:[0,0,0],SOCKET_ARRIVAL:[-.6,0,LAYOUT.entry_z],SOCKET_EXIT:[0,0,LAYOUT.exit_z]};
const assets=[];
for(const lod of [0,1,2]){
 const root=new T.Group();root.name='LOADING_STATION_ROOT';root.userData={module:'loading_station',lod,damage_level:0,static:true,units:'metres',plot_m:[11,13],floor_top_m:0,platform_top_m:1.10,platform_bottom_m:1.06,conveyor_top_m:1.55};
 const parts=[],C={floor:0x263c49,edge:0x16232c,cream:0xcbbfa5,dark:0x303b41,steel:0x73858a,yellow:0xe6a83e,line:0x70848b};
 function add(g,p,c,rot=[0,0,0]){let a=g.index?g.toNonIndexed():g.clone();for(const k of Object.keys(a.attributes))if(!['position','normal'].includes(k))a.deleteAttribute(k);a.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));const color=new T.Color(c),v=new Float32Array(a.attributes.position.count*3);for(let i=0;i<v.length;i+=3){v[i]=color.r;v[i+1]=color.g;v[i+2]=color.b;}a.setAttribute('color',new T.BufferAttribute(v,3));parts.push(a);g.dispose();}
 function box(size,p,c,round=false){add(round&&lod<2?new RoundedBoxGeometry(...size,1,.015):new T.BoxGeometry(...size),p,c);}
 function cyl(r,h,p,c,axis='y',segments=lod===0?24:lod===1?12:6){add(new T.CylinderGeometry(r,r,h,segments,1),p,c,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0]);}
 // One continuous floor; markings sit 1 mm above it, never coplanar.
 box([11,.06,13],[0,-.03,0],C.floor);
 box([11,.08,.08],[0,-.08,-6.48],C.edge);box([11,.08,.08],[0,-.08,6.48],C.edge);
 // Travel corridor and two docking positions.
 for(const x of [-1.83,1.25])box([.028,.002,11.3],[x,.001,0],C.line);
 for(const z of [-4.8,-3.6,-2.4,2.4,3.6,4.8])box([.045,.003,.45],[-.3,.0015,z],C.line);
 for(const x of [-1.22,.62])for(const z of [-.66,.66]){
  box([.20,.003,.035],[x,.0015,z],C.yellow);box([.035,.003,.18],[x+(x<0?-.08:.08),.0015,z-Math.sign(z)*.07],C.yellow);
 }
 // CUP cantilever: supports remain outside STRIDE's wheel path.
 box([1.85,.04,1.20],[-1.575,1.08,0],C.cream);
 for(const z of [-.52,.52]){
  box([.18,1.04,.16],[-2.35,.52,z],C.dark,true);box([.36,.06,.34],[-2.35,.03,z],C.steel);
  box([1.03,.14,.12],[-1.865,.97,z],C.dark);
  box([.12,.78,.12],[-2.13,.62,z],C.dark); // outer reinforcing upright
 }
 // Segmented amber edge, outside the sweep of the arm.
 for(let i=0;i<8;i++)box([.15,.004,.055],[-2.39+i*.22,1.102,-.565],i%2?C.dark:C.yellow);
 // Four-package feed, roller top 1.55 m. Columns lie outside the robot.
 for(const z of [.29,.91])box([2.85,.10,.055],[-2.925,1.48,z],C.dark,true);
 for(const x of [-4.15,-2.15])for(const z of [.33,.87]){
  box([.09,1.43,.09],[x,.715,z],C.steel);box([.22,.04,.22],[x,.02,z],C.dark);
 }
 const n=lod===2?12:lod===1?22:32;
 for(let i=0;i<n;i++)cyl(.035,.56,[-4.27+i*(2.70/(n-1)),1.515,.60],i%2?C.steel:C.cream,'z');
 box([.045,.14,.66],[-4.36,1.5,.60],C.yellow,true);
 if(lod<2){
  for(const x of [-4.15,-2.15])box([.075,.075,.54],[x,.27,.60],C.steel);
  for(const z of [-.52,.52])for(const x of [-2.45,-2.25])cyl(.017,.008,[x,.064,z],C.dark,'y',lod===0?12:6);
  for(const x of [-2.45,-.73])for(const z of [-.51,.51])cyl(.012,.005,[x,1.103,z],C.dark,'y',8);
  box([.32,.08,.018],[-1.55,1.05,-.61],C.dark);
  box([.20,.023,.008],[-1.55,1.05,-.624],C.yellow);
 }
 if(lod===0){
  for(let i=0;i<24;i++)for(const z of [.255,.945])cyl(.010,.006,[-4.27+i*.117,1.48,z],C.steel,'z',8);
  for(const z of [-.52,.52])box([.65,.035,.035],[-2.01,.25,z],C.steel);
 }
 const geometry=mergeVertices(mergeGeometries(parts),1e-5);parts.forEach(g=>g.dispose());
 const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({name:'STATION_PALETTE',vertexColors:true,roughness:.68,metalness:.18}));mesh.name='STATION_SURFACE';root.add(mesh);
 for(const [name,pos]of Object.entries(sockets)){const socket=new T.Object3D();socket.name=name;socket.position.fromArray(pos);socket.userData={socket:true};root.add(socket);}
 const file=`station_d0_lod${lod}.glb`,buf=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:false}));await fs.writeFile(path.join(out,file),buf);
 const bounds=new T.Box3().setFromObject(root,true);
 assets.push({module:'loading_station',file,lod,damage_level:0,static:true,derived:lod>0,bytes:buf.length,triangles:geometry.index.count/3,draw_calls:1,plot_m:[11,13],bounds_m:[bounds.min.toArray(),bounds.max.toArray()],sockets,clips:[],sha256:sha(buf),credit:'Original station geometry and choreography by jelaludo; PCS units reused unchanged.'});
}
const family=JSON.parse(await fs.readFile(path.join(out,'../assets/pallet-cargo/manifest.json'),'utf8'));
const deps=[];
for(const module of ['stride','cup','pallet','crate'])for(const lod of [0,1,2]){
 const file=`${module}_d0_lod${lod}.glb`,b=await fs.readFile(path.join(out,'../assets/pallet-cargo/',file)),a=family.assets.find(a=>a.file===file);
 deps.push({file:`../assets/pallet-cargo/${file}`,module,lod,bytes:b.length,triangles:a.triangles,draw_calls:a.draw_calls,sha256:sha(b),source_commit:'b9f027199645634a1686f6c87bdb0caa2308dadf'});
}
const runtime=await fs.readFile(path.join(out,'../assets/pallet-cargo/runtime.js'));
const sceneMetrics=[0,1].map(lod=>{const count={stride:1,cup:1,pallet:1,crate:4},a=deps.filter(a=>a.lod===lod);return{lod,triangles:assets[lod].triangles+a.reduce((n,a)=>n+a.triangles*count[a.module],0),draw_calls:1+a.reduce((n,a)=>n+a.draw_calls*count[a.module],0),unique_glb_bytes:assets[lod].bytes+a.reduce((n,a)=>n+a.bytes,0),note:'Model pass only; shadow pass and viewer overlays excluded. Crates share geometry/material buffers.'};});
const manifest={schema:'jelaludo.scene/v1',name:'pallet_loading',status:'kinematic_scene_pending_visual_and_game_review',plain_glb_source_of_truth:true,coordinate_system:{units:'metres',up:'+Y',forward:'+Z',origin:'ground at 11 × 13 m plot centre'},assets,dependencies:deps,runtime_dependency:{file:'../assets/pallet-cargo/runtime.js',sha256:sha(runtime),source_commit:'b9f027199645634a1686f6c87bdb0caa2308dadf'},runtime:{file:'timeline.js',studies:[{name:'Pallet_Load_And_Depart',duration_s:DURATION,loop:false}],baked_clips:[],layout:LAYOUT,loads:LOADS,chapters:CHAPTERS},scene_metrics:sceneMetrics,lod_selection:{default:1,lod0:'Explicit close/recording selection.',lod1:'Animated units retain pivots; station is static.',lod2:'Station-only static distance/loading tier; original PCS static units are not animated.',game_enter_m:150,distance_return_m:170,threshold_status:'Consuming-game tuning pending.'},handoff:{folder:'pallet-loading/',dependencies:'assets/pallet-cargo/ at pinned revision above',pending:['Visual review','Arbitrary self-collision, traction, forces and suction/load engineering','Consuming-game r160/release packing and reference-phone measurements'],derived:'Reduced station tiers and preview renders. No new compressed exports; existing compressed sources unchanged.'}};
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({assets:assets.map(({file,triangles,draw_calls,bytes})=>({file,triangles,draw_calls,bytes})),sceneMetrics},null,2));
