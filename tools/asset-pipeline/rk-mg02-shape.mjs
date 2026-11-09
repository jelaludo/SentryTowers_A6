// RK-MG02 derives from Hex Witness at 84713783451299097150ca80eb8f6552b7e353ed.
// Independent source preserves the accepted original and its pinned exports.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {clean,geometryFor} from './stalheart-kidou-utils.mjs';
import {SPEC,MODULES} from '../../assets/helmet-lab/rk-mg02/runtime.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),C={shell:0x899992,band:0xb0b1a4,edge:0x767e75,dark:0x171c1d,black:0x0c1011,rubber:0x151919,jaw:0xb0b1a4,copper:0xac6d3d,steel:0x454e4b,red:0x43130f,redEdge:0x632b20,glow:0xd75a32};
const CENTER=V(0,.207,-.004),RADIUS=V(.130,.149,.146),BAND=.46;
const noise=(x,y,z)=>{const a=Math.sin(x*17931+y*3491+z*10713)*43758.5453;return a-Math.floor(a);};
const normal=(map,u,v)=>map(u+1e-5,v).sub(map(u-1e-5,v)).cross(map(u,v+1e-5).sub(map(u,v-1e-5))).normalize();
// Sculpted crown/temple/rear envelope, independent of the recessed face.
const shellPoint=n=>{const p=n.clone().multiply(RADIUS).add(CENTER);if(p.y>.307)p.y=.307+(p.y-.307)*.75;if(p.z<-.115)p.z=-.115+(p.z+.115)*.40;if(Math.abs(p.x)>.110)p.x=Math.sign(p.x)*(.110+(Math.abs(p.x)-.110)*.70);return p;};
const ellipsoidNormal=n=>{const p=n.clone().multiply(RADIUS).add(CENTER),v=V(n.x/RADIUS.x,n.y/RADIUS.y,n.z/RADIUS.z);if(p.y>.307)v.y/=.75;if(p.z<-.115)v.z/=.40;if(Math.abs(p.x)>.110)v.x/=.70;return v.normalize();};
const surface=(n,d=0)=>shellPoint(n).addScaledVector(ellipsoidNormal(n),d);
const normalFromShellPoint=p=>{if(p.y>.307)p.y=.307+(p.y-.307)/.75;if(p.z<-.115)p.z=-.115+(p.z+.115)/.40;if(Math.abs(p.x)>.110)p.x=Math.sign(p.x)*(.110+(Math.abs(p.x)-.110)/.70);return ellipsoidNormal(p.sub(CENTER).divide(RADIUS).normalize());};
const lowerY=t=>.145+.127*Math.max(0,(Math.cos(t)-.15)/.85)**.45;
const keep=n=>surface(n).y-lowerY(Math.atan2(n.x,n.z));
const direction=(y,t)=>{const yy=(y-CENTER.y)/RADIUS.y,r=Math.sqrt(Math.max(0,1-yy*yy));return V(r*Math.sin(t),yy,r*Math.cos(t));};
export const faceMap=(x,y)=>V(x,y,.143-.025*(x/.125)**2-.012*((y-.200)/.120)**2);
export const DESIGN={band_half_angle_rad:BAND,lower_pair_raise_m:.031,lower_pair_outward_m:.012,crown_compression_start_m:.307,crown_compression:.75,rear_flatten_start_m:-.115,rear_compression:.40,temple_flatten_start_m:.110,temple_compression:.70,peak_front_m:.183,optic_barrel_projection_m:.014,construction:'Continuous vented jaw guard, recessed face, returned brow and compact seal'};
export const OPTICS=[{id:'CENTRAL',x:0,y:.190,r:.051,glass:.043},{id:'UPPER_L',x:.063,y:.236,r:.019,glass:.0138},{id:'UPPER_R',x:-.063,y:.236,r:.019,glass:.0138},{id:'LOWER_L',x:.073,y:.163,r:.018,glass:.0128},{id:'LOWER_R',x:-.073,y:.163,r:.018,glass:.0128}];

export const chinMap=(x,y)=>V(x,y,.184-.35*(y-.085)-.003*(x/.028)**2);
export const peakMap=(x,negativeZ)=>{const z=-negativeZ;return V(x,.275-.022*(x/.124)**2+.02*(z-.145),z);};
const guardAnchors=[[.027,.179,.071,.128],[.062,.163,.073,.128],[.102,.112,.085,.160],[.128,.035,.101,.188],[.120,-.039,.099,.173],[.103,-.088,.099,.150]];
const guardCurve=new T.CatmullRomCurve3(guardAnchors.map(a=>V(a[0],0,a[1])),false,'centripetal');
export function guardPoint(u,v){const t=u*(guardAnchors.length-1),i=Math.max(0,Math.min(guardAnchors.length-2,Math.floor(t))),f=t-i,a=guardAnchors[i],b=guardAnchors[i+1],bottom=T.MathUtils.lerp(a[2],b[2],f),top=T.MathUtils.lerp(a[3],b[3],f),y=T.MathUtils.lerp(bottom,top,v),p=guardCurve.getPoint(T.MathUtils.clamp(u,0,1));if(u<0||u>1)p.addScaledVector(guardCurve.getTangent(T.MathUtils.clamp(u,0,1)),(u-T.MathUtils.clamp(u,0,1))*.33);p.x+=.008*Math.sin(Math.PI*u);p.y=y;p.z-=.35*(y-(bottom+top)/2)*(1-u);if(u<.2)p.z+=T.MathUtils.lerp(chinMap(.027,y).z-guardCurve.getPoint(0).z+.35*(y-(guardAnchors[0][2]+guardAnchors[0][3])/2),0,u/.2);return p;}

