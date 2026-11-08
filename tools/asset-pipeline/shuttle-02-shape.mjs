import * as T from 'three';
import {prep,box,cyl,ring,beam,armor,node,socket} from './settlement-industry-shape.mjs';
import {merge,simplify,clean} from './stalheart-kidou-utils.mjs';
import {lathe,addVentralDock} from './shuttle-docking-kit.mjs';
export const C={hull:0xd3d1c8,panel:0xbfc3c0,edge:0x8a969c,dark:0x303e4c,black:0x172731,steel:0x7c909c,amber:0xd6ae58,glass:0x243f52,cyan:0x84ddf4};
// z, half-width, lower chine, upper deck. The paired pods leave the central hull clear.
const sections=[[-21,.7,1.8,4.2],[-18,1.65,1.4,4.4],[-10,3.6,.8,4.1],[-3,4.1,.55,3.8],[3,4.1,.55,3.8],[7,3.4,.8,3.5],[12,2.4,1.1,3.1],[17,1.2,1.4,2.7],[21,.12,1.95,2.15]];
function sample(z){let i=0;while(i<sections.length-2&&z>sections[i+1][0])i++;const a=sections[i],b=sections[i+1],u=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0])));return a.slice(1).map((x,j)=>x+(b[j+1]-x)*u);}
function flatShape(points,holes=[]){const s=new T.Shape(points.map(p=>new T.Vector2(...p)));s.closePath();for(const hole of holes){const h=new T.Path(hole.map(p=>new T.Vector2(...p)));h.closePath();s.holes.push(h);}return s;}
function flat(points,holes,y,upper,color){const g=new T.ShapeGeometry(flatShape(points,holes));const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i);p.setXYZ(i,x,typeof y==='function'?y(x,z):y,z);}if(upper){const a=g.index;for(let i=0;i<a.count;i+=3){const b=a.getX(i+1);a.setX(i+1,a.getX(i+2));a.setX(i+2,b);}}g.computeVertexNormals();return prep(g,color);}
// A convex polygon with a chamfered upper edge, retaining exact outline bounds in all tiers.
function plate(points,base,top,color,bevel=.14){if(T.ShapeUtils.isClockWise(points.map(p=>new T.Vector2(...p))))points=points.slice().reverse();const centre=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]),inset=points.map(p=>{const d=Math.hypot(p[0]-centre[0],p[1]-centre[1]);return[p[0]+(centre[0]-p[0])*bevel/d,p[1]+(centre[1]-p[1])*bevel/d];}),parts=[flat(points,[],base,false,C.dark),flat(inset,[],top,true,color)],p=[];
 for(let i=0;i<points.length;i++){const j=(i+1)%points.length;for(const [a,ay,b,by,c,cy]of [[points[i],base,points[j],base,points[i],top-bevel],[points[j],base,points[j],top-bevel,points[i],top-bevel],[points[i],top-bevel,points[j],top-bevel,inset[i],top],[points[j],top-bevel,inset[j],top,inset[i],top]])p.push(a[0],ay,a[1],b[0],by,b[1],c[0],cy,c[1]);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));const a=g.attributes.position;for(let i=0;i<a.count;i+=3){const b=new T.Vector3().fromBufferAttribute(a,i+1),c=new T.Vector3().fromBufferAttribute(a,i+2);a.setXYZ(i+1,...c.toArray());a.setXYZ(i+2,...b.toArray());}g.computeVertexNormals();parts.push(prep(g,color));return merge(parts);
}
function inset(points,d){const c=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);return points.map(p=>{const r=Math.hypot(p[0]-c[0],p[1]-c[1]);return[p[0]+(c[0]-p[0])*d/r,p[1]+(c[1]-p[1])*d/r];});}
function wingHeight(x){x=Math.abs(x);return x<=9.55?4.15+(x-4)*1.45/5.55:5.6-(x-9.55)*.6;}
function cutAtX(g,planes){
 const source=g.index?g.toNonIndexed():g,p=source.attributes.position,c=source.attributes.color,vertices=[],colors=[];
 const clip=(poly,x,sign)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],aa=(a.p.x-x)*sign>=0,bb=(b.p.x-x)*sign>=0;if(aa)out.push(a);if(aa!==bb){const t=(x-a.p.x)/(b.p.x-a.p.x);out.push({p:a.p.clone().lerp(b.p,t),c:a.c.clone().lerp(b.c,t)});}}return out;};
 for(let i=0;i<p.count;i+=3){let polys=[[0,1,2].map(j=>({p:new T.Vector3().fromBufferAttribute(p,i+j),c:new T.Vector3(c.getX(i+j),c.getY(i+j),c.getZ(i+j))}))];for(const x of planes)polys=polys.flatMap(poly=>{const xs=poly.map(v=>v.p.x);return Math.min(...xs)<x&&Math.max(...xs)>x?[clip(poly,x,1),clip(poly,x,-1)]:[poly];});for(const poly of polys)for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){vertices.push(...v.p.toArray());colors.push(...v.c.toArray());}}
 const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(vertices,3));out.setAttribute('color',new T.Float32BufferAttribute(colors,3));out.computeVertexNormals();return out;
}
function onRearBridge(g){g=cutAtX(g,[-9.55,-9.1,-5.3,-4,4,5.3,9.1,9.55]);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=Math.abs(p.getX(i));const h=x<4?4.15:(x<5.3?4.15+(x-4)*1.75/1.3:x<9.1?5.9:x<9.55?5.9-(x-9.1)*.3/.45:wingHeight(x));p.setY(i,p.getY(i)+h);}g.computeVertexNormals();return g;}
function onWing(g){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+wingHeight(p.getX(i)));g.computeVertexNormals();return g;}
function onDeck(g){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+sample(p.getZ(i))[2]);g.computeVertexNormals();return g;}
function outline(){return sections.map(([z,w])=>[w,z]).concat(sections.slice().reverse().map(([z,w])=>[-w,z]));}
function bolts(parts,x,y,z,n){for(const dx of [-.65,.65])for(const dz of [-.7,.7])parts.push(cyl(.045,.04,n,[x+dx,y,z+dz],C.steel));}
function thrusterParts(tier,n){const parts=[];
 // Rotate a long chamfered housing from its construction axis into the vertical thrust axis.
 const casing=plate([[-1.05,-3.15],[1.05,-3.15],[1.55,-2.65],[1.55,2.45],[1.0,3.35],[-1,3.35],[-1.55,2.45],[-1.55,-2.65]],-1.05,1.05,C.dark,.22);casing.rotateX(Math.PI/2);parts.push(casing);
 for(const front of [-1,1]){
  parts.push(armor([2.7,.12,2.5],[0,front*1.13,-1.65],C.hull,tier).rotateX(Math.PI/2));
  parts.push(armor([2.15,.14,3.1],[0,front*1.16,1.1],C.dark,tier).rotateX(Math.PI/2));
  parts.push(box([2.45,.08,.30],[0,front*1.23,-.32],C.amber).rotateX(Math.PI/2));
  for(let i=0;i<4;i++)parts.push(box([1.25,.045,.12],[0,front*1.23,-2.3+i*.34],C.black).rotateX(Math.PI/2));
 }
 // Exhaust bells point local -Y. Their sockets rotate with the complete pod.
 parts.push(lathe([[.62,-2.45],[1.0,-2.45],[1.24,-3.05],[1.28,-4.15],[1.06,-4.15],[.72,-3.25],[.62,-2.45]],n,C.steel));
 parts.push(ring(1.22,.085,n,[0,-3.8,0],C.dark),ring(1.08,.045,n,[0,-4.12,0],C.amber),cyl(.7,.04,n,[0,-3.0,0],C.cyan));
 for(let i=0;i<(tier===0?16:8);i++){const a=i/(tier===0?16:8)*Math.PI*2;parts.push(box([.15,1.2,.2],[1.26*Math.cos(a),-3.47,1.26*Math.sin(a)],C.dark,[0,-a,0]));}
 parts.push(cyl(1.1,3.35,n,[0,0,0],C.steel,[0,0,Math.PI/2]),cyl(.88,3.42,n,[0,0,0],C.dark,[0,0,Math.PI/2]),cyl(.55,3.48,n,[0,0,0],C.steel,[0,0,Math.PI/2]));
 for(const side of [-1,1])parts.push(ring(1.0,.055,n,[side*1.76,0,0],C.amber,[0,Math.PI/2,0]));
 if(tier===0){for(const side of [-1,1])for(let i=0;i<10;i++){const a=i/10*Math.PI*2;parts.push(cyl(.055,.04,8,[side*1.76,.75*Math.cos(a),.75*Math.sin(a)],C.amber,[0,0,Math.PI/2]));}}
 return parts;
}
export async function buildShuttle(lod){const tier=Math.min(lod,1),n=tier===0?48:24,root=new T.Group();root.name='SHUTTLE_02_ROOT';root.userData={family:'shuttle-02',lod,damage_level:0,static:lod===2};const palette=new T.MeshStandardMaterial({name:'INDUSTRIAL_SHUTTLE_PALETTE',vertexColors:true,metalness:.4,roughness:.42}),glass=new T.MeshStandardMaterial({name:'SHUTTLE_02_GLASS',vertexColors:true,metalness:.5,roughness:.18}),body=[],bins=[],outer=outline();
 // Faceted deck built in station strips avoids long warped triangles.
 for(let i=0;i<sections.length-1;i++){const [z,w,b,t]=sections[i],[zz,ww,bb,tt]=sections[i+1];body.push(flat([[w*.82,z],[ww*.82,zz],[-ww*.82,zz],[-w*.82,z]],[],(x,z)=>sample(z)[2],true,C.hull));
  for(const side of [-1,1]){const p=[side*w*.82,t,z,side*ww*.82,tt,zz,side*w,t-.5,z,side*ww*.82,tt,zz,side*ww,tt-.5,zz,side*w,t-.5,z,side*w,t-.5,z,side*ww,tt-.5,zz,side*w,b,z,side*ww,tt-.5,zz,side*ww,bb,zz,side*w,b,z];if(side<0)for(let j=0;j<p.length;j+=9){const v=p.slice(j+3,j+6);p.splice(j+3,3,...p.slice(j+6,j+9));p.splice(j+6,3,...v);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();body.push(prep(g,side<0?C.panel:C.hull));}
 }
 const hole=Array.from({length:n},(_,i)=>[1.83*Math.cos(i/n*Math.PI*2),-2+1.83*Math.sin(i/n*Math.PI*2)]);body.push(flat(outer,[hole],(x,z)=>sample(z)[1],false,C.dark));
 for(const end of [sections[0],sections.at(-1)]){const [z,w,b,t]=end;body.push(box([2*w,t-b,.04],[0,(t+b)/2,z+(z<0?.02:-.02)],C.dark));}
 // A genuine bore, with a short dark surround into the fixed airlock casing.
 body.push(lathe([[1.81,.32],[1.83,.32],[1.83,.55],[1.81,.55],[1.81,.32]],n,C.dark,[0,0,-2]));
 addVentralDock(root,bins,body,{z:-2,n,C});
 // Armored deck panels, side service rails and a split nose trench.
 for(const z of [-15,-10.5,-6,-1.5,3]){const [w,,t]=sample(z);body.push(armor([w*1.20,.12,3.6],[0,t+.12,z],z===-6?C.panel:C.hull,tier));for(const side of [-1,1]){body.push(beam([side*w*.69,t+.15,z-1.6],[side*w*.69,t+.15,z+1.6],.095,C.edge));if(tier===0)for(let j=0;j<8;j++)body.push(box([.32,.025,.075],[side*w*.57,t+.20,z-1.2+j*.32],C.edge));}if(tier===0)bolts(body,0,t+.21,z,8);}
 for(const side of [-1,1]){body.push(onDeck(plate([[side*.5,8],[side*2.1,8],[side*1.15,16],[side*.25,19]],.06,.26,C.panel,.07)));body.push(beam([side*.55,sample(8)[2]+.28,8],[side*.25,sample(18)[2]+.28,18],.10,C.edge));}
 body.push(plate([[-.55,18.5],[.55,18.5],[.12,21],[-.12,21]],1.97,2.25,C.dark,.03),box([.21,.13,.05],[0,2.07,20.975],C.amber));
 for(const side of [-1,1]){for(let i=0;i<sections.length-3;i++){const [z,w,,t]=sections[i],[zz,ww,,tt]=sections[i+1];body.push(beam([side*w*.84,t+.055,i===0?-20.9:z],[side*ww*.84,tt+.055,zz],.14,C.dark));}for(let i=0;i<9;i++){const z=-16+i*2.35,[w,,t]=sample(z);body.push(box([.24,.22,.38],[side*w*.86,t+.08,z],C.dark));}}
 // The forward control blister is deliberately low and integrated with the deck.
 const cockpit=plate([[-1.45,4],[1.45,4],[1.75,6.4],[.9,8.1],[-.9,8.1],[-1.75,6.4]],3.2,4.05,C.hull,.2);body.push(cockpit);
 bins.push({parent:root,name:'CANOPY',material:glass,parts:[plate([[-1.3,6.15],[1.3,6.15],[.72,7.45],[-.72,7.45]],4.045,4.12,C.glass,.035)]});
 // Fixed U-shaped side shields surround, but never enter, each rotation sweep.
 for(const side of [-1,1]){
  const mirror=points=>points.map(([x,z])=>[side*x,z]);
  const shield=[[9.55,-7.7],[10.9,-8.5],[12.6,-4.6],[12.6,2.9],[11.1,7.5],[9.55,8.0]];
  body.push(onWing(plate(mirror(shield),-.85,-.12,C.dark,.14)),onWing(plate(mirror(inset(shield,.16)),-.60,0,C.hull,.18)));
  for(const panel of [[[9.8,-7.1],[10.75,-7.8],[12.15,-4.6],[11.9,-2],[9.8,-2.8]],[[9.8,-2.4],[12.25,-1.8],[12.25,2.65],[11.8,3.8],[9.8,3.2]],[[9.8,3.6],[11.65,4.15],[10.9,7.15],[9.8,7.5]]])body.push(onWing(plate(mirror(panel),.025,.075,C.panel,.025)));
  body.push(onRearBridge(plate(mirror([[4,-7.6],[4.8,-7.615],[5.3,-7.625],[9.1,-7.69],[9.55,-7.7],[10.9,-8.5],[9.1,-9.86],[5.6,-12.5],[5.3,-12.35],[4.8,-12.1],[3.5,-11.5]]),-.65,0,C.panel,.06)));
  body.push(onWing(plate(mirror([[4,6.1],[9.55,8],[11.1,7.5],[7.2,9.7],[3.1,8.6]]),-.65,0,C.hull,.16)));
  body.push(beam([side*4.05,4.5,0],[side*9.6,4.5,0],.6,C.dark),beam([side*3.8,3.1,0],[side*5.15,4.5,0],.7,C.dark));
  for(const x of [5.15,9.15]){body.push(cyl(1.22,.35,n,[side*x,4.5,0],C.dark,[0,0,Math.PI/2]),ring(.95,.10,n,[side*(x+.2),4.5,0],C.amber,[0,Math.PI/2,0]));}
  body.push(onWing(plate(mirror([[10.05,-6.3],[10.8,-6.2],[11.95,-3.4],[11.5,-2.8],[10.05,-3.7]]),.10,.16,C.edge,.02)));
  body.push(onWing(plate(mirror([[9.72,4.5],[10.1,4.5],[10.7,6.8],[10.3,7.1],[9.72,6.8]]),.10,.15,C.amber,.02)));
  for(const z of [-5.3,5.4])body.push(armor([.55,.3,.8],[side*9.9,5.65,z],C.dark,tier));
  // Root-side power conduits run away from the rotating engine bay.
  for(const z of [-4.8,4.8]){body.push(beam([side*3.8,3.3,z],[side*5.7,3.3,z],.16,C.steel));if(tier===0)for(let i=0;i<5;i++)body.push(box([.08,.4,.4],[side*(4.15+i*.27),3.3,z],C.dark));}
  const id=side<0?'L':'R',pivot=node(root,'THRUSTER_'+id+'_TILT',[side*7.2,4.5,0]);bins.push({parent:pivot,name:'THRUSTER_'+id+'_SURFACE',parts:thrusterParts(tier,n)});socket(pivot,'SOCKET_EXHAUST_'+id,[0,-4.22,0],'exhaust',[0,-1,0]);
 }
 // Aft bus, small service outlets and inset status markers.
 body.push(armor([1.75,.45,2.1],[0,4.5,-18.4],C.dark,tier),box([1.15,.06,.38],[0,4.76,-18],C.amber));
 for(const side of [-1,1]){for(let j=0;j<4;j++)body.push(box([.45,.25,.07],[side*3.62,2.4,-7+j*.5],C.black));body.push(box([.25,.12,.7],[side*3.6,3.5,2.1],side<0?C.amber:C.cyan));}
 socket(root,'SOCKET_NOSE',[0,2.07,21],'nose');socket(root,'SOCKET_CENTRE_OF_MASS',[0,3.1,-1],'mass',[0,1,0]);
 bins.unshift({parent:root,name:'HULL',parts:body});for(const bin of bins){const mesh=new T.Mesh(clean(merge(bin.parts.map(g=>{g=g.index?g.toNonIndexed():g;const c=g.attributes.color;g.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:c.count*3},(_,i)=>c.getComponent(Math.floor(i/3),i%3)),3));return g;}))),bin.material||palette);mesh.name=bin.name;bin.parent.add(mesh);}
 root.traverse(o=>{if(o.userData.role==='engine_pivot')o.userData.engine_driven=true;});root.updateMatrixWorld(true);
 if(lod===2){const gs=[],meshes=[];root.traverse(o=>{if(o.isMesh){gs.push(o.geometry.clone().applyMatrix4(o.matrixWorld));meshes.push(o);}});for(const o of meshes){const marker=new T.Group();marker.name=o.name;marker.position.copy(o.position);marker.quaternion.copy(o.quaternion);marker.scale.copy(o.scale);o.parent.add(marker);o.removeFromParent();}const mesh=new T.Mesh(await simplify(merge(gs),2700),palette);mesh.name='SHUTTLE_DISTANCE_SURFACE';root.add(mesh);root.traverse(o=>o.userData.static_lookup_only=true);}
 root.traverse(o=>{if(o.isMesh){o.geometry.normalizeNormals();const c=o.geometry.attributes.color;o.geometry.setAttribute('color',new T.Uint8BufferAttribute(Array.from(c.array,v=>Math.round(Math.max(0,Math.min(1,v))*255)),3,true));}});return root;
}
