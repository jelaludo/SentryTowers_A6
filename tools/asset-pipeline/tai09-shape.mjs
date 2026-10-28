import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';

export const R=.8, UPPER=.46, LOWER=.58;
export const LEG_ANGLES=Array.from({length:6},(_,i)=>Math.PI/6+i*Math.PI/3);
const Y=new T.Vector3(0,1,0),V=(x,y,z)=>new T.Vector3(x,y,z);
const C={ivory:0xe7e1d4,white:0xf5f1e8,steel:0x757c80,edge:0x44494d,dark:0x161c22,black:0x090f14,gold:0xc28b38,amber:0xffb42c,blue:0x355267};

// Truncate an icosahedron: 20 hexagons and the 12 pentagons needed to close it.
export function shellFaces(){
 const g=new T.IcosahedronGeometry(1,0),v=[],tri=[],p=g.attributes.position;
 for(let i=0;i<p.count;i+=3){const f=[];for(let j=0;j<3;j++){const a=new T.Vector3().fromBufferAttribute(p,i+j);let k=v.findIndex(b=>b.distanceTo(a)<1e-5);if(k<0){k=v.length;v.push(a);}f.push(k);}tri.push(f);}
 const front=tri[0].reduce((a,k)=>a.add(v[k]),V(0,0,0)).normalize(),q=new T.Quaternion().setFromUnitVectors(front,V(0,0,1));v.forEach(a=>a.applyQuaternion(q));
 const faces=tri.map(f=>f.flatMap((a,i)=>{const b=f[(i+1)%3];return [v[a].clone().lerp(v[b],1/3),v[a].clone().lerp(v[b],2/3)];}));
 for(let i=0;i<v.length;i++){const neighbors=new Set();tri.filter(f=>f.includes(i)).forEach(f=>f.forEach(k=>{if(k!==i)neighbors.add(k);}));faces.push([...neighbors].map(k=>v[i].clone().lerp(v[k],1/3)));}
 return faces.map((pts,i)=>{const n=pts.reduce((a,b)=>a.add(b),V(0,0,0)).normalize(),q=new T.Quaternion().setFromUnitVectors(Y,n),inv=q.clone().invert();const local=pts.map(p=>p.clone().normalize().applyQuaternion(inv));local.sort((a,b)=>Math.atan2(a.z,a.x)-Math.atan2(b.z,b.x));return {id:String(i+1).padStart(2,'0'),n:n.toArray(),q:q.toArray(),points:local.map(p=>p.toArray()),front:i===0,sides:pts.length};});
}

