import * as T from 'three';
import {SPEC} from '../../assets/shuttle-01/runtime.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {prep,box,cyl,ring,node,socket} from './settlement-industry-shape.mjs';
import {merge,simplify} from './stalheart-kidou-utils.mjs';
export const C={hull:0xdadbd3,belly:0xacbbc2,trim:0xcba769,dark:0x283c4b,steel:0x899ca6,glass:0x1d3b55,black:0x102533,cyan:0x9ce4f5};
// z, half-span, edge height, dorsal depth, ventral depth. This is a continuous lifting body.
const PROFILE=[[-14,6.2,1.6,2.15,.8],[-12,9.2,1.65,1.9,1.0],[-8,11.8,1.65,1.8,1.15],[-4,11,1.7,2.15,1.3],[0,9,1.7,2.1,1.3],[4,6.9,1.65,1.9,1.2],[8,4.7,1.6,1.6,1.05],[12,2.9,1.5,1.25,.8],[16,1.65,1.4,.8,.5],[20,.55,1.25,.28,.15],[22,0,1.18,0,0]];
function at(z){let i=0;while(i<PROFILE.length-2&&z>PROFILE[i+1][0])i++;const a=PROFILE[i],b=PROFILE[i+1],prev=PROFILE[Math.max(0,i-1)],next=PROFILE[Math.min(PROFILE.length-1,i+2)],h=b[0]-a[0],u=Math.max(0,Math.min(1,(z-a[0])/h)),u2=u*u,u3=u2*u;const result=[];
 for(let k=1;k<=4;k++){const m0=(b[k]-prev[k])/(b[0]-prev[0]),m1=(next[k]-a[k])/(next[0]-a[0]);result.push((2*u3-3*u2+1)*a[k]+(u3-2*u2+u)*h*m0+(-2*u3+3*u2)*b[k]+(u3-u2)*h*m1);}result[0]=Math.max(0,Math.min(11.8,result[0]));return result;
}
export function skinHeight(x,z,upper=true){const [w,edge,top,bottom]=at(z),q=Math.max(0,1-(x/Math.max(w,.0001))**2);return edge+(upper?top*q**1.6:-bottom*q**1.2);}
function outline(lod){const zs=new Set(PROFILE.map(p=>p[0]));for(let z=-14;z<=22;z+=lod===0?.75:1.5)zs.add(z);const list=[...zs].sort((a,b)=>a-b);return list.map(z=>new T.Vector2(at(z)[0],z)).concat(list.slice(0,-1).reverse().map(z=>new T.Vector2(-at(z)[0],z)));}
function ellipse(x,z,rx,rz,n){return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return new T.Vector2(x+rx*Math.cos(a),z+rz*Math.sin(a));});}
function shape(points,holes=[]){const s=new T.Shape(points);s.closePath();for(const h of holes){const p=new T.Path(h);p.closePath();s.holes.push(p);}return s;}
function surface(s,height,upper,level,color){const flat=new T.ShapeGeometry(s,1),p=flat.attributes.position,idx=flat.index,tri=[];for(let i=0;i<idx.count;i+=3){const a=new T.Vector2(p.getX(idx.getX(i)),p.getY(idx.getX(i))),b=new T.Vector2(p.getX(idx.getX(i+1)),p.getY(idx.getX(i+1))),c=new T.Vector2(p.getX(idx.getX(i+2)),p.getY(idx.getX(i+2)));split(a,b,c,level);}
 function split(a,b,c,depth){if(depth){const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);split(a,ab,ca,depth-1);split(ab,b,bc,depth-1);split(ca,bc,c,depth-1);split(ab,bc,ca,depth-1);}else for(const v of upper?[a,c,b]:[a,b,c])tri.push(v.x,height(v.x,v.y),v.y);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(tri,3));let smooth=mergeVertices(g,1e-5);smooth.computeVertexNormals();const pos=smooth.attributes.position,normal=smooth.attributes.normal;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),e=.001,dx=(height(x+e,z)-height(x-e,z))/(2*e),dz=(height(x,z+e)-height(x,z-e))/(2*e),v=new T.Vector3(-dx,1,-dz).normalize().multiplyScalar(upper?1:-1);normal.setXYZ(i,v.x,v.y,v.z);}flat.dispose();return prep(smooth,color);
}
function wall(points,top,bottom,color,inward=false,closed=true){const p=[];for(let i=0;i<points.length-(closed?0:1);i++){const a=points[i],b=points[(i+1)%points.length];for(const [v,h]of [[a,top],[b,top],[a,bottom],[b,top],[b,bottom],[a,bottom]])p.push(v.x,typeof h==='function'?h(v.x,v.y):h,v.y);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));if(inward){const a=g.attributes.position;for(let i=0;i<a.count;i+=3){const x=new T.Vector3().fromBufferAttribute(a,i+1),y=new T.Vector3().fromBufferAttribute(a,i+2);a.setXYZ(i+1,...y.toArray());a.setXYZ(i+2,...x.toArray());}}g.computeVertexNormals();return prep(g,color);}
function lathe(profile,n,c,p=[0,0,0],rot=[0,0,0]){return prep(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),n),c,p,rot);}
function strip(points,width,height,color){const data=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],d=b.clone().sub(a).normalize(),n=new T.Vector2(-d.y,d.x).multiplyScalar(width/2);for(const p of [a.clone().add(n),b.clone().add(n),a.clone().sub(n),b.clone().add(n),b.clone().sub(n),a.clone().sub(n)])data.push(p.x,height(p.x,p.y),p.y);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data,3));g.computeVertexNormals();return prep(g,color);}
function hatchHalf(side,n){const pts=[];for(let i=0;i<=n;i++){const a=Math.PI/2+i/n*Math.PI;pts.push(new T.Vector2(side<0?1.235*Math.cos(a):-1.235*Math.cos(a),1.235*Math.sin(a)));}const g=new T.ExtrudeGeometry(shape(pts),{depth:.10,steps:1,bevelEnabled:false});g.rotateX(-Math.PI/2);return prep(g,C.hull,[side*.012,0,0]);}
export async function buildShuttle(lod){const tier=Math.min(lod,1),n=tier===0?64:32,root=new T.Group();root.name='SHUTTLE_01_ROOT';root.userData={family:'shuttle-01',lod,damage_level:0,static:lod===2};
 const palette=new T.MeshStandardMaterial({name:'SHUTTLE_PALETTE',vertexColors:true,metalness:.36,roughness:.32}),glass=new T.MeshStandardMaterial({name:'CANOPY_GLASS',vertexColors:true,metalness:.48,roughness:.15}),body=[],bins=[],outer=outline(tier);
 const wells=[ellipse(-3,-10.7,1.45,2.15,n),ellipse(3,-10.7,1.45,2.15,n)],belly=ellipse(0,-2,1.83,1.83,n);
 body.push(surface(shape(outer,wells),(x,z)=>skinHeight(x,z,true),true,tier===0?3:2,C.hull));
 body.push(surface(shape(outer,[belly]),(x,z)=>skinHeight(x,z,false),false,tier===0?3:2,C.belly));
 // Close the stern edge; the nozzles project aft through their recessed troughs.
 const stern=[];for(let i=0;i<=n;i++)stern.push(new T.Vector2(-6.2+12.4*i/n,-14));body.push(wall(stern,(x,z)=>skinHeight(x,z,true),(x,z)=>skinHeight(x,z,false),C.belly,false,false));
 for(const e of wells){body.push(wall(e,(x,z)=>skinHeight(x,z,true),1.35,C.dark,true),surface(shape(e),()=>1.35,true,0,C.black));}
 // A slim warm edge follows the wing silhouette, inside the authored envelope.
 for(const side of [-1,1]){const line=outer.filter(p=>side*p.x>0.15).map(p=>new T.Vector2(p.x-side*.085,p.y));line.sort((a,b)=>a.y-b.y);body.push(strip(line,.055,(x,z)=>skinHeight(x,z,true)+.018,C.trim));}
 // Restrained service seams follow the curvature, not flat plates over the skin.
 for(const side of [-1,1]){const line=[];for(let z=-10;z<=8;z+=tier===0?.6:1.2)line.push(new T.Vector2(side*at(z)[0]*.63,z));body.push(strip(line,.018,(x,z)=>skinHeight(x,z,true)+.012,C.steel));}
 const canopy=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;canopy.push(new T.Vector2(1.1*Math.sin(a)*(.75-.25*Math.cos(a)),12.6+4.1*Math.cos(a)));}
 const canopyHeight=(x,z)=>skinHeight(x,z,true)+.06+.48*Math.max(0,1-((z-12.6)/4.1)**2)*Math.max(0,1-(x/1.2)**2);
 bins.push({parent:root,name:'CANOPY',parts:[surface(shape(canopy),canopyHeight,true,2,C.glass)],material:glass});
 body.push(strip([...canopy,canopy[0]],.065,(x,z)=>skinHeight(x,z,true)+.055,C.steel));
 if(tier===0){for(const side of [-1,1])for(let i=0;i<5;i++){const z=-6.5+i*.36,x=side*4.8;body.push(strip([new T.Vector2(x-.4,z),new T.Vector2(x+.4,z)],.035,(x,z)=>skinHeight(x,z,true)+.018,C.steel));}}
 // The belly is genuinely open around a fixed airlock well. Door pockets occupy Y=1.7..1.9.
 body.push(wall(belly,(x,z)=>skinHeight(x,z,false),.32,C.dark,true));
 body.push(lathe([[1.52,.32],[1.81,.32],[1.81,1.7],[1.25,1.7],[1.25,1.65],[1.52,1.65],[1.52,.32]],n,C.dark,[0,0,-2]));
 body.push(lathe([[1.25,1.9],[1.81,1.9],[1.81,2.8],[1.25,2.8],[1.25,1.9]],n,C.dark,[0,0,-2]),cyl(1.25,.1,n,[0,2.87,-2],C.steel));
 const collar=node(root,'DOCK_EXTEND',[0,0,-2]);const collarParts=[lathe([[1.25,0],[1.7,0],[1.7,.22],[1.48,.35],[1.48,1.65],[1.25,1.65],[1.25,0]],n,C.steel),ring(1.61,.045,n,[0,.05,0],C.trim),ring(1.29,.025,n,[0,.025,0],C.dark)];bins.push({parent:collar,name:'DOCK_COLLAR_SURFACE',parts:collarParts});
 socket(collar,'SOCKET_BELLY_DOCK',[0,0,0],'orbital_dock',[0,-1,0]);
 for(const [id,a]of [['E',0],['N',Math.PI/2],['W',Math.PI],['S',Math.PI*1.5]]){const frame=node(collar,'CAPTURE_'+id+'_FRAME',[1.6*Math.cos(a),.14,1.6*Math.sin(a)]);frame.rotation.y=-a;const pivot=node(frame,'CAPTURE_'+id);bins.push({parent:pivot,name:'CAPTURE_'+id+'_SURFACE',parts:[box([.24,.18,.27],[0,0,0],C.trim),box([.08,.09,.29],[.13,.045,0],C.dark)]});}
 for(const side of [-1,1]){const id=side<0?'L':'R',h=node(root,'BELLY_HATCH_'+id,[0,1.75,-2]);bins.push({parent:h,name:'BELLY_HATCH_'+id+'_SURFACE',parts:[hatchHalf(side,n/2),box([.055,.025,1.8],[side*.12,-.015,0],C.trim)]});}
 for(const side of [-1,1]){const id=side<0?'L':'R';body.push(cyl(.95,4.4,n,[side*3,2,-11.6],C.steel,[Math.PI/2,0,0]),ring(.96,.04,n,[side*3,2,-10.1],C.dark,[0,0,0]),ring(.96,.04,n,[side*3,2,-12.2],C.dark,[0,0,0]));const engine=node(root,'ENGINE_'+id,[side*3,2,-13.8]);const parts=[lathe([[.65,.25],[1.05,0],[1.08,.2],[.96,1.4],[.75,1.4],[.61,.3],[.65,.25]],n,C.steel,[0,0,0],[-Math.PI/2,0,0]),ring(.95,.045,n,[0,0,-1.36],C.trim,[0,0,0]),cyl(.61,.06,n,[0,0,-.35],C.cyan,[Math.PI/2,0,0])];
  if(tier===0)for(let i=0;i<16;i++){const a=i*Math.PI/8;parts.push(box([.06,.06,.8],[.9*Math.cos(a),.9*Math.sin(a),-.7],C.dark,[0,0,a]));}
  bins.push({parent:engine,name:'ENGINE_'+id+'_SURFACE',parts});socket(engine,'SOCKET_EXHAUST_'+id,[0,0,-1.42],'exhaust',[0,0,-1]);}
 socket(root,'SOCKET_NOSE',[0,1.18,22],'nose',[0,0,1]);socket(root,'SOCKET_CENTRE_OF_MASS',[0,1.7,0],'mass',[0,1,0]);
 bins.unshift({parent:root,name:'HULL',parts:body});
 for(const bin of bins){let g=merge(bin.parts);if(tier===1&&bin.name==='HULL'){
   g=await simplify(g,6800);
   // Simplification recomputes polygon normals; recover the smooth analytic skin.
   const p=g.attributes.position,c=g.attributes.color,n=g.attributes.normal,hullColor=new T.Color(C.hull),bellyColor=new T.Color(C.belly);
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),color=new T.Color(c.getX(i),c.getY(i),c.getZ(i));for(const [upper,ref]of [[true,hullColor],[false,bellyColor]])if(Math.abs(color.r-ref.r)+Math.abs(color.g-ref.g)+Math.abs(color.b-ref.b)<.001&&Math.abs(y-skinHeight(x,z,upper))<.0005&&Math.abs(n.getY(i))>.1){const e=.001,dx=(skinHeight(x+e,z,upper)-skinHeight(x-e,z,upper))/(2*e),dz=(skinHeight(x,z+e,upper)-skinHeight(x,z-e,upper))/(2*e),v=new T.Vector3(-dx,1,-dz).normalize().multiplyScalar(upper?1:-1);n.setXYZ(i,v.x,v.y,v.z);}}
  }const mesh=new T.Mesh(g,bin.material||palette);mesh.name=bin.name;bin.parent.add(mesh);}
 for(const o of root.children)o.position.z-=SPEC.origin_z_offset_m;
 root.traverse(o=>{if(o.userData.role==='engine_pivot')o.userData.engine_driven=true;});root.updateMatrixWorld(true);
 if(lod===2){const gs=[],meshes=[];root.traverse(o=>{if(o.isMesh){gs.push(o.geometry.clone().applyMatrix4(o.matrixWorld));meshes.push(o);}});for(const o of meshes){const marker=new T.Group();marker.name=o.name;marker.position.copy(o.position);marker.quaternion.copy(o.quaternion);marker.scale.copy(o.scale);o.parent.add(marker);o.removeFromParent();}const mesh=new T.Mesh(await simplify(merge(gs),2700),palette);mesh.name='SHUTTLE_DISTANCE_SURFACE';root.add(mesh);root.traverse(o=>o.userData.static_lookup_only=true);}
 root.traverse(o=>{if(o.isMesh){const c=o.geometry.attributes.color;o.geometry.setAttribute('color',new T.Uint8BufferAttribute(Array.from(c.array,v=>Math.round(Math.max(0,Math.min(1,v))*255)),3,true));}});
 return root;
}
