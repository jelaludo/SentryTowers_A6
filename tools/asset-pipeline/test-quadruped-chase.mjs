import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ChaseSimulation,STEP,track,OBSTACLES} from '../../quadruped-playground/simulation.js';
const manifest=JSON.parse(await fs.readFile(new URL('../../quadruped-playground/manifest.json',import.meta.url)));
const clips=Object.fromEntries(['k9','cheetah'].map((id,i)=>[id,manifest.assets.find(e=>e.family===(i?'mechanical-cheetah':'reckon-k9')&&e.lod===1).clips]));
function segmentDistance(a,b,c,d){
 // Closest points between two finite ground-plane segments, including crossings.
 const cross=(u,v)=>u.x*v.z-u.z*v.x,sub=(u,v)=>({x:u.x-v.x,z:u.z-v.z}),r=sub(b,a),s=sub(d,c),den=cross(r,s),v=sub(c,a);
 if(Math.abs(den)>1e-9){const t=cross(v,s)/den,u=cross(v,r)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return 0;}
 const point=(p,x,y)=>{const d=sub(y,x),q=sub(p,x),t=Math.max(0,Math.min(1,(q.x*d.x+q.z*d.z)/(d.x*d.x+d.z*d.z)));return Math.hypot(q.x-t*d.x,q.z-t*d.z);};
 return Math.min(point(a,c,d),point(b,c,d),point(c,a,b),point(d,a,b));
}
export function separation(actors){
 const ends=actors.map(a=>{const front=a.id==='k9'?.75:1.07,rear=a.id==='k9'?.80:1.86;return [front,-rear].map(d=>({x:a.position.x+Math.sin(a.yaw)*d,z:a.position.z+Math.cos(a.yaw)*d}));});
 return segmentDistance(...ends[0],...ends[1])-.28-.40;
}
const runs=[];
for(const seed of [27,104,891]){
 const sim=new ChaseSimulation({seed,clips});let minimum=Infinity,maxGap=0,avoidance=0;const peak=[0,0],low=[Infinity,Infinity];let jumps=0;
 for(let f=0;f<120/STEP;f++){
  sim.step(STEP);minimum=Math.min(minimum,separation(sim.actors));maxGap=Math.max(maxGap,...sim.actors.map(a=>sim.ball.s-a.s));
  sim.actors.forEach((a,i)=>{assert(Number.isFinite(a.position.x+a.position.z+a.yaw));if(!a.jump){peak[i]=Math.max(peak[i],a.worldSpeed);low[i]=Math.min(low[i],a.worldSpeed);}if(a.avoidance>.2)avoidance++;});
 }
 jumps=sim.actors.map(a=>a.jumps);runs.push({seed,seconds:sim.time,minimum_capsule_gap_m:minimum,maximum_ball_gap_m:maxGap,peak_ground_speed_mps:peak,minimum_ground_speed_mps:low,jumps,bursts:sim.burstCount,avoidance_frames:avoidance});
 console.log(runs.at(-1));
 assert(minimum>.04,'actors overlap '+minimum);assert(jumps.every(n=>n>=3),'both actors must clear multiple hurdles');assert(sim.burstCount>=8);assert(peak.every(v=>v>2));assert(avoidance>100);
}
const a=new ChaseSimulation({seed:27,clips}),b=new ChaseSimulation({seed:27,clips});for(let i=0;i<1200;i++){a.step(STEP);b.step(STEP);}assert.deepEqual(a.actors,b.actors);assert.deepEqual(a.ball,b.ball);
const response=new ChaseSimulation({seed:27,clips,obstacles:false});
for(let i=0;i<240;i++)response.step(STEP);
const before={ball:response.ball.speed,actors:response.actors.map(a=>a.worldSpeed)};
response.burst();for(let i=0;i<144;i++)response.step(STEP);
const after={ball:response.ball.speed,actors:response.actors.map(a=>a.worldSpeed)};
assert(after.ball>before.ball+1);assert(after.actors.every((speed,i)=>speed>before.actors[i]+.5),'both respond to ball acceleration');
assert.equal(response.actors.reduce((n,a)=>n+a.jumps,0),0,'hurdles disabled');
await fs.writeFile(new URL('../../quadruped-playground/behavior-validation.json',import.meta.url),JSON.stringify({status:'passed',scope:'Seeded 120 Hz behavior; conservative whole-animal capsules, repeated hurdles, speed changes and repeatability. No physical dynamics or FPS claim.',acceleration_response:{interval_s:1.2,before,after},runs},null,2)+'\n');
