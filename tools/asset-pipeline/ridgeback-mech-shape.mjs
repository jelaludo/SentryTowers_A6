import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {LEGS,UPPER,LOWER,applyMech,applyAirdrop,DROP_DURATION} from '../../assets/ridgeback-mech/runtime.js';
const C={sand:0x827565,light:0xa5957a,edge:0x4d4941,dark:0x242828,black:0x101819,steel:0x6b7472,rod:0xb6bdb5,amber:0xe3a349,glass:0x264a4c,scar:0x38322c};
export function buildMech(lod=0,damage=0){
 const root=new T.Group();root.name='MX06_ROOT';root.userData={family:'ridgeback-mech',damage_level:damage,lod,static:false,leg_count:6,spikes_per_foot:3};
 const mat=new T.MeshStandardMaterial({name:'MX06_ARMOR_PALETTE',vertexColors:true,roughness:.72,metalness:.4});
 const seg=lod===0?16:lod===1?8:4;
 const group=(name,parent=root,pos=[0,0,0])=>{const g=new T.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;};
 const box=(s,c,p=[0,0,0],r=[0,0,0])=>[new T.BoxGeometry(...s),c,p,r];
 const cyl=(r,h,c,p=[0,0,0],rot=[0,0,0],n=seg)=>[new T.CylinderGeometry(r,r,h,n),c,p,rot];
 function hull(s,c,p=[0,0,0],rot=[0,0,0]){const [x,y,z]=s.map(v=>v/2),cut=Math.min(x,z)*.24;const points=[];for(const yy of [-y,y])for(const [xx,zz] of [[-x+cut,-z],[x-cut,-z],[x,-z+cut],[x,z-cut],[x-cut,z],[-x+cut,z],[-x,z-cut],[-x,-z+cut]])points.push(new T.Vector3(xx*(yy>0?.87:1),yy,zz*(yy>0?.95:1)));return [new ConvexGeometry(points),c,p,rot];}
 function beam(a,b,r,c,n=seg){const va=new T.Vector3(...a),vb=new T.Vector3(...b),dir=vb.clone().sub(va),g=new T.CylinderGeometry(r,r,dir.length(),n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize()));return [g,c,va.add(vb).multiplyScalar(.5).toArray()];}
 function part(name,parent,items){
  const gs=items.map(([g,c,pos=[0,0,0],rot=[0,0,0]])=>{if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rot)));g.translate(...pos);for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);const color=new T.Color(c),data=new Float32Array(g.attributes.position.count*3);for(let i=0;i<data.length;i+=3){data[i]=color.r;data[i+1]=color.g;data[i+2]=color.b;}g.setAttribute('color',new T.BufferAttribute(data,3));return g;});
  const raw=mergeGeometries(gs),g=mergeVertices(raw,1e-5);raw.dispose();gs.forEach(g=>g.dispose());const m=new T.Mesh(g,mat);m.name=name;parent.add(m);return m;
 }
 const drop=group('DROP_ROOT',root);
 const body=group('MECH_BODY',drop,[0,1.9,0]);
 const shell=[hull([2.25,.7,3.85],C.sand,[0,.14,0]),hull([1.65,.28,3.5],C.dark,[0,-.31,0]),hull([1.8,.25,2.6],C.edge,[0,.55,-.26]),hull([1.65,.36,.8],C.light,[0,.22,1.86],[-.22,0,0]),box([1.9,.14,.22],C.dark,[0,-.06,2.12])];
 for(const side of [-1,1]){
  for(const z of [-1.35,-.45,.45,1.35]){
   if(!(damage===3&&side===-1&&z>.2))shell.push(hull([.23,.55,.76],damage>=2&&z>1?C.scar:C.light,[side*1.04,.24,z],[0,0,side*.16]));
   if(lod<2){shell.push(box([.04,.25,.24],C.dark,[side*1.17,.22,z]));if(lod===0)for(const dz of [-.27,.27])for(const dy of [.03,.43])shell.push(cyl(.025,.05,C.steel,[side*1.19,dy,z+dz],[0,0,Math.PI/2],6));}
  }
  shell.push(hull([.6,.24,1.45],C.sand,[side*.58,.55,.75],[.12,0,side*.08]),box([.24,.12,.17],C.dark,[side*.72,.12,2.2]),box([.16,.035,.025],damage<3?C.amber:C.black,[side*.72,.13,2.295]));
  if(lod<2){for(let i=0;i<7;i++)shell.push(box([.39,.035,.05],C.dark,[side*.54,.7,-1.4+i*.105]));shell.push(beam([side*.77,.70,-.75],[side*.77,.70,.9],.035,C.steel),hull([.4,.22,.65],C.edge,[side*.62,.65,-1.35]));}
  if(lod===0){for(let i=0;i<7;i++)shell.push(box([.035,.008,.09],C.scar,[side*.45,.72,.15+i*.19],[0,.3*i,0]));for(const z of [-1.55,1.6])shell.push(beam([side*.65,-.06,z],[side*.65,-.18,z+.16],.045,C.steel));}
 }
 if(damage>=2)shell.push(hull([.7,.15,.65],C.black,[-.7,.53,.9],[.3,0,-.2]),beam([-.65,.48,.7],[-.4,.65,1.2],.04,C.steel));
 shell.push(cyl(.09,.18,C.dark,[.9,.72,-1.3]),cyl(.015,damage===3?.25:1.1,C.steel,[.9,damage===3?.92:1.35,-1.3],[damage===3?.5:0,0,0],6));
 for(const side of [-1,1])shell.push(beam([side*.72,.62,-1.3],[side*1.18,1.08,-1.45],.085,C.edge));
 shell.push(cyl(.22,.17,C.edge,[0,-.48,0]),cyl(.14,.025,C.black,[0,-.575,0]));
 group('SOCKET_BRAKE_JET',body,[0,-.59,0]).userData={axis:[0,-1,0],kind:'braking_jet'};
 for(const side of [-1,1])for(const z of [-.8,.8])group(`SOCKET_AIRDROP_${side<0?'L':'R'}_${z<0?'REAR':'FRONT'}`,body,[side*.8,.56,z]);
 part('HULL_ARMOR',body,shell);group('SOCKET_PAYLOAD',body,[0,.72,-.35]);group('SOCKET_ROOT_MOTION',root);
 const sensor=group('SENSOR_YAW',body,[0,.33,2.33]);part('RECON_SENSOR',sensor,[hull([.68,.29,.23],C.edge),cyl(.09,.055,C.black,[-.17,0,.14],[Math.PI/2,0,0]),cyl(.062,.06,C.glass,[-.17,0,.15],[Math.PI/2,0,0]),box([.17,.12,.035],C.glass,[.16,0,.15])]);group('SOCKET_CAMERA',sensor,[0,0,.18]);
 for(const leg of LEGS){const {id,side,z}=leg;
  const yaw=group('HIP_YAW_'+id,body,[side*.98,0,z]);const hip=group('HIP_PITCH_'+id,yaw);const knee=group('KNEE_'+id,hip,[UPPER,0,0]);const ankle=group('ANKLE_'+id,knee,[LOWER,0,0]);
  const upper=[cyl(.30,.62,C.edge,[0,0,0],[Math.PI/2,0,0]),...(lod<2?[cyl(.22,.66,C.steel,[0,0,0],[Math.PI/2,0,0])]:[]),hull([.85,.36,.46],C.sand,[.66,.07,0]),box([UPPER,.14,.22],C.dark,[UPPER/2,-.1,0])];
  const lower=[cyl(.27,.56,C.edge,[0,0,0],[Math.PI/2,0,0]),...(lod<2?[cyl(.19,.59,C.steel,[0,0,0],[Math.PI/2,0,0])]:[]),box([LOWER,.17,.24],C.dark,[LOWER/2,0,0]),hull([1.13,.34,.46],C.light,[.67,.10,0],[0,0,damage>=2&&id==='FL'?.10:0]),cyl(.13,.44,C.edge,[LOWER,0,0],[Math.PI/2,0,0])];
  if(lod<2){for(const zz of [-.27,.27]){upper.push(cyl(.14,.035,C.dark,[0,0,zz*1.3],[Math.PI/2,0,0]),beam([.18,-.18,zz],[.89,-.18,zz],.046,C.steel));lower.push(beam([.5,-.16,zz*.6],[1.46,-.16,zz*.6],.038,C.rod));}
   for(let i=0;i<4;i++)lower.push(box([.045,.025,.25],C.dark,[.3+i*.09,.29,0]));
   // Protected hose follows the upper link; no unsupported cross-joint rigid hose.
   for(let i=0;i<5;i++)upper.push(cyl(.085,.045,C.black,[.24+i*.11,-.21,.18],[0,0,Math.PI/2],6));
  }
  if(lod===0){for(const x of [.22,.52,.86])for(const zz of [-.22,.22]){upper.push(cyl(.022,.028,C.steel,[x,.26,zz],undefined,6));lower.push(cyl(.024,.028,C.steel,[x,.29,zz],undefined,6));}for(const zz of [-.33,.33])for(let i=0;i<8;i++){const a=i*Math.PI/4;upper.push(cyl(.022,.035,C.light,[.25*Math.cos(a),.25*Math.sin(a),zz],[Math.PI/2,0,0],6));}}
  part('UPPER_ARM_'+id,hip,upper);part('SHIN_ARMOR_'+id,knee,lower);
  const foot=[cyl(.18,.16,C.edge,[0,0,0]),hull([.32,.13,.32],C.sand,[0,-.03,0])];
  for(let spike=0;spike<3;spike++){
   const a=spike*Math.PI*2/3,tip=new T.Vector3(Math.cos(a)*.56,-.18,Math.sin(a)*.56),c=new T.Vector3(Math.cos(a)*.15,-.015,Math.sin(a)*.15),v=new T.Vector3(-Math.sin(a)*.10,0,Math.cos(a)*.10);
   const pts=[c.clone().add(v),c.clone().sub(v),c.clone().add(new T.Vector3(0,.12,0)),c.clone().add(new T.Vector3(0,-.09,0)),tip];foot.push([new ConvexGeometry(pts),damage>=2?C.edge:C.steel]);
   if(lod<2)foot.push(beam([Math.cos(a)*.1,.065,Math.sin(a)*.1],[Math.cos(a)*.32,-.03,Math.sin(a)*.32],.043,C.rod));
   group('SOCKET_CLAW_'+id+'_'+(spike+1),ankle,tip.toArray());
  }
  part('TRIPOD_CLAW_'+id,ankle,foot);group('SOCKET_FOOT_'+id,ankle,[0,-.18,0]);
  group('SOCKET_HYDRAULIC_UPPER_'+id,hip,[.46,-.25,0]);group('SOCKET_HYDRAULIC_LOWER_'+id,knee,[.40,-.13,0]);
  const aim=group('HYDRAULIC_AIM_'+id,hip),rod=group('PISTON_SLIDE_'+id,aim);
  part('HYDRAULIC_BARREL_'+id,aim,[cyl(.078,.54,C.dark,[0,.27,0]),cyl(.10,.06,C.light,[0,.49,0])]);
  part('HYDRAULIC_ROD_'+id,rod,[cyl(.035,.54,C.rod,[0,-.27,0]),box([.13,.07,.15],C.edge)]);
 }
 // Engine-driven weapon axes are intentionally excluded from gait clips.
 const my=group('MINIGUN_YAW',body,[-.57,.82,.1]),mp=group('MINIGUN_PITCH',my);
 part('MINIGUN_RECEIVER',mp,[cyl(.32,.64,C.edge,[0,.08,.13],[Math.PI/2,0,0]),hull([.5,.5,.65],C.sand,[0,.08,-.19]),cyl(.35,.10,C.steel,[0,.08,.48],[Math.PI/2,0,0])]);
 const spin=group('MINIGUN_SPIN',mp,[0,.08,.5]),barrels=[];
 for(let i=0;i<6;i++){const a=i*Math.PI/3,x=.18*Math.cos(a),y=.18*Math.sin(a);barrels.push(cyl(.062,1.7,C.dark,[x,y,.85],[Math.PI/2,0,0]),cyl(.040,.012,C.black,[x,y,1.708],[Math.PI/2,0,0]));group('SOCKET_MINIGUN_MUZZLE_'+(i+1),spin,[x,y,1.72]);}
 for(const z of [.12,1.3,1.62])barrels.push(cyl(.26,.07,C.edge,[0,0,z],[Math.PI/2,0,0]));part('MINIGUN_BARRELS',spin,barrels);
 const ly=group('LASER_YAW',body,[.58,.85,.1]),lp=group('LASER_PITCH',ly);
 const laser=[hull([.46,.46,1.8],C.sand,[0,.09,.65]),box([.28,.28,1.95],C.dark,[0,.09,.72]),hull([.54,.52,.23],C.edge,[0,.09,1.72]),box([.23,.26,.025],damage===3?C.black:C.amber,[0,.09,1.85])];
 if(lod<2)for(const side of [-1,1])laser.push(box([.04,.06,1.15],damage===3?C.black:C.amber,[side*.24,.08,.72]),beam([side*.19,.33,.18],[side*.19,.33,1.55],.033,C.steel));part('LASER_CANNON',lp,laser);group('SOCKET_LASER_MUZZLE',lp,[0,.09,1.88]);
 const missiles=group('MISSILE_ELEVATION',body,[0,1.08,-1.45]);
 for(const side of [-1,1]){
  const pod=group('MISSILE_OUTBOARD_'+(side<0?'L':'R'),missiles,[side*1.18,0,0]);pod.rotation.y=side*Math.PI/6;
  const items=[hull([.69,.94,.85],C.sand,[0,.2,0]),box([.60,.85,.04],C.dark,[0,.2,.45])];
  for(let r=0;r<3;r++)for(let col=0;col<2;col++){const x=(col-.5)*.28,y=.2+(r-1)*.27;items.push(cyl(.116,.12,C.edge,[x,y,.5],[Math.PI/2,0,0],lod===2?3:seg),cyl(.083,.015,C.black,[x,y,.565],[Math.PI/2,0,0]));if(lod===0)items.push([new T.TorusGeometry(.094,.008,4,seg),damage>=2?C.edge:C.amber,[x,y,.58]]);group(`SOCKET_MISSILE_${side<0?'L':'R'}_${r*2+col+1}`,pod,[x,y,.59]);}
  part('MISSILE_POD_'+(side<0?'L':'R'),pod,items);
 }
 if(lod===0&&damage<3){const detail=[];for(const s of [-1,1])for(let i=0;i<5;i++)detail.push(box([.05,.035,.18],C.dark,[s*.86,.48,-1.3+i*.5],[0,.3,0]));part('SERVICE_DETAILS',body,detail);}else part('SERVICE_DETAILS',body,[box([.18,.035,.26],C.edge,[0,.52,-1.55])]);
 // Deterministic mesh-only damage: hierarchy/socket coordinates are not destroyed.
 if(damage>0)root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,c=g.attributes.color;const hit=o.name==='HULL_ARMOR'||o.name.endsWith('FL')||o.name.startsWith('LASER')||damage===3;
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const intensity=hit?1:.25;
   if(o.name==='HULL_ARMOR'){const impact=Math.exp(-((x+.9)**2+(z-1.2)**2)*2);y-=(damage===1?.05:damage===2?.22:.42)*impact;x+=damage*.045*impact;}
   if(damage>=2&&o.name==='SHIN_ARMOR_FL'){z+=Math.sin(x/LOWER*Math.PI)*damage*.055;}
   if(damage===3&&o.name==='LASER_CANNON')y-=.16*Math.max(0,z);
   p.setXYZ(i,x,y,z);const noise=(Math.sin(x*39+y*27+z*31)+1)*.5,factor=damage===3?.37:1-intensity*damage*.13;
   for(let k=0;k<3;k++)c.array[i*3+k]=c.array[i*3+k]*factor+(noise>.88&&damage<3?.055:0);
  }p.needsUpdate=true;c.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 });
 applyMech(root,0,{mode:'park',damage});return root;
}
export function makeStatic(root){
 root.updateMatrixWorld(true);const gs=[],meshes=[];let material;
 root.traverse(o=>{if(o.isMesh){gs.push(o.geometry.clone().applyMatrix4(o.matrixWorld));meshes.push(o);material=o.material;}});
 for(const m of meshes){const lookup=new T.Group();lookup.name=m.name;lookup.userData={lookup_only:true};m.parent.add(lookup);m.removeFromParent();}
 const m=new T.Mesh(mergeGeometries(gs),material);m.name='MX06_STATIC';root.add(m);gs.forEach(g=>g.dispose());root.userData.static=true;return root;
}
export function walkClip(root,damage){
 if(damage===3)return null;const nodes=[];root.traverse(o=>{if(/^(HIP_YAW_|HIP_PITCH_|KNEE_|ANKLE_|HYDRAULIC_AIM_|PISTON_SLIDE_)/.test(o.name))nodes.push(o);});
 const times=[],values=new Map(nodes.map(n=>[n.name,{p:[],q:[]}]));
 for(let i=0;i<=120;i++){const t=i/30;times.push(t);applyMech(root,t,{damage});for(const n of nodes){values.get(n.name).p.push(...n.position);values.get(n.name).q.push(...n.quaternion);}}
 const tracks=[];for(const n of nodes){const v=values.get(n.name);tracks.push(new T.VectorKeyframeTrack(n.name+'.position',times,v.p),new T.QuaternionKeyframeTrack(n.name+'.quaternion',times,v.q));}
 applyMech(root,0,{mode:'park',damage});return new T.AnimationClip(damage===2?'Damaged_Walk_Cycle':'Walk_Cycle',4,tracks).optimize();
}

export function airdropClip(root,damage){
 if(damage===3)return null;
 const nodes=[];root.traverse(o=>{if(/^(DROP_ROOT$|MECH_BODY$|HIP_YAW_|HIP_PITCH_|KNEE_|ANKLE_|HYDRAULIC_AIM_|PISTON_SLIDE_)/.test(o.name))nodes.push(o);});
 const times=[],values=new Map(nodes.map(n=>[n.name,{p:[],q:[]}]));
 for(let i=0;i<=DROP_DURATION*60;i++){const t=i/60;times.push(t);applyAirdrop(root,t,{damage});for(const n of nodes){values.get(n.name).p.push(...n.position);values.get(n.name).q.push(...n.quaternion);}}
 const tracks=[];for(const n of nodes){const v=values.get(n.name);tracks.push(new T.VectorKeyframeTrack(n.name+'.position',times,v.p),new T.QuaternionKeyframeTrack(n.name+'.quaternion',times,v.q));}
 applyMech(root,0,{mode:'park',damage});return new T.AnimationClip('Airdrop_Land',DROP_DURATION,tracks).optimize();
}
