import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
export const STATIONS=[{id:'FL',side:-1,z:1.18},{id:'FR',side:1,z:1.18},{id:'RL',side:-1,z:-1.18},{id:'RR',side:1,z:-1.18}];
const C={shell:0xb3c3c9,dark:0x26373e,edge:0x6b858e,rubber:0x182327,chrome:0xc9dde1,accent:0xdb9c43,glass:0x17485c};
export function buildXB12(lod=0){
 const root=new T.Group();root.name='XB12_ROOT';root.userData={family:'xb12',damage_level:0,lod,static:lod===2};
 const mat=new T.MeshStandardMaterial({name:'XB12_PALETTE',vertexColors:true,metalness:.45,roughness:.48});
 const seg=lod===0?16:lod===1?10:6;
 function group(name,parent=root,pos=[0,0,0]){const g=new T.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
 function part(name,parent,items){
  const gs=items.map(([g,color,pos=[0,0,0],rot=[0,0,0]])=>{g=g.index?g.toNonIndexed():g;g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rot)));g.translate(...pos);for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);const c=new T.Color(color),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}g.setAttribute('color',new T.BufferAttribute(a,3));return g;});
  const g=mergeVertices(mergeGeometries(gs),1e-5);gs.forEach(g=>g.dispose());const m=new T.Mesh(g,mat);m.name=name;parent.add(m);return m;
 }
 const box=(s,c,p,r)=>[new T.BoxGeometry(...s),c,p,r];
 const cyl=(r,h,c,p,rot=[0,0,0],n=seg)=>[new T.CylinderGeometry(r,r,h,n),c,p,rot];
 function beam(a,b,r,c){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va),g=new T.CylinderGeometry(r,r,d.length(),lod===0?10:6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));return [g,c,va.add(vb).multiplyScalar(.5).toArray()];}
 const chassis=group('XB12_CHASSIS');
 const points=[];for(const x of [-.68,.68])for(const [y,z] of [[.63,-1.5],[.94,-1.4],[1.08,.75],[.78,1.65],[.63,1.45]])points.push(new T.Vector3(x,y,z));
 const body=[[new ConvexGeometry(points),C.shell],box([1.12,.14,2.45],C.dark,[0,.59,0]),box([.78,.08,1.4],C.dark,[0,1.07,-.35]),box([.10,.07,1.15],C.accent,[-.46,1.07,-.28]),box([.10,.07,1.15],C.accent,[.46,1.07,-.28])];
 for(const side of [-1,1]){
  body.push(box([.14,.2,2.45],C.dark,[side*.71,.79,-.02]),box([.025,.06,1.65],C.accent,[side*.79,.83,.05]));
  for(const z of [-1.18,1.18])body.push(beam([side*.7,.96,z],[side*.78,1.235,z],.045,C.edge),beam([side*.78,1.235,z],[side*1.20,1.235,z],.045,C.edge),box([.49,.09,.85],C.shell,[side*1.2,1.28,z]),box([.5,.04,.09],C.accent,[side*1.2,1.33,z+.38]));
  body.push(box([.22,.13,.09],C.glass,[side*.43,.86,1.52]),box([.15,.1,.06],C.accent,[side*.48,.78,-1.53]));
  if(lod===0)for(let i=0;i<8;i++)body.push(box([.04,.025,.38],C.edge,[side*.43,1.12,-.75+i*.12]));
 }
 body.push(cyl(.13,.30,C.dark,[0,1.20,.10]),cyl(.24,.09,C.chrome,[0,1.34,.10]));
 part('XB12_HULL',chassis,body);
 group('SOCKET_PAYLOAD',chassis,[0,1.12,-.7]);
 // A truncated octahedron gives eight genuine hexagonal faces and six square faces.
 const sensorYaw=group('SENSOR_YAW',chassis,[0,1.80,.10]);
 const sensorPitch=group('SENSOR_PITCH',sensorYaw);
 const verts=[];for(let zero=0;zero<3;zero++)for(const swap of [false,true])for(const a of [-1,1])for(const b of [-1,1]){const v=[0,0,0],axes=[0,1,2].filter(i=>i!==zero);v[axes[0]]=a*(swap?2:1)*.23;v[axes[1]]=b*(swap?1:2)*.23;verts.push(new T.Vector3(...v));}
 part('SENSOR_HEX_SPHERE',sensorPitch,[[new ConvexGeometry(verts),C.shell]]);
 const sensorItems=[];
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
  const n=new T.Vector3(x,y,z).normalize();const g=new T.CylinderGeometry(.267,.267,.018,6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n));sensorItems.push([g,y>0?C.dark:C.edge,n.clone().multiplyScalar(.406).toArray()]);
 }
 // Four radar arrays on diagonal lower hexagons, identifiable amber edge frame.
 for(const x of [-1,1])for(const z of [-1,1]){
  const n=new T.Vector3(x,-1,z).normalize();const g=new T.CylinderGeometry(.205,.205,.025,6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n));sensorItems.push([g,C.accent,n.clone().multiplyScalar(.425).toArray()]);const face=new T.CylinderGeometry(.182,.182,.028,6);face.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n));sensorItems.push([face,C.dark,n.clone().multiplyScalar(.44).toArray()]);group(`SOCKET_RADAR_${x<0?'L':'R'}_${z<0?'REAR':'FRONT'}`,sensorPitch,n.multiplyScalar(.46).toArray());
 }
 sensorItems.push(box([.36,.22,.04],C.dark,[0,0,.47]));
 for(const x of [-.115,.115]){sensorItems.push(cyl(.075,.06,C.chrome,[x,0,.5],[Math.PI/2,0,0]),cyl(.055,.065,C.glass,[x,0,.52],[Math.PI/2,0,0]));group(`SOCKET_CAMERA_${x<0?'L':'R'}`,sensorPitch,[x,0,.555]);}
 sensorItems.push(cyl(.17,.12,C.dark,[0,.51,0]),cyl(.148,.065,C.glass,[0,.575,0]),cyl(.18,.045,C.accent,[0,.63,0]));
 part('SENSOR_INSTRUMENTS',sensorPitch,sensorItems);group('SOCKET_LIDAR',sensorPitch,[0,.575,0]);
 for(const {id,side,z} of STATIONS){
  const p=group(`SUSP_PIVOT_${id}`,chassis,[side*.5,.5,z]);p.userData={axis:'+Z',arm_length_m:.70,compression_m:[-.12,.14]};
  part(`SUSP_ARM_${id}`,p,[beam([0,0,-.2],[side*.70,0,0],.052,C.edge),beam([0,0,.2],[side*.70,0,0],.052,C.edge),cyl(.09,.46,C.dark,[0,0,0],[Math.PI/2,0,0]),box([.14,.14,.16],C.chrome,[side*.70,0,0])]);
  const lower=group(`SOCKET_DAMPER_LOWER_${id}`,p,[side*.54,0,0]);
  const upper=group(`SOCKET_DAMPER_UPPER_${id}`,chassis,[side*.6,1.035,z]);
  const damper=group(`DAMPER_AIM_${id}`,chassis,upper.position.toArray());
  part(`DAMPER_BARREL_${id}`,damper,[cyl(.068,.44,C.accent,[0,.22,0]),cyl(.084,.04,C.dark,[0,.035,0]),cyl(.079,.035,C.dark,[0,.42,0])]);
  const rod=group(`DAMPER_ROD_${id}`,damper);part(`DAMPER_ROD_MESH_${id}`,rod,[cyl(.029,.44,C.chrome,[0,-.22,0]),cyl(.055,.045,C.dark,[0,-.018,0])]);
  const upright=group(`UPRIGHT_${id}`,p,[side*.70,0,0]);
  const steer=group(`WHEEL_STEER_${id}`,upright);const spin=group(`WHEEL_SPIN_${id}`,steer);
  const wheel=[cyl(.5,.32,C.rubber,[0,0,0],[0,0,Math.PI/2]),cyl(.29,.335,C.dark,[0,0,0],[0,0,Math.PI/2]),cyl(.205,.35,C.edge,[0,0,0],[0,0,Math.PI/2]),cyl(.09,.38,C.accent,[0,0,0],[0,0,Math.PI/2])];
  const tread=lod===0?28:lod===1?16:8;
  for(let i=0;i<tread;i++){const a=i/tread*Math.PI*2;wheel.push(box([.34,.055,.09],C.dark,[0,.4725*Math.cos(a),.4725*Math.sin(a)],[a,0,0]));}
  if(lod===0)for(let i=0;i<8;i++){const a=i*Math.PI/4;wheel.push(cyl(.022,.365,C.chrome,[0,.15*Math.cos(a),.15*Math.sin(a)],[0,0,Math.PI/2],8));}
  part(`WHEEL_${id}`,spin,wheel);
 }
 root.updateMatrixWorld(true);
 return root;
}
export function makeStatic(root){
 root.updateMatrixWorld(true);const gs=[],meshes=[];let material;
 root.traverse(o=>{if(o.isMesh){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);gs.push(g);meshes.push(o);material=o.material;}});
 for(const m of meshes){const lookup=new T.Group();lookup.name=m.name;lookup.userData={lookup_only:true};lookup.position.copy(m.position);lookup.quaternion.copy(m.quaternion);lookup.scale.copy(m.scale);m.parent.add(lookup);m.removeFromParent();}
 const mesh=new T.Mesh(mergeGeometries(gs),material);mesh.name='XB12_STATIC';root.add(mesh);root.userData.static=true;gs.forEach(g=>g.dispose());return root;
}
