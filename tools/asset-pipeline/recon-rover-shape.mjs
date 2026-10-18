import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const C={
  titanium:0xb8c0c6,
  titaniumLight:0xd0d7dc,
  titaniumMid:0x8b949c,
  slate:0x59626a,
  graphite:0x2b3137,
  carbon:0x1b2024,
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
  tailRed:0xc93b3b,
  amber:0xd98a2b,
  cyan:0x38e8ff,
  mint:0x46f09a,
  fdaiWhite:0xe6eef2,
  fdaiGold:0xe8b84b
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
    // Add simplified static display plate into merged LOD2 static geometry and keep named lookup node
    box('static',[size[0],size[1],0.008],[position[0],position[1]+staticYOffset,position[2]],colorHex,rotation);
    const o=new T.Object3D();
    o.name=name;
    o.position.set(...position);
    o.rotation.set(rotation[0]||0,rotation[1]||0,rotation[2]||0,'YXZ');
    o.userData={role:'lookup_only',display:true};
    parent.add(o);
    return o;
  }
  // PlaneGeometry in Three.js has clean [0..1] UVs on TEXCOORD_0 out of the box
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
  {id:'FL',side:-1,z:1.44,steerable:true,steerLimitDeg:34},
  {id:'FR',side:1,z:1.44,steerable:true,steerLimitDeg:34},
  {id:'ML',side:-1,z:-0.42,steerable:false,steerLimitDeg:15},
  {id:'MR',side:1,z:-0.42,steerable:false,steerLimitDeg:15},
  {id:'RL',side:-1,z:-1.44,steerable:false,steerLimitDeg:15},
  {id:'RR',side:1,z:-1.44,steerable:false,steerLimitDeg:15}
];

export const THRUSTER_SPECS=[
  {id:'V_FL',group:'ventral',pos:[-0.48,-0.18,0.68],cant:[0,0,-0.08],pitchLimitDeg:[-28,28],rollLimitDeg:[-25,25]},
  {id:'V_FR',group:'ventral',pos:[0.48,-0.18,0.68],cant:[0,0,0.08],pitchLimitDeg:[-28,28],rollLimitDeg:[-25,25]},
  {id:'V_RL',group:'ventral',pos:[-0.48,-0.18,-0.78],cant:[0,0,-0.08],pitchLimitDeg:[-28,28],rollLimitDeg:[-25,25]},
  {id:'V_RR',group:'ventral',pos:[0.48,-0.18,-0.78],cant:[0,0,0.08],pitchLimitDeg:[-28,28],rollLimitDeg:[-25,25]},
  {id:'L_FL',group:'lateral',pos:[-0.80,-0.10,0.64],cant:[0,0,-0.42],pitchLimitDeg:[-35,35],rollLimitDeg:[-42,18]},
  {id:'L_FR',group:'lateral',pos:[0.80,-0.10,0.64],cant:[0,0,0.42],pitchLimitDeg:[-35,35],rollLimitDeg:[-18,42]},
  {id:'L_RL',group:'lateral',pos:[-0.80,-0.10,0.18],cant:[0,0,-0.42],pitchLimitDeg:[-35,35],rollLimitDeg:[-42,18]},
  {id:'L_RR',group:'lateral',pos:[0.80,-0.10,0.18],cant:[0,0,0.42],pitchLimitDeg:[-35,35],rollLimitDeg:[-18,42]}
];

export const ENGINE_NODES=[
  'R47X_ROVER_ROOT',
  'ROVER_CHASSIS_JUMP',
  'CHASSIS_ARMOR_BODY',
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
  'SOCKET_DISPLAY_FDAI_REAR'
];

