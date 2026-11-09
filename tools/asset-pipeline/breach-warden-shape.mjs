import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {simplify,geometryFor,clean} from './stalheart-kidou-utils.mjs';
import {MODULES,SPEC} from '../../assets/helmet-lab/breach-warden/runtime.js';

const C={olive:0x5d6055,edge:0x757d75,steel:0x929b91,dark:0x242b2b,rubber:0x171f21,liner:0x353b38,ivory:0xc4bca6,rust:0x716052,gold:0xb39a58,glass:0x172327,cyan:0x78d6d2};
const V=(x,y,z)=>new T.Vector3(x,y,z),noise=(x,y,z)=>{const n=Math.sin(x*17213+y*39119+z*1177)*43758.5453;return n-Math.floor(n);};
function paint(g,color){g.deleteAttribute('uv');g.clearGroups();const c=new T.Color(color),p=g.attributes.position,a=[];for(let i=0;i<p.count;i++){const k=.92+.13*noise(p.getX(i),p.getY(i),p.getZ(i));a.push(c.r*k,c.g*k,c.b*k);}g.setAttribute('color',new T.Float32BufferAttribute(a,3));if(!g.attributes.normal)g.computeVertexNormals();return g;}
function transformed(g,p=[0,0,0],r=[0,0,0]){g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...r)));g.translate(...p);return g;}
function mirror(g){g=g.clone();g.scale(-1,1,1);if(g.index){for(let i=0;i<g.index.count;i+=3){const a=g.index.getX(i);g.index.setX(i,g.index.getX(i+2));g.index.setX(i+2,a);}}else{for(const a of Object.values(g.attributes))for(let i=0;i<a.count;i+=3)for(let j=0;j<a.itemSize;j++){const v=a.getComponent(i,j);a.setComponent(i,j,a.getComponent(i+2,j));a.setComponent(i+2,j,v);}}return g;}
const distSegment=(p,a,b)=>{const x=b[0]-a[0],y=b[1]-a[1],t=T.MathUtils.clamp(((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y),0,1);return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);};

