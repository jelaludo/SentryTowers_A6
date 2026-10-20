import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const C={
  titanium:0xb8c0c6,
  titaniumLight:0xd0d7dc,
  titaniumMid:0x8b949c,
  slate:0x59626a,
  graphite:0x2b3137,
  carbon:0x1b2024,
  scuff:0x363d44,
  scorch:0x191d20,
  primer:0x6e5a4f,
  copper:0xb87648,
  rubber:0x1f2326,
  tread:0x2d3338,
  ceramic:0xdce2e6,
  chrome:0xe2e9ee,
  steel:0x6d7780,
  brass:0xb89658,
  tankBody:0x9aa4ad,
  tankBand:0x394148,
  nozzleOuter:0x485159,
  nozzleInner:0x181d21,
  opticGlass:0x28566e,
  opticCracked:0x486e82,
  tailRed:0xc93b3b,
  amber:0xd98a2b,
  cyan:0x38e8ff,
  mint:0x46f09a,
  fdaiWhite:0xe6eef2
};

const pieces=new Map();

function armorMaterial(){
  return new T.MeshStandardMaterial({
    name:'ROVER_ARMOR_PALETTE',
    vertexColors:true,
    roughness:0.42,
    metalness:0.58,
    side:T.DoubleSide
  });
}

