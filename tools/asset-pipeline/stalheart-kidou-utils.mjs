import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MeshoptSimplifier} from 'meshoptimizer';
export const triangles=g=>(g.index?.count||g.attributes.position.count)/3;
export function clean(g){
 const s=g.index?g.toNonIndexed():g.clone(),p=s.attributes.position,keep=[];
 for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-18)keep.push(i,i+1,i+2);}
 const out=new T.BufferGeometry();for(const [key,a]of Object.entries(s.attributes)){if(!['position','normal','color'].includes(key))continue;out.setAttribute(key,new T.Float32BufferAttribute(keep.flatMap(i=>Array.from({length:a.itemSize},(_,j)=>a.getComponent(i,j))),a.itemSize));}out.clearGroups();return mergeVertices(out,1e-5);
}
export function geometryFor(mesh,anchor){
 const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();mesh.updateWorldMatrix(true,false);anchor.updateWorldMatrix(true,false);g.applyMatrix4(new T.Matrix4().copy(anchor.matrixWorld).invert().multiply(mesh.matrixWorld));
 for(const k of Object.keys(g.attributes))if(!['position','normal','color'].includes(k))g.deleteAttribute(k);
 if(!g.attributes.color){const mats=[].concat(mesh.material),colors=new Float32Array(g.attributes.position.count*3),fill=(start,count,m)=>{const c=m.color.clone();if(m.emissive)c.lerp(m.emissive,.14);for(let i=start;i<start+count;i++)c.toArray(colors,i*3);};fill(0,g.attributes.position.count,mats[0]);for(const v of g.groups)fill(v.start,v.count,mats[v.materialIndex]);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}else{const c=g.attributes.color;g.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:c.count*3},(_,i)=>c.getComponent(Math.floor(i/3),i%3)),3));}
 g.clearGroups();return g;
}
export function merge(gs){return clean(mergeGeometries(gs));}
export async function simplify(g,target){
 await MeshoptSimplifier.ready;if(triangles(g)<=target)return g.clone();g=clean(g);g.computeBoundingBox();const b=g.boundingBox.clone(),p=g.attributes.position,c=g.attributes.color;
 const locks=Uint8Array.from({length:p.count},(_,i)=>['x','y','z'].some((a,j)=>Math.abs(p.getComponent(i,j)-b.min[a])<1e-5||Math.abs(p.getComponent(i,j)-b.max[a])<1e-5)?1:0);
 const [idx]=MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(g.index.array),p.array,3,c.array,3,[.12,.12,.12],locks,Math.floor(target)*3,.2,['Permissive']);g.setIndex(new T.BufferAttribute(idx,1));g=clean(g);g.computeBoundingBox();const r=g.boundingBox.clone(),q=g.attributes.position;for(let i=0;i<q.count;i++)for(let j=0;j<3;j++){const a=['x','y','z'][j],range=r.max[a]-r.min[a];if(range>1e-8)q.setComponent(i,j,b.min[a]+(q.getComponent(i,j)-r.min[a])/range*(b.max[a]-b.min[a]));}g.computeVertexNormals();return mergeVertices(g,1e-5);
}
export function kit(root,material,lod){
 const n=lod===0?20:8,C={shell:0xc3cccb,frame:0x52616a,edge:0x85949c,dark:0x26343d,amber:0xe2b363,steel:0xc6d0d3};
 const group=(name,parent=root,p=[0,0,0],engine=false)=>{const g=new T.Group();g.name=name;g.position.set(...p);if(engine)g.userData.engine_driven=true;parent.add(g);return g;};
 const box=(s,c,p=[0,0,0])=>[new T.BoxGeometry(...s),c,p];
 const cyl=(r,h,c,p=[0,0,0],rot=[0,0,0])=>[new T.CylinderGeometry(r,r,h,n),c,p,rot];
 const beam=(a,b,r,c)=>{const v=new T.Vector3(...a),w=new T.Vector3(...b),d=w.clone().sub(v),g=new T.CylinderGeometry(r,r,d.length(),n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));return[g,c,v.add(w).multiplyScalar(.5).toArray()];};
 const mesh=(name,parent,parts)=>{const gs=parts.map(([g,color,p=[0,0,0],r=[0,0,0]])=>{g=g.index?g.toNonIndexed():g;g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...r)));g.translate(...p);g.deleteAttribute('uv');const c=new T.Color(color),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)c.toArray(a,i);g.setAttribute('color',new T.Float32BufferAttribute(a,3));g.clearGroups();return g;});const m=new T.Mesh(merge(gs),material);m.name=name;parent.add(m);return m;};
 return{C,n,group,box,cyl,beam,mesh};
}
