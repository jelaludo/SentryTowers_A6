// Original AUREL-03 modular anatomical chassis. No third-party mesh data.
import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {prep,cyl,ring,box,socket} from './settlement-industry-shape.mjs';
import {buildHand} from './hand-lab-shape.mjs';
import {buildFoot} from './foot-lab-shape.mjs';
import {DIM,createRig} from '../../assets/robot-assembly/runtime.js';
import {handMountRotation} from '../../assets/nisoku02/runtime.js';
const C={metal:0xc2c9c4,pale:0xe3ddd0,steel:0x7a939c,dark:0x21333c,black:0x101b22,gold:0xb7a078,signal:0xb8e0df};
const V=p=>new T.Vector3(...p);
function reflect(g){g.scale(-1,1,1);if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3)[a[i+1],a[i+2]]=[a[i+2],a[i+1]];}else for(const a of Object.values(g.attributes))for(let i=0;i<a.count;i+=3)for(let k=0;k<a.itemSize;k++){const x=(i+1)*a.itemSize+k,y=(i+2)*a.itemSize+k;[a.array[x],a.array[y]]=[a.array[y],a.array[x]];}}
function clean(gs){const all=mergeGeometries(gs.map(g=>g.index?g.toNonIndexed():g),false),w=mergeVertices(all,1e-6),p=w.attributes.position,ix=w.index.array,out=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let i=0;i<ix.length;i+=3){a.fromBufferAttribute(p,ix[i]);b.fromBufferAttribute(p,ix[i+1]);c.fromBufferAttribute(p,ix[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-22)out.push(ix[i],ix[i+1],ix[i+2]);}w.setIndex(out);return w;}
function curve(points,r,lod,color,flat=1,segments=0){const path=new T.CatmullRomCurve3(points.map(V)),g=new T.TubeGeometry(path,segments||(lod===0?32:12),r,lod===0?10:6,false);if(flat!==1){/* Tube radius is deliberately round for conduits. Ribs use ribbon below. */}return prep(g,color);}
function ribbon(points,width,thick,lod,color){const path=new T.CatmullRomCurve3(points.map(V)),n=lod===0?36:14,p=[],ix=[];for(let i=0;i<=n;i++){const c=path.getPointAt(i/n),t=path.getTangentAt(i/n),v=new T.Vector3(0,1,0).addScaledVector(t,-t.y).normalize(),w=new T.Vector3().crossVectors(t,v).normalize();for(const [x,y]of [[-1,-1],[-1,1],[1,1],[1,-1]])p.push(...c.clone().addScaledVector(v,x*width/2).addScaledVector(w,y*thick/2).toArray());}for(let i=0;i<n;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;ix.push(a,b,a+4,b,b+4,a+4);}ix.push(0,2,1,0,3,2);const k=n*4;ix.push(k,k+1,k+2,k,k+2,k+3);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,color);}
export function buildAssembly(lod=1,headStyle='frame'){
 const scene=new T.Scene();scene.name='AUREL_03_ASSEMBLY';const root=new T.Group();root.name='AUREL_03_ROOT';root.userData={family:'robot-assembly',designation:'AUREL-03',lod,damage_level:0,static:false,units:'metres',up:'+Y',forward:'+Z',head:headStyle};scene.add(root);
 const material=new T.MeshStandardMaterial({name:'ANATOMY_METAL_PALETTE',vertexColors:true,metalness:.62,roughness:.38});
 const modules={},n=lod===0?24:10;
 const node=(parent,name,p=[0,0,0])=>{const b=new T.Bone();b.name=name;b.position.fromArray(p);b.userData={role:'engine_pivot'};parent.add(b);return b;};
 function module(id,parent,pos){const group=new T.Group();group.name='PART_'+id;group.position.fromArray(pos);group.userData={module:id,attachment:'SOCKET_'+id+'_ATTACH',role:'assembly_module'};parent.add(group);const bones=[],parts=[];const bone=(par,name,p)=>{const b=node(par,id+'_'+name,p);bones.push(b);return b;};const base=bone(group,'FRAME',[0,0,0]);
  const add=(b,g)=>{const count=g.attributes.position.count,ii=new Uint16Array(count*4),ww=new Float32Array(count*4);for(let i=0;i<count;i++){ii[i*4]=bones.indexOf(b);ww[i*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ii,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(ww,4));group.updateMatrixWorld(true);const m=new T.Matrix4().copy(group.matrixWorld).invert().multiply(b.matrixWorld);g.applyMatrix4(m);parts.push(g);};
  const finish=()=>{const mesh=new T.SkinnedMesh(clean(parts),material);mesh.name=id+'_GEOMETRY';group.add(mesh);group.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));};
  const normal=id.startsWith('ARM_')?[id.endsWith('_L')?-1:1,0,0]:id.startsWith('LEG_')?[0,1,0]:[0,-1,0];socket(base,'SOCKET_'+id+'_ATTACH',[0,0,0],'aurel03_'+id.toLowerCase(),normal);modules[id]={group,base,bone,add,finish};return modules[id];
 }
 function round(size,p,col=C.metal,r=.004){return prep(new RoundedBoxGeometry(...size,lod===0?2:1,r),col,p);}
 function rod(a,b,r,col=C.steel,r2=r){const va=V(a),vb=V(b),d=vb.clone().sub(va),g=new T.CylinderGeometry(r2,r,d.length(),n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));return prep(g,col,va.add(vb).multiplyScalar(.5).toArray());}
 function joint(m,b,r,w){m.add(b,cyl(r,w,n,[0,0,0],C.dark,[0,0,Math.PI/2]));for(const s of [-1,1]){m.add(b,cyl(r*.76,.005,n,[s*(w/2+.002),0,0],C.metal,[0,0,Math.PI/2]));m.add(b,ring(r*.57,r*.065,n,[s*(w/2+.005),0,0],C.gold,[0,Math.PI/2,0]));if(lod===0)for(let i=0;i<6;i++){const a=i*Math.PI/3;m.add(b,cyl(.0015,.0015,6,[s*(w/2+.0055),Math.sin(a)*r*.58,Math.cos(a)*r*.58],C.black,[0,0,Math.PI/2]));}}}
 const pelvis=module('PELVIS',root,[0,DIM.hipY,0]),pb=pelvis.base;
 // Iliac wings, sacral block and open obturator loops; deliberately no diaper-shaped shell.
 pelvis.add(pb,round([.054,.112,.046],[0,.053,-.043],C.dark));pelvis.add(pb,rod([0,.080,-.043],[0,.156,-.034],.014,C.steel));
 for(const s of [-1,1]){
  pelvis.add(pb,ribbon([[s*.024,.105,-.04],[s*.075,.150,-.035],[s*.139,.128,-.018],[s*.123,.074,.035],[s*.090,.015,.008]],.040,.009,lod,C.metal));
  pelvis.add(pb,ribbon([[s*.027,.093,-.053],[s*.096,.082,-.042],[s*.09,0,0],[s*.055,-.060,.050],[s*.013,-.053,.070],[s*.017,.005,.073],[s*.090,.015,.008]],.018,.008,lod,C.steel));
  pelvis.add(pb,rod([0,.012,-.04],[s*.09,0,0],.017,C.dark));socket(pb,'SOCKET_HIP_'+(s===1?'L':'R'),[s*DIM.hipX,0,0],'aurel03_hip',[0,-1,0]);
 }
 pelvis.add(pb,round([.038,.025,.027],[0,-.048,.062],C.gold));socket(pb,'SOCKET_LUMBAR',[0,.15,0],'aurel03_lumbar',[0,1,0]);pelvis.finish();
 const rib=module('RIBCAGE',pb,[0,.15,0]),sp=rib.bone(rib.base,'SPINE',[0,0,0]);
 // Curved lumbar/thoracic column; twelve paired metal ribs mirror the thoracic plan.
 rib.add(sp,curve([[0,-.004,-.034],[0,.10,-.020],[0,.24,-.071],[0,.39,-.072],[0,.45,-.035]],.014,lod,C.dark));
 for(let i=0;i<17;i++){const y=.012+i*.024,z=y<.12?-.026:-.067;rib.add(sp,round([.039,.014,.034],[0,y,z],C.metal,.003));if(lod===0)rib.add(sp,rod([0,y,z-.010],[0,y+.006,z-.041],.004,C.steel));}
 const widths=[.072,.097,.119,.136,.146,.149,.148,.143,.134,.120,.097,.072];
 for(let i=0;i<12;i++)for(const s of [-1,1]){
  const y=.379-i*.023,w=widths[i],back=-.071,front=.095-i*.0015;
  let pts=[[s*.019,y,back],[s*w*.62,y+.001,back-.018],[s*w,y-.023,.002],[s*w*.78,y-.046,front*.82]];
  if(i<7)pts.push([s*.025,y-.041,.100-i*.002]);
  else if(i<10)pts.push([s*(.031+(i-7)*.013),.205-(i-7)*.020,.079]);
  else pts=pts.slice(0,3).concat([[s*w*.80,y-.039,.045]]);
  rib.add(sp,ribbon(pts,i<2?.013:.011,.006,lod,C.metal));
  if(lod===0)rib.add(sp,cyl(.006,.006,12,[s*.021,y,-.075],C.gold,[Math.PI/2,0,0]));
 }
 // A narrow segmented sternum and two compliant costal conduits.
 rib.add(sp,ribbon([[-.023,.386,.094],[0,.377,.104],[.023,.386,.094]],.027,.012,lod,C.pale));
 rib.add(sp,round([.025,.129,.012],[0,.294,.096],C.pale));rib.add(sp,round([.012,.035,.009],[0,.211,.088],C.steel));
 for(const s of [-1,1]){
  rib.add(sp,curve([[s*.020,.232,.095],[s*.042,.188,.087],[s*.080,.151,.064],[s*.117,.151,.037]],.004,lod,C.gold));
  rib.add(sp,curve([[s*.018,.395,.080],[s*.073,.406,.060],[s*.129,.390,.037],[s*DIM.shoulderX,.380,0]],.009,lod,C.metal));
  rib.add(sp,ribbon([[s*.048,.354,-.091],[s*.132,.373,-.088],[s*.148,.319,-.076],[s*.073,.255,-.086],[s*.048,.354,-.091]],.022,.007,lod,C.steel));
  rib.add(sp,rod([s*.130,.363,-.067],[s*DIM.shoulderX,.380,0],.011,C.dark));
  rib.add(sp,curve([[s*.029,.028,-.018],[s*.052,.105,-.028],[s*.052,.206,-.077],[s*.037,.356,-.087]],.004,lod,C.black));
  socket(sp,'SOCKET_SHOULDER_'+(s===1?'L':'R'),[s*DIM.shoulderX,DIM.shoulderY-(DIM.hipY+.15),0],'aurel03_shoulder',[s,0,0]);
 }
 socket(sp,'SOCKET_HEAD',[0,.460,0],'aurel03_neck',[0,1,0]);socket(sp,'SOCKET_THORACIC_SERVICE',[0,.260,-.1],'service');rib.finish();
 for(const side of ['L','R']){
  const s=side==='L'?1:-1,arm=module('ARM_'+side,sp,[s*DIM.shoulderX,DIM.shoulderY-(DIM.hipY+.15),0]),sh=arm.bone(arm.base,'SHOULDER',[0,0,0]),el=arm.bone(sh,'ELBOW',[0,-DIM.upperArm,0]),wr=arm.bone(el,'WRIST',[0,-DIM.forearm,0]);
  joint(arm,sh,.035,.061);joint(arm,el,.025,.052);
  arm.add(sh,rod([0,-.038,0],[0,-DIM.upperArm+.031,0],.018,C.metal,.023));
  arm.add(sh,rod([s*.026,-.054,.016],[s*.018,-.220,.017],.008,C.dark));arm.add(sh,rod([s*.018,-.18,.017],[s*.009,-.274,.017],.0045,C.steel));
  arm.add(sh,curve([[0,-.023,-.028],[-s*.026,-.10,-.023],[-s*.024,-.229,-.025],[0,-.289,-.027]],.0035,lod,C.black));
  // Separate radius / ulna rails taper toward a compact wrist coupling.
  for(const x of [-.016,.016])arm.add(el,rod([x,-.027,0],[x*.42,-DIM.forearm+.018,0],.010,C.metal,.013));
  arm.add(el,rod([0,-.034,-.016],[0,-.185,-.014],.008,C.dark));arm.add(el,rod([0,-.15,-.014],[0,-.241,-.005],.004,C.steel));
  arm.add(wr,cyl(.016,.032,n,[0,.013,0],C.dark));socket(wr,'SOCKET_WRIST_'+side,[0,0,0],'aurel01_wrist',[0,-1,0]);arm.finish();
  const leg=module('LEG_'+side,pb,[s*DIM.hipX,0,0]),hip=leg.bone(leg.base,'HIP',[0,0,0]),knee=leg.bone(hip,'KNEE',[0,-DIM.thigh,0]),ankle=leg.bone(knee,'ANKLE',[0,-DIM.shin,0]);
  joint(leg,hip,.041,.067);joint(leg,knee,.030,.062);
  leg.add(hip,rod([0,-.043,0],[0,-DIM.thigh+.034,0],.026,C.metal,.031));
  for(const x of [-.028,.028]){leg.add(hip,rod([x,-.063,.010],[x*.71,-.289,.014],.010,C.dark));leg.add(hip,rod([x*.71,-.20,.014],[x*.50,-.386,.014],.0055,C.steel));}
  leg.add(hip,curve([[0,-.030,-.039],[s*.033,-.10,-.027],[s*.028,-.32,-.028],[0,-.407,-.033]],.004,lod,C.black));
  leg.add(knee,round([.043,.053,.018],[0,-.009,.029],C.pale,.007));
  leg.add(knee,rod([s*.010,-.037,.005],[0,-DIM.shin+.022,0],.019,C.metal,.024));
  leg.add(knee,rod([-s*.025,-.044,-.012],[-s*.018,-DIM.shin+.026,-.010],.007,C.steel));
  leg.add(knee,rod([0,-.048,-.029],[0,-.246,-.024],.012,C.dark));leg.add(knee,rod([0,-.21,-.024],[0,-.362,-.008],.006,C.steel));
  leg.add(ankle,cyl(.021,.032,n,[0,.012,0],C.dark));socket(ankle,'SOCKET_ANKLE_'+side,[0,0,0],'aurel02_ankle',[0,-1,0]);leg.finish();
  for(const kind of ['HAND','FOOT']){
   const id=kind+'_'+side,source=kind==='HAND'?buildHand(lod===0?0:1,{economy:lod!==0}):buildFoot(lod===0?0:1,{economy:lod!==0}),parent=kind==='HAND'?wr:ankle;
   const g=new T.Group();g.name='PART_'+id;g.userData={module:id,source:kind==='HAND'?'AUREL-01':'AUREL-02',source_assignment:side==='R'?'reflected':'source',role:'assembly_module'};parent.add(g);
   if(side==='R'){reflect(source.geometry);source.traverse(o=>{if(o!==source){o.position.x*=-1;o.quaternion.y*=-1;o.quaternion.z*=-1;}});}
   source.traverse(o=>{if(o.name)o.name=id+'_'+o.name;});source.name=id+'_GEOMETRY';g.add(source);
   // The assembly shares one finish per component. Full source geometry is retained.
   source.geometry.clearGroups();source.material=new T.MeshStandardMaterial({name:'AUREL_EXTREMITY_PALETTE',vertexColors:true,metalness:.25,roughness:.45});
   if(kind==='HAND'){g.scale.setScalar(DIM.handScale);g.quaternion.fromArray(handMountRotation(side));}
   else {source.position.set(0,-.14,.073);}
   // Rebind mirrored local frames before applying the parent transform.
   source.updateMatrixWorld(true);source.bind(new T.Skeleton(source.skeleton.bones));
   modules[id]={group:g};
  }
 }
 const head=module('HEAD',sp,[0,.460,0]),yaw=head.bone(head.base,'YAW',[0,0,0]),pitch=head.bone(yaw,'PITCH',[0,.015,0]);
 head.add(yaw,cyl(.024,.039,n,[0,.005,0],C.dark));for(const y of [-.010,.004,.018])head.add(yaw,ring(.026,.002,n,[0,y,0],C.metal));
 // Adult cranial envelope, shallow orbital brow and a slim mechanical mandible.
 const crown=.2207;
 for(const s of [-1,1]){
  head.add(pitch,ribbon([[s*.015,.016,.061],[s*.058,.048,.053],[s*.072,.106,.021],[s*.068,.168,-.013],[s*.037,.215,-.016],[0,crown,-.014]],.020,.006,lod,C.metal));
  head.add(pitch,ribbon([[s*.059,.060,.046],[s*.055,.079,-.063],[s*.043,.158,-.084],[s*.025,.210,-.047],[0,crown,-.014]],.016,.006,lod,C.steel));
  head.add(pitch,rod([s*.061,.088,-.001],[s*.034,.031,.062],.007,C.dark));
  head.add(pitch,cyl(.015,.009,n,[s*.074,.105,.007],C.dark,[0,0,Math.PI/2]));
 }
 head.add(pitch,ribbon([[-.062,.137,.047],[0,.146,.077],[.062,.137,.047]],.021,.010,lod,C.pale));
 head.add(pitch,round([.089,.012,.015],[0,.128,.071],C.black,.003));head.add(pitch,round([.055,.003,.002],[0,.129,.079],C.signal,.0009));
 head.add(pitch,ribbon([[-.052,.055,.052],[0,.021,.075],[.052,.055,.052]],.019,.009,lod,C.pale));
 head.add(pitch,rod([0,.021,.015],[0,.184,-.051],.013,C.dark));
 if(headStyle==='sensor'){
  const g=new T.SphereGeometry(1,lod===0?40:16,lod===0?20:8,0,Math.PI*2,0,Math.PI*.56);g.scale(.074,.107,.084);head.add(pitch,prep(g,C.pale,[0,.123,-.012]));
  head.add(pitch,round([.091,.044,.023],[0,.095,.053],C.steel,.008));
 }else for(const z of [-.045,.025])head.add(pitch,ribbon([[-.061,.173,z],[0,.218,z-.01],[.061,.173,z]],.013,.006,lod,C.pale));
 socket(pitch,'SOCKET_VISION',[0,.129,.083],'optical_axis');head.finish();
 root.updateMatrixWorld(true);createRig(scene).pose();return {scene,modules};
}
