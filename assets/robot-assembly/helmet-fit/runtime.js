// Reversible replacement heads. Original GLBs remain untouched; metres, +Y up, +Z forward.
export const HELMET_FITS = Object.freeze({
 'rk-mg02': {label:'RK-MG02', scale:.80, source_crown_m:.3478, collar_cutoff_m:.070},
 'hex-witness': {label:'Hex Witness', scale:.72, source_crown_m:.379, collar_cutoff_m:.075},
 'breach-warden': {label:'Breach Warden', scale:.76, source_crown_m:.367, collar_cutoff_m:.090},
});
export const FIT = Object.freeze({parent:'HEAD_PITCH', crown_above_pitch_m:.215, replace_original_head:true, omit_standalone_collar:true, namespace:'HELMET_'});

// Compact the retained vertices as well as the index, so bounds do not include removed surfaces.
function retainTriangles(mesh, keepTriangle) {
 const source=mesh.geometry, ix=source.index, count=ix?.count||source.attributes.position.count, kept=[];
 for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j);if(keepTriangle(ids,i/3))kept.push(...ids);}
 const remap=new Map(), vertices=[], indices=kept.map(id=>{if(!remap.has(id)){remap.set(id,vertices.length);vertices.push(id);}return remap.get(id);}),g=new source.constructor();
 for(const [name,a] of Object.entries(source.attributes)){
  const data=new a.array.constructor(vertices.length*a.itemSize);
  for(let i=0;i<vertices.length;i++)for(let j=0;j<a.itemSize;j++)data[i*a.itemSize+j]=a.array[a.isInterleavedBufferAttribute?vertices[i]*a.data.stride+a.offset+j:vertices[i]*a.itemSize+j];
  const attribute=(source.index||a).clone();attribute.array=data;attribute.itemSize=a.itemSize;attribute.count=vertices.length;attribute.normalized=a.normalized;g.setAttribute(name,attribute);
 }
 g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();mesh.geometry=g;source.dispose();
 if(mesh.isSkinnedMesh){mesh.boundingBox=null;mesh.boundingSphere=null;}
 return (count-kept.length)/3;
}

// The distance sources have merged surfaces. Classify disconnected components to
// remove entire collar/head pieces, without slicing through the shell or jaw.
function componentRanges(mesh) {
 const g=mesh.geometry,p=g.attributes.position,ix=g.index,count=ix?.count||p.count,parent=[],keys=new Map(),vertex=[];
 const find=id=>{while(parent[id]!==id){parent[id]=parent[parent[id]];id=parent[id];}return id;};
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');if(!keys.has(key)){keys.set(key,parent.length);parent.push(parent.length);}vertex[i]=keys.get(key);}
 for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>vertex[ix?ix.getX(i+j):i+j]),a=find(ids[0]);for(const b of ids.slice(1))parent[find(b)]=a;}
 const ranges=new Map();for(let i=0;i<p.count;i++){const id=find(vertex[i]),r=ranges.get(id)||{min:Infinity,max:-Infinity};r.min=Math.min(r.min,p.getY(i));r.max=Math.max(r.max,p.getY(i));ranges.set(id,r);}
 return ids=>ranges.get(find(vertex[ids[0]]));
}

export function visibleCost(root) {
 let triangles=0,draw_calls=0;
 root.traverse(n=>{if(n.isMesh&&!n.userData.helmet_fit_hidden){triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;draw_calls+=Math.max(1,n.geometry.groups.length);}});
 return {triangles,draw_calls};
}
export function attachHelmet(host,helmet,id='rk-mg02') {
 const config=HELMET_FITS[id],parent=host.getObjectByName(FIT.parent);
 if(!config||!parent)throw Error('Unknown replacement helmet or missing head pivot');
 const bodyBefore=visibleCost(host),head=host.getObjectByName('HEAD_GEOMETRY'),farBody=host.getObjectByName('DISTANCE_SURFACE');
 let removedBodyTriangles=0;
 if(head?.isSkinnedMesh){
  const pitch=head.skeleton.bones.findIndex(b=>b.name===FIT.parent),skin=head.geometry.attributes.skinIndex,weights=head.geometry.attributes.skinWeight;
  if(pitch<0)throw Error('Original cranial surface has no pitch binding');
  removedBodyTriangles=retainTriangles(head,ids=>!ids.some(i=>[0,1,2,3].some(j=>skin.getComponent(i,j)===pitch&&weights.getComponent(i,j)>0)));
 }else if(farBody?.isMesh){
  const range=componentRanges(farBody);removedBodyTriangles=retainTriangles(farBody,ids=>range(ids).max<=1.581);
 }else throw Error('Original head surface missing');
 // Shared crown/neck frame; individual helmet silhouettes retain uniform proportions.
 helmet.scale.setScalar(config.scale);helmet.position.set(0,FIT.crown_above_pitch_m-config.source_crown_m*config.scale,0);parent.add(helmet);
 const collar=helmet.getObjectByName('PART_COLLAR');collar?.traverse(n=>{if(n.isMesh){n.visible=false;n.userData.helmet_fit_hidden=true;}});
 const far=helmet.getObjectByName('DISTANCE_SURFACE');let omittedTriangles=0;
 if(far?.isMesh){const range=componentRanges(far);omittedTriangles=retainTriangles(far,ids=>range(ids).max>config.collar_cutoff_m);}
 helmet.traverse(n=>{if(n.name){n.userData.source_node=n.name;n.name=FIT.namespace+n.name;}if(n.isMesh){n.userData.helmet_fit=true;n.castShadow=n.receiveShadow=true;n.frustumCulled=false;}});
 host.updateMatrixWorld(true);
 return {id,label:config.label,root:helmet,parent,visible_cost:visibleCost(helmet),body_removed_cost:{triangles:removedBodyTriangles,draw_calls:0},body_original_cost:bodyBefore,omitted_distance_triangles:omittedTriangles,local_position_m:helmet.position.toArray(),rest_world_position_m:helmet.getWorldPosition(parent.position.clone()).toArray(),scale:helmet.scale.toArray()};
}
