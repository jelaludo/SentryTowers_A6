import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {clean,geometryFor} from './stalheart-kidou-utils.mjs';
import {SPEC,MODULES} from '../../assets/helmet-lab/hex-witness/runtime.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),C={shell:0x899992,band:0x9caaa3,edge:0x727d72,dark:0x242b2b,black:0x10191a,rubber:0x1b2323,jaw:0xb0b1a4,copper:0xac6d3d,steel:0x6f7772,red:0x511714,redEdge:0x77392e,glow:0xffbca3};
const CENTER=V(0,.207,-.004),RADIUS=V(.137,.168,.161),BAND=.28;
const noise=(x,y,z)=>{const a=Math.sin(x*17931+y*3491+z*10713)*43758.5453;return a-Math.floor(a);};
const normal=(map,u,v)=>map(u+1e-5,v).sub(map(u-1e-5,v)).cross(map(u,v+1e-5).sub(map(u,v-1e-5))).normalize();
const ellipsoidNormal=n=>V(n.x/RADIUS.x,n.y/RADIUS.y,n.z/RADIUS.z).normalize();
const surface=(n,d=0)=>n.clone().multiply(RADIUS).add(CENTER).addScaledVector(ellipsoidNormal(n),d);
const lowerY=t=>.067+.205*Math.max(0,(Math.cos(t)-.15)/.85)**.45;
const keep=n=>surface(n).y-lowerY(Math.atan2(n.x,n.z));
const direction=(y,t)=>{const yy=(y-CENTER.y)/RADIUS.y,r=Math.sqrt(Math.max(0,1-yy*yy));return V(r*Math.sin(t),yy,r*Math.cos(t));};
export const faceMap=(x,y)=>surface(V(x/RADIUS.x,(y-CENTER.y)/RADIUS.y,Math.sqrt(Math.max(0,1-(x/RADIUS.x)**2-((y-CENTER.y)/RADIUS.y)**2))),-.002);
export const OPTICS=[{id:'CENTRAL',x:0,y:.190,r:.051,glass:.043},{id:'UPPER_L',x:.063,y:.236,r:.019,glass:.0138},{id:'UPPER_R',x:-.063,y:.236,r:.019,glass:.0138},{id:'LOWER_L',x:.061,y:.132,r:.018,glass:.0128},{id:'LOWER_R',x:-.061,y:.132,r:.018,glass:.0128}];

