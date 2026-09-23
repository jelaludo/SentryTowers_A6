import * as T from 'three';
import {palette as P,box,cyl,ring,beam,armor,node,mesh,socket,prep,merged} from './settlement-industry-shape.mjs';
import {railPose,extensionPose,SWEEP} from '../../assets/orbital-launcher/runtime.js';
const materials=()=>({body:new T.MeshStandardMaterial({name:'CORPORATE_SLATE',vertexColors:true,metalness:.45,roughness:.42}),metal:new T.MeshStandardMaterial({name:'RAIL_ALLOY',vertexColors:true,metalness:.8,roughness:.28}),light:new T.MeshStandardMaterial({name:'FIELD_STATUS_CYAN',vertexColors:true,metalness:.2,roughness:.3,emissive:0x59d7ef,emissiveIntensity:.25})});
function poseGeometry(g,p){return g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion().setFromEuler(new T.Euler(p.pitch,0,0)),new T.Vector3(1,1,1)));}
// Continuous rectangular-section rail, with shared stations and no coplanar overlapping segments.
function sweep(x,y,w,h,lod,color){
 const count=[80,40,18][lod],poses=[{position:[0,2.6,-26],pitch:0},...Array.from({length:count+1},(_,i)=>railPose(i/count)),extensionPose(4.5)],verts=[],indices=[];
 for(const p of poses)for(const [dx,dy] of [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]])verts.push(...new T.Vector3(x+dx,y+dy,0).applyEuler(new T.Euler(p.pitch,0,0)).add(new T.Vector3(...p.position)).toArray());
 for(let i=0;i<poses.length-1;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;indices.push(a,b,a+4,b,b+4,a+4);}indices.push(0,2,1,0,3,2);const k=(poses.length-1)*4;indices.push(k,k+1,k+2,k,k+2,k+3);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(indices);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return prep(flat,color);
}
function launcher(lod,root,m){
 const n=[20,10,6][lod],body=[],rail=[],lights=[];
 // Seven grounded cradles support a sweeping spine; open bays read at map scale.
 for(let i=0;i<7;i++){const u=i/6,p=railPose(u),z=p.position[2],top=p.position[1]-1.05;
  body.push(armor([7,.34,2.7],[0,.17,z],P.dark,lod),armor([5.9,.22,2.05],[0,.45,z],P.plate,lod));
  for(const side of [-1,1]){const x=side*1.8;body.push(beam([side*2.4,.5,z],[x,top,z],.46,P.armor));if(lod<2)body.push(beam([side*2.4,.55,z],[side*.6,Math.max(.9,top-.5),z],.22,P.steel));}
  body.push(beam([-2.3,top,z],[2.3,top,z],.48,P.plate));
  if(lod<2&&top>5)body.push(beam([-1.7,1.3,z],[1.7,top-.7,z],.18,P.steel));
 }
 for(const x of [-1.63,1.63]){body.push(sweep(x,-.45,.52,.65,lod,P.armor));rail.push(sweep(x,0,.23,.26,lod,P.steel));}
 body.push(sweep(0,-.99,.8,.55,lod,P.armor));
 // Discrete acceleration cassettes under the track leave the launch path open.
 const coilCount=lod===2?6:16;
 for(let i=0;i<coilCount;i++){const u=i/(coilCount-1),p=railPose(u),parts=[box([4.45,.22,.52],[0,-.56,0],P.plate)];
  for(const side of [-1,1]){parts.push(armor([.58,.76,.74],[side*2.02,-.08,0],P.armor,lod));lights.push(poseGeometry(box([.055,.28,.44],[side*2.325,.03,0],P.cyan),p));if(lod===0){parts.push(box([.07,.10,.51],[side*2.33,-.29,0],P.amber));for(let j=0;j<3;j++)parts.push(box([.1,.34,.05],[side*2.33,.06,-.23+j*.23],P.dark));}}
  for(const g of parts)body.push(poseGeometry(g,p));
 }
 // Elevated recovery fork, marked in amber, keeps the sled on rails after payload release.
 const end=extensionPose(4.5);body.push(poseGeometry(armor([4.8,.75,1.05],[0,-.45,0],P.armor,lod),end));
 for(const side of [-1,1])body.push(poseGeometry(box([.68,.11,.8],[side*1.95,-.005,0],P.amber),end));
 // Loading apron and two low capacitor banks share the established manufacturer armor.
 body.push(armor([8.8,1.85,8.0],[0,.925,-24],P.armor,lod),armor([9.2,.2,8.4],[0,1.95,-24],P.plate,lod),armor([5.5,.3,5.8],[0,2.22,-24],P.dark,lod));
 for(const side of [-1,1]){
  body.push(armor([3.1,.35,15.8],[side*5,.175,-8],P.dark,lod));
  for(let i=0;i<4;i++){const z=-13.6+i*3.65;body.push(armor([2.72,1.65,2.8],[side*5,1.18,z],P.armor,lod),(lod===2?box([2.82,.15,2.88],[side*5,2.08,z],P.plate):armor([2.82,.15,2.88],[side*5,2.08,z],P.plate,lod)),box([.065,.62,1.8],[side*6.4,1.28,z],P.dark));lights.push(box([.07,.09,1.35],[side*6.445,1.34,z],P.cyan));
   if(lod<2)for(let j=0;j<5;j++)body.push(box([1.8,.04,.09],[side*5,2.18,z-.8+j*.4],P.dark));
  }
  body.push(beam([side*4,.42,-16],[side*2.7,.42,-18],.28,P.steel),beam([side*2.7,.42,-18],[side*2.7,.42,-22],.28,P.steel));
 }
 if(lod<2){for(const side of [-1,1]){for(let i=0;i<4;i++)body.push(beam([side*4.3,2.04,-27+i*2],[side*4.3,2.95,-27+i*2],.075,P.steel));body.push(beam([side*4.3,2.95,-27],[side*4.3,2.95,-21],.075,P.plate));}
  for(let i=0;i<6;i++)body.push(box([.6,.035,.2],[-3.2+i*1.28,2.065,-27.72],P.amber));
 }
 if(lod===0){for(const side of [-1,1])for(let i=0;i<9;i++)body.push(cyl(.045,.035,8,[side*4.05,2.07,-27.5+i*.85],P.dark));}
 mesh(root,'LAUNCHER_STRUCTURE',body,m.body);mesh(root,'CONTINUOUS_RAILS',rail,m.metal);mesh(root,'ACCELERATOR_LIGHTS',lights,m.light);
 const sled=node(root,'LAUNCH_SLED',[0,2.6,-24]);mesh(sled,'SLED_BODY',[beam([-1.65,.31,-1.1],[1.65,.31,-1.1],.12,P.steel),beam([-1.65,.31,1.1],[1.65,.31,1.1],.12,P.steel),armor([2.65,.28,3.4],[0,.18,0],P.armor,lod),armor([2.3,.1,2.95],[0,.37,0],P.plate,lod),box([.12,.08,2.5],[-.95,.46,0],P.dark),box([.12,.08,2.5],[.95,.46,0],P.dark)],m.body);
 for(const side of [-1,1]){const clamp=node(sled,side<0?'CLAMP_L':'CLAMP_R',[side*1.32,0,0]);mesh(clamp,side<0?'CLAMP_L_MESH':'CLAMP_R_MESH',[armor([.25,.6,1.15],[0,.64,0],P.armor,lod),box([.27,.1,.82],[0,.99,0],P.amber)],m.body);}
 socket(sled,'SOCKET_PAYLOAD',[0,.43,0],'collector_attachment');socket(root,'SOCKET_LOADING',[0,3.03,-24],'cargo');
 socket(root,'SOCKET_RAIL_EXIT',railPose(1).position,'launch_tangent',[0,Math.sin(SWEEP),Math.cos(SWEEP)]);
 socket(root,'SOCKET_POWER',[-6.5,.5,-15.6],'power',[-1,0,0]);socket(root,'SOCKET_SERVICE',[4.7,2.05,-25],'service');
 root.userData.operating_envelope_m={min:[-7,0,-29],max:[7,60,37]};
}
function satellite(lod,root,m){
 const n=[24,12,6][lod],body=node(root,'COLLECTOR_BODY'),parts=[cyl(.49,1.75,6,[0,0,.1],P.armor,[Math.PI/2,0,0]),cyl(.55,.15,6,[0,0,.9],P.plate,[Math.PI/2,0,0]),cyl(.37,.75,6,[0,0,1.3],P.armor,[Math.PI/2,0,0]),cyl(.26,.2,n,[0,0,1.78],P.dark,[Math.PI/2,0,0]),cyl(.17,.035,n,[0,0,1.897],P.cyan,[Math.PI/2,0,0]),cyl(.35,.3,n,[0,0,-.84],P.dark,[Math.PI/2,0,0]),ring(.24,.045,n,[0,0,-1.01],P.amber,[0,0,0])];
 for(let i=0;i<6;i++){const a=i*Math.PI/3;parts.push(beam([Math.sin(a)*.42,Math.cos(a)*.42,0],[Math.sin(a)*.95,Math.cos(a)*.95,0],.1,P.steel),box([.14,.045,.85],[Math.sin(a)*.5,Math.cos(a)*.5,.12],P.plate,[0,0,-a]));}
 mesh(body,'SATELLITE_BUS',parts,m.body);
 for(let i=1;i<=6;i++){const a=(i-1)*Math.PI/3,base=node(body,'PETAL_'+i+'_MOUNT',[-Math.sin(a)*.95,Math.cos(a)*.95,0]);base.rotation.z=a;const hinge=node(base,'PETAL_'+i+'_HINGE');hinge.rotation.x=Math.PI/2;
  const panels=[cyl(.72,.052,6,[0,.94,0],P.armor,[Math.PI/2,0,0]),cyl(.674,.012,6,[0,.94,.035],P.mirror,[Math.PI/2,0,0]),beam([0,0,-.02],[0,.44,-.02],.11,P.steel),cyl(.12,.28,n,[0,0,0],P.steel,[0,0,Math.PI/2])];
  if(lod===0)for(const s of [-1,1])panels.push(beam([0,.4,-.045],[s*.48,1.16,-.045],.027,P.steel));
  mesh(hinge,'PETAL_'+i+'_MESH',panels,m.metal);
 }
 const plume=node(body,'INSERTION_PLUME',[0,0,-1.08]);mesh(plume,'PLUME_PREVIEW',[prep(new T.ConeGeometry(.20,1.45,n),P.cyan,[0,0,-.725],[-Math.PI/2,0,0])],m.light);plume.scale.setScalar(0);plume.userData.role='optional_viewer_effect';
 socket(body,'SOCKET_THRUSTER',[0,0,-1.02],'thruster',[0,0,-1]);socket(body,'SOCKET_OPTICAL_AXIS',[0,0,1.92],'optical');
 // Position packed geometry on the common ground/docking origin, independent of LOD.
 body.updateMatrixWorld(true);const b=new T.Box3().setFromObject(body,true);body.position.y=-b.min.y;root.updateMatrixWorld(true);socket(root,'SOCKET_LAUNCH_ATTACH',[0,0,0],'collector_attachment');
}
export const definitions={launcher:{label:'ARC-01 / Curved orbital mass driver',root:'ARC_ROOT',plot:[15,58],build:launcher},satellite:{label:'SEED-01 / Stellar collector satellite',root:'SEED_ROOT',plot:[5.4,5],build:satellite}};
export function buildModel(family,lod){const d=definitions[family],root=new T.Group(),m=materials();root.name=d.root;root.userData={family,lod,damage_level:0,static:lod===2,manufacturer_lineage:'ISAO / MORK / KORP'};d.build(lod,root,m);
 if(lod===2){root.updateMatrixWorld(true);const parts=[],meshes=[];root.traverse(o=>{if(o.isMesh){if(o.getWorldScale(new T.Vector3()).lengthSq()>1e-8)parts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));meshes.push(o);}});
  for(const o of meshes){const empty=new T.Group();empty.name=o.name;empty.position.copy(o.position);empty.quaternion.copy(o.quaternion);empty.scale.copy(o.scale);empty.userData={role:'static_lookup'};o.parent.add(empty);for(const c of [...o.children])empty.add(c);o.removeFromParent();}
  mesh(root,'DISTANCE_STATIC',parts,m.body);
 }
 return root;
}
