import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
export const C={shell:0xd8cfbc,edge:0xb5ae9e,dark:0x30383d,rubber:0x192126,steel:0x8a999e,amber:0xe4aa3d,light:0xffd583,glass:0x162e36,green:0x82964b};
import {WHEELS,BELT} from '../../assets/yushi-rover/runtime.js';
export function buildRover(lod=0){
 const master=lod===0,n=master?32:12,root=new T.Group();root.name='YUSHIROVER_ROOT';root.userData={family:'yushi_rover',lod,damage_level:0,units:'metres',up:'+Y',forward:'+Z',static:false};
 const mat=new T.MeshStandardMaterial({name:'YUSHIROVER_PALETTE',vertexColors:true,metalness:.3,roughness:.57});
 function group(name,parent=root,p=[0,0,0],engine=false){const g=new T.Group();g.name=name;g.position.set(...p);if(engine)g.userData.engine_driven=true;parent.add(g);return g;}
 function bevel(s,b){const h=s.map(v=>v/2),pts=[];b=Math.min(b,...h.map(v=>v*.45));for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])for(let k=0;k<3;k++)pts.push(new T.Vector3(...h.map((v,i)=>[x,y,z][i]*(v-(i===k?0:b)))));return new ConvexGeometry(pts);}
 const box=(s,c,p=[0,0,0],b=.03,r=[0,0,0])=>[b?bevel(s,b):new T.BoxGeometry(...s),c,p,r];
 const cyl=(r,h,c,p=[0,0,0],rot=[0,0,0],seg=n)=>[new T.CylinderGeometry(r,r,h,seg),c,p,rot];
 const torus=(r,t,c,p,rot=[0,0,0])=>[new T.TorusGeometry(r,t,master?8:4,n),c,p,rot];
 function beam(a,b,r,c){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),g=new T.CylinderGeometry(r,r,d.length(),master?12:6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));return[g,c,av.add(bv).multiplyScalar(.5).toArray()];}
 function hose(points,r=.07){return[new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),master?24:10,r,master?10:6,false),C.rubber];}
 function mesh(name,parent,parts){const gs=parts.map(([g,c,p=[0,0,0],r=[0,0,0]])=>{g=g.index?g.toNonIndexed():g;for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...r)));g.translate(...p);const color=new T.Color(c),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)color.toArray(a,i);g.setAttribute('color',new T.BufferAttribute(a,3));g.clearGroups();return g;});const geo=mergeVertices(mergeGeometries(gs),1e-5);gs.forEach(g=>g.dispose());const m=new T.Mesh(geo,mat);m.name=name;parent.add(m);return m;}
 function socket(name,p,parent=root,kind='service'){const g=group(name,parent,p);g.userData={kind};return g;}
 const body=group('CHASSIS_SUSPENSION',root,[0,0,-.4675],true);
 const parts=[box([3.75,.48,7.7],C.dark,[0,1.34,-.65],.14),box([3.95,.16,7.9],C.shell,[0,1.66,-.65],.08),box([2.8,.2,5.7],C.rubber,[0,1.02,-.75],.10)];
 for(const s of [-1,1]){
  parts.push(box([.16,.48,7.5],C.dark,[s*1.94,1.44,-.65],.05));
  for(const z of [-3.3,-1.45,.4,2.25]){parts.push(box([.055,.28,1.35],C.shell,[s*2.04,1.52,z],.03),box([.062,.095,.62],C.amber,[s*2.075,1.54,z],.015));}
  for(const z of [-2.9,-.25,2.4])parts.push(box([.74,.15,1.15],C.shell,[s*2.28,1.68,z],.07),box([.9,.17,.34],C.dark,[s*1.75,1.43,z]));
 }
 for(const z of [-4.55,3.25]){parts.push(box([3.5,.28,.19],C.dark,[0,1.36,z],.06));for(const s of [-1,1])parts.push(box([.46,.12,.04],C.light,[s*1.18,1.46,z+(z>0?.11:-.11)],.02));}
 // Processor: chamfered central enclosure, inspection panels and louvres.
 parts.push(box([2.92,1.24,2.35],C.dark,[0,2.23,.52],.23),box([3.02,1.1,2.2],C.shell,[0,2.34,.52],.23),box([2.15,.16,1.8],C.edge,[0,2.96,.45],.12));
 for(const s of [-1,1]){
  parts.push(box([.05,.66,1.12],C.dark,[s*1.52,2.37,.7],.10),box([.025,.47,.9],C.glass,[s*1.555,2.38,.7],.075));
  for(let j=0;j<6;j++)parts.push(box([.032,.035,.30],C.green,[s*1.572,2.24+(j%3)*.11,.38+j*.1],.005,[0,(j%2?.3:-.3),.2]));
  for(let j=0;j<4;j++)parts.push(box([.04,.045,.39],C.dark,[s*1.535,2.25+j*.1,-.27],.006));
  parts.push(beam([s*1.05,2.96,.9],[s*1.05,3.10,.9],.055,C.dark),beam([s*1.05,3.10,.9],[s*1.05,3.10,-.15],.055,C.dark));
 }
 parts.push(cyl(.31,.16,C.dark,[0,3.12,.65]),cyl(.23,.045,C.amber,[0,3.225,.65]),cyl(.17,.03,C.light,[0,3.26,.65]),box([.72,.2,.4],C.dark,[0,2.94,1.36],.05));
 for(const s of [-1,1])parts.push(cyl(.09,.035,C.glass,[s*.18,2.96,1.575],[Math.PI/2,0,0]));
 // Front conveyor frame. Slats circulate over both drums and along the return run.
 const b=new T.Vector3(...BELT.bottom),t=new T.Vector3(...BELT.top),delta=t.clone().sub(b),mid=b.clone().add(t).multiplyScalar(.5),ang=Math.atan2(delta.z,delta.y);
 for(const s of [-1,1]){parts.push(box([.20,delta.length()+.42,.22],C.dark,[s*.94,mid.y,mid.z],.045,[ang,0,0]),box([.12,delta.length()*.72,.24],C.shell,[s*1.04,mid.y+.05,mid.z],.045,[ang,0,0]));}
 for(const [id,p]of [['LOWER',b],['UPPER',t]]){const g=group('BELT_'+id+'_ROLL',body,p.toArray(),true);mesh('BELT_'+id+'_DRUM',g,[cyl(.19,1.85,C.dark,[0,0,0],[0,0,Math.PI/2]),cyl(.25,.08,C.amber,[-1,0,0],[0,0,Math.PI/2]),cyl(.25,.08,C.amber,[1,0,0],[0,0,Math.PI/2])]);}
 let slatGeo;for(let i=0;i<BELT.count;i++){const g=group('CONVEYOR_SLAT_'+String(i).padStart(2,'0'),body,[0,0,0],true);if(!slatGeo)slatGeo=mesh('CONVEYOR_SLAT_SURFACE_'+i,g,[box([1.65,.19,.075],C.rubber,[0,0,0],.013),box([1.6,.04,.12],C.steel,[0,0,.05],.009)]).geometry;else{const m=new T.Mesh(slatGeo,mat);m.name='CONVEYOR_SLAT_SURFACE_'+i;g.add(m);}}
 // Two articulated lift arms hold the broad rake cassette.
 const pickup=group('PICKUP_LIFT',body,[0,.68,4.69],true);
 const rake=[box([4.7,.35,.78],C.shell,[0,.45,.05],.12),box([4.45,.20,.80],C.dark,[0,.25,.05],.07)];
 for(const s of [-1,1]){
  rake.push(box([.3,.86,1.2],C.shell,[s*2.25,.02,.09],.10),box([.35,.10,1.55],C.steel,[s*2.25,-.46,.15],.025),box([.14,.11,.2],C.amber,[s*2.415,.22,.43],.02));
  parts.push(beam([s*1.6,1.80,2.5],[s*1.76,1.95,3.6],.14,C.dark),box([.29,.30,1.3],C.shell,[s*1.74,1.89,3.03],.05,[.13,0,0]),beam([s*1.76,1.95,3.6],[s*2.1,.93,4.7],.10,C.steel),cyl(.25,.30,C.dark,[s*1.76,1.95,3.6],[0,0,Math.PI/2]),cyl(.17,.32,C.amber,[s*1.76,1.95,3.6],[0,0,Math.PI/2]));
 }
 for(let i=0;i<19;i++)rake.push(box([.065,.11,.68],C.steel,[-1.98+i*.22,-.32,.55],.013,[-.22,0,0]));
 mesh('PICKUP_CASSETTE',pickup,rake);const rotor=group('PICKUP_ROTOR_ROLL',pickup,[0,-.04,.16],true),rotorParts=[cyl(.26,4.15,C.dark,[0,0,0],[0,0,Math.PI/2])];
 for(let i=0;i<12;i++){rotorParts.push(cyl(.32,.10,C.steel,[-1.93+i*.35,0,0],[0,0,Math.PI/2]));for(let k=0;k<3;k++)rotorParts.push(box([.12,.14,.12],C.edge,[-1.93+i*.35,.32*Math.cos(k*2.094+i*.5),.32*Math.sin(k*2.094+i*.5)],.012,[k*2.094+i*.5,0,0]));}mesh('PICKUP_ROTOR',rotor,rotorParts);
 // Parallel tanks, open sight wells, visible analogue gauges and valves.
 for(const [i,x]of [[0,-.87],[1,.87]]){
  const tank=group('TANK_'+i+'_ISOLATOR',body,[x,2.55,-2.55],true),a=[cyl(.72,2.92,C.shell,[0,0,0],[Math.PI/2,0,0])];
  for(const z of [-1.49,1.49]){a.push(cyl(.66,.14,C.edge,[0,0,z],[Math.PI/2,0,0]),cyl(.2,.16,C.dark,[0,0,z*1.08],[Math.PI/2,0,0]));if(master)for(let k=0;k<10;k++){const q=k*Math.PI/5;a.push(cyl(.027,.025,C.steel,[.56*Math.cos(q),.56*Math.sin(q),z*1.055],[Math.PI/2,0,0],6));}}
  for(const z of [-1.05,1.05]){a.push(torus(.731,.058,C.amber,[0,0,z]),box([1.45,.18,.26],C.dark,[0,-.61,z],.04));for(const s of [-1,1]){a.push(box([.16,.38,.3],C.dark,[s*.63,-.62,z],.03));parts.push(cyl(.09,.20,C.rubber,[x+s*.58,1.82,-2.55+z]));}}
  a.push(cyl(.2,.16,C.dark,[0,.77,.42]),cyl(.23,.045,C.steel,[0,.87,.42]),cyl(.14,.03,C.amber,[0,.91,.42]));
  const s=x<0?-1:1;a.push(box([.07,.30,1.67],C.dark,[s*.705,.01,0],.08),box([.075,.22,1.48],C.glass,[s*.725,.01,0],.05));
  for(let k=0;k<5;k++)a.push(box([.08,.055,.018],C.edge,[s*.735,-.06,-.59+k*.295],.002));
  // Gauge on front end, facing +Z; all ticks share the tank surface draw.
  a.push(cyl(.22,.08,C.dark,[s*.32,.2,1.60],[Math.PI/2,0,0]),cyl(.18,.088,C.edge,[s*.32,.2,1.60],[Math.PI/2,0,0]));
  for(let k=0;k<9;k++){const q=-2.3+k*4.6/8;a.push(box([.018,.045,.008],k>6?C.amber:C.dark,[s*.32+Math.sin(q)*.14,.2+Math.cos(q)*.14,1.65],0,[0,0,-q]));}
  mesh('TANK_'+i+'_SURFACE',tank,a);
  const needle=group('TANK_'+i+'_GAUGE_NEEDLE',tank,[s*.32,.2,1.662],true);mesh('TANK_'+i+'_NEEDLE_SURFACE',needle,[box([.022,.13,.012],C.dark,[0,.055,0],.002),cyl(.028,.014,C.amber,[0,0,0],[Math.PI/2,0,0],8)]);
  const level=group('TANK_'+i+'_LEVEL',tank,[s*.768,-.064,-.68],true);mesh('TANK_'+i+'_LEVEL_SURFACE',level,[box([.012,.14,1.36],C.green,[0,0,.68],.004)]);
  const valve=group('TANK_'+i+'_VALVE',tank,[0,.96,.42],true);mesh('TANK_'+i+'_VALVE_SURFACE',valve,[torus(.14,.022,C.amber,[0,0,0],[Math.PI/2,0,0]),box([.28,.025,.025],C.dark,[0,0,0],.005)]);
  parts.push(hose([[x,2.55,-.83],[x,2.47,-.48],[x*1.38,1.91,-.50],[x*1.4,1.92,.15]]),cyl(.13,.12,C.amber,[x,2.55,-.83],[Math.PI/2,0,0]));
 }
 parts.push(hose([[-1.65,1.93,-1.1],[-1.9,1.93,-1.65],[-1.95,1.93,-2.7],[-1.95,1.93,-3.45]],.10),cyl(.2,.20,C.amber,[-2.02,1.93,-3.45],[0,0,Math.PI/2]),box([.4,.42,.5],C.dark,[-1.7,1.9,-3.45],.05));
 // Small processing filter between cabin and tanks.
 parts.push(cyl(.19,.55,C.edge,[1.7,2.08,-.7]),cyl(.195,.33,C.green,[1.7,2.03,-.7]),cyl(.23,.09,C.dark,[1.7,1.78,-.7]),cyl(.23,.09,C.steel,[1.7,2.39,-.7]));
 if(master){for(const s of [-1,1])for(const z of [-4,-3,-2,-1,0,1,2,3])parts.push(cyl(.035,.027,C.steel,[s*1.8,1.755,z],undefined,6));for(const s of [-1,1])for(const y of [2.05,2.67])for(const z of [.18,1.2])parts.push(cyl(.025,.025,C.steel,[s*1.57,y,z],[0,0,Math.PI/2],6));}
 mesh('CHASSIS_PROCESSOR_SURFACE',body,parts);
 for(const {id,side:s,z}of WHEELS){
  const swing=group('SUSPENSION_'+id+'_SWING',body,[s*1.60,1.45,z],true);swing.rotation.z=-s*.70;
  mesh('SUSPENSION_'+id+'_ARM',swing,[box([1,.22,.30],C.dark,[s*.5,0,0],.055),box([.73,.13,.32],C.shell,[s*.46,.06,0],.04),cyl(.21,.38,C.dark,[0,0,0],[Math.PI/2,0,0]),cyl(.13,.40,C.amber,[0,0,0],[Math.PI/2,0,0])]);
  const upright=group('SUSPENSION_'+id+'_UPRIGHT',swing,[s,0,0],true);upright.rotation.z=s*.70;
  const steer=group('WHEEL_'+id+'_STEER',upright,[0,0,0],true),roll=group('WHEEL_'+id+'_ROLL',steer,[0,0,0],true);
  const wp=[cyl(.69,.70,C.rubber,[0,0,0],[0,0,Math.PI/2]),cyl(.48,.72,C.dark,[0,0,0],[0,0,Math.PI/2]),cyl(.37,.74,C.shell,[0,0,0],[0,0,Math.PI/2]),cyl(.24,.76,C.steel,[0,0,0],[0,0,Math.PI/2]),cyl(.18,.78,C.amber,[0,0,0],[0,0,Math.PI/2])];
  const count=master?28:16;for(let k=0;k<count;k++){const q=k*Math.PI*2/count;for(const d of [-1,1]){const pts=[];for(const x of [d*.18-.16,d*.18+.16])for(const angle of [q-Math.PI/count*.72,q,q+Math.PI/count*.72])for(const r of [.685,.76])pts.push(new T.Vector3(x,r*Math.cos(angle),r*Math.sin(angle)));wp.push([new ConvexGeometry(pts),C.dark]);}}
  if(master)for(let k=0;k<8;k++){const q=k*Math.PI/4;wp.push(cyl(.025,.78,C.dark,[0,.3*Math.cos(q),.3*Math.sin(q)],[0,0,Math.PI/2],6));}mesh('WHEEL_'+id+'_SURFACE',roll,wp);
  const damper=group('SUSPENSION_'+id+'_DAMPER',body,[s*1.65,1.93,z-.25],true);mesh('SUSPENSION_'+id+'_BARREL',damper,[cyl(.11,.65,C.dark,[0,-.325,0]),cyl(.14,.09,C.amber,[0,-.10,0]),cyl(.14,.06,C.steel,[0,-.61,0])]);const rod=group('SUSPENSION_'+id+'_ROD',damper,[0,-.78,0],true);mesh('SUSPENSION_'+id+'_ROD_SURFACE',rod,[cyl(.055,.95,C.steel,[0,.475,0]),cyl(.12,.20,C.dark,[0,0,0],[Math.PI/2,0,0])]);
  socket('SOCKET_WHEEL_'+id,[0,0,0],upright,'wheel_centre');
 }
 socket('SOCKET_OFFLOAD',[-2.14,1.93,-3.45],body,'binder_outlet_minus_x');socket('SOCKET_INTAKE',[0,.25,5.4],body,'biomass_intake');socket('SOCKET_CARGO',[0,2.55,-2.55],body,'two_tank_inventory');socket('SOCKET_BEACON_SENSOR',[0,3.26,.65],body,'navigation');
 root.updateMatrixWorld(true);return root;
}
