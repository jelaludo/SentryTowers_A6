// Optional preview attachment. Source models remain unchanged; metres, +Y up, +Z forward.
export const FIT={helmet:'rk-mg02',parent:'HEAD_PITCH',scale:1,clearance_raise_m:.020,omit_standalone_collar:true,helmet_datum:'SOCKET_HEAD_DATUM',body_datum:'SOCKET_HEAD_ATTACH',namespace:'HELMET_'};
export function attachHelmet(host,helmet){
 const parent=host.getObjectByName(FIT.parent),bodyDatum=host.getObjectByName(FIT.body_datum),helmetDatum=helmet.getObjectByName(FIT.helmet_datum);
 if(!parent||!bodyDatum||!helmetDatum)throw Error('Helmet attachment datum missing');
 host.updateMatrixWorld(true);helmet.updateMatrixWorld(true);
 const position=bodyDatum.getWorldPosition(parent.position.clone()).sub(helmetDatum.getWorldPosition(parent.position.clone()));
 // Rotation stays +Z forward: the two socket normals oppose one another at rest.
 position.y+=FIT.clearance_raise_m;helmet.position.copy(position);helmet.updateMatrixWorld(true);parent.attach(helmet);
 // Reuse AUREL's neck assembly. The standalone collar is optional on this fit.
 const collar=helmet.getObjectByName('PART_COLLAR');collar?.traverse(n=>{if(n.isMesh){n.visible=false;n.userData.helmet_fit_hidden=true;}});
 const far=helmet.getObjectByName('DISTANCE_SURFACE');let omittedTriangles=0;
 if(far?.isMesh){const g=far.geometry.clone(),p=g.attributes.position,ix=g.index,count=ix?.count||p.count,keep=[];for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j);if(ids.every(i=>p.getY(i)<.069))omittedTriangles++;else keep.push(...ids);}g.setIndex(keep);g.computeBoundingBox();g.computeBoundingSphere();far.geometry.dispose();far.geometry=g;}
 helmet.traverse(n=>{if(n.name){n.userData.source_node=n.name;n.name=FIT.namespace+n.name;}if(n.isMesh){n.userData.helmet_fit=true;n.castShadow=n.receiveShadow=true;n.frustumCulled=false;}});
 let triangles=0,draw_calls=0;helmet.traverse(n=>{if(n.isMesh&&!n.userData.helmet_fit_hidden){triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;draw_calls++;}});return {root:helmet,parent,visible_cost:{triangles,draw_calls},omitted_distance_triangles:omittedTriangles,local_position_m:helmet.position.toArray(),rest_world_position_m:position.toArray(),scale:helmet.scale.toArray()};
}
