// Editable procedural master: six repeated mechanical limbs with rigid skin weights.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {box,cyl,ring,beam,armor,prep,merged,socket} from './settlement-industry-shape.mjs';
import {legs,UPPER,applyPose} from '../../assets/nih-dairia-mech/runtime.js';
const C={ivory:0xc9c5b6,edge:0xe5e1d4,carbon:0x202c32,dark:0x101a20,steel:0x74818a,gold:0xb98b44,amber:0xffb841,blue:0x8ed6df};
// A swept, chamfered armor section. Cross-sections vary in width and camber.
function blade(stations,color,lod){
  const sides=lod===0?12:lod===1?8:4,p=[],ix=[];
  for(const [x,y,w,h] of stations)for(let k=0;k<sides;k++){
    const a=2*Math.PI*k/sides;p.push(x,y+Math.sin(a)*h,Math.cos(a)*w);
  }
  for(let i=0;i<stations.length-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;ix.push(a,a+sides,b,b,a+sides,b+sides);}
  for(let j=1;j<sides-1;j++){ix.push(0,j,j+1);const a=(stations.length-1)*sides;ix.push(a,a+j+1,a+j);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,color);
}
function tube(a,b,r,n,color){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);const g=cyl(r,d.length(),n,[0,0,0],color);return g.applyMatrix4(new T.Matrix4().compose(va.add(vb).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()),new T.Vector3(1,1,1)));}
function curve(points,r,n,color,segments){const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,n,false);return prep(g,color);}
export function buildModel(lod){
 let root=new T.Group();root.name='NIH_DAIRIA_MECH_ROOT';root.userData={family:'nih-dairia-mech',version:1,lod,damage_level:0,static:lod===2,leg_count:6,plot_m:[9,9],swept_envelope_m:{min:[-4.5,0,-4.5],max:[4.5,2.6,4.5]},creator_in_lore:'Isao / Builder Robot'};
 const mats=[new T.MeshStandardMaterial({name:'CERAMIC_PALETTE',vertexColors:true,metalness:.28,roughness:.34}),new T.MeshStandardMaterial({name:'CARBON_TITANIUM',vertexColors:true,metalness:.76,roughness:.31}),new T.MeshStandardMaterial({name:'AMBER_STATUS',vertexColors:true,emissive:0xffa326,emissiveIntensity:.8,metalness:.45,roughness:.26})];
 const bones=[],parts=[[],[],[]];
 function bone(parent,name,pos=[0,0,0],role='engine_pivot'){const o=new T.Bone();o.name=name;o.position.fromArray(pos);o.userData={role};parent.add(o);bones.push(o);return o;}
 function add(b,m,...geometry){for(const g of geometry){if(lod===2)g.dispose();else parts[m].push({b,g});}}
 const n=lod===0?32:lod===1?12:6, body=bone(root,'BODY_HEAVE',[0,1.42,0]);
 add(body,1,cyl(.68,.24,6,[0,0,0],C.dark),cyl(.55,.10,6,[0,-.17,0],C.steel));
 add(body,0,cyl(.54,.13,6,[0,.13,0],C.ivory),cyl(.19,.055,n,[0,.225,0],C.edge));
 add(body,1,cyl(.125,.06,n,[0,.25,0],C.dark));add(body,2,ring(.09,.018,n,[0,.283,0],C.amber));
 for(const leg of legs){
  const a=leg.angle,pre='LEG_'+leg.id;
  // Segmented radial petals around the central spine preserve the starfish reading.
  const petal=blade([[.19,.16,.08,.035],[.40,.21,.20,.065],[.65,.15,.18,.055],[.79,.09,.09,.035]],C.ivory,lod);petal.rotateY(a-Math.PI/2);add(body,0,petal);
  const mount=bone(body,pre+'_YAW',[Math.sin(a)*.62,0,Math.cos(a)*.62]);
  const hip=bone(mount,pre+'_HIP'),knee=bone(hip,pre+'_KNEE',[UPPER,0,0]),slide=bone(knee,pre+'_SLIDE',[1.37,0,0]),ankle=bone(slide,pre+'_ANKLE',[.35,0,0]);
  // Broad shoulder plate narrows into a tendon-like yoke at the knee.
  add(hip,1,blade([[0,0,.15,.12],[.32,.02,.16,.12],[.83,-.025,.11,.08],[1.15,0,.16,.13]],C.carbon,lod));
  add(hip,0,blade([[.08,.11,.13,.055],[.30,.18,.215,.095],[.70,.14,.16,.085],[1.02,.095,.10,.045]],C.ivory,lod));
  add(hip,1,tube([.16,-.13,-.09],[.64,-.19,-.09],.065,n,C.dark),tube([.52,-.19,-.09],[1.01,-.09,-.09],.038,n,C.steel));
  add(hip,2,tube([.28,-.13,.12],[.54,-.15,.12],.025,n,C.amber));
  // Tangential revolute bearing faces; concentric rings read from every angle.
  for(const [b,r] of [[hip,.18],[knee,.205],[ankle,.115]]){
   add(b,1,cyl(r,.37,n,[0,0,0],C.dark,[Math.PI/2,0,0]));
   for(const s of [-1,1]){
    add(b,0,cyl(r*.79,.027,n,[0,0,s*.197],C.ivory,[Math.PI/2,0,0]));
    add(b,1,cyl(r*.57,.035,n,[0,0,s*.215],C.steel,[Math.PI/2,0,0]),ring(r*.48,.018,n,[0,0,s*.239],C.gold,[0,0,0]));
    add(b,2,cyl(r*.20,.012,n,[0,0,s*.243],C.amber,[Math.PI/2,0,0]));
    if(lod===0)for(let k=0;k<6;k++){const t=k*Math.PI/3;add(b,1,cyl(.013,.012,6,[Math.sin(t)*r*.68,Math.cos(t)*r*.68,s*.216],C.dark,[Math.PI/2,0,0]));}
   }
  }
  // Fixed outer carbon cylinder and the rigid, translating titanium inner rod.
  add(knee,1,tube([.12,0,0],[1.02,0,0],.112,n,C.carbon),cyl(.14,.11,n,[.94,0,0],C.steel,[0,0,Math.PI/2]));
  add(knee,0,blade([[.10,.13,.17,.065],[.33,.18,.20,.09],[.72,.14,.155,.065],[.91,.10,.11,.04]],C.edge,lod));
  add(knee,2,tube([.30,-.09,.094],[.68,-.09,.094],.021,n,C.amber));
  add(slide,1,tube([-1.03,0,0],[.35,0,0],.067,n,C.steel),cyl(.10,.06,n,[.11,0,0],C.gold,[0,0,Math.PI/2]));
  add(slide,0,blade([[-.10,.09,.115,.045],[.09,.10,.13,.055],[.33,.03,.085,.045]],C.ivory,lod));
  add(ankle,1,blade([[0,-.04,.115,.07],[.16,-.09,.10,.045],[.36,-.135,.065,.018]],C.dark,lod));
  add(ankle,0,blade([[.02,.035,.13,.055],[.15,-.015,.14,.055],[.35,-.10,.09,.032],[.44,-.135,.025,.017]],C.ivory,lod));
  for(let j=0;j<3;j++){
    const claw=bone(ankle,pre+'_CLAW_'+(j+1),[.21,-.07,(j-1)*.085]);claw.rotation.y=(j-1)*.7;
    add(claw,1,blade([[0,0,.032,.035],[.13,.015,.030,.032],[.28,-.04,.024,.023],[.35,-.085,.009,.005]],C.steel,lod));
    if(lod<2)add(claw,1,cyl(.047,.075,n,[0,0,0],C.gold,[Math.PI/2,0,0]));
    socket(claw,pre+'_CLAW_'+(j+1)+'_TIP',[.35,-.09,0],'anchor_tip',[0,-1,0]);
  }
  socket(ankle,pre+'_CONTACT',[.36,-.16,0],'ground_contact',[0,-1,0]);
  if(lod<2){
   add(hip,1,curve([[.16,-.1,.17],[.40,-.21,.17],[.83,-.15,.15],[1.05,-.06,.15]],.023,6,C.dark,lod===0?18:8));
   for(const x of [.25,.75])for(const s of [-1,1])add(hip,1,cyl(.022,.018,6,[x,.24-x*.07,s*.10],C.dark));
   // Parallel rails and sleeve bands, no stretching of the moving shaft.
   for(const s of [-1,1])add(knee,1,tube([.17,-.055,s*.13],[.88,-.055,s*.105],.018,6,C.steel));
  }
  if(lod===0){
   for(let k=0;k<9;k++)add(knee,1,ring(.113,.007,20,[.25+k*.07,0,0],k%2?C.dark:C.steel,[0,Math.PI/2,0]));
   for(let k=0;k<4;k++)add(hip,1,box([.055,.015,.11],[.45+k*.10,.218-k*.01,0],C.carbon));
   for(const x of [.29,.70])for(const s of [-1,1])add(knee,1,cyl(.017,.013,8,[x,.23-x*.04,s*.10],C.dark));
   add(hip,1,curve([[.10,-.08,-.20],[.35,-.27,-.20],[.80,-.22,-.19],[1.12,-.08,-.18]],.014,8,C.gold,24));
  }
 }
 socket(body,'SOCKET_DORSAL_TOOL',[0,.29,0],'utility',[0,1,0]);socket(body,'SOCKET_POWER',[0,-.13,-.53],'power',[0,0,-1]);socket(body,'SOCKET_FRONT',[0,.03,.70],'forward_sensor');
 applyPose(root,0,'idle');root.updateMatrixWorld(true);
 if(lod===2){
  // Authored static silhouette: omit bolts, hoses, nested bearings and sleeve bands.
  const low=(b,...gs)=>gs.forEach(g=>parts[0].push({b,g}));
  low(body,cyl(.68,.24,6,[0,0,0],C.dark),cyl(.54,.13,6,[0,.13,0],C.ivory),cyl(.19,.055,6,[0,.225,0],C.amber));
  for(const leg of legs){const pre='LEG_'+leg.id,find=s=>root.getObjectByName(pre+s),hip=find('_HIP'),knee=find('_KNEE'),slide=find('_SLIDE'),ankle=find('_ANKLE');
   low(hip,blade([[0,0,.15,.12],[.30,.15,.215,.13],[.70,.11,.16,.10],[1.15,0,.16,.13]],C.ivory,2),cyl(.18,.37,6,[0,0,0],C.gold,[Math.PI/2,0,0]));
   low(knee,blade([[.10,.13,.17,.065],[.33,.18,.20,.09],[.72,.14,.155,.065],[.91,.10,.11,.04]],C.edge,2),tube([.12,0,0],[1.02,0,0],.112,6,C.carbon),cyl(.205,.37,6,[0,0,0],C.gold,[Math.PI/2,0,0]));
   low(slide,tube([-1.03,0,0],[.35,0,0],.067,6,C.steel),blade([[-.1,.09,.115,.045],[.09,.10,.13,.055],[.33,.03,.085,.045]],C.ivory,2));
   low(ankle,blade([[.02,.035,.13,.055],[.15,-.015,.14,.055],[.35,-.10,.09,.032],[.44,-.135,.025,.017]],C.ivory,2));
   for(let j=1;j<=3;j++)low(find('_CLAW_'+j),blade([[0,0,.032,.035],[.13,.015,.030,.032],[.28,-.04,.024,.023],[.35,-.085,.009,.005]],C.steel,2));
  }
 }
 const staticParts=[],skinParts=[];
 for(let m=0;m<parts.length;m++){
  const gs=[];
  for(const {b,g} of parts[m]){
   g.applyMatrix4(b.matrixWorld);
   if(lod<2){const count=g.attributes.position.count,ii=new Uint16Array(count*4),ww=new Float32Array(count*4);for(let j=0;j<count;j++){ii[j*4]=bones.indexOf(b);ww[j*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ii,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(ww,4));}
   gs.push(g);
  }
  if(lod===2)staticParts.push(...gs);
  else skinParts.push(merged(gs));
 }
 if(lod===2){const o=new T.Mesh(merged(staticParts),mats[0]);o.name='DISTANCE_GEOMETRY';root.add(o);root.traverse(o=>o.userData.static_lookup_only=true);}
 else{const skin=new T.SkinnedMesh(mergeGeometries(skinParts,true),mats);skin.name=root.name;skin.userData={...root.userData};for(const child of [...root.children])skin.add(child);skin.bind(new T.Skeleton(bones));root=skin;}
 return root;
}