// Closed, bevelled armor plates. Fine front tessellation carries chips and dents.
function plate(points,map,{color=C.olive,normal=[0,0,1],thickness=.006,bevel=.002,lod=0,scars=[],stripe=false}={}){
  if(lod!==0){scars=[];stripe=false;}
  if(T.ShapeUtils.isClockWise(points.map(p=>new T.Vector2(...p))))points=[...points].reverse();
  const mid=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
  const inset=points.map(p=>{const d=Math.hypot(p[0]-mid[0],p[1]-mid[1]);return[p[0]+(mid[0]-p[0])*bevel/d,p[1]+(mid[1]-p[1])*bevel/d];});
  const n=V(...normal),parts=[],base=new T.Color(color),steel=new T.Color(C.steel),rust=new T.Color(C.rust);
  const make=(triangles,front)=>{const pos=[],col=[];
    const emit=(a,b,c,depth=0)=>{
      if(depth<7&&Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(a[0]-c[0],a[1]-c[1]),Math.hypot(b[0]-c[0],b[1]-c[1]))>(lod===0?.0058:lod===1?.023:.075)){
        const ab=[(a[0]+b[0])/2,(a[1]+b[1])/2],bc=[(b[0]+c[0])/2,(b[1]+c[1])/2],ca=[(c[0]+a[0])/2,(c[1]+a[1])/2];emit(a,ab,ca,depth+1);emit(ab,b,bc,depth+1);emit(ca,bc,c,depth+1);emit(ab,bc,ca,depth+1);return;
      }
      for(const p of [a,b,c]){
        const v=map(p[0],p[1]),edge=Math.min(...points.map((q,i)=>distSegment(p,q,points[(i+1)%points.length]))),grain=noise(...v.toArray());let tone=base.clone().multiplyScalar(lod===0?.88+grain*.17:1),dent=0;
        if(stripe&&p[1]>.299&&p[1]<.327){const t=p[0]-(p[1]-.30)*.4;if((t>-.073&&t<-.059)||(t>-.053&&t<-.039))tone.setHex(C.gold).multiplyScalar(.83+.17*grain);}
        if(lod===0&&edge<.0013*(.35+grain)&&front)tone.copy(grain>.45?steel:rust);
        for(const[sx,sy,r]of scars){const d=Math.hypot(p[0]-sx,p[1]-sy),angle=Math.atan2(p[1]-sy,p[0]-sx),rad=r*(.87+.15*Math.sin(angle*7));dent+=.006*Math.exp(-((d/(r*.47))**2));if(d<rad){tone.copy(d<r*.3?new T.Color(C.dark):steel).multiplyScalar(.72+grain*.3);}else if(d<r*1.65&&Math.abs(Math.sin(angle*6+d*23))<.12)tone.copy(steel);}
        v.addScaledVector(n,-(front?dent:thickness));pos.push(...v.toArray());col.push(...tone.toArray());
      }
    };
    for(const tri of triangles)emit(...tri);let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g=mergeVertices(g,1e-7);g.computeVertexNormals();return g;
  };
  const triangulation=T.ShapeUtils.triangulateShape(inset.map(p=>new T.Vector2(...p)),[]);
  parts.push(make(triangulation.map(t=>t.map(i=>inset[i])),true));
  parts.push(make(triangulation.map(t=>[inset[t[2]],inset[t[1]],inset[t[0]]]),false));
  const ps=[],cs=[];const add=(a,b,c,tone)=>{for(const p of[a,b,c]){ps.push(...p.toArray());cs.push(...new T.Color(tone).toArray());}};
  for(let i=0;i<points.length;i++){const j=(i+1)%points.length,steps=Math.ceil(Math.hypot(points[i][0]-points[j][0],points[i][1]-points[j][1])/(lod===0?.004:lod===1?.012:.06)),lerp=(a,b,t)=>[T.MathUtils.lerp(a[0],b[0],t),T.MathUtils.lerp(a[1],b[1],t)];for(let k=0;k<steps;k++){const u=k/steps,v=(k+1)/steps,ai=lerp(inset[i],inset[j],u),bi=lerp(inset[i],inset[j],v),ao=lerp(points[i],points[j],u),bo=lerp(points[i],points[j],v),a=map(...ai),b=map(...bi),c=map(...bo).addScaledVector(n,-bevel),d=map(...ao).addScaledVector(n,-bevel),e=map(...ai).addScaledVector(n,-thickness),f=map(...bi).addScaledVector(n,-thickness);const chipped=lod===0&&noise(...a.toArray())>.93;add(a,c,b,chipped?C.edge:color);add(a,d,c,chipped?C.edge:color);add(d,e,f,color);add(d,f,c,color);}}
  const edgeGeo=new T.BufferGeometry();edgeGeo.setAttribute('position',new T.Float32BufferAttribute(ps,3));edgeGeo.setAttribute('color',new T.Float32BufferAttribute(cs,3));edgeGeo.computeVertexNormals();parts.push(edgeGeo);
  return mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g));
}

