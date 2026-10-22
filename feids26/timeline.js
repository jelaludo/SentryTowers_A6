import {applyMech,poseLeg,solveHydraulics,LEGS,dropState} from '../assets/ridgeback-mech/runtime.js';
import {smooth} from '../assets/feids26/runtime.js';
export const DURATION=15,SCALE=.75,RELEASE=7;
export function capsuleState(t,index=0){const a=Math.max(0,t-index*.4);return {age:a,x:index===0?-8:8,y:a<7?180-135*smooth(a/7):45-12*(a-7)-6*(a-7)**2,pitch:Math.PI/2*(1-smooth((a-2.5)/3)),opening:Math.max(0,Math.min(4,(a-4)*4/3)),heat:smooth(a/.6)*(1-smooth((a-3.5)/1.5))};}
export function cargoState(t,capsule,slot){const age=t-capsule*.4-RELEASE,hit=age-2.65;let height=47.05;if(age>=0&&age<2)height=47.05-10*age*age;else if(age>=2&&age<2.65){const u=(age-2)/.65;height=7.05*(1-u)**3+1.3*u*(1-u);}else if(age>=2.65)height=0;
 const burst=age-2;return {age,hit,height,x:capsule===0?-8:8,z:slot===0?-2.2:2.2,yaw:(slot===0?-.12:.12),jet:burst>=0&&burst<.65?.25+.75*Math.max(0,Math.sin(burst/.65*Math.PI*5)):0,heat:0,compression:hit>=0?dropState(2.6+hit).compression:0,fold:1-smooth(age/1.6)};}
export function packMech(root,fold=1,compression=0){applyMech(root,0,{mode:'park',damage:0});root.getObjectByName('MECH_BODY').position.y=1.9-compression;for(const l of LEGS)poseLeg(root,l,[l.fx*(1-.24*fold),.18+.65*fold,l.fz]);solveHydraulics(root);}
