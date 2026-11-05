import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildModule} from './pallet-cargo-shape.mjs';
import {applyStride02,STATIONS,SPEC} from '../../assets/stride-02/runtime.js';
const C={ivory:0xd8cfbc,dark:0x30383d,steel:0x879399,amber:0xe4a83e,rubber:0x1d252a};
export function buildStride02(lod=0,configuration='deployed'){
 const root=new T.Group();root.name='STRIDE02_ROOT';root.userData={module:'stride02',family:'pallet_cargo',revision:2,lod,damage_level:0,static:false,configuration,units:'metres',...SPEC};
 const material=new T.MeshStandardMaterial({name:'PCS_PALETTE',vertexColors:true,roughness:.59,metalness:.28}),segments=lod===0?24:10,s=SPEC.leg_scale;
 const group=(name,parent=root,p=[0,0,0],data={})=>{const g=new T.Group();g.name=name;g.position.fromArray(p);g.userData=data;parent.add(g);return g;};
 const box=(size,p,c)=>[new T.BoxGeometry(...size),p,c];
 const cyl=(r,h,p,c,axis='y')=>[new T.CylinderGeometry(r,r,h,segments),p,c,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0]];
 function mesh(name,parent,parts,scale=1){const gs=parts.map(([g,p,c,rot=[0,0,0]])=>{g=g.index?g.toNonIndexed():g;g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...p);if(scale!==1)g.scale(scale,scale,scale);for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);const color=new T.Color(c),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=color.r;a[i+1]=color.g;a[i+2]=color.b;}g.setAttribute('color',new T.BufferAttribute(a,3));return g;});const geometry=mergeVertices(mergeGeometries(gs),1e-6);gs.forEach(g=>g.dispose());const m=new T.Mesh(geometry,material);m.name=name;parent.add(m);return m;}
 function tube(width,h,p,c,wall=.005){const a=[],v=width/2-wall/2;for(const x of [-v,v])a.push(box([wall,h,width],[p[0]+x,p[1],p[2]],c));for(const z of [-v,v])a.push(box([width-2*wall,h,wall],[p[0],p[1],p[2]+z],c));return a;}
 const deck=group('PALLET_LIFT',root,[0,SPEC.deployed_deck_m,0],{axis:'+Y',engine_driven:true,range_m:[.16,.29]});
 // Keep the original passive pallet surface, including runners, spacers and lock holes.
 const pallet=buildModule('pallet',lod),body=pallet.getObjectByName('PALLET_SURFACE');body.geometry=body.geometry.clone().translate(0,-.16,0);body.material=material;deck.add(body);
 group('SOCKET_CARGO',deck,[0,0,0],{socket:true,kind:'crate_origin',axis:'+Y'});
 const housings=[];
 for(const {id,side,end}of STATIONS){
  group('SOCKET_CARGO_LOCK_'+id,deck,[side*.53,0,end*.43],{socket:true,kind:'cargo_lock_receiver',axis:'+Y'});
  const x=side*.11,z=end*.43;
  housings.push(...tube(.030,.055,[x,-.1265,z],C.dark,.002));
  housings.push(box([.135,.009,.012],[side*.24745,-.0445,end*SPEC.mount_z_m],C.steel));
  const park=group('PARK_'+id+'_MOUNT',deck,[x,-.154,z],{kind:'parking_support'});let parent=park;
  for(let k=1;k<=3;k++){parent=group('PARK_'+id+'_SLIDE_'+k,parent,[0,0,0],{axis:'-Y',engine_driven:true,stroke_m:[0,.044]});const parts=tube([.024,.018,.012][k-1],.05,[0,.025,0],k===1?C.steel:C.dark,.0015);if(k===3){parts.push(box([.035,.006,.030],[0,-.003,0],C.rubber));group('SOCKET_PARK_FOOT_'+id,parent,[0,-.006,0],{socket:true,kind:'ground_contact',axis:'+Y'});}mesh('PARK_'+id+'_SURFACE_'+k,parent,parts);}
 }
 mesh('PARK_HOUSINGS_SURFACE',deck,housings);
 const source=buildModule('stride',lod);
 for(const {id,side,end}of STATIONS){
  const prefix='LEG_'+id+'_',carriage=group(prefix+'CARRIAGE',deck,[side*SPEC.open_carriage_x_m,0,0],{axis:'+X',engine_driven:true,travel_m:SPEC.open_carriage_x_m-SPEC.closed_carriage_x_m});
  mesh(prefix+'CARRIAGE_SURFACE',carriage,[box([.016,.058,.016],[0,-.079,end*(SPEC.mount_z_m+.025)],C.dark)]);
  const mount=source.getObjectByName(prefix+'SPLAY_YAW');carriage.add(mount);
  // Bake a constant 23% derivation into vertices and rest offsets. No animated scale.
  mount.traverse(o=>{o.position.multiplyScalar(s);if(o.isMesh){o.geometry=o.geometry.clone();const a=o.geometry.attributes.position;for(let i=0;i<a.array.length;i++)a.array[i]*=s;a.needsUpdate=true;o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();}if(o.userData.radius_m)o.userData.radius_m*=s;if(o.userData.stroke_m)o.userData.stroke_m=o.userData.stroke_m.map(v=>v*s);});
  mount.position.set(0,-SPEC.hip_deck_offset_m,end*SPEC.mount_z_m);mount.rotation.set(0,0,0);
  const hip=mount.getObjectByName(prefix+'HIP_PITCH'),roll=group(prefix+'PACK_ROLL',mount,[0,0,0],{axis:'+X',engine_driven:true,range_rad:[-Math.PI/2,Math.PI/2]});roll.add(hip);
  const ankle=mount.getObjectByName(prefix+'ANKLE_ROLL'),steer=mount.getObjectByName('WHEEL_'+id+'_YAW');
  const hinge=group('WHEEL_'+id+'_PACK_HINGE',ankle,[-side*.13*s,.13*s,0],{axis:'+Z',engine_driven:true,range_rad:[-Math.PI/2,Math.PI/2]});hinge.add(steer);steer.position.set(side*.13*s,-.13*s,0);
  mesh('WHEEL_'+id+'_PACK_BEARING_SURFACE',hinge,[cyl(.029,.07,[0,0,0],C.dark,'z'),cyl(.019,.076,[0,0,0],C.amber,'z')],s);
  mesh('WHEEL_'+id+'_PACK_RAIL_SURFACE',ankle,[box([.28,.025,.04],[0,.025,0],C.steel)],s);
  const slide=group('WHEEL_'+id+'_GUIDE_SLIDE',ankle,[0,0,0],{axis:'+X',engine_driven:true});mesh('WHEEL_'+id+'_GUIDE_SURFACE',slide,tube(.042,.16,[-side*.13,0,0],C.dark,.004),s);
  const rod=group('WHEEL_'+id+'_PACK_ROD',ankle,[-side*.13*s,.13*s,0],{axes:['+X','+Y'],engine_driven:true});mesh('WHEEL_'+id+'_PACK_ROD_SURFACE',rod,[cyl(.014,.22,[0,.01,0],C.steel)],s);
 }
 root.traverse(o=>{if(o.isMesh)o.material=material;});applyStride02(root,{fold:configuration==='stowed'?1:0});root.updateMatrixWorld(true);return root;
}
