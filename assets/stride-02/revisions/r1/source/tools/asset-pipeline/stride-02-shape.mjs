import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {buildModule} from './pallet-cargo-shape.mjs';
import {applyStride02,STATIONS,SPEC} from '../../assets/stride-02/runtime.js';
const C={ivory:0xd8cfbc,dark:0x30383d,steel:0x879399,amber:0xe4a83e,rubber:0x1d252a};
export function buildStride02(lod=0,configuration='deployed'){
 const root=new T.Group();root.name='STRIDE02_ROOT';root.userData={module:'stride02',family:'pallet_cargo',revision:1,lod,damage_level:0,static:false,configuration,units:'metres',...SPEC};
 const material=new T.MeshStandardMaterial({name:'PCS_PALETTE',vertexColors:true,roughness:.59,metalness:.28}),segments=lod===0?24:10;
 const group=(name,parent=root,p=[0,0,0],data={})=>{const g=new T.Group();g.name=name;g.position.fromArray(p);g.userData=data;parent.add(g);return g;};
 const box=(s,p,c,rounded=false)=>[rounded?new RoundedBoxGeometry(...s,1,.006):new T.BoxGeometry(...s),p,c];
 const cyl=(r,h,p,c,axis='y')=>[new T.CylinderGeometry(r,r,h,segments),p,c,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0]];
 function mesh(name,parent,parts){const geometries=parts.map(([g,p,c,rot=[0,0,0]])=>{g=g.index?g.toNonIndexed():g;g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...p);for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);const color=new T.Color(c),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=color.r;a[i+1]=color.g;a[i+2]=color.b;}g.setAttribute('color',new T.BufferAttribute(a,3));return g;});const geometry=mergeVertices(mergeGeometries(geometries),1e-6);geometries.forEach(g=>g.dispose());const m=new T.Mesh(geometry,material);m.name=name;parent.add(m);return m;}
 function tube(width,h,p,c,wall=.005){const a=[],v=width/2-wall/2;for(const x of [-v,v])a.push(box([wall,h,width],[p[0]+x,p[1],p[2]],c));for(const z of [-v,v])a.push(box([width-2*wall,h,wall],[p[0],p[1],p[2]+z],c));return a;}
 const deck=group('PALLET_LIFT',root,[0,.83,0],{axis:'+Y',engine_driven:true,range_m:[.44,.83]});
 const a=[];
 for(const z of [-.43,-.215,0,.215,.43])a.push(box([1.10,.04,.14],[0,-.02,z],C.ivory,lod===0));
 for(const x of [-.57,.57]){a.push(box([.06,.04,1],[x,-.02,0],C.ivory,lod===0));a.push(box([.06,.01,1],[x,-.435,0],C.rubber));}
 // Narrow spine, open-sided storage bays, and real linear carriage rails.
 a.push(box([.038,.12,.96],[0,-.10,0],C.dark));
 for(const {id,side,end}of STATIONS){
  const x=side*.55,z=end*.44;
  a.push(...tube(.100,.16,[side*.10,-.335,z],C.dark));
  a.push(box([.1,.04,.10],[x,-.06,z],C.dark),box([.03,.025,.015],[x,-.06,end*.491],C.amber));
  a.push(box([.52,.027,.028],[side*.32,-.072,end*.38],C.steel));
  a.push(box([.040,.04,.065],[side*.58,-.072,end*.38],C.dark));
  group('SOCKET_CARGO_LOCK_'+id,deck,[side*.53,0,end*.43],{socket:true,kind:'cargo_lock_receiver',axis:'+Y'});
  const park=group('PARK_'+id+'_MOUNT',deck,[side*.10,-.415,z],{kind:'parking_support'});
  let parent=park;
  for(let k=1;k<=3;k++){parent=group('PARK_'+id+'_SLIDE_'+k,parent,[0,0,0],{axis:'-Y',engine_driven:true,stroke_m:[0,.145]});const parts=tube([.084,.063,.042][k-1],.16,[0,.08,0],k===1?C.steel:C.dark,.004);if(k===3){parts.push(box([.100,.018,.10],[0,-.016,0],C.rubber),box([.085,.01,.08],[0,-.002,0],C.ivory));group('SOCKET_PARK_FOOT_'+id,parent,[0,-.025,0],{socket:true,kind:'ground_contact',axis:'+Y'});}mesh('PARK_'+id+'_SURFACE_'+k,parent,parts);}
 }
 if(lod===0){for(const z of [-.43,0,.43])for(const x of [-.48,.48])a.push(cyl(.006,.003,[x,-.0015,z],C.steel));for(const x of [-.57,.57])for(const z of [-.27,.27])a.push(box([.028,.003,.07],[x,-.0015,z],C.dark));}
 mesh('PALLET_SURFACE',deck,a);group('SOCKET_CARGO',deck,[0,0,0],{socket:true,kind:'crate_origin',axis:'+Y'});
 const source=buildModule('stride',lod);
 for(const {id,side,end}of STATIONS){
  const prefix='LEG_'+id+'_',carriage=group(prefix+'CARRIAGE',deck,[side*.53,0,0],{axis:'+X',engine_driven:true,travel_m:.40});
  const mount=source.getObjectByName(prefix+'SPLAY_YAW');carriage.add(mount);mount.position.set(0,-.14,end*.38);mount.rotation.set(0,0,0);
  const hip=mount.getObjectByName(prefix+'HIP_PITCH'),roll=group(prefix+'PACK_ROLL',mount,[0,0,0],{axis:'+X',engine_driven:true,range_rad:[-Math.PI/2,Math.PI/2]});roll.add(hip);
  const ankle=mount.getObjectByName(prefix+'ANKLE_ROLL'),steer=mount.getObjectByName('WHEEL_'+id+'_YAW');
  const hinge=group('WHEEL_'+id+'_PACK_HINGE',ankle,[-side*.13,.13,0],{axis:'+Z',engine_driven:true,range_rad:[-Math.PI/2,Math.PI/2]});hinge.add(steer);steer.position.set(side*.13,-.13,0);
  mesh('WHEEL_'+id+'_PACK_BEARING_SURFACE',hinge,[cyl(.029,.07,[0,0,0],C.dark,'z'),cyl(.019,.076,[0,0,0],C.amber,'z')]);
  mesh('WHEEL_'+id+'_PACK_RAIL_SURFACE',ankle,[box([.28,.025,.04],[0,.025,0],C.steel)]);
  const slide=group('WHEEL_'+id+'_GUIDE_SLIDE',ankle,[0,0,0],{axis:'+X',engine_driven:true});
  mesh('WHEEL_'+id+'_GUIDE_SURFACE',slide,[...tube(.042,.16,[-side*.13,0,0],C.dark,.004)]);
  // Sliding rod stays vertical while the gimbal turns at its foot.
  const rod=group('WHEEL_'+id+'_PACK_ROD',ankle,[-side*.13,.13,0],{axes:['+X','+Y'],engine_driven:true});
  mesh('WHEEL_'+id+'_PACK_ROD_SURFACE',rod,[cyl(.014,.22,[0,.01,0],C.steel)]);
 }
 root.traverse(o=>{if(o.isMesh)o.material=material;});
 applyStride02(root,{fold:configuration==='stowed'?1:0});root.updateMatrixWorld(true);return root;
}
