import * as T from 'three';
import {prep,box,cyl,ring,beam,armor,node,socket} from './settlement-industry-shape.mjs';
import {merge,simplify} from './stalheart-kidou-utils.mjs';
import {SPEC} from '../../assets/space-elevator/runtime.js';
export const C={ivory:0xd4d5c9,light:0xe5e2d4,slate:0x657780,dark:0x253944,steel:0xa0b1b3,amber:0xd8ad62,glass:0x4f7886,solar:0x314f71,cell:0x6686a4,cyan:0x86d7d2};
function lathe(profile,n,color,pos=[0,0,0]){return prep(new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),n),color,pos);}
function prism(points,width,color,angle=0){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new T.ExtrudeGeometry(s,{depth:width,bevelEnabled:false,steps:1,curveSegments:1});g.translate(0,0,-width/2);return prep(g,color,[0,0,0],[0,-angle,0]);}
function rail(parts,r,y,n,lod,start=0,end=Math.PI*2){
 const count=lod===0?n:n/2;
 for(let i=0;i<count;i++){const a=start+(end-start)*i/count,b=start+(end-start)*(i+1)/count;
  parts.push(beam([r*Math.cos(a),y,r*Math.sin(a)],[r*Math.cos(a),y+1.1,r*Math.sin(a)],.07,C.amber),beam([r*Math.cos(a),y+1.1,r*Math.sin(a)],[r*Math.cos(b),y+1.1,r*Math.sin(b)],.07,C.amber));
  if(lod===0)parts.push(beam([r*Math.cos(a),y+.55,r*Math.sin(a)],[r*Math.cos(b),y+.55,r*Math.sin(b)],.045,C.steel));
 }
}
function straightRail(parts,a,b,lod){const va=new T.Vector3(...a),vb=new T.Vector3(...b),count=lod===0?Math.ceil(va.distanceTo(vb)/1.4):Math.ceil(va.distanceTo(vb)/3.5);for(let i=0;i<=count;i++){const p=va.clone().lerp(vb,i/count);parts.push(beam(p.toArray(),p.clone().add(new T.Vector3(0,1.1,0)).toArray(),.07,C.amber));}parts.push(beam(va.clone().add(new T.Vector3(0,1.1,0)).toArray(),vb.clone().add(new T.Vector3(0,1.1,0)).toArray(),.07,C.amber));}
function windows(parts,r,y,count,height=1.1,start=0,end=Math.PI*2){for(let i=0;i<count;i++){const a=start+(end-start)*(i+.5)/count,w=2*r*Math.sin((end-start)/count/2)*.77;parts.push(box([w,height,.08],[r*Math.sin(a),y,r*Math.cos(a)],C.glass,[0,a,0]));}}
function dish(root,parts,lod,p,standHeight=1.5){
 parts.push(cyl(.35,standHeight,12,[p[0],p[1]-standHeight/2,p[2]],C.slate));const yaw=node(root,'DISH_YAW',p),pitch=node(yaw,'DISH_PITCH');pitch.rotation.x=.55;
 const n=lod===0?32:16,profile=[[0,-.17],[.6,-.11],[1.2,.1],[1.9,.55],[2,.7],[1.85,.71],[1.15,.23],[.55,.03],[0,-.04]];
 const gs=[lathe(profile,n,C.ivory),cyl(.15,1.65,8,[0,.7,0],C.amber)];for(let i=0;i<3;i++){const a=i*Math.PI*2/3;gs.push(beam([1.75*Math.cos(a),.55,1.75*Math.sin(a)],[0,1.48,0],.07,C.slate));}
 return{parent:pitch,name:'DISH_SURFACE',parts:gs};
}
function surface(root,lod){
 const n=lod===0?48:24,p=[],bins=[];
 p.push(armor([60,.4,60],[0,.2,0],C.slate,1),armor([56,.14,56],[0,.47,0],C.ivory,1));
 // Exactly one vehicle bay: two door leaves share one uninterrupted opening.
 p.push(box([24,.65,21],[0,6.95,15.25],C.ivory),box([24,6.2,.7],[0,3.5,5.1],C.ivory));
 for(const side of [-1,1]){
  p.push(armor([6.5,6.2,20],[side*8.75,3.5,15.25],C.ivory,1),box([.25,6.0,18],[side*5.65,3.5,16.15],C.slate),box([6.2,.45,.7],[side*8.75,6.7,25.45],C.slate),box([.2,.14,17],[side*4.9,.535,16.2],C.amber));
  const d=node(root,side<0?'HANGAR_DOOR_L':'HANGAR_DOOR_R',[side*2.75,3.4,25.15]);
  const door=[box([5.49,6,.22],[0,0,0],C.slate),armor([5.16,5.65,.15],[0,0,.2],C.ivory,1),box([.18,5.7,.12],[side*-2.4,0,.32],C.amber),box([2.6,.18,.12],[0,1.4,.32],C.dark)];
  if(lod===0)for(const y of [-2,-1,0,1,2])door.push(box([4.8,.045,.05],[0,y,.29],C.slate));
  bins.push({parent:d,name:side<0?'HANGAR_DOOR_L_SURFACE':'HANGAR_DOOR_R_SURFACE',parts:door});
  // Side service plant has no extra vehicle-sized opening.
  p.push(armor([8,4.6,9],[side*17,2.7,-6],C.ivory,1),armor([8.6,.4,9.5],[side*17,5.2,-6],C.slate,1));
  for(let i=0;i<(lod===0?7:4);i++)p.push(box([.1,2.6,.32],[side*21.05,2.8,-9+i*(lod===0?1:2)],C.dark));
  p.push(cyl(1.2,4.6,n,[side*18,3,-15],C.ivory),ring(1.22,.12,n,[side*18,4.8,-15],C.amber));
 }
 // A narrow observation level overlooks the single apron.
 p.push(armor([19,3.0,6],[0,8.8,20],C.ivory,1),box([16.8,1.3,.08],[0,9.1,23.06],C.glass),box([20,.3,7],[0,10.45,20],C.light));
 for(const x of [-7,-4,-1,2,5,8])p.push(box([.12,1.35,.15],[x,9.1,23.12],C.ivory));
 straightRail(p,[-10,10.65,23.2],[10,10.65,23.2],lod);
 for(const side of [-1,1])straightRail(p,[side*10,10.65,23.2],[side*10,10.65,16.8],lod);
 // Annular tower leaves an explicit tether channel down the axis.
 p.push(lathe([[.85,7],[7,7],[7.8,8],[7.8,12],[6.2,14],[5.6,26],[4.3,30],[3.1,49],[2.7,51],[.85,51],[.85,7]],n,C.ivory));
 p.push(lathe([[.85,50.8],[3,50.8],[3,52.4],[2,54],[.85,54],[.85,50.8]],n,C.slate));
 for(const y of [13.8,27.8,42,50.7]){p.push(ring(y<20?6.2:y<30?5.2:3.5,.18,n,[0,y,0],C.slate));}
 for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.cos(a),z=Math.sin(a);p.push(prism([[3.2,28],[4.7,28],[3.9,49],[3.1,52],[2.8,52]],.7,C.light,a));p.push(beam([x*3.1,45,z*3.1],[x*2.7,52,z*2.7],.13,C.amber));}
 // Seven broad ribs; the front sector remains open for the only vehicle bay.
 const angles=[0,45,135,180,225,270,315].map(a=>a*Math.PI/180);
 for(const a of angles){
  p.push(prism([[7.0,7],[7.0,36],[9,33],[13.2,19],[27.8,1],[27.8,.5],[23.5,.5],[10,13]],2.2,C.ivory,a));
  // Recess-coloured panels are placed on both rib faces, not buried inside the solid.
  for(const side of [-1,1]){const panel=prism([[8.1,10],[8.1,31.5],[10.2,23.5],[16.8,10.5],[24.2,1.5],[22.9,1.5],[10.1,12.6]],.035,C.slate);panel.translate(0,0,side*1.12);panel.rotateY(-a);p.push(panel);}
  const transform=v=>new T.Vector3(...v).applyAxisAngle(new T.Vector3(0,1,0),-a).toArray();
  if(lod===0)for(const r of [11,15,20,25]){const y=r<13?27-(r-11)*3:20-(r-13)*1.3;p.push(beam(transform([r,y,.95]),transform([r,y,-.95]),.12,C.amber));}
  p.push(armor([4.5,.55,4.5],[Math.cos(a)*26,.75,Math.sin(a)*26],C.slate,1));
  for(const [r,y] of [[10.4,26],[15.5,14.4],[21,7.3]])for(const side of [-1,1])p.push(beam(transform([r-.55,y+.65,side*1.16]),transform([r+.55,y-.65,side*1.16]),.11,C.amber));
 }
 // Two open service galleries emphasize the tapered mast.
 for(const [r,y]of [[8.8,16.2],[6.6,30.0]]){
  p.push(lathe([[r-2,y-.2],[r,y-.2],[r,y+.15],[r-2,y+.15],[r-2,y-.2]],n,C.slate));rail(p,r-.15,y+.17,lod===0?32:16,lod);
 }
 windows(p,5.79,24,16,1.5);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;for(const [r,y,h]of [[7.85,10,3.4],[5.65,20,7.8],[3.7,38,11]])p.push(box([.13,h,.12],[r*Math.sin(a),y,r*Math.cos(a)],C.slate,[0,a,0]));}
 for(const x of [-8.5,8.5]){p.push(cyl(.09,5,8,[x,13,19],C.slate),cyl(.2,.25,8,[x,15.4,19],C.amber));}
 bins.push(dish(root,p,lod,[-15,6.7,-7]));
 if(lod===0){
  for(const side of [-1,1])for(let i=0;i<13;i++){const z=11+i*.8;p.push(box([.18,.045,.3],[side*11.45,7.31,z],C.amber));}
  for(const y of [19,21,23,25,33,35,37,39])for(const side of [-1,1])p.push(box([.16,.09,.7],[side*5.5,y,0],C.dark));
  for(const x of [-24,-19,-14,-9,9,14,19,24])p.push(cyl(.15,.045,8,[x,.57,27],C.dark));
  for(const side of [-1,1]){p.push(beam([side*12,1,-10],[side*12,10,-10],.22,C.slate),beam([side*12,10,-10],[side*6.2,10,-4],.22,C.slate));}
 }
 socket(root,'SOCKET_TETHER_LOWER',[0,.4,0],'tether',[0,-1,0]);socket(root,'SOCKET_TETHER_UPPER',[0,54,0],'tether',[0,1,0]);socket(root,'SOCKET_CLIMBER_DEPART',[0,55,0],'climber',[0,1,0]);socket(root,'SOCKET_HANGAR',[0,.54,16.15],'vehicle',[0,0,1]);socket(root,'SOCKET_APRON',[0,.54,27],'vehicle',[0,0,1]);socket(root,'SOCKET_POWER',[-21.2,1.2,-6],'power',[-1,0,0]);
 root.userData.hangar_bays=1;root.userData.hangar_clearance={min:[-5.5,.54,7.15],max:[5.5,6.4,25.15]};
 bins.unshift({parent:root,name:'SURFACE_STRUCTURE',parts:p});return bins;
}
function orbital(root,lod){
 const n=lod===0?64:32,p=[],bins=[];
 // Ring deck: a bevelled rectangular pressure vessel, not a solid disc.
 p.push(lathe([[13.4,12.6],[19.9,12.6],[20.6,13.3],[20.6,16.9],[19.9,17.6],[13.4,17.6],[12.9,17],[12.9,13.2],[13.4,12.6]],n,C.ivory));
 p.push(lathe([[13.1,12.2],[20.3,12.2],[20.3,12.55],[13.1,12.55],[13.1,12.2]],n,C.slate));
 windows(p,20.65,15.25,32,1.15);windows(p,12.65,15.25,24,.9);
 for(let i=0;i<32;i++){const a=i*Math.PI/16;p.push(box([.16,3.7,.14],[20.66*Math.sin(a),15.1,20.66*Math.cos(a)],C.slate,[0,a,0]));}
 for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4,x=16.8*Math.sin(a),z=16.8*Math.cos(a);p.push(armor([2.5,.22,1.8],[x,17.76,z],C.slate,1,[0,a,0]));if(lod===0)for(const offset of [-.7,0,.7])p.push(box([.12,.07,1.3],[x+offset*Math.cos(a),17.91,z-offset*Math.sin(a)],C.steel,[0,a,0]));}
 rail(p,20.0,17.65,lod===0?64:24,lod);rail(p,13.6,17.65,lod===0?40:16,lod);
 // Central hub and lower docking collar both retain an open tether channel.
 p.push(lathe([[.85,0],[2.2,0],[2.55,.6],[2.55,3.5],[4,5.2],[5.9,10],[6.2,15],[5.5,20],[3.7,23],[2,24],[.85,24],[.85,0]],n,C.ivory));
 for(const [r,y]of [[2.5,1],[4.0,5.5],[6.15,14.5],[5.4,20],[2.1,23.5]])p.push(ring(r,.16,n,[0,y,0],C.slate));
 windows(p,6.04,17.4,16,1.55);p.push(ring(2.3,.16,n,[0,.16,0],C.amber));
 // Eight structural spokes and open triangular trusses.
 for(let i=0;i<8;i++){const a=i*Math.PI/4,point=(r,y)=>[r*Math.cos(a),y,r*Math.sin(a)];
  p.push(beam(point(5.4,13.5),point(14,13.5),1.25,C.ivory),beam(point(3.6,5.6),point(15.2,12.2),.48,C.slate));
  if(lod===0){p.push(beam(point(7,13),point(12,10),.14,C.steel),beam(point(7,9),point(12,13),.14,C.steel));}
  const next=a+Math.PI/4,at=(theta,r,y)=>[r*Math.cos(theta),y,r*Math.sin(theta)];
  p.push(beam(at(a,17,11.3),at(next,17,11.3),.22,C.slate));
  if(lod===0)for(let j=0;j<4;j++){const a0=a+j*Math.PI/16,a1=a0+Math.PI/16;p.push(beam(at(a0,17,11.3),at(a1,17,12.6),.12,C.steel),beam(at(a0,17,12.6),at(a1,17,11.3),.12,C.steel));}
 }
 // Two sealed docking arms. These are ports, not additional hangar bays.
 for(const side of [-1,1]){
  p.push(cyl(1.65,10,16,[side*25,15,0],C.ivory,[0,0,Math.PI/2]),cyl(2.25,.8,16,[side*30.2,15,0],C.slate,[0,0,Math.PI/2]),cyl(1.95,.16,16,[side*30.65,15,0],C.dark,[0,0,Math.PI/2]));
  p.push(ring(1.7,.13,16,[side*30.75,15,0],C.amber,[0,Math.PI/2,0]));
  for(const z of [-1.1,1.1])p.push(beam([side*19,13,z],[side*30,13,z],.26,C.slate));
  socket(root,side<0?'SOCKET_DOCK_W':'SOCKET_DOCK_E',[side*30.8,15,0],'orbital_dock',[side,0,0]);
 }
 // Staggered service tanks with collars and readable sight strips.
 for(let i=0;i<4;i++){const x=10+(i%2)*4.1,y=19.8+Math.floor(i/2)*3.3,z=-12;
  p.push(cyl(1.35,6.5,16,[x,y,z],C.ivory,[Math.PI/2,0,0]),cyl(1.36,.25,16,[x,y,z-3],C.slate,[Math.PI/2,0,0]),cyl(1.36,.25,16,[x,y,z+3],C.slate,[Math.PI/2,0,0]),box([.08,.35,3],[x+1.36,y,z],C.glass));
  p.push(beam([x,17.5,z-2],[x,y,z-2],.24,C.slate),beam([x,17.5,z+2],[x,y,z+2],.24,C.slate));
 }
 // Opposed solar wings hinge about local X, clear of the habitat ring.
 for(const [id,side]of [['A',-1],['B',1]]){
  const z=side*24,x=-side*8;p.push(beam([x,15,side*18],[x,15,z],.45,C.slate));
  const hinge=node(root,'SOLAR_'+id+'_HINGE',[x,15,z]),panels=[];
  panels.push(box([16,.22,12],[0,0,side*6.2],C.slate),box([15.6,.035,11.6],[0,.135,side*6.2],C.solar));
  const columns=lod===0?8:4,rows=lod===0?12:6;
  for(let i=0;i<=columns;i++)panels.push(box([.065,.06,11.6],[-7.8+i*15.6/columns,.17,side*6.2],C.steel));
  for(let j=0;j<=rows;j++)panels.push(box([15.6,.06,.065],[0,.17,side*(.4+j*11.6/rows)],C.steel));
  for(const dx of [-7.9,0,7.9])panels.push(beam([dx,-.2,0],[dx,-.2,side*12.2],.2,C.ivory));
  bins.push({parent:hinge,name:'SOLAR_'+id+'_SURFACE',parts:panels});
  socket(hinge,'SOCKET_SOLAR_'+id,[0,.2,side*6.2],'solar_normal',[0,1,0]);
 }
 bins.push(dish(root,p,lod,[-10,20.4,-13],2.8));
 for(const [x,z,h]of [[-4,-3,6],[4,2,8],[1,-4,10]]){
  p.push(cyl(.065,h+2,8,[x,21+h/2,z],C.slate));for(let k=1;k<=3;k++)p.push(cyl(.18,.16,8,[x,22+h*k/4,z],C.amber));
 }
 if(lod===0){
  for(let i=0;i<32;i++){const a=i*Math.PI/16;p.push(box([.2,.15,.35],[19.7*Math.cos(a),17.77,19.7*Math.sin(a)],C.amber,[0,-a,0]));}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;p.push(cyl(.09,4.3,8,[6.15*Math.cos(a),14,6.15*Math.sin(a)],C.steel));}
 }
 socket(root,'SOCKET_TETHER_LOWER',[0,0,0],'tether',[0,-1,0]);socket(root,'SOCKET_TETHER_UPPER',[0,24,0],'tether',[0,1,0]);socket(root,'SOCKET_CLIMBER_DOCK',SPEC.orbital_dock_origin_m,'climber',[0,-1,0]);
 bins.unshift({parent:root,name:'ORBITAL_STRUCTURE',parts:p});return bins;
}
function climber(root,lod){
 const n=lod===0?24:12,p=[],bins=[];
 // The traction cage surrounds a clear cable channel; the cabin sits beside it.
 for(const x of [-1.55,1.55])for(const z of [-1.05,1.05])p.push(box([.3,8,.3],[x,4,z],C.slate));
 for(const y of [.3,7.7]){p.push(beam([-1.55,y,-1.05],[1.55,y,-1.05],.3,C.ivory),beam([-1.55,y,1.05],[1.55,y,1.05],.3,C.ivory));for(const x of [-1.55,1.55])p.push(beam([x,y,-1.05],[x,y,1.05],.3,C.ivory));}
 p.push(armor([4.8,7,4.4],[0,3.8,3.6],C.ivory,1),armor([5.0,.3,4.7],[0,.45,3.6],C.slate,1),armor([5.0,.3,4.7],[0,7.25,3.6],C.slate,1));
 for(const side of [-1,1]){p.push(box([.08,1.6,2.2],[side*2.42,5.5,3.6],C.glass),box([.12,5.8,.3],[side*2.45,3.8,2],C.amber));}
 p.push(armor([2.6,5.4,1.1],[0,4,-1.8],C.dark,1),box([1.8,.22,.08],[0,6.1,-2.4],C.cyan));
 const hatch=node(root,'CLIMBER_HATCH',[0,2.7,5.84]);bins.push({parent:hatch,name:'CLIMBER_HATCH_SURFACE',parts:[armor([2.5,3.6,.12],[0,0,0],C.slate,1),box([1.7,.7,.04],[0,.7,.08],C.glass),box([.12,2.9,.06],[-1.05,0,.09],C.amber)]});
 for(const [id,x,y]of [['L_LOW',-1.05,1.3],['L_HIGH',-1.05,6.7],['R_LOW',1.05,1.3],['R_HIGH',1.05,6.7]]){
  const roller=node(root,'ROLLER_'+id,[x,y,0]);bins.push({parent:roller,name:'ROLLER_'+id+'_SURFACE',parts:[cyl(.5,.5,n,[0,0,0],C.dark,[Math.PI/2,0,0]),cyl(.31,.56,n,[0,0,0],C.amber,[Math.PI/2,0,0]),cyl(.17,.59,n,[0,0,0],C.steel,[Math.PI/2,0,0])]});
  p.push(box([.55,1.45,1.2],[x+Math.sign(x)*.55,y,0],C.ivory));
 }
 if(lod===0)for(const side of [-1,1])for(let i=0;i<8;i++)p.push(box([.06,.07,2],[side*2.47,1.1+i*.3,3.7],C.slate));
 socket(root,'SOCKET_TETHER_LOWER',[0,0,0],'tether',[0,-1,0]);socket(root,'SOCKET_TETHER_UPPER',[0,8,0],'tether',[0,1,0]);socket(root,'SOCKET_CARGO',[0,1,3.7],'cargo',[0,0,1]);socket(root,'SOCKET_DOCK',[0,8.2,0],'climber',[0,1,0]);
 bins.unshift({parent:root,name:'CLIMBER_STRUCTURE',parts:p});return bins;
}
export const MODULES={surface:{root:'ELEVATOR_SURFACE_ROOT',label:'Surface base station',plot:[60,60],build:surface,target:7000},orbital:{root:'ELEVATOR_ORBITAL_ROOT',label:'Orbital terminal',plot:[64,74],build:orbital,target:6400},climber:{root:'ELEVATOR_CLIMBER_ROOT',label:'Tether climber',plot:[6,9],build:climber,target:3500}};
export async function buildElevator(kind,lod){
 const def=MODULES[kind],root=new T.Group();root.name=def.root;root.userData={family:'space-elevator',module:kind,lod,damage_level:0,static:lod===2};
 const authorTier=Math.min(lod,1),mat=new T.MeshStandardMaterial({name:'ELEVATOR_PALETTE',vertexColors:true,metalness:.32,roughness:.52}),bins=def.build(root,authorTier);
 for(const bin of bins){let g=merge(bin.parts);if(authorTier===1){const target=bin.name.endsWith('STRUCTURE')?def.target:bin.name.startsWith('SOLAR_')?450:500;g=await simplify(g,target);}const mesh=new T.Mesh(g,mat);mesh.name=bin.name;bin.parent.add(mesh);}
 root.traverse(o=>{if(o.userData.role==='engine_pivot')o.userData.engine_driven=true;});root.updateMatrixWorld(true);
 if(lod===2){const gs=[],meshes=[];root.traverse(o=>{if(o.isMesh){gs.push(o.geometry.clone().applyMatrix4(o.matrixWorld));meshes.push(o);}});
  for(const o of meshes){const marker=new T.Group();marker.name=o.name;marker.position.copy(o.position);marker.quaternion.copy(o.quaternion);marker.scale.copy(o.scale);marker.userData.static_lookup_only=true;o.parent.add(marker);o.removeFromParent();}
  const g=await simplify(merge(gs),kind==='climber'?600:2700),m=new T.Mesh(g,mat);m.name='DISTANCE_STATIC';root.add(m);root.traverse(n=>n.userData.static_lookup_only=true);
 }
 root.traverse(o=>{if(o.isMesh){const c=o.geometry.attributes.color;if(c&&!(c.array instanceof Uint8Array))o.geometry.setAttribute('color',new T.Uint8BufferAttribute(Array.from(c.array,v=>Math.round(Math.max(0,Math.min(1,v))*255)),3,true));}});
 return root;
}