function buildChassisBody(key,lod,yOffset=0){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?12:staticTier?6:8;
  const Y=y=>y+yOffset;

  // Core graphite structural tub & reinforced undercarriage skid spine
  box(key,[1.12,0.32,3.44],[0,Y(0.08),0.02],C.graphite);
  box(key,[0.90,0.14,3.78],[0,Y(-0.14),0.04],C.carbon);
  // Ventral armored skid plates with recessed thruster bays
  box(key,[1.02,0.06,0.88],[0,Y(-0.21),1.42],C.slate,[0.08,0,0]);
  box(key,[1.06,0.06,0.88],[0,Y(-0.22),0.02],C.slate);
  box(key,[1.00,0.06,0.92],[0,Y(-0.20),-1.42],C.slate,[-0.08,0,0]);

  // Low-slung wedge nose glacis & ceramic ballistic beak (narrowed for ±34° front steering clearance)
  box(key,[0.74,0.14,1.16],[0,Y(0.24),1.46],C.titanium,[0.20,0,0]);
  box(key,[0.68,0.12,0.72],[0,Y(0.11),2.00],C.ceramic,[0.32,0,0]);
  box(key,[1.06,0.12,0.58],[0,Y(-0.04),2.02],C.graphite,[-0.24,0,0]);
  for(const sx of [-1,1]){
    box(key,[0.30,0.12,1.04],[sx*0.46,Y(0.23),1.44],C.titaniumLight,[0.20,sx*0.08,-sx*0.18]);
    // High-clearance front wheel arch eyebrow (leaves ±34° steering & damper clearance)
    box(key,[0.34,0.07,0.60],[sx*0.80,Y(0.46),1.48],C.titaniumLight,[0.12,0,-sx*0.12]);
    box(key,[0.32,0.08,0.42],[sx*0.76,Y(0.34),1.92],C.titaniumMid,[0.38,0,-sx*0.12]);
  }

  // Front bumper, tow shackles & recessed red/amber tactical light housings
  box(key,[1.18,0.14,0.18],[0,Y(0.03),2.24],C.carbon);
  for(const sx of [-1,1]){
    box(key,[0.26,0.08,0.10],[sx*0.40,Y(0.07),2.28],C.graphite);
    box(key,[0.20,0.045,0.04],[sx*0.40,Y(0.07),2.33],C.tailRed);
    box(key,[0.07,0.16,0.14],[sx*0.22,Y(-0.02),2.31],C.steel);
  }

  // Upper overlapping titanium dorsal carapace over central COPV bay & rear deck
  box(key,[1.42,0.12,1.38],[0,Y(0.34),0.32],C.titaniumLight);
  box(key,[1.32,0.10,1.42],[0,Y(0.31),-1.12],C.titanium,[-0.07,0,0]);
  box(key,[1.12,0.08,0.74],[0,Y(0.22),-1.92],C.titaniumMid,[-0.22,0,0]);

  // Dorsal spine sensor turret plinth, hatches & recessed black NASM FDAI telemetry housing
  box(key,[0.84,0.12,1.14],[0,Y(0.42),0.28],C.slate);
  cyl(key,0.30,0.36,0.12,[0,Y(0.48),0.26],C.graphite,seg);
  // Rear dorsal black instrument panel housing (hosts DISPLAY_FDAI_TELEMETRY_PANEL)
  box(key,[0.74,0.09,0.88],[0,Y(0.38),-0.88],C.carbon,[-0.07,0,0]);
  if(!staticTier){
    // Recessed octagonal/instrument bezel rim on the rear black panel inspired by NASM Apollo FDAI panel
    box(key,[0.68,0.025,0.04],[0,Y(0.43),-0.48],C.slate,[-0.07,0,0]);
    box(key,[0.68,0.025,0.04],[0,Y(0.375),-1.28],C.slate,[-0.07,0,0]);
    box(key,[0.04,0.025,0.80],[-0.34,Y(0.402),-0.88],C.slate,[-0.07,0,0]);
    box(key,[0.04,0.025,0.80],[0.34,Y(0.402),-0.88],C.slate,[-0.07,0,0]);
  }

  // Rear modular payload bay, gas-reserve display bezel & tail light bar
  box(key,[1.16,0.28,0.52],[0,Y(0.08),-1.98],C.graphite);
  box(key,[0.70,0.22,0.46],[0,Y(0.09),-2.14],C.titaniumMid);
  // Rear panel gas-reserve bezel (hosts DISPLAY_GAS_RESERVE_REAR at z = -2.385)
  box(key,[0.54,0.17,0.04],[0,Y(0.11),-2.36],C.carbon);

  for(const sx of [-1,1]){
    box(key,[0.22,0.06,0.06],[sx*0.44,Y(0.15),-2.23],C.tailRed);
    box(key,[0.18,0.045,0.06],[sx*0.44,Y(0.06),-2.23],C.amber);
    // High-clearance rear tandem fender canopy
    box(key,[0.38,0.08,1.76],[sx*0.80,Y(0.42),-0.92],C.titanium,[0,0,-sx*0.12]);
    // Rear wheel cover angled telemetry bezel (left = orange speed, right = cyan vertical thrust)
    box(key,[0.34,0.18,0.10],[sx*0.80,Y(0.36),-1.82],C.carbon,[-0.42,0,0]);
    // Recessed central flank structural bulkhead behind COPV tanks
    box(key,[0.16,0.40,0.92],[sx*0.60,Y(0.10),0.41],C.slate);
    // Recessed side viewport/sensor slots matching concept elevation
    box(key,[0.08,0.09,0.32],[sx*0.69,Y(0.31),0.56],C.carbon);
    box(key,[0.08,0.09,0.28],[sx*0.69,Y(0.31),0.14],C.carbon);
  }

  // Twin cylindrical high-pressure COPV cold-gas tanks per flank (4 total) + plumbing
  for(const sx of [-1,1]){
    for(const ty of [0.17,0.01]){
      const tx=sx*0.74,tz=0.41;
      cyl(key,0.078,0.078,0.62,[tx,Y(ty),tz],C.tankBody,seg,[Math.PI/2,0,0]);
      if(detailed){
        cyl(key,0.046,0.078,0.07,[tx,Y(ty),tz+0.34],C.chrome,seg,[Math.PI/2,0,0]);
        cyl(key,0.078,0.046,0.07,[tx,Y(ty),tz-0.34],C.chrome,seg,[Math.PI/2,0,0]);
      }
      box(key,[0.17,0.17,0.045],[tx,Y(ty),tz+0.16],C.tankBand);
      box(key,[0.17,0.17,0.045],[tx,Y(ty),tz-0.16],C.tankBand);
    }
    if(!staticTier){
      beam(key,[sx*0.74,Y(0.08),0.64],[sx*0.52,Y(-0.16),0.68],0.022,C.brass,6);
      beam(key,[sx*0.74,Y(0.08),0.18],[sx*0.52,Y(-0.16),-0.76],0.022,C.brass,6);
      for(const vz of [0.68,-0.78]){
        cyl(key,0.16,0.18,0.08,[sx*0.48,Y(-0.18),vz],C.carbon,seg);
      }
    }
  }

  if(detailed){
    for(const sx of [-1,1]){
      box(key,[0.14,0.16,0.48],[sx*0.84,Y(0.16),-0.92],C.titaniumMid);
      cyl(key,0.012,0.018,0.54,[sx*0.42,Y(0.64),-0.38],C.steel,6);
      cyl(key,0.010,0.015,0.42,[sx*0.48,Y(0.58),-1.12],C.steel,6);
    }
  }
}

