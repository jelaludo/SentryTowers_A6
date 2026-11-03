import fs from 'node:fs/promises';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {createStory,SENSOR_HANDOFF} from '../../assets/rokuroku66/story.js';
const reports=[];
for(const seed of [6601,1,42,2026]){
 const sim=createStory(seed),active=new Set();let minContacts=6,maxGap=0,transitionSamples=0,closestSamples=0;const history=[];
 for(let i=0;i<=12000;i++){
  const f=sim.sample(i/60),h=f.handoff;
  for(const [id,w]of Object.entries(f.sensor_weights)){assert(Number.isFinite(w)&&w>=0&&w<=1);if(w>.99)active.add(id);}
  assert(f.feet.every(x=>x.target.every(Number.isFinite)&&Number.isFinite(x.lift)));
  if(h&&h.stage!=='prepare'){
   transitionSamples++;minContacts=Math.min(minContacts,f.contacts);assert(f.contacts>=3,'Support during '+h.stage+' at '+f.time+' seed '+seed);
   if(h.stage==='plant')assert.equal(f.sensor_weights[h.incoming],0,'Receiver waits for plant');
   if(h.stage==='lift')assert.equal(f.sensor_weights[h.outgoing],0,'Previous sensor is now support');
  }
  if(f.time>=21&&f.time<78||f.time>=158){
   const candidates=Object.keys(f.sensor_weights).map(id=>{const a=f.heading+(Number(id)-1)*Math.PI/3-Math.PI/6;return {id,d:Math.hypot(f.lure.position[0]-f.position[0]-.7*Math.sin(a),f.lure.position[2]-f.position[2]-.7*Math.cos(a))};}).sort((a,b)=>a.d-b.d);
   const chosen=f.desired_sensors.reduce((sum,id)=>sum+candidates.find(x=>x.id===id).d,0),best=candidates[0].d+candidates[1].d,gap=chosen-best;maxGap=Math.max(maxGap,gap);closestSamples++;assert(gap<.17,'Desired pair stays nearest within hysteresis at '+f.time+' seed '+seed+' penalty '+gap);
  }
  if(i===12000)history.push(...f.role_events);
 }
 assert.equal(active.size,6,'Every physical limb senses');assert(history.length>=6,'Multiple handoffs follow moving lure');for(const e of history){assert(e.planted_at<e.lifted_at&&e.lifted_at<e.time,'Plant before lift');assert(e.sensors.includes(e.to)&&!e.sensors.includes(e.from));const f=sim.sample(e.time+1e-7);assert.equal(f.sensor_weights[e.from],0);assert.equal(f.sensor_weights[e.to],1);}
 reports.push({seed,samples:12001,transition_samples:transitionSamples,min_transition_contacts:minContacts,closest_pair_samples:closestSamples,max_pair_distance_penalty_m:maxGap,sensing_limbs:[...active].sort(),handoffs:history});console.log({seed,minContacts,handoffs:history.length,maxGap});
}
const base=new URL('../../assets/rokuroku66/',import.meta.url),hashes={};for(const name of ['story.js','runtime.js'])hashes[name]=crypto.createHash('sha256').update(await fs.readFile(new URL(name,base))).digest('hex');await fs.writeFile(new URL('sensor-handoff-validation.json',base),JSON.stringify({status:'passed',source_sha256:hashes,scope:'Four seeds at 60 Hz: all six limbs participate, incoming sensors wait for outgoing support, at least three contacts during role morphs, desired-pair proximity with angular hysteresis. Geometry is checked separately.',settings:SENSOR_HANDOFF,reports},null,2)+'\n');