function colorize(g,color,grain=.025){g.deleteAttribute('uv');g.clearGroups();const c=new T.Color(color),p=g.attributes.position,a=[];for(let i=0;i<p.count;i++){const k=1-grain/2+grain*noise(p.getX(i),p.getY(i),p.getZ(i));a.push(...c.clone().multiplyScalar(k).toArray().map(v=>Math.min(1,v)));}g.setAttribute('color',new T.Float32BufferAttribute(a,3));if(!g.attributes.normal)g.computeVertexNormals();return g;}
function meshFromTriangles(triangles,color){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(triangles.flatMap(t=>t.flatMap(v=>v.toArray())),3));g.computeVertexNormals();return colorize(g,color);}
function curvedPatch(map,nu,nv,{color=C.shell,depth=.004,exterior=false,wrap=false}={}){const p=[],ix=[];for(let k=0;k<(exterior?1:2);k++)for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...map(i/nu,j/nv).addScaledVector(normal(map,i/nu,j/nv),-k*depth).toArray());const n=(nu+1)*(nv+1);for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);if(!exterior)ix.push(a+n,c+n,b+n,b+n,c+n,d+n);}if(!exterior)for(const edge of[Array.from({length:nu+1},(_,i)=>i),Array.from({length:nu+1},(_,i)=>nv*(nu+1)+nu-i),...(wrap?[]:[Array.from({length:nv+1},(_,j)=>(nv-j)*(nu+1)),Array.from({length:nv+1},(_,j)=>j*(nu+1)+nu)])])for(let i=0;i<edge.length-1;i++){const a=edge[i],b=edge[i+1];ix.push(a,a+n,b,b,a+n,b+n);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return colorize(g,color);}
function curvedPlate(points,map,{color=C.jaw,depth=.005,lod=0,bevel=.0014}={}){
 if(T.ShapeUtils.isClockWise(points.map(p=>new T.Vector2(...p))))points=[...points].reverse();const middle=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]),inner=points.map(p=>{const d=Math.hypot(p[0]-middle[0],p[1]-middle[1]);return[p[0]+(middle[0]-p[0])*bevel/d,p[1]+(middle[1]-p[1])*bevel/d];}),triangles=[],normals=[];
 const push=(t,ns)=>{triangles.push(t);const n=new T.Triangle(...t).getNormal(V());normals.push(ns||[n,n,n]);};
 const at=(p,d=0)=>map(...p).addScaledVector(normal(map,...p),d),step=lod===0?.009:lod===1?.025:.040,vertices=inner.map(p=>[...p]);
 // Split shared edges together. Matching binary boundary samples keep the
 // bevel and face watertight even at low tessellation.
 let faces=T.ShapeUtils.triangulateShape(inner.map(p=>new T.Vector2(...p)),[]);
 for(let pass=0;pass<8;pass++){
  const midpoints=new Map(),mid=(a,b)=>{const key=[Math.min(a,b),Math.max(a,b)].join(':');if(!midpoints.has(key)){midpoints.set(key,vertices.length);vertices.push(vertices[a].map((v,i)=>(v+vertices[b][i])/2));}return midpoints.get(key);},length=(a,b)=>Math.hypot(vertices[a][0]-vertices[b][0],vertices[a][1]-vertices[b][1]);
  let changed=false;const next=[];
  for(const[a,b,c]of faces){const ab=length(a,b)>step,bc=length(b,c)>step,ca=length(c,a)>step,mask=+ab+2*bc+4*ca,x=ab?mid(a,b):0,y=bc?mid(b,c):0,z=ca?mid(c,a):0;changed ||= mask!==0;
   if(mask===0)next.push([a,b,c]);else if(mask===1)next.push([a,x,c],[x,b,c]);else if(mask===2)next.push([b,y,a],[y,c,a]);else if(mask===4)next.push([c,z,b],[z,a,b]);else if(mask===3)next.push([b,y,x],[a,x,c],[x,y,c]);else if(mask===5)next.push([a,x,z],[x,b,c],[z,x,c]);else if(mask===6)next.push([c,z,y],[a,b,y],[a,y,z]);else next.push([a,x,z],[x,b,y],[z,y,c],[x,y,z]);
  }
  faces=next;if(!changed)break;
 }
 for(const f of faces){const[a,b,c]=f.map(i=>vertices[i]);push([at(a),at(b),at(c)],[a,b,c].map(p=>normal(map,...p)));if(lod!==2)push([at(c,-depth),at(b,-depth),at(a,-depth)],[c,b,a].map(p=>normal(map,...p).negate()));}
 for(let i=0;i<points.length;i++){const j=(i+1)%points.length,n=2**Math.max(0,Math.ceil(Math.log2(Math.hypot(inner[i][0]-inner[j][0],inner[i][1]-inner[j][1])/step))),lerp=(a,b,t)=>a.map((v,i)=>T.MathUtils.lerp(v,b[i],t));for(let s=0;s<n;s++){const a=lerp(inner[i],inner[j],s/n),b=lerp(inner[i],inner[j],(s+1)/n),c=lerp(points[i],points[j],(s+1)/n),d=lerp(points[i],points[j],s/n);push([at(a),at(d,-bevel),at(c,-bevel)]);push([at(a),at(c,-bevel),at(b)]);if(lod!==2){push([at(d,-bevel),at(a,-depth),at(b,-depth)]);push([at(d,-bevel),at(b,-depth),at(c,-bevel)]);}}}
 const g=meshFromTriangles(triangles,color);g.setAttribute('normal',new T.Float32BufferAttribute(normals.flatMap(ns=>ns.flatMap(n=>n.toArray())),3));return g;
}
function clipPolygon(poly,f){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],fa=f(a),fb=f(b);if(fa>=0)result.push(a);if((fa>=0)!==(fb>=0)){let lo=0,hi=1;for(let k=0;k<32;k++){const mid=(lo+hi)/2,n=a.clone().lerp(b,mid).normalize();if((f(n)>=0)===(fa>=0))lo=mid;else hi=mid;}result.push(a.clone().lerp(b,(lo+hi)/2).normalize());}}return result;}
function dualCells(){const g=new T.IcosahedronGeometry(1,4),p=g.attributes.position,vertices=[],lookup=new Map(),faces=[];const vertex=v=>{const key=v.toArray().map(x=>x.toFixed(6)).join(',');if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push({v,faces:[]});}return lookup.get(key);};for(let i=0;i<p.count;i+=3){const ids=[0,1,2].map(j=>vertex(V().fromBufferAttribute(p,i+j).normalize())),center=ids.reduce((a,id)=>a.add(vertices[id].v),V()).normalize(),index=faces.length;faces.push(center);for(const id of ids)vertices[id].faces.push(index);}return vertices.map(({v,faces:f})=>{const u=V(0,1,0).cross(v).normalize();if(u.lengthSq()<.1)u.set(1,0,0);const w=v.clone().cross(u),poly=f.map(i=>faces[i]).sort((a,b)=>Math.atan2(a.dot(w),a.dot(u))-Math.atan2(b.dot(w),b.dot(u)));return{center:v,poly};});}
function crownBand(u,v,offset=.004){const t=(u-.5)*BAND*2,nt=beta=>V(Math.sin(t),Math.cos(t)*Math.sin(beta),Math.cos(t)*Math.cos(beta));let lo=0,hi=Math.PI/2;for(let k=0;k<30;k++){const b=(lo+hi)/2;if(keep(nt(b))<0)lo=b;else hi=b;}const start=(lo+hi)/2,end=Math.PI+Math.asin((CENTER.y-.067)/(RADIUS.y*Math.cos(t)));return surface(nt(T.MathUtils.lerp(start,end,v)),offset);}

