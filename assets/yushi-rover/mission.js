import {WHEELS} from './runtime.js';
// Deterministic finite-inventory mission, independent of renderer. No timers or hidden transfers.
export const DEPOT={x:-15,z:-12,capacity:400,dock:{x:-23,z:-15.9175,yaw:Math.PI},clearance:7.5};
export const FIELD={minX:-30,maxX:25,minZ:-27,maxZ:25};
export function terrainHeight(x,z){return .16*Math.sin(x*.38)*Math.cos(z*.33)*Math.exp(-((x-4)**2+(z-8)**2)/480)+.30*Math.exp(-((x-5)**2/8+(z-7)**2/14))+.22*Math.exp(-((x+3)**2/9+(z-14)**2/6));}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function clear(a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((DEPOT.x-a.x)*dx+(DEPOT.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(a.x+dx*t-DEPOT.x,a.z+dz*t-DEPOT.z)>=DEPOT.clearance;}
export function planPath(start,end){
 if(clear(start,end))return[{...end}];
 // Visibility graph around a generously inflated Bio-Pearl footprint.
 const points=[start,end,...Array.from({length:32},(_,i)=>({x:DEPOT.x+8.1*Math.cos(i*Math.PI/16),z:DEPOT.z+8.1*Math.sin(i*Math.PI/16)})).filter(p=>p.x>FIELD.minX+3&&p.z>FIELD.minZ+3)],cost=points.map(()=>Infinity),prev=points.map(()=>-1),done=new Set();cost[0]=0;
 for(let k=0;k<points.length;k++){let u=-1;for(let i=0;i<points.length;i++)if(!done.has(i)&&(u<0||cost[i]<cost[u]))u=i;if(u<0||!Number.isFinite(cost[u]))break;if(u===1)break;done.add(u);for(let v=0;v<points.length;v++)if(!done.has(v)&&clear(points[u],points[v])){const c=cost[u]+distance(points[u],points[v]);if(c<cost[v]){cost[v]=c;prev[v]=u;}}}
 if(!Number.isFinite(cost[1]))throw new Error('No clear route to target');const route=[];for(let i=1;i!==0;i=prev[i])route.unshift({...points[i]});return route;
}
export function createMission({seed=true}={}){
 const m={time:0,x:-5,z:-12,yaw:0,speed:0,turnRate:0,distance:0,beltDistance:0,cargo:0,capacity:100,stored:40,delivered:0,beacons:[],state:'idle',running:true,target:null,route:[],phase:0,events:[],nextId:1,wheelTravel:Array(6).fill(0),wheelSteer:Array(6).fill(0)};
 const event=(type,data={})=>{m.events.push({time:m.time,type,...data});if(m.events.length>200)m.events.shift();};
 m.addBeacon=(x,z,amount=60)=>{if(![x,z,amount].every(Number.isFinite)||amount<=0||amount>100)throw new Error('Beacon requires finite coordinates and 1–100 units');if(x<-7||x>18||z<-1||z>18)throw new Error('Place beacons in the marked collection field');if(m.beacons.filter(b=>b.remaining>0).some(b=>Math.hypot(x-b.x,z-b.z)<4))throw new Error('Keep collection beacons at least 4 m apart');if(m.beacons.length>=12)throw new Error('Maximum 12 beacons; reset the route to start again');const b={id:m.nextId++,x,z,amount,remaining:amount};m.beacons.push(b);event('beacon_added',{id:b.id});if(['complete','idle'].includes(m.state))m.state='idle';return b;};
 function returnHome(){m.target=null;m.route=planPath(m,DEPOT.dock);m.state='returning';event('returning');}
 function choose(){if(m.cargo>=m.capacity-1e-7||!m.beacons.some(b=>b.remaining>1e-7)){if(m.cargo>1e-7)returnHome();else m.state=m.beacons.length?'complete':'idle';return;}const b=m.beacons.find(b=>b.remaining>1e-7);m.target=b;const yaw=Math.atan2(b.x-m.x,b.z-m.z),end={x:b.x-Math.sin(yaw)*4.95,z:b.z-Math.cos(yaw)*4.95};m.route=planPath(m,end);m.targetYaw=yaw;m.state='navigating';event('navigate',{id:b.id});}
 m.recall=()=>{if(m.cargo>0){returnHome();m.running=true;}else{m.route=planPath(m,DEPOT.dock);m.target=null;m.state='returning';m.running=true;}};
 m.tick=dt=>{
  if(!Number.isFinite(dt)||dt<0||dt>1)throw new Error('tick expects 0–1 seconds');if(!m.running)return m;m.time+=dt;m.speed=0;m.turnRate=0;
  if(m.state==='idle')choose();
  if(['navigating','returning'].includes(m.state)){
   const p=m.route[0];if(!p){m.state=m.state==='returning'?'docking':'aligning';m.phase=0;}
   else{const d=distance(m,p),wanted=Math.atan2(p.x-m.x,p.z-m.z),a=angle(wanted-m.yaw),turn=Math.max(-.8*dt,Math.min(.8*dt,a));m.yaw+=turn;m.turnRate=dt?turn/dt:0;
    if(Math.abs(a)<.32){const step=Math.min(d,2.8*dt*Math.max(.25,1-Math.abs(a)*2));m.x+=(p.x-m.x)/Math.max(d,1e-9)*step;m.z+=(p.z-m.z)/Math.max(d,1e-9)*step;m.distance+=step;m.speed=dt?step/dt:0;if(d<.09||step>=d)m.route.shift();}
   }
  }else if(['aligning','docking'].includes(m.state)){
   const wanted=m.state==='docking'?DEPOT.dock.yaw:m.targetYaw,a=angle(wanted-m.yaw),turn=Math.max(-.8*dt,Math.min(.8*dt,a));m.yaw+=turn;m.turnRate=dt?turn/dt:0;
   if(Math.abs(a)<.005){m.yaw=wanted;m.state=m.state==='docking'?'connecting':'harvesting';m.phase=0;event(m.state,{id:m.target?.id});}
  }else if(m.state==='harvesting'){
   const take=Math.min(dt*9,m.target.remaining,m.capacity-m.cargo);m.target.remaining-=take;m.cargo+=take;m.beltDistance+=dt*1.45;
   if(m.target.remaining<1e-7||m.cargo>=m.capacity-1e-7){m.state='clearing';m.phase=0;}
  }else if(m.state==='clearing'){m.beltDistance+=dt*1.45;m.phase+=dt;if(m.phase>=2.9)choose();
  }else if(m.state==='connecting'){m.phase+=dt;if(m.phase>=1.5){m.state='unloading';event('unloading');}}
  else if(m.state==='unloading'){
   const quantity=Math.max(0,Math.min(dt*16,m.cargo,DEPOT.capacity-m.stored));m.cargo-=quantity;m.stored+=quantity;m.delivered+=quantity;
   if(m.cargo<1e-7){m.cargo=0;m.state='disconnecting';m.phase=0;event('delivered',{total:m.delivered});}else if(m.stored>=DEPOT.capacity-1e-7)m.state='storage_full';
  }else if(m.state==='disconnecting'){m.phase+=dt;if(m.phase>=1.3)choose();}
  WHEELS.forEach((w,i)=>{const vx=m.turnRate*w.z,vz=m.speed-m.turnRate*w.side*2.32;let yaw=Math.atan2(vx,vz),speed=Math.hypot(vx,vz);if(yaw>Math.PI/2){yaw-=Math.PI;speed=-speed;}if(yaw<-Math.PI/2){yaw+=Math.PI;speed=-speed;}m.wheelSteer[i]=yaw;m.wheelTravel[i]+=speed*dt;});
  return m;
 };
 if(seed){m.addBeacon(3,5,60);m.addBeacon(-3,16,60);m.addBeacon(15,12,60);}return m;
}
