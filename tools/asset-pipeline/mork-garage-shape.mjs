import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const C={floor:0x364a50,edge:0x23343a,steel:0x526b70,pale:0xc6d8d4,cyan:0x48d8ed,amber:0xf5ad4b,paint:[0xe66482,0x35add2,0xf4ca5c,0x8ac473,0xa483db,0xece9df],dark:0x152932};
const pieces=new Map();
function material(){return new T.MeshStandardMaterial({name:'GARAGE_VERTEX_PALETTE',vertexColors:true,roughness:.7,metalness:.18,side:T.DoubleSide});}
function add(key,g,color,position=[0,0,0],rotation=[0,0,0]){g.rotateX(rotation[0]);g.rotateY(rotation[1]);g.rotateZ(rotation[2]);g.translate(...position);const p=g.attributes.position,colors=new Float32Array(p.count*3),c=new T.Color(color);for(let i=0;i<p.count;i++){colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}g.setAttribute('color',new T.BufferAttribute(colors,3));if(!pieces.has(key))pieces.set(key,[]);pieces.get(key).push(g);}
const box=(k,s,p,c,r)=>add(k,new T.BoxGeometry(...s),c,p,r);
const cyl=(k,r1,r2,h,p,c,n=8,rot=[0,0,0])=>add(k,new T.CylinderGeometry(r1,r2,h,n),c,p,rot);
function beam(k,a,b,r,c,n=8){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va),g=new T.CylinderGeometry(r,r,d.length(),n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));add(k,g,c,va.add(vb).multiplyScalar(.5).toArray());}
function flush(key,parent,name,mat){const list=pieces.get(key)||[];if(!list.length)return;const g=mergeGeometries(list,false);for(const e of list)e.dispose();pieces.delete(key);const m=new T.Mesh(g,mat);m.name=name;parent.add(m);return m;}
function marker(parent,name,p,kind){const o=new T.Object3D();o.name=name;o.position.set(...p);o.userData={role:'socket',kind};parent.add(o);return o;}
export function buildGarage(lod){pieces.clear();const detailed=lod===0,staticTier=lod===2,K='static',mat=material(),root=new T.Group();root.name='MORK_GARAGE_ROOT';root.userData={family:'mork_customization_garage',lod,damage_level:0,plot_m:[12,18],roof:'open',vehicle_reference:'assets/hover-tank/customization/models/lod1/mork_d0.glb'};
  // A low open parapet keeps the horizon clear. The vehicle footprint remains unobstructed.
  box(K,[12,.28,18],[0,.14,0],C.floor);box(K,[12,.18,.25],[0,.25,-8.88],C.edge);
  for(const x of [-5.86,5.86]){box(K,[.28,.8,18],[x,.54,0],C.edge);for(const z of [-8,-4,0,4,8])box(K,[.42,.08,.45],[x,.95,z],C.amber);}
  for(const x of [-2.95,2.95]){box(K,[.11,.025,13.8],[x,.296,0],C.pale);for(const z of [-6,-2,2,6])box(K,[.3,.028,.45],[x,.31,z],C.cyan);}
  for(const z of [-7.2,7.2]){box(K,[7,.045,.11],[0,.31,z],C.amber);}
  // Right rear workbench and safely contained paint stores.
  box(K,[2.9,.18,2],[4.08,1.18,-5.75],C.pale);for(const x of [2.78,5.35])for(const z of [-6.55,-4.95])beam(K,[x,.35,z],[x,1.12,z],.065,C.steel);
  box(K,[2.85,1.15,.15],[4.08,1.82,-6.7],C.edge);box(K,[2.7,.08,.12],[4.08,2.39,-6.58],C.cyan);
  box(K,[2.8,.09,.65],[4.08,1.48,-6.25],C.steel);
  const n=detailed?12:8;for(let i=0;i<n;i++){const x=3.02+(i%4)*.66,z=-6.33+Math.floor(i/4)*.58,col=C.paint[i%C.paint.length];cyl(K,.18,.18,.34,[x,1.47,z],col,detailed?12:8);cyl(K,.19,.19,.035,[x,1.66,z],C.dark,8);if(detailed)cyl(K,.08,.08,.035,[x,1.69,z],C.pale,8);}
  for(let i=0;i<(detailed?5:3);i++){const x=3.1+i*.45;box(K,[.18,.045,.4],[x,1.29,-5.05],i%2?C.steel:C.amber);}
  box(K,[1.8,.8,.65],[4.25,.69,-3.45],C.edge);box(K,[1.6,.11,.5],[4.25,1.14,-3.45],C.steel);
  // Personal project details are concentrated outside the drive envelope.
  if(detailed){box(K,[1.5,.12,.9],[4.14,1.3,-4.8],C.dark);for(let i=0;i<5;i++)box(K,[.1,.01,.34],[3.64+i*.24,1.37,-4.8],C.paint[i]);box(K,[.75,.45,.045],[4.28,1.78,-6.6],C.pale);}
  // Two field-light tripods, angled into the bay. Lens geometry stays independently addressable.
  for(const [side,x,z] of [['L',-4.72,4.75],['R',4.72,4.75]]){
    for(const dx of [-.38,0,.38])beam(K,[x,2.27,z],[x+dx,.32,z+(dx===0?.35:-.22)],.048,C.steel);
    cyl(K,.095,.095,.2,[x,2.3,z],C.dark);box(K,[.65,.48,.22],[x,2.49,z-.13],C.edge);box(K,[.52,.36,.07],[x,2.49,z-.31],C.pale);
    if(!staticTier){const lensKey=`lens_${side}`;box(lensKey,[.4,.26,.012],[x,2.49,z-.357],C.cyan);flush(lensKey,root,`LIGHT_LENS_${side}`,new T.MeshStandardMaterial({name:`LIGHT_LENS_${side}_MATERIAL`,vertexColors:true,roughness:.3,emissive:C.cyan,emissiveIntensity:0}));}
    marker(root,`SOCKET_LIGHT_${side}`,[x,2.49,z-.37],'night_cycle_light');
  }
  // Side-mounted paint robot. Named pivots remain in every tier; static LOD2 is a fixed proxy.
  const base=new T.Group();base.name='ARM_BASE_YAW';base.position.set(-4.6,.34,-1.6);base.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'+Y',range_deg:[-65,65]};root.add(base);
  cyl(K,.58,.72,.42,[-4.6,.55,-1.6],C.edge,12);cyl(K,.4,.4,.12,[-4.6,.82,-1.6],C.amber,12);
  const shoulder=new T.Group();shoulder.name='ARM_SHOULDER';shoulder.position.set(0,.57,0);shoulder.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'+Z',range_deg:[-30,65]};base.add(shoulder);
  const elbow=new T.Group();elbow.name='ARM_ELBOW';elbow.position.set(0,1.85,0);elbow.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'+Z',range_deg:[-110,20]};shoulder.add(elbow);
  const wrist=new T.Group();wrist.name='ARM_WRIST';wrist.position.set(.95,1.2,0);wrist.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'+Z',range_deg:[-90,90]};elbow.add(wrist);
  if(staticTier){beam(K,[-4.6,.9,-1.6],[-4.6,2.75,-1.6],.22,C.pale);beam(K,[-4.6,2.75,-1.6],[-3.65,3.95,-1.6],.18,C.steel);box(K,[.4,.22,.32],[-3.48,3.93,-1.6],C.amber);}
  else{cyl('arm1',.17,.22,1.85,[0,.925,0],C.pale,detailed?12:8);cyl('arm1',.32,.32,.38,[0,0,0],C.edge,12,[Math.PI/2,0,0]);flush('arm1',shoulder,'ARM_UPPER_LINK',mat);
    beam('arm2',[0,0,0],[.95,1.2,0],.17,C.steel,detailed?12:8);cyl('arm2',.25,.25,.36,[0,0,0],C.amber,12,[Math.PI/2,0,0]);flush('arm2',elbow,'ARM_FORE_LINK',mat);
    box('tool',[.43,.2,.34],[.2,0,0],C.edge);cyl('tool',.07,.11,.3,[.48,0,0],C.pale,8,[0,0,-Math.PI/2]);flush('tool',wrist,'SPRAY_HEAD',mat);
    const plumeGeometry=new T.CylinderGeometry(.37,.025,1.7,detailed?14:8,1,true);plumeGeometry.rotateZ(-2.1);plumeGeometry.translate(1.37,-.425,0);const plume=new T.Mesh(plumeGeometry,new T.MeshBasicMaterial({name:'SPRAY_PLUME_MATERIAL',color:0xe66482,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));plume.name='SPRAY_PLUME';plume.userData={role:'optional_viewer_effect',paint:'coral_test_color'};wrist.add(plume);
  }
  if(staticTier){const plume=new T.Object3D();plume.name='SPRAY_PLUME';plume.userData={role:'lookup_only'};wrist.add(plume);}
  marker(wrist,'SOCKET_SPRAY_NOZZLE',[.63,0,0],'paint_spray');
  marker(root,'SOCKET_VEHICLE_ORIGIN',[0,.31,0],'vehicle_placement');marker(root,'SOCKET_POWER',[-5.55,.5,-7.8],'power');marker(root,'SOCKET_PAINT_SUPPLY',[4.1,1.25,-5.75],'paint_supply');
  flush(K,root,'GARAGE_STATIC_BODY',mat);
  root.userData.engine_nodes=['ARM_BASE_YAW','ARM_SHOULDER','ARM_ELBOW','ARM_WRIST','LIGHT_LENS_L','LIGHT_LENS_R'];return root;
}
