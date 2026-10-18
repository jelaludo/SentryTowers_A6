import {createColdGasSystem,createOnboardDisplays,NOZZLE_IDS} from './thruster-fx.js';

export {createColdGasSystem,createOnboardDisplays,NOZZLE_IDS};
export const DURATION=16;

export const LIMITS={
  frontSteerDeg:[-34,34],
  auxSteerDeg:[-15,15],
  suspensionSwingDeg:[-16,14],
  suspensionTravelM:[-0.12,0.14],
  sensorYawDeg:[-180,180],
  sensorPitchDeg:[-38,28],
  ventralPitchDeg:[-28,28],
  ventralRollDeg:[-25,25],
  lateralLeftPitchDeg:[-35,35],
  lateralLeftRollDeg:[-42,18],
  lateralRightPitchDeg:[-35,35],
  lateralRightRollDeg:[-18,42]
};

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const deg2rad=d=>(d*Math.PI)/180;
const rad2deg=r=>(r*180)/Math.PI;

export function roverState(time,options={}){
  const {
    thrusters=true,
    jump=false,
    speedMps=4.2,
    steerDeg=null,
    suspBiasM=0,
    gimbalPitchDeg=0,
    gimbalRollDeg=0,
    nozzlePreset='auto',
    nozzleOverrides=null,
    mastYawDeg=null,
    mastPitchDeg=null
  }=options;

  const t=(((time)%DURATION)+DURATION)%DURATION;
  const u=t/DURATION;

  // 1. Wheel spin & Ackermann front steering (±34° limit)
  const autoSteerDeg=26*Math.sin(u*Math.PI*4);
  const cmdSteerDeg=clamp(steerDeg!==null?Number(steerDeg):autoSteerDeg,-34,34);
  // Ackermann inner wheel turns slightly sharper than outer wheel
  const steerFLDeg=cmdSteerDeg>0?clamp(cmdSteerDeg*1.08,-34,34):cmdSteerDeg*0.92;
  const steerFRDeg=cmdSteerDeg<0?clamp(cmdSteerDeg*1.08,-34,34):cmdSteerDeg*0.92;

  const wheelRadius=0.48;
  const omega=speedMps/wheelRadius;
  const baseSpin=omega*t;
  const turnDiff=(cmdSteerDeg/34)*0.18;
  const wheelSpin={
    FL:baseSpin*(1-turnDiff),
    ML:baseSpin*(1-turnDiff*0.85),
    RL:baseSpin*(1-turnDiff*0.75),
    FR:baseSpin*(1+turnDiff),
    MR:baseSpin*(1+turnDiff*0.85),
    RR:baseSpin*(1+turnDiff*0.75)
  };

  // 2. Per-wheel independent suspension articulation (kept independent of steering/spin)
  const wave=(phase)=>0.045*Math.sin(u*Math.PI*6+phase)+Number(suspBiasM||0);
  let crouchM=0;
  let hopHeightM=0;
  let chassisPitch=0;
  let chassisRoll=0;
  let phase='Grounded 6x6 drive, Ackermann steering & continuous 360° sensor scan';

  if(t>=2.5&&t<4.2){
    const s=Math.sin(((t-2.5)/1.7)*Math.PI);
    phase='Pre-burst suspension compression & 8-nozzle individual gimbal sweep';
    crouchM=0.07*s;
  }else if(t>=4.2&&t<9.6){
    const bu=(t-4.2)/5.4;
    const arc=Math.sin(bu*Math.PI);
    phase=bu<0.38
      ?'Ventral + lateral cold-gas ignition — upward & lateral thrust vectoring'
      :bu<0.74
        ?'Differential lateral nozzle trim & attitude rate stabilization'
        :'Retro-burn descent & suspension preparation';
    hopHeightM=1.42*Math.pow(arc,0.82);
    crouchM=-0.08*arc; // Wheels droop on extended struts during low-G hop
    chassisPitch=0.10*Math.cos(bu*Math.PI*2);
    chassisRoll=0.07*Math.sin(bu*Math.PI*2);
  }else if(t>=9.6&&t<11.6){
    const du=(t-9.6)/2.0;
    const damp=Math.sin(du*Math.PI)*Math.exp(-du*2.2);
    phase='Touchdown hydraulic shock absorption & COPV pressure stabilization';
    crouchM=0.09*damp;
    chassisPitch=-0.05*damp;
  }

  const suspTravelM={
    FL:clamp(wave(0.0)+crouchM,-0.12,0.14),
    FR:clamp(wave(1.1)+crouchM,-0.12,0.14),
    ML:clamp(wave(2.1)+crouchM,-0.12,0.14),
    MR:clamp(wave(3.2)+crouchM,-0.12,0.14),
    RL:clamp(wave(4.2)+crouchM,-0.12,0.14),
    RR:clamp(wave(5.3)+crouchM,-0.12,0.14)
  };

  // Convert vertical wheel travel into connected wishbone swing angle (rad) so arm + hub move with zero gap
  const armLength=0.50;
  const suspSwingRad={};
  for(const k of Object.keys(suspTravelM)){
    const side=k.endsWith('L')?-1:1;
    suspSwingRad[k]=-side*Math.asin(clamp(suspTravelM[k]/armLength,-0.28,0.28));
  }

  // 3. Top EO/IR + LiDAR sensor mast: continuous 360° yaw (+Y) and independent collision-free pitch (+X, -38°..+28°)
  const rawYawDeg=mastYawDeg!==null?Number(mastYawDeg):((u*360*2)%360)-180;
  const rawPitchDeg=mastPitchDeg!==null?Number(mastPitchDeg):-6+24*Math.sin(u*Math.PI*6);
  const clampedPitchDeg=clamp(rawPitchDeg,-38,28);
  const mastYaw=deg2rad(rawYawDeg);
  const opticsPitch=deg2rad(clampedPitchDeg);

  // 4. Individual 8-nozzle gimbal angles & per-nozzle cold-gas thrust intensities (0..1)
  const gimbals={};
  const nozzleIntensities={};
  const basePitch=Number(gimbalPitchDeg||0);
  const baseRoll=Number(gimbalRollDeg||0);

  for(let i=0;i<NOZZLE_IDS.length;i++){
    const id=NOZZLE_IDS[i];
    const isVentral=id.startsWith('V_');
    const isLeft=id.endsWith('L');
    const isFront=id.includes('_F');
    const phaseShift=i*0.75;

    const dynPitch=(isFront?1:-1)*14*Math.sin(u*Math.PI*4+phaseShift);
    const dynRoll=(isLeft?-1:1)*12*Math.cos(u*Math.PI*4+phaseShift);

    const pLim=isVentral?LIMITS.ventralPitchDeg:LIMITS.lateralLeftPitchDeg;
    const rLim=isVentral
      ?LIMITS.ventralRollDeg
      :(isLeft?LIMITS.lateralLeftRollDeg:LIMITS.lateralRightRollDeg);

    const pDeg=clamp(basePitch+dynPitch,pLim[0],pLim[1]);
    const rDeg=clamp(baseRoll+dynRoll,rLim[0],rLim[1]);
    gimbals[id]={
      pitchRad:deg2rad(pDeg),
      rollRad:deg2rad(rDeg),
      pitchDeg:pDeg,
      rollDeg:rDeg
    };

    // Compute per-nozzle intensity (0..1) from preset or overrides
    let val=0;
    if(thrusters){
      if(nozzleOverrides&&nozzleOverrides[id]!==undefined){
        val=clamp(Number(nozzleOverrides[id]),0,1);
      }else if(nozzlePreset==='all'){
        val=0.92;
      }else if(nozzlePreset==='ventral'){
        val=isVentral?0.95:0;
      }else if(nozzlePreset==='lateral_left'){
        val=(!isVentral&&isLeft)?0.95:(isVentral&&isLeft?0.35:0);
      }else if(nozzlePreset==='lateral_right'){
        val=(!isVentral&&!isLeft)?0.95:(isVentral&&!isLeft?0.35:0);
      }else if(nozzlePreset==='pitch_trim'){
        val=isFront?0.92:0.18;
      }else{
        // 'auto' sequence: short staggered cold-gas attitude & lift bursts
        if(t>=2.5&&t<4.2){
          val=((i%2===0)?0.55:0.25)*Math.sin(((t-2.5)/1.7)*Math.PI);
        }else if(t>=4.2&&t<9.6){
          const bu=(t-4.2)/5.4;
          if(bu<0.38)val=isVentral?0.95:0.75;
          else if(bu<0.72)val=isVentral?0.35:(isLeft?(0.5+0.4*Math.sin(t*6)):(0.5-0.4*Math.sin(t*6)));
          else val=isVentral?0.88:0.45;
        }else if(t>=9.6&&t<10.5){
          val=isVentral?0.35*(1-(t-9.6)/0.9):0;
        }else{
          // Periodic short attitude-control micro-puffs during ground recon
          const puff=Math.sin(t*3.2+i*1.7);
          val=puff>0.82?(puff-0.82)*3.2:0;
        }
      }
    }
    nozzleIntensities[id]=+clamp(val,0,1).toFixed(3);
  }

  const meanThrust=NOZZLE_IDS.reduce((acc,k)=>acc+nozzleIntensities[k],0)/NOZZLE_IDS.length;
  const chassisY=0.56+(jump?hopHeightM-crouchM:0);
  const gasReserve=clamp(0.92-0.18*(t/DURATION),0.15,1.0);

  // Instantaneous angular rates (deg/s) for the NASM FDAI rear instrument panel
  const yawRateDeg=cmdSteerDeg*0.65+12*Math.cos(u*Math.PI*4);
  const pitchRateDeg=(nozzleIntensities.V_FL+nozzleIntensities.V_FR-nozzleIntensities.V_RL-nozzleIntensities.V_RR)*18+8*Math.sin(u*Math.PI*4);
  const rollRateDeg=(nozzleIntensities.L_FL+nozzleIntensities.L_RL-nozzleIntensities.L_FR-nozzleIntensities.L_RR)*22+10*Math.cos(u*Math.PI*6);

  return {
    time:t,
    phase,
    thrusters:Boolean(thrusters),
    jump:Boolean(jump),
    airborne:Boolean(jump&&t>=4.2&&t<9.6),
    speedMps:Number(speedMps),
    steerDeg:cmdSteerDeg,
    steerFLRad:deg2rad(steerFLDeg),
    steerFRRad:deg2rad(steerFRDeg),
    wheelSpin,
    suspTravelM,
    suspSwingRad,
    chassisY,
    chassisPitch:jump?chassisPitch:0,
    chassisRoll:jump?chassisRoll:0,
    chassisZ:0,
    mastYaw,
    opticsPitch,
    mastYawDeg:rawYawDeg,
    mastPitchDeg:clampedPitchDeg,
    gimbals,
    nozzleIntensities,
    plumeIntensity:meanThrust,
    telemetry:{
      speedMps:Number(speedMps),
      verticalThrust:meanThrust,
      gasReserve,
      heightM:hopHeightM,
      yawRateDeg,
      pitchRateDeg,
      rollRateDeg,
      pitchDeg:rad2deg(chassisPitch)+clampedPitchDeg*0.25,
      rollDeg:rad2deg(chassisRoll)+cmdSteerDeg*0.35,
      mastYawDeg:rawYawDeg,
      mastPitchDeg:clampedPitchDeg
    }
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

    // 1. Apply per-wheel suspension swing (keeps arms & hubs connected without gaps)
    for(const id of ['FL','FR','ML','MR','RL','RR']){
      const sp=root.getObjectByName(`SUSP_PIVOT_${id}`);
      if(sp){
        sp.rotation.set(0,0,s.suspSwingRad[id]);
      }
      const steer=root.getObjectByName(`WHEEL_STEER_${id}`);
      if(steer){
        if(id==='FL')steer.rotation.set(0,s.steerFLRad,0);
        else if(id==='FR')steer.rotation.set(0,s.steerFRRad,0);
        else steer.rotation.set(0,0,0);
      }
      const spin=root.getObjectByName(`WHEEL_SPIN_${id}`);
      if(spin){
        spin.rotation.set(s.wheelSpin[id],0,0);
      }
    }

    // 2. Apply sensor mast continuous 360° yaw (+Y) and independent pitch (+X)
    const mast=root.getObjectByName('SENSOR_MAST_YAW');
    if(mast)mast.rotation.set(0,s.mastYaw,0);
    const optics=root.getObjectByName('OPTICS_HEAD_PITCH');
    if(optics)optics.rotation.set(s.opticsPitch,0,0);

    // 3. Apply individual 2-axis gimbal angles for all 8 cold-gas thrusters
    for(const id of NOZZLE_IDS){
      const g=root.getObjectByName(`GIMBAL_${id}`);
      const state=s.gimbals[id];
      if(g&&state){
        g.rotation.set(state.pitchRad,0,state.rollRad);
      }
    }
  }
  return {...s,phase:lod===2?'Static distance pose':s.phase};
}
