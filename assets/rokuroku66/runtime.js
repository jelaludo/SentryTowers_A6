// RokuRoku-66: six independent two-axis chains. Engine-driven, no baked pivots.
export const COUNT=22,ROOT_HEIGHT=1.08,MAX_YAW=.72,MAX_PITCH=.72;
export const limbs=Array.from({length:6},(_,i)=>({id:String(i+1).padStart(2,'0'),angle:i*Math.PI/3}));
export const lengths=Array.from({length:COUNT},(_,i)=>.235-.054*i/(COUNT-1));
export const widths=Array.from({length:COUNT},(_,i)=>.115-.073*i/(COUNT-1));
export const gaits={walk:{name:'Organic_Walk_Cycle',duration_s:4.8,speed_m_s:.34,duty:.74,sensors:[]},scout:{name:'Sensor_Walk_Cycle',duration_s:5.6,speed_m_s:.25,duty:.80,sensors:['01','02']}};
export const motions={mixed:{name:'Mixed_Curvature_Idle',duration_s:10,loop:true},extended:{name:'Extended_Idle',duration_s:8,loop:true},arc:{name:'Arc_Cycle',duration_s:10,loop:true},spiral:{name:'Spiral_Cycle',duration_s:12,loop:true},wrap:{name:'Pole_Wrap_Cycle',duration_s:12,loop:true},manual:{name:'Joint_Inspection',duration_s:1,loop:false},...Object.fromEntries(Object.entries(gaits).map(([k,g])=>[k,{name:g.name,duration_s:g.duration_s,loop:true}]))};
const clamp=(x,a=-1,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const mul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const rotate=(v,q)=>{const p=mul(mul(q,[...v,0]),[-q[0],-q[1],-q[2],q[3]]);return p.slice(0,3);};
const yq=a=>[0,Math.sin(a/2),0,Math.cos(a/2)],zq=a=>[0,0,Math.sin(a/2),Math.cos(a/2)];
export function forward(angles){let q=[0,0,0,1],p=[0,0,0];const points=[[...p]],frames=[];for(let i=0;i<COUNT;i++){q=mul(q,mul(yq(angles[i][0]),zq(angles[i][1])));const d=rotate([lengths[i],0,0],q);p=p.map((x,k)=>x+d[k]);points.push([...p]);frames.push([...q]);}return {points,frames};}
export function extendedAngles(id='01'){
 const phase=Number(id)%2?0:Math.PI;
 const angles=lengths.map((_,i)=>[.045*Math.sin(i*.65+phase),i===0?.18:.40*(Math.cos(Math.PI*i/(COUNT-1))-Math.cos(Math.PI*(i-1)/(COUNT-1)))]);
 let lo=-.4,hi=.4;for(let k=0;k<35;k++){const d=(lo+hi)/2,a=angles.map(x=>[...x]);a[0][1]+=d;if(forward(a).points.at(-1)[1]>-ROOT_HEIGHT+.075)hi=d;else lo=d;}
 angles[0][1]+=(lo+hi)/2;return angles;
}
export function spiralAngles(vertical=false){return lengths.map((_,i)=>{const a=i<4?0:.20+.48*((i-4)/(COUNT-5));return vertical?[0,i===0?.28:a]:[a,0];});}
export const POLE={radius:.25,wrap_radius:.47,rise_per_radian:.10,lead_count:4,height:3.6};
export function wrapAngles(){
 let q=[0,0,0,1],theta=0;const out=[];
 for(let i=0;i<COUNT;i++){
  let dir=[1,0,0];
  if(i>=POLE.lead_count){let lo=0,hi=1;for(let k=0;k<30;k++){const d=(lo+hi)/2,span=Math.hypot(2*POLE.wrap_radius*Math.sin(d/2),POLE.rise_per_radian*d);if(span>lengths[i])hi=d;else lo=d;}const next=theta+(lo+hi)/2;dir=[POLE.wrap_radius*(Math.sin(next)-Math.sin(theta)),POLE.rise_per_radian*(next-theta),POLE.wrap_radius*(Math.cos(next)-Math.cos(theta))];theta=next;const l=Math.hypot(...dir);dir=dir.map(x=>x/l);}
  const d=rotate(dir,[-q[0],-q[1],-q[2],q[3]]),yaw=Math.atan2(-d[2],d[0]),pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));out.push([yaw,pitch]);q=mul(q,mul(yq(yaw),zq(pitch)));
 }
 return out;
}
export function polePosition(id='01'){const a=limbs.find(x=>x.id===id).angle,x=.70+lengths.slice(0,4).reduce((s,x)=>s+x,0),z=-POLE.wrap_radius;return [Math.sin(a)*x-Math.cos(a)*z,0,Math.cos(a)*x+Math.sin(a)*z];}

