// Deterministic choreography: pure time samples, with no attachment history.
// Metres, +Y up, +Z forward. Original PCS models remain unchanged.
export const DURATION=22;
export const LAYOUT={
  cup:[-1.18,1.10,0],pick:[-1.83,1.55,.60],feed_pitch:.68,
  deck_offset:.29,crate_height:.36,clear_lid:2.12,
  entry_z:-4.4,exit_z:4.6,index_x:[-.6,0],
  dock_top:1.10,platform_bottom:1.06
};
export const LOADS=[
  {id:0,start:3.4,slot:[.30,.25]},
  {id:1,start:6.4,slot:[.30,-.25]},
  {id:2,start:10.7,slot:[-.30,.25]},
  {id:3,start:13.7,slot:[-.30,-.25]}
];
export const CHAPTERS=[
  {time:0,label:'Arrive empty'},
  {time:3.4,label:'Load 01'},
  {time:6.4,label:'Load 02'},
  {time:9.4,label:'Side-step'},
  {time:10.7,label:'Load 03'},
  {time:13.7,label:'Load 04'},
  {time:17.4,label:'Depart loaded'}
];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const ease=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const mix=(a,b,t)=>a+(b-a)*ease(t);
const lerp3=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
export function state(time){
 const t=clamp(time,0,DURATION),arrive=ease(t/3),index=ease((t-9.4)),depart=ease((t-17.4)/4);
 const x=-.6+.6*index,z=LAYOUT.entry_z*(1-arrive)+LAYOUT.exit_z*depart;
 const height=.68-.012*Math.sin(Math.PI*clamp((t-3)/.4))**2-.012*ease((t-17)/.4);
 const deck=height+LAYOUT.deck_offset,travel=4.4*arrive+.6*index+4.6*depart;
 const steer=Math.PI/2*ease((t-9.1)/.3)*(1-ease((t-10.4)/.3));
 const crates=[],park=[LAYOUT.pick[0],LAYOUT.clear_lid,LAYOUT.pick[2]];
 let target=[...park],vacuum=0,held=-1,loaded=0,active=-1,action='CUP ready';
 for(const load of LOADS){
  const u=t-load.start,source=[...LAYOUT.pick],dest=[x+load.slot[0],deck,z+load.slot[1]];
  const pickup=[source[0],source[1]+LAYOUT.crate_height,source[2]],aboveDest=[dest[0],LAYOUT.clear_lid,dest[2]],lid=[dest[0],deck+LAYOUT.crate_height,dest[2]];
  let custody='feed',position;
  if(t<load.start){
   // The belt advances once the current crate is well clear of the pick pocket.
   const advance=LOADS.filter(l=>l.id<load.id).reduce((sum,l)=>sum+ease((t-l.start-1.6)/1),0);
   position=[source[0]-(load.id-advance)*LAYOUT.feed_pitch,source[1],source[2]];
  }else if(t<load.start+.50){position=source;active=load.id;}
  else if(t<load.start+1.95){custody='cup';held=active=load.id;}
  else{custody='stride';position=dest;loaded++;}
  if(t>=load.start&&t<load.start+3){
   active=load.id;
   if(t<load.start+.35){target=lerp3(park,pickup,u/.35);action='Lower to lid';}
   else if(t<load.start+.50){target=pickup;vacuum=ease((u-.35)/.15);action='Seal four cups';}
   else if(t<load.start+.85){target=lerp3(pickup,park,(u-.50)/.35);vacuum=1;action='Lift package';}
   else if(t<load.start+1.45){target=lerp3(park,aboveDest,(u-.85)/.60);vacuum=1;action='Swift transfer';}
   else if(t<load.start+1.95){target=lerp3(aboveDest,lid,(u-1.45)/.50);vacuum=1;action='Place on pallet';}
   else if(t<load.start+2.12){target=lid;vacuum=1-ease((u-1.95)/.17);action='Supported · release';}
   else if(t<load.start+2.40){target=lerp3(lid,aboveDest,(u-2.12)/.28);action='Clear the load';}
   else{target=lerp3(aboveDest,park,(u-2.40)/.60);action='Return for next package';}
  }
  if(custody==='cup')position=[target[0],target[1]-LAYOUT.crate_height,target[2]];
  crates.push({id:load.id,custody,position,slot:load.slot});
 }
 const phase=t<3?'STRIDE arriving empty':t<3.4?'Docked · ready to load':t<9.4?'CUP loading · first row':t<10.7?'STRIDE indexing sideways':t<16.7?'CUP loading · second row':t<17.4?'Four secured · clear to depart':t<21.4?'STRIDE departing loaded':'Delivery run complete';
 return {time:t,stride:{position:[x,0,z],height,steer,travel,lock:1},pallet_y:height+.13,deck,cup:{target:target.map((v,i)=>v-LAYOUT.cup[i]),vacuum},target,crates,loaded,held,active,action,phase,complete:t===DURATION};
}