export function buildTAI(lod=0){
 let root=new T.Group();root.name='TAI09_ROOT';root.userData={family:'tai09',designation:'09-TAI-01',lod,damage_level:0,static:lod===2,nominal_diameter_m:1.6};
 const bones=[],parts=[[],[],[],[]],detail=lod===0,n=detail?24:lod===1?10:6;
 const mats=[new T.MeshStandardMaterial({name:'TAI_CERAMIC',vertexColors:true,metalness:.3,roughness:.32}),new T.MeshStandardMaterial({name:'TAI_ALLOY',vertexColors:true,metalness:.8,roughness:.3}),new T.MeshStandardMaterial({name:'TAI_CARBON',vertexColors:true,metalness:.45,roughness:.49}),new T.MeshStandardMaterial({name:'TAI_AMBER',vertexColors:true,emissive:C.amber,emissiveIntensity:1.7,metalness:.3,roughness:.3})];
 function bone(name,parent,pos=[0,0,0]){const b=new T.Bone();b.name=name;b.position.fromArray(pos);b.userData={engine_driven:true};parent.add(b);bones.push(b);return b;}
 function socket(name,parent,pos=[0,0,0]){const s=new T.Object3D();s.name=name;s.position.fromArray(pos);s.userData={socket:true,forward:'+Z'};parent.add(s);return s;}
 function add(b,g,mat=1,col=C.steel,pos=[0,0,0],rot=[0,0,0]){g=g.index?g.toNonIndexed():g;g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...pos);for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);const c=new T.Color(col),arr=new Float32Array(g.attributes.position.count*3);for(let i=0;i<arr.length;i+=3){arr[i]=c.r;arr[i+1]=c.g;arr[i+2]=c.b;}g.setAttribute('color',new T.BufferAttribute(arr,3));parts[mat].push({b,g});}
 function box(b,s,p,col=C.dark,mat=2,rot){add(b,new T.BoxGeometry(...s),mat,col,p,rot);}
 function cyl(b,r,h,p,col=C.steel,mat=1,rot=[0,0,0],seg=n){add(b,new T.CylinderGeometry(r,r,h,seg),mat,col,p,rot);}
 function ring(b,r,t,p,col=C.steel,mat=1,rot=[0,0,0]){add(b,new T.TorusGeometry(r,t,detail?6:4,n),mat,col,p,rot);}
 function beam(b,a,c,r,col=C.steel,mat=1){const av=new T.Vector3(...a),cv=new T.Vector3(...c),d=cv.clone().sub(av),g=new T.CylinderGeometry(r,r,d.length(),detail?10:6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(Y,d.normalize()));add(b,g,mat,col,av.add(cv).multiplyScalar(.5).toArray());}
 function armor(b,l,w,h,p,col=C.ivory){const pts=[];for(const y of [-h/2,h/2])for(const [x,z] of [[-l/2,-w*.32],[-l*.34,-w/2],[l*.34,-w/2],[l/2,-w*.3],[l/2,w*.3],[l*.34,w/2],[-l*.34,w/2],[-l/2,w*.32]])pts.push(V(x,y,z));add(b,new ConvexGeometry(pts),0,col,p);}
 const body=bone('BODY',root,[0,R,0]),shell=bone('SHELL_ROLL',body),core=bone('CORE_GIMBAL',body),gyro=bone('GYRO_ROTOR',core);
 const faces=shellFaces();root.userData.shell_faces=faces.map(({points,q,...f})=>f);
 // Six flush wear shoes preserve the exact rolling envelope at every detail tier.
 for(const axis of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const normal=new T.Vector3(...axis),g=new T.ConeGeometry(.045,.006,n);g.translate(0,R-.003,0);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(Y,normal));add(shell,g,1,C.edge);}
 if(lod<2){
  add(core,new T.IcosahedronGeometry(.40,detail?2:1),2,C.dark);
  for(let i=0;i<3;i++)ring(gyro,.44,.022,[0,0,0],i===1?C.gold:C.steel,1,[i===0?Math.PI/2:0,i===1?Math.PI/2:0,0]);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;box(gyro,[.10,.07,.04],[Math.sin(a)*.45,Math.cos(a)*.45,0],C.amber,3,[0,0,-a]);}
 }
 // Curved ceramic plates have a dark chassis, a bevel, and a slightly domed face.
 function patch(points,radius,shrink,rings,steps){const boundary=[];for(let j=0;j<points.length;j++)for(let k=0;k<steps;k++)boundary.push(new T.Vector3(...points[j]).lerp(new T.Vector3(...points[(j+1)%points.length]),k/steps).normalize());const verts=[],N=boundary.length;
  const pt=(i,t)=>Y.clone().lerp(boundary[(i+N)%N],t*shrink).normalize().multiplyScalar(radius-(radius===.8?.012*t*t:0)).addScaledVector(Y,-.63);
  function tri(a,b,c){if(b.clone().sub(a).cross(c.clone().sub(a)).dot(a.clone().addScaledVector(Y,.63))<0)[b,c]=[c,b];verts.push(...a.toArray(),...b.toArray(),...c.toArray());}
  for(let i=0;i<N;i++)tri(pt(0,0),pt(i,1/rings),pt(i+1,1/rings));
  for(let j=1;j<rings;j++)for(let i=0;i<N;i++){const a=pt(i,j/rings),b=pt(i+1,j/rings),c=pt(i,(j+1)/rings),d=pt(i+1,(j+1)/rings);tri(a,c,d);tri(a,d,b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.computeVertexNormals();if(rings>1){const p=g.attributes.position,ns=g.attributes.normal;for(let i=0;i<p.count;i++){const v=V(p.getX(i),p.getY(i)+.63,p.getZ(i)).normalize();ns.setXYZ(i,v.x,v.y,v.z);}}return g;
 }
 for(const f of faces){
  const b=bone('PANEL_'+f.id,shell,new T.Vector3(...f.n).multiplyScalar(.63).toArray());b.quaternion.fromArray(f.q);b.userData={...b.userData,normal:f.n,base_position:b.position.toArray(),base_quaternion:f.q,sides:f.sides,front_port:f.front};
  if(f.front){ring(b,.20,.037,[0,.105,0],C.edge,1,[Math.PI/2,0,0]);ring(b,.154,.018,[0,.126,0],C.gold,1,[Math.PI/2,0,0]);ring(b,.112,.010,[0,.142,0],C.amber,3,[Math.PI/2,0,0]);cyl(b,.107,.03,[0,.10,0],C.dark,2);cyl(b,.057,.035,[0,.12,0],C.blue,1);cyl(b,.018,.04,[0,.12,0],C.amber,3);if(detail)for(let i=0;i<8;i++){const a=i*Math.PI/4;cyl(b,.009,.014,[Math.sin(a)*.20,.133,Math.cos(a)*.20],C.steel,1,undefined,6);}continue;}
  if(lod<2){cyl(b,.035,.15,[0,-.015,0],C.steel);cyl(b,.065,.05,[0,.018,0],C.dark,2);add(b,patch(f.points,.762,.98,1,1),2,C.dark);}
  add(b,patch(f.points,.783,.88,1,detail?3:1),1,C.edge);
  add(b,patch(f.points,.8,.79,lod===0?4:lod===1?2:1,detail?3:1),0,Number(f.id)%5===0?C.white:C.ivory);
  if(lod<2){
   const ps=f.points.map(p=>Y.clone().lerp(new T.Vector3(...p),.91).normalize().multiplyScalar(.781).addScaledVector(Y,-.63));
   for(let j=0;j<ps.length;j+=2){const a=ps[j].clone().lerp(ps[(j+1)%ps.length],.22),c=ps[j].clone().lerp(ps[(j+1)%ps.length],.78);beam(b,a.toArray(),c.toArray(),.0075,C.amber,3);}
   if(detail){for(const p of f.points){const a=Y.clone().lerp(new T.Vector3(...p),.69).normalize().multiplyScalar(.793).addScaledVector(Y,-.63);cyl(b,.010,.009,a.toArray(),C.edge,1,undefined,6);cyl(b,.004,.0105,a.toArray(),C.black,2,undefined,6);}}
  }
 }
 // A recessed axial iris replaces the forward panel; a telescoping launcher sits behind it.
 const aim=bone('LAUNCHER_AIM',core),barrel=bone('LAUNCHER_SLIDE',aim,[0,0,.46]),hook=bone('HOOK_HEAD',aim,[0,0,.395]);
 if(lod<2){cyl(barrel,.108,.32,[0,0,0],C.steel,1,[Math.PI/2,0,0]);for(const z of [-.13,-.055,.055,.13])ring(barrel,.111,.011,[0,0,z],C.dark,2);cyl(hook,.063,.19,[0,0,-.02],C.dark,2,[Math.PI/2,0,0]);ring(hook,.07,.012,[0,0,.075],C.gold);}
 if(lod<2)cyl(hook,.045,.015,[0,0,.082],C.amber,3,[Math.PI/2,0,0]);socket('SOCKET_CABLE',barrel,[0,0,.17]);socket('SOCKET_HOOK',hook,[0,0,-.1]);socket('SOCKET_SENSOR',aim,[0,0,.78]);socket('SOCKET_CORE',core);
 for(let i=0;i<3;i++){const base=bone('HOOK_JAW_'+String(i+1).padStart(2,'0'),hook);base.rotation.z=i*2*Math.PI/3;base.position.set(Math.cos(i*2*Math.PI/3)*.055,Math.sin(i*2*Math.PI/3)*.055,.02);base.userData.base_quaternion=base.quaternion.toArray();
  if(lod<2){const shape=new T.Shape();[[0,0],[.08,.03],[.17,.16],[.18,.29],[.12,.36],[.13,.24],[.075,.12],[0,.08]].forEach(([x,z],j)=>j?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.044,bevelEnabled:detail,bevelSegments:1,bevelSize:.004,bevelThickness:.004,steps:1});g.rotateX(Math.PI/2);g.translate(0,.022,0);add(base,g,1,C.steel);armor(base,.15,.064,.022,[.075,0,.12]);cyl(base,.032,.075,[0,0,0],C.gold);}
 }
 // Six limbs share segment geometry and named hinges. The three adhesive toes fold separately.
 LEG_ANGLES.forEach((a,i)=>{const id=String(i+1).padStart(2,'0'),mount=bone('LEG_'+id+'_MOUNT',body,[Math.sin(a)*.32,-.22,Math.cos(a)*.32]);mount.rotation.y=a-Math.PI/2;mount.userData.angle=a;
  const hip=bone('LEG_'+id+'_HIP',mount),knee=bone('LEG_'+id+'_KNEE',hip,[UPPER,0,0]),ankle=bone('LEG_'+id+'_ANKLE',knee,[LOWER,0,0]);
  hip.rotation.z=-2.85;knee.rotation.z=2.50;ankle.rotation.z=.35;
  if(lod<2){
   for(const [b,len,w] of [[hip,UPPER,.12],[knee,LOWER,.105]]){
    beam(b,[0,0,-w/2],[len,0,-w/2],.029,C.edge,2);beam(b,[0,0,w/2],[len,0,w/2],.029,C.edge,2);armor(b,len*.74,w*1.4,.064,[len*.48,.047,0]);cyl(b,.066,w*1.9,[0,0,0],C.dark,2,[Math.PI/2,0,0]);cyl(b,.038,w*2,[0,0,0],C.steel,1,[Math.PI/2,0,0]);cyl(b,.015,w*2.02,[0,0,0],C.amber,3,[Math.PI/2,0,0]);
    beam(b,[len*.18,-.055,0],[len*.83,-.055,0],.016,C.steel);cyl(b,.038,len*.35,[len*.28,-.055,0],C.edge,1,[0,0,Math.PI/2]);
    if(detail){for(let k=0;k<9;k++)ring(b,.04,.005,[len*.13+k*.014,-.055,0],C.gold,1,[0,Math.PI/2,0]);for(const x of [len*.22,len*.7])cyl(b,.009,.011,[x,.084,0],C.edge,1,undefined,6);}
   }
   cyl(ankle,.068,.07,[0,0,0],C.dark,2);cyl(ankle,.037,.08,[0,0,0],C.gold);
  }
  socket('SOCKET_FOOT_'+id,ankle,[0,-.06,0]);
  for(let j=0;j<3;j++){const toe=bone('LEG_'+id+'_PAD_'+(j+1),ankle);toe.rotation.y=j*2*Math.PI/3;toe.userData.base_quaternion=toe.quaternion.toArray();toe.rotateZ(1.1);
   if(lod<2){armor(toe,.19,.115,.035,[.10,-.017,0]);armor(toe,.151,.085,.016,[.102,-.043,0],C.dark);beam(toe,[.02,0,0],[.13,0,0],.014,C.steel);if(detail)for(let k=0;k<4;k++)for(let l=0;l<3;l++)cyl(toe,.008,.004,[.05+k*.033,-.054,(l-1)*.022],C.edge,2,undefined,6);}
  }
 });
 root.updateMatrixWorld(true);
 if(lod===2){
  // Static loading silhouette has no hidden limb/core geometry, but keeps all lookup transforms.
  const gs=parts.flat().map(({b,g})=>g.applyMatrix4(b.matrixWorld));const mat=new T.MeshStandardMaterial({name:'TAI_DISTANCE_PALETTE',vertexColors:true,metalness:.4,roughness:.45});const m=new T.Mesh(mergeVertices(mergeGeometries(gs)),mat);m.name='TAI_STATIC';root.add(m);root.traverse(o=>{o.userData.static_lookup_only=true;});
 }else{
  const skeleton=new T.Skeleton(bones);const gs=[];
  parts.forEach((bucket,k)=>{const arr=bucket.map(({b,g})=>{g.applyMatrix4(b.matrixWorld);const count=g.attributes.position.count,ix=new Uint16Array(count*4),w=new Float32Array(count*4);for(let j=0;j<count;j++){ix[j*4]=bones.indexOf(b);w[j*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ix,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(w,4));return g;});gs.push(mergeVertices(mergeGeometries(arr),1e-6));});
  const skin=new T.SkinnedMesh(mergeGeometries(gs,true),mats);skin.name=root.name;skin.userData={...root.userData};for(const child of [...root.children])skin.add(child);skin.frustumCulled=false;skin.bind(skeleton);root=skin;
 }
 return root;
}