function colorize(g,color,grain=.025){g.deleteAttribute('uv');g.clearGroups();const c=new T.Color(color),p=g.attributes.position,a=[];for(let i=0;i<p.count;i++){const k=1-grain/2+grain*noise(p.getX(i),p.getY(i),p.getZ(i));a.push(...c.clone().multiplyScalar(k).toArray().map(v=>Math.min(1,v)));}g.setAttribute('color',new T.Float32BufferAttribute(a,3));if(!g.attributes.normal)g.computeVertexNormals();return g;}
function meshFromTriangles(triangles,color){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(triangles.flatMap(t=>t.flatMap(v=>v.toArray())),3));g.computeVertexNormals();return colorize(g,color);}
function curvedPatch(map,nu,nv,{color=C.shell,depth=.004,exterior=false,wrap=false}={}){const p=[],ix=[];for(let k=0;k<(exterior?1:2);k++)for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...map(i/nu,j/nv).addScaledVector(normal(map,i/nu,j/nv),-k*depth).toArray());const n=(nu+1)*(nv+1);for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);if(!exterior)ix.push(a+n,c+n,b+n,b+n,c+n,d+n);}if(!exterior)for(const edge of[Array.from({length:nu+1},(_,i)=>i),Array.from({length:nu+1},(_,i)=>nv*(nu+1)+nu-i),...(wrap?[]:[Array.from({length:nv+1},(_,j)=>(nv-j)*(nu+1)),Array.from({length:nv+1},(_,j)=>j*(nu+1)+nu)])])for(let i=0;i<edge.length-1;i++){const a=edge[i],b=edge[i+1];ix.push(a,a+n,b,b,a+n,b+n);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return colorize(g,color);}
function curvedPlate(points,map,{color=C.jaw,depth=.005,lod=0,bevel=.0014,holes=[]}={}){
 holes=holes.map(h=>T.ShapeUtils.isClockWise(h.map(p=>new T.Vector2(...p)))?h:[...h].reverse());
 if(T.ShapeUtils.isClockWise(points.map(p=>new T.Vector2(...p))))points=[...points].reverse();const middle=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]),inner=points.map(p=>{const d=Math.hypot(p[0]-middle[0],p[1]-middle[1]);return[p[0]+(middle[0]-p[0])*bevel/d,p[1]+(middle[1]-p[1])*bevel/d];}),triangles=[],normals=[],innerHoles=holes.map(h=>{const mid=h.reduce((a,p)=>[a[0]+p[0]/h.length,a[1]+p[1]/h.length],[0,0]);return h.map(p=>{const d=Math.hypot(p[0]-mid[0],p[1]-mid[1]);return[p[0]+(p[0]-mid[0])*bevel/d,p[1]+(p[1]-mid[1])*bevel/d];});});
 const push=(t,ns)=>{triangles.push(t);const n=new T.Triangle(...t).getNormal(V());normals.push(ns||[n,n,n]);};
 const at=(p,d=0)=>map(...p).addScaledVector(normal(map,...p),d),step=lod===0?.009:lod===1?.025:.050,vertices=[inner,...innerHoles].flat().map(p=>[...p]),thickness=p=>typeof depth==='function'?depth(...p):depth;
 // Split shared edges together. Matching binary boundary samples keep the
 // bevel and face watertight even at low tessellation.
 let faces=T.ShapeUtils.triangulateShape(inner.map(p=>new T.Vector2(...p)),innerHoles.map(h=>h.map(p=>new T.Vector2(...p))));
 for(let pass=0;pass<8;pass++){
  const midpoints=new Map(),mid=(a,b)=>{const key=[Math.min(a,b),Math.max(a,b)].join(':');if(!midpoints.has(key)){midpoints.set(key,vertices.length);vertices.push(vertices[a].map((v,i)=>(v+vertices[b][i])/2));}return midpoints.get(key);},length=(a,b)=>Math.hypot(vertices[a][0]-vertices[b][0],vertices[a][1]-vertices[b][1]);
  let changed=false;const next=[];
  for(const[a,b,c]of faces){const ab=length(a,b)>step,bc=length(b,c)>step,ca=length(c,a)>step,mask=+ab+2*bc+4*ca,x=ab?mid(a,b):0,y=bc?mid(b,c):0,z=ca?mid(c,a):0;changed ||= mask!==0;
   if(mask===0)next.push([a,b,c]);else if(mask===1)next.push([a,x,c],[x,b,c]);else if(mask===2)next.push([b,y,a],[y,c,a]);else if(mask===4)next.push([c,z,b],[z,a,b]);else if(mask===3)next.push([b,y,x],[a,x,c],[x,y,c]);else if(mask===5)next.push([a,x,z],[x,b,c],[z,x,c]);else if(mask===6)next.push([c,z,y],[a,b,y],[a,y,z]);else next.push([a,x,z],[x,b,y],[z,y,c],[x,y,z]);
  }
  faces=next;if(!changed)break;
 }
 for(const f of faces){const[a,b,c]=f.map(i=>vertices[i]);push([at(a),at(b),at(c)],[a,b,c].map(p=>normal(map,...p)));if(lod!==2)push([at(c,-thickness(c)),at(b,-thickness(b)),at(a,-thickness(a))],[c,b,a].map(p=>normal(map,...p).negate()));}
 const bevelStart=triangles.length;const boundaries=[[points,inner],...holes.map((h,i)=>[h,innerHoles[i]])];for(const[points,inner]of boundaries)for(let i=0;i<points.length;i++){const j=(i+1)%points.length,n=2**Math.max(0,Math.ceil(Math.log2(Math.hypot(inner[i][0]-inner[j][0],inner[i][1]-inner[j][1])/step))),lerp=(a,b,t)=>a.map((v,i)=>T.MathUtils.lerp(v,b[i],t));for(let s=0;s<n;s++){const a=lerp(inner[i],inner[j],s/n),b=lerp(inner[i],inner[j],(s+1)/n),c=lerp(points[i],points[j],(s+1)/n),d=lerp(points[i],points[j],s/n);push([at(a),at(d,-bevel),at(c,-bevel)]);push([at(a),at(c,-bevel),at(b)]);if(lod!==2){push([at(d,-bevel),at(a,-thickness(a)),at(b,-thickness(b))]);push([at(d,-bevel),at(b,-thickness(b)),at(c,-bevel)]);}}}
 const g=meshFromTriangles(triangles,color);
 if(lod===0){const col=g.attributes.color;for(let i=bevelStart;i<triangles.length;i++){const center=triangles[i].reduce((a,p)=>a.add(p),V()).multiplyScalar(1/3),n=noise(Math.round(center.x*1600),Math.round(center.y*1600),Math.round(center.z*1600));if(n>.89){const worn=new T.Color(n>.97?0x778078:0xc4c3b4);for(let j=0;j<3;j++){const index=i*3+j,c=new T.Color().fromBufferAttribute(col,index).lerp(worn,n>.97?.65:.40);col.setXYZ(index,c.r,c.g,c.b);}}}}
 g.setAttribute('normal',new T.Float32BufferAttribute(normals.flatMap(ns=>ns.flatMap(n=>n.toArray())),3));return g;
}
function clipPolygon(poly,f){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],fa=f(a),fb=f(b);if(fa>=0)result.push(a);if((fa>=0)!==(fb>=0)){let lo=0,hi=1;for(let k=0;k<32;k++){const mid=(lo+hi)/2,n=a.clone().lerp(b,mid).normalize();if((f(n)>=0)===(fa>=0))lo=mid;else hi=mid;}result.push(a.clone().lerp(b,(lo+hi)/2).normalize());}}return result;}
function dualCells(){const g=new T.IcosahedronGeometry(1,4),p=g.attributes.position,vertices=[],lookup=new Map(),faces=[];const vertex=v=>{const key=v.toArray().map(x=>x.toFixed(6)).join(',');if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push({v,faces:[]});}return lookup.get(key);};for(let i=0;i<p.count;i+=3){const ids=[0,1,2].map(j=>vertex(V().fromBufferAttribute(p,i+j).normalize())),center=ids.reduce((a,id)=>a.add(vertices[id].v),V()).normalize(),index=faces.length;faces.push(center);for(const id of ids)vertices[id].faces.push(index);}return vertices.map(({v,faces:f})=>{const u=V(0,1,0).cross(v).normalize();if(u.lengthSq()<.1)u.set(1,0,0);const w=v.clone().cross(u),poly=f.map(i=>faces[i]).sort((a,b)=>Math.atan2(a.dot(w),a.dot(u))-Math.atan2(b.dot(w),b.dot(u)));return{center:v,poly};});}
function crownBand(u,v,offset=.004){const t=(u-.5)*BAND*2,nt=beta=>V(Math.sin(t),Math.cos(t)*Math.sin(beta),Math.cos(t)*Math.cos(beta));let lo=0,hi=Math.PI/2;for(let k=0;k<30;k++){const b=(lo+hi)/2;if(keep(nt(b))<0)lo=b;else hi=b;}const start=(lo+hi)/2,end=Math.PI+Math.asin(Math.min(.9999,(CENTER.y-.067)/(RADIUS.y*Math.cos(t))));return surface(nt(T.MathUtils.lerp(start,end,v)),offset);}

