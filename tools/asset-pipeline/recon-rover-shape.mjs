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
  plumeCore:0xd8f6ff,
  plumeEdge:0x7fd8f5
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

function plumeMaterial(){
  return new T.MeshStandardMaterial({
    name:'COLD_GAS_PLUME_MAT',
    vertexColors:true,
    roughness:0.18,
    metalness:0.05,
    transparent:true,
    opacity:0.38,
    depthWrite:false,
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

function marker(parent,name,p,kind,normal=[0,0,1]){
  const o=new T.Object3D();
  o.name=name;
  o.position.set(...p);
  o.userData={role:'socket',kind,normal};
  parent.add(o);
  return o;
}

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
  'SENSOR_MAST_YAW',
  'OPTICS_HEAD_PITCH',
  'SENSOR_MAST_HEAD',
  'THRUSTER_GIMBAL_VENTRAL',
  'VENTRAL_THRUSTER_CLUSTER',
  'THRUSTER_GIMBAL_LATERAL',
  'LATERAL_THRUSTER_CLUSTER',
  'COLD_GAS_PLUMES',
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
  'SOCKET_THRUSTER_L_RR'
];

// Axle longitudinal positions in ROVER_CHASSIS_JUMP local space (m)
// Leading front axle + central COPV/thruster bay + tandem middle/rear axles
const AXLE_Z=[1.44,-0.42,-1.44];

// 4 Recessed Ventral (Bottom) Gimbaled Cold-Gas Lift Thrusters
const VENTRAL_NOZZLES=[
  [-0.48,-0.20,0.68,0,0,-0.08],
  [0.48,-0.20,0.68,0,0,0.08],
  [-0.48,-0.20,-0.78,0,0,-0.08],
  [0.48,-0.20,-0.78,0,0,0.08]
];

// 4 Lateral (Flank) Gimbaled Cold-Gas Thrusters positioned cleanly inside the central flank bay below the COPV tanks
const LATERAL_NOZZLES=[
  [-0.80,-0.12,0.64,0,0,-0.42],
  [0.80,-0.12,0.64,0,0,0.42],
  [-0.80,-0.12,0.18,0,0,-0.42],
  [0.80,-0.12,0.18,0,0,0.42]
];

function buildChassisBody(key,lod,yOffset=0){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?12:staticTier?6:8;
  const Y=y=>y+yOffset;

  // Core graphite structural tub & reinforced undercarriage skid spine
  box(key,[1.16,0.32,3.44],[0,Y(0.08),0.02],C.graphite);
  box(key,[0.92,0.14,3.78],[0,Y(-0.14),0.04],C.carbon);
  // Ventral armored skid plates with recessed thruster bays
  box(key,[1.04,0.06,0.88],[0,Y(-0.21),1.42],C.slate,[0.08,0,0]);
  box(key,[1.08,0.06,0.88],[0,Y(-0.22),0.02],C.slate);
  box(key,[1.02,0.06,0.92],[0,Y(-0.20),-1.42],C.slate,[-0.08,0,0]);

  // Low-slung wedge nose glacis & ceramic ballistic beak with recessed central channel
  box(key,[0.74,0.14,1.16],[0,Y(0.24),1.46],C.titanium,[0.20,0,0]);
  box(key,[0.68,0.12,0.72],[0,Y(0.11),2.00],C.ceramic,[0.32,0,0]);
  box(key,[1.14,0.12,0.58],[0,Y(-0.04),2.02],C.graphite,[-0.24,0,0]);
  // Angled cheek armor plates flanking the nose
  for(const sx of [-1,1]){
    box(key,[0.32,0.12,1.06],[sx*0.48,Y(0.23),1.44],C.titaniumLight,[0.20,sx*0.08,-sx*0.18]);
    // High-clearance front wheel arch eyebrow (leaves suspension open behind wheel)
    box(key,[0.36,0.07,0.62],[sx*0.80,Y(0.44),1.48],C.titaniumLight,[0.12,0,-sx*0.12]);
    box(key,[0.34,0.08,0.44],[sx*0.76,Y(0.32),1.92],C.titaniumMid,[0.38,0,-sx*0.12]);
  }

  // Front bumper, tow shackles & recessed red/amber tactical light housings
  box(key,[1.24,0.14,0.18],[0,Y(0.03),2.24],C.carbon);
  for(const sx of [-1,1]){
    box(key,[0.26,0.08,0.10],[sx*0.42,Y(0.07),2.28],C.graphite);
    box(key,[0.20,0.045,0.04],[sx*0.42,Y(0.07),2.33],C.tailRed);
    box(key,[0.07,0.16,0.14],[sx*0.22,Y(-0.02),2.31],C.steel);
  }

  // Upper overlapping titanium dorsal carapace over central COPV bay & rear deck
  box(key,[1.42,0.12,1.38],[0,Y(0.34),0.32],C.titaniumLight);
  box(key,[1.32,0.10,1.42],[0,Y(0.31),-1.12],C.titanium,[-0.07,0,0]);
  box(key,[1.12,0.08,0.74],[0,Y(0.22),-1.92],C.titaniumMid,[-0.22,0,0]);

  // Dorsal spine sensor turret plinth, hatches & cooling louvers
  box(key,[0.84,0.12,1.14],[0,Y(0.42),0.28],C.slate);
  cyl(key,0.30,0.36,0.12,[0,Y(0.48),0.26],C.graphite,seg);
  box(key,[0.72,0.09,0.86],[0,Y(0.38),-0.88],C.carbon,[-0.06,0,0]);

  // Rear modular payload bay, twin extraction rails & tail light bar
  box(key,[1.16,0.28,0.52],[0,Y(0.08),-1.98],C.graphite);
  box(key,[0.70,0.22,0.46],[0,Y(0.09),-2.14],C.titaniumMid);
  for(const sx of [-1,1]){
    box(key,[0.24,0.07,0.06],[sx*0.44,Y(0.14),-2.23],C.tailRed);
    box(key,[0.18,0.05,0.06],[sx*0.44,Y(0.05),-2.23],C.amber);
    // High-clearance rear tandem fender canopy
    box(key,[0.38,0.08,1.76],[sx*0.80,Y(0.42),-0.92],C.titanium,[0,0,-sx*0.12]);
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
      if(!staticTier){
        // Domed tank end caps
        cyl(key,0.046,0.078,0.07,[tx,Y(ty),tz+0.34],C.chrome,seg,[Math.PI/2,0,0]);
        cyl(key,0.078,0.046,0.07,[tx,Y(ty),tz-0.34],C.chrome,seg,[Math.PI/2,0,0]);
      }
      // Clamping straps
      box(key,[0.17,0.17,0.045],[tx,Y(ty),tz+0.16],C.tankBand);
      box(key,[0.17,0.17,0.045],[tx,Y(ty),tz-0.16],C.tankBand);
    }
    if(!staticTier){
      // High-pressure manifold feed lines from COPV tanks to ventral & lateral thrusters
      beam(key,[sx*0.74,Y(0.08),0.64],[sx*0.52,Y(-0.16),0.68],0.022,C.brass,6);
      beam(key,[sx*0.74,Y(0.08),0.18],[sx*0.52,Y(-0.16),-0.76],0.022,C.brass,6);
      // Recessed undercarriage thruster bay bezels
      for(const vz of [0.68,-0.78]){
        cyl(key,0.16,0.18,0.08,[sx*0.48,Y(-0.18),vz],C.carbon,seg);
      }
    }
  }

  if(detailed){
    // Extra panel seams, tie-down lugs, dorsal antennas & modular side cargo pods for LOD0
    for(const sx of [-1,1]){
      box(key,[0.14,0.16,0.48],[sx*0.84,Y(0.16),-0.92],C.titaniumMid);
      cyl(key,0.012,0.018,0.54,[sx*0.42,Y(0.64),-0.38],C.steel,6);
      cyl(key,0.010,0.015,0.42,[sx*0.48,Y(0.58),-1.12],C.steel,6);
      for(let i=0;i<4;i++){
        box(key,[0.26,0.03,0.08],[sx*0.28,Y(0.43),-0.64-i*0.16],C.slate);
      }
    }
  }
}

function buildSuspensionSide(key,sideSign,lod,yOffset=0){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?8:staticTier?4:6;
  const Y=y=>y+yOffset;

  for(let i=0;i<AXLE_Z.length;i++){
    const az=AXLE_Z[i];
    const chassisZ=i===0?0.88:i===1?-0.18:-0.96;
    const innerX=sideSign*0.48;
    const outerX=sideSign*0.86;

    // Heavy lower wishbone trailing arm & upper control link clearly visible in wheel arches
    beam(key,[innerX,Y(-0.08),chassisZ],[outerX,Y(-0.08),az],0.058,C.titaniumMid,seg);
    beam(key,[innerX,Y(0.08),chassisZ*0.92+az*0.08],[outerX*0.95,Y(0.04),az],0.040,C.slate,seg);

    // Steering knuckle & planetary hub carrier bracket
    box(key,[0.18,0.24,0.24],[outerX,Y(-0.06),az],C.graphite);

    // Twin oversized exposed hydraulic shock absorbers angled into the open archways
    for(const dz of [-0.10,0.10]){
      const top=[sideSign*0.64,Y(0.30),chassisZ+dz*0.85];
      const mid=[sideSign*0.76,Y(0.12),(chassisZ+az)*0.5+dz];
      const bot=[sideSign*0.84,Y(-0.04),az+dz*0.9];
      // Upper damper barrel
      beam(key,top,mid,0.048,C.carbon,seg);
      // Chrome hydraulic piston rod
      beam(key,mid,bot,0.030,C.chrome,seg);
      if(detailed){
        // Coil-over spring collar
        cyl(key,0.058,0.058,0.12,mid,C.titaniumLight,seg,[0,0,sideSign*0.42]);
      }
    }
    if(detailed){
      // Hydraulic pivot clevis pins
      cyl(key,0.048,0.048,0.20,[innerX+sideSign*0.08,Y(-0.08),chassisZ],C.chrome,8,[0,0,Math.PI/2]);
    }
  }
}

function buildWheelSide(key,sideSign,lod,yOffset=0){
  const detailed=lod===0,staticTier=lod===2;
  const radialSeg=detailed?18:staticTier?6:10;
  const treadCount=detailed?16:staticTier?4:8;
  const R=0.48;
  const W=0.36;
  const wx=sideSign*0.98;
  const wy=-0.08+yOffset; // Bottom of wheel is at wy - 0.48 = -0.56 in chassis space -> 0.00 m world Y

  for(const az of AXLE_Z){
    // Main rugged pneumatic/airless tire carcass
    cyl(key,R*0.95,R*0.95,W,[wx,wy,az],C.rubber,radialSeg,[0,0,Math.PI/2]);
    // Reinforced titanium beadlock wheel rim & planetary gear hub
    cyl(key,R*0.58,R*0.58,W+0.04,[wx,wy,az],C.titaniumMid,radialSeg,[0,0,Math.PI/2]);
    if(!staticTier){
      cyl(key,R*0.36,R*0.42,W+0.08,[wx,wy,az],C.graphite,radialSeg,[0,0,Math.PI/2]);
      // Sidewall armor bevels & hub cap
      cyl(key,R*0.76,R*0.92,0.05,[wx+sideSign*(W*0.5+0.01),wy,az],C.tread,radialSeg,[0,0,Math.PI/2]);
      cyl(key,R*0.92,R*0.76,0.05,[wx-sideSign*(W*0.5+0.01),wy,az],C.tread,radialSeg,[0,0,Math.PI/2]);
      cyl(key,R*0.18,R*0.18,W+0.11,[wx,wy,az],C.steel,8,[0,0,Math.PI/2]);
    }

    // Aggressive off-road chevron tread lugs around circumference
    for(let t=0;t<treadCount;t++){
      const ang=(t/treadCount)*Math.PI*2;
      const ty=wy+Math.cos(ang)*(R-0.025);
      const tz=az+Math.sin(ang)*(R-0.025);
      box(key,[W*0.94,0.055,0.11],[wx,ty,tz],C.tread,[-ang,0,0]);
    }

    if(detailed){
      // 6 radial hub spokes on outboard face
      for(let s=0;s<6;s++){
        const ang=(s/6)*Math.PI*2;
        const sy=wy+Math.cos(ang)*(R*0.44);
        const sz=az+Math.sin(ang)*(R*0.44);
        box(key,[0.04,0.14,0.055],[wx+sideSign*(W*0.5+0.02),sy,sz],C.titaniumLight,[-ang,0,0]);
      }
    }
  }
}

function buildSensorMast(key,lod,pos=[0,0,0]){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?12:8;
  const [ox,oy,oz]=pos;

  // Neck azimuth pedestal & elevation yoke
  cyl(key,0.11,0.14,0.18,[ox,oy-0.08,oz],C.graphite,seg);
  box(key,[0.24,0.14,0.18],[ox,oy+0.02,oz],C.slate);

  // Dual EO/IR + LiDAR armored sensor housing matching concept callout
  box(key,[0.44,0.22,0.28],[ox,oy+0.14,oz+0.02],C.titaniumLight);
  box(key,[0.46,0.06,0.30],[ox,oy+0.26,oz+0.02],C.titaniumMid);

  // Left wide-aperture thermal IR lens & right optical/LiDAR objective
  for(const [lx,r] of [[-0.11,0.075],[0.11,0.068]]){
    cyl(key,r,r,0.08,[ox+lx,oy+0.14,oz+0.16],C.carbon,seg,[Math.PI/2,0,0]);
    cyl(key,r*0.76,r*0.76,0.04,[ox+lx,oy+0.14,oz+0.19],C.opticGlass,seg,[Math.PI/2,0,0]);
  }
  // Top spinning LiDAR puck & whip telemetry antenna
  cyl(key,0.08,0.09,0.07,[ox,oy+0.31,oz],C.graphite,seg);
  if(!staticTier){
    cyl(key,0.012,0.020,0.44,[ox-0.24,oy+0.32,oz-0.06],C.steel,6);
  }
}

function buildThrusterCluster(key,nozzleList,lod,yOffset=0,isLateral=false){
  const detailed=lod===0,staticTier=lod===2;
  const seg=detailed?10:6;
  const Y=y=>y+yOffset;

  for(const [nx,ny,nz,rx,ry,rz] of nozzleList){
    // Multi-axis gimbal cardan ring & servo mount
    box(key,[0.18,0.09,0.18],[nx,Y(ny+0.05),nz],C.slate,[rx,ry,rz]);
    // Cold-gas de Laval expansion bell nozzle (throat + flared skirt)
    cyl(key,0.046,0.105,0.17,[nx,Y(ny-0.05),nz],C.nozzleOuter,seg,[rx,ry,rz]);
    if(!staticTier){
      cyl(key,0.034,0.088,0.13,[nx,Y(ny-0.06),nz],C.nozzleInner,seg,[rx,ry,rz]);
      // Dual gimbal servo actuator struts
      const sx=nx<0?-1:1;
      box(key,[0.032,0.13,0.032],[nx-sx*0.06,Y(ny+0.02),nz+0.05],C.chrome,[rx+0.2,ry,rz]);
      if(isLateral){
        // Armored flank gimbal collar bracket below COPV tanks
        box(key,[0.15,0.12,0.20],[nx-sx*0.05,Y(ny+0.07),nz],C.titaniumMid,[0,0,sx*0.18]);
      }
    }
    if(detailed){
      // Nozzle reinforcing lip & cryo feed valve
      cyl(key,0.11,0.11,0.025,[nx,Y(ny-0.12),nz],C.chrome,seg,[rx,ry,rz]);
    }
  }
}

function buildColdGasPlumes(key,lod){
  const seg=lod===0?10:8;
  const all=[...VENTRAL_NOZZLES,...LATERAL_NOZZLES];
  for(const [nx,ny,nz,rx,ry,rz] of all){
    // Outer expansion cone + bright core jet
    const dx=Math.sin(rz)*0.22;
    const dy=-Math.cos(rz)*0.22;
    cyl(key,0.042,0.16,0.38,[nx+dx,ny-0.07+dy,nz],C.plumeEdge,seg,[rx,ry,rz]);
    cyl(key,0.022,0.08,0.25,[nx+dx*0.65,ny-0.07+dy*0.65,nz],C.plumeCore,seg,[rx,ry,rz]);
  }
}

export function buildReconRover(lod=0){
  pieces.clear();
  const staticTier=lod===2;
  const mat=armorMaterial();
  const plumeMat=plumeMaterial();

  const root=new T.Group();
  root.name='R47X_ROVER_ROOT';

  const chassisJump=new T.Group();
  chassisJump.name='ROVER_CHASSIS_JUMP';
  chassisJump.position.set(0,0.56,0);
  root.add(chassisJump);

  const bogieL=new T.Group();
  bogieL.name='SUSPENSION_BOGIE_L';
  chassisJump.add(bogieL);

  const bogieR=new T.Group();
  bogieR.name='SUSPENSION_BOGIE_R';
  chassisJump.add(bogieR);

  const wheelDriveL=new T.Group();
  wheelDriveL.name='WHEEL_DRIVE_L';
  chassisJump.add(wheelDriveL);

  const wheelDriveR=new T.Group();
  wheelDriveR.name='WHEEL_DRIVE_R';
  chassisJump.add(wheelDriveR);

  const mastYaw=new T.Group();
  mastYaw.name='SENSOR_MAST_YAW';
  mastYaw.position.set(0,0.56,0.26);
  chassisJump.add(mastYaw);

  const opticsPitch=new T.Group();
  opticsPitch.name='OPTICS_HEAD_PITCH';
  mastYaw.add(opticsPitch);

  const gimbalVentral=new T.Group();
  gimbalVentral.name='THRUSTER_GIMBAL_VENTRAL';
  chassisJump.add(gimbalVentral);

  const gimbalLateral=new T.Group();
  gimbalLateral.name='THRUSTER_GIMBAL_LATERAL';
  chassisJump.add(gimbalLateral);

  if(staticTier){
    // Merge all components in world-equivalent rest pose into single draw call ROVER_STATIC_BODY
    buildChassisBody('static',lod,0.56);
    buildSuspensionSide('static',-1,lod,0.56);
    buildSuspensionSide('static',1,lod,0.56);
    buildWheelSide('static',-1,lod,0.56);
    buildWheelSide('static',1,lod,0.56);
    buildSensorMast('static',lod,[0,1.12,0.26]);
    buildThrusterCluster('static',VENTRAL_NOZZLES,lod,0.56,false);
    buildThrusterCluster('static',LATERAL_NOZZLES,lod,0.56,true);
  }else{
    buildChassisBody('chassis',lod,0);
    buildSuspensionSide('suspL',-1,lod,0);
    buildSuspensionSide('suspR',1,lod,0);
    buildWheelSide('wheelL',-1,lod,0);
    buildWheelSide('wheelR',1,lod,0);
    buildSensorMast('mast',lod,[0,0,0]);
    buildThrusterCluster('ventral',VENTRAL_NOZZLES,lod,0,false);
    buildThrusterCluster('lateral',LATERAL_NOZZLES,lod,0,true);
    buildColdGasPlumes('plumes',lod);
  }

  flushMesh('chassis',chassisJump,'CHASSIS_ARMOR_BODY',mat,staticTier);
  flushMesh('suspL',bogieL,'SUSPENSION_ARMS_L',mat,staticTier);
  flushMesh('suspR',bogieR,'SUSPENSION_ARMS_R',mat,staticTier);
  flushMesh('wheelL',wheelDriveL,'WHEEL_SET_L',mat,staticTier);
  flushMesh('wheelR',wheelDriveR,'WHEEL_SET_R',mat,staticTier);
  flushMesh('mast',opticsPitch,'SENSOR_MAST_HEAD',mat,staticTier);
  flushMesh('ventral',gimbalVentral,'VENTRAL_THRUSTER_CLUSTER',mat,staticTier);
  flushMesh('lateral',gimbalLateral,'LATERAL_THRUSTER_CLUSTER',mat,staticTier);
  flushMesh('plumes',chassisJump,'COLD_GAS_PLUMES',plumeMat,staticTier);
  flushMesh('static',root,'ROVER_STATIC_BODY',mat,!staticTier);

  // Attachment & thruster telemetry sockets
  marker(opticsPitch,'SOCKET_SENSOR_MAST',[0,0.18,0.18],'sensor_optics',[0,0,1]);
  marker(chassisJump,'SOCKET_PAYLOAD_L',[-0.78,0.16,-0.92],'modular_payload',[-1,0,0]);
  marker(chassisJump,'SOCKET_PAYLOAD_R',[0.78,0.16,-0.92],'modular_payload',[1,0,0]);
  marker(chassisJump,'SOCKET_TOW_FRONT',[0,0.02,2.32],'tow_hitch',[0,0,1]);
  marker(chassisJump,'SOCKET_TOW_REAR',[0,0.06,-2.24],'tow_hitch',[0,0,-1]);

  marker(gimbalVentral,'SOCKET_THRUSTER_V_FL',[-0.48,-0.32,0.68],'cold_gas_thruster_ventral',[0,-1,0]);
  marker(gimbalVentral,'SOCKET_THRUSTER_V_FR',[0.48,-0.32,0.68],'cold_gas_thruster_ventral',[0,-1,0]);
  marker(gimbalVentral,'SOCKET_THRUSTER_V_RL',[-0.48,-0.32,-0.78],'cold_gas_thruster_ventral',[0,-1,0]);
  marker(gimbalVentral,'SOCKET_THRUSTER_V_RR',[0.48,-0.32,-0.78],'cold_gas_thruster_ventral',[0,-1,0]);

  marker(gimbalLateral,'SOCKET_THRUSTER_L_FL',[-0.86,-0.24,0.64],'cold_gas_thruster_lateral',[-0.41,-0.91,0]);
  marker(gimbalLateral,'SOCKET_THRUSTER_L_FR',[0.86,-0.24,0.64],'cold_gas_thruster_lateral',[0.41,-0.91,0]);
  marker(gimbalLateral,'SOCKET_THRUSTER_L_RL',[-0.86,-0.24,0.18],'cold_gas_thruster_lateral',[-0.41,-0.91,0]);
  marker(gimbalLateral,'SOCKET_THRUSTER_L_RR',[0.86,-0.24,0.18],'cold_gas_thruster_lateral',[0.41,-0.91,0]);

  root.userData={
    family:'recon_rover',
    lod,
    damage_level:0,
    static:staticTier
  };
  return root;
}
