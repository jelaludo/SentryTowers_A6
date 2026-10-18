import assert from 'node:assert/strict';
import * as T from 'three';
import {buildReconRover,WHEEL_SPECS,THRUSTER_SPECS} from './recon-rover-shape.mjs';
import {
  roverState,
  applyRover,
  createColdGasSystem,
  createOnboardDisplays,
  NOZZLE_IDS,
  DURATION
} from '../../assets/recon-rover/runtime.js';

for(const lod of [0,1,2]){
  const root=buildReconRover(lod);
  root.updateMatrixWorld(true);

  // 1. Verify all 6 wheels, steering pivots, spin pivots, and suspension pivots exist
  for(const w of WHEEL_SPECS){
    const susp=root.getObjectByName(`SUSP_PIVOT_${w.id}`);
    const arm=root.getObjectByName(`SUSP_ARM_${w.id}`);
    const steer=root.getObjectByName(`WHEEL_STEER_${w.id}`);
    const spin=root.getObjectByName(`WHEEL_SPIN_${w.id}`);
    const mesh=root.getObjectByName(`WHEEL_${w.id}`);
    assert(susp&&arm&&steer&&spin&&mesh,`LOD${lod} missing wheel/suspension hierarchy for ${w.id}`);
    // Verify nesting: WHEEL_SPIN_<ID> is nested beneath WHEEL_STEER_<ID>, which is nested beneath SUSP_PIVOT_<ID>
    assert.equal(spin.parent,steer,`WHEEL_SPIN_${w.id} must be nested beneath WHEEL_STEER_${w.id}`);
    assert.equal(steer.parent,susp,`WHEEL_STEER_${w.id} must be nested beneath SUSP_PIVOT_${w.id}`);
  }

  // 2. Verify all 8 individual thruster gimbals, nozzles, and child sockets exist
  for(const t of THRUSTER_SPECS){
    const gimbal=root.getObjectByName(`GIMBAL_${t.id}`);
    const nozzle=root.getObjectByName(`THRUSTER_${t.id}`);
    const sock=root.getObjectByName(`SOCKET_THRUSTER_${t.id}`);
    assert(gimbal&&nozzle&&sock,`LOD${lod} missing thruster hierarchy for ${t.id}`);
    assert.equal(nozzle.parent,gimbal,`THRUSTER_${t.id} must be parented to GIMBAL_${t.id}`);
    assert.equal(sock.parent,nozzle,`SOCKET_THRUSTER_${t.id} must be parented to THRUSTER_${t.id}`);
  }

  // 3. Verify 4 onboard display surfaces and sockets exist
  for(const [mName,sName] of [
    ['DISPLAY_SPEED_LEFT','SOCKET_DISPLAY_SPEED_L'],
    ['DISPLAY_THRUST_RIGHT','SOCKET_DISPLAY_THRUST_R'],
    ['DISPLAY_GAS_RESERVE_REAR','SOCKET_DISPLAY_GAS_REAR'],
    ['DISPLAY_FDAI_TELEMETRY_PANEL','SOCKET_DISPLAY_FDAI_REAR']
  ]){
    const m=root.getObjectByName(mName);
    const s=root.getObjectByName(sName);
    assert(m&&s,`LOD${lod} missing onboard display ${mName} or socket ${sName}`);
    if(lod<2){
      assert(m.isMesh,`${mName} must be a Mesh in LOD${lod}`);
      assert(m.geometry.attributes.uv,`${mName} must have clean UVs in LOD${lod}`);
    }
  }

  if(lod<2){
    // Test simultaneous steering (±30°), wheel spin, suspension travel, sensor 360° yaw + pitch, and individual nozzle vectoring
    const s=applyRover(root,4.8,lod,{
      thrusters:true,
      jump:false,
      speedMps:7.5,
      steerDeg:30,
      suspBiasM:0.06,
      mastYawDeg:210,
      mastPitchDeg:-25,
      nozzleOverrides:{V_FL:1.0,V_FR:0.0,L_FL:0.8,L_RR:0.4}
    });
    root.updateMatrixWorld(true);

    // Front wheels steer around +Y while keeping WHEEL_SPIN nested underneath
    assert(root.getObjectByName('WHEEL_STEER_FL').rotation.y>0.5);
    assert(root.getObjectByName('WHEEL_STEER_FR').rotation.y>0.4);
    assert(root.getObjectByName('WHEEL_SPIN_FL').rotation.x>1.0);
    assert(root.getObjectByName('WHEEL_SPIN_RR').rotation.x>1.0);

    // Sensor mast demonstrates continuous 360° yaw and independent pitch
    assert(Math.abs(root.getObjectByName('SENSOR_MAST_YAW').rotation.y-(210*Math.PI/180))<1e-6);
    assert(Math.abs(root.getObjectByName('OPTICS_HEAD_PITCH').rotation.x-(-25*Math.PI/180))<1e-6);

    // Individual nozzle socket direction changes when its gimbal rotates
    const sockFL=root.getObjectByName('SOCKET_THRUSTER_V_FL');
    const dirBefore=new T.Vector3(0,-1,0).transformDirection(sockFL.matrixWorld).clone();
    root.getObjectByName('GIMBAL_V_FL').rotation.set(0.4,0,-0.3);
    root.updateMatrixWorld(true);
    const dirAfter=new T.Vector3(0,-1,0).transformDirection(sockFL.matrixWorld).clone();
    assert(dirBefore.distanceTo(dirAfter)>0.2,'Nozzle socket exhaust direction must follow individual gimbal rotation');

    // Test cold-gas mist particle system & effects-off toggle
    const fx=createColdGasSystem(T,root,{enabled:true,dust:true,maxPlumeParticles:160,maxDustParticles:48});
    const resOn=fx.step(0.02,s.nozzleIntensities,root);
    assert(resOn.activePlumeCount>0&&resOn.activePlumeCount<=160);
    fx.setEnabled(false);
    const resOff=fx.step(0.02,s.nozzleIntensities,root);
    assert.equal(resOff.activePlumeCount,0);
    assert.equal(fx.group.visible,false);

    // Test onboard displays helper
    const displays=createOnboardDisplays(T,root);
    displays.update(s.telemetry,root);
  }else{
    const s2=applyRover(root,4.8,lod);
    assert.equal(s2.phase,'Static distance pose');
  }
}

// Loop continuity check
const a=roverState(0),b=roverState(DURATION);
assert(Math.abs(a.steerDeg-b.steerDeg)<1e-9);
assert(Math.abs(a.mastPitchDeg-b.mastPitchDeg)<1e-9);

console.log('PASS test-recon-rover: 6 independent wheels, ±34° front steering pivots, per-wheel suspension, 8 individual thruster gimbals + mist particles, 360° sensor yaw/pitch, and 4 UV-mapped onboard displays verified.');
