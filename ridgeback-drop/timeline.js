import {applyMech,poseLeg,solveHydraulics,LEGS,dropState} from '../assets/ridgeback-mech/runtime.js';
export const DURATION=13,SCALE=.75;
export const UNITS=[{release:1.2,x:-6,z:1,yaw:-.32},{release:1.55,x:0,z:-3,yaw:.12},{release:1.9,x:6,z:2,yaw:.46}];
export const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function state(time,index){
 const unit=UNITS[index],age=time-unit.release,hit=age-5.65;
 let height=180;
 if(age>=0&&age<5)height=180-6.6*age*age;
 else if(age>=5&&age<5.65){const u=(age-5)/.65; height=15*(1-u)**3+1.3*u*(1-u);}
 else if(age>=5.65)height=0;
 const brake=age-5,jet=brake>=0&&brake<.65?(.28+.72*Math.max(0,Math.sin(brake/.65*Math.PI*5))) : 0;
 const settle=smooth((age-4.55)/1.1),heat=smooth((age-.5)/1.5)*(1-smooth((age-4.7)/.65));
 return {...unit,age,hit,height,jet,heat,compression:hit>=0?dropState(2.6+hit).compression:0,tuck:.24*(1-settle),pitch:(.13*Math.sin(age*2+index))*(1-settle)*smooth(age),roll:(index-1)*.13*(1-settle)*smooth(age),phase:age<0?'CARRIED':age<5?'HIGH VELOCITY DESCENT':hit<0?'BRAKING BURSTS':hit<1.5?'IMPACT / RECOIL':'GROUND SECURE'};
}
export function pose(root,time,index){
 const s=state(time,index);applyMech(root,0,{mode:'park',damage:0});root.getObjectByName('MECH_BODY').position.y=1.9-s.compression;
 for(const l of LEGS)poseLeg(root,l,[l.fx-l.side*s.tuck,.18+s.tuck,l.fz]);
 solveHydraulics(root);return s;
}
