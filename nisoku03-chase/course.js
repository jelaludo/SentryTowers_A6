// Deterministic metre-scale choreography. Recorded rolls own their travel;
// in-place clips receive controller travel and the documented jump arc once.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const lerp=(a,b,t)=>a+(b-a)*t;
export const wrap=(x,n)=>{const r=x%n;return r<0?r+n:r};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function curve(points,u){let p=points.map(v=>[...v]);while(p.length>1)p=p.slice(0,-1).map((v,i)=>v.map((x,k)=>lerp(x,p[i+1][k],u)));return p[0]}
function table(points){let out=[{p:points[0],s:0,u:0}];for(let i=1;i<=160;i++){const p=curve(points,i/160),prev=out.at(-1);out.push({p,s:prev.s+distance(p,prev.p),u:i/160})}return out}
function atDistance(tab,s){let i=1;while(i<tab.length-1&&tab[i].s<s)i++;const a=tab[i-1],b=tab[i],f=clamp((s-a.s)/(b.s-a.s||1));return a.p.map((v,k)=>lerp(v,b.p[k],f))}
export function trackSample(times,values,size,t){let lo=0,hi=times.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(times[m]<=t)lo=m;else hi=m}const f=clamp((t-times[lo])/(times[hi]-times[lo]||1));if(size===4){const a=Array.from(values.slice(lo*4,lo*4+4)),b=Array.from(values.slice(hi*4,hi*4+4));let dot=a.reduce((s,v,k)=>s+v*b[k],0);if(dot<0){for(let k=0;k<4;k++)b[k]*=-1;dot=-dot}let wa=1-f,wb=f;if(dot<.9995){const theta=Math.acos(clamp(dot,-1,1)),sin=Math.sin(theta);wa=Math.sin((1-f)*theta)/sin;wb=Math.sin(f*theta)/sin}const q=a.map((v,k)=>v*wa+b[k]*wb),norm=Math.hypot(...q);return q.map(v=>v/norm)}return Array.from({length:size},(_,k)=>lerp(values[lo*size+k],values[hi*size+k],f))}
export function createCourse(paths,contact){
 const beats=[];let start=[0,-9],time=0,s=0,height=0;
 function add(id,label,clip,to,{duration,speed=1.25,controls=[],kind='travel',note='',toHeight=height,yaw=null}={}){
  const tab=table([start,...controls,to]),length=tab.at(-1).s;
  const b={id,label,clip,from:start,to,tab,length,start:time,s,duration:duration??length/speed,kind,note,h0:height,h1:toHeight,yaw};
  beats.push(b);time+=b.duration;s+=length;start=to;height=toHeight;return b;
 }
 add('watch','The invitation','game-idle-seed411',[0,-9],{duration:1.6,note:'K0 notices the pursuer and opens a little space.'});
 add('walk','Follow at a walk','game-walk-forward-seed411',[3,-9]);
 add('jog','K0 picks up speed','game-jog-forward-seed411',[7,-6],{speed:2.4,controls:[[7,-9]]});
 add('run','Close the gap','game-run-forward-seed411',[7,-3],{speed:3.8});
 add('jump-a','Running jump / rail A','game-jump-run-seed411',[7,.65],{duration:1.666667,kind:'jump',note:'Jump height follows the supplied takeoff, apex and landing times.'});
 add('pursue','The lure darts away','game-run-forward-seed411',[7,4.7],{speed:3.8});
 add('approach-left','A sideways approach','game-walk-forward-seed411',[6,6],{controls:[[7,6]]});
 function action(id,label,key,yaw,note){const record=contact.actions[key],v=record.positions.slice(-3),to=[start[0]+Math.sin(yaw)*v[2]+Math.cos(yaw)*v[0],start[1]+Math.cos(yaw)*v[2]-Math.sin(yaw)*v[0]],b=add(id,label,record.clip,to,{duration:record.duration_s,kind:'contact',yaw,note,toHeight:height+v[1]-record.positions[1]});b.contact=key;return b}
 action('roll-left','Left trip / planted recovery','side-roll-left',-Math.PI/2,'Travel ends with the roll. Planted recovery replaces the drifting tail.');
 add('approach-balance','Find the narrow crossing','game-walk-forward-seed411',[-3,7.2],{controls:[[-3,6]]});
 add('balance','Balance / narrow steel beam','game-balance-seed411',[-3,10.2],{duration:5.966667,kind:'balance'});
 add('approach-right','K0 doubles around','game-walk-forward-seed411',[-7,8],{controls:[[-3,12],[-7,12]]});
 action('roll-right','Right trip / planted recovery','side-roll-right',Math.PI,'The other shoulder takes the roll; feet settle before pursuit resumes.');
 add('centre','K0 cuts through the court','game-walk-forward-seed411',[-4,2.5],{controls:[[-7,2.5]]});
 action('ukemi-forward','Forward ukemi / shoulder roll','ukemi-forward',Math.PI/2,'A low trip, forward shoulder roll, then a planted recovery.');
 add('turn-back','The lure changes sides','game-walk-forward-seed411',[1.5,2.5]);
 action('ukemi-backward','Backward ukemi / regroup','ukemi-backward',0,'K0 slips behind. NISOKU rolls backward and regains its stance.');
 add('duck-approach','A low route through','game-walk-forward-seed411',[0,-1],{controls:[[0,.25]]});
 action('crouch-down','Crouch / lower the silhouette','crouch-down',Math.PI,'Lower before entering the overhead beams.');
 add('crouch-pass','Crouch / under the gantry','chase-crouch-forward',[0,-3.8],{speed:.75,kind:'crouch',note:'K0 fits underneath; NISOKU stays low through the passage.'});
 action('crouch-up','Stand / clear of the gantry','crouch-up',Math.PI,'Rise only after the helmet is clear.');
 add('climb-approach','K0 takes the high route','game-walk-forward-seed411',[2,-5.5],{controls:[[0,-5.5]]});
 action('climb','Climb / grip and mantle','climb',Math.PI/2,'Hands grip the fixed rail. Step onto the 1.05 m ledge.');
 action('deck','Pursuit / raised deck','deck',Math.PI/2,'Follow the sloping deck to a 1.8 m drop.');
 action('hero-landing','Super landing / hold and recover','hero-landing',Math.PI/2,'Drop, absorb, hold the fist-and-knee pose, then step back into stance.');
 add('reset','Reacquire the little escape artist','game-walk-forward-seed411',[7.8,-8.5],{controls:[[7.8,-5.5]]});
 add('sprint','A last sprint','game-sprint-forward-seed411',[-2,-11],{speed:6});
 add('jump-b','Running jump / rail B','game-jump-run-seed411',[-5.65,-11],{duration:1.666667,kind:'jump'});
 add('return','The chase comes around','game-jog-forward-seed411',[-2,-9],{speed:2.4,controls:[[-7,-11],[-6,-9]]});
 add('settle','Still just out of reach','game-walk-forward-seed411',[0,-9]);
 const duration=time,length=s;
 function sample(t){
  t=wrap(t,duration);let index=beats.findIndex(b=>t<b.start+b.duration);if(index<0)index=beats.length-1;const b=beats[index],local=t-b.start,u=clamp(local/b.duration);
  let d=u*b.length,p=atDistance(b.tab,d),height=lerp(b.h0,b.h1,u),rotation=null;
  if(b.kind==='contact'){
   const record=contact.actions[b.contact],v=trackSample(record.times,record.positions,3,local);d=Math.abs(v[2]);p=[b.from[0]+Math.sin(b.yaw)*v[2]+Math.cos(b.yaw)*v[0],b.from[1]+Math.cos(b.yaw)*v[2]-Math.sin(b.yaw)*v[0]];height=b.h0+v[1]-record.positions[1];rotation={yaw:b.yaw,quaternion:trackSample(record.rotation_times,record.quaternions,4,local)};
  }
  if(b.kind==='jump'){
   const takeoff=.366666667,apex=.666666667,landing=.933333333;
   if(local>takeoff&&local<landing){const v=local<apex?(local-takeoff)/(apex-takeoff):(landing-local)/(landing-apex);height=.453*(1-(1-v)**2)}
  }
  if(b.kind==='balance')height=.16*smooth(d/.55)*smooth((b.length-d)/.55);
  const before=atDistance(b.tab,Math.max(0,d-.04)),after=atDistance(b.tab,Math.min(b.length,d+.04));
  const yaw=b.yaw??(b.length?Math.atan2(after[0]-before[0],after[1]-before[1]):Math.PI/2);
  return {beat:b,index,local,u,position:[p[0],height,p[1]],yaw,rotation,s:b.s+d};
 }
 function at(s){s=wrap(s,length);const b=beats.find(b=>b.length&&s>=b.s&&s<=b.s+b.length)||beats.at(-1),d=s-b.s,p=atDistance(b.tab,d);let h=lerp(b.h0,b.h1,d/(b.length||1));if(b.kind==='balance')h=.16*smooth(d/.55)*smooth((b.length-d)/.55);if(b.contact==='climb')h=d<.6?0:1.05;if(b.contact==='deck')h=1.05+.75*clamp((d-.35)/1.8);if(b.contact==='hero-landing')h=d<.05?1.8:0;return [p[0],h,p[1]]}

 const obstacles=[];
 for(const b of beats){
  if(b.contact?.startsWith('side-roll'))obstacles.push({id:b.id,s:b.s+3.9,position:at(b.s+3.9),yaw:b.yaw,height:.22,width:1.65,depth:.18});
  if(b.contact?.startsWith('ukemi')){const d=b.contact==='ukemi-forward'?.6:.3;obstacles.push({id:b.id,s:b.s+d,position:at(b.s+d),yaw:b.yaw,height:.12,width:1.65,depth:.12})}
  if(b.kind==='jump')obstacles.push({id:b.id,s:b.s+1.46,position:at(b.s+1.46),yaw:sample(b.start+.66).yaw,height:.20,width:1.65,depth:.16});
 }
 // The lure reacts to the closing distance and delayed pursuer speed.
 // Prewarm the stable controller so seeking and replay produce the same loop.
 const count=Math.ceil(duration*60),dt=duration/count,lureSamples=[];
 let ks=2.1,kv=0;
 for(let lap=0;lap<8;lap++)for(let i=0;i<=count;i++){
  const t=i*dt,n=sample(Math.min(t,duration-.000001)),ns=n.s+lap*length;
  if(lap===7)lureSamples.push({s:ks-lap*length,speed:kv});
  if(i===count)continue;
  const before=sample(t-.16),after=sample(t-.12);let delta=after.s-before.s;if(delta< -length/2)delta+=length;
  const pursuerSpeed=Math.max(0,delta/.04),gap=ks-ns;
  const near=obstacles.some(o=>Math.abs(n.s-o.s)<2),targetGap=1.7+.9*smooth(pursuerSpeed/1.4)+(near?.45:0);
  const desired=clamp(pursuerSpeed+3.8*(targetGap-gap),0,7.8),change=clamp(desired-kv,-7*dt,9*dt);
  kv=Math.max(0,kv+change);ks+=kv*dt;
 }
 const climb=beats.find(b=>b.id==='climb'),drop=beats.find(b=>b.id==='hero-landing');
 const traversals=[{start:climb.s-.5,end:climb.s+1.05,from:0,to:1.05,arc:.55},{start:drop.s-.3,end:drop.s+1.5,from:1.8,to:0,arc:.45}];
 function lure(t){const f=wrap(t,duration)/dt,i=Math.min(count-1,Math.floor(f)),u=f-i;
  const s=lerp(lureSamples[i].s,lureSamples[i+1].s,u),speed=lerp(lureSamples[i].speed,lureSamples[i+1].speed,u),n=sample(t),p=at(s);let jump=null;
  for(const o of obstacles){let delta=wrap(s-o.s+length/2,length)-length/2;if(Math.abs(delta)<.8){const u=(delta+.8)/1.6;p[1]+=.43*Math.sin(Math.PI*u);jump={u,obstacle:o.id};break}}
  for(const a of traversals)if(s>=a.start&&s<=a.end){const u=(s-a.start)/(a.end-a.start);p[1]=lerp(a.from,a.to,u)+a.arc*Math.sin(Math.PI*u);jump={u,obstacle:'platform'};}
  return {position:p,s,speed,gap:s-n.s,jump};
 }

 return {beats,duration,length,sample,at,obstacles,lure,traversals};
}
