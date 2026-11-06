import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {geometryFor,merge,simplify,kit,triangles} from './stalheart-kidou-utils.mjs';
import {applyKidou,STATIONS,SPEC} from '../../assets/stalheart-kidou/runtime.js';
export const CONTROLS=['GANTRY_TRAVEL_Y','CARRIAGE_TRAVEL_X','TOOL_LIFT_Z','J1_BASE_YAW','J2_SHOULDER','J3_ELBOW','J4_FOREARM_ROLL','J5_WRIST_PITCH','J6_TOOL_ROLL','EXTRUSION_TIP'];
const load=async file=>{const b=await fs.readFile(new URL('../../'+file,import.meta.url));return(new GLTFLoader()).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
export async function buildKidou(lod=0){
 const src=(await load('assets/terraformer/terraformer_3000_d0.glb')).scene,sourceRoot=src.getObjectByName('ROOT');src.updateMatrixWorld(true);
 const root=new T.Group();root.name='STALHEART_KIDOU_ROOT';root.userData={family:'stalheart-kidou',lod,damage_level:0,static:false,units:'metres',up:'+Y',forward:'+Z'};
 const mat=new T.MeshStandardMaterial({name:'KIDOU_PALETTE',vertexColors:true,metalness:.32,roughness:.56}),{C,group,box,cyl,beam,mesh}=kit(root,mat,lod),body=group('BODY_HEAVE',root,[0,0,0],true),map=new Map();
 for(const name of CONTROLS){const original=src.getObjectByName(name);let p=original.parent;while(p&&!map.has(p.name))p=p.parent;const node=group(name,map.get(p?.name)||body,original.position.toArray(),name!=='EXTRUSION_TIP');node.quaternion.copy(original.quaternion);map.set(name,node);}
 const gantry=map.get('GANTRY_TRAVEL_Y');gantry.position.y=SPEC.gantry_raise_m;gantry.userData={legacy_name:'Original rail-travel control is fixed on the mobile chassis',engine_driven:false};
 const buckets=new Map();src.traverse(o=>{if(!o.isMesh)return;if(/^(Rail_|Track_fastener|Flanged_rail_wheel|Bogie_|Flexible_carriage_material_feed)/.test(o.name))return;let p=o.parent;while(p&&!map.has(p.name))p=p.parent;const name=p?.name||'GANTRY_TRAVEL_Y';if(!buckets.has(name))buckets.set(name,[]);const g=geometryFor(o,src.getObjectByName(name)||sourceRoot);
 // Add lift-ram extension above the existing lower datum, keeping the tool's working height.
 if(/^(Vertical_ram|Telescopic_ram_guide|Ram_supply_conduit)/.test(o.name)){
  g.computeBoundingBox();const bottom=g.boundingBox.min.y,height=g.boundingBox.max.y-bottom,factor=1+SPEC.chassis_raise_m/height;
  const extension=new T.Matrix4().makeScale(1,factor,1);extension.elements[13]=bottom*(1-factor);g.applyMatrix4(extension);
 }
 buckets.get(name).push(g);});
 for(const [name,gs]of buckets){let g=merge(gs);if(lod===1)g=await simplify(g,name==='GANTRY_TRAVEL_Y'?4900:Math.max(100,triangles(g)*.16));const m=new T.Mesh(g,mat);m.name='GANTRY_SURFACE_'+name;map.get(name).add(m);}
 // Long mobile side beams replace both the rail bed and the short rail bogies.
 const chassis=[];for(const side of [-1,1]){chassis.push(box([3.8,1.5,23.5],C.frame,[side*16,3.95,0]),box([4.05,.25,24],C.shell,[side*16,4.825,0]),box([3.35,.2,22.8],C.dark,[side*16,3.10,0]));
  for(const z of [-10,-5,0,5,10])chassis.push(box([.09,.85,2.8],C.edge,[side*17.94,3.95,z]),box([.11,.15,1.5],C.amber,[side*18.0,4.1,z]));
  for(const z of [-11.5,11.5]){chassis.push(box([3.7,.65,.6],C.shell,[side*16,4.35,z]),box([2.1,.19,.08],C.amber,[side*16,4.4,z+Math.sign(z)*.34]));}
  for(const z of [-9,9]){chassis.push(box([1.6,.65,2.3],C.edge,[side*16,5.15,z]),box([1.35,.1,2.06],C.shell,[side*16,5.52,z]));}
  if(lod===0)for(const z of [-10,-8,-6,-4,-2,0,2,4,6,8,10])for(const dx of [-1.5,1.5])chassis.push(cyl(.09,.045,C.steel,[side*16+dx,4.97,z]));
 }
 mesh('MOBILE_CHASSIS_SURFACE',body,chassis).position.y=SPEC.chassis_raise_m;
 const wheelSrc=(await load('assets/xb12/xb12_d0_lod0.glb')).scene.getObjectByName('WHEEL_FL');let wheelGeo=geometryFor(wheelSrc,wheelSrc);wheelGeo.scale(3.6,3.6,3.6);if(lod===1)wheelGeo=await simplify(wheelGeo,420);
 for(const l of STATIONS){const {id,side,z}=l,pivot=group('SUSP_PIVOT_'+id,body,[side*SPEC.half_track_m,4.22,z-1.8],true),parts=[];
  for(const x of [-.45,.45]){parts.push(beam([x,0,0],[x,-2.4,1.8],.25,C.frame),beam([x,-.28,.21],[x,-2.12,1.59],.16,C.shell));}
  parts.push(cyl(.42,1.4,C.frame,[0,0,0],[0,0,Math.PI/2]),cyl(.28,1.48,C.amber,[0,0,0],[0,0,Math.PI/2]),cyl(.36,1.15,C.edge,[0,-2.4,1.8],[0,0,Math.PI/2]));
  mesh('SUSP_ARM_'+id,pivot,parts);
  const upright=group('UPRIGHT_'+id,pivot,[0,-2.4,1.8],true),steer=group('WHEEL_STEER_'+id,upright,[0,0,0],true),spin=group('WHEEL_SPIN_'+id,steer,[0,0,0],true),wheel=new T.Mesh(wheelGeo,mat);wheel.name='WHEEL_'+id;spin.add(wheel);
  group('SOCKET_CONTACT_'+id,steer,[0,-SPEC.wheel_radius_m,0]);
  group('SOCKET_DAMPER_LOWER_'+id,pivot,[0,-1.92,1.44]);group('SOCKET_DAMPER_UPPER_'+id,body,[side*SPEC.half_track_m,4.42,z-.3]);
  const aim=group('DAMPER_AIM_'+id,body,[0,0,0],true),barrel=[cyl(.24,1.65,C.edge,[0,.825,0]),cyl(.31,.12,C.amber,[0,.12,0]),cyl(.29,.12,C.steel,[0,1.54,0])];
  if(lod===0){const points=[];for(let j=0;j<=160;j++){const a=j/160*Math.PI*2*8;points.push(new T.Vector3(.285*Math.cos(a),.25+j/160*1.05,.285*Math.sin(a)));}barrel.push([new T.TubeGeometry(new T.CatmullRomCurve3(points),160,.045,6,false),C.amber]);}else for(let j=0;j<6;j++)barrel.push(cyl(.29,.065,C.amber,[0,.3+j*.19,0]));
  mesh('DAMPER_BARREL_'+id,aim,barrel);const rod=group('DAMPER_ROD_'+id,aim,[0,2,0],true);mesh('DAMPER_ROD_SURFACE_'+id,rod,[cyl(.105,1.55,C.steel,[0,-.775,0]),cyl(.19,.16,C.dark,[0,-.08,0])]);
 }
 // Direct-under-beam clevises replace the former long outboard cantilevers.
 // Keep the established mesh name as a compatibility lookup across this revision.
 const mounts=[];for(const {side,z}of STATIONS){
  for(const dx of [-.85,.85])mounts.push(box([.18,.60,.90],C.frame,[side*16+dx,4.50,z-1.8]));
  mounts.push(box([2.10,.18,1.20],C.edge,[side*16,4.79,z-1.8]),box([.65,.4,.65],C.frame,[side*16,4.60,z-.3]));
 }mesh('WHEEL_MOUNT_BRIDGES',body,mounts);
 for(let i=0;i<2;i++)mesh('FEED_HOSE_'+(i+1),gantry,[cyl(.13,1,C.dark)]);
 group('SOCKET_MATERIAL_INPUT',body,[16,4.4+SPEC.chassis_raise_m,-11.85]);group('SOCKET_FABRICATION_ORIGIN',root,[0,0,2.6]);group('SOCKET_TOW_FRONT',body,[16,4+SPEC.chassis_raise_m,12]);group('SOCKET_TOW_REAR',body,[-16,4+SPEC.chassis_raise_m,-12]);
 applyKidou(T,root);root.updateMatrixWorld(true);return root;
}
