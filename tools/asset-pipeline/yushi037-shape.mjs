// Authored half-ellipsoid: independent silhouette, not a scaled Bio-Pearl.
export function buildDome({T,lod,P,patch,box,cyl,torus,merge,sockets}){
 const master=lod===0,far=lod===2,n=master?64:far?8:24,rows=master?18:far?2:8;
 const body=[],glass=[],handle=[],root=new T.Group();root.name='ROOT';
 root.userData={family:'yushi037_container',designation:'Yūshi037',lod,damage_level:0,fill_default:.5,units:'meters',up:'+Y',forward:'+Z',origin:'ground plot centre'};
 // Split shell around a real narrow sight opening, retaining its boundary in all tiers.
 body.push(patch(0,.22,0,Math.PI*2,master?4:1,n,P.shell));
 body.push(patch(.22,Math.PI/2,.12,Math.PI*2-.12,rows,n,P.shell));
 // Half volume in a hemisphere lies at normalized height 0.3472963553.
 const halfTheta=Math.acos(.3472963553338607);
 body.push(patch(.22,halfTheta,-.12,.12,master?12:3,1,P.dark,2,-.018));
 body.push(patch(halfTheta,Math.PI/2,-.12,.12,master?5:2,1,P.olive,2,-.018));
 for(const p of [-.143,.143])body.push(patch(.21,Math.PI/2,p-.014,p+.014,master?20:far?3:8,1,P.metal,0,.013));
 for(const t of [.215,1.553])body.push(patch(t-.012,t+.012,-.158,.158,1,master?8:2,P.metal,0,.013));
 if(!far)glass.push(patch(.22,Math.PI/2,-.115,.115,master?22:8,1,0xa9d9cc,0,.003));
 // Broad grounded eight-sided skid; no tripod or hidden spherical lower half.
 body.push(cyl(1.83,.24,8,[0,.12,0],P.armor));
 body.push(cyl(1.74,.16,8,[0,.32,0],P.metal));
 body.push(torus(1.65,.065,master?96:far?8:24,[0,.43,0],P.armor));
 // Four broad protective straps: useful silhouette information at all tiers.
 for(const p of [-.82,.82,Math.PI-.82,Math.PI+.82]){
  for(const [a,b] of [[.19,.60],[.95,1.56]])body.push(patch(a,b,p-.035,p+.035,master?12:far?1:3,1,P.armor,0,.021));
 }
 // Front extraction cassette sits on the plinth, with a +Z hose coupling.
 body.push(box([.58,.48,.42],[0,.46,1.65],P.armor));
 const capN=master?40:far?4:12;
 body.push(cyl(.14,.23,capN,[0,.48,1.935],P.metal,[Math.PI/2,0,0]));
 body.push(cyl(.19,.075,capN,[0,.48,2.035],P.armor,[Math.PI/2,0,0]));
 body.push(cyl(.145,.23,capN,[-1.69,.57,0],P.armor,[0,0,Math.PI/2]));
 // Flush top maintenance hatch, not a tall neck.
 body.push(cyl(.33,.105,capN,[0,1.785,0],P.armor));
 body.push(cyl(.35,.045,capN,[0,1.85,0],P.metal));
 body.push(box([.32,.075,.075],[0,1.905,0],P.armor));
 for(let i=0;i<8;i++){
  const a=-1.60+i*.40,b=a+.32;
  body.push(patch(.64,.91,a-.022,b+.022,1,master?10:1,P.armor,0,.032));
  body.push(patch(.685,.865,a,b,1,master?10:1,i<4?P.cyan:P.dark,1,.043,i));
 }
 if(!far){
  // Two broad identification strokes survive the game camera without texture fetches.
  for(const x of [-.62,.62])body.push(box([.32,.075,.018],[x,.14,1.695],P.amber));
 }
 if(master){
  for(let i=0;i<16;i++){const a=i*Math.PI/8;body.push(cyl(.027,.025,10,[Math.sin(a)*1.69,.45,Math.cos(a)*1.69],P.metal));}
  for(const p of [-.24,.24])for(let j=0;j<6;j++)body.push(patch(.45+j*.17,.46+j*.17,p-.035,p+.035,1,2,P.metal,0,.027));
  body.push(torus(.145,.016,32,[0,.48,2.055],P.metal,[0,0,0],6));
  for(const p of [-2.3,2.3])body.push(patch(.8,1.27,p-.17,p+.17,8,6,P.armor,0,.025));
 }
 handle.push(box([.30,.05,.06],[0,0,0],P.amber),cyl(.045,.04,master?24:6,[0,0,0],P.metal,[Math.PI/2,0,0]));
 const opaque=new T.MeshStandardMaterial({name:far?'M_YUSHI_DISTANCE':'M_YUSHI_OPAQUE',vertexColors:true,roughness:.43,metalness:.3});
 const valve=new T.Group();valve.name='DISPENSE_VALVE';valve.position.set(0,.68,1.86);valve.userData={engine_driven:!far,static_lookup_only:far,axis:'+Z',closed_radians:0,open_radians:Math.PI/2};root.add(valve);
 if(far){for(const g of handle){g.translate(0,.68,1.86);body.push(g);}const lookup=new T.Object3D();lookup.name='VALVE_HANDLE';lookup.userData={static_lookup_only:true};valve.add(lookup);}
 else{const mesh=new T.Mesh(merge(handle),opaque);mesh.name='VALVE_HANDLE';valve.add(mesh);}
 const mesh=new T.Mesh(merge(body),opaque);mesh.name='YUSHI_BODY';root.add(mesh);
 if(!far){const mat=new T.MeshStandardMaterial({name:'M_YUSHI_SIGHT_GLASS',vertexColors:true,transparent:true,opacity:.18,roughness:.2,metalness:.1,depthWrite:false});const cover=new T.Mesh(merge(glass),mat);cover.name='YUSHI_GLASS';cover.renderOrder=1;root.add(cover);}
 else{const lookup=new T.Object3D();lookup.name='YUSHI_GLASS';lookup.userData={static_lookup_only:true,glass_omitted:true};root.add(lookup);}
 for(const socket of sockets){const node=new T.Object3D();node.name=socket.node;node.position.fromArray(socket.position_m);node.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...socket.normal));node.userData={socket_kind:socket.kind};root.add(node);}
 const level=new T.Object3D();level.name='LEVEL_READOUT';level.position.set(0,1.7,1.1);level.userData={role:'capacity_label_anchor'};root.add(level);root.updateMatrixWorld(true);return root;
}
