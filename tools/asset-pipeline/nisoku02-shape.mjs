// Original Isao humanoid chassis; source AUREL hands/feet are assembled, not approximated.
import * as T from 'three';import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {prep,cyl,ring,box,socket} from './settlement-industry-shape.mjs';
import {buildHand} from './hand-lab-shape.mjs';import {buildFoot} from './foot-lab-shape.mjs';
import {DIM,createRig,sampleMotion,handMountRotation} from '../../assets/nisoku02/runtime.js';
const C={ivory:0xe5dfd0,edge:0xf4f0e4,carbon:0x203039,dark:0x101c23,pad:0x26353b,steel:0x91a5aa,gold:0xc5a164,light:0xffc778,visor:0x101d2a};
function panel(points,thick,pos,color,lod){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const bevel=lod===0?.008:lod===1?.004:0,g=new T.ExtrudeGeometry(s,{depth:thick-2*bevel,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:lod===0?3:1,curveSegments:1,steps:1});g.translate(0,0,-thick/2+bevel);return prep(g,color,pos);}
function roundBox(size,pos,color,lod,r=.008){return prep(lod===2?new T.BoxGeometry(...size):new RoundedBoxGeometry(...size,lod===0?3:1,r),color,pos);}
// Short elliptical lofts with a sealed inner surface and deliberate side reveals.
function shell(stations,segments,angleStart,angleEnd,color,thickness=.005){
 const count=segments+1,ringCount=count*2,p=[],ix=[],caps=[];
 for(const [y,rx,rz,cz=0]of stations)for(let inner=0;inner<2;inner++)for(let i=0;i<count;i++){
  const t=inner?segments-i:i,a=angleStart+(angleEnd-angleStart)*t/segments;p.push((rx-inner*thickness)*Math.sin(a),y,cz+(rz-inner*thickness)*Math.cos(a));
 }
 for(let j=0;j<stations.length-1;j++)for(let i=0;i<ringCount;i++){const a=j*ringCount+i,b=j*ringCount+(i+1)%ringCount;ix.push(a,a+ringCount,b,b,a+ringCount,b+ringCount);}
 for(let i=0;i<segments;i++){const a=i,b=ringCount-1-i;caps.push(a,a+1,b,a+1,b-1,b);const k=(stations.length-1)*ringCount;caps.push(k+a,k+b,k+a+1,k+a+1,k+b,k+b-1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();const capG=new T.BufferGeometry();capG.setAttribute('position',new T.Float32BufferAttribute(caps.flatMap(i=>p.slice(i*3,i*3+3)),3));capG.computeVertexNormals();const closed=mergeGeometries([g.toNonIndexed(),capG]);g.dispose();capG.dispose();return prep(closed,color);
}
function coreLoft(stations,n,color){
 const p=[],ix=[];for(const[y,rx,rz]of stations)for(let i=0;i<n;i++){const a=i/n*Math.PI*2;p.push(rx*.89*Math.sin(a),y,rz*.89*Math.cos(a));}
 for(let k=0;k<stations.length-1;k++)for(let i=0;i<n;i++){const a=k*n+i,b=k*n+(i+1)%n;ix.push(a,a+n,b,b,a+n,b+n);}
 const top=p.length/3;p.push(0,stations[0][0],0,0,stations.at(-1)[0],0);for(let i=0;i<n;i++){const j=(i+1)%n,k=(stations.length-1)*n;ix.push(top,j,i,top+1,k+i,k+j);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,color);
}
function ellipsoid(size,pos,color,n){const g=new T.SphereGeometry(1,n,Math.max(4,Math.round(n*.65)));g.scale(...size);return prep(g,color,pos);}
function visor(n){
 const p=[0,.12,.109],ix=[],rows=Math.max(3,Math.round(n/3));
 for(let j=1;j<=rows;j++){const a=j/rows*1.18;for(let i=0;i<n;i++){const t=i/n*Math.PI*2;p.push(.109*Math.sin(a)*Math.cos(t),.12+.144*Math.sin(a)*Math.sin(t),.109*Math.cos(a));}}
 for(let i=0;i<n;i++)ix.push(0,1+i,1+(i+1)%n);
 for(let j=0;j<rows-1;j++)for(let i=0;i<n;i++){const a=1+j*n+i,b=1+j*n+(i+1)%n;ix.push(a,a+n,b,b,a+n,b+n);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,C.visor);
}
function reflectGeometry(g){g.applyMatrix4(new T.Matrix4().makeScale(-1,1,1));if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3)[a[i+1],a[i+2]]=[a[i+2],a[i+1]];}else for(const attr of Object.values(g.attributes))for(let i=0;i<attr.count;i+=3)for(let k=0;k<attr.itemSize;k++){const a=(i+1)*attr.itemSize+k,b=(i+2)*attr.itemSize+k;[attr.array[a],attr.array[b]]=[attr.array[b],attr.array[a]];}}
export function buildHumanoid(lod){
 const root=new T.Group();root.name='NISOKU_02_ROOT';root.userData={family:'nisoku02',manufacturer:'Isao / Mechanism Atelier',designation:'NISOKU-02',lod,damage_level:0,static:false,units:'metres',forward:'+Z',up:'+Y'};
 const mats=lod===0?[
  new T.MeshStandardMaterial({name:'CERAMIC_IVORY',vertexColors:true,metalness:.28,roughness:.28}),new T.MeshStandardMaterial({name:'GRAPHITE_STRUCTURE',vertexColors:true,metalness:.62,roughness:.3}),new T.MeshStandardMaterial({name:'GOLD_TITANIUM',vertexColors:true,metalness:.8,roughness:.25}),new T.MeshStandardMaterial({name:'TACTILE_ELASTOMER',vertexColors:true,metalness:.05,roughness:.85}),new T.MeshStandardMaterial({name:'AMBER_STATUS',vertexColors:true,metalness:.25,roughness:.25,emissive:C.light,emissiveIntensity:.3}),new T.MeshStandardMaterial({name:'OPTICAL_VISOR',vertexColors:true,metalness:.8,roughness:.13})
 ]:[new T.MeshStandardMaterial({name:'ISAO_GAME_PALETTE',vertexColors:true,metalness:.25,roughness:.45}),new T.MeshStandardMaterial({name:'OPTICAL_VISOR',vertexColors:true,metalness:.8,roughness:.15})];
 const parts=mats.map(()=>[]),bones=[],nodes={};
 function bone(parent,name,pos){const b=new T.Bone();b.name=name;b.position.fromArray(pos);b.userData={role:'engine_pivot'};parent.add(b);bones.push(b);nodes[name]=b;return b;}
 const base=bone(root,'BODY_ROOT',[0,0,0]),pelvis=bone(base,'PELVIS',[0,DIM.pelvisY,0]),waist=bone(pelvis,'WAIST',[0,.115,0]),chest=bone(waist,'CHEST',[0,.20,0]),neck=bone(chest,'NECK',[0,.30,0]),head=bone(neck,'HEAD',[0,.075,0]);
 for(const side of ['L','R']){const s=side==='L'?1:-1,shoulder=bone(chest,'SHOULDER_'+side,[s*DIM.shoulderX,DIM.shoulderY-(DIM.pelvisY+.315),0]),elbow=bone(shoulder,'ELBOW_'+side,[0,-DIM.upperArm,0]);bone(elbow,'WRIST_'+side,[0,-DIM.forearm,0]);const hip=bone(pelvis,'HIP_'+side,[s*DIM.hipX,0,0]),knee=bone(hip,'KNEE_'+side,[0,-DIM.thigh,0]);bone(knee,'ANKLE_'+side,[0,-DIM.shin,0]);}
 function add(b,m,g){const n=g.attributes.position.count,ii=new Uint16Array(n*4),ww=new Float32Array(n*4);for(let i=0;i<n;i++){ii[i*4]=bones.indexOf(b);ww[i*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ii,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(ww,4));root.updateMatrixWorld(true);g.applyMatrix4(b.matrixWorld);parts[lod===0?m:m===5?1:0].push(g);}
 const n=lod===0?32:lod===1?12:6,seg=lod===0?24:lod===1?10:4;
 function joint(b,r,width,side){add(b,1,cyl(r,width,n,[0,0,0],C.dark,[0,0,Math.PI/2]));for(const s of (side?[side]:[-1,1])){add(b,2,ring(r*.78,r*.085,n,[s*(width/2+.001),0,0],C.gold,[0,Math.PI/2,0]));if(lod<2)add(b,1,cyl(r*.55,.004,n,[s*(width/2+.003),0,0],C.steel,[0,0,Math.PI/2]));}}
 function bolt(b,p){if(lod===0)add(b,2,cyl(.0023,.0014,8,p,C.steel,[Math.PI/2,0,0]));}
 // Ellipsoid helmet, broad uninterrupted visor and recessed ear bearings.
 add(head,0,ellipsoid([.105,.144,.102],[0,.12,0],C.ivory,n));add(head,5,visor(lod===0?64:lod===1?24:12));
 for(const s of [-1,1]){add(head,1,cyl(.043,.016,n,[s*.102,.12,-.012],C.dark,[0,0,Math.PI/2]));add(head,2,ring(.034,.0035,n,[s*.112,.12,-.012],C.gold,[0,Math.PI/2,0]));add(head,1,cyl(.024,.004,n,[s*.116,.12,-.012],C.carbon,[0,0,Math.PI/2]));}
 if(lod<2){add(head,1,roundBox([.009,.025,.006],[0,0,0],C.dark,lod,.002).rotateZ(.38).translate(-.057,.213,.054));add(head,4,roundBox([.003,.018,.007],[0,0,0],C.light,lod,.001).rotateZ(.38).translate(-.057,.213,.058));}
 add(neck,1,cyl(.041,.10,n,[0,.04,0],C.carbon));for(let i=0;i<(lod===2?2:lod===1?4:7);i++)add(neck,1,ring(.042,.005,n,[0,.008+i*(lod===2?.034:lod===1?.018:.010),0],C.dark));
 // Ribcage with a tapered breastplate and service cassette on the rear.
 add(chest,1,ellipsoid([.167,.185,.092],[0,.10,0],C.carbon,n));
 add(chest,0,panel([[-.15,.20],[-.112,.267],[.112,.267],[.15,.20],[.144,.065],[.063,.004],[-.063,.004],[-.144,.065]],.030,[0,0,.092],C.ivory,lod));
 add(chest,0,panel([[-.139,.052],[-.059,-.010],[.059,-.010],[.139,.052],[.105,-.025],[.043,-.068],[-.043,-.068],[-.105,-.025]],.022,[0,0,.081],C.edge,lod));
 for(const s of [-1,1])add(chest,0,panel([[s*.15,.19],[s*.178,.13],[s*.16,-.018],[s*.105,-.08],[s*.075,-.043],[s*.13,.043]],.020,[0,0,.071],C.edge,lod));
 add(chest,1,roundBox([.065,.008,.008],[0,.19,.111],C.dark,lod,.002));add(chest,4,roundBox([.045,.003,.005],[0,.19,.117],C.light,lod,.001));
 add(chest,0,panel([[-.14,.20],[-.11,.25],[.11,.25],[.14,.20],[.125,-.04],[-.125,-.04]],.022,[0,0,-.094],C.ivory,lod));
 add(chest,1,panel([[-.052,.18],[.052,.18],[.067,.145],[.049,.005],[-.049,.005],[-.067,.145]],.025,[0,0,-.109],C.dark,lod));
 for(let i=0;i<(lod===2?1:lod===1?4:7);i++){const y=.022+i*(lod===2?0:lod===1?.042:.023);add(chest,2,roundBox([.073,.005,.006],[0,y,-.124],C.gold,lod,.001));}
 for(const x of [-.116,.116])for(const y of [.04,.19])bolt(chest,[x,y,.108]);
 // Overlapping abdomen scales over a narrow flexible graphite waist.
 add(waist,1,ellipsoid([.105,.14,.072],[0,.01,0],C.dark,n));
 for(let i=0;i<3;i++){const width=.108-i*.009;add(waist,0,panel([[-width,.023],[width,.023],[width*.83,-.022],[.025,-.045],[-.025,-.045],[-width*.83,-.022]],.020,[0,.10-i*.056,.078],i%2?C.edge:C.ivory,lod));if(lod===0)for(const x of [-width*.72,width*.72])bolt(waist,[x,.10-i*.056,.091]);}
 add(pelvis,1,ellipsoid([.142,.108,.086],[0,-.014,0],C.carbon,n));
 add(pelvis,0,panel([[-.116,.058],[.116,.058],[.131,-.015],[.061,-.10],[0,-.119],[-.061,-.10],[-.131,-.015]],.025,[0,0,.077],C.ivory,lod));
 add(pelvis,0,panel([[-.12,.045],[.12,.045],[.10,-.066],[.04,-.087],[-.04,-.087],[-.10,-.066]],.021,[0,0,-.079],C.ivory,lod));
 for(const side of ['L','R']){
  const s=side==='L'?1:-1,sh=nodes['SHOULDER_'+side],el=nodes['ELBOW_'+side],hip=nodes['HIP_'+side],knee=nodes['KNEE_'+side];
  joint(sh,.059,.114,s);const cap=new T.SphereGeometry(1,n,Math.max(4,Math.round(n*.45)),0,Math.PI*2,0,1.45);cap.scale(.074,.069,.075);add(sh,0,prep(cap,C.ivory,[s*.008,.018,0]));
  // Sculpted, short front and rear shells leave a side seam over the dark spine.
  for(const [b,len,rx,rz]of [[sh,DIM.upperArm,.051,.049],[el,DIM.forearm,.052,.045],[hip,DIM.thigh,.068,.067],[knee,DIM.shin,.057,.054]]){
   add(b,1,cyl(rx*.57,len-.06,n,[0,-len/2,0],C.carbon));
   const stations=[[-.055,rx*.80,rz*.78],[-len*.43,rx,rz],[-len+.035,rx*.55,rz*.58]];add(b,1,coreLoft(stations,n,C.dark));
   add(b,0,shell(stations,seg,-1.36,1.36,C.ivory));add(b,0,shell(stations.map(([y,x,z])=>[y,x*.90,z*.90]),Math.max(3,Math.round(seg*.75)),Math.PI-1.30,Math.PI+1.30,C.edge));
   if(lod===0){bolt(b,[-rx*.55,-.075,rz*.75]);bolt(b,[rx*.40,-len+.05,rz*.55]);}
  }
  joint(el,.028,.076,s);joint(hip,.052,.128,s);joint(knee,.040,.105,s);
  const ankle=nodes['ANKLE_'+side],wrist=nodes['WRIST_'+side];add(ankle,1,cyl(.023,.075,n,[0,.020,0],C.carbon));add(wrist,1,cyl(.019,.047,n,[0,.013,0],C.carbon));
  for(let i=0;i<(lod===0?5:lod===1?3:1);i++){add(ankle,1,ring(.027,.003,n,[0,.005+i*.009,0],C.dark));add(wrist,1,ring(.020,.0025,n,[0,.004+i*.007,0],C.dark));}
  add(knee,0,panel([[-.032,.026],[.032,.026],[.040,-.016],[.022,-.054],[-.022,-.054],[-.040,-.016]],.019,[0,0,.043],C.ivory,lod));
  if(lod<2){add(el,1,roundBox([.018,.065,.007],[0,-.123,.046],C.dark,lod,.005));for(let i=0;i<(lod===0?4:2);i++)add(el,4,roundBox([.005,.005,.003],[0,-.102-i*.014,.051],C.light,lod,.001));}
 }
 socket(head,'SOCKET_VISION',[0,.12,.111],'optical_axis',[0,0,1]);socket(chest,'SOCKET_BACK',[0,.10,-.125],'service_pack',[0,0,-1]);socket(base,'SOCKET_ROOT',[0,0,0],'ground_reference',[0,1,0]);
 function module(kind,side,source,parent,position,scale,rotation){
  const g=source.geometry.clone(),sourceBones=source.skeleton.bones.slice(),mirror=side==='R';
  if(mirror){reflectGeometry(g);source.traverse(o=>{if(o!==source){o.position.x*=-1;o.quaternion.y*=-1;o.quaternion.z*=-1;}});}
  const group=new T.Group();group.name=`${kind}_${side}_ROOT`;group.position.fromArray(position);group.scale.setScalar(scale);group.quaternion.fromArray(rotation);group.userData={component:kind==='HAND'?'AUREL-01':'AUREL-02',side,source_assignment:mirror?'reflected':'source'};parent.add(group);
  for(const c of [...source.children])group.add(c);group.traverse(o=>{if(o!==group&&o.name)o.name=`${kind}_${side}_${o.name}`});bones.push(...sourceBones);root.updateMatrixWorld(true);g.applyMatrix4(group.matrixWorld);
  const ii=g.attributes.skinIndex;for(let i=0;i<ii.count;i++)ii.setXYZW(i,bones.indexOf(sourceBones[ii.getX(i)]),0,0,0);
  const non=g.index?g.toNonIndexed():g,groups=lod===0?g.groups:[{start:0,count:non.attributes.position.count,materialIndex:0}];
  for(const piece of groups){const geometry=new T.BufferGeometry();for(const [name,a]of Object.entries(non.attributes))if(['position','normal','color','skinIndex','skinWeight'].includes(name)){const array=a.array.slice(piece.start*a.itemSize,(piece.start+piece.count)*a.itemSize);geometry.setAttribute(name,new T.BufferAttribute(array,a.itemSize,a.normalized));}parts[lod===0?piece.materialIndex:0].push(geometry);}
  g.dispose();if(non!==g)non.dispose();source.geometry.dispose();
 }
 for(const side of ['L','R']){
  module('HAND',side,buildHand(lod===0?0:1,{economy:lod!==0}),nodes['WRIST_'+side],[0,.020,0],1,handMountRotation(side));
  module('FOOT',side,buildFoot(lod===0?0:1,{economy:lod!==0}),nodes['ANKLE_'+side],[0,-.14*DIM.footScale,.073*DIM.footScale],DIM.footScale,[0,0,0,1]);
 }
 const geometry=mergeGeometries(parts.map(list=>{const g=mergeGeometries(list,false),welded=mergeVertices(g,1e-6);g.dispose();list.forEach(x=>x.dispose());const p=welded.attributes.position,indices=welded.index.array,clean=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let i=0;i<indices.length;i+=3){a.fromBufferAttribute(p,indices[i]);b.fromBufferAttribute(p,indices[i+1]);c.fromBufferAttribute(p,indices[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-23)clean.push(indices[i],indices[i+1],indices[i+2]);}welded.setIndex(clean);return welded}),true);
 const mesh=new T.SkinnedMesh(geometry,mats);mesh.name='NISOKU_02_GEOMETRY';root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));
 const scene=new T.Scene();scene.name='NISOKU_02_HUMANOID';root.remove(mesh);scene.add(root,mesh);createRig(scene).pose(sampleMotion(0,'idle'));return scene;
}
