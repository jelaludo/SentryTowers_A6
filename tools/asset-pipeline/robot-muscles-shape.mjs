import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MUSCLES,MUSCLE_MODULES} from '../../assets/robot-assembly/muscles/specs.js';
import {muscleFrame} from '../../assets/robot-assembly/muscles/runtime.js';
const C={sheath:0x303b3e,fiber:0x4a5659,tendon:0x697b80,braid:0x9da6a0,collar:0xa39372};
function finish(g,color){g.deleteAttribute('uv');g.computeVertexNormals();const c=new T.Color(color),colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)c.toArray(colors,i);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.clearGroups();return g;}
function belly(s,lod){
 const n=lod===0?36:10,rows=lod===0?24:9,p=[],ix=[],shades=[];
 for(let j=0;j<=rows;j++){const u=j/rows,t=(s.shape==='fan'?.045:.105)+(s.shape==='fan'?.850:.790)*u,fall=u<s.peak?u/s.peak:(1-u)/(1-s.peak);let radius=.10+.90*Math.sin(Math.PI*.5*Math.max(0,fall))**.64;
  if(s.shape==='fan')radius=.10+.86*Math.cos(u*Math.PI/2)**.75;
  if(s.shape==='strap')radius=.35+.65*Math.sin(Math.PI*u)**.35;
  if(s.shape==='cap')radius=Math.max(radius,.48*(1-u));
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,fiber=Math.cos(a*(lod===0?12:5)+t*.7),r=radius*(1+(lod===0?.035:.018)*fiber);p.push(s.width*r*Math.cos(a),t,s.bow*Math.sin(Math.PI*t)+s.depth*r*Math.sin(a));shades.push(.73+.27*(.5+.5*fiber));}
 }
 for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;ix.push(a,a+n,b,b,a+n,b+n);}
 for(let i=1;i<n-1;i++){ix.push(0,i,i+1);const k=rows*n;ix.push(k,k+i+1,k+i);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);finish(g,C.sheath);const colors=g.attributes.color;for(let i=0;i<colors.count;i++)colors.setXYZ(i,colors.getX(i)*shades[i],colors.getY(i)*shades[i],colors.getZ(i)*shades[i]);return g;
}
function tube(points,r,sides,segments,color){const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,sides,false);return finish(g,color);}
function tendon(s,lod,length){
 // Geometry is authored in a physical frame, then normalised in Y for the driver.
 const pieces=[];
 for(const [start,end]of [[0,.15],[.85,1]]){
  const points=[];for(let i=0;i<=8;i++){const t=start+(end-start)*i/8;points.push([0,t*length,s.bow*Math.sin(Math.PI*t)]);}
  pieces.push(tube(points,s.tendon,lod===0?8:5,lod===0?12:2,C.tendon));
  if(lod===0)for(let strand=0;strand<4;strand++){const points=[];for(let i=0;i<=32;i++){const t=start+(end-start)*i/32,a=i/32*Math.PI*5+strand*Math.PI/2;points.push([Math.cos(a)*s.tendon*.95,t*length,s.bow*Math.sin(Math.PI*t)+Math.sin(a)*s.tendon*.95]);}pieces.push(tube(points,s.tendon*.23,4,32,strand%2?C.braid:C.fiber));}
  for(const t of [start===0?.027:.973]){const g=new T.CylinderGeometry(s.tendon*1.55,s.tendon*1.55,.004,lod===0?12:6);g.translate(0,t*length,s.bow*Math.sin(Math.PI*t));pieces.push(finish(g,C.collar));}
 }
 const g=mergeGeometries(pieces.map(g=>g.index?g.toNonIndexed():g));g.scale(1,1/length,1);return g;
}
export function buildMuscles(host,lod){
 const scene=new T.Scene();scene.name='AUREL_03_MUSCLE_LAYER';const root=new T.Group();root.name='AUREL_03_MUSCLE_ROOT';root.userData={family:'aurel03-muscles',lod,damage_level:0,static:false,optional_layer:true,units:'metres',up:'+Y',forward:'+Z'};scene.add(root);
 const driver=new T.Bone();driver.name='MUSCLE_DRIVER_ROOT';driver.userData={role:'fixed_frame'};root.add(driver);
 const bones=[driver],parts=Object.fromEntries(MUSCLE_MODULES.map(id=>[id,[]]));host.updateMatrixWorld(true);scene.updateMatrixWorld(true);
 for(const s of MUSCLES){const f=muscleFrame(s,host,scene);for(const [kind,g]of [['MUSCLE',belly(s,lod)],['TENDON',tendon(s,lod,f.length)]]){
   const bone=new T.Bone();bone.name=kind+'_'+s.id;bone.position.copy(f.origin);bone.quaternion.copy(f.quaternion);bone.scale.set(1,f.length,1);bone.userData={role:'engine_pivot',muscle:s.id,module:s.module,rest_length_m:f.length};driver.add(bone);bones.push(bone);scene.updateMatrixWorld(true);
   const count=g.attributes.position.count,ii=new Uint16Array(count*4),ww=new Float32Array(count*4);for(let i=0;i<count;i++){ii[i*4]=bones.length-1;ww[i*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ii,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(ww,4));g.applyMatrix4(bone.matrixWorld);parts[s.module].push(g.index?g.toNonIndexed():g);
   if(kind==='TENDON')for(const [name,y]of [['ORIGIN',0],['INSERTION',1]]){const socket=new T.Group();socket.name='SOCKET_'+s.id+'_'+name;socket.position.y=y;socket.userData={role:'socket',host_node:s[name==='ORIGIN'?'origin':'insertion'].node,host_local_m:s[name==='ORIGIN'?'origin':'insertion'].p};bone.add(socket);}
  }
 }
 const mat=new T.MeshStandardMaterial({name:'CARBON_SHEATH_AND_BRAID',vertexColors:true,metalness:.32,roughness:.59});
 for(const id of MUSCLE_MODULES){const geometry=mergeVertices(mergeGeometries(parts[id]),1e-6),mesh=new T.SkinnedMesh(geometry,mat);mesh.name='MUSCLE_SURFACE_'+id;mesh.userData={module:id,layer:'muscles'};scene.add(mesh);scene.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));}
 const distance=new T.Group();distance.name='MUSCLE_DISTANCE_SURFACE';scene.add(distance);return scene;
}
