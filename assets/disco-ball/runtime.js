export const DURATION=16;
export const PARTY_COLORS=[0xff4fd8,0x48e5ff,0xffcf48,0x68ff8a];

export function discoState(time,options={}){
  const {lasers=true,lights=true,swing=true,speed=1}=options;
  const t=(((time*speed)%DURATION)+DURATION)%DURATION;
  const phaseIndex=Math.floor(t/4);
  const phases=[
    'Spin-up & mirror ball drop check',
    'Laser prism sweep & balance pendulum arc',
    'Full Stålheart gantry strobe & cross-beam fanfare',
    'Victory cooldown & sync lock'
  ];
  const w=t/DURATION*Math.PI*2;
  const pendulumZ=swing?Math.sin(w*2)*0.24:0;
  const pendulumX=swing?Math.cos(w*2)*0.11:0;
  const sphereSpinY=w*3;
  const haloYaw=-w*1.5;
  const laserRingYaw=w*2.5;
  const laserPitch=-0.42+Math.sin(w*4)*0.28;
  const spotPitch=-0.52+Math.cos(w*3)*0.18;
  const pulse=0.65+0.35*Math.sin(w*8);
  const gantryY=Math.sin(w)*3.2;
  const carriageX=-2+Math.sin(w*2)*2.4;
  return {
    time:t,
    phase:phases[phaseIndex]||phases[0],
    lasers:Boolean(lasers),
    lights:Boolean(lights),
    swing:Boolean(swing),
    pendulumZ,
    pendulumX,
    sphereSpinY,
    haloYaw,
    laserRingYaw,
    laserPitch,
    spotPitch,
    pulse,
    gantryY,
    carriageX
  };
}

export function applyDisco(root,time,lod=1,options={}){
  const s=discoState(time,options);
  if(!root)return s;
  const cradle=root.getObjectByName('STANDALONE_CRADLE');
  if(cradle&&options.hanging!==undefined)cradle.visible=!options.hanging;
  if(lod<2){
    const pendulum=root.getObjectByName('DISCO_PENDULUM_PIVOT');
    if(pendulum){
      pendulum.rotation.z=s.pendulumZ;
      pendulum.rotation.x=s.pendulumX;
    }
    const sphere=root.getObjectByName('DISCO_SPHERE_SPIN');
    if(sphere)sphere.rotation.y=s.sphereSpinY;
    const halo=root.getObjectByName('LIGHT_HALO_YAW');
    if(halo)halo.rotation.y=s.haloYaw;
    const spotPitch=root.getObjectByName('SPOTLIGHT_POD_PITCH');
    if(spotPitch)spotPitch.rotation.x=s.spotPitch;
    const laserYaw=root.getObjectByName('LASER_RING_YAW');
    if(laserYaw)laserYaw.rotation.y=s.laserRingYaw;
    const laserPitch=root.getObjectByName('LASER_EMITTER_PITCH');
    if(laserPitch)laserPitch.rotation.x=s.laserPitch;
    const lens=root.getObjectByName('LIGHT_LENS_ARRAY');
    if(lens?.isMesh&&lens.material){
      lens.material.emissiveIntensity=s.lights?2.2*s.pulse:0;
    }
    const aperture=root.getObjectByName('LASER_APERTURE_ARRAY');
    if(aperture?.isMesh&&aperture.material){
      aperture.material.emissiveIntensity=s.lasers?3.2*(0.7+0.3*Math.cos(s.time*Math.PI*2)):0;
    }
    const beams=root.getObjectByName('LASER_BEAM_PREVIEW');
    if(beams){
      beams.visible=s.lasers;
      if(beams.isMesh&&beams.material){
        beams.material.opacity=s.lasers?0.34*(0.75+0.25*Math.sin(s.time*Math.PI*3)):0;
      }
    }
  }
  return {...s,phase:lod===2?'Static distance pose':s.phase};
}
