import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {applyStride,applyCup,STATIONS,STANDARD,STRIDE,CUP} from '../../assets/pallet-cargo/runtime.js';

const C={ivory:0xd8cfbc,edge:0xb9b3a6,dark:0x30383d,rubber:0x1d252a,steel:0x879399,amber:0xe4a83e,light:0xffd177,glass:0x142c36};
const Y=new T.Vector3(0,1,0);
export function buildModule(module,lod=0){
 const root=new T.Group();root.name=module.toUpperCase()+'_ROOT';
 root.userData={family:'pallet_cargo',module,lod,damage_level:0,static:lod===2,standard:'PCS_120_100_V1',units:'metres',...STANDARD};
 const material=new T.MeshStandardMaterial({name:'PCS_PALETTE',vertexColors:true,roughness:.59,metalness:.28});
 const n=lod===0?32:lod===1?12:6;
 const group=(name,parent=root,p=[0,0,0],data={})=>{const o=new T.Group();o.name=name;o.position.set(...p);o.userData=data;parent.add(o);return o;};
 function bevel(size,b){
  const h=size.map(v=>v/2);b=Math.min(b,...h.map(v=>v*.45));const vs=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])for(let a=0;a<3;a++)vs.push(new T.Vector3(...h.map((v,i)=>[x,y,z][i]*(v-(a===i?0:b)))));
  return new ConvexGeometry(vs);
 }
 const box=(s,c,p=[0,0,0],b=0,rot=[0,0,0])=>[b?bevel(s,b):new T.BoxGeometry(...s),c,p,rot];
 const cyl=(r,h,c,p=[0,0,0],rot=[0,0,0],segments=n)=>[new T.CylinderGeometry(r,r,h,segments),c,p,rot];
 const ring=(outer,inner,h,c,p,segments=n)=>{
  const s=new T.Shape(),hole=new T.Path();s.absarc(0,0,outer,0,Math.PI*2,false);hole.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(hole);
  const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:Math.max(3,segments/2),steps:1});g.rotateX(-Math.PI/2);g.translate(0,-h/2,0);return [g,c,p];
 };
 function beam(a,b,r,c){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const g=new T.CylinderGeometry(r,r,d.length(),lod===0?16:6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(Y,d.normalize()));return[g,c,av.add(bv).multiplyScalar(.5).toArray()];}
 function mesh(name,parent,items){
  const gs=items.map(([g,col,p=[0,0,0],r=[0,0,0]])=>{g=g.index?g.toNonIndexed():g;g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...r)));g.translate(...p);for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);const c=new T.Color(col),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}g.setAttribute('color',new T.BufferAttribute(a,3));return g;});
  const g=mergeVertices(mergeGeometries(gs),1e-6);gs.forEach(g=>g.dispose());const o=new T.Mesh(g,material);o.name=name;parent.add(o);return o;
 }
 function bolt(p,rot=[0,0,0]){return cyl(.006,.003,C.steel,p,rot,6);}
 function socket(name,parent,p,kind){const axis=kind.startsWith('fork')?'+Z':kind==='tow'?'-Z':kind==='wheel_centre'?'+X':'+Y';return group(name,parent,p,{kind,axis,standard:'PCS_120_100_V1'});}
 function wheelItems(radius,width){
  const wn=lod===2?8:n,rot=[0,0,Math.PI/2];
  const a=[cyl(lod===2?radius:radius-.012,width,C.rubber,[0,0,0],rot,wn),cyl(radius*.55,width+.01,C.ivory,[0,0,0],rot,wn),cyl(radius*.28,width+.022,C.amber,[0,0,0],rot,wn)];
  if(lod<2){a.push(cyl(radius*.69,width+.007,C.dark,[0,0,0],rot),cyl(radius*.40,width+.017,C.steel,[0,0,0],rot));const count=lod===0?28:16;
   for(let i=0;i<count;i++){const ang=i/count*Math.PI*2,half=Math.PI/count*.77;for(const side of [-1,1]){const vs=[];for(const x of (side<0?[-width/2,-.004]:[.004,width/2]))for(const t of [ang-half,ang,ang+half])for(const r of [radius-.017,radius])vs.push(new T.Vector3(x,r*Math.cos(t),r*Math.sin(t)));a.push([new ConvexGeometry(vs),C.dark]);}}
  }
  if(lod===0)for(let i=0;i<6;i++){const t=i/6*Math.PI*2;a.push(cyl(.007,width+.022,C.dark,[0,radius*.455*Math.cos(t),radius*.455*Math.sin(t)],rot,6));}
  return a;
 }
 if(module==='pallet'){
  const a=[];
  // Three runners and nine spacer blocks leave genuinely open four-way fork entries.
  for(const x of [-.53,0,.53]){
   a.push(box([.14,.025,1],C.dark,[x,.0125,0],lod===0?.008:0));
   for(const z of [-.43,0,.43])a.push(box([.14,.095,Math.abs(z)>.4?.132:.14],C.dark,[x,.0725,z],lod===0?.012:0));
  }
  for(const z of [-.43,-.215,0,.215,.43])a.push(box([Math.abs(z)>.4?.92:1.0,.04,.14],C.ivory,[0,.14,z],lod<2?.008:0));
  for(const x of [-.55,.55])a.push(box([.10,.04,.72],C.ivory,[x,.14,0],lod<2?.006:0));
  for(const {id,side,end} of STATIONS){
   const x=side*.53,z=end*.43;
   if(lod<2){
    const s=new T.Shape();s.moveTo(-.06,-.07);for(const p of [[.06,-.07],[.07,-.06],[.07,.06],[.06,.07],[-.06,.07],[-.07,.06],[-.07,-.06]])s.lineTo(...p);s.closePath();const hole=new T.Path();hole.absarc(0,0,.037,0,Math.PI*2,true);s.holes.push(hole);if(lod===0)for(const dx of [-.045,.045]){const h=new T.Path();h.absarc(dx,0,.0065,0,Math.PI*2,true);s.holes.push(h);}const g=new T.ExtrudeGeometry(s,{depth:.04,bevelEnabled:false,curveSegments:lod===0?12:4});g.rotateX(-Math.PI/2);a.push([g,C.dark,[x,.12,z]],ring(.037,.023,.006,C.steel,[x,.157,z],lod===0?24:8));
   }else a.push(box([.14,.04,.14],C.dark,[x,.14,z]),box([.05,.002,.05],C.steel,[x,.159,z]));
   a.push(box([.045,.032,.018],C.amber,[x,.10,end*.491],lod===0?.004:0));
   if(lod===0)for(const dx of [-.045,.045])a.push(bolt([x+dx,.1585,z]));
   socket('SOCKET_TOP_LOCK_'+id,root,[x,.16,z],'cargo_lock_receiver');
   socket('SOCKET_BOTTOM_LOCK_'+id,root,[x,0,z],'carrier_lock_receiver');
  }
  mesh('PALLET_SURFACE',root,a);
  socket('SOCKET_CARGO',root,[0,.16,0],'cargo_origin');socket('SOCKET_STACK',root,[0,.16,0],'empty_pallet_origin');
  for(const x of [-.265,.265])socket('SOCKET_FORK_'+(x<0?'L':'R'),root,[x,.0725,.5],'fork_entry_95mm_clearance');
 }
 if(module==='crate'){
  // Optional quarter-footprint cargo gauge, authored as its own reusable module.
  const a=[box([.54,.294,.43],C.ivory,[0,.163,0],.025),box([.538,.018,.428],C.dark,[0,.315,0],.023),box([.54,.036,.43],C.ivory,[0,.342,0],.02)];
  for(const x of [-.25,.25])for(const z of [-.20,.20])for(const y of [.025,.335])a.push(box([.06,.05,.06],C.dark,[x,y,z],lod<2?.01:0));
  a.push(box([.045,.07,.014],C.dark,[0,.29,.221],.004),box([.028,.05,.008],C.amber,[0,.292,.226],lod===0?.003:0));
  for(const x of [-1,1]){a.push(box([.012,.065,.15],C.dark,[x*.272,.205,0],.005));if(lod<2)a.push(box([.008,.014,.11],C.steel,[x*.276,.218,0],.003));}
  if(lod===0)a.push(box([.065,.034,.004],C.edge,[.15,.10,.216],.001));
  mesh('CRATE_SURFACE',root,a);socket('SOCKET_STACK',root,[0,.36,0],'crate_origin');
 }
 if(module==='stride'){
  root.userData.revision=2;root.userData.suspension=STRIDE;
  const body=group('CHASSIS_HEAVE',root,[0,.68,0],{axis:'+Y',range_m:[.60,.76]});
  const a=[box([1.10,.145,.90],C.dark,[0,-.03,0],.04),box([1.18,.075,.98],C.ivory,[0,.07,0],.025),box([.68,.07,.62],C.dark,[0,-.13,0],.03)];
  for(const end of [-1,1]){
   a.push(box([.60,.09,.022],C.dark,[0,-.025,end*.457],.015),box([.24,.022,.026],C.amber,[0,-.014,end*.469],.004));
   for(const x of [-.37,.37]){a.push(box([.075,.065,.03],C.dark,[x,-.018,end*.46],.012),cyl(.02,.033,C.glass,[x,-.018,end*.48],[Math.PI/2,0,0]));}
  }
  for(const side of [-1,1]){a.push(box([.025,.065,.48],C.edge,[side*.553,-.016,0],.01));if(lod===0)for(let i=0;i<9;i++)a.push(box([.03,.028,.013],C.dark,[side*.568,-.016,-.18+i*.045]));}
  for(const {id,side,end} of STATIONS){
   a.push(box([.15,.04,.14],C.rubber,[side*.53,.11,end*.43],.008));
   const lock=group('LOCK_'+id+'_YAW',body,[side*.53,.13,end*.43],{axis:'+Y',range_rad:[0,Math.PI/2]});
   mesh('LOCK_'+id+'_SURFACE',lock,[cyl(.018,.015,C.steel,[0,.0075,0]),box([.038,.008,.018],C.amber,[0,.019,0],lod===0?.003:0)]);
   socket('SOCKET_PALLET_LOCK_'+id,body,[side*.53,.13,end*.43],'pallet_bottom_receiver');
   if(lod===0)for(const dx of [-.042,.042])a.push(bolt([side*.53+dx,.132,end*.43]));
  }
  mesh('CHASSIS_SURFACE',body,a);socket('SOCKET_PALLET',body,[0,.13,0],'pallet_origin');socket('SOCKET_TOW',body,[0,-.07,-.49],'tow');
  for(const {id,side,end} of STATIONS){
   const mount=group('LEG_'+id+'_SPLAY_YAW',body,[side*.59,-.055,end*.40],{axis:'+Y',rest_angle_rad:-side*end*Math.PI/4});
   const hip=group('LEG_'+id+'_HIP_PITCH',mount,[0,0,0],{axis:'+Z',engine_driven:true});
   const knee=group('LEG_'+id+'_KNEE_PITCH',hip,[0,-STANDARD.upper_m,0],{axis:'+Z',engine_driven:true});
   const slide=group('LEG_'+id+'_SUSPENSION_EXTEND',knee,[0,-STANDARD.lower_m,0],{axis:'-Y',stroke_m:STRIDE.stroke_m,engine_driven:true});
   const ankle=group('LEG_'+id+'_ANKLE_ROLL',slide,[0,0,0],{axis:'+Z',engine_driven:true});
   const steer=group('WHEEL_'+id+'_YAW',ankle,[0,0,0],{axis:'+Y',continuous_rotation:true,engine_driven:true});
   const spin=group('WHEEL_'+id+'_ROLL',steer,[0,-STRIDE.kingpin_height_m,0],{axis:'+X',engine_driven:true,radius_m:STANDARD.wheel_radius_m});
   const upper=[cyl(.087,.14,C.dark,[0,0,0],[Math.PI/2,0,0]),cyl(.064,.148,C.steel,[0,0,0],[Math.PI/2,0,0]),cyl(.048,.153,C.amber,[0,0,0],[Math.PI/2,0,0]),box([.145,STANDARD.upper_m*.86,.13],C.ivory,[0,-STANDARD.upper_m*.52,0],lod<2?.022:0)];
   const lower=[cyl(.065,.13,C.dark,[0,0,0],[Math.PI/2,0,0]),cyl(.043,.139,C.amber,[0,0,0],[Math.PI/2,0,0]),cyl(.049,.18,C.dark,[0,-.13,0]),cyl(.057,.025,C.steel,[0,-.215,0]),box([.125,.15,.025],C.ivory,[0,-.13,.051],lod<2?.01:0)];
   if(lod===0){for(const y of [-.075,-.21])upper.push(bolt([.045,y,.068],[Math.PI/2,0,0]));for(let k=0;k<5;k++)lower.push(cyl(.051,.006,C.edge,[0,-.08-k*.022,0]));upper.push(beam([-.045,-.04,-.08],[-.045,-.25,-.08],.015,C.dark));}
   mesh('LEG_'+id+'_UPPER_SURFACE',hip,upper);mesh('LEG_'+id+'_LOWER_SURFACE',knee,lower);
   mesh('LEG_'+id+'_SUSPENSION_ROD_SURFACE',slide,[cyl(.027,.23,C.steel,[0,.115,0]),cyl(.037,.025,C.amber,[0,.022,0])]);
   const upright=[cyl(.05,.055,C.dark,[0,.035,0]),box([.22,.03,.19],C.ivory,[0,.13,0],lod<2?.012:0)];
   for(const x of [-.10,.10])upright.push(box([.025,.23,.065],C.dark,[x,.015,0],lod<2?.009:0));
   mesh('LEG_'+id+'_UPRIGHT_SURFACE',steer,upright);
   mesh('WHEEL_'+id+'_SURFACE',spin,wheelItems(STANDARD.wheel_radius_m,.14));socket('SOCKET_WHEEL_'+id,spin,[0,0,0],'wheel_centre');
  }
  // Solve the shared nominal rest pose before merging the distance surface.
  root.userData.static=false;applyStride(root,{height:.68});root.userData.static=lod===2;
 }
 if(module==='cup'){
  root.userData.revision=1;root.userData.tool='pressurized_bay_suction';root.userData.arm=CUP;
  const body=group('CUP_CHASSIS',root),a=[box([.60,.16,.76],C.dark,[0,.24,0],.055),box([.68,.20,.82],C.ivory,[0,.40,0],.065),box([.46,.025,.43],C.edge,[0,.508,-.04],.018)];
  for(const end of [-1,1]){a.push(box([.42,.08,.025],C.dark,[0,.38,end*.406],.012),box([.24,.024,.029],C.amber,[0,.386,end*.421],.004));for(const x of [-.27,.27])a.push(cyl(.014,.024,C.glass,[x,.41,end*.414],[Math.PI/2,0,0]));}
  a.push(cyl(.046,.035,C.dark,[-.23,.52,-.27]),cyl(.035,.015,C.amber,[-.23,.545,-.27]));
  if(lod<2)for(let i=0;i<7;i++)a.push(box([.025,.05,.016],C.dark,[.335,.41,-.19+i*.05]));
  if(lod===0)for(const x of [-.27,.27])for(const z of [-.30,.30])a.push(bolt([x,.485,z]));
  mesh('CUP_CHASSIS_SURFACE',body,a);
  for(const {id,side,end} of STATIONS){const spin=group('CUP_WHEEL_'+id+'_ROLL',body,[side*.36,.18,end*.30],{axis:'+X',engine_driven:true});mesh('CUP_WHEEL_'+id+'_SURFACE',spin,wheelItems(.18,.12));socket('SOCKET_CUP_WHEEL_'+id,spin,[0,0,0],'wheel_centre');}
  const base=group('CUP_BASE_YAW',body,[0,.52,0],{axis:'+Y',continuous_rotation:true,engine_driven:true});
  const collar=[cyl(.115,.07,C.ivory,[0,.035,0]),cyl(.09,.035,C.dark,[0,.078,0])];if(lod===0)for(let i=0;i<5;i++)collar.push(cyl(.096,.008,C.dark,[0,.055+i*.012,0]));mesh('CUP_TURNTABLE_SURFACE',base,collar);
  const shoulder=group('CUP_SHOULDER_PITCH',base,[0,.08,0],{axis:'+X',engine_driven:true});
  const elbow=group('CUP_ELBOW_PITCH',shoulder,[0,CUP.upper_m,0],{axis:'+X',engine_driven:true});
  const wrist=group('CUP_WRIST_LEVEL',elbow,[0,CUP.fore_m,0],{axes:['+X','+Y'],engine_driven:true});
  for(const [joint,len,label,width] of [[shoulder,CUP.upper_m,'UPPER',.13],[elbow,CUP.fore_m,'FORE',.115]]){
   const a=[cyl(.086,.17,C.dark,[0,0,0],[0,0,Math.PI/2],Math.max(n,12)),cyl(.062,.18,C.steel,[0,0,0],[0,0,Math.PI/2],Math.max(n,12)),cyl(.045,.186,C.amber,[0,0,0],[0,0,Math.PI/2],Math.max(n,12)),box([width,len-.12,.125],C.ivory,[0,len/2,0],lod<2?.025:0)];
   a.push(beam([0,.11,-.075],[0,len-.12,-.075],.025,C.dark),beam([0,len*.45,-.076],[0,len-.04,-.076],.014,C.steel));
   if(lod===0)for(const y of [.14,len-.14])for(const x of [-.045,.045])a.push(bolt([x,y,.064],[Math.PI/2,0,0]));
   mesh('CUP_ARM_'+label+'_SURFACE',joint,a);
  }
  const head=[cyl(.062,.10,C.dark,[0,-.005,0]),cyl(.068,.025,C.steel,[0,-.045,0]),box([.38,.025,.055],C.ivory,[0,-.075,0],.008),box([.055,.025,.30],C.ivory,[0,-.075,0],.008)];
  for(const {id,side,end} of STATIONS){
   const x=side*.16,z=end*.12;
   head.push(beam([0,-.075,0],[x,-.075,z],.014,C.steel),cyl(.022,.04,C.steel,[x,-.095,z]),cyl(.024,.01,C.amber,[x,-.11,z]));
   if(lod===0){const curve=new T.CatmullRomCurve3([new T.Vector3(0,-.035,0),new T.Vector3(x*.5,.015,z*.5),new T.Vector3(x,-.07,z)]);head.push([new T.TubeGeometry(curve,12,.008,6,false),C.rubber]);}
   const pad=group('CUP_PAD_'+id+'_COMPRESS',wrist,[x,-.10,z],{axis:'+Y',scale_range:[.82,1],engine_driven:true});
   const profile=lod<2?[[.039,-.12],[.055,-.12],[.055,-.111],[.036,-.097],[.040,-.091],[.040,-.083],[.028,-.073],[.034,-.067],[.034,-.059],[.024,-.049],[.029,-.043],[.029,-.035],[.018,-.025],[.018,0],[.012,0],[.012,-.08],[.039,-.12]]:[[.039,-.12],[.055,-.12],[.055,-.11],[.020,-.025],[.020,0],[.012,0],[.012,-.08],[.039,-.12]];
   mesh('CUP_PAD_'+id+'_SURFACE',pad,[[new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),lod===0?32:8),C.rubber]]);
   const contact=socket('SOCKET_CUP_PAD_'+id,pad,[0,-.12,0],'suction_contact');contact.userData.axis='-Y';
  }
  mesh('CUP_TOOL_SURFACE',wrist,head);const grip=socket('SOCKET_CARGO_GRIP',wrist,[0,-.22,0],'crate_top');grip.userData.axis='-Y';
  root.userData.static=false;applyCup(root);root.userData.static=lod===2;
 }
 root.updateMatrixWorld(true);
 if(lod===2){const meshes=[],gs=[];root.traverse(o=>{if(o.isMesh){meshes.push(o);gs.push(o.geometry.clone().applyMatrix4(o.matrixWorld));}});for(const m of meshes){const g=group(m.name,m.parent,m.position.toArray(),{lookup_only:true});g.quaternion.copy(m.quaternion);m.removeFromParent();}const m=new T.Mesh(mergeVertices(mergeGeometries(gs),1e-6),material);m.name=module.toUpperCase()+'_STATIC_SURFACE';root.add(m);}
 return root;
}