// Builds a single wheel station's articulated wishbone + twin hydraulic damper linkage
// In local space of SUSP_PIVOT_<ID> at [sx*0.48, -0.08, az], or world-offset for static LOD2
function buildSingleSuspensionArm(key,spec,lod,origin=[0,0,0]){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?8:staticTier?4:6;
  const sx=spec.side;
  const [ox,oy,oz]=origin;
  const dzIn=spec.id.startsWith('F')?-0.38:spec.id.startsWith('M')?0.18:0.32;

  // Inner chassis clevis barrel (overlaps into chassis side socket so articulation never leaves a gap)
  cyl(key,0.058,0.058,0.22,[ox-sx*0.04,oy,oz+dzIn*0.5],C.slate,seg,[Math.PI/2,0,0]);
  // Heavy lower trailing wishbone limbs converging on outer hub carrier [sx*0.38, 0, 0]
  beam(key,[ox-sx*0.04,oy-0.02,oz+dzIn],[ox+sx*0.38,oy-0.01,oz],0.052,C.titaniumMid,seg);
  beam(key,[ox-sx*0.04,oy-0.02,oz],[ox+sx*0.38,oy-0.01,oz],0.046,C.slate,seg);
  // Upper control link
  beam(key,[ox-sx*0.02,oy+0.12,oz+dzIn*0.6],[ox+sx*0.36,oy+0.08,oz],0.036,C.titaniumLight,seg);

  // Outer kingpin yoke / steering knuckle carrier bracket (positioned at sx*0.38 so tire clears ±34° steering)
  box(key,[0.14,0.24,0.20],[ox+sx*0.38,oy+0.02,oz],C.graphite);

  // Twin oversized exposed hydraulic shock absorbers angled into the open wheel-well archway
  for(const sz of [-0.09,0.09]){
    const top=[ox+sx*0.10,oy+0.36,oz+dzIn*0.45+sz];
    const mid=[ox+sx*0.23,oy+0.19,oz+dzIn*0.22+sz];
    const bot=[ox+sx*0.35,oy+0.04,oz+sz*0.85];
    beam(key,top,mid,0.046,C.carbon,seg);
    beam(key,mid,bot,0.028,C.chrome,seg);
    if(detailed){
      cyl(key,0.056,0.056,0.11,mid,C.titaniumLight,seg,[0,0,sx*0.42]);
    }
  }
}