function displayMaterial(name,emissiveHex,intensity=0.85){
  return new T.MeshStandardMaterial({
    name,
    vertexColors:true,
    roughness:0.22,
    metalness:0.12,
    emissive:new T.Color(emissiveHex),
    emissiveIntensity:intensity,
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
  const raw=mergeGeometries(list,false);
  for(const e of list)e.dispose();
  const g=mergeVertices(raw,1e-4);
  raw.dispose();
  const m=new T.Mesh(g,mat);
  m.name=name;
  parent.add(m);
  return m;
}

function buildDisplayQuad(name,parent,size,position,rotation,mat,colorHex,staticTier,staticYOffset=0){
  if(staticTier){
    box('static',[size[0],size[1],0.008],[position[0],position[1]+staticYOffset,position[2]],colorHex,rotation);
    const o=new T.Object3D();
    o.name=name;
    o.position.set(...position);
    o.rotation.set(rotation[0]||0,rotation[1]||0,rotation[2]||0,'YXZ');
    o.userData={role:'lookup_only',display:true};
    parent.add(o);
    return o;
  }
  const g=new T.PlaneGeometry(size[0],size[1],1,1);
  const p=g.attributes.position,colors=new Float32Array(p.count*3),c=new T.Color(colorHex);
  for(let i=0;i<p.count;i++){
    colors[i*3]=c.r;
    colors[i*3+1]=c.g;
    colors[i*3+2]=c.b;
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));
  const m=new T.Mesh(g,mat);
  m.name=name;
  m.position.set(...position);
  m.rotation.set(rotation[0]||0,rotation[1]||0,rotation[2]||0,'YXZ');
  m.userData={role:'onboard_display',uv_mapped:true,size_m:size};
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

export const WHEEL_SPECS=[
  {id:'FL',side:-1,z:1.44,steerable:true,steerLimitDeg:34,chaseScreenSide:'screen-right (-X)'},
  {id:'FR',side:1,z:1.44,steerable:true,steerLimitDeg:34,chaseScreenSide:'screen-left (+X)'},
  {id:'ML',side:-1,z:-0.42,steerable:false,steerLimitDeg:15,chaseScreenSide:'screen-right (-X)'},
  {id:'MR',side:1,z:-0.42,steerable:false,steerLimitDeg:15,chaseScreenSide:'screen-left (+X)'},
  {id:'RL',side:-1,z:-1.44,steerable:false,steerLimitDeg:15,chaseScreenSide:'screen-right (-X)'},
  {id:'RR',side:1,z:-1.44,steerable:false,steerLimitDeg:15,chaseScreenSide:'screen-left (+X)'}
];

export const THRUSTER_SPECS=[
  {id:'V_FL',group:'ventral',pos:[-0.48,-0.18,0.68],cant:[0,0,-0.08],pitchLimitDeg:[-28,28],rollLimitDeg:[-25,25],signedX:-0.48},
  {id:'V_FR',group:'ventral',pos:[0.48,-0.18,0.68],cant:[0,0,0.08],pitchLimitDeg:[-28,28],rollLimitDeg:[-25,25],signedX:0.48},
  {id:'V_RL',group:'ventral',pos:[-0.48,-0.18,-0.78],cant:[0,0,-0.08],pitchLimitDeg:[-28,28],rollLimitDeg:[-25,25],signedX:-0.48},
  {id:'V_RR',group:'ventral',pos:[0.48,-0.18,-0.78],cant:[0,0,0.08],pitchLimitDeg:[-28,28],rollLimitDeg:[-25,25],signedX:0.48},
  {id:'L_FL',group:'lateral',pos:[-0.80,-0.10,0.64],cant:[0,0,-0.42],pitchLimitDeg:[-35,35],rollLimitDeg:[-42,18],signedX:-0.80},
  {id:'L_FR',group:'lateral',pos:[0.80,-0.10,0.64],cant:[0,0,0.42],pitchLimitDeg:[-35,35],rollLimitDeg:[-18,42],signedX:0.80},
  {id:'L_RL',group:'lateral',pos:[-0.80,-0.10,0.18],cant:[0,0,-0.42],pitchLimitDeg:[-35,35],rollLimitDeg:[-42,18],signedX:-0.80},
  {id:'L_RR',group:'lateral',pos:[0.80,-0.10,0.18],cant:[0,0,0.42],pitchLimitDeg:[-35,35],rollLimitDeg:[-18,42],signedX:0.80}
];

// 6 bounded detachable debris fragments with attachment sockets and simplified convex box colliders
export const DEBRIS_SPECS=[
  {
    id:'DEBRIS_FRONT_BEAK',
    socket:'SOCKET_DEBRIS_FRONT_BEAK',
    zone:'FRONT_BUMPER',
    minDamage:2,
    attachedPos:[-0.38,0.18,2.10],
    wreckPos:[-0.62,-0.51,2.52],
    wreckRot:[0.35,0.42,-0.28],
    size:[0.34,0.08,0.42],
    color:C.ceramic
  },
  {
    id:'DEBRIS_FLANK_NEG_X',
    socket:'SOCKET_DEBRIS_FLANK_NEG_X',
    zone:'FLANK_NEG_X',
    minDamage:2,
    attachedPos:[-0.76,0.12,0.42],
    wreckPos:[-1.32,-0.52,0.58],
    wreckRot:[0.18,-0.32,-0.48],
    size:[0.12,0.26,0.56],
    color:C.slate
  },
  {
    id:'DEBRIS_WHEEL_RIM_FL',
    socket:'SOCKET_DEBRIS_WHEEL_RIM_FL',
    zone:'WHEEL_FL',
    minDamage:2,
    attachedPos:[-1.16,-0.08,1.44],
    wreckPos:[-1.44,-0.51,1.62],
    wreckRot:[0.12,0.28,-1.18],
    size:[0.08,0.38,0.38],
    color:C.titaniumMid
  },
  {
    id:'DEBRIS_SENSOR_VISOR',
    socket:'SOCKET_DEBRIS_SENSOR_VISOR',
    zone:'SENSOR_MAST',
    minDamage:2,
    attachedPos:[0.0,0.82,0.34],
    wreckPos:[0.44,-0.52,0.18],
    wreckRot:[0.42,-0.55,0.22],
    size:[0.42,0.06,0.26],
    color:C.titaniumMid
  },
  {
    id:'DEBRIS_NOZZLE_BELL',
    socket:'SOCKET_DEBRIS_NOZZLE_BELL',
    zone:'NOZZLE_L_FL',
    minDamage:3,
    attachedPos:[-0.86,-0.22,0.64],
    wreckPos:[-1.12,-0.52,0.82],
    wreckRot:[0.68,0.24,-0.52],
    size:[0.18,0.14,0.18],
    color:C.nozzleOuter
  }
];

export const DAMAGE_ZONES=[
  {id:'FRONT_BUMPER',label:'Front Bumper & Wedge Nose (+Z)',signedX:0,meshes:['ZONE_FRONT_BUMPER']},
  {id:'REAR_PANEL',label:'Rear Bulkhead & Payload Bay (-Z)',signedX:0,meshes:['ZONE_REAR_PANEL']},
  {id:'FLANK_NEG_X',label:'Left Flank & COPV Bay (-X · Screen-Right from Rear)',signedX:-0.74,meshes:['ZONE_FLANK_NEG_X']},
  {id:'FLANK_POS_X',label:'Right Flank & COPV Bay (+X · Screen-Left from Rear)',signedX:0.74,meshes:['ZONE_FLANK_POS_X']},
  {id:'SENSOR_MAST',label:'EO/IR + LiDAR Sensor Mast (+Y)',signedX:0,meshes:['SENSOR_MAST_HEAD']},
  ...WHEEL_SPECS.map(w=>({
    id:`WHEEL_${w.id}`,
    label:`Wheel & Suspension ${w.id} (${w.side<0?'-X Screen-Right':'+X Screen-Left'})`,
    signedX:w.side*0.98,
    meshes:[`SUSP_ARM_${w.id}`,`WHEEL_${w.id}`,`DAMPER_BARREL_${w.id}`,`DAMPER_ROD_${w.id}`]
  })),
  ...THRUSTER_SPECS.map(t=>({
    id:`NOZZLE_${t.id}`,
    label:`Cold-Gas Nozzle ${t.id} (${t.signedX<0?'-X':'+X'})`,
    signedX:t.signedX,
    meshes:[`THRUSTER_${t.id}`]
  }))
];

export const ENGINE_NODES=[
  ...WHEEL_SPECS.flatMap(w=>['SOCKET_DAMPER_UPPER_','SOCKET_DAMPER_LOWER_','DAMPER_AIM_','DAMPER_ROD_SLIDE_','DAMPER_BARREL_','DAMPER_ROD_'].map(p=>p+w.id)),
  'R47XS_ROVER_ROOT',
  'ROVER_CHASSIS_JUMP',
  'CHASSIS_ARMOR_BODY',
  'ZONE_FRONT_BUMPER',
  'ZONE_REAR_PANEL',
  'ZONE_FLANK_NEG_X',
  'ZONE_FLANK_POS_X',
  'DISPLAY_CRACK_OVERLAY',
  'DEBRIS_DETACHABLE_GROUP',
  'DEBRIS_FRONT_BEAK',
  'DEBRIS_FLANK_NEG_X',
  'DEBRIS_FENDER_POS_X',
  'DEBRIS_WHEEL_RIM_FL',
  'DEBRIS_SENSOR_VISOR',
  'DEBRIS_NOZZLE_BELL',
  'SUSPENSION_BOGIE_L',
  'SUSPENSION_ARMS_L',
  'SUSPENSION_BOGIE_R',
  'SUSPENSION_ARMS_R',
  'WHEEL_DRIVE_L',
  'WHEEL_SET_L',
  'WHEEL_DRIVE_R',
  'WHEEL_SET_R',
  'SUSP_PIVOT_FL',
  'SUSP_ARM_FL',
  'WHEEL_STEER_FL',
  'WHEEL_SPIN_FL',
  'WHEEL_FL',
  'SUSP_PIVOT_FR',
  'SUSP_ARM_FR',
  'WHEEL_STEER_FR',
  'WHEEL_SPIN_FR',
  'WHEEL_FR',
  'SUSP_PIVOT_ML',
  'SUSP_ARM_ML',
  'WHEEL_STEER_ML',
  'WHEEL_SPIN_ML',
  'WHEEL_ML',
  'SUSP_PIVOT_MR',
  'SUSP_ARM_MR',
  'WHEEL_STEER_MR',
  'WHEEL_SPIN_MR',
  'WHEEL_MR',
  'SUSP_PIVOT_RL',
  'SUSP_ARM_RL',
  'WHEEL_STEER_RL',
  'WHEEL_SPIN_RL',
  'WHEEL_RL',
  'SUSP_PIVOT_RR',
  'SUSP_ARM_RR',
  'WHEEL_STEER_RR',
  'WHEEL_SPIN_RR',
  'WHEEL_RR',
  'SENSOR_MAST_YAW',
  'OPTICS_HEAD_PITCH',
  'SENSOR_MAST_HEAD',
  'THRUSTER_GIMBAL_VENTRAL',
  'VENTRAL_THRUSTER_CLUSTER',
  'THRUSTER_GIMBAL_LATERAL',
  'LATERAL_THRUSTER_CLUSTER',
  'GIMBAL_V_FL',
  'THRUSTER_V_FL',
  'GIMBAL_V_FR',
  'THRUSTER_V_FR',
  'GIMBAL_V_RL',
  'THRUSTER_V_RL',
  'GIMBAL_V_RR',
  'THRUSTER_V_RR',
  'GIMBAL_L_FL',
  'THRUSTER_L_FL',
  'GIMBAL_L_FR',
  'THRUSTER_L_FR',
  'GIMBAL_L_RL',
  'THRUSTER_L_RL',
  'GIMBAL_L_RR',
  'THRUSTER_L_RR',
  'COLD_GAS_PLUMES',
  'DISPLAY_SPEED_LEFT',
  'DISPLAY_THRUST_RIGHT',
  'DISPLAY_GAS_RESERVE_REAR',
  'DISPLAY_FDAI_TELEMETRY_PANEL',
  'ROVER_STATIC_BODY',
  'SOCKET_SENSOR_MAST',
  'SOCKET_PAYLOAD_L',
  'SOCKET_PAYLOAD_R',
  'SOCKET_TOW_FRONT',
  'SOCKET_TOW_REAR',
  'SOCKET_THRUSTER_V_FL',
  'SOCKET_THRUSTER_V_FR',
  'SOCKET_THRUSTER_V_RL',
  'SOCKET_THRUSTER_V_RR',
  'SOCKET_THRUSTER_L_FL',
  'SOCKET_THRUSTER_L_FR',
  'SOCKET_THRUSTER_L_RL',
  'SOCKET_THRUSTER_L_RR',
  'SOCKET_DISPLAY_SPEED_L',
  'SOCKET_DISPLAY_THRUST_R',
  'SOCKET_DISPLAY_GAS_REAR',
  'SOCKET_DISPLAY_FDAI_REAR',
  'SOCKET_GAS_LEAK_NEG_X',
  'SOCKET_GAS_LEAK_POS_X',
  'SOCKET_GAS_LEAK_REAR',
  'SOCKET_DEBRIS_FRONT_BEAK',
  'SOCKET_DEBRIS_FLANK_NEG_X',
  'SOCKET_DEBRIS_FENDER_POS_X',
  'SOCKET_DEBRIS_WHEEL_RIM_FL',
  'SOCKET_DEBRIS_SENSOR_VISOR',
  'SOCKET_DEBRIS_NOZZLE_BELL'
];

// Core chassis tub (always present; localized perimeter zones attach around it)
function buildChassisCore(key,lod,dmg=0,yOffset=0){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?12:staticTier?6:8;
  const Y=y=>y+yOffset;
  const slumpY=dmg===3?-0.08:dmg===2?-0.02:0;
  const hullTiltZ=dmg===3?-0.09:dmg===2?-0.03:0;

  box(key,[1.10,0.32,2.78],[0,Y(0.08+slumpY),0.02],dmg>=2?C.scuff:C.graphite,[0,0,hullTiltZ]);
  box(key,[0.88,0.14,3.12],[0,Y(-0.14+slumpY),0.04],C.carbon,[0,0,hullTiltZ]);
  box(key,[1.04,0.06,0.88],[0,Y(-0.22+slumpY),0.02],C.slate,[0,0,hullTiltZ]);

  // Upper dorsal carapace over central bay & rear deck
  box(key,[1.38,0.12,1.34],[0,Y(0.34+slumpY),0.32],dmg===3?C.scuff:C.titaniumLight,[0,0,hullTiltZ]);
  box(key,[1.28,0.10,1.38],[0,Y(0.31+slumpY),-1.10],dmg>=2?C.titaniumMid:C.titanium,[-0.07,0,hullTiltZ]);

  // Dorsal spine sensor plinth & recessed black NASM FDAI telemetry housing
  box(key,[0.82,0.12,1.12],[0,Y(0.42+slumpY),0.28],C.slate,[0,0,hullTiltZ]);
  cyl(key,0.29,0.35,0.12,[0,Y(0.48+slumpY),0.26],C.graphite,seg);
  box(key,[0.74,0.09,0.88],[0,Y(0.38),-0.88],C.carbon,[-0.07,0,0]);
  if(!staticTier){
    box(key,[0.68,0.025,0.04],[0,Y(0.43),-0.48],C.slate,[-0.07,0,0]);
    box(key,[0.68,0.025,0.04],[0,Y(0.375),-1.28],C.slate,[-0.07,0,0]);
    box(key,[0.04,0.025,0.80],[-0.34,Y(0.402),-0.88],C.slate,[-0.07,0,0]);
    box(key,[0.04,0.025,0.80],[0.34,Y(0.402),-0.88],C.slate,[-0.07,0,0]);
  }
  if(dmg>=2){
    // Exposed internal crash bulkheads & copper wiring harness in D2/D3
    box(key,[0.64,0.08,0.42],[-0.18,Y(0.39+slumpY),0.82],C.primer,[0.18,0.12,-0.22]);
    box(key,[0.38,0.05,0.28],[0.22,Y(0.37+slumpY),-0.18],C.copper,[-0.12,0.24,0.18]);
  }
}

// Zone 1: Front Bumper & Wedge Glacis (+Z)
function buildZoneFrontBumper(key,lod,dmg=0,yOffset=0){
  const Y=y=>y+yOffset;
  const bendX=dmg===0?0:dmg===1?-0.08:dmg===2?-0.22:-0.36;
  const twistZ=dmg===0?0:dmg===1?-0.09:dmg===2?-0.24:-0.42;
  const dy=dmg===0?0:dmg===1?-0.02:dmg===2?-0.06:-0.14;

  // Wedge nose glacis & ceramic beak
  box(key,[0.74,0.14,1.12],[0,Y(0.24+dy),1.46],dmg>=2?C.scuff:C.titanium,[0.20+bendX*0.5,0,twistZ*0.5]);
  if(dmg<3){
    box(key,[0.66,0.12,0.68],[dmg>=2?0.06:0,Y(0.11+dy),1.98],dmg===0?C.ceramic:C.primer,[0.32+bendX,twistZ*0.4,twistZ]);
  }else{
    // Sheared nose exposing internal crash rails in D3
    box(key,[0.52,0.10,0.48],[-0.10,Y(0.06+dy),1.82],C.scorch,[0.48,-0.25,-0.38]);
    box(key,[0.12,0.14,0.62],[-0.26,Y(0.04+dy),1.92],C.primer,[0.15,0.18,-0.28]);
    box(key,[0.12,0.14,0.58],[0.26,Y(0.02+dy),1.88],C.primer,[-0.22,-0.14,0.32]);
  }
  box(key,[1.02,0.11,0.56],[0,Y(-0.04+dy),1.98],C.graphite,[-0.24+bendX*0.6,0,twistZ*0.6]);
  box(key,[1.00,0.06,0.82],[0,Y(-0.21+dy*0.6),1.42],C.slate,[0.08+bendX*0.4,0,twistZ*0.4]);

  // Cheek armor & high-clearance front eyebrows
  for(const sx of [-1,1]){
    const sideHit=(sx<0&&dmg>=1)?dmg:Math.max(0,dmg-1);
    const cRot=[0.20-sideHit*0.11,sx*0.08+sideHit*0.08,-sx*0.18-sideHit*0.16];
    box(key,[0.28,0.11,1.00],[sx*0.46,Y(0.23-sideHit*0.03),1.44],sideHit>=2?C.primer:C.titaniumLight,cRot);

  }

  // Front bumper bar, shackles & tactical lights
  box(key,[1.16,0.14,0.18],[0,Y(0.03+dy),2.22-dmg*0.04],dmg>=2?C.scorch:C.carbon,[bendX,twistZ*0.5,twistZ]);
  for(const sx of [-1,1]){
    if(dmg>=2&&sx<0)continue; // Left front shackle & lamp sheared off in D2/D3
    box(key,[0.24,0.08,0.10],[sx*0.40,Y(0.07+dy),2.26-dmg*0.03],C.graphite,[0,0,sx*dmg*0.08]);
    box(key,[0.18,0.045,0.04],[sx*0.40,Y(0.07+dy),2.31-dmg*0.03],dmg>=2?C.amber:C.tailRed);
    box(key,[0.07,0.16,0.14],[sx*0.22,Y(-0.02+dy),2.29-dmg*0.03],C.steel,[dmg*0.18,0,sx*dmg*0.14]);
  }
}

// Zone 2: Rear Bulkhead & Payload Bay (-Z)
function buildZoneRearPanel(key,lod,dmg=0,yOffset=0){
  const Y=y=>y+yOffset;
  const tiltZ=dmg===0?0:dmg===1?0.07:dmg===2?0.19:0.34;
  const pitchX=dmg===0?0:dmg===1?0.06:dmg===2?0.16:0.28;
  const dy=dmg===0?0:dmg===1?-0.01:dmg===2?-0.05:-0.11;

  box(key,[1.10,0.08,0.72],[0,Y(0.22+dy),-1.90],dmg>=2?C.scuff:C.titaniumMid,[-0.22+pitchX,0,tiltZ]);
  box(key,[1.14,0.28,0.50],[0,Y(0.08+dy),-1.98],dmg>=2?C.scorch:C.graphite,[pitchX*0.5,0,tiltZ*0.6]);
  box(key,[0.68,0.22,0.44],[0,Y(0.09+dy),-2.14],dmg===0?C.titaniumMid:C.primer,[pitchX,tiltZ*0.3,tiltZ]);
  box(key,[0.98,0.06,0.88],[0,Y(-0.20+dy*0.5),-1.42],C.slate,[-0.08+pitchX*0.4,0,tiltZ*0.4]);

  // Rear gas-reserve display bezel (keeps DISPLAY_GAS_RESERVE_REAR visible at z = -2.385)
  box(key,[0.54,0.17,0.04],[0,Y(0.11),-2.36],C.carbon,[0,0,dmg*0.03]);

  for(const sx of [-1,1]){
    if(dmg===3&&sx>0)continue; // Right tail light cluster torn off in D3
    const bTilt=sx*dmg*0.09;
    box(key,[0.22,0.06,0.06],[sx*0.44,Y(0.15+dy),-2.23],dmg>=2&&sx<0?C.scorch:C.tailRed,[0,0,bTilt]);
    box(key,[0.18,0.045,0.06],[sx*0.44,Y(0.06+dy),-2.23],C.amber,[0,0,bTilt]);
  }
}

// Zone 3 & 4: Flank & COPV Bay (sideSign = -1 for FLANK_NEG_X / screen-right from rear; +1 for FLANK_POS_X / screen-left from rear)
function buildZoneFlank(key,sideSign,lod,dmg=0,yOffset=0){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?10:staticTier?6:8;
  const Y=y=>y+yOffset;
  const sx=sideSign;
  const buckleZ=dmg===0?0:dmg===1?sx*0.10:dmg===2?sx*0.26:sx*0.44;
  const buckleX=dmg===0?0:dmg===1?0.05:dmg===2?0.16:0.28;

  // Open wheel clearance: no tandem canopy on the S variant.
  // Wheel-cover display bezel (hosts DISPLAY_SPEED_LEFT on -X and DISPLAY_THRUST_RIGHT on +X)
  box(key,[0.34,0.18,0.10],[sx*0.80,Y(0.36),-1.82],C.carbon,[-0.42,0,dmg*sx*0.04]);

  // Central flank structural bulkhead & recessed sensor slots
  box(key,[0.16,0.40,0.90],[sx*0.60,Y(0.10),0.41],dmg>=2?C.primer:C.slate,[0,0,buckleZ*0.5]);
  box(key,[0.08,0.09,0.32],[sx*0.69,Y(0.31),0.56],C.carbon);
  box(key,[0.08,0.09,0.28],[sx*0.69,Y(0.31),0.14],C.carbon);

  // Twin cylindrical COPV high-pressure nitrogen tanks + straps & plumbing
  for(const [idx,ty] of [[0,0.17],[1,0.01]]){
    const tx=sx*0.74,tz=0.41;
    // In D2/D3, lower tank (idx===1) is visibly dented/tilted and vents a cold-gas leak
    const tTilt=(idx===1&&dmg>=2)?[Math.PI/2+0.16,sx*0.18,sx*0.22]:[Math.PI/2,0,0];
    const tDrop=(idx===1&&dmg>=2)?-0.03*dmg:0;
    const tColor=(idx===1&&dmg>=2)?C.primer:C.tankBody;
    cyl(key,0.078,0.078,0.62,[tx,Y(ty+tDrop),tz],tColor,seg,tTilt);
    if(detailed&&dmg<3){
      cyl(key,0.046,0.078,0.07,[tx,Y(ty+tDrop),tz+0.34],C.chrome,seg,tTilt);
      cyl(key,0.078,0.046,0.07,[tx,Y(ty+tDrop),tz-0.34],C.chrome,seg,tTilt);
    }
    box(key,[0.17,0.17,0.045],[tx,Y(ty+tDrop),tz+0.16],C.tankBand,[0,0,buckleZ*0.6]);
    if(!(dmg>=2&&idx===1)){
      box(key,[0.17,0.17,0.045],[tx,Y(ty+tDrop),tz-0.16],C.tankBand);
    }else{
      // Ruptured copper/brass gas-leak breach collar on lower COPV tank in D2/D3
      box(key,[0.12,0.10,0.12],[tx+sx*0.04,Y(ty+tDrop),tz-0.06],C.copper,[0.35,0.25,sx*0.45]);
    }
  }

  if(!staticTier){
    beam(key,[sx*0.74,Y(0.08),0.64],[sx*0.52,Y(-0.16),0.68],0.022,dmg>=2?C.copper:C.brass,6);
    beam(key,[sx*0.74,Y(0.08),0.18],[sx*0.52,Y(-0.16),-0.76],0.022,C.brass,6);
    for(const vz of [0.68,-0.78]){
      cyl(key,0.16,0.18,0.08,[sx*0.48,Y(-0.18),vz],C.carbon,seg);
    }
  }
  if(detailed&&dmg<3){
    cyl(key,0.012,0.018,0.54,[sx*0.42,Y(0.64),-0.38],C.steel,6,[dmg*0.22,0,sx*dmg*0.18]);
  }
}

// R-47X-S boxed swing arm; damage deforms bracing while endpoint pivots stay stable.
function buildSingleSuspensionArm(key,spec,lod,dmg=0,origin=[0,0,0]){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?8:staticTier?4:6;
  const sx=spec.side;
  const [ox,oy,oz]=origin;
  const dzIn=spec.id.startsWith('F')?-0.38:spec.id.startsWith('M')?0.18:0.32;

  // Vertical & lateral buckle of outer knuckle in D1..D3
  const buckleY=dmg===0?0:dmg===1?0.02:dmg===2?0.09:0.19;
  const buckleZ=dmg===0?0:dmg===1?0.01:dmg===2?-0.06:-0.12;
  const armColor=dmg>=2?C.primer:C.titaniumMid;

  cyl(key,0.058,0.058,0.22,[ox-sx*0.04,oy,oz+dzIn*0.5],C.slate,seg,[Math.PI/2,0,0]);
  beam(key,[ox-sx*0.04,oy-0.02,oz+dzIn],[ox+sx*0.38,oy-0.01+buckleY,oz+buckleZ],0.052,armColor,seg);
  beam(key,[ox-sx*0.04,oy-0.02,oz],[ox+sx*0.38,oy-0.01+buckleY,oz+buckleZ],0.046,dmg>=2?C.scorch:C.slate,seg);
  beam(key,[ox-sx*0.02,oy+0.12,oz+dzIn*0.6],[ox+sx*0.36,oy+0.08+buckleY,oz+buckleZ],0.036,C.titaniumLight,seg);

  box(key,[0.14,0.24,0.20],[ox+sx*0.38,oy+0.02+buckleY,oz+buckleZ],C.graphite,[0,0,sx*dmg*0.14]);

  // Box-section swing arm, with a broad outer damper clevis.
  beam(key,[ox,oy,oz],[ox+sx*0.46,oy,oz],0.073,armColor,seg);
  box(key,[0.15,0.13,0.22],[ox+sx*0.39,oy,oz],C.slate);

}

// Per-wheel tire & hub with D0..D3 deformation (missing lugs, flat-spotted tire & cambered tilt in D2/D3)
function buildSingleWheel(key,spec,lod,dmg=0,origin=[0,0,0]){
  const detailed=lod===0,staticTier=lod===2;
  const radialSeg=detailed?18:staticTier?6:8;
  const treadCount=detailed?16:staticTier?4:6;
  const R=dmg===3?0.42:dmg===2?0.45:0.48;
  const W=0.36;
  const sx=spec.side;
  const [wx,wy,wz]=origin;
  // Camber tilt & upward hub buckle in D1..D3 so bent wheel posture is unmistakable from chase camera
  const camberZ=sx*(dmg===0?0:dmg===1?0.05:dmg===2?0.22:0.46);
  const toeY=sx*(dmg===0?0:dmg===1?0.02:dmg===2?-0.12:-0.24);
  const liftY=dmg===0?0:dmg===1?0.01:dmg===2?0.06:0.14;

  cyl(key,R*0.95,R*0.95,W,[wx,wy+liftY,wz],dmg>=2?C.scorch:C.rubber,radialSeg,[0,toeY,Math.PI/2+camberZ]);
  cyl(key,0.48*0.58,0.48*0.58,W+0.04,[wx,wy+liftY,wz],dmg>=2?C.primer:C.titaniumMid,radialSeg,[0,toeY,Math.PI/2+camberZ]);
  if(!staticTier){
    cyl(key,0.48*0.36,0.48*0.42,W+0.08,[wx,wy+liftY,wz],C.graphite,radialSeg,[0,toeY,Math.PI/2+camberZ]);
    cyl(key,R*0.76,R*0.92,0.05,[wx+sx*(W*0.5+0.01),wy+liftY,wz],C.tread,radialSeg,[0,toeY,Math.PI/2+camberZ]);
    cyl(key,R*0.92,R*0.76,0.05,[wx-sx*(W*0.5+0.01),wy+liftY,wz],C.tread,radialSeg,[0,toeY,Math.PI/2+camberZ]);
    cyl(key,0.48*0.18,0.48*0.18,W+0.11,[wx,wy+liftY,wz],C.steel,8,[0,toeY,Math.PI/2+camberZ]);
  }
  for(let t=0;t<treadCount;t++){
    // Omit sheared tread lugs on damaged sectors in D1/D2/D3
    if(dmg===1&&t===0)continue;
    if(dmg===2&&(t===0||t===1||t===Math.floor(treadCount/2)))continue;
    if(dmg===3&&(t%2===0))continue;
    const ang=(t/treadCount)*Math.PI*2;
    const ty=wy+liftY+Math.cos(ang)*(R-0.025);
    const tz=wz+Math.sin(ang)*(R-0.025);
    box(key,[W*0.94,0.055,0.11],[wx,ty,tz],C.tread,[-ang,toeY,camberZ]);
  }
  if(detailed&&dmg<3){
    for(let s=0;s<6;s++){
      if(dmg>=2&&s%2===0)continue;
      const ang=(s/6)*Math.PI*2;
      const sy=wy+liftY+Math.cos(ang)*(0.48*0.44);
      const sz=wz+Math.sin(ang)*(0.48*0.44);
      box(key,[0.04,0.14,0.055],[wx+sx*(W*0.5+0.02),sy,sz],C.titaniumLight,[-ang,toeY,camberZ]);
    }
  }
}

// Sensor Mast with D0..D3 deformation
function buildSensorMast(key,lod,dmg=0,pos=[0,0,0]){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?12:8;
  const [ox,oy,oz]=pos;
  const tiltX=dmg===0?0:dmg===1?0.05:dmg===2?0.22:0.48;
  const tiltZ=dmg===0?0:dmg===1?-0.04:dmg===2?-0.18:-0.38;

  cyl(key,0.10,0.13,0.18,[ox,oy-0.08,oz],C.graphite,seg,[0,0,tiltZ*0.5]);
  box(key,[0.22,0.14,0.16],[ox,oy+0.02,oz],C.slate,[tiltX*0.5,0,tiltZ*0.5]);

  box(key,[0.44,0.22,0.28],[ox,oy+0.14-dmg*0.02,oz+0.02],dmg>=2?C.scuff:C.titaniumLight,[tiltX,0,tiltZ]);
  if(dmg<3){
    box(key,[0.46,0.06,0.30],[ox,oy+0.26-dmg*0.02,oz+0.02],C.titaniumMid,[tiltX,0,tiltZ]);
  }
  for(const [idx,[lx,r]] of [[-0.11,0.075],[0.11,0.068]].entries()){
    cyl(key,r,r,0.08,[ox+lx,oy+0.14-dmg*0.02,oz+0.16],C.carbon,seg,[Math.PI/2+tiltX,0,tiltZ]);
    const lensCol=(dmg>=2&&idx===0)?C.scorch:(dmg===1?C.opticCracked:C.opticGlass);
    cyl(key,r*0.76,r*0.76,0.04,[ox+lx,oy+0.14-dmg*0.02,oz+0.19],lensCol,seg,[Math.PI/2+tiltX,0,tiltZ]);
  }
  cyl(key,0.08,0.09,0.07,[ox,oy+0.31-dmg*0.03,oz],dmg>=2?C.primer:C.graphite,seg,[tiltX,0,tiltZ]);
  if(!staticTier){
    const antH=dmg===3?0.14:dmg===2?0.24:0.44;
    const antTilt=dmg===0?0:dmg===1?0.28:0.65;
    cyl(key,0.012,0.020,antH,[ox-0.24,oy+0.22+antH*0.3,oz-0.06],C.steel,6,[antTilt,0,-antTilt]);
  }
}

// Individual thruster nozzle with D0..D3 deformation (scuffed lip in D1, bent/crimped bell in D2, sheared bell in D3)
function buildSingleThruster(key,spec,lod,dmg=0,origin=[0,0,0],rot=[0,0,0]){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?10:6;
  const [ox,oy,oz]=origin;
  const isLateral=spec.group==='lateral';
  const sx=spec.pos[0]<0?-1:1;

  const bendX=dmg===0?0:dmg===1?0.06:dmg===2?0.32:0.58;
  const bendZ=dmg===0?0:dmg===1?sx*0.05:dmg===2?sx*0.28:sx*0.52;
  const bellRot=[rot[0]+bendX,rot[1],rot[2]+bendZ];
  const bellH=dmg===3?0.10:0.17;
  const bellR2=dmg===2?0.078:dmg===3?0.065:0.105;

  box(key,[0.18,0.08,0.18],[ox,oy+0.03,oz],dmg>=2?C.primer:C.slate,rot);
  cyl(key,0.046,bellR2,bellH,[ox,oy-0.05,oz],dmg>=2?C.scorch:C.nozzleOuter,seg,bellRot);
  if(!staticTier){
    cyl(key,0.034,bellR2*0.84,bellH*0.78,[ox,oy-0.06,oz],C.nozzleInner,seg,bellRot);
    box(key,[0.030,0.12,0.030],[ox-sx*0.06,oy+0.01,oz+0.05],dmg>=2?C.copper:C.chrome,bellRot);
    if(isLateral){
      box(key,[0.14,0.11,0.19],[ox-sx*0.04,oy+0.06,oz],dmg>=2?C.scuff:C.titaniumMid,rot);
    }
  }
  if(detailed&&dmg<2){
    cyl(key,0.11,0.11,0.024,[ox,oy-0.13,oz],C.chrome,seg,bellRot);
  }
}

// Cracked glass/bezel fracture overlay across the 4 live onboard displays (separate visual layer)
function buildDisplayCrackOverlay(key,dmg=0,yOffset=0){
  const Y=y=>y+yOffset;
  if(dmg===0){
    // Tiny hidden anchor in D0 so DISPLAY_CRACK_OVERLAY is always a valid Mesh in LOD0/LOD1
    box(key,[0.01,0.01,0.01],[0,Y(0.10),0],C.carbon);
    return;
  }
  const col=dmg===1?C.titaniumLight:dmg===2?C.amber:C.tailRed;
  // Crack shards over left & right rear wheel-cover displays
  for(const sx of [-1,1]){
    box(key,[0.16,0.008,0.006],[sx*0.80,Y(0.37),-1.876],col,[-0.42,0,sx*0.48]);
    if(dmg>=2){
      box(key,[0.12,0.008,0.006],[sx*0.78,Y(0.36),-1.876],col,[-0.42,0,-sx*0.62]);
    }
  }
  // Crack line across rear gas-reserve display
  box(key,[0.24,0.008,0.006],[0.04,Y(0.11),-2.389],col,[0,0,0.34]);
  // Diagonal fracture lines across dorsal rear NASM FDAI panel
  box(key,[0.38,0.006,0.008],[-0.06,Y(0.436),-0.86],col,[-0.07,0.52,0]);
  if(dmg>=2){
    box(key,[0.32,0.006,0.008],[0.08,Y(0.436),-0.92],col,[-0.07,-0.64,0]);
  }
}

// Build convex collision proxy descriptors + bounds for any zone/state combination
export function buildCollisionProxies(zoneStates={},defaultDmg=0){
  const getZ=id=>zoneStates[id]!==undefined?zoneStates[id]:defaultDmg;
  const hullDmg=Math.max(getZ('FRONT_BUMPER'),getZ('REAR_PANEL'),getZ('FLANK_NEG_X'),getZ('FLANK_POS_X'));
  const slumpY=hullDmg===3?-0.08:hullDmg===2?-0.02:0;

  const proxies=[
    {
      id:'PROXY_CHASSIS_CORE',
      zone:'CHASSIS_CORE',
      shape:'convex_box',
      damage_level:hullDmg,
      center_m:[0,+(0.64+slumpY).toFixed(3),0.02],
      size_m:[1.38,0.52,2.78],
      rotation_rad:[0,0,hullDmg===3?-0.09:0]
    },
    {
      id:'PROXY_FRONT_BUMPER',
      zone:'FRONT_BUMPER',
      shape:'convex_box',
      damage_level:getZ('FRONT_BUMPER'),
      center_m:[0,+(0.62-getZ('FRONT_BUMPER')*0.04).toFixed(3),1.78],
      size_m:[1.18,0.38,1.08],
      rotation_rad:[-getZ('FRONT_BUMPER')*0.08,0,-getZ('FRONT_BUMPER')*0.09]
    },
    {
      id:'PROXY_REAR_PANEL',
      zone:'REAR_PANEL',
      shape:'convex_box',
      damage_level:getZ('REAR_PANEL'),
      center_m:[0,+(0.64-getZ('REAR_PANEL')*0.03).toFixed(3),-1.96],
      size_m:[1.16,0.36,0.82],
      rotation_rad:[getZ('REAR_PANEL')*0.06,0,getZ('REAR_PANEL')*0.07]
    },
    {
      id:'PROXY_FLANK_NEG_X',
      zone:'FLANK_NEG_X',
      chase_screen_side:'screen-right (-X)',
      shape:'convex_box',
      damage_level:getZ('FLANK_NEG_X'),
      center_m:[-0.76,0.72,-0.24],
      size_m:[0.38,0.48,2.68],
      rotation_rad:[0,0,-getZ('FLANK_NEG_X')*0.08]
    },
    {
      id:'PROXY_FLANK_POS_X',
      zone:'FLANK_POS_X',
      chase_screen_side:'screen-left (+X)',
      shape:'convex_box',
      damage_level:getZ('FLANK_POS_X'),
      center_m:[0.76,0.72,-0.24],
      size_m:[0.38,0.48,2.68],
      rotation_rad:[0,0,getZ('FLANK_POS_X')*0.08]
    },
    {
      id:'PROXY_SENSOR_MAST',
      zone:'SENSOR_MAST',
      shape:'convex_box',
      damage_level:getZ('SENSOR_MAST'),
      center_m:[0,1.26,0.26],
      size_m:[0.46,0.38,0.32],
      rotation_rad:[getZ('SENSOR_MAST')*0.12,0,-getZ('SENSOR_MAST')*0.09],
      functional:getZ('SENSOR_MAST')<3
    }
  ];

  for(const w of WHEEL_SPECS){
    const wd=getZ(`WHEEL_${w.id}`);
    const r=wd===3?0.42:wd===2?0.45:0.48;
    const lift=wd===3?0.14:wd===2?0.06:0;
    proxies.push({
      id:`PROXY_WHEEL_${w.id}`,
      zone:`WHEEL_${w.id}`,
      chase_screen_side:w.chaseScreenSide,
      shape:'convex_cylinder',
      damage_level:wd,
      center_m:[w.side*0.98,+(0.48+lift).toFixed(3),w.z],
      radius_m:r,
      width_m:0.36,
      size_m:[0.38,+(r*2).toFixed(3),+(r*2).toFixed(3)],
      rotation_rad:[0,w.side*(wd>=2?-0.12:0),w.side*(wd*0.14)],
      functional:wd<3,
      capabilities:{
        spin_efficiency:wd===0?1.0:wd===1?0.95:wd===2?0.45:0.0,
        steer_limit_deg:w.steerable?(wd<=1?34:wd===2?17:0):0,
        suspension_scale:wd<=1?1.0:wd===2?0.40:0.0
      }
    });
  }

  for(const t of THRUSTER_SPECS){
    const td=getZ(`NOZZLE_${t.id}`);
    proxies.push({
      id:`PROXY_NOZZLE_${t.id}`,
      zone:`NOZZLE_${t.id}`,
      signed_x:t.signedX,
      shape:'convex_box',
      damage_level:td,
      center_m:[t.pos[0],+(t.pos[1]+0.52).toFixed(3),t.pos[2]],
      size_m:[0.22,0.24,0.22],
      rotation_rad:[td*0.14,0,t.cant[2]],
      functional:td<3,
      capabilities:{
        max_thrust_scale:td===0?1.0:td===1?0.92:td===2?0.48:0.0,
        gimbal_range_scale:td<=1?1.0:td===2?0.35:0.0,
        gas_leak:td===2
      }
    });
  }

  for(const d of DEBRIS_SPECS){
    const zd=getZ(d.zone);
    const detached=zd>=d.minDamage;
    const pos=detached?d.wreckPos:d.attachedPos;
    proxies.push({
      id:`PROXY_${d.id}`,
      zone:d.zone,
      fragment_node:d.id,
      attachment_socket:d.socket,
      shape:'convex_box',
      detached,
      center_m:[pos[0],+(pos[1]+0.56).toFixed(3),pos[2]],
      size_m:d.size,
      rotation_rad:detached?d.wreckRot:[0,0,0]
    });
  }

  return proxies;
}

export function buildReconRover(lod=0,damageLevel=0,zoneOverrides=null){
  pieces.clear();
  const staticTier=lod===2;
  const getDmg=z=>zoneOverrides&&zoneOverrides[z]!==undefined?Number(zoneOverrides[z]):Number(damageLevel);

  const mat=armorMaterial();
  const speedMat=displayMaterial('DISPLAY_SPEED_ORANGE_MAT',C.amber,damageLevel===3?0.15:0.9);
  const thrustMat=displayMaterial('DISPLAY_THRUST_CYAN_MAT',C.cyan,damageLevel===3?0.15:0.9);
  const gasMat=displayMaterial('DISPLAY_GAS_RESERVE_MAT',C.mint,damageLevel===3?0.15:0.85);
  const fdaiMat=displayMaterial('DISPLAY_FDAI_TELEMETRY_MAT',C.fdaiWhite,damageLevel===3?0.25:0.75);

  const root=new T.Group();
  root.name='R47XS_ROVER_ROOT';

  const chassisJump=new T.Group();
  chassisJump.name='ROVER_CHASSIS_JUMP';
  chassisJump.position.set(0,0.56,0);
  root.add(chassisJump);

  // Legacy bogie & wheel lookup groups
  const bogieL=new T.Group();
  bogieL.name='SUSPENSION_BOGIE_L';
  chassisJump.add(bogieL);

  const bogieR=new T.Group();
  bogieR.name='SUSPENSION_BOGIE_R';
  chassisJump.add(bogieR);

  const suspArmsL=new T.Object3D();
  suspArmsL.name='SUSPENSION_ARMS_L';
  suspArmsL.userData={role:'lookup_only'};
  bogieL.add(suspArmsL);

  const suspArmsR=new T.Object3D();
  suspArmsR.name='SUSPENSION_ARMS_R';
  suspArmsR.userData={role:'lookup_only'};
  bogieR.add(suspArmsR);

  const wheelDriveL=new T.Group();
  wheelDriveL.name='WHEEL_DRIVE_L';
  chassisJump.add(wheelDriveL);

  const wheelDriveR=new T.Group();
  wheelDriveR.name='WHEEL_DRIVE_R';
  chassisJump.add(wheelDriveR);

  const wheelSetL=new T.Object3D();
  wheelSetL.name='WHEEL_SET_L';
  wheelSetL.userData={role:'lookup_only'};
  wheelDriveL.add(wheelSetL);

  const wheelSetR=new T.Object3D();
  wheelSetR.name='WHEEL_SET_R';
  wheelSetR.userData={role:'lookup_only'};
  wheelDriveR.add(wheelSetR);

  // 1. Chassis Core & 4 Selectable Perimeter Hull Zones
  const yOff=staticTier?0.56:0;
  buildChassisCore(staticTier?'static':'chassis',lod,damageLevel,yOff);
  flushMesh('chassis',chassisJump,'CHASSIS_ARMOR_BODY',mat,staticTier);

  buildZoneFrontBumper(staticTier?'static':'zone_front',lod,getDmg('FRONT_BUMPER'),yOff);
  flushMesh('zone_front',chassisJump,'ZONE_FRONT_BUMPER',mat,staticTier);

  buildZoneRearPanel(staticTier?'static':'zone_rear',lod,getDmg('REAR_PANEL'),yOff);
  flushMesh('zone_rear',chassisJump,'ZONE_REAR_PANEL',mat,staticTier);

  buildZoneFlank(staticTier?'static':'zone_flank_neg',-1,lod,getDmg('FLANK_NEG_X'),yOff);
  flushMesh('zone_flank_neg',chassisJump,'ZONE_FLANK_NEG_X',mat,staticTier);

  buildZoneFlank(staticTier?'static':'zone_flank_pos',1,lod,getDmg('FLANK_POS_X'),yOff);
  flushMesh('zone_flank_pos',chassisJump,'ZONE_FLANK_POS_X',mat,staticTier);

  // Display crack overlay layer (flush bezel in D0, fracture lines in D1–D3)
  buildDisplayCrackOverlay(staticTier?'static':'crack_overlay',damageLevel,yOff);
  const crackMesh=flushMesh('crack_overlay',chassisJump,'DISPLAY_CRACK_OVERLAY',mat,staticTier);
  crackMesh.userData={role:'display_crack_overlay',damage_level:damageLevel};

  // Bounded detachable debris fragments (6 fragments with sockets; attached to hull in D0/D1, detached to ground in D2/D3)
  const debrisGroup=new T.Group();
  debrisGroup.name='DEBRIS_DETACHABLE_GROUP';
  chassisJump.add(debrisGroup);

  for(const d of DEBRIS_SPECS){
    marker(chassisJump,d.socket,d.attachedPos,'debris_attachment',[0,1,0]);
    const zd=getDmg(d.zone);
    const detached=zd>=d.minDamage;
    const pos=detached?d.wreckPos:d.attachedPos;
    const rot=detached?d.wreckRot:[0,0,0];
    const dKey=`debris_${d.id}`;
    if(staticTier){
      box('static',d.size,[pos[0],pos[1]+0.56,pos[2]],d.color,rot);
      flushMesh(dKey,debrisGroup,d.id,mat,true);
    }else{
      box(dKey,d.size,pos,d.color,rot);
      const dm=flushMesh(dKey,debrisGroup,d.id,mat,false);
      dm.userData={role:'detachable_debris',zone:d.zone,min_damage:d.minDamage,detached,socket:d.socket};
    }
  }

  // Preserve retired fender identifiers as geometry-free compatibility lookups.
  marker(chassisJump,'SOCKET_DEBRIS_FENDER_POS_X',[0.80,0.42,-0.88],'retired_fender_attachment',[0,1,0]);
  const retiredFender=new T.Object3D();retiredFender.name='DEBRIS_FENDER_POS_X';
  retiredFender.userData={role:'lookup_only',retired:true};debrisGroup.add(retiredFender);

  // 2. Six Independent Wheel & Suspension Stations
  for(const spec of WHEEL_SPECS){
    const wd=getDmg(`WHEEL_${spec.id}`);
    const parentBogie=spec.side<0?bogieL:bogieR;
    const suspPivot=new T.Group();
    suspPivot.name=`SUSP_PIVOT_${spec.id}`;
    suspPivot.position.set(spec.side*0.48,-0.08,spec.z);
    suspPivot.userData={
      role:'suspension_pivot',
      wheel:spec.id,
      signed_x:spec.side*0.48,
      chase_screen_side:spec.chaseScreenSide,
      damage_level:wd,
      functional:wd<3
    };
    parentBogie.add(suspPivot);

    const armKey=`susp_${spec.id}`;
    if(staticTier){
      buildSingleSuspensionArm('static',spec,lod,wd,[spec.side*0.48,0.48,spec.z]);
    }else{
      buildSingleSuspensionArm(armKey,spec,lod,wd,[0,0,0]);
    }
    flushMesh(armKey,suspPivot,`SUSP_ARM_${spec.id}`,mat,staticTier);

    const upper=new T.Group();upper.name=`SOCKET_DAMPER_UPPER_${spec.id}`;
    upper.position.set(spec.side*0.53,0.35,spec.z);
    upper.userData={kind:'damper_upper',zone:`WHEEL_${spec.id}`};chassisJump.add(upper);
    const lower=new T.Group();lower.name=`SOCKET_DAMPER_LOWER_${spec.id}`;
    lower.position.set(spec.side*0.39,0,0);
    lower.userData={kind:'damper_lower',zone:`WHEEL_${spec.id}`};suspPivot.add(lower);
    const aim=new T.Group();aim.name=`DAMPER_AIM_${spec.id}`;chassisJump.add(aim);
    root.updateMatrixWorld(true);
    const top=chassisJump.worldToLocal(upper.getWorldPosition(new T.Vector3()));
    const bot=chassisJump.worldToLocal(lower.getWorldPosition(new T.Vector3()));
    const delta=bot.clone().sub(top),length=delta.length();
    aim.position.copy(top);aim.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
    const rod=new T.Group();rod.name=`DAMPER_ROD_SLIDE_${spec.id}`;rod.position.y=length;aim.add(rod);
    const seg=lod===0?12:lod===1?6:4;
    const barrelKey=`barrel_${spec.id}`,rodKey=`rod_${spec.id}`;
    const barrelColor=wd>=2?C.scorch:C.carbon,rodColor=wd>=2?C.copper:C.chrome;
    if(staticTier){
      const a=top.clone().add(new T.Vector3(0,0.56,0));
      const b=bot.clone().add(new T.Vector3(0,0.56,0));
      beam('static',a.toArray(),a.clone().addScaledVector(delta,0.34).toArray(),0.071,barrelColor,seg);
      beam('static',b.clone().addScaledVector(delta,-0.34).toArray(),b.toArray(),0.032,rodColor,seg);
    }else{
      cyl(barrelKey,0.071,0.071,0.34,[0,0.17,0],barrelColor,seg);
      cyl(barrelKey,0.083,0.083,0.045,[0,0.31,0],wd>=2?C.primer:C.titaniumLight,seg);
      cyl(barrelKey,0.079,0.079,0.055,[0,0.025,0],C.steel,seg);
      cyl(rodKey,0.032,0.032,0.34,[0,-0.17,0],rodColor,seg);
      box(rodKey,[0.12,0.07,0.14],[0,-0.015,0],wd>=2?C.primer:C.steel);
      if(lod===0){
        for(let ring=0;ring<5;ring++)cyl(barrelKey,0.078,0.078,0.015,[0,0.075+ring*0.041,0],C.slate,8);
      }
    }
    flushMesh(barrelKey,aim,`DAMPER_BARREL_${spec.id}`,mat,staticTier);
    flushMesh(rodKey,rod,`DAMPER_ROD_${spec.id}`,mat,staticTier);

    const steerPivot=new T.Group();
    steerPivot.name=`WHEEL_STEER_${spec.id}`;
    steerPivot.position.set(spec.side*0.50,0,0);
    steerPivot.userData={
      role:'steering_pivot',
      axis:'+Y',
      steerable:spec.steerable&&wd<3,
      limit_deg:[-spec.steerLimitDeg,spec.steerLimitDeg]
    };
    suspPivot.add(steerPivot);

    const spinPivot=new T.Group();
    spinPivot.name=`WHEEL_SPIN_${spec.id}`;
    spinPivot.position.set(0,0,0);
    spinPivot.userData={
      role:'axle_spin_pivot',
      axis:'+X',
      radius_m:0.48,
      functional:wd<3
    };
    steerPivot.add(spinPivot);

    const wheelKey=`wheel_${spec.id}`;
    if(staticTier){
      buildSingleWheel('static',spec,lod,wd,[spec.side*0.98,0.48,spec.z]);
    }else{
      buildSingleWheel(wheelKey,spec,lod,wd,[0,0,0]);
    }
    flushMesh(wheelKey,spinPivot,`WHEEL_${spec.id}`,mat,staticTier);
  }

  // 3. Dorsal EO/IR + LiDAR Sensor Mast
  const md=getDmg('SENSOR_MAST');
  const mastYaw=new T.Group();
  mastYaw.name='SENSOR_MAST_YAW';
  mastYaw.position.set(0,0.56,0.26);
  mastYaw.userData={role:'sensor_yaw_pivot',axis:'+Y',continuous:md<2,functional:md<3};
  chassisJump.add(mastYaw);

  const opticsPitch=new T.Group();
  opticsPitch.name='OPTICS_HEAD_PITCH';
  opticsPitch.userData={role:'sensor_pitch_pivot',axis:'+X',limit_deg:[-38,28],functional:md<3};
  mastYaw.add(opticsPitch);

  if(staticTier){
    buildSensorMast('static',lod,md,[0,1.12,0.26]);
  }else{
    buildSensorMast('mast',lod,md,[0,0,0]);
  }
  flushMesh('mast',opticsPitch,'SENSOR_MAST_HEAD',mat,staticTier);
  marker(opticsPitch,'SOCKET_SENSOR_MAST',[0,0.18,0.18],'sensor_optics',[0,0,1]);

  // 4. Eight Individually Articulated Cold-Gas Thruster Gimbals
  const gimbalVentralGroup=new T.Group();
  gimbalVentralGroup.name='THRUSTER_GIMBAL_VENTRAL';
  chassisJump.add(gimbalVentralGroup);

  const ventralClusterLookup=new T.Object3D();
  ventralClusterLookup.name='VENTRAL_THRUSTER_CLUSTER';
  ventralClusterLookup.userData={role:'lookup_only'};
  gimbalVentralGroup.add(ventralClusterLookup);

  const gimbalLateralGroup=new T.Group();
  gimbalLateralGroup.name='THRUSTER_GIMBAL_LATERAL';
  chassisJump.add(gimbalLateralGroup);

  const lateralClusterLookup=new T.Object3D();
  lateralClusterLookup.name='LATERAL_THRUSTER_CLUSTER';
  lateralClusterLookup.userData={role:'lookup_only'};
  gimbalLateralGroup.add(lateralClusterLookup);

  for(const spec of THRUSTER_SPECS){
    const td=getDmg(`NOZZLE_${spec.id}`);
    const parentGroup=spec.group==='ventral'?gimbalVentralGroup:gimbalLateralGroup;
    const gimbal=new T.Group();
    gimbal.name=`GIMBAL_${spec.id}`;
    gimbal.position.set(...spec.pos);
    gimbal.userData={
      role:'thruster_gimbal',
      id:spec.id,
      group:spec.group,
      signed_x:spec.signedX,
      damage_level:td,
      functional:td<3,
      pitch_limit_deg:spec.pitchLimitDeg,
      roll_limit_deg:spec.rollLimitDeg
    };
    parentGroup.add(gimbal);

    const tKey=`thruster_${spec.id}`;
    if(staticTier){
      buildSingleThruster('static',spec,lod,td,[spec.pos[0],spec.pos[1]+0.56,spec.pos[2]],spec.cant);
    }else{
      buildSingleThruster(tKey,spec,lod,td,[0,0,0],[0,0,0]);
    }
    const nozzleNode=flushMesh(tKey,gimbal,`THRUSTER_${spec.id}`,mat,staticTier);
    nozzleNode.rotation.set(spec.cant[0],spec.cant[1],spec.cant[2],'YXZ');

    const cz=spec.cant[2];
    const restExhaust=[+Math.sin(cz).toFixed(4),+(-Math.cos(cz)).toFixed(4),0];
    const sock=marker(nozzleNode,`SOCKET_THRUSTER_${spec.id}`,[0,-0.14,0],`cold_gas_thruster_${spec.group}`,restExhaust);
    sock.userData.exhaust_axis_local=[0,-1,0];
    sock.userData.pitch_limit_deg=spec.pitchLimitDeg;
    sock.userData.roll_limit_deg=spec.rollLimitDeg;
  }

  const plumesLookup=new T.Object3D();
  plumesLookup.name='COLD_GAS_PLUMES';
  plumesLookup.userData={role:'lookup_only',replaced_by:'thruster-fx.js'};
  chassisJump.add(plumesLookup);

  // 5. Four Live Onboard Displays (preserved across D0..D3 so bindings survive)
  buildDisplayQuad(
    'DISPLAY_SPEED_LEFT',
    chassisJump,
    [0.28,0.13],
    [-0.80,0.37,-1.872],
    [-0.42,Math.PI,0],
    speedMat,
    C.amber,
    staticTier,
    0.56
  );
  marker(chassisJump,'SOCKET_DISPLAY_SPEED_L',[-0.80,0.37,-1.872],'onboard_display_speed_left',[0,0.41,-0.91]);

  buildDisplayQuad(
    'DISPLAY_THRUST_RIGHT',
    chassisJump,
    [0.28,0.13],
    [0.80,0.37,-1.872],
    [-0.42,Math.PI,0],
    thrustMat,
    C.cyan,
    staticTier,
    0.56
  );
  marker(chassisJump,'SOCKET_DISPLAY_THRUST_R',[0.80,0.37,-1.872],'onboard_display_thrust_right',[0,0.41,-0.91]);

  buildDisplayQuad(
    'DISPLAY_GAS_RESERVE_REAR',
    chassisJump,
    [0.48,0.13],
    [0,0.11,-2.385],
    [0,Math.PI,0],
    gasMat,
    C.mint,
    staticTier,
    0.56
  );
  marker(chassisJump,'SOCKET_DISPLAY_GAS_REAR',[0,0.11,-2.385],'onboard_display_gas_reserve',[0,0,-1]);

  buildDisplayQuad(
    'DISPLAY_FDAI_TELEMETRY_PANEL',
    chassisJump,
    [0.62,0.74],
    [0,0.432,-0.88],
    [-Math.PI/2-0.07,0,0],
    fdaiMat,
    C.fdaiWhite,
    staticTier,
    0.56
  );
  marker(chassisJump,'SOCKET_DISPLAY_FDAI_REAR',[0,0.432,-0.88],'onboard_display_fdai_telemetry',[0,0.998,-0.07]);

  // D2 Cold-Gas Leak sockets on -X flank, +X flank, and rear manifold
  marker(chassisJump,'SOCKET_GAS_LEAK_NEG_X',[-0.78,0.02,0.35],'cold_gas_leak',[-0.88,0.32,0.35]);
  marker(chassisJump,'SOCKET_GAS_LEAK_POS_X',[0.78,0.02,0.35],'cold_gas_leak',[0.88,0.32,-0.35]);
  marker(chassisJump,'SOCKET_GAS_LEAK_REAR',[0.18,0.12,-1.96],'cold_gas_leak',[0.25,0.40,-0.88]);

  // 6. Static merged body for LOD2
  flushMesh('static',root,'ROVER_STATIC_BODY',mat,!staticTier);

  // Additional utility sockets
  marker(chassisJump,'SOCKET_PAYLOAD_L',[-0.78,0.16,-0.92],'modular_payload',[-1,0,0]);
  marker(chassisJump,'SOCKET_PAYLOAD_R',[0.78,0.16,-0.92],'modular_payload',[1,0,0]);
  marker(chassisJump,'SOCKET_TOW_FRONT',[0,0.02,2.32],'tow_hitch',[0,0,1]);
  marker(chassisJump,'SOCKET_TOW_REAR',[0,0.06,-2.24],'tow_hitch',[0,0,-1]);

  root.userData={
    family:'recon_rover_s',
    lod,
    damage_level:damageLevel,
    static:staticTier,
    collision_proxies:buildCollisionProxies(zoneOverrides||{},damageLevel)
  };
  return root;
}
