import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ChaseSimulation,ACTORS,STEP,track} from '../../quadruped-playground/simulation.js';
const manifest=JSON.parse(await fs.readFile(new URL('../../quadruped-playground/manifest.json',import.meta.url)));
const clips=Object.fromEntries(ACTORS.map(p=>[p.id,manifest.assets.find(e=>e.family===p.family&&e.lod===1).clips]));
function segmentDistance(a,b,c,d){
 // Closest points between two finite ground-plane segments, including crossings.
 const cross=(u,v)=>u.x*v.z-u.z*v.x,sub=(u,v)=>({x:u.x-v.x,z:u.z-v.z}),r=sub(b,a),s=sub(d,c),den=cross(r,s),v=sub(c,a);
 if(Math.abs(den)>1e-9){const t=cross(v,s)/den,u=cross(v,r)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return 0;}
 const point=(p,x,y)=>{const d=sub(y,x),q=sub(p,x),t=Math.max(0,Math.min(1,(q.x*d.x+q.z*d.z)/(d.x*d.x+d.z*d.z)));return Math.hypot(q.x-t*d.x,q.z-t*d.z);};
 return Math.min(point(a,c,d),point(b,c,d),point(c,a,b),point(d,a,b));
}
const capsules={k9:{front:.75,rear:.80,radius:.28},cheetah:{front:1.07,rear:1.86,radius:.40},k0:{front:.45,rear:.69,radius:.20}};
export function separations(actors){
 const ends=actors.map(a=>{const c=capsules[a.id];return [c.front,-c.rear].map(d=>({x:a.position.x+Math.sin(a.yaw)*d,z:a.position.z+Math.cos(a.yaw)*d}));});
 const pairs={};for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++)pairs[actors[i].id+'_'+actors[j].id]=segmentDistance(...ends[i],...ends[j])-capsules[actors[i].id].radius-capsules[actors[j].id].radius;
 return pairs;
}
export const separation=actors=>Math.min(...Object.values(separations(actors)));
const runs=[];
for(const seed of [27,104,891]){
 const sim=new ChaseSimulation({seed,clips});let minimum=Infinity,maxGap=0,avoidance=0;const peak=ACTORS.map(()=>0),low=ACTORS.map(()=>Infinity),pairMinima={};let jumps=0;
 for(let f=0;f<120/STEP;f++){
  sim.step(STEP);for(const [pair,gap] of Object.entries(separations(sim.actors)))pairMinima[pair]=Math.min(pairMinima[pair]??Infinity,gap);minimum=Math.min(minimum,separation(sim.actors));maxGap=Math.max(maxGap,...sim.actors.map(a=>sim.ball.s-a.s));
  sim.actors.forEach((a,i)=>{assert(Number.isFinite(a.position.x+a.position.z+a.yaw));if(!a.jump){peak[i]=Math.max(peak[i],a.worldSpeed);low[i]=Math.min(low[i],a.worldSpeed);}if(a.avoidance>.2)avoidance++;});
 }
 jumps=sim.actors.map(a=>a.jumps);runs.push({seed,seconds:sim.time,minimum_capsule_gap_m:minimum,pair_minima_m:pairMinima,maximum_ball_gap_m:maxGap,peak_ground_speed_mps:peak,minimum_ground_speed_mps:low,jumps,bursts:sim.burstCount,avoidance_frames:avoidance});
 console.log(runs.at(-1));
 assert(minimum>.04,'actors overlap '+minimum);assert(jumps.every(n=>n>=3),'all three actors must clear multiple hurdles');assert(sim.burstCount>=8);assert(peak.every(v=>v>2));assert(peak[2]>Math.max(peak[0],peak[1]),'K0 has the fastest ground chase');assert(avoidance>100);
}
const a=new ChaseSimulation({seed:27,clips}),b=new ChaseSimulation({seed:27,clips});for(let i=0;i<1200;i++){a.step(STEP);b.step(STEP);}assert.deepEqual(a.actors,b.actors);assert.deepEqual(a.ball,b.ball);
// Identical straight-line conditions isolate response from catch-up distance,
// curved-lane radius, hurdle braking, and the other actors' avoidance.
const responses=[];
for(const profile of ACTORS){
 const sim=new ChaseSimulation({seed:27,clips,obstacles:false,actorIds:[profile.id]}),a=sim.actors[0];
 sim.profiles=sim.profiles.map(p=>({...p,lane:0,lateralAcceleration:0}));
 a.s=0;a.lane=0;a.laneVelocity=0;a.position=track(0);a.yaw=0;
 sim.ball.s=profile.gap;sim.ball.speed=.8;sim.goalSpeed=3.9;sim.nextChange=100;
 let reach=null,atOne=null;
 for(let i=0;i<480;i++){sim.step(STEP);if(reach===null&&a.worldSpeed>=3.5)reach=sim.time;if(i===119)atOne=a.worldSpeed;}
 assert.equal(a.jumps,0);assert(reach!==null);responses.push({id:profile.id,speed_at_1s_mps:atOne,time_to_3_5_mps_s:reach});
}
assert(responses[2].speed_at_1s_mps>Math.max(responses[0].speed_at_1s_mps,responses[1].speed_at_1s_mps));
assert(responses[2].time_to_3_5_mps_s<Math.min(responses[0].time_to_3_5_mps_s,responses[1].time_to_3_5_mps_s));
console.log({responses});
await fs.writeFile(new URL('../../quadruped-playground/behavior-validation.json',import.meta.url),JSON.stringify({status:'passed',scope:'Seeded 120 Hz three-actor behavior; conservative whole-animal capsules for all pairs, repeated hurdles, speed changes and repeatability. Isolated equal-condition speed response. No physical dynamics or FPS claim.',actor_order:ACTORS.map(p=>p.id),acceleration_response:responses,runs},null,2)+'\n');