// Builds a single rugged chevron-treaded wheel centered at origin (for WHEEL_SPIN_<ID> at [0,0,0])
function buildSingleWheel(key,spec,lod,origin=[0,0,0]){
  const detailed=lod===0,staticTier=lod===2;
  const radialSeg=detailed?18:staticTier?6:10;
  const treadCount=detailed?16:staticTier?4:8;
  const R=0.48;
  const W=0.36;
  const sx=spec.side;
  const [wx,wy,wz]=origin;

  // Main rugged pneumatic/airless tire carcass
  cyl(key,R*0.95,R*0.95,W,[wx,wy,wz],C.rubber,radialSeg,[0,0,Math.PI/2]);
  // Reinforced titanium beadlock wheel rim & planetary gear hub
  cyl(key,R*0.58,R*0.58,W+0.04,[wx,wy,wz],C.titaniumMid,radialSeg,[0,0,Math.PI/2]);
  if(!staticTier){
    cyl(key,R*0.36,R*0.42,W+0.08,[wx,wy,wz],C.graphite,radialSeg,[0,0,Math.PI/2]);
    cyl(key,R*0.76,R*0.92,0.05,[wx+sx*(W*0.5+0.01),wy,wz],C.tread,radialSeg,[0,0,Math.PI/2]);
    cyl(key,R*0.92,R*0.76,0.05,[wx-sx*(W*0.5+0.01),wy,wz],C.tread,radialSeg,[0,0,Math.PI/2]);
    cyl(key,R*0.18,R*0.18,W+0.11,[wx,wy,wz],C.steel,8,[0,0,Math.PI/2]);
  }
  for(let t=0;t<treadCount;t++){
    const ang=(t/treadCount)*Math.PI*2;
    const ty=wy+Math.cos(ang)*(R-0.025);
    const tz=wz+Math.sin(ang)*(R-0.025);
    box(key,[W*0.94,0.055,0.11],[wx,ty,tz],C.tread,[-ang,0,0]);
  }
  if(detailed){
    for(let s=0;s<6;s++){
      const ang=(s/6)*Math.PI*2;
      const sy=wy+Math.cos(ang)*(R*0.44);
      const sz=wz+Math.sin(ang)*(R*0.44);
      box(key,[0.04,0.14,0.055],[wx+sx*(W*0.5+0.02),sy,sz],C.titaniumLight,[-ang,0,0]);
    }
  }
}