function patch(map,nu,nv,{color=C.olive,thickness=.007,normalPoint=[0,.21,0],wrap=false,exteriorOnly=false}={}){
  const p=[],ix=[];for(let layer=0;layer<(exteriorOnly?1:2);layer++)for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const v=map(i/nu,j/nv),normal=v.clone().sub(V(...normalPoint)).normalize();v.addScaledVector(normal,-layer*thickness);p.push(...v.toArray());}
  const k=(nu+1)*(nv+1);for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);if(!exteriorOnly)ix.push(a+k,c+k,b+k,b+k,c+k,d+k);}
  if(!exteriorOnly)for(const sequence of [Array.from({length:nu+1},(_,i)=>i),Array.from({length:nu+1},(_,i)=>nv*(nu+1)+nu-i),...(wrap?[]:[Array.from({length:nv+1},(_,j)=>(nv-j)*(nu+1)),Array.from({length:nv+1},(_,j)=>j*(nu+1)+nu)])])for(let i=0;i<sequence.length-1;i++){const a=sequence[i],b=sequence[i+1];ix.push(a,a+k,b,b,a+k,b+k);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return paint(g,color);
}
const PROFILE=[[.075,.102,.102,-.115],[.14,.129,.140,-.140],[.23,.140,.148,-.149],[.275,.144,.167,-.147],[.31,.132,.149,-.137],[.34,.100,.108,-.111],[.36,.038,.034,-.046],[.367,.002,.001,-.003]];
function surface(y,t,offset=0){let i=0;while(i<PROFILE.length-2&&y>PROFILE[i+1][0])i++;const a=PROFILE[i],b=PROFILE[i+1],u=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1),w=T.MathUtils.lerp(a[1],b[1],u)+offset,f=T.MathUtils.lerp(a[2],b[2],u)+offset,r=T.MathUtils.lerp(a[3],b[3],u)-offset,ss=Math.sin(t),cc=Math.cos(t);return V(w*Math.sign(ss)*Math.abs(ss)**.82,y,(f+r)/2+(f-r)/2*Math.sign(cc)*Math.abs(cc)**.74);}

