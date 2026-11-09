// Triangle SAT and BVH helpers from the RK-MG02 fit validator.
import * as T from 'three';
export function trianglesOf(scene){const result=[];scene.updateMatrixWorld(true);scene.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});scene.traverse(n=>{if(!n.isMesh||n.userData.helmet_fit_hidden)return;const p=n.geometry.attributes.position,ix=n.geometry.index,count=ix?.count||p.count;for(let i=0;i<count;i+=3){const v=[0,1,2].map(j=>n.getVertexPosition(ix?ix.getX(i+j):i+j,new T.Vector3()).applyMatrix4(n.matrixWorld));result.push({v,box:new T.Box3().setFromPoints(v),name:n.name});}});return result;}
export function tree(items){const box=new T.Box3();for(const t of items)box.union(t.box);if(items.length<=24)return{box,items};const size=box.getSize(new T.Vector3()),axis=size.x>size.y?(size.x>size.z?'x':'z'):(size.y>size.z?'y':'z');items.sort((a,b)=>a.box.min[axis]+a.box.max[axis]-b.box.min[axis]-b.box.max[axis]);const mid=items.length>>1;return{box,left:tree(items.slice(0,mid)),right:tree(items.slice(mid))};}
// Triangle SAT, including in-plane axes for coplanar pairs. AABB tree avoids
// comparing every head triangle with every master triangle.
function intersects(a,b){
 const edges=v=>[v[1].clone().sub(v[0]),v[2].clone().sub(v[1]),v[0].clone().sub(v[2])],ea=edges(a.v),eb=edges(b.v),na=ea[0].clone().cross(ea[1]),nb=eb[0].clone().cross(eb[1]),axes=[na,nb,...ea.map(e=>na.clone().cross(e)),...eb.map(e=>nb.clone().cross(e))];for(const x of ea)for(const y of eb)axes.push(x.clone().cross(y));
 for(const axis of axes){if(axis.lengthSq()<1e-24)continue;axis.normalize();const x=a.v.map(v=>v.dot(axis)),y=b.v.map(v=>v.dot(axis));if(Math.max(...x)<Math.min(...y)-1e-9||Math.max(...y)<Math.min(...x)-1e-9)return false;}return true;
}
export function collisions(root,t,result){if(!root.box.intersectsBox(t.box))return;if(root.items){for(const a of root.items)if(a.box.intersectsBox(t.box)&&intersects(a,t))result.push([a.name,t.name]);}else{collisions(root.left,t,result);collisions(root.right,t,result);}}
