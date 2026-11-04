// Original Isao humanoid chassis; source AUREL hands/feet are assembled, not approximated.
import {helmetShell,helmetVisor,helmetBrow,helmetSurface} from './nisoku03-helmet.mjs';
import {enclosure,limbShell} from './nisoku03-shells.mjs';
import * as T from 'three';import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {prep,cyl,ring,box,socket} from './settlement-industry-shape.mjs';
import {buildHand} from './hand-lab-shape.mjs';import {buildFoot} from './foot-lab-shape.mjs';
import {DIM,createRig,sampleMotion,handMountRotation} from '../../assets/nisoku03/runtime.js';
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
 const root=new T.Group();root.name='NISOKU_03_ROOT';root.userData={family:'nisoku03',manufacturer:'Isao / Mechanism Atelier',designation:'NISOKU-03',lod,damage_level:0,static:false,units:'metres',forward:'+Z',up:'+Y'};
 const mats=lod===0?[
  new T.MeshStandardMaterial({name:'CERAMIC_IVORY',vertexColors:true,metalness:.18,roughness:.43}),new T.MeshStandardMaterial({name:'GRAPHITE_STRUCTURE',vertexColors:true,metalness:.18,roughness:.67}),new T.MeshStandardMaterial({name:'GOLD_TITANIUM',vertexColors:true,metalness:.8,roughness:.25}),new T.MeshStandardMaterial({name:'TACTILE_ELASTOMER',vertexColors:true,metalness:.05,roughness:.85}),new T.MeshStandardMaterial({name:'AMBER_STATUS',vertexColors:true,metalness:.25,roughness:.25,emissive:C.light,emissiveIntensity:.3}),new T.MeshStandardMaterial({name:'OPTICAL_VISOR',vertexColors:true,metalness:.65,roughness:.12})
 ]:[new T.MeshStandardMaterial({name:'ISAO_GAME_PALETTE',vertexColors:true,metalness:.25,roughness:.45}),new T.MeshStandardMaterial({name:'OPTICAL_VISOR',vertexColors:true,metalness:.65,roughness:.12}),new T.MeshStandardMaterial({name:'GRAPHITE_GAME_SEALS',vertexColors:true,metalness:.15,roughness:.68})];
 const parts=mats.map(()=>[]),bones=[],nodes={};
 function bone(parent,name,pos){const b=new T.Bone();b.name=name;b.position.fromArray(pos);b.userData={role:'engine_pivot'};parent.add(b);bones.push(b);nodes[name]=b;return b;}
 const base=bone(root,'BODY_ROOT',[0,0,0]),pelvis=bone(base,'PELVIS',[0,DIM.pelvisY,0]),waist=bone(pelvis,'WAIST',[0,.115,0]),chest=bone(waist,'CHEST',[0,.20,0]),neck=bone(chest,'NECK',[0,.30,0]),head=bone(neck,'HEAD',[0,.075,0]);
 for(const side of ['L','R']){const s=side==='L'?1:-1,shoulder=bone(chest,'SHOULDER_'+side,[s*DIM.shoulderX,DIM.shoulderY-(DIM.pelvisY+.315),0]),elbow=bone(shoulder,'ELBOW_'+side,[0,-DIM.upperArm,0]);bone(elbow,'WRIST_'+side,[0,-DIM.forearm,0]);const hip=bone(pelvis,'HIP_'+side,[s*DIM.hipX,0,0]),knee=bone(hip,'KNEE_'+side,[0,-DIM.thigh,0]);bone(knee,'ANKLE_'+side,[0,-DIM.shin,0]);}
 function add(b,m,g){const n=g.attributes.position.count,ii=new Uint16Array(n*4),ww=new Float32Array(n*4);for(let i=0;i<n;i++){ii[i*4]=bones.indexOf(b);ww[i*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ii,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(ww,4));root.updateMatrixWorld(true);g.applyMatrix4(b.matrixWorld);parts[lod===0?m:m===5?1:m===1||m===3?2:0].push(g);}
 const n=lod===0?32:lod===1?12:6,seg=lod===0?24:lod===1?10:4;
 function joint(b,r,width,side){
  add(b,1,prep(new T.CylinderGeometry(r,r,width,n,1,true),C.dark,[0,0,0],[0,0,Math.PI/2]));
  for(const sign of (side?[side]:[-1,1])){const face=sign*(width/2+.001);add(b,0,ring(r*.91,r*.095,n,[face,0,0],C.ivory,[0,Math.PI/2,0]));add(b,2,ring(r*.70,r*.065,n,[face-sign*.004,0,0],C.gold,[0,Math.PI/2,0]));if(lod<2)add(b,1,cyl(r*.83,.004,n,[face-sign*.009,0,0],C.dark,[0,0,Math.PI/2]));}
 }
 function bolt(b,p){if(lod===0)add(b,2,cyl(.0023,.0014,8,p,C.steel,[Math.PI/2,0,0]));}
 // Revision 2: swept crown, tucked rear, wraparound eye opening and projecting chin bar.
 add(head,1,helmetShell(lod));const lens=helmetVisor(lod);add(head,5,lens.glass);add(head,1,lens.rim);add(head,1,helmetBrow(lod));
 for(const s of [-1,1]){add(head,1,cyl(.043,.016,n,[s*.102,.12,-.012],C.dark,[0,0,Math.PI/2]));add(head,2,ring(.034,.0035,n,[s*.112,.12,-.012],C.gold,[0,Math.PI/2,0]));add(head,1,cyl(.024,.004,n,[s*.116,.12,-.012],C.carbon,[0,0,Math.PI/2]));}
 if(lod<2)for(const sign of [-1,1])for(let i=0;i<2;i++){const theta=sign*.64,p=helmetSurface(.050+i*.009,theta,.0015);add(head,1,roundBox([.024,.003,.002],[0,0,0],C.dark,lod,.001).rotateY(theta).rotateZ(sign*-.16).translate(...p.toArray()));}
 if(lod<2){const p=helmetSurface(.216,0,.002);add(head,4,roundBox([.017,.0025,.002],p.toArray(),C.light,lod,.001));}
 add(neck,1,cyl(.041,.10,n,[0,.04,0],C.carbon));for(let i=0;i<(lod===2?2:lod===1?4:7);i++)add(neck,1,ring(.042,.005,n,[0,.008+i*(lod===2?.034:lod===1?.018:.010),0],C.dark));
 // Steps 1–3: curved ribcage with a 34 mm crown (~11% width) and 65 mm side returns.
 add(chest,1,coreLoft([[.275,.108,.074],[.17,.152,.084],[.035,.127,.071],[-.068,.073,.055]],n,C.dark));
 add(chest,0,enclosure([[.267,.112,.071,.025,.058],[.186,.153,.096,.034,.066],[.057,.143,.069,.032,.062],[-.064,.062,.049,.022,.044]],C.ivory,lod,{thickness:.008}));
 add(chest,0,enclosure([[.294,.077,.020,.012,.028],[.270,.108,.064,.025,.053]],C.edge,lod,{thickness:.006,subdivisions:1}));
 add(chest,1,roundBox([.058,.007,.004],[0,.19,.132],C.dark,lod,.002));add(chest,4,roundBox([.040,.0025,.004],[0,.19,.135],C.light,lod,.001));
 add(chest,0,enclosure([[.262,.108,.052,.020,.045],[.16,.148,.063,.025,.060],[-.046,.103,.051,.021,.047]],C.ivory,lod,{thickness:.006}).rotateY(Math.PI));
 add(chest,1,panel([[-.052,.18],[.052,.18],[.067,.145],[.049,.005],[-.049,.005],[-.067,.145]],.025,[0,0,-.089],C.dark,lod));
 for(let i=0;i<(lod===2?1:lod===1?4:7);i++){const y=.022+i*(lod===2?0:lod===1?.042:.023);add(chest,2,roundBox([.073,.005,.006],[0,y,-.104],C.gold,lod,.001));}
 // A continuous tapered seal links chest and pelvis; three curved floating scales overlap 10%.
 add(waist,1,coreLoft([[.148,.104,.064],[.04,.094,.056],[-.105,.104,.064]],n,C.dark));
 for(let i=0;i<3;i++){const y=.136-i*.0585,w=.109-i*.006,z=.055-i*.004;add(waist,0,enclosure([[y,w,z,.021,.038],[y-.030,w*.96,z-.003,.023,.039],[y-.065,w*.85,z-.006,.020,.032]],i%2?C.edge:C.ivory,lod,{thickness:.006,columns:lod===0?25:lod===1?11:5}));}
 add(pelvis,1,coreLoft([[.058,.128,.072],[-.012,.137,.079],[-.106,.062,.053]],n,C.dark));
 add(pelvis,0,enclosure([[.062,.116,.056,.021,.048],[-.015,.124,.065,.025,.052],[-.100,.057,.048,.022,.034]],C.ivory,lod,{thickness:.008}));
 add(pelvis,0,enclosure([[.042,.112,.050,.022,.038],[-.025,.112,.055,.023,.040],[-.084,.050,.043,.018,.027]],C.ivory,lod,{thickness:.006,columns:lod===0?25:lod===1?9:5}).rotateY(Math.PI));
 for(const sign of [-1,1])add(pelvis,0,limbShell([[.047,.140,.087],[-.008,.143,.088],[-.057,.117,.079]],sign>0?1.34:-2.42,sign>0?2.42:-1.34,C.ivory,lod));
 for(const side of ['L','R']){
  const s=side==='L'?1:-1,sh=nodes['SHOULDER_'+side],el=nodes['ELBOW_'+side],hip=nodes['HIP_'+side],knee=nodes['KNEE_'+side];
  joint(sh,.059,.114,s);
  const capProfile=[[.052,-.057],[.063,-.043],[.074,-.010],[.073,.020],[.060,.046],[.052,.058],[.046,.058],[.054,.046],[.067,.020],[.068,-.010],[.057,-.043],[.046,-.057],[.052,-.057]];
  const cap=new T.LatheGeometry(capProfile.map(([r,x])=>new T.Vector2(r,x)),n);cap.rotateZ(-Math.PI/2);cap.scale(1,1,1.025);add(sh,0,prep(cap,C.ivory));

  // Sculpted, short front and rear shells leave a side seam over the dark spine.
  for(const [b,len,rx,rz]of [[sh,DIM.upperArm,.051,.049],[el,DIM.forearm,.052,.045],[hip,DIM.thigh,.068,.067],[knee,DIM.shin,.057,.054]]){
   add(b,1,cyl(rx*.57,len-.06,n,[0,-len/2,0],C.carbon));
   const stations=[[-.050,rx*.83,rz*.94],[-len*.30,rx*1.10,rz*1.13],[-len*.58,rx*.97,rz*1.01],[-len+.037,rx*.58,rz*.63]];add(b,1,coreLoft(stations,n,C.dark));
   add(b,0,limbShell(stations,-1.515,1.515,C.ivory,lod));add(b,0,limbShell(stations,Math.PI-1.515,Math.PI+1.515,C.edge,lod));

  }
  // True spherical bearing cover centred on the unchanged single-axis elbow hinge.
  add(el,2,ellipsoid([.039,.039,.039],[0,0,0],0x53666a,lod===0?32:lod===1?14:8));
  if(lod<2)add(el,2,ring(.011,.0012,n,[s*.037,0,0],C.gold,[0,Math.PI/2,0]));
  joint(hip,.052,.128,s);joint(knee,.040,.105,s);
  const ankle=nodes['ANKLE_'+side],wrist=nodes['WRIST_'+side];add(ankle,1,cyl(.023,.075,n,[0,.020,0],C.carbon));add(wrist,1,cyl(.019,.047,n,[0,.013,0],C.carbon));
  for(let i=0;i<(lod===0?5:lod===1?3:1);i++){add(ankle,1,ring(.027,.003,n,[0,.005+i*.009,0],C.dark));add(wrist,1,ring(.020,.0025,n,[0,.004+i*.007,0],C.dark));}
  add(knee,0,panel([[-.032,.026],[.032,.026],[.040,-.016],[.022,-.054],[-.022,-.054],[-.040,-.016]],.019,[0,0,.043],C.ivory,lod));
  if(lod<2){add(el,1,roundBox([.018,.065,.007],[0,-.123,.054],C.dark,lod,.005));for(let i=0;i<(lod===0?4:2);i++)add(el,4,roundBox([.005,.005,.003],[0,-.102-i*.014,.059],C.light,lod,.001));}
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
  const foot=root.getObjectByName(`FOOT_${side}_FOOT_PLACEMENT`);
  // Coordinates are in the source foot frame, before the inherited 1.15× module scale.
  const fairing=enclosure([[.046,.034,.019,.011,.014],[.012,.043,.022,.013,.018],[-.035,.039,.020,.012,.018]],C.ivory,lod,{thickness:.004,columns:lod===0?21:lod===1?9:5}).rotateX(-Math.PI/2).translate(0,.045,-.077);
  add(foot,0,fairing);
  add(foot,3,roundBox([.071,.010,.073],[0,.009,-.088],0x1d292e,lod,.004));

 }
 const geometry=mergeGeometries(parts.map(list=>{const g=mergeGeometries(list,false),welded=mergeVertices(g,1e-6);g.dispose();list.forEach(x=>x.dispose());const p=welded.attributes.position,indices=welded.index.array,clean=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let i=0;i<indices.length;i+=3){a.fromBufferAttribute(p,indices[i]);b.fromBufferAttribute(p,indices[i+1]);c.fromBufferAttribute(p,indices[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-23)clean.push(indices[i],indices[i+1],indices[i+2]);}welded.setIndex(clean);return welded}),true);
 const mesh=new T.SkinnedMesh(geometry,mats);mesh.name='NISOKU_03_GEOMETRY';root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));
 const scene=new T.Scene();scene.name='NISOKU_03_HUMANOID';root.remove(mesh);scene.add(root,mesh);createRig(scene).pose(sampleMotion(0,'idle'));return scene;
}