function buildSensorMast(key,lod,pos=[0,0,0]){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?12:8;
  const [ox,oy,oz]=pos;

  // Neck azimuth pedestal & elevation yoke (cleared for -38° to +28° collision-free pitch)
  cyl(key,0.10,0.13,0.18,[ox,oy-0.08,oz],C.graphite,seg);
  box(key,[0.22,0.14,0.16],[ox,oy+0.02,oz],C.slate);

  // Dual EO/IR + LiDAR armored sensor housing matching concept callout
  box(key,[0.44,0.22,0.28],[ox,oy+0.14,oz+0.02],C.titaniumLight);
  box(key,[0.46,0.06,0.30],[ox,oy+0.26,oz+0.02],C.titaniumMid);

  for(const [lx,r] of [[-0.11,0.075],[0.11,0.068]]){
    cyl(key,r,r,0.08,[ox+lx,oy+0.14,oz+0.16],C.carbon,seg,[Math.PI/2,0,0]);
    cyl(key,r*0.76,r*0.76,0.04,[ox+lx,oy+0.14,oz+0.19],C.opticGlass,seg,[Math.PI/2,0,0]);
  }
  cyl(key,0.08,0.09,0.07,[ox,oy+0.31,oz],C.graphite,seg);
  if(!staticTier){
    cyl(key,0.012,0.020,0.44,[ox-0.24,oy+0.32,oz-0.06],C.steel,6);
  }
}

// Builds a single multi-axis gimbaled cold-gas thruster centered at [0,0,0] inside its THRUSTER_<ID> mesh
// Exhaust axis is local -Y ([0,-1,0]), nozzle exit lip is at [0,-0.14,0]
function buildSingleThruster(key,spec,lod,origin=[0,0,0],rot=[0,0,0]){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?10:6;
  const [ox,oy,oz]=origin;
  const isLateral=spec.group==='lateral';
  const sx=spec.pos[0]<0?-1:1;

  // Multi-axis gimbal cardan ring & servo mount
  box(key,[0.18,0.08,0.18],[ox,oy+0.03,oz],C.slate,rot);
  // Cold-gas de Laval expansion bell nozzle (throat + flared skirt along local -Y)
  cyl(key,0.046,0.105,0.17,[ox,oy-0.06,oz],C.nozzleOuter,seg,rot);
  if(!staticTier){
    cyl(key,0.034,0.088,0.13,[ox,oy-0.07,oz],C.nozzleInner,seg,rot);
    box(key,[0.030,0.12,0.030],[ox-sx*0.06,oy+0.01,oz+0.05],C.chrome,rot);
    if(isLateral){
      box(key,[0.14,0.11,0.19],[ox-sx*0.04,oy+0.06,oz],C.titaniumMid,rot);
    }
  }
  if(detailed){
    cyl(key,0.11,0.11,0.024,[ox,oy-0.13,oz],C.chrome,seg,rot);
  }
}

