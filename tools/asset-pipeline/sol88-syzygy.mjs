// Authored Syzygy geometry. Three rigidly skinned cages share seven materials.
import * as T from 'three';

export const CAGE_RADII=[19.2,15.1,11.1];
export const CAGE_NAMES=['CAGE_OUTER','CAGE_MIDDLE','CAGE_INNER'];
export const CLIP_INFO=[
  {name:'Idle_Cycle',duration_s:24,loop:true},
  {name:'Convergence',duration_s:4,loop:false},
  {name:'Firing_Cycle',duration_s:10,loop:true},
  {name:'Recovery',duration_s:5,loop:false},
  {name:'Aperture_Open',duration_s:.6,loop:false},
  {name:'Aperture_Close',duration_s:.6,loop:false}
];
export const EXTRA_NODES=[...CAGE_NAMES,'LENS_CARRIAGE','FOCUS_COLLAR','IRIS_MASTER',...Array.from({length:8},(_,i)=>`IRIS_BLADE_${String(i+1).padStart(2,'0')}`)];

export function buildSyzygy(lod,h){
  const {box,cyl,ring,sphere,merge,colored,matrix,mat,makeBone,skinnedGeometry}=h;
  const master=lod===0,seg=master?96:24,root=new T.Group();root.name='SOL88_EXPORT_ASSEMBLY';
  const rigRoot=makeBone('SOL88_RIG_ROOT',root,[0,0,0]);
  const yaw=makeBone('OPTICS_YAW',rigRoot,[0,0,0]),pitch=makeBone('OPTICS_PITCH',yaw,[0,0,0]);
  const cages=CAGE_NAMES.map(name=>makeBone(name,rigRoot,[0,5,0]));
  const carriage=makeBone('LENS_CARRIAGE',pitch,[0,0,0]),focus=makeBone('FOCUS_COLLAR',pitch,[0,0,0]);
  const iris=makeBone('APERTURE_IRIS',pitch,[0,0,0]),irisMaster=makeBone('IRIS_MASTER',iris,[0,0,0]);
  const blades=Array.from({length:8},(_,i)=>makeBone(`IRIS_BLADE_${String(i+1).padStart(2,'0')}`,irisMaster,[0,0,0]));
  const bones=[rigRoot,yaw,pitch,...cages,carriage,focus,iris,irisMaster,...blades];
  // Legacy lookups are retained explicitly, but no longer describe array hardware.
  for(const name of ['ARRAY_L','ARRAY_R','RADIATOR_L','RADIATOR_R','NAV_LIGHTS_GEOMETRY']){
    const node=makeBone(name,rigRoot,[0,0,0]);node.userData={deprecated:true,lookup_only:true,replacement:name.startsWith('ARRAY')?'CAGE_OUTER':'CAGE_MIDDLE'};bones.push(node);
  }
  const aperture=new T.Object3D();aperture.name='APERTURE';aperture.userData={socket_kind:'beam_origin',fire_axis:'-Y'};pitch.add(aperture);
  root.updateMatrixWorld(true);
  const palette={carbon:0x131e29,metal:0x849aa5,light:0xd2e0e4,cyan:0x66e7ef,dark:0x030b12,amber:0xf1ae49};
  const parts=Array.from({length:7},()=>[]),add=(slot,bone,...geometry)=>parts[slot].push({bone,geometry:merge(geometry)});
  // Curved rectangular bands have real inner/outer surfaces and finite end caps.
  function band(radius,width,thickness,start,arc,steps,tilt=0,color=palette.metal,surfaceOnly=false){
    const positions=[],indices=[];
    for(let i=0;i<=steps;i++){const a=start+arc*i/steps;for(const [r,y] of [[radius-thickness/2,-width/2],[radius+thickness/2,-width/2],[radius+thickness/2,width/2],[radius-thickness/2,width/2]])positions.push(Math.cos(a)*r,y,Math.sin(a)*r);}
    for(let i=0;i<steps;i++)for(let j=0;j<4;j++){if(surfaceOnly&&j!==1)continue;const a=i*4+j,b=i*4+(j+1)%4,c=b+4,d=a+4;indices.push(a,b,c,a,c,d);}
    if(!surfaceOnly&&arc<Math.PI*2-1e-5){indices.push(0,2,1,0,3,2);const end=steps*4;indices.push(end,end+1,end+2,end,end+2,end+3);}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    return colored(geometry,color,matrix([0,0,0],[0,0,tilt]));
  }
  for(let c=0;c<3;c++){
    const radius=CAGE_RADII[c],bone=cages[c],width=1.15-c*.15;
    for(const tilt of [-.30,.30]){
      // Two intersecting bands form each rigid cage; different cages never share a radial envelope.
      add(1,bone,band(radius,width,.32,.16,Math.PI*2-.32,seg,tilt));
      add(0,bone,band(radius+.20,width*.7,.08,.21,Math.PI*2-.42,seg,tilt,palette.carbon,!master));
      add(2,bone,band(radius-.20,.12,.07,.22,Math.PI*2-.44,seg,tilt,palette.cyan));
      const sectors=master?16:8;
      for(let i=0;i<sectors;i++){
        const a=i*Math.PI*2/sectors+.28;
        add(4,bone,band(radius+.255,width*.36,.035,a,.12,master?5:1,tilt,palette.amber));
        if(master){
          add(1,bone,band(radius+.28,width*1.12,.12,a+.15,.055,3,tilt,palette.light));
          for(const offset of [-.27,.27]){
            const p=new T.Vector3(Math.cos(a)*radius,offset,Math.sin(a)*radius).applyAxisAngle(new T.Vector3(0,0,1),tilt);
            add(1,bone,sphere(.07,8,p.toArray(),palette.light));
          }
        }
      }
    }
    // End couplers and two large suspension pods make each interrupted ring legible.
    for(const a of [0,Math.PI]){
      const x=Math.cos(a)*radius;
      add(0,bone,box([1.25,1.6,1.45],[x,0,0],palette.carbon));
      add(1,bone,box([1.38,.22,1.58],[x,.82,0],palette.light),box([1.38,.22,1.58],[x,-.82,0],palette.metal));
      add(6,bone,master?sphere(.22,12,[x,0,.78],palette.cyan):colored(new T.OctahedronGeometry(.22),palette.cyan,matrix([x,0,.78])));
    }
  }
  // The optical throat is open: structural rings, lens recesses and a retracting segmented iris.
  for(const [y,r] of [[.45,2.45],[1.7,2.65],[3.2,2.9],[5.1,3.2],[7.1,3.05]]){
    add(1,pitch,band(r,.42,.30,0,Math.PI*2,seg).translate(0,y,0));
    add(0,pitch,band(r+.18,.27,.13,0,Math.PI*2,seg,0,palette.carbon).translate(0,y,0));
    if(master)for(const d of [-.27,.27])add(1,pitch,ring(r,.07,seg,[0,y+d,0],palette.light,[Math.PI/2,0,0]));
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,r=3.25,x=Math.cos(a)*r,z=Math.sin(a)*r;
    add(0,pitch,box([.65,5.5,1.0],[x,4.65,z],palette.carbon,[0,-a,0]));
    add(1,pitch,cyl(.17,5.8,master?12:6,[x,4.6,z],palette.metal));
    add(2,pitch,box([.13,3.7,.16],[x*1.09,4.7,z*1.09],palette.cyan));
    add(3,pitch,box([.36,.3,.38],[x,7.6,z],palette.amber));
    if(master)for(let j=0;j<5;j++)add(1,pitch,box([.83,.09,1.16],[x,2.8+j*.8,z],palette.metal,[0,-a,0]));
  }
  add(0,pitch,cyl(2.4,1.6,master?32:16,[0,8.1,0],palette.carbon,[0,0,0],1.7));
  add(1,pitch,ring(2.4,.16,seg,[0,7.35,0],palette.metal,[Math.PI/2,0,0]));
  add(5,carriage,ring(1.95,.11,seg,[0,2.65,0],palette.cyan,[Math.PI/2,0,0]),ring(1.42,.10,seg,[0,4.15,0],palette.cyan,[Math.PI/2,0,0]),cyl(.95,.12,master?48:16,[0,5.8,0],palette.cyan));
  for(const [y,r] of [[2.6,2.12],[4.1,1.65],[5.65,1.2]])add(1,carriage,band(r,.32,.20,0,Math.PI*2,seg).translate(0,y,0));
  add(1,focus,ring(2.88,.13,seg,[0,1.05,0],palette.light,[Math.PI/2,0,0]));
  add(0,pitch,band(3.8,.48,3.1,0,Math.PI*2,master?96:16,0,palette.carbon).translate(0,.12,0));
  // Eight triangular shutters slide radially into the outer collar. Closed pieces tile the bore.
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(Math.cos(a)*2.25,Math.sin(a)*2.25);shape.lineTo(Math.cos(a+Math.PI/4)*2.25,Math.sin(a+Math.PI/4)*2.25);shape.closePath();
    const geometry=new T.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:false,steps:1});
    add(1,blades[i],colored(geometry,i%2?palette.metal:palette.carbon,matrix([0,.18,0],[Math.PI/2,0,0])));
  }
  const materials=[mat('M_Hull_Carbon',{metalness:.65,roughness:.36}),mat('M_Hull_Gunmetal',{metalness:.85,roughness:.26}),mat('M_Ours_Cyan',{metalness:.5,roughness:.28}),mat('M_Warning_Amber'),mat('M_Radiator_Glow',{emissive:palette.amber,intensity:.12}),mat('M_Aperture_Glow',{emissive:palette.cyan,intensity:1.2}),mat('M_Nav_Light',{emissive:palette.cyan,intensity:1.8})];
  const geometries=parts.map(items=>skinnedGeometry(items,bones));
  const combined=h.mergeGeometries(geometries,true);geometries.forEach(g=>g.dispose());
  const mesh=new T.SkinnedMesh(combined,materials);mesh.name='ROOT';for(const child of [...root.children])mesh.add(child);mesh.bind(new T.Skeleton(bones));
  mesh.userData={designation:'SOL-88 Syzygy',family:'sol88_platform',lod,damage_level:0,units:'meters',up:'+Y',forward:'+Z',beam_direction:'-Y',static:false};
  const qTrack=(node,times,quaternions)=>new T.QuaternionKeyframeTrack(node.name+'.quaternion',times,quaternions.flatMap(q=>q.toArray()));
  const orientation=(yaw,tilt)=>new T.Quaternion().setFromEuler(new T.Euler(0,yaw,tilt,'YXZ'));
  const closedTilts=[1.23,-1.04,.82],fireTilts=[.12,-.22,.34],phaseOffsets=[0,1.2,2.4];
  function cageTracks(kind,duration){
    const times=Array.from({length:49},(_,i)=>i*duration/48);
    return cages.map((node,c)=>qTrack(node,times,times.map(t=>{
      const u=t/duration,turn=(c%2?-1:1)*Math.PI*2;
      if(kind==='idle')return orientation(phaseOffsets[c]+turn*u,closedTilts[c]+Math.sin(u*Math.PI*2)*.16);
      if(kind==='fire')return orientation(phaseOffsets[c]+turn*u,fireTilts[c]);
      const ease=u*u*(3-2*u),from=kind==='converge'?closedTilts[c]:fireTilts[c],to=kind==='converge'?fireTilts[c]:closedTilts[c];
      return orientation(phaseOffsets[c]+turn*ease,from+(to-from)*ease);
    })));
  }
  function opticalTracks(times,opens){
    return [new T.VectorKeyframeTrack('LENS_CARRIAGE.position',times,opens.flatMap(v=>[0,-.55*v,0])),new T.QuaternionKeyframeTrack('FOCUS_COLLAR.quaternion',times,opens.flatMap(v=>orientation(v*.65,0).toArray())),...blades.map((node,i)=>{const a=(i+.5)*Math.PI/4;return new T.VectorKeyframeTrack(node.name+'.position',times,opens.flatMap(v=>[Math.cos(a)*2.65*v,0,Math.sin(a)*2.65*v]));})];
  }
  const clips=[
    new T.AnimationClip('Idle_Cycle',24,[...cageTracks('idle',24),...opticalTracks([0,24],[0,0])]),
    new T.AnimationClip('Convergence',4,[...cageTracks('converge',4),...opticalTracks([0,3.2,4],[0,0,1])]),
    new T.AnimationClip('Firing_Cycle',10,[...cageTracks('fire',10),...opticalTracks([0,10],[1,1])]),
    new T.AnimationClip('Recovery',5,[...cageTracks('recover',5),...opticalTracks([0,.6,5],[1,0,0])]),
    new T.AnimationClip('Aperture_Open',.6,opticalTracks([0,.6],[0,1])),
    new T.AnimationClip('Aperture_Close',.6,opticalTracks([0,.6],[1,0]))
  ];
  // Bind/rest pose is also the start and end of idle/convergence choreography.
  cages.forEach((node,c)=>node.quaternion.copy(orientation(phaseOffsets[c],closedTilts[c])));
  mesh.updateMatrixWorld(true);
  return {root:mesh,clips,rig:{root:rigRoot,yaw,pitch,iris,cages,bones},materials:Object.fromEntries(materials.map(m=>[m.name,m]))};
}