export async function buildBreachWarden(lod,referenceBounds){
  const detail=lod,n=detail===0?24:detail===1?10:6,root=new T.Group();root.name='BREACH_WARDEN_ROOT';root.userData={family:'breach-warden',lod,damage_level:0,static:lod===2,wear:'Authored service wear; not a gameplay damage level'};
  const armor=new T.MeshStandardMaterial({name:'WARDEN_CERAMIC_METAL_PALETTE',vertexColors:true,roughness:.74,metalness:.24});
  const glass=new T.MeshStandardMaterial({name:'WARDEN_RECESSED_VISOR',vertexColors:true,roughness:.18,metalness:.63});
  const groups={},parts={};for(const[id,{label}]of Object.entries(MODULES)){const g=new T.Group();g.name='PART_'+id;g.userData={module:id,label,engine_driven:lod!==2};root.add(g);groups[id]=g;parts[id]=[];}
  const add=(id,g)=>parts[id].push(g),box=(s,p,c,r=[0,0,0],rad=.0018)=>paint(transformed(detail===2?new T.BoxGeometry(...s):new RoundedBoxGeometry(...s,detail===0?3:1,rad),p,r),c);
  const cyl=(r,h,p,c,rot=[0,0,0],segments=n)=>paint(transformed(new T.CylinderGeometry(r,r,h,segments),p,rot),c);
  const tube=(pts,r,c,segments=detail===0?36:12,sides=detail===0?8:5)=>paint(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>V(...p))),segments,r,sides,false),c);
  const bolt=(id,p,normal=[0,0,1],r=.0035)=>{if(detail===2)return;const q=new T.Quaternion().setFromUnitVectors(V(0,1,0),V(...normal));for(const[rr,h,c,shift]of [[r*1.45,.0012,C.dark,0],[r,.0017,C.steel,.0009],[r*.48,.0018,C.dark,.0011]]){const g=new T.CylinderGeometry(rr,rr,h,detail===0?12:6);g.applyQuaternion(q);g.translate(...V(...p).addScaledVector(V(...normal),shift).toArray());add(id,paint(g,c));}if(detail===0){const g=new T.BoxGeometry(r*.85,.0006,.0009);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,0,1),V(...normal)));g.translate(...V(...p).addScaledVector(V(...normal),.0023).toArray());add(id,paint(g,C.rubber));}};
  const socket=(name,id,p,normal=[0,1,0])=>{const s=new T.Group();s.name=name;s.position.set(...p);s.quaternion.setFromUnitVectors(V(0,0,1),V(...normal));s.userData={role:'socket'};(groups[id]||root).add(s);};
  // Continuous open-bottom crown with a stepped rear carrier. No solid head filler.
  add('SHELL',patch((u,v)=>{const t=u*Math.PI*2,lo=.247+.024*Math.max(0,Math.cos(t))**2;return surface(lo+(.367-lo)*v,t);},detail===0?80:32,detail===0?25:9,{wrap:true,color:C.dark}));
  add('SHELL',patch((u,v)=>{const t=1.35+u*(Math.PI*2-2.7);return surface(.079+v*(.253-.079),t);},detail===0?64:22,detail===0?25:9,{color:C.dark}));
  // Raised segmented crown strips and rear service plates.
  for(const s of[-1,1])for(let j=0;j<3;j++){const t0=s*(.72+j*.86),g=patch((u,v)=>surface(.265+v*(.359-.265),t0+(u-.5)*.77,.004),detail===0?18:6,detail===0?20:7,{color:j===0?0x565a52:C.olive,thickness:.005});add('SHELL',g);}
  add('SHELL',patch((u,v)=>surface(.329+v*.033,(u-.5)*1.10,.005),detail===0?28:10,detail===0?12:5,{color:C.olive,thickness:.005}));
  for(const y of [.115,.173,.224]){const g=patch((u,v)=>surface(y+v*.037,1.7+u*2.88,.006),detail===0?38:14,3,{color:C.olive,thickness:.006});add('SHELL',g);}
  add('SHELL',patch((u,v)=>surface(.351+v*.016,u*Math.PI*2,.002),detail===0?64:24,detail===0?10:4,{color:C.olive,thickness:.004,wrap:true}));
  add('SHELL',cyl(.004,.0004,[0,.3668,-.001],C.olive,[0,0,0],detail===0?24:10));
  // Broad forehead slab with real shallow dents, broken paint and two muted stripes.
  const browMap=(x,y)=>{const w=surface(y,Math.PI/2).x,t=Math.asin(Math.sign(x)*Math.min(.995,Math.abs(x)/w)**(1/.82)),p=surface(y,t);p.z+=.011;return p;};
  add('BROW',plate([[-.137,.277],[-.124,.305],[-.088,.329],[0,.337],[.088,.329],[.124,.305],[.137,.277],[.113,.264],[-.113,.264]],browMap,{lod:detail,thickness:.012,bevel:.0038,scars:[[.063,.313,.0105],[-.028,.288,.004]],stripe:true}));
  if(detail!==0)for(const x of[-.073,-.053])add('BROW',patch((u,v)=>browMap(x+.014*u+.011*v,.299+.027*v).add(V(0,0,.002)),2,4,{color:C.gold,exteriorOnly:true}));
  for(const[x,y]of[[-.115,.283],[.115,.283],[-.083,.320],[.083,.320],[-.025,.271],[.025,.271]]){
    const tangentX=browMap(x+.0001,y).sub(browMap(x-.0001,y)),tangentY=browMap(x,y+.0001).sub(browMap(x,y-.0001));
    bolt('BROW',browMap(x,y).toArray(),tangentX.cross(tangentY).normalize().toArray(),.0031);
  }
  // Narrow glass recessed behind the brow. The perimeter seal is physically separate.
  const visor=(u,v)=>{const t=(u-.5)*2.48,edge=Math.abs(t)/1.24,lo=.192+.024*edge,hi=.266-.021*edge,y=T.MathUtils.lerp(lo,hi,v);return V(.134*Math.sin(t),y,.011+.137*Math.cos(t));};
  add('VISOR',patch(visor,detail===0?64:24,detail===0?12:4,{color:C.glass,thickness:.003}));
  for(const v of [0,1])add('VISOR',tube(Array.from({length:33},(_,i)=>visor(i/32,v).toArray()),.0038,C.rubber,detail===0?64:24));
  for(const u of[0,1])add('VISOR',tube(Array.from({length:5},(_,i)=>visor(u,i/4).toArray()),.0038,C.rubber,8));
  // Cheeks sweep around the visor; three layers remain readable in profile.
  const cheekFront=(x,y)=>V(x,y,.170-.090*(Math.abs(x)/.145)**2);
  for(const side of ['L','R']){const s=side==='L'?1:-1,id='CHEEK_'+side,front=plate([[.038,.195],[.063,.218],[.127,.238],[.144,.218],[.132,.173],[.089,.132],[.045,.141]],cheekFront,{lod:detail,bevel:.0025});add(id,s===1?front:mirror(front));
    const sideMap=(u,y)=>V(.145-.014*((-u-.01)/.13)**2,y,-u),poly=[[.105,.204],[.027,.231],[-.038,.217],[-.066,.169],[-.031,.142],[.041,.141],[.090,.169]].map(([z,y])=>[-z,y]);const sidePlate=plate(poly,sideMap,{lod:detail,normal:[1,0,0],thickness:.007,bevel:.0025});add(id,s===1?sidePlate:mirror(sidePlate));
    for(const[z,y]of[[.022,.221],[-.036,.172],[.074,.173]])bolt(id,[s*(.147-.014*((z-.01)/.13)**2),y,z],[s,0,0],.0025);
    // Ear cassette, dark seat, armored oval and exposed catches.
    for(const[r,h,x,c]of[[.045,.010,.146,C.dark]]){const g=cyl(r,h,[0,0,0],c,[0,0,Math.PI/2],detail===0?32:12);g.scale(1,1.22,1);g.translate(s*x,.192,-.063);add(id,g);}
    const earPoints=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return[.063+.035*Math.cos(a),.192+.046*Math.sin(a)];});const ear=plate(earPoints,(u,y)=>V(.161,y,-u),{lod:detail,normal:[1,0,0],color:C.olive,thickness:.007,bevel:.003});add(id,s===1?ear:mirror(ear));
    add(id,box([.005,.030,.007],[s*.165,.188,-.067],C.dark));
    for(const z of[-.086,-.040])add(id,box([.005,.020,.005],[s*.164,.185,z],C.edge));
    for(const y of [.155,.229])bolt(id,[s*.162,y,-.063],[s,0,0],.0026);
    // Removable lower jaw; port side is a lighter replacement ceramic plate.
    const jawMap=(u,y)=>V(.141-.030*((-u)/.15)**2,y,-u),jaw=plate([[.128,.153],[.030,.143],[-.041,.123],[-.046,.079],[.009,.065],[.103,.092],[.142,.121]].map(([z,y])=>[-z,y]),jawMap,{lod:detail,normal:[1,0,0],color:side==='L'?C.ivory:C.olive,thickness:.008,bevel:.0025});add('JAW_'+side,s===1?jaw:mirror(jaw));
    const frontJaw=plate([[.033,.148],[.071,.153],[.130,.130],[.123,.091],[.070,.076],[.033,.102]],(x,y)=>V(x,y,.181-.075*(x/.145)**2),{lod:detail,color:side==='L'?C.ivory:C.olive,thickness:.007,bevel:.002});add('JAW_'+side,s===1?frontJaw:mirror(frontJaw));
    for(const[z,y]of [[.118,.125],[-.030,.097]])bolt('JAW_'+side,[s*(.143-.030*(z/.15)**2),y,z],[s,0,0],.0034);
    for(const z of[-.028,.009])add(id,box([.007,.009,.022],[s*.147,.149,z],C.dark));
  }
  // Compact central respirator, with open vent slots over a recessed filter bed.
  const noseMap=(x,y)=>V(x,y,.174+.028*(.21-y)/.11);
  add('RESPIRATOR',plate([[-.023,.212],[.023,.212],[.035,.192],[.030,.161],[-.030,.161],[-.035,.192]],noseMap,{lod:detail,color:C.dark,bevel:.0025,thickness:.010}));
  add('RESPIRATOR',plate([[-.029,.169],[.029,.169],[.042,.149],[.036,.107],[.022,.095],[-.022,.095],[-.036,.107],[-.042,.149]],(x,y)=>V(x,y,.190),{lod:detail,color:C.dark,thickness:.018,bevel:.0025}));
  add('RESPIRATOR',box([.069,.060,.009],[0,.132,.195],C.rubber));
  const outer=new T.Shape();outer.moveTo(-.036,.109);outer.lineTo(-.040,.149);outer.lineTo(-.027,.166);outer.lineTo(.027,.166);outer.lineTo(.040,.149);outer.lineTo(.036,.109);outer.lineTo(.023,.101);outer.lineTo(-.023,.101);
  for(const x of[-.018,0,.018]){const hole=new T.Path();hole.absarc(x,.118,.0046,Math.PI,0,false);hole.lineTo(x+.0046,.146);hole.absarc(x,.146,.0046,0,Math.PI,false);outer.holes.push(hole);}
  const grille=new T.ExtrudeGeometry(outer,{depth:.003,bevelEnabled:true,bevelSegments:detail===0?2:1,steps:1,bevelSize:.0009,bevelThickness:.0008,curveSegments:detail===0?8:3});grille.translate(0,0,.202);add('RESPIRATOR',paint(grille,C.olive));
  if(detail===0)for(let i=0;i<11;i++)add('RESPIRATOR',box([.058,.0007,.0007],[0,.112+i*.0038,.200],C.steel,[0,0,0],.00015));
  for(const[x,y]of[[-.021,.201],[.021,.201],[-.027,.158],[.027,.158]])bolt('RESPIRATOR',noseMap(x,y).toArray(),[0,0,1],.0022);
  // The ceramic bar floats off the left temple on two small insulated brackets.
  for(const z of[-.031,.055]){add('TEMPLE_BAR',box([.025,.012,.011],[.153,.278,z],C.dark));add('TEMPLE_BAR',box([.014,.020,.010],[.168,.279,z],C.steel));bolt('TEMPLE_BAR',[.179,.278,z],[1,0,0],.0022);}
  add('TEMPLE_BAR',box([.022,.022,.105],[.178,.280,.012],C.ivory,[0,0,0],.0025));
  add('TEMPLE_BAR',box([.0015,.0047,.029],[.1896,.282,.037],C.dark,[0,0,0],.0005));
  add('TEMPLE_BAR',box([.0016,.0021,.024],[.1905,.282,.037],C.cyan,[0,0,0],.0005));
  for(const z of[-.019,-.009,.001])add('TEMPLE_BAR',box([.002,.002,.002],[.177,.267,z],C.gold,[0,0,0],.0002));
  // Ribbed compliant neck seal, segmented hollow collar and front locking buckle.
  for(const y of[.060,.074,.088]){const g=new T.TorusGeometry(.079,.008,detail===0?12:6,detail===0?96:32);g.rotateX(Math.PI/2);g.scale(1,1,1.09);g.translate(0,y,0);add('COLLAR',paint(g,C.rubber));}
  for(let i=0;i<8;i++){const t=i*Math.PI/4,lo=t-.34,hi=t+.34;add('COLLAR',patch((u,v)=>{const a=T.MathUtils.lerp(lo,hi,u);return V(.111*Math.sin(a),.014+v*.033,.116*Math.cos(a));},detail===0?12:4,2,{color:i===0?C.dark:C.olive,thickness:.012,normalPoint:[0,.030,0]}));}
  add('COLLAR',box([.044,.050,.012],[0,.025,.120],C.dark,[0,0,0],.003));
  add('COLLAR',plate([[-.017,.006],[.017,.006],[.019,.045],[.012,.053],[-.012,.053],[-.019,.045]],(x,y)=>V(x,y,.130),{lod:detail,color:C.edge,thickness:.005,bevel:.0015}));
  add('COLLAR',box([.012,.030,.004],[0,.030,.134],C.dark));
  // Continuous lower-face carrier behind the overlapping cheek/jaw plates.
  add('LINER',patch((u,v)=>{const t=(u-.5)*2.76,a=Math.abs(t)/1.38,y=T.MathUtils.lerp(.095+.014*a,.196+.029*a,v);return V(.132*Math.sin(t),y,.008+.137*Math.cos(t));},detail===0?48:20,detail===0?12:5,{color:C.dark,thickness:.005}));
  // Segmented interior liner is open at the face and neck.
  add('LINER',patch((u,v)=>{const t=1.40+u*(Math.PI*2-2.80),y=.110+v*.185;return surface(y,t,-.012);},detail===0?48:18,detail===0?24:8,{color:C.liner,thickness:.004}));
  for(const s of[-1,1])add('LINER',box([.010,.065,.045],[s*.112,.191,-.025],C.rubber,[0,0,s*.08],.004));
  // Small workshop markings and scuffed seams, omitted at distance by simplification.
  if(detail===0){
    for(let i=0;i<28;i++){const y=.26+noise(i,2,1)*.095,t=.50+noise(i,1,2)*2.5,a=surface(y,t,.001),b=surface(y+.001+noise(i,4,1)*.003,t+.012,.001);add('SHELL',tube([a.toArray(),b.toArray()],.00032,C.edge,2,3));}
    // Replacement identifier: three etched strokes and two boxed service marks.
    for(const[z,y,w]of [[.062,.100,.026],[.065,.104,.021],[.056,.108,.014]])add('JAW_L',box([.0006,.0007,w],[.143-.03*(z/.15)**2,y,z],C.dark,[0,0,0],.0001));
    for(const y of [.185,.194])for(const[dz,dy,w,h]of[[0,0,.007,.0006],[0,.006,.007,.0006],[-.0032,.003,.0006,.006],[.0032,.003,.0006,.006]])add('CHEEK_L',box([.0006,h,w],[.146,y+dy,.025+dz],C.gold,[0,0,0],.0001));
  }
  // Reduced tiers use continuous crown surfaces instead of simplifying overlapping
  // thin panels into each other. The distance view omits hidden lining and hardware.
  if(detail!==0){
    parts.SHELL=[];const far=detail===2,nu=far?20:32,nv=far?9:14;
    add('SHELL',patch((u,v)=>{const t=u*Math.PI*2,lo=.247+.024*Math.max(0,Math.cos(t))**2;return surface(lo+(.367-lo)*v,t,.004);},nu,nv,{color:C.olive,wrap:true,exteriorOnly:far}));
    add('SHELL',patch((u,v)=>{const t=1.35+u*(Math.PI*2-2.7),hi=.247+.024*Math.max(0,Math.cos(t))**2;return surface(.079+v*(hi-.079),t,.004);},far?12:22,far?6:8,{color:C.olive,exteriorOnly:far}));
    add('SHELL',cyl(.006,.0004,[0,.3668,-.001],C.olive,[0,0,0],far?8:16));
    if(!far){for(const t of[-2.9,-2.2,-1.35,-.50,.50,1.35,2.2,2.9])add('SHELL',patch((u,v)=>surface(.270+.080*v,t+(u-.5)*.019,.0085),1,10,{color:C.dark,exteriorOnly:true}));for(const y of[.145,.204])add('SHELL',patch((u,v)=>surface(y+v*.004,1.5+u*(Math.PI*2-3),.0085),24,1,{color:C.dark,exteriorOnly:true}));}
    if(far){
      parts.VISOR=[patch(visor,12,3,{color:C.glass,exteriorOnly:true})];parts.LINER=[];parts.COLLAR=[];
      add('LINER',patch((u,v)=>{const t=(u-.5)*2.76,a=Math.abs(t)/1.38,y=T.MathUtils.lerp(.095+.014*a,.196+.029*a,v);return V(.132*Math.sin(t),y,.008+.137*Math.cos(t));},12,4,{color:C.dark,exteriorOnly:true}));
      const seal=new T.TorusGeometry(.079,.012,4,24);seal.rotateX(Math.PI/2);seal.scale(1,1,1.09);seal.translate(0,.074,0);add('COLLAR',paint(seal,C.rubber));
      for(let i=0;i<8;i++)add('COLLAR',patch((u,v)=>{const a=i*Math.PI/4+(u-.5)*.68;return V(.111*Math.sin(a),.014+v*.033,.116*Math.cos(a));},2,1,{color:C.olive,exteriorOnly:true}));
      add('COLLAR',box([.044,.050,.012],[0,.025,.120],C.dark));add('COLLAR',box([.034,.040,.005],[0,.025,.129],C.edge));
    }
  }
  const gameBudgets={SHELL:2400,BROW:850,VISOR:850,CHEEK_L:750,CHEEK_R:750,JAW_L:450,JAW_R:450,RESPIRATOR:850,TEMPLE_BAR:430,COLLAR:850,LINER:850};
  for(const[id,gs]of Object.entries(parts)){if(!gs.length){const marker=new T.Group();marker.name='SURFACE_'+id;groups[id].add(marker);continue;}let g=mergeGeometries(gs.map(g=>g.index?g.toNonIndexed():g));g=clean(g);if(lod===1&&!['SHELL','BROW'].includes(id))g=await simplify(g,gameBudgets[id]);if(lod===1&&id==='SHELL'&&referenceBounds){g.computeBoundingBox();const scale=referenceBounds.min[2]/g.boundingBox.min.z,p=g.attributes.position;for(let i=0;i<p.count;i++)if(p.getZ(i)<0)p.setZ(i,p.getZ(i)*scale);g.computeVertexNormals();}const mesh=new T.Mesh(g,id==='VISOR'?glass:armor);mesh.name='SURFACE_'+id;mesh.userData={module:id};groups[id].add(mesh);}
  socket('SOCKET_NECK',null,[0,.055,0],[0,-1,0]);socket('SOCKET_HEAD_DATUM',null,SPEC.head_datum_m);socket('SOCKET_TEMPLE_DEVICE','TEMPLE_BAR',[.190,.280,.012],[1,0,0]);socket('SOCKET_RESPIRATOR','RESPIRATOR',[0,.166,.181],[0,0,1]);socket('SOCKET_VISOR','VISOR',[0,.231,.145],[0,0,1]);
  const distance=new T.Group();distance.name='DISTANCE_SURFACE';root.add(distance);
  if(lod===2){root.updateMatrixWorld(true);const gs=[],meshes=[];root.traverse(o=>{if(o.isMesh){gs.push(geometryFor(o,root));meshes.push(o);}});for(const m of meshes){const marker=new T.Group();marker.name=m.name;marker.userData={...m.userData,static_lookup_only:true};m.parent.add(marker);m.removeFromParent();}distance.removeFromParent();const g=clean(mergeGeometries(gs));if(referenceBounds){g.computeBoundingBox();const b=g.boundingBox,p=g.attributes.position;for(let i=0;i<p.count;i++)for(let j=0;j<3;j++){const axis=['x','y','z'][j],u=(p.getComponent(i,j)-b.min[axis])/(b.max[axis]-b.min[axis]);p.setComponent(i,j,T.MathUtils.lerp(referenceBounds.min[j],referenceBounds.max[j],u));}g.computeVertexNormals();}const mesh=new T.Mesh(g,armor);mesh.name='DISTANCE_SURFACE';root.add(mesh);root.traverse(n=>{n.userData.static_lookup_only=true;});}
  return root;
}
