// Composition adapter: consumes Three.js, cached GLTF scenes, and SkeletonUtils.clone.
// A plain Object3D.clone retains source skeleton references and misplaces skinned machinery.
export function cityFiles(layout,lod){return [...new Set([...layout.domes,...layout.connections].map(e=>`../dome-colony/${e.module}_d0_lod${lod}.glb`).concat(layout.props.map(e=>layout.references[e.ref].files[lod]),[layout.references.mork.files[lod],layout.references.sentry.files[lod],layout.parked_tank.file]))];}
export function composeCity(T,layout,models,lod,cloneScene){
 const root=new T.Group();root.name='DOME_CITY';const domes=new Map(),links=new Map(),props=new Map(),sentries=new Map(),ownedMaterials=[];
 function instance(file,id,p,yaw=0){const wrapper=new T.Group();wrapper.name=id;wrapper.position.set(...p);wrapper.rotation.y=yaw;wrapper.add(cloneScene(models.get(file)));root.add(wrapper);return wrapper;}
 for(const d of layout.domes){const r=instance(`../dome-colony/${d.module}_d0_lod${lod}.glb`,d.id,d.position);r.userData={kind:'dome',module:d.module,id:d.id};for(const port of d.open_ports)r.getObjectByName('PORT_CAP_'+port).visible=false;const shell=r.getObjectByName('SHELL');if(shell.isMesh){shell.material=shell.material.clone();ownedMaterials.push(shell.material);}domes.set(d.id,r);
  if(d.sentry){const sentry=cloneScene(models.get(layout.references.sentry.files[lod]));r.getObjectByName('CRADLE_PITCH').add(sentry);sentries.set(d.id,sentry);if(lod!==2){r.getObjectByName('MOUNT_YAW').rotation.y=Math.atan2(d.position[0],d.position[2]);r.getObjectByName('CRADLE_PITCH').rotation.x=Math.PI/3;}}
 }
 for(const c of layout.connections)links.set(c.id,instance(`../dome-colony/${c.module}_d0_lod${lod}.glb`,c.id,c.position,c.yaw));
 for(const p of layout.props){const r=instance(layout.references[p.ref].files[lod],p.id,p.position,p.yaw);r.userData={kind:'prop',ref:p.ref,court:p.court};props.set(p.id,r);}
 const patrol=instance(layout.references.mork.files[lod],'MORK_PATROL',[layout.patrol.x,0,-98]);if(lod!==2)patrol.getObjectByName('HOVER_RIG').position.y=.55;else patrol.position.y=.55;
 const parked=instance(layout.parked_tank.file,'MORK_GARAGE_REFERENCE',layout.parked_tank.position);
 root.updateMatrixWorld(true);return{root,domes,links,props,sentries,patrol,parked,ownedMaterials,lod};
}
export function shellMode(city,mode){for(const [id,r]of city.domes){const shell=r.getObjectByName('SHELL');if(!shell?.isMesh)continue;const clear=mode==='clear'||(mode==='native'&&['habitat','biosphere','research'].includes(r.userData.module));shell.visible=mode!=='cutaway';shell.material.transparent=clear;shell.material.opacity=clear?.18:1;shell.material.depthWrite=!clear;shell.material.needsUpdate=true;}}
export function modelMetrics(root){let triangles=0,draw_calls=0;root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;draw_calls+=Array.isArray(o.material)?o.material.length:1;}});return{triangles,draw_calls};}
