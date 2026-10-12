import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
export const LAYOUT={centres:[-24,24],bridgeLength:20,bridgeUnderside:7.5,bridgeFloor:7.9,portHeight:9.7,sentryHeight:35.6,platformHeight:32,platformThickness:.18,padRadius:2.2,cradleHeight:3.6,defenseDepressionMax:70,supportOpening:19};
export function buildColonyModule(kind,lod){
 const root=new T.Group();root.name='ROOT';root.userData={family:'dome_colony',module:kind,lod,damage_level:0};
 const bins=new Map(),n=[64,32,16][lod],fine=lod===0,far=lod===2;
 const mat=new T.MeshStandardMaterial({name:'COLONY_PALETTE',vertexColors:true,roughness:.65,metalness:.25});
 const glass=new T.MeshStandardMaterial({name:'COLONY_GLASS',color:0x9cdce0,transparent:true,opacity:.18,roughness:.18,metalness:.05,side:T.DoubleSide,depthWrite:false});
 const C={white:0xd8ddd7,dark:0x293c46,steel:0x718994,amber:0xe9b250,green:0x478354,cyan:0x6dc9d3};
 function add(g,c,p=[0,0,0],rot=[0,0,0],key='BODY'){g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...p);const a=new Float32Array(g.attributes.position.count*3),color=new T.Color(c);for(let i=0;i<a.length;i+=3)color.toArray(a,i);g.setAttribute('color',new T.BufferAttribute(a,3));if(!bins.has(key))bins.set(key,[]);bins.get(key).push(g);}
 const box=(s,p,c,key='BODY')=>add(new T.BoxGeometry(...s),c,p,[0,0,0],key);
 const cyl=(r,h,p,c,seg=n,key='BODY')=>add(new T.CylinderGeometry(r,r,h,seg),c,p,[0,0,0],key);
 function beam(a,b,r,c){const u=new T.Vector3(...a),v=new T.Vector3(...b),d=v.clone().sub(u),g=new T.CylinderGeometry(r,r,d.length(),fine?8:4);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));add(g,c,u.add(v).multiplyScalar(.5).toArray());}
 function socket(name,p,normal,role){const o=new T.Object3D();o.name=name;o.position.set(...p);o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...normal));o.userData={role,normal};root.add(o);}
 function ring(r,y,c){add(new T.TorusGeometry(r,fine?.095:.1,far?3:4,n),c,[0,y,0],[Math.PI/2,0,0]);}
 if(kind==='bridge'){
  box([20,.4,4.4],[0,7.7,0],C.white);
  for(const x of [-10,10]){box([1,7.5,1],[x,3.75,0],C.steel);box([2,.3,2],[x,.15,0],C.dark);}
  for(const z of [-2,2])box([20,1.1,.18],[0,8.45,z],C.white);
  for(const x of [-10,-5,0,5,10]){for(let i=0;i<8;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;beam([x,8.8+2*Math.sin(a),2*Math.cos(a)],[x,8.8+2*Math.sin(b),2*Math.cos(b)],.1,C.steel);}}
  const pos=[];for(let i=0;i<n/2;i++){const a=i*Math.PI/(n/2),b=(i+1)*Math.PI/(n/2);const p=[[-10,8.8+2*Math.sin(a),2*Math.cos(a)],[10,8.8+2*Math.sin(a),2*Math.cos(a)],[-10,8.8+2*Math.sin(b),2*Math.cos(b)],[10,8.8+2*Math.sin(b),2*Math.cos(b)]];for(const j of [0,1,2,1,3,2])pos.push(...p[j]);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();add(g,far?C.cyan:C.white,[0,0,0],[0,0,0],far?'BODY':'GLASS');
  socket('SOCKET_LINK_W',[-10,9.7,0],[-1,0,0],'hallway');socket('SOCKET_LINK_E',[10,9.7,0],[1,0,0],'hallway');
 }else{
  cyl(14.6,1.2,[0,.6,0],C.dark);cyl(14.2,.2,[0,1.3,0],C.white);ring(14.25,1.44,C.steel);
  cyl(2.4,12,[0,7.4,0],C.white);cyl(2.55,.3,[0,11.9,0],C.dark);
  // A slim mast carries a thin deck; a yawing fork tilts the whole canonical sentry.
  cyl(3,.3,[0,13.35,0],C.dark);
  cyl(.65,18.5,[0,22.65,0],C.white);
  cyl(.83,.24,[0,13.6,0],C.steel);cyl(.83,.24,[0,31.7,0],C.steel);
  cyl(LAYOUT.padRadius,LAYOUT.platformThickness,[0,31.91,0],C.dark);
  cyl(1.95,.025,[0,32.0125,0],C.steel);
  // Deck markings are flush strips, with no raised rim in the firing path.
  for(let i=0;i<8;i++){const a=i*Math.PI/4;box([.22,.012,.12],[1.95*Math.cos(a),32.035,1.95*Math.sin(a)],C.amber);}
  const yaw=new T.Group();yaw.name='MOUNT_YAW';yaw.position.y=32;root.add(yaw);
  const cradle=new T.Group();cradle.name='CRADLE_PITCH';cradle.position.y=3.6;yaw.add(cradle);
  yaw.userData={role:far?'lookup_only':'engine_pivot',axis:'+Y',range_deg:[-180,180]};
  cradle.userData={role:far?'lookup_only':'engine_pivot',axis:'+X',depression_range_deg:[0,70]};
  for(const x of [-1.35,1.35]){box([.22,3.6,.38],[x,1.8,0],C.steel,'FORK');box([.36,.5,.6],[x,3.6,0],C.amber,'FORK');}
  box([2.92,.18,.7],[0,.1,0],C.steel,'FORK');
  box([2.4,.14,2.4],[0,-.1,0],C.dark,'CRADLE');
  for(const x of [-1.12,1.12])box([.16,.24,2.4],[x,.05,0],C.steel,'CRADLE');
  socket('SOCKET_SENTRY_00',[0,0,0],[0,1,0],'sentry');
  cradle.add(root.getObjectByName('SOCKET_SENTRY_00'));
  if(far){for(const key of ['FORK','CRADLE']){for(const g of bins.get(key)){g.translate(0,key==='FORK'?32:35.6,0);bins.get('BODY').push(g);}bins.delete(key);}}
  // Ring grid omits four broad port openings; capped unused ports are optional scene parts.
  const ys=far?[1.4,3.5,7.5,11.9,12.6,13.15]:[1.4,3.5,5.5,7.5,9,10.5,11.9,12.6,13.15],r=y=>14*Math.sqrt(1-((y-1.4)/12)**2),verts=[];
  for(let j=0;j<ys.length-1;j++)for(let i=0;i<n;i++){
   const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n,mid=(a+b)/2;
   const port=Math.abs(Math.sin(2*mid))<.4;
   if(ys[j]>=7.5&&ys[j+1]<=11.9&&port)continue;
   const p=[[r(ys[j])*Math.cos(a),ys[j],r(ys[j])*Math.sin(a)],[r(ys[j])*Math.cos(b),ys[j],r(ys[j])*Math.sin(b)],[r(ys[j+1])*Math.cos(a),ys[j+1],r(ys[j+1])*Math.sin(a)],[r(ys[j+1])*Math.cos(b),ys[j+1],r(ys[j+1])*Math.sin(b)]];
   for(const v of [0,2,1,1,2,3])verts.push(...p[v]);
  }
  const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(verts,3));shell.computeVertexNormals();add(shell,kind==='biosphere'&&far?0x77a6a5:C.white,[0,0,0],[0,0,0],far?'BODY':'SHELL');
  for(let i=0;i<(far?8:16);i++){const a=(i+.5)*2*Math.PI/(far?8:16);for(let j=0;j<ys.length-1;j++)beam([r(ys[j])*Math.cos(a),ys[j],r(ys[j])*Math.sin(a)],[r(ys[j+1])*Math.cos(a),ys[j+1],r(ys[j+1])*Math.sin(a)],fine?.12:.1,C.steel);}
  for(const y of [3.5,11.9,12.6])ring(r(y)+.035,y,C.steel);
  for(const [id,dx,dz] of [['E',1,0],['W',-1,0],['N',0,1],['S',0,-1]]){
   const width=dx?[7,.4,4.4]:[4.4,.4,7];box(width,[dx*10.5,7.7,dz*10.5],C.dark);
   for(const t of [-2.05,2.05])box(dx?[7,4.2,.22]:[.22,4.2,7],[dx*10.5+(dz?t:0),9.8,dz*10.5+(dx?t:0)],C.white);
   box(dx?[7,.22,4.4]:[4.4,.22,7],[dx*10.5,11.8,dz*10.5],C.white);
   socket('SOCKET_LINK_'+id,[dx*14,9.7,dz*14],[dx,0,dz],'hallway');
   if(!far)box(dx?[.12,3.7,3.8]:[3.8,3.7,.12],[dx*14.15,9.8,dz*14.15],C.dark,'PORT_CAP_'+id);
   // Mezzanine walkways join each port to central lift core.
   if(!far)box(dx?[10,.2,2.4]:[2.4,.2,10],[dx*7,7.8,dz*7],C.steel);
  }
  if(!far){
   box([1.5,4.8,.2],[0,3.8,2.48],C.dark);box([1.5,.14,.2],[0,6.4,2.6],C.cyan);
   for(const x of [-8,-5,5,8])for(const z of [-6,-3,3,6]){if(kind==='biosphere'){box([2,.55,2],[x,1.75,z],C.white);box([1.8,.12,1.8],[x,2.08,z],C.dark);for(let k=0;k<(fine?4:2);k++)add(new T.IcosahedronGeometry(.55,0),C.green,[x+(k%2-.5)*.7,2.55,z+(Math.floor(k/2)-.5)*.7]);}else{box([2,1.3,1.6],[x,2,z],C.steel);box([1.6,.12,1.3],[x,2.72,z],C.amber);}}
   if(fine)for(let i=0;i<32;i++){const a=i*Math.PI/16;box([.2,.16,.3],[13.6*Math.cos(a),1.5,13.6*Math.sin(a)],C.amber);}
  }
 }
 for(const [key,list] of bins){const g=mergeGeometries(list.map(x=>{x.deleteAttribute('uv');return x.index?x.toNonIndexed():x;}),false);g.deleteAttribute('uv');const m=new T.Mesh(mergeVertices(g),key==='GLASS'||(key==='SHELL'&&kind==='biosphere')?glass:mat);m.name=key;if(key==='FORK')root.getObjectByName('MOUNT_YAW').add(m);else if(key==='CRADLE')root.getObjectByName('CRADLE_PITCH').add(m);else root.add(m);for(const p of list)p.dispose();}
 // Stable named semantic placeholders in static tier.
 for(const name of ['BODY',...(kind==='bridge'?['GLASS']:['FORK','CRADLE','SHELL','PORT_CAP_E','PORT_CAP_W','PORT_CAP_N','PORT_CAP_S'])])if(!root.getObjectByName(name)){const o=new T.Object3D();o.name=name;if(name==='FORK')root.getObjectByName('MOUNT_YAW').add(o);else if(name==='CRADLE')root.getObjectByName('CRADLE_PITCH').add(o);else root.add(o);}
 return root;
}
