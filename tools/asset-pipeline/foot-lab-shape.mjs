// Original NISOKU-02 foot; same palette and manufacturing language as AUREL-01.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {prep,cyl,ring,box,merged,socket} from './settlement-industry-shape.mjs';
import {TOES,HALLUX} from '../../assets/foot-lab/runtime.js';
const C={ivory:0xe5dfd0,edge:0xf4f0e4,carbon:0x203039,dark:0x101c23,pad:0x26353b,steel:0x91a5aa,gold:0xc5a164,light:0xffc778};
function rounded(size,pos,color,lod,r=.002){return prep(lod===2?new T.BoxGeometry(...size):new RoundedBoxGeometry(...size,lod===0?3:1,Math.min(r,...size.map(x=>x*.45))),color,pos);}
function plate(points,depth,pos,color,lod){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const b=lod===0?.0012:lod===1?.0007:0;const g=new T.ExtrudeGeometry(s,{depth:depth-2*b,bevelEnabled:b>0,bevelSize:b,bevelThickness:b,bevelSegments:lod===0?3:1,steps:1,curveSegments:1});g.translate(0,0,-depth/2+b);return prep(g,color,pos);}
function skinShell(length,width,depth,color,lod){
 const n=lod===0?24:lod===1?12:6,stations=[[length*.12,.69,.75],[length*.28,1,1],[length*.55,1.015,1.03],[length*.85,.79,.92],[length*.98,.50,.55]],p=[],ix=[];
 for(const [y,w,h]of stations)for(let i=0;i<n;i++){const a=i/n*Math.PI*2,co=Math.cos(a),si=Math.sin(a);p.push(Math.sign(co)*Math.abs(co)**.68*width*.5*w,y,Math.sign(si)*Math.abs(si)**.70*depth*.5*h);}
 for(let j=0;j<stations.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;ix.push(a,a+n,b,b,a+n,b+n);}
 for(let i=1;i<n-1;i++){ix.push(0,i,i+1);const a=(stations.length-1)*n;ix.push(a,a+i+1,a+i);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,color);
}
// Cross-sections along the long axis: rounded heel, elevated arch, broad metatarsal fan.
function footCore(lod){
 const n=lod===0?32:lod===1?16:8,stations=[[-.126,.011,.026,.010],[-.111,.029,.028,.022],[-.079,.037,.035,.030],[-.040,.038,.035,.026],[-.006,.046,.034,.024],[.033,.069,.033,.022],[.059,.059,.029,.015],[.065,.048,.028,.010]],p=[],ix=[];
 for(const [z,w,y,h]of stations)for(let i=0;i<n;i++){const a=i/n*Math.PI*2;p.push(Math.cos(a)*w,y+Math.sin(a)*h,z);}
 for(let j=0;j<stations.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;ix.push(a,b,a+n,b,b+n,a+n);}
 for(let i=1;i<n-1;i++){ix.push(0,i+1,i);const a=(stations.length-1)*n;ix.push(a,a+i,a+i+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,C.carbon);
}
function solePlate(points,thickness,pos,color,lod){return plate(points,thickness,[0,0,0],color,lod).rotateX(Math.PI/2).translate(...pos);}
function instepShell(stations,lod){
 const segments=lod===0?20:lod===1?10:4,n=(segments+1)*2,p=[],ix=[];
 for(const [z,w,cy,h]of stations){for(const inner of [false,true])for(let i=0;i<=segments;i++){const a=((inner?segments-i:i)/segments*2-1)*1.30;const thick=inner?.003:0;p.push(Math.sin(a)*(w-thick),cy+Math.cos(a)*(h-thick),z);}}
 for(let j=0;j<stations.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;ix.push(a,a+n,b,b,a+n,b+n);}
 for(let i=0;i<segments;i++){const a=i,b=n-1-i;ix.push(a,b,a+1,a+1,b,b-1);const k=(stations.length-1)*n;ix.push(k+a,k+a+1,k+b,k+a+1,k+b-1,k+b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,C.ivory);
}
export function buildFoot(lod){
 let root=new T.Group();root.name='NISOKU_02_FOOT_ROOT';root.userData={family:'nisoku02foot',manufacturer:'Isao / Mechanism Atelier',version:1,lod,damage_level:0,static:lod===2,handedness:'right',units:'meters',plot_m:[.40,.40]};
 const mats=[new T.MeshStandardMaterial({name:'CERAMIC_IVORY',vertexColors:true,metalness:.28,roughness:.28}),new T.MeshStandardMaterial({name:'GRAPHITE_STRUCTURE',vertexColors:true,metalness:.62,roughness:.3}),new T.MeshStandardMaterial({name:'GOLD_TITANIUM',vertexColors:true,metalness:.8,roughness:.25}),new T.MeshStandardMaterial({name:'TACTILE_ELASTOMER',vertexColors:true,metalness:.05,roughness:.85}),new T.MeshStandardMaterial({name:'AMBER_STATUS',vertexColors:true,metalness:.25,roughness:.25,emissive:C.light,emissiveIntensity:.55})];
 const bones=[],parts=mats.map(()=>[]),n=lod===0?32:lod===1?12:6;
 const bone=(parent,name,p=[0,0,0],role='engine_pivot',explode=null)=>{const o=new T.Bone();o.name=name;o.position.fromArray(p);o.userData={role,...(explode?{explode}:{})};parent.add(o);bones.push(o);return o;};
 const add=(b,m,g)=>parts[m].push({b,g});
 const foot=bone(root,'FOOT_PLACEMENT',[0,0,0],'engine_placement'),shell=bone(foot,'INSTEP_SHELL',[0,0,0],'viewer_shell',[0,.055,0]);
 add(foot,1,footCore(lod));
 // Split shell follows the instep; the back remains visibly a weight-bearing heel.
 add(shell,0,instepShell([[-.120,.022,.028,.022],[-.109,.032,.032,.031],[-.080,.040,.035,.034],[-.047,.040,.035,.030],[-.034,.036,.035,.027]],lod));
 add(shell,0,instepShell([[-.028,.038,.034,.029],[-.006,.049,.034,.028],[.031,.072,.033,.026],[.049,.067,.030,.025],[.061,.052,.028,.018]],lod));
 add(shell,0,solePlate([[-.038,-.055],[-.046,-.010],[-.064,.016],[-.060,.036],[-.050,.032],[-.032,-.012],[-.031,-.049]],.008,[0,.034,0],C.edge,lod));
 add(shell,0,solePlate([[.032,-.078],[.040,-.034],[.065,.017],[.068,.033],[.057,.031],[.034,-.013],[.026,-.071]],.009,[0,.034,0],C.ivory,lod));
 add(shell,0,solePlate([[-.029,-.111],[-.024,-.122],[.020,-.122],[.030,-.110],[.027,-.099],[-.027,-.099]],.012,[0,.029,0],C.ivory,lod));
 // Separate heel, forefoot and lateral-arch pads leave a recessed medial arch.
 add(foot,3,solePlate([[-.021,-.119],[-.032,-.100],[-.030,-.068],[-.020,-.054],[.022,-.054],[.033,-.077],[.029,-.107],[.018,-.120]],.009,[0,.008,0],C.pad,lod));
 add(foot,3,solePlate([[-.048,.011],[-.060,.026],[-.052,.052],[.047,.053],[.064,.030],[.051,.011],[.012,.002],[-.019,.002]],.008,[0,.010,0],C.pad,lod));
 add(foot,3,solePlate([[.022,-.054],[.034,-.055],[.042,-.013],[.035,.004],[.020,-.005]],.007,[0,.019,0],C.pad,lod));
 function texture(b,w,len,y,z0=0){if(lod!==0)return;const pitch=.0027,cols=Math.floor(w/pitch);for(let j=0;j<Math.floor(len/pitch);j++)for(let i=0;i<cols;i++){const x=(i-(cols-1)/2+(j%2)*.3)*pitch;add(b,3,cyl(.00040,.00018,6,[x,y,z0+(j+.5)*pitch],0x34444a));}}
 texture(foot,.042,.046,.00325,-.108);texture(foot,.077,.030,.0051,.014);
 if(lod<2){for(const x of [-.026,0,.026])add(foot,2,rounded([.003,.006,.080],[x,.037,-.007],C.gold,lod,.001));}
 // The ankle and cuff rise above the hindfoot, never from the end of a palm.
 const ap=bone(foot,'ANKLE_PITCH',[0,.069,-.073]),ar=bone(ap,'ANKLE_ROLL');
 add(ap,1,cyl(.025,.056,n,[0,0,0],C.dark,[0,0,Math.PI/2]));
 if(lod<2)for(const side of [-1,1]){add(ap,2,ring(.018,.0022,n,[side*.028,0,0],C.gold,[0,Math.PI/2,0]));add(ap,1,cyl(.013,.002,n,[side*.029,0,0],C.steel,[0,0,Math.PI/2]));}
 add(ar,1,cyl(.024,.051,n,[0,.032,0],C.carbon));
 for(let i=0;i<(lod===2?3:6);i++)add(ar,1,ring(.025,.0025,n,[0,.013+i*.005,0],C.carbon));
 add(ar,0,cyl(.033,.020,lod===2?8:16,[0,.056,0],C.ivory));add(ar,2,ring(.031,.0013,n,[0,.067,0],C.gold));
 add(ar,1,cyl(.024,.005,n,[0,.069,0],C.dark));
 add(shell,1,rounded([.030,.002,.006],[0,.060,.026],C.dark,lod,.001));add(shell,4,rounded([.021,.0018,.002],[0,.0615,.026],C.light,lod,.0007));
 if(lod===0)for(const [x,y,z]of [[-.026,.060,-.100],[.024,.061,-.100],[-.041,.0547,.026],[.046,.0536,.030]])add(shell,2,cyl(.0018,.001,10,[x,y,z],C.steel));
 function hinge(b,w,r){add(b,1,cyl(r,w*.94,n,[0,0,0],C.dark,[0,0,Math.PI/2]));if(lod<2)for(const side of [-1,1]){add(b,2,ring(r*.76,r*.12,n,[side*w*.49,0,0],C.gold,[0,Math.PI/2,0]));add(b,1,cyl(r*.48,.0015,n,[side*w*.50,0,0],C.steel,[0,0,Math.PI/2]));}}
 function segment(b,id,len,w,distal){
   const s=bone(b,id+'_SHELL',[0,0,0],'viewer_shell',[0,.027,0]),h=w*.65;
   add(b,1,rounded([w*.65,h*.72,len*.82],[0,0,len*.47],C.carbon,lod));
   add(s,0,skinShell(len-.001,w,h,C.ivory,lod).rotateX(Math.PI/2));
   const pl=len-.010,pw=w*.80,py=-h*.5-.0006;
   add(b,3,rounded([pw,.0045,pl],[0,py,len*.53],C.pad,lod,.003));texture(b,pw*.75,pl*.75,py-.0024,len*.53-pl*.375);
   if(distal){const g=new T.SphereGeometry(1,lod===0?24:lod===1?12:6,lod===0?12:lod===1?6:3);g.scale(w*.37,h*.39,.005);add(b,3,prep(g,C.pad,[0,-.002,len-.002]));}
   if(lod===0)for(const x of [-w*.29,w*.29])add(s,2,cyl(.001,.0008,8,[x,h*.49,len*.27],C.steel));
 }
 for(const d of TOES){
   const yaw=bone(foot,d.id+'_SPLAY',[d.x,.028,d.z]),mt=bone(yaw,d.id+'_MTP'),pip=bone(mt,d.id+'_PIP',[0,0,d.lengths[0]]),dip=bone(pip,d.id+'_DIP',[0,0,d.lengths[1]]);yaw.rotation.y=d.spread*.25;
   for(const [i,b]of [mt,pip,dip].entries()){const w=d.width*(1-i*.09);hinge(b,w,w*.32);segment(b,d.id+'_'+['PROXIMAL','MIDDLE','DISTAL'][i],d.lengths[i],w,i===2);}
   socket(dip,'SOCKET_'+d.id+'_TIP',[0,0,d.lengths[2]+.003],'toe_tip',[0,0,1]);
   socket(dip,'SOCKET_'+d.id+'_PAD',[0,-d.width*.82*.325-.00285,d.lengths[2]*.53],'tactile_contact',[0,-1,0]);
 }
 const hy=bone(foot,'HALLUX_OPPOSITION',HALLUX.base),hr=bone(hy,'HALLUX_ROLL'),hm=bone(hr,'HALLUX_MTP'),hi=bone(hm,'HALLUX_IP',[0,0,HALLUX.lengths[0]]);hy.rotation.y=-.55;
 add(hy,1,cyl(.018,.027,n,[0,0,0],C.dark));if(lod<2)add(hy,2,ring(.014,.002,n,[0,.015,0],C.gold));
 hinge(hm,HALLUX.width,.011);segment(hm,'HALLUX_PROXIMAL',HALLUX.lengths[0],HALLUX.width,false);hinge(hi,.030,.0095);segment(hi,'HALLUX_DISTAL',HALLUX.lengths[1],.030,true);
 socket(hi,'SOCKET_HALLUX_TIP',[0,0,HALLUX.lengths[1]+.003],'great_toe_tip',[0,0,1]);socket(hi,'SOCKET_HALLUX_PAD',[0,-.030*.325-.00285,HALLUX.lengths[1]*.53],'tactile_contact',[0,-1,0]);
 socket(ar,'SOCKET_ANKLE_ATTACH',[0,.071,0],'leg_mount',[0,1,0]);socket(foot,'SOCKET_HEEL',[0,.003,-.087],'heel_contact',[0,-1,0]);socket(foot,'SOCKET_FOREFOOT',[0,.006,.031],'forefoot_contact',[0,-1,0]);socket(foot,'SOCKET_ARCH',[0,.021,-.026],'arch_reference',[0,-1,0]);
 root.updateMatrixWorld(true);const geometry=[],statics=[];
 for(let m=0;m<mats.length;m++){const gs=[];for(const {b,g}of parts[m]){if(lod<2){const count=g.attributes.position.count,ii=new Uint16Array(count*4),ww=new Float32Array(count*4);for(let i=0;i<count;i++){ii[i*4]=bones.indexOf(b);ww[i*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ii,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(ww,4));}g.applyMatrix4(b.matrixWorld);gs.push(g);}if(lod===2)statics.push(...gs);else geometry.push(merged(gs));}
 if(lod===2){const mesh=new T.Mesh(merged(statics),new T.MeshStandardMaterial({name:'DISTANCE_PALETTE',vertexColors:true,metalness:.25,roughness:.45}));mesh.name='NISOKU_DISTANCE_GEOMETRY';root.add(mesh);root.traverse(o=>{o.userData.static_lookup_only=true;});}
 else{const sk=new T.SkinnedMesh(mergeGeometries(geometry,true),mats);sk.name=root.name;sk.userData={...root.userData};for(const c of [...root.children])sk.add(c);sk.bind(new T.Skeleton(bones));root=sk;}
 return root;
}
