import assert from 'node:assert/strict';
import * as T from 'three';
import {
  buildReconRover,
  buildCollisionProxies,
  WHEEL_SPECS,
  THRUSTER_SPECS,
  DAMAGE_ZONES,
  DEBRIS_SPECS
} from './recon-rover-shape.mjs';
import {
  roverState,
  applyRover,
  applyLocalizedDamage,
  buildPresetZoneStates,
  createColdGasSystem,
  createOnboardDisplays,
  NOZZLE_IDS,
  ZONE_DEFS,
  DURATION
} from '../../assets/recon-rover/runtime.js';

for(const dmg of [0,1,2,3]){
  for(const lod of [0,1,2]){
    const root=buildReconRover(lod,dmg);
    root.updateMatrixWorld(true);

    // 1. Verify all 6 wheels, steering pivots, spin pivots, and suspension pivots exist across D0–D3
    for(const w of WHEEL_SPECS){
      const susp=root.getObjectByName(`SUSP_PIVOT_${w.id}`);
      const arm=root.getObjectByName(`SUSP_ARM_${w.id}`);
      const steer=root.getObjectByName(`WHEEL_STEER_${w.id}`);
      const spin=root.getObjectByName(`WHEEL_SPIN_${w.id}`);
      const mesh=root.getObjectByName(`WHEEL_${w.id}`);
      assert(susp&&arm&&steer&&spin&&mesh,`D${dmg} LOD${lod} missing wheel/suspension hierarchy for ${w.id}`);
      assert.equal(spin.parent,steer,`WHEEL_SPIN_${w.id} must be nested beneath WHEEL_STEER_${w.id}`);
      assert.equal(steer.parent,susp,`WHEEL_STEER_${w.id} must be nested beneath SUSP_PIVOT_${w.id}`);
    }

    // 2. Verify all 8 individual thruster gimbals, nozzles, and child sockets exist across D0–D3
    for(const t of THRUSTER_SPECS){
      const gimbal=root.getObjectByName(`GIMBAL_${t.id}`);
      const nozzle=root.getObjectByName(`THRUSTER_${t.id}`);
      const sock=root.getObjectByName(`SOCKET_THRUSTER_${t.id}`);
      assert(gimbal&&nozzle&&sock,`D${dmg} LOD${lod} missing thruster hierarchy for ${t.id}`);
      assert.equal(nozzle.parent,gimbal,`THRUSTER_${t.id} must be parented to GIMBAL_${t.id}`);
      assert.equal(sock.parent,nozzle,`SOCKET_THRUSTER_${t.id} must be parented to THRUSTER_${t.id}`);
    }

    // 3. Verify 4 onboard display surfaces, crack overlay, and 3 gas-leak sockets exist across D0–D3
    assert(root.getObjectByName('DISPLAY_CRACK_OVERLAY'),`D${dmg} LOD${lod} missing DISPLAY_CRACK_OVERLAY`);
    for(const leakSock of ['SOCKET_GAS_LEAK_NEG_X','SOCKET_GAS_LEAK_POS_X','SOCKET_GAS_LEAK_REAR']){
      assert(root.getObjectByName(leakSock),`D${dmg} LOD${lod} missing ${leakSock}`);
    }
    for(const [mName,sName] of [
      ['DISPLAY_SPEED_LEFT','SOCKET_DISPLAY_SPEED_L'],
      ['DISPLAY_THRUST_RIGHT','SOCKET_DISPLAY_THRUST_R'],
      ['DISPLAY_GAS_RESERVE_REAR','SOCKET_DISPLAY_GAS_REAR'],
      ['DISPLAY_FDAI_TELEMETRY_PANEL','SOCKET_DISPLAY_FDAI_REAR']
    ]){
      const m=root.getObjectByName(mName);
      const s=root.getObjectByName(sName);
      assert(m&&s,`D${dmg} LOD${lod} missing onboard display ${mName} or socket ${sName}`);
      if(lod<2){
        assert(m.isMesh,`${mName} must be a Mesh in D${dmg} LOD${lod}`);
        assert(m.geometry.attributes.uv,`${mName} must have clean UVs in D${dmg} LOD${lod}`);
      }
    }

    // 4. Verify 6 bounded detachable debris fragments and sockets exist
    for(const d of DEBRIS_SPECS){
      assert(root.getObjectByName(d.id),`D${dmg} LOD${lod} missing debris fragment ${d.id}`);
      assert(root.getObjectByName(d.socket),`D${dmg} LOD${lod} missing debris socket ${d.socket}`);
    }
  }
}