const tau=Math.PI*2,mod=x=>((x%1)+1)%1,smoother=x=>x*x*x*(10+x*(-15+6*x));
const xq=a=>[Math.sin(a/2),0,0,Math.cos(a/2)];
// A distributed bend supplies the slack. Root yaw/pitch orient its endpoint
// exactly onto the requested contact; no iterative per-frame pose history.
function contactAngles(target,phase,id){
 const distance=Math.hypot(...target),side=Number(id)>3?-1:1,turn=-Math.atan2(target[2],target[0])*.4;
 function curve(bend){return lengths.map((_,i)=>{
  const u=i/(COUNT-1),prev=Math.max(0,(i-1)/(COUNT-1));
  const yaw=i?turn*(smooth(Math.min(i/5,1))-smooth(Math.min((i-1)/5,1)))+side*.028*(Math.sin(tau*phase-u*5)-Math.sin(tau*phase-prev*5)):0;
  return [yaw,i?-bend*(u*u-prev*prev):0];
 });}
 let lo=.05,hi=3.6;
 for(let k=0;k<28;k++){const b=(lo+hi)/2,d=forward(curve(b)).points.at(-1);if(Math.hypot(...d)>distance)lo=b;else hi=b;}
 const angles=curve((lo+hi)/2),d=forward(angles).points.at(-1),r=Math.hypot(d[0],d[1]);
 angles[0][1]=Math.asin(clamp(target[1]/r))-Math.atan2(d[1],d[0]);
 const x=Math.sqrt(Math.max(0,r*r-target[1]*target[1]));
 angles[0][0]=Math.atan2(d[2],x)-Math.atan2(target[2],target[0]);
 return angles;
}
export function gaitPose(time,mode='walk'){
 const g=gaits[mode],phase=mod(time/g.duration_s),t=phase*tau,heading=-Math.PI/6;
 const offsets=mode==='scout'?{'03':0,'04':.5,'05':.25,'06':.75}:{'01':0,'02':.5,'03':1/3,'04':5/6,'05':2/3,'06':1/6};
 const feet=[],poses={},sensors=[...g.sensors];
 for(const l of limbs){
  if(sensors.includes(l.id))continue;
  const p=mod(phase+offsets[l.id]),stance=p<g.duty,u=stance?0:(p-g.duty)/(1-g.duty),lift=Math.sin(Math.PI*u)**3;
  const stride=g.speed_m_s*g.duration_s*g.duty,swingTime=g.duration_s*(1-g.duty);
  const advance=stance?stride*(.5-p/g.duty):-stride/2-g.speed_m_s*swingTime*u+(stride+g.speed_m_s*swingTime)*smoother(u);
  const a=l.angle+heading;
  const nominal=mode==='scout'?({'03':[3.40,1.95],'04':[3.25,-1.95],'05':[-3.25,-1.95],'06':[-3.40,1.95]}[l.id]):[Math.sin(a)*4.04,Math.cos(a)*4.04];
  feet.push({id:l.id,stance,phase:p,lift,target:[nominal[0]-Math.sign(nominal[0])*.13*lift,.08+.43*lift,nominal[1]+advance]});
 }
 const bodyPosition=[.035*Math.sin(t),1.12+.035*Math.cos(t*2),.025*Math.sin(t*2)];
 for(const f of feet){const anticipate=f.phase>=g.duty?1:f.phase<.12?1-smoother(f.phase/.12):smoother(clamp((f.phase-(g.duty-.12))/.12,0,1));bodyPosition[0]-=Math.sign(f.target[0])*(mode==='scout'?.47:.13)*anticipate;bodyPosition[2]-=Math.sign(f.target[2])*(mode==='scout'?.34:.13)*anticipate;}
 const bodyRotation=[.012*Math.sin(t*2+.35),heading,.014*Math.sin(t)],bq=mul(mul(xq(bodyRotation[0]),yq(heading)),zq(bodyRotation[2])),inv=[-bq[0],-bq[1],-bq[2],bq[3]];
 for(const l of limbs){
  if(sensors.includes(l.id)){
   const side=l.id==='01'?1:-1,angles=[];
   for(let i=0;i<COUNT;i++){const u=i/(COUNT-1),prev=Math.max(0,(i-1)/(COUNT-1));
    const headingAt=x=>side*.27*Math.sin(Math.PI*x/2)+.12*Math.sin(t-x*3+side*.55)*Math.sin(Math.PI*x/2);
    const elevation=x=>.24+.18*Math.sin(x*Math.PI*1.5-t*2+side*.7)*x-.45*x*x;
    angles.push([i?headingAt(u)-headingAt(prev):0,i?elevation(u)-elevation(prev):elevation(0)]);
   }poses[l.id]=angles;continue;
  }
  const f=feet.find(f=>f.id===l.id),local=rotate(f.target.map((v,i)=>v-bodyPosition[i]),inv);local[0]-=Math.sin(l.angle)*.70;local[2]-=Math.cos(l.angle)*.70;
  const target=rotate(local,yq(-(l.angle-Math.PI/2)));poses[l.id]=contactAngles(target,phase,l.id);
 }
 return {poses,feet,sensors,contacts:feet.filter(f=>f.stance).length,bodyPosition,bodyRotation,speed_m_s:g.speed_m_s,travel_m:time*g.speed_m_s};
}
const cached=new WeakMap();
function refs(root){if(!cached.has(root)){const m={};root.traverse(o=>m[o.name]=o);cached.set(root,m);}return cached.get(root);}
const wrap=wrapAngles(),spiral=spiralAngles(),upright=spiralAngles(true),extended=Object.fromEntries(limbs.map(l=>[l.id,extendedAngles(l.id)]));
export function applyPose(root,time=0,mode='mixed',options={}){
 const n=refs(root),body=n.BODY_HEAVE;if(!body||root.getObjectByName('DISTANCE_GEOMETRY'))return {phase:'Static extended silhouette',active:[],max_yaw:0,max_pitch:0};
 const selected=options.selected||'01',amount=clamp(options.amount??1,0,1),t=Math.max(0,time),duration=motions[mode]?.duration_s||10;
 const cycle=.5-.5*Math.cos(t/duration*Math.PI*2),strength=options.animate===false?amount:amount*(mode==='mixed'||mode==='extended'?1:cycle);
 const gait=gaits[mode]?gaitPose(t,mode):null;
 const planar=mode==='arc'||mode==='spiral';body.position.set(0,planar?.235:ROOT_HEIGHT,0);body.rotation.set(0,0,0);
 if(gait){body.position.fromArray(gait.bodyPosition);body.rotation.set(...gait.bodyRotation);}
 let maxYaw=0,maxPitch=0;const active=[],poses={};
 for(const l of limbs){let angles=extended[l.id].map(x=>[...x]);
  if(gait){angles=gait.poses[l.id];if(gait.sensors.includes(l.id)||!gait.feet.find(f=>f.id===l.id).stance)active.push(l.id);}
  if(mode==='mixed'&&Number(l.id)%2===0){angles=upright.map(([y,p],i)=>[y+.018*Math.sin(t*Math.PI/5+i*.2),p]);active.push(l.id);}
  if(mode==='arc'){angles=lengths.map((_,i)=>[i<4?0:.24*strength,0]);active.push(l.id);}
  if(mode==='spiral'){angles=spiral.map(([y,p])=>[y*strength,p]);active.push(l.id);}
  if(mode==='wrap'&&l.id===selected){angles=wrap.map(([y,p])=>[y*strength,p*strength]);active.push(l.id);}
  if(mode==='manual'&&l.id===selected){angles=lengths.map((_,i)=>[i<4?0:clamp(options.yaw??.18,-.24,.24),i<4?0:clamp(options.pitch??.10,-.18,.18)]);active.push(l.id);}
  poses[l.id]=angles;
  for(let i=0;i<COUNT;i++){
   const pre=`LIMB_${l.id}_V${String(i+1).padStart(2,'0')}`,y=clamp(angles[i][0],-MAX_YAW,MAX_YAW),p=clamp(angles[i][1],-MAX_PITCH,MAX_PITCH);
   n[pre+'_YAW'].rotation.set(0,y,0);n[pre+'_PITCH'].rotation.set(0,0,p);
   // Short recessed scales retract at the inner joint and lift their rounded lip.
   const load=Math.hypot(y,p);n[pre+'_SCALE'].position.set(-.022*load/1.02,.012*load/1.02,0);
   const next=angles[Math.min(i+1,COUNT-1)],np=next[1],ny=next[0];
   n[pre+'_DORSAL_LIP'].rotation.set(0,ny*.6,Math.max(0,np)*1.25);n[pre+'_VENTRAL_LIP'].rotation.set(0,ny*.6,Math.min(0,np)*1.25);
   maxYaw=Math.max(maxYaw,Math.abs(y));maxPitch=Math.max(maxPitch,Math.abs(p));
  }
 }
 // Manual mixed-axis inspection may turn a tip below the floor: lift the whole
 // test specimen, retaining the joint angles, rather than clipping geometry.
 if(mode==='manual'){let low=0;for(const l of limbs)for(const p of forward(poses[l.id]).points)low=Math.min(low,p[1]);body.position.y=Math.max(ROOT_HEIGHT,.18-low);}
 root.updateMatrixWorld(true);
 return {...gait,phase:gait?`${mode==='scout'?'Four walking limbs / front sensors 01 + 02':'Six-limb ripple walk'} · ${gait.contacts} planted · ${gait.speed_m_s.toFixed(2)} m/s`:{mixed:'Three supporting limbs / three upright spirals',extended:'Six independent serpentine limbs',arc:'Equal side bends / circular arcs',spiral:'Increasing side bends / tightening spirals',wrap:'Two-axis helix / selected limb '+selected,manual:'Independent yaw + pitch / limb '+selected}[mode],active,max_yaw:maxYaw,max_pitch:maxPitch,strength,body_height:body.position.y,poses,pole:mode==='wrap'?polePosition(selected):null};
}
