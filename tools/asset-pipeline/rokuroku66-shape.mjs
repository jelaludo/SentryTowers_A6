// Original short-vertebra master, derived from the Nih-Dairia mechanical palette.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {box,cyl,ring,prep,merged,socket} from './settlement-industry-shape.mjs';
import {COUNT,limbs,lengths,widths,ROOT_HEIGHT,applyPose} from '../../assets/rokuroku66/runtime.js';
const C={ivory:0xd7d0bd,edge:0xece6d7,carbon:0x202b32,dark:0x0e1920,steel:0x7c8c93,gold:0xb8934f,amber:0xffb44f};
function shell(stations,color,lod){
 const cross=lod===2?[[1,1],[1,-1],[-1,0]]:Array.from({length:lod===0?12:6},(_,i)=>[Math.sin(i*Math.PI*2/(lod===0?12:6)),Math.cos(i*Math.PI*2/(lod===0?12:6))]),n=cross.length,p=[],ix=[];
 for(const [x,y,w,h] of stations)for(const [a,b] of cross)p.push(x,y+a*h,b*w);
 for(let i=0;i<stations.length-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n;ix.push(a,a+n,b,b,a+n,b+n);}
 for(let j=1;j<n-1;j++){ix.push(0,j,j+1);const a=(stations.length-1)*n;ix.push(a,a+j+1,a+j);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,color);
}
function bearing(r,h,n,pos,rot){const raw=new T.CylinderGeometry(r,r,h,n),g=prep(raw,C.carbon);const color=g.attributes.color,normal=g.attributes.normal,gold=new T.Color(C.gold);for(let i=0;i<color.count;i++)if(Math.abs(normal.getY(i))>.8)color.setXYZ(i,gold.r,gold.g,gold.b);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));return g;}
function cable(side,lod){const points=[[-.075,-.012,side*.024],[-.04,-.035,side*.033],[0,-.042,side*.042],[.04,-.035,side*.033],[.075,-.012,side*.024]].map(p=>new T.Vector3(...p));return prep(new T.TubeGeometry(new T.CatmullRomCurve3(points),lod===0?12:3,.007,lod===0?6:3,false),side>0?C.gold:C.dark);}
export function buildModel(lod){
 let root=new T.Group();root.name='ROKUROKU_66_ROOT';root.userData={family:'rokuroku66',version:1,lod,damage_level:0,static:lod===2,plot_m:[12,12],limbs:6,vertebrae_per_limb:COUNT,axes_per_joint:2,swept_envelope_m:{min:[-6,0,-6],max:[6,8,6]}};
 const mats=[new T.MeshStandardMaterial({name:'IVORY_SCALES',vertexColors:true,metalness:.3,roughness:.32}),new T.MeshStandardMaterial({name:'GRAPHITE_GEARED_GIMBALS',vertexColors:true,metalness:.72,roughness:.32}),new T.MeshStandardMaterial({name:'AMBER_NEURAL_BUS',vertexColors:true,emissive:0xffb04c,emissiveIntensity:.65,metalness:.4,roughness:.27})];
 const bones=[],parts=[[],[],[]];
 function bone(parent,name,pos=[0,0,0],role='engine_pivot'){const b=new T.Bone();b.name=name;b.position.fromArray(pos);b.userData={role};parent.add(b);bones.push(b);return b;}
 function add(b,m,g,previous=null){parts[m].push({b,g,previous});}
 const body=bone(root,'BODY_HEAVE',[0,ROOT_HEIGHT,0]),n=lod===0?32:lod===1?12:6;
 add(body,1,cyl(.70,.24,6,[0,0,0],C.dark));add(body,1,cyl(.38,.09,6,[0,-.18,0],C.carbon));add(body,0,cyl(.59,.12,6,[0,.15,0],C.ivory));add(body,0,cyl(.18,.09,n,[0,.26,0],C.edge));add(body,1,cyl(.11,.025,n,[0,.315,0],C.dark));add(body,2,ring(.085,.012,n,[0,.334,0],C.amber));
 for(const l of limbs){
  const a=l.angle,mount=bone(body,'LIMB_'+l.id+'_MOUNT',[Math.sin(a)*.70,0,Math.cos(a)*.70]);mount.rotation.y=a-Math.PI/2;
  const petal=shell([[.19,.16,.07,.03],[.42,.21,.18,.055],[.64,.13,.13,.045],[.77,.07,.065,.025]],C.ivory,lod);petal.rotateY(a-Math.PI/2);add(body,0,petal);
  add(mount,2,box([.12,.035,.055],[.06,.11,0],C.amber));
  let previous=mount;
  for(let i=0;i<COUNT;i++){
   const pre=`LIMB_${l.id}_V${String(i+1).padStart(2,'0')}`,len=lengths[i],w=widths[i],s=w/.115;
   const yaw=bone(previous,pre+'_YAW',i?[lengths[i-1],0,0]:[0,0,0]),pitch=bone(yaw,pre+'_PITCH'),scale=bone(pitch,pre+'_SCALE'),dorsal=bone(scale,pre+'_DORSAL_LIP',[len-.065,.125*s,0]),ventral=bone(scale,pre+'_VENTRAL_LIP',[len-.065,-.089*s,0]);
   yaw.userData.axis='+Y';pitch.userData.axis='+Z';scale.userData.role='engine_pivot';scale.userData.kind='sliding_armor_scale';
   if(lod===2){
    add(scale,0,shell([[.018,.115*s,w,.027*s],[len+.045,.160*s,w*.24,.012*s]],C.ivory,2));
    const under=shell([[.018,.083*s,w*.82,.021*s],[len+.045,.118*s,w*.20,.010*s]],C.ivory,2);under.rotateX(Math.PI);add(scale,0,under);
    if(i%3===0&&i<COUNT-1){const span=lengths.slice(i,i+3).reduce((a,b)=>a+b,0)-.06;add(pitch,1,box([span,.075*s,.075*s],[span/2+.025,0,0],C.carbon));}
   }else{
    // The orthogonal motor housings are recessed around a clear central cable bore.
    add(yaw,1,bearing(.055*s,.035*s,lod===0?16:7,[0,.065*s,0],[0,0,0]));
    add(pitch,1,bearing(.052*s,.035*s,lod===0?16:7,[0,0,.073*s],[Math.PI/2,0,0]));
    for(const side of [-1,1])add(yaw,1,box([.075*s,.026*s,.035*s],[.018*s,.025*s,side*.060*s],C.carbon));
    add(pitch,1,box([len*.56,.067*s,.068*s],[len*.54,0,0],C.carbon));
    // Short recessed base and a separate cam-following overlap lip.
    add(scale,0,shell([[.018,.105*s,w*.52,.020*s],[len*.28,.123*s,w*.92,.032*s],[len-.065,.125*s,w*.85,.020*s]],C.ivory,lod));
    add(dorsal,0,shell([[0,0,w*.85,.020*s],[.11,.035*s,w*.24,.012*s]],C.ivory,lod));
    add(scale,0,shell([[.018,-.078*s,w*.48,.015*s],[len*.45,-.089*s,w*.82,.022*s],[len-.065,-.089*s,w*.68,.015*s]],C.ivory,lod===0?0:2));
    add(ventral,0,shell([[0,0,w*.68,.015*s],[.11,-.029*s,w*.20,.010*s]],C.ivory,lod===0?0:2));
    const g=cable(1,lod);g.scale(s,s,s);add(pitch,1,g,previous);
    if(lod===0){
     const g2=cable(-1,lod);g2.scale(s,s,s);add(pitch,1,g2,previous);
     add(yaw,1,cyl(.038*s,.012*s,16,[0,-.068*s,0],C.steel));add(pitch,1,cyl(.038*s,.012*s,16,[0,0,-.077*s],C.steel,[Math.PI/2,0,0]));
     add(yaw,1,ring(.039*s,.006*s,16,[0,.086*s,0],C.steel));add(pitch,1,ring(.035*s,.006*s,16,[0,0,.094*s],C.steel,[0,0,0]));
     if(i%3===0)for(const z of [-.055,.055])add(scale,0,cyl(.009*s,.007,6,[len*.4,.158*s,z*s],C.steel));
     if(i%4===0)add(pitch,2,box([.028*s,.010*s,.019*s],[len*.72,.044*s,0],C.amber));
    }
   }
   previous=pitch;
  }
  socket(previous,'SOCKET_LIMB_'+l.id+'_TIP',[lengths.at(-1),0,0],'serpentine_tip',[1,0,0]);
 }
 socket(body,'SOCKET_DORSAL_TOOL',[0,.35,0],'utility',[0,1,0]);socket(body,'SOCKET_POWER',[0,-.12,-.59],'power',[0,0,-1]);
 applyPose(root,0,'extended',{animate:false});root.updateMatrixWorld(true);
 const groups=[],staticParts=[];
 for(let m=0;m<3;m++){
  const gs=[];for(const {b,g,previous} of parts[m]){
   if(lod<2){const count=g.attributes.position.count,ii=new Uint16Array(count*4),ww=new Float32Array(count*4);for(let j=0;j<count;j++){const t=previous?Math.max(0,Math.min(1,(g.attributes.position.getX(j)+.055)/.11)):1;ii[j*4]=t>0?bones.indexOf(b):0;ww[j*4]=t;if(previous){ii[j*4+1]=t<1?bones.indexOf(previous):0;ww[j*4+1]=1-t;}}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ii,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(ww,4));}
   g.applyMatrix4(b.matrixWorld);gs.push(g);
  }
  if(lod===2)staticParts.push(...gs);else groups.push(merged(gs));
 }
 if(lod===2){const mesh=new T.Mesh(merged(staticParts),mats[0]);mesh.name='DISTANCE_GEOMETRY';root.add(mesh);root.traverse(o=>o.userData.static_lookup_only=true);}
 else{const skin=new T.SkinnedMesh(mergeGeometries(groups,true),mats);skin.name=root.name;skin.userData={...root.userData};for(const c of [...root.children])skin.add(c);skin.bind(new T.Skeleton(bones));root=skin;}
 return root;
}
