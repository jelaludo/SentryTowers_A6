import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const C={
  floor:0x24363d,
  edge:0x18262c,
  steel:0x4f6870,
  pale:0xd4e3e0,
  silver:0xeef7fa,
  chrome:0xb8d2da,
  ice:0x7cebff,
  amber:0xf5ad4b,
  magenta:0xff4fd8,
  cyan:0x48e5ff,
  gold:0xffcf48,
  lime:0x68ff8a,
  dark:0x101c22
};

const pieces=new Map();

function baseMaterial(){
  return new T.MeshStandardMaterial({
    name:'DISCO_RIG_VERTEX_PALETTE',
    vertexColors:true,
    roughness:0.28,
    metalness:0.62,
    side:T.DoubleSide
  });
}

function add(key,g,color,position=[0,0,0],rotation=[0,0,0]){
  if(g.index){const ni=g.toNonIndexed();g.dispose();g=ni;}
  for(const k of Object.keys(g.attributes)){if(k!=='position'&&k!=='normal')g.deleteAttribute(k);}
  if(rotation[0]||rotation[1]||rotation[2]){
    const m=new T.Matrix4().makeRotationFromEuler(new T.Euler(rotation[0],rotation[1],rotation[2],'YXZ'));
    g.applyMatrix4(m);
  }
  g.translate(...position);
  g.computeVertexNormals();
  const p=g.attributes.position,colors=new Float32Array(p.count*3),c=new T.Color(color);
  for(let i=0;i<p.count;i++){
    colors[i*3]=c.r;
    colors[i*3+1]=c.g;
    colors[i*3+2]=c.b;
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));
  if(!pieces.has(key))pieces.set(key,[]);
  pieces.get(key).push(g);
}

const box=(k,s,p,c,r)=>add(k,new T.BoxGeometry(...s),c,p,r);
const cyl=(k,r1,r2,h,p,c,n=8,rot=[0,0,0])=>add(k,new T.CylinderGeometry(r1,r2,h,n),c,p,rot);

function beam(k,a,b,r,c,n=6){
  const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);
  const g=new T.CylinderGeometry(r,r,d.length(),n);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));
  add(k,g,c,va.add(vb).multiplyScalar(0.5).toArray());
}

function flushMesh(key,parent,name,mat,staticTier){
  const list=pieces.get(key)||[];
  pieces.delete(key);
  if(staticTier||!list.length){
    for(const e of list)e.dispose();
    const o=new T.Object3D();
    o.name=name;
    o.userData={role:'lookup_only'};
    parent.add(o);
    return o;
  }
  const g=mergeGeometries(list,false);
  for(const e of list)e.dispose();
  const m=new T.Mesh(g,mat);
  m.name=name;
  parent.add(m);
  return m;
}

function marker(parent,name,p,kind,normal=[0,0,1]){
  const o=new T.Object3D();
  o.name=name;
  o.position.set(...p);
  o.userData={role:'socket',kind,normal};
  parent.add(o);
  return o;
}

