import * as T from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SPEC,TIERS,direction,attentionDirection,hash,createRig} from '../../assets/latent-field/runtime.js';
const v=a=>new T.Vector3(...a);
export function fiberField(lod){
 const tier=TIERS[lod],p=[],n=[],c=[],ix=[];
 for(let i=0;i<tier.fibers;i++){
  const d=v(direction(i,tier.fibers)),t=new T.Vector3().crossVectors(d,Math.abs(d.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0)).normalize(),b=new T.Vector3().crossVectors(d,t),start=2.8+hash(i+1)*3.6,end=16-.12*hash(i+8),r=tier.radius*(.7+hash(i+90)*.6),base=p.length/3;
  for(let j=0;j<=tier.segments;j++){const u=j/tier.segments,center=d.clone().multiplyScalar(T.MathUtils.lerp(start,end,u)).addScaledVector(t,.045*Math.sin(Math.PI*u)*hash(i));for(let k=0;k<tier.sides;k++){const a=k/tier.sides*Math.PI*2+hash(i)*2,normal=t.clone().multiplyScalar(Math.cos(a)).addScaledVector(b,Math.sin(a));p.push(...center.clone().addScaledVector(normal,r*(1-u*.45)).toArray());n.push(...normal.toArray());const tone=.004+(.005+.007*hash(i))*u;c.push(tone*.68,tone,tone*.85);}}
  for(let j=0;j<tier.segments;j++)for(let k=0;k<tier.sides;k++){const a=base+j*tier.sides+k,b=base+j*tier.sides+(k+1)%tier.sides;ix.push(a,b,a+tier.sides,b,b+tier.sides,a+tier.sides);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(ix);return g;
}
export function buildField(lod){
 const scene=new T.Scene();scene.name='LATENT_FIELD_SCENE';const root=new T.Group();root.name='LATENT_ROOT';root.userData={family:'latent-field',lod,static:lod===2,damage_level:0};scene.add(root);const frame=new T.Bone();frame.name='FLOAT_FRAME';frame.position.y=25;root.add(frame);
 const center=new T.Group();center.name='SOCKET_FIELD_CENTER';center.userData.role='socket';frame.add(center);
 const shell=new T.Mesh(fiberField(lod),new T.MeshStandardMaterial({name:'DORMANT_GLASS',vertexColors:true,metalness:.35,roughness:.22}));shell.name='DORMANT_FIBERS';frame.add(shell);
 const bones=[frame],geometries=[];
 for(let i=0;i<48;i++){
  const id=String(i+1).padStart(2,'0'),d=v(attentionDirection(i)),mount=new T.Group();mount.name='ATTENTION_'+id;mount.position.copy(d).multiplyScalar(SPEC.root_radius_m);mount.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d);frame.add(mount);
  const shaft=new T.Bone();shaft.name='FIBER_'+id;shaft.scale.y=7.58;shaft.userData.engine_driven=true;mount.add(shaft);const eye=new T.Bone();eye.name='EYE_'+id;eye.position.y=7.58;eye.userData.engine_driven=true;mount.add(eye);bones.push(shaft,eye);const socket=new T.Group();socket.name='SOCKET_EYE_'+id;socket.userData.role='socket';eye.add(socket);
  root.updateMatrixWorld(true);const frameInverse=frame.matrixWorld.clone().invert();
  function add(g,bone,weight,atTip){if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));g.deleteAttribute('uv');const count=g.attributes.position.count,skinIndex=new Uint16Array(count*4),skinWeight=new Float32Array(count*4),colors=new Float32Array(count*3),ids=new Float32Array(count),glow=new Float32Array(count),along=new Float32Array(count);for(let j=0;j<count;j++){skinIndex[j*4]=bones.indexOf(bone);skinWeight[j*4]=1;ids[j]=i;glow[j]=weight;along[j]=atTip?1:g.attributes.position.getY(j);colors.set([.004,.007,.005],j*3);}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeight,4));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('fiberId',new T.Float32BufferAttribute(ids,1));g.setAttribute('glow',new T.Float32BufferAttribute(glow,1));g.setAttribute('along',new T.Float32BufferAttribute(along,1));g.applyMatrix4(frameInverse.clone().multiply(bone.matrixWorld));geometries.push(g);}
  const cylinder=new T.CylinderGeometry(.010,.013,1,lod===0?6:lod===1?4:3,1,true);cylinder.translate(0,.5,0);add(cylinder,shaft,.6,false);
  if(lod<2){const ring=new T.TorusGeometry(.092,.014,lod===0?5:3,lod===0?16:8);ring.rotateX(Math.PI/2);add(ring,eye,1,true);const pupil=new T.OctahedronGeometry(.028,0);add(pupil,eye,.26,true);}else add(new T.OctahedronGeometry(.105,0),eye,.85,true);
 }
 const active=new T.SkinnedMesh(mergeGeometries(geometries),new T.MeshBasicMaterial({name:'EMERALD_ATTENTION',vertexColors:true}));active.name='ATTENTION_FIBERS';active.frustumCulled=false;frame.add(active);root.updateMatrixWorld(true);active.bind(new T.Skeleton(bones));
 if(lod<2){active.geometry.applyMatrix4(active.matrixWorld);active.removeFromParent();scene.add(active);scene.updateMatrixWorld(true);active.bind(new T.Skeleton(bones));}
 const marker=new T.Group();marker.name='DISTANCE_SURFACE';frame.add(marker);root.userData.static=false;createRig(scene).pose(0);root.userData.static=lod===2;
 if(lod===2){
  const g=active.geometry.clone(),pos=g.attributes.position,norm=g.attributes.normal,p=new T.Vector3(),n=new T.Vector3(),normalMatrix=new T.Matrix3(),skinMatrix=new T.Matrix4();active.skeleton.update();
  for(let j=0;j<pos.count;j++){active.getVertexPosition(j,p);pos.setXYZ(j,p.x,p.y,p.z);const k=g.attributes.skinIndex.getX(j);skinMatrix.multiplyMatrices(active.skeleton.bones[k].matrixWorld,active.skeleton.boneInverses[k]).premultiply(active.bindMatrixInverse).multiply(active.bindMatrix);normalMatrix.getNormalMatrix(skinMatrix);n.fromBufferAttribute(norm,j).applyMatrix3(normalMatrix).normalize();norm.setXYZ(j,n.x,n.y,n.z);}
  for(const name of Object.keys(g.attributes))if(!['position','normal','color'].includes(name))g.deleteAttribute(name);
  const merged=mergeGeometries([shell.geometry,g]);for(const mesh of [shell,active]){const empty=new T.Group();empty.name=mesh.name;frame.add(empty);mesh.removeFromParent();}marker.removeFromParent();const mesh=new T.Mesh(merged,new T.MeshStandardMaterial({name:'LATENT_STATIC_PALETTE',vertexColors:true,roughness:.45,metalness:.25}));mesh.name='DISTANCE_SURFACE';frame.add(mesh);root.traverse(n=>{n.userData.static_lookup_only=true;});
 }
 return scene;
}
