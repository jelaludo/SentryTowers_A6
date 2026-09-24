// Deterministic presentation choreography. Units/scales are cinematic, not orbital physics.
import {launchState,extensionPose} from '../assets/orbital-launcher/runtime.js';
export const DURATION=100,PLANET_RADIUS=195,MIRROR_COUNT=48;
export const CHAPTERS=[{time:0,label:'01 · ARC-01 launch'},{time:16,label:'02 · Small world'},{time:27,label:'03 · SOL-88 revealed'},{time:35,label:'04 · Laser test'},{time:52,label:'05 · HEL-01 launches'},{time:83,label:'06 · Orbital constellation'}];
export const clamp=x=>Math.max(0,Math.min(1,x));export const smooth=(t,a,b)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};const mix=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u);
export const CENTER=[0,-PLANET_RADIUS,0];
export function orbitPosition(angle,radius=365,tilt=.52){return [Math.sin(angle)*radius,CENTER[1]+Math.cos(angle)*radius*Math.cos(tilt),Math.cos(angle)*radius*Math.sin(tilt)];}
export function mirrorOrbit(i,t){const ring=i%3,slot=Math.floor(i/3),angle=slot/16*Math.PI*2+(t-52)*(.011+ring*.002),r=310+ring*26,tilt=[-.8,.15,.95][ring],p=[Math.cos(angle)*r,Math.sin(angle)*r,0];return [p[0]*Math.cos(tilt),CENTER[1]+p[1],p[0]*Math.sin(tilt)];}
export const SOL_RELEASE=6.8,SOL_SPEED=108,MIRROR_SPEED=470,LAUNCH_VISIBLE_SECONDS=.85;
// The vertical launch keeps constant speed through clearance. SOL stays visible
// during the staged orbital acquisition; HEL transfers still happen off-screen.
export function planetAngle(t){return Math.max(0,t-7)*.018;}
export function launchOrigin(releaseTime){const exit=extensionPose(0),a=planetAngle(releaseTime),z=exit.position[2]+.43*Math.sin(exit.pitch);return [Math.sin(a)*z,exit.position[1]+.43*Math.cos(exit.pitch),Math.cos(a)*z];}
export function straightFlight(releaseTime,time,speed){const p=launchOrigin(releaseTime);p[1]+=Math.max(0,time-releaseTime)*speed;return p;}
export function cinematicState(seconds){if(!Number.isFinite(seconds))throw Error('Time must be finite');const t=Math.max(0,Math.min(DURATION,seconds)),arcTime=t<6?t/6*8:t<SOL_RELEASE?8+(t-6)/.8*.4:8.4+(t-SOL_RELEASE),launch=launchState(Math.min(30,arcTime)),dest=orbitPosition(.34+(Math.max(23,t)-23)*.009),angle=planetAngle(t);let solPosition;if(t<SOL_RELEASE){const p=launch.payload.position.map((v,i)=>v+(i===1?.43*Math.cos(launch.payload.pitch):i===2?.43*Math.sin(launch.payload.pitch):0));solPosition=[Math.sin(angle)*p[2],p[1],Math.cos(angle)*p[2]];}else if(t<9.8)solPosition=straightFlight(SOL_RELEASE,t,SOL_SPEED);
else if(t<23){
// Tangent-matched Hermite acquisition: retain launch velocity at clearance and
// meet the moving orbit without a position/velocity jump or hidden replacement.
const duration=23-9.8,u=(t-9.8)/duration,start=straightFlight(SOL_RELEASE,9.8,SOL_SPEED),end=orbitPosition(.34),v=[Math.cos(.34)*365*.009,-Math.sin(.34)*365*Math.cos(.52)*.009,-Math.sin(.34)*365*Math.sin(.52)*.009];
solPosition=start.map((x,i)=>(2*u**3-3*u*u+1)*x+(u**3-2*u*u+u)*duration*(i===1?SOL_SPEED:0)+(-2*u**3+3*u*u)*end[i]+(u**3-u*u)*duration*v[i]);
}else solPosition=dest;
let clip='Idle_Cycle',clipTime=t%24;if(t>=30&&t<34){clip='Convergence';clipTime=t-30;}else if(t>=34&&t<44){clip='Firing_Cycle';clipTime=t-34;}else if(t>=44&&t<49){clip='Recovery';clipTime=t-44;}
const mirrors=Array.from({length:MIRROR_COUNT},(_,i)=>{const launchAt=52.4+i*.65,age=t-launchAt,flight=clamp(age/5),deployed=age>=5,launching=age>=0&&age<LAUNCH_VISIBLE_SECONDS,visible=launching||deployed;return {index:i,launchAt,age,visible,launching,deployed,flight,position:deployed?mirrorOrbit(i,t):straightFlight(launchAt,t,MIRROR_SPEED),scale:deployed?4*smooth(age,5,5.55):.2};});
const deployed=mirrors.filter(m=>m.deployed).length,inFlight=mirrors.filter(m=>m.age>=0&&!m.deployed).length;
let camera=[62,38,70],target=[0,10,0];
if(t<7){const k=smooth(t,0,7);camera=mix(camera,[48,30,53],k);target=mix([0,10,0],[0,14,7],k);const track=smooth(t,6,7),offset=camera.map((v,i)=>v-target[i]);target=mix(target,solPosition,track);camera=target.map((v,i)=>v+offset[i]);}else if(t<24){const k=smooth(t,7,24);target=mix(solPosition,CENTER,.35*k);const offset=mix([48,16,46],[370,385,500],k);camera=target.map((v,i)=>v+offset[i]);}else if(t<30){const k=smooth(t,24,30);target=mix(solPosition,CENTER,.35*(1-k));const offset=mix([370,385,500],[74,29,96],k);camera=target.map((v,i)=>v+offset[i]);}else if(t<45){camera=solPosition.map((v,i)=>v+[74,29,96][i]);target=[...solPosition];if(t>=36){const k=smooth(t,36,41);camera=mix(camera,[230,140,360],k);target=mix(solPosition,mix(solPosition,CENTER,.38),k);}}else if(t<53){const k=smooth(t,45,53);camera=mix([230,140,360],[68,42,75],k);target=mix(mix(solPosition,CENTER,.38),[0,16,0],k);}else{const k=smooth(t,55,86);camera=mix([68,42,75],[610,330,820],k);target=mix([0,16,0],CENTER,k);if(t>86){const a=(t-86)*.016,x=camera[0],z=camera[2];camera[0]=x*Math.cos(a)+z*Math.sin(a);camera[2]=-x*Math.sin(a)+z*Math.cos(a);}}
const phase=t<6?'ARC-01 · charge and load':t<7?'Launch / SOL-88 payload':t<24?'Leaving the surface':t<30?'SOL-88 / Syzygy':t<34?'Cages converging':t<44?'SOL-88 / ten-second laser test':t<49?'Optics closed / thermal recovery':t<57?'HEL-01 / first mirror launches':t<88?'Building the orbital constellation':'48 HEL-01 mirrors / deployment complete';
return {time:t,arcTime:Math.min(30,arcTime),launch,solPosition,planetAngle:angle,solScale:.045+.755*smooth(t,7,24),solVisible:true,solOrbit:t>=23,clip,clipTime,beam:t>=34&&t<44,beamPower:smooth(t,34,34.5)*(1-smooth(t,43.5,44)),mirrors,deployed,inFlight,camera,target,phase,chapter:CHAPTERS.filter(c=>c.time<=t).at(-1)};
}