function addDiscoSphere(key,lod,center=[0,0,0]){
  const radius=1.35;
  const detailed=lod===0,staticTier=lod===2;
  const coreSegs=detailed?24:staticTier?12:16;
  const coreRings=detailed?16:staticTier?8:12;
  add(key,new T.SphereGeometry(radius*0.96,coreSegs,coreRings),C.dark,center);
  // Polar mounting caps
  cyl(key,0.34,0.42,0.12,[center[0],center[1]+radius*0.95,center[2]],C.amber,detailed?12:8);
  cyl(key,0.42,0.30,0.12,[center[0],center[1]-radius*0.95,center[2]],C.amber,detailed?12:8);
  const latBands=detailed?13:staticTier?6:9;
  const tilePalette=[C.silver,C.pale,C.chrome,C.ice,C.silver,C.gold,C.silver,C.magenta,C.cyan];
  for(let b=0;b<latBands;b++){
    const v=(b+0.5)/latBands;
    const phi=0.22+(Math.PI-0.44)*v;
    const sinPhi=Math.sin(phi),cosPhi=Math.cos(phi);
    const ringRadius=radius*sinPhi;
    const baseCount=detailed?28:staticTier?12:18;
    const count=Math.max(6,Math.round(baseCount*sinPhi));
    const tileH=(Math.PI-0.44)/latBands*radius*0.84;
    const tileW=(2*Math.PI*ringRadius/count)*0.84;
    for(let i=0;i<count;i++){
      const theta=(i+(b%2)*0.5)/count*Math.PI*2;
      const nx=sinPhi*Math.cos(theta);
      const ny=cosPhi;
      const nz=sinPhi*Math.sin(theta);
      const pos=[
        center[0]+nx*(radius+0.015),
        center[1]+ny*(radius+0.015),
        center[2]+nz*(radius+0.015)
      ];
      const tile=new T.BoxGeometry(tileW,tileH,0.032);
      const normal=new T.Vector3(nx,ny,nz).normalize();
      const up=Math.abs(ny)>0.95?new T.Vector3(1,0,0):new T.Vector3(0,1,0);
      const right=new T.Vector3().crossVectors(up,normal).normalize();
      const tangentUp=new T.Vector3().crossVectors(normal,right).normalize();
      const m4=new T.Matrix4().makeBasis(right,tangentUp,normal);
      tile.applyMatrix4(m4);
      const col=tilePalette[(b*7+i*3)%tilePalette.length];
      add(key,tile,col,pos);
    }
  }
}

export const ENGINE_NODES=[
  'DISCO_BALL_ROOT',
  'STANDALONE_CRADLE',
  'DISCO_PENDULUM_PIVOT',
  'HOIST_TETHER_ASSEMBLY',
  'LIGHT_HALO_YAW',
  'LIGHT_HALO_BODY',
  'SPOTLIGHT_POD_PITCH',
  'LIGHT_LENS_ARRAY',
  'LASER_RING_YAW',
  'LASER_RING_BODY',
  'LASER_EMITTER_PITCH',
  'LASER_APERTURE_ARRAY',
  'LASER_BEAM_PREVIEW',
  'DISCO_SPHERE_SPIN',
  'DISCO_SPHERE_MESH',
  'DISCO_STATIC_BODY',
  'SOCKET_GANTRY_HOOK',
  'SOCKET_BALL_CENTER',
  'SOCKET_LASER_N',
  'SOCKET_LASER_E',
  'SOCKET_LASER_S',
  'SOCKET_LASER_W',
  'SOCKET_LIGHT_NE',
  'SOCKET_LIGHT_NW',
  'SOCKET_LIGHT_SE',
  'SOCKET_LIGHT_SW',
  'SOCKET_POWER'
];