export async function buildRKMG02(lod,referenceBounds){
 const master=lod===0,far=lod===2,N=master?48:far?12:18,root=new T.Group();root.name='RK_MG02_ROOT';root.userData={family:'rk-mg02',lod,damage_level:0,static:far};
 const palette=new T.MeshStandardMaterial({name:'RK_MG02_CERAMIC',vertexColors:true,roughness:.65,metalness:.03}),metal=new T.MeshStandardMaterial({name:'RK_MG02_ANODIZED_METAL',vertexColors:true,roughness:.36,metalness:.82}),polymer=new T.MeshStandardMaterial({name:'RK_MG02_FACE_POLYMER',vertexColors:true,roughness:.56,metalness:.04}),rubber=new T.MeshStandardMaterial({name:'RK_MG02_RUBBER',vertexColors:true,roughness:.9,metalness:0}),glass=new T.MeshStandardMaterial({name:'RK_MG02_RED_OPTICAL_GLASS',vertexColors:true,roughness:.10,metalness:0,transparent:true,opacity:.88,depthWrite:false}),glow=new T.MeshStandardMaterial({name:'RK_MG02_OPTICAL_CORES',vertexColors:true,roughness:.25,emissive:0x591005,emissiveIntensity:1});
 const groups={},parts={};for(const[id,s]of Object.entries(MODULES)){const g=new T.Group();g.name='PART_'+id;g.userData={module:id,label:s.label,engine_driven:!far};root.add(g);groups[id]=g;parts[id]=[];}
 const lensParts=[],glowParts=[],sealParts=[],add=(id,g)=>parts[id].push(g);
 const placed=(g,p,q)=>{if(q)g.applyQuaternion(q);g.translate(...p.toArray());return g;},box=(size,p,color,q)=>colorize(placed(!master?new T.BoxGeometry(...size):new RoundedBoxGeometry(...size,master?2:1,.001),p,q),color);
 const cylinder=(r,h,p,color,q,segments=N)=>{const g=new T.CylinderGeometry(r,r,h,segments);g.rotateX(Math.PI/2);return colorize(placed(g,p,q),color);};
 const tube=(points,r,color,segments=master?64:20,sides=master?6:4)=>colorize(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,r,sides,false),color);
 const socket=(name,id,p,n)=>{const s=new T.Group();s.name=name;s.position.copy(p);s.quaternion.setFromUnitVectors(V(0,0,1),n);s.userData.role='socket';(groups[id]||root).add(s);};
 const hardware=(id,p,n,r=.002)=>{if(!master)return;const q=new T.Quaternion().setFromUnitVectors(V(0,0,1),n);add(id,cylinder(r*1.3,.0008,p,C.black,q,master?12:6));add(id,cylinder(r,.001,p.clone().addScaledVector(n,.0006),C.steel,q,master?12:6));if(master)add(id,box([r*1.25,.0004,.0004],p.clone().addScaledVector(n,.0012),C.dark,q));};
 // One hollow carrier, with cells fitted to its analytic curvature.
 const cowl=(u,v)=>{const t=u*Math.PI*2,y=T.MathUtils.lerp(lowerY(t),CENTER.y+RADIUS.y,v);return surface(direction(y,t));};
 add('SHELL',curvedPatch(cowl,master?96:far?20:32,master?32:far?8:12,{color:far?C.shell:C.dark,depth:.006,exterior:far,wrap:true}));
 // Dual geodesic cells are predominantly hexagons, with curvature-closing pentagons.
 let cellCount=0;
 if(!far)for(const cell of dualCells())for(const side of[-1,1]){
   let poly=clipPolygon(cell.poly,n=>side*n.x-Math.sin(BAND)-.007);if(poly.length<3)continue;poly=clipPolygon(poly,keep);if(poly.length<3)continue;
   const centroid=poly.reduce((a,n)=>a.add(n),V()).normalize(),inset=poly.map(n=>n.clone().lerp(centroid,.045).normalize()),front=[],edges=[];
   const subdivide=(a,b,c,level)=>{if(level){const ab=a.clone().add(b).normalize(),ac=a.clone().add(c).normalize(),bc=b.clone().add(c).normalize();subdivide(a,ab,ac,level-1);subdivide(ab,b,bc,level-1);subdivide(ac,bc,c,level-1);subdivide(ab,bc,ac,level-1);}else front.push([surface(a,.002),surface(b,.002),surface(c,.002)]);};
   for(let i=0;i<inset.length;i++){const j=(i+1)%inset.length;subdivide(centroid,inset[i],inset[j],master?2:0);const ai=inset[i].clone().lerp(centroid,.025).normalize(),bi=inset[j].clone().lerp(centroid,.025).normalize();edges.push([surface(ai,.0026),surface(inset[i],.0017),surface(inset[j],.0017)],[surface(ai,.0026),surface(inset[j],.0017),surface(bi,.0026)]);}
   const tone=new T.Color(C.shell).multiplyScalar(.96+noise(cellCount,side,1)*.07);const face=meshFromTriangles(front,tone),fp=face.attributes.position,fn=[];for(let i=0;i<fp.count;i++)fn.push(...normalFromShellPoint(V().fromBufferAttribute(fp,i)).toArray());face.setAttribute('normal',new T.Float32BufferAttribute(fn,3));add('SHELL',face);add('SHELL',meshFromTriangles(edges,C.edge));cellCount++;
 }
 root.userData.honeycomb_cells=cellCount;
 add('CROWN_BAND',curvedPatch((u,v)=>crownBand(u,v),master?20:far?4:6,master?88:far?18:28,{color:C.band,depth:.004,exterior:far}));
 if(far){
  const edges=[Array.from({length:5},(_,i)=>[i/4,0]),Array.from({length:19},(_,i)=>[1,i/18]),Array.from({length:5},(_,i)=>[1-i/4,1]),Array.from({length:19},(_,i)=>[0,1-i/18])],walls=[];
  for(const edge of edges)for(let i=0;i<edge.length-1;i++){const a=crownBand(...edge[i]),b=crownBand(...edge[i+1]),c=crownBand(...edge[i+1],0),d=crownBand(...edge[i],0);walls.push([a,d,b],[b,d,c]);}add('CROWN_BAND',meshFromTriangles(walls,C.band));
 }
 add('CROWN_BAND',cylinder(.002,.0004,V(0,.3476,-.004),C.band,new T.Quaternion().setFromUnitVectors(V(0,0,1),V(0,1,0)),far?3:N));
 if(!far)for(const u of[0,1])add('CROWN_BAND',tube(Array.from({length:49},(_,i)=>crownBand(u,i/48,.005)),master?.0008:.001,C.edge,master?96:far?20:48,master?6:4));
 // The opening and inset face share the same cowl boundary.
 const maxTheta=Math.acos(.15),frontArc=[[-.105,.170],[-.108,.207],[-.093,.242],[-.072,.258],[0,.270],[.072,.258],[.093,.242],[.108,.207],[.105,.170]],outline=[...frontArc,[.084,.136],[.027,.126],[-.027,.126],[-.084,.136]];
 add('FACEPLATE',curvedPlate(outline,faceMap,{color:C.dark,depth:.005,lod,bevel:.001}));
 // Rear skirt seats below the hex cowl and overlaps the compact neck seal.
 const skirt=(u,v)=>{const t=maxTheta+u*(Math.PI*2-2*maxTheta),y=.077+v*(lowerY(t)-.077);return surface(direction(y,t),.001);};
 add('SHELL',curvedPatch(skirt,master?64:far?12:24,master?12:far?1:4,{color:C.edge,depth:.006,exterior:far}));
 // Returned brow: thick root, tapered short lip, real apertures and temple seats.
 const peakOutline=[[-.122,-.055],[-.124,-.115],[-.103,-.168],[-.052,-.181],[0,-.183],[.052,-.181],[.103,-.168],[.124,-.115],[.122,-.055],[.100,-.093],[0,-.127],[-.100,-.093]];
 const peakHoles=[-1,1].map(side=>[[side*.047,-.151],[side*.085,-.139],[side*.078,-.158]]);
 add('SHELL',curvedPlate(peakOutline,peakMap,{color:C.band,depth:(x,z)=>.004+.009*T.MathUtils.clamp((.183+z)/.070,0,1),lod,bevel:.0012,holes:far?[]:peakHoles}));
 for(const side of[-1,1]){
   const p=peakMap(side*.115,-.104),n=normal(peakMap,side*.115,-.104);hardware('SHELL',p,n,.004);
   const seat=(u,v)=>peakMap(side*(.100+u*.022),-(.071+v*.047)).add(V(0,-.009,0));add('SHELL',curvedPatch(seat,master?6:2,master?8:2,{color:C.edge,depth:.007}));
   if(!far){const hole=peakHoles[side===-1?0:1];add('SHELL',curvedPlate(hole,(x,z)=>peakMap(x,z).add(V(0,-.008,0)),{color:C.black,depth:.001,lod,bevel:.0002}));}
 }
 // Closed cavity walls connect the recessed face to the shell aperture.
 const aperture=u=>{const t=-maxTheta+u*maxTheta*2;return surface(direction(lowerY(t),t));};
 add('FACEPLATE',curvedPatch((u,v)=>{const p=aperture(u),t=u*(frontArc.length-1),i=Math.max(0,Math.min(frontArc.length-2,Math.floor(t))),f=t-i,a=frontArc[i],b=frontArc[i+1],q=faceMap(T.MathUtils.lerp(a[0],b[0],f),T.MathUtils.lerp(a[1],b[1],f));return p.lerp(q,v);},master?96:far?16:32,master?8:far?1:3,{color:C.dark,depth:.004,exterior:far}));
 const gasket=frontArc.map(([x,y])=>faceMap(x,y).add(V(0,0,.002)));add('FACEPLATE',tube(gasket,far?.0015:.002,C.black,master?100:far?16:40,master?8:4));
 for(const side of[-1,1]){
   const strut=(u,v)=>{v=side<0?1-v:v;return V(side*(.114+v*.009),.246-u*.068,.098-u*.050+v*.010);};
   add('SHELL',curvedPatch(strut,master?12:far?2:4,1,{color:C.band,depth:.007}));
 }
 // A slim transverse brace breaks up the uninterrupted cowl height.
 if(!far)for(const side of[-1,1])add('SHELL',curvedPatch((u,v)=>{const t=side*(.51+u*2.12);return surface(direction(.280+v*.009,t),.005);},master?44:16,1,{color:C.band,depth:.003}));
 // All lens parts are authored in local optical planes and mounted normal to the face.
 for(const spec of OPTICS){const {x,y,r,glass:gr}=spec,p=faceMap(x,y),n=normal(faceMap,x,y),q=new T.Quaternion().setFromUnitVectors(V(0,0,1),n),at=z=>p.clone().addScaledVector(n,z*(spec.id==='CENTRAL'?1:.70)),big=spec.id==='CENTRAL';
   if(!far){add('OPTICS',cylinder(r,.009*(big?1:.70),at(.004),C.black,q,N));add('OPTICS',cylinder(r*.91,.004*(big?1:.70),at(.006),C.steel,q,N));add('OPTICS',cylinder(r*.83,.004*(big?1:.70),at(.0075),C.black,q,N));}else add('OPTICS',cylinder(r,.009*(big?1:.70),at(.0045),C.black,q,N));
   for(const[rr,z,c]of(far?[[r*.90,.014,C.edge]]:[[r*.93,.013,C.edge],[r*.83,.014,C.black]])){const ring=new T.TorusGeometry(rr,big?.0012:.00065,master?8:far?3:4,N);add('OPTICS',colorize(placed(ring,at(z),q),c));}
   const lensMap=(u,v)=>{const a=u*Math.PI*2,rr=gr*v,z=.010+(big?.0018:.0012)*(1-v*v);return V(rr*Math.cos(a),rr*Math.sin(a),z);};
   // A centre fan plus concentric annuli avoids degenerate pole triangles.
   const tri=[],rings=master?(big?14:8):far?2:5;for(let j=0;j<rings;j++)for(let i=0;i<N;i++){const a=lensMap(i/N,j/rings),b=lensMap((i+1)/N,j/rings),c=lensMap(i/N,(j+1)/rings),d=lensMap((i+1)/N,(j+1)/rings);if(j)tri.push([a,c,b]);tri.push([b,c,d]);}let lens=meshFromTriangles(tri,C.red);const lp=lens.attributes.position,ln=[];for(let i=0;i<lp.count;i++)ln.push(...V(2*(big?.0018:.0012)*lp.getX(i)/gr**2,2*(big?.0018:.0012)*lp.getY(i)/gr**2,1).normalize().toArray());lens.setAttribute('normal',new T.Float32BufferAttribute(ln,3));if(!big)lens.scale(1,1,.70);lensParts.push(placed(lens,p,q));
   if(!far){for(const f of big?(master?[.22,.44,.66,.88]:[.44,.88]):(master?[.52,.86]:[])){const rr=gr*f,z=.010+(big?.0018:.0012)*(1-f*f)+.00015,ring=new T.TorusGeometry(rr,big?.00014:.00010,master?5:3,N);lensParts.push(colorize(placed(ring,at(z),q),C.redEdge));}if(master&&big)for(let k=0;k<12;k++){const a=k*Math.PI/6,pts=Array.from({length:9},(_,i)=>{const f=.12+i*.10;return V(gr*f*Math.cos(a),gr*f*Math.sin(a),.010+.0018*(1-f*f)+.00015);});lensParts.push(placed(tube(pts,.00008,C.redEdge,12,3),p,q));}}
   if(far)glowParts.push(colorize(placed(new T.CircleGeometry(big?.00075:.0005,6),at(big?.0105:.0105),q),C.glow,0));else glowParts.push(colorize(placed(new T.SphereGeometry(big?.00075:.0005,master?16:8,master?10:6),at(big?.0105:.0105),q),C.glow,0));
   socket('SOCKET_OPTIC_'+spec.id,'OPTICS',at(big?.0105:.0105),n);
 }
 // One continuous structural guard per side, with true recessed vents.
 for(const side of[-1,1]){
   const map=(a,b)=>{const p=guardPoint(side*a/.25,b/.060);p.x*=side;return p;};
   const outline=[[0,0],[.25,0],[.25,.060],[0,.060]].map(([u,v])=>[side*u,v]);
   const holes=[[.42,.60],[.69,.86]].map(([a,b])=>[[a,.30],[b,.30],[b,.70],[a,.70]].map(([u,v])=>[side*u*.25,v*.060]));
   add('JAW',curvedPlate(outline,map,{color:C.jaw,depth:.010,lod,bevel:.0012,holes:far?[]:holes}));
   // Upper return seats the guard against the recessed facial insert.
   const seat=(u,v)=>{u=side<0?1-u:u;const p=guardPoint(u,1).addScaledVector(normal(guardPoint,u,1),-.004),q=faceMap(p.x*.94,p.y),n=V(p.x/RADIUS.x,(p.y-CENTER.y)/RADIUS.y,(p.z-CENTER.z)/RADIUS.z).normalize(),back=surface(n,-.002);q.lerp(back,T.MathUtils.smoothstep(u,.32,.56));const r=p.lerp(q,v);r.x*=side;return r;};
   add('JAW',curvedPatch(seat,master?56:far?12:24,master?4:far?1:2,{color:C.edge,depth:.003,exterior:far}));
   const underside=(u,v)=>{u=side<0?1-u:u;v=1-v;const p=guardPoint(u,0).addScaledVector(normal(guardPoint,u,0),-.004),a=Math.atan2(p.x,p.z+.006),q=V(.065*Math.sin(a),.073,-.006+.071*Math.cos(a)),r=p.lerp(q,v);r.x*=side;return r;};
   add('JAW',curvedPatch(underside,master?48:far?8:20,master?4:far?1:2,{color:C.dark,depth:.003,exterior:far}));
   // Gasket and inner return make the rail an enclosure, not a floating plate.
   if(!far)for(const v of[0,1]){const points=Array.from({length:25},(_,i)=>{const u=i/24;return map(side*u*.25,v*.06).addScaledVector(normal(map,side*u*.25,v*.06),-.007);});add('JAW',tube(points,far?.002:.0025,C.black,master?64:far?12:28,master?6:4));}
   if(!far)for(const [a,b]of[[.42,.60],[.69,.86]]){
     const h=[[a,.30],[b,.30],[b,.70],[a,.70]].map(([u,v])=>[side*u*.25,v*.060]);
     add('JAW',curvedPlate(h,(u,v)=>map(u,v).addScaledVector(normal(map,u,v),-.006),{color:C.black,depth:.001,lod,bevel:.0002}));
     for(let j=1;j<5;j++){const u=side*(a+(b-a)*j/5)*.25;add('JAW',tube([.33,.67].map(v=>map(u,v*.06).addScaledVector(normal(map,u,v*.06),-.0035)),.00075,C.steel,1,4));}
   }
   for(const[u,v]of[[.08,.24],[.31,.78],[.94,.5]]){const a=side*u*.25,b=v*.06;hardware('JAW',map(a,b),normal(map,a,b),.0025);}
   // Two restrained service tabs, recessed into the lower guard border.
   for(const u of[.25,.80]){const a=side*u*.25,b=.008,n=normal(map,a,b);add('JAW',box([.011,.003,.001],map(a,b).addScaledVector(n,.0005),C.copper,new T.Quaternion().setFromUnitVectors(V(0,0,1),n)));}
 }

 add('JAW',curvedPatch((u,v)=>chinMap((u-.5)*.054,.130).lerp(faceMap((u-.5)*.054,.126),v),master?12:far?3:6,1,{color:C.edge,depth:.003,exterior:far}));
 const chin=chinMap;
 // Frame strips and seven curved slats leave six genuine openings to a black filter.
 for(const poly of[[[-.028,.078],[-.026,.119],[-.020,.119],[-.020,.078]],[[.020,.078],[.020,.119],[.026,.119],[.028,.078]],[[-.026,.119],[-.016,.132],[.016,.132],[.026,.119]],[[-.028,.078],[.028,.078],[.018,.070],[-.018,.070]]])add('RESPIRATOR',curvedPlate(poly,chin,{color:C.jaw,lod,depth:.005,bevel:.0007}));
 for(let i=0;i<7;i++){const x=-.019+i*.006333;add('RESPIRATOR',curvedPlate([[x-.001,.078],[x+.001,.078],[x+.001,.119],[x-.001,.119]],(x,y)=>chin(x,y).addScaledVector(normal(chin,x,y),-.003),{color:C.steel,lod,depth:.006,bevel:.0002}));}
 add('RESPIRATOR',curvedPlate([[-.021,.076],[.021,.076],[.021,.121],[-.021,.121]],(x,y)=>chin(x,y).addScaledVector(normal(chin,x,y),-.008),{color:C.black,lod,depth:.002,bevel:.0003}));
 socket('SOCKET_RESPIRATOR','RESPIRATOR',chin(0,.100),normal(chin,0,.100));
 // Low collar, ribbed neck seal, bronze latches and rear service recesses.
 sealParts.push(curvedPatch((u,v)=>{const a=u*Math.PI*2,r=T.MathUtils.lerp(.087,.064,v);return V(r*Math.sin(a),.024+.026*v,-.006+r*1.10*Math.cos(a));},master?80:far?16:28,master?6:2,{color:C.rubber,depth:.005,exterior:far,wrap:true}));
 for(const y of far?[.061]:[.055,.061,.067]){const torus=new T.TorusGeometry(.063,far?.005:.0032,master?10:4,master?80:far?16:40);torus.rotateX(Math.PI/2);torus.scale(1,.72,1.10);torus.translate(0,y,-.006);sealParts.push(colorize(torus,C.rubber));}
 for(let i=0;i<12;i++){const t=i*Math.PI/6,plate=curvedPatch((u,v)=>{const a=t+(u-.5)*.48;return V(.095*Math.sin(a),.006+.025*v,-.006+.102*Math.cos(a));},master?8:far?1:3,1,{color:i%3===0?C.steel:C.dark,depth:.007,exterior:far});add('COLLAR',plate);const p=V(.096*Math.sin(t),.018,-.006+.103*Math.cos(t)),n=V(Math.sin(t),0,Math.cos(t));hardware('COLLAR',p,n,.0017);}
 add('COLLAR',box([.036,.026,.011],V(0,.013,.099),C.dark));add('COLLAR',box([.021,.004,.002],V(0,.016,.1055),C.copper));add('COLLAR',box([.038,.020,.009],V(0,.016,-.108),C.steel));add('COLLAR',box([.020,.004,.002],V(0,.016,-.113),C.copper));
 for(const side of[-1,1])for(const t0 of[1.23,2.7]){const t=side*t0,y=lowerY(t)+.008,p=surface(direction(y,t),.003),n=ellipsoidNormal(direction(y,t)),q=new T.Quaternion().setFromUnitVectors(V(0,0,1),n);add('SHELL',box([.018,.006,.0025],p,C.copper,q));hardware('SHELL',p,n,.0014);}
 if(!far){add('LINER',curvedPatch((u,v)=>{const t=1.45+u*(Math.PI*2-2.9),y=.10+.205*v;return surface(direction(y,t),-.012);},master?48:20,master?22:8,{color:C.rubber,depth:.003}));for(const side of[-1,1])add('LINER',box([.009,.060,.042],V(side*.112,.197,-.023),C.black));}
 const surfaces=[];for(const[id,gs]of Object.entries(parts)){if(gs.length){const g=clean(mergeGeometries(gs.map(g=>g.index?g.toNonIndexed():g))),mesh=new T.Mesh(g,far?palette:({FACEPLATE:polymer,OPTICS:metal,COLLAR:metal,LINER:rubber}[id]||palette));mesh.name='SURFACE_'+id;mesh.userData.module=id;groups[id].add(mesh);surfaces.push(mesh);}else{const marker=new T.Group();marker.name='SURFACE_'+id;groups[id].add(marker);}}
 const seal=new T.Mesh(clean(mergeGeometries(sealParts.map(g=>g.index?g.toNonIndexed():g))),rubber);seal.name='SURFACE_COLLAR_SEAL';seal.userData.module='COLLAR';groups.COLLAR.add(seal);surfaces.push(seal);
 for(const[gs,name,material]of[[lensParts,'OPTICAL_GLASS',glass],[glowParts,'OPTICAL_CORES',glow]]){const mesh=new T.Mesh(clean(mergeGeometries(gs.map(g=>g.index?g.toNonIndexed():g))),material);mesh.name=name;mesh.userData.module='OPTICS';groups.OPTICS.add(mesh);surfaces.push(mesh);}
 socket('SOCKET_NECK',null,V(0,.055,0),V(0,-1,0));socket('SOCKET_HEAD_DATUM',null,V(...SPEC.head_datum_m),V(0,1,0));socket('SOCKET_FRONT', 'FACEPLATE',faceMap(0,.190),normal(faceMap,0,.190));
 const distance=new T.Group();distance.name='DISTANCE_SURFACE';root.add(distance);
 if(far){root.updateMatrixWorld(true);const gs=surfaces.map(m=>geometryFor(m,root));for(const mesh of surfaces){const mark=new T.Group();mark.name=mesh.name;mark.userData={module:mesh.userData.module,static_lookup_only:true};mesh.parent.add(mark);mesh.removeFromParent();}distance.removeFromParent();let g=clean(mergeGeometries(gs));if((g.index?.count||g.attributes.position.count)/3>3000)throw new Error('Authored distance exceeds 3k: '+(g.index?.count||g.attributes.position.count)/3);if(referenceBounds){g.computeBoundingBox();const b=g.boundingBox,p=g.attributes.position;for(let i=0;i<p.count;i++)for(let j=0;j<3;j++){const key=['x','y','z'][j];p.setComponent(i,j,T.MathUtils.lerp(referenceBounds.min[j],referenceBounds.max[j],(p.getComponent(i,j)-b.min[key])/(b.max[key]-b.min[key])));}}const mesh=new T.Mesh(g,far?palette:({FACEPLATE:polymer,OPTICS:metal,COLLAR:metal,LINER:rubber}[id]||palette));mesh.name='DISTANCE_SURFACE';root.add(mesh);root.traverse(n=>{n.userData.static_lookup_only=true;});}
 if(lod===1&&referenceBounds){root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root,true);for(const mesh of surfaces){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)for(let j=0;j<3;j++){const k=['x','y','z'][j];p.setComponent(i,j,T.MathUtils.lerp(referenceBounds.min[j],referenceBounds.max[j],(p.getComponent(i,j)-bounds.min[k])/(bounds.max[k]-bounds.min[k])));}}}
 return root;
}