export function buildReconRover(lod=0){
  pieces.clear();
  const staticTier=lod===2;
  const mat=armorMaterial();
  const speedMat=displayMaterial('DISPLAY_SPEED_ORANGE_MAT',C.amber,0.9);
  const thrustMat=displayMaterial('DISPLAY_THRUST_CYAN_MAT',C.cyan,0.9);
  const gasMat=displayMaterial('DISPLAY_GAS_RESERVE_MAT',C.mint,0.85);
  const fdaiMat=displayMaterial('DISPLAY_FDAI_TELEMETRY_MAT',C.fdaiWhite,0.75);

  const root=new T.Group();
  root.name='R47X_ROVER_ROOT';

  const chassisJump=new T.Group();
  chassisJump.name='ROVER_CHASSIS_JUMP';
  chassisJump.position.set(0,0.56,0);
  root.add(chassisJump);

  // Preserve legacy bogie & wheel group containers for backward compatibility
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

  // 1. Chassis armor body
  if(staticTier){
    buildChassisBody('static',lod,0.56);
  }else{
    buildChassisBody('chassis',lod,0);
  }
  flushMesh('chassis',chassisJump,'CHASSIS_ARMOR_BODY',mat,staticTier);

  // 2. Per-wheel suspension pivot -> connected suspension arm + steering pivot (+Y) -> axle spin pivot (+X) -> wheel mesh
  for(const spec of WHEEL_SPECS){
    const parentBogie=spec.side<0?bogieL:bogieR;
    const suspPivot=new T.Group();
    suspPivot.name=`SUSP_PIVOT_${spec.id}`;
    suspPivot.position.set(spec.side*0.48,-0.08,spec.z);
    suspPivot.userData={
      role:'suspension_pivot',
      wheel:spec.id,
      travel_y_limit_m:[-0.12,0.14],
      swing_z_limit_deg:[-16,14]
    };
    parentBogie.add(suspPivot);

    const armKey=`susp_${spec.id}`;
    if(staticTier){
      buildSingleSuspensionArm('static',spec,lod,[spec.side*0.48,0.48,spec.z]);
    }else{
      buildSingleSuspensionArm(armKey,spec,lod,[0,0,0]);
    }
    flushMesh(armKey,suspPivot,`SUSP_ARM_${spec.id}`,mat,staticTier);

    const steerPivot=new T.Group();
    steerPivot.name=`WHEEL_STEER_${spec.id}`;
    steerPivot.position.set(spec.side*0.50,0,0);
    steerPivot.userData={
      role:'steering_pivot',
      axis:'+Y',
      steerable:spec.steerable,
      limit_deg:[-spec.steerLimitDeg,spec.steerLimitDeg],
      sign_convention:'+Y rad = steer left (CCW from top), -Y rad = steer right (CW from top)'
    };
    suspPivot.add(steerPivot);

    const spinPivot=new T.Group();
    spinPivot.name=`WHEEL_SPIN_${spec.id}`;
    spinPivot.position.set(0,0,0);
    spinPivot.userData={
      role:'axle_spin_pivot',
      axis:'+X',
      radius_m:0.48,
      sign_convention:'+X rad = forward roll (+Z travel), -X rad = reverse roll'
    };
    steerPivot.add(spinPivot);

    const wheelKey=`wheel_${spec.id}`;
    if(staticTier){
      buildSingleWheel('static',spec,lod,[spec.side*0.98,0.48,spec.z]);
    }else{
      buildSingleWheel(wheelKey,spec,lod,[0,0,0]);
    }
    flushMesh(wheelKey,spinPivot,`WHEEL_${spec.id}`,mat,staticTier);
  }

  // 3. Dorsal EO/IR + LiDAR sensor mast (continuous 360° yaw +Y, independent pitch +X)
  const mastYaw=new T.Group();
  mastYaw.name='SENSOR_MAST_YAW';
  mastYaw.position.set(0,0.56,0.26);
  mastYaw.userData={role:'sensor_yaw_pivot',axis:'+Y',limit_deg:[-180,180],continuous:true};
  chassisJump.add(mastYaw);

  const opticsPitch=new T.Group();
  opticsPitch.name='OPTICS_HEAD_PITCH';
  opticsPitch.userData={
    role:'sensor_pitch_pivot',
    axis:'+X',
    limit_deg:[-38,28],
    sign_convention:'-X rad = pitch nose up, +X rad = pitch nose down'
  };
  mastYaw.add(opticsPitch);

  if(staticTier){
    buildSensorMast('static',lod,[0,1.12,0.26]);
  }else{
    buildSensorMast('mast',lod,[0,0,0]);
  }
  flushMesh('mast',opticsPitch,'SENSOR_MAST_HEAD',mat,staticTier);
  marker(opticsPitch,'SOCKET_SENSOR_MAST',[0,0.18,0.18],'sensor_optics',[0,0,1]);

  // 4. Eight individually articulated cold-gas thruster gimbals & parented nozzle exit sockets
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
    const parentGroup=spec.group==='ventral'?gimbalVentralGroup:gimbalLateralGroup;
    const gimbal=new T.Group();
    gimbal.name=`GIMBAL_${spec.id}`;
    gimbal.position.set(...spec.pos);
    gimbal.userData={
      role:'thruster_gimbal',
      id:spec.id,
      group:spec.group,
      pitch_axis:'+X',
      roll_axis:'+Z',
      pitch_limit_deg:spec.pitchLimitDeg,
      roll_limit_deg:spec.rollLimitDeg
    };
    parentGroup.add(gimbal);

    const tKey=`thruster_${spec.id}`;
    if(staticTier){
      buildSingleThruster('static',spec,lod,[spec.pos[0],spec.pos[1]+0.56,spec.pos[2]],spec.cant);
    }else{
      buildSingleThruster(tKey,spec,lod,[0,0,0],[0,0,0]);
    }
    const nozzleNode=flushMesh(tKey,gimbal,`THRUSTER_${spec.id}`,mat,staticTier);
    nozzleNode.rotation.set(spec.cant[0],spec.cant[1],spec.cant[2],'YXZ');

    // Compute world-equivalent rest exhaust normal from cant around Z
    const cz=spec.cant[2];
    const restExhaust=[
      +Math.sin(cz).toFixed(4),
      +(-Math.cos(cz)).toFixed(4),
      0
    ];
    const sock=marker(nozzleNode,`SOCKET_THRUSTER_${spec.id}`,[0,-0.14,0],`cold_gas_thruster_${spec.group}`,restExhaust);
    sock.userData.exhaust_axis_local=[0,-1,0];
    sock.userData.pitch_limit_deg=spec.pitchLimitDeg;
    sock.userData.roll_limit_deg=spec.rollLimitDeg;
  }

  // Preserve COLD_GAS_PLUMES node for backward lookup compatibility (runtime particles now use thruster-fx.js)
  const plumesLookup=new T.Object3D();
  plumesLookup.name='COLD_GAS_PLUMES';
  plumesLookup.userData={role:'lookup_only',replaced_by:'thruster-fx.js'};
  chassisJump.add(plumesLookup);

  // 5. Onboard displays (UV-mapped, separately addressable emissive surfaces + sockets)
  // Left rear wheel cover (viewed from behind): orange speed display
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

  // Right rear wheel cover (viewed from behind): cyan vertical thrust display
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

  // Rear panel: COPV nitrogen gas reserve display
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

  // Rear black dorsal panel: NASM FDAI codified attitude / yaw-pitch-roll rate / height-level instrument cluster
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

  // 6. Static merged body for LOD2 (and empty lookup node in LOD0/LOD1 for exact node parity)
  flushMesh('static',root,'ROVER_STATIC_BODY',mat,!staticTier);

  // Additional utility sockets
  marker(chassisJump,'SOCKET_PAYLOAD_L',[-0.78,0.16,-0.92],'modular_payload',[-1,0,0]);
  marker(chassisJump,'SOCKET_PAYLOAD_R',[0.78,0.16,-0.92],'modular_payload',[1,0,0]);
  marker(chassisJump,'SOCKET_TOW_FRONT',[0,0.02,2.32],'tow_hitch',[0,0,1]);
  marker(chassisJump,'SOCKET_TOW_REAR',[0,0.06,-2.24],'tow_hitch',[0,0,-1]);

  root.userData={
    family:'recon_rover',
    lod,
    damage_level:0,
    static:staticTier
  };
  return root;
}
