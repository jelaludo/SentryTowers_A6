import assert from 'node:assert/strict';
import * as T from 'three';
import {buildDiscoBall} from './disco-ball-shape.mjs';
import {discoState,applyDisco,DURATION} from '../../assets/disco-ball/runtime.js';
import {celebrationState,applyStalheartCelebration,REST_HOOK_WORLD} from '../../assets/stalheart-disco/runtime.js';

for(const lod of [0,1,2]){
  const root=buildDiscoBall(lod);
  root.updateMatrixWorld(true);
  const cradle=root.getObjectByName('STANDALONE_CRADLE');
  assert(cradle,`LOD${lod} missing STANDALONE_CRADLE`);

  // Standalone mode keeps cradle visible
  const s1=applyDisco(root,4,lod,{lasers:true,lights:true,swing:true,hanging:false});
  assert.equal(cradle.visible,true);

  // Hanging mode hides cradle
  const s2=applyDisco(root,4,lod,{lasers:false,lights:false,swing:false,hanging:true});
  assert.equal(cradle.visible,false);

  if(lod<2){
    assert.equal(root.getObjectByName('DISCO_PENDULUM_PIVOT').rotation.z,0);
    assert.equal(root.getObjectByName('LIGHT_LENS_ARRAY').material.emissiveIntensity,0);
    assert.equal(root.getObjectByName('LASER_APERTURE_ARRAY').material.emissiveIntensity,0);
    assert.equal(root.getObjectByName('LASER_BEAM_PREVIEW').visible,false);

    applyDisco(root,5,lod,{lasers:true,lights:true,swing:true,hanging:true});
    assert(Math.abs(root.getObjectByName('DISCO_PENDULUM_PIVOT').rotation.z)>0.01);
    assert(root.getObjectByName('LIGHT_LENS_ARRAY').material.emissiveIntensity>1);
    assert(root.getObjectByName('LASER_APERTURE_ARRAY').material.emissiveIntensity>1);
    assert.equal(root.getObjectByName('LASER_BEAM_PREVIEW').visible,true);
  }else{
    assert.equal(s1.phase,'Static distance pose');
  }
}

// Loop continuity check at t = 0 and t = DURATION
const a=celebrationState(0),b=celebrationState(DURATION);
assert(Math.abs(a.pendulumZ-b.pendulumZ)<1e-9);
assert(Math.abs(a.carriageX-b.carriageX)<1e-9);
assert(Math.abs(a.gantryZ-b.gantryZ)<1e-9);

// Static LOD2 diorama hook placement check
const discoLod2=buildDiscoBall(2);
applyStalheartCelebration(T,{stalheart:null,disco:discoLod2,mork:null,isao:null},6,2,{lasers:true,lights:true,swing:true});
const hookWorld=discoLod2.getObjectByName('SOCKET_GANTRY_HOOK').getWorldPosition(new T.Vector3());
assert(hookWorld.distanceTo(new T.Vector3(...REST_HOOK_WORLD))<1e-6);

console.log('PASS test-disco-ball: standalone, hanging, laser/light/swing toggles, loop continuity and LOD2 static hook verified.');
