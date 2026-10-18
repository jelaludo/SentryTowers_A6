export const DURATION=16;

export function roverState(time,options={}){
  const {
    thrusters=true,
    jump=true,
    gimbalDeg=0,
    mastYawDeg=0
  }=options;
  const t=(((time)%DURATION)+DURATION)%DURATION;
  const manualGimbal=(gimbalDeg*Math.PI)/180;
  const manualMast=(mastYawDeg*Math.PI)/180;

  let phase='Ground reconnaissance & LiDAR terrain scan';
  let chassisY=0.56;
  let chassisPitch=0;
  let chassisRoll=0;
  let chassisZ=0;
  let bogiePitch=0;
  let wheelDropY=0;
  let ventralGimbalX=manualGimbal;
  let ventralGimbalZ=0;
  let lateralGimbalX=manualGimbal;
  let lateralGimbalZ=0;
  let plumeIntensity=0;

  if(t>=2.5&&t<4.2){
    // Pre-jump hydraulic crouch & nozzle vector check
    const u=(t-2.5)/1.7;
    const s=Math.sin(u*Math.PI);
    phase='Pre-jump suspension crouch & thruster gimbal check';
    if(jump){
      chassisY=0.56-0.11*s;
      bogiePitch=0.14*s;
      wheelDropY=0.09*s;
    }
    ventralGimbalX=manualGimbal+0.28*Math.sin(u*Math.PI*2);
    lateralGimbalX=manualGimbal-0.34*Math.sin(u*Math.PI*2);
    lateralGimbalZ=0.22*s;
    plumeIntensity=thrusters?0.25*s:0;
  }else if(t>=4.2&&t<9.6){
    // Short low-gravity airborne burst
    const u=(t-4.2)/5.4;
    const arc=Math.sin(u*Math.PI);
    phase=u<0.35
      ?'Ventral + lateral cold-gas ignition — airborne ascent'
      :u<0.75
        ?'Low-gravity ballistic hop & lateral vector trim'
        :'Retro-thruster landing burn & attitude leveling';
    if(jump){
      chassisY=0.56+1.42*Math.pow(arc,0.82);
      chassisPitch=0.14*Math.cos(u*Math.PI*2)-0.04;
      chassisRoll=0.09*Math.sin(u*Math.PI*2);
      chassisZ=Math.sin(u*Math.PI)*0.45;
      // Wheels droop on extended hydraulic struts while airborne
      bogiePitch=-0.16*arc;
      wheelDropY=-0.12*arc;
    }
    ventralGimbalX=manualGimbal-0.26*Math.cos(u*Math.PI);
    ventralGimbalZ=-0.18*Math.sin(u*Math.PI*2);
    lateralGimbalX=manualGimbal+0.32*Math.cos(u*Math.PI);
    lateralGimbalZ=0.25*Math.sin(u*Math.PI);
    const burn=(u<0.42||u>0.72)?1.0:0.45;
    plumeIntensity=thrusters?burn*(0.82+0.18*Math.sin(t*28)):0;
  }else if(t>=9.6&&t<11.6){
    // Touchdown damper compression & recovery
    const u=(t-9.6)/2.0;
    const damp=Math.sin(u*Math.PI)*Math.exp(-u*2.2);
    phase='Touchdown hydraulic shock absorption & pressure recharge';
    if(jump){
      chassisY=0.56-0.15*damp;
      chassisPitch=-0.06*damp;
      bogiePitch=0.18*damp;
      wheelDropY=0.12*damp;
    }
    ventralGimbalX=manualGimbal+0.12*damp;
    lateralGimbalX=manualGimbal-0.15*damp;
    plumeIntensity=thrusters&&u<0.35?0.4*(1-u/0.35):0;
  }

  const mastYaw=manualMast+Math.sin((t/DURATION)*Math.PI*2)*0.85;
  const opticsPitch=-0.08+Math.sin((t/DURATION)*Math.PI*4)*0.16;

  return {
    time:t,
    phase,
    thrusters:Boolean(thrusters),
    jump:Boolean(jump),
    airborne:jump&&t>=4.2&&t<9.6,
    chassisY,
    chassisPitch,
    chassisRoll,
    chassisZ,
    bogiePitch,
    wheelDropY,
    ventralGimbalX,
    ventralGimbalZ,
    lateralGimbalX,
    lateralGimbalZ,
    plumeIntensity,
    mastYaw,
    opticsPitch
  };
}

export function applyRover(root,time,lod=1,options={}){
  const s=roverState(time,options);
  if(!root)return s;
  if(lod<2){
    const chassis=root.getObjectByName('ROVER_CHASSIS_JUMP');
    if(chassis){
      chassis.position.set(0,s.chassisY,s.chassisZ);
      chassis.rotation.set(s.chassisPitch,0,s.chassisRoll);
    }
    const bogieL=root.getObjectByName('SUSPENSION_BOGIE_L');
    const bogieR=root.getObjectByName('SUSPENSION_BOGIE_R');
    if(bogieL)bogieL.rotation.x=s.bogiePitch;
    if(bogieR)bogieR.rotation.x=s.bogiePitch;

    const wheelL=root.getObjectByName('WHEEL_DRIVE_L');
    const wheelR=root.getObjectByName('WHEEL_DRIVE_R');
    if(wheelL)wheelL.position.y=s.wheelDropY;
    if(wheelR)wheelR.position.y=s.wheelDropY;

    const vGimbal=root.getObjectByName('THRUSTER_GIMBAL_VENTRAL');
    if(vGimbal){
      vGimbal.rotation.x=s.ventralGimbalX;
      vGimbal.rotation.z=s.ventralGimbalZ;
    }
    const lGimbal=root.getObjectByName('THRUSTER_GIMBAL_LATERAL');
    if(lGimbal){
      lGimbal.rotation.x=s.lateralGimbalX;
      lGimbal.rotation.z=s.lateralGimbalZ;
    }
    const mast=root.getObjectByName('SENSOR_MAST_YAW');
    if(mast)mast.rotation.y=s.mastYaw;
    const optics=root.getObjectByName('OPTICS_HEAD_PITCH');
    if(optics)optics.rotation.x=s.opticsPitch;

    const plumes=root.getObjectByName('COLD_GAS_PLUMES');
    if(plumes){
      plumes.visible=s.plumeIntensity>0.01;
      plumes.rotation.x=s.lateralGimbalX*0.5;
      if(plumes.isMesh&&plumes.material){
        plumes.material.opacity=Math.min(0.55,s.plumeIntensity*0.48);
      }
    }
  }
  return {...s,phase:lod===2?'Static distance pose':s.phase};
}