export function buildDiscoBall(lod=1){
  pieces.clear();
  const detailed=lod===0,staticTier=lod===2;
  const mat=baseMaterial();
  const root=new T.Group();
  root.name='DISCO_BALL_ROOT';
  root.userData={
    family:'disco_ball',
    lod,
    damage_level:0,
    plot_m:[8,8],
    gantry_compatible:true,
    stalheart_reference:'assets/terraformer/terraformer_3000_d0_lod1.glb'
  };

  // 1. Detachable / hideable ground deployment cradle & dance floor pad (y = 0 .. 6.2 m)
  const cradleKey=staticTier?'static':'cradle';
  cyl(cradleKey,2.8,2.95,0.14,[0,0.07,0],C.floor,8);
  cyl(cradleKey,2.2,2.25,0.04,[0,0.16,0],C.edge,8);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    box(cradleKey,[0.38,0.04,0.16],[Math.cos(a)*2.55,0.165,Math.sin(a)*2.55],i%2?C.cyan:C.amber,[0,-a,0]);
  }
  const corners=[[-2.4,2.4],[2.4,2.4],[-2.4,-2.4],[2.4,-2.4]];
  for(const [cx,cz] of corners){
    box(cradleKey,[0.46,0.22,0.46],[cx,0.11,cz],C.edge);
    beam(cradleKey,[cx,0.2,cz],[cx*0.32,6.12,cz*0.32],0.095,C.steel,detailed?8:6);
    if(detailed){
      cyl(cradleKey,0.14,0.16,0.18,[cx*0.95,0.38,cz*0.95],C.amber,6);
    }
  }
  // Top portal ring at y = 6.15 m
  box(cradleKey,[1.9,0.16,0.22],[0,6.15,0.76],C.steel);
  box(cradleKey,[1.9,0.16,0.22],[0,6.15,-0.76],C.steel);
  box(cradleKey,[0.22,0.16,1.74],[-0.76,6.15,0],C.steel);
  box(cradleKey,[0.22,0.16,1.74],[0.76,6.15,0],C.steel);
  box(cradleKey,[1.72,0.18,0.28],[0,6.22,0],C.amber);
  flushMesh('cradle',root,'STANDALONE_CRADLE',mat,staticTier);

  // 2. Pendulum pivot at top suspension hook (0, 6.2, 0)
  const pendulum=new T.Group();
  pendulum.name='DISCO_PENDULUM_PIVOT';
  pendulum.position.set(0,6.2,0);
  pendulum.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'XZ',range_deg:[-22,22]};
  root.add(pendulum);

  // Hoist tether assembly (local y = 0 down to -3.2 m, i.e. world y = 6.2 down to 3.0 m)
  const tetherKey=staticTier?'static':'tether';
  const tp=staticTier?[0,6.2,0]:[0,0,0];
  cyl(tetherKey,0.26,0.32,0.28,[tp[0],tp[1]-0.14,tp[2]],C.amber,detailed?12:8);
  cyl(tetherKey,0.18,0.18,0.26,[tp[0],tp[1]-0.38,tp[2]],C.edge,detailed?12:8);
  cyl(tetherKey,0.075,0.075,1.65,[tp[0],tp[1]-1.28,tp[2]],C.pale,detailed?10:6);
  cyl(tetherKey,0.28,0.22,0.24,[tp[0],tp[1]-1.95,tp[2]],C.steel,detailed?12:8);
  if(detailed){
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      box(tetherKey,[0.08,0.9,0.06],[tp[0]+Math.cos(a)*0.16,tp[1]-1.1,tp[2]+Math.sin(a)*0.16],C.cyan,[0,-a,0]);
    }
  }
  flushMesh('tether',pendulum,'HOIST_TETHER_ASSEMBLY',mat,staticTier);

  // 3. Light Halo Yaw at world y = 4.9 m (local y = -1.3 m under DISCO_PENDULUM_PIVOT)
  const haloYaw=new T.Group();
  haloYaw.name='LIGHT_HALO_YAW';
  haloYaw.position.set(0,-1.3,0);
  haloYaw.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'+Y'};
  pendulum.add(haloYaw);

  const haloKey=staticTier?'static':'halo';
  const hp=staticTier?[0,4.9,0]:[0,0,0];
  const haloRadius=2.05;
  for(let i=0;i<8;i++){
    const a1=i*Math.PI/4,a2=(i+1)*Math.PI/4;
    beam(haloKey,[hp[0]+Math.cos(a1)*haloRadius,hp[1],hp[2]+Math.sin(a1)*haloRadius],[hp[0]+Math.cos(a2)*haloRadius,hp[1],hp[2]+Math.sin(a2)*haloRadius],0.08,C.steel,detailed?8:6);
    if(i%2===0){
      beam(haloKey,[hp[0]+Math.cos(a1)*0.26,hp[1]+0.15,hp[2]+Math.sin(a1)*0.26],[hp[0]+Math.cos(a1)*haloRadius,hp[1],hp[2]+Math.sin(a1)*haloRadius],0.055,C.pale,6);
    }
  }
  const spotAngles=[Math.PI*0.25,Math.PI*0.75,Math.PI*1.25,Math.PI*1.75];
  const spotColors=[C.magenta,C.cyan,C.gold,C.lime];
  for(let i=0;i<4;i++){
    const a=spotAngles[i],sx=Math.cos(a)*haloRadius,sz=Math.sin(a)*haloRadius;
    box(haloKey,[0.42,0.34,0.36],[hp[0]+sx,hp[1]-0.16,hp[2]+sz],C.edge,[0,-a,0]);
    box(haloKey,[0.46,0.08,0.40],[hp[0]+sx,hp[1]+0.04,hp[2]+sz],spotColors[i],[0,-a,0]);
  }
  flushMesh('halo',haloYaw,'LIGHT_HALO_BODY',mat,staticTier);

  const spotPitch=new T.Group();
  spotPitch.name='SPOTLIGHT_POD_PITCH';
  spotPitch.position.set(0,-0.16,0);
  spotPitch.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'+X',range_deg:[-55,-15]};
  haloYaw.add(spotPitch);

  const lensKey=staticTier?'static':'lens';
  const lp=staticTier?[0,4.74,0]:[0,0,0];
  for(let i=0;i<4;i++){
    const a=spotAngles[i],sx=Math.cos(a)*(haloRadius-0.04),sz=Math.sin(a)*(haloRadius-0.04);
    const g=new T.CylinderGeometry(0.15,0.18,0.12,detailed?12:8);
    const dir=new T.Vector3(Math.cos(a)*0.65,-0.76,Math.sin(a)*0.65).normalize();
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir));
    add(lensKey,g,spotColors[i],[lp[0]+sx,lp[1]-0.08,lp[2]+sz]);
  }
  const lensMat=staticTier?mat:new T.MeshStandardMaterial({
    name:'DISCO_LIGHT_LENS_MATERIAL',
    vertexColors:true,
    roughness:0.2,
    metalness:0.1,
    emissive:0xffffff,
    emissiveIntensity:2.0,
    side:T.DoubleSide
  });
  flushMesh('lens',spotPitch,'LIGHT_LENS_ARRAY',lensMat,staticTier);

  // 4. Counter-rotating Laser Ring at world y = 4.35 m (local y = -1.85 m under DISCO_PENDULUM_PIVOT)
  const laserYaw=new T.Group();
  laserYaw.name='LASER_RING_YAW';
  laserYaw.position.set(0,-1.85,0);
  laserYaw.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'+Y'};
  pendulum.add(laserYaw);

  const laserKey=staticTier?'static':'laser_body';
  const lrp=staticTier?[0,4.35,0]:[0,0,0];
  const laserRadius=1.42;
  for(let i=0;i<8;i++){
    const a1=i*Math.PI/4,a2=(i+1)*Math.PI/4;
    beam(laserKey,[lrp[0]+Math.cos(a1)*laserRadius,lrp[1],lrp[2]+Math.sin(a1)*laserRadius],[lrp[0]+Math.cos(a2)*laserRadius,lrp[1],lrp[2]+Math.sin(a2)*laserRadius],0.055,C.edge,6);
  }
  const cardinal=[0,Math.PI/2,Math.PI,Math.PI*1.5];
  for(let i=0;i<4;i++){
    const a=cardinal[i],lx=Math.cos(a)*laserRadius,lz=Math.sin(a)*laserRadius;
    box(laserKey,[0.28,0.22,0.38],[lrp[0]+lx,lrp[1],lrp[2]+lz],C.steel,[0,-a,0]);
    if(detailed){
      box(laserKey,[0.32,0.06,0.22],[lrp[0]+lx,lrp[1]+0.14,lrp[2]+lz],C.amber,[0,-a,0]);
    }
  }
  flushMesh('laser_body',laserYaw,'LASER_RING_BODY',mat,staticTier);

  const laserPitch=new T.Group();
  laserPitch.name='LASER_EMITTER_PITCH';
  laserPitch.position.set(0,0,0);
  laserPitch.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'+X',range_deg:[-60,15]};
  laserYaw.add(laserPitch);

  const apertureKey=staticTier?'static':'aperture';
  for(let i=0;i<4;i++){
    const a=cardinal[i],lx=Math.cos(a)*(laserRadius+0.12),lz=Math.sin(a)*(laserRadius+0.12);
    const g=new T.CylinderGeometry(0.07,0.09,0.18,detailed?10:8);
    const dir=new T.Vector3(Math.cos(a)*0.82,-0.57,Math.sin(a)*0.82).normalize();
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir));
    add(apertureKey,g,spotColors[i],[lrp[0]+lx,lrp[1]-0.04,lrp[2]+lz]);
  }
  const apertureMat=staticTier?mat:new T.MeshStandardMaterial({
    name:'DISCO_LASER_APERTURE_MATERIAL',
    vertexColors:true,
    roughness:0.15,
    metalness:0.1,
    emissive:0x68ff8a,
    emissiveIntensity:2.8,
    side:T.DoubleSide
  });
  flushMesh('aperture',laserPitch,'LASER_APERTURE_ARRAY',apertureMat,staticTier);

  // Optional translucent laser beam preview cones (omitted from static LOD2 geometry, node preserved)
  if(!staticTier){
    for(let i=0;i<4;i++){
      const a=cardinal[i];
      const dir=new T.Vector3(Math.cos(a)*0.82,-0.57,Math.sin(a)*0.82).normalize();
      const length=3.8;
      const start=new T.Vector3(Math.cos(a)*(laserRadius+0.18),-0.06,Math.sin(a)*(laserRadius+0.18));
      const mid=start.clone().addScaledVector(dir,length*0.5);
      const cone=new T.CylinderGeometry(0.03,0.42,length,detailed?10:6,1,true);
      cone.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),dir));
      add('beams',cone,spotColors[i],mid.toArray());
    }
  }
  const beamMat=staticTier?mat:new T.MeshBasicMaterial({
    name:'DISCO_LASER_BEAM_MATERIAL',
    vertexColors:true,
    transparent:true,
    opacity:0.32,
    side:T.DoubleSide,
    depthWrite:false
  });
  flushMesh('beams',laserPitch,'LASER_BEAM_PREVIEW',beamMat,staticTier);

  // 5. Spinning Faceted Mirror Ball at world y = 3.0 m (local y = -3.2 m under DISCO_PENDULUM_PIVOT)
  const sphereSpin=new T.Group();
  sphereSpin.name='DISCO_SPHERE_SPIN';
  sphereSpin.position.set(0,-3.2,0);
  sphereSpin.userData={role:staticTier?'lookup_only':'engine_pivot',axis:'+Y'};
  pendulum.add(sphereSpin);

  const sphereKey=staticTier?'static':'sphere';
  const sp=staticTier?[0,3.0,0]:[0,0,0];
  addDiscoSphere(sphereKey,lod,sp);
  flushMesh('sphere',sphereSpin,'DISCO_SPHERE_MESH',mat,staticTier);

  // 6. Static merged body for LOD2 (and empty lookup node in LOD0/LOD1 for exact node parity)
  if(staticTier){
    const list=pieces.get('static')||[];
    pieces.delete('static');
    const g=mergeGeometries(list,false);
    for(const e of list)e.dispose();
    const m=new T.Mesh(g,mat);
    m.name='DISCO_STATIC_BODY';
    root.add(m);
  }else{
    const o=new T.Object3D();
    o.name='DISCO_STATIC_BODY';
    o.userData={role:'lookup_only'};
    root.add(o);
  }

  // 7. Required canonical sockets (identical across all tiers)
  marker(root,'SOCKET_GANTRY_HOOK',[0,6.2,0],'gantry_suspension',[0,1,0]);
  marker(root,'SOCKET_BALL_CENTER',[0,3.0,0],'fx_origin',[0,1,0]);
  marker(root,'SOCKET_LASER_N',[0,4.35,1.48],'laser_emitter',[0,-0.5,0.866]);
  marker(root,'SOCKET_LASER_E',[1.48,4.35,0],'laser_emitter',[0.866,-0.5,0]);
  marker(root,'SOCKET_LASER_S',[0,4.35,-1.48],'laser_emitter',[0,-0.5,-0.866]);
  marker(root,'SOCKET_LASER_W',[-1.48,4.35,0],'laser_emitter',[-0.866,-0.5,0]);
  marker(root,'SOCKET_LIGHT_NE',[1.45,4.74,1.45],'party_spotlight',[0.58,-0.58,0.58]);
  marker(root,'SOCKET_LIGHT_NW',[-1.45,4.74,1.45],'party_spotlight',[-0.58,-0.58,0.58]);
  marker(root,'SOCKET_LIGHT_SE',[1.45,4.74,-1.45],'party_spotlight',[0.58,-0.58,-0.58]);
  marker(root,'SOCKET_LIGHT_SW',[-1.45,4.74,-1.45],'party_spotlight',[-0.58,-0.58,-0.58]);
  marker(root,'SOCKET_POWER',[-2.4,0.35,-2.4],'power',[-1,0,0]);

  root.userData.engine_nodes=ENGINE_NODES;
  return root;
}