export async function buildHexWitness(lod,referenceBounds){
 const master=lod===0,far=lod===2,N=master?48:far?12:18,root=new T.Group();root.name='HEX_WITNESS_ROOT';root.userData={family:'hex-witness',lod,damage_level:0,static:far};
 const palette=new T.MeshStandardMaterial({name:'HEX_WITNESS_CERAMIC_ALLOY',vertexColors:true,roughness:.69,metalness:.32}),glass=new T.MeshStandardMaterial({name:'HEX_WITNESS_RED_OPTICAL_GLASS',vertexColors:true,roughness:.17,metalness:.45}),glow=new T.MeshStandardMaterial({name:'HEX_WITNESS_OPTICAL_CORES',vertexColors:true,roughness:.25,emissive:0xff3923,emissiveIntensity:1});
 const groups={},parts={};for(const[id,s]of Object.entries(MODULES)){const g=new T.Group();g.name='PART_'+id;g.userData={module:id,label:s.label,engine_driven:!far};root.add(g);groups[id]=g;parts[id]=[];}
 const lensParts=[],glowParts=[],add=(id,g)=>parts[id].push(g);
 const placed=(g,p,q)=>{if(q)g.applyQuaternion(q);g.translate(...p.toArray());return g;},box=(size,p,color,q)=>colorize(placed(!master?new T.BoxGeometry(...size):new RoundedBoxGeometry(...size,master?2:1,.001),p,q),color);
 const cylinder=(r,h,p,color,q,segments=N)=>{const g=new T.CylinderGeometry(r,r,h,segments);g.rotateX(Math.PI/2);return colorize(placed(g,p,q),color);};
 const tube=(points,r,color,segments=master?64:20,sides=master?6:4)=>colorize(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,r,sides,false),color);
 const socket=(name,id,p,n)=>{const s=new T.Group();s.name=name;s.position.copy(p);s.quaternion.setFromUnitVectors(V(0,0,1),n);s.userData.role='socket';(groups[id]||root).add(s);};
 const hardware=(id,p,n,r=.002)=>{if(!master)return;const q=new T.Quaternion().setFromUnitVectors(V(0,0,1),n);add(id,cylinder(r*1.3,.0008,p,C.black,q,master?12:6));add(id,cylinder(r,.001,p.clone().addScaledVector(n,.0006),C.copper,q,master?12:6));if(master)add(id,box([r*1.25,.0004,.0004],p.clone().addScaledVector(n,.0012),C.dark,q));};
 // One hollow carrier, with cells fitted to its analytic curvature.
 const cowl=(u,v)=>{const t=u*Math.PI*2,y=T.MathUtils.lerp(lowerY(t),.375,v);return surface(direction(y,t));};
 add('SHELL',curvedPatch(cowl,master?96:far?24:32,master?32:far?9:12,{color:far?C.shell:C.dark,depth:.006,exterior:far,wrap:true}));
 // Dual geodesic cells are predominantly hexagons, with curvature-closing pentagons.
 let cellCount=0;
 if(!far)for(const cell of dualCells())for(const side of[-1,1]){
   let poly=clipPolygon(cell.poly,n=>side*n.x-Math.sin(BAND)-.007);if(poly.length<3)continue;poly=clipPolygon(poly,keep);if(poly.length<3)continue;
   const centroid=poly.reduce((a,n)=>a.add(n),V()).normalize(),inset=poly.map(n=>n.clone().lerp(centroid,.045).normalize()),front=[],edges=[];
   const subdivide=(a,b,c,level)=>{if(level){const ab=a.clone().add(b).normalize(),ac=a.clone().add(c).normalize(),bc=b.clone().add(c).normalize();subdivide(a,ab,ac,level-1);subdivide(ab,b,bc,level-1);subdivide(ac,bc,c,level-1);subdivide(ab,bc,ac,level-1);}else front.push([surface(a,.002),surface(b,.002),surface(c,.002)]);};
   for(let i=0;i<inset.length;i++){const j=(i+1)%inset.length;subdivide(centroid,inset[i],inset[j],master?2:0);const ai=inset[i].clone().lerp(centroid,.025).normalize(),bi=inset[j].clone().lerp(centroid,.025).normalize();edges.push([surface(ai,.0026),surface(inset[i],.0017),surface(inset[j],.0017)],[surface(ai,.0026),surface(inset[j],.0017),surface(bi,.0026)]);}
   const tone=new T.Color(C.shell).multiplyScalar(.96+noise(cellCount,side,1)*.07);const face=meshFromTriangles(front,tone),fp=face.attributes.position,fn=[];for(let i=0;i<fp.count;i++)fn.push(...V().fromBufferAttribute(fp,i).sub(CENTER).divide(RADIUS).divide(RADIUS).normalize().toArray());face.setAttribute('normal',new T.Float32BufferAttribute(fn,3));add('SHELL',face);add('SHELL',meshFromTriangles(edges,C.edge));cellCount++;
 }
 root.userData.honeycomb_cells=cellCount;
 add('CROWN_BAND',curvedPatch((u,v)=>crownBand(u,v),master?20:6,master?88:far?24:28,{color:C.band,depth:.004,exterior:far}));
 if(far){
  const edges=[Array.from({length:7},(_,i)=>[i/6,0]),Array.from({length:25},(_,i)=>[1,i/24]),Array.from({length:7},(_,i)=>[1-i/6,1]),Array.from({length:25},(_,i)=>[0,1-i/24])],walls=[];
  for(const edge of edges)for(let i=0;i<edge.length-1;i++){const a=crownBand(...edge[i]),b=crownBand(...edge[i+1]),c=crownBand(...edge[i+1],0),d=crownBand(...edge[i],0);walls.push([a,d,b],[b,d,c]);}add('CROWN_BAND',meshFromTriangles(walls,C.band));
 }
 add('CROWN_BAND',cylinder(.002,.0004,V(0,.3788,-.004),C.band,new T.Quaternion().setFromUnitVectors(V(0,0,1),V(0,1,0)),N));
 if(!far)for(const u of[0,1])add('CROWN_BAND',tube(Array.from({length:49},(_,i)=>crownBand(u,i/48,.005)),master?.0008:.001,C.edge,master?96:far?20:48,master?6:4));
 // The opening and inset face share the same cowl boundary.
 const maxTheta=Math.acos(.15),outline=Array.from({length:master?65:far?17:25},(_,i)=>{const t=-maxTheta+i*maxTheta*2/((master?65:far?17:25)-1),p=surface(direction(lowerY(t),t));return[p.x,p.y];});
 add('FACEPLATE',curvedPlate(outline,faceMap,{color:C.dark,depth:.005,lod,bevel:.001}));
 const rim=Array.from({length:65},(_,i)=>{const t=-maxTheta+i*maxTheta/32;return surface(direction(lowerY(t),t),.002);});add('SHELL',tube(rim,master?.0022:.0025,C.edge,master?128:far?24:64,master?8:4));
 if(master){
   for(let j=0;j<8;j++){const y=.11+j*.017,x=.105*Math.sin(j*2.2);if((x/.137)**2+((y-.207)/.168)**2<.85){const a=faceMap(x,y),b=faceMap(x+.012,y+.007);add('FACEPLATE',tube([a.addScaledVector(normal(faceMap,x,y),.0006),b.addScaledVector(normal(faceMap,x+.012,y+.007),.0006)],.00025,C.steel,2,3));}}
 }
 // All lens parts are authored in local optical planes and mounted normal to the face.
 for(const spec of OPTICS){const {x,y,r,glass:gr}=spec,p=faceMap(x,y),n=normal(faceMap,x,y),q=new T.Quaternion().setFromUnitVectors(V(0,0,1),n),at=z=>p.clone().addScaledVector(n,z*(spec.id==='CENTRAL'?1:.62)),big=spec.id==='CENTRAL';
   if(!far){add('OPTICS',cylinder(r,.010*(big?1:.62),at(.006),C.black,q,N));add('OPTICS',cylinder(r*.91,.009*(big?1:.62),at(.013),C.steel,q,N));add('OPTICS',cylinder(r*.83,.008*(big?1:.62),at(.018),C.black,q,N));}else add('OPTICS',cylinder(r,.016*(big?1:.62),at(.012),C.black,q,N));
   for(const[rr,z,c]of(far?[[r*.90,.021,C.edge]]:[[r*.93,.019,C.edge],[r*.83,.021,C.black]])){const ring=new T.TorusGeometry(rr,big?.0012:.00065,master?8:far?3:4,N);add('OPTICS',colorize(placed(ring,at(z),q),c));}
   const lensMap=(u,v)=>{const a=u*Math.PI*2,rr=gr*v,z=.022+(big?.007:.003)*(1-v*v);return V(rr*Math.cos(a),rr*Math.sin(a),z);};
   // A centre fan plus concentric annuli avoids degenerate pole triangles.
   const tri=[],rings=master?(big?14:8):far?2:5;for(let j=0;j<rings;j++)for(let i=0;i<N;i++){const a=lensMap(i/N,j/rings),b=lensMap((i+1)/N,j/rings),c=lensMap(i/N,(j+1)/rings),d=lensMap((i+1)/N,(j+1)/rings);if(j)tri.push([a,c,b]);tri.push([b,c,d]);}let lens=meshFromTriangles(tri,C.red);const lp=lens.attributes.position,ln=[];for(let i=0;i<lp.count;i++)ln.push(...V(2*(big?.007:.003)*lp.getX(i)/gr**2,2*(big?.007:.003)*lp.getY(i)/gr**2,1).normalize().toArray());lens.setAttribute('normal',new T.Float32BufferAttribute(ln,3));if(!big)lens.scale(1,1,.62);lensParts.push(placed(lens,p,q));
   if(!far){for(const f of big?(master?[.22,.44,.66,.88]:[.44,.88]):(master?[.52,.86]:[])){const rr=gr*f,z=.022+(big?.007:.003)*(1-f*f)+.0003,ring=new T.TorusGeometry(rr,big?.0003:.0002,master?5:3,N);lensParts.push(colorize(placed(ring,at(z),q),C.redEdge));}if(master&&big)for(let k=0;k<12;k++){const a=k*Math.PI/6,pts=Array.from({length:9},(_,i)=>{const f=.12+i*.10;return V(gr*f*Math.cos(a),gr*f*Math.sin(a),.022+.007*(1-f*f)+.0004);});lensParts.push(placed(tube(pts,.00017,C.redEdge,12,3),p,q));}}
   if(far)glowParts.push(cylinder(big?.0023:.0015,.0002,at(big?.030:.026),C.glow,q,6));else glowParts.push(colorize(placed(new T.SphereGeometry(big?.0023:.0015,master?16:8,master?10:6),at(big?.030:.026),q),C.glow,0));
   socket('SOCKET_OPTIC_'+spec.id,'OPTICS',at(big?.030:.026),n);
 }
 // Jaw panels sit over the same face surface; no independent tilted flat slabs.
 const jawMap=(x,y)=>faceMap(x,y).addScaledVector(normal(faceMap,x,y),.008),jawOutline=[[.025,.120],[.057,.111],[.088,.139],[.101,.173],[.117,.168],[.116,.129],[.091,.089],[.032,.073]];
 for(const side of[-1,1]){const points=jawOutline.map(([x,y])=>[side*x,y]);add('JAW',curvedPlate(points,jawMap,{color:C.jaw,depth:.006,lod}));for(const[x,y]of[[.104,.156],[.038,.084]])hardware('JAW',jawMap(side*x,y),normal(jawMap,side*x,y));
   for(const x of[.043,.055]){const center=jawMap(side*x,.097),n=normal(jawMap,side*x,.097),q=new T.Quaternion().setFromUnitVectors(V(0,0,1),n);add('JAW',box([.003,.014,.0015],center.clone().addScaledVector(n,.001),C.copper,q));}
 }
 const chin=(x,y)=>faceMap(x,y).addScaledVector(normal(faceMap,x,y),.014);
 // Frame strips and seven curved slats leave six genuine openings to a black filter.
 for(const poly of[[[-.028,.078],[-.026,.119],[-.020,.119],[-.020,.078]],[[.020,.078],[.020,.119],[.026,.119],[.028,.078]],[[-.026,.119],[-.016,.132],[.016,.132],[.026,.119]],[[-.028,.078],[.028,.078],[.018,.070],[-.018,.070]]])add('RESPIRATOR',curvedPlate(poly,chin,{color:C.jaw,lod,depth:.005,bevel:.0007}));
 for(let i=0;i<7;i++){const x=-.019+i*.006333;add('RESPIRATOR',curvedPlate([[x-.001,.078],[x+.001,.078],[x+.001,.119],[x-.001,.119]],chin,{color:C.steel,lod,depth:.005,bevel:.0002}));}
 add('RESPIRATOR',curvedPlate([[-.021,.076],[.021,.076],[.021,.121],[-.021,.121]],(x,y)=>chin(x,y).addScaledVector(normal(chin,x,y),-.006),{color:C.black,lod,depth:.002,bevel:.0003}));
 socket('SOCKET_RESPIRATOR','RESPIRATOR',chin(0,.100),normal(chin,0,.100));
 // Low collar, ribbed neck seal, bronze latches and rear service recesses.
 add('COLLAR',curvedPatch((u,v)=>{const a=u*Math.PI*2,r=T.MathUtils.lerp(.087,.064,v);return V(r*Math.sin(a),.024+.026*v,-.006+r*1.10*Math.cos(a));},master?80:far?16:28,master?6:2,{color:C.rubber,depth:.005,exterior:far,wrap:true}));
 for(const y of far?[.056]:[.049,.058,.067]){const torus=new T.TorusGeometry(.063,far?.008:.0045,master?10:4,master?80:far?20:40);torus.rotateX(Math.PI/2);torus.scale(1,1,1.10);torus.translate(0,y,-.006);add('COLLAR',colorize(torus,C.rubber));}
 for(let i=0;i<12;i++){const t=i*Math.PI/6,plate=curvedPatch((u,v)=>{const a=t+(u-.5)*.48;return V(.095*Math.sin(a),.006+.025*v,-.006+.102*Math.cos(a));},master?8:far?1:3,1,{color:i%3===0?C.steel:C.dark,depth:.007,exterior:far});add('COLLAR',plate);const p=V(.096*Math.sin(t),.018,-.006+.103*Math.cos(t)),n=V(Math.sin(t),0,Math.cos(t));hardware('COLLAR',p,n,.0017);}
 add('COLLAR',box([.036,.026,.011],V(0,.013,.099),C.dark));add('COLLAR',box([.021,.004,.002],V(0,.016,.1055),C.copper));add('COLLAR',box([.038,.020,.009],V(0,.016,-.108),C.steel));add('COLLAR',box([.020,.004,.002],V(0,.016,-.113),C.copper));
 for(const side of[-1,1])for(const t0 of[.45,1.23,2.7]){const t=side*t0,y=lowerY(t)+.008,p=surface(direction(y,t),.003),n=ellipsoidNormal(direction(y,t)),q=new T.Quaternion().setFromUnitVectors(V(0,0,1),n);add('SHELL',box([.018,.006,.0025],p,C.copper,q));hardware('SHELL',p,n,.0014);}
 if(!far){add('LINER',curvedPatch((u,v)=>{const t=1.45+u*(Math.PI*2-2.9),y=.10+.205*v;return surface(direction(y,t),-.012);},master?48:20,master?22:8,{color:C.rubber,depth:.003}));for(const side of[-1,1])add('LINER',box([.009,.060,.042],V(side*.112,.197,-.023),C.black));}
 const surfaces=[];for(const[id,gs]of Object.entries(parts)){if(gs.length){const g=clean(mergeGeometries(gs.map(g=>g.index?g.toNonIndexed():g))),mesh=new T.Mesh(g,palette);mesh.name='SURFACE_'+id;mesh.userData.module=id;groups[id].add(mesh);surfaces.push(mesh);}else{const marker=new T.Group();marker.name='SURFACE_'+id;groups[id].add(marker);}}
 for(const[gs,name,material]of[[lensParts,'OPTICAL_GLASS',glass],[glowParts,'OPTICAL_CORES',glow]]){const mesh=new T.Mesh(clean(mergeGeometries(gs.map(g=>g.index?g.toNonIndexed():g))),material);mesh.name=name;mesh.userData.module='OPTICS';groups.OPTICS.add(mesh);surfaces.push(mesh);}
 socket('SOCKET_NECK',null,V(0,.055,0),V(0,-1,0));socket('SOCKET_HEAD_DATUM',null,V(...SPEC.head_datum_m),V(0,1,0));socket('SOCKET_FRONT', 'FACEPLATE',faceMap(0,.190),normal(faceMap,0,.190));
 const distance=new T.Group();distance.name='DISTANCE_SURFACE';root.add(distance);
 if(far){root.updateMatrixWorld(true);const gs=surfaces.map(m=>geometryFor(m,root));for(const mesh of surfaces){const mark=new T.Group();mark.name=mesh.name;mark.userData={module:mesh.userData.module,static_lookup_only:true};mesh.parent.add(mark);mesh.removeFromParent();}distance.removeFromParent();let g=clean(mergeGeometries(gs));if((g.index?.count||g.attributes.position.count)/3>3000)throw new Error('Authored distance exceeds 3k: '+(g.index?.count||g.attributes.position.count)/3);if(referenceBounds){g.computeBoundingBox();const b=g.boundingBox,p=g.attributes.position;for(let i=0;i<p.count;i++)for(let j=0;j<3;j++){const key=['x','y','z'][j];p.setComponent(i,j,T.MathUtils.lerp(referenceBounds.min[j],referenceBounds.max[j],(p.getComponent(i,j)-b.min[key])/(b.max[key]-b.min[key])));}}const mesh=new T.Mesh(g,palette);mesh.name='DISTANCE_SURFACE';root.add(mesh);root.traverse(n=>{n.userData.static_lookup_only=true;});}
 if(lod===1&&referenceBounds){root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root,true);for(const mesh of surfaces){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)for(let j=0;j<3;j++){const k=['x','y','z'][j];p.setComponent(i,j,T.MathUtils.lerp(referenceBounds.min[j],referenceBounds.max[j],(p.getComponent(i,j)-bounds.min[k])/(bounds.max[k]-bounds.min[k])));}}}
 return root;
}
