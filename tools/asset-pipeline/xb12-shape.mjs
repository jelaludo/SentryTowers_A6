import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
export const STATIONS=[{id:'FL',side:-1,z:1.475},{id:'FR',side:1,z:1.475},{id:'RL',side:-1,z:-1.475},{id:'RR',side:1,z:-1.475}];
const C={shell:0x646c63,dark:0x202722,edge:0x414a42,rubber:0x161b18,chrome:0x8c968b,accent:0xaca88d,glass:0x122b2b};
export function buildXB12(lod=0){
 const root=new T.Group();root.name='XB12_ROOT';root.userData={family:'xb12',damage_level:0,lod,static:lod===2};
 const mat=new T.MeshStandardMaterial({name:'XB12_PALETTE',vertexColors:true,metalness:.35,roughness:.68});
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
 // Broad armored shoulders replace the light detached wheel guards.
 function slab(x0,x1,profile,color){const vs=[];for(const x of [x0,x1])for(const [y,z] of profile)vs.push(new T.Vector3(x,y,z));return [new ConvexGeometry(vs),color];}
 const roofY=z=>1.48-.30*Math.abs(z);
 const roofAngle=z=>Math.sign(z)*Math.atan(.30);
 const shoulderY=z=>1.62-.22*Math.abs(z);
 // Concave underside follows the crown too; an extruded polygon preserves the upward notch.
 function crownedHull(){const shape=new T.Shape();const profile=[[.52,-1.50],[1.03,-1.50],[1.48,0],[.991,1.63],[.52,1.55],[.88,0]];profile.forEach(([y,z],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:1.4,bevelEnabled:false,steps:1});g.rotateY(Math.PI/2);g.translate(-.7,0,0);return [g,C.shell];}
 const body=[crownedHull()];
 for(const side of [-1,1]){
  for(const end of [-1,1])body.push(slab(Math.min(side*.69,side*.79),Math.max(side*.69,side*.79),[[.90,0],[.56,end*1.48],[.70,end*1.48],[1.04,0]],C.dark));
  for(const z of [-1.18,1.18]){
   body.push(slab(Math.min(side*.64,side*.79),Math.max(side*.64,side*.79),[[.99,z-.35],[shoulderY(z-.30)-.04,z-.30],[shoulderY(z+.30)-.04,z+.30],[.99,z+.35]],C.edge));
   body.push(slab(Math.min(side*.66,side*1.44),Math.max(side*.66,side*1.44),[[shoulderY(z-.5)-.14,z-.5],[shoulderY(z-.5),z-.5],[shoulderY(z+.5),z+.5],[shoulderY(z+.5)-.14,z+.5]],C.shell));
   if(lod<2){body.push(box([.60,.035,.45],C.edge,[side*1.08,shoulderY(z)+.018,z],[Math.sign(z)*Math.atan(.22),0,0]),box([.5,.065,.12],C.dark,[side*1.13,shoulderY(z+.45)-.09,z+.45],[Math.sign(z)*Math.atan(.22),0,0]));}
  }
  if(lod<2){
   // Layered flank armor, recessed maintenance panels and guarded lamps.
   for(const z of [-.53,.12,.66])body.push(box([.035,.30,.48],C.dark,[side*.795,.96,z]),box([.055,.245,.41],C.shell,[side*.817,.97,z]),box([.065,.06,.16],C.dark,[side*.852,1.04,z]));
   body.push(box([.30,.18,.14],C.dark,[side*.43,.96,1.51]),box([.20,.05,.022],C.accent,[side*.43,.97,1.59]),box([.28,.1,.08],C.dark,[side*.43,.89,-1.49]),box([.19,.025,.025],0x743b30,[side*.43,.90,-1.54]));
   for(const end of [-1,1]){
    body.push(beam([side*.50,.76,end*1.59],[side*.50,.88,end*1.59],.045,C.chrome),beam([side*.5,.76,end*1.59],[side*.30,.76,end*1.59],.045,C.chrome));
   }
   for(const z of [-.92,-.58])body.push(box([.45,.06,.25],C.dark,[side*.34,roofY(z)+.035,z],[roofAngle(z),0,0]));
   for(let i=0;i<(lod===0?9:5);i++)body.push(box([.37,.025,.026],C.edge,[side*.34,roofY(-1.02+i*.055)+.07,-1.02+i*.055],[roofAngle(-1),0,0]));
   body.push(box([.2,.14,.55],C.edge,[side*.56,roofY(-.28)+.07,-.28],[roofAngle(-1),0,0]));
   if(lod===0){
    for(const z of [-1.18,1.18])for(const dx of [-.22,.22])for(const dz of [-.16,.16])body.push(cyl(.025,.025,C.chrome,[side*1.08+dx,shoulderY(z+dz)+.05,z+dz],[Math.sign(z)*Math.atan(.22),0,0],6));
    for(const z of [-.53,.12,.66])for(const yy of [.88,1.06])body.push(cyl(.019,.07,C.chrome,[side*.85,yy,z-.15],[0,0,Math.PI/2],6));
    // Protective rails and rear whip aerials remain detailed-master features.
    body.push(beam([side*.63,roofY(-.95)+.09,-.95],[side*.63,1.57,0],.022,C.dark),beam([side*.63,1.57,0],[side*.63,roofY(.7)+.09,.7],.022,C.dark),cyl(.027,.16,C.dark,[side*.57,1.32,-1.1]),cyl(.009,.45,C.dark,[side*.57,1.62,-1.1],undefined,6));
   }
  }
 }
 if(lod<2)body.push(box([.95,.035,.55],C.dark,[0,roofY(1.03)+.025,1.03],[roofAngle(1),0,0]),box([.79,.025,.41],C.shell,[0,roofY(1.023)+.05,1.023],[roofAngle(1),0,0]));
 body.push(box([.58,.06,.42],C.dark,[0,1.255,-.92],[roofAngle(-1),0,0]),cyl(.18,.12,C.edge,[0,1.30,-.92]),cyl(.24,.09,C.chrome,[0,1.38,-.92]),cyl(.30,.10,C.dark,[0,1.325,.76],undefined,8),cyl(.34,.035,C.chrome,[0,1.3925,.76],undefined,8));
 part('XB12_HULL',chassis,body).geometry.scale(1,1,1.25);
 const sentrySocket=group('SOCKET_SENTRY',chassis,[0,1.41,.95]);sentrySocket.userData={kind:'optional_scaled_sentry',radius_m:.34,max_height_m:.8,up:'+Y',forward:'+Z'};
 group('SOCKET_PAYLOAD',chassis,[0,1.52,0]);
 // A truncated octahedron gives eight genuine hexagonal faces and six square faces.
 const sensorYaw=group('SENSOR_YAW',chassis,[0,1.84,-1.15]);
 const sensorPitch=group('SENSOR_PITCH',sensorYaw);
 const verts=[];for(let zero=0;zero<3;zero++)for(const swap of [false,true])for(const a of [-1,1])for(const b of [-1,1]){const v=[0,0,0],axes=[0,1,2].filter(i=>i!==zero);v[axes[0]]=a*(swap?2:1)*.23;v[axes[1]]=b*(swap?1:2)*.23;verts.push(new T.Vector3(...v));}
 part('SENSOR_HEX_SPHERE',sensorPitch,[[new ConvexGeometry(verts),C.shell]]);
 const sensorItems=[];
 // Every visible sensor aperture is a flush hexagon; no protruding round eyes or cap.
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
  const n=new T.Vector3(x,y,z).normalize();
  for(const [radius,height,distance,color] of [[.282,.022,.407,C.edge],[.243,.018,.424,y>0?C.glass:C.dark]]){
   const g=new T.CylinderGeometry(radius,radius,height,6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n));sensorItems.push([g,color,n.clone().multiplyScalar(distance).toArray()]);
  }
  if(y<0)group(`SOCKET_RADAR_${x<0?'L':'R'}_${z<0?'REAR':'FRONT'}`,sensorPitch,n.clone().multiplyScalar(.44).toArray());
  if(y>0&&z>0)group(`SOCKET_CAMERA_${x<0?'L':'R'}`,sensorPitch,n.clone().multiplyScalar(.44).toArray());
 }
 part('SENSOR_INSTRUMENTS',sensorPitch,sensorItems);group('SOCKET_LIDAR',sensorPitch,new T.Vector3(1,1,-1).normalize().multiplyScalar(.44).toArray());
 for(const {id,side,z} of STATIONS){
  const p=group(`SUSP_PIVOT_${id}`,chassis,[side*.5,.5,z]);p.userData={axis:'+Z',arm_length_m:.70,compression_m:[-.12,.14]};
  part(`SUSP_ARM_${id}`,p,[box([.48,.13,.22],C.shell,[side*.36,0,0]),beam([0,0,-.2],[side*.70,0,0],.052,C.edge),beam([0,0,.2],[side*.70,0,0],.052,C.edge),cyl(.09,.46,C.dark,[0,0,0],[Math.PI/2,0,0]),box([.14,.14,.16],C.chrome,[side*.70,0,0])]);
  const lower=group(`SOCKET_DAMPER_LOWER_${id}`,p,[side*.54,0,0]);
  const upper=group(`SOCKET_DAMPER_UPPER_${id}`,chassis,[side*.6,1.035,z]);
  const damper=group(`DAMPER_AIM_${id}`,chassis,upper.position.toArray());
  const barrel=[cyl(.082,.44,C.edge,[0,.22,0]),cyl(.102,.04,C.chrome,[0,.035,0]),cyl(.095,.035,C.chrome,[0,.42,0])];if(lod<2)for(let k=0;k<6;k++)barrel.push(cyl(.09,.018,C.dark,[0,.10+k*.045,0]));part(`DAMPER_BARREL_${id}`,damper,barrel);
  const rod=group(`DAMPER_ROD_${id}`,damper);part(`DAMPER_ROD_MESH_${id}`,rod,[cyl(.029,.44,C.chrome,[0,-.22,0]),cyl(.055,.045,C.dark,[0,-.018,0])]);
  const upright=group(`UPRIGHT_${id}`,p,[side*.70,0,0]);
  const steer=group(`WHEEL_STEER_${id}`,upright);const spin=group(`WHEEL_SPIN_${id}`,steer);
  const wheel=[cyl(.5,.42,C.rubber,[0,0,0],[0,0,Math.PI/2]),cyl(.33,.435,C.dark,[0,0,0],[0,0,Math.PI/2]),cyl(.25,.45,C.edge,[0,0,0],[0,0,Math.PI/2]),cyl(.12,.47,C.accent,[0,0,0],[0,0,Math.PI/2])];
  const tread=lod===0?24:lod===1?16:8;
  for(let i=0;i<tread;i++){const a=i/tread*Math.PI*2;if(lod===2)wheel.push(box([.43,.07,.13],C.dark,[0,.465*Math.cos(a),.465*Math.sin(a)],[a,0,0]));else for(const half of [-1,1]){const g=new T.BoxGeometry(.23,.07,.14);g.rotateY(half*.32);g.rotateX(a);wheel.push([g,C.edge,[half*.105,.46*Math.cos(a),.46*Math.sin(a)]]);}}
  if(lod===0)for(let i=0;i<8;i++){const a=i*Math.PI/4;wheel.push(cyl(.027,.48,C.chrome,[0,.19*Math.cos(a),.19*Math.sin(a)],[0,0,Math.PI/2],8));}
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
