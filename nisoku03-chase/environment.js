// Shared by the browser and plain-GLB export. All dimensions are metres.
export function buildCourt(T,mergeGeometries,course){
 const root=new T.Group();root.name='NISOKU_CHASE_COURT';
 const colors={concrete:0x526c68,steel:0x31494c,ivory:0xc8c9b4,amber:0xcda35c,dark:0x283330};
 const groups=Object.fromEntries(Object.keys(colors).map(k=>[k,[]]));
 function box(x,y,z,w,h,d,mat='steel',yaw=0){const g=new T.BoxGeometry(w,h,d),m=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw),new T.Vector3(1,1,1));g.applyMatrix4(m);groups[mat].push(g)}
 box(0,-.22,0,23,.44,29,'concrete');
 for(const x of [-11.5,11.5]){box(x,-.04,0,.24,.36,29,'ivory');box(x,.16,0,.26,.035,29,'amber')}
 for(const z of [-14.5,14.5]){box(0,-.04,z,23,.36,.24,'ivory');box(0,.16,z,23,.035,.26,'amber')}
 // Recessed channels and a sparse 2-metre construction grid.
 for(let x=-10;x<=10;x+=2)box(x,.002,0,.012,.003,28,'dark');
 for(let z=-14;z<=14;z+=2)box(0,.002,z,22,.003,.012,'dark');
 for(const o of course.obstacles){
  const [x,,z]=o.position,side=(v)=>[x+Math.cos(o.yaw)*v,z-Math.sin(o.yaw)*v];
  box(x,o.height-.025,z,o.width,.05,o.depth,'ivory',o.yaw);
  box(x,o.height/2,z,o.width,o.height-.05,.065,'steel',o.yaw);
  box(x,.025,z,o.width,.05,o.depth+.06,'steel',o.yaw);
  for(const v of [-o.width/2,o.width/2]){const p=side(v);box(p[0],o.height/2,p[1],.12,o.height+.06,.38,'amber',o.yaw)}
  for(const d of [-.65,.65]){box(x+Math.sin(o.yaw)*d,.007,z+Math.cos(o.yaw)*d,1.8,.009,.05,'amber',o.yaw)}
 }
 // Low balance girder, with sloped approach and exit surfaces matching root height.
 box(-3,.07,8.7,.38,.14,1.9,'steel');box(-3,.145,8.7,.48,.03,1.9,'ivory');
 for(const z of [7.2,9.65]){
  for(let i=0;i<11;i++){const u=(i+.5)/11,v=z===7.2?u:1-u,h=.16*(v*v*(3-2*v));box(-3,h/2,z+u*.55,.48,Math.max(.006,h),.05,'ivory')}
 }
 for(const z of [8,9.4]){box(-3,.04,z,.75,.08,.16,'amber')}
 // Court furniture: repeatable, instancing-friendly cabinets and boundary lamps.
 for(const x of [-10.2,10.2])for(const z of [-11,-4,4,11]){
  box(x,.45,z,.65,.9,.75,'steel');box(x,.93,z,.72,.07,.82,'ivory');box(x,.62,z+.386,.46,.12,.025,'dark');box(x,.62,z+.403,.22,.025,.012,'amber');
  box(x,1.3,z,.055,.7,.055,'ivory');box(x,1.65,z,.22,.08,.15,'amber');
 }
 for(const z of [-13.4,13.4])for(const x of [-7,0,7]){
  box(x,.18,z,1.4,.36,.65,'dark');box(x,.38,z,1.5,.06,.72,'ivory');
 }
 for(const [key,list] of Object.entries(groups)){
  const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());
  const material=new T.MeshStandardMaterial({name:'COURT_'+key.toUpperCase(),color:colors[key],roughness:key==='steel'?.57:.83,metalness:key==='steel'?.5:.08});
  const mesh=new T.Mesh(geometry,material);mesh.name='COURT_'+key.toUpperCase();mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 }
 for(const o of course.obstacles){const socket=new T.Object3D();socket.name='SOCKET_'+o.id.toUpperCase().replaceAll('-','_');socket.position.set(...o.position);socket.rotation.y=o.yaw;socket.userData={fixture_height_m:o.height,fixture_width_m:o.width,role:'authored animation test fixture'};root.add(socket)}
 root.userData={units:'metres',up:'+Y',forward:'+Z',ground_y:0,plot_m:[23,29],scope:'Authored motion test fixtures; no general-purpose collision solver'};
 return root;
}
