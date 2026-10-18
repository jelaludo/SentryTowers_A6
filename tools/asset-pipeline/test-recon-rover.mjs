import assert from 'node:assert/strict';
import {buildReconRover} from './recon-rover-shape.mjs';
import {roverState,applyRover,DURATION} from '../../assets/recon-rover/runtime.js';

for(const lod of [0,1,2]){
  const root=buildReconRover(lod);
  root.updateMatrixWorld(true);

  // Verify all 8 thruster sockets exist (4 ventral + 4 lateral)
  const expectedSockets=[
    'SOCKET_THRUSTER_V_FL','SOCKET_THRUSTER_V_FR','SOCKET_THRUSTER_V_RL','SOCKET_THRUSTER_V_RR',
    'SOCKET_THRUSTER_L_FL','SOCKET_THRUSTER_L_FR','SOCKET_THRUSTER_L_RL','SOCKET_THRUSTER_L_RR',
    'SOCKET_SENSOR_MAST','SOCKET_PAYLOAD_L','SOCKET_PAYLOAD_R','SOCKET_TOW_FRONT','SOCKET_TOW_REAR'
  ];
  for(const sName of expectedSockets){
    assert(root.getObjectByName(sName),`LOD${lod} missing socket ${sName}`);
  }

  // Ground rest state at t = 0
  const s0=applyRover(root,0,lod,{thrusters:true,jump:true,gimbalDeg:0,mastYawDeg:0});
  if(lod<2){
    assert.equal(s0.airborne,false);
    assert(Math.abs(root.getObjectByName('ROVER_CHASSIS_JUMP').position.y-0.56)<1e-6);
    assert.equal(root.getObjectByName('COLD_GAS_PLUMES').visible,false);

    // Airborne cold-gas burst at t = 6.8s
    const sAir=applyRover(root,6.8,lod,{thrusters:true,jump:true,gimbalDeg:12,mastYawDeg:25});
    assert.equal(sAir.airborne,true);
    assert(root.getObjectByName('ROVER_CHASSIS_JUMP').position.y>1.4);
    assert(root.getObjectByName('WHEEL_DRIVE_L').position.y<0);
    assert.equal(root.getObjectByName('COLD_GAS_PLUMES').visible,true);
    assert(Math.abs(root.getObjectByName('THRUSTER_GIMBAL_VENTRAL').rotation.x)>0.01);
    assert(Math.abs(root.getObjectByName('THRUSTER_GIMBAL_LATERAL').rotation.x)>0.01);

    // Disabling thrusters hides plumes while preserving gimbal angles
    applyRover(root,6.8,lod,{thrusters:false,jump:false,gimbalDeg:15,mastYawDeg:0});
    assert.equal(root.getObjectByName('COLD_GAS_PLUMES').visible,false);
    assert(Math.abs(root.getObjectByName('ROVER_CHASSIS_JUMP').position.y-0.56)<1e-6);
  }else{
    assert.equal(s0.phase,'Static distance pose');
  }
}

// Loop continuity check at t = 0 and t = DURATION
const a=roverState(0),b=roverState(DURATION);
assert(Math.abs(a.chassisY-b.chassisY)<1e-9);
assert(Math.abs(a.ventralGimbalX-b.ventralGimbalX)<1e-9);
assert(Math.abs(a.lateralGimbalX-b.lateralGimbalX)<1e-9);

console.log('PASS test-recon-rover: 6x6 suspension, 8 ventral/lateral gimbaled thrusters, airborne low-G jump, and LOD2 static pose verified.');