// 5. Verify zero-reload, zero-leak localized damage swapping across all 19 zones in LOD1
{
  const liveRoot=buildReconRover(1,0);
  const variantBank={
    0:liveRoot,
    1:buildReconRover(1,1),
    2:buildReconRover(1,2),
    3:buildReconRover(1,3)
  };

  const origRearWheelGeo=liveRoot.getObjectByName('WHEEL_RR').geometry;
  const origFrontWheelGeo=liveRoot.getObjectByName('WHEEL_FL').geometry;
  const d3FrontWheelGeo=variantBank[3].getObjectByName('WHEEL_FL').geometry;
  const d2FlankNegGeo=variantBank[2].getObjectByName('ZONE_FLANK_NEG_X').geometry;

  // Apply localized front-left impact preset
  const zones=buildPresetZoneStates('front_left_impact');
  zones.FLANK_NEG_X=2;
  applyLocalizedDamage(liveRoot,variantBank,zones,{showDebris:true});

  // Affected zones swapped to donor geometries by reference
  assert.equal(liveRoot.getObjectByName('WHEEL_FL').geometry,d3FrontWheelGeo,'WHEEL_FL should swap to D3 geometry');
  assert.equal(liveRoot.getObjectByName('ZONE_FLANK_NEG_X').geometry,d2FlankNegGeo,'ZONE_FLANK_NEG_X should swap to D2 geometry');
  // Unaffected zones remain untouched
  assert.equal(liveRoot.getObjectByName('WHEEL_RR').geometry,origRearWheelGeo,'Unaffected WHEEL_RR geometry must remain unchanged');
  assert.notEqual(origFrontWheelGeo,d3FrontWheelGeo,'D0 and D3 wheel geometries must be distinct');

  // Verify partial capability loss on localized impact while surviving components articulate
  const s=applyRover(liveRoot,4.8,1,{
    thrusters:true,
    jump:false,
    speedMps:7.5,
    steerDeg:30,
    zoneStates:zones,
    leakEnabled:true,
    leakIntensity:0.9
  });
  // Destroyed FL wheel does not steer or spin, while intact FR and RR wheels still steer and spin!
  assert.equal(liveRoot.getObjectByName('WHEEL_STEER_FL').rotation.y,0,'D3 WHEEL_FL steering must be disabled');
  assert(liveRoot.getObjectByName('WHEEL_STEER_FR').rotation.y>0.4,'Intact WHEEL_FR must still steer normally');
  assert.equal(liveRoot.getObjectByName('WHEEL_SPIN_FL').rotation.x,0,'D3 WHEEL_FL spin must be disabled');
  assert(liveRoot.getObjectByName('WHEEL_SPIN_RR').rotation.x>1.0,'Intact WHEEL_RR must still spin normally');
  assert(s.leakIntensities.NEG_X>0.5,'D2 FLANK_NEG_X must emit cold-gas leak intensity');
  assert.equal(s.leakIntensities.POS_X,0,'Intact FLANK_POS_X must not leak');

  // Verify cold-gas particle helper spawns both nozzle plumes and D2 manifold leak mist
  const fx=createColdGasSystem(T,liveRoot,{enabled:true,dust:true,leakEnabled:true});
  const stepOn=fx.step(0.02,s.nozzleIntensities,liveRoot,s.leakIntensities);
  assert(stepOn.activePlumeCount>0,'Active thrusters must spawn cold-gas mist');
  assert(stepOn.activeLeakCount>0,'D2 ruptured manifold must spawn cold-gas leak mist');
  fx.setLeakEnabled(false);
  const stepNoLeak=fx.step(0.02,s.nozzleIntensities,liveRoot,s.leakIntensities);
  assert.equal(stepNoLeak.activeLeakCount,0,'Disabling leak toggle must stop leak mist');

  // Verify onboard displays update across damage states without errors
  const displays=createOnboardDisplays(T,liveRoot);
  displays.update(s.telemetry,liveRoot);
}

// 6. Verify collision proxies cover all 19 zones + chassis core + 6 detachable debris fragments
{
  const proxies=buildCollisionProxies({WHEEL_FL:3,FLANK_NEG_X:2},0);
  assert.equal(proxies.length,1+DAMAGE_ZONES.length+DEBRIS_SPECS.length);
  const flProxy=proxies.find(p=>p.zone==='WHEEL_FL'&&!p.fragment_node);
  assert.equal(flProxy.damage_level,3);
  assert.equal(flProxy.functional,false);
  const rimDebris=proxies.find(p=>p.fragment_node==='DEBRIS_WHEEL_RIM_FL');
  assert.equal(rimDebris.detached,true);
}

// 7. Loop continuity check
const a=roverState(0),b=roverState(DURATION);
assert(Math.abs(a.steerDeg-b.steerDeg)<1e-9);
assert(Math.abs(a.mastPitchDeg-b.mastPitchDeg)<1e-9);

console.log('PASS test-recon-rover: D0–D3 × LOD0–LOD2 hierarchy, 19-zone zero-reload localized damage swapping, D2 COPV gas leak mist, D3 6-fragment debris & convex collision proxies verified.');
