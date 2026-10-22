import {applyMech,poseLeg,solveHydraulics,LEGS,dropState} from '../assets/ridgeback-mech/runtime.js';
import {smooth} from '../assets/feids26/runtime.js';
export const DURATION=15,SCALE=.75,RELEASE=6.2;
export const LANDINGS=[[-6,-4],[-3,4],[4,-3],[7,5]];
export function capsuleState(t,index=0){const a=Math.max(0,t-index*.45),split=a-RELEASE;return {age:a,x:index===0?-6:6,y:split<0?180-110*(a/RELEASE)**2:70-4*split,pitch:Math.PI/2,opening:Math.max(0,split),heat:smooth(a/.6)*(1-smooth(split/.22)),flash:split>=0&&split<.3?Math.exp(-split*17):0,split};}
export function cargoState(t,capsule,slot){const delay=slot*.18,age=t-capsule*.45-RELEASE-delay,hit=age-3.65,initial=70-4*delay+(slot===0?2.2:-2.2),landing=LANDINGS[capsule*2+slot];let height=initial;
 if(age>=0&&age<3)height=initial-(initial-8)*(age/3)**2;else if(age>=3&&age<3.65){const u=(age-3)/.65;height=8*(1-u)**3+1.3*u*(1-u);}else if(age>=3.65)height=0;
 const burst=age-3,spread=smooth(age/2.7);return {age,hit,height,x:(capsule===0?-6:6)*(1-spread)+landing[0]*spread,z:2.05*(1-spread)+landing[1]*spread,yaw:(slot===0?-.22:.22)*spread,pitch:Math.PI/2*(1-smooth(age/1.5)),jet:burst>=0&&burst<.65?.25+.75*Math.max(0,Math.sin(burst/.65*Math.PI*5)):0,heat:0,compression:hit>=0?dropState(2.6+hit).compression:0,fold:1-smooth(age/2)};}
export function packMech(root,fold=1,compression=0){applyMech(root,0,{mode:'park',damage:0});root.getObjectByName('MECH_BODY').position.y=1.9-compression;for(const l of LEGS)poseLeg(root,l,[l.fx*(1-.24*fold),.18+.65*fold,l.fz]);solveHydraulics(root);}
