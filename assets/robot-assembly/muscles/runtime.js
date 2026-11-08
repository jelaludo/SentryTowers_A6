import {MUSCLES} from './specs.js';
import {EXPLODE} from '../runtime.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Compute a point without assembly separation, then give it its owner-module offset.
// This keeps cross-module muscles with their own part during the exploded study.
function separation(node,spread){const out=node.position.clone().set(0,0,0);for(let n=node;n;n=n.parent){const e=n.name?.startsWith('PART_')&&EXPLODE[n.name.slice(5)];if(e){const v=node.position.clone().fromArray(e).multiplyScalar(spread).applyMatrix4(n.parent.matrixWorld).sub(n.parent.getWorldPosition(node.position.clone()));out.add(v);}}return out;}
export function muscleFrame(spec,host,layer,spread=0){
 const V=p=>host.position.clone().fromArray(p),root=host.getObjectByName('PART_'+spec.module),shift=separation(root,spread),inverse=layer.matrixWorld.clone().invert();
 const point=anchor=>{const node=host.getObjectByName(anchor.node);if(!node)throw Error('Missing muscle anchor '+anchor.node);return V(anchor.p).applyMatrix4(node.matrixWorld).sub(separation(node,spread)).add(shift).applyMatrix4(inverse);};
 const a=point(spec.origin),b=point(spec.insertion),delta=b.clone().sub(a),length=delta.length();if(length<1e-5)throw Error('Collapsed muscle '+spec.id);
 const y=delta.divideScalar(length),normalNode=host.getObjectByName(spec.normal.node),normal=V(spec.normal.v).transformDirection(normalNode.matrixWorld).transformDirection(inverse),z=normal.addScaledVector(y,-normal.dot(y)).normalize();
 if(z.lengthSq()<.5)throw Error('Invalid muscle orientation '+spec.id);const x=host.position.clone().crossVectors(y,z).normalize(),quaternion=host.quaternion.clone().setFromRotationMatrix(host.matrixWorld.clone().makeBasis(x,y,z));
 return {origin:a,insertion:b,length,quaternion};
}
export function createMuscleRig(layer,host){
 const root=layer.getObjectByName('AUREL_03_MUSCLE_ROOT');if(!root)throw Error('Not an AUREL muscle layer');
 const staticTier=!!root.userData.static,items=MUSCLES.map(spec=>({spec,body:layer.getObjectByName('MUSCLE_'+spec.id),tendon:layer.getObjectByName('TENDON_'+spec.id)}));
 return {static:staticTier,items,update({spread=0}={}){
  if(staticTier)return {static:true};host.updateWorldMatrix(true,true);layer.updateWorldMatrix(true,true);let contraction=0;
  for(const {spec,body,tendon}of items){const f=muscleFrame(spec,host,layer,spread),ratio=body.userData.rest_length_m/f.length,thickness=clamp(Math.pow(ratio,.5*spec.bulge),.82,1.28);contraction=Math.max(contraction,1-1/ratio);
   for(const n of [body,tendon]){n.position.copy(f.origin);n.quaternion.copy(f.quaternion);n.scale.set(n===body?thickness:1,f.length,n===body?thickness:1);}
  }
  layer.updateMatrixWorld(true);layer.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});return {static:false,max_contraction:contraction};
 }};
}
