// Shared viewer/measurement helpers. Pass the consuming Three.js instance.
export function poseDefense(building,sentry,yawDeg,depressionDeg){
 const yaw=building.getObjectByName('MOUNT_YAW'),pitch=building.getObjectByName('CRADLE_PITCH');
 yaw.rotation.y=yawDeg*Math.PI/180;pitch.rotation.x=depressionDeg*Math.PI/180;
 if(sentry){if(sentry.parent!==pitch)pitch.add(sentry);sentry.position.set(0,0,0);sentry.rotation.set(0,0,0);sentry.getObjectByName('YAW').rotation.y=0;sentry.getObjectByName('PITCH').rotation.x=0;}
 building.updateMatrixWorld(true);
}
export function firingTrace(T,sentry,buildings,projectileRadius=.1){
 const muzzle=sentry.getObjectByName('MUZZLE_00'),origin=muzzle.getWorldPosition(new T.Vector3()),q=muzzle.getWorldQuaternion(new T.Quaternion()),direction=new T.Vector3(0,0,1).applyQuaternion(q).normalize();
 if(direction.y>=-1e-6)return{origin,direction,ground:null,hit:null,clear:false};
 const distance=-origin.y/direction.y,ground=origin.clone().addScaledVector(direction,distance),ray=new T.Raycaster(),meshes=[];
 for(const building of buildings)building.traverse(o=>{if(o.isMesh&&!isInside(o,sentry)&&!(o.name.startsWith('PORT_CAP_')&&!o.visible))meshes.push(o);});
 // Transparent shells remain solid obstructions, including during cutaway inspection.
 const right=new T.Vector3(1,0,0).applyQuaternion(q),up=new T.Vector3(0,1,0).applyQuaternion(q);let hit=null;
 const offsets=[[0,0],...Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*projectileRadius,Math.sin(i*Math.PI/4)*projectileRadius])];
 for(const [x,y]of offsets){ray.set(origin.clone().addScaledVector(right,x).addScaledVector(up,y),direction);ray.near=0;ray.far=distance;const h=ray.intersectObjects(meshes,false)[0];if(h&&(!hit||h.distance<hit.distance))hit=h;}
 return{origin,direction,ground,hit,clear:!hit};
}
function isInside(o,root){while(o){if(o===root)return true;o=o.parent;}return false;}
