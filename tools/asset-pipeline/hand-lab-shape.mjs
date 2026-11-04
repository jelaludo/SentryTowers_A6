// AUREL-01: original concept-driven hand. No reference-source meshes or code used.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {prep,cyl,ring,box,merged,socket} from './settlement-industry-shape.mjs';
import {DIGITS,THUMB,WRIST_Y} from '../../assets/hand-lab/runtime.js';
const C={ivory:0xe5dfd0,edge:0xf4f0e4,carbon:0x203039,dark:0x101c23,pad:0x26353b,steel:0x91a5aa,gold:0xc5a164,light:0xffc778};
function rounded(size,pos,color,lod,r=.002){return prep(lod===2?new T.BoxGeometry(...size):new RoundedBoxGeometry(...size,lod===0?3:1,Math.min(r,...size.map(x=>x*.45))),color,pos);}
function plate(points,depth,pos,color,lod){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const b=lod===0?.0012:lod===1?.0007:0;const g=new T.ExtrudeGeometry(s,{depth:depth-2*b,bevelEnabled:b>0,bevelSize:b,bevelThickness:b,bevelSegments:lod===0?3:1,steps:1,curveSegments:1});g.translate(0,0,-depth/2+b);return prep(g,color,pos);}
function skinShell(length,width,depth,color,lod){
 const n=lod===0?24:lod===1?12:6,stations=[[.004,.69,.75],[.008,1,1],[length*.44,1.015,1.03],[length-.006,.79,.92],[length-.001,.50,.55]],p=[],ix=[];
 for(const [y,w,h]of stations)for(let i=0;i<n;i++){const a=i/n*Math.PI*2,co=Math.cos(a),si=Math.sin(a);p.push(Math.sign(co)*Math.abs(co)**.68*width*.5*w,y,Math.sign(si)*Math.abs(si)**.70*depth*.5*h);}
 for(let j=0;j<stations.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;ix.push(a,a+n,b,b,a+n,b+n);}
 for(let i=1;i<n-1;i++){ix.push(0,i,i+1);const a=(stations.length-1)*n;ix.push(a,a+i+1,a+i);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return prep(g,color);
}
export function buildHand(lod){
 let root=new T.Group();root.name='AUREL_01_ROOT';root.userData={family:'aurel01',version:1,lod,damage_level:0,static:lod===2,handedness:'right',units:'meters',palm_normal:'+Z',plot_m:[.32,.32]};
 const mats=[new T.MeshStandardMaterial({name:'CERAMIC_IVORY',vertexColors:true,metalness:.28,roughness:.28}),new T.MeshStandardMaterial({name:'GRAPHITE_STRUCTURE',vertexColors:true,metalness:.62,roughness:.3}),new T.MeshStandardMaterial({name:'GOLD_TITANIUM',vertexColors:true,metalness:.8,roughness:.25}),new T.MeshStandardMaterial({name:'TACTILE_ELASTOMER',vertexColors:true,metalness:.05,roughness:.85}),new T.MeshStandardMaterial({name:'AMBER_STATUS',vertexColors:true,metalness:.25,roughness:.25,emissive:C.light,emissiveIntensity:.55})];
 const bones=[],parts=mats.map(()=>[]),n=lod===0?32:lod===1?12:8;
 const bone=(parent,name,p=[0,0,0],role='engine_pivot',explode=null)=>{const o=new T.Bone();o.name=name;o.position.fromArray(p);o.userData={role,...(explode?{explode}:{})};parent.add(o);bones.push(o);return o;};
 const add=(b,m,g)=>parts[m].push({b,g});
 const base=bone(root,'WRIST_MOUNT',[0,0,0],'fixed_interface');
 add(base,1,cyl(.024,.031,n,[0,.016,0],C.carbon));add(base,0,cyl(.029,.012,lod===2?8:12,[0,.033,0],C.ivory));add(base,2,ring(.027,.001,n,[0,.039,0],C.gold));
 for(let i=0;i<(lod===2?0:6);i++){const a=i*Math.PI/3;add(base,0,rounded([.012,.026,.003],[0,.014,.025],C.ivory,lod).rotateY(a));}
 add(base,1,rounded([.020,.006,.002],[0,.033,-.029],C.dark,lod));add(base,4,rounded([.014,.002,.0015],[0,.033,-.0303],C.light,lod,.0006));
 for(let i=0;i<(lod===2?3:6);i++)add(base,1,ring(.0225-i*.00035,.002,n,[0,.042+i*.0034,0],C.carbon));
 const flex=bone(base,'WRIST_FLEX',[0,WRIST_Y,0]),wrist=bone(flex,'WRIST_DEVIATION');
 add(wrist,1,cyl(.020,.014,n,[0,.003,0],C.carbon));
 const palm=bone(wrist,'PALM_FRAME',[0,0,0],'fixed_frame'),dorsal=bone(palm,'PALM_DORSAL_SHELL',[0,0,0],'viewer_shell',[0,0,-.034]);
 const palmOutline=[[-.025,.008],[-.041,.032],[-.044,.071],[-.032,.086],[.029,.086],[.043,.071],[.034,.026],[.023,.008]];
 add(palm,1,plate(palmOutline,.022,[0,0,0],C.carbon,lod));
 // Separate flowing dorsal panels leave a graphite reveal around every edge.
 add(dorsal,0,plate([[-.039,.067],[-.031,.083],[.028,.083],[.038,.068],[.028,.054],[-.023,.054]],.008,[0,0,-.012],C.ivory,lod));
 add(dorsal,0,plate([[-.023,.051],[.027,.051],[.019,.014],[-.015,.014],[-.031,.033]],.008,[0,0,-.013],C.ivory,lod));
 add(dorsal,0,plate([[-.039,.065],[-.025,.052],[-.033,.033],[-.025,.013],[-.039,.029],[-.047,.047]],.006,[0,0,-.014],C.edge,lod));
 add(dorsal,0,plate([[.039,.065],[.029,.053],[.021,.012],[.030,.019],[.042,.044]],.006,[0,0,-.014],C.ivory,lod));
 add(dorsal,1,rounded([.020,.004,.002],[0,.062,-.0172],C.dark,lod,.001));add(dorsal,4,rounded([.014,.0014,.001],[0,.062,-.0185],C.light,lod,.0005));
 // Four metacarpal beams and gold tendon guides visible with shells removed.
 for(const d of DIGITS){add(palm,1,rounded([.007,d.y-WRIST_Y-.018,.008],[d.x*.7,(d.y-WRIST_Y+.018)/2,0],C.steel,lod));if(lod<2){add(palm,2,cyl(.0013,d.y-WRIST_Y-.02,6,[d.x*.65,(d.y-WRIST_Y+.02)/2,-.006],C.gold));}}
 // The palm has distinct thenar, hypothenar and distal pads rather than one slab.
 add(palm,3,plate([[-.025,.047],[-.035,.063],[-.025,.075],[.027,.075],[.031,.055],[.009,.030],[-.010,.029]],.005,[0,0,.014],C.pad,lod));
 add(palm,3,plate([[-.034,.015],[-.041,.033],[-.034,.052],[-.022,.047],[-.011,.029],[-.016,.013]],.006,[0,0,.015],C.pad,lod));
 add(palm,3,plate([[.013,.024],[.029,.044],[.035,.040],[.026,.015],[.012,.012]],.006,[0,0,.014],C.pad,lod));
 add(palm,3,rounded([.034,.009,.006],[0,.009,.013],C.pad,lod));
 function texture(b,width,len,z,y0=0){if(lod!==0)return;const pitch=.0018,columns=Math.floor(width/pitch);for(let j=0;j<Math.floor(len/pitch);j++)for(let i=0;i<columns;i++){const x=(i-(columns-1)/2+(j%2)*.35)*pitch;add(b,3,cyl(.0003,.0001,6,[x,y0+(j+.5)*pitch,z-.00002],0x304147,[Math.PI/2,0,0]));}}
 if(lod===0){texture(palm,.043,.025,.0175,.048);for(const [x,y]of [[-.031,.073],[.030,.072],[-.027,.023],[.025,.026]])add(dorsal,2,cyl(.0015,.001,8,[x,y,-.017],C.steel,[Math.PI/2,0,0]));}
 function hinge(b,width,r){
  add(b,1,cyl(r,width*.9,n,[0,0,0],C.dark,[0,0,Math.PI/2]));
  if(lod<2)for(const side of [-1,1]){add(b,2,ring(r*.72,r*.10,n,[side*width*.49,0,0],C.gold,[0,Math.PI/2,0]));add(b,1,cyl(r*.48,.0015,n,[side*width*.49,0,0],C.steel,[0,0,Math.PI/2]));}
  if(lod===0)for(const y of [-.003,0,.003])add(b,1,ring(r*.96,.0009,24,[0,y,0],C.carbon,[Math.PI/2,0,0]));
 }
 function segment(b,id,len,width,distal){
  const shell=bone(b,id+'_SHELL',[0,0,0],'viewer_shell',[0,.004,-.022]);
  add(b,1,rounded([width*.62,len*.82,width*.54],[0,len*.47,0],C.carbon,lod));
  add(shell,0,skinShell(len-.002,width,width*.71,C.ivory,lod));
  const padLen=len-.010,padWidth=width*.78,z=width*.36;
  add(b,3,rounded([padWidth,padLen,.0038],[0,len*.5+.001,z],C.pad,lod,.003));
  texture(b,padWidth*.8,padLen*.82,z+.0021,len*.5+.001-padLen*.41);
  if(distal){const cap=new T.SphereGeometry(1,lod===0?24:lod===1?12:6,lod===0?12:lod===1?6:3);cap.scale(width*.35,.004,.004);add(b,3,prep(cap,C.pad,[0,len-.002,.003]));}
  if(lod===0){for(const side of [-1,1])add(shell,2,cyl(.001,.0007,8,[side*width*.32,len*.19,-width*.35],C.steel,[Math.PI/2,0,0]));}
  if(id.endsWith('PROXIMAL')){add(shell,1,rounded([.003,.011,.0012],[0,len*.52,-width*.367],C.dark,lod,.001));add(shell,4,rounded([.001,.007,.0008],[0,len*.52,-width*.405],C.light,lod,.0004));}
 }
 for(const d of DIGITS){
  const s=bone(palm,d.id+'_MCP_SPREAD',[d.x,d.y-WRIST_Y,0],'engine_pivot',[d.x*.35,.020,0]),m=bone(s,d.id+'_MCP_FLEX'),p=bone(m,d.id+'_PIP_FLEX',[0,d.lengths[0],0],'engine_pivot',[0,.016,0]),ip=bone(p,d.id+'_DIP_FLEX',[0,d.lengths[1],0],'engine_pivot',[0,.014,0]);
  for(const [i,b]of [m,p,ip].entries()){const width=d.width*(1-i*.07);hinge(b,width,width*.36);segment(b,d.id+'_'+['PROXIMAL','MIDDLE','DISTAL'][i],d.lengths[i],width,i===2);}
  socket(ip,'SOCKET_'+d.id+'_TIP',[0,d.lengths[2],0],'fingertip',[0,1,0]);socket(ip,'SOCKET_'+d.id+'_CONTACT',[0,d.lengths[2]+.002,.003],'fingertip_contact',[0,1,0]);
  socket(ip,'SOCKET_'+d.id+'_PAD',[0,d.lengths[2]*.52,d.width*.86*.36+.0019],'tactile_pad',[0,0,1]);
 }
 const opp=bone(palm,'THUMB_CMC_OPPOSITION',THUMB.base,'engine_pivot',[-.018,0,.004]),abd=bone(opp,'THUMB_CMC_ABDUCTION');abd.rotation.z=.9;
 add(opp,1,cyl(.012,.021,n,[0,0,0],C.dark,[Math.PI/2,0,0]));add(opp,2,ring(.009,.0016,n,[0,0,.012],C.gold,[0,0,0]));
 const thumbFrame=bone(abd,'THUMB_AXIAL_ROLL');
 segment(thumbFrame,'THUMB_METACARPAL',THUMB.lengths[0],.022,false);
 const tm=bone(thumbFrame,'THUMB_MCP_FLEX',[0,THUMB.lengths[0],0],'engine_pivot',[0,.018,0]),ti=bone(tm,'THUMB_IP_FLEX',[0,THUMB.lengths[1],0],'engine_pivot',[0,.016,0]);
 hinge(tm,.021,.007);segment(tm,'THUMB_PROXIMAL',THUMB.lengths[1],.021,false);hinge(ti,.019,.0065);segment(ti,'THUMB_DISTAL',THUMB.lengths[2],.019,true);
 socket(ti,'SOCKET_THUMB_TIP',[0,THUMB.lengths[2],0],'fingertip',[0,1,0]);socket(ti,'SOCKET_THUMB_CONTACT',[0,THUMB.lengths[2]+.002,.003],'fingertip_contact',[0,1,0]);socket(ti,'SOCKET_THUMB_PAD',[0,THUMB.lengths[2]*.52,.0087],'tactile_pad',[0,0,1]);socket(base,'SOCKET_WRIST_ATTACH',[0,0,0],'wrist_mount',[0,-1,0]);socket(palm,'SOCKET_PALM',[0,.045,.018],'grasp_reference',[0,0,1]);
 root.updateMatrixWorld(true);const geometry=[],statics=[];
 for(let m=0;m<mats.length;m++){const gs=[];for(const {b,g}of parts[m]){if(lod<2){const count=g.attributes.position.count,ii=new Uint16Array(count*4),ww=new Float32Array(count*4);for(let i=0;i<count;i++){ii[i*4]=bones.indexOf(b);ww[i*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ii,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(ww,4));}g.applyMatrix4(b.matrixWorld);gs.push(g);}if(lod===2)statics.push(...gs);else geometry.push(merged(gs));}
 if(lod===2){const mesh=new T.Mesh(merged(statics),new T.MeshStandardMaterial({name:'DISTANCE_PALETTE',vertexColors:true,metalness:.25,roughness:.45}));mesh.name='AUREL_DISTANCE_GEOMETRY';root.add(mesh);root.traverse(o=>{o.userData.static_lookup_only=true;});}
 else{const sk=new T.SkinnedMesh(mergeGeometries(geometry,true),mats);sk.name=root.name;sk.userData={...root.userData};for(const c of [...root.children])sk.add(c);sk.bind(new T.Skeleton(bones));root=sk;}
 return root;
}
